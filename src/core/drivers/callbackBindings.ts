import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { MakeVertexResult, TraversableTree } from '@core/TraversableTree';
import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type {
  AsyncTraversableGraph,
  TraversableGraph,
} from '@core/TraversableGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { HintVertexId, MaybePromise } from '@core/graph/types';

export interface BoundSource<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MaybePromise<MakeVertexResult<T>>;
  makeVertex(
    context: VertexResolutionContext<T | R>,
  ): MaybePromise<MakeVertexResult<T>>;
  getVertexIdFromHint?(
    hint: (T | R)['VertexHint'],
  ): MaybePromise<HintVertexId | undefined>;
}

type TreeSource<T extends TreeTypeParameters, R extends TreeTypeParameters> =
  | TraversableTree<T, R>
  | AsyncTraversableTree<T, R>;

type GraphSource<T extends TreeTypeParameters, R extends TreeTypeParameters> =
  | TraversableGraph<T, R>
  | AsyncTraversableGraph<T, R>;

function assertTreeResult<T extends TreeTypeParameters>(
  result: MakeVertexResult<T>,
): MakeVertexResult<T> {
  if (
    Object.prototype.hasOwnProperty.call(result, 'vertexId') ||
    Object.prototype.hasOwnProperty.call(result, 'dependsOn')
  ) {
    throw new TypeError('Tree source results cannot include graph metadata');
  }
  return result;
}

function isPromiseLike<T>(value: T | PromiseLike<T>): value is PromiseLike<T> {
  return (typeof value === 'object' && value !== null) ||
    typeof value === 'function'
    ? typeof (value as PromiseLike<T>).then === 'function'
    : false;
}

function validateTreeResult<T extends TreeTypeParameters>(
  result: MaybePromise<MakeVertexResult<T>>,
): MaybePromise<MakeVertexResult<T>> {
  if (isPromiseLike(result)) {
    return result.then(assertTreeResult);
  }
  return assertTreeResult(result);
}

function asInputHint<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
>(hint: (T | R)['VertexHint']): T['VertexHint'] {
  return hint as T['VertexHint'];
}

export function bindTreeSource<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  adapter: TreeSource<T, R>,
  container: ResolvedGraphsContainer<T, R>,
): BoundSource<T, R> {
  const treeContainer = container.treeContainer;
  if (treeContainer === null) {
    throw new TypeError('Tree source binding requires a tree graph container');
  }
  return {
    makeRoot: () => validateTreeResult(adapter.makeRoot()),
    makeVertex: (context) =>
      validateTreeResult(
        adapter.makeVertex(asInputHint<T, R>(context.vertexHint), {
          resolutionContext: context,
          resolvedTree: treeContainer.resolvedTree,
          notMutatedResolvedTree: treeContainer.notMutatedResolvedTree,
        }),
      ),
  };
}

export function bindGraphSource<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  adapter: GraphSource<T, R>,
  container: ResolvedGraphsContainer<T, R>,
): BoundSource<T, R> {
  if (container.sourceMode !== 'graph') {
    throw new TypeError('Graph source binding requires a graph-mode container');
  }
  const bound: BoundSource<T, R> = {
    makeRoot: () => adapter.makeRoot(),
    makeVertex: (context) =>
      adapter.makeVertex(asInputHint<T, R>(context.vertexHint), {
        resolutionContext: context,
        resolvedGraph: container.resolvedGraph,
        notMutatedResolvedGraph: container.notMutatedResolvedGraph,
      }),
  };
  if (adapter.getVertexIdFromHint !== undefined) {
    bound.getVertexIdFromHint = (hint) =>
      adapter.getVertexIdFromHint!(asInputHint<T, R>(hint));
  }
  return bound;
}
