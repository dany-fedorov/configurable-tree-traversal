import {
  createVertexHandleFacet,
  vertexView,
  internalRef,
} from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeOrDagExecutionSnapshot } from '@core/CoreInspection';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import {
  bindGraphSource,
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { CallSpec, KernelEvent } from '@core/effects/types';
import type { ResolvedGraphsContainerOptions } from '@core/graph/ResolvedGraphsContainer';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
import type {
  PreCommandDiscoveredGraphView,
  LiveResolvedGraphView,
} from '@core/ResolvedGraphView';
import type { LiveResolvedTreeView } from '@core/ResolvedTreeView';
import type {
  TraversalEventNarrowedToSelectedKinds,
  AsyncTraversalExecution,
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
import { captureDagMilestoneSnapshot as captureDagInspection } from '../inspectDag';
import {
  mergeAsyncDagTraversalInstanceConfigs,
  type AsyncDagResolvedOptions,
} from './AsyncDagTraversalInstanceConfig';
import type { DagMilestoneSnapshot } from './DagInspection';
import { DagPolicy } from './DagPolicy';
import type {
  DagWorkSettlementToken,
  DagSettlementOutcome,
  DagProgressSnapshot,
} from './DagProgress';
import { dagRunnerCapabilities } from './dagRunnerCapabilities';
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

export interface AsyncDagTraversalRunner<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> extends AsyncTraversalExecution<
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
  discoverValidateAndFreezeTopology(): Promise<this>;
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

export class InternalAsyncDagTraversalRunner<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> {
  private readonly terminalObservation: ReturnType<
    typeof getDagTerminalObservation
  >;
  private readonly icfg: AsyncDagResolvedOptions<
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
  private readonly kernel: TraversalKernel<
    SourceVertexTypes,
    RewrittenVertexTypes
  >;
  private readonly notifyProgress: () => void;
  private readonly execution: AsyncRunnerSession<
    Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>
  >;

  constructor(
    input: AsyncDagResolvedOptions<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ) {
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(input, {});
    this.icfg.visitors = Object.fromEntries(
      Object.entries(this.icfg.visitors).map(([order, records]) => [
        order,
        records.map((record) => ({ ...record })),
      ]),
    ) as typeof this.icfg.visitors;
    this.state =
      input.traversalRunnerInternalObjects.state ??
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
    const policy = new DagPolicy(this.state, this.resolvedGraphsContainer);
    const source =
      sourceMode === 'graph'
        ? bindGraphSource(graphSource!, this.resolvedGraphsContainer)
        : bindTreeSource(
            treeSource!,
            this.resolvedGraphsContainer,
            'AsyncDagTraversalRunner',
          );
    const bindings = createCallbackBindings<
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
              ) as ReturnType<
                NonNullable<typeof input.transformChildHintsBeforeResolution>
              >,
          }),
      visit: {
        [DagVisitorPhase.ON_WORK_READY]: (call) => this.visit(call),
        [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: (call) =>
          this.visit(call),
      },
    });
    const kernel = (this.kernel = new TraversalKernel({
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
      execution: 'async',
      sourceMode,
      container: this.resolvedGraphsContainer,
      stateBridge: this.state,
      visitorMetadata: {
        [DagVisitorPhase.ON_WORK_READY]: this.metadataFor(
          DagVisitorPhase.ON_WORK_READY,
        ),
        [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: this.metadataFor(
          DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY,
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
      maxConcurrentCallbackInvocations: input.maxConcurrentCallbackInvocations,
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
    }));
    const driver = createAsyncDriver(
      kernel,
      bindings,
      input.maxConcurrentCallbackInvocations,
    );
    this.notifyProgress = driver.notifyProgress;
    const projectedControl = this.projectEvents(driver, policy);
    this.execution = new AsyncRunnerSession(projectedControl);
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

  async discoverValidateAndFreezeTopology(): Promise<this> {
    await this.execution.prepare(() => this.kernel.validatePreparation());
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
    this.notifyProgress();
    return accepted;
  }

  getTraversalLifecycleStatus(): TraversalRunnerStatus {
    return this.execution.getTraversalLifecycleStatus();
  }

  getTraversalStopReason(): TraversalStopReason | null {
    return this.execution.getTraversalStopReason();
  }

  requestPauseAfterAdmittedCallbacksDrain(): boolean {
    return this.execution.requestPauseAfterAdmittedCallbacksDrain();
  }

  isSuspended(): boolean {
    return this.execution.isSuspended();
  }

  captureExecutionSnapshot(): TreeOrDagExecutionSnapshot<DagVisitorPhase> {
    return this.execution.captureExecutionSnapshot() as TreeOrDagExecutionSnapshot<DagVisitorPhase>;
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

  runAndIterateObservationEventsUntilSuspendedOrTerminal(): AsyncGenerator<
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
  ): AsyncGenerator<
    TraversalEventNarrowedToSelectedKinds<
      Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
      Kind
    >,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DagVisitorPhase>,
  ): AsyncGenerator<
    Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DagVisitorPhase>,
  ): AsyncGenerator<
    Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
    void,
    unknown
  > {
    return this.execution.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      config,
    );
  }

  async runUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DagVisitorPhase>,
  ): Promise<this> {
    await this.execution.runUntilSuspendedOrTerminal(config);
    return this;
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

  private projectEvents(
    control: AsyncSessionControl<
      KernelEvent<SourceVertexTypes | RewrittenVertexTypes>
    >,
    policy: DagPolicy<SourceVertexTypes, RewrittenVertexTypes>,
  ): AsyncSessionControl<
    Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>
  > {
    return {
      advance: (
        mode,
      ): SessionProgress<
        Event<SourceVertexTypes, RewrittenVertexTypes, VertexId>
      > => {
        const progress = control.advance(mode);
        if (progress.kind === 'EVENT') {
          return {
            kind: 'EVENT',
            boundaryId: progress.boundaryId,
            event: {
              vertex: vertexView(progress.event.vertex),
              vertexHandle: createVertexHandleFacet(
                progress.event.vertexHandle,
              ),
              vertexId: this.getLiveResolvedGraphView().requireVertexId(
                createVertexHandleFacet(progress.event.vertexHandle),
              ),
              ...(progress.event.order === DagVisitorPhase.ON_WORK_READY
                ? ({
                    eventKind: 'workCompletionCommitted',
                  } as const)
                : ({
                    eventKind: 'subgraphCompletionCommitted',
                  } as const)),
              isVisibleSourceRoot: progress.event.isRoot,
            },
          };
        }
        if (progress.kind === 'FINISHED' || progress.kind === 'FAILED') {
          if (progress.kind === 'FAILED' && this.state.failure === null) {
            this.state.failure = { error: progress.error };
          }
          captureDagTerminalObservation(this.state, this.kernel);
          policy.releaseIfTerminal();
        }
        return progress;
      },
      shouldEmitEvent: (event) =>
        this.kernel.shouldEmit(
          event.eventKind === 'workCompletionCommitted'
            ? DagVisitorPhase.ON_WORK_READY
            : DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY,
        ),
      acknowledgeEvent: (boundaryId) => control.acknowledgeEvent(boundaryId),
      requestHalt: () => control.requestHalt(),
      isHaltRequested: () => control.isHaltRequested(),
      resume: (config, preparation) => {
        policy.claim();
        control.resume(config, preparation);
      },
      getTraversalLifecycleStatus: () => control.getTraversalLifecycleStatus(),
      getTraversalStopReason: () => control.getTraversalStopReason(),
      getFailure: () =>
        control.getFailure() ??
        (this.state.status === TraversalRunnerStatus.FAILED
          ? this.state.failure
          : null),
      captureExecutionSnapshot: () => control.captureExecutionSnapshot(),
      waitForProgress: () => control.waitForProgress(),
    };
  }
}
