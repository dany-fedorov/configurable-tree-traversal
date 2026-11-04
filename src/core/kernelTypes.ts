import type {
  Outcome,
  SchedulingOwnerValidityToken,
  VisitMetadata,
  TreeOrDagVisitorPhase,
} from '@core/effects/types';
import type { VisitorExecutionState } from '@core/executeVisitors';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type {
  ChildHintVertexIdentity,
  VertexId,
  InternalVertexRef,
} from '@core/graph/types';
import type { MutableTreeChildDiscoveryContext } from '@core/ResolvedTree';
import type { EligibleVisit } from '@core/scheduling/types';
import type { MakeVertexResult } from '@core/TraversableTree';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type {
  ResolvedTraversalExecutionOptions,
  TraversalIterableConfigInput,
  TraversalRunnerIterableConfig,
} from '@core/TraversalRunnerIterableConfig';
import type {
  TraversalVisitorCommand,
  TraversalVisitorCommandName,
} from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { RegistrationMetadata } from '@core/visitors/types';
import type { DepthFirstChildBoundaryVisitOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';

export type KernelStateBridge<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  status: TraversalRunnerStatus;
  traversalRootVertexRef: InternalVertexRef<InputVertexTypes> | null;
  subtreeTraversalDisabledRefs: Set<InternalVertexRef<InputVertexTypes>>;
  visitorsState: Partial<
    Record<TreeOrDagVisitorPhase, VisitorExecutionState<InputVertexTypes>>
  >;
};

export type KernelOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  container: ResolvedGraphsContainer<InputVertexTypes, RewrittenVertexTypes>;
  stateBridge: KernelStateBridge<InputVertexTypes | RewrittenVertexTypes>;
  visitorMetadata: Partial<
    Record<TreeOrDagVisitorPhase, readonly RegistrationMetadata[]>
  >;
  iterableConfig: TraversalRunnerIterableConfig<TreeOrDagVisitorPhase>;
  inOrderConfig: DepthFirstChildBoundaryVisitOptions | null;
  hasChildHintsListTransformer: boolean;
  hasChildHintVertexIdResolver: boolean;
  hasPrerequisiteResolver?: boolean;
  maxConcurrentCallbackInvocations: number;
  discoveryTiming?: 'incrementalDuringTraversal' | 'completeBeforeAnyVisitor';
  canPrepare?: boolean;
  workCompletionPolicy?:
    | 'afterWorkReadyVisitorChain'
    | 'requireExternalWorkSettlement';
  rootWorkToWorkPrerequisitePolicy?: 'honor' | 'ignore';
  undeclaredWorkToWorkPrerequisitePolicy?: 'none' | 'waitForDiscoveringParentWork';
  acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId>;
  dagSeed?: {
    dependencyEligiblePhaseVisits: readonly EligibleVisit<
      InputVertexTypes | RewrittenVertexTypes
    >[];
    expansionQueue: readonly InternalVertexRef<
      InputVertexTypes | RewrittenVertexTypes
    >[];
  };
};

export type FrameState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  owner: SchedulingOwnerValidityToken;
  ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
  depth: number;
  stage: 'transformHints' | 'identify' | 'resolve';
  hints: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][];
  nextIdentityIndex: number;
  nextAdmissionIndex: number;
  nextConsumeIndex: number;
  hintIds: Map<number, ChildHintVertexIdentity>;
  knownIndices: Set<number>;
  contexts: Map<
    number,
    MutableTreeChildDiscoveryContext<InputVertexTypes | RewrittenVertexTypes>
  >;
  pendingIndices: Set<number>;
  identityOutcomes: Map<number, Outcome<ChildHintVertexIdentity | undefined>>;
  outcomes: Map<number, Outcome<MakeVertexResult<InputVertexTypes>>>;
  sortOutcome: Outcome<
    (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][]
  > | null;
};

export type ChainState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  owner: SchedulingOwnerValidityToken;
  ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
  order: TreeOrDagVisitorPhase;
  phase: 'running' | 'paused' | 'done' | 'invalid';
  group: 'concurrent' | 'sequential';
  position: number;
  waitingFor: 'none' | 'callback' | 'batch';
  commands: TraversalVisitorCommand<
    RewrittenVertexTypes,
    TraversalVisitorCommandName,
    InputVertexTypes['ChildHint']
  >[];
  metadata: VisitMetadata<InputVertexTypes | RewrittenVertexTypes>;
  config: ResolvedTraversalExecutionOptions<TreeOrDagVisitorPhase>;
};

export type VertexWork<InputVertexTypes extends VertexDataAndChildHintTypes> = {
  ref: InternalVertexRef<InputVertexTypes>;
  unmet: Set<VertexId>;
  unmetComplete: Set<VertexId>;
  expansion: 'unprepared' | 'open' | 'closed';
  initialAdmitted: boolean;
  initialCommitted: boolean;
  completionAdmitted: boolean;
  completionCommitted: boolean;
  completionAccounted: boolean[];
  remainingChildren: number;
};

export type SessionProgress<E> =
  | { kind: 'EVENT'; event: E; boundaryId: number }
  | { kind: 'WAIT' | 'SUSPENDED' | 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };

export interface AsyncSessionControl<E> {
  advance(mode: import('@core/effects/types').PumpMode): SessionProgress<E>;
  acknowledgeEvent(boundaryId: number): void;
  shouldEmitEvent(event: E): boolean;
  requestHalt(): void;
  isHaltRequested(): boolean;
  resume(
    config?: TraversalIterableConfigInput<TreeOrDagVisitorPhase>,
    preparation?: boolean,
  ): void;
  getTraversalLifecycleStatus(): TraversalRunnerStatus;
  getTraversalStopReason(): TraversalStopReason | null;
  getFailure(): { error: unknown } | null;
  captureExecutionSnapshot(): import('@core/CoreInspection').TreeOrDagCallbackDriverSnapshot;
  waitForProgress(): Promise<void>;
}
