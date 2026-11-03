import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { AsyncBreadthFirstTreeTraversalBuilder } from './AsyncBreadthFirstTraversal';
import type { AsyncBreadthFirstTreeTraversalBuilderOptions } from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { AsyncBreadthFirstTreeRunner } from './lib/AsyncBreadthFirstTraversalRunner';

export function runTreeBreadthFirstUntilSuspendedOrTerminalAsync<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(
  options: AsyncBreadthFirstTreeTraversalBuilderOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >,
): Promise<
  AsyncBreadthFirstTreeRunner<InputVertexTypes, RewrittenVertexTypes>
> {
  if (arguments.length !== 1)
    throw new TypeError('Traversal helpers require a single options object');
  const traversal = new AsyncBreadthFirstTreeTraversalBuilder<
    InputVertexTypes,
    RewrittenVertexTypes
  >(options);
  return traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
