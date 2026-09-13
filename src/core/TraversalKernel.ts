import type { KernelInspection } from '@core/CoreInspection';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
import type {
  CallbackReply,
  CallSpec,
  KernelAction,
  KernelEvent,
  KernelPort,
  Outcome,
  OwnerToken,
  PumpMode,
  VisitOrder,
} from '@core/effects/types';
import type { Ref } from '@core/graph/types';
import type {
  ChainState,
  FrameState,
  KernelOptions,
} from '@core/kernelTypes';
import { GraphScheduling } from '@core/scheduling/GraphScheduling';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { VisitorChain } from '@core/visitors/VisitorChain';
import { deepFreeze } from '@utils/deepFreeze';
import {
  DepthFirstPolicy,
  type DepthFirstFrame,
} from '@depth-first-traversal/lib/DepthFirstPolicy';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import {
  BreadthFirstPolicy,
  type BreadthFirstPolicyState,
} from '@breadth-first-traversal/lib/BreadthFirstPolicy';

type PendingRequest<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  call: CallSpec<T, R>;
  submitted: boolean;
};

type ChainRuntime<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  state: ChainState<T, R>;
  machine: VisitorChain<T, R>;
};

type Boundary<T extends TreeTypeParameters> = {
  id: number;
  event: KernelEvent<T>;
  expandAfter: boolean;
};

type CallAction<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = Extract<KernelAction<T, R>, { kind: 'CALL' }>;

type PolicyOrders = {
  initial: VisitOrder;
  completion: VisitOrder | null;
};

type CallInput<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = CallSpec<T, R> extends infer C
  ? C extends { requestId: number }
    ? Omit<C, 'requestId'>
    : never
  : never;

export class TraversalKernel<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> implements KernelPort<T, R>
{
  private readonly scheduling: GraphScheduling<T, R>;
  private readonly rootOwner: OwnerToken = { kind: 'root', id: 1, epoch: 0 };
  private readonly ownerEpochs = new Map<string, number>([['root:1', 0]]);
  private readonly invalidOwners = new Set<string>();
  private readonly pendingRequests = new Map<
    number,
    PendingRequest<T, R>
  >();
  private readonly submittedOutcomes: CallbackReply<T, R>[] = [];
  private readonly readyCalls: CallAction<T, R>[] = [];
  private readonly frames = new Map<number, FrameState<T, R>>();
  private readonly chains = new Map<number, ChainRuntime<T, R>>();
  private readonly expansionQueue: Ref<T | R>[] = [];
  private readonly orders: PolicyOrders;
  private readonly depthFirstPolicy: DepthFirstPolicy<T | R> | null;
  private readonly breadthFirstPolicy: BreadthFirstPolicy<T | R> | null;
  private readonly depthFirstChainFrames = new Map<
    number,
    DepthFirstFrame<T | R>
  >();
  private nextRequestId = 1;
  private nextOwnerId = 2;
  private nextBoundaryId = 1;
  private rootRequested = false;
  private rootSettled = false;
  private haltRequested = false;
  private failure: { error: unknown } | null = null;
  private readonly boundaries: Boundary<T | R>[] = [];

  constructor(private readonly options: KernelOptions<T, R>) {
    this.scheduling = new GraphScheduling(options.container);
    this.orders = this.selectPolicy(options.kind);
    this.depthFirstPolicy =
      options.kind === 'depth-first'
        ? new DepthFirstPolicy(
            options.inOrderConfig!,
            options.hasSorter,
          )
        : null;
    this.breadthFirstPolicy =
      options.kind === 'breadth-first'
        ? new BreadthFirstPolicy(
            options.stateBridge as typeof options.stateBridge &
              BreadthFirstPolicyState<T | R>,
            options.hasSorter,
          )
        : null;
    const existingRoot = options.container.resolvedGraph.getRoot();
    if (
      (this.depthFirstPolicy !== null || this.breadthFirstPolicy !== null) &&
      existingRoot !== null
    ) {
      this.rootRequested = true;
      this.rootSettled = true;
      options.stateBridge.traversalRootVertexRef = existingRoot;
      if (options.container.resolvedGraph.has(existingRoot)) {
        this.scheduling.enrollExisting(existingRoot);
        if (this.depthFirstPolicy !== null) {
          this.scheduling.takeReady();
          this.depthFirstPolicy.push(
            this.newOwner('frame'),
            existingRoot,
            options.container.resolvedGraph.get(existingRoot)?.discoveryDepth ??
              0,
          );
        }
      }
    }
  }

