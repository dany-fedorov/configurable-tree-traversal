import type { CoreInspection } from '@core/CoreInspection';
import type { MutableRef } from '@core/CTTRef';
import {
  bindGraphSource,
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { runSync, type SyncDriverState } from '@core/drivers/runSync';
import type { CallbackBindings, CallSpec } from '@core/effects/types';
import type { ResolvedGraphsContainerOptions } from '@core/graph/ResolvedGraphsContainer';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { detachTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import type { OriginalGraphView, ResolvedGraph } from '@core/ResolvedGraph';
import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import type { SyncTraversalExecution } from '@core/TraversalExecution';
import { TraversalKernel } from '@core/TraversalKernel';
import type { TraversalStopReason } from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { TraversalExecutionOptions } from '@core/TraversalRunnerIterableConfig';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { deepFreeze } from '@utils/deepFreeze';
import { initDagVisitors } from '../init-helpers/initVisitors';
import { inspectDagMilestones as captureDagInspection } from '../inspectDag';
import type { DagMilestoneSnapshot } from './DagInspection';
import { DagPolicy } from './DagPolicy';
import type {
  DagSettlementGeneration,
  DagSettlementOutcome,
  DagSummary,
} from './DagProgress';
import { dagRunnerCapabilities } from './dagRunnerCapabilities';
import type { DagResolvedOptions } from './DagTraversalInstanceConfig';
import { DagVisitorPhase } from './DagTraversalOrder';
import {
  makeEffectiveDagTraversalRunnerIterableConfig,
  type DagTraversalRunnerIterableConfig,
} from './DagTraversalRunnerIterableConfig';
import { DagTraversalRunnerState } from './DagTraversalRunnerState';
import type { DagEvent } from './DagTraversalVisitor';

import {
  captureDagTerminalObservation,
  getDagTerminalObservation,
} from './DagTerminalObservation';

type Event<T extends VertexTypes, R extends VertexTypes, ID> = DagEvent<
  T | R,
  ID
>;

export interface DagTraversalRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> extends SyncTraversalExecution<
    DagVisitorPhase,
    DagEvent<T | R, ID>,
    CoreInspection,
    'workCompleted' | 'subgraphCompleted'
  > {
  readonly originalGraphView: OriginalGraphView<T, ID> | null;
  prepare(): this;
  inspectMilestones(): DagMilestoneSnapshot<ID>;
  summary(): DagSummary<ID>;
  settle(
    id: ID,
    outcome: DagSettlementOutcome,
    expectedGeneration: DagSettlementGeneration,
  ): boolean;
  getResolvedTreeView(): ResolvedTreeView<T | R> | null;
  getResolvedGraph(): ResolvedGraph<T | R, ID>;
  isGraphRootVertex(ref: MutableRef<Vertex<T | R>>): boolean;
  isTraversalRootVertex(ref: MutableRef<Vertex<T | R>>): boolean;
}

export class InternalDagTraversalRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  private readonly terminalObservation: ReturnType<
    typeof getDagTerminalObservation
  >;
  private readonly icfg: DagResolvedOptions<T, R, ID>;
  private readonly state: DagTraversalRunnerState<T, R>;
  private readonly resolvedGraphsContainer: ResolvedGraphsContainer<T, R, ID>;
  readonly originalGraphView: OriginalGraphView<T, ID> | null;
  private iterableConfig: DagTraversalRunnerIterableConfig =
    makeEffectiveDagTraversalRunnerIterableConfig();
  private activeIterator = false;
  private failure: { error: unknown } | null = null;
  private curGenerator: Generator<Event<T, R, ID> | null> | null = null;
  private readonly runtimeState: SyncDriverState = { inFlightCallbackCount: 0 };
  private readonly policy: DagPolicy<T, R>;
  private readonly kernel: TraversalKernel<T, R>;
  private readonly bindings: CallbackBindings<T, R>;

  constructor(input: DagResolvedOptions<T, R, ID>) {
    if (
      input.rootDependencies !== undefined &&
      input.rootDependencies !== 'honor' &&
      input.rootDependencies !== 'ignore'
    ) {
      throw new TypeError('rootDependencies must be honor or ignore');
    }
    if (
      input.implicitParentDependency !== undefined &&
      typeof input.implicitParentDependency !== 'boolean'
    ) {
      throw new TypeError('implicitParentDependency must be a boolean');
    }
    this.icfg = { ...input, visitors: initDagVisitors(input) };
    const injectedState = input.traversalRunnerInternalObjects.state;
    this.state = injectedState ?? new DagTraversalRunnerState<T, R>();
    const graphSource = input.traversableGraph;
    const treeSource = input.traversableTree;
    const sourceMode = graphSource !== undefined ? 'graph' : 'tree';
    const completedWork =
      input.completedWork === undefined
        ? undefined
        : new Set(input.completedWork);
    if (
      (completedWork !== undefined ||
        input.discovery === 'eager' ||
        input.syntheticRoot === true) &&
      (sourceMode !== 'graph' ||
        input.traversalRunnerInternalObjects.state !== null ||
        input.traversalRunnerInternalObjects.resolvedGraphsContainer !== null)
    ) {
      throw new TypeError(
        'Progress options require a fresh graph-source runner',
      );
    }
    const injectedContainer =
      input.traversalRunnerInternalObjects.resolvedGraphsContainer;
    if (injectedContainer !== null) {
      if (injectedContainer.sourceMode !== sourceMode) {
        throw new TypeError(
          'Injected graph container source mode does not match',
        );
      }
      if (
        (injectedContainer.originalGraphView !== null) !==
        input.retainOriginalGraphStructure
      ) {
        throw new TypeError(
          'Injected graph container snapshot mode does not match',
        );
      }
      this.resolvedGraphsContainer = injectedContainer;
    } else if (sourceMode === 'graph') {
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<T, R, ID>({
        sourceMode: 'graph',
        syntheticRoot: input.syntheticRoot === true,
        saveOriginal: input.retainOriginalGraphStructure,
      });
    } else {
      const treeContainer = new DepthFirstTraversalResolvedTreesContainer({
        ...DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
        traversableTree: treeSource!,
        retainOriginalTreeStructure: input.retainOriginalGraphStructure,
      } as unknown as DepthFirstTreeResolvedOptions<T, R>);
      // Tree-source inputs are accepted only when ID is unknown.
      this.resolvedGraphsContainer = new ResolvedGraphsContainer<T, R, ID>({
        sourceMode: 'tree',
        saveOriginal: input.retainOriginalGraphStructure,
        treeContainer,
      } as ResolvedGraphsContainerOptions<T, R, ID>);
    }
    this.terminalObservation = getDagTerminalObservation(
      this.state,
      this.resolvedGraphsContainer.resolvedGraph.getVertexRefs().length > 0,
    );
    this.originalGraphView = this.resolvedGraphsContainer.originalGraphView;
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
              input.sortChildrenHints!(hints as T['VertexHint'][]) as (
                | T
                | R
              )['VertexHint'][],
          }),
      visit: {
        [DagVisitorPhase.ON_WORK_READY]: (call) => this.visit(call),
        [DagVisitorPhase.ON_SUBGRAPH_READY]: (call) => this.visit(call),
      },
    });
    this.kernel = new TraversalKernel({
      kind: 'dag',
      canPrepare:
        input.traversalRunnerInternalObjects.state === null &&
        input.traversalRunnerInternalObjects.resolvedGraphsContainer === null,
      discovery: input.discovery ?? 'lazy',
      workCompletion:
        this.icfg.workCompletion === undefined
          ? 'visitorReturn'
          : this.icfg.workCompletion,
      ...(input.rootDependencies === undefined
        ? {}
        : { rootDependencies: input.rootDependencies }),
      ...(input.implicitParentDependency === undefined
        ? {}
        : { implicitParentDependency: input.implicitParentDependency }),
      ...(completedWork === undefined ? {} : { completedWork }),
      execution: 'sync',
      sourceMode,
      container: this.resolvedGraphsContainer,
      stateBridge: this.state,
      visitorMetadata: {
        [DagVisitorPhase.ON_WORK_READY]: this.metadataFor(Order.ON_WORK_READY),
        [DagVisitorPhase.ON_SUBGRAPH_READY]: this.metadataFor(
          Order.ON_SUBGRAPH_READY,
        ),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasSorter: input.sortChildrenHints !== null,
      hasPrerequisiteResolver: source.resolvePrerequisite !== undefined,
      hasHintIds:
        sourceMode === 'graph' &&
        graphSource!.getVertexIdFromHint !== undefined,
      concurrency: 1,
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
    dagRunnerCapabilities.set(this, {
      inspectState: () =>
        this.terminalObservation === undefined
          ? this.kernel.inspectDagState()
          : this.terminalObservation.inspectDagState(),
      workCompletion: this.icfg.workCompletion,
      container: this
        .resolvedGraphsContainer as unknown as ResolvedGraphsContainer<VertexTypes>,
    });
  }

  prepare(): this {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    this.kernel.validatePreparation();
    this.policy.claim();
    this.kernel.resume(undefined, true);
    this.curGenerator ??= this.getInternalGenerator();
    this.activeIterator = true;
    try {
      this.curGenerator.next();
    } catch (error) {
      this.failure = { error };
      this.state.failure = this.failure;
      this.state.status = TraversalRunnerStatus.FAILED;
      throw error;
    } finally {
      this.activeIterator = false;
      captureDagTerminalObservation(this.state, this.kernel);
      this.policy.releaseIfTerminal();
    }
    return this;
  }

  /** Capture synchronously without advancing discovery or acquiring iterator ownership. */
  inspectMilestones(): DagMilestoneSnapshot<ID> {
    return captureDagInspection(this);
  }

  summary(): DagSummary<ID> {
    // The kernel only receives identities from this runner's typed source/config.
    return (
      this.terminalObservation === undefined
        ? this.kernel.summary()
        : this.terminalObservation.summary()
    ) as DagSummary<ID>;
  }

  settle(
    id: ID,
    outcome: DagSettlementOutcome,
    expectedGeneration: DagSettlementGeneration,
  ): boolean {
    const accepted = this.kernel.settle(id, outcome, expectedGeneration);
    return accepted;
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

  getResolvedTreeView(): ResolvedTreeView<T | R> | null {
    return (
      this.resolvedGraphsContainer.treeContainer?.resolvedTree.asReadOnly() ??
      null
    );
  }

  getResolvedGraph(): ResolvedGraph<T | R, ID> {
    return this.resolvedGraphsContainer.publicResolvedGraph;
  }

  isGraphRootVertex(ref: MutableRef<Vertex<T | R>>): boolean {
    return ref === this.getResolvedGraph().getRoot();
  }

  isTraversalRootVertex(ref: MutableRef<Vertex<T | R>>): boolean {
    return ref === this.state.traversalRootVertexRef;
  }

  inspect(): CoreInspection {
    return deepFreeze({
      ...this.kernel.inspect(),
      inFlightCallbackCount: this.runtimeState.inFlightCallbackCount,
      bufferedEventCount: 0,
    });
  }

  *iterateEvents(
    config?: TraversalExecutionOptions<DagVisitorPhase>,
  ): Generator<Event<T, R, ID>, void, unknown> {
    if (this.failure !== null) throw this.failure.error;
    if (this.activeIterator) {
      throw new Error('A traversal runner can only have one active iterator');
    }
    if (this.getStatus() === TraversalRunnerStatus.FINISHED) return;
    const patch =
      config === undefined
        ? undefined
        : detachTraversalExecutionOptions(
            Object.values(DagVisitorPhase),
            config,
          );
    this.policy.claim();
    this.kernel.resume(patch);
    this.curGenerator ??= this.getInternalGenerator();
    this.activeIterator = true;
    this.state.status = TraversalRunnerStatus.RUNNING;
    try {
      while (true) {
        let next: IteratorResult<Event<T, R, ID> | null>;
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
      captureDagTerminalObservation(this.state, this.kernel);
      this.policy.releaseIfTerminal();
    }
  }

  run(config?: TraversalExecutionOptions<DagVisitorPhase>): this {
    for (const _event of this.iterateEvents(config)) {
      /* Drain traversal events. */
    }
    return this;
  }

  private *getInternalGenerator(): Generator<Event<T, R, ID> | null> {
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
          vertexId: this.getResolvedGraph().getVertexId(event.vertexRef),
          ...(event.order === DagVisitorPhase.ON_WORK_READY
            ? ({
                kind: 'workCompleted',
              } as const)
            : ({
                kind: 'subgraphCompleted',
              } as const)),
          isGraphRoot: event.isRoot,
          isTraversalRoot: event.isTraversalRoot,
        };
      }
    }
  }

  private visit(call: Extract<CallSpec<T, R>, { kind: 'VISIT' }>) {
    const order = call.order as DagVisitorPhase;
    const registration = this.icfg.visitors[order][call.recordIndex]!;
    return registration.visitor(call.ref.getValue(), {
      ...call.metadata,
      resolvedGraph: this.getResolvedGraph(),
      originalGraphView: this.originalGraphView,
      vertexRef: call.ref,
      phase: order,
      isGraphRoot: this.isGraphRootVertex(call.ref),
      isTraversalRoot: this.isTraversalRootVertex(call.ref),
      registration,
      // The record and options share the same phase selected above.
    } as never);
  }

  private metadataFor(order: DagVisitorPhase) {
    return this.icfg.visitors[order].map(
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
    );
  }
}

const Order = DagVisitorPhase;
