import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncBreadthFirstTreeTraversal } from './AsyncBreadthFirstTraversal';
import type { AsyncBreadthFirstTreeOptions } from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { AsyncBreadthFirstTreeRunner } from './lib/AsyncBreadthFirstTraversalRunner';

export function traverseTreeBreadthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: AsyncBreadthFirstTreeOptions<TTP, RW_TTP>,
): Promise<AsyncBreadthFirstTreeRunner<TTP, RW_TTP>> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new AsyncBreadthFirstTreeTraversal<TTP, RW_TTP>(options);
  return traversal.createRunner().run();
}
