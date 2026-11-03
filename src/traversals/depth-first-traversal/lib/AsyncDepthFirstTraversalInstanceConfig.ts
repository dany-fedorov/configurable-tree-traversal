import {
  mergeInOrderOptions,
  type DepthFirstChildBoundaryVisitOptionsPatch,
} from './DepthFirstTraversalInOrderTraversalConfig';
import {
  assertTraversalFields,
  definedOptions,
} from '@core/assertPublicOptions';
import type { AsyncTreeDiscoverySource } from '@core/AsyncTraversableTree';
import type { AsyncTreeVertexPhaseVisitorCallback } from '@core/AsyncTraversalVisitor';
import type { AsyncChildHintsListTransformer } from '@core/ChildHintTransformer';
import type { VisitorRecord } from '@core/graph/types';
import type { VisitorDefinitionsByPhase } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstTreeVisitPhase as Order } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';

export type AsyncDepthFirstTreeVisitorRegistrationsByPhase<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  [K in DepthFirstTreeVisitPhase]: VisitorRecord<
    AsyncTreeVertexPhaseVisitorCallback<
      InputVertexTypes,
      RewrittenVertexTypes,
      K
    >
  >[];
};

export type AsyncDepthFirstTreeResolvedOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = Omit<
  DepthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
  'treeDiscoverySource' | 'transformChildHintsBeforeResolution' | 'visitors'
> & {
  treeDiscoverySource: AsyncTreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  transformChildHintsBeforeResolution: AsyncChildHintsListTransformer<InputVertexTypes> | null;
  visitors: AsyncDepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  maxConcurrentCallbackInvocations: number;
};

export type AsyncDepthFirstTreeTraversalBuilderOptionsPatch<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  treeDiscoverySource?:
    | AsyncTreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>
    | undefined;
  transformChildHintsBeforeResolution?:
    | AsyncChildHintsListTransformer<InputVertexTypes>
    | null
    | undefined;
  visitors?:
    | VisitorDefinitionsByPhase<
        AsyncDepthFirstTreeVisitorRegistrationsByPhase<
          InputVertexTypes,
          RewrittenVertexTypes
        >
      >
    | undefined;
  retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
  childBoundaryVisits?: DepthFirstChildBoundaryVisitOptionsPatch | undefined;
  maxConcurrentCallbackInvocations?: number | undefined;
};

export type AsyncDepthFirstTreeTraversalBuilderOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = AsyncDepthFirstTreeTraversalBuilderOptionsPatch<
  InputVertexTypes,
  RewrittenVertexTypes
> & {
  treeDiscoverySource: AsyncTreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
};

export const ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  AsyncDepthFirstTreeResolvedOptions<VertexDataAndChildHintTypes>,
  'treeDiscoverySource'
> = deepFreeze({
  ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  transformChildHintsBeforeResolution: null,
  visitors: {
    [Order.BEFORE_CHILD_EXPANSION]: [],
    [Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: [],
    [Order.AFTER_CHILD_SUBTREES]: [],
  },
  maxConcurrentCallbackInvocations: Infinity,
});

export function mergeAsyncDepthFirstTraversalInstanceConfigs<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  base: AsyncDepthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
  input: AsyncDepthFirstTreeTraversalBuilderOptionsPatch<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): AsyncDepthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes> {
  const capturedInput = definedOptions(input);
  assertTraversalFields(capturedInput, Object.values(Order));
  const childBoundaryVisits = mergeInOrderOptions(
    base.childBoundaryVisits,
    capturedInput.childBoundaryVisits,
  );
  const visitors = {
    ...base.visitors,
    ...definedOptions(capturedInput.visitors ?? {}),
  };
  const merged: AsyncDepthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  > = {
    ...base,
    ...capturedInput,
    visitors: {
      [Order.BEFORE_CHILD_EXPANSION]: normalizeVisitorDefinitions(
        visitors[Order.BEFORE_CHILD_EXPANSION],
      ),
      [Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]:
        normalizeVisitorDefinitions(
          visitors[Order.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES],
        ),
      [Order.AFTER_CHILD_SUBTREES]: normalizeVisitorDefinitions(
        visitors[Order.AFTER_CHILD_SUBTREES],
      ),
    },
    childBoundaryVisits,
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
    },
  };
  if (
    merged.maxConcurrentCallbackInvocations !== Infinity &&
    (!Number.isInteger(merged.maxConcurrentCallbackInvocations) ||
      merged.maxConcurrentCallbackInvocations <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
