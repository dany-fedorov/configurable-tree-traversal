import { ResolvedTree, VertexResolutionContext } from '../core/ResolvedTree';
import type { TreeTypeParameters } from '../core/TreeTypeParameters';
import type {
  TraversalVisitor,
  TraversalVisitorCommand,
  TraversalVisitorCommandArguments,
} from '../core/TraversalVisitor';
import type { TraversableTree } from '../core/TraversableTree';
import { Vertex } from '../core/Vertex';
import { CTTRef } from '../core/CTTRef';
import { TraversalVisitorCommandName } from '../core/TraversalVisitor';

export enum ChildrenOrder {
  DEFAULT = 'DEFAULT',
  REVERSED = 'REVERSED',
}

export type IndexRange = number | [number, number];

export type DepthFirstTraversalConfig_InOrderTraversalConfig = {
  visitParentAfter: IndexRange | number | { ranges: IndexRange[] };
  visitParentAfterRangesOutOfBoundsFallback:
    | IndexRange
    | number
    | { ranges: IndexRange[] };
  visitOneChildParents: boolean;
};

type DeepPartial<T> = T extends object
  ? T extends unknown[]
    ? T
    : {
        [P in keyof T]?: DeepPartial<T[P]>;
      }
  : T;

export type NotMutatedResolvedTreeRefsMap<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Map<CTTRef<Vertex<TTP | RW_TTP>>, CTTRef<Vertex<TTP>>>;

export type DepthFirstTraversalConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  childrenOrder: ChildrenOrder;
  saveNotMutatedResolvedTree: boolean;
  inOrderTraversalConfig: DepthFirstTraversalConfig_InOrderTraversalConfig;
  resolvedTreesContainer: Partial<ResolvedTreesContainer<TTP, RW_TTP>> | null;
  traversalState: Partial<DepthFirstTraversalState<TTP, RW_TTP>> | null;
  rootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  lastVisitedBy: DepthFirstVisitorOrderKey | null;
};

export const DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG: DepthFirstTraversalConfig<
  TreeTypeParameters,
  TreeTypeParameters
> = {
  childrenOrder: ChildrenOrder.DEFAULT,
  saveNotMutatedResolvedTree: false,
  inOrderTraversalConfig: {
    visitParentAfter: [0, -2],
    visitParentAfterRangesOutOfBoundsFallback: -2,
    visitOneChildParents: true,
  },
  resolvedTreesContainer: null,
  traversalState: null,
  rootVertexRef: null,
  lastVisitedBy: null,
};

export type DepthFirstTraversalResultInstanceConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  visitors: DepthFirstVisitors<TTP, RW_TTP>;
  traversableTree: TraversableTree<TTP, RW_TTP>;
  resolvedTreesContainer: ResolvedTreesContainer<TTP, RW_TTP>;
  traversalState: DepthFirstTraversalState<TTP, RW_TTP>;
  haltedOnContext: TraversalHaltedOnContext<TTP, RW_TTP> | null;
  config: DepthFirstTraversalConfigInput<TTP, RW_TTP>;
};

