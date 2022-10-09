import {
  Traversal,
  TraversalIteratorResultContent,
  TraversalStatus,
} from '../../core/Traversal';
import type {
  TraversableTree,
  TraversalVisitor,
  TraversalVisitorCommand,
  TraversalVisitorCommandArguments,
  TraversalVisitorFunctionOptions,
  TraversalVisitorInputOptions,
  TraversalVisitorRecord,
  TraversalVisitorResult,
  TreeTypeParameters,
  VertexResolutionContext,
} from '../../core';
import {
  CTTRef,
  DEFAULT_VISITOR_FN_OPTIONS,
  ResolvedTree,
  TraversalVisitorCommandName,
  TraversalVisitorFunctionResolutionStyle,
  Vertex,
  VertexResolved,
} from '../../core';
import { jsonStringifySafe } from '../../utils/jsonStringifySafe';

export enum DepthFirstTraversalOrder {
  PRE_ORDER = 'PRE_ORDER',
  IN_ORDER = 'IN_ORDER',
  POST_ORDER = 'POST_ORDER',
}

type DeepPartial<T, IgnoreContentOf extends string> = T extends object
  ? T extends unknown[]
    ? T
    : {
        [P in keyof T]?: P extends IgnoreContentOf
          ? T[P]
          : // eslint-disable-next-line @typescript-eslint/ban-types
          T[P] extends Function | null
          ? T[P]
          : DeepPartial<T[P], IgnoreContentOf>;
      }
  : T;

export type SortChildrenHintsFn<TTP extends TreeTypeParameters> = (
  childrenHints: TTP['VertexHint'][],
) => TTP['VertexHint'][];

export type IndexRange = number | [number, number];

export type DepthFirstTraversalInstanceConfig_InOrderTraversalConfig = {
  visitParentAfterChildren: IndexRange | number | { ranges: IndexRange[] };
  visitParentAfterChildrenAllRangesOutOfBoundsFallback:
    | IndexRange
    | number
    | { ranges: IndexRange[] };
  visitUpOneChildParents: boolean;
};

export type NotMutatedResolvedTreeRefsMap<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Map<CTTRef<Vertex<TTP | RW_TTP>>, CTTRef<Vertex<TTP>>>;

export class ResolvedTreesContainer<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
    TTP,
    RW_TTP
  > | null;

  constructor(cfg: {
    saveNotMutatedResolvedTree: DepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['saveNotMutatedResolvedTree'];
    internalObjects: {
      resolvedTreesContainer?: DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >['internalObjects']['resolvedTreesContainer'];
    };
  }) {
    this.resolvedTree =
      cfg?.internalObjects?.resolvedTreesContainer?.resolvedTree != null
        ? cfg?.internalObjects?.resolvedTreesContainer.resolvedTree
        : new ResolvedTree<TTP | RW_TTP>();
    this.notMutatedResolvedTree =
      cfg?.internalObjects?.resolvedTreesContainer?.notMutatedResolvedTree !=
      null
        ? cfg?.internalObjects?.resolvedTreesContainer.notMutatedResolvedTree
        : cfg.saveNotMutatedResolvedTree
        ? new ResolvedTree<TTP>()
        : null;
    this.notMutatedResolvedTreeRefsMap =
      cfg?.internalObjects?.resolvedTreesContainer
        ?.notMutatedResolvedTreeRefsMap != null
        ? cfg?.internalObjects?.resolvedTreesContainer
            .notMutatedResolvedTreeRefsMap
        : cfg.saveNotMutatedResolvedTree
        ? new Map()
        : null;
  }

  set(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexResolved: VertexResolved<TTP | RW_TTP>,
  ): void {
    this.resolvedTree.set(vertexRef, vertexResolved);
    if (this.notMutatedResolvedTree && this.notMutatedResolvedTreeRefsMap) {
      const notMutatedRef = new CTTRef<Vertex<TTP>>(
        (vertexRef as CTTRef<Vertex<TTP>>).unref().clone(),
      );
      this.notMutatedResolvedTreeRefsMap.set(vertexRef, notMutatedRef);
      const resolutionContext = vertexResolved.getResolutionContext();
      const parentVertexRef = resolutionContext?.parentVertexRef ?? null;
      const notMutatedVertexParentRef = !parentVertexRef
        ? null
        : this.notMutatedResolvedTreeRefsMap.get(parentVertexRef);
      const notMutatedVertexResolved = vertexResolved.clone();
      notMutatedVertexResolved.setResolutionContext(
        !notMutatedVertexParentRef || !resolutionContext
          ? null
          : {
              ...resolutionContext,
              parentVertexRef: notMutatedVertexParentRef,
              parentVertex: notMutatedVertexParentRef?.unref(),
            },
      );
      this.notMutatedResolvedTree.set(
        notMutatedRef,
        notMutatedVertexResolved as VertexResolved<TTP>,
      );
    }
  }

  getRoot(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.resolvedTree.getRoot();
  }

  setWithResolutionContext(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexResolutionContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    this.set(
      vertexRef,
      new VertexResolved<TTP | RW_TTP>({
        $d: { resolutionContext: vertexResolutionContext },
        $c: [],
      }),
    );
  }

  setRoot(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTree.setRoot(vertexRef);
    this.setWithResolutionContext(vertexRef, null);
  }

  delete(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>): void {
    this.resolvedTree.delete(vertexRef);
  }

  pushChildrenTo(
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    childrenVertexRefs: CTTRef<Vertex<TTP | RW_TTP>>[],
  ): void {
    this.resolvedTree.pushChildrenTo(parentVertexRef, childrenVertexRefs);
    if (this.notMutatedResolvedTree && this.notMutatedResolvedTreeRefsMap) {
      const nmParentVertexRef =
        this.notMutatedResolvedTreeRefsMap?.get(parentVertexRef);
      if (nmParentVertexRef == null) {
        throw new Error(
          `Could not find not mutated ref by resolved ref - ${jsonStringifySafe(
            parentVertexRef,
          )}`,
        );
      }
      const nmParentVertexResolved =
        this.notMutatedResolvedTree.get(nmParentVertexRef);
      if (nmParentVertexResolved == null) {
        throw new Error(
          `Could not find not mutated ref - ${jsonStringifySafe(
            nmParentVertexRef,
          )}`,
        );
      }
      const nmChildrenVertexRefs = childrenVertexRefs.map((ch) => {
        const nmCh = this.notMutatedResolvedTreeRefsMap?.get(ch);
        if (!nmCh) {
          throw new Error(
            `Could not find not mutated child ref - ${jsonStringifySafe(ch)}`,
          );
        }
        return nmCh;
      });
      nmParentVertexResolved.pushChildren(nmChildrenVertexRefs);
    }
  }
}

