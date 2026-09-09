import type { IndexRange } from '../in-order-helpers/IndexRange';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversableTree } from '@core/TraversableTree';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import type { DepthFirstTraversalInOrderTraversalConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import type { DepthFirstTraversalRunnerInternalObjects } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerInternalObjects';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { OrNullAllFields } from '@depth-first-traversal/type-helpers/OrNullAllFields';
import type { DepthFirstTraversalInstanceConfigDeepPartial } from '@depth-first-traversal/type-helpers/DepthFirstTraversalInstanceConfigDeepPartial';
import { deepFreeze } from '@utils/deepFreeze';

export type SortChildrenHintsFn<TTP extends TreeTypeParameters> = (
  childrenHints: TTP['VertexHint'][],
) => TTP['VertexHint'][];

export type DepthFirstTraversalInstanceConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  traversableTree: TraversableTree<TTP, RW_TTP>;
  sortChildrenHints: SortChildrenHintsFn<TTP> | null;
  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  inOrderTraversalConfig: DepthFirstTraversalInOrderTraversalConfig;
  saveNotMutatedResolvedTree: boolean;
  traversalRunnerInternalObjects: Partial<
    OrNullAllFields<DepthFirstTraversalRunnerInternalObjects<TTP, RW_TTP>>
  >;
};

export const DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  DepthFirstTraversalInstanceConfig<TreeTypeParameters, TreeTypeParameters>,
  'traversableTree'
> = deepFreeze({
  sortChildrenHints: null,
  inOrderTraversalConfig: {
    visitParentAfterChildren: [0, -2],
    visitParentAfterChildrenAllRangesOutOfBoundsFallback: -2,
    visitUpOneChildParents: true,
    considerVisitAfterNullContentVertices: true,
  },
  visitors: {
    [DepthFirstTraversalOrder.PRE_ORDER]: [],
    [DepthFirstTraversalOrder.IN_ORDER]: [],
    [DepthFirstTraversalOrder.POST_ORDER]: [],
  },
  saveNotMutatedResolvedTree: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
});

export type DepthFirstTraversalInstanceConfigInput<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = DepthFirstTraversalInstanceConfigDeepPartial<
  DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  | keyof DepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['inOrderTraversalConfig']
  | keyof DepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['traversalRunnerInternalObjects']
  | keyof DepthFirstTraversalInstanceConfig<TTP, RW_TTP>['visitors']
  | 'traversableTree'
>;

export function mergeInstanceConfigs<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  base: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const inOrder = {
    ...base.inOrderTraversalConfig,
    ...input.inOrderTraversalConfig,
  };
  const visitors = {
    ...base.visitors,
    ...input.visitors,
  };
  return {
    ...base,
    ...input,
    visitors: {
      [DepthFirstTraversalOrder.PRE_ORDER]:
        visitors[DepthFirstTraversalOrder.PRE_ORDER].slice(),
      [DepthFirstTraversalOrder.IN_ORDER]:
        visitors[DepthFirstTraversalOrder.IN_ORDER].slice(),
      [DepthFirstTraversalOrder.POST_ORDER]:
        visitors[DepthFirstTraversalOrder.POST_ORDER].slice(),
    },
    inOrderTraversalConfig: {
      ...inOrder,
      visitParentAfterChildren: clonePositions(
        inOrder.visitParentAfterChildren,
      ),
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: clonePositions(
        inOrder.visitParentAfterChildrenAllRangesOutOfBoundsFallback,
      ),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
      ...(input.traversalRunnerInternalObjects ?? {}),
    },
  };
}

function cloneRange(range: IndexRange): IndexRange {
  return typeof range === 'number' ? range : [range[0], range[1]];
}

function clonePositions(
  positions: DepthFirstTraversalInOrderTraversalConfig['visitParentAfterChildren'],
): DepthFirstTraversalInOrderTraversalConfig['visitParentAfterChildren'] {
  return typeof positions === 'number' || Array.isArray(positions)
    ? cloneRange(positions)
    : { ranges: positions.ranges.map(cloneRange) };
}