export class DepthFirstTraversalResult<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  icfg: DepthFirstTraversalResultInstanceConfig<TTP, RW_TTP>;

  constructor(icfgInput: DepthFirstTraversalResultInstanceConfig<TTP, RW_TTP>) {
    this.icfg = icfgInput;
  }

  getTraversableTree(): TraversableTree<TTP, RW_TTP> {
    return this.icfg.traversableTree;
  }

  getResolvedTree(): ResolvedTree<TTP | RW_TTP> {
    return this.icfg.resolvedTreesContainer.resolvedTree;
  }

  getHaltedOnVertexRef(): CTTRef<Vertex<TTP | RW_TTP>> | null {
    return this.icfg.haltedOnContext?.vertexRef ?? null;
  }

  getHaltedOnVisitorOrderKey(): DepthFirstVisitorOrderKey | null {
    return this.icfg.haltedOnContext?.visitorOrderKey ?? null;
  }

  getTraversalState(): DepthFirstTraversalState<TTP, RW_TTP> {
    return this.icfg.traversalState;
  }

  getResolvedTreesContainer(): ResolvedTreesContainer<TTP, RW_TTP> {
    return this.icfg.resolvedTreesContainer;
  }

  isHalted(): boolean {
    return !!this.icfg.haltedOnContext?.vertexRef;
  }

  continue(
    tTree: TraversableTree<TTP, RW_TTP> | null,
    visitors?: DepthFirstVisitors<TTP, RW_TTP> | null,
    config?: DepthFirstTraversalConfigInput<TTP, RW_TTP> | null,
  ): DepthFirstTraversalResult<TTP, RW_TTP> {
    if (!this.isHalted()) {
      return this;
    }
    return traverseDepthFirst(
      tTree ?? this.getTraversableTree(),
      visitors ?? this.icfg.visitors,
      {
        ...(config ?? this.icfg.config),
        lastVisitedBy: this.getHaltedOnVisitorOrderKey(),
        rootVertexRef: this.getHaltedOnVertexRef(),
        traversalState: this.getTraversalState(),
        resolvedTreesContainer: this.getResolvedTreesContainer(),
      },
    );
  }
}

export type DepthFirstVisitorOrderKey = keyof Required<
  DepthFirstVisitors<TreeTypeParameters, TreeTypeParameters>
>;

export type DepthFirstVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  preOrderVisitor?: TraversalVisitor<TTP, RW_TTP> | null;
  postOrderVisitor?: TraversalVisitor<TTP, RW_TTP> | null;
  inOrderVisitor?: TraversalVisitor<TTP, RW_TTP> | null;
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

function isInRange(r: [number, number], x: number) {
  return x >= r[0] && x <= r[1];
}

function shouldVisitParentOnInOrder(
  inOrderTraversalConfig: DepthFirstTraversalConfig_InOrderTraversalConfig,
  justVisitedIndex: number,
  allSiblingsCount: number,
): boolean {
  const cfg = inOrderTraversalConfig.visitParentAfter;
  const fallback =
    inOrderTraversalConfig.visitParentAfterRangesOutOfBoundsFallback;
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
      inOrderTraversalConfig.visitOneChildParents) ||
    visitParentAfterRanges.some((r) => isInRange(r, justVisitedIndex)) ||
    (visitParentAfterRanges.length === 0 &&
      visitParentAfterFallbackRanges.some((r) =>
        isInRange(r, justVisitedIndex),
      ))
  );
}

type TraversalHaltedOnContext<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  visitorOrderKey: DepthFirstVisitorOrderKey;
  vertexRef: CTTRef<Vertex<TTP | RW_TTP>>;
};

type DepthFirstTraversalConfigInput<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = DeepPartial<DepthFirstTraversalConfig<TTP, RW_TTP>>;

function makeEffectiveConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  configInput: DepthFirstTraversalConfigInput<TTP, RW_TTP>,
): DepthFirstTraversalConfig<TTP, RW_TTP> {
  return (
    configInput === DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG
      ? configInput
      : {
          ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
          ...configInput,
          inOrderTraversalConfig: {
            ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG.inOrderTraversalConfig,
            ...(configInput?.inOrderTraversalConfig || {}),
          },
        }
  ) as DepthFirstTraversalConfig<TTP, RW_TTP>;
}

type DepthFirstTraversalVisitorsState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in keyof Required<DepthFirstVisitors<TTP, RW_TTP>>]: {
    visitIndex: number;
    previousVisitedVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  };
};

function initVisitorsState<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(): DepthFirstTraversalVisitorsState<TTP, RW_TTP> {
  return {
    preOrderVisitor: {
      visitIndex: 0,
      previousVisitedVertexRef: null,
    },
    postOrderVisitor: {
      visitIndex: 0,
      previousVisitedVertexRef: null,
    },
    inOrderVisitor: {
      visitIndex: 0,
      previousVisitedVertexRef: null,
    },
  };
}

function makeRootVertexRef<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(tTree: TraversableTree<TTP, RW_TTP>): CTTRef<Vertex<TTP | RW_TTP>> | null {
  const rootContent = tTree.makeRoot();
  if (rootContent === null) {
    return null;
  }
  return new CTTRef<Vertex<TTP | RW_TTP>>(
    new Vertex<TTP | RW_TTP>(rootContent),
  );
}

