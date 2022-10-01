import type {
  TraversableTree,
  VertexContent,
  VertexResolutionContext,
  TraversalVisitor,
  TreeTypeParameters,
  ResolvedTreeMap,
  VertexResolutionContextMap,
  TreeResolution,
  // TraversalVisitorCommandArguments,
} from '../types';
import { Vertex } from '../Vertex';
import {
  ResolvedTree,
  TraversalVisitorCommand,
  TraversalVisitorCommandName,
} from '../types';
import { Ref } from '../Ref';

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
  ___rootVertex: VertexContent<TTP> | null;
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
  type ThisVertexContext = VertexResolutionContext<TTP>;
  type ThisVertexContent = VertexContent<TTP>;
  // type ThisVertex = Vertex<TTP>;
  type ThisVertexRef = Ref<Vertex<TTP>>;
  type ThisTraversalOrderContext = {
    visitIndex: number;
    previousVisitedVertex: ThisVertexContent | null;
  };
  type VisitorsContext = {
    [K in keyof Required<DepthFirstVisitors<TTP>>]: ThisTraversalOrderContext;
  };

  const effectiveConfig =
    config === DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG
      ? config
      : { ...DEFAULT_DEPTH_FIRST_TRAVERSAL_CONFIG, ...config };
  const vertexStack: Array<ThisVertexContext> = [];
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
  const vertexContextMap: VertexResolutionContextMap<TTP> = new Map();
  const ___resolvedTreeMap: ResolvedTreeMap<TTP> = new Map();
  const resolvedTree = new ResolvedTree();
  const postOrderNotVisitedChildrenCountMap = new Map<
    ThisVertexContent,
    number
  >();
  const inOrderNotVisitedChildrenCountMap = new Map<
    ThisVertexContent,
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
      ___rootVertex: null,
      rootVertex: null,
      vertexContextMap,
      ___resolvedTreeMap: ___resolvedTreeMap,
      resolvedTree,
    };
  }
  const rootVertexRef = new Ref(Vertex.fromContent(rootVertexContent));

  onPreOrder(rootVertexRef, null);
  pushHints(rootVertexRef);

  while (vertexStack.length > 0 && !haltTraversalFlag) {
    const vertexContext = vertexStack.pop() as ThisVertexContext;
    const vertexContent = tree.makeVertex(vertexContext.vertexHint, {
      ...vertexContext,
      ___resolvedTreeMap: ___resolvedTreeMap,
      resolvedTree,
      vertexContextMap,
    });
    if (vertexContent === null) {
      continue;
    }
    const vertexRef = new Ref(Vertex.fromContent(vertexContent));
    onPreOrder(vertexRef, vertexContext);
    pushHints(vertexRef);
    if (vertexRef.get().isLeafVertex()) {
      onPostOrder?.(vertexRef, vertexContext);
      onInOrder?.(vertexRef, vertexContext);
    }
  }

  function onPreOrder(
    vertexRef: ThisVertexRef,
    vertexContext: ThisVertexContext | null,
  ): void {
    if (vertexContext !== null) {
      let parentVertexChildren = ___resolvedTreeMap.get(
        vertexContext.___parentVertexContent,
      );
      if (parentVertexChildren === undefined) {
        parentVertexChildren = [];
        ___resolvedTreeMap.set(
          vertexContext.___parentVertexContent,
          parentVertexChildren,
        );
      }
      parentVertexChildren.push(vertexRef.get().getContent());
    }
    vertexContextMap.set(vertexRef.get().getContent(), vertexContext);
    visitVertex('preOrderVisitor', vertexRef);
  }

  function onInOrderProcessing(
    vertexRef: ThisVertexRef,
    vertexContext: ThisVertexContext | null,
  ): void {
    visitVertex('inOrderVisitor', vertexRef);
    if (
      !vertexRef.get().isLeafVertex() ||
      !vertexContext?.___parentVertexContent
    ) {
      return;
    }
    // let curVertex = vertex;
    let curVertexContext: ThisVertexContext | null = vertexContext;
    while (curVertexContext !== null) {
      const inOrderNotVisitedChildrenCount =
        inOrderNotVisitedChildrenCountMap.get(
          curVertexContext.___parentVertexContent,
        );
      if (inOrderNotVisitedChildrenCount === undefined) {
        return;
      }
      const newCount = inOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        inOrderNotVisitedChildrenCountMap.set(
          curVertexContext.___parentVertexContent,
          newCount,
        );
        const parentVertexContext = vertexContextMap.get(
          curVertexContext.___parentVertexContent,
        );
        if (parentVertexContext !== undefined) {
          onInOrder?.(
            // curVertexContext.___parentVertexContent,
            curVertexContext.parentVertexRef,
            parentVertexContext,
          );
        }
        break;
      } else {
        const parentVertexContext = vertexContextMap.get(
          curVertexContext.___parentVertexContent,
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
    vertexRef: ThisVertexRef,
    vertexContext: ThisVertexContext | null,
  ): void {
    let curVertexRef = vertexRef;
    let curVertexContext = vertexContext;
    while (curVertexRef !== null) {
      visitVertex('postOrderVisitor', curVertexRef);
      if (!curVertexContext?.___parentVertexContent) {
        break;
      }
      const postOrderNotVisitedChildrenCount =
        postOrderNotVisitedChildrenCountMap.get(
          curVertexContext.___parentVertexContent,
        );
      if (postOrderNotVisitedChildrenCount === undefined) {
        break;
      }
      const newCount = postOrderNotVisitedChildrenCount - 1;
      if (newCount !== 0) {
        postOrderNotVisitedChildrenCountMap.set(
          curVertexContext.___parentVertexContent,
          newCount,
        );
        break;
      } else {
        postOrderNotVisitedChildrenCountMap.delete(
          curVertexContext.___parentVertexContent,
        );
        const parentVertexContext = vertexContextMap.get(
          curVertexContext.___parentVertexContent,
        );
        if (parentVertexContext === undefined) {
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
    const visitorResult = visitors?.[visitorOrderKey]?.(vertexRef.get(), {
      vertexContextMap,
      ___resolvedTreeMap: ___resolvedTreeMap,
      resolvedTree,
      visitIndex: visitorsContext[visitorOrderKey].visitIndex++,
      previousVisitedVertex:
        visitorsContext[visitorOrderKey].previousVisitedVertex,
      isLeafVertex: vertexRef.get().isLeafVertex(),
      isRootVertex: isRootVertex(vertexRef),
    });
    visitorsContext[visitorOrderKey].previousVisitedVertex = vertexRef
      .get()
      .getContent();
    visitorResult?.commands?.forEach(
      (command: TraversalVisitorCommand<TTP>) => {
        switch (command.commandName) {
          case TraversalVisitorCommandName.HALT_TRAVERSAL:
            haltTraversalFlag = true;
            break;
          case TraversalVisitorCommandName.REWRITE_VERTEX_DATA:
            // Vertex.setData(
            //   vertex,
            //   (
            //     command.commandArguments as TraversalVisitorCommandArguments<TTP>[TraversalVisitorCommandName.REWRITE_VERTEX_DATA]
            //   ).newData,
            // );
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

  function pushHints(parentVertexRef: ThisVertexRef): Array<ThisVertexContext> {
    const childrenHints = parentVertexRef.get().getChildrenHints();
    const newEntries: ThisVertexContext[] = [];
    for (let i = 0; i < childrenHints.length; i++) {
      const hintIndex =
        effectiveConfig.childrenOrder === ChildrenOrder.REVERSED
          ? i
          : childrenHints.length - i - 1;
      const hint = childrenHints[hintIndex];
      newEntries.push({
        vertexHint: hint,
        ___parentVertexContent: parentVertexRef.get().getContent(),
        parentVertexRef,
        parentVertex: parentVertexRef.get(),
        vertexHintOriginalOrderIndex: hintIndex,
        vertexHintTraversalOrderIndex: childrenHints.length - i - 1,
      });
    }
    vertexStack.push(...newEntries);
    if (visitors?.postOrderVisitor) {
      postOrderNotVisitedChildrenCountMap.set(
        parentVertexRef.get().getContent(),
        newEntries.length,
      );
    }
    if (visitors?.inOrderVisitor) {
      inOrderNotVisitedChildrenCountMap.set(
        parentVertexRef.get().getContent(),
        newEntries.length,
      );
    }
    return newEntries;
  }

  return {
    ___resolvedTreeMap,
    resolvedTree,
    vertexContextMap,
    ___rootVertex: rootVertexRef.get().getContent(),
    rootVertex: rootVertexRef.get(),
  };
}
