import type {
  ITraversableTree,
  IVertex,
  IVertexContext,
  TraversalVisitor,
  ITreeTypeParameters,
  ResolvedTreeMap,
  VertexContextMap,
} from '../types';
import { Vertex } from '../classes';

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

export interface TraversalResult<
  TreeTypeParameters extends ITreeTypeParameters,
> {
  resolvedTreeMap: ResolvedTreeMap<TreeTypeParameters>;
  vertexContextMap: VertexContextMap<TreeTypeParameters>;
  rootVertex: IVertex<TreeTypeParameters> | null;
}

export interface DepthFirstVisitors<
  TreeTypeParameters extends ITreeTypeParameters,
> {
  preOrderVisitor?: TraversalVisitor<TreeTypeParameters>;
  postOrderVisitor?: TraversalVisitor<TreeTypeParameters>;
  inOrderVisitor?: TraversalVisitor<TreeTypeParameters>;
}

export function traverseDepthFirst<
  TreeTypeParameters extends ITreeTypeParameters = ITreeTypeParameters,
>(
  tree: ITraversableTree<TreeTypeParameters>,
  visitors: DepthFirstVisitors<TreeTypeParameters>,
  config: Partial<DepthFirstTraversalConfig> = DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG,
): TraversalResult<TreeTypeParameters> {
  type ThisIVertexContext = IVertexContext<TreeTypeParameters>;
  type ThisIVertex = IVertex<TreeTypeParameters>;

  const effectiveConfig =
    config === DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG
      ? config
      : { ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG, ...config };
  const stack: Array<ThisIVertexContext> = [];
  const vertexContextMap: VertexContextMap<TreeTypeParameters> = new Map();
  const resolvedTreeMap: ResolvedTreeMap<TreeTypeParameters> = new Map();
  const notPostOrderVisitedChildrenCountMap = new Map<ThisIVertex, number>();
  const notInOrderVisitedChildrenCountMap = new Map<ThisIVertex, number>();
  const rootVertex = tree.makeRoot();

  if (rootVertex === null) {
    return { rootVertex, vertexContextMap, resolvedTreeMap };
  }
  let preOrderVisitIndex = 0;
  let postOrderVisitIndex = 0;
  let inOrderVisitIndex = 0;

  let previousPreOrderVisitedVertex: ThisIVertex | null = null;
  let previousPostOrderVisitedVertex: ThisIVertex | null = null;
  let previousInOrderVisitedVertex: ThisIVertex | null = null;

  onPreOrder(rootVertex, null);
  pushHints(rootVertex);

  const onPostOrder = !visitors?.postOrderVisitor
    ? null
    : onPostOrderProcessing;
  const onInOrder = !visitors?.inOrderVisitor ? null : onInOrderProcessing;

  while (stack.length > 0) {
    const vertexContext = stack.pop() as ThisIVertexContext;
    const vertex = tree.makeVertex(vertexContext.hint, vertexContext);
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
    visitors?.preOrderVisitor?.(vertex, {
      vertexContextMap,
      resolvedTreeMap,
      visitIndex: preOrderVisitIndex++,
      previousVisitedVertex: previousPreOrderVisitedVertex,
      isLeafVertex: isLeafVertex(vertex),
      isRootVertex: isRootVertex(vertex),
    });
    previousPreOrderVisitedVertex = vertex;
  }

  function onInOrderProcessing(
    vertex: ThisIVertex,
    vertexContext: ThisIVertexContext | null,
  ): void {
    visitors?.inOrderVisitor?.(vertex, {
      vertexContextMap,
      resolvedTreeMap,
      visitIndex: inOrderVisitIndex++,
      previousVisitedVertex: previousInOrderVisitedVertex,
      isLeafVertex: isLeafVertex(vertex),
      isRootVertex: isRootVertex(vertex),
    });
    previousInOrderVisitedVertex = vertex;
    if (!isLeafVertex(vertex) || !vertexContext?.parentVertex) {
      return;
    }
    // let curVertex = vertex;
    let curVertexContext: ThisIVertexContext | null = vertexContext;
    while (curVertexContext !== null) {
      const notInOrderVisitedChildrenCount =
        notInOrderVisitedChildrenCountMap.get(curVertexContext.parentVertex);
      if (notInOrderVisitedChildrenCount === undefined) {
        return;
      }
      const newCount = notInOrderVisitedChildrenCount - 1;
      if (newCount !== 0) {
        notInOrderVisitedChildrenCountMap.set(
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
      visitors?.postOrderVisitor?.(curVertex, {
        vertexContextMap,
        resolvedTreeMap,
        visitIndex: postOrderVisitIndex++,
        previousVisitedVertex: previousPostOrderVisitedVertex,
        isLeafVertex: isLeafVertex(vertex),
        isRootVertex: isRootVertex(vertex),
      });
      previousPostOrderVisitedVertex = vertex;
      if (!curVertexContext?.parentVertex) {
        break;
      }
      const notPostOrderVisitedChildrenCount =
        notPostOrderVisitedChildrenCountMap.get(curVertexContext.parentVertex);
      if (notPostOrderVisitedChildrenCount === undefined) {
        break;
      }
      const newCount = notPostOrderVisitedChildrenCount - 1;
      if (newCount !== 0) {
        notPostOrderVisitedChildrenCountMap.set(
          curVertexContext.parentVertex,
          newCount,
        );
        break;
      } else {
        notPostOrderVisitedChildrenCountMap.delete(
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

  function isRootVertex(vertex: ThisIVertex) {
    return vertex === rootVertex;
  }

  function isLeafVertex(vertex: ThisIVertex) {
    return getChildrenHints(vertex).length === 0;
  }

  function getChildrenHints(vertex: ThisIVertex) {
    return Vertex.prototype.getChildrenHints.call(vertex);
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
    stack.push(...newEntries);
    if (visitors?.postOrderVisitor) {
      notPostOrderVisitedChildrenCountMap.set(parentVertex, newEntries.length);
    }
    if (visitors?.inOrderVisitor) {
      notInOrderVisitedChildrenCountMap.set(parentVertex, newEntries.length);
    }
    return newEntries;
  }

  return { resolvedTreeMap, vertexContextMap, rootVertex };
}
