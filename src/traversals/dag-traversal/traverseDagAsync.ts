import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from './AsyncDagTraversal';
import type { AsyncDagTraversalBuilderOptions } from './lib/AsyncDagTraversalInstanceConfig';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';

export function traverseDagAsync<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
>(
  options: AsyncDagTraversalBuilderOptions<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
): Promise<
  AsyncDagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>
> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new AsyncDagTraversalBuilder<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >(options);
  return traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
