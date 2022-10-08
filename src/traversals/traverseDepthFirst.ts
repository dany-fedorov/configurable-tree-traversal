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
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type NotMutatedResolvedTreeRefsMap<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = Map<CTTRef<Vertex<TTP | RW_TTP>>, CTTRef<Vertex<TTP>>>;

export type DepthFirstTraversalConfig_StartAfterConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  vertexRef?: CTTRef<Vertex<TTP | RW_TTP>>;
  STACK?: Array<VertexResolutionContext<TTP>>;
  visitOrderKey: keyof DepthFirstVisitors<TTP, RW_TTP>;
};

export type DepthFirstTraversalConfig<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  childrenOrder: ChildrenOrder;
  saveNotMutatedResolvedTree: boolean;
  inOrderTraversalConfig: DepthFirstTraversalConfig_InOrderTraversalConfig;
  useResolvedTree: ResolvedTree<TTP | RW_TTP> | null;
  useNotMutatedResolvedTree: ResolvedTree<TTP> | null;
  continuationContext: TraversalHaltedOnContext<TTP, RW_TTP> | null;
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
  useResolvedTree: null,
  useNotMutatedResolvedTree: null,
  continuationContext: null,
};

export type TraversalResult<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  haltedOnContext: TraversalHaltedOnContext<TTP, RW_TTP> | null;
};

export type DepthFirstVisitors<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  preOrderVisitor?: TraversalVisitor<TTP, RW_TTP>;
  postOrderVisitor?: TraversalVisitor<TTP, RW_TTP>;
  inOrderVisitor?: TraversalVisitor<TTP, RW_TTP>;
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
  visitorOrderKey: keyof Required<DepthFirstVisitors<TTP, RW_TTP>>;
  vertexRef: CTTRef<Vertex<TTP | RW_TTP>>;
  STACK: Array<VertexResolutionContext<TTP | RW_TTP>>;
  notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
    TTP,
    RW_TTP
  > | null;
};

type DepthFirstTraversalConfigInput<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = DeepPartial<DepthFirstTraversalConfig<TTP, RW_TTP>>;

function getEffectiveConfig<
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

type VisitorsContext<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  [K in keyof Required<DepthFirstVisitors<TTP, RW_TTP>>]: {
    visitIndex: number;
    previousVisitedVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  };
};

function initVisitorsContext<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(): VisitorsContext<TTP, RW_TTP> {
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

function getRootVertexRef<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(ttree: TraversableTree<TTP, RW_TTP>): CTTRef<Vertex<TTP | RW_TTP>> | null {
  const rootContent = ttree.makeRoot();
  if (rootContent === null) {
    return null;
  }
  return new CTTRef<Vertex<TTP | RW_TTP>>(
    new Vertex<TTP | RW_TTP>(rootContent),
  );
}

function initRootVertex<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  ttree: TraversableTree<TTP, RW_TTP>,
  rtree: ResolvedTree<TTP | RW_TTP>,
  config: DepthFirstTraversalConfig<TTP, RW_TTP>,
): {
  rootVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  rootVertexContext: VertexResolutionContext<TTP | RW_TTP> | null;
  notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
    TTP,
    RW_TTP
  > | null;
  STACK: Array<VertexResolutionContext<TTP | RW_TTP>>;
} {
  const notMutatedResolvedTreeRefsMap: NotMutatedResolvedTreeRefsMap<
    TTP,
    RW_TTP
  > | null =
    config.continuationContext?.notMutatedResolvedTreeRefsMap != null
      ? config.continuationContext?.notMutatedResolvedTreeRefsMap
      : !config.saveNotMutatedResolvedTree
      ? null
      : new Map();
  const rootVertexRef =
    config.continuationContext?.vertexRef != null
      ? config.continuationContext?.vertexRef
      : getRootVertexRef(ttree);
  const rootVertexContext =
    rootVertexRef === null
      ? null
      : rtree.get(rootVertexRef)?.getResolutionContext() ?? null;
  const STACK =
    config.continuationContext?.STACK != null
      ? config.continuationContext.STACK
      : [];
  return {
    notMutatedResolvedTreeRefsMap,
    rootVertexRef,
    rootVertexContext,
    STACK,
  };
}

