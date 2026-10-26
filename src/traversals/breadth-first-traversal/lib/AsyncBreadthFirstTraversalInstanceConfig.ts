import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { AsyncChildHintSorter } from '@core/ChildHintSorter';
import type { VisitorRecord } from '@core/graph/types';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { deepFreeze } from '@utils/deepFreeze';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type BreadthFirstTreeResolvedOptions,
} from './BreadthFirstTraversalInstanceConfig';
import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';

export type AsyncBreadthFirstTraversalVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in BreadthFirstPhase]: VisitorRecord<
    AsyncTraversalVisitor<K, TTP, RW_TTP>
  >[];
};

export type AsyncBreadthFirstTreeResolvedOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  BreadthFirstTreeResolvedOptions<TTP, RW_TTP>,
  'traversableTree' | 'sortChildrenHints' | 'visitors'
> & {
  traversableTree: AsyncTreeSource<TTP, RW_TTP>;
  sortChildrenHints: AsyncChildHintSorter<TTP> | null;
  visitors: AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>;
  concurrency: number;
};

export type AsyncBreadthFirstTreeOptionsPatch<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Partial<
  Omit<
    AsyncBreadthFirstTreeResolvedOptions<TTP, RW_TTP>,
    'visitors' | 'traversalRunnerInternalObjects' | 'inOrder'
  >
> & {
  visitors?: VisitorInputs<AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>>;
};

export type AsyncBreadthFirstTreeOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = AsyncBreadthFirstTreeOptionsPatch<TTP, RW_TTP> & {
  traversableTree: AsyncBreadthFirstTreeResolvedOptions<
    TTP,
    RW_TTP
  >['traversableTree'];
};

export const ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  AsyncBreadthFirstTreeResolvedOptions<VertexTypes>,
  'traversableTree'
> = deepFreeze({
  ...BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  sortChildrenHints: null,
  visitors: {
    [BreadthFirstPhase.LEVEL_ORDER]: [],
  },
  concurrency: Infinity,
});

export function mergeAsyncBreadthFirstTraversalInstanceConfigs<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
>(
  base: AsyncBreadthFirstTreeResolvedOptions<TTP, RW_TTP>,
  input: AsyncBreadthFirstTreeOptionsPatch<TTP, RW_TTP>,
): AsyncBreadthFirstTreeResolvedOptions<TTP, RW_TTP> {
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  const merged: AsyncBreadthFirstTreeResolvedOptions<TTP, RW_TTP> = {
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
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
