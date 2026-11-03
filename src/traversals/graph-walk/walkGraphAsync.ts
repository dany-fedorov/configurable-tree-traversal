import { AsyncGraphWalkBuilder } from './AsyncGraphWalk';
import type { AsyncGraphWalkBuilderOptions } from './GraphWalkOptions';
import type { AsyncGraphWalkRunner } from './AsyncGraphWalkRunner';

export async function createAndRunGraphWalkUntilSuspendedOrTerminalAsync<
  VertexData,
  EdgeData,
  VertexId,
>(
  options: AsyncGraphWalkBuilderOptions<VertexData, EdgeData, VertexId>,
): Promise<AsyncGraphWalkRunner<VertexData, EdgeData, VertexId>> {
  return new AsyncGraphWalkBuilder(options)
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}
