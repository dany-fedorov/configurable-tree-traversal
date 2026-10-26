import { AsyncGraphWalk } from './AsyncGraphWalk';
import type { AsyncGraphWalkOptions } from './GraphWalkOptions';
import type { AsyncGraphWalkRunner } from './AsyncGraphWalkRunner';

export async function walkGraphAsync<Data, Edge, ID>(
  options: AsyncGraphWalkOptions<Data, Edge, ID>,
): Promise<AsyncGraphWalkRunner<Data, Edge, ID>> {
  return new AsyncGraphWalk(options).makeRunner().run();
}
