import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTraversalInstanceConfig,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstTraversalOrder as Order } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalInstanceConfigDeepPartial } from '@depth-first-traversal/type-helpers/DepthFirstTraversalInstanceConfigDeepPartial';
import type { IndexRange } from '@depth-first-traversal/in-order-helpers/IndexRange';
import { deepFreeze } from '@utils/deepFreeze';

export type AsyncDepthFirstTraversalVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in DepthFirstTraversalOrder]: VisitorRecord<
    AsyncTraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>
  >[];
};

export type AsyncSortChildrenHintsFn<TTP extends TreeTypeParameters> = (
  childrenHints: TTP['VertexHint'][],
) => MaybePromise<TTP['VertexHint'][]>;

export type AsyncDepthFirstTraversalInstanceConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Omit<
  DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  'traversableTree' | 'sortChildrenHints' | 'visitors'
> & {
  traversableTree: AsyncTraversableTree<TTP, RW_TTP>;
  sortChildrenHints: AsyncSortChildrenHintsFn<TTP> | null;
  visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;
  concurrency: number;
};

export type AsyncDepthFirstTraversalInstanceConfigInput<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = DepthFirstTraversalInstanceConfigDeepPartial<
  AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  | keyof AsyncDepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['inOrderTraversalConfig']
  | keyof AsyncDepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['traversalRunnerInternalObjects']
  | keyof AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>['visitors']
  | 'traversableTree'
>;

export const ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  AsyncDepthFirstTraversalInstanceConfig<TreeTypeParameters>,
  'traversableTree'
> = deepFreeze({
  ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  sortChildrenHints: null,
  visitors: {
    [Order.PRE_ORDER]: [],
    [Order.IN_ORDER]: [],
    [Order.POST_ORDER]: [],
  },
  concurrency: Infinity,
});

export function mergeAsyncDepthFirstTraversalInstanceConfigs<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  base: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const inOrder = {
    ...base.inOrderTraversalConfig,
    ...input.inOrderTraversalConfig,
  };
  const visitors = { ...base.visitors, ...input.visitors };
  const merged: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP> = {
    ...base,
    ...input,
    visitors: {
      [Order.PRE_ORDER]: visitors[Order.PRE_ORDER].slice(),
      [Order.IN_ORDER]: visitors[Order.IN_ORDER].slice(),
      [Order.POST_ORDER]: visitors[Order.POST_ORDER].slice(),
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
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}

function cloneRange(range: IndexRange): IndexRange {
  return typeof range === 'number' ? range : [range[0], range[1]];
}

function clonePositions(
  positions: AsyncDepthFirstTraversalInstanceConfig<TreeTypeParameters>['inOrderTraversalConfig']['visitParentAfterChildren'],
): AsyncDepthFirstTraversalInstanceConfig<TreeTypeParameters>['inOrderTraversalConfig']['visitParentAfterChildren'] {
  return typeof positions === 'number' || Array.isArray(positions)
    ? cloneRange(positions)
    : { ranges: positions.ranges.map(cloneRange) };
}
