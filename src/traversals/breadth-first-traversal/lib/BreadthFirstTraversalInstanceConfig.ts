import {
  assertTraversalFields,
  definedOptions,
} from '@core/assertPublicOptions';
import type { ChildHintsListTransformer } from '@core/ChildHintTransformer';
import type { TreeDiscoverySource } from '@core/TraversableTree';
import type { VisitorDefinitionsByPhase } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { deepFreeze } from '@utils/deepFreeze';
import { BreadthFirstTreeVisitPhase } from './BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalRunnerInternalObjects } from './BreadthFirstTraversalRunnerInternalObjects';
import type { BreadthFirstTreeVisitorRegistrationsByPhase } from './BreadthFirstTraversalVisitors';

export type BreadthFirstTreeResolvedOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  treeDiscoverySource: TreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  transformChildHintsBeforeResolution: ChildHintsListTransformer<InputVertexTypes> | null;
  visitors: BreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  retainDiscoveredTreeBeforeVisitorCommands: boolean;
  traversalRunnerInternalObjects: {
    resolvedTreesContainer:
      | BreadthFirstTraversalRunnerInternalObjects<
          InputVertexTypes,
          RewrittenVertexTypes
        >['resolvedTreesContainer']
      | null;
    state:
      | BreadthFirstTraversalRunnerInternalObjects<
          InputVertexTypes,
          RewrittenVertexTypes
        >['state']
      | null;
  };
};

export type BreadthFirstTreeTraversalBuilderOptionsPatch<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  treeDiscoverySource?:
    | TreeDiscoverySource<InputVertexTypes, RewrittenVertexTypes>
    | undefined;
  transformChildHintsBeforeResolution?:
    | ChildHintsListTransformer<InputVertexTypes>
    | null
    | undefined;
  visitors?:
    | VisitorDefinitionsByPhase<
        BreadthFirstTreeVisitorRegistrationsByPhase<
          InputVertexTypes,
          RewrittenVertexTypes
        >
      >
    | undefined;
  retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
};

export type BreadthFirstTreeTraversalBuilderOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = BreadthFirstTreeTraversalBuilderOptionsPatch<
  InputVertexTypes,
  RewrittenVertexTypes
> & {
  treeDiscoverySource: TreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
};

export const BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  BreadthFirstTreeResolvedOptions<
    VertexDataAndChildHintTypes,
    VertexDataAndChildHintTypes
  >,
  'treeDiscoverySource'
> = deepFreeze({
  transformChildHintsBeforeResolution: null,
  visitors: {
    [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: [],
  },
  retainDiscoveredTreeBeforeVisitorCommands: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
});

export function mergeBreadthFirstTraversalInstanceConfigs<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  base: BreadthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
  input: BreadthFirstTreeTraversalBuilderOptionsPatch<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): BreadthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes> {
  const capturedInput = definedOptions(input);
  assertTraversalFields(
    capturedInput,
    Object.values(BreadthFirstTreeVisitPhase),
  );
  const visitors = {
    ...base.visitors,
    ...definedOptions(capturedInput.visitors ?? {}),
  };
  return {
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
}
