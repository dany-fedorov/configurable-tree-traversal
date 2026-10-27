import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncDepthFirstTreeTraversal } from './AsyncDepthFirstTraversal';
import type { AsyncDepthFirstTreeOptions } from './lib/AsyncDepthFirstTraversalInstanceConfig';
import type { AsyncDepthFirstTreeRunner } from './lib/AsyncDepthFirstTraversalRunner';

export function traverseTreeDepthFirstAsync<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
>(
  options: AsyncDepthFirstTreeOptions<TTP, RW_TTP>,
): Promise<AsyncDepthFirstTreeRunner<TTP, RW_TTP>> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new AsyncDepthFirstTreeTraversal<TTP, RW_TTP>(options);
  return traversal.createRunner().run();
}
