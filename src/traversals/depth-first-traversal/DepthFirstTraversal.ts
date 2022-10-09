export class DepthFirstTraversal<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> extends Traversal<DepthFirstTraversalOrder, TTP, RW_TTP> {
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>;

  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  resolvedTreesContainer: ResolvedTreesContainer<TTP, RW_TTP>;
  traversalState: DepthFirstTraversalState<TTP, RW_TTP>;
  curGenerator: Generator<
    TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > | null;

  constructor(icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>) {
    super();
    this.icfg = mergeInstanceConfigs(
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
    const { resolvedTreesContainer, traversalState } = initInternalObjects(
      this.icfg,
    );
    this.resolvedTreesContainer = resolvedTreesContainer;
    this.traversalState = traversalState;
    this.curGenerator = null;
  }

  private getTraversableTree(): TraversableTree<TTP, RW_TTP> {
    return this.icfg.traversableTree;
  }

  configure(
    icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ): this {
    this.icfg = mergeInstanceConfigs(this.icfg, icfgInput);
    this.visitors = initVisitors(this.icfg);
    const { resolvedTreesContainer, traversalState } = initInternalObjects(
      this.icfg,
    );
    this.resolvedTreesContainer = resolvedTreesContainer;
    this.traversalState = traversalState;
    return this;
  }

  getTraversalStatus(): TraversalStatus {
    return this.traversalState.status;
  }

  private setStatus(stauts: TraversalStatus): void {
    this.traversalState.status = stauts;
  }

  getStatus(): TraversalStatus {
    return this.traversalState.status;
  }

  addVisitorFor(
    order: DepthFirstTraversalOrder,
    visitor: TraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = DEFAULT_VISITOR_FN_OPTIONS,
  ): this {
    const effectiveOptions: TraversalVisitorFunctionOptions = {
      ...DEFAULT_VISITOR_FN_OPTIONS,
      ...options,
    };
    this.visitors[order].push({
      priority: effectiveOptions.priority,
      visitor,
      addedIndex: this.visitors[order].length,
      resolutionStyle: effectiveOptions.resolutionStyle,
    });
    this.visitors[order].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      } else {
        return a.addedIndex - b.addedIndex;
      }
    });
    return this;
  }

  listVisitorsFor(
    order: DepthFirstTraversalOrder,
  ): TraversalVisitorRecord<DepthFirstTraversalOrder, TTP, RW_TTP>[] {
    return this.visitors[order];
  }

  setVisitorsFor(
    order: DepthFirstTraversalOrder,
    visitorRecords: TraversalVisitorRecord<
      DepthFirstTraversalOrder,
      TTP,
      RW_TTP
    >[],
  ): this {
    this.visitors[order] = visitorRecords;
    return this;
  }

  getTraversalRootVertexRef(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.traversalState.traversalRootVertexRef;
  }

  private setTraversalRootVertexRef(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): void {
    this.traversalState.traversalRootVertexRef = vertexRef;
  }

  getResolvedTreeRootVertexRef(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.resolvedTreesContainer.getRoot();
  }

  setResolvedTreeRootVertexRef(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTreesContainer.setRoot(vertexRef);
  }

  private initRootVertex(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    if (
      this.getTraversalRootVertexRef() !== null &&
      this.getResolvedTreeRootVertexRef() !== null
    ) {
      // Already initialized, this is a continuation
      return this.getResolvedTreeRootVertexRef();
    }
    const rootContent = this.getTraversableTree().makeRoot();
    if (rootContent === null) {
      return null;
    }
    const rootVertexRef = new CTTRef<Vertex<TTP | RW_TTP>>(
      new Vertex<TTP | RW_TTP>(rootContent),
    );
    this.setTraversalRootVertexRef(rootVertexRef);
    this.setResolvedTreeRootVertexRef(rootVertexRef);
    return rootVertexRef;
  }

  private hasInOrderVisitors(): boolean {
    return this.visitors[DepthFirstTraversalOrder.IN_ORDER].length > 0;
  }

  private hasPostOrderVisitors(): boolean {
    return this.visitors[DepthFirstTraversalOrder.POST_ORDER].length > 0;
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
      const vertexHint = sortedChildrenHints.length - i - 1;
      const hint = childrenHints[vertexHint];
      newEntries.push({
        depth: parentDepth + 1,
        vertexHint: hint,
        parentVertexRef,
        parentVertex: parentVertexRef.unref(),
        hintIndex: vertexHint,
      });
    }
    this.traversalState.STACK.push(...newEntries);
    if (this.hasPostOrderOrInOrderVisitors()) {
      this.traversalState.postOrderNotVisitedChildrenCountMap.set(
        parentVertexRef,
        newEntries.length,
      );
    }
  }

  isTraversalRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return vertexRef === this.getTraversalRootVertexRef();
  }

  isTreeRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): boolean {
    return vertexRef === this.getResolvedTreeRootVertexRef();
  }

  private executeVisitorCommands(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    commands: TraversalVisitorCommand<RW_TTP>[],
  ): DepthFirstTraversalExecuteVisitorCommandsResult {
    const res: DepthFirstTraversalExecuteVisitorCommandsResult = {};
    commands?.forEach((command: TraversalVisitorCommand<RW_TTP>) => {
      switch (command.commandName) {
        case TraversalVisitorCommandName.HALT_TRAVERSAL:
          this.setStatus(TraversalStatus.HALTED);
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
      vertexVisitIndex:
        this.traversalState.visitorsState[order].vertexVisitIndex,
      curVertexVisitorVisitIndex:
        this.traversalState.visitorsState[order].curVertexVisitorVisitIndex,
      previousVisitedVertexRef:
        this.traversalState.visitorsState[order].previousVisitedVertexRef,
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
    const visitorRecords = this.visitors[order];
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
    this.executeVisitorCommands(vertexRef, concurrentCommands);
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
      this.traversalState.visitorsState[order].curVertexVisitorVisitIndex += 1;
      const commandsRes = this.executeVisitorCommands(
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
    this.traversalState.visitorsState[order].previousVisitedVertexRef =
      vertexRef;
    this.traversalState.visitorsState[order].vertexVisitIndex += 1;
    this.traversalState.visitorsState[order].curVertexVisitorVisitIndex = 0;
    this.runConcurrentVisitors(order, vertexRef, concurrent);
    this.traversalState.visitorsState[order].curVertexVisitorVisitIndex += 1;
    if (this.isHalted()) {
      return;
    }
    this.runSequentialVisitors(order, vertexRef, sequential);
  }

  isHalted(): boolean {
    return this.getTraversalStatus() === TraversalStatus.HALTED;
  }

  private onInOrderProcessing_getInOrderSiblingsContext(
    vertexContext: VertexResolutionContext<TTP | RW_TTP>,
  ) {
    const postOrderNotVisitedSiblingsCount =
      this.traversalState.postOrderNotVisitedChildrenCountMap.get(
        vertexContext.parentVertexRef,
      );
    if (postOrderNotVisitedSiblingsCount == null) {
      throw new Error(
        'getInOrderSiblingsContext::Could not find entry in postOrderNotVisitedChildrenCountMap',
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

  private *onInOrderProcessing_visitLeafVertex(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    runVisitorFunctions: boolean,
  ): Generator<
    TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    if (vertexRef.unref().isLeafVertex()) {
      runVisitorFunctions &&
        this.visitVertex(DepthFirstTraversalOrder.IN_ORDER, vertexRef);
      yield this.getIteratorResultContent(
        DepthFirstTraversalOrder.IN_ORDER,
        vertexRef,
      );
    }
  }

  private *onInOrderProcessing_maybeVisitParent(
    vertexContext: VertexResolutionContext<TTP | RW_TTP>,
    runVisitorFunctions: boolean,
  ): Generator<
    TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    if (vertexContext == null) {
      return;
    }
    const { justVisitedIndex, allSiblingsCount } =
      this.onInOrderProcessing_getInOrderSiblingsContext(vertexContext);
    if (
      shouldVisitParentOnInOrder(
        this.icfg.inOrderTraversalConfig,
        justVisitedIndex,
        allSiblingsCount,
      )
    ) {
      runVisitorFunctions &&
        this.visitVertex(
          DepthFirstTraversalOrder.IN_ORDER,
          vertexContext.parentVertexRef,
        );
      yield this.getIteratorResultContent(
        DepthFirstTraversalOrder.IN_ORDER,
        vertexContext.parentVertexRef,
      );
    }
  }

  private *onPostOrder(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
    runVisitorFunctions: boolean,
    orders: DepthFirstTraversalOrder[],
  ): Generator<
    TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    let curVertexRef = vertexRef;
    let curVertexContext = vertexContext;
    while (curVertexRef !== null) {
      if (orders.includes(DepthFirstTraversalOrder.IN_ORDER)) {
        if (this.hasInOrderVisitors()) {
          yield* this.onInOrderProcessing_visitLeafVertex(
            curVertexRef,
            runVisitorFunctions,
          );
        }
      }

      if (orders.includes(DepthFirstTraversalOrder.POST_ORDER)) {
        if (this.hasPostOrderVisitors()) {
          runVisitorFunctions &&
            this.visitVertex(DepthFirstTraversalOrder.POST_ORDER, curVertexRef);
          yield this.getIteratorResultContent(
            DepthFirstTraversalOrder.POST_ORDER,
            curVertexRef,
          );
        }
      }

      if (orders.includes(DepthFirstTraversalOrder.IN_ORDER)) {
        if (this.hasInOrderVisitors() && curVertexContext !== null) {
          yield* this.onInOrderProcessing_maybeVisitParent(
            curVertexContext,
            runVisitorFunctions,
          );
        }
      }

      if (!curVertexContext?.parentVertexRef) {
        break;
      }

      const postOrderNotVisitedChildrenCount =
        this.traversalState.postOrderNotVisitedChildrenCountMap.get(
          curVertexContext.parentVertexRef,
        );
      if (postOrderNotVisitedChildrenCount == null) {
        throw new Error(
          'onPostOrderProcessing::Could not find entry in postOrderNotVisitedChildrenCountMap',
        );
      }
      const newCount = postOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        this.traversalState.postOrderNotVisitedChildrenCountMap.set(
          curVertexContext.parentVertexRef,
          newCount,
        );
        break;
      } else {
        this.traversalState.postOrderNotVisitedChildrenCountMap.delete(
          curVertexContext.parentVertexRef,
        );
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
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP>,
    runVisitorFunctions: boolean,
    orders: DepthFirstTraversalOrder[],
  ): Generator<
    TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    this.resolvedTreesContainer.setWithResolutionContext(
      vertexRef,
      vertexContext,
    );
    this.resolvedTreesContainer.pushChildrenTo(vertexContext.parentVertexRef, [
      vertexRef,
    ]);
    this.pushHintsOf(vertexRef, vertexContext.depth + 1);
    if (orders.includes(DepthFirstTraversalOrder.PRE_ORDER)) {
      runVisitorFunctions &&
        this.visitVertex(DepthFirstTraversalOrder.PRE_ORDER, vertexRef);
      yield this.getIteratorResultContent(
        DepthFirstTraversalOrder.PRE_ORDER,
        vertexRef,
      );
    }
  }

  private getIteratorResultContent(
    order: DepthFirstTraversalOrder,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP> {
    return {
      vertex: vertexRef.unref(),
      vertexRef,
      order,
      isTreeRoot: this.isTreeRootVertex(vertexRef),
      isTraversalRoot: this.isTraversalRootVertex(vertexRef),
    };
  }

  *getIterable(
    runVisitorFunctions = true,
    includeOrders:
      | DepthFirstTraversalOrder
      | DepthFirstTraversalOrder[] = Object.values(DepthFirstTraversalOrder),
  ): Generator<
    TraversalIteratorResultContent<DepthFirstTraversalOrder, TTP, RW_TTP>
  > {
    const orders = Array.isArray(includeOrders)
      ? includeOrders
      : [includeOrders];
    const rootVertexRef = this.initRootVertex();
    if (rootVertexRef === null) {
      return;
    }

    this.pushHintsOf(rootVertexRef, 0);
    if (orders.includes(DepthFirstTraversalOrder.PRE_ORDER)) {
      runVisitorFunctions &&
        this.visitVertex(DepthFirstTraversalOrder.PRE_ORDER, rootVertexRef);
      yield this.getIteratorResultContent(
        DepthFirstTraversalOrder.PRE_ORDER,
        rootVertexRef,
      );
    }

    while (this.traversalState.STACK.length > 0) {
      const vertexContext =
        this.traversalState.STACK.pop() as VertexResolutionContext<
          TTP | RW_TTP
        >;
      const vertexContent = this.getTraversableTree().makeVertex(
        vertexContext.vertexHint,
        {
          resolutionContext: vertexContext,
          resolvedTree: this.resolvedTreesContainer.resolvedTree,
          notMutatedResolvedTree:
            this.resolvedTreesContainer.notMutatedResolvedTree,
        },
      );
      if (vertexContent === null) {
        continue;
      }
      const vertexRef = new CTTRef(new Vertex(vertexContent));
      yield* this.onPreOrder(
        vertexRef,
        vertexContext,
        runVisitorFunctions,
        orders,
      );

      if (
        vertexRef.unref().isLeafVertex() &&
        this.hasPostOrderOrInOrderVisitors()
      ) {
        yield* this.onPostOrder(
          vertexRef,
          vertexContext,
          runVisitorFunctions,
          orders,
        );
      }
    }

    yield* this.onPostOrder(rootVertexRef, null, runVisitorFunctions, orders);

    return;
  }

  run(): this {
    if (this.getStatus() === TraversalStatus.FINISHED) {
      return this;
    }
    if (this.curGenerator === null) {
      this.curGenerator = this.getIterable();
    }
    this.setStatus(TraversalStatus.RUNNING);
    while (true) {
      const r = this.curGenerator.next();
      if (r.done === true) {
        this.setStatus(TraversalStatus.FINISHED);
        return this;
      }
      if (this.isHalted()) {
        return this;
      }
    }
  }
}
