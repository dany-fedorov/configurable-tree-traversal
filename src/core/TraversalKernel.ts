import type { MutableTreeChildDiscoveryContext } from '@core/ResolvedTree';
import {
  BreadthFirstPolicy,
  type BreadthFirstPolicyState,
} from '@breadth-first-traversal/lib/BreadthFirstPolicy';
import type { TreeOrDagSchedulerSnapshot } from '@core/CoreInspection';
import type {
  CallbackReply,
  CallSpec,
  KernelAction,
  KernelEvent,
  KernelPort,
  Outcome,
  SchedulingOwnerValidityToken,
  PumpMode,
  TreeOrDagVisitorPhase,
} from '@core/effects/types';
import { engineDagValidationErrors } from '@core/errors/engineDagValidationErrors';
import { DagTraversalStallError } from '@core/errors/DagTraversalStallError';
import type {
  DagInspectionState,
  VertexId,
  InternalVertexRef,
} from '@core/graph/types';
import type { ChainState, FrameState, KernelOptions } from '@core/kernelTypes';
import { GraphScheduling } from '@core/scheduling/GraphScheduling';
import { PrerequisiteResolution } from '@core/scheduling/PrerequisiteResolution';
import type { TraversalStopReason } from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorOptions } from '@core/visitors/normalizeVisitorOptions';
import { VisitorChain } from '@core/visitors/VisitorChain';
import {
  DepthFirstPolicy,
  type DepthFirstFrame,
} from '@depth-first-traversal/lib/DepthFirstPolicy';
import { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';
import { DagPolicy } from '../traversals/dag-traversal/lib/DagPolicy';
import type {
  DagWorkAwaitingSettlement,
  DagWorkSettlementToken,
  DagSettlementOutcome,
  DagProgressSnapshot,
  DagVertexProgress,
} from '../traversals/dag-traversal/lib/DagProgress';
import { assertDagWorkCompletion } from '../traversals/dag-traversal/lib/DagTraversalInstanceConfig';
import {
  getTraversalExecutionPhases,
  normalizeTraversalExecutionOptions,
  executionOptionsFromPhaseGates,
} from './normalizeTraversalExecutionOptions';
import type {
  ResolvedTraversalExecutionOptions,
  TraversalIterableConfigInput,
} from './TraversalRunnerIterableConfig';

type NormalizedDagSettlementOutcome =
  | { kind: 'workCompleted' }
  | { kind: 'traversalFailed'; error: unknown };

function normalizeDagSettlementOutcome(
  outcome: DagSettlementOutcome,
): NormalizedDagSettlementOutcome {
  if (outcome !== null && typeof outcome === 'object') {
    if ('kind' in outcome) {
      if ('ok' in outcome) {
        throw new TypeError('DAG settlement cannot mix kind and ok feedback');
      }
      const kind = outcome.kind;
      if (kind === 'workCompleted' && !('error' in outcome)) {
        return { kind: 'workCompleted' };
      }
      if (kind === 'traversalFailed' && 'error' in outcome) {
        return { kind: 'traversalFailed', error: outcome.error };
      }
    }
  }
  throw new TypeError('Invalid DAG settlement outcome');
}

type PendingRequest<
  T extends VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes,
> = {
  call: CallSpec<T, R>;
  submitted: boolean;
  invoked?: boolean;
  storedReply?: CallbackReply<T, R>;
};

type ChainRuntime<
  T extends VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes,
> = {
  state: ChainState<T, R>;
  machine: VisitorChain<T, R>;
};

type Boundary<T extends VertexDataAndChildHintTypes> = {
  id: number;
  event: KernelEvent<T>;
  expandAfter: boolean;
};

type CallAction<
  T extends VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes,
> = Extract<KernelAction<T, R>, { kind: 'CALL' }>;

type PolicyOrders = {
  initial: TreeOrDagVisitorPhase;
  completion: TreeOrDagVisitorPhase | null;
};

type CallInput<
  T extends VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes,
> = CallSpec<T, R> extends infer C
  ? C extends { requestId: number }
    ? Omit<C, 'requestId'>
    : never
  : never;

type FrameCall<
  T extends VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes,
> = Extract<CallSpec<T, R>, { kind: 'SORT_HINTS' | 'HINT_ID' | 'MAKE_VERTEX' }>;

export class TraversalKernel<
  T extends VertexDataAndChildHintTypes,
  R extends VertexDataAndChildHintTypes = T,
> implements KernelPort<T, R>
{
  private readonly prerequisites: PrerequisiteResolution | null;
  private readonly scheduling: GraphScheduling<T, R>;
  private readonly rootOwner: SchedulingOwnerValidityToken = {
    ownerKind: 'rootResolution',
    runnerLocalOwnerId: 1,
    validityGeneration: 0,
  };
  private readonly ownerEpochs = new Map<string, number>([
    ['rootResolution:1', 0],
  ]);
  private readonly invalidOwners = new Set<string>();
  private readonly pendingRequests = new Map<number, PendingRequest<T, R>>();
  private readonly submittedOutcomes: CallbackReply<T, R>[] = [];
  private readonly storedOutcomeRequests: PendingRequest<T, R>[] = [];
  private readonly readyCalls: CallAction<T, R>[] = [];
  private readonly frames = new Map<number, FrameState<T, R>>();
  private readonly chains = new Map<number, ChainRuntime<T, R>>();
  private readonly startedExpansions = new Set<InternalVertexRef<T | R>>();
  private readonly deferred = new Map<
    InternalVertexRef<T | R>,
    {
      state: ChainState<T, R>;
      generation: DagWorkSettlementToken;
      outcome?: NormalizedDagSettlementOutcome;
    }
  >();
  private discoveryValidated = false;
  private preparing = false;
  private executionStarted = false;
  private readonly expansionQueue: InternalVertexRef<T | R>[] = [];
  private readonly orders: PolicyOrders;
  private readonly depthFirstPolicy: DepthFirstPolicy<T | R> | null;
  private readonly breadthFirstPolicy: BreadthFirstPolicy<T | R> | null;
  private readonly depthFirstChainFrames = new Map<
    number,
    DepthFirstFrame<T | R>
  >();
  private breadthPendingContext:
    | import('@core/ResolvedTree').MutableTreeChildDiscoveryContext<T | R>
    | null = null;
  private nextRequestId = 1;
  private nextOwnerId = 2;
  private nextBoundaryId = 1;
  private rootRequested = false;
  private rootSettled = false;
  private pauseRequested = false;
  private haltReason: 'prepared' | 'paused' | 'awaitingSettlement' | null =
    null;
  private failure: { error: unknown } | null = null;
  private readonly boundaries: Boundary<T | R>[] = [];

  private readonly phases: readonly TreeOrDagVisitorPhase[];
  private executionConfig: ResolvedTraversalExecutionOptions<TreeOrDagVisitorPhase>;

  constructor(private readonly options: KernelOptions<T, R>) {
    assertDagWorkCompletion(options.workCompletionPolicy);
    this.phases = getTraversalExecutionPhases(options.kind);
    this.executionConfig =
      normalizeTraversalExecutionOptions<TreeOrDagVisitorPhase>(
        this.phases,
        executionOptionsFromPhaseGates(options.iterableConfig),
      );
    this.scheduling = new GraphScheduling(
      options.container,
      options.acceptedCompletedWorkVertexIds,
      options.discoveryTiming === 'completeBeforeAnyVisitor',
      options.rootWorkToWorkPrerequisitePolicy,
      options.undeclaredWorkToWorkPrerequisitePolicy,
    );
    this.prerequisites =
      options.hasPrerequisiteResolver === true
        ? new PrerequisiteResolution()
        : null;
    this.orders = this.selectPolicy(options.kind);
    this.depthFirstPolicy =
      options.kind === 'depth-first'
        ? new DepthFirstPolicy(
            options.inOrderConfig!,
            options.hasChildHintsListTransformer,
          )
        : null;
    this.breadthFirstPolicy =
      options.kind === 'breadth-first'
        ? new BreadthFirstPolicy(
            options.stateBridge as typeof options.stateBridge &
              BreadthFirstPolicyState<T | R>,
            options.hasChildHintsListTransformer,
          )
        : null;
    const existingRoot = options.container.liveResolvedGraphView.getRoot();
    if (options.kind === 'dag' && options.dagSeed !== undefined) {
      const refs = options.container.liveResolvedGraphView.getVertexRefs();
      const traversalRoot = options.stateBridge.traversalRootVertexRef;
      if (
        (refs.length === 0 && traversalRoot !== null) ||
        (refs.length > 0 &&
          (existingRoot === null ||
            traversalRoot !== existingRoot ||
            !options.container.liveResolvedGraphView.has(existingRoot)))
      ) {
        throw new Error('Invalid injected DAG seed: traversal root mismatch');
      }
      if (
        refs.length === 0 &&
        (options.dagSeed.dependencyEligiblePhaseVisits.length > 0 ||
          options.dagSeed.expansionQueue.length > 0)
      ) {
        throw new Error(
          'Invalid injected DAG seed: work references an empty graph',
        );
      }
      this.scheduling.restoreDagSeed(
        options.dagSeed.dependencyEligiblePhaseVisits,
      );
      const expansionRefs = new Set<InternalVertexRef<T | R>>();
      for (const ref of options.dagSeed.expansionQueue) {
        if (
          expansionRefs.has(ref) ||
          !options.container.liveResolvedGraphView.has(ref) ||
          options.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
            ref,
          ) !== 'INITIAL_VISIT_COMMITTED' ||
          options.container.store.getTraversalSlots(ref) !== null
        ) {
          throw new Error(
            'Invalid injected DAG seed: expansion queue is inconsistent',
          );
        }
        expansionRefs.add(ref);
      }
      for (const ref of refs) {
        if (
          options.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
            ref,
          ) === 'INITIAL_VISIT_COMMITTED' &&
          options.container.store.getTraversalSlots(ref) === null &&
          !expansionRefs.has(ref)
        ) {
          throw new Error(
            'Invalid injected DAG seed: expansion work is missing',
          );
        }
      }
      this.expansionQueue.push(...options.dagSeed.expansionQueue);
      if (refs.length > 0) {
        this.rootRequested = true;
        this.rootSettled = true;
      }
    }
    if (
      (this.depthFirstPolicy !== null || this.breadthFirstPolicy !== null) &&
      existingRoot !== null
    ) {
      this.rootRequested = true;
      this.rootSettled = true;
      options.stateBridge.traversalRootVertexRef = existingRoot;
      if (options.container.liveResolvedGraphView.has(existingRoot)) {
        this.scheduling.enrollExisting(existingRoot);
        if (this.depthFirstPolicy !== null) {
          this.scheduling.takeReady();
          this.depthFirstPolicy.push(
            this.newOwner('vertexTraversalFrame'),
            existingRoot,
            options.container.liveResolvedGraphView.get(existingRoot)!
              .discoveryDepth,
          );
        }
      }
    }
  }

  poll(mode: PumpMode): KernelAction<T, R> {
    this.processSubmittedOutcomes();
    this.retireKnownPrerequisiteRequests();
    const pendingBoundary = this.boundaries[0];
    if (pendingBoundary !== undefined) {
      return {
        kind: 'EVENT',
        event: pendingBoundary.event,
        boundaryId: pendingBoundary.id,
      };
    }
    if (this.failure !== null) {
      return { kind: 'FAILED', error: this.failure.error };
    }

    const readyCall = this.takeReadyCall(mode);
    if (readyCall !== null) return readyCall;

    for (;;) {
      const chainAction = this.runTransition(() => this.advanceChains());
      if (chainAction !== null) return chainAction;
      const boundary = this.boundaries[0] as Boundary<T | R> | undefined;
      if (boundary !== undefined) {
        return {
          kind: 'EVENT',
          event: boundary.event,
          boundaryId: boundary.id,
        };
      }
      const chainFailure = this.failure as { error: unknown } | null;
      if (chainFailure !== null) {
        return { kind: 'FAILED', error: chainFailure.error };
      }
      if (this.pauseRequested) {
        return this.hasRunningChain() ||
          (this.preparing &&
            Array.from(this.pendingRequests.values()).some(
              (pending) =>
                pending.invoked &&
                !pending.submitted &&
                this.isOwnerValid(pending.call.owner),
            ))
          ? { kind: 'WAIT' }
          : this.halt();
      }

      const frameAction = this.runTransition(() =>
        this.depthFirstPolicy === null && this.breadthFirstPolicy === null
          ? this.advanceFrames()
          : null,
      );
      if (frameAction !== null) return frameAction;
      const frameFailure = this.failure as { error: unknown } | null;
      if (frameFailure !== null) {
        return { kind: 'FAILED', error: frameFailure.error };
      }

      const depthFirstAction = this.runTransition(() =>
        this.advanceDepthFirst(mode),
      );
      if (depthFirstAction === 'PROGRESSED') continue;
      if (depthFirstAction !== null) return depthFirstAction;
      const depthFirstFailure = this.failure as { error: unknown } | null;
      if (depthFirstFailure !== null) {
        return { kind: 'FAILED', error: depthFirstFailure.error };
      }

      const breadthFirstAction = this.runTransition(() =>
        this.advanceBreadthFirst(mode),
      );
      if (breadthFirstAction === 'PROGRESSED') continue;
      if (breadthFirstAction !== null) return breadthFirstAction;
      const breadthFirstFailure = this.failure as { error: unknown } | null;
      if (breadthFirstFailure !== null) {
        return { kind: 'FAILED', error: breadthFirstFailure.error };
      }

      if (
        this.depthFirstPolicy === null &&
        this.breadthFirstPolicy === null &&
        mode === 'drive' &&
        this.runTransition(() => this.admitEligibleVisit())
      ) {
        continue;
      }
      const visitAdmissionFailure = this.failure as {
        error: unknown;
      } | null;
      if (visitAdmissionFailure !== null) {
        return { kind: 'FAILED', error: visitAdmissionFailure.error };
      }
      if (
        this.depthFirstPolicy === null &&
        this.breadthFirstPolicy === null &&
        mode === 'drive' &&
        this.runTransition(() => this.admitExpansion())
      ) {
        continue;
      }
      const admissionFailure = this.failure as { error: unknown } | null;
      if (admissionFailure !== null) {
        return { kind: 'FAILED', error: admissionFailure.error };
      }

      if (!this.rootRequested && mode === 'drive') {
        this.rootRequested = true;
        this.setStatus(TraversalRunnerStatus.RUNNING);
        const existingRoot =
          this.options.container.liveResolvedGraphView.getRoot();
        if (
          (this.depthFirstPolicy !== null ||
            this.breadthFirstPolicy !== null) &&
          existingRoot !== null
        ) {
          this.rootSettled = true;
          this.options.stateBridge.traversalRootVertexRef = existingRoot;
          if (this.options.container.liveResolvedGraphView.has(existingRoot)) {
            this.scheduling.enrollExisting(existingRoot);
            if (this.depthFirstPolicy !== null) {
              this.scheduling.takeReady();
              this.depthFirstPolicy.push(
                this.newOwner('vertexTraversalFrame'),
                existingRoot,
                this.options.container.liveResolvedGraphView.get(existingRoot)!
                  .discoveryDepth,
              );
            }
          }
          continue;
        }
        return this.issue({
          kind: 'MAKE_ROOT',
          owner: this.rootOwner,
        });
      }

      if (
        mode === 'drive' &&
        this.prerequisites !== null &&
        this.frames.size === 0
      ) {
        const next = this.prerequisites.next(
          this.scheduling.getUnknownPrerequisiteIds(),
        );
        if (next !== null) {
          const owner = this.newOwner('prerequisiteResolution');
          this.prerequisites.start(next.id, owner);
          return this.issue({
            kind: 'RESOLVE_PREREQUISITE',
            vertexId: next.id,
            owner,
          });
        }
      }

      if (this.preparing && this.rootSettled && this.discoveryValidated) {
        return this.halt('prepared');
      }
      if (this.isFinished()) {
        this.setStatus(TraversalRunnerStatus.FINISHED);
        return { kind: 'FINISHED' };
      }
      if (
        this.options.kind === 'dag' &&
        mode === 'drive' &&
        !this.hasValidPendingRequest()
      ) {
        const stall = this.scheduling.getStall();
        if (stall !== null) {
          if (
            this.hasDeferredWork() &&
            this.captureProgressSnapshot()
              .invalidDependencyTopologyDiagnostics === null
          )
            return this.halt('awaitingSettlement');
          const error = new DagTraversalStallError(
            this.scheduling.diagnoseStall(stall),
          );
          engineDagValidationErrors.set(this.options.container.store, error);
          this.fail(error);
          return { kind: 'FAILED', error };
        }
      }
      return { kind: 'WAIT' };
    }
  }

  submit(reply: CallbackReply<T, R>): void {
    const pending = this.pendingRequests.get(reply.requestId);
    if (pending === undefined) {
      throw new Error(`Unknown callback request ${reply.requestId}`);
    }
    if (pending.call.kind !== reply.kind) {
      throw new Error(
        `Callback reply kind ${reply.kind} does not match ${pending.call.kind}`,
      );
    }
    if (pending.submitted) {
      throw new Error(
        `Callback request ${reply.requestId} was already submitted`,
      );
    }
    pending.submitted = true;
    this.submittedOutcomes.push(reply);
  }

  discardRequest(requestId: number): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending === undefined || this.isOwnerValid(pending.call.owner)) {
      throw new Error(`Cannot discard live callback request ${requestId}`);
    }
    this.pendingRequests.delete(requestId);
  }

  acknowledgeEvent(boundaryId: number): void {
    const boundary = this.boundaries[0];
    if (boundary === undefined || boundary.id !== boundaryId) {
      throw new Error(`Unknown event boundary ${boundaryId}`);
    }
    if (boundary.expandAfter) {
      if (this.breadthFirstPolicy !== null) {
        this.enqueueBreadthFirstExpansion(boundary.event.vertexHandle);
      } else {
        this.expansionQueue.push(boundary.event.vertexHandle);
      }
    }
    this.boundaries.shift();
  }

  requestHalt(): void {
    if (
      this.options.stateBridge.status !== TraversalRunnerStatus.FINISHED &&
      this.options.stateBridge.status !== TraversalRunnerStatus.FAILED
    ) {
      this.pauseRequested = true;
    }
  }

  validatePreparation(): void {
    if (this.failure !== null) throw this.failure.error;
    if (!this.options.canPrepare) {
      throw new Error(
        'Preparation requires a runner without injected state or containers',
      );
    }
    if (this.executionStarted) {
      throw new Error('Cannot prepare after execution has started');
    }
  }

  resume(
    config?: TraversalIterableConfigInput<TreeOrDagVisitorPhase>,
    preparation = false,
  ): void {
    if (this.failure !== null) return;
    this.executionConfig =
      normalizeTraversalExecutionOptions<TreeOrDagVisitorPhase>(
        this.phases,
        config,
        this.executionConfig,
      );
    this.preparing = preparation;
    if (preparation) {
      this.options.discoveryTiming = 'completeBeforeAnyVisitor';
      this.scheduling.enableEagerDiscovery();
    } else {
      this.executionStarted = true;
    }
    this.pauseRequested = false;
    this.haltReason = null;
    for (const runtime of this.chains.values()) {
      if (runtime.state.phase === 'paused') {
        runtime.machine.resume();
        runtime.state.phase = 'running';
      }
    }
    this.setStatus(
      this.rootRequested
        ? TraversalRunnerStatus.RUNNING
        : TraversalRunnerStatus.NOT_STARTED,
    );
  }

  shouldEmit(phase: TreeOrDagVisitorPhase): boolean {
    return this.executionConfig.iterateOver.includes(phase);
  }

  isRequestEligible(requestId: number, mode: PumpMode): boolean {
    const pending = this.pendingRequests.get(requestId);
    if (pending === undefined || pending.submitted) return false;
    if (!this.isOwnerValid(pending.call.owner)) return false;
    if (
      mode === 'drain' &&
      pending.call.owner.ownerKind !== 'vertexPhaseVisitorChain'
    )
      return false;
    pending.invoked = true;
    return true;
  }

  isRequestValid(requestId: number): boolean {
    const pending = this.pendingRequests.get(requestId);
    return pending !== undefined && this.isOwnerValid(pending.call.owner);
  }

  isHaltRequested(): boolean {
    return this.pauseRequested;
  }

  getFailure(): { error: unknown } | null {
    return this.failure;
  }

  getTraversalLifecycleStatus(): TraversalRunnerStatus {
    return this.options.stateBridge.status;
  }

  getTraversalStopReason(): TraversalStopReason | null {
    switch (this.getTraversalLifecycleStatus()) {
      case TraversalRunnerStatus.SUSPENDED:
        return this.haltReason ?? 'paused';
      case TraversalRunnerStatus.FINISHED:
        return 'finished';
      case TraversalRunnerStatus.FAILED:
        return 'failed';
      default:
        return null;
    }
  }

  captureExecutionSnapshot(): TreeOrDagSchedulerSnapshot {
    return deepFreeze({
      traversalLifecycleStatus: this.getTraversalLifecycleStatus(),
      traversalStopReason: this.getTraversalStopReason(),
      pauseRequested: this.pauseRequested,
      traversalAlgorithm: this.options.kind,
      callbackExecutionMode: this.options.execution,
      sourceTopologyKind: this.options.sourceMode,
      maxConcurrentCallbackInvocations:
        this.options.maxConcurrentCallbackInvocations,
      hasChildHintsListTransformer: this.options.hasChildHintsListTransformer,
      hasChildHintVertexIdResolver: this.options.hasChildHintVertexIdResolver,
      executionOptions: this.inspectConfig(this.executionConfig),
      dependencyEligiblePhaseVisits: this.scheduling
        .inspectEligible()
        .map((visit) => ({
          vertexReferenceIdentity: visit.ref.getReferenceIdentity(),
          visitorPhase:
            visit.order === 'ON_WORK_READY'
              ? this.orders.initial
              : this.orders.completion ?? this.orders.initial,
        })),
      vertexTraversalFrames: [
        ...Array.from(this.frames.values(), (frame) => ({
          owner: { ...frame.owner },
          vertexReferenceIdentity: frame.ref.getReferenceIdentity(),
          stage: (
            {
              transformHints: 'transformingChildHints',
              identify: 'resolvingChildHintVertexIds',
              resolve: 'resolvingChildVertexContent',
            } as const
          )[frame.stage],
          pendingChildHintIndices: Array.from(frame.pendingIndices),
        })),
        ...(this.depthFirstPolicy?.getFrames().map((frame) => ({
          owner: { ...frame.owner },
          vertexReferenceIdentity: frame.vertexHandle.getReferenceIdentity(),
          stage: frame.stage,
          pendingChildHintIndices:
            frame.stage === 'waitingForChildResolution'
              ? [frame.nextChild - 1]
              : [],
        })) ?? []),
        ...(this.breadthFirstPolicy?.getFrames().map((frame) => ({
          owner: { ...frame.owner },
          vertexReferenceIdentity: frame.vertexHandle.getReferenceIdentity(),
          stage:
            frame.stage === 'transformHints'
              ? ('transformingChildHints' as const)
              : ('resolvingChildVertexContent' as const),
          pendingChildHintIndices: frame.pendingIndices.slice(),
        })) ?? []),
      ],
      vertexPhaseVisitorChains: Array.from(
        this.chains.values(),
        ({ state }) => ({
          owner: { ...state.owner },
          vertexReferenceIdentity: state.ref.getReferenceIdentity(),
          visitorPhase: state.order,
          state: (
            {
              running: 'active',
              paused: 'pausedAtCommandBoundary',
              done: 'phaseChainFinished',
              invalid: 'invalidated',
            } as const
          )[state.phase],
          visitorCommandCommitTiming:
            state.group === 'concurrent'
              ? ('afterContiguousVisitorBatch' as const)
              : ('afterEachVisitorCallback' as const),
          visitorCallbackIndexInPhaseChain: state.position,
          pendingCallbackOrCommandBatch:
            state.waitingFor === 'callback'
              ? ('visitorCallbackResult' as const)
              : state.waitingFor === 'batch'
              ? ('commandBatchCommit' as const)
              : ('none' as const),
          executionSelectionsAtAdmission: this.inspectConfig(state.config),
        }),
      ),
      pendingCallbackRequests: Array.from(
        this.pendingRequests.values(),
        ({ call }) => ({
          callbackRequestId: call.requestId,
          operation: {
            MAKE_ROOT: 'resolveRootVertex' as const,
            MAKE_VERTEX:
              this.options.sourceMode === 'tree'
                ? ('resolveChildVertexFromHint' as const)
                : ('resolveChildVertexFromHint' as const),
            RESOLVE_PREREQUISITE: 'resolvePrerequisiteByVertexId' as const,
            SORT_HINTS: 'transformChildHintsBeforeResolution' as const,
            HINT_ID: 'tryGetVertexIdentityFromHint' as const,
            VISIT: 'invokeVisitorCallback' as const,
          }[call.kind],
          owner: { ...call.owner },
          ownerStillValid: this.isOwnerValid(call.owner),
        }),
      ),
      unacknowledgedCommittedEventBoundaryCount: this.boundaries.length,
    });
  }

  /** Internal synchronous observation; no adapters, scheduling or settlement. */
  inspectDagState(): DagInspectionState {
    const syntheticId = this.options.container.syntheticRootId;
    const visible = ({ vertexId }: { vertexId: VertexId }) =>
      syntheticId === null || vertexId !== syntheticId;
    return {
      identityStates: this.options.container.store
        .inspectIdentityStates()
        .filter(visible),
      schedulingStates: this.scheduling
        .inspectSchedulingState()
        .filter(visible),
      discoveryComplete: this.rootSettled && this.isDiscoveryComplete(),
    };
  }

  captureProgressSnapshot(): DagProgressSnapshot {
    const graph = this.options.container.liveResolvedGraphView;
    const work = this.scheduling
      .inspectWork()
      .filter(({ ref }) => ref !== this.options.container.syntheticRootRef);
    const inFlight = new Set(
      Array.from(this.chains.values(), ({ state }) => state.ref),
    );
    const vertices = new Map<VertexId, DagVertexProgress>();
    const readyOrDeferredIds: VertexId[] = [];
    const deferredWorkIds: VertexId[] = [];
    const awaitingSettlement: DagWorkAwaitingSettlement[] = [];
    const activeVisitorVertexIds: VertexId[] = [];
    const completedWorkIds: VertexId[] = [];
    const completedSubgraphIds: VertexId[] = [];
    let pending = 0;
    for (const item of work) {
      const id = graph.requireVertexId(item.ref);
      const deferred = this.deferred.get(item.ref);
      const running = inFlight.has(item.ref);
      const state = item.initialCommitted
        ? 'workCompletionCommitted'
        : running
        ? 'workVisitorChainAdmitted'
        : deferred !== undefined
        ? 'workCompletionDeferred'
        : item.unmet.size === 0 && item.unmetComplete.size === 0
        ? 'readyForWorkVisitorAdmission'
        : 'waitingForPrerequisiteMilestones';
      if (state === 'waitingForPrerequisiteMilestones') pending += 1;
      if (
        state === 'readyForWorkVisitorAdmission' ||
        state === 'workCompletionDeferred'
      )
        readyOrDeferredIds.push(id);
      if (state === 'workCompletionDeferred') {
        deferredWorkIds.push(id);
        if (deferred!.outcome === undefined) {
          awaitingSettlement.push({
            vertexId: id,
            settlementToken: deferred!.generation,
          });
        }
      }
      if (running) activeVisitorVertexIds.push(id);
      if (item.initialCommitted) completedWorkIds.push(id);
      if (item.completionCommitted) completedSubgraphIds.push(id);
      vertices.set(id, {
        vertexId: id,
        workState: state,
        subgraphCompletionCommitted: item.completionCommitted,
        unmetWorkMilestoneVertexIds: Array.from(item.unmet),
        unmetPrerequisiteVertexIds: Array.from(
          new Set([...item.unmet, ...item.unmetComplete]),
        ),
        unmetSubgraphCompletionMilestoneVertexIds: Array.from(
          item.unmetComplete,
        ),
        ...(state === 'workCompletionDeferred'
          ? { settlementToken: deferred!.generation }
          : {}),
      });
    }
    const complete = this.rootSettled && this.isDiscoveryComplete();
    const diagnostics = this.scheduling.diagnoseTopology(
      work.map(({ ref }) => ref),
    );
    // Original edges expose invalid topology even after seeded success; progress
    // fields describe only work still waiting on scheduler prerequisites.
    if (diagnostics !== null) {
      diagnostics.blockedVertexPrerequisiteReports = work
        .filter(
          ({ initialCommitted, unmet, unmetComplete }) =>
            !initialCommitted && (unmet.size > 0 || unmetComplete.size > 0),
        )
        .map(({ ref, unmet, unmetComplete }) => ({
          vertexId: graph.requireVertexId(ref),
          unmetPrerequisiteVertexIds: Array.from(
            new Set([...unmet, ...unmetComplete]),
          ),
        }));
      diagnostics.nonCyclePrerequisiteBlockedVertexIds =
        diagnostics.nonCyclePrerequisiteBlockedVertexIds.filter(
          (id) =>
            vertices.get(id)!.workState === 'waitingForPrerequisiteMilestones',
        );
    }
    return {
      discovery: {
        timing: this.options.discoveryTiming ?? 'incrementalDuringTraversal',
        complete,
      },
      counts: {
        retainedLiveVertices: work.length,
        verticesWaitingForPrerequisiteMilestones: pending,
        workVisitorReadyOrWorkCompletionDeferredVertices:
          readyOrDeferredIds.length,
        workCompletionDeferredVertices: deferredWorkIds.length,
        verticesWithAdmittedVisitorChains: activeVisitorVertexIds.length,
        workCompletionCommittedVertices: completedWorkIds.length,
        subgraphCompletionCommittedVertices: completedSubgraphIds.length,
      },
      progressByVertexId: vertices,
      workVisitorReadyOrWorkCompletionDeferredVertexIds: readyOrDeferredIds,
      workCompletionDeferredVertexIds: deferredWorkIds,
      workAwaitingSettlement: awaitingSettlement,
      admittedVisitorChainVertexIds: activeVisitorVertexIds,
      workCompletionCommittedVertexIds: completedWorkIds,
      subgraphCompletionCommittedVertexIds: completedSubgraphIds,
      unmatchedCompletedWorkSeedVertexIds:
        this.scheduling.getUnusedCompletedWorkIds(),
      invalidDependencyTopologyDiagnostics:
        diagnostics !== null &&
        (diagnostics.milestoneCycleVertexIdComponents.length > 0 ||
          (complete && diagnostics.unresolvedPrerequisiteVertexIds.length > 0))
          ? diagnostics
          : null,
    };
  }

  settle(
    id: VertexId,
    outcome: DagSettlementOutcome,
    expectedGeneration: DagWorkSettlementToken,
  ): boolean {
    const identity = this.options.container.store.getIdState(id);
    const deferred =
      identity?.kind === 'live' ? this.deferred.get(identity.ref) : undefined;
    if (deferred === undefined || deferred.generation !== expectedGeneration) {
      throw new TypeError('Unknown, deleted or stale DAG settlement');
    }
    const normalized = normalizeDagSettlementOutcome(outcome);
    const previous = deferred.outcome;
    if (previous !== undefined) {
      if (
        previous.kind === normalized.kind &&
        (previous.kind === 'workCompleted' ||
          (normalized.kind === 'traversalFailed' &&
            Object.is(previous.error, normalized.error)))
      )
        return false;
      throw new TypeError('Conflicting DAG settlement');
    }
    if (this.failure !== null)
      throw new TypeError('Cannot settle a failed runner');
    deferred.outcome = normalized;
    if (normalized.kind === 'workCompleted') this.commitChain(deferred.state);
    else this.fail(normalized.error);
    return true;
  }

  private hasDeferredWork(): boolean {
    return Array.from(this.deferred.values()).some(
      ({ state, outcome }) =>
        outcome === undefined &&
        this.options.container.liveResolvedGraphView.has(state.ref),
    );
  }

  private processSubmittedOutcomes(): void {
    if (!this.pauseRequested) {
      while (this.storedOutcomeRequests.length > 0) {
        const pending = this.storedOutcomeRequests.shift()!;
        const reply = pending.storedReply!;
        this.pendingRequests.delete(reply.requestId);
        if (!this.isOwnerValid(pending.call.owner)) continue;
        try {
          this.applyOutcome(pending.call, reply);
          this.invalidateRemoved(pending.call.owner);
        } catch (error) {
          this.fail(error);
        }
      }
    }
    while (this.submittedOutcomes.length > 0) {
      const reply = this.submittedOutcomes.shift()!;
      const pending = this.pendingRequests.get(reply.requestId);
      if (pending === undefined) continue;
      if (!this.isOwnerValid(pending.call.owner)) {
        this.pendingRequests.delete(reply.requestId);
        continue;
      }
      if (
        this.options.execution === 'async' &&
        pending.call.owner.ownerKind === 'vertexTraversalFrame' &&
        (this.depthFirstPolicy !== null || this.breadthFirstPolicy !== null)
      ) {
        this.pendingRequests.delete(reply.requestId);
        this.storeFrameOutcome(pending.call as FrameCall<T, R>, reply);
        continue;
      }
      if (
        this.pauseRequested &&
        pending.call.owner.ownerKind !== 'vertexPhaseVisitorChain'
      ) {
        pending.storedReply = reply;
        this.storedOutcomeRequests.push(pending);
        continue;
      }
      this.pendingRequests.delete(reply.requestId);
      try {
        this.applyOutcome(pending.call, reply);
        this.invalidateRemoved(pending.call.owner);
      } catch (error) {
        this.fail(error);
        continue;
      }
      if (pending.call.owner.ownerKind === 'vertexPhaseVisitorChain') {
        const runtime = this.chains.get(pending.call.owner.runnerLocalOwnerId);
        if (runtime !== undefined && runtime.state.phase === 'running') {
          const action = this.runTransition(() =>
            this.advanceChain(pending.call.owner.runnerLocalOwnerId, runtime),
          );
          if (action !== null) this.readyCalls.push(action);
        }
      }
      if (!this.pauseRequested && this.boundaries.length > 0) {
        return;
      }
    }
  }

  private storeFrameOutcome(
    call: FrameCall<T, R>,
    reply: CallbackReply<T, R>,
  ): void {
    const frame = this.frames.get(call.owner.runnerLocalOwnerId)!;
    switch (call.kind) {
      case 'SORT_HINTS':
        frame.sortOutcome = reply.outcome as Outcome<(T | R)['ChildHint'][]>;
        return;
      case 'HINT_ID': {
        const index = call.hintIndex;
        frame.pendingIndices.delete(index);
        frame.identityOutcomes.set(
          index,
          reply.outcome as Outcome<
            import('@core/graph/types').ChildHintVertexIdentity | undefined
          >,
        );
        return;
      }
      case 'MAKE_VERTEX':
        frame.pendingIndices.delete(call.context.parentChildHintIndex);
        frame.outcomes.set(
          call.context.parentChildHintIndex,
          reply.outcome as Outcome<
            import('@core/TraversableTree').MakeVertexResult<T>
          >,
        );
        return;
    }
  }

  private applyOutcome(call: CallSpec<T, R>, reply: CallbackReply<T, R>): void {
    if (!reply.outcome.ok) throw reply.outcome.error;
    switch (call.kind) {
      case 'MAKE_ROOT': {
        const outcome = reply.outcome as {
          ok: true;
          value: import('@core/TraversableTree').MakeVertexResult<T>;
        };
        const ref = this.scheduling.acceptRoot(outcome.value);
        this.rootSettled = true;
        this.options.stateBridge.traversalRootVertexRef = ref;
        if (this.depthFirstPolicy !== null && ref !== null) {
          this.scheduling.takeReady();
          this.depthFirstPolicy.push(
            this.newOwner('vertexTraversalFrame'),
            ref,
            0,
          );
        }
        return;
      }
      case 'RESOLVE_PREREQUISITE': {
        const result = reply.outcome.value as
          | import('@core/TraversableTree').MakeVertexResult<T>
          | undefined;
        this.prerequisites!.settle(call.vertexId);
        if (result !== undefined)
          this.scheduling.acceptPrerequisite(call.vertexId, result);
        return;
      }
      case 'VISIT': {
        const runtime = this.chains.get(call.owner.runnerLocalOwnerId)!;
        runtime.machine.submit(
          reply.outcome as import('@core/visitors/types').VisitorOutcome<
            R,
            T['ChildHint']
          >,
        );
        runtime.state.waitingFor = 'none';
        runtime.state.position += 1;
        runtime.state.metadata.visitorCallbackIndexInPhaseChain += 1;
        if (this.depthFirstPolicy !== null) {
          const visitorState =
            this.options.stateBridge.visitorsState[runtime.state.order];
          if (visitorState !== undefined) {
            visitorState.visitorCallbackIndexInPhaseChain =
              runtime.state.metadata.visitorCallbackIndexInPhaseChain;
          }
        }
        return;
      }
      case 'SORT_HINTS': {
        if (this.depthFirstPolicy !== null) {
          const frame = this.findDepthFirstFrame(call.owner.runnerLocalOwnerId);
          const hints = (
            reply.outcome as { ok: true; value: (T | R)['ChildHint'][] }
          ).value.slice();
          this.scheduling.prepareSlots(frame.vertexHandle, hints);
          this.depthFirstPolicy.setHints(frame, hints);
          return;
        }
        if (this.breadthFirstPolicy !== null) {
          const hints = (
            reply.outcome as { ok: true; value: (T | R)['ChildHint'][] }
          ).value.slice();
          const frame = this.breadthFirstPolicy.getFrames()[0]!;
          this.scheduling.prepareSlots(frame.vertexHandle, hints);
          const completed = this.breadthFirstPolicy.setSortedHints(
            call.owner,
            hints,
          );
          if (completed.empty) {
            this.scheduling.closeExpansion(completed.vertexHandle);
          }
          return;
        }
        const frame = this.frames.get(call.owner.runnerLocalOwnerId)!;
        frame.hints = (
          reply.outcome as { ok: true; value: (T | R)['ChildHint'][] }
        ).value.slice();
        frame.stage = this.options.hasChildHintVertexIdResolver
          ? 'identify'
          : 'resolve';
        this.scheduling.prepareSlots(frame.ref, frame.hints);
        return;
      }
      case 'HINT_ID': {
        const frame = this.frames.get(call.owner.runnerLocalOwnerId)!;
        const index =
          this.options.kind === 'dag' && this.options.execution === 'async'
            ? call.hintIndex
            : frame.nextIdentityIndex;
        const value = (
          reply.outcome as {
            ok: true;
            value:
              | import('@core/graph/types').ChildHintVertexIdentity
              | undefined;
          }
        ).value;
        if (value !== undefined) frame.hintIds.set(index, value);
        frame.pendingIndices.delete(index);
        frame.nextIdentityIndex += 1;
        return;
      }
      case 'MAKE_VERTEX': {
        if (this.depthFirstPolicy !== null) {
          const frame = this.findDepthFirstFrame(call.owner.runnerLocalOwnerId);
          const value = (
            reply.outcome as {
              ok: true;
              value: import('@core/TraversableTree').MakeVertexResult<T>;
            }
          ).value;
          const child = this.scheduling.acceptVertex(call.context, value);
          this.depthFirstPolicy.completeChild(
            frame,
            call.context.parentChildHintIndex,
            child !== null,
          );
          if (child !== null) {
            this.scheduling.takeReady();
            this.depthFirstPolicy.push(
              this.newOwner('vertexTraversalFrame'),
              child,
              call.context.discoveryDepthInEdges,
            );
          }
          return;
        }
        if (this.breadthFirstPolicy !== null) {
          const completed = this.breadthFirstPolicy.completeResolution(
            call.owner,
          );
          const value = (
            reply.outcome as {
              ok: true;
              value: import('@core/TraversableTree').MakeVertexResult<T>;
            }
          ).value;
          this.scheduling.acceptVertex(completed.context, value);
          if (completed.closeParent) {
            this.scheduling.closeExpansion(
              completed.context.parentVertexReference,
            );
          }
          return;
        }
        const frame = this.frames.get(call.owner.runnerLocalOwnerId)!;
        const index =
          this.options.kind === 'dag' && this.options.execution === 'async'
            ? call.context.parentChildHintIndex
            : frame.nextConsumeIndex;
        const value = (
          reply.outcome as {
            ok: true;
            value: import('@core/TraversableTree').MakeVertexResult<T>;
          }
        ).value;
        frame.pendingIndices.delete(index);
        this.scheduling.acceptVertex(
          call.context,
          value,
          frame.hintIds.get(index),
        );
        frame.nextConsumeIndex += 1;
      }
    }
  }

  private advanceChains(): KernelAction<T, R> | null {
    for (const [id, runtime] of this.chains) {
      if (runtime.state.phase !== 'running') continue;
      const action = this.advanceChain(id, runtime);
      if (action !== null) return action;
    }
    return null;
  }

  private advanceChain(
    id: number,
    runtime: ChainRuntime<T, R>,
  ): CallAction<T, R> | null {
    for (;;) {
      const action = runtime.machine.poll();
      switch (action.kind) {
        case 'VISIT': {
          const metadata = this.options.visitorMetadata[runtime.state.order]!;
          const style = normalizeVisitorOptions(
            metadata[action.recordIndex]!,
          ).visitorCommandCommitTiming;
          runtime.state.group =
            style === 'afterContiguousVisitorBatch'
              ? 'concurrent'
              : 'sequential';
          runtime.state.waitingFor = 'callback';
          return this.issue({
            kind: 'VISIT',
            owner: runtime.state.owner,
            ref: action.ref,
            order: runtime.state.order,
            recordIndex: action.recordIndex,
            metadata: action.metadata,
          });
        }
        case 'COMMANDS': {
          runtime.state.waitingFor = 'batch';
          runtime.state.commands = action.commands.slice();
          const result = this.commitCommands(runtime, action.commands);
          runtime.machine.commitBatch(result);
          runtime.state.commands = [];
          runtime.state.waitingFor = 'none';
          if (result.deferred) {
            this.deferChain(id, runtime.state);
            return null;
          }
          if (result.halt) runtime.state.phase = 'paused';
          if (result.deleted) runtime.state.phase = 'invalid';
          break;
        }
        case 'PAUSED':
          runtime.state.phase = 'paused';
          return null;
        case 'WAIT':
          return null;
        case 'DONE':
          runtime.state.phase = 'done';
          if (
            this.options.workCompletionPolicy ===
              'requireExternalWorkSettlement' &&
            runtime.state.order === 'ON_WORK_READY' &&
            this.options.container.liveResolvedGraphView.has(runtime.state.ref)
          ) {
            this.deferChain(id, runtime.state);
          } else {
            this.commitChain(runtime.state);
            this.chains.delete(id);
          }
          return null;
      }
    }
  }

  private deferChain(id: number, state: ChainState<T, R>): void {
    this.deferred.set(state.ref, {
      state,
      generation: Symbol('DAG settlement'),
    });
    this.chains.delete(id);
    this.expansionQueue.push(state.ref);
  }

  private commitCommands(
    runtime: ChainRuntime<T, R>,
    commands: ChainState<T, R>['commands'],
  ): {
    deferred?: boolean;
    halt: boolean;
    deleted: boolean;
    currentVertexPhaseChainState?: unknown;
  } {
    let halt = false;
    let deleted = false;
    let hasState = false;
    let chainState: unknown;
    for (const command of commands) {
      if (
        this.options.discoveryTiming === 'completeBeforeAnyVisitor' &&
        (command.commandName ===
          TraversalVisitorCommandName.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX ||
          command.commandName ===
            TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS)
      ) {
        throw new TypeError(
          'Cannot change child topology after eager discovery',
        );
      }
      switch (command.commandName) {
        case TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION:
          return { halt: false, deleted: false, deferred: true };
        case TraversalVisitorCommandName.NO_OPERATION:
          break;
        case TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY:
          halt = true;
          this.pauseRequested = true;
          break;
        case TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS:
        case TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS: {
          const expected =
            this.options.kind === 'dag'
              ? TraversalVisitorCommandName.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS
              : TraversalVisitorCommandName.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS;
          if (command.commandName !== expected) {
            throw new TypeError(
              'Deletion command does not match traversal family',
            );
          }
          const removed = this.scheduling.deleteVertex(runtime.state.ref);
          this.scheduling.takeRemovedRefs();
          deleted = removed.has(runtime.state.ref);
          this.invalidateRefs(removed, runtime.state.owner);
          break;
        }
        case TraversalVisitorCommandName.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX:
          this.options.stateBridge.subtreeTraversalDisabledRefs.add(
            runtime.state.ref,
          );
          if (
            this.depthFirstPolicy === null &&
            this.breadthFirstPolicy === null &&
            runtime.state.order === this.orders.initial
          ) {
            this.scheduling.prepareSlots(
              runtime.state.ref,
              runtime.state.ref
                .getReferencedValue()
                .getMutableChildDiscoveryHints()
                .slice(),
            );
          }
          if (
            this.depthFirstPolicy === null &&
            this.breadthFirstPolicy === null
          ) {
            this.scheduling.disableSubtree(runtime.state.ref);
          } else if (
            this.depthFirstPolicy !== null &&
            runtime.state.order !==
              DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION
          ) {
            this.scheduling.disableSubtree(runtime.state.ref);
          }
          break;
        case TraversalVisitorCommandName.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE:
          if (
            command.commandArguments === null ||
            typeof command.commandArguments !== 'object' ||
            !Object.prototype.hasOwnProperty.call(
              command.commandArguments,
              'phaseChainState',
            ) ||
            Reflect.ownKeys(command.commandArguments).some(
              (key) => key !== 'phaseChainState',
            )
          ) {
            throw new TypeError(
              'SET_CURRENT_VERTEX_PHASE_CHAIN_STATE requires only an own phaseChainState field',
            );
          }
          hasState = true;
          chainState = command.commandArguments.phaseChainState;
          break;
        case TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA:
          runtime.state.ref.replaceReferencedValue(
            runtime.state.ref
              .getReferencedValue()
              .createEditableShallowCloneWithContentOverrides({
                $vertexData: command.commandArguments.replacementVertexData,
              }),
          );
          break;
        case TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS:
          if (
            (this.depthFirstPolicy !== null &&
              runtime.state.order !==
                DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION) ||
            (this.options.kind === 'dag' &&
              runtime.state.order !== 'ON_WORK_READY')
          ) {
            throw new Error(
              this.options.kind === 'dag'
                ? 'Child hints can only be rewritten during ON_WORK_READY'
                : 'Child hints can only be rewritten during pre-order',
            );
          }
          runtime.state.ref.replaceReferencedValue(
            runtime.state.ref
              .getReferencedValue()
              .createEditableShallowCloneWithContentOverrides({
                $childDiscoveryHints:
                  command.commandArguments.replacementChildHints.slice(),
              }),
          );
          break;
        default:
          throw new TypeError('Unknown visitor command');
      }
    }
    return {
      halt,
      deleted,
      ...(hasState ? { currentVertexPhaseChainState: chainState } : {}),
    };
  }

  private commitChain(state: ChainState<T, R>): void {
    const depthFirstFrame = this.depthFirstChainFrames.get(
      state.owner.runnerLocalOwnerId,
    );
    this.depthFirstChainFrames.delete(state.owner.runnerLocalOwnerId);
    const visitorState = this.options.stateBridge.visitorsState[state.order];
    if (
      this.depthFirstPolicy !== null &&
      visitorState !== undefined &&
      this.visitorsEnabledFor(state.config, state.order)
    ) {
      visitorState.visitorCallbackIndexInPhaseChain =
        state.metadata.visitorCallbackIndexInPhaseChain;
      visitorState.phaseVisitorChainIndex += 1;
      visitorState.previousCommittedVisitVertexHandleForSamePhase = state.ref;
    }
    if (
      this.breadthFirstPolicy !== null &&
      visitorState !== undefined &&
      this.visitorsEnabledFor(state.config, state.order)
    ) {
      visitorState.visitorCallbackIndexInPhaseChain =
        state.metadata.visitorCallbackIndexInPhaseChain;
      visitorState.phaseVisitorChainIndex += 1;
      visitorState.previousCommittedVisitVertexHandleForSamePhase = state.ref;
    }
    if (!this.options.container.liveResolvedGraphView.has(state.ref)) return;
    const initial = state.order === this.orders.initial;
    if (
      state.order ===
      DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES
    ) {
      this.depthFirstPolicy!.completeVisit(
        depthFirstFrame!,
        DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES,
      );
    } else if (initial) {
      this.scheduling.markPreVisited(state.ref);
      if (depthFirstFrame !== undefined && this.depthFirstPolicy !== null) {
        this.depthFirstPolicy.completeVisit(
          depthFirstFrame,
          DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        );
      }
    } else {
      this.scheduling.markComplete(state.ref);
      if (depthFirstFrame !== undefined && this.depthFirstPolicy !== null) {
        this.depthFirstPolicy.completeVisit(
          depthFirstFrame,
          DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
        );
      }
    }
    if (
      visitorState !== undefined &&
      this.depthFirstPolicy === null &&
      this.breadthFirstPolicy === null
    ) {
      visitorState.visitorCallbackIndexInPhaseChain =
        state.metadata.visitorCallbackIndexInPhaseChain;
      visitorState.previousCommittedVisitVertexHandleForSamePhase = state.ref;
    }
    // Record each committed observation independently of the admitted callback
    // policy. A later iterator lease selects it only when delivering it.
    this.boundaries.push({
      id: this.nextBoundaryId++,
      event: {
        vertex: state.ref.getReferencedValue(),
        vertexHandle: state.ref,
        order: state.order,
        isRoot:
          state.ref === this.options.container.liveResolvedGraphView.getRoot(),
      },
      expandAfter: initial && this.depthFirstPolicy === null,
    });
  }

  private advanceDepthFirst(
    mode: PumpMode,
  ): KernelAction<T, R> | 'PROGRESSED' | null {
    const policy = this.depthFirstPolicy;
    if (policy === null) return null;
    if (this.options.execution === 'async') {
      const frame = policy.getFrames().at(-1);
      if (frame !== undefined) {
        const transportFrame = this.frames.get(frame.owner.runnerLocalOwnerId);
        if (transportFrame !== undefined) {
          const transportAction = this.advanceAsyncFrame(transportFrame);
          if (transportAction !== null) return transportAction;
          if (mode !== 'drive') return null;
          if (frame.stage === 'waitingForChildResolution') {
            const index = frame.nextChild - 1;
            const context = transportFrame.contexts.get(index)!;
            let child: InternalVertexRef<T | R> | null;
            let resolved: boolean;
            if (transportFrame.knownIndices.has(index)) {
              this.scheduling.acceptKnownHint(
                context,
                transportFrame.hintIds.get(index)!,
              );
              const slot = this.options.container.store.getTraversalSlots(
                context.parentVertexReference,
              )?.[index];
              resolved = slot?.kind === 'linked';
              child = null;
            } else {
              const outcome = transportFrame.outcomes.get(index);
              if (outcome === undefined) return null;
              transportFrame.outcomes.delete(index);
              if (!outcome.ok) throw outcome.error;
              child = this.scheduling.acceptVertex(
                context,
                outcome.value,
                transportFrame.hintIds.get(index),
              );
              resolved = child !== null;
            }
            policy.completeChild(frame, index, resolved);
            transportFrame.nextConsumeIndex += 1;
            if (child !== null) {
              this.scheduling.takeReady();
              policy.push(
                this.newOwner('vertexTraversalFrame'),
                child,
                context.discoveryDepthInEdges,
              );
            }
            return 'PROGRESSED';
          }
        }
      }
    }
    if (mode !== 'drive') return null;
    const work = policy.next(
      (ref) => this.options.container.liveResolvedGraphView.has(ref),
      (ref) => this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref),
    );
    if (work === null) return null;
    switch (work.kind) {
      case 'VISIT': {
        const owner = this.admitChain(work.frame.vertexHandle, work.order);
        this.depthFirstChainFrames.set(owner.runnerLocalOwnerId, work.frame);
        return 'PROGRESSED';
      }
      case 'PREPARE_HINTS':
        if (this.options.execution === 'async') {
          const frame = this.makeAsyncFrame(
            work.frame.owner,
            work.frame.vertexHandle,
            work.frame.depth,
            work.hints,
            'resolve',
          );
          this.prepareAsyncFrame(frame, work.hints);
        } else {
          this.scheduling.prepareSlots(work.frame.vertexHandle, work.hints);
        }
        policy.setHints(work.frame, work.hints);
        return 'PROGRESSED';
      case 'SORT_HINTS':
        if (this.options.execution === 'async') {
          this.makeAsyncFrame(
            work.frame.owner,
            work.frame.vertexHandle,
            work.frame.depth,
            work.hints,
            'transformHints',
          );
        }
        return this.issue({
          kind: 'SORT_HINTS',
          owner: work.frame.owner,
          hints: work.hints,
        });
      case 'MAKE_VERTEX': {
        if (this.options.execution === 'async') {
          return this.advanceDepthFirst(mode);
        }
        const context: MutableTreeChildDiscoveryContext<T | R> = {
          parentVertexReference: work.frame.vertexHandle,
          parentVertexAtChildResolution:
            work.frame.vertexHandle.getReferencedValue(),
          discoveryDepthInEdges: work.frame.depth + 1,
          parentChildHintIndex: work.index,
          childDiscoveryHint: work.frame.hints[work.index]!,
        };
        return this.issue({
          kind: 'MAKE_VERTEX',
          owner: work.frame.owner,
          context,
        });
      }
      case 'CLOSE':
        this.scheduling.closeExpansion(work.frame.vertexHandle);
        this.frames.delete(work.frame.owner.runnerLocalOwnerId);
        this.scheduling.takeCompleting();
        return 'PROGRESSED';
      case 'POP':
        return 'PROGRESSED';
    }
  }

  private findDepthFirstFrame(ownerId: number): DepthFirstFrame<T | R> {
    return this.depthFirstPolicy!.getFrames().find(
      (candidate) => candidate.owner.runnerLocalOwnerId === ownerId,
    )!;
  }

  private advanceBreadthFirst(
    mode: PumpMode,
  ): KernelAction<T, R> | 'PROGRESSED' | null {
    const policy = this.breadthFirstPolicy;
    if (policy === null) return null;
    if (this.options.execution === 'async') {
      for (const frame of this.frames.values()) {
        const action = this.advanceAsyncFrame(frame);
        if (action !== null) return action;
      }
      if (mode !== 'drive') return null;
      if (this.breadthPendingContext !== null) {
        const context = this.breadthPendingContext;
        const frame = Array.from(this.frames.values()).find(
          (candidate) => candidate.ref === context.parentVertexReference,
        )!;
        const outcome = frame.outcomes.get(context.parentChildHintIndex);
        if (outcome === undefined) return null;
        frame.outcomes.delete(context.parentChildHintIndex);
        if (!outcome.ok) throw outcome.error;
        const completed = policy.completeResolution(frame.owner);
        this.breadthPendingContext = null;
        this.scheduling.acceptVertex(
          frame.contexts.get(context.parentChildHintIndex)!,
          outcome.value,
          frame.hintIds.get(context.parentChildHintIndex),
        );
        frame.nextConsumeIndex += 1;
        if (frame.nextConsumeIndex === frame.hints.length) {
          this.frames.delete(frame.owner.runnerLocalOwnerId);
        }
        if (completed.closeParent) {
          this.scheduling.closeExpansion(completed.context.parentVertexReference);
        }
        return 'PROGRESSED';
      }
    }
    const eligible = this.scheduling.takeEligible();
    if (eligible !== null) {
      if (eligible.order === 'ON_SUBGRAPH_COMPLETION_READY') {
        this.scheduling.markComplete(eligible.ref);
      } else {
        this.admitChain(eligible.ref, this.orders.initial);
      }
      return 'PROGRESSED';
    }
    const work = policy.next(
      (ref) => this.options.container.liveResolvedGraphView.has(ref),
      (ref) => this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref),
    );
    if (work === null) return null;
    switch (work.kind) {
      case 'PREPARE_HINTS':
        if (this.options.execution === 'async') {
          const frame = this.makeAsyncFrame(
            work.expansion.owner,
            work.expansion.vertexHandle,
            work.expansion.depth,
            work.hints,
            'resolve',
          );
          this.prepareAsyncFrame(frame, work.hints);
        }
        if (this.options.execution !== 'async') {
          this.scheduling.prepareSlots(work.expansion.vertexHandle, work.hints);
        }
        if (policy.setHints(work.expansion, work.hints)) {
          this.scheduling.closeExpansion(work.expansion.vertexHandle);
          if (this.options.execution === 'async') {
            this.frames.delete(work.expansion.owner.runnerLocalOwnerId);
          }
        }
        return 'PROGRESSED';
      case 'SORT_HINTS':
        if (this.options.execution === 'async') {
          this.makeAsyncFrame(
            work.expansion.owner,
            work.expansion.vertexHandle,
            work.expansion.depth,
            work.hints,
            'transformHints',
          );
        }
        return this.issue({
          kind: 'SORT_HINTS',
          owner: work.expansion.owner,
          hints: work.hints,
        });
      case 'MAKE_VERTEX': {
        if (this.options.execution === 'async') {
          const frame = Array.from(this.frames.values()).find(
            (candidate) => candidate.ref === work.context.parentVertexReference,
          )!;
          policy.startResolution(frame.owner, work.context);
          this.breadthPendingContext = work.context;
          return this.advanceBreadthFirst(mode);
        }
        const owner = this.newOwner('vertexTraversalFrame');
        policy.startResolution(owner, work.context);
        return this.issue({
          kind: 'MAKE_VERTEX',
          owner,
          context: work.context,
        });
      }
      case 'CLEAR_QUEUE':
        policy.clearQueue();
        return 'PROGRESSED';
    }
  }

  private enqueueBreadthFirstExpansion(ref: InternalVertexRef<T | R>): void {
    const vertex = this.options.container.liveResolvedGraphView.get(ref);
    if (vertex !== null) {
      const policy = this.breadthFirstPolicy!;
      if (!this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref)) {
        const frontier = policy.takeInjectedFrontier(ref);
        if (frontier !== null) {
          const contexts = frontier.contexts
            .slice()
            .sort(
              (left, right) =>
                left.parentChildHintIndex - right.parentChildHintIndex,
            );
          if (
            contexts.some(
              (context, index) => context.parentChildHintIndex !== index,
            )
          ) {
            throw new Error('Invalid injected breadth-first frontier');
          }
          this.scheduling.prepareSlots(
            ref,
            contexts.map((context) => context.childDiscoveryHint),
          );
          for (const context of contexts) {
            if (
              frontier.consumedHintIndices.has(context.parentChildHintIndex)
            ) {
              this.scheduling.restoreConsumedTreeSlot(context);
            }
          }
          if (policy.activateInjectedFrontier(ref)) {
            this.scheduling.closeExpansion(ref);
          }
          return;
        }
      }
      policy.enqueueExpansion(
        this.newOwner('vertexTraversalFrame'),
        ref,
        vertex.discoveryDepth,
      );
    }
  }

  private advanceFrames(): KernelAction<T, R> | null {
    if (this.options.execution === 'async') {
      for (const frame of this.frames.values()) {
        const action = this.advanceDagFrame(frame);
        if (action !== null) return action;
      }
      return null;
    }
    const frame = this.frames.values().next().value as
      | FrameState<T, R>
      | undefined;
    if (frame === undefined) return null;
    if (frame.stage === 'transformHints') {
      if (this.hasPendingFor(frame.owner)) return null;
      return this.issue({
        kind: 'SORT_HINTS',
        owner: frame.owner,
        hints: frame.hints.slice(),
      });
    }
    if (frame.stage === 'identify') {
      if (frame.nextIdentityIndex >= frame.hints.length) {
        frame.stage = 'resolve';
      } else {
        if (this.hasPendingFor(frame.owner)) return null;
        const index = frame.nextIdentityIndex;
        frame.pendingIndices.add(index);
        return this.issue({
          kind: 'HINT_ID',
          owner: frame.owner,
          hint: frame.hints[index]!,
          hintIndex: index,
        });
      }
    }
    if (frame.stage === 'resolve') {
      while (frame.nextConsumeIndex < frame.hints.length) {
        if (this.hasPendingFor(frame.owner)) return null;
        const index = frame.nextConsumeIndex;
        const context: MutableTreeChildDiscoveryContext<T | R> = {
          discoveryDepthInEdges:
            this.options.container.store.getDiscoveryDepth(frame.ref) + 1,
          parentVertexAtChildResolution: frame.ref.getReferencedValue(),
          parentVertexReference: frame.ref,
          parentChildHintIndex: index,
          childDiscoveryHint: frame.hints[index]!,
        };
        frame.contexts.set(index, context);
        const hintIdentity = frame.hintIds.get(index);
        if (
          hintIdentity !== undefined &&
          this.scheduling.acceptKnownHint(context, hintIdentity)
        ) {
          frame.nextConsumeIndex += 1;
          continue;
        }
        frame.pendingIndices.add(index);
        return this.issue({
          kind: 'MAKE_VERTEX',
          owner: frame.owner,
          context,
        });
      }
      this.scheduling.closeExpansion(frame.ref);
      this.frames.delete(frame.owner.runnerLocalOwnerId);
      return null;
    }
    return null;
  }

  private advanceDagFrame(frame: FrameState<T, R>): CallAction<T, R> | null {
    if (frame.stage === 'transformHints') {
      if (this.hasPendingFor(frame.owner)) return null;
      return this.issue({
        kind: 'SORT_HINTS',
        owner: frame.owner,
        hints: frame.hints.slice(),
      });
    }
    if (frame.stage === 'identify') {
      if (frame.nextAdmissionIndex < frame.hints.length) {
        const index = frame.nextAdmissionIndex++;
        frame.pendingIndices.add(index);
        return this.issue({
          kind: 'HINT_ID',
          owner: frame.owner,
          hint: frame.hints[index]!,
          hintIndex: index,
        });
      }
      if (frame.pendingIndices.size > 0) return null;
      frame.stage = 'resolve';
      frame.nextAdmissionIndex = 0;
    }
    if (frame.stage === 'resolve') {
      while (frame.nextAdmissionIndex < frame.hints.length) {
        const index = frame.nextAdmissionIndex;
        const pendingHint = frame.hintIds.get(index);
        if (
          pendingHint !== undefined &&
          this.prerequisites?.isPending(pendingHint.vertexId)
        )
          return null;
        frame.nextAdmissionIndex += 1;
        const context: MutableTreeChildDiscoveryContext<T | R> = {
          discoveryDepthInEdges:
            this.options.container.store.getDiscoveryDepth(frame.ref) + 1,
          parentVertexAtChildResolution: frame.ref.getReferencedValue(),
          parentVertexReference: frame.ref,
          parentChildHintIndex: index,
          childDiscoveryHint: frame.hints[index]!,
        };
        frame.contexts.set(index, context);
        const hintIdentity = frame.hintIds.get(index);
        if (
          hintIdentity !== undefined &&
          this.scheduling.acceptKnownHint(context, hintIdentity)
        ) {
          frame.nextConsumeIndex += 1;
          continue;
        }
        frame.pendingIndices.add(index);
        return this.issue({
          kind: 'MAKE_VERTEX',
          owner: frame.owner,
          context,
        });
      }
      if (frame.pendingIndices.size > 0) return null;
      this.scheduling.closeExpansion(frame.ref);
      this.frames.delete(frame.owner.runnerLocalOwnerId);
    }
    return null;
  }

  private makeAsyncFrame(
    owner: SchedulingOwnerValidityToken,
    ref: InternalVertexRef<T | R>,
    depth: number,
    hints: (T | R)['ChildHint'][],
    stage: FrameState<T, R>['stage'],
  ): FrameState<T, R> {
    const frame: FrameState<T, R> = {
      owner,
      ref,
      depth,
      stage,
      hints: hints.slice(),
      nextIdentityIndex: 0,
      nextAdmissionIndex: 0,
      nextConsumeIndex: 0,
      hintIds: new Map(),
      knownIndices: new Set(),
      contexts: new Map(),
      pendingIndices: new Set(),
      identityOutcomes: new Map(),
      outcomes: new Map(),
      sortOutcome: null,
    };
    this.frames.set(owner.runnerLocalOwnerId, frame);
    return frame;
  }

  private prepareAsyncFrame(
    frame: FrameState<T, R>,
    hints: (T | R)['ChildHint'][],
  ): void {
    frame.hints = hints.slice();
    frame.stage = this.options.hasChildHintVertexIdResolver
      ? 'identify'
      : 'resolve';
    frame.nextIdentityIndex = 0;
    frame.nextAdmissionIndex = 0;
    frame.nextConsumeIndex = 0;
    const parentVertex = frame.ref.getReferencedValue();
    for (let index = 0; index < frame.hints.length; index += 1) {
      frame.contexts.set(index, {
        discoveryDepthInEdges: frame.depth + 1,
        parentVertexAtChildResolution: parentVertex,
        parentVertexReference: frame.ref,
        parentChildHintIndex: index,
        childDiscoveryHint: frame.hints[index]!,
      });
    }
    this.scheduling.prepareSlots(frame.ref, frame.hints);
  }

  private advanceAsyncFrame(frame: FrameState<T, R>): CallAction<T, R> | null {
    if (frame.stage === 'transformHints') {
      const outcome = frame.sortOutcome;
      if (outcome === null) return null;
      frame.sortOutcome = null;
      if (!outcome.ok) throw outcome.error;
      this.prepareAsyncFrame(frame, outcome.value);
      this.depthFirstPolicy?.setHints(
        this.findDepthFirstFrame(frame.owner.runnerLocalOwnerId),
        outcome.value,
      );
      if (this.breadthFirstPolicy !== null) {
        const completed = this.breadthFirstPolicy.setSortedHints(
          frame.owner,
          outcome.value,
        );
        if (completed.empty) {
          this.scheduling.closeExpansion(completed.vertexHandle);
          this.frames.delete(frame.owner.runnerLocalOwnerId);
        }
      }
    }
    if (frame.stage === 'identify') {
      if (frame.nextAdmissionIndex < frame.hints.length) {
        const index = frame.nextAdmissionIndex++;
        frame.pendingIndices.add(index);
        return this.issue({
          kind: 'HINT_ID',
          owner: frame.owner,
          hint: frame.hints[index]!,
          hintIndex: index,
        });
      }
      if (frame.identityOutcomes.size < frame.hints.length) return null;
      while (frame.nextIdentityIndex < frame.hints.length) {
        const index = frame.nextIdentityIndex++;
        const outcome = frame.identityOutcomes.get(index)!;
        frame.identityOutcomes.delete(index);
        if (!outcome.ok) throw outcome.error;
        if (outcome.value !== undefined)
          frame.hintIds.set(index, outcome.value);
      }
      frame.stage = 'resolve';
      frame.nextAdmissionIndex = 0;
    }
    if (frame.stage === 'resolve') {
      while (frame.nextAdmissionIndex < frame.hints.length) {
        const index = frame.nextAdmissionIndex++;
        const hintId = frame.hintIds.get(index);
        if (
          hintId !== undefined &&
          Object.prototype.hasOwnProperty.call(hintId, 'vertexId') &&
          this.options.container.store.getIdState(hintId.vertexId) !== undefined
        ) {
          frame.knownIndices.add(index);
          continue;
        }
        frame.pendingIndices.add(index);
        return this.issue({
          kind: 'MAKE_VERTEX',
          owner: frame.owner,
          context: frame.contexts.get(index)!,
        });
      }
    }
    return null;
  }

  private admitEligibleVisit(): boolean {
    if (
      !this.discoveryValidated &&
      (this.options.discoveryTiming === 'completeBeforeAnyVisitor' ||
        this.options.acceptedCompletedWorkVertexIds !== undefined ||
        this.scheduling.usesCompletionDependencies() ||
        this.prerequisites !== null)
    ) {
      if (this.rootSettled && this.isDiscoveryComplete()) {
        this.scheduling.validateDiscoveredGraph();
        this.discoveryValidated = true;
      } else if (this.options.discoveryTiming === 'completeBeforeAnyVisitor') {
        return false;
      }
    }
    if (this.preparing) return false;
    if (
      this.options.kind === 'dag' &&
      this.options.execution === 'async' &&
      !DagPolicy.allowsChainAdmission(
        this.chains.size,
        this.options.maxConcurrentCallbackInvocations,
      )
    ) {
      return false;
    }
    const eligible = this.scheduling.takeEligible();
    if (eligible === null) return false;
    if (eligible.ref === this.options.container.syntheticRootRef) {
      this.scheduling.markComplete(eligible.ref);
      return true;
    }
    const order =
      eligible.order === 'ON_WORK_READY'
        ? this.orders.initial
        : this.orders.completion!;
    if (eligible.order === 'ON_WORK_READY') {
      this.scheduling.markPreVisiting(eligible.ref);
    }
    this.admitChain(eligible.ref, order);
    return true;
  }

  private admitChain(
    ref: InternalVertexRef<T | R>,
    order: TreeOrDagVisitorPhase,
  ): SchedulingOwnerValidityToken {
    const owner = this.newOwner('vertexPhaseVisitorChain');
    const config = this.copyConfig(this.executionConfig);
    const records = this.visitorsEnabled(order)
      ? (this.options.visitorMetadata[order] ?? []).slice()
      : [];
    const visitorState = (this.options.stateBridge.visitorsState[order] ??= {
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
    });
    const metadata = {
      phaseVisitorChainIndex: visitorState.phaseVisitorChainIndex,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase:
        visitorState.previousCommittedVisitVertexHandleForSamePhase,
      currentVertexPhaseChainState: null,
    };
    if (
      records.length > 0 &&
      this.depthFirstPolicy === null &&
      this.breadthFirstPolicy === null
    ) {
      visitorState.phaseVisitorChainIndex += 1;
    }
    if (
      this.depthFirstPolicy !== null &&
      this.visitorsEnabledFor(config, order)
    ) {
      visitorState.visitorCallbackIndexInPhaseChain = 0;
    }
    if (
      this.breadthFirstPolicy !== null &&
      this.visitorsEnabledFor(config, order)
    ) {
      visitorState.visitorCallbackIndexInPhaseChain = 0;
    }
    const state: ChainState<T, R> = {
      owner,
      ref,
      order,
      phase: 'running',
      group: 'concurrent',
      position: 0,
      waitingFor: 'none',
      commands: [],
      metadata,
      config,
    };
    this.chains.set(owner.runnerLocalOwnerId, {
      state,
      machine: new VisitorChain<T, R>({
        ref,
        records,
        metadata,
        family: this.options.kind === 'dag' ? 'dag' : 'tree',
        order,
      }),
    });
    return owner;
  }

  private admitExpansion(): boolean {
    const ref =
      this.scheduling.takeDiscoveryExpansion() ??
      this.scheduling.takeSeededExpansion() ??
      this.expansionQueue.shift();
    if (
      ref === undefined ||
      !this.options.container.liveResolvedGraphView.has(ref)
    ) {
      return ref !== undefined;
    }
    if (this.startedExpansions.has(ref)) return true;
    this.startedExpansions.add(ref);
    if (this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref)) {
      return true;
    }
    const owner = this.newOwner('vertexTraversalFrame');
    const hints = ref
      .getReferencedValue()
      .getMutableChildDiscoveryHints()
      .slice();
    const frame: FrameState<T, R> = {
      owner,
      ref,
      depth: this.options.container.store.getDiscoveryDepth(ref),
      stage: this.options.hasChildHintsListTransformer
        ? 'transformHints'
        : this.options.hasChildHintVertexIdResolver
        ? 'identify'
        : 'resolve',
      hints,
      nextIdentityIndex: 0,
      nextAdmissionIndex: 0,
      nextConsumeIndex: 0,
      hintIds: new Map(),
      knownIndices: new Set(),
      contexts: new Map(),
      pendingIndices: new Set(),
      identityOutcomes: new Map(),
      outcomes: new Map(),
      sortOutcome: null,
    };
    this.frames.set(owner.runnerLocalOwnerId, frame);
    if (!this.options.hasChildHintsListTransformer) {
      this.scheduling.prepareSlots(ref, hints);
    }
    return true;
  }

  private issue(input: CallInput<T, R>): CallAction<T, R> {
    const call = { ...input, requestId: this.nextRequestId++ } as CallSpec<
      T,
      R
    >;
    this.pendingRequests.set(call.requestId, { call, submitted: false });
    return { kind: 'CALL', call };
  }

  private retireKnownPrerequisiteRequests(): void {
    if (this.prerequisites === null) return;
    for (const { call, invoked } of this.pendingRequests.values()) {
      if (
        call.kind === 'RESOLVE_PREREQUISITE' &&
        !invoked &&
        this.isOwnerValid(call.owner) &&
        this.options.container.store.getIdState(call.vertexId) !== undefined
      ) {
        this.prerequisites!.settle(call.vertexId);
        this.invalidateOwner(call.owner);
      }
    }
  }

  private isDiscoveryComplete(): boolean {
    return (
      this.scheduling.isDiscoveryComplete() &&
      (this.prerequisites === null ||
        this.prerequisites.isComplete(
          this.scheduling.getUnknownPrerequisiteIds(),
        ))
    );
  }

  private isFinished(): boolean {
    if (!this.rootSettled) return false;
    return (
      this.options.container.liveResolvedGraphView.getRoot() === null ||
      (this.scheduling.getStall() === null &&
        this.scheduling.inspectEligible().length === 0 &&
        this.frames.size === 0 &&
        (this.depthFirstPolicy === null ||
          this.depthFirstPolicy.getFrames().length === 0) &&
        (this.breadthFirstPolicy === null ||
          this.breadthFirstPolicy.isIdle()) &&
        this.chains.size === 0 &&
        this.expansionQueue.length === 0 &&
        !this.hasValidPendingRequest() &&
        this.boundaries.length === 0)
    );
  }

  private fail(error: unknown): void {
    if (this.failure !== null) return;
    this.failure = { error };
    this.setStatus(TraversalRunnerStatus.FAILED);
    for (const pending of this.pendingRequests.values()) {
      this.invalidateOwner(pending.call.owner);
    }
    this.frames.clear();
    this.chains.clear();
    this.depthFirstPolicy?.clear();
    this.breadthFirstPolicy?.clear();
    this.depthFirstChainFrames.clear();
    this.readyCalls.length = 0;
  }

  private halt(
    reason: 'prepared' | 'paused' | 'awaitingSettlement' = 'paused',
  ): KernelAction<T, R> {
    this.haltReason = reason;
    this.setStatus(TraversalRunnerStatus.SUSPENDED);
    return { kind: 'SUSPENDED' };
  }

  private invalidateRemoved(except: SchedulingOwnerValidityToken): void {
    const removed = this.scheduling.takeRemovedRefs();
    if (removed.size > 0) this.invalidateRefs(removed, except);
  }

  private invalidateRefs(
    refs: ReadonlySet<InternalVertexRef<T | R>>,
    except: SchedulingOwnerValidityToken,
  ): void {
    for (const owner of this.prerequisites?.invalidateUnused((id) =>
      this.scheduling.hasPrerequisiteDemand(id),
    ) ?? []) {
      this.invalidateOwner(owner);
    }
    for (const [id, frame] of this.frames) {
      if (refs.has(frame.ref)) {
        this.invalidateOwner(frame.owner);
        this.frames.delete(id);
      }
    }
    for (const [id, runtime] of this.chains) {
      if (
        refs.has(runtime.state.ref) &&
        runtime.state.owner.runnerLocalOwnerId !== except.runnerLocalOwnerId
      ) {
        runtime.machine.invalidate();
        runtime.state.phase = 'invalid';
        this.invalidateOwner(runtime.state.owner);
        this.chains.delete(id);
        this.depthFirstChainFrames.delete(id);
      }
    }
    for (let index = this.boundaries.length - 1; index >= 0; index -= 1) {
      if (refs.has(this.boundaries[index]!.event.vertexHandle)) {
        this.boundaries.splice(index, 1);
      }
    }
  }

  private invalidateOwner(owner: SchedulingOwnerValidityToken): void {
    this.invalidOwners.add(this.ownerKey(owner));
  }

  private isOwnerValid(owner: SchedulingOwnerValidityToken): boolean {
    const key = `${owner.ownerKind}:${owner.runnerLocalOwnerId}`;
    return (
      this.ownerEpochs.get(key) === owner.validityGeneration &&
      !this.invalidOwners.has(this.ownerKey(owner)) &&
      (owner.ownerKind !== 'prerequisiteResolution' ||
        this.prerequisites!.isValid(owner, (id) =>
          this.scheduling.hasPrerequisiteDemand(id),
        ))
    );
  }

  private ownerKey(owner: SchedulingOwnerValidityToken): string {
    return `${owner.ownerKind}:${owner.runnerLocalOwnerId}:${owner.validityGeneration}`;
  }

  private newOwner(
    ownerKind: SchedulingOwnerValidityToken['ownerKind'],
  ): SchedulingOwnerValidityToken {
    const owner: SchedulingOwnerValidityToken = {
      ownerKind,
      runnerLocalOwnerId: this.nextOwnerId++,
      validityGeneration: 0,
    };
    this.ownerEpochs.set(
      `${owner.ownerKind}:${owner.runnerLocalOwnerId}`,
      owner.validityGeneration,
    );
    return owner;
  }

  private hasPendingFor(owner: SchedulingOwnerValidityToken): boolean {
    for (const pending of this.pendingRequests.values()) {
      if (pending.call.owner.runnerLocalOwnerId === owner.runnerLocalOwnerId)
        return true;
    }
    return false;
  }

  private hasRunningChain(): boolean {
    for (const runtime of this.chains.values()) {
      if (runtime.state.phase === 'running') return true;
    }
    return false;
  }

  private hasValidPendingRequest(): boolean {
    for (const pending of this.pendingRequests.values()) {
      if (this.isOwnerValid(pending.call.owner)) return true;
    }
    return false;
  }

  private takeReadyCall(mode: PumpMode): CallAction<T, R> | null {
    while (this.readyCalls.length > 0) {
      const action = this.readyCalls.shift()!;
      if (this.isRequestEligible(action.call.requestId, mode)) return action;
    }
    return null;
  }

  private visitorsEnabled(order: TreeOrDagVisitorPhase): boolean {
    return this.visitorsEnabledFor(this.executionConfig, order);
  }

  private visitorsEnabledFor(
    config: typeof this.executionConfig,
    order: TreeOrDagVisitorPhase,
  ): boolean {
    const selection = config.admittedVisitorCallbackPhases;
    return (
      selection === 'all' ||
      ('include' in selection
        ? selection.include!.includes(order)
        : !selection.exclude.includes(order))
    );
  }

  private inspectConfig(config: typeof this.executionConfig) {
    const { deliveredEventKinds, admittedVisitorCallbackPhases } =
      this.copyConfig(config);
    return { deliveredEventKinds, admittedVisitorCallbackPhases };
  }

  private copyConfig(config: typeof this.executionConfig) {
    return normalizeTraversalExecutionOptions(this.phases, undefined, config);
  }

  private setStatus(status: TraversalRunnerStatus): void {
    this.options.stateBridge.status = status;
  }

  private selectPolicy(kind: KernelOptions<T, R>['kind']): PolicyOrders {
    switch (kind) {
      case 'depth-first':
        return {
          initial: 'BEFORE_CHILD_EXPANSION',
          completion: 'AFTER_CHILD_SUBTREES',
        };
      case 'breadth-first':
        return { initial: 'AT_LEVEL_ORDER_VERTEX', completion: null };
      case 'dag':
        return {
          initial: 'ON_WORK_READY',
          completion: 'ON_SUBGRAPH_COMPLETION_READY',
        };
    }
  }

  private runTransition<V>(transition: () => V): V | null {
    try {
      return transition();
    } catch (error) {
      this.fail(error);
      return null;
    }
  }
}
