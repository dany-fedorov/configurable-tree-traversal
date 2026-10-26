import type { VisitorInputs } from '@core/TraversalVisitor';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';
import type { VertexTypes } from '@core/TreeTypeParameters';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type BreadthFirstTraversalInstanceConfig,
} from './BreadthFirstTraversalInstanceConfig';
import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';

export type AsyncBreadthFirstTraversalVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in BreadthFirstPhase]: VisitorRecord<
    AsyncTraversalVisitor<K, TTP, RW_TTP>
  >[];
};

export type AsyncBreadthFirstSortChildrenHintsFn<
  TTP extends VertexTypes,
> = (childrenHints: TTP['VertexHint'][]) => MaybePromise<TTP['VertexHint'][]>;

export type AsyncBreadthFirstTraversalInstanceConfig<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  'traversableTree' | 'sortChildrenHints' | 'visitors'
> & {
  traversableTree: AsyncTreeSource<TTP, RW_TTP>;
  sortChildrenHints: AsyncBreadthFirstSortChildrenHintsFn<TTP> | null;
  visitors: AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>;
  concurrency: number;
};

export type AsyncBreadthFirstTraversalInstanceConfigInput<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Partial<
  Omit<
    AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    'visitors' | 'traversalRunnerInternalObjects'
  >
> & {
  visitors?: VisitorInputs<AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>>;
  traversalRunnerInternalObjects?: Partial<
    AsyncBreadthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['traversalRunnerInternalObjects']
  >;
};

export const ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  AsyncBreadthFirstTraversalInstanceConfig<VertexTypes>,
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
  base: AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const visitors = { ...base.visitors, ...(input.visitors ?? {}) };
  const merged: AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP> = {
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
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
