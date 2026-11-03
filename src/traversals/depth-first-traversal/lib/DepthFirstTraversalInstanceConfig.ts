import {
  mergeInOrderOptions,
  type DepthFirstChildBoundaryVisitOptionsPatch,
} from './DepthFirstTraversalInOrderTraversalConfig';
import {
  assertTraversalFields,
  definedOptions,
} from '@core/assertPublicOptions';
import type { ChildHintsListTransformer } from '@core/ChildHintTransformer';
import type { TreeDiscoverySource } from '@core/TraversableTree';
import type { VisitorDefinitionsByPhase } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import type { DepthFirstChildBoundaryVisitOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { DepthFirstTraversalRunnerInternalObjects } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerInternalObjects';
import type { DepthFirstTreeVisitorRegistrationsByPhase } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import type { OrNullAllFields } from '@depth-first-traversal/type-helpers/OrNullAllFields';
import { deepFreeze } from '@utils/deepFreeze';

export type DepthFirstTreeResolvedOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  treeDiscoverySource: TreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  transformChildHintsBeforeResolution: ChildHintsListTransformer<InputVertexTypes> | null;
  visitors: DepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  childBoundaryVisits: DepthFirstChildBoundaryVisitOptions;
  retainDiscoveredTreeBeforeVisitorCommands: boolean;
  traversalRunnerInternalObjects: Partial<
    OrNullAllFields<
      DepthFirstTraversalRunnerInternalObjects<
        InputVertexTypes,
        RewrittenVertexTypes
      >
    >
  >;
};

export const DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  DepthFirstTreeResolvedOptions<
    VertexDataAndChildHintTypes,
    VertexDataAndChildHintTypes
  >,
  'treeDiscoverySource'
> = deepFreeze({
  transformChildHintsBeforeResolution: null,
  childBoundaryVisits: {
    visitAfterChildIndices: {
      ranges: [{ fromInclusive: 0, throughInclusive: -2 }],
    },
    visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [-2] },
    alsoVisitAfterOnlyChild: true,
    allowBoundaryVisitsAfterOmittedChildSlots: true,
  },
  visitors: {
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: [],
    [DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: [],
    [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: [],
  },
  retainDiscoveredTreeBeforeVisitorCommands: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
});

export type DepthFirstTreeTraversalBuilderOptionsPatch<
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
        DepthFirstTreeVisitorRegistrationsByPhase<
          InputVertexTypes,
          RewrittenVertexTypes
        >
      >
    | undefined;
  retainDiscoveredTreeBeforeVisitorCommands?: boolean | undefined;
  childBoundaryVisits?: DepthFirstChildBoundaryVisitOptionsPatch | undefined;
};

export type DepthFirstTreeTraversalBuilderOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = DepthFirstTreeTraversalBuilderOptionsPatch<
  InputVertexTypes,
  RewrittenVertexTypes
> & {
  treeDiscoverySource: TreeDiscoverySource<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
};

export function mergeInstanceConfigs<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  base: DepthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes>,
  input: DepthFirstTreeTraversalBuilderOptionsPatch<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): DepthFirstTreeResolvedOptions<InputVertexTypes, RewrittenVertexTypes> {
  const capturedInput = definedOptions(input);
  assertTraversalFields(capturedInput, Object.values(DepthFirstTreeVisitPhase));
  const childBoundaryVisits = mergeInOrderOptions(
    base.childBoundaryVisits,
    capturedInput.childBoundaryVisits,
  );
  const visitors = {
    ...base.visitors,
    ...definedOptions(capturedInput.visitors ?? {}),
  };
  return {
    ...base,
    ...capturedInput,
    visitors: {
      [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]:
        normalizeVisitorDefinitions(
          visitors[DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
        ),
      [DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]:
        normalizeVisitorDefinitions(
          visitors[
            DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES
          ],
        ),
      [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]:
        normalizeVisitorDefinitions(
          visitors[DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES],
        ),
    },
    childBoundaryVisits,
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
    },
  };
}
