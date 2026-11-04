import type { AsyncDagDiscoverySource } from '@core/TraversableGraph';
import type {
  MakeVertexResult,
  DagSourceVertexResolution,
  DagPrerequisiteLookupResult,
} from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { normalizeSourceResult } from '@core/drivers/normalizeSourceResult';
import type { MaybePromise } from '@core/graph/types';

/** Capture omission candidates while preserving source receiver and error behavior. */
export function capturePreparedSource<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  source: AsyncDagDiscoverySource<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  >,
  asynchronous: boolean,
) {
  const candidates = new Set<VertexId>();

  function syncCall<I, O>(invoke: () => I, receive: (value: I) => O): O {
    return receive(invoke());
  }
  async function asyncCall<I, O>(
    invoke: () => MaybePromise<I>,
    receive: (value: I) => O,
  ): Promise<O> {
    return receive(await invoke());
  }
  const call = <I, O>(
    invoke: () => MaybePromise<I>,
    receive: (value: I) => O,
  ): MaybePromise<O> =>
    asynchronous
      ? asyncCall(invoke, receive)
      : syncCall(invoke as () => I, receive);

  const record = (
    value: DagPrerequisiteLookupResult<SourceVertexTypes, VertexId>,
    prerequisite: boolean,
  ) => {
    const normalized = normalizeSourceResult<SourceVertexTypes, VertexId>(
      value,
      prerequisite,
    );
    if (normalized === undefined) return { kind: 'missing' as const };
    // These fields use ordinary property access in the engine, so inherited and
    // non-enumerable source properties must survive capture too.
    const copied: MakeVertexResult<SourceVertexTypes> & { priority?: unknown } =
      {
        vertexContent: normalized.vertexContent,
      };
    const workWaitsForWorkOf = normalized.workWaitsForWorkOf;
    const workWaitsForSubgraphCompletionOf =
      normalized.workWaitsForSubgraphCompletionOf;
    if (workWaitsForWorkOf !== undefined)
      copied.workWaitsForWorkOf = workWaitsForWorkOf;
    if (workWaitsForSubgraphCompletionOf !== undefined)
      copied.workWaitsForSubgraphCompletionOf =
        workWaitsForSubgraphCompletionOf;
    if (Object.prototype.hasOwnProperty.call(normalized, 'vertexId')) {
      copied.vertexId = normalized.vertexId;
      candidates.add(copied.vertexId as VertexId);
    }
    // The engine rejects own priority metadata by presence without reading it.
    if (Object.prototype.hasOwnProperty.call(normalized, 'priority'))
      copied.priority = undefined;
    if (copied.vertexContent === null) {
      return Object.prototype.hasOwnProperty.call(copied, 'vertexId')
        ? {
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
            omittedVertexIdentity: { vertexId: copied.vertexId as VertexId },
          }
        : {
            kind: 'vertexIntentionallyOmitted' as const,
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          };
    }
    const { vertexContent, ...sourceFields } = copied;
    return {
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        ...sourceFields,
        vertexContentInput: vertexContent,
      },
    } as DagSourceVertexResolution<SourceVertexTypes, VertexId>;
  };

  const adapter: AsyncDagDiscoverySource<
    SourceVertexTypes,
    SourceVertexTypes,
    VertexId
  > = {
    resolveRootVertex: () =>
      call(
        () => source.resolveRootVertex(),
        (value) => {
          return record(value, false)! as DagSourceVertexResolution<
            SourceVertexTypes,
            VertexId
          >;
        },
      ),
    resolveChildVertexFromHint: (hint, options) =>
      call(
        () => source.resolveChildVertexFromHint(hint, options),
        (value) =>
          record(value, false)! as DagSourceVertexResolution<
            SourceVertexTypes,
            VertexId
          >,
      ),
  };
  if (source.tryGetVertexIdentityFromHint !== undefined) {
    adapter.tryGetVertexIdentityFromHint = (hint) =>
      call(
        () => source.tryGetVertexIdentityFromHint!(hint),
        (value) => {
          if (
            value === undefined ||
            !Object.prototype.hasOwnProperty.call(value, 'vertexId')
          )
            return undefined;
          const captured = { vertexId: value.vertexId };
          candidates.add(captured.vertexId);
          return captured;
        },
      );
  }
  if (source.resolvePrerequisiteByVertexId !== undefined) {
    adapter.resolvePrerequisiteByVertexId = (id) => {
      candidates.add(id);
      return call(
        () => source.resolvePrerequisiteByVertexId!(id),
        (value) =>
          record(value, true) as DagPrerequisiteLookupResult<
            SourceVertexTypes,
            VertexId
          >,
      );
    };
  }
  return { adapter, candidates };
}
