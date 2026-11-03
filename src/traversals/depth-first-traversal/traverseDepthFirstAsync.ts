import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { AsyncDepthFirstTreeTraversalBuilder } from './AsyncDepthFirstTraversal';
import type { AsyncDepthFirstTreeTraversalBuilderOptions } from './lib/AsyncDepthFirstTraversalInstanceConfig';
import type { AsyncDepthFirstTreeRunner } from './lib/AsyncDepthFirstTraversalRunner';

export function runTreeDepthFirstUntilSuspendedOrTerminalAsync<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(
  options: AsyncDepthFirstTreeTraversalBuilderOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): Promise<AsyncDepthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new AsyncDepthFirstTreeTraversalBuilder<
    InputVertexTypes,
    RewrittenVertexTypes
  >(options);
  return traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
