import {
  mergeInOrderOptions,
  type InOrderOptionsPatch,
} from './DepthFirstTraversalInOrderTraversalConfig';
import {
  assertTraversalFields,
  definedOptions,
} from '@core/assertPublicOptions';
import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import type { AsyncTreeVisitor } from '@core/AsyncTraversalVisitor';
import type { AsyncChildHintTransformer } from '@core/ChildHintTransformer';
import type { VisitorRecord } from '@core/graph/types';
import type { VisitorInputs } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstPhase as Order } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';

export type AsyncDepthFirstTraversalVisitors<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in DepthFirstPhase]: VisitorRecord<AsyncTreeVisitor<K, TTP, RW_TTP>>[];
};

export type AsyncDepthFirstTreeResolvedOptions<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  DepthFirstTreeResolvedOptions<TTP, RW_TTP>,
  'traversableTree' | 'transformChildHints' | 'visitors'
> & {
  traversableTree: AsyncTreeSource<TTP, RW_TTP>;
  transformChildHints: AsyncChildHintTransformer<TTP> | null;
  visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;
  concurrency: number;
};

export type AsyncDepthFirstTreeOptionsPatch<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  traversableTree?: AsyncTreeSource<TTP, RW_TTP> | undefined;
  transformChildHints?: AsyncChildHintTransformer<TTP> | null | undefined;
  visitors?:
    | VisitorInputs<AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>>
    | undefined;
  retainOriginalTreeStructure?: boolean | undefined;
  inOrder?: InOrderOptionsPatch | undefined;
  concurrency?: number | undefined;
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
  transformChildHints: null,
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
  const capturedInput = definedOptions(input);
  assertTraversalFields(capturedInput, Object.values(Order));
  const inOrder = mergeInOrderOptions(base.inOrder, capturedInput.inOrder);
  const visitors = {
    ...base.visitors,
    ...definedOptions(capturedInput.visitors ?? {}),
  };
  const merged: AsyncDepthFirstTreeResolvedOptions<TTP, RW_TTP> = {
    ...base,
    ...capturedInput,
    visitors: {
      [Order.PRE_ORDER]: normalizeVisitorDefinitions(visitors[Order.PRE_ORDER]),
      [Order.IN_ORDER]: normalizeVisitorDefinitions(visitors[Order.IN_ORDER]),
      [Order.POST_ORDER]: normalizeVisitorDefinitions(
        visitors[Order.POST_ORDER],
      ),
    },
    inOrder,
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
