import type {
  Outcome,
  OwnerToken,
  VisitMetadata,
  VisitPhase,
} from '@core/effects/types';
import type { VisitorExecutionState } from '@core/executeVisitors';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { HintVertexId, VertexId, VertexRef } from '@core/graph/types';
import type { InternalVertexResolutionContext } from '@core/ResolvedTree';
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
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { RegistrationMetadata } from '@core/visitors/types';
import type { InOrderOptions } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';

export type KernelStateBridge<T extends VertexTypes> = {
  status: TraversalRunnerStatus;
  traversalRootVertexRef: VertexRef<T> | null;
  subtreeTraversalDisabledRefs: Set<VertexRef<T>>;
  visitorsState: Partial<Record<VisitPhase, VisitorExecutionState<T>>>;
};

export type KernelOptions<T extends VertexTypes, R extends VertexTypes = T> = {
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  container: ResolvedGraphsContainer<T, R>;
  stateBridge: KernelStateBridge<T | R>;
  visitorMetadata: Partial<Record<VisitPhase, readonly RegistrationMetadata[]>>;
  iterableConfig: TraversalRunnerIterableConfig<VisitPhase>;
  inOrderConfig: InOrderOptions | null;
  hasSorter: boolean;
  hasHintIds: boolean;
  hasPrerequisiteResolver?: boolean;
  concurrency: number;
  discovery?: 'lazy' | 'eager';
  canPrepare?: boolean;
  workCompletion?: 'afterWorkReadyChain' | 'externalSettlement';
  rootWorkDependencies?: 'honor' | 'ignore';
  omittedWorkDependencies?: 'none' | 'discoveryParentWork';
  completedWork?: ReadonlySet<VertexId>;
  dagSeed?: {
    readyVisits: readonly EligibleVisit<T | R>[];
    expansionQueue: readonly VertexRef<T | R>[];
  };
};

export type FrameState<T extends VertexTypes, R extends VertexTypes = T> = {
  owner: OwnerToken;
  ref: VertexRef<T | R>;
  depth: number;
  stage: 'sort' | 'identify' | 'resolve';
  hints: (T | R)['VertexHint'][];
  nextIdentityIndex: number;
  nextAdmissionIndex: number;
  nextConsumeIndex: number;
  hintIds: Map<number, HintVertexId>;
  knownIndices: Set<number>;
  contexts: Map<number, InternalVertexResolutionContext<T | R>>;
  pendingIndices: Set<number>;
  identityOutcomes: Map<number, Outcome<HintVertexId | undefined>>;
  outcomes: Map<number, Outcome<MakeVertexResult<T>>>;
  sortOutcome: Outcome<(T | R)['VertexHint'][]> | null;
};

export type ChainState<T extends VertexTypes, R extends VertexTypes = T> = {
  owner: OwnerToken;
  ref: VertexRef<T | R>;
  order: VisitPhase;
  phase: 'running' | 'paused' | 'done' | 'invalid';
  group: 'concurrent' | 'sequential';
  position: number;
  waitingFor: 'none' | 'callback' | 'batch';
  commands: TraversalVisitorCommand<
    R,
    TraversalVisitorCommandName,
    T['VertexHint']
  >[];
  metadata: VisitMetadata<T | R>;
  config: ResolvedTraversalExecutionOptions<VisitPhase>;
};

export type VertexWork<T extends VertexTypes> = {
  ref: VertexRef<T>;
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
  | { kind: 'WAIT' | 'HALTED' | 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };

export interface AsyncSessionControl<E> {
  advance(mode: import('@core/effects/types').PumpMode): SessionProgress<E>;
  acknowledgeEvent(boundaryId: number): void;
  requestHalt(): void;
  isHaltRequested(): boolean;
  resume(
    config?: TraversalIterableConfigInput<VisitPhase>,
    preparation?: boolean,
  ): void;
  getStatus(): TraversalRunnerStatus;
  getStopReason(): TraversalStopReason | null;
  getFailure(): { error: unknown } | null;
  inspect(): import('@core/CoreInspection').DriverInspection;
  waitForProgress(): Promise<void>;
}
