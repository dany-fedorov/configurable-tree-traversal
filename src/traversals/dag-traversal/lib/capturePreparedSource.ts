import type { AsyncDagDiscoverySource } from '@core/TraversableGraph';
import type {
  MakeVertexResult,
  DagPrerequisiteResolution,
} from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeSourceResult } from '@core/drivers/normalizeSourceResult';
import type { MaybePromise } from '@core/graph/types';

/** Capture omission candidates and distinguish source failures from engine validation. */
export function capturePreparedSource<T extends VertexTypes, ID>(
  source: AsyncDagDiscoverySource<T, T, ID>,
  asynchronous: boolean,
) {
  const candidates = new Set<ID>();
  const errors = new Set<unknown>();

  function syncCall<I, O>(invoke: () => I, receive: (value: I) => O): O {
    try {
      return receive(invoke());
    } catch (error) {
      errors.add(error);
      throw error;
    }
  }
  async function asyncCall<I, O>(
    invoke: () => MaybePromise<I>,
    receive: (value: I) => O,
  ): Promise<O> {
    try {
      return receive(await invoke());
    } catch (error) {
      errors.add(error);
      throw error;
    }
  }
  const call = <I, O>(
    invoke: () => MaybePromise<I>,
    receive: (value: I) => O,
  ): MaybePromise<O> =>
    asynchronous
      ? asyncCall(invoke, receive)
      : syncCall(invoke as () => I, receive);

  const record = (
    value: DagPrerequisiteResolution<T, ID>,
    prerequisite: boolean,
  ) => {
    const normalized = normalizeSourceResult<T, ID>(value, prerequisite);
    if (normalized === undefined) return undefined;
    // These fields use ordinary property access in the engine, so inherited and
    // non-enumerable source properties must survive capture too.
    const copied: MakeVertexResult<T> & { priority?: unknown } = {
      vertexContent: normalized.vertexContent,
    };
    const dependsOnWork = normalized.dependsOnWork;
    const dependsOnSubgraphCompletion = normalized.dependsOnSubgraphCompletion;
    if (dependsOnWork !== undefined) copied.dependsOnWork = dependsOnWork;
    if (dependsOnSubgraphCompletion !== undefined)
      copied.dependsOnSubgraphCompletion = dependsOnSubgraphCompletion;
    if (Object.prototype.hasOwnProperty.call(normalized, 'vertexId')) {
      copied.vertexId = normalized.vertexId;
      candidates.add(copied.vertexId as ID);
    }
    // The engine rejects own priority metadata by presence without reading it.
    if (Object.prototype.hasOwnProperty.call(normalized, 'priority'))
      copied.priority = undefined;
    return copied;
  };

  const adapter: AsyncDagDiscoverySource<T, T, ID> = {
    resolveRoot: () =>
      call(
        () => source.resolveRoot(),
        (value) => {
          return record(value, false)! as MakeVertexResult<T, ID>;
        },
      ),
    resolveChild: (hint, options) =>
      call(
        () => source.resolveChild(hint, options),
        (value) => record(value, false)! as MakeVertexResult<T, ID>,
      ),
  };
  if (source.getVertexIdFromHint !== undefined) {
    adapter.getVertexIdFromHint = (hint) =>
      call(
        () => source.getVertexIdFromHint!(hint),
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
  if (source.resolvePrerequisite !== undefined) {
    adapter.resolvePrerequisite = (id) => {
      candidates.add(id);
      return call(
        () => source.resolvePrerequisite!(id),
        (value) => record(value, true) as MakeVertexResult<T, ID> | undefined,
      );
    };
  }
  return { adapter, candidates, errors };
}
