import type { CoreInspection } from '@core/CoreInspection';
import type { CTTRef } from '@core/CTTRef';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import type { CallbackBindings, CallSpec } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { ResolvedTree } from '@core/ResolvedTree';
import { TraversalKernel } from '@core/TraversalKernel';
import type {
  TraversalRunner,
  TraversalRunnerIteratorResultContent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTraversalInstanceConfig,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { deepFreeze } from '@utils/deepFreeze';
import { initBreadthFirstVisitors } from '../init-helpers/initVisitors';
import type { BreadthFirstTraversalInstanceConfig } from './BreadthFirstTraversalInstanceConfig';
import { BreadthFirstTraversalOrder } from './BreadthFirstTraversalOrder';
import {
  makeEffectiveBreadthFirstTraversalRunnerIterableConfig,
  type BreadthFirstTraversalRunnerIterableConfig,
  type BreadthFirstTraversalRunnerIterableConfigInput,
} from './BreadthFirstTraversalRunnerIterableConfig';
import { BreadthFirstTraversalRunnerState } from './BreadthFirstTraversalRunnerState';

type Event<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = TraversalRunnerIteratorResultContent<
  BreadthFirstTraversalOrder,
  TTP,
  RW_TTP
>;

export class BreadthFirstTraversalRunner<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> implements TraversalRunner<BreadthFirstTraversalOrder, TTP, RW_TTP>
{
  icfg: BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  state: BreadthFirstTraversalRunnerState<TTP, RW_TTP>;
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  curGenerator: Generator<Event<TTP, RW_TTP> | null> | null = null;

  private iterableConfig: BreadthFirstTraversalRunnerIterableConfig =
    makeEffectiveBreadthFirstTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private readonly runtimeState: SyncDriverState = {
    inFlightCallbackCount: 0,
  };
  private readonly kernel: TraversalKernel<TTP, RW_TTP>;
  private readonly bindings: CallbackBindings<TTP, RW_TTP>;

  constructor(icfgInput: BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>) {
    this.icfg = { ...icfgInput, visitors: initBreadthFirstVisitors(icfgInput) };
    this.state = new BreadthFirstTraversalRunnerState(
      icfgInput.traversalRunnerInternalObjects.state,
    );
    const resolvedTreeConfig = {
      ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
      traversableTree: icfgInput.traversableTree,
      saveNotMutatedResolvedTree: icfgInput.saveNotMutatedResolvedTree,
      traversalRunnerInternalObjects: {
        ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.traversalRunnerInternalObjects,
        resolvedTreesContainer:
          icfgInput.traversalRunnerInternalObjects.resolvedTreesContainer,
      },
    } as unknown as DepthFirstTraversalInstanceConfig<TTP, RW_TTP>;
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
        'BreadthFirstTraversalRunner',
      ),
      ...(this.icfg.sortChildrenHints === null
        ? {}
        : {
            sortHints: (hints: (TTP | RW_TTP)['VertexHint'][]) =>
              this.icfg.sortChildrenHints!(
                hints as TTP['VertexHint'][],
              ) as (TTP | RW_TTP)['VertexHint'][],
          }),
      visit: {
        [BreadthFirstTraversalOrder.LEVEL_ORDER]: (
          call: Extract<CallSpec<TTP, RW_TTP>, { kind: 'VISIT' }>,
        ) => {
          const order = BreadthFirstTraversalOrder.LEVEL_ORDER;
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
            vertexVisitorsChainState:
              call.metadata.vertexVisitorsChainState,
            order,
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
        [BreadthFirstTraversalOrder.LEVEL_ORDER]: this.icfg.visitors[
          BreadthFirstTraversalOrder.LEVEL_ORDER
        ].map(({ addedIndex, priority, resolutionStyle }) => ({
          addedIndex,
          priority,
          resolutionStyle,
        })),
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

  isHalted(): boolean {
    return this.getStatus() === TraversalRunnerStatus.HALTED;
  }

  getResolvedTree(): ResolvedTree<TTP | RW_TTP> {
    return this.resolvedTreesContainer.resolvedTree;
  }

  getResolvedGraph(): ResolvedGraph<TTP | RW_TTP> {
    return this.getResolvedTree().getResolvedGraph();
  }

  inspect(): CoreInspection {
    return deepFreeze({
      ...this.kernel.inspect(),
      inFlightCallbackCount: this.runtimeState.inFlightCallbackCount,
      bufferedEventCount: 0,
    });
  }

  isTraversalRootVertex(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return ref === this.state.traversalRootVertexRef;
  }

  isTreeRootVertex(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return ref === this.getResolvedTree().getRoot();
  }

  private *getInternalGenerator(): Generator<Event<TTP, RW_TTP> | null> {
    for (const event of runSync(
      this.kernel,
      this.bindings,
      this.runtimeState,
      'BreadthFirstTraversalRunner',
    )) {
      if (event === null) yield null;
      else
        yield {
          vertex: event.vertex,
          vertexRef: event.vertexRef,
          order: event.order as BreadthFirstTraversalOrder,
          isTreeRoot: event.isRoot,
          isTraversalRoot: event.isTraversalRoot,
        };
    }
  }

  *getIterable(
    config?: BreadthFirstTraversalRunnerIterableConfigInput,
  ): Generator<Event<TTP, RW_TTP>> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    if (this.getStatus() === TraversalRunnerStatus.FINISHED) return;
    if (config !== undefined) {
      this.iterableConfig =
        makeEffectiveBreadthFirstTraversalRunnerIterableConfig(config);
    }
    this.kernel.resume(this.iterableConfig);
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

  run(config?: BreadthFirstTraversalRunnerIterableConfigInput): this {
    for (const _event of this.getIterable(config)) {
      /* Drain traversal events. */
    }
    return this;
  }
}
