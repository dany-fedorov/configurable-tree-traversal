import type { CoreInspection } from '@core/CoreInspection';
import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { ResolvedTree } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalRunner,
  TraversalRunnerIteratorResultContent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { CTTRef } from '@core/CTTRef';
import type { Vertex } from '@core/Vertex';
import { TraversalKernel } from '@core/TraversalKernel';
import type { CallbackBindings } from '@core/effects/types';
import {
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { deepFreeze } from '@utils/deepFreeze';
import { DepthFirstTraversalRunnerState } from './DepthFirstTraversalRunnerState';
import { DepthFirstTraversalResolvedTreesContainer } from './DepthFirstTraversalResolvedTreesContainer';
import { DepthFirstTraversalOrder } from './DepthFirstTraversalOrder';
import {
  mergeInstanceConfigs,
  type DepthFirstTraversalInstanceConfig,
} from './DepthFirstTraversalInstanceConfig';
import {
  makeEffectiveDepthFirstTraversalRunnerIterableConfig,
  type DepthFirstTraversalRunnerIterableConfig,
  type DepthFirstTraversalRunnerIterableConfigInput,
} from './DepthFirstTraversalRunnerIterableConfig';
import { initVisitors } from '../init-helpers/initVisitors';

type Event<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>;

export class DepthFirstTraversalRunner<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> implements TraversalRunner<DepthFirstTraversalOrder, TTP, RW_TTP>
{
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  state: DepthFirstTraversalRunnerState<TTP, RW_TTP>;
  resolvedTreesContainer: DepthFirstTraversalResolvedTreesContainer<
    TTP,
    RW_TTP
  >;
  curGenerator: Generator<Event<TTP, RW_TTP> | null> | null = null;
  private iterableConfig: DepthFirstTraversalRunnerIterableConfig =
    makeEffectiveDepthFirstTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private readonly runtimeState: SyncDriverState = {
    inFlightCallbackCount: 0,
  };
  private readonly kernel: TraversalKernel<TTP, RW_TTP>;
  private readonly bindings: CallbackBindings<TTP, RW_TTP>;

  constructor(icfgInput: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>) {
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
        'DepthFirstTraversalRunner',
      ),
      ...(this.icfg.sortChildrenHints === null
        ? {}
        : {
            sortHints: (hints: (TTP | RW_TTP)['VertexHint'][]) =>
              this.icfg.sortChildrenHints!(
                hints as TTP['VertexHint'][],
              ) as (TTP | RW_TTP)['VertexHint'][],
          }),
      visit: Object.fromEntries(
        Object.values(DepthFirstTraversalOrder).map((order) => [
          order,
          (call: Extract<
            import('@core/effects/types').CallSpec<TTP, RW_TTP>,
            { kind: 'VISIT' }
          >) => {
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
          records.map(({ addedIndex, priority, resolutionStyle }) => ({
            addedIndex,
            priority,
            resolutionStyle,
          })),
        ]),
      ),
      iterableConfig: this.iterableConfig,
      inOrderConfig: this.icfg.inOrderTraversalConfig,
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

  isLeafVertexRef(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return (
      this.state.subtreeTraversalDisabledRefs.has(ref) ||
      ref.unref().isLeafVertex()
    );
  }

  private *getInternalGenerator(): Generator<Event<TTP, RW_TTP> | null> {
    for (const event of runSync(
      this.kernel,
      this.bindings,
      this.runtimeState,
      'DepthFirstTraversalRunner',
    )) {
      if (event === null) yield null;
      else
        yield {
          vertex: event.vertex,
          vertexRef: event.vertexRef,
          order: event.order as DepthFirstTraversalOrder,
          isTreeRoot: event.isRoot,
          isTraversalRoot: event.isTraversalRoot,
        };
    }
  }

  *getIterable(
    config?: DepthFirstTraversalRunnerIterableConfigInput,
  ): Generator<Event<TTP, RW_TTP>> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator)
      throw new Error('A traversal runner can only have one active iterator');
    if (this.getStatus() === TraversalRunnerStatus.FINISHED) return;
    if (config !== undefined)
      this.iterableConfig =
        makeEffectiveDepthFirstTraversalRunnerIterableConfig(config);
    this.kernel.resume(this.iterableConfig);
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

  run(config?: DepthFirstTraversalRunnerIterableConfigInput): this {
    for (const _event of this.getIterable(config)) {
      /* Drain traversal events. */
    }
    return this;
  }
}
