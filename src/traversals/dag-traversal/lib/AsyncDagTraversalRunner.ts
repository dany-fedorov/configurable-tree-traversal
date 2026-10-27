import type { CoreInspection } from '@core/CoreInspection';
import type { MutableRef } from '@core/CTTRef';
import { AsyncRunnerSession } from '@core/drivers/AsyncRunnerSession';
import {
  bindGraphSource,
  bindTreeSource,
  createCallbackBindings,
} from '@core/drivers/callbackBindings';
import { createAsyncDriver } from '@core/drivers/runAsync';
import type { CallSpec, KernelEvent } from '@core/effects/types';
import type { ResolvedGraphsContainerOptions } from '@core/graph/ResolvedGraphsContainer';
import { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
import type { OriginalGraphView, ResolvedGraph } from '@core/ResolvedGraph';
import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import type { AsyncTraversalExecution } from '@core/TraversalExecution';
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
import { inspectDagMilestones as captureDagInspection } from '../inspectDag';
import {
  mergeAsyncDagTraversalInstanceConfigs,
  type AsyncDagResolvedOptions,
} from './AsyncDagTraversalInstanceConfig';
import type { DagMilestoneSnapshot } from './DagInspection';
import { DagPolicy } from './DagPolicy';
import type {
  DagSettlementGeneration,
  DagSettlementOutcome,
  DagSummary,
} from './DagProgress';
import { dagRunnerCapabilities } from './dagRunnerCapabilities';
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

export interface AsyncDagTraversalRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> extends AsyncTraversalExecution<
    DagVisitorPhase,
    DagEvent<T | R, ID>,
    CoreInspection,
    'workCompleted' | 'subgraphCompleted'
  > {
  readonly originalGraphView: OriginalGraphView<T, ID> | null;
  prepare(): Promise<this>;
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

export class InternalAsyncDagTraversalRunner<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  private readonly terminalObservation: ReturnType<
    typeof getDagTerminalObservation
  >;
  private readonly icfg: AsyncDagResolvedOptions<T, R, ID>;
  private readonly state: DagTraversalRunnerState<T, R>;
  private readonly resolvedGraphsContainer: ResolvedGraphsContainer<T, R, ID>;
  readonly originalGraphView: OriginalGraphView<T, ID> | null;
  private iterableConfig: DagTraversalRunnerIterableConfig =
    makeEffectiveDagTraversalRunnerIterableConfig();
  private readonly kernel: TraversalKernel<T, R>;
  private readonly notifyProgress: () => void;
  private readonly execution: AsyncRunnerSession<Event<T, R, ID>>;

  constructor(input: AsyncDagResolvedOptions<T, R, ID>) {
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
        [DagVisitorPhase.ON_WORK_READY]: (call) => this.visit(call),
        [DagVisitorPhase.ON_SUBGRAPH_READY]: (call) => this.visit(call),
      },
    });
    const kernel = (this.kernel = new TraversalKernel({
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
      execution: 'async',
      sourceMode,
      container: this.resolvedGraphsContainer,
      stateBridge: this.state,
      visitorMetadata: {
        [DagVisitorPhase.ON_WORK_READY]: this.metadataFor(
          DagVisitorPhase.ON_WORK_READY,
        ),
        [DagVisitorPhase.ON_SUBGRAPH_READY]: this.metadataFor(
          DagVisitorPhase.ON_SUBGRAPH_READY,
        ),
      },
      iterableConfig: this.iterableConfig,
      inOrderConfig: null,
      hasSorter: input.sortChildrenHints !== null,
      hasPrerequisiteResolver: source.resolvePrerequisite !== undefined,
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
    }));
    const driver = createAsyncDriver(kernel, bindings, input.concurrency);
    this.notifyProgress = driver.notifyProgress;
    const projectedControl = this.projectEvents(driver, policy);
    this.execution = new AsyncRunnerSession(projectedControl);
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

  async prepare(): Promise<this> {
    await this.execution.prepare(() => this.kernel.validatePreparation());
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
    this.notifyProgress();
    return accepted;
  }

  getStatus(): TraversalRunnerStatus {
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

  iterateEvents(
    config?: TraversalExecutionOptions<DagVisitorPhase>,
  ): AsyncGenerator<Event<T, R, ID>, void, unknown> {
    return this.execution.iterateEvents(config);
  }

  async run(
    config?: TraversalExecutionOptions<DagVisitorPhase>,
  ): Promise<this> {
    await this.execution.run(config);
    return this;
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

  private projectEvents(
    control: AsyncSessionControl<KernelEvent<T | R>>,
    policy: DagPolicy<T, R>,
  ): AsyncSessionControl<Event<T, R, ID>> {
    return {
      advance: (mode): SessionProgress<Event<T, R, ID>> => {
        const progress = control.advance(mode);
        if (progress.kind === 'EVENT') {
          return {
            kind: 'EVENT',
            boundaryId: progress.boundaryId,
            event: {
              vertex: progress.event.vertex,
              vertexRef: progress.event.vertexRef,
              vertexId: this.getResolvedGraph().getVertexId(
                progress.event.vertexRef,
              ),
              ...(progress.event.order === DagVisitorPhase.ON_WORK_READY
                ? ({
                    kind: 'workCompleted',
                  } as const)
                : ({
                    kind: 'subgraphCompleted',
                  } as const)),
              isGraphRoot: progress.event.isRoot,
              isTraversalRoot: progress.event.isTraversalRoot,
            },
          };
        }
        if (progress.kind === 'FINISHED' || progress.kind === 'FAILED') {
          if (progress.kind === 'FAILED' && this.state.failure === null) {
            this.state.failure = { error: progress.error };
          }
          captureDagTerminalObservation(this.state, this.kernel);
          policy.releaseIfTerminal();
        }
        return progress;
      },
      acknowledgeEvent: (boundaryId) => control.acknowledgeEvent(boundaryId),
      requestHalt: () => control.requestHalt(),
      isHaltRequested: () => control.isHaltRequested(),
      resume: (config, preparation) => {
        policy.claim();
        control.resume(config, preparation);
      },
      getStatus: () => control.getStatus(),
      getStopReason: () => control.getStopReason(),
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
