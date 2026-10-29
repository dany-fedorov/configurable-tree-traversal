import { vertexHandle, vertexView, internalRef } from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeDagExecutionInspection } from '@core/CoreInspection';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import type { CallbackBindings, CallSpec } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { ResolvedGraphView } from '@core/ResolvedGraphView';
import type { ResolvedTreeStore } from '@core/ResolvedTree';
import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import type { SyncTraversalExecution } from '@core/TraversalExecution';
import { TraversalKernel } from '@core/TraversalKernel';
import type {
  TraversalStopReason,
  TreeTraversalEvent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TraversalExecutionOptions } from '@core/TraversalRunnerIterableConfig';
import type { VertexTypes } from '@core/TreeTypeParameters';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { deepFreeze } from '@utils/deepFreeze';
import { initBreadthFirstVisitors } from '../init-helpers/initVisitors';
import type { BreadthFirstTreeResolvedOptions } from './BreadthFirstTraversalInstanceConfig';
import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';
import {
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
  type BreadthFirstTraversalRunnerIterableConfig,
} from './BreadthFirstTraversalRunnerIterableConfig';
import { BreadthFirstTraversalRunnerState } from './BreadthFirstTraversalRunnerState';

type Event<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = TreeTraversalEvent<BreadthFirstPhase, TTP, RW_TTP>;

export interface BreadthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> extends SyncTraversalExecution<
    BreadthFirstPhase,
    TreeTraversalEvent<BreadthFirstPhase, TTP, RW_TTP>,
    TreeDagExecutionInspection<BreadthFirstPhase>
  > {
  getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
  getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
  isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
}

export class InternalBreadthFirstTreeRunner<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> implements BreadthFirstTreeRunner<TTP, RW_TTP>
{
  private icfg: BreadthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private state: BreadthFirstTraversalRunnerState<TTP, RW_TTP>;
  private resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  private curGenerator: Generator<Event<TTP, RW_TTP> | null> | null = null;

  private iterableConfig: BreadthFirstTraversalRunnerIterableConfig =
    makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private readonly runtimeState: SyncDriverState = {
    inFlightCallbackCount: 0,
  };
  private readonly kernel: TraversalKernel<TTP, RW_TTP>;
  private readonly bindings: CallbackBindings<TTP, RW_TTP>;

