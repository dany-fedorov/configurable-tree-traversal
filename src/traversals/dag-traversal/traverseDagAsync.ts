import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncDagTraversal } from './AsyncDagTraversal';
import type { AsyncDagOptions } from './lib/AsyncDagTraversalInstanceConfig';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';

export function traverseDagAsync<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  options: AsyncDagOptions<T, R, ID>,
): Promise<AsyncDagTraversalRunner<T, R, ID>> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new AsyncDagTraversal<T, R, ID>(options);
  return traversal.createRunner().run();
}
