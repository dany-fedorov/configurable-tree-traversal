import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalRunner,
  TraversalRunnerIteratorResultContent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import { CTTRef } from '@core/CTTRef';
import { Vertex } from '@core/Vertex';
import type { ResolvedTree, VertexResolutionContext } from '@core/ResolvedTree';
import {
  TraversalVisitorCommandName,
  type TraversalVisitorCommand,
  type TraversalVisitorCommandArguments,
} from '@core/TraversalVisitor';
import {
  executeVisitors,
  type VisitorCommandResult,
} from '@core/executeVisitors';
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
import { shouldVisitParentOnInOrder } from '../in-order-helpers/shouldVisitParentOnInOrder';
import { shouldRunVisitorsForOrder } from '../iterable-helpers/shouldRunVisitorsForOrder';
import { shouldYieldForOrder } from '../iterable-helpers/shouldYieldForOrder';

type Event<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>;

type Frame<TTP extends TreeTypeParameters> = {
  vertexRef: CTTRef<Vertex<TTP>>;
  depth: number;
  phase: 'pre' | 'children' | 'post' | 'done';
  hints: TTP['VertexHint'][];
  nextChild: number;
  completedChild: { index: number; resolved: boolean } | null;
};

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

  constructor(icfgInput: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>) {
    this.icfg = {
      ...mergeInstanceConfigs(icfgInput, {}),
      visitors: initVisitors(icfgInput),
    };
    this.state = new DepthFirstTraversalRunnerState(this.icfg);
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer(
      this.icfg,
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
  isLeafVertexRef(ref: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return (
      this.state.subtreeTraversalDisabledRefs.has(ref) ||
      ref.unref().isLeafVertex()
    );
  }

  private executeCommands(
    order: DepthFirstTraversalOrder,
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
          if (order !== DepthFirstTraversalOrder.PRE_ORDER) {
            throw new Error(
              'Child hints can only be rewritten during pre-order',
            );
          }
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
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): Generator<Event<TTP, RW_TTP> | null> {
    if (!this.getResolvedTree().has(vertexRef)) return;
    if (shouldRunVisitorsForOrder(this.iterableConfig, order)) {
      const state = this.state.visitorsState[order];
      const execution = executeVisitors({
        vertexRef,
        records: this.icfg.visitors[order],
        state,
        getOptions: (visitorRecord, vertexVisitorsChainState) => ({
          ...state,
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
          this.executeCommands(order, vertexRef, commands),
        isHalted: () => this.isHalted(),
        isDeleted: () => !this.getResolvedTree().has(vertexRef),
      });
      for (const _pause of execution) yield null;
    }
    if (
      this.getResolvedTree().has(vertexRef) &&
      shouldYieldForOrder(this.iterableConfig, order)
    ) {
      yield {
        vertex: vertexRef.unref(),
        vertexRef,
        order,
        isTreeRoot: this.isTreeRootVertex(vertexRef),
        isTraversalRoot: this.isTraversalRootVertex(vertexRef),
      };
    }
  }

  private makeFrame(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    depth: number,
  ): Frame<TTP | RW_TTP> {
    return {
      vertexRef,
      depth,
      phase: 'pre',
      hints: [],
      nextChild: 0,
      completedChild: null,
    };
  }

  private *getInternalGenerator(): Generator<Event<TTP, RW_TTP> | null> {
    let root = this.getResolvedTree().getRoot();
    if (root === null) {
      const content = this.icfg.traversableTree.makeRoot().vertexContent;
      if (content === null) return;
      root = new CTTRef(new Vertex<TTP | RW_TTP>(content));
      this.resolvedTreesContainer.setRoot(root);
    }
    this.state.traversalRootVertexRef = root;
    const frames: Frame<TTP | RW_TTP>[] = [this.makeFrame(root, 0)];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1]!;
      const ref = frame.vertexRef;
      if (!this.getResolvedTree().has(ref)) {
        frames.pop();
        continue;
      }
      switch (frame.phase) {
        case 'pre': {
          yield* this.visit(DepthFirstTraversalOrder.PRE_ORDER, ref);
          const hints = this.isLeafVertexRef(ref)
            ? []
            : ref.unref().getChildrenHints().slice();
          frame.hints = this.icfg.sortChildrenHints?.(hints) ?? hints;
          frame.phase = 'children';
          break;
        }
        case 'children': {
          if (frame.completedChild !== null) {
            const completed = frame.completedChild;
            frame.completedChild = null;
            if (
              (completed.resolved ||
                this.icfg.inOrderTraversalConfig
                  .considerVisitAfterNullContentVertices) &&
              shouldVisitParentOnInOrder(
                this.icfg.inOrderTraversalConfig,
                completed.index,
                frame.hints.length,
              )
            ) {
              yield* this.visit(DepthFirstTraversalOrder.IN_ORDER, ref);
            }
            break;
          }
          if (
            frame.nextChild < frame.hints.length &&
            !this.state.subtreeTraversalDisabledRefs.has(ref)
          ) {
            const index = frame.nextChild++;
            const context: VertexResolutionContext<TTP | RW_TTP> = {
              parentVertexRef: ref,
              parentVertex: ref.unref(),
              depth: frame.depth + 1,
              hintIndex: index,
              vertexHint: frame.hints[index],
            };
            const content = this.icfg.traversableTree.makeVertex(
              context.vertexHint,
              {
                resolutionContext: context,
                resolvedTree: this.getResolvedTree(),
                notMutatedResolvedTree:
                  this.resolvedTreesContainer.notMutatedResolvedTree,
              },
            ).vertexContent;
            frame.completedChild = { index, resolved: content !== null };
            if (content !== null) {
              const child = new CTTRef(new Vertex<TTP | RW_TTP>(content));
              this.resolvedTreesContainer.setWithResolutionContext(
                child,
                context,
              );
              this.resolvedTreesContainer.pushChildrenTo(ref, [child]);
              frames.push(this.makeFrame(child, context.depth));
            }
          } else {
            frame.phase = 'post';
            if (frame.hints.length === 0)
              yield* this.visit(DepthFirstTraversalOrder.IN_ORDER, ref);
          }
          break;
        }
        case 'post':
          frame.phase = 'done';
          yield* this.visit(DepthFirstTraversalOrder.POST_ORDER, ref);
          break;
        case 'done':
          frames.pop();
          break;
      }
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
      if (this.getStatus() === TraversalRunnerStatus.RUNNING)
        this.state.status = TraversalRunnerStatus.HALTED;
    }
  }

  run(config?: DepthFirstTraversalRunnerIterableConfigInput): this {
    for (const _event of this.getIterable(config)) {
      /* Drain traversal events. */
    }
    return this;
  }
}
