import type { VisitorInputs } from '@core/TraversalVisitor';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { ChildIndexSelection } from '../in-order-helpers/IndexRange';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TreeSource } from '@core/TraversableTree';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import type { InOrderOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import type { DepthFirstTraversalRunnerInternalObjects } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerInternalObjects';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { OrNullAllFields } from '@depth-first-traversal/type-helpers/OrNullAllFields';
import type { DepthFirstTraversalInstanceConfigDeepPartial } from '@depth-first-traversal/type-helpers/DepthFirstTraversalInstanceConfigDeepPartial';
import { deepFreeze } from '@utils/deepFreeze';

export type SortChildrenHintsFn<TTP extends VertexTypes> = (
  childrenHints: TTP['VertexHint'][],
) => TTP['VertexHint'][];

export type DepthFirstTraversalInstanceConfig<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  traversableTree: TreeSource<TTP, RW_TTP>;
  sortChildrenHints: SortChildrenHintsFn<TTP> | null;
  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  inOrder: InOrderOptions;
  retainOriginalTreeStructure: boolean;
  traversalRunnerInternalObjects: Partial<
    OrNullAllFields<DepthFirstTraversalRunnerInternalObjects<TTP, RW_TTP>>
  >;
};

export const DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  DepthFirstTraversalInstanceConfig<VertexTypes, VertexTypes>,
  'traversableTree'
> = deepFreeze({
  sortChildrenHints: null,
  inOrder: {
    afterChildIndices: [0, -2],
    fallbackChildIndices: -2,
    visitSingleChildParent: true,
    visitAfterOmittedChildren: true,
  },
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: [],
    [DepthFirstPhase.IN_ORDER]: [],
    [DepthFirstPhase.POST_ORDER]: [],
  },
  retainOriginalTreeStructure: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
});

export type DepthFirstTraversalInstanceConfigInput<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = Omit<
  DepthFirstTraversalInstanceConfigDeepPartial<
    DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    | keyof DepthFirstTraversalInstanceConfig<TTP, RW_TTP>['inOrder']
    | keyof DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >['traversalRunnerInternalObjects']
    | keyof DepthFirstTraversalInstanceConfig<TTP, RW_TTP>['visitors']
    | 'traversableTree'
  >,
  'visitors'
> & { visitors?: VisitorInputs<DepthFirstTraversalVisitors<TTP, RW_TTP>> };

export function mergeInstanceConfigs<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  base: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const inOrder = {
    ...base.inOrder,
    ...input.inOrder,
  };
  const visitors = {
    ...base.visitors,
    ...input.visitors,
  };
  return {
    ...base,
    ...input,
    visitors: {
      [DepthFirstPhase.PRE_ORDER]: normalizeVisitorDefinitions(
        visitors[DepthFirstPhase.PRE_ORDER],
      ),
      [DepthFirstPhase.IN_ORDER]: normalizeVisitorDefinitions(
        visitors[DepthFirstPhase.IN_ORDER],
      ),
      [DepthFirstPhase.POST_ORDER]: normalizeVisitorDefinitions(
        visitors[DepthFirstPhase.POST_ORDER],
      ),
    },
    inOrder: {
      ...inOrder,
      afterChildIndices: clonePositions(inOrder.afterChildIndices),
      fallbackChildIndices: clonePositions(inOrder.fallbackChildIndices),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
      ...(input.traversalRunnerInternalObjects ?? {}),
    },
  };
}

function cloneRange(range: ChildIndexSelection): ChildIndexSelection {
  return typeof range === 'number' ? range : [range[0], range[1]];
}

function clonePositions(
  positions: InOrderOptions['afterChildIndices'],
): InOrderOptions['afterChildIndices'] {
  return typeof positions === 'number' || Array.isArray(positions)
    ? cloneRange(positions)
    : { ranges: positions.ranges.map(cloneRange) };
}
