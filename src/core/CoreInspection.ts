import type {
  SchedulingOwnerValidityToken,
  TreeOrDagVisitorPhase,
} from '@core/effects/types';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type {
  TraversalEventKindForVisitorPhase,
  VisitorCallbackPhaseSelection,
} from './TraversalRunnerIterableConfig';

export type TraversalExecutionSelections<
  Phase extends string = TreeOrDagVisitorPhase,
  EmittedKind extends string = TraversalEventKindForVisitorPhase<Phase>,
> = Readonly<{
  deliveredEventKinds: readonly EmittedKind[];
  admittedVisitorCallbackPhases: VisitorCallbackPhaseSelection<Phase>;
}>;

/** Public callbacks observed by a tree or DAG runner. Engine effect keys stay private. */
export type TreeOrDagCallbackOperation =
  | 'resolveRootVertex'
  | 'resolveChildVertexFromHint'
  | 'resolvePrerequisiteByVertexId'
  | 'transformChildHintsBeforeResolution'
  | 'tryGetVertexIdentityFromHint'
  | 'invokeVisitorCallback';

export type TreeOrDagSchedulerSnapshot<
  Phase extends string = TreeOrDagVisitorPhase,
> = Readonly<{
  traversalLifecycleStatus: TraversalRunnerStatus;
  traversalStopReason: TraversalStopReason | null;
  pauseRequested: boolean;
  traversalAlgorithm: 'depth-first' | 'breadth-first' | 'dag';
  callbackExecutionMode: 'sync' | 'async';
  sourceTopologyKind: 'tree' | 'graph';
  maxConcurrentCallbackInvocations: number;
  hasChildHintsListTransformer: boolean;
  hasChildHintVertexIdResolver: boolean;
  /** Current delivery selector and default admission policy for new vertexPhaseVisitorChains. */
  executionOptions: TraversalExecutionSelections<Phase>;
  dependencyEligiblePhaseVisits: readonly Readonly<{
    vertexReferenceIdentity: string;
    visitorPhase: Phase;
  }>[];
  vertexTraversalFrames: readonly Readonly<{
    owner: Readonly<SchedulingOwnerValidityToken>;
    vertexReferenceIdentity: string;
    stage:
      | 'transformingChildHints'
      | 'resolvingChildHintVertexIds'
      | 'resolvingChildVertexContent'
      | 'childDiscoveryClosed'
      | import('@depth-first-traversal/lib/DepthFirstPolicy').DepthFirstTraversalFrameStage;
    pendingChildHintIndices: readonly number[];
  }>[];
  vertexPhaseVisitorChains: readonly Readonly<{
    owner: Readonly<SchedulingOwnerValidityToken>;
    vertexReferenceIdentity: string;
    visitorPhase: Phase;
    state:
      | 'active'
      | 'pausedAtCommandBoundary'
      | 'phaseChainFinished'
      | 'invalidated';
    visitorCommandCommitTiming: import('@core/TraversalVisitor').VisitorCommandCommitTiming;
    visitorCallbackIndexInPhaseChain: number;
    pendingCallbackOrCommandBatch:
      | 'none'
      | 'visitorCallbackResult'
      | 'commandBatchCommit';
    /** Admission snapshot: visitorPhases governs this chain; emitEvents is historical. */
    executionSelectionsAtAdmission: TraversalExecutionSelections<Phase>;
  }>[];
  pendingCallbackRequests: readonly Readonly<{
    callbackRequestId: number;
    operation: TreeOrDagCallbackOperation;
    owner: Readonly<SchedulingOwnerValidityToken>;
    ownerStillValid: boolean;
  }>[];
  unacknowledgedCommittedEventBoundaryCount: number;
}>;

export type TreeOrDagCallbackDriverSnapshot<
  Phase extends string = TreeOrDagVisitorPhase,
> = TreeOrDagSchedulerSnapshot<Phase> &
  Readonly<{ inFlightInvocationCount: number }>;

export type TreeOrDagExecutionSnapshot<
  Phase extends string = TreeOrDagVisitorPhase,
> = TreeOrDagCallbackDriverSnapshot<Phase> &
  Readonly<{ bufferedDeliveryEventCount: number }>;
