import { DepthFirstTraversal } from '@depth-first-traversal/DepthFirstTraversal';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversableTree } from '@core/TraversableTree';
import { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { DepthFirstTraversalRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import type { DepthFirstTraversalInstanceConfigInput } from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';

export type DepthFirstTraversalVisitorsSimple<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  preOrderVisitor?: TraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>;
  postOrderVisitor?: TraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>;
  inOrderVisitor?: TraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>;
};

export function traverseDepthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: TraversableTree<TTP, RW_TTP>,
  visitors: DepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): DepthFirstTraversalRunner<TTP, RW_TTP> {
  const traversal = new DepthFirstTraversal({
    traversableTree,
    ...(config || {}),
  });
  if (visitors?.preOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.PRE_ORDER,
      visitors?.preOrderVisitor,
    );
  }
  if (visitors?.inOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.IN_ORDER,
      visitors.inOrderVisitor,
    );
  }
  if (visitors?.postOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.POST_ORDER,
      visitors?.postOrderVisitor,
    );
  }
  return traversal.makeRunner().run();
}
