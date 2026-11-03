import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { DepthFirstTreeTraversalBuilder } from './DepthFirstTraversal';
import type { DepthFirstTreeTraversalBuilderOptions } from './lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTreeRunner } from './lib/DepthFirstTraversalRunner';

export function runTreeDepthFirstUntilSuspendedOrTerminal<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(
  options: DepthFirstTreeTraversalBuilderOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): DepthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new DepthFirstTreeTraversalBuilder<
    InputVertexTypes,
    RewrittenVertexTypes
  >(options);
  return traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
