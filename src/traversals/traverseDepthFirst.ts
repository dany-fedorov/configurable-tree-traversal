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

export type DepthFirstTraversalConfig = {
  childrenOrder: ChildrenOrder;
  saveNotMutatedResolvedTree: boolean;
  inOrderTraversalConfig: DepthFirstTraversalConfig_InOrderTraversalConfig;
};

export const DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG: DepthFirstTraversalConfig = {
  childrenOrder: ChildrenOrder.DEFAULT,
  saveNotMutatedResolvedTree: false,
  inOrderTraversalConfig: {
    visitParentAfter: [0, -2],
    visitParentAfterRangesOutOfBoundsFallback: -2,
    visitOneChildParents: true,
  },
};

export type TraversalResult<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  resolvedTree: ResolvedTree<TTP | RW_TTP>;
  notMutatedResolvedTree: ResolvedTree<TTP> | null;
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

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  tree: TraversableTree<TTP, RW_TTP>,
  visitors: DepthFirstVisitors<TTP, RW_TTP>,
  config: DeepPartial<DepthFirstTraversalConfig> = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
): TraversalResult<TTP, RW_TTP> {
  type ThisTraversalOrderContext = {
    visitIndex: number;
    previousVisitedVertexRef: CTTRef<Vertex<TTP | RW_TTP>> | null;
  };
  type ThisVisitorsContext = {
    [K in keyof Required<
      DepthFirstVisitors<TTP, RW_TTP>
    >]: ThisTraversalOrderContext;
  };

  const effectiveConfig = (
    config === DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG
      ? config
      : {
          ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
          ...config,
          inOrderTraversalConfig: {
            ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG.inOrderTraversalConfig,
            ...(config?.inOrderTraversalConfig || {}),
          },
        }
  ) as DepthFirstTraversalConfig;
  const STACK: Array<VertexResolutionContext<TTP | RW_TTP>> = [];
  const visitorsContext: ThisVisitorsContext = {
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
  const resolvedTree = new ResolvedTree<TTP | RW_TTP>();
  const notMutatedResolvedTree =
    config?.saveNotMutatedResolvedTree !== true
      ? null
      : new ResolvedTree<TTP | TTP>();
  const notMutatedResolvedTreeRefsMap =
    config?.saveNotMutatedResolvedTree !== true
      ? null
      : new Map<CTTRef<Vertex<TTP | RW_TTP>>, CTTRef<Vertex<TTP>>>();
  const postOrderNotVisitedChildrenCountMap = new Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >();
  let haltTraversalFlag = false;
  const onPostOrder =
    !visitors?.postOrderVisitor && !visitors?.inOrderVisitor
      ? null
      : onPostOrderProcessing;

  const rootVertexContent = tree.makeRoot();
  if (rootVertexContent === null) {
    return {
      resolvedTree,
      notMutatedResolvedTree,
    };
  }
  const rootVertexRef = new CTTRef(new Vertex(rootVertexContent));

  onPreOrder(rootVertexRef, null);
  pushHints(rootVertexRef, 0);

  while (STACK.length > 0 && !haltTraversalFlag) {
    const vertexContext = STACK.pop() as VertexResolutionContext<TTP | RW_TTP>;
    const vertexContent = tree.makeVertex(vertexContext.vertexHint, {
      resolutionContext: vertexContext,
      resolvedTree,
      notMutatedResolvedTree,
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

  onPostOrder?.(rootVertexRef, null);

  function onPreOrder(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    resolvedTree.onPreOrderVisit(vertexRef, vertexContext);
    if (
      notMutatedResolvedTree !== null &&
      notMutatedResolvedTreeRefsMap !== null
    ) {
      const notMutatedRef = new CTTRef<Vertex<TTP>>(
        (vertexRef as CTTRef<Vertex<TTP>>).unref().clone(),
      );
      notMutatedResolvedTreeRefsMap.set(vertexRef, notMutatedRef);
      notMutatedResolvedTree?.onPreOrderVisit(
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

  function onInOrderProcessing(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    if (vertexContext == null) {
      return;
    }
    if (vertexRef.unref().isLeafVertex()) {
      visitVertex('inOrderVisitor', vertexRef);
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
        resolvedTree
          .get(vertexContext.parentVertexRef)
          ?.getResolutionContext() ?? null;
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
      onInOrderProcessing(curVertexRef, curVertexContext);
      visitVertex('postOrderVisitor', curVertexRef);
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
          resolvedTree
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
    if (visitor == null) {
      return;
    }
    const visitorResult = visitor(vertexRef.unref(), {
      resolvedTree,
      notMutatedResolvedTree,
      visitIndex: visitorsContext[visitorOrderKey].visitIndex++,
      previousVisitedVertexRef:
        visitorsContext[visitorOrderKey].previousVisitedVertexRef,
      isRoot: isRootVertex(vertexRef),
      vertexRef,
    });
    visitorsContext[visitorOrderKey].previousVisitedVertexRef = vertexRef;
    visitorResult?.commands?.forEach(
      (command: TraversalVisitorCommand<RW_TTP>) => {
        switch (command.commandName) {
          case TraversalVisitorCommandName.HALT_TRAVERSAL:
            haltTraversalFlag = true;
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
            resolvedTree.delete(vertexRef);
            break;
          default:
            return;
        }
      },
    );
  }

  function isRootVertex(vertexRef: CTTRef<Vertex<TTP | RW_TTP>>) {
    return vertexRef === rootVertexRef;
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
    // if (visitors?.inOrderVisitor) {
    //   inOrderNotVisitedChildrenCountMap.set(parentVertexRef, newEntries.length);
    // }
    return newEntries;
  }

  return {
    resolvedTree,
    notMutatedResolvedTree,
  };
}
