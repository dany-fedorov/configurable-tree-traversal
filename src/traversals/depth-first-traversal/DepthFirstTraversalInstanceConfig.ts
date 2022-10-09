import type {
  TraversableTree,
  TraversalVisitorRecord,
  TreeTypeParameters,
} from '../../../core';
import { ResolvedTreesContainer } from './ResolvedTreesContainer';
import type { DepthFirstTraversalState } from '../configuratin';
import type { DepthFirstTraversalVisitors } from './DepthFirstTraversalVisitors';

export type IndexRange = number | [number, number];

export type DepthFirstTraversalInstanceConfig_InOrderTraversalConfig = {
  visitParentAfterChildren: IndexRange | number | { ranges: IndexRange[] };
  visitParentAfterChildrenAllRangesOutOfBoundsFallback:
    | IndexRange
    | number
    | { ranges: IndexRange[] };
  visitUpOneChildParents: boolean;
};

type OrNull<T extends object> = {
  [K in keyof T]: T[K] | null;
};

type DeepPartial<T, IgnoreContentOf extends string> = T extends object
  ? T extends unknown[]
    ? T
    : {
        [P in keyof T]?: P extends IgnoreContentOf
          ? T[P]
          : // eslint-disable-next-line @typescript-eslint/ban-types
          T[P] extends Function | null
          ? T[P]
          : DeepPartial<T[P], IgnoreContentOf>;
      }
  : T;

export type SortChildrenHintsFn<TTP extends TreeTypeParameters> = (
  childrenHints: TTP['VertexHint'][],
) => TTP['VertexHint'][];

export type DepthFirstTraversalInternalObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolvedTreesContainer: ResolvedTreesContainer<TTP, RW_TTP>;
  traversalState: DepthFirstTraversalState<TTP, RW_TTP>;
};

export type DepthFirstTraversalInstanceConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  traversableTree: TraversableTree<TTP, RW_TTP>;
  sortChildrenHints: SortChildrenHintsFn<TTP> | null;
  saveNotMutatedResolvedTree: boolean;
  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  inOrderTraversalConfig: DepthFirstTraversalInstanceConfig_InOrderTraversalConfig;
  internalObjects: Partial<
    OrNull<DepthFirstTraversalInternalObjects<TTP, RW_TTP>>
  >;
};

export const DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  DepthFirstTraversalInstanceConfig<TreeTypeParameters, TreeTypeParameters>,
  'traversableTree'
> = {
  sortChildrenHints: null,
  saveNotMutatedResolvedTree: false,
  inOrderTraversalConfig: {
    visitParentAfterChildren: [0, -2],
    visitParentAfterChildrenAllRangesOutOfBoundsFallback: -2,
    visitUpOneChildParents: true,
  },
  visitors: {
    [DepthFirstTraversalOrder.PRE_ORDER]: [],
    [DepthFirstTraversalOrder.IN_ORDER]: [],
    [DepthFirstTraversalOrder.POST_ORDER]: [],
  },
  internalObjects: {
    resolvedTreesContainer: null,
    traversalState: null,
    // traversalRootVertexRef: null,
    // lastVisitedOrder: null,
    // lastVisitedVisitorIndex: null,
  },
};

export type DepthFirstTraversalInstanceConfigInput<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = DeepPartial<
  DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  | keyof DepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['inOrderTraversalConfig']
  | keyof DepthFirstTraversalInstanceConfig<TTP, RW_TTP>['internalObjects']
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
  return {
    ...base,
    ...input,
    visitors: {
      ...base.visitors,
      ...input.visitors,
    },
    inOrderTraversalConfig: {
      ...base.inOrderTraversalConfig,
      ...input.inOrderTraversalConfig,
    },
    internalObjects: {
      ...base.internalObjects,
      ...(input.internalObjects ?? {}),
    },
  };
}
