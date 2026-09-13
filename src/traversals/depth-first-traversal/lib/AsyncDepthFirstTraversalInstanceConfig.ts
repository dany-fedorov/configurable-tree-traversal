import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { MaybePromise, VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
  type DepthFirstTraversalInstanceConfig,
  type DepthFirstTraversalInstanceConfigInput,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalInstanceConfigDeepPartial } from '@depth-first-traversal/type-helpers/DepthFirstTraversalInstanceConfigDeepPartial';
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

export const ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG = deepFreeze({
  ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  concurrency: Infinity,
}) as unknown as Omit<
  AsyncDepthFirstTraversalInstanceConfig<TreeTypeParameters>,
  'traversableTree'
>;

export function mergeAsyncDepthFirstTraversalInstanceConfigs<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  base: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  const merged = mergeInstanceConfigs(
    base as unknown as DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
    input as unknown as DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ) as unknown as AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  if (
    merged.concurrency !== Infinity &&
    (!Number.isInteger(merged.concurrency) || merged.concurrency <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
