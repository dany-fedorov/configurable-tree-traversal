import {
  walkGraph,
  walkGraphAsync,
  graphWalk,
  GraphWalkPhase as Phase,
  type GraphWalkSource,
  type GraphWalkRunner,
  type AsyncGraphWalkRunner,
} from '../src';
import {
  walkGraph as familyWalk,
  walkGraphAsync as familyWalkAsync,
} from '../src/traversals/graph-walk';

const id = Symbol('id');
type Data = { title: string };
type Edge = { kind: 'cites' };
const source: GraphWalkSource<Data, Edge, typeof id> = {
  hydration: 'inlineOrCached' as const,
  roots: () => [
    {
      kind: 'inline' as const,
      vertexId: id,
      resolution: { kind: 'found', data: { title: 'root' } },
    },
  ],
  outgoing: (vertex) => [
    {
      target: { kind: 'cached' as const, vertexId: vertex.vertexId },
      data: { kind: 'cites' },
    },
  ],
};
const runner = walkGraph({
  source,
  visitors: {
    [Phase.EDGE]: (event) => {
      const relation: Edge = event.edge.data;
      const target: typeof id = event.edge.to;
      const data: Data = event.source.data;
      void [relation, target, data];
    },
  },
});
const typed: GraphWalkRunner<Data, Edge, typeof id> = runner;
const promised: Promise<AsyncGraphWalkRunner<Data, Edge, typeof id>> =
  walkGraphAsync({
    source,
    visitors: {
      [Phase.VERTEX]: async (event) => {
        const data: Data = event.vertex.data;
        const vertexId: typeof id = event.vertex.vertexId;
        void [data, vertexId];
      },
    },
  });
const family: typeof walkGraph = familyWalk;
const asyncFamily: typeof walkGraphAsync = familyWalkAsync;
const namespace: typeof walkGraph = graphWalk.walkGraph;
// @ts-expect-error Only canonical options are accepted.
walkGraph(source, {});
// @ts-expect-error Async helper also accepts only canonical options.
walkGraphAsync(source, null);
// @ts-expect-error Helper inference retains required route bounds.
walkGraph({ source, revisit: 'walks' });
// @ts-expect-error Sync helper does not widen callback return contracts.
walkGraph({ source, visitors: { [Phase.EDGE]: async () => undefined } });
void [typed, promised, family, asyncFamily, namespace];