export type DepthFirstTraversalVisitorsState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in DepthFirstTraversalOrder]: Pick<
    TraversalVisitorInputOptions<DepthFirstTraversalOrder, TTP, RW_TTP>,
    | 'vertexVisitIndex'
    | 'curVertexVisitorVisitIndex'
    | 'previousVisitedVertexRef'
  >;
};

function initDepthFirstVisitorsState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(): DepthFirstTraversalVisitorsState<TTP, RW_TTP> {
  const empty = {
    vertexVisitIndex: 0,
    curVertexVisitorVisitIndex: 0,
    previousVisitedVertexRef: null,
  };
  return {
    [DepthFirstTraversalOrder.PRE_ORDER]: { ...empty },
    [DepthFirstTraversalOrder.IN_ORDER]: { ...empty },
    [DepthFirstTraversalOrder.POST_ORDER]: { ...empty },
  };
}

export class DepthFirstTraversalState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  STACK: Array<VertexResolutionContext<TTP | RW_TTP>>;
  postOrderNotVisitedChildrenCountMap: Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >;
  visitorsState: DepthFirstTraversalVisitorsState<TTP, RW_TTP>;
  traversalRootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  status: TraversalStatus;

  constructor(cfg: {
    internalObjects: {
      traversalState?: DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >['internalObjects']['traversalState'];
    };
  }) {
    this.STACK =
      cfg.internalObjects?.traversalState?.STACK != null
        ? cfg.internalObjects?.traversalState?.STACK
        : [];
    this.postOrderNotVisitedChildrenCountMap =
      cfg.internalObjects?.traversalState
        ?.postOrderNotVisitedChildrenCountMap != null
        ? cfg.internalObjects?.traversalState
            ?.postOrderNotVisitedChildrenCountMap
        : new Map<CTTRef<Vertex<TTP | RW_TTP>>, number>();
    this.visitorsState =
      cfg.internalObjects?.traversalState?.visitorsState != null
        ? cfg.internalObjects?.traversalState?.visitorsState
        : initDepthFirstVisitorsState();
    this.traversalRootVertexRef =
      cfg.internalObjects?.traversalState?.traversalRootVertexRef != null
        ? cfg.internalObjects?.traversalState?.traversalRootVertexRef
        : null;
    this.status =
      cfg.internalObjects?.traversalState?.status != null
        ? cfg.internalObjects?.traversalState?.status
        : TraversalStatus.INITIAL;
  }
}

export type DepthFirstTraversalInternalObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolvedTreesContainer: ResolvedTreesContainer<TTP, RW_TTP>;
  traversalState: DepthFirstTraversalState<TTP, RW_TTP>;
  // traversalRootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  // lastVisitedOrder: DepthFirstTraversalOrders | null;
  // lastVisitedVisitorIndex: number | null;
};

export type DepthFirstTraversalVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in DepthFirstTraversalOrder]: TraversalVisitorRecord<
    DepthFirstTraversalOrder,
    TTP,
    RW_TTP
  >[];
};

type OrNull<T extends object> = {
  [K in keyof T]: T[K] | null;
};

export type DepthFirstTraversalInstanceConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  traversableTree: TraversableTree<TTP, RW_TTP>;
  sortChildrenHints: SortChildrenHintsFn<TTP> | null;
  saveNotMutatedResolvedTree: boolean;
  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;
  inOrderTraversalConfig: DepthFirstTraversalInstanceConfig_InOrderTraversalConfig;
  internalObjects: Partial<
    OrNull<DepthFirstTraversalInternalObjects<TTP, RW_TTP>>
  >;
};

const DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG: Omit<
  DepthFirstTraversalInstanceConfig<TreeTypeParameters, TreeTypeParameters>,
  'traversableTree'
> = {
  sortChildrenHints: null,
  saveNotMutatedResolvedTree: false,
  inOrderTraversalConfig: {
    visitParentAfterChildren: [0, -2],
    visitParentAfterChildrenAllRangesOutOfBoundsFallback: -2,
    visitUpOneChildParents: true,
  },
  visitors: {
    [DepthFirstTraversalOrder.PRE_ORDER]: [],
    [DepthFirstTraversalOrder.IN_ORDER]: [],
    [DepthFirstTraversalOrder.POST_ORDER]: [],
  },
  internalObjects: {
    resolvedTreesContainer: null,
    traversalState: null,
    // traversalRootVertexRef: null,
    // lastVisitedOrder: null,
    // lastVisitedVisitorIndex: null,
  },
};

export type DepthFirstTraversalInstanceConfigInput<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = DeepPartial<
  DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  | keyof DepthFirstTraversalInstanceConfig<
      TTP,
      RW_TTP
    >['inOrderTraversalConfig']
  | keyof DepthFirstTraversalInstanceConfig<TTP, RW_TTP>['internalObjects']
  | keyof DepthFirstTraversalInstanceConfig<TTP, RW_TTP>['visitors']
  | 'traversableTree'
>;

function mergeInstanceConfigs<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  base: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
  input: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTraversalInstanceConfig<TTP, RW_TTP> {
  return {
    ...base,
    ...input,
    visitors: {
      ...base.visitors,
      ...input.visitors,
    },
    inOrderTraversalConfig: {
      ...base.inOrderTraversalConfig,
      ...input.inOrderTraversalConfig,
    },
    internalObjects: {
      ...base.internalObjects,
      ...(input.internalObjects ?? {}),
    },
  };
}

function initVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
): DepthFirstTraversalVisitors<TTP, RW_TTP> {
  return Object.fromEntries(
    Object.entries(icfg.visitors).map(([order, visitors]) => {
      return [order, [...visitors]];
    }),
  ) as DepthFirstTraversalVisitors<TTP, RW_TTP>;
}

function initInternalObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>,
): DepthFirstTraversalInternalObjects<TTP, RW_TTP> {
  return {
    resolvedTreesContainer: new ResolvedTreesContainer(icfg),
    traversalState: new DepthFirstTraversalState(icfg),
  };
}

export type DepthFirstTraversalExecuteVisitorCommandsResult = {
  vertexVisitorsChainState?: unknown; // Type this ?
};

function normalizeRange(
  r: IndexRange,
  arrLength: number,
): [number, number] | null {
  const rr = (Array.isArray(r) ? r : [r, r]).map((n, i) => {
    if (n < 0) {
      if (n < -arrLength) {
        if (i === 0) {
          return 0;
        } else {
          return null;
        }
      } else {
        return arrLength + n;
      }
    } /* if (n >= 0) */ else {
      if (n > arrLength - 1) {
        if (i === 0) {
          return null;
        } else {
          return arrLength - 1;
        }
      } else {
        return n;
      }
    }
  });
  if (
    rr[0] === null ||
    rr[1] === null ||
    (rr[0] as number) > (rr[1] as number)
  ) {
    return null;
  }
  return rr as [number, number];
}

function shouldVisitParentOnInOrder(
  inOrderTraversalConfig: DepthFirstTraversalInstanceConfig_InOrderTraversalConfig,
  justVisitedIndex: number,
  allSiblingsCount: number,
): boolean {
  const cfg = inOrderTraversalConfig.visitParentAfterChildren;
  const fallback =
    inOrderTraversalConfig.visitParentAfterChildrenAllRangesOutOfBoundsFallback;
  const visitParentAfterRanges = (
    Array.isArray(cfg) || typeof cfg === 'number' ? [cfg] : cfg.ranges
  )
    .map((r) => normalizeRange(r, allSiblingsCount))
    .filter(Boolean) as [number, number][];
  const visitParentAfterFallbackRanges = (
    Array.isArray(fallback) || typeof fallback === 'number'
      ? [fallback]
      : fallback.ranges
  )
    .map((r) => normalizeRange(r, allSiblingsCount))
    .filter(Boolean) as [number, number][];
  // console.log(justVisitedIndex, visitParentAfterRanges, visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)), visitParentAfterFallbackRanges, visitParentAfterRanges.length === 0 && visitParentAfterFallbackRanges.some((r) => isInRange(r, justVisitedIndex),),);
  return (
    (justVisitedIndex === allSiblingsCount - 1 &&
      allSiblingsCount === 1 &&
      inOrderTraversalConfig.visitUpOneChildParents) ||
    visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)) ||
    (visitParentAfterRanges.length === 0 &&
      visitParentAfterFallbackRanges.some((r) =>
        isInRange(r, justVisitedIndex),
      ))
  );
}

function isInRange(r: [number, number], x: number) {
  return x >= r[0] && x <= r[1];
}

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
