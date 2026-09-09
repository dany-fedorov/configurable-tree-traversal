import type { TraversableTree } from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalRunnerInternalObjects } from './BreadthFirstTraversalRunnerInternalObjects';
import type { BreadthFirstTraversalVisitors } from './BreadthFirstTraversalVisitors';
import { deepFreeze } from '@utils/deepFreeze';

export type BreadthFirstSortChildrenHintsFn<TTP extends TreeTypeParameters> = (
  childrenHints: TTP['VertexHint'][],
) => TTP['VertexHint'][];

export type BreadthFirstTraversalInstanceConfig<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = {
  traversableTree: TraversableTree<TTP, RW_TTP>;
  sortChildrenHints: BreadthFirstSortChildrenHintsFn<TTP> | null;
  visitors: BreadthFirstTraversalVisitors<TTP, RW_TTP>;
  saveNotMutatedResolvedTree: boolean;
  traversalRunnerInternalObjects: {
    resolvedTreesContainer:
      | BreadthFirstTraversalRunnerInternalObjects<
          TTP,
          RW_TTP
        >['resolvedTreesContainer']
      | null;
    state:
      | BreadthFirstTraversalRunnerInternalObjects<TTP, RW_TTP>['state']
      | null;
  };
};

export type BreadthFirstTraversalInstanceConfigInput<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Partial<
  Omit<
    BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    'visitors' | 'traversalRunnerInternalObjects'
  >
> & {
  visitors?: Partial<BreadthFirstTraversalVisitors<TTP, RW_TTP>>;
  traversalRunnerInternalObjects?: Partial<
    BreadthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['traversalRunnerInternalObjects']
  >;
};

export const BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  BreadthFirstTraversalInstanceConfig<TreeTypeParameters, TreeTypeParameters>,
  'traversableTree'
> = deepFreeze({
  sortChildrenHints: null,
  visitors: {
    [BreadthFirstTraversalOrder.LEVEL_ORDER]: [],
  },
  saveNotMutatedResolvedTree: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
});

export function mergeBreadthFirstTraversalInstanceConfigs<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  base: BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): BreadthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const visitors = {
    ...base.visitors,
    ...(input.visitors ?? {}),
  };
  return {
    ...base,
    ...input,
    visitors: {
      [BreadthFirstTraversalOrder.LEVEL_ORDER]:
        visitors[BreadthFirstTraversalOrder.LEVEL_ORDER].slice(),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
      ...(input.traversalRunnerInternalObjects ?? {}),
    },
  };
}
