import type { AsyncCoreExecution } from '@core/AsyncCoreExecution';
import type { CoreInspection } from '@core/CoreInspection';
import type { CTTRef } from '@core/CTTRef';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { KernelEvent } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { ResolvedTree } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalRunnerIteratorResultContent } from '@core/TraversalRunner';
import { TraversalKernel } from '@core/TraversalKernel';
import type { Vertex } from '@core/Vertex';
import {
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTraversalInstanceConfig,
} from './AsyncDepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';
import { DepthFirstTraversalResolvedTreesContainer } from './DepthFirstTraversalResolvedTreesContainer';
import {
  makeEffectiveDepthFirstTraversalRunnerIterableConfig,
  type DepthFirstTraversalRunnerIterableConfig,
  type DepthFirstTraversalRunnerIterableConfigInput,
} from './DepthFirstTraversalRunnerIterableConfig';
import { DepthFirstTraversalRunnerState } from './DepthFirstTraversalRunnerState';

type Event<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>;

export class AsyncDepthFirstTraversalRunner<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  icfg: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  state: DepthFirstTraversalRunnerState<TTP, RW_TTP>;
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  private readonly execution: AsyncCoreExecution<Event<TTP, RW_TTP>>;

  constructor(icfgInput: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>) {
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
        'AsyncDepthFirstTraversalRunner',
      ),
      ...(this.icfg.sortChildrenHints === null
        ? {}
        : {
            sortHints: (hints: (TTP | RW_TTP)['VertexHint'][]) =>
              this.icfg.sortChildrenHints!(
                hints as TTP['VertexHint'][],
              ) as ReturnType<NonNullable<typeof this.icfg.sortChildrenHints>>,
          }),
      visit: Object.fromEntries(
        Object.values(DepthFirstTraversalOrder).map((order) => [
          order,
          (
            call: Extract<
              import('@core/effects/types').CallSpec<TTP, RW_TTP>,
              { kind: 'VISIT' }
            >,
          ) => {
            const visitorRecord = this.icfg.visitors[order][call.recordIndex]!;
            return visitorRecord.visitor(call.ref.unref(), {
              ...call.metadata,
              resolvedTree: this.getResolvedTree(),
              notMutatedResolvedTree:
                this.resolvedTreesContainer.notMutatedResolvedTree,
              isTreeRoot: this.isTreeRootVertex(call.ref),
              isTraversalRoot: this.isTraversalRootVertex(call.ref),
              vertexRef: call.ref,
              visitorRecord,
              vertexVisitorsChainState: call.metadata.vertexVisitorsChainState,
              order,
            });
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
          records.map(({ addedIndex, priority, resolutionStyle }) => ({
            addedIndex,
            priority,
            resolutionStyle,
          })),
        ]),
      ),
      iterableConfig,
      inOrderConfig: this.icfg.inOrderTraversalConfig,
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

  isHalted(): boolean {
    return this.execution.isHalted();
  }

  inspect(): CoreInspection {
    return this.execution.inspect();
  }

  getResolvedTree(): ResolvedTree<TTP | RW_TTP> {
    return this.resolvedTreesContainer.resolvedTree;
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

  isLeafVertexRef(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return (
      this.state.subtreeTraversalDisabledRefs.has(ref) ||
      ref.unref().isLeafVertex()
    );
  }

  getIterable(
    config?: DepthFirstTraversalRunnerIterableConfigInput,
  ): AsyncGenerator<Event<TTP, RW_TTP>, void, unknown> {
    return this.execution.getIterable(config);
  }

  async run(
    config?: DepthFirstTraversalRunnerIterableConfigInput,
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
            order: progress.event.order as DepthFirstTraversalOrder,
            isTreeRoot: progress.event.isRoot,
            isTraversalRoot: progress.event.isTraversalRoot,
          },
        };
      },
      acknowledgeEvent: (boundaryId) => control.acknowledgeEvent(boundaryId),
      requestHalt: () => control.requestHalt(),
      isHaltRequested: () => control.isHaltRequested(),
      resume: (config) =>
        control.resume(
          config as Partial<DepthFirstTraversalRunnerIterableConfig>,
        ),
      getStatus: () => control.getStatus(),
      getFailure: () => control.getFailure(),
      inspect: () => control.inspect(),
      waitForProgress: () => control.waitForProgress(),
    };
  }
}
