import {
  createVertexHandleFacet,
  vertexView,
  internalRef,
} from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeOrDagExecutionSnapshot } from '@core/CoreInspection';
import {
  bindGraphSource,
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import type { CallbackBindings, CallSpec } from '@core/effects/types';
import type { ResolvedGraphsContainerOptions } from '@core/graph/ResolvedGraphsContainer';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { detachTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import type {
  PreCommandDiscoveredGraphView,
  LiveResolvedGraphView,
} from '@core/ResolvedGraphView';
import type { LiveResolvedTreeView } from '@core/ResolvedTreeView';
import type {
  TraversalEventNarrowedToSelectedKinds,
  SyncTraversalExecution,
} from '@core/TraversalExecution';
import { TraversalKernel } from '@core/TraversalKernel';
import type { TraversalStopReason } from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type {
  TraversalEventKindForVisitorPhase,
  TraversalExecutionSelectionPatch,
} from '@core/TraversalRunnerIterableConfig';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { deepFreeze } from '@utils/deepFreeze';
import { initDagVisitors } from '../init-helpers/initVisitors';
import { captureDagMilestoneSnapshot as captureDagInspection } from '../inspectDag';
import type { DagMilestoneSnapshot } from './DagInspection';
import { DagPolicy } from './DagPolicy';
import type {
  DagWorkSettlementToken,
  DagSettlementOutcome,
  DagProgressSnapshot,
} from './DagProgress';
import { dagRunnerCapabilities } from './dagRunnerCapabilities';
import type { DagResolvedOptions } from './DagTraversalInstanceConfig';
import { DagVisitorPhase } from './DagTraversalOrder';
import {
  makeEffectiveDagTraversalRunnerIterableConfig,
  type DagTraversalRunnerIterableConfig,
} from './DagTraversalRunnerIterableConfig';
import { DagTraversalRunnerState } from './DagTraversalRunnerState';
import type { DagCommittedMilestoneEvent } from './DagTraversalVisitor';

import {
  captureDagTerminalObservation,
  getDagTerminalObservation,
} from './DagTerminalObservation';

type Event<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
> = DagCommittedMilestoneEvent<
  SourceVertexTypes | RewrittenVertexTypes,
  VertexId
>;

export interface DagTraversalRunner<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> extends SyncTraversalExecution<
    DagVisitorPhase,
    DagCommittedMilestoneEvent<
      SourceVertexTypes | RewrittenVertexTypes,
      VertexId
    >,
    TreeOrDagExecutionSnapshot<DagVisitorPhase>,
    'workCompletionCommitted' | 'subgraphCompletionCommitted'
  > {
  readonly preCommandDiscoveredGraphView: PreCommandDiscoveredGraphView<
    SourceVertexTypes,
    VertexId
  > | null;
  discoverValidateAndFreezeTopology(): this;
  captureMilestoneSnapshot(): DagMilestoneSnapshot<VertexId>;
  captureProgressSnapshot(): DagProgressSnapshot<VertexId>;
  settleDeferredWork(
    vertexId: VertexId,
    outcome: DagSettlementOutcome,
    expectedSettlementToken: DagWorkSettlementToken,
  ): boolean;
  getLiveResolvedTreeView(): LiveResolvedTreeView<
    SourceVertexTypes | RewrittenVertexTypes
  > | null;
  getLiveResolvedGraphView(): LiveResolvedGraphView<
    SourceVertexTypes | RewrittenVertexTypes,
    VertexId
  >;
  isVisibleSourceRootVertex(
    vertexHandle: VertexHandle<SourceVertexTypes | RewrittenVertexTypes>,
  ): boolean;
}

export class InternalDagTraversalRunner<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> {
  private readonly terminalObservation: ReturnType<
    typeof getDagTerminalObservation
  >;
  private readonly icfg: DagResolvedOptions<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  private readonly state: DagTraversalRunnerState<
    SourceVertexTypes,
    RewrittenVertexTypes
  >;
  private readonly resolvedGraphsContainer: ResolvedGraphsContainer<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  readonly preCommandDiscoveredGraphView: PreCommandDiscoveredGraphView<
    SourceVertexTypes,
    VertexId
  > | null;
  private iterableConfig: DagTraversalRunnerIterableConfig =
    makeEffectiveDagTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private curGenerator: Generator<Event<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  > | null> | null = null;
  private readonly runtimeState: SyncDriverState = {
    inFlightInvocationCount: 0,
  };
  private readonly policy: DagPolicy<SourceVertexTypes, RewrittenVertexTypes>;
  private readonly kernel: TraversalKernel<
    SourceVertexTypes,
    RewrittenVertexTypes
  >;
  private readonly bindings: CallbackBindings<
    SourceVertexTypes,
    RewrittenVertexTypes
  >;

  constructor(
    input: DagResolvedOptions<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ) {
    this.icfg = { ...input, visitors: initDagVisitors(input) };
    const injectedState = input.traversalRunnerInternalObjects.state;
    this.state =
      injectedState ??
      new DagTraversalRunnerState<SourceVertexTypes, RewrittenVertexTypes>();
    const graphSource = input.dagDiscoverySource;
    const treeSource = input.treeDiscoverySource;
    const sourceMode = graphSource !== undefined ? 'graph' : 'tree';
    const acceptedCompletedWorkVertexIds =
      input.acceptedCompletedWorkVertexIds === undefined
        ? undefined
        : new Set(input.acceptedCompletedWorkVertexIds);
    if (
      (acceptedCompletedWorkVertexIds !== undefined ||
        input.discoveryTiming === 'completeBeforeAnyVisitor' ||
        input.sourceRootIsHiddenEntryHolder === true) &&
      (sourceMode !== 'graph' ||
        input.traversalRunnerInternalObjects.state !== null ||
        input.traversalRunnerInternalObjects.resolvedGraphsContainer !== null)
    ) {
      throw new TypeError(
        'Progress options require a fresh graph-source runner',
      );
    }
    const injectedContainer =
      input.traversalRunnerInternalObjects.resolvedGraphsContainer;
    if (injectedContainer !== null) {
      if (injectedContainer.sourceMode !== sourceMode) {
        throw new TypeError(
          'Injected graph container source mode does not match',
        );
      }
      if (
        (injectedContainer.preCommandDiscoveredGraphView !== null) !==
        input.retainDiscoveredGraphBeforeVisitorCommands
      ) {
        throw new TypeError(
          'Injected graph container snapshot mode does not match',
        );
      }
      this.resolvedGraphsContainer = injectedContainer;
    } else if (sourceMode === 'graph') {
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >({
        sourceMode: 'graph',
        syntheticRoot: input.sourceRootIsHiddenEntryHolder === true,
        saveOriginal: input.retainDiscoveredGraphBeforeVisitorCommands,
      });
    } else {
      const treeContainer = new DepthFirstTraversalResolvedTreesContainer({
        ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
        treeDiscoverySource: treeSource!,
        retainDiscoveredTreeBeforeVisitorCommands:
          input.retainDiscoveredGraphBeforeVisitorCommands,
      } as unknown as DepthFirstTreeResolvedOptions<SourceVertexTypes, RewrittenVertexTypes>);
      // Tree-source inputs are accepted only when ID is unknown.
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >({
        sourceMode: 'tree',
        saveOriginal: input.retainDiscoveredGraphBeforeVisitorCommands,
        treeContainer,
      } as ResolvedGraphsContainerOptions<SourceVertexTypes, RewrittenVertexTypes, VertexId>);
    }
    this.terminalObservation = getDagTerminalObservation(
      this.state,
      this.resolvedGraphsContainer.liveResolvedGraphView.getVertexRefs()
        .length > 0,
    );
    this.preCommandDiscoveredGraphView =
      this.resolvedGraphsContainer.preCommandDiscoveredGraphView;
    this.policy = new DagPolicy(this.state, this.resolvedGraphsContainer);
    if (this.state.status === TraversalRunnerStatus.FAILED) {
      this.failure = this.state.failure;
    }
    const source =
      sourceMode === 'graph'
        ? bindGraphSource(graphSource!, this.resolvedGraphsContainer)
        : bindTreeSource(
            treeSource!,
            this.resolvedGraphsContainer,
            'DagTraversalRunner',
          );
    this.bindings = createCallbackBindings<
      SourceVertexTypes,
      RewrittenVertexTypes
    >({
      source,
      ...(input.transformChildHintsBeforeResolution === null
        ? {}
        : {
            sortHints: (
              hints: (SourceVertexTypes | RewrittenVertexTypes)['ChildHint'][],
            ) =>
              input.transformChildHintsBeforeResolution!(
                hints as SourceVertexTypes['ChildHint'][],
              ) as (SourceVertexTypes | RewrittenVertexTypes)['ChildHint'][],
          }),
      visit: {
        [DagVisitorPhase.ON_WORK_READY]: (call) => this.visit(call),
        [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: (call) =>
          this.visit(call),
      },
    });
    this.kernel = new TraversalKernel({
      kind: 'dag',
      canPrepare:
        input.traversalRunnerInternalObjects.state === null &&
        input.traversalRunnerInternalObjects.resolvedGraphsContainer === null,
      discoveryTiming: input.discoveryTiming ?? 'incrementalDuringTraversal',
      workCompletionPolicy:
        this.icfg.workCompletionPolicy === undefined
          ? 'afterWorkReadyVisitorChain'
          : this.icfg.workCompletionPolicy,
      ...(input.rootWorkPrerequisitePolicy === undefined
        ? {}
        : { rootWorkPrerequisitePolicy: input.rootWorkPrerequisitePolicy }),
      ...(input.undeclaredWorkPrerequisitePolicy === undefined
        ? {}
        : {
            undeclaredWorkPrerequisitePolicy:
              input.undeclaredWorkPrerequisitePolicy,
          }),
      ...(acceptedCompletedWorkVertexIds === undefined
        ? {}
        : { acceptedCompletedWorkVertexIds }),
      execution: 'sync',
      sourceMode,
      container: this.resolvedGraphsContainer,
      stateBridge: this.state,
      visitorMetadata: {
        [DagVisitorPhase.ON_WORK_READY]: this.metadataFor(Order.ON_WORK_READY),
        [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: this.metadataFor(
          Order.ON_SUBGRAPH_COMPLETION_READY,
        ),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasChildHintsListTransformer:
        input.transformChildHintsBeforeResolution !== null,
      hasPrerequisiteResolver: source.resolvePrerequisite !== undefined,
      hasChildHintVertexIdResolver:
        sourceMode === 'graph' &&
        graphSource!.tryGetVertexIdentityFromHint !== undefined,
      maxConcurrentCallbackInvocations: 1,
      ...(this.state.status === TraversalRunnerStatus.SUSPENDED
        ? {
            dagSeed: {
              dependencyEligiblePhaseVisits:
                this.state.dependencyEligiblePhaseVisits.map(
                  ({ vertexHandle, order }) => ({
                    ref: vertexHandle,
                    order,
                  }),
                ),
              expansionQueue: this.state.expansionQueue,
            },
          }
        : {}),
    });
    dagRunnerCapabilities.set(this, {
      inspectState: () =>
        this.terminalObservation === undefined
          ? this.kernel.inspectDagState()
          : this.terminalObservation.inspectDagState(),
      workCompletionPolicy: this.icfg.workCompletionPolicy,
      container: this
        .resolvedGraphsContainer as unknown as ResolvedGraphsContainer<VertexDataAndChildHintTypes>,
    });
  }

  discoverValidateAndFreezeTopology(): this {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    this.kernel.validatePreparation();
    this.policy.claim();
    this.kernel.resume(undefined, true);
    this.curGenerator ??= this.getInternalGenerator();
    this.activeIterator = true;
    try {
      this.curGenerator.next();
    } catch (error) {
      this.failure = { error };
      this.state.failure = this.failure;
      this.state.status = TraversalRunnerStatus.FAILED;
      throw error;
    } finally {
      this.activeIterator = false;
      captureDagTerminalObservation(this.state, this.kernel);
      this.policy.releaseIfTerminal();
    }
    return this;
  }

  /** Capture synchronously without advancing discovery or acquiring iterator ownership. */
  captureMilestoneSnapshot(): DagMilestoneSnapshot<VertexId> {
    return captureDagInspection(this);
  }

  captureProgressSnapshot(): DagProgressSnapshot<VertexId> {
    // The kernel only receives identities from this runner's typed source/config.
    return (
      this.terminalObservation === undefined
        ? this.kernel.captureProgressSnapshot()
        : this.terminalObservation.captureProgressSnapshot()
    ) as DagProgressSnapshot<VertexId>;
  }

  settleDeferredWork(
    vertexId: VertexId,
    outcome: DagSettlementOutcome,
    expectedSettlementToken: DagWorkSettlementToken,
  ): boolean {
    const accepted = this.kernel.settle(
      vertexId,
      outcome,
      expectedSettlementToken,
    );
    return accepted;
  }

  getTraversalLifecycleStatus(): TraversalRunnerStatus {
    return this.state.status;
  }

  getTraversalStopReason(): TraversalStopReason | null {
    return this.kernel.getTraversalStopReason();
  }

  requestPauseAfterAdmittedCallbacksDrain(): boolean {
    if (
      this.getTraversalLifecycleStatus() !== TraversalRunnerStatus.RUNNING ||
      this.kernel.isHaltRequested()
    )
      return false;
    this.kernel.requestHalt();
    return true;
  }

  isSuspended(): boolean {
    return (
      this.getTraversalLifecycleStatus() === TraversalRunnerStatus.SUSPENDED
    );
  }

  getLiveResolvedTreeView(): LiveResolvedTreeView<
    SourceVertexTypes | RewrittenVertexTypes
  > | null {
    return (
      this.resolvedGraphsContainer.treeContainer?.resolvedTree.getLiveReadOnlyTreeView() ??
      null
    );
  }

  getLiveResolvedGraphView(): LiveResolvedGraphView<
    SourceVertexTypes | RewrittenVertexTypes,
    VertexId
  > {
    return this.resolvedGraphsContainer.publicResolvedGraph;
  }

  isVisibleSourceRootVertex(
    vertexHandle: VertexHandle<SourceVertexTypes | RewrittenVertexTypes>,
  ): boolean {
    return (
      createVertexHandleFacet(internalRef(vertexHandle)) ===
      this.getLiveResolvedGraphView().getDesignatedRootHandleOrNull()
    );
  }

  captureExecutionSnapshot(): TreeOrDagExecutionSnapshot<DagVisitorPhase> {
    return deepFreeze({
      ...this.kernel.captureExecutionSnapshot(),
      inFlightInvocationCount: this.runtimeState.inFlightInvocationCount,
      bufferedDeliveryEventCount: 0,
    }) as TreeOrDagExecutionSnapshot<DagVisitorPhase>;
  }

  runAndIterateObservationEventsUntilSuspendedOrTerminal(): Generator<
    Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal<
    Kind extends TraversalEventKindForVisitorPhase<DagVisitorPhase>,
  >(
    config: TraversalExecutionSelectionPatch<DagVisitorPhase, Kind> & {
      deliveredEventKinds: readonly Kind[];
    },
  ): Generator<
    TraversalEventNarrowedToSelectedKinds<
      Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
      Kind
    >,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DagVisitorPhase>,
  ): Generator<
    Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
    void,
    unknown
  >;
  *runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DagVisitorPhase>,
  ): Generator<
    Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
    void,
    unknown
  > {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    if (this.getTraversalLifecycleStatus() === TraversalRunnerStatus.FINISHED)
      return;
    const patch =
      config === undefined
        ? undefined
        : detachTraversalExecutionOptions(
            Object.values(DagVisitorPhase),
            config,
          );
    this.policy.claim();
    this.kernel.resume(patch);
    this.curGenerator ??= this.getInternalGenerator();
    this.activeIterator = true;
    this.state.status = TraversalRunnerStatus.RUNNING;
    try {
      while (true) {
        let next: IteratorResult<Event<
          SourceVertexTypes,
          RewrittenVertexTypes,
          VertexId
        > | null>;
        try {
          next = this.curGenerator.next();
        } catch (error) {
          this.failure = { error };
          this.state.failure = this.failure;
          this.state.status = TraversalRunnerStatus.FAILED;
          throw error;
        }
        if (next.done) {
          this.state.status = TraversalRunnerStatus.FINISHED;
          return;
        }
        if (this.isSuspended() || next.value === null) return;
        yield next.value;
      }
    } finally {
      this.activeIterator = false;
      if (
        this.getTraversalLifecycleStatus() === TraversalRunnerStatus.RUNNING
      ) {
        this.kernel.requestHalt();
        this.state.status = TraversalRunnerStatus.SUSPENDED;
      }
      captureDagTerminalObservation(this.state, this.kernel);
      this.policy.releaseIfTerminal();
    }
  }

  runUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DagVisitorPhase>,
  ): this {
    for (const _event of this.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      config,
    )) {
      /* Drain traversal events. */
    }
    return this;
  }

  private *getInternalGenerator(): Generator<Event<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  > | null> {
    for (const event of runSync(
      this.kernel,
      this.bindings,
      this.runtimeState,
      'DagTraversalRunner',
    )) {
      if (event === null) yield null;
      else {
        yield {
          vertex: vertexView(event.vertex),
          vertexHandle: createVertexHandleFacet(event.vertexHandle),
          vertexId: this.getLiveResolvedGraphView().requireVertexId(
            createVertexHandleFacet(event.vertexHandle),
          ),
          ...(event.order === DagVisitorPhase.ON_WORK_READY
            ? ({
                eventKind: 'workCompletionCommitted',
              } as const)
            : ({
                eventKind: 'subgraphCompletionCommitted',
              } as const)),
          isVisibleSourceRoot: event.isRoot,
        };
      }
    }
  }

  private visit(
    call: Extract<
      CallSpec<SourceVertexTypes, RewrittenVertexTypes>,
      { kind: 'VISIT' }
    >,
  ) {
    const order = call.order as DagVisitorPhase;
    const registration = this.icfg.visitors[order][call.recordIndex]!;
    return registration.visitor(vertexView(call.ref.getReferencedValue()), {
      phaseVisitorChainAdmissionIndex: call.metadata.phaseVisitorChainIndex,
      visitorCallbackIndexInPhaseChain:
        call.metadata.visitorCallbackIndexInPhaseChain,
      currentVertexPhaseChainState: call.metadata.currentVertexPhaseChainState,
      previousCommittedVisitVertexHandleForSamePhase: createVertexHandleFacet(
        call.metadata.previousCommittedVisitVertexHandleForSamePhase,
      ),
      liveResolvedGraphView: this.getLiveResolvedGraphView(),
      preCommandDiscoveredGraphView: this.preCommandDiscoveredGraphView,
      vertexHandle: createVertexHandleFacet(call.ref),
      visitorPhase: order,
      isVisibleSourceRoot: this.isVisibleSourceRootVertex(
        createVertexHandleFacet(call.ref),
      ),

      visitorRegistrationMetadata: registration,
      // The record and options share the same phase selected above.
    } as never);
  }

  private metadataFor(order: DagVisitorPhase) {
    return this.icfg.visitors[order].map(
      ({
        phaseRegistrationInsertionIndex,
        descendingExecutionPriorityWithinGroup,

        visitorCommandCommitTiming,
        visitorGroup,
      }) => ({
        phaseRegistrationInsertionIndex,
        descendingExecutionPriorityWithinGroup,

        visitorCommandCommitTiming,
        visitorGroup,
      }),
    );
  }
}

const Order = DagVisitorPhase;
