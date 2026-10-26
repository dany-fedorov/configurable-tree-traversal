import {
  mapSourceResult,
  normalizeSourceResult,
} from './normalizeSourceResult';
import type {
  DagVertexResolution,
  TreeVertexResolution,
} from '@core/TraversableTree';
import type { DEFER_READY } from '../../traversals/dag-traversal/lib/DagProgress';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { MakeVertexResult, TreeSource } from '@core/TraversableTree';
import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
} from '@core/TraversableGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
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
  T extends VertexTypes,
  R extends VertexTypes = T,
> {
  resolvePrerequisite?(
    id: VertexId,
  ): MaybePromise<MakeVertexResult<T> | undefined>;
  resolveRoot(): MaybePromise<MakeVertexResult<T>>;
  resolveChild(
    context: VertexResolutionContext<T | R>,
  ): MaybePromise<MakeVertexResult<T>>;
  getVertexIdFromHint?(
    hint: (T | R)['VertexHint'],
  ): MaybePromise<HintVertexId | undefined>;
}

type AnyTreeSource<T extends VertexTypes, R extends VertexTypes> =
  | TreeSource<T, R>
  | AsyncTreeSource<T, R>;

type GraphSource<
  T extends VertexTypes,
  R extends VertexTypes,
  ID,
> = DagDiscoverySource<T, R, ID> | AsyncDagDiscoverySource<T, R, ID>;

function normalizeVertexResult<T extends VertexTypes>(
  result: DagVertexResolution<T>,
): MakeVertexResult<T> {
  return normalizeSourceResult(result, false)!;
}

function validateTreeResult<T extends VertexTypes>(
  result: MaybePromise<TreeVertexResolution<T>>,
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
  T extends VertexTypes,
  R extends VertexTypes,
>(hint: (T | R)['VertexHint']): T['VertexHint'] {
  return hint as T['VertexHint'];
}

export function bindTreeSource<
  T extends VertexTypes,
  R extends VertexTypes = T,
>(
  adapter: AnyTreeSource<T, R>,
  container: ResolvedGraphsContainer<T, R>,
  runnerName?: string,
): BoundSource<T, R> {
  const treeContainer = container.treeContainer;
  if (treeContainer === null) {
    throw new TypeError('Tree source binding requires a tree graph container');
  }
  return {
    resolveRoot: () => validateTreeResult(adapter.resolveRoot(), runnerName),
    resolveChild: (context) =>
      validateTreeResult(
        adapter.resolveChild(asInputHint<T, R>(context.vertexHint), {
          resolutionContext: context,
          resolvedTree: treeContainer.resolvedTree,
          notMutatedResolvedTree: treeContainer.notMutatedResolvedTree,
        }),
        runnerName,
      ),
  };
}

export function bindGraphSource<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  adapter: GraphSource<T, R, ID>,
  container: ResolvedGraphsContainer<T, R, ID>,
): BoundSource<T, R> {
  if (container.sourceMode !== 'graph') {
    throw new TypeError('Graph source binding requires a graph-mode container');
  }
  const bound: BoundSource<T, R> = {
    resolveRoot: () => mapSourceResult(adapter.resolveRoot(), normalizeVertexResult),
    resolveChild: (context) =>
      mapSourceResult(
        adapter.resolveChild(asInputHint<T, R>(context.vertexHint), {
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
      mapSourceResult(
        // Kernel prerequisite IDs originate from this source's typed dependencies.
        adapter.resolvePrerequisite!(id as ID),
        (value) => normalizeSourceResult<T, ID>(value, true),
      );
  }
  return bound;
}

export type BoundVisit<
  T extends VertexTypes,
  R extends VertexTypes = T,
> = (
  call: Extract<CallSpec<T, R>, { kind: 'VISIT' }>,
) => MaybePromise<VisitResult<R> | typeof DEFER_READY>;

export function createCallbackBindings<
  T extends VertexTypes,
  R extends VertexTypes = T,
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
          return { kind: call.kind, value: input.source.resolveRoot() };
        case 'RESOLVE_PREREQUISITE':
          return {
            kind: call.kind,
            value: input.source.resolvePrerequisite?.(call.vertexId),
          };
        case 'MAKE_VERTEX':
          return {
            kind: call.kind,
            value: input.source.resolveChild(call.context),
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
