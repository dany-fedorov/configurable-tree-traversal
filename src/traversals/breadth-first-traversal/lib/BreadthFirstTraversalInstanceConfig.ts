import type { VisitorInputs } from '@core/TraversalVisitor';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { TreeSource } from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalRunnerInternalObjects } from './BreadthFirstTraversalRunnerInternalObjects';
import type { BreadthFirstTraversalVisitors } from './BreadthFirstTraversalVisitors';
import { deepFreeze } from '@utils/deepFreeze';

export type BreadthFirstSortChildrenHintsFn<TTP extends VertexTypes> = (
  childrenHints: TTP['VertexHint'][],
) => TTP['VertexHint'][];

export type BreadthFirstTraversalInstanceConfig<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  traversableTree: TreeSource<TTP, RW_TTP>;
  sortChildrenHints: BreadthFirstSortChildrenHintsFn<TTP> | null;
  visitors: BreadthFirstTraversalVisitors<TTP, RW_TTP>;
  retainOriginalTreeStructure: boolean;
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
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Partial<
  Omit<
    BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    'visitors' | 'traversalRunnerInternalObjects'
  >
> & {
  visitors?: VisitorInputs<BreadthFirstTraversalVisitors<TTP, RW_TTP>>;
  traversalRunnerInternalObjects?: Partial<
    BreadthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['traversalRunnerInternalObjects']
  >;
};

export const BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  BreadthFirstTraversalInstanceConfig<VertexTypes, VertexTypes>,
  'traversableTree'
> = deepFreeze({
  sortChildrenHints: null,
  visitors: {
    [BreadthFirstPhase.LEVEL_ORDER]: [],
  },
  retainOriginalTreeStructure: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
});

export function mergeBreadthFirstTraversalInstanceConfigs<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
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
      [BreadthFirstPhase.LEVEL_ORDER]: normalizeVisitorDefinitions(
        visitors[BreadthFirstPhase.LEVEL_ORDER],
      ),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
      ...(input.traversalRunnerInternalObjects ?? {}),
    },
  };
}
