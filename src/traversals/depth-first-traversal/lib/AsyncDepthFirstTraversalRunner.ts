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
import type { KernelEvent } from '@core/effects/types';
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
import {
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTreeResolvedOptions,
} from './AsyncDepthFirstTraversalInstanceConfig';
import { DepthFirstTreeVisitPhase } from './DepthFirstTraversalOrder';
import { DepthFirstTraversalResolvedTreesContainer } from './DepthFirstTraversalResolvedTreesContainer';
import { makeEffectiveDepthFirstTraversalRunnerIterableConfig } from './DepthFirstTraversalRunnerIterableConfig';
import { DepthFirstTraversalRunnerState } from './DepthFirstTraversalRunnerState';

type Event<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = TreeTraversalEvent<
  DepthFirstTreeVisitPhase,
  InputVertexTypes,
  RewrittenVertexTypes
>;

export interface AsyncDepthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> extends AsyncTraversalExecution<
    DepthFirstTreeVisitPhase,
    TreeTraversalEvent<
      DepthFirstTreeVisitPhase,
      InputVertexTypes,
      RewrittenVertexTypes
    >,
    TreeOrDagExecutionSnapshot<DepthFirstTreeVisitPhase>
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
  isPendingChildDiscoveryDisabled(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean;
}

export class InternalAsyncDepthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> {
  private icfg: AsyncDepthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private state: DepthFirstTraversalRunnerState<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private readonly execution: AsyncTraversalExecution<
    DepthFirstTreeVisitPhase,
    Event<InputVertexTypes, RewrittenVertexTypes>,
    TreeOrDagExecutionSnapshot
  >;

  constructor(
    icfgInput: AsyncDepthFirstTreeResolvedOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    this.icfg = mergeAsyncDepthFirstTraversalInstanceConfigs(icfgInput, {});
    this.icfg.visitors = Object.fromEntries(
      Object.entries(this.icfg.visitors).map(([order, records]) => [
        order,
        records.map((record) => ({ ...record })),
      ]),
    ) as typeof this.icfg.visitors;
    this.state = new DepthFirstTraversalRunnerState(this.icfg);
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer(
      this.icfg,
    );
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
        'AsyncDepthFirstTreeRunner',
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
      visit: Object.fromEntries(
        Object.values(DepthFirstTreeVisitPhase).map((order) => [
          order,
          (
            call: Extract<
              import('@core/effects/types').CallSpec<
                InputVertexTypes,
                RewrittenVertexTypes
              >,
              { kind: 'VISIT' }
            >,
          ) => {
            const registration = this.icfg.visitors[order][call.recordIndex]!;
            return registration.visitor(
              vertexView(call.ref.getReferencedValue()),
              {
                ...call.metadata,
                previousCommittedVisitVertexHandleForSamePhase:
                  createVertexHandleFacet(
                    call.metadata
                      .previousCommittedVisitVertexHandleForSamePhase,
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
                // The record and options share the same visitorPhase selected above.
              } as never,
            );
          },
        ]),
      ),
    });
    const iterableConfig =
      makeEffectiveDepthFirstTraversalRunnerIterableConfig();
    const kernel = new TraversalKernel({
      kind: 'depth-first',
      execution: 'async',
      sourceMode: 'tree',
      container: graphContainer,
      stateBridge: this.state,
      visitorMetadata: Object.fromEntries(
        Object.entries(this.icfg.visitors).map(([order, records]) => [
          order,
          records.map(
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
        ]),
      ),
      iterableConfig,
      inOrderConfig: this.icfg.childBoundaryVisits,
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

  captureExecutionSnapshot(): TreeOrDagExecutionSnapshot<DepthFirstTreeVisitPhase> {
    return this.execution.captureExecutionSnapshot() as TreeOrDagExecutionSnapshot<DepthFirstTreeVisitPhase>;
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

  isPendingChildDiscoveryDisabled(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean {
    return this.state.subtreeTraversalDisabledRefs.has(internalRef(ref));
  }

  runAndIterateObservationEventsUntilSuspendedOrTerminal(): AsyncGenerator<
    Event<InputVertexTypes, RewrittenVertexTypes>,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal<
    Kind extends TraversalEventKindForVisitorPhase<DepthFirstTreeVisitPhase>,
  >(
    config: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase, Kind> & {
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
    config?: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase>,
  ): AsyncGenerator<
    Event<InputVertexTypes, RewrittenVertexTypes>,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase>,
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
    config?: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase>,
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
            eventKind: progress.event.order as DepthFirstTreeVisitPhase,
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
