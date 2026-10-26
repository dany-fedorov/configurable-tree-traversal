import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { AsyncChildHintSorter } from '@core/ChildHintSorter';
import type { VisitorRecord } from '@core/graph/types';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { ChildIndexSelection } from '@depth-first-traversal/in-order-helpers/IndexRange';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstPhase as Order } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';
import type { InOrderOptions } from './DepthFirstTraversalInOrderTraversalConfig';

export type AsyncDepthFirstTraversalVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in DepthFirstPhase]: VisitorRecord<
    AsyncTraversalVisitor<K, TTP, RW_TTP>
  >[];
};

export type AsyncDepthFirstTreeResolvedOptions<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  DepthFirstTreeResolvedOptions<TTP, RW_TTP>,
  'traversableTree' | 'sortChildrenHints' | 'visitors'
> & {
  traversableTree: AsyncTreeSource<TTP, RW_TTP>;
  sortChildrenHints: AsyncChildHintSorter<TTP> | null;
  visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;
  concurrency: number;
};

export type AsyncDepthFirstTreeOptionsPatch<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  traversableTree?: AsyncTreeSource<TTP, RW_TTP>;
  sortChildrenHints?: AsyncChildHintSorter<TTP> | null;
  visitors?: VisitorInputs<AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>>;
  retainOriginalTreeStructure?: boolean;
  inOrder?: Partial<InOrderOptions>;
  concurrency?: number;
};

export type AsyncDepthFirstTreeOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = AsyncDepthFirstTreeOptionsPatch<TTP, RW_TTP> & {
  traversableTree: AsyncTreeSource<TTP, RW_TTP>;
};

export const ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  AsyncDepthFirstTreeResolvedOptions<VertexTypes>,
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
  base: AsyncDepthFirstTreeResolvedOptions<TTP, RW_TTP>,
  input: AsyncDepthFirstTreeOptionsPatch<TTP, RW_TTP>,
): AsyncDepthFirstTreeResolvedOptions<TTP, RW_TTP> {
  const inOrder = {
    ...base.inOrder,
    ...input.inOrder,
  };
  const visitors = { ...base.visitors, ...input.visitors };
  const merged: AsyncDepthFirstTreeResolvedOptions<TTP, RW_TTP> = {
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
  positions: AsyncDepthFirstTreeResolvedOptions<VertexTypes>['inOrder']['afterChildIndices'],
): AsyncDepthFirstTreeResolvedOptions<VertexTypes>['inOrder']['afterChildIndices'] {
  return typeof positions === 'number' || Array.isArray(positions)
    ? cloneRange(positions)
    : { ranges: positions.ranges.map(cloneRange) };
}
