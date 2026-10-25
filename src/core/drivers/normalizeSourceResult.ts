import type {
  MakeVertexResult,
  PrerequisiteResolutionResult,
} from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

/** Validate before tagged branches can discard unsupported source fields. */
export function assertNoTreeMetadata(
  result: object,
  sourceName = 'Tree source',
): void {
  if (
    Object.prototype.hasOwnProperty.call(result, 'vertexId') ||
    Object.prototype.hasOwnProperty.call(result, 'dependsOn') ||
    Object.prototype.hasOwnProperty.call(result, 'dependsOnComplete')
  ) {
    throw new TypeError(`${sourceName} results cannot include graph metadata`);
  }
}

/** Structural source types cannot distinguish own fields from prototype fields. */
function assertOwnGraphIdentity(result: object): void {
  if (
    'vertexId' in result &&
    !Object.prototype.hasOwnProperty.call(result, 'vertexId')
  ) {
    throw new TypeError('Graph source vertexId must be an own property');
  }
}

/** Normalize adapter vocabulary before any scheduling or identity decisions. */
export function normalizeSourceResult<T extends TreeTypeParameters>(
  result: PrerequisiteResolutionResult<T>,
  prerequisite: boolean,
  treeSourceName?: string,
): MakeVertexResult<T> | undefined {
  if (result === undefined && prerequisite) return undefined;
  if (result === null || typeof result !== 'object') {
    throw new TypeError('Invalid source resolution result');
  }
  if (treeSourceName !== undefined)
    assertNoTreeMetadata(result, treeSourceName);
  else assertOwnGraphIdentity(result);
  if (!('kind' in result)) return result;
  switch (result.kind) {
    case 'found': {
      const vertex = result.vertex;
      if (
        vertex === null ||
        typeof vertex !== 'object' ||
        vertex.vertexContent == null
      ) {
        throw new TypeError(
          'Found source result requires non-null vertexContent',
        );
      }
      if (treeSourceName !== undefined)
        assertNoTreeMetadata(vertex, treeSourceName);
      else assertOwnGraphIdentity(vertex);
      return vertex;
    }
    case 'omitted':
      if (result.satisfiesDependencies !== true) {
        throw new TypeError(
          'Omitted source result requires satisfiesDependencies: true',
        );
      }
      return Object.prototype.hasOwnProperty.call(result, 'vertexId')
        ? { vertexContent: null, vertexId: result.vertexId }
        : { vertexContent: null };
    case 'missing':
      if (!prerequisite) {
        throw new TypeError(
          'Missing source result is only valid for prerequisite lookup',
        );
      }
      return undefined;
    default:
      throw new TypeError('Invalid source resolution kind');
  }
}

/** Preserve thenable transport, including throwing getters and calls. */
export function mapSourceResult<I, O>(
  result: MaybePromise<I>,
  normalize: (value: I) => O,
): MaybePromise<O> {
  let then: PromiseLike<I>['then'] | undefined;
  try {
    then = (result as PromiseLike<I>)?.then;
  } catch (error) {
    // Retain the first accessor failure while leaving diagnostics to transport.
    return {
      get then(): PromiseLike<O>['then'] {
        throw error;
      },
    };
  }
  if (typeof then !== 'function') return normalize(result as I);
  return {
    then(onfulfilled, onrejected) {
      return then!.call(
        result,
        (value) => {
          let normalized: O;
          try {
            normalized = normalize(value);
          } catch (error) {
            return onrejected!(error);
          }
          return onfulfilled!(normalized);
        },
        onrejected,
      );
    },
  } as PromiseLike<O>;
}
