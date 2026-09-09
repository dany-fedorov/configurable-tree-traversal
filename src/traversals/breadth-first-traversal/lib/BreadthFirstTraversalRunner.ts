import { CTTRef } from '@core/CTTRef';
import {
  executeVisitors,
  type VisitorCommandResult,
} from '@core/executeVisitors';
import type { ResolvedTree } from '@core/ResolvedTree';
import type {
  TraversalRunner,
  TraversalRunnerIteratorResultContent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import {
  TraversalVisitorCommandName,
  type TraversalVisitorCommand,
  type TraversalVisitorCommandArguments,
} from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  type DepthFirstTraversalInstanceConfig,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
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

  isTraversalRootVertex(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return ref === this.state.traversalRootVertexRef;
  }

  isTreeRootVertex(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return ref === this.getResolvedTree().getRoot();
  }

  private shouldRunVisitors(): boolean {
    if (Array.isArray(this.iterableConfig.enableVisitorFunctionsFor)) {
      return this.iterableConfig.enableVisitorFunctionsFor.includes(
        BreadthFirstTraversalOrder.LEVEL_ORDER,
      );
    }
    return !this.iterableConfig.disableVisitorFunctionsFor?.includes(
      BreadthFirstTraversalOrder.LEVEL_ORDER,
    );
  }

  private shouldYield(): boolean {
    return this.iterableConfig.iterateOver.includes(
      BreadthFirstTraversalOrder.LEVEL_ORDER,
    );
  }

  private executeCommands(
    ref: CTTRef<Vertex<TTP | RW_TTP>>,
    commands: TraversalVisitorCommand<RW_TTP>[],
  ): VisitorCommandResult {
    const result: VisitorCommandResult = {};
    for (const command of commands) {
      switch (command.commandName) {
        case TraversalVisitorCommandName.NOOP:
          break;
        case TraversalVisitorCommandName.HALT_TRAVERSAL:
          this.state.status = TraversalRunnerStatus.HALTED;
          break;
        case TraversalVisitorCommandName.DELETE_VERTEX:
          this.resolvedTreesContainer.delete(ref);
          this.state.subtreeTraversalDisabledRefs.add(ref);
          break;
        case TraversalVisitorCommandName.DISABLE_SUBTREE_TRAVERSAL:
          this.state.subtreeTraversalDisabledRefs.add(ref);
          break;
        case TraversalVisitorCommandName.REWRITE_VERTEX_DATA: {
          const args =
            command.commandArguments as TraversalVisitorCommandArguments<RW_TTP>[TraversalVisitorCommandName.REWRITE_VERTEX_DATA];
          ref.setPointsTo(ref.unref().clone({ $d: args.newData }));
          break;
        }
        case TraversalVisitorCommandName.SET_VERTEX_VISITORS_CHAIN_STATE: {
          const args =
            command.commandArguments as TraversalVisitorCommandArguments<RW_TTP>[TraversalVisitorCommandName.SET_VERTEX_VISITORS_CHAIN_STATE];
          result.vertexVisitorsChainState = args.vertexVisitorsChainState;
          break;
        }
        case TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER: {
          const args =
            command.commandArguments as TraversalVisitorCommandArguments<RW_TTP>[TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER];
          ref.setPointsTo(ref.unref().clone({ $c: args.newHints.slice() }));
          break;
        }
      }
    }
    return result;
  }

  private *visit(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): Generator<Event<TTP, RW_TTP> | null> {
    if (!this.getResolvedTree().has(vertexRef)) return;
    if (this.shouldRunVisitors()) {
      const order = BreadthFirstTraversalOrder.LEVEL_ORDER;
      const visitorState = this.state.visitorsState[order];
      const execution = executeVisitors({
        vertexRef,
        records: this.icfg.visitors[order],
        state: visitorState,
        getOptions: (visitorRecord, vertexVisitorsChainState) => ({
          ...visitorState,
          resolvedTree: this.getResolvedTree(),
          notMutatedResolvedTree:
            this.resolvedTreesContainer.notMutatedResolvedTree,
          isTreeRoot: this.isTreeRootVertex(vertexRef),
          isTraversalRoot: this.isTraversalRootVertex(vertexRef),
          vertexRef,
          visitorRecord,
          vertexVisitorsChainState,
          order,
        }),
        executeCommands: (commands) =>
          this.executeCommands(vertexRef, commands),
        isHalted: () => this.isHalted(),
        isDeleted: () => !this.getResolvedTree().has(vertexRef),
      });
      for (const _pause of execution) yield null;
    }
    if (this.getResolvedTree().has(vertexRef) && this.shouldYield()) {
      yield {
        vertex: vertexRef.unref(),
        vertexRef,
        order: BreadthFirstTraversalOrder.LEVEL_ORDER,
        isTreeRoot: this.isTreeRootVertex(vertexRef),
        isTraversalRoot: this.isTraversalRootVertex(vertexRef),
      };
    }
  }

  private scheduleChildren(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    depth: number,
  ): void {
    if (
      !this.getResolvedTree().has(vertexRef) ||
      this.state.subtreeTraversalDisabledRefs.has(vertexRef)
    ) {
      return;
    }
    const copiedHints = vertexRef.unref().getChildrenHints().slice();
    const hints = this.icfg.sortChildrenHints?.(copiedHints) ?? copiedHints;
    for (let hintIndex = 0; hintIndex < hints.length; hintIndex++) {
      this.state.queue.push({
        depth: depth + 1,
        parentVertex: vertexRef.unref(),
        parentVertexRef: vertexRef,
        hintIndex,
        vertexHint: hints[hintIndex],
      });
    }
  }

  private *getInternalGenerator(): Generator<Event<TTP, RW_TTP> | null> {
    let rootRef = this.getResolvedTree().getRoot();
    if (rootRef === null) {
      const rootContent = this.icfg.traversableTree.makeRoot().vertexContent;
      if (rootContent === null) return;
      rootRef = new CTTRef(new Vertex<TTP | RW_TTP>(rootContent));
      this.resolvedTreesContainer.setRoot(rootRef);
    }
    this.state.traversalRootVertexRef = rootRef;
    yield* this.visit(rootRef);
    this.scheduleChildren(rootRef, 0);

    while (this.state.queueIndex < this.state.queue.length) {
      const context = this.state.queue[this.state.queueIndex++]!;
      if (
        !this.getResolvedTree().has(context.parentVertexRef) ||
        this.state.subtreeTraversalDisabledRefs.has(context.parentVertexRef)
      ) {
        continue;
      }
      const vertexContent = this.icfg.traversableTree.makeVertex(
        context.vertexHint as TTP['VertexHint'],
        {
          resolutionContext: context,
          resolvedTree: this.getResolvedTree(),
          notMutatedResolvedTree:
            this.resolvedTreesContainer.notMutatedResolvedTree,
        },
      ).vertexContent;
      if (vertexContent === null) continue;
      const vertexRef = new CTTRef(new Vertex<TTP | RW_TTP>(vertexContent));
      this.resolvedTreesContainer.setWithResolutionContext(vertexRef, context);
      this.resolvedTreesContainer.pushChildrenTo(context.parentVertexRef, [
        vertexRef,
      ]);
      yield* this.visit(vertexRef);
      this.scheduleChildren(vertexRef, context.depth);
    }
    this.state.queue.length = 0;
    this.state.queueIndex = 0;
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
        if (this.isHalted()) return;
        if (next.value !== null) yield next.value;
      }
    } finally {
      this.activeIterator = false;
      if (this.getStatus() === TraversalRunnerStatus.RUNNING) {
        this.state.status = TraversalRunnerStatus.HALTED;
      }
    }
  }

  run(config?: BreadthFirstTraversalRunnerIterableConfigInput): this {
    for (const _event of this.getIterable(config)) {
      // Drain traversal events.
    }
    return this;
  }
}
