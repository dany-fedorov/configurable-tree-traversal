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

export type DepthFirstTraversalConfig = {
  childrenOrder: ChildrenOrder;
  saveNotMutatedResolvedTree: boolean;
};

export const DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG: DepthFirstTraversalConfig = {
  childrenOrder: ChildrenOrder.DEFAULT,
  saveNotMutatedResolvedTree: false,
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

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  tree: TraversableTree<TTP, RW_TTP>,
  visitors: DepthFirstVisitors<TTP, RW_TTP>,
  config: Partial<DepthFirstTraversalConfig> = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
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

  const effectiveConfig =
    config === DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG
      ? config
      : { ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG, ...config };
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
  const inOrderNotVisitedChildrenCountMap = new Map<
    CTTRef<Vertex<TTP | RW_TTP>>,
    number
  >();
  let haltTraversalFlag = false;
  const onPostOrder = !visitors?.postOrderVisitor
    ? null
    : onPostOrderProcessing;
  const onInOrder = !visitors?.inOrderVisitor ? null : onInOrderProcessing;

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
      onInOrder?.(vertexRef, vertexContext);
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

  function onInOrderProcessing(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    visitVertex('inOrderVisitor', vertexRef);
    const isLeaf = vertexRef.unref().isLeafVertex();
    const isSingleParent = vertexRef.unref().getChildrenHints().length === 1;
    if (!isLeaf && !isSingleParent) {
      return;
    }
    // let curVertex = vertex;
    let curVertexContext: VertexResolutionContext<TTP | RW_TTP> | null =
      vertexContext;
    while (curVertexContext !== null) {
      const inOrderNotVisitedChildrenCount =
        inOrderNotVisitedChildrenCountMap.get(curVertexContext.parentVertexRef);
      // console.log(vertexRef.unref().getData(), {inOrderNotVisitedChildrenCount,});
      if (inOrderNotVisitedChildrenCount === undefined) {
        return;
      }
      const parentVertexContext: VertexResolutionContext<TTP | RW_TTP> | null =
        resolvedTree
          .get(curVertexContext.parentVertexRef)
          ?.getResolutionContext() ?? null;
      const newCount = inOrderNotVisitedChildrenCount - 1;
      inOrderNotVisitedChildrenCountMap.set(
        curVertexContext.parentVertexRef,
        newCount,
      );
      const siblingsCount = curVertexContext.parentVertexRef
        .unref()
        .getChildrenHints().length;
      // console.log(vertexRef.unref().getData(), { newCount, siblingsCount });
      if (newCount !== 0 || (newCount === 0 && siblingsCount === 1)) {
        if (parentVertexContext === null) {
          onInOrder?.(rootVertexRef, null);
        } else {
          onInOrder?.(curVertexContext.parentVertexRef, parentVertexContext);
        }
        break;
      } else {
        if (parentVertexContext === null) {
          break;
        }
        curVertexContext = parentVertexContext;
      }
    }
  }

  function onPostOrderProcessing(
    vertexRef: CTTRef<Vertex<TTP | RW_TTP>>,
    vertexContext: VertexResolutionContext<TTP | RW_TTP> | null,
  ): void {
    let curVertexRef = vertexRef;
    let curVertexContext = vertexContext;
    while (curVertexRef !== null) {
      visitVertex('postOrderVisitor', curVertexRef);
      if (!curVertexContext?.parentVertexRef) {
        break;
      }
      const postOrderNotVisitedChildrenCount =
        postOrderNotVisitedChildrenCountMap.get(
          curVertexContext.parentVertexRef,
        );
      if (postOrderNotVisitedChildrenCount === undefined) {
        break;
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
    const visitorResult = visitors?.[visitorOrderKey]?.(vertexRef.unref(), {
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
    if (visitors?.postOrderVisitor) {
      postOrderNotVisitedChildrenCountMap.set(
        parentVertexRef,
        newEntries.length,
      );
    }
    if (visitors?.inOrderVisitor) {
      inOrderNotVisitedChildrenCountMap.set(parentVertexRef, newEntries.length);
    }
    return newEntries;
  }

  return {
    resolvedTree,
    notMutatedResolvedTree,
  };
}
