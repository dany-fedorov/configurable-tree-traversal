import {
  BreadthFirstPolicy,
  type BreadthFirstPolicyState,
} from '@breadth-first-traversal/lib/BreadthFirstPolicy';
import type { KernelInspection } from '@core/CoreInspection';
import type {
  CallbackReply,
  CallSpec,
  KernelAction,
  KernelEvent,
  KernelPort,
  Outcome,
  OwnerToken,
  PumpMode,
  VisitPhase,
} from '@core/effects/types';
import { engineDagValidationErrors } from '@core/errors/engineDagValidationErrors';
import { DagTraversalStallError } from '@core/errors/DagTraversalStallError';
import type {
  DagInspectionState,
  VertexId,
  VertexRef,
} from '@core/graph/types';
import type { ChainState, FrameState, KernelOptions } from '@core/kernelTypes';
import { GraphScheduling } from '@core/scheduling/GraphScheduling';
import { PrerequisiteResolution } from '@core/scheduling/PrerequisiteResolution';
import type { TraversalStopReason } from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { normalizeVisitorOptions } from '@core/visitors/normalizeVisitorOptions';
import { VisitorChain } from '@core/visitors/VisitorChain';
import {
  DepthFirstPolicy,
  type DepthFirstFrame,
} from '@depth-first-traversal/lib/DepthFirstPolicy';
import { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { deepFreeze } from '@utils/deepFreeze';
import { DagPolicy } from '../traversals/dag-traversal/lib/DagPolicy';
import type {
  DagDeferredWork,
  DagSettlementGeneration,
  DagSettlementOutcome,
  DagSummary,
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

type PendingRequest<T extends VertexTypes, R extends VertexTypes> = {
  call: CallSpec<T, R>;
  submitted: boolean;
  invoked?: boolean;
  storedReply?: CallbackReply<T, R>;
};

type ChainRuntime<T extends VertexTypes, R extends VertexTypes> = {
  state: ChainState<T, R>;
  machine: VisitorChain<T, R>;
};

type Boundary<T extends VertexTypes> = {
  id: number;
  event: KernelEvent<T>;
  expandAfter: boolean;
};

type CallAction<T extends VertexTypes, R extends VertexTypes> = Extract<
  KernelAction<T, R>,
  { kind: 'CALL' }
>;

type PolicyOrders = {
  initial: VisitPhase;
  completion: VisitPhase | null;
};

type CallInput<T extends VertexTypes, R extends VertexTypes> = CallSpec<
  T,
  R
> extends infer C
  ? C extends { requestId: number }
    ? Omit<C, 'requestId'>
    : never
  : never;

type FrameCall<T extends VertexTypes, R extends VertexTypes> = Extract<
  CallSpec<T, R>,
  { kind: 'SORT_HINTS' | 'HINT_ID' | 'MAKE_VERTEX' }
>;

export class TraversalKernel<T extends VertexTypes, R extends VertexTypes = T>
  implements KernelPort<T, R>
{
  private readonly prerequisites: PrerequisiteResolution | null;
  private readonly scheduling: GraphScheduling<T, R>;
  private readonly rootOwner: OwnerToken = { kind: 'root', id: 1, epoch: 0 };
  private readonly ownerEpochs = new Map<string, number>([['root:1', 0]]);
  private readonly invalidOwners = new Set<string>();
  private readonly pendingRequests = new Map<number, PendingRequest<T, R>>();
  private readonly submittedOutcomes: CallbackReply<T, R>[] = [];
  private readonly storedOutcomeRequests: PendingRequest<T, R>[] = [];
  private readonly readyCalls: CallAction<T, R>[] = [];
  private readonly frames = new Map<number, FrameState<T, R>>();
  private readonly chains = new Map<number, ChainRuntime<T, R>>();
  private readonly startedExpansions = new Set<VertexRef<T | R>>();
  private readonly deferred = new Map<
    VertexRef<T | R>,
    {
      state: ChainState<T, R>;
      generation: DagSettlementGeneration;
      outcome?: NormalizedDagSettlementOutcome;
    }
  >();
  private discoveryValidated = false;
  private preparing = false;
  private executionStarted = false;
  private readonly expansionQueue: VertexRef<T | R>[] = [];
  private readonly orders: PolicyOrders;
  private readonly depthFirstPolicy: DepthFirstPolicy<T | R> | null;
  private readonly breadthFirstPolicy: BreadthFirstPolicy<T | R> | null;
  private readonly depthFirstChainFrames = new Map<
    number,
    DepthFirstFrame<T | R>
  >();
  private breadthPendingContext:
    | import('@core/ResolvedTree').InternalVertexResolutionContext<T | R>
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

  private readonly phases: readonly VisitPhase[];
  private executionConfig: ResolvedTraversalExecutionOptions<VisitPhase>;

  constructor(private readonly options: KernelOptions<T, R>) {
    assertDagWorkCompletion(options.workCompletion);
    this.phases = getTraversalExecutionPhases(options.kind);
    this.executionConfig = normalizeTraversalExecutionOptions<VisitPhase>(
      this.phases,
      executionOptionsFromPhaseGates(options.iterableConfig),
    );
    this.scheduling = new GraphScheduling(
      options.container,
      options.completedWork,
      options.discovery === 'eager',
      options.rootWorkDependencies,
      options.omittedWorkDependencies,
    );
    this.prerequisites =
      options.hasPrerequisiteResolver === true
        ? new PrerequisiteResolution()
        : null;
    this.orders = this.selectPolicy(options.kind);
    this.depthFirstPolicy =
      options.kind === 'depth-first'
        ? new DepthFirstPolicy(options.inOrderConfig!, options.hasSorter)
        : null;
    this.breadthFirstPolicy =
      options.kind === 'breadth-first'
        ? new BreadthFirstPolicy(
            options.stateBridge as typeof options.stateBridge &
              BreadthFirstPolicyState<T | R>,
            options.hasSorter,
          )
        : null;
    const existingRoot = options.container.resolvedGraphView.getRoot();
    if (options.kind === 'dag' && options.dagSeed !== undefined) {
      const refs = options.container.resolvedGraphView.getVertexRefs();
      const traversalRoot = options.stateBridge.traversalRootVertexRef;
      if (
        (refs.length === 0 && traversalRoot !== null) ||
        (refs.length > 0 &&
          (existingRoot === null ||
            traversalRoot !== existingRoot ||
            !options.container.resolvedGraphView.has(existingRoot)))
      ) {
        throw new Error('Invalid injected DAG seed: traversal root mismatch');
      }
      if (
        refs.length === 0 &&
        (options.dagSeed.readyVisits.length > 0 ||
          options.dagSeed.expansionQueue.length > 0)
      ) {
        throw new Error(
          'Invalid injected DAG seed: work references an empty graph',
        );
      }
      this.scheduling.restoreDagSeed(options.dagSeed.readyVisits);
      const expansionRefs = new Set<VertexRef<T | R>>();
      for (const ref of options.dagSeed.expansionQueue) {
        if (
          expansionRefs.has(ref) ||
          !options.container.resolvedGraphView.has(ref) ||
          options.container.resolvedGraphView.getVisitStageOf(ref) !==
            'INITIAL_VISIT_COMMITTED' ||
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
          options.container.resolvedGraphView.getVisitStageOf(ref) ===
            'INITIAL_VISIT_COMMITTED' &&
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
      if (options.container.resolvedGraphView.has(existingRoot)) {
        this.scheduling.enrollExisting(existingRoot);
        if (this.depthFirstPolicy !== null) {
          this.scheduling.takeReady();
          this.depthFirstPolicy.push(
            this.newOwner('frame'),
            existingRoot,
            options.container.resolvedGraphView.get(existingRoot)!
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
        const existingRoot = this.options.container.resolvedGraphView.getRoot();
        if (
          (this.depthFirstPolicy !== null ||
            this.breadthFirstPolicy !== null) &&
          existingRoot !== null
        ) {
          this.rootSettled = true;
          this.options.stateBridge.traversalRootVertexRef = existingRoot;
          if (this.options.container.resolvedGraphView.has(existingRoot)) {
            this.scheduling.enrollExisting(existingRoot);
            if (this.depthFirstPolicy !== null) {
              this.scheduling.takeReady();
              this.depthFirstPolicy.push(
                this.newOwner('frame'),
                existingRoot,
                this.options.container.resolvedGraphView.get(existingRoot)!
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
          const owner = this.newOwner('prerequisite');
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
          if (this.hasDeferredWork() && this.summary().diagnostics === null)
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
        this.enqueueBreadthFirstExpansion(boundary.event.vertexRef);
      } else {
        this.expansionQueue.push(boundary.event.vertexRef);
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
    config?: TraversalIterableConfigInput<VisitPhase>,
    preparation = false,
  ): void {
    if (this.failure !== null) return;
    this.executionConfig = normalizeTraversalExecutionOptions<VisitPhase>(
      this.phases,
      config,
      this.executionConfig,
    );
    this.preparing = preparation;
    if (preparation) {
      this.options.discovery = 'eager';
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
        : TraversalRunnerStatus.INITIAL,
    );
  }

  shouldEmit(phase: VisitPhase): boolean {
    return this.executionConfig.iterateOver.includes(phase);
  }

  isRequestEligible(requestId: number, mode: PumpMode): boolean {
    const pending = this.pendingRequests.get(requestId);
    if (pending === undefined || pending.submitted) return false;
    if (!this.isOwnerValid(pending.call.owner)) return false;
    if (mode === 'drain' && pending.call.owner.kind !== 'chain') return false;
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

  getStatus(): TraversalRunnerStatus {
    return this.options.stateBridge.status;
  }

  getStopReason(): TraversalStopReason | null {
    switch (this.getStatus()) {
      case TraversalRunnerStatus.HALTED:
        return this.haltReason ?? 'paused';
      case TraversalRunnerStatus.FINISHED:
        return 'finished';
      case TraversalRunnerStatus.FAILED:
        return 'failed';
      default:
        return null;
    }
  }

  inspect(): KernelInspection {
    return deepFreeze({
      status: this.getStatus(),
      stopReason: this.getStopReason(),
      pauseRequested: this.pauseRequested,
      kind: this.options.kind,
      execution: this.options.execution,
      sourceMode: this.options.sourceMode,
      concurrency: this.options.concurrency,
      hasSorter: this.options.hasSorter,
      hasHintIds: this.options.hasHintIds,
      executionOptions: this.inspectConfig(this.executionConfig),
      readyVisits: this.scheduling.inspectEligible().map((visit) => ({
        vertexRefId: visit.ref.getRefId(),
        phase:
          visit.order === 'ON_WORK_READY'
            ? this.orders.initial
            : this.orders.completion ?? this.orders.initial,
      })),
      frames: [
        ...Array.from(this.frames.values(), (frame) => ({
          owner: { ...frame.owner },
          vertexRefId: frame.ref.getRefId(),
          stage: frame.stage,
          pendingIndices: Array.from(frame.pendingIndices),
        })),
        ...(this.depthFirstPolicy?.getFrames().map((frame) => ({
          owner: { ...frame.owner },
          vertexRefId: frame.vertexRef.getRefId(),
          stage: frame.stage,
          pendingIndices:
            frame.stage === 'child-wait' ? [frame.nextChild - 1] : [],
        })) ?? []),
        ...(this.breadthFirstPolicy?.getFrames().map((frame) => ({
          owner: { ...frame.owner },
          vertexRefId: frame.vertexRef.getRefId(),
          stage: frame.stage,
          pendingIndices: frame.pendingIndices.slice(),
        })) ?? []),
      ],
      chains: Array.from(this.chains.values(), ({ state }) => ({
        owner: { ...state.owner },
        vertexRefId: state.ref.getRefId(),
        phase: state.order,
        state: state.phase,
        commandCommitMode:
          state.group === 'concurrent' ? 'afterGroup' : 'afterEachVisitor',
        visitorIndex: state.position,
        waitingFor: state.waitingFor,
        executionOptions: this.inspectConfig(state.config),
      })),
      pendingRequests: Array.from(
        this.pendingRequests.values(),
        ({ call }) => ({
          requestId: call.requestId,
          operation: {
            MAKE_ROOT: 'resolveRoot' as const,
            MAKE_VERTEX: 'resolveChild' as const,
            RESOLVE_PREREQUISITE: 'resolvePrerequisite' as const,
            SORT_HINTS: 'sortChildrenHints' as const,
            HINT_ID: 'getVertexIdFromHint' as const,
            VISIT: 'visit' as const,
          }[call.kind],
          owner: { ...call.owner },
          valid: this.isOwnerValid(call.owner),
        }),
      ),
      pendingEventBoundaryCount: this.boundaries.length,
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

  summary(): DagSummary {
    const graph = this.options.container.resolvedGraphView;
    const work = this.scheduling
      .inspectWork()
      .filter(({ ref }) => ref !== this.options.container.syntheticRootRef);
    const inFlight = new Set(
      Array.from(this.chains.values(), ({ state }) => state.ref),
    );
    const vertices = new Map<VertexId, DagVertexProgress>();
    const readyOrDeferredIds: VertexId[] = [];
    const deferredWorkIds: VertexId[] = [];
    const awaitingSettlement: DagDeferredWork[] = [];
    const activeVisitorVertexIds: VertexId[] = [];
    const completedWorkIds: VertexId[] = [];
    const completedSubgraphIds: VertexId[] = [];
    let pending = 0;
    for (const item of work) {
      const id = graph.getVertexId(item.ref);
      const deferred = this.deferred.get(item.ref);
      const running = inFlight.has(item.ref);
      const state = item.initialCommitted
        ? 'completed'
        : running
        ? 'visiting'
        : deferred !== undefined
        ? 'deferred'
        : item.unmet.size === 0 && item.unmetComplete.size === 0
        ? 'ready'
        : 'pending';
      if (state === 'pending') pending += 1;
      if (state === 'ready' || state === 'deferred')
        readyOrDeferredIds.push(id);
      if (state === 'deferred') {
        deferredWorkIds.push(id);
        if (deferred!.outcome === undefined) {
          awaitingSettlement.push({
            vertexId: id,
            generation: deferred!.generation,
          });
        }
      }
      if (running) activeVisitorVertexIds.push(id);
      if (item.initialCommitted) completedWorkIds.push(id);
      if (item.completionCommitted) completedSubgraphIds.push(id);
      vertices.set(id, {
        vertexId: id,
        work: state,
        subgraphComplete: item.completionCommitted,
        unmetWorkPrerequisiteIds: Array.from(item.unmet),
        unmetPrerequisiteIds: Array.from(
          new Set([...item.unmet, ...item.unmetComplete]),
        ),
        unmetSubgraphPrerequisiteIds: Array.from(item.unmetComplete),
        ...(state === 'deferred' ? { generation: deferred!.generation } : {}),
      });
    }
    const complete = this.rootSettled && this.isDiscoveryComplete();
    const diagnostics = this.scheduling.diagnoseTopology(
      work.map(({ ref }) => ref),
    );
    // Original edges expose invalid topology even after seeded success; progress
    // fields describe only work still waiting on scheduler prerequisites.
    if (diagnostics !== null) {
      diagnostics.dependencies = work
        .filter(
          ({ initialCommitted, unmet, unmetComplete }) =>
            !initialCommitted && (unmet.size > 0 || unmetComplete.size > 0),
        )
        .map(({ ref, unmet, unmetComplete }) => ({
          id: graph.getVertexId(ref),
          unmet: Array.from(new Set([...unmet, ...unmetComplete])),
        }));
      diagnostics.dependencyBlockedIds =
        diagnostics.dependencyBlockedIds.filter(
          (id) => vertices.get(id)!.work === 'pending',
        );
    }
    return {
      discovery: { mode: this.options.discovery ?? 'lazy', complete },
      counts: {
        discovered: work.length,
        pending,
        readyOrDeferred: readyOrDeferredIds.length,
        deferredWork: deferredWorkIds.length,
        activeVisitorVertices: activeVisitorVertexIds.length,
        workCompleted: completedWorkIds.length,
        subgraphCompleted: completedSubgraphIds.length,
      },
      vertices,
      readyOrDeferredIds,
      deferredWorkIds,
      awaitingSettlement,
      activeVisitorVertexIds,
      completedWorkIds,
      completedSubgraphIds,
      unusedCompletedWorkIds: this.scheduling.getUnusedCompletedWorkIds(),
      diagnostics:
        diagnostics !== null &&
        (diagnostics.dependencyCycleComponents.length > 0 ||
          (complete && diagnostics.unknownPrerequisiteIds.length > 0))
          ? diagnostics
          : null,
    };
  }

  settle(
    id: VertexId,
    outcome: DagSettlementOutcome,
    expectedGeneration: DagSettlementGeneration,
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
        this.options.container.resolvedGraphView.has(state.ref),
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
        pending.call.owner.kind === 'frame' &&
        (this.depthFirstPolicy !== null || this.breadthFirstPolicy !== null)
      ) {
        this.pendingRequests.delete(reply.requestId);
        this.storeFrameOutcome(pending.call as FrameCall<T, R>, reply);
        continue;
      }
      if (this.pauseRequested && pending.call.owner.kind !== 'chain') {
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
      if (pending.call.owner.kind === 'chain') {
        const runtime = this.chains.get(pending.call.owner.id);
        if (runtime !== undefined && runtime.state.phase === 'running') {
          const action = this.runTransition(() =>
            this.advanceChain(pending.call.owner.id, runtime),
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
    const frame = this.frames.get(call.owner.id)!;
    switch (call.kind) {
      case 'SORT_HINTS':
        frame.sortOutcome = reply.outcome as Outcome<(T | R)['VertexHint'][]>;
        return;
      case 'HINT_ID': {
        const index = call.hintIndex;
        frame.pendingIndices.delete(index);
        frame.identityOutcomes.set(
          index,
          reply.outcome as Outcome<
            import('@core/graph/types').HintVertexId | undefined
          >,
        );
        return;
      }
      case 'MAKE_VERTEX':
        frame.pendingIndices.delete(call.context.hintIndex);
        frame.outcomes.set(
          call.context.hintIndex,
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
          this.depthFirstPolicy.push(this.newOwner('frame'), ref, 0);
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
        const runtime = this.chains.get(call.owner.id)!;
        runtime.machine.submit(
          reply.outcome as import('@core/visitors/types').VisitorOutcome<
            R,
            T['VertexHint']
          >,
        );
        runtime.state.waitingFor = 'none';
        runtime.state.position += 1;
        runtime.state.metadata.visitorIndex += 1;
        if (this.depthFirstPolicy !== null) {
          const visitorState =
            this.options.stateBridge.visitorsState[runtime.state.order];
          if (visitorState !== undefined) {
            visitorState.visitorIndex = runtime.state.metadata.visitorIndex;
          }
        }
        return;
      }
      case 'SORT_HINTS': {
        if (this.depthFirstPolicy !== null) {
          const frame = this.findDepthFirstFrame(call.owner.id);
          const hints = (
            reply.outcome as { ok: true; value: (T | R)['VertexHint'][] }
          ).value.slice();
          this.scheduling.prepareSlots(frame.vertexRef, hints);
          this.depthFirstPolicy.setHints(frame, hints);
          return;
        }
        if (this.breadthFirstPolicy !== null) {
          const hints = (
            reply.outcome as { ok: true; value: (T | R)['VertexHint'][] }
          ).value.slice();
          const frame = this.breadthFirstPolicy.getFrames()[0]!;
          this.scheduling.prepareSlots(frame.vertexRef, hints);
          const completed = this.breadthFirstPolicy.setSortedHints(
            call.owner,
            hints,
          );
          if (completed.empty) {
            this.scheduling.closeExpansion(completed.vertexRef);
          }
          return;
        }
        const frame = this.frames.get(call.owner.id)!;
        frame.hints = (
          reply.outcome as { ok: true; value: (T | R)['VertexHint'][] }
        ).value.slice();
        frame.stage = this.options.hasHintIds ? 'identify' : 'resolve';
        this.scheduling.prepareSlots(frame.ref, frame.hints);
        return;
      }
      case 'HINT_ID': {
        const frame = this.frames.get(call.owner.id)!;
        const index =
          this.options.kind === 'dag' && this.options.execution === 'async'
            ? call.hintIndex
            : frame.nextIdentityIndex;
        const value = (
          reply.outcome as {
            ok: true;
            value: import('@core/graph/types').HintVertexId | undefined;
          }
        ).value;
        if (value !== undefined) frame.hintIds.set(index, value);
        frame.pendingIndices.delete(index);
        frame.nextIdentityIndex += 1;
        return;
      }
      case 'MAKE_VERTEX': {
        if (this.depthFirstPolicy !== null) {
          const frame = this.findDepthFirstFrame(call.owner.id);
          const value = (
            reply.outcome as {
              ok: true;
              value: import('@core/TraversableTree').MakeVertexResult<T>;
            }
          ).value;
          const child = this.scheduling.acceptVertex(call.context, value);
          this.depthFirstPolicy.completeChild(
            frame,
            call.context.hintIndex,
            child !== null,
          );
          if (child !== null) {
            this.scheduling.takeReady();
            this.depthFirstPolicy.push(
              this.newOwner('frame'),
              child,
              call.context.depth,
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
            this.scheduling.closeExpansion(completed.context.parentVertexRef);
          }
          return;
        }
        const frame = this.frames.get(call.owner.id)!;
        const index =
          this.options.kind === 'dag' && this.options.execution === 'async'
            ? call.context.hintIndex
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
          ).commandCommitMode;
          runtime.state.group =
            style === 'afterGroup' ? 'concurrent' : 'sequential';
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
            this.options.workCompletion === 'externalSettlement' &&
            runtime.state.order === 'ON_WORK_READY' &&
            this.options.container.resolvedGraphView.has(runtime.state.ref)
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
    visitorChainState?: unknown;
  } {
    let halt = false;
    let deleted = false;
    let hasState = false;
    let chainState: unknown;
    for (const command of commands) {
      if (
        this.options.discovery === 'eager' &&
        (command.commandName ===
          TraversalVisitorCommandName.SKIP_REMAINING_CHILDREN ||
          command.commandName ===
            TraversalVisitorCommandName.REWRITE_CHILD_HINTS)
      ) {
        throw new TypeError(
          'Cannot change child topology after eager discovery',
        );
      }
      switch (command.commandName) {
        case TraversalVisitorCommandName.DEFER_WORK_COMPLETION:
          return { halt: false, deleted: false, deferred: true };
        case TraversalVisitorCommandName.NOOP:
          break;
        case TraversalVisitorCommandName.PAUSE_TRAVERSAL:
          halt = true;
          this.pauseRequested = true;
          break;
        case TraversalVisitorCommandName.DELETE_TREE_SUBTREE:
        case TraversalVisitorCommandName.DELETE_DAG_VERTEX_CASCADE: {
          const expected =
            this.options.kind === 'dag'
              ? TraversalVisitorCommandName.DELETE_DAG_VERTEX_CASCADE
              : TraversalVisitorCommandName.DELETE_TREE_SUBTREE;
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
        case TraversalVisitorCommandName.SKIP_REMAINING_CHILDREN:
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
              runtime.state.ref.getValue().getChildrenHints().slice(),
            );
          }
          if (
            this.depthFirstPolicy === null &&
            this.breadthFirstPolicy === null
          ) {
            this.scheduling.disableSubtree(runtime.state.ref);
          } else if (
            this.depthFirstPolicy !== null &&
            runtime.state.order !== DepthFirstPhase.PRE_ORDER
          ) {
            this.scheduling.disableSubtree(runtime.state.ref);
          }
          break;
        case TraversalVisitorCommandName.SET_VISITOR_CHAIN_STATE:
          if (
            command.commandArguments === null ||
            typeof command.commandArguments !== 'object' ||
            !Object.prototype.hasOwnProperty.call(
              command.commandArguments,
              'state',
            ) ||
            Reflect.ownKeys(command.commandArguments).some(
              (key) => key !== 'state',
            )
          ) {
            throw new TypeError(
              'SET_VISITOR_CHAIN_STATE requires only an own state field',
            );
          }
          hasState = true;
          chainState = command.commandArguments.state;
          break;
        case TraversalVisitorCommandName.REWRITE_VERTEX_DATA:
          runtime.state.ref.setValue(
            runtime.state.ref.getValue().clone({
              $data: command.commandArguments.newData,
            }),
          );
          break;
        case TraversalVisitorCommandName.REWRITE_CHILD_HINTS:
          if (
            (this.depthFirstPolicy !== null &&
              runtime.state.order !== DepthFirstPhase.PRE_ORDER) ||
            (this.options.kind === 'dag' &&
              runtime.state.order !== 'ON_WORK_READY')
          ) {
            throw new Error(
              this.options.kind === 'dag'
                ? 'Child hints can only be rewritten during ON_WORK_READY'
                : 'Child hints can only be rewritten during pre-order',
            );
          }
          runtime.state.ref.setValue(
            runtime.state.ref.getValue().clone({
              $childHints: command.commandArguments.newHints.slice(),
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
      ...(hasState ? { visitorChainState: chainState } : {}),
    };
  }

  private commitChain(state: ChainState<T, R>): void {
    const depthFirstFrame = this.depthFirstChainFrames.get(state.owner.id);
    this.depthFirstChainFrames.delete(state.owner.id);
    const visitorState = this.options.stateBridge.visitorsState[state.order];
    if (
      this.depthFirstPolicy !== null &&
      visitorState !== undefined &&
      this.visitorsEnabledFor(state.config, state.order)
    ) {
      visitorState.visitorIndex = state.metadata.visitorIndex;
      visitorState.phaseVisitIndex += 1;
      visitorState.previousPhaseVertexRef = state.ref;
    }
    if (
      this.breadthFirstPolicy !== null &&
      visitorState !== undefined &&
      this.visitorsEnabledFor(state.config, state.order)
    ) {
      visitorState.visitorIndex = state.metadata.visitorIndex;
      visitorState.phaseVisitIndex += 1;
      visitorState.previousPhaseVertexRef = state.ref;
    }
    if (!this.options.container.resolvedGraphView.has(state.ref)) return;
    const initial = state.order === this.orders.initial;
    if (state.order === DepthFirstPhase.IN_ORDER) {
      this.depthFirstPolicy!.completeVisit(
        depthFirstFrame!,
        DepthFirstPhase.IN_ORDER,
      );
    } else if (initial) {
      this.scheduling.markPreVisited(state.ref);
      if (depthFirstFrame !== undefined && this.depthFirstPolicy !== null) {
        this.depthFirstPolicy.completeVisit(
          depthFirstFrame,
          DepthFirstPhase.PRE_ORDER,
        );
      }
    } else {
      this.scheduling.markComplete(state.ref);
      if (depthFirstFrame !== undefined && this.depthFirstPolicy !== null) {
        this.depthFirstPolicy.completeVisit(
          depthFirstFrame,
          DepthFirstPhase.POST_ORDER,
        );
      }
    }
    if (
      visitorState !== undefined &&
      this.depthFirstPolicy === null &&
      this.breadthFirstPolicy === null
    ) {
      visitorState.visitorIndex = state.metadata.visitorIndex;
      visitorState.previousPhaseVertexRef = state.ref;
    }
    // Record each committed observation independently of the admitted callback
    // policy. A later iterator lease selects it only when delivering it.
    this.boundaries.push({
      id: this.nextBoundaryId++,
      event: {
        vertex: state.ref.getValue(),
        vertexRef: state.ref,
        order: state.order,
        isRoot:
          state.ref === this.options.container.resolvedGraphView.getRoot(),
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
        const transportFrame = this.frames.get(frame.owner.id);
        if (transportFrame !== undefined) {
          const transportAction = this.advanceAsyncFrame(transportFrame);
          if (transportAction !== null) return transportAction;
          if (mode !== 'drive') return null;
          if (frame.stage === 'child-wait') {
            const index = frame.nextChild - 1;
            const context = transportFrame.contexts.get(index)!;
            let child: VertexRef<T | R> | null;
            let resolved: boolean;
            if (transportFrame.knownIndices.has(index)) {
              this.scheduling.acceptKnownHint(
                context,
                transportFrame.hintIds.get(index)!,
              );
              const slot = this.options.container.store.getTraversalSlots(
                context.parentVertexRef,
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
              policy.push(this.newOwner('frame'), child, context.depth);
            }
            return 'PROGRESSED';
          }
        }
      }
    }
    if (mode !== 'drive') return null;
    const work = policy.next(
      (ref) => this.options.container.resolvedGraphView.has(ref),
      (ref) => this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref),
    );
    if (work === null) return null;
    switch (work.kind) {
      case 'VISIT': {
        const owner = this.admitChain(work.frame.vertexRef, work.order);
        this.depthFirstChainFrames.set(owner.id, work.frame);
        return 'PROGRESSED';
      }
      case 'PREPARE_HINTS':
        if (this.options.execution === 'async') {
          const frame = this.makeAsyncFrame(
            work.frame.owner,
            work.frame.vertexRef,
            work.frame.depth,
            work.hints,
            'resolve',
          );
          this.prepareAsyncFrame(frame, work.hints);
        } else {
          this.scheduling.prepareSlots(work.frame.vertexRef, work.hints);
        }
        policy.setHints(work.frame, work.hints);
        return 'PROGRESSED';
      case 'SORT_HINTS':
        if (this.options.execution === 'async') {
          this.makeAsyncFrame(
            work.frame.owner,
            work.frame.vertexRef,
            work.frame.depth,
            work.hints,
            'sort',
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
        const context = {
          parentVertexRef: work.frame.vertexRef,
          parentVertex: work.frame.vertexRef.getValue(),
          depth: work.frame.depth + 1,
          hintIndex: work.index,
          vertexHint: work.frame.hints[work.index]!,
        };
        return this.issue({
          kind: 'MAKE_VERTEX',
          owner: work.frame.owner,
          context,
        });
      }
      case 'CLOSE':
        this.scheduling.closeExpansion(work.frame.vertexRef);
        this.frames.delete(work.frame.owner.id);
        this.scheduling.takeCompleting();
        return 'PROGRESSED';
      case 'POP':
        return 'PROGRESSED';
    }
  }

  private findDepthFirstFrame(ownerId: number): DepthFirstFrame<T | R> {
    return this.depthFirstPolicy!.getFrames().find(
      (candidate) => candidate.owner.id === ownerId,
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
          (candidate) => candidate.ref === context.parentVertexRef,
        )!;
        const outcome = frame.outcomes.get(context.hintIndex);
        if (outcome === undefined) return null;
        frame.outcomes.delete(context.hintIndex);
        if (!outcome.ok) throw outcome.error;
        const completed = policy.completeResolution(frame.owner);
        this.breadthPendingContext = null;
        this.scheduling.acceptVertex(
          frame.contexts.get(context.hintIndex)!,
          outcome.value,
          frame.hintIds.get(context.hintIndex),
        );
        frame.nextConsumeIndex += 1;
        if (frame.nextConsumeIndex === frame.hints.length) {
          this.frames.delete(frame.owner.id);
        }
        if (completed.closeParent) {
          this.scheduling.closeExpansion(completed.context.parentVertexRef);
        }
        return 'PROGRESSED';
      }
    }
    const eligible = this.scheduling.takeEligible();
    if (eligible !== null) {
      if (eligible.order === 'ON_SUBGRAPH_READY') {
        this.scheduling.markComplete(eligible.ref);
      } else {
        this.admitChain(eligible.ref, this.orders.initial);
      }
      return 'PROGRESSED';
    }
    const work = policy.next(
      (ref) => this.options.container.resolvedGraphView.has(ref),
      (ref) => this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref),
    );
    if (work === null) return null;
    switch (work.kind) {
      case 'PREPARE_HINTS':
        if (this.options.execution === 'async') {
          const frame = this.makeAsyncFrame(
            work.expansion.owner,
            work.expansion.vertexRef,
            work.expansion.depth,
            work.hints,
            'resolve',
          );
          this.prepareAsyncFrame(frame, work.hints);
        }
        if (this.options.execution !== 'async') {
          this.scheduling.prepareSlots(work.expansion.vertexRef, work.hints);
        }
        if (policy.setHints(work.expansion, work.hints)) {
          this.scheduling.closeExpansion(work.expansion.vertexRef);
          if (this.options.execution === 'async') {
            this.frames.delete(work.expansion.owner.id);
          }
        }
        return 'PROGRESSED';
      case 'SORT_HINTS':
        if (this.options.execution === 'async') {
          this.makeAsyncFrame(
            work.expansion.owner,
            work.expansion.vertexRef,
            work.expansion.depth,
            work.hints,
            'sort',
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
            (candidate) => candidate.ref === work.context.parentVertexRef,
          )!;
          policy.startResolution(frame.owner, work.context);
          this.breadthPendingContext = work.context;
          return this.advanceBreadthFirst(mode);
        }
        const owner = this.newOwner('frame');
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

  private enqueueBreadthFirstExpansion(ref: VertexRef<T | R>): void {
    const vertex = this.options.container.resolvedGraphView.get(ref);
    if (vertex !== null) {
      const policy = this.breadthFirstPolicy!;
      if (!this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref)) {
        const frontier = policy.takeInjectedFrontier(ref);
        if (frontier !== null) {
          const contexts = frontier.contexts
            .slice()
            .sort((left, right) => left.hintIndex - right.hintIndex);
          if (contexts.some((context, index) => context.hintIndex !== index)) {
            throw new Error('Invalid injected breadth-first frontier');
          }
          this.scheduling.prepareSlots(
            ref,
            contexts.map((context) => context.vertexHint),
          );
          for (const context of contexts) {
            if (frontier.consumedHintIndices.has(context.hintIndex)) {
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
        this.newOwner('frame'),
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
    if (frame.stage === 'sort') {
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
        const context = {
          depth: this.options.container.store.getDiscoveryDepth(frame.ref) + 1,
          parentVertex: frame.ref.getValue(),
          parentVertexRef: frame.ref,
          hintIndex: index,
          vertexHint: frame.hints[index]!,
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
      this.frames.delete(frame.owner.id);
      return null;
    }
    return null;
  }

  private advanceDagFrame(frame: FrameState<T, R>): CallAction<T, R> | null {
    if (frame.stage === 'sort') {
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
        const context = {
          depth: this.options.container.store.getDiscoveryDepth(frame.ref) + 1,
          parentVertex: frame.ref.getValue(),
          parentVertexRef: frame.ref,
          hintIndex: index,
          vertexHint: frame.hints[index]!,
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
      this.frames.delete(frame.owner.id);
    }
    return null;
  }

  private makeAsyncFrame(
    owner: OwnerToken,
    ref: VertexRef<T | R>,
    depth: number,
    hints: (T | R)['VertexHint'][],
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
    this.frames.set(owner.id, frame);
    return frame;
  }

  private prepareAsyncFrame(
    frame: FrameState<T, R>,
    hints: (T | R)['VertexHint'][],
  ): void {
    frame.hints = hints.slice();
    frame.stage = this.options.hasHintIds ? 'identify' : 'resolve';
    frame.nextIdentityIndex = 0;
    frame.nextAdmissionIndex = 0;
    frame.nextConsumeIndex = 0;
    const parentVertex = frame.ref.getValue();
    for (let index = 0; index < frame.hints.length; index += 1) {
      frame.contexts.set(index, {
        depth: frame.depth + 1,
        parentVertex,
        parentVertexRef: frame.ref,
        hintIndex: index,
        vertexHint: frame.hints[index]!,
      });
    }
    this.scheduling.prepareSlots(frame.ref, frame.hints);
  }

  private advanceAsyncFrame(frame: FrameState<T, R>): CallAction<T, R> | null {
    if (frame.stage === 'sort') {
      const outcome = frame.sortOutcome;
      if (outcome === null) return null;
      frame.sortOutcome = null;
      if (!outcome.ok) throw outcome.error;
      this.prepareAsyncFrame(frame, outcome.value);
      this.depthFirstPolicy?.setHints(
        this.findDepthFirstFrame(frame.owner.id),
        outcome.value,
      );
      if (this.breadthFirstPolicy !== null) {
        const completed = this.breadthFirstPolicy.setSortedHints(
          frame.owner,
          outcome.value,
        );
        if (completed.empty) {
          this.scheduling.closeExpansion(completed.vertexRef);
          this.frames.delete(frame.owner.id);
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
      (this.options.discovery === 'eager' ||
        this.options.completedWork !== undefined ||
        this.scheduling.usesCompletionDependencies() ||
        this.prerequisites !== null)
    ) {
      if (this.rootSettled && this.isDiscoveryComplete()) {
        this.scheduling.validateDiscoveredGraph();
        this.discoveryValidated = true;
      } else if (this.options.discovery === 'eager') {
        return false;
      }
    }
    if (this.preparing) return false;
    if (
      this.options.kind === 'dag' &&
      this.options.execution === 'async' &&
      !DagPolicy.allowsChainAdmission(
        this.chains.size,
        this.options.concurrency,
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

  private admitChain(ref: VertexRef<T | R>, order: VisitPhase): OwnerToken {
    const owner = this.newOwner('chain');
    const config = this.copyConfig(this.executionConfig);
    const records = this.visitorsEnabled(order)
      ? (this.options.visitorMetadata[order] ?? []).slice()
      : [];
    const visitorState = (this.options.stateBridge.visitorsState[order] ??= {
      phaseVisitIndex: 0,
      visitorIndex: 0,
      previousPhaseVertexRef: null,
    });
    const metadata = {
      phaseVisitIndex: visitorState.phaseVisitIndex,
      visitorIndex: 0,
      previousPhaseVertexRef: visitorState.previousPhaseVertexRef,
      visitorChainState: null,
    };
    if (
      records.length > 0 &&
      this.depthFirstPolicy === null &&
      this.breadthFirstPolicy === null
    ) {
      visitorState.phaseVisitIndex += 1;
    }
    if (
      this.depthFirstPolicy !== null &&
      this.visitorsEnabledFor(config, order)
    ) {
      visitorState.visitorIndex = 0;
    }
    if (
      this.breadthFirstPolicy !== null &&
      this.visitorsEnabledFor(config, order)
    ) {
      visitorState.visitorIndex = 0;
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
    this.chains.set(owner.id, {
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
      !this.options.container.resolvedGraphView.has(ref)
    ) {
      return ref !== undefined;
    }
    if (this.startedExpansions.has(ref)) return true;
    this.startedExpansions.add(ref);
    if (this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref)) {
      return true;
    }
    const owner = this.newOwner('frame');
    const hints = ref.getValue().getChildrenHints().slice();
    const frame: FrameState<T, R> = {
      owner,
      ref,
      depth: this.options.container.store.getDiscoveryDepth(ref),
      stage: this.options.hasSorter
        ? 'sort'
        : this.options.hasHintIds
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
    this.frames.set(owner.id, frame);
    if (!this.options.hasSorter) {
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
      this.options.container.resolvedGraphView.getRoot() === null ||
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
    this.setStatus(TraversalRunnerStatus.HALTED);
    return { kind: 'HALTED' };
  }

  private invalidateRemoved(except: OwnerToken): void {
    const removed = this.scheduling.takeRemovedRefs();
    if (removed.size > 0) this.invalidateRefs(removed, except);
  }

  private invalidateRefs(
    refs: ReadonlySet<VertexRef<T | R>>,
    except: OwnerToken,
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
      if (refs.has(runtime.state.ref) && runtime.state.owner.id !== except.id) {
        runtime.machine.invalidate();
        runtime.state.phase = 'invalid';
        this.invalidateOwner(runtime.state.owner);
        this.chains.delete(id);
        this.depthFirstChainFrames.delete(id);
      }
    }
    for (let index = this.boundaries.length - 1; index >= 0; index -= 1) {
      if (refs.has(this.boundaries[index]!.event.vertexRef)) {
        this.boundaries.splice(index, 1);
      }
    }
  }

  private invalidateOwner(owner: OwnerToken): void {
    this.invalidOwners.add(this.ownerKey(owner));
  }

  private isOwnerValid(owner: OwnerToken): boolean {
    const key = `${owner.kind}:${owner.id}`;
    return (
      this.ownerEpochs.get(key) === owner.epoch &&
      !this.invalidOwners.has(this.ownerKey(owner)) &&
      (owner.kind !== 'prerequisite' ||
        this.prerequisites!.isValid(owner, (id) =>
          this.scheduling.hasPrerequisiteDemand(id),
        ))
    );
  }

  private ownerKey(owner: OwnerToken): string {
    return `${owner.kind}:${owner.id}:${owner.epoch}`;
  }

  private newOwner(kind: OwnerToken['kind']): OwnerToken {
    const owner = { kind, id: this.nextOwnerId++, epoch: 0 };
    this.ownerEpochs.set(`${owner.kind}:${owner.id}`, owner.epoch);
    return owner;
  }

  private hasPendingFor(owner: OwnerToken): boolean {
    for (const pending of this.pendingRequests.values()) {
      if (pending.call.owner.id === owner.id) return true;
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

  private visitorsEnabled(order: VisitPhase): boolean {
    return this.visitorsEnabledFor(this.executionConfig, order);
  }

  private visitorsEnabledFor(
    config: typeof this.executionConfig,
    order: VisitPhase,
  ): boolean {
    const selection = config.visitorPhases;
    return (
      selection === 'all' ||
      ('include' in selection
        ? selection.include!.includes(order)
        : !selection.exclude.includes(order))
    );
  }

  private inspectConfig(config: typeof this.executionConfig) {
    const { emitEvents, visitorPhases } = this.copyConfig(config);
    return { emitEvents, visitorPhases };
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
        return { initial: 'PRE_ORDER', completion: 'POST_ORDER' };
      case 'breadth-first':
        return { initial: 'LEVEL_ORDER', completion: null };
      case 'dag':
        return { initial: 'ON_WORK_READY', completion: 'ON_SUBGRAPH_READY' };
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
