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
};

export const DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG: DepthFirstTraversalConfig = {
  childrenOrder: ChildrenOrder.DEFAULT,
};

export type TraversalResult<TTP extends TreeTypeParameters> = {
  resolvedTree: ResolvedTree<TTP>;
};

export type DepthFirstVisitors<TTP extends TreeTypeParameters> = {
  preOrderVisitor?: TraversalVisitor<TTP>;
  postOrderVisitor?: TraversalVisitor<TTP>;
  inOrderVisitor?: TraversalVisitor<TTP>;
};

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
>(
  tree: TraversableTree<TTP>,
  visitors: DepthFirstVisitors<TTP>,
  config: Partial<DepthFirstTraversalConfig> = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
): TraversalResult<TTP> {
  type ThisVertexResolutionContext = VertexResolutionContext<TTP>;
  type ThisVertexRef = CTTRef<Vertex<TTP>>;
  type ThisTraversalOrderContext = {
    visitIndex: number;
    previousVisitedVertexRef: ThisVertexRef | null;
  };
  type ThisVisitorsContext = {
    [K in keyof Required<DepthFirstVisitors<TTP>>]: ThisTraversalOrderContext;
  };

  const effectiveConfig =
    config === DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG
      ? config
      : { ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG, ...config };
  const STACK: Array<ThisVertexResolutionContext> = [];
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
  const resolvedTree = new ResolvedTree<TTP>({
    traversableTree: tree,
  });
  const postOrderNotVisitedChildrenCountMap = new Map<ThisVertexRef, number>();
  const inOrderNotVisitedChildrenCountMap = new Map<ThisVertexRef, number>();
  let haltTraversalFlag = false;
  const onPostOrder = !visitors?.postOrderVisitor
    ? null
    : onPostOrderProcessing;
  const onInOrder = !visitors?.inOrderVisitor ? null : onInOrderProcessing;

  const rootVertexContent = tree.makeRoot();
  if (rootVertexContent === null) {
    return {
      resolvedTree,
    };
  }
  const rootVertexRef = new CTTRef(new Vertex(rootVertexContent));

  onPreOrder(rootVertexRef, null);
  pushHints(rootVertexRef, 0);

  while (STACK.length > 0 && !haltTraversalFlag) {
    const vertexContext = STACK.pop() as ThisVertexResolutionContext;
    const vertexContent = tree.makeVertex(vertexContext.vertexHint, {
      resolutionContext: vertexContext,
      resolvedTree,
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
    vertexRef: ThisVertexRef,
    vertexContext: ThisVertexResolutionContext | null,
  ): void {
    resolvedTree.onPreOrderVisit(vertexRef, vertexContext);
    visitVertex('preOrderVisitor', vertexRef);
  }

  function onInOrderProcessing(
    vertexRef: ThisVertexRef,
    vertexContext: ThisVertexResolutionContext | null,
  ): void {
    visitVertex('inOrderVisitor', vertexRef);
    if (!vertexRef.unref().isLeafVertex() || !vertexContext?.parentVertexRef) {
      return;
    }
    // let curVertex = vertex;
    let curVertexContext: ThisVertexResolutionContext | null = vertexContext;
    while (curVertexContext !== null) {
      const inOrderNotVisitedChildrenCount =
        inOrderNotVisitedChildrenCountMap.get(curVertexContext.parentVertexRef);
      if (inOrderNotVisitedChildrenCount === undefined) {
        return;
      }
      const newCount = inOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        inOrderNotVisitedChildrenCountMap.set(
          curVertexContext.parentVertexRef,
          newCount,
        );
        const parentVertexContext: ThisVertexResolutionContext | null =
          resolvedTree
            .get(curVertexContext.parentVertexRef)
            ?.getResolutionContext() ?? null;
        if (parentVertexContext !== null) {
          onInOrder?.(curVertexContext.parentVertexRef, parentVertexContext);
        }
        break;
      } else {
        const parentVertexContext: ThisVertexResolutionContext | null =
          resolvedTree
            .get(curVertexContext.parentVertexRef)
            ?.getResolutionContext() ?? null;
        if (parentVertexContext === null) {
          break;
        }
        curVertexContext = parentVertexContext;
      }
    }
  }

  function onPostOrderProcessing(
    vertexRef: ThisVertexRef,
    vertexContext: ThisVertexResolutionContext | null,
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
    visitorOrderKey: keyof Required<DepthFirstVisitors<TTP>>,
    vertexRef: ThisVertexRef,
  ): void {
    const visitorResult = visitors?.[visitorOrderKey]?.(vertexRef.unref(), {
      resolvedTree,
      visitIndex: visitorsContext[visitorOrderKey].visitIndex++,
      previousVisitedVertexRef:
        visitorsContext[visitorOrderKey].previousVisitedVertexRef,
      isRoot: isRootVertex(vertexRef),
      vertexRef,
    });
    visitorsContext[visitorOrderKey].previousVisitedVertexRef = vertexRef;
    visitorResult?.commands?.forEach(
      (command: TraversalVisitorCommand<TTP>) => {
        switch (command.commandName) {
          case TraversalVisitorCommandName.HALT_TRAVERSAL:
            haltTraversalFlag = true;
            break;
          case TraversalVisitorCommandName.REWRITE_VERTEX_DATA:
            vertexRef.setPointsTo(
              vertexRef.unref().clone({
                $d: (
                  command.commandArguments as TraversalVisitorCommandArguments<TTP>[TraversalVisitorCommandName.REWRITE_VERTEX_DATA]
                ).newData,
              }),
            );
            // console.log('REWRITTEN!');
            break;
          default:
            return;
        }
      },
    );
  }

  function isRootVertex(vertexRef: ThisVertexRef) {
    return vertexRef === rootVertexRef;
  }

  function pushHints(
    parentVertexRef: ThisVertexRef,
    parentDepth: number,
  ): Array<ThisVertexResolutionContext> {
    const childrenHints = parentVertexRef.unref().getChildrenHints();
    const newEntries: ThisVertexResolutionContext[] = [];
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
  };
}
