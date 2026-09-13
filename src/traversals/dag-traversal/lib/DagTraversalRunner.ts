import type { CoreInspection } from '@core/CoreInspection';
import type { CTTRef } from '@core/CTTRef';
import {
  bindGraphSource,
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import type { CallbackBindings, CallSpec } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import { TraversalKernel } from '@core/TraversalKernel';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTraversalInstanceConfig,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { deepFreeze } from '@utils/deepFreeze';
import { initDagVisitors } from '../init-helpers/initVisitors';
import type { DagTraversalInstanceConfig } from './DagTraversalInstanceConfig';
import { DagPolicy } from './DagPolicy';
import { DagTraversalOrder } from './DagTraversalOrder';
import type { DagEvent } from './DagTraversalVisitor';
import {
  makeEffectiveDagTraversalRunnerIterableConfig,
  type DagTraversalRunnerIterableConfig,
  type DagTraversalRunnerIterableConfigInput,
} from './DagTraversalRunnerIterableConfig';
import { DagTraversalRunnerState } from './DagTraversalRunnerState';

type Event<T extends TreeTypeParameters, R extends TreeTypeParameters> = DagEvent<
  T | R
>;

export class DagTraversalRunner<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  readonly icfg: DagTraversalInstanceConfig<T, R>;
  readonly state: DagTraversalRunnerState<T, R>;
  readonly resolvedGraphsContainer: ResolvedGraphsContainer<T, R>;
  readonly notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
  private iterableConfig: DagTraversalRunnerIterableConfig =
    makeEffectiveDagTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private curGenerator: Generator<Event<T, R> | null> | null = null;
  private readonly runtimeState: SyncDriverState = { inFlightCallbackCount: 0 };
  private readonly policy: DagPolicy<T, R>;
  private readonly kernel: TraversalKernel<T, R>;
  private readonly bindings: CallbackBindings<T, R>;

  constructor(input: DagTraversalInstanceConfig<T, R>) {
    this.icfg = { ...input, visitors: initDagVisitors(input) };
    const injectedState = input.traversalRunnerInternalObjects.state;
    this.state =
      injectedState ?? new DagTraversalRunnerState<T, R>();
    const graphSource = input.traversableGraph;
    const treeSource = input.traversableTree;
    const sourceMode = graphSource !== undefined ? 'graph' : 'tree';
    const injectedContainer =
      input.traversalRunnerInternalObjects.resolvedGraphsContainer;
    if (injectedContainer !== null) {
      if (injectedContainer.sourceMode !== sourceMode) {
        throw new TypeError('Injected graph container source mode does not match');
      }
      if (
        (injectedContainer.notMutatedResolvedGraph !== null) !==
        input.saveNotMutatedResolvedGraph
      ) {
        throw new TypeError('Injected graph container snapshot mode does not match');
      }
      this.resolvedGraphsContainer = injectedContainer;
    } else if (sourceMode === 'graph') {
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<T, R>({
        sourceMode: 'graph',
        saveOriginal: input.saveNotMutatedResolvedGraph,
      });
    } else {
      const treeContainer = new DepthFirstTraversalResolvedTreesContainer(
        {
          ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
          traversableTree: treeSource!,
          saveNotMutatedResolvedTree: input.saveNotMutatedResolvedGraph,
        } as unknown as DepthFirstTraversalInstanceConfig<T, R>,
      );
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<T, R>({
        sourceMode: 'tree',
        saveOriginal: input.saveNotMutatedResolvedGraph,
        treeContainer,
      });
    }
    this.notMutatedResolvedGraph =
      this.resolvedGraphsContainer.notMutatedResolvedGraph;
    this.policy = new DagPolicy(this.state, this.resolvedGraphsContainer);
    if (this.state.status === TraversalRunnerStatus.FAILED) {
      this.failure = this.state.failure;
    }
    const source =
      sourceMode === 'graph'
        ? bindGraphSource(graphSource!, this.resolvedGraphsContainer)
        : bindTreeSource(
            treeSource!,
            this.resolvedGraphsContainer,
            'DagTraversalRunner',
          );
    this.bindings = createCallbackBindings<T, R>({
      source,
      ...(input.sortChildrenHints === null
        ? {}
        : {
            sortHints: (hints: (T | R)['VertexHint'][]) =>
              input.sortChildrenHints!(
                hints as T['VertexHint'][],
              ) as (T | R)['VertexHint'][],
          }),
      visit: {
        [DagTraversalOrder.ON_READY]: (call) => this.visit(call),
        [DagTraversalOrder.ON_COMPLETE]: (call) => this.visit(call),
      },
    });
    this.kernel = new TraversalKernel({
      kind: 'dag',
      execution: 'sync',
      sourceMode,
      container: this.resolvedGraphsContainer,
      stateBridge: this.state,
      visitorMetadata: {
        [DagTraversalOrder.ON_READY]: this.metadataFor(Order.ON_READY),
        [DagTraversalOrder.ON_COMPLETE]: this.metadataFor(Order.ON_COMPLETE),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasSorter: input.sortChildrenHints !== null,
      hasHintIds:
        sourceMode === 'graph' &&
        graphSource!.getVertexIdFromHint !== undefined,
      concurrency: 1,
      ...(this.state.status === TraversalRunnerStatus.HALTED
        ? {
            dagSeed: {
              readyVisits: this.state.readyVisits.map(({ vertexRef, order }) => ({
                ref: vertexRef,
                order,
              })),
              expansionQueue: this.state.expansionQueue,
            },
          }
        : {}),
    });
  }

  getStatus(): TraversalRunnerStatus {
    return this.state.status;
  }

  isHalted(): boolean {
    return this.getStatus() === TraversalRunnerStatus.HALTED;
  }

  getResolvedGraph(): ResolvedGraph<T | R> {
    return this.resolvedGraphsContainer.resolvedGraph;
  }

  isGraphRootVertex(ref: CTTRef<Vertex<T | R>>): boolean {
    return ref === this.getResolvedGraph().getRoot();
  }

  isTraversalRootVertex(ref: CTTRef<Vertex<T | R>>): boolean {
    return ref === this.state.traversalRootVertexRef;
  }

  inspect(): CoreInspection {
    return deepFreeze({
      ...this.kernel.inspect(),
      inFlightCallbackCount: this.runtimeState.inFlightCallbackCount,
      bufferedEventCount: 0,
    });
  }

  *getIterable(
    config?: DagTraversalRunnerIterableConfigInput,
  ): Generator<Event<T, R>> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    if (this.getStatus() === TraversalRunnerStatus.FINISHED) return;
    if (config !== undefined) {
      this.iterableConfig = makeEffectiveDagTraversalRunnerIterableConfig(config);
    }
    this.policy.claim();
    this.kernel.resume(this.iterableConfig);
    this.curGenerator ??= this.getInternalGenerator();
    this.activeIterator = true;
    this.state.status = TraversalRunnerStatus.RUNNING;
    try {
      while (true) {
        let next: IteratorResult<Event<T, R> | null>;
        try {
          next = this.curGenerator.next();
        } catch (error) {
          this.failure = { error };
          this.state.failure = this.failure;
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
      this.policy.releaseIfTerminal();
    }
  }

  run(config?: DagTraversalRunnerIterableConfigInput): this {
    for (const _event of this.getIterable(config)) {
      /* Drain traversal events. */
    }
    return this;
  }

  private *getInternalGenerator(): Generator<Event<T, R> | null> {
    for (const event of runSync(
      this.kernel,
      this.bindings,
      this.runtimeState,
      'DagTraversalRunner',
    )) {
      if (event === null) yield null;
      else {
        yield {
          vertex: event.vertex,
          vertexRef: event.vertexRef,
          order: event.order as DagTraversalOrder,
          isGraphRoot: event.isRoot,
          isTraversalRoot: event.isTraversalRoot,
        };
      }
    }
  }

  private visit(
    call: Extract<CallSpec<T, R>, { kind: 'VISIT' }>,
  ) {
    const order = call.order as DagTraversalOrder;
    const visitorRecord = this.icfg.visitors[order][call.recordIndex]!;
    return visitorRecord.visitor(call.ref.unref(), {
      ...call.metadata,
      resolvedGraph: this.getResolvedGraph(),
      notMutatedResolvedGraph: this.notMutatedResolvedGraph,
      vertexRef: call.ref,
      order,
      isGraphRoot: this.isGraphRootVertex(call.ref),
      isTraversalRoot: this.isTraversalRootVertex(call.ref),
      visitorRecord,
    });
  }

  private metadataFor(order: DagTraversalOrder) {
    return this.icfg.visitors[order].map(
      ({ addedIndex, priority, resolutionStyle }) => ({
        addedIndex,
        priority,
        resolutionStyle,
      }),
    );
  }
}

const Order = DagTraversalOrder;
