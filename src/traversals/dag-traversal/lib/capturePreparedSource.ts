import type { AsyncTraversableGraph } from '@core/TraversableGraph';
import type {
  MakeVertexResult,
  PrerequisiteResolutionResult,
} from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { normalizeSourceResult } from '@core/drivers/normalizeSourceResult';
import type { MaybePromise } from '@core/graph/types';

/** Capture omission candidates and distinguish source failures from engine validation. */
export function capturePreparedSource<T extends TreeTypeParameters, ID>(
  source: AsyncTraversableGraph<T, T, ID>,
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
    value: PrerequisiteResolutionResult<T, ID>,
    prerequisite: boolean,
  ) => {
    const normalized = normalizeSourceResult<T, ID>(value, prerequisite);
    if (normalized === undefined) return undefined;
    // These fields use ordinary property access in the engine, so inherited and
    // non-enumerable source properties must survive capture too.
    const copied: MakeVertexResult<T> & { priority?: unknown } = {
      vertexContent: normalized.vertexContent,
    };
    const dependsOn = normalized.dependsOn;
    const dependsOnComplete = normalized.dependsOnComplete;
    if (dependsOn !== undefined) copied.dependsOn = dependsOn;
    if (dependsOnComplete !== undefined)
      copied.dependsOnComplete = dependsOnComplete;
    if (Object.prototype.hasOwnProperty.call(normalized, 'vertexId')) {
      copied.vertexId = normalized.vertexId;
      candidates.add(copied.vertexId as ID);
    }
    // The engine rejects own priority metadata by presence without reading it.
    if (Object.prototype.hasOwnProperty.call(normalized, 'priority'))
      copied.priority = undefined;
    return copied;
  };

  const adapter: AsyncTraversableGraph<T, T, ID> = {
    makeRoot: () =>
      call(
        () => source.makeRoot(),
        (value) => {
          return record(value, false)! as MakeVertexResult<T, ID>;
        },
      ),
    makeVertex: (hint, options) =>
      call(
        () => source.makeVertex(hint, options),
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
