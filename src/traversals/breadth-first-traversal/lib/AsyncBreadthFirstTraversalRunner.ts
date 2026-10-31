import { vertexHandle, vertexView, internalRef } from '@core/observationFacets';
import type { VertexHandle } from '@core/CTTRef';
import type { TreeDagExecutionInspection } from '@core/CoreInspection';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { CallSpec, KernelEvent } from '@core/effects/types';
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
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import {
  mergeAsyncBreadthFirstTraversalInstanceConfigs,
  type AsyncBreadthFirstTreeResolvedOptions,
} from './AsyncBreadthFirstTraversalInstanceConfig';
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

export interface AsyncBreadthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> extends AsyncTraversalExecution<
    BreadthFirstPhase,
    TreeTraversalEvent<BreadthFirstPhase, TTP, RW_TTP>,
    TreeDagExecutionInspection<BreadthFirstPhase>
  > {
  getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP>;
  getResolvedGraphView(): ResolvedGraphView<TTP | RW_TTP>;
  isTreeRootVertex(ref: VertexHandle<TTP | RW_TTP>): boolean;
}

export class InternalAsyncBreadthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> {
  private icfg: AsyncBreadthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private state: BreadthFirstTraversalRunnerState<TTP, RW_TTP>;
  private resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  private iterableConfig: BreadthFirstTraversalRunnerIterableConfig =
    makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
  private readonly execution: AsyncTraversalExecution<
    BreadthFirstPhase,
    Event<TTP, RW_TTP>,
    TreeDagExecutionInspection
  >;

  constructor(icfgInput: AsyncBreadthFirstTreeResolvedOptions<TTP, RW_TTP>) {
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
      retainOriginalTreeStructure: this.icfg.retainOriginalTreeStructure,
      traversalRunnerInternalObjects: {
        resolvedTreesContainer:
          this.icfg.traversalRunnerInternalObjects.resolvedTreesContainer,
      },
    };
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer<
      TTP,
      RW_TTP
    >(resolvedTreeConfig);
    const graphContainer = new ResolvedGraphsContainer<TTP, RW_TTP>({
      sourceMode: 'tree',
      saveOriginal: false,
      treeContainer: this.resolvedTreesContainer,
    });
    const bindings = createCallbackBindings<TTP, RW_TTP>({
      source: bindTreeSource(
        this.icfg.traversableTree,
        graphContainer,
        'AsyncBreadthFirstTreeRunner',
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
    const kernel = new TraversalKernel({
      kind: 'breadth-first',
      execution: 'async',
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

  inspect(): TreeDagExecutionInspection<BreadthFirstPhase> {
    return this.execution.inspect() as TreeDagExecutionInspection<BreadthFirstPhase>;
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

  iterateEvents(): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown>;
  iterateEvents<Kind extends EmissionKind<BreadthFirstPhase>>(
    config: TraversalExecutionOptions<BreadthFirstPhase, Kind> & {
      emitEvents: readonly Kind[];
    },
  ): AsyncGenerator<
    SelectedTraversalEvent<Event<TTP, RW_TTP>, Kind>,
    void,
    unknown
  >;
  iterateEvents(
    config?: TraversalExecutionOptions<BreadthFirstPhase>,
  ): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown>;
  iterateEvents(
    config?: TraversalExecutionOptions<BreadthFirstPhase>,
  ): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown> {
    return this.execution.iterateEvents(config);
  }

  async run(
    config?: TraversalExecutionOptions<BreadthFirstPhase>,
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
            phase: progress.event.order as BreadthFirstPhase,
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
