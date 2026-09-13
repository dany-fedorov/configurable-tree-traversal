import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeBreadthFirstTraversalInstanceConfigs,
  type BreadthFirstTraversalInstanceConfig,
  type BreadthFirstTraversalInstanceConfigInput,
} from './BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';

export type AsyncBreadthFirstTraversalVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in BreadthFirstTraversalOrder]: VisitorRecord<
    AsyncTraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP>
  >[];
};

export type AsyncBreadthFirstSortChildrenHintsFn<
  TTP extends TreeTypeParameters,
> = (childrenHints: TTP['VertexHint'][]) => MaybePromise<TTP['VertexHint'][]>;

export type AsyncBreadthFirstTraversalInstanceConfig<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Omit<
  BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  'traversableTree' | 'sortChildrenHints' | 'visitors'
> & {
  traversableTree: AsyncTraversableTree<TTP, RW_TTP>;
  sortChildrenHints: AsyncBreadthFirstSortChildrenHintsFn<TTP> | null;
  visitors: AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>;
  concurrency: number;
};

export type AsyncBreadthFirstTraversalInstanceConfigInput<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> = Partial<
  Omit<
    AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    'visitors' | 'traversalRunnerInternalObjects'
  >
> & {
  visitors?: Partial<AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>>;
  traversalRunnerInternalObjects?: Partial<
    AsyncBreadthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['traversalRunnerInternalObjects']
  >;
};

export const ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG = deepFreeze(
  {
    ...BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
    concurrency: Infinity,
  },
) as unknown as Omit<
  AsyncBreadthFirstTraversalInstanceConfig<TreeTypeParameters>,
  'traversableTree'
>;

export function mergeAsyncBreadthFirstTraversalInstanceConfigs<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  base: AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const merged = mergeBreadthFirstTraversalInstanceConfigs(
    base as unknown as BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    input as unknown as BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ) as unknown as AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
