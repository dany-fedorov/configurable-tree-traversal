import type { TraversableGraph } from '@core/TraversableGraph';
import type { TraversableTree } from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { VisitorRecord } from '@core/graph/types';
import { deepFreeze } from '@utils/deepFreeze';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import { DagTraversalOrder } from './DagTraversalOrder';
import type { DagVisitor } from './DagTraversalVisitor';

export type DagSource<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> =
  | { traversableGraph: TraversableGraph<T, R>; traversableTree?: never }
  | { traversableTree: TraversableTree<T, R>; traversableGraph?: never };

export type DagTraversalVisitors<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  [K in DagTraversalOrder]: VisitorRecord<DagVisitor<T, R>>[];
};

export type DagSortChildrenHintsFn<T extends TreeTypeParameters> = (
  childrenHints: T['VertexHint'][],
) => T['VertexHint'][];

type DagTraversalOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  sortChildrenHints: DagSortChildrenHintsFn<T> | null;
  visitors: DagTraversalVisitors<T, R>;
  saveNotMutatedResolvedGraph: boolean;
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer:
      | DagTraversalRunnerInternalObjects<T, R>['resolvedGraphsContainer']
      | null;
    state: DagTraversalRunnerInternalObjects<T, R>['state'] | null;
  };
};

export type DagTraversalInstanceConfig<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = DagSource<T, R> & DagTraversalOptions<T, R>;

type DagTraversalOptionsInput<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = Partial<
  Omit<DagTraversalOptions<T, R>, 'visitors' | 'traversalRunnerInternalObjects'>
> & {
  visitors?: Partial<DagTraversalVisitors<T, R>>;
  traversalRunnerInternalObjects?: Partial<
    DagTraversalOptions<T, R>['traversalRunnerInternalObjects']
  >;
};

export type DagTraversalInstanceConfigInput<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = DagSource<T, R> & DagTraversalOptionsInput<T, R>;

export type DagTraversalConfigureInput<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = DagTraversalOptionsInput<T, R> &
  (
    | { traversableGraph?: TraversableGraph<T, R>; traversableTree?: never }
    | { traversableTree?: TraversableTree<T, R>; traversableGraph?: never }
  );

export const DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: DagTraversalOptions<
  TreeTypeParameters,
  TreeTypeParameters
> = deepFreeze({
  sortChildrenHints: null,
  visitors: {
    [DagTraversalOrder.ON_READY]: [],
    [DagTraversalOrder.ON_COMPLETE]: [],
  },
  saveNotMutatedResolvedGraph: false,
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer: null,
    state: null,
  },
});

export function mergeDagTraversalInstanceConfigs<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
>(
  base: DagTraversalInstanceConfig<T, R>,
  input: DagTraversalConfigureInput<T, R>,
): DagTraversalInstanceConfig<T, R> {
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  return {
    ...base,
    ...input,
    visitors: {
      [DagTraversalOrder.ON_READY]: visitors[DagTraversalOrder.ON_READY].slice(),
      [DagTraversalOrder.ON_COMPLETE]:
        visitors[DagTraversalOrder.ON_COMPLETE].slice(),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
      ...(input.traversalRunnerInternalObjects ?? {}),
    },
  } as DagTraversalInstanceConfig<T, R>;
}
