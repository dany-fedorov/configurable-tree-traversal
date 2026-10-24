import {
  mapSourceResult,
  normalizeSourceResult,
} from './normalizeSourceResult';
import type {
  SourceVertexResult,
  TreeSourceVertexResult,
} from '@core/TraversableTree';
import type { DEFER_READY } from '../../traversals/dag-traversal/lib/DagProgress';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { MakeVertexResult, TraversableTree } from '@core/TraversableTree';
import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type {
  AsyncTraversableGraph,
  TraversableGraph,
} from '@core/TraversableGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { HintVertexId, MaybePromise, VertexId } from '@core/graph/types';
import type { VisitResult } from '@core/graph/types';
import type {
  CallbackBindings,
  CallSpec,
  RawCallbackResult,
  VisitOrder,
} from '@core/effects/types';

export interface BoundSource<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  resolvePrerequisite?(
    id: VertexId,
  ): MaybePromise<MakeVertexResult<T> | undefined>;
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

function normalizeVertexResult<T extends TreeTypeParameters>(
  result: SourceVertexResult<T>,
): MakeVertexResult<T> {
  return normalizeSourceResult(result, false)!;
}

function validateTreeResult<T extends TreeTypeParameters>(
  result: MaybePromise<TreeSourceVertexResult<T>>,
  runnerName?: string,
): MaybePromise<MakeVertexResult<T>> {
  return mapSourceResult(
    result,
    (value) =>
      normalizeSourceResult(
        value,
        false,
        runnerName === undefined ? 'Tree source' : `${runnerName} tree source`,
      )!,
  );
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
  runnerName?: string,
): BoundSource<T, R> {
  const treeContainer = container.treeContainer;
  if (treeContainer === null) {
    throw new TypeError('Tree source binding requires a tree graph container');
  }
  return {
    makeRoot: () => validateTreeResult(adapter.makeRoot(), runnerName),
    makeVertex: (context) =>
      validateTreeResult(
        adapter.makeVertex(asInputHint<T, R>(context.vertexHint), {
          resolutionContext: context,
          resolvedTree: treeContainer.resolvedTree,
          notMutatedResolvedTree: treeContainer.notMutatedResolvedTree,
        }),
        runnerName,
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
    makeRoot: () => mapSourceResult(adapter.makeRoot(), normalizeVertexResult),
    makeVertex: (context) =>
      mapSourceResult(
        adapter.makeVertex(asInputHint<T, R>(context.vertexHint), {
          resolutionContext: context,
          resolvedGraph: container.publicResolvedGraph,
          notMutatedResolvedGraph: container.notMutatedResolvedGraph,
        }),
        normalizeVertexResult,
      ),
  };
  if (adapter.getVertexIdFromHint !== undefined) {
    bound.getVertexIdFromHint = (hint) =>
      adapter.getVertexIdFromHint!(asInputHint<T, R>(hint));
  }
  if (adapter.resolvePrerequisite !== undefined) {
    bound.resolvePrerequisite = (id) =>
      mapSourceResult(adapter.resolvePrerequisite!(id), (value) =>
        normalizeSourceResult(value, true),
      );
  }
  return bound;
}

export type BoundVisit<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = (
  call: Extract<CallSpec<T, R>, { kind: 'VISIT' }>,
) => MaybePromise<VisitResult<R> | typeof DEFER_READY>;

export function createCallbackBindings<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(input: {
  source: BoundSource<T, R>;
  sortHints?: (
    hints: (T | R)['VertexHint'][],
  ) => MaybePromise<(T | R)['VertexHint'][]>;
  visit: Partial<Record<VisitOrder, BoundVisit<T, R>>>;
}): CallbackBindings<T, R> {
  return {
    invoke(call): RawCallbackResult<T, R> {
      switch (call.kind) {
        case 'MAKE_ROOT':
          return { kind: call.kind, value: input.source.makeRoot() };
        case 'RESOLVE_PREREQUISITE':
          return {
            kind: call.kind,
            value: input.source.resolvePrerequisite?.(call.vertexId),
          };
        case 'MAKE_VERTEX':
          return {
            kind: call.kind,
            value: input.source.makeVertex(call.context),
          };
        case 'SORT_HINTS':
          return {
            kind: call.kind,
            value: input.sortHints?.(call.hints.slice()) ?? call.hints.slice(),
          };
        case 'HINT_ID':
          return {
            kind: call.kind,
            value: input.source.getVertexIdFromHint?.(call.hint),
          };
        case 'VISIT': {
          const visitor = input.visit[call.order];
          if (visitor === undefined) {
            throw new Error(`No callback binding for ${call.order}`);
          }
          return { kind: call.kind, value: visitor(call) };
        }
      }
    },
  };
}
