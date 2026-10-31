import { vertexHandle, vertexView, internalRef } from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeDagExecutionInspection } from '@core/CoreInspection';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { KernelEvent } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
import type { ResolvedGraphView } from '@core/ResolvedGraphView';
import type { ResolvedTreeStore } from '@core/ResolvedTree';
import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import type {
  SelectedTraversalEvent,
  AsyncTraversalExecution,
} from '@core/TraversalExecution';
import { TraversalKernel } from '@core/TraversalKernel';
import type {
  TraversalStopReason,
  TreeTraversalEvent,
} from '@core/TraversalRunner';
import type {
  EmissionKind,
  TraversalExecutionOptions,
} from '@core/TraversalRunnerIterableConfig';
import type { VertexTypes } from '@core/TreeTypeParameters';
import {
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTreeResolvedOptions,
} from './AsyncDepthFirstTraversalInstanceConfig';
import { DepthFirstPhase } from './DepthFirstTraversalOrder';
import { DepthFirstTraversalResolvedTreesContainer } from './DepthFirstTraversalResolvedTreesContainer';
import { makeEffectiveDepthFirstTraversalRunnerIterableConfig } from './DepthFirstTraversalRunnerIterableConfig';
import { DepthFirstTraversalRunnerState } from './DepthFirstTraversalRunnerState';

type Event<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = TreeTraversalEvent<DepthFirstPhase, TTP, RW_TTP>;

export interface AsyncDepthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> extends AsyncTraversalExecution<
    DepthFirstPhase,
    TreeTraversalEvent<DepthFirstPhase, TTP, RW_TTP>,
    TreeDagExecutionInspection<DepthFirstPhase>
  > {
  getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
  getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
  isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
  isChildExpansionSkipped(ref: VertexHandle<TTP | RW_TTP>): boolean;
}

export class InternalAsyncDepthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> {
  private icfg: AsyncDepthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private state: DepthFirstTraversalRunnerState<TTP, RW_TTP>;
  private resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  private readonly execution: AsyncTraversalExecution<
    DepthFirstPhase,
    Event<TTP, RW_TTP>,
    TreeDagExecutionInspection
  >;

  constructor(icfgInput: AsyncDepthFirstTreeResolvedOptions<TTP, RW_TTP>) {
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
    const graphContainer = new ResolvedGraphsContainer<TTP, RW_TTP>({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer: this.resolvedTreesContainer,
    });
    const bindings = createCallbackBindings<TTP, RW_TTP>({
      source: bindTreeSource(
        this.icfg.traversableTree,
        graphContainer,
        'AsyncDepthFirstTreeRunner',
      ),
      ...(this.icfg.transformChildHints === null
        ? {}
        : {
            sortHints: (hints: (TTP | RW_TTP)['VertexHint'][]) =>
              this.icfg.transformChildHints!(
                hints as TTP['VertexHint'][],
              ) as ReturnType<
                NonNullable<typeof this.icfg.transformChildHints>
              >,
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
      iterableConfig,
      inOrderConfig: this.icfg.inOrder,
      hasHintTransformer: this.icfg.transformChildHints !== null,
      hasHintIds: false,
      concurrency: this.icfg.concurrency,
    });
    const driver = createAsyncDriver(kernel, bindings, this.icfg.concurrency);
    this.execution = new AsyncRunnerSession(this.projectEvents(driver, kernel));
  }

  getStatus() {
    return this.execution.getStatus();
  }

  getStopReason(): TraversalStopReason | null {
    return this.execution.getStopReason();
  }

  requestPause(): boolean {
    return this.execution.requestPause();
  }

  isHalted(): boolean {
    return this.execution.isHalted();
  }

  inspect(): TreeDagExecutionInspection<DepthFirstPhase> {
    return this.execution.inspect() as TreeDagExecutionInspection<DepthFirstPhase>;
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

  isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean {
    return internalRef(ref) === this.#getResolvedTreeStore().getRoot();
  }

  isChildExpansionSkipped(ref: VertexHandle<TTP | RW_TTP>): boolean {
    return this.state.subtreeTraversalDisabledRefs.has(internalRef(ref));
  }

  iterateEvents(): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown>;
  iterateEvents<Kind extends EmissionKind<DepthFirstPhase>>(
    config: TraversalExecutionOptions<DepthFirstPhase, Kind> & {
      emitEvents: readonly Kind[];
    },
  ): AsyncGenerator<
    SelectedTraversalEvent<Event<TTP, RW_TTP>, Kind>,
    void,
    unknown
  >;
  iterateEvents(
    config?: TraversalExecutionOptions<DepthFirstPhase>,
  ): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown>;
  iterateEvents(
    config?: TraversalExecutionOptions<DepthFirstPhase>,
  ): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown> {
    return this.execution.iterateEvents(config);
  }

  async run(
    config?: TraversalExecutionOptions<DepthFirstPhase>,
  ): Promise<this> {
    await this.execution.run(config);
    return this;
  }

  private projectEvents(
    control: AsyncSessionControl<KernelEvent<TTP | RW_TTP>>,
    kernel: TraversalKernel<TTP, RW_TTP>,
  ): AsyncSessionControl<Event<TTP, RW_TTP>> {
    return {
      advance: (mode): SessionProgress<Event<TTP, RW_TTP>> => {
        const progress = control.advance(mode);
        if (progress.kind !== 'EVENT') return progress;
        return {
          kind: 'EVENT',
          boundaryId: progress.boundaryId,
          event: {
            vertex: vertexView(progress.event.vertex),
            vertexRef: vertexHandle(progress.event.vertexRef),
            phase: progress.event.order as DepthFirstPhase,
            isTreeRoot: progress.event.isRoot,
          },
        };
      },
      shouldEmitEvent: (event) => kernel.shouldEmit(event.phase),
      acknowledgeEvent: (boundaryId) => control.acknowledgeEvent(boundaryId),
      requestHalt: () => control.requestHalt(),
      isHaltRequested: () => control.isHaltRequested(),
      resume: (config) => control.resume(config),
      getStatus: () => control.getStatus(),
      getStopReason: () => control.getStopReason(),
      getFailure: () => control.getFailure(),
      inspect: () => control.inspect(),
      waitForProgress: () => control.waitForProgress(),
    };
  }
}
