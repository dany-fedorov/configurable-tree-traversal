import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import type { TraversalStopReason } from '@core/TraversalRunner';
import type { AsyncCoreExecution } from '@core/AsyncCoreExecution';
import type { CoreInspection } from '@core/CoreInspection';
import type { CTTRef } from '@core/CTTRef';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { CallSpec, KernelEvent } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { ResolvedTree } from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TreeTraversalEvent } from '@core/TraversalRunner';
import { TraversalKernel } from '@core/TraversalKernel';
import type { Vertex } from '@core/Vertex';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import {
  mergeAsyncBreadthFirstTraversalInstanceConfigs,
  type AsyncBreadthFirstTraversalInstanceConfig,
} from './AsyncBreadthFirstTraversalInstanceConfig';
import { BreadthFirstPhase } from './BreadthFirstTraversalOrder';
import {
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
  type BreadthFirstTraversalRunnerIterableConfig,
  type BreadthFirstTraversalRunnerIterableConfigInput,
} from './BreadthFirstTraversalRunnerIterableConfig';
import { BreadthFirstTraversalRunnerState } from './BreadthFirstTraversalRunnerState';

type Event<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = TreeTraversalEvent<
  BreadthFirstPhase,
  TTP,
  RW_TTP
>;

export class AsyncBreadthFirstTreeRunner<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> {
  icfg: AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  state: BreadthFirstTraversalRunnerState<TTP, RW_TTP>;
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  private iterableConfig: BreadthFirstTraversalRunnerIterableConfig =
    makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
  private readonly execution: AsyncCoreExecution<
    Event<TTP, RW_TTP>,
    BreadthFirstPhase
  >;

  constructor(
    icfgInput: AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>,
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
      saveNotMutatedResolvedTree: this.icfg.saveNotMutatedResolvedTree,
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
      ...(this.icfg.sortChildrenHints === null
        ? {}
        : {
            sortHints: (hints: (TTP | RW_TTP)['VertexHint'][]) =>
              this.icfg.sortChildrenHints!(
                hints as TTP['VertexHint'][],
              ) as ReturnType<NonNullable<typeof this.icfg.sortChildrenHints>>,
          }),
      visit: {
        [BreadthFirstPhase.LEVEL_ORDER]: (
          call: Extract<CallSpec<TTP, RW_TTP>, { kind: 'VISIT' }>,
        ) => {
          const order = BreadthFirstPhase.LEVEL_ORDER;
          const registration = this.icfg.visitors[order][call.recordIndex]!;
          return registration.visitor(call.ref.unref(), {
            ...call.metadata,
            resolvedTree: this.getResolvedTree(),
            notMutatedResolvedTree:
              this.resolvedTreesContainer.notMutatedResolvedTree,
            isTreeRoot: this.isTreeRootVertex(call.ref),
            isTraversalRoot: this.isTraversalRootVertex(call.ref),
            vertexRef: call.ref,
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
            resolutionStyle,
            commandCommitMode,
            visitorGroup,
          }) => ({
            addedIndex,
            priority,
            resolutionStyle,
            commandCommitMode,
            visitorGroup,
          }),
        ),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasSorter: this.icfg.sortChildrenHints !== null,
      hasHintIds: false,
      concurrency: this.icfg.concurrency,
    });
    const driver = createAsyncDriver(kernel, bindings, this.icfg.concurrency);
    this.execution = new AsyncRunnerSession(this.projectEvents(driver));
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

  inspect(): CoreInspection {
    return this.execution.inspect();
  }

  getResolvedTree(): ResolvedTree<TTP | RW_TTP> {
    return this.resolvedTreesContainer.resolvedTree;
  }

  getResolvedTreeView(): ResolvedTreeView<TTP | RW_TTP> {
    return this.getResolvedTree().asReadOnly();
  }

  getResolvedGraph(): ResolvedGraph<TTP | RW_TTP> {
    return this.getResolvedTree().getResolvedGraph();
  }

  isTraversalRootVertex(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return ref === this.state.traversalRootVertexRef;
  }

  isTreeRootVertex(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return ref === this.getResolvedTree().getRoot();
  }

  iterateEvents(
    config?: BreadthFirstTraversalRunnerIterableConfigInput,
  ): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown> {
    return this.execution.iterateEvents(config);
  }

  async run(
    config?: BreadthFirstTraversalRunnerIterableConfigInput,
  ): Promise<this> {
    await this.execution.run(config);
    return this;
  }

  private projectEvents(
    control: AsyncSessionControl<KernelEvent<TTP | RW_TTP>>,
  ): AsyncSessionControl<Event<TTP, RW_TTP>> {
    return {
      advance: (mode): SessionProgress<Event<TTP, RW_TTP>> => {
        const progress = control.advance(mode);
        if (progress.kind !== 'EVENT') return progress;
        return {
          kind: 'EVENT',
          boundaryId: progress.boundaryId,
          event: {
            vertex: progress.event.vertex,
            vertexRef: progress.event.vertexRef,
            phase: progress.event.order as BreadthFirstPhase,
            isTreeRoot: progress.event.isRoot,
            isTraversalRoot: progress.event.isTraversalRoot,
          },
        };
      },
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
