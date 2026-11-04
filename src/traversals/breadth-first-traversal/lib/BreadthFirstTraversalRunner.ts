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
import type { CallbackBindings, CallSpec } from '@core/effects/types';
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
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { deepFreeze } from '@utils/deepFreeze';
import { initBreadthFirstVisitors } from '../init-helpers/initVisitors';
import type { BreadthFirstTreeResolvedOptions } from './BreadthFirstTraversalInstanceConfig';
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

export interface BreadthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> extends SyncTraversalExecution<
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

export class InternalBreadthFirstTreeRunner<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> implements BreadthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>
{
  private icfg: BreadthFirstTreeResolvedOptions<
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
  private curGenerator: Generator<Event<
    InputVertexTypes,
    RewrittenVertexTypes
  > | null> | null = null;

  private iterableConfig: BreadthFirstTraversalRunnerIterableConfig =
    makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
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
    icfgInput: BreadthFirstTreeResolvedOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    this.icfg = { ...icfgInput, visitors: initBreadthFirstVisitors(icfgInput) };
    this.state = new BreadthFirstTraversalRunnerState(
      icfgInput.traversalRunnerInternalObjects.state,
    );
    const resolvedTreeConfig = {
      ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
      treeDiscoverySource: icfgInput.treeDiscoverySource,
      retainDiscoveredTreeBeforeVisitorCommands:
        icfgInput.retainDiscoveredTreeBeforeVisitorCommands,
      traversalRunnerInternalObjects: {
        ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.traversalRunnerInternalObjects,
        resolvedTreesContainer:
          icfgInput.traversalRunnerInternalObjects.resolvedTreesContainer,
      },
    } as unknown as DepthFirstTreeResolvedOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >;
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer(
      resolvedTreeConfig,
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
        'BreadthFirstTreeRunner',
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
    this.kernel = new TraversalKernel({
      kind: 'breadth-first',
      execution: 'sync',
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

  captureExecutionSnapshot(): TreeOrDagExecutionSnapshot<BreadthFirstTreeVisitPhase> {
    return deepFreeze({
      ...this.kernel.captureExecutionSnapshot(),
      inFlightInvocationCount: this.runtimeState.inFlightInvocationCount,
      bufferedDeliveryEventCount: 0,
    }) as TreeOrDagExecutionSnapshot<BreadthFirstTreeVisitPhase>;
  }

  isTreeRootVertex(
    ref: VertexHandle<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean {
    return (
      internalRef(ref) ===
      this.#getResolvedTreeStore().getRootVertexReferenceOrNull()
    );
  }

  private *getInternalGenerator(): Generator<Event<
    InputVertexTypes,
    RewrittenVertexTypes
  > | null> {
    for (const event of runSync(
      this.kernel,
      this.bindings,
      this.runtimeState,
      'BreadthFirstTreeRunner',
    )) {
      if (event === null) yield null;
      else
        yield {
          vertex: vertexView(event.vertex),
          vertexHandle: createVertexHandleFacet(event.vertexHandle),
          eventKind: event.order as BreadthFirstTreeVisitPhase,
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
    Kind extends TraversalEventKindForVisitorPhase<BreadthFirstTreeVisitPhase>,
  >(
    config: TraversalExecutionSelectionPatch<
      BreadthFirstTreeVisitPhase,
      Kind
    > & {
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
    config?: TraversalExecutionSelectionPatch<BreadthFirstTreeVisitPhase>,
  ): Generator<Event<InputVertexTypes, RewrittenVertexTypes>, void, unknown>;
  *runAndIterateObservationEventsUntilSuspendedOrTerminal(
    config?: TraversalExecutionSelectionPatch<BreadthFirstTreeVisitPhase>,
  ): Generator<Event<InputVertexTypes, RewrittenVertexTypes>, void, unknown> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    if (this.getTraversalLifecycleStatus() === TraversalRunnerStatus.FINISHED)
      return;
    this.kernel.resume(config);
    if (this.curGenerator === null) {
      this.curGenerator = this.getInternalGenerator();
    }
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
    config?: TraversalExecutionSelectionPatch<BreadthFirstTreeVisitPhase>,
  ): this {
    for (const _event of this.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      config,
    )) {
      /* Drain traversal events. */
    }
    return this;
  }
}
