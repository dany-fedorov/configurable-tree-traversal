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
import { deepFreeze } from '@utils/deepFreeze';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type BreadthFirstTreeResolvedOptions,
} from './BreadthFirstTraversalInstanceConfig';
import { BreadthFirstTreeVisitPhase } from './BreadthFirstTraversalOrder';

export type AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  [K in BreadthFirstTreeVisitPhase]: VisitorRecord<
    AsyncTreeVertexPhaseVisitorCallback<
      InputVertexTypes,
      RewrittenVertexTypes,
      K
    >
  >[];
};

export type AsyncBreadthFirstTreeResolvedOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = Omit<
  BreadthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
  'treeDiscoverySource' | 'transformChildHintsBeforeResolution' | 'visitors'
> & {
  treeDiscoverySource: AsyncTreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  transformChildHintsBeforeResolution: AsyncChildHintsListTransformer<InputVertexTypes> | null;
  visitors: AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  maxConcurrentCallbackInvocations: number;
};

export type AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<
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
        AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
          InputVertexTypes,
          RewrittenVertexTypes
        >
      >
    | undefined;
  retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
  maxConcurrentCallbackInvocations?: number | undefined;
};

export type AsyncBreadthFirstTreeTraversalBuilderOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<
  InputVertexTypes,
  RewrittenVertexTypes
> & {
  treeDiscoverySource: AsyncTreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
};

export const ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  AsyncBreadthFirstTreeResolvedOptions<VertexDataAndChildHintTypes>,
  'treeDiscoverySource'
> = deepFreeze({
  ...BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  transformChildHintsBeforeResolution: null,
  visitors: {
    [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: [],
  },
  maxConcurrentCallbackInvocations: Infinity,
});

export function mergeAsyncBreadthFirstTraversalInstanceConfigs<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  base: AsyncBreadthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
  input: AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): AsyncBreadthFirstTreeResolvedOptions<
  InputVertexTypes,
  RewrittenVertexTypes
> {
  const capturedInput = definedOptions(input);
  assertTraversalFields(
    capturedInput,
    Object.values(BreadthFirstTreeVisitPhase),
  );
  const visitors = {
    ...base.visitors,
    ...definedOptions(capturedInput.visitors ?? {}),
  };
  const merged: AsyncBreadthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  > = {
    ...base,
    ...capturedInput,
    visitors: {
      [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]:
        normalizeVisitorDefinitions(
          visitors[BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX],
        ),
    },
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
