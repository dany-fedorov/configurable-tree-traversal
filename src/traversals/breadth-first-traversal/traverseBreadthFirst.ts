import type { VertexTypes } from '@core/TreeTypeParameters';
import { BreadthFirstTreeTraversal } from './BreadthFirstTraversal';
import type { BreadthFirstTreeOptions } from './lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTreeRunner } from './lib/BreadthFirstTraversalRunner';

export function traverseTreeBreadthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: BreadthFirstTreeOptions<TTP, RW_TTP>,
): BreadthFirstTreeRunner<TTP, RW_TTP> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new BreadthFirstTreeTraversal<TTP, RW_TTP>(options);
  return traversal.createRunner().run();
}
