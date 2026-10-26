import type { VisitorInputs } from '@core/TraversalVisitor';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';
import type { VertexTypes } from '@core/TreeTypeParameters';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTraversalInstanceConfig,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstPhase as Order } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalInstanceConfigDeepPartial } from '@depth-first-traversal/type-helpers/DepthFirstTraversalInstanceConfigDeepPartial';
import type { ChildIndexSelection } from '@depth-first-traversal/in-order-helpers/IndexRange';
import { deepFreeze } from '@utils/deepFreeze';

export type AsyncDepthFirstTraversalVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in DepthFirstPhase]: VisitorRecord<
    AsyncTraversalVisitor<K, TTP, RW_TTP>
  >[];
};

export type AsyncSortChildrenHintsFn<TTP extends VertexTypes> = (
  childrenHints: TTP['VertexHint'][],
) => MaybePromise<TTP['VertexHint'][]>;

export type AsyncDepthFirstTraversalInstanceConfig<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  'traversableTree' | 'sortChildrenHints' | 'visitors'
> & {
  traversableTree: AsyncTreeSource<TTP, RW_TTP>;
  sortChildrenHints: AsyncSortChildrenHintsFn<TTP> | null;
  visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;
  concurrency: number;
};

export type AsyncDepthFirstTraversalInstanceConfigInput<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  DepthFirstTraversalInstanceConfigDeepPartial<
    AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    | keyof AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>['inOrder']
    | keyof AsyncDepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >['traversalRunnerInternalObjects']
    | keyof AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>['visitors']
    | 'traversableTree'
  >,
  'visitors'
> & { visitors?: VisitorInputs<AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>> };

export const ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  AsyncDepthFirstTraversalInstanceConfig<VertexTypes>,
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
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  base: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const inOrder = {
    ...base.inOrder,
    ...input.inOrder,
  };
  const visitors = { ...base.visitors, ...input.visitors };
  const merged: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP> = {
    ...base,
    ...input,
    visitors: {
      [Order.PRE_ORDER]: normalizeVisitorDefinitions(visitors[Order.PRE_ORDER]),
      [Order.IN_ORDER]: normalizeVisitorDefinitions(visitors[Order.IN_ORDER]),
      [Order.POST_ORDER]: normalizeVisitorDefinitions(
        visitors[Order.POST_ORDER],
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
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}

function cloneRange(range: ChildIndexSelection): ChildIndexSelection {
  return typeof range === 'number' ? range : [range[0], range[1]];
}

function clonePositions(
  positions: AsyncDepthFirstTraversalInstanceConfig<VertexTypes>['inOrder']['afterChildIndices'],
): AsyncDepthFirstTraversalInstanceConfig<VertexTypes>['inOrder']['afterChildIndices'] {
  return typeof positions === 'number' || Array.isArray(positions)
    ? cloneRange(positions)
    : { ranges: positions.ranges.map(cloneRange) };
}
