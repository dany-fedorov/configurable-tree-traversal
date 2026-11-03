import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { BreadthFirstTreeTraversalBuilder } from './BreadthFirstTraversal';
import type { BreadthFirstTreeTraversalBuilderOptions } from './lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTreeRunner } from './lib/BreadthFirstTraversalRunner';

export function runTreeBreadthFirstUntilSuspendedOrTerminal<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(
  options: BreadthFirstTreeTraversalBuilderOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): BreadthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new BreadthFirstTreeTraversalBuilder<
    InputVertexTypes,
    RewrittenVertexTypes
  >(options);
  return traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
