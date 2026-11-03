import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  AsyncDagExternalWorkSession,
  DagExternalWorkSession,
} from '../coordinateDag';
import type { AsyncDagTraversalBuilderOptionsPatch } from './AsyncDagTraversalInstanceConfig';
import type { AsyncDagTraversalRunner } from './AsyncDagTraversalRunner';
import type { DagDefinition } from './DagDefinition';
import type { DagTraversalBuilderOptionsPatch } from './DagTraversalInstanceConfig';
import type { DagTraversalRunner } from './DagTraversalRunner';

export type ValidatedDagTopologyLiveVertexSummary<Data, VertexId> = Readonly<{
  vertexId: VertexId;
  data: Data;
  liveStructuralChildVertexIds: readonly VertexId[];
  workWaitsForWorkOf: readonly VertexId[];
  workWaitsForSubgraphCompletionOf: readonly VertexId[];
}>;

type OwnedOptions = {
  dagDiscoverySource?: never;
  treeDiscoverySource?: never;
  sourceRootIsHiddenEntryHolder?: never;
  discoveryTiming?: never;
  rootWorkPrerequisitePolicy?: never;
  undeclaredWorkPrerequisitePolicy?: never;
  transformChildHintsBeforeResolution?: never;
  traversalRunnerInternalObjects?: never;
};

export type ValidatedDagTopologyRunnerOptions<Data, VertexId> = Pick<
  DagTraversalBuilderOptionsPatch<
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexId
  >,
  | 'visitors'
  | 'acceptedCompletedWorkVertexIds'
  | 'workCompletionPolicy'
  | 'retainDiscoveredGraphBeforeVisitorCommands'
> &
  OwnedOptions;

export type ValidatedDagTopologyAsyncRunnerOptions<Data, VertexId> = Pick<
  AsyncDagTraversalBuilderOptionsPatch<
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexId
  >,
  | 'visitors'
  | 'acceptedCompletedWorkVertexIds'
  | 'workCompletionPolicy'
  | 'retainDiscoveredGraphBeforeVisitorCommands'
  | 'maxConcurrentCallbackInvocations'
> &
  OwnedOptions;

export type DagExternalWorkSessionOptions<VertexId> = OwnedOptions & {
  acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId>;
  visitors?: never;
  workCompletionPolicy?: never;
  retainDiscoveredGraphBeforeVisitorCommands?: never;
};

export type AsyncDagExternalWorkSessionOptions<VertexId> =
  DagExternalWorkSessionOptions<VertexId> & {
    maxConcurrentCallbackInvocations?: number;
  };

/** An in-memory validated topology; data and identities remain shallow caller values. */
export interface ValidatedReusableDagTopology<Data, VertexId = unknown> {
  /** Live-child convenience projection; omission slots are absent. Do not use for round-trip reconstruction. */
  readonly liveVertexSummaries: readonly ValidatedDagTopologyLiveVertexSummary<
    Data,
    VertexId
  >[];
  /** Faithful ordered entry, slots, omissions, and W/C declarations for reconstruction or revision. */
  readonly definition: DagDefinition<Data, VertexId>;
  createIndependentRunnerFromValidatedTopology(
    options?: ValidatedDagTopologyRunnerOptions<Data, VertexId>,
  ): DagTraversalRunner<
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexDataAndChildHintTypes<Data, VertexId>,
    VertexId
  >;
  createIndependentAsyncRunnerFromValidatedTopology(
    options?: ValidatedDagTopologyAsyncRunnerOptions<Data, VertexId>,
  ): Promise<
    AsyncDagTraversalRunner<
      VertexDataAndChildHintTypes<Data, VertexId>,
      VertexDataAndChildHintTypes<Data, VertexId>,
      VertexId
    >
  >;
  createExternalWorkSession(
    options?: DagExternalWorkSessionOptions<VertexId>,
  ): DagExternalWorkSession<VertexId>;
  createAsyncExternalWorkSession(
    options?: AsyncDagExternalWorkSessionOptions<VertexId>,
  ): Promise<AsyncDagExternalWorkSession<VertexId>>;
}