// function initContinuationObjects<
//   TTP extends TreeTypeParameters,
//   RW_TTP extends TreeTypeParameters,
// >(
//   tTree: TraversableTree<TTP, RW_TTP>,
//   rTree: ResolvedTree<TTP | RW_TTP>,
//   config: DepthFirstTraversalConfig<TTP, RW_TTP>,
// ): {
//   rootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
//   rootVertexContext: VertexResolutionContext<TTP | RW_TTP> | null;
//   notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
//     TTP,
//     RW_TTP
//   > | null;
//   postOrderNotVisitedChildrenCountMap: Map<
//     CTTRef<Vertex<TTP | RW_TTP>>,
//     number
//   >;
//   STACK: Array<VertexResolutionContext<TTP | RW_TTP>>;
// } {
//   const notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
//     TTP,
//     RW_TTP
//   > | null =
//     config.continuationContext?.notMutatedResolvedTreeRefsMap != null
//       ? config.continuationContext?.notMutatedResolvedTreeRefsMap
//       : !config.saveNotMutatedResolvedTree
//       ? null
//       : new Map();
//   const rootVertexRef =
//     config.continuationContext?.vertexRef != null
//       ? config.continuationContext?.vertexRef
//       : makeRootVertexRef(tTree);
//   const rootVertexContext =
//     rootVertexRef === null
//       ? null
//       : rTree.get(rootVertexRef)?.getResolutionContext() ?? null;
//   const STACK =
//     config.continuationContext?.STACK != null
//       ? config.continuationContext.STACK
//       : [];
//   const postOrderNotVisitedChildrenCountMap =
//     config.continuationContext?.postOrderNotVisitedChildrenCountMap != null
//       ? config.continuationContext.postOrderNotVisitedChildrenCountMap
//       : new Map<CTTRef<Vertex<TTP | RW_TTP>>, number>();
//   return {
//     notMutatedResolvedTreeRefsMap,
//     rootVertexRef,
//     rootVertexContext,
//     STACK,
//     postOrderNotVisitedChildrenCountMap,
//   };
// }

/*function createTraversalHelperObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  effectiveConfig: DepthFirstTraversalConfig<TTP, RW_TTP>,
): {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  haltState: {
    haltTraversalFlag: boolean;
    haltedOnContext: TraversalHaltedOnContext<TTP, RW_TTP> | null;
  };
} {
  const resolvedTree =
    effectiveConfig.useResolvedTree != null
      ? effectiveConfig.useResolvedTree
      : new ResolvedTree<TTP | RW_TTP>();
  const notMutatedResolvedTree =
    effectiveConfig.useNotMutatedResolvedTree !== undefined
      ? effectiveConfig.useNotMutatedResolvedTree
      : !effectiveConfig.saveNotMutatedResolvedTree
      ? null
      : new ResolvedTree<TTP>();
  const haltState = {
    haltTraversalFlag: false,
    haltedOnContext: null,
  };
  return {
    resolvedTree,
    notMutatedResolvedTree,
    haltState,
  };
}*/

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

  constructor(config: DepthFirstTraversalConfig<TTP, RW_TTP>) {
    this.STACK =
      config.traversalState?.STACK != null ? config.traversalState?.STACK : [];
    this.postOrderNotVisitedChildrenCountMap =
      config.traversalState?.postOrderNotVisitedChildrenCountMap != null
        ? config.traversalState?.postOrderNotVisitedChildrenCountMap
        : new Map<CTTRef<Vertex<TTP | RW_TTP>>, number>();
    this.visitorsState =
      config.traversalState?.visitorsState != null
        ? config.traversalState?.visitorsState
        : initVisitorsState();
  }
}

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

  constructor(config: DepthFirstTraversalConfig<TTP, RW_TTP>) {
    this.resolvedTree =
      config.resolvedTreesContainer?.resolvedTree != null
        ? config.resolvedTreesContainer.resolvedTree
        : new ResolvedTree<TTP | RW_TTP>();
    this.notMutatedResolvedTree =
      config.resolvedTreesContainer?.notMutatedResolvedTree != null
        ? config.resolvedTreesContainer.notMutatedResolvedTree
        : new ResolvedTree<TTP>();
    this.notMutatedResolvedTreeRefsMap =
      config.resolvedTreesContainer?.notMutatedResolvedTreeRefsMap != null
        ? config.resolvedTreesContainer.notMutatedResolvedTreeRefsMap
        : new Map();
  }
}