function createTraversalHelperObjects<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
>(
  effectiveConfig: DepthFirstTraversalConfig<TTP, RW_TTP>,
): {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
  postOrderNotVisitedChildrenCountMap: Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >;
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
  const postOrderNotVisitedChildrenCountMap = new Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >();
  const haltState = {
    haltTraversalFlag: false,
    haltedOnContext: null,
  };
  return {
    resolvedTree,
    notMutatedResolvedTree,
    postOrderNotVisitedChildrenCountMap,
    haltState,
  };
}

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  ttree: TraversableTree<TTP, RW_TTP>,
  visitors: DepthFirstVisitors<TTP, RW_TTP>,
  config: DepthFirstTraversalConfigInput<
    TTP,
    RW_TTP
  > = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG as DepthFirstTraversalConfigInput<
    TTP,
    RW_TTP
  >,
): TraversalResult<TTP, RW_TTP> {
  const effectiveConfig = getEffectiveConfig<TTP, RW_TTP>(config);
  const visitorsContext = initVisitorsContext<TTP, RW_TTP>();
  const {
    resolvedTree: rtree,
    notMutatedResolvedTree: notMutatedRTree,
    postOrderNotVisitedChildrenCountMap,
    haltState,
  } = createTraversalHelperObjects(effectiveConfig);
  const {
    rootVertexRef: rvr,
    // rootVertexContext,
    notMutatedResolvedTreeRefsMap,
    STACK,
  } = initRootVertex(ttree, rtree, effectiveConfig);
  if (rvr === null) {
    return {
      resolvedTree: rtree,
      notMutatedResolvedTree: notMutatedRTree,
      haltedOnContext: haltState.haltedOnContext,
    };
  }
  const rootVertexRef = rvr; // for ts

  const onPostOrder =
    !visitors?.postOrderVisitor && !visitors?.inOrderVisitor
      ? null
      : onPostOrderProcessing;

  onPreOrder(rootVertexRef, null);
  pushHints(rootVertexRef, 0);

  while (STACK.length > 0 && !haltState.haltTraversalFlag) {
    const vertexContext = STACK.pop() as VertexResolutionContext<TTP | RW_TTP>;
    const vertexContent = ttree.makeVertex(vertexContext.vertexHint, {
      resolutionContext: vertexContext,
      resolvedTree: rtree,
      notMutatedResolvedTree: notMutatedRTree,
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

  if (!haltState.haltTraversalFlag) {
    onPostOrder?.(rootVertexRef, null);
  }

  function onPreOrder(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    rtree.onPreOrderVisit(vertexRef, vertexContext);
    if (notMutatedRTree !== null && notMutatedResolvedTreeRefsMap !== null) {
      const notMutatedRef = new CTTRef<Vertex<TTP>>(
        (vertexRef as CTTRef<Vertex<TTP>>).unref().clone(),
      );
      notMutatedResolvedTreeRefsMap.set(vertexRef, notMutatedRef);
      notMutatedRTree?.onPreOrderVisit(
        notMutatedRef,
        vertexContext === null
          ? null
          : ({
              ...vertexContext,
              parentVertex: notMutatedResolvedTreeRefsMap
                .get(vertexContext.parentVertexRef)
                ?.unref(),
              parentVertexRef: notMutatedResolvedTreeRefsMap.get(
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
      postOrderNotVisitedChildrenCountMap.get(vertexContext.parentVertexRef);
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

  function onInOrderProcessing_visitVertex(
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

  function onInOrderProcessing_visitParent(
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
      const parentVertexContext: VertexResolutionContext<TTP | RW_TTP> | null =
        rtree.get(vertexContext.parentVertexRef)?.getResolutionContext() ??
        null;
      visitVertex(
        'inOrderVisitor',
        parentVertexContext === null
          ? rootVertexRef
          : vertexContext.parentVertexRef,
      );
    }
  }

  function onPostOrderProcessing(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    let curVertexRef = vertexRef;
    let curVertexContext = vertexContext;
    while (curVertexRef !== null) {
      onInOrderProcessing_visitVertex(curVertexRef, curVertexContext);
      visitVertex('postOrderVisitor', curVertexRef);
      onInOrderProcessing_visitParent(curVertexContext);
      if (!curVertexContext?.parentVertexRef) {
        break;
      }
      const postOrderNotVisitedChildrenCount =
        postOrderNotVisitedChildrenCountMap.get(
          curVertexContext.parentVertexRef,
        );
      if (postOrderNotVisitedChildrenCount == null) {
        throw new Error(
          'onPostOrderProcessing::Could not find entry in postOrderNotVisitedChildrenCountMap',
        );
      }
      const newCount = postOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        postOrderNotVisitedChildrenCountMap.set(
          curVertexContext.parentVertexRef,
          newCount,
        );
        break;
      } else {
        postOrderNotVisitedChildrenCountMap.delete(
          curVertexContext.parentVertexRef,
        );
        const parentVertexContext =
          rtree.get(curVertexContext.parentVertexRef)?.getResolutionContext() ??
          null;
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
    if (visitor == null) {
      return;
    }
    const visitorResult = visitor(vertexRef.unref(), {
      resolvedTree: rtree,
      notMutatedResolvedTree: notMutatedRTree,
      visitIndex: visitorsContext[visitorOrderKey].visitIndex++,
      previousVisitedVertexRef:
        visitorsContext[visitorOrderKey].previousVisitedVertexRef,
      isTraversalRoot: isTraversalRootVertex(vertexRef),
      isTreeRoot: isTreeRootVertex(vertexRef),
      vertexRef,
    });
    visitorsContext[visitorOrderKey].previousVisitedVertexRef = vertexRef;
    visitorResult?.commands?.forEach(
      (command: TraversalVisitorCommand<RW_TTP>) => {
        switch (command.commandName) {
          case TraversalVisitorCommandName.HALT_TRAVERSAL:
            haltState.haltTraversalFlag = true;
            haltState.haltedOnContext = {
              vertexRef,
              visitorOrderKey,
              notMutatedResolvedTreeRefsMap,
              STACK,
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
            rtree.delete(vertexRef);
            break;
          default:
            return;
        }
      },
    );
  }

  function isTraversalRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>) {
    return vertexRef === rootVertexRef;
  }

  function isTreeRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>) {
    return rtree.getRoot() === vertexRef;
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
        vertexHintOriginalOrderIndex: hintIndex,
        vertexHintTraversalOrderIndex: childrenHints.length - i - 1,
      });
    }
    STACK.push(...newEntries);
    if (visitors?.postOrderVisitor || visitors?.inOrderVisitor) {
      postOrderNotVisitedChildrenCountMap.set(
        parentVertexRef,
        newEntries.length,
      );
    }
    return newEntries;
  }

  return {
    resolvedTree: rtree,
    notMutatedResolvedTree: notMutatedRTree,
    haltedOnContext: haltState.haltedOnContext,
  };
}
