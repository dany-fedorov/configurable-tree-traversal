import {
  createVertexHandleFacet,
  vertexView,
  internalRef,
} from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeOrDagExecutionSnapshot } from '@core/CoreInspection';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { CallSpec, KernelEvent } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
import type { LiveResolvedGraphView } from '@core/ResolvedGraphView';
import type { MutableResolvedTreeStore } from '@core/ResolvedTree';
import type { LiveResolvedTreeView } from '@core/ResolvedTreeView';
import type {
  TraversalEventNarrowedToSelectedKinds,
  AsyncTraversalExecution,
} from '@core/TraversalExecution';
import { TraversalKernel } from '@core/TraversalKernel';
import type {
  TraversalStopReason,
  TreeTraversalEvent,
} from '@core/TraversalRunner';
import type {
  TraversalEventKindForVisitorPhase,
  TraversalExecutionSelectionPatch,
} from '@core/TraversalRunnerIterableConfig';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import {
  mergeAsyncBreadthFirstTraversalInstanceConfigs,
  type AsyncBreadthFirstTreeResolvedOptions,
} from './AsyncBreadthFirstTraversalInstanceConfig';
import { BreadthFirstTreeVisitPhase } from './BreadthFirstTraversalOrder';
import {
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
  type BreadthFirstTraversalRunnerIterableConfig,
} from './BreadthFirstTraversalRunnerIterableConfig';
import { BreadthFirstTraversalRunnerState } from './BreadthFirstTraversalRunnerState';

type Event<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = TreeTraversalEvent<
  BreadthFirstTreeVisitPhase,
  InputVertexTypes,
  RewrittenVertexTypes
>;

