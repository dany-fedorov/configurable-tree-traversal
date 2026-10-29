import type { VertexTypes } from '@core/TreeTypeParameters';
import { DepthFirstTreeTraversal } from './DepthFirstTraversal';
import type { DepthFirstTreeOptions } from './lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTreeRunner } from './lib/DepthFirstTraversalRunner';

export function traverseTreeDepthFirst<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: DepthFirstTreeOptions<TTP, RW_TTP>,
): DepthFirstTreeRunner<TTP, RW_TTP> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new DepthFirstTreeTraversal<TTP, RW_TTP>(options);
  return traversal.createRunner().run();
}
