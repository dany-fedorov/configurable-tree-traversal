import { GraphWalk } from './GraphWalk';
import type { GraphWalkOptions } from './GraphWalkOptions';
import type { GraphWalkRunner } from './GraphWalkRunner';

export function walkGraph<Data, Edge, ID>(
  options: GraphWalkOptions<Data, Edge, ID>,
): GraphWalkRunner<Data, Edge, ID> {
  return new GraphWalk(options).makeRunner().run();
}