function initTraversalRoot<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  tTree: TraversableTree<TTP, RW_TTP>,
  rTree: ResolvedTree<TTP | RW_TTP>,
  config: DepthFirstTraversalConfig<TTP, RW_TTP>,
): {
  traversalRootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  traversalRootVertexResolutionContext: VertexResolutionContext<
    TTP | RW_TTP
  > | null;
} {
  const rootVertexRef =
    config.rootVertexRef != null
      ? config.rootVertexRef
      : makeRootVertexRef(tTree);
  const rootVertexResolutionContext =
    rootVertexRef === null
      ? null
      : rTree.get(rootVertexRef)?.getResolutionContext() ?? null;
  return {
    traversalRootVertexRef: rootVertexRef,
    traversalRootVertexResolutionContext: rootVertexResolutionContext,
  };
}

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  tTree: TraversableTree<TTP, RW_TTP>,
  visitors: DepthFirstVisitors<TTP, RW_TTP>,
  config: DepthFirstTraversalConfigInput<
    TTP,
    RW_TTP
  > = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG as DepthFirstTraversalConfigInput<
    TTP,
    RW_TTP
  >,
): DepthFirstTraversalResult<TTP, RW_TTP> {
  const effectiveConfig = makeEffectiveConfig<TTP, RW_TTP>(config);
  let haltTraversalFlag = false;
  let haltedOnContext = null;
  const traversalState = new DepthFirstTraversalState(effectiveConfig);
  const resolvedTreesContainer = new ResolvedTreesContainer(effectiveConfig);
  const { traversalRootVertexRef: trvr, traversalRootVertexResolutionContext } =
    initTraversalRoot(
      tTree,
      resolvedTreesContainer.resolvedTree,
      effectiveConfig,
    );
  if (trvr === null) {
    return new DepthFirstTraversalResult({
      traversableTree: tTree,
      resolvedTreesContainer,
      traversalState,
      haltedOnContext,
      visitors,
      config: effectiveConfig,
    });
  }
  const traversalRootVertexRef = trvr; // for ts

  const onPostOrder =
    !visitors?.postOrderVisitor && !visitors?.inOrderVisitor
      ? null
      : onPostOrderProcessing;

  if (
    traversalRootVertexRef.unref().isLeafVertex() &&
    effectiveConfig.lastVisitedBy != null
  ) {
    onPostOrder?.(
      traversalRootVertexRef,
      traversalRootVertexResolutionContext,
      effectiveConfig.lastVisitedBy,
    );
  } else if (effectiveConfig.lastVisitedBy == null) {
    onPreOrder(traversalRootVertexRef, null);
    pushHints(traversalRootVertexRef, 0);
  }

  while (traversalState.STACK.length > 0 && !haltTraversalFlag) {
    const vertexContext = traversalState.STACK.pop() as VertexResolutionContext<
      TTP | RW_TTP
    >;
    const vertexContent = tTree.makeVertex(vertexContext.vertexHint, {
      resolutionContext: vertexContext,
      resolvedTree: resolvedTreesContainer.resolvedTree,
      notMutatedResolvedTree: resolvedTreesContainer.notMutatedResolvedTree,
    });
    if (vertexContent === null) {
      continue;
    }
    const vertexRef = new CTTRef(new Vertex(vertexContent));
    onPreOrder(vertexRef, vertexContext);
    pushHints(vertexRef, vertexContext.depth);
    if (vertexRef.unref().isLeafVertex()) {
      onPostOrder?.(vertexRef, vertexContext);
    }
  }

  if (
    effectiveConfig.lastVisitedBy !== 'postOrderVisitor' &&
    !haltTraversalFlag
  ) {
    onPostOrder?.(traversalRootVertexRef, null);
  }

  function onPreOrder(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    resolvedTreesContainer.resolvedTree.___onPreOrderVisit(
      vertexRef,
      vertexContext,
    );
    if (
      resolvedTreesContainer.notMutatedResolvedTree !== null &&
      resolvedTreesContainer.notMutatedResolvedTreeRefsMap !== null
    ) {
      const notMutatedRef = new CTTRef<Vertex<TTP>>(
        (vertexRef as CTTRef<Vertex<TTP>>).unref().clone(),
      );
      resolvedTreesContainer.notMutatedResolvedTreeRefsMap.set(
        vertexRef,
        notMutatedRef,
      );
      resolvedTreesContainer.notMutatedResolvedTree?.___onPreOrderVisit(
        notMutatedRef,
        vertexContext === null
          ? null
          : ({
              ...vertexContext,
              parentVertex: resolvedTreesContainer.notMutatedResolvedTreeRefsMap
                .get(vertexContext.parentVertexRef)
                ?.unref(),
              parentVertexRef:
                resolvedTreesContainer.notMutatedResolvedTreeRefsMap.get(
                  vertexContext.parentVertexRef,
                ),
            } as VertexResolutionContext<TTP>),
      );
    }
    visitVertex('preOrderVisitor', vertexRef);
  }

  function onInOrderProcessing_getInOrderSiblingsContext(
    vertexContext: VertexResolutionContext<TTP | RW_TTP>,
  ) {
    const postOrderNotVisitedSiblingsCount =
      traversalState.postOrderNotVisitedChildrenCountMap.get(
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

  function onInOrderProcessing_visitLeafVertex(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    if (vertexContext == null) {
      return;
    }
    if (vertexRef.unref().isLeafVertex()) {
      visitVertex('inOrderVisitor', vertexRef);
    }
  }

  function onInOrderProcessing_maybeVisitParent(
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    if (vertexContext == null) {
      return;
    }
    const { justVisitedIndex, allSiblingsCount } =
      onInOrderProcessing_getInOrderSiblingsContext(vertexContext);
    if (
      shouldVisitParentOnInOrder(
        effectiveConfig.inOrderTraversalConfig,
        justVisitedIndex,
        allSiblingsCount,
      )
    ) {
      visitVertex('inOrderVisitor', vertexContext.parentVertexRef);
    }
  }

  function onPostOrderProcessing(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
    lastVisitedBy?: DepthFirstVisitorOrderKey,
  ): void {
    if (haltTraversalFlag) {
      return;
    }
    let curVertexRef = vertexRef;
    let curVertexContext = vertexContext;
    while (curVertexRef !== null && !haltTraversalFlag) {
      if (
        lastVisitedBy !== 'inOrderVisitor' &&
        lastVisitedBy !== 'postOrderVisitor'
      ) {
        onInOrderProcessing_visitLeafVertex(curVertexRef, curVertexContext);
      }
      if (haltTraversalFlag) {
        return;
      }
      if (lastVisitedBy !== 'postOrderVisitor' && !haltTraversalFlag) {
        visitVertex('postOrderVisitor', curVertexRef);
      }
      if (haltTraversalFlag) {
        return;
      }
      onInOrderProcessing_maybeVisitParent(curVertexContext);
      if (haltTraversalFlag) {
        return;
      }
      if (!curVertexContext?.parentVertexRef) {
        break;
      }
      const postOrderNotVisitedChildrenCount =
        traversalState.postOrderNotVisitedChildrenCountMap.get(
          curVertexContext.parentVertexRef,
        );
      if (postOrderNotVisitedChildrenCount == null) {
        throw new Error(
          'onPostOrderProcessing::Could not find entry in postOrderNotVisitedChildrenCountMap',
        );
      }
      const newCount = postOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        traversalState.postOrderNotVisitedChildrenCountMap.set(
          curVertexContext.parentVertexRef,
          newCount,
        );
        break;
      } else {
        traversalState.postOrderNotVisitedChildrenCountMap.delete(
          curVertexContext.parentVertexRef,
        );
        const parentVertexContext =
          resolvedTreesContainer.resolvedTree
            .get(curVertexContext.parentVertexRef)
            ?.getResolutionContext() ?? null;
        if (parentVertexContext == null) {
          break;
        }
        // curVertexRef = curVertexContext.___parentVertexContent;
        curVertexRef = curVertexContext.parentVertexRef;
        curVertexContext = parentVertexContext;
      }
    }
  }

  function visitVertex(
    visitorOrderKey: keyof Required<DepthFirstVisitors<TTP, RW_TTP>>,
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
  ): void {
    const visitor = visitors?.[visitorOrderKey];
    if (visitor == null || haltTraversalFlag) {
      return;
    }
    const visitorResult = visitor(vertexRef.unref(), {
      resolvedTree: resolvedTreesContainer.resolvedTree,
      notMutatedResolvedTree: resolvedTreesContainer.notMutatedResolvedTree,
      visitIndex: traversalState.visitorsState[visitorOrderKey].visitIndex++,
      previousVisitedVertexRef:
        traversalState.visitorsState[visitorOrderKey].previousVisitedVertexRef,
      isTraversalRoot: isTraversalRootVertex(vertexRef),
      isTreeRoot: isTreeRootVertex(vertexRef),
      vertexVisitorsChainState: null,
      vertexRef,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      visitorRecord: null
    });
    traversalState.visitorsState[visitorOrderKey].previousVisitedVertexRef =
      vertexRef;
    visitorResult?.commands?.forEach(
      (command: TraversalVisitorCommand<RW_TTP>) => {
        switch (command.commandName) {
          case TraversalVisitorCommandName.HALT_TRAVERSAL:
            haltTraversalFlag = true;
            haltedOnContext = {
              vertexRef,
              visitorOrderKey,
              traversalState,
              resolvedTreesContainer,
            };
            break;
          case TraversalVisitorCommandName.REWRITE_VERTEX_DATA: {
            const newData = (
              command.commandArguments as TraversalVisitorCommandArguments<TTP>[TraversalVisitorCommandName.REWRITE_VERTEX_DATA]
            ).newData;
            // console.log(jsonStringifySafe({ newData }));
            vertexRef.setPointsTo(
              vertexRef.unref().clone({
                $d: newData,
              }),
            );
            // console.log('REWRITTEN!');
            break;
          }
          case TraversalVisitorCommandName.DELETE_VERTEX:
            resolvedTreesContainer.resolvedTree.delete(vertexRef);
            break;
          default:
            return;
        }
      },
    );
  }

  function isTraversalRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>) {
    return vertexRef === traversalRootVertexRef;
  }

  function isTreeRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>) {
    return resolvedTreesContainer.resolvedTree.getRoot() === vertexRef;
  }

  function pushHints(
    parentVertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    parentDepth: number,
  ): Array<VertexResolutionContext<TTP | RW_TTP>> {
    const childrenHints = parentVertexRef.unref().getChildrenHints();
    const newEntries: VertexResolutionContext<TTP | RW_TTP>[] = [];
    for (let i = 0; i < childrenHints.length; i++) {
      const hintIndex =
        effectiveConfig.childrenOrder === ChildrenOrder.REVERSED
          ? i
          : childrenHints.length - i - 1;
      const hint = childrenHints[hintIndex];
      newEntries.push({
        depth: parentDepth + 1,
        vertexHint: hint,
        parentVertexRef,
        parentVertex: parentVertexRef.unref(),
        hintIndex: i
        // vertexHintOriginalOrderIndex: hintIndex,
        // vertexHintTraversalOrderIndex: childrenHints.length - i - 1,
      });
    }
    traversalState.STACK.push(...newEntries);
    if (visitors?.postOrderVisitor || visitors?.inOrderVisitor) {
      traversalState.postOrderNotVisitedChildrenCountMap.set(
        parentVertexRef,
        newEntries.length,
      );
    }
    return newEntries;
  }

  return new DepthFirstTraversalResult({
    traversableTree: tTree,
    visitors,
    resolvedTreesContainer,
    traversalState,
    haltedOnContext,
    config: effectiveConfig,
  });
}
