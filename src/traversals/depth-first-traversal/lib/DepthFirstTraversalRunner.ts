import {
  createVertexHandleFacet,
  vertexView,
  internalRef,
} from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeOrDagExecutionSnapshot } from '@core/CoreInspection';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import type { CallbackBindings } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { LiveResolvedGraphView } from '@core/ResolvedGraphView';
import type { MutableResolvedTreeStore } from '@core/ResolvedTree';
import type { LiveResolvedTreeView } from '@core/ResolvedTreeView';
import type {
  TraversalEventNarrowedToSelectedKinds,
  SyncTraversalExecution,
} from '@core/TraversalExecution';
import { TraversalKernel } from '@core/TraversalKernel';
import type {
  TraversalStopReason,
  TreeTraversalEvent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type {
  TraversalEventKindForVisitorPhase,
  TraversalExecutionSelectionPatch,
} from '@core/TraversalRunnerIterableConfig';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { deepFreeze } from '@utils/deepFreeze';
import { initVisitors } from '../init-helpers/initVisitors';
import {
  mergeInstanceConfigs,
  type DepthFirstTreeResolvedOptions,
} from './DepthFirstTraversalInstanceConfig';
import { DepthFirstTreeVisitPhase } from './DepthFirstTraversalOrder';
import { DepthFirstTraversalResolvedTreesContainer } from './DepthFirstTraversalResolvedTreesContainer';
import {
  makeEffectiveDepthFirstTraversalRunnerIterableConfig,
  type DepthFirstTraversalRunnerIterableConfig,
} from './DepthFirstTraversalRunnerIterableConfig';
import { DepthFirstTraversalRunnerState } from './DepthFirstTraversalRunnerState';

type Event<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = TreeTraversalEvent<
  DepthFirstTreeVisitPhase,
  InputVertexTypes,
  RewrittenVertexTypes
>;

export interface DepthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> extends SyncTraversalExecution<
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
  hasSkippedPendingChildDiscovery(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean;
}

export class InternalDepthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> implements DepthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>
{
  private icfg: DepthFirstTreeResolvedOptions<
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
  private curGenerator: Generator<Event<
    InputVertexTypes,
    RewrittenVertexTypes
  > | null> | null = null;
  private iterableConfig: DepthFirstTraversalRunnerIterableConfig =
    makeEffectiveDepthFirstTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private readonly runtimeState: SyncDriverState = {
    inFlightInvocationCount: 0,
  };
  private readonly kernel: TraversalKernel<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private readonly bindings: CallbackBindings<
    InputVertexTypes,
    RewrittenVertexTypes
  >;

  constructor(
    icfgInput: DepthFirstTreeResolvedOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    this.icfg = {
      ...mergeInstanceConfigs(icfgInput, {}),
      visitors: initVisitors(icfgInput),
    };
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
    this.bindings = createCallbackBindings<
      InputVertexTypes,
      RewrittenVertexTypes
    >({
      source: bindTreeSource(
        this.icfg.treeDiscoverySource,
        graphContainer,
        'DepthFirstTreeRunner',
      ),
      ...(this.icfg.transformChildHintsBeforeResolution === null
        ? {}
        : {
            sortHints: (
              hints: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][],
            ) =>
              this.icfg.transformChildHintsBeforeResolution!(
                hints as InputVertexTypes['ChildHint'][],
              ) as (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][],
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
                preCommandDiscoveredTreeView:
                  this.resolvedTreesContainer.preCommandDiscoveredTreeView?.getLiveReadOnlyTreeView() ??
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
    this.kernel = new TraversalKernel({
      kind: 'depth-first',
      execution: 'sync',
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
      iterableConfig: this.iterableConfig,
      inOrderConfig: this.icfg.childBoundaryVisits,
      hasChildHintsListTransformer:
        this.icfg.transformChildHintsBeforeResolution !== null,
      hasChildHintVertexIdResolver: false,
      maxConcurrentCallbackInvocations: 1,
    });
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

  captureExecutionSnapshot(): TreeOrDagExecutionSnapshot<DepthFirstTreeVisitPhase> {
    return deepFreeze({
      ...this.kernel.captureExecutionSnapshot(),
      inFlightInvocationCount: this.runtimeState.inFlightInvocationCount,
      bufferedDeliveryEventCount: 0,
    }) as TreeOrDagExecutionSnapshot<DepthFirstTreeVisitPhase>;
  }

  isTreeRootVertex(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean {
    return (
      internalRef(ref) ===
      this.#getResolvedTreeStore().getRootVertexReferenceOrNull()
    );
  }

  hasSkippedPendingChildDiscovery(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean {
    return this.state.subtreeTraversalDisabledRefs.has(internalRef(ref));
  }

  private *getInternalGenerator(): Generator<Event<
    InputVertexTypes,
    RewrittenVertexTypes
  > | null> {
    for (const event of runSync(
      this.kernel,
      this.bindings,
      this.runtimeState,
      'DepthFirstTreeRunner',
    )) {
      if (event === null) yield null;
      else
        yield {
          vertex: vertexView(event.vertex),
          vertexHandle: createVertexHandleFacet(event.vertexHandle),
          eventKind: event.order as DepthFirstTreeVisitPhase,
          isTreeRoot: event.isRoot,
        };
    }
  }

  runAndIterateObservationEventsUntilSuspendedOrTerminal(): Generator<
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
  ): Generator<
    TraversalEventNarrowedToSelectedKinds<
      Event<InputVertexTypes, RewrittenVertexTypes>,
      Kind
    >,
    void,
    unknown
  >;
  runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase>,
  ): Generator<Event<InputVertexTypes, RewrittenVertexTypes>, void, unknown>;
  *runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase>,
  ): Generator<Event<InputVertexTypes, RewrittenVertexTypes>, void, unknown> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator)
      throw new Error('A traversal runner can only have one active iterator');
    if (this.getTraversalLifecycleStatus() === TraversalRunnerStatus.FINISHED)
      return;
    this.kernel.resume(config);
    if (this.curGenerator === null)
      this.curGenerator = this.getInternalGenerator();
    this.activeIterator = true;
    this.state.status = TraversalRunnerStatus.RUNNING;
    try {
      while (true) {
        let next: IteratorResult<Event<
          InputVertexTypes,
          RewrittenVertexTypes
        > | null>;
        try {
          next = this.curGenerator.next();
        } catch (error) {
          this.failure = { error };
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
    }
  }

  runUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<DepthFirstTreeVisitPhase>,
  ): this {
    for (const _event of this.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      config,
    )) {
      /* Drain traversal events. */
    }
    return this;
  }
}
