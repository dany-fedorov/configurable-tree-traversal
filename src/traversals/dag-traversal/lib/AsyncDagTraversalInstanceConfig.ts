import {
  assertTraversalFields,
  definedOptions,
} from '@core/assertPublicOptions';
import type { AsyncTreeDiscoverySource } from '@core/AsyncTraversableTree';
import type { AsyncChildHintsListTransformer } from '@core/ChildHintTransformer';
import type { VisitorRecord } from '@core/graph/types';
import type { AsyncDagDiscoverySource } from '@core/TraversableGraph';
import type { VisitorDefinitionsByPhase } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorDefinitions } from '@core/visitors/normalizeVisitorDefinitions';
import { deepFreeze } from '@utils/deepFreeze';
import { captureDagConfigPatch, captureDagSourcePatch } from './dagSourcePatch';
import type { DagSchedulingOptions } from './DagTraversalInstanceConfig';
import {
  assertDagWorkCompletion,
  assertDagDependencyPolicies,
} from './DagTraversalInstanceConfig';
import { DagVisitorPhase } from './DagTraversalOrder';
import type { DagTraversalRunnerInternalObjects } from './DagTraversalRunnerInternalObjects';
import type { AsyncDagVisitor } from './DagTraversalVisitor';

export type AsyncDagSource<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> =
  | {
      dagDiscoverySource: AsyncDagDiscoverySource<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >;
      treeDiscoverySource?: undefined;
    }
  | {
      treeDiscoverySource: unknown extends VertexId
        ? AsyncTreeDiscoverySource<SourceVertexTypes, RewrittenVertexTypes>
        : never;
      dagDiscoverySource?: undefined;
    };

export type AsyncDagTraversalVisitors<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = {
  [K in DagVisitorPhase]: VisitorRecord<
    AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, K, VertexId>
  >[];
};

type AsyncDagTraversalOptions<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = DagSchedulingOptions & {
  acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId> | undefined;
  transformChildHintsBeforeResolution: AsyncChildHintsListTransformer<SourceVertexTypes> | null;
  visitors: AsyncDagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  retainDiscoveredGraphBeforeVisitorCommands: boolean;
  maxConcurrentCallbackInvocations: number;
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

export type AsyncDagResolvedOptions<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = AsyncDagSource<SourceVertexTypes, RewrittenVertexTypes, VertexId> &
  AsyncDagTraversalOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>;

type AsyncDagTraversalOptionsInput<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = DagSchedulingOptions & {
  acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId> | undefined;
  transformChildHintsBeforeResolution?:
    | AsyncChildHintsListTransformer<SourceVertexTypes>
    | null
    | undefined;
  visitors?:
    | VisitorDefinitionsByPhase<
        AsyncDagTraversalVisitors<
          SourceVertexTypes,
          RewrittenVertexTypes,
          VertexId
        >
      >
    | undefined;
  retainDiscoveredGraphBeforeVisitorCommands?: boolean | undefined;
  maxConcurrentCallbackInvocations?: number | undefined;
};

export type AsyncDagTraversalBuilderOptions<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = AsyncDagSource<SourceVertexTypes, RewrittenVertexTypes, VertexId> &
  AsyncDagTraversalOptionsInput<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  > &
  (
    | {
        dagDiscoverySource: AsyncDagDiscoverySource<
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

export type AsyncDagTraversalBuilderOptionsPatch<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> = AsyncDagTraversalOptionsInput<
  SourceVertexTypes,
  RewrittenVertexTypes,
  VertexId
> &
  (
    | {
        dagDiscoverySource?:
          | AsyncDagDiscoverySource<
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
              ? AsyncTreeDiscoverySource<
                  SourceVertexTypes,
                  RewrittenVertexTypes
                >
              : never)
          | undefined;
        dagDiscoverySource?: undefined;
      }
  );

export const ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG = deepFreeze({
  transformChildHintsBeforeResolution: null,
  visitors: {
    [DagVisitorPhase.ON_WORK_READY]: [],
    [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: [],
  },
  retainDiscoveredGraphBeforeVisitorCommands: false,
  maxConcurrentCallbackInvocations: Infinity,
  traversalRunnerInternalObjects: {
    resolvedGraphsContainer: null,
    state: null,
  },
}) as unknown as Omit<
  AsyncDagResolvedOptions<VertexDataAndChildHintTypes>,
  'dagDiscoverySource' | 'treeDiscoverySource'
>;

export function mergeAsyncDagTraversalInstanceConfigs<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  base: AsyncDagResolvedOptions<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
  input: AsyncDagTraversalBuilderOptionsPatch<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
  sources = captureDagSourcePatch(input),
): AsyncDagResolvedOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId> {
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
  const merged = {
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
  } as AsyncDagResolvedOptions<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  if (
    merged.maxConcurrentCallbackInvocations !== Infinity &&
    (!Number.isInteger(merged.maxConcurrentCallbackInvocations) ||
      merged.maxConcurrentCallbackInvocations <= 0)
  ) {
    throw new TypeError('Concurrency must be a positive integer or Infinity');
  }
  return merged;
}
