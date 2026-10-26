import type { ChildHintSorter } from '@core/ChildHintSorter';
import type { TreeSource } from '@core/TraversableTree';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { InOrderOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalRunnerInternalObjects } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerInternalObjects';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import type { OrNullAllFields } from '@depth-first-traversal/type-helpers/OrNullAllFields';
import { deepFreeze } from '@utils/deepFreeze';
import type { ChildIndexSelection } from '../in-order-helpers/IndexRange';

export type DepthFirstTreeResolvedOptions<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  traversableTree: TreeSource<TTP, RW_TTP>;
  sortChildrenHints: ChildHintSorter<TTP> | null;
  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  inOrder: InOrderOptions;
  retainOriginalTreeStructure: boolean;
  traversalRunnerInternalObjects: Partial<
    OrNullAllFields<DepthFirstTraversalRunnerInternalObjects<TTP, RW_TTP>>
  >;
};

export const DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  DepthFirstTreeResolvedOptions<VertexTypes, VertexTypes>,
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

export type DepthFirstTreeOptionsPatch<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Partial<
  Omit<
    DepthFirstTreeResolvedOptions<TTP, RW_TTP>,
    'visitors' | 'traversalRunnerInternalObjects' | 'inOrder'
  >
> & {
  visitors?: VisitorInputs<DepthFirstTraversalVisitors<TTP, RW_TTP>>;
} & { inOrder?: Partial<InOrderOptions> };

export type DepthFirstTreeOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = DepthFirstTreeOptionsPatch<TTP, RW_TTP> & {
  traversableTree: DepthFirstTreeResolvedOptions<
    TTP,
    RW_TTP
  >['traversableTree'];
};

export function mergeInstanceConfigs<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  base: DepthFirstTreeResolvedOptions<TTP, RW_TTP>,
  input: DepthFirstTreeOptionsPatch<TTP, RW_TTP>,
): DepthFirstTreeResolvedOptions<TTP, RW_TTP> {
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