export interface AsyncBreadthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> extends AsyncTraversalExecution<
    BreadthFirstTreeVisitPhase,
    TreeTraversalEvent<
      BreadthFirstTreeVisitPhase,
      InputVertexTypes,
      RewrittenVertexTypes
    >,
    TreeOrDagExecutionSnapshot<BreadthFirstTreeVisitPhase>
  > {
  getLiveResolvedTreeView(): LiveResolvedTreeView<
    InputVertexTypes | RewrittenVertexTypes
  >;
  getLiveResolvedGraphView(): LiveResolvedGraphView<
    InputVertexTypes | RewrittenVertexTypes
  >;
  isTreeRootVertex(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean;
}

export class InternalAsyncBreadthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> {
  private icfg: AsyncBreadthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private state: BreadthFirstTraversalRunnerState<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private iterableConfig: BreadthFirstTraversalRunnerIterableConfig =
    makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
  private readonly execution: AsyncTraversalExecution<
    BreadthFirstTreeVisitPhase,
    Event<InputVertexTypes, RewrittenVertexTypes>,
    TreeOrDagExecutionSnapshot
  >;

  constructor(
    icfgInput: AsyncBreadthFirstTreeResolvedOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    this.icfg = mergeAsyncBreadthFirstTraversalInstanceConfigs(icfgInput, {});
    this.icfg.visitors = Object.fromEntries(
      Object.entries(this.icfg.visitors).map(([order, records]) => [
        order,
        records.map((record) => ({ ...record })),
      ]),
    ) as typeof this.icfg.visitors;
    this.state = new BreadthFirstTraversalRunnerState(
      this.icfg.traversalRunnerInternalObjects.state,
    );
    const resolvedTreeConfig = {
      retainDiscoveredTreeBeforeVisitorCommands:
        this.icfg.retainDiscoveredTreeBeforeVisitorCommands,
      traversalRunnerInternalObjects: {
        resolvedTreesContainer:
          this.icfg.traversalRunnerInternalObjects.resolvedTreesContainer,
      },
    };
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer<
      InputVertexTypes,
      RewrittenVertexTypes
    >(resolvedTreeConfig);
    const graphContainer = new ResolvedGraphsContainer<
      InputVertexTypes,
      RewrittenVertexTypes
    >({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer: this.resolvedTreesContainer,
    });
    const bindings = createCallbackBindings<
      InputVertexTypes,
      RewrittenVertexTypes
    >({
      source: bindTreeSource(
        this.icfg.treeDiscoverySource,
        graphContainer,
        'AsyncBreadthFirstTreeRunner',
      ),
      ...(this.icfg.transformChildHintsBeforeResolution === null
        ? {}
        : {
            sortHints: (
              hints: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][],
            ) =>
              this.icfg.transformChildHintsBeforeResolution!(
                hints as InputVertexTypes['ChildHint'][],
              ) as ReturnType<
                NonNullable<
                  typeof this.icfg.transformChildHintsBeforeResolution
                >
              >,
          }),
      visit: {
        [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: (
          call: Extract<
            CallSpec<InputVertexTypes, RewrittenVertexTypes>,
            { kind: 'VISIT' }
          >,
        ) => {
          const order = BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX;
          const registration = this.icfg.visitors[order][call.recordIndex]!;
          return registration.visitor(
            vertexView(call.ref.getReferencedValue()),
            {
              ...call.metadata,
              previousCommittedVisitVertexHandleForSamePhase:
                createVertexHandleFacet(
                  call.metadata.previousCommittedVisitVertexHandleForSamePhase,
                ),
              liveResolvedTreeView: this.getLiveResolvedTreeView(),
              livePreCommandDiscoveredTreeView:
                this.resolvedTreesContainer.livePreCommandDiscoveredTreeView?.getLiveReadOnlyTreeView() ??
                null,
              isTreeRoot: this.isTreeRootVertex(
                createVertexHandleFacet(call.ref),
              ),

              vertexHandle: createVertexHandleFacet(call.ref),
              visitorRegistrationMetadata: registration,
              currentVertexPhaseChainState:
                call.metadata.currentVertexPhaseChainState,
              visitorPhase: order,
            },
          );
        },
      },
    });
    const kernel = new TraversalKernel({
      kind: 'breadth-first',
      execution: 'async',
      sourceMode: 'tree',
      container: graphContainer,
      stateBridge: this.state,
      visitorMetadata: {
        [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: this.icfg.visitors[
          BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX
        ].map(
          ({
            phaseRegistrationInsertionIndex,
            descendingExecutionPriorityWithinGroup:
              descendingExecutionPriorityWithinGroup,

            visitorCommandCommitTiming,
            visitorGroup,
          }) => ({
            phaseRegistrationInsertionIndex,
            descendingExecutionPriorityWithinGroup,

            visitorCommandCommitTiming,
            visitorGroup,
          }),
        ),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasChildHintsListTransformer:
        this.icfg.transformChildHintsBeforeResolution !== null,
      hasChildHintVertexIdResolver: false,
      maxConcurrentCallbackInvocations:
        this.icfg.maxConcurrentCallbackInvocations,
    });
    const driver = createAsyncDriver(
      kernel,
      bindings,
      this.icfg.maxConcurrentCallbackInvocations,
    );
    this.execution = new AsyncRunnerSession(this.projectEvents(driver, kernel));
  }

  getTraversalLifecycleStatus() {
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

  captureExecutionSnapshot(): TreeOrDagExecutionSnapshot<BreadthFirstTreeVisitPhase> {
    return this.execution.captureExecutionSnapshot() as TreeOrDagExecutionSnapshot<BreadthFirstTreeVisitPhase>;
  }

  #getResolvedTreeStore(): MutableResolvedTreeStore<
    InputVertexTypes | RewrittenVertexTypes
  > {
    return this.resolvedTreesContainer.resolvedTree;
  }

  getLiveResolvedTreeView(): LiveResolvedTreeView<
    InputVertexTypes | RewrittenVertexTypes
  > {
    return this.#getResolvedTreeStore().getLiveReadOnlyTreeView();
  }

  getLiveResolvedGraphView(): LiveResolvedGraphView<
    InputVertexTypes | RewrittenVertexTypes
  > {
    return this.#getResolvedTreeStore().getLiveResolvedGraphView();
  }

  isTreeRootVertex(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean {
    return (
      internalRef(ref) ===
      this.#getResolvedTreeStore().getRootVertexReferenceOrNull()
    );
  }

  runAndIterateObservationEventsUntilSuspendedOrTerminal(): AsyncGenerator<
    Event<InputVertexTypes, RewrittenVertexTypes>,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal<
    Kind extends TraversalEventKindForVisitorPhase<BreadthFirstTreeVisitPhase>,
  >(
    config: TraversalExecutionSelectionPatch<
      BreadthFirstTreeVisitPhase,
      Kind
    > & {
      deliveredEventKinds: readonly Kind[];
    },
  ): AsyncGenerator<
    TraversalEventNarrowedToSelectedKinds<
      Event<InputVertexTypes, RewrittenVertexTypes>,
      Kind
    >,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<BreadthFirstTreeVisitPhase>,
  ): AsyncGenerator<
    Event<InputVertexTypes, RewrittenVertexTypes>,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<BreadthFirstTreeVisitPhase>,
  ): AsyncGenerator<
    Event<InputVertexTypes, RewrittenVertexTypes>,
    void,
    unknown
  > {
    return this.execution.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      config,
    );
  }

  async runUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<BreadthFirstTreeVisitPhase>,
  ): Promise<this> {
    await this.execution.runUntilSuspendedOrTerminal(config);
    return this;
  }

  private projectEvents(
    control: AsyncSessionControl<
      KernelEvent<InputVertexTypes | RewrittenVertexTypes>
    >,
    kernel: TraversalKernel<InputVertexTypes, RewrittenVertexTypes>,
  ): AsyncSessionControl<Event<InputVertexTypes, RewrittenVertexTypes>> {
    return {
      advance: (
        mode,
      ): SessionProgress<Event<InputVertexTypes, RewrittenVertexTypes>> => {
        const progress = control.advance(mode);
        if (progress.kind !== 'EVENT') return progress;
        return {
          kind: 'EVENT',
          boundaryId: progress.boundaryId,
          event: {
            vertex: vertexView(progress.event.vertex),
            vertexHandle: createVertexHandleFacet(progress.event.vertexHandle),
            eventKind: progress.event.order as BreadthFirstTreeVisitPhase,
            isTreeRoot: progress.event.isRoot,
          },
        };
      },
      shouldEmitEvent: (event) => kernel.shouldEmit(event.eventKind),
      acknowledgeEvent: (boundaryId) => control.acknowledgeEvent(boundaryId),
      requestHalt: () => control.requestHalt(),
      isHaltRequested: () => control.isHaltRequested(),
      resume: (config) => control.resume(config),
      getTraversalLifecycleStatus: () => control.getTraversalLifecycleStatus(),
      getTraversalStopReason: () => control.getTraversalStopReason(),
      getFailure: () => control.getFailure(),
      captureExecutionSnapshot: () => control.captureExecutionSnapshot(),
      waitForProgress: () => control.waitForProgress(),
    };
  }
}