  constructor(icfgInput: BreadthFirstTreeResolvedOptions<TTP, RW_TTP>) {
    this.icfg = { ...icfgInput, visitors: initBreadthFirstVisitors(icfgInput) };
    this.state = new BreadthFirstTraversalRunnerState(
      icfgInput.traversalRunnerInternalObjects.state,
    );
    const resolvedTreeConfig = {
      ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
      traversableTree: icfgInput.traversableTree,
      retainOriginalTreeStructure: icfgInput.retainOriginalTreeStructure,
      traversalRunnerInternalObjects: {
        ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.traversalRunnerInternalObjects,
        resolvedTreesContainer:
          icfgInput.traversalRunnerInternalObjects.resolvedTreesContainer,
      },
    } as unknown as DepthFirstTreeResolvedOptions<TTP, RW_TTP>;
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer(
      resolvedTreeConfig,
    );
    const graphContainer = new ResolvedGraphsContainer<TTP, RW_TTP>({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer: this.resolvedTreesContainer,
    });
    this.bindings = createCallbackBindings<TTP, RW_TTP>({
      source: bindTreeSource(
        this.icfg.traversableTree,
        graphContainer,
        'BreadthFirstTreeRunner',
      ),
      ...(this.icfg.sortChildrenHints === null
        ? {}
        : {
            sortHints: (hints: (TTP | RW_TTP)['VertexHint'][]) =>
              this.icfg.sortChildrenHints!(hints as TTP['VertexHint'][]) as (
                | TTP
                | RW_TTP
              )['VertexHint'][],
          }),
      visit: {
        [BreadthFirstPhase.LEVEL_ORDER]: (
          call: Extract<CallSpec<TTP, RW_TTP>, { kind: 'VISIT' }>,
        ) => {
          const order = BreadthFirstPhase.LEVEL_ORDER;
          const registration = this.icfg.visitors[order][call.recordIndex]!;
          return registration.visitor(vertexView(call.ref.getValue()), {
            ...call.metadata,
            previousPhaseVertexRef: vertexHandle(
              call.metadata.previousPhaseVertexRef,
            ),
            resolvedTreeView: this.getResolvedTreeView(),
            originalTreeView:
              this.resolvedTreesContainer.originalTreeView?.asReadOnly() ??
              null,
            isTreeRoot: this.isTreeRootVertex(call.ref),

            vertexRef: vertexHandle(call.ref),
            registration,
            visitorChainState: call.metadata.visitorChainState,
            phase: order,
          });
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
        [BreadthFirstPhase.LEVEL_ORDER]: this.icfg.visitors[
          BreadthFirstPhase.LEVEL_ORDER
        ].map(
          ({
            addedIndex,
            priority,

            commandCommitMode,
            visitorGroup,
          }) => ({
            addedIndex,
            priority,

            commandCommitMode,
            visitorGroup,
          }),
        ),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasSorter: this.icfg.sortChildrenHints !== null,
      hasHintIds: false,
      concurrency: 1,
    });
  }

  getStatus(): TraversalRunnerStatus {
    return this.state.status;
  }

  getStopReason(): TraversalStopReason | null {
    return this.kernel.getStopReason();
  }

  requestPause(): boolean {
    if (
      this.getStatus() !== TraversalRunnerStatus.RUNNING ||
      this.kernel.isHaltRequested()
    )
      return false;
    this.kernel.requestHalt();
    return true;
  }

  isHalted(): boolean {
    return this.getStatus() === TraversalRunnerStatus.HALTED;
  }

  #getResolvedTreeStore(): ResolvedTreeStore<TTP | RW_TTP> {
    return this.resolvedTreesContainer.resolvedTree;
  }

  getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP> {
    return this.#getResolvedTreeStore().asReadOnly();
  }

  getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP> {
    return this.#getResolvedTreeStore().getResolvedGraphView();
  }

  inspect(): TreeDagExecutionInspection<BreadthFirstPhase> {
    return deepFreeze({
      ...this.kernel.inspect(),
      inFlightCallbackCount: this.runtimeState.inFlightCallbackCount,
      bufferedEventCount: 0,
    }) as TreeDagExecutionInspection<BreadthFirstPhase>;
  }

  isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean {
    return internalRef(ref) === this.#getResolvedTreeStore().getRoot();
  }

  private *getInternalGenerator(): Generator<Event<TTP, RW_TTP> | null> {
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
          vertexRef: vertexHandle(event.vertexRef),
          phase: event.order as BreadthFirstPhase,
          isTreeRoot: event.isRoot,
        };
    }
  }

  *iterateEvents(
    config?: TraversalExecutionOptions<BreadthFirstPhase>,
  ): Generator<Event<TTP, RW_TTP>, void, unknown> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    if (this.getStatus() === TraversalRunnerStatus.FINISHED) return;
    this.kernel.resume(config);
    if (this.curGenerator === null) {
      this.curGenerator = this.getInternalGenerator();
    }
    this.activeIterator = true;
    this.state.status = TraversalRunnerStatus.RUNNING;
    try {
      while (true) {
        let next: IteratorResult<Event<TTP, RW_TTP> | null>;
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
        if (this.isHalted() || next.value === null) return;
        yield next.value;
      }
    } finally {
      this.activeIterator = false;
      if (this.getStatus() === TraversalRunnerStatus.RUNNING) {
        this.kernel.requestHalt();
        this.state.status = TraversalRunnerStatus.HALTED;
      }
    }
  }

  run(config?: TraversalExecutionOptions<BreadthFirstPhase>): this {
    for (const _event of this.iterateEvents(config)) {
      /* Drain traversal events. */
    }
    return this;
  }
}
