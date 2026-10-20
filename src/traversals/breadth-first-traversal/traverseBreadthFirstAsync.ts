import type { AsyncTraversableTree } from '@core/AsyncTraversableTree';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { AsyncBreadthFirstTraversal } from './AsyncBreadthFirstTraversal';
import type { AsyncBreadthFirstTraversalInstanceConfigInput } from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import { BreadthFirstTraversalOrder } from './lib/BreadthFirstTraversalOrder';
import type { AsyncBreadthFirstTraversalRunner } from './lib/AsyncBreadthFirstTraversalRunner';

export function traverseBreadthFirstAsync<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: AsyncTraversableTree<TTP, RW_TTP>,
  visitor: AsyncTraversalVisitor<
    BreadthFirstTraversalOrder,
    TTP,
    RW_TTP
  > | null,
  config?: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTraversalRunner<TTP, RW_TTP>> {
  const traversal = new AsyncBreadthFirstTraversal<TTP, RW_TTP>({
    traversableTree,
    ...(config ?? {}),
  });
  if (visitor !== null) {
    traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, visitor);
  }
  return traversal.makeRunner().run();
}
