import type { ChildHintSorter } from '@core/ChildHintSorter';
import type { TreeSource } from '@core/TraversableTree';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { deepFreeze } from '@utils/deepFreeze';
import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalRunnerInternalObjects } from './BreadthFirstTraversalRunnerInternalObjects';
import type { BreadthFirstTraversalVisitors } from './BreadthFirstTraversalVisitors';

export type BreadthFirstTreeResolvedOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  traversableTree: TreeSource<TTP, RW_TTP>;
  sortChildrenHints: ChildHintSorter<TTP> | null;
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

export type BreadthFirstTreeOptionsPatch<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  traversableTree?: TreeSource<TTP, RW_TTP>;
  sortChildrenHints?: ChildHintSorter<TTP> | null;
  visitors?: VisitorInputs<BreadthFirstTraversalVisitors<TTP, RW_TTP>>;
  retainOriginalTreeStructure?: boolean;
};

export type BreadthFirstTreeOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = BreadthFirstTreeOptionsPatch<TTP, RW_TTP> & {
  traversableTree: TreeSource<TTP, RW_TTP>;
};

export const BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  BreadthFirstTreeResolvedOptions<VertexTypes, VertexTypes>,
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
  base: BreadthFirstTreeResolvedOptions<TTP, RW_TTP>,
  input: BreadthFirstTreeOptionsPatch<TTP, RW_TTP>,
): BreadthFirstTreeResolvedOptions<TTP, RW_TTP> {
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
    },
  };
}
