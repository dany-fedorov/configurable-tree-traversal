import type { AsyncCoreExecution } from '@core/AsyncCoreExecution';
import type { CoreInspection } from '@core/CoreInspection';
import type { CTTRef } from '@core/CTTRef';
import {
  bindGraphSource,
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { CallSpec, KernelEvent } from '@core/effects/types';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
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
import {
  mergeAsyncDagTraversalInstanceConfigs,
  type AsyncDagTraversalInstanceConfig,
} from './AsyncDagTraversalInstanceConfig';
import { DagPolicy } from './DagPolicy';
import { DagTraversalOrder } from './DagTraversalOrder';
import type { DagEvent } from './DagTraversalVisitor';
import {
  makeEffectiveDagTraversalRunnerIterableConfig,
  type DagTraversalRunnerIterableConfig,
  type DagTraversalRunnerIterableConfigInput,
} from './DagTraversalRunnerIterableConfig';
import { DagTraversalRunnerState } from './DagTraversalRunnerState';

type Event<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = DagEvent<T | R>;

export class AsyncDagTraversalRunner<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  readonly icfg: AsyncDagTraversalInstanceConfig<T, R>;
  readonly state: DagTraversalRunnerState<T, R>;
  readonly resolvedGraphsContainer: ResolvedGraphsContainer<T, R>;
  readonly notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
  private iterableConfig: DagTraversalRunnerIterableConfig =
    makeEffectiveDagTraversalRunnerIterableConfig();
  private readonly execution: AsyncCoreExecution<Event<T, R>>;

  constructor(input: AsyncDagTraversalInstanceConfig<T, R>) {
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(input, {});
    this.icfg.visitors = Object.fromEntries(
      Object.entries(this.icfg.visitors).map(([order, records]) => [
        order,
        records.map((record) => ({ ...record })),
      ]),
    ) as typeof this.icfg.visitors;
    this.state =
      input.traversalRunnerInternalObjects.state ??
      new DagTraversalRunnerState<T, R>();
    const graphSource = input.traversableGraph;
    const treeSource = input.traversableTree;
    const sourceMode = graphSource !== undefined ? 'graph' : 'tree';
    const injectedContainer =
      input.traversalRunnerInternalObjects.resolvedGraphsContainer;
    if (injectedContainer !== null) {
      if (injectedContainer.sourceMode !== sourceMode) {
        throw new TypeError(
          'Injected graph container source mode does not match',
        );
      }
      if (
        (injectedContainer.notMutatedResolvedGraph !== null) !==
        input.saveNotMutatedResolvedGraph
      ) {
        throw new TypeError(
          'Injected graph container snapshot mode does not match',
        );
      }
      this.resolvedGraphsContainer = injectedContainer;
    } else if (sourceMode === 'graph') {
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<T, R>({
        sourceMode: 'graph',
        saveOriginal: input.saveNotMutatedResolvedGraph,
      });
    } else {
      const treeContainer = new DepthFirstTraversalResolvedTreesContainer({
        ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
        traversableTree: treeSource!,
        saveNotMutatedResolvedTree: input.saveNotMutatedResolvedGraph,
      } as unknown as DepthFirstTraversalInstanceConfig<T, R>);
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<T, R>({
        sourceMode: 'tree',
        saveOriginal: input.saveNotMutatedResolvedGraph,
        treeContainer,
      });
    }
    this.notMutatedResolvedGraph =
      this.resolvedGraphsContainer.notMutatedResolvedGraph;
    const policy = new DagPolicy(this.state, this.resolvedGraphsContainer);
    const source =
      sourceMode === 'graph'
        ? bindGraphSource(graphSource!, this.resolvedGraphsContainer)
        : bindTreeSource(
            treeSource!,
            this.resolvedGraphsContainer,
            'AsyncDagTraversalRunner',
          );
    const bindings = createCallbackBindings<T, R>({
      source,
      ...(input.sortChildrenHints === null
        ? {}
        : {
            sortHints: (hints: (T | R)['VertexHint'][]) =>
              input.sortChildrenHints!(
                hints as T['VertexHint'][],
              ) as ReturnType<NonNullable<typeof input.sortChildrenHints>>,
          }),
      visit: {
        [DagTraversalOrder.ON_READY]: (call) => this.visit(call),
        [DagTraversalOrder.ON_COMPLETE]: (call) => this.visit(call),
      },
    });
    const kernel = new TraversalKernel({
      kind: 'dag',
      execution: 'async',
      sourceMode,
      container: this.resolvedGraphsContainer,
      stateBridge: this.state,
      visitorMetadata: {
        [DagTraversalOrder.ON_READY]: this.metadataFor(
          DagTraversalOrder.ON_READY,
        ),
        [DagTraversalOrder.ON_COMPLETE]: this.metadataFor(
          DagTraversalOrder.ON_COMPLETE,
        ),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasSorter: input.sortChildrenHints !== null,
      hasHintIds:
        sourceMode === 'graph' &&
        graphSource!.getVertexIdFromHint !== undefined,
      concurrency: input.concurrency,
      ...(this.state.status === TraversalRunnerStatus.HALTED
        ? {
            dagSeed: {
              readyVisits: this.state.readyVisits.map(
                ({ vertexRef, order }) => ({
                  ref: vertexRef,
                  order,
                }),
              ),
              expansionQueue: this.state.expansionQueue,
            },
          }
        : {}),
    });
    const driver = createAsyncDriver(kernel, bindings, input.concurrency);
    const projectedControl = this.projectEvents(driver, policy);
    this.execution = new AsyncRunnerSession(projectedControl);
  }

  getStatus(): TraversalRunnerStatus {
    return this.execution.getStatus();
  }

  isHalted(): boolean {
    return this.execution.isHalted();
  }

  inspect(): CoreInspection {
    return this.execution.inspect();
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

  getIterable(
    config?: DagTraversalRunnerIterableConfigInput,
  ): AsyncGenerator<Event<T, R>, void, unknown> {
    return this.execution.getIterable(
      config === undefined
        ? undefined
        : makeEffectiveDagTraversalRunnerIterableConfig(config),
    );
  }

  async run(config?: DagTraversalRunnerIterableConfigInput): Promise<this> {
    await this.execution.run(
      config === undefined
        ? undefined
        : makeEffectiveDagTraversalRunnerIterableConfig(config),
    );
    return this;
  }

  private visit(call: Extract<CallSpec<T, R>, { kind: 'VISIT' }>) {
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

  private projectEvents(
    control: AsyncSessionControl<KernelEvent<T | R>>,
    policy: DagPolicy<T, R>,
  ): AsyncSessionControl<Event<T, R>> {
    return {
      advance: (mode): SessionProgress<Event<T, R>> => {
        const progress = control.advance(mode);
        if (progress.kind === 'EVENT') {
          return {
            kind: 'EVENT',
            boundaryId: progress.boundaryId,
            event: {
              vertex: progress.event.vertex,
              vertexRef: progress.event.vertexRef,
              order: progress.event.order as DagTraversalOrder,
              isGraphRoot: progress.event.isRoot,
              isTraversalRoot: progress.event.isTraversalRoot,
            },
          };
        }
        if (progress.kind === 'FINISHED' || progress.kind === 'FAILED') {
          if (progress.kind === 'FAILED' && this.state.failure === null) {
            this.state.failure = { error: progress.error };
          }
          policy.releaseIfTerminal();
        }
        return progress;
      },
      acknowledgeEvent: (boundaryId) => control.acknowledgeEvent(boundaryId),
      requestHalt: () => control.requestHalt(),
      isHaltRequested: () => control.isHaltRequested(),
      resume: (config) => {
        policy.claim();
        if (config !== undefined) {
          this.iterableConfig = makeEffectiveDagTraversalRunnerIterableConfig(
            config as DagTraversalRunnerIterableConfig,
          );
        }
        control.resume(this.iterableConfig);
      },
      getStatus: () => control.getStatus(),
      getFailure: () =>
        control.getFailure() ??
        (this.state.status === TraversalRunnerStatus.FAILED
          ? this.state.failure
          : null),
      inspect: () => control.inspect(),
      waitForProgress: () => control.waitForProgress(),
    };
  }
}
