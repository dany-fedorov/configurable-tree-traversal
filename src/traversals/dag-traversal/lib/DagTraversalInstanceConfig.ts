import {
  assertTraversalFields,
  definedOptions,
} from '@core/assertPublicOptions';
import type { ChildHintsListTransformer } from '@core/ChildHintTransformer';
import type { VisitorRecord } from '@core/graph/types';
import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { TreeDiscoverySource } from '@core/TraversableTree';
import type { VisitorDefinitionsByPhase } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { deepFreeze } from '@utils/deepFreeze';
import { captureDagConfigPatch, captureDagSourcePatch } from './dagSourcePatch';
import { DagVisitorPhase } from './DagTraversalOrder';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import type { DagVisitor } from './DagTraversalVisitor';

export type DagSchedulingOptions = {
  workCompletionPolicy?:
    | 'afterWorkReadyVisitorChain'
    | 'requireExternalWorkSettlement'
    | undefined;
  discoveryTiming?:
    | 'incrementalDuringTraversal'
    | 'completeBeforeAnyVisitor'
    | undefined;
  rootWorkPrerequisitePolicy?: 'honor' | 'ignore' | undefined;
  undeclaredWorkPrerequisitePolicy?:
    | 'none'
    | 'waitForDiscoveringParentWork'
    | undefined;
  sourceRootIsHiddenEntryHolder?: boolean | undefined;
};

export type DagSource<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> =
  | {
      dagDiscoverySource: DagDiscoverySource<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >;
      treeDiscoverySource?: undefined;
    }
  | {
      treeDiscoverySource: unknown extends VertexId
        ? TreeDiscoverySource<SourceVertexTypes, RewrittenVertexTypes>
        : never;
      dagDiscoverySource?: undefined;
    };

export type DagTraversalVisitors<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = {
  [K in DagVisitorPhase]: VisitorRecord<
    DagVisitor<SourceVertexTypes, RewrittenVertexTypes, K, VertexId>
  >[];
};

type DagTraversalOptions<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = DagSchedulingOptions & {
  acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId> | undefined;
  transformChildHintsBeforeResolution: ChildHintsListTransformer<SourceVertexTypes> | null;
  visitors: DagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  retainDiscoveredGraphBeforeVisitorCommands: boolean;
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer:
      | DagTraversalRunnerInternalObjects<
          SourceVertexTypes,
          RewrittenVertexTypes,
          VertexId
        >['resolvedGraphsContainer']
      | null;
    state:
      | DagTraversalRunnerInternalObjects<
          SourceVertexTypes,
          RewrittenVertexTypes,
          VertexId
        >['state']
      | null;
  };
};

export type DagResolvedOptions<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = DagSource<SourceVertexTypes, RewrittenVertexTypes, VertexId> &
  DagTraversalOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>;

type DagTraversalOptionsInput<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = DagSchedulingOptions & {
  acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId> | undefined;
  transformChildHintsBeforeResolution?:
    | ChildHintsListTransformer<SourceVertexTypes>
    | null
    | undefined;
  visitors?:
    | VisitorDefinitionsByPhase<
        DagTraversalVisitors<SourceVertexTypes, RewrittenVertexTypes, VertexId>
      >
    | undefined;
  retainDiscoveredGraphBeforeVisitorCommands?: boolean | undefined;
};

export type DagTraversalBuilderOptions<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = DagSource<SourceVertexTypes, RewrittenVertexTypes, VertexId> &
  DagTraversalOptionsInput<SourceVertexTypes, RewrittenVertexTypes, VertexId> &
  (
    | {
        dagDiscoverySource: DagDiscoverySource<
          SourceVertexTypes,
          RewrittenVertexTypes,
          VertexId
        >;
      }
    | {
        rootWorkPrerequisitePolicy?: never;
        undeclaredWorkPrerequisitePolicy?: never;
      }
  );

export type DagTraversalBuilderOptionsPatch<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = DagTraversalOptionsInput<
  SourceVertexTypes,
  RewrittenVertexTypes,
  VertexId
