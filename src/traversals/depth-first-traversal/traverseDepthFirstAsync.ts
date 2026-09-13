import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { AsyncDepthFirstTraversal } from './AsyncDepthFirstTraversal';
import type { AsyncDepthFirstTraversalInstanceConfigInput } from './lib/AsyncDepthFirstTraversalInstanceConfig';
import { DepthFirstTraversalOrder } from './lib/DepthFirstTraversalOrder';
import type { AsyncDepthFirstTraversalRunner } from './lib/AsyncDepthFirstTraversalRunner';

export type AsyncDepthFirstTraversalVisitorsSimple<
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> = {
  preOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstTraversalOrder,
    TTP,
    RW_TTP
  >;
  postOrderVisitor?: AsyncTraversalVisitor<
    DepthFirstTraversalOrder,
    TTP,
    RW_TTP
  >;
  inOrderVisitor?: AsyncTraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>;
};

export function traverseDepthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: AsyncTraversableTree<TTP, RW_TTP>,
  visitors: AsyncDepthFirstTraversalVisitorsSimple<TTP, RW_TTP> | null,
  config?: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTraversalRunner<TTP, RW_TTP>> {
  const traversal = new AsyncDepthFirstTraversal<TTP, RW_TTP>({
    traversableTree,
    ...(config ?? {}),
  });
  if (visitors?.preOrderVisitor) {
    traversal.addVisitorFor(
      DepthFirstTraversalOrder.PRE_ORDER,
      visitors.preOrderVisitor,
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
      visitors.postOrderVisitor,
    );
  }
  return traversal.makeRunner().run();
}
