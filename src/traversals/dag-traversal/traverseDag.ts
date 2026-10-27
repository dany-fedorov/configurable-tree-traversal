import type { VertexTypes } from '@core/TreeTypeParameters';
import { DagTraversal } from './DagTraversal';
import type { DagOptions } from './lib/DagTraversalInstanceConfig';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';

export function traverseDag<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(options: DagOptions<T, R, ID>): DagTraversalRunner<T, R, ID> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new DagTraversal<T, R, ID>(options);
  return traversal.createRunner().run();
}
