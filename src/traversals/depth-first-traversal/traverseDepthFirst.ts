import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import { DepthFirstTreeTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TreeSource } from '@core/TraversableTree';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { DepthFirstTreeRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import type { DepthFirstTraversalInstanceConfigInput } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';

export type DepthFirstTraversalVisitorsSimple<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  preOrderVisitor?: TraversalVisitor<
    DepthFirstTraversalOrder.PRE_ORDER,
    TTP,
    RW_TTP
  >;
  postOrderVisitor?: TraversalVisitor<
    DepthFirstTraversalOrder.POST_ORDER,
    TTP,
    RW_TTP
  >;
  inOrderVisitor?: TraversalVisitor<
    DepthFirstTraversalOrder.IN_ORDER,
    TTP,
    RW_TTP
  >;
};

/** Options for a single-call DepthFirst traversal with phase-keyed callbacks. */
export type DepthFirstTraversalHelperOptions<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = Omit<
  DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  'visitors' | 'traversableTree'
> & { traversableTree: TreeSource<TTP, RW_TTP> } & {
  visitors?: {
    [K in DepthFirstTraversalOrder]?: VisitorPhaseInput<
      TraversalVisitor<K, TTP, RW_TTP>
    >;
  };
};

export function traverseTreeDepthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: DepthFirstTraversalHelperOptions<TTP, RW_TTP>,
): DepthFirstTreeRunner<TTP, RW_TTP>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseTreeDepthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  traversableTree: TreeSource<TTP, RW_TTP>,
  visitors: DepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTreeRunner<TTP, RW_TTP>;
export function traverseTreeDepthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  sourceOrOptions:
    | TreeSource<TTP, RW_TTP>
    | DepthFirstTraversalHelperOptions<TTP, RW_TTP>,
  visitors?: DepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTreeRunner<TTP, RW_TTP> {
  let traversalConfig: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>;
  const preOrderVisitor = visitors?.preOrderVisitor;
  const inOrderVisitor = visitors?.inOrderVisitor;
  const postOrderVisitor = visitors?.postOrderVisitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as DepthFirstTraversalHelperOptions<
      TTP,
      RW_TTP
    >;
  } else {
    traversalConfig = {
      traversableTree: sourceOrOptions as TreeSource<TTP, RW_TTP>,
      ...config,
    };
  }
  const traversal = new DepthFirstTreeTraversal<TTP, RW_TTP>(traversalConfig);
  if (preOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.PRE_ORDER,
      preOrderVisitor,
    );
  }
  if (inOrderVisitor) {
    traversal.addVisitorFor(DepthFirstTraversalOrder.IN_ORDER, inOrderVisitor);
  }
  if (postOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.POST_ORDER,
      postOrderVisitor,
    );
  }
  return traversal.createRunner().run();
}
