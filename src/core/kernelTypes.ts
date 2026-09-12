import type { DepthFirstTraversalInOrderTraversalConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TraversalRunnerIterableConfig } from '@core/TraversalRunnerIterableConfig';
import type { TraversalVisitorCommand } from '@core/TraversalVisitor';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { HintVertexId, Ref, VertexId } from '@core/graph/types';
import type { VisitorExecutionState } from '@core/executeVisitors';
import type {
  Outcome,
  OwnerToken,
  VisitMetadata,
  VisitOrder,
} from '@core/effects/types';
import type { RegistrationMetadata } from '@core/visitors/types';

export type KernelStateBridge<T extends TreeTypeParameters> = {
  status: TraversalRunnerStatus;
  traversalRootVertexRef: Ref<T> | null;
  subtreeTraversalDisabledRefs: Set<Ref<T>>;
  visitorsState: Partial<Record<VisitOrder, VisitorExecutionState<T>>>;
};

export type KernelOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  container: ResolvedGraphsContainer<T, R>;
  stateBridge: KernelStateBridge<T | R>;
  visitorMetadata: Partial<
    Record<VisitOrder, readonly RegistrationMetadata[]>
  >;
  iterableConfig: TraversalRunnerIterableConfig<VisitOrder>;
  inOrderConfig: DepthFirstTraversalInOrderTraversalConfig | null;
  hasSorter: boolean;
  hasHintIds: boolean;
  concurrency: number;
};

export type FrameState<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  owner: OwnerToken;
  ref: Ref<T | R>;
  depth: number;
  stage: 'sort' | 'identify' | 'resolve' | 'closed';
  hints: (T | R)['VertexHint'][];
  nextIdentityIndex: number;
  nextConsumeIndex: number;
  hintIds: Map<number, HintVertexId>;
  contexts: Map<number, VertexResolutionContext<T | R>>;
  pendingIndices: Set<number>;
  outcomes: Map<number, Outcome<MakeVertexResult<T>>>;
};

export type ChainState<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  owner: OwnerToken;
  ref: Ref<T | R>;
  order: VisitOrder;
  phase: 'running' | 'paused' | 'done' | 'invalid';
  group: 'concurrent' | 'sequential';
  concurrentIndices: number[];
  sequentialIndices: number[];
  position: number;
  waitingFor: 'none' | 'callback' | 'batch';
  commands: TraversalVisitorCommand<R>[];
  metadata: VisitMetadata<T | R>;
  config: TraversalRunnerIterableConfig<VisitOrder>;
};

export type VertexWork<T extends TreeTypeParameters> = {
  ref: Ref<T>;
  unmet: Set<VertexId>;
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
  resume(config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>): void;
  getStatus(): TraversalRunnerStatus;
  getFailure(): { error: unknown } | null;
  inspect(): import('@core/CoreInspection').DriverInspection;
  waitForProgress(): Promise<void>;
}
