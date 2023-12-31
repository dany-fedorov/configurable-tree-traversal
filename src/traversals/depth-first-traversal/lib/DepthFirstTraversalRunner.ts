import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalRunner,
  TraversalRunnerIteratorResultContent,
} from '@core/TraversalRunner';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import { DepthFirstTraversalRunnerState } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerState';
import { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { ResolvedTree, VertexResolutionContext } from '@core/ResolvedTree';
import type {
  DepthFirstTraversalRunnerIterableConfig,
  DepthFirstTraversalRunnerIterableConfigInput,
} from '@depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { makeEffectiveDepthFirstTraversalRunnerIterableConfig } from '@depth-first-traversal/lib/DepthFirstTraversalRunnerIterableConfig';
import { CTTRef } from '@core/CTTRef';
import { Vertex } from '@core/Vertex';
import type { TraversableTree } from '@core/TraversableTree';
import type { DepthFirstTraversalInstanceConfig } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import {
  type TraversalVisitorCommand,
  type TraversalVisitorCommandArguments,
  TraversalVisitorCommandName,
  TraversalVisitorFunctionResolutionStyle,
  type TraversalVisitorInputOptions,
  type TraversalVisitorRecord,
  type TraversalVisitorResult,
} from '@core/TraversalVisitor';
import type { DepthFirstTraversalExecuteVisitorCommandsResult } from '@depth-first-traversal/lib/DepthFirstTraversalExecuteVisitorCommandsResult';
import { initVisitors } from '@depth-first-traversal/init-helpers/initVisitors';
import { shouldVisitParentOnInOrder } from '@depth-first-traversal/in-order-helpers/shouldVisitParentOnInOrder';
import { shouldRunVisitorsForOrder } from '@depth-first-traversal/iterable-helpers/shouldRunVisitorsForOrder';
import { shouldYieldForOrder } from '@depth-first-traversal/iterable-helpers/shouldYieldForOrder';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

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
  curGenerator: Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > | null;

  constructor(icfgInput: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>) {
    this.icfg = icfgInput;
    this.icfg.visitors = initVisitors(icfgInput);
    this.state = new DepthFirstTraversalRunnerState(icfgInput);
    this.resolvedTreesContainer = new DepthFirstTraversalResolvedTreesContainer<
      TTP,
      RW_TTP
    >(icfgInput);
    this.curGenerator = null;
  }

  private setStatus(status: TraversalRunnerStatus): void {
    this.state.status = status;
  }

  getStatus(): TraversalRunnerStatus {
    return this.state.status;
  }

  getResolvedTree(): ResolvedTree<TTP | RW_TTP> {
    return this.resolvedTreesContainer.resolvedTree;
  }

  private getTraversableTree(): TraversableTree<TTP, RW_TTP> {
    return this.icfg.traversableTree;
  }

  private initRootVertex(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    if (
      this.state.traversalRootVertexRef !== null &&
      this.resolvedTreesContainer.resolvedTree.getRoot() !== null
    ) {
      // Already initialized, this is a continuation
      return this.resolvedTreesContainer.resolvedTree.getRoot();
    }
    const makeRootResult = this.getTraversableTree().makeRoot();
    if (makeRootResult.vertexContent === null) {
      return null;
    }
    const rootVertexRef = new CTTRef<Vertex<TTP | RW_TTP>>(
      new Vertex<TTP | RW_TTP>(makeRootResult.vertexContent),
    );
    this.setTraversalRootVertexRef(rootVertexRef);
    this.resolvedTreesContainer.setRoot(rootVertexRef);
    return rootVertexRef;
  }

  private setTraversalRootVertexRef(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): void {
    this.state.traversalRootVertexRef = vertexRef;
  }

  private hasInOrderVisitors(): boolean {
    return this.icfg.visitors[DepthFirstTraversalOrder.IN_ORDER].length > 0;
  }

  private hasPostOrderVisitors(): boolean {
    return this.icfg.visitors[DepthFirstTraversalOrder.POST_ORDER].length > 0;
  }

  private hasPostOrderOrInOrderVisitors(): boolean {
    return this.hasPostOrderVisitors() || this.hasInOrderVisitors();
  }

  private pushHintsOf(
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    parentDepth: number,
  ): void {
    const childrenHints = parentVertexRef.unref().getChildrenHints();
    const sortedChildrenHints =
      typeof this.icfg.sortChildrenHints !== 'function'
        ? childrenHints
        : this.icfg.sortChildrenHints(childrenHints.slice());
    const newEntries: VertexResolutionContext<TTP | RW_TTP>[] = [];
    for (let i = 0; i < sortedChildrenHints.length; i++) {
      const vertexHintIndex = sortedChildrenHints.length - i - 1;
      const hint = childrenHints[vertexHintIndex];
      newEntries.push({
        depth: parentDepth + 1,
        vertexHint: hint,
        parentVertexRef,
        parentVertex: parentVertexRef.unref(),
        hintIndex: vertexHintIndex,
      });
    }
    this.state.pushToStack(parentVertexRef, newEntries);
    if (this.hasPostOrderOrInOrderVisitors()) {
      this.state.postOrderNotVisitedChildrenCountMap.set(
        parentVertexRef,
        newEntries.length,
      );
    }
  }

  isTraversalRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return vertexRef === this.state.traversalRootVertexRef;
  }

  isTreeRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return vertexRef === this.resolvedTreesContainer.resolvedTree.getRoot();
  }

  private executeVisitorCommands(
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    commands: TraversalVisitorCommand<RW_TTP>[],
  ): DepthFirstTraversalExecuteVisitorCommandsResult {
    const res: DepthFirstTraversalExecuteVisitorCommandsResult = {};
    commands?.forEach((command: TraversalVisitorCommand<RW_TTP>) => {
      switch (command.commandName) {
        case TraversalVisitorCommandName.HALT_TRAVERSAL:
          this.setStatus(TraversalRunnerStatus.HALTED);
          break;
        case TraversalVisitorCommandName.REWRITE_VERTEX_DATA: {
          const newData = (
            command.commandArguments as TraversalVisitorCommandArguments<TTP>[TraversalVisitorCommandName.REWRITE_VERTEX_DATA]
          ).newData;
          vertexRef.setPointsTo(
            vertexRef.unref().clone({
              $d: newData,
            }),
          );
          break;
        }
        case TraversalVisitorCommandName.DELETE_VERTEX:
          this.resolvedTreesContainer.delete(vertexRef);
          break;
        case TraversalVisitorCommandName.SET_VERTEX_VISITORS_CHAIN_STATE:
          res.vertexVisitorsChainState = (
            command.commandArguments as TraversalVisitorCommandArguments<TTP>[TraversalVisitorCommandName.SET_VERTEX_VISITORS_CHAIN_STATE]
          ).vertexVisitorsChainState;
          break;
        case TraversalVisitorCommandName.DISABLE_SUBTREE_TRAVERSAL:
          this.state.subtreeTraversalDisabledRefs.add(vertexRef);
          break;
        case TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER:
          // TODO: Probably need to refactor
          if (order !== DepthFirstTraversalOrder.PRE_ORDER) {
            console.warn(
              `${DepthFirstTraversalRunner.name}.executeVisitorCommands:: Cannot execute ${TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER} command on this order - ${order}`,
            );
            break;
          } else {
            const newHints = (
              command.commandArguments as TraversalVisitorCommandArguments<TTP>[TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER]
            ).newHints;
            vertexRef.setPointsTo(
              vertexRef.unref().clone({
                $c: newHints,
              }),
            );
            const range =
              this.state.vertexRefStackChildrenHintsRanges.get(vertexRef);
            const sortedChildrenHints =
              typeof this.icfg.sortChildrenHints !== 'function'
                ? newHints
                : this.icfg.sortChildrenHints(newHints.slice());
            const newEntries: VertexResolutionContext<TTP | RW_TTP>[] = [];
            let effectiveRange = range;
            if (!effectiveRange) {
              effectiveRange = [
                this.state.STACK.length,
                this.state.STACK.length + newEntries.length,
              ];
            }
            const depth =
              this.getResolvedTree().get(vertexRef)?.getResolutionContext()
                ?.depth ?? 0;
            for (let i = 0; i < sortedChildrenHints.length; i++) {
              const vertexHintIndex = sortedChildrenHints.length - i - 1;
              const hint = newHints[vertexHintIndex];
              newEntries.push({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                depth: depth + 1,
                vertexHint: hint,
                parentVertexRef: vertexRef,
                parentVertex: vertexRef.unref(),
                hintIndex: vertexHintIndex,
              });
            }
            this.state.STACK.splice(
              effectiveRange[0],
              effectiveRange[1] - effectiveRange[0],
              ...newEntries,
            );
            this.state.vertexRefStackChildrenHintsRanges.set(vertexRef, [
              effectiveRange[0],
              effectiveRange[0] + newEntries.length + 1,
            ]);
            if (this.hasPostOrderOrInOrderVisitors()) {
              this.state.postOrderNotVisitedChildrenCountMap.set(
                vertexRef,
                newEntries.length,
              );
            }
            // console.log('Going to rewrite', range, 'with', newHints);
          }
          break;
        default:
          return;
      }
    });
    return res;
  }

  private getVisitorOptions(
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    visitorRecord: TraversalVisitorRecord<
      DepthFirstTraversalOrder,
      TTP,
      RW_TTP
    >,
    vertexVisitorsChainState: unknown,
  ): TraversalVisitorInputOptions<DepthFirstTraversalOrder, TTP, RW_TTP> {
    return {
      resolvedTree: this.resolvedTreesContainer.resolvedTree,
      notMutatedResolvedTree:
        this.resolvedTreesContainer.notMutatedResolvedTree,
      vertexVisitIndex: this.state.visitorsState[order].vertexVisitIndex,
      curVertexVisitorVisitIndex:
        this.state.visitorsState[order].curVertexVisitorVisitIndex,
      previousVisitedVertexRef:
        this.state.visitorsState[order].previousVisitedVertexRef,
      isTraversalRoot: this.isTraversalRootVertex(vertexRef),
      isTreeRoot: this.isTreeRootVertex(vertexRef),
      vertexVisitorsChainState,
      vertexRef,
      visitorRecord,
      order,
    };
  }

  private getSeparateVisitorsFor(order: DepthFirstTraversalOrder): {
    concurrent: TraversalVisitorRecord<DepthFirstTraversalOrder, TTP, RW_TTP>[];
    sequential: TraversalVisitorRecord<DepthFirstTraversalOrder, TTP, RW_TTP>[];
  } {
    const visitorRecords = this.icfg.visitors[order];
    const concurrent: TraversalVisitorRecord<
      DepthFirstTraversalOrder,
      TTP,
      RW_TTP
    >[] = [];
    const sequential: TraversalVisitorRecord<
      DepthFirstTraversalOrder,
      TTP,
      RW_TTP
    >[] = [];
    visitorRecords.forEach((vr) => {
      switch (vr.resolutionStyle) {
        case TraversalVisitorFunctionResolutionStyle.CONCURRENT: {
          concurrent.push(vr);
          break;
        }
        case TraversalVisitorFunctionResolutionStyle.SEQUENTIAL: {
          sequential.push(vr);
          break;
        }
        default:
          throw new Error('Unexpected resolutionStyle');
      }
    });
    return {
      concurrent,
      sequential,
    };
  }

  private runConcurrentVisitors(
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    concurrentVisitors: TraversalVisitorRecord<
      DepthFirstTraversalOrder,
      TTP,
      RW_TTP
    >[],
  ): void {
    const concurrentCommands: TraversalVisitorCommand<RW_TTP>[] =
      concurrentVisitors
        .map((visitorRecord) => {
          return visitorRecord.visitor(
            vertexRef.unref(),
            this.getVisitorOptions(order, vertexRef, visitorRecord, null),
          );
        })
        .reduce(
          (
            acc: TraversalVisitorCommand<RW_TTP>[],
            res: TraversalVisitorResult<RW_TTP> | undefined | void,
          ) => {
            return [...acc, ...(res?.commands ?? [])];
          },
          [],
        );
    this.executeVisitorCommands(order, vertexRef, concurrentCommands);
  }

  private runSequentialVisitors(
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    sequentialVisitors: TraversalVisitorRecord<
      DepthFirstTraversalOrder,
      TTP,
      RW_TTP
    >[],
  ): void {
    let vertexVisitorsChainState = null;
    for (const visitorRecord of sequentialVisitors) {
      const visitorRes = visitorRecord.visitor(
        vertexRef.unref(),
        this.getVisitorOptions(
          order,
          vertexRef,
          visitorRecord,
          vertexVisitorsChainState,
        ),
      );
      this.state.visitorsState[order].curVertexVisitorVisitIndex += 1;
      const commandsRes = this.executeVisitorCommands(
        order,
        vertexRef,
        visitorRes?.commands ?? [],
      );
      if (this.isHalted()) {
        return;
      }
      if (
        Object.prototype.hasOwnProperty.call(
          commandsRes,
          'vertexVisitorsChainState',
        )
      ) {
        vertexVisitorsChainState = commandsRes.vertexVisitorsChainState;
      }
    }
  }

  private visitVertex(
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): void {
    const { sequential, concurrent } = this.getSeparateVisitorsFor(order);
    this.state.visitorsState[order].previousVisitedVertexRef = vertexRef;
    this.state.visitorsState[order].vertexVisitIndex += 1;
    this.state.visitorsState[order].curVertexVisitorVisitIndex = 0;
    this.runConcurrentVisitors(order, vertexRef, concurrent);
    this.state.visitorsState[order].curVertexVisitorVisitIndex += 1;
    if (this.isHalted()) {
      return;
    }
    this.runSequentialVisitors(order, vertexRef, sequential);
  }

  isHalted(): boolean {
    return this.getStatus() === TraversalRunnerStatus.HALTED;
  }

  private onInOrderProcessing_getInOrderSiblingsContext(
    vertexContext: VertexResolutionContext<TTP | RW_TTP>,
  ) {
    const postOrderNotVisitedSiblingsCount =
      this.state.postOrderNotVisitedChildrenCountMap.get(
        vertexContext.parentVertexRef,
      );
    if (postOrderNotVisitedSiblingsCount == null) {
      throw new Error(
        [
          'countVisitedOnPostOrderAChildOf::Could not find entry in postOrderNotVisitedChildrenCountMap',
          `trying to count for parent: ${jsonStringifySafe(
            vertexContext.parentVertexRef,
          )}`,
        ].join(', '),
      );
    }
    const allSiblingsCount = vertexContext.parentVertexRef
      .unref()
      .getChildrenHints().length;
    const justVisitedIndex =
      allSiblingsCount - postOrderNotVisitedSiblingsCount;
    return {
      justVisitedIndex,
      allSiblingsCount,
    };
  }

  private *onPostOrder_tryInOrderVisitOnLeafVertex(
    iterableConfig: DepthFirstTraversalRunnerIterableConfig,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    if (this.hasInOrderVisitors() && this.isLeafVertexRef(vertexRef)) {
      yield* this.yieldAndVisit(
        iterableConfig,
        DepthFirstTraversalOrder.IN_ORDER,
        vertexRef,
      );
    }
  }

  private *onPostOrder_tryInOrderVisitOnParentVertex(
    iterableConfig: DepthFirstTraversalRunnerIterableConfig,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    if (!this.hasInOrderVisitors() || vertexContext === null) {
      return;
    }
    const { justVisitedIndex, allSiblingsCount } =
      this.onInOrderProcessing_getInOrderSiblingsContext(vertexContext);
    // console.log('onPostOrder_tryInOrderVisitOnParentVertex::justVisitedIndex, allSiblingsCount',justVisitedIndex, allSiblingsCount)
    if (
      shouldVisitParentOnInOrder(
        this.icfg.inOrderTraversalConfig,
        justVisitedIndex,
        allSiblingsCount,
      )
    ) {
      yield* this.yieldAndVisit(
        iterableConfig,
        DepthFirstTraversalOrder.IN_ORDER,
        vertexContext.parentVertexRef,
      );
    }
  }

  private *onPostOrder_tryPostOrderVisit(
    iterableConfig: DepthFirstTraversalRunnerIterableConfig,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    if (this.hasPostOrderVisitors()) {
      yield* this.yieldAndVisit(
        iterableConfig,
        DepthFirstTraversalOrder.POST_ORDER,
        vertexRef,
      );
    }
  }

  private *onPostOrder(
    iterableConfig: DepthFirstTraversalRunnerIterableConfig,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    let curVertexRef = vertexRef;
    let curVertexContext = vertexContext;
    while (curVertexRef !== null) {
      yield* this.onPostOrder_tryInOrderVisitOnLeafVertex(
        iterableConfig,
        curVertexRef,
      );

      yield* this.onPostOrder_tryPostOrderVisit(iterableConfig, curVertexRef);

      yield* this.onPostOrder_tryInOrderVisitOnParentVertex(
        iterableConfig,
        curVertexContext,
      );

      if (!curVertexContext?.parentVertexRef) {
        break;
      }
      const newPostOrderNotVisitedChildrenCount =
        this.state.countVisitedOnPostOrderAChildOf(
          curVertexContext.parentVertexRef,
        );
      if (newPostOrderNotVisitedChildrenCount > 0) {
        break;
      } else {
        const parentVertexContext =
          this.resolvedTreesContainer.resolvedTree
            .get(curVertexContext.parentVertexRef)
            ?.getResolutionContext() ?? null;
        if (parentVertexContext == null) {
          break;
        }
        curVertexRef = curVertexContext.parentVertexRef;
        curVertexContext = parentVertexContext;
      }
    }
  }

  private *onPreOrder(
    iterableConfig: DepthFirstTraversalRunnerIterableConfig,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP>,
  ): Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    this.resolvedTreesContainer.setWithResolutionContext(
      vertexRef,
      vertexContext,
    );
    this.resolvedTreesContainer.pushChildrenTo(vertexContext.parentVertexRef, [
      vertexRef,
    ]);
    this.pushHintsOf(vertexRef, vertexContext.depth);
    yield* this.yieldAndVisit(
      iterableConfig,
      DepthFirstTraversalOrder.PRE_ORDER,
      vertexRef,
    );
  }

  private getIteratorResultContent(
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): TraversalRunnerIteratorResultContent<
    DepthFirstTraversalOrder,
    TTP,
    RW_TTP
  > {
    return {
      vertex: vertexRef.unref(),
      vertexRef,
      order,
      isTreeRoot: this.isTreeRootVertex(vertexRef),
      isTraversalRoot: this.isTraversalRootVertex(vertexRef),
    };
  }

  private *yieldAndVisit(
    iterableConfig: DepthFirstTraversalRunnerIterableConfig,
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ) {
    if (shouldRunVisitorsForOrder(iterableConfig, order)) {
      this.visitVertex(order, vertexRef);
    }
    if (shouldYieldForOrder(iterableConfig, order)) {
      yield this.getIteratorResultContent(order, vertexRef);
    }
  }

  private *getInternalGenerator(
    config?: DepthFirstTraversalRunnerIterableConfigInput,
  ): Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    const iterableConfig =
      makeEffectiveDepthFirstTraversalRunnerIterableConfig(config);
    const rootVertexRef = this.initRootVertex();
    if (rootVertexRef === null) {
      return;
    }

    this.pushHintsOf(rootVertexRef, 0);
    yield* this.yieldAndVisit(
      iterableConfig,
      DepthFirstTraversalOrder.PRE_ORDER,
      rootVertexRef,
    );

    while (this.state.STACK.length > 0) {
      const { vertexContext, stackIsEmpty } = this.state.popStack();
      if (stackIsEmpty) {
        break;
      }
      const makeVertexResult = this.getTraversableTree().makeVertex(
        vertexContext.vertexHint,
        {
          resolutionContext: vertexContext,
          resolvedTree: this.resolvedTreesContainer.resolvedTree,
          notMutatedResolvedTree:
            this.resolvedTreesContainer.notMutatedResolvedTree,
        },
      );
      const vertexContent = makeVertexResult?.vertexContent || null;
      if (vertexContent === null) {
        if (
          this.icfg.inOrderTraversalConfig.considerVisitAfterNullContentVertices
        ) {
          yield* this.onPostOrder_tryInOrderVisitOnParentVertex(
            iterableConfig,
            vertexContext,
          );
          this.state.countVisitedOnPostOrderAChildOf(
            vertexContext.parentVertexRef,
          );
        }
        continue;
      }
      const vertexRef = new CTTRef(new Vertex(vertexContent));
      yield* this.onPreOrder(iterableConfig, vertexRef, vertexContext);

      if (
        this.isLeafVertexRef(vertexRef) &&
        this.hasPostOrderOrInOrderVisitors()
      ) {
        yield* this.onPostOrder(iterableConfig, vertexRef, vertexContext);
      }
    }

    yield* this.onPostOrder(iterableConfig, rootVertexRef, null);

    return;
  }

  isLeafVertexRef(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return (
      this.state.subtreeTraversalDisabledRefs.has(vertexRef) ||
      vertexRef.unref().isLeafVertex()
    );
  }

  *getIterable(
    config?: DepthFirstTraversalRunnerIterableConfigInput,
  ): Generator<
    TraversalRunnerIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    if (this.getStatus() === TraversalRunnerStatus.FINISHED) {
      return this;
    }
    if (this.curGenerator === null) {
      this.curGenerator = this.getInternalGenerator(config);
    }
    this.setStatus(TraversalRunnerStatus.RUNNING);
    while (true) {
      const r = this.curGenerator.next();
      if (r.done === true) {
        this.setStatus(TraversalRunnerStatus.FINISHED);
        return r.value;
      }
      if (this.isHalted()) {
        return r.value;
      }
      yield r.value;
    }
  }

  run(config?: DepthFirstTraversalRunnerIterableConfigInput): this {
    for (const _ of this.getIterable(config)) {
    }
    return this;
    // if (this.getStatus() === TraversalRunnerStatus.FINISHED) {
    //   return this;
    // }
    // if (this.curGenerator === null) {
    //   this.curGenerator = this.getIterable();
    // }
    // this.setStatus(TraversalRunnerStatus.RUNNING);
    // while (true) {
    //   const r = this.curGenerator.next();
    //   if (r.done === true) {
    //     this.setStatus(TraversalRunnerStatus.FINISHED);
    //     return this;
    //   }
    //   if (this.isHalted()) {
    //     return this;
    //   }
    // }
  }
}
