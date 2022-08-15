import type {
  TraversableTree,
  Vertex,
  IVertexContext,
  TraversalVisitor,
  TreeTypeParameters,
  ResolvedTreeMap,
  VertexContextMap,
  TreeResolution,
} from '../types';
import { CVertex } from '../CVertex';
import { TraversalVisitorCommand } from '../types';

export enum ChildrenOrder {
  DEFAULT = 'DEFAULT',
  REVERSED = 'REVERSED',
}

export interface DepthFirstTraversalConfig {
  childrenOrder: ChildrenOrder;
}

export const DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG: DepthFirstTraversalConfig = {
  childrenOrder: ChildrenOrder.DEFAULT,
};

export interface TraversalResult<TTP extends TreeTypeParameters>
  extends TreeResolution<TTP> {
  rootVertex: Vertex<TTP> | null;
}

export interface DepthFirstVisitors<TTP extends TreeTypeParameters> {
  preOrderVisitor?: TraversalVisitor<TTP>;
  postOrderVisitor?: TraversalVisitor<TTP>;
  inOrderVisitor?: TraversalVisitor<TTP>;
}

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
>(
  tree: TraversableTree<TTP>,
  visitors: DepthFirstVisitors<TTP>,
  config: Partial<DepthFirstTraversalConfig> = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
): TraversalResult<TTP> {
  type ThisIVertexContext = IVertexContext<TTP>;
  type ThisIVertex = Vertex<TTP>;
  type ThisTraversalOrderContext = {
    visitIndex: number;
    previousVisitedVertex: ThisIVertex | null;
  };
  type VisitorsContext = {
    [K in keyof Required<DepthFirstVisitors<TTP>>]: ThisTraversalOrderContext;
  };

  const effectiveConfig =
    config === DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG
      ? config
      : { ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG, ...config };
  const vertexStack: Array<ThisIVertexContext> = [];
  const visitorsContext: VisitorsContext = {
    preOrderVisitor: {
      visitIndex: 0,
      previousVisitedVertex: null,
    },
    postOrderVisitor: {
      visitIndex: 0,
      previousVisitedVertex: null,
    },
    inOrderVisitor: {
      visitIndex: 0,
      previousVisitedVertex: null,
    },
  };
  const vertexContextMap: VertexContextMap<TTP> = new Map();
  const resolvedTreeMap: ResolvedTreeMap<TTP> = new Map();
  const postOrderNotVisitedChildrenCountMap = new Map<ThisIVertex, number>();
  const inOrderNotVisitedChildrenCountMap = new Map<ThisIVertex, number>();
  let haltTraversalFlag = false;
  const onPostOrder = !visitors?.postOrderVisitor
    ? null
    : onPostOrderProcessing;
  const onInOrder = !visitors?.inOrderVisitor ? null : onInOrderProcessing;

  const rootVertex = tree.makeRoot();
  if (rootVertex === null) {
    return { rootVertex, vertexContextMap, resolvedTreeMap };
  }

  onPreOrder(rootVertex, null);
  pushHints(rootVertex);

  while (vertexStack.length > 0 && !haltTraversalFlag) {
    const vertexContext = vertexStack.pop() as ThisIVertexContext;
    const vertex = tree.makeVertex(vertexContext.hint, {
      ...vertexContext,
      resolvedTreeMap,
      vertexContextMap,
    });
    if (vertex === null) {
      continue;
    }
    onPreOrder(vertex, vertexContext);
    pushHints(vertex);
    if (isLeafVertex(vertex)) {
      onPostOrder?.(vertex, vertexContext);
      onInOrder?.(vertex, vertexContext);
    }
  }

  function onPreOrder(
    vertex: ThisIVertex,
    vertexContext: ThisIVertexContext | null,
  ): void {
    if (vertexContext !== null) {
      let parentVertexChildren = resolvedTreeMap.get(
        vertexContext.parentVertex,
      );
      if (parentVertexChildren === undefined) {
        parentVertexChildren = [];
        resolvedTreeMap.set(vertexContext.parentVertex, parentVertexChildren);
      }
      parentVertexChildren.push(vertex);
    }
    vertexContextMap.set(vertex, vertexContext);
    visitVertex('preOrderVisitor', vertex);
  }

  function onInOrderProcessing(
    vertex: ThisIVertex,
    vertexContext: ThisIVertexContext | null,
  ): void {
    visitVertex('inOrderVisitor', vertex);
    if (!isLeafVertex(vertex) || !vertexContext?.parentVertex) {
      return;
    }
    // let curVertex = vertex;
    let curVertexContext: ThisIVertexContext | null = vertexContext;
    while (curVertexContext !== null) {
      const inOrderNotVisitedChildrenCount =
        inOrderNotVisitedChildrenCountMap.get(curVertexContext.parentVertex);
      if (inOrderNotVisitedChildrenCount === undefined) {
        return;
      }
      const newCount = inOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        inOrderNotVisitedChildrenCountMap.set(
          curVertexContext.parentVertex,
          newCount,
        );
        const parentVertexContext = vertexContextMap.get(
          curVertexContext.parentVertex,
        );
        if (parentVertexContext !== undefined) {
          onInOrder?.(curVertexContext.parentVertex, parentVertexContext);
        }
        break;
      } else {
        const parentVertexContext = vertexContextMap.get(
          curVertexContext.parentVertex,
        );
        if (parentVertexContext === undefined) {
          break;
        }
        // curVertex = curVertexContext.parentVertex;
        curVertexContext = parentVertexContext;
      }
    }
  }

  function onPostOrderProcessing(
    vertex: ThisIVertex,
    vertexContext: ThisIVertexContext | null,
  ): void {
    let curVertex = vertex;
    let curVertexContext = vertexContext;
    while (curVertex !== null) {
      visitVertex('postOrderVisitor', curVertex);
      if (!curVertexContext?.parentVertex) {
        break;
      }
      const postOrderNotVisitedChildrenCount =
        postOrderNotVisitedChildrenCountMap.get(curVertexContext.parentVertex);
      if (postOrderNotVisitedChildrenCount === undefined) {
        break;
      }
      const newCount = postOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        postOrderNotVisitedChildrenCountMap.set(
          curVertexContext.parentVertex,
          newCount,
        );
        break;
      } else {
        postOrderNotVisitedChildrenCountMap.delete(
          curVertexContext.parentVertex,
        );
        const parentVertexContext = vertexContextMap.get(
          curVertexContext.parentVertex,
        );
        if (parentVertexContext === undefined) {
          break;
        }
        curVertex = curVertexContext.parentVertex;
        curVertexContext = parentVertexContext;
      }
    }
  }

  function visitVertex(
    visitorOrderKey: keyof Required<DepthFirstVisitors<TTP>>,
    vertex: Vertex<TTP>,
  ): void {
    const visitorResult = visitors?.[visitorOrderKey]?.(vertex, {
      vertexContextMap,
      resolvedTreeMap,
      visitIndex: visitorsContext[visitorOrderKey].visitIndex++,
      previousVisitedVertex:
        visitorsContext[visitorOrderKey].previousVisitedVertex,
      isLeafVertex: isLeafVertex(vertex),
      isRootVertex: isRootVertex(vertex),
    });
    visitorsContext[visitorOrderKey].previousVisitedVertex = vertex;
    if (visitorResult?.command === TraversalVisitorCommand.HALT_TRAVERSAL) {
      haltTraversalFlag = true;
    }
  }

  function isRootVertex(vertex: ThisIVertex) {
    return vertex === rootVertex;
  }

  function isLeafVertex(vertex: ThisIVertex) {
    return getChildrenHints(vertex).length === 0;
  }

  function getChildrenHints(vertex: ThisIVertex) {
    return CVertex.prototype.getChildrenHints.call(vertex);
  }

  function pushHints(parentVertex: ThisIVertex): Array<ThisIVertexContext> {
    const childrenHints = getChildrenHints(parentVertex);
    const newEntries: ThisIVertexContext[] = [];
    for (let i = 0; i < childrenHints.length; i++) {
      const hintIndex =
        effectiveConfig.childrenOrder === ChildrenOrder.REVERSED
          ? i
          : childrenHints.length - i - 1;
      const hint = childrenHints[hintIndex];
      newEntries.push({
        hint,
        parentVertex,
        vertexHintOriginalOrderIndex: hintIndex,
        vertexHintTraversalOrderIndex: childrenHints.length - i - 1,
      });
    }
    vertexStack.push(...newEntries);
    if (visitors?.postOrderVisitor) {
      postOrderNotVisitedChildrenCountMap.set(parentVertex, newEntries.length);
    }
    if (visitors?.inOrderVisitor) {
      inOrderNotVisitedChildrenCountMap.set(parentVertex, newEntries.length);
    }
    return newEntries;
  }

  return { resolvedTreeMap, vertexContextMap, rootVertex };
}
