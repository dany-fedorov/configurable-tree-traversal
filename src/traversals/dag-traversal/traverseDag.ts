import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { DagTraversalBuilder } from './DagTraversal';
import type { DagTraversalBuilderOptions } from './lib/DagTraversalInstanceConfig';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';

export function traverseDag<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
>(
  options: DagTraversalBuilderOptions<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
): DagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new DagTraversalBuilder<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >(options);
  return traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
