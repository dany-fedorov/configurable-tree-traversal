import type { TraversableTree } from '@core/TraversableTree';
import type { TraversalVisitor } from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { BreadthFirstTraversal } from './BreadthFirstTraversal';
import type { BreadthFirstTraversalInstanceConfigInput } from './lib/BreadthFirstTraversalInstanceConfig';
import { BreadthFirstTraversalOrder } from './lib/BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalRunner } from './lib/BreadthFirstTraversalRunner';

export function traverseBreadthFirst<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
>(
  traversableTree: TraversableTree<TTP, RW_TTP>,
  visitor: TraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP> | null,
  config?: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
): BreadthFirstTraversalRunner<TTP, RW_TTP> {
  const traversal = new BreadthFirstTraversal<TTP, RW_TTP>({
    traversableTree,
    ...(config ?? {}),
  });
  if (visitor !== null) {
    traversal.addVisitorFor(BreadthFirstTraversalOrder.LEVEL_ORDER, visitor);
  }
  return traversal.makeRunner().run();
}