> &
  (
    | {
        dagDiscoverySource?:
          | DagDiscoverySource<
              SourceVertexTypes,
              RewrittenVertexTypes,
              VertexId
            >
          | undefined;
        treeDiscoverySource?: undefined;
      }
    | {
        rootWorkPrerequisitePolicy?: never;
        undeclaredWorkPrerequisitePolicy?: never;
        treeDiscoverySource?:
          | (unknown extends VertexId
              ? TreeDiscoverySource<SourceVertexTypes, RewrittenVertexTypes>
              : never)
          | undefined;
        dagDiscoverySource?: undefined;
      }
  );

export const DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: DagTraversalOptions<
  VertexDataAndChildHintTypes,
  VertexDataAndChildHintTypes
> = deepFreeze({
  transformChildHintsBeforeResolution: null,
  visitors: {
    [DagVisitorPhase.ON_WORK_READY]: [],
    [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: [],
  },
  retainDiscoveredGraphBeforeVisitorCommands: false,
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer: null,
    state: null,
  },
});

export function mergeDagTraversalInstanceConfigs<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  base: DagResolvedOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
  input: DagTraversalBuilderOptionsPatch<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
  sources = captureDagSourcePatch(input),
): DagResolvedOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId> {
  const capturedInput = captureDagConfigPatch(input, sources);
  assertTraversalFields(capturedInput, Object.values(DagVisitorPhase));
  assertDagWorkCompletion(capturedInput.workCompletionPolicy);
  assertDagDependencyPolicies(
    capturedInput,
    sources.dagDiscoverySource !== undefined ||
      base.dagDiscoverySource !== undefined,
    input,
  );
  const visitors = {
    ...base.visitors,
    ...definedOptions(capturedInput.visitors ?? {}),
  };
  return {
    ...base,
    ...definedOptions(capturedInput),
    visitors: {
      [DagVisitorPhase.ON_WORK_READY]: normalizeVisitorDefinitions(
        visitors[DagVisitorPhase.ON_WORK_READY],
      ),
      [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]:
        normalizeVisitorDefinitions(
          visitors[DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY],
        ),
    },
    traversalRunnerInternalObjects: {
      ...base.traversalRunnerInternalObjects,
    },
  } as DagResolvedOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>;
}

/** Validate configuration before changing traversal ownership or executing callbacks. */
export function assertDagWorkCompletion(policy: unknown): void {
  if (
    policy !== undefined &&
    policy !== 'afterWorkReadyVisitorChain' &&
    policy !== 'requireExternalWorkSettlement'
  ) {
    throw new TypeError(
      'workCompletionPolicy must be afterWorkReadyVisitorChain or requireExternalWorkSettlement',
    );
  }
}

/** Explicit dependency policies apply only to graph discovery, never tree ordering. */
export function assertDagDependencyPolicies(
  input: DagSchedulingOptions,
  graphSource: boolean,
  originalInput: object,
): void {
  if (
    !graphSource &&
    ('rootWorkPrerequisitePolicy' in originalInput ||
      'undeclaredWorkPrerequisitePolicy' in originalInput)
  ) {
    throw new TypeError('Dependency policies require a graph discovery source');
  }
  if (
    input.rootWorkPrerequisitePolicy !== undefined &&
    input.rootWorkPrerequisitePolicy !== 'honor' &&
    input.rootWorkPrerequisitePolicy !== 'ignore'
  ) {
    throw new TypeError('rootWorkPrerequisitePolicy must be honor or ignore');
  }
  if (
    input.undeclaredWorkPrerequisitePolicy !== undefined &&
    input.undeclaredWorkPrerequisitePolicy !== 'none' &&
    input.undeclaredWorkPrerequisitePolicy !== 'waitForDiscoveringParentWork'
  ) {
    throw new TypeError(
      'undeclaredWorkPrerequisitePolicy must be none or waitForDiscoveringParentWork',
    );
  }
}
