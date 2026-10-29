import { vertexHandle, vertexView, internalRef } from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeDagExecutionInspection } from '@core/CoreInspection';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import type { CallbackBindings } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { ResolvedGraphView } from '@core/ResolvedGraphView';
import type { ResolvedTreeStore } from '@core/ResolvedTree';
import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import type {
  SelectedTraversalEvent,
  SyncTraversalExecution,
} from '@core/TraversalExecution';
import { TraversalKernel } from '@core/TraversalKernel';
import type {
  TraversalStopReason,
  TreeTraversalEvent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type {
  EmissionKind,
  TraversalExecutionOptions,
} from '@core/TraversalRunnerIterableConfig';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { deepFreeze } from '@utils/deepFreeze';
import { initVisitors } from '../init-helpers/initVisitors';
import {
  mergeInstanceConfigs,
  type DepthFirstTreeResolvedOptions,
} from './DepthFirstTraversalInstanceConfig';
import { DepthFirstPhase } from './DepthFirstTraversalOrder';
import { DepthFirstTraversalResolvedTreesContainer } from './DepthFirstTraversalResolvedTreesContainer';
import {
  makeEffectiveDepthFirstTraversalRunnerIterableConfig,
  type DepthFirstTraversalRunnerIterableConfig,
} from './DepthFirstTraversalRunnerIterableConfig';
import { DepthFirstTraversalRunnerState } from './DepthFirstTraversalRunnerState';

type Event<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = TreeTraversalEvent<DepthFirstPhase, TTP, RW_TTP>;

export interface DepthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> extends SyncTraversalExecution<
    DepthFirstPhase,
    TreeTraversalEvent<DepthFirstPhase, TTP, RW_TTP>,
    TreeDagExecutionInspection<DepthFirstPhase>
  > {
  getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
  getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
  isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
  isTraversalLeaf(ref: VertexHandle<TTP | RW_TTP>): boolean;
}

export class InternalDepthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> implements DepthFirstTreeRunner<TTP, RW_TTP>
{
  private icfg: DepthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private state: DepthFirstTraversalRunnerState<TTP, RW_TTP>;
  private resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  private curGenerator: Generator<Event<TTP, RW_TTP> | null> | null = null;
  private iterableConfig: DepthFirstTraversalRunnerIterableConfig =
    makeEffectiveDepthFirstTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private readonly runtimeState: SyncDriverState = {
    inFlightCallbackCount: 0,
  };
  private readonly kernel: TraversalKernel<TTP, RW_TTP>;
  private readonly bindings: CallbackBindings<TTP, RW_TTP>;

  constructor(icfgInput: DepthFirstTreeResolvedOptions<TTP, RW_TTP>) {
    this.icfg = {
      ...mergeInstanceConfigs(icfgInput, {}),
      visitors: initVisitors(icfgInput),
    };
    this.state = new DepthFirstTraversalRunnerState(this.icfg);
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer(
      this.icfg,
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
        'DepthFirstTreeRunner',
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
      visit: Object.fromEntries(
        Object.values(DepthFirstPhase).map((order) => [
          order,
          (
            call: Extract<
              import('@core/effects/types').CallSpec<TTP, RW_TTP>,
              { kind: 'VISIT' }
            >,
          ) => {
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
              // The record and options share the same phase selected above.
            } as never);
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
        ]),
      ),
      iterableConfig: this.iterableConfig,
      inOrderConfig: this.icfg.inOrder,
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

  inspect(): TreeDagExecutionInspection<DepthFirstPhase> {
    return deepFreeze({
      ...this.kernel.inspect(),
      inFlightCallbackCount: this.runtimeState.inFlightCallbackCount,
      bufferedEventCount: 0,
    }) as TreeDagExecutionInspection<DepthFirstPhase>;
  }

  isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean {
    return internalRef(ref) === this.#getResolvedTreeStore().getRoot();
  }

  isTraversalLeaf(ref: VertexHandle<TTP | RW_TTP>): boolean {
    return (
      this.state.subtreeTraversalDisabledRefs.has(internalRef(ref)) ||
      ref.getValue().hasNoChildHints()
    );
  }

  private *getInternalGenerator(): Generator<Event<TTP, RW_TTP> | null> {
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
          vertexRef: vertexHandle(event.vertexRef),
          phase: event.order as DepthFirstPhase,
          isTreeRoot: event.isRoot,
        };
    }
  }

  iterateEvents(): Generator<Event<TTP, RW_TTP>, void, unknown>;
  iterateEvents<Kind extends EmissionKind<DepthFirstPhase>>(
    config: TraversalExecutionOptions<DepthFirstPhase, Kind> & {
      emitEvents: readonly Kind[];
    },
  ): Generator<SelectedTraversalEvent<Event<TTP, RW_TTP>, Kind>, void, unknown>;
  iterateEvents(
    config?: TraversalExecutionOptions<DepthFirstPhase>,
  ): Generator<Event<TTP, RW_TTP>, void, unknown>;
  *iterateEvents(
    config?: TraversalExecutionOptions<DepthFirstPhase>,
  ): Generator<Event<TTP, RW_TTP>, void, unknown> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator)
      throw new Error('A traversal runner can only have one active iterator');
    if (this.getStatus() === TraversalRunnerStatus.FINISHED) return;
    this.kernel.resume(config);
    if (this.curGenerator === null)
      this.curGenerator = this.getInternalGenerator();
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

  run(config?: TraversalExecutionOptions<DepthFirstPhase>): this {
    for (const _event of this.iterateEvents(config)) {
      /* Drain traversal events. */
    }
    return this;
  }
}
