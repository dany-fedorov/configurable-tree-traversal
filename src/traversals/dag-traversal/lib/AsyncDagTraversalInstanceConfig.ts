import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';
import type { AsyncTraversableGraph } from '@core/TraversableGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { deepFreeze } from '@utils/deepFreeze';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import { DagTraversalOrder } from './DagTraversalOrder';
import type { AsyncDagVisitor } from './DagTraversalVisitor';

export type AsyncDagSource<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> =
  | {
      traversableGraph: AsyncTraversableGraph<T, R>;
      traversableTree?: never;
    }
  | {
      traversableTree: AsyncTraversableTree<T, R>;
      traversableGraph?: never;
    };

export type AsyncDagTraversalVisitors<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  [K in DagTraversalOrder]: VisitorRecord<AsyncDagVisitor<T, R>>[];
};

export type AsyncDagSortChildrenHintsFn<T extends TreeTypeParameters> = (
  childrenHints: T['VertexHint'][],
) => MaybePromise<T['VertexHint'][]>;

type AsyncDagTraversalOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  sortChildrenHints: AsyncDagSortChildrenHintsFn<T> | null;
  visitors: AsyncDagTraversalVisitors<T, R>;
  saveNotMutatedResolvedGraph: boolean;
  concurrency: number;
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer:
      | DagTraversalRunnerInternalObjects<T, R>['resolvedGraphsContainer']
      | null;
    state: DagTraversalRunnerInternalObjects<T, R>['state'] | null;
  };
};

export type AsyncDagTraversalInstanceConfig<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = AsyncDagSource<T, R> & AsyncDagTraversalOptions<T, R>;

type AsyncDagTraversalOptionsInput<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = Partial<
  Omit<
    AsyncDagTraversalOptions<T, R>,
    'visitors' | 'traversalRunnerInternalObjects'
  >
> & {
  visitors?: Partial<AsyncDagTraversalVisitors<T, R>>;
  traversalRunnerInternalObjects?: Partial<
    AsyncDagTraversalOptions<T, R>['traversalRunnerInternalObjects']
  >;
};

export type AsyncDagTraversalInstanceConfigInput<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = AsyncDagSource<T, R> & AsyncDagTraversalOptionsInput<T, R>;

export type AsyncDagTraversalConfigureInput<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = AsyncDagTraversalOptionsInput<T, R> &
  (
    | {
        traversableGraph?: AsyncTraversableGraph<T, R>;
        traversableTree?: never;
      }
    | {
        traversableTree?: AsyncTraversableTree<T, R>;
        traversableGraph?: never;
      }
  );

export const ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG = deepFreeze({
  sortChildrenHints: null,
  visitors: {
    [DagTraversalOrder.ON_READY]: [],
    [DagTraversalOrder.ON_COMPLETE]: [],
  },
  saveNotMutatedResolvedGraph: false,
  concurrency: Infinity,
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer: null,
    state: null,
  },
}) as unknown as Omit<
  AsyncDagTraversalInstanceConfig<TreeTypeParameters>,
  'traversableGraph' | 'traversableTree'
>;

export function mergeAsyncDagTraversalInstanceConfigs<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
>(
  base: AsyncDagTraversalInstanceConfig<T, R>,
  input: AsyncDagTraversalConfigureInput<T, R>,
): AsyncDagTraversalInstanceConfig<T, R> {
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  const merged = {
    ...base,
    ...input,
    visitors: {
      [DagTraversalOrder.ON_READY]:
        visitors[DagTraversalOrder.ON_READY].slice(),
      [DagTraversalOrder.ON_COMPLETE]:
        visitors[DagTraversalOrder.ON_COMPLETE].slice(),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
      ...(input.traversalRunnerInternalObjects ?? {}),
    },
  } as AsyncDagTraversalInstanceConfig<T, R>;
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
