import type {
  MakeVertexResult,
  DagPrerequisiteLookupResult,
  TreeSourceVertexResolution,
} from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { MaybePromise } from '@core/graph/types';

/** Validate before tagged branches can discard unsupported source fields. */
export function assertNoTreeMetadata(
  result: object,
  sourceName = 'Tree source',
): void {
  if (
    Object.prototype.hasOwnProperty.call(result, 'identity') ||
    Object.prototype.hasOwnProperty.call(result, 'omittedVertexIdentity') ||
    Object.prototype.hasOwnProperty.call(result, 'vertexId') ||
    Object.prototype.hasOwnProperty.call(result, 'workWaitsForWorkOf') ||
    Object.prototype.hasOwnProperty.call(
      result,
      'workWaitsForSubgraphCompletionOf',
    ) ||
    Object.prototype.hasOwnProperty.call(result, 'satisfiesDependencies') ||
    Object.prototype.hasOwnProperty.call(
      result,
      'satisfiesWorkAndSubgraphCompletionPrerequisites',
    )
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
export function normalizeSourceResult<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  result:
    | DagPrerequisiteLookupResult<InputVertexTypes, VertexId>
    | TreeSourceVertexResolution<InputVertexTypes>,
  prerequisite: boolean,
  treeSourceName?: string,
): MakeVertexResult<InputVertexTypes> | undefined {
  if (result === null || typeof result !== 'object') {
    throw new TypeError('Invalid source resolution result');
  }
  if (treeSourceName !== undefined)
    assertNoTreeMetadata(result, treeSourceName);
  else assertOwnGraphIdentity(result);
  if (!('kind' in result))
    throw new TypeError('Source results require a canonical kind tag');
  switch (result.kind) {
    case 'vertexResolved': {
      const vertex = result.resolvedVertexInput;
      if (vertex === null || typeof vertex !== 'object') {
        throw new TypeError(
          'vertexResolved source result requires non-null resolvedVertexInput.vertexContentInput',
        );
      }
      if (treeSourceName !== undefined)
        assertNoTreeMetadata(vertex, treeSourceName);
      else assertOwnGraphIdentity(vertex);
      const vertexContent = vertex.vertexContentInput;
      if (vertexContent == null) {
        throw new TypeError(
          'vertexResolved source result requires non-null resolvedVertexInput.vertexContentInput',
        );
      }
      // Adapt metadata lazily: source records need not support key enumeration.
      // Reads retain the source object's receiver, including inherited accessors.
      return new Proxy(
        { vertexContent },
        {
          get(_target, property) {
            return property === 'vertexContent'
              ? vertexContent
              : Reflect.get(vertex, property, vertex);
          },
          getOwnPropertyDescriptor(target, property) {
            if (property === 'vertexContent')
              return Reflect.getOwnPropertyDescriptor(target, property);
            const descriptor = Reflect.getOwnPropertyDescriptor(
              vertex,
              property,
            );
            // The shadow is extensible, even when the source is frozen.
            return descriptor === undefined
              ? undefined
              : { ...descriptor, configurable: true };
          },
        },
      );
    }
    case 'vertexIntentionallyOmitted': {
      if (treeSourceName !== undefined) return { vertexContent: null };
      if (result.satisfiesWorkAndSubgraphCompletionPrerequisites !== true) {
        throw new TypeError(
          'Omitted source result requires satisfiesWorkAndSubgraphCompletionPrerequisites: true',
        );
      }
      if ('vertexId' in result || !('omittedVertexIdentity' in result)) {
        throw new TypeError(
          'Omitted source result requires explicit omittedVertexIdentity, not vertexId',
        );
      }
      const identity = result.omittedVertexIdentity;
      if (identity === null) return { vertexContent: null };
      if (
        typeof identity !== 'object' ||
        Array.isArray(identity) ||
        !Object.prototype.hasOwnProperty.call(identity, 'vertexId')
      ) {
        throw new TypeError(
          'Omission identity must be null or an own vertexId wrapper',
        );
      }
      return {
        vertexContent: null,
        vertexId: (identity as { vertexId: VertexId }).vertexId,
      };
    }
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
