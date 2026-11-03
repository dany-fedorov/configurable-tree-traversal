import { GraphWalkBuilder } from './GraphWalk';
import type { GraphWalkBuilderOptions } from './GraphWalkOptions';
import type { GraphWalkRunner } from './GraphWalkRunner';

export function createAndRunGraphWalkUntilSuspendedOrTerminal<
  VertexData,
  EdgeData,
  VertexId,
>(
  options: GraphWalkBuilderOptions<VertexData, EdgeData, VertexId>,
): GraphWalkRunner<VertexData, EdgeData, VertexId> {
  return new GraphWalkBuilder(options)
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