  poll(mode: PumpMode): KernelAction<T, R> {
    this.processSubmittedOutcomes();
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
      if (this.haltRequested) {
        return this.hasRunningChain() ? { kind: 'WAIT' } : this.halt();
      }

      const frameAction = this.runTransition(() => this.advanceFrames());
      if (frameAction !== null) return frameAction;
      const frameFailure = this.failure as { error: unknown } | null;
      if (frameFailure !== null) {
        return { kind: 'FAILED', error: frameFailure.error };
      }

      const depthFirstAction = this.runTransition(() =>
        this.advanceDepthFirst(),
      );
      if (depthFirstAction === 'PROGRESSED') continue;
      if (depthFirstAction !== null) return depthFirstAction;
      const depthFirstFailure = this.failure as { error: unknown } | null;
      if (depthFirstFailure !== null) {
        return { kind: 'FAILED', error: depthFirstFailure.error };
      }

      const breadthFirstAction = this.runTransition(() =>
        this.advanceBreadthFirst(),
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
        const existingRoot = this.options.container.resolvedGraph.getRoot();
        if (
          (this.depthFirstPolicy !== null || this.breadthFirstPolicy !== null) &&
          existingRoot !== null
        ) {
          this.rootSettled = true;
          this.options.stateBridge.traversalRootVertexRef = existingRoot;
          if (this.options.container.resolvedGraph.has(existingRoot)) {
            this.scheduling.enrollExisting(existingRoot);
            if (this.depthFirstPolicy !== null) {
              this.scheduling.takeReady();
              this.depthFirstPolicy.push(
                this.newOwner('frame'),
                existingRoot,
                this.options.container.resolvedGraph.get(existingRoot)
                  ?.discoveryDepth ?? 0,
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
          const ids = stall.dependencies.flatMap(({ id, missing }) => [
            id,
            ...missing,
          ]);
          const detail =
            ids.length > 0 ? ids.map(String).join(', ') : 'incomplete work';
          const error = new Error(`DAG traversal stalled: ${detail}`);
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
      throw new Error(`Callback request ${reply.requestId} was already submitted`);
    }
    pending.submitted = true;
    this.submittedOutcomes.push(reply);
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
      this.haltRequested = true;
    }
  }

  resume(
    config?: Partial<
      import('@core/TraversalRunnerIterableConfig').TraversalRunnerIterableConfig<VisitOrder>
    >,
  ): void {
    if (this.failure !== null) return;
    if (config !== undefined) {
      this.options.iterableConfig = {
        ...this.options.iterableConfig,
        ...config,
        iterateOver:
          config.iterateOver?.slice() ??
          this.options.iterableConfig.iterateOver.slice(),
        enableVisitorFunctionsFor:
          config.enableVisitorFunctionsFor === undefined
            ? this.options.iterableConfig.enableVisitorFunctionsFor?.slice() ??
              null
            : config.enableVisitorFunctionsFor?.slice() ?? null,
        disableVisitorFunctionsFor:
          config.disableVisitorFunctionsFor === undefined
            ? this.options.iterableConfig.disableVisitorFunctionsFor?.slice() ??
              null
            : config.disableVisitorFunctionsFor?.slice() ?? null,
      };
    }
    this.haltRequested = false;
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

  isRequestEligible(requestId: number, mode: PumpMode): boolean {
    const pending = this.pendingRequests.get(requestId);
    if (pending === undefined || pending.submitted) return false;
    if (!this.isOwnerValid(pending.call.owner)) return false;
    return mode !== 'drain' || pending.call.owner.kind === 'chain';
  }

  isHaltRequested(): boolean {
    return this.haltRequested;
  }

  getFailure(): { error: unknown } | null {
    return this.failure;
  }

  getStatus(): TraversalRunnerStatus {
    return this.options.stateBridge.status;
  }

  inspect(): KernelInspection {
    const copyFilters = (config: typeof this.options.iterableConfig) => ({
      iterateOver: config.iterateOver.slice(),
      enableVisitorFunctionsFor:
        config.enableVisitorFunctionsFor?.slice() ?? null,
      disableVisitorFunctionsFor:
        config.disableVisitorFunctionsFor?.slice() ?? null,
    });
    return deepFreeze({
      status: this.getStatus(),
      haltRequested: this.haltRequested,
      kind: this.options.kind,
      execution: this.options.execution,
      sourceMode: this.options.sourceMode,
      concurrency: this.options.concurrency,
      hasSorter: this.options.hasSorter,
      hasHintIds: this.options.hasHintIds,
      iterableConfig: copyFilters(this.options.iterableConfig),
      readyVisits: this.scheduling.inspectEligible().map((visit) => ({
        vertexRefId: visit.ref.getId(),
        order:
          visit.order === 'ON_READY'
            ? this.orders.initial
            : this.orders.completion ?? this.orders.initial,
      })),
      frames: [
        ...Array.from(this.frames.values(), (frame) => ({
          owner: { ...frame.owner },
          vertexRefId: frame.ref.getId(),
          stage: frame.stage,
          pendingIndices: Array.from(frame.pendingIndices),
        })),
        ...(this.depthFirstPolicy?.getFrames().map((frame) => ({
          owner: { ...frame.owner },
          vertexRefId: frame.vertexRef.getId(),
          stage: frame.stage,
          pendingIndices:
            frame.stage === 'child-wait' ? [frame.nextChild - 1] : [],
          })) ?? []),
        ...(this.breadthFirstPolicy?.getFrames().map((frame) => ({
          owner: { ...frame.owner },
          vertexRefId: frame.vertexRef.getId(),
          stage: frame.stage,
          pendingIndices: frame.pendingIndices.slice(),
        })) ?? []),
      ],
      chains: Array.from(this.chains.values(), ({ state }) => ({
        owner: { ...state.owner },
        vertexRefId: state.ref.getId(),
        order: state.order,
        phase: state.phase,
        group: state.group,
        position: state.position,
        waitingFor: state.waitingFor,
        config: copyFilters(state.config),
      })),
      pendingRequests: Array.from(this.pendingRequests.values(), ({ call }) => ({
        requestId: call.requestId,
        kind: call.kind,
        owner: { ...call.owner },
        valid: this.isOwnerValid(call.owner),
      })),
      pendingEventBoundaryCount: this.boundaries.length,
    });
  }

  private processSubmittedOutcomes(): void {
    while (this.submittedOutcomes.length > 0) {
      const reply = this.submittedOutcomes.shift()!;
      const pending = this.pendingRequests.get(reply.requestId);
      if (pending === undefined) continue;
      this.pendingRequests.delete(reply.requestId);
      if (!this.isOwnerValid(pending.call.owner)) continue;
      try {
        this.applyOutcome(pending.call, reply);
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
      if (!this.haltRequested && this.boundaries.length > 0) {
        return;
      }
    }
  }

  private applyOutcome(
    call: CallSpec<T, R>,
    reply: CallbackReply<T, R>,
  ): void {
    if (!reply.outcome.ok) throw reply.outcome.error;
    switch (call.kind) {
      case 'MAKE_ROOT': {
        const outcome = reply.outcome as Outcome<
          import('@core/TraversableTree').MakeVertexResult<T>
        >;
        if (!outcome.ok) throw outcome.error;
        const ref = this.scheduling.acceptRoot(outcome.value);
        this.rootSettled = true;
        this.options.stateBridge.traversalRootVertexRef = ref;
        if (this.depthFirstPolicy !== null && ref !== null) {
          this.scheduling.takeReady();
          this.depthFirstPolicy.push(this.newOwner('frame'), ref, 0);
        }
        return;
      }
      case 'VISIT': {
        const runtime = this.chains.get(call.owner.id);
        if (runtime === undefined) return;
        runtime.machine.submit(
          reply.outcome as Outcome<import('@core/graph/types').VisitResult<R>>,
        );
        runtime.state.waitingFor = 'none';
        runtime.state.position += 1;
        runtime.state.metadata.curVertexVisitorVisitIndex += 1;
        if (this.depthFirstPolicy !== null) {
          const visitorState =
            this.options.stateBridge.visitorsState[runtime.state.order];
          if (visitorState !== undefined) {
            visitorState.curVertexVisitorVisitIndex =
              runtime.state.metadata.curVertexVisitorVisitIndex;
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
          const frame = this.breadthFirstPolicy.getFrames()[0];
          if (frame?.owner.id !== call.owner.id) {
            throw new Error('Unknown breadth-first expansion owner');
          }
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
        const frame = this.frames.get(call.owner.id);
        if (frame === undefined) return;
        frame.hints = (
          reply.outcome as { ok: true; value: (T | R)['VertexHint'][] }
        ).value.slice();
        frame.stage = this.options.hasHintIds ? 'identify' : 'resolve';
        this.scheduling.prepareSlots(frame.ref, frame.hints);
        return;
      }
      case 'HINT_ID': {
        const frame = this.frames.get(call.owner.id);
        if (frame === undefined) return;
        const index = frame.nextIdentityIndex;
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
          const completed =
            this.breadthFirstPolicy.completeResolution(call.owner);
          const value = (
            reply.outcome as {
              ok: true;
              value: import('@core/TraversableTree').MakeVertexResult<T>;
            }
          ).value;
          this.scheduling.acceptVertex(completed.context, value);
          if (completed.closeParent) {
            this.scheduling.closeExpansion(
              completed.context.parentVertexRef,
            );
          }
          return;
        }
        const frame = this.frames.get(call.owner.id);
        if (frame === undefined) return;
        const index = frame.nextConsumeIndex;
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
          const metadata = this.options.visitorMetadata[runtime.state.order] ?? [];
          const style = metadata[action.recordIndex]!.resolutionStyle;
          runtime.state.group =
            style === 'CONCURRENT' ? 'concurrent' : 'sequential';
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
          this.commitChain(runtime.state);
          this.chains.delete(id);
          return null;
      }
    }
  }

  private commitCommands(
    runtime: ChainRuntime<T, R>,
    commands: ChainState<T, R>['commands'],
  ): {
    halt: boolean;
    deleted: boolean;
    vertexVisitorsChainState?: unknown;
  } {
    let halt = false;
    let deleted = false;
    let hasState = false;
    let chainState: unknown;
    for (const command of commands) {
      switch (command.commandName) {
        case TraversalVisitorCommandName.NOOP:
          break;
        case TraversalVisitorCommandName.HALT_TRAVERSAL:
          halt = true;
          this.haltRequested = true;
          break;
        case TraversalVisitorCommandName.DELETE_VERTEX: {
          const removed = this.scheduling.deleteVertex(runtime.state.ref);
          deleted = removed.has(runtime.state.ref);
          this.invalidateRefs(removed, runtime.state.owner);
          break;
        }
        case TraversalVisitorCommandName.DISABLE_SUBTREE_TRAVERSAL:
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
              runtime.state.ref.unref().getChildrenHints().slice(),
            );
          }
          if (
            this.depthFirstPolicy === null &&
            this.breadthFirstPolicy === null
          ) {
            this.scheduling.disableSubtree(runtime.state.ref);
          } else if (
            this.depthFirstPolicy !== null &&
            runtime.state.order !== DepthFirstTraversalOrder.PRE_ORDER
          ) {
            this.scheduling.disableSubtree(runtime.state.ref);
          }
          break;
        case TraversalVisitorCommandName.SET_VERTEX_VISITORS_CHAIN_STATE:
          hasState = true;
          chainState = command.commandArguments.vertexVisitorsChainState;
          break;
        case TraversalVisitorCommandName.REWRITE_VERTEX_DATA:
          runtime.state.ref.setPointsTo(
            runtime.state.ref.unref().clone({
              $d: command.commandArguments.newData,
            }),
          );
          break;
        case TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER:
          if (
            (this.depthFirstPolicy !== null &&
              runtime.state.order !== DepthFirstTraversalOrder.PRE_ORDER) ||
            (this.options.kind === 'dag' && runtime.state.order !== 'ON_READY')
          ) {
            throw new Error(
              this.options.kind === 'dag'
                ? 'Child hints can only be rewritten during ON_READY'
                : 'Child hints can only be rewritten during pre-order',
            );
          }
          runtime.state.ref.setPointsTo(
            runtime.state.ref.unref().clone({
              $c: command.commandArguments.newHints.slice(),
            }),
          );
          break;
      }
    }
    return {
      halt,
      deleted,
      ...(hasState ? { vertexVisitorsChainState: chainState } : {}),
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
      visitorState.curVertexVisitorVisitIndex =
        state.metadata.curVertexVisitorVisitIndex;
      visitorState.vertexVisitIndex += 1;
      visitorState.previousVisitedVertexRef = state.ref;
    }
    if (
      this.breadthFirstPolicy !== null &&
      visitorState !== undefined &&
      this.visitorsEnabledFor(state.config, state.order)
    ) {
      visitorState.curVertexVisitorVisitIndex =
        state.metadata.curVertexVisitorVisitIndex;
      visitorState.vertexVisitIndex += 1;
      visitorState.previousVisitedVertexRef = state.ref;
    }
    if (!this.options.container.resolvedGraph.has(state.ref)) return;
    const initial = state.order === this.orders.initial;
    if (state.order === DepthFirstTraversalOrder.IN_ORDER) {
      if (depthFirstFrame === undefined || this.depthFirstPolicy === null) {
        throw new Error('In-order chain has no depth-first frame');
      }
      this.depthFirstPolicy.completeVisit(
        depthFirstFrame,
        DepthFirstTraversalOrder.IN_ORDER,
      );
    } else if (initial) {
      this.scheduling.markPreVisited(state.ref);
      if (depthFirstFrame !== undefined && this.depthFirstPolicy !== null) {
        this.depthFirstPolicy.completeVisit(
          depthFirstFrame,
          DepthFirstTraversalOrder.PRE_ORDER,
        );
      }
    } else {
      this.scheduling.markComplete(state.ref);
      if (depthFirstFrame !== undefined && this.depthFirstPolicy !== null) {
        this.depthFirstPolicy.completeVisit(
          depthFirstFrame,
          DepthFirstTraversalOrder.POST_ORDER,
        );
      }
    }
    if (
      visitorState !== undefined &&
      this.depthFirstPolicy === null &&
      this.breadthFirstPolicy === null
    ) {
      visitorState.curVertexVisitorVisitIndex =
        state.metadata.curVertexVisitorVisitIndex;
      visitorState.previousVisitedVertexRef = state.ref;
    }
    if (state.config.iterateOver.includes(state.order)) {
      this.boundaries.push({
        id: this.nextBoundaryId++,
        event: {
          vertex: state.ref.unref(),
          vertexRef: state.ref,
          order: state.order,
          isRoot: state.ref === this.options.container.resolvedGraph.getRoot(),
          isTraversalRoot:
            state.ref === this.options.stateBridge.traversalRootVertexRef,
        },
        expandAfter: initial && this.depthFirstPolicy === null,
      });
    } else if (initial && this.depthFirstPolicy === null) {
      if (this.breadthFirstPolicy !== null) {
        this.enqueueBreadthFirstExpansion(state.ref);
      } else {
        this.expansionQueue.push(state.ref);
      }
    }
  }

  private advanceDepthFirst(): KernelAction<T, R> | 'PROGRESSED' | null {
    const policy = this.depthFirstPolicy;
    if (policy === null) return null;
    const work = policy.next(
      (ref) => this.options.container.resolvedGraph.has(ref),
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
        this.scheduling.prepareSlots(work.frame.vertexRef, work.hints);
        policy.setHints(work.frame, work.hints);
        return 'PROGRESSED';
      case 'SORT_HINTS':
        return this.issue({
          kind: 'SORT_HINTS',
          owner: work.frame.owner,
          hints: work.hints,
        });
      case 'MAKE_VERTEX': {
        const context = {
          parentVertexRef: work.frame.vertexRef,
          parentVertex: work.frame.vertexRef.unref(),
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
        this.scheduling.takeCompleting();
        return 'PROGRESSED';
      case 'POP':
        return 'PROGRESSED';
    }
  }

  private findDepthFirstFrame(ownerId: number): DepthFirstFrame<T | R> {
    const frame = this.depthFirstPolicy
      ?.getFrames()
      .find((candidate) => candidate.owner.id === ownerId);
    if (frame === undefined) throw new Error('Unknown depth-first frame owner');
    return frame;
  }

  private advanceBreadthFirst(): KernelAction<T, R> | 'PROGRESSED' | null {
    const policy = this.breadthFirstPolicy;
    if (policy === null) return null;
    const eligible = this.scheduling.takeEligible();
    if (eligible !== null) {
      if (eligible.order === 'ON_COMPLETE') {
        this.scheduling.markComplete(eligible.ref);
      } else {
        this.admitChain(eligible.ref, this.orders.initial);
      }
      return 'PROGRESSED';
    }
    const work = policy.next(
      (ref) => this.options.container.resolvedGraph.has(ref),
      (ref) => this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref),
    );
    if (work === null) return null;
    switch (work.kind) {
      case 'PREPARE_HINTS':
        this.scheduling.prepareSlots(
          work.expansion.vertexRef,
          work.hints,
        );
        if (policy.setHints(work.expansion, work.hints)) {
          this.scheduling.closeExpansion(work.expansion.vertexRef);
        }
        return 'PROGRESSED';
      case 'SORT_HINTS':
        return this.issue({
          kind: 'SORT_HINTS',
          owner: work.expansion.owner,
          hints: work.hints,
        });
      case 'MAKE_VERTEX': {
        const owner = this.newOwner('frame');
        policy.startResolution(owner, work.context);
        return this.issue({ kind: 'MAKE_VERTEX', owner, context: work.context });
      }
      case 'CLEAR_QUEUE':
        policy.clearQueue();
        return 'PROGRESSED';
    }
  }

  private enqueueBreadthFirstExpansion(ref: Ref<T | R>): void {
    const vertex = this.options.container.resolvedGraph.get(ref);
    if (vertex !== null) {
      const policy = this.breadthFirstPolicy!;
      if (!this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref)) {
        const frontier = policy.takeInjectedFrontier(ref);
        if (frontier !== null) {
          const contexts = frontier.contexts
            .slice()
            .sort((left, right) => left.hintIndex - right.hintIndex);
          if (
            contexts.some((context, index) => context.hintIndex !== index)
          ) {
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
        });
      }
    }
    if (frame.stage === 'resolve') {
      while (frame.nextConsumeIndex < frame.hints.length) {
        if (this.hasPendingFor(frame.owner)) return null;
        const index = frame.nextConsumeIndex;
        const parent = this.options.container.resolvedGraph.get(frame.ref);
        if (parent === null) {
          frame.stage = 'closed';
          this.frames.delete(frame.owner.id);
          return null;
        }
        const context = {
          depth: parent.discoveryDepth + 1,
          parentVertex: frame.ref.unref(),
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
      frame.stage = 'closed';
      this.frames.delete(frame.owner.id);
      return null;
    }
    return null;
  }

  private admitEligibleVisit(): boolean {
    const eligible = this.scheduling.takeEligible();
    if (eligible === null) return false;
    if (eligible.order === 'ON_COMPLETE' && this.orders.completion === null) {
      this.scheduling.markComplete(eligible.ref);
      return true;
    }
    const order =
      eligible.order === 'ON_READY'
        ? this.orders.initial
        : this.orders.completion!;
    if (eligible.order === 'ON_READY') {
      this.scheduling.markPreVisiting(eligible.ref);
    }
    this.admitChain(eligible.ref, order);
    return true;
  }

  private admitChain(ref: Ref<T | R>, order: VisitOrder): OwnerToken {
    const owner = this.newOwner('chain');
    const config = this.copyConfig(this.options.iterableConfig);
    const records = this.visitorsEnabled(order)
      ? (this.options.visitorMetadata[order] ?? []).slice()
      : [];
    const visitorState = (this.options.stateBridge.visitorsState[order] ??= {
      vertexVisitIndex: 0,
      curVertexVisitorVisitIndex: 0,
      previousVisitedVertexRef: null,
    });
    const metadata = {
      vertexVisitIndex: visitorState.vertexVisitIndex,
      curVertexVisitorVisitIndex: 0,
      previousVisitedVertexRef: visitorState.previousVisitedVertexRef,
      vertexVisitorsChainState: null,
    };
    if (
      records.length > 0 &&
      this.depthFirstPolicy === null &&
      this.breadthFirstPolicy === null
    ) {
      visitorState.vertexVisitIndex += 1;
    }
    if (
      this.depthFirstPolicy !== null &&
      this.visitorsEnabledFor(config, order)
    ) {
      visitorState.curVertexVisitorVisitIndex = 0;
    }
    if (
      this.breadthFirstPolicy !== null &&
      this.visitorsEnabledFor(config, order)
    ) {
      visitorState.curVertexVisitorVisitIndex = 0;
    }
    const concurrentIndices: number[] = [];
    const sequentialIndices: number[] = [];
    records.forEach((record, index) => {
      if (record.resolutionStyle === 'CONCURRENT') concurrentIndices.push(index);
      else if (record.resolutionStyle === 'SEQUENTIAL')
        sequentialIndices.push(index);
      else throw new TypeError('Unknown visitor resolution style');
    });
    const state: ChainState<T, R> = {
      owner,
      ref,
      order,
      phase: 'running',
      group: 'concurrent',
      concurrentIndices,
      sequentialIndices,
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
      }),
    });
    return owner;
  }

  private admitExpansion(): boolean {
    const ref = this.expansionQueue.shift();
    if (ref === undefined || !this.options.container.resolvedGraph.has(ref)) {
      return ref !== undefined;
    }
    if (this.options.stateBridge.subtreeTraversalDisabledRefs.has(ref)) {
      return true;
    }
    const owner = this.newOwner('frame');
    const vertex = this.options.container.resolvedGraph.get(ref)!;
    const hints = ref.unref().getChildrenHints().slice();
    const frame: FrameState<T, R> = {
      owner,
      ref,
      depth: vertex.discoveryDepth,
      stage: this.options.hasSorter
        ? 'sort'
        : this.options.hasHintIds
        ? 'identify'
        : 'resolve',
      hints,
      nextIdentityIndex: 0,
      nextConsumeIndex: 0,
      hintIds: new Map(),
      contexts: new Map(),
      pendingIndices: new Set(),
      outcomes: new Map(),
    };
    this.frames.set(owner.id, frame);
    if (!this.options.hasSorter) {
      this.scheduling.prepareSlots(ref, hints);
    }
    return true;
  }

  private issue(
    input: CallInput<T, R>,
  ): CallAction<T, R> {
    const call = { ...input, requestId: this.nextRequestId++ } as CallSpec<
      T,
      R
    >;
    this.pendingRequests.set(call.requestId, { call, submitted: false });
    return { kind: 'CALL', call };
  }

  private isFinished(): boolean {
    if (!this.rootSettled) return false;
    return (
      this.options.container.resolvedGraph.getRoot() === null ||
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

  private halt(): KernelAction<T, R> {
    this.setStatus(TraversalRunnerStatus.HALTED);
    return { kind: 'HALTED' };
  }

  private invalidateRefs(
    refs: ReadonlySet<Ref<T | R>>,
    except: OwnerToken,
  ): void {
    for (const [id, frame] of this.frames) {
      if (refs.has(frame.ref)) {
        this.invalidateOwner(frame.owner);
        this.frames.delete(id);
      }
    }
    for (const [id, runtime] of this.chains) {
      if (
        refs.has(runtime.state.ref) &&
        runtime.state.owner.id !== except.id
      ) {
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
      !this.invalidOwners.has(this.ownerKey(owner))
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

  private visitorsEnabled(order: VisitOrder): boolean {
    return this.visitorsEnabledFor(this.options.iterableConfig, order);
  }

  private visitorsEnabledFor(
    config: typeof this.options.iterableConfig,
    order: VisitOrder,
  ): boolean {
    return (
      (config.enableVisitorFunctionsFor === null ||
        config.enableVisitorFunctionsFor.includes(order)) &&
      (config.disableVisitorFunctionsFor === null ||
        !config.disableVisitorFunctionsFor.includes(order))
    );
  }

  private copyConfig(config: typeof this.options.iterableConfig) {
    return {
      iterateOver: config.iterateOver.slice(),
      enableVisitorFunctionsFor:
        config.enableVisitorFunctionsFor?.slice() ?? null,
      disableVisitorFunctionsFor:
        config.disableVisitorFunctionsFor?.slice() ?? null,
    };
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
        return { initial: 'ON_READY', completion: 'ON_COMPLETE' };
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
