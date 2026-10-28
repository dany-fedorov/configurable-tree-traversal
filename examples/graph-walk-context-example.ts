import {
  GraphWalk,
  GraphWalkPhase,
  type GraphWalkSource,
  type GraphWalkTarget,
} from '../src';
import assert from 'node:assert/strict';

type Context =
  | { kind: 'document'; title: string }
  | { kind: 'symbol'; name: string };
type Relation = { kind: 'imports' | 'references' | 'cites' | 'definedIn' };
const data = new Map<string, Context>([
  ['A', { kind: 'document', title: 'A' }],
  ['B', { kind: 'symbol', name: 'B' }],
  ['C', { kind: 'document', title: 'C' }],
  ['D', { kind: 'document', title: 'D' }],
  ['E', { kind: 'symbol', name: 'E' }],
]);
const links = new Map<string, readonly [string, Relation['kind']][]>([
  [
    'A',
    [
      ['B', 'imports'],
      ['B', 'references'],
      ['C', 'cites'],
    ],
  ],
  ['B', [['D', 'definedIn']]],
  ['C', [['D', 'cites']]],
  ['D', [['A', 'cites']]],
  ['E', []], // An isolated root still contributes a vertex observation.
]);
const hydrated = (vertexId: string): GraphWalkTarget<Context, string> => ({
  vertexId,
  resolution: { kind: 'found', data: data.get(vertexId)! },
});
const resolved: string[] = [];
const source: GraphWalkSource<Context, Relation, string> = {
  hydration: 'resolver' as const,
  roots: () => [hydrated('A'), hydrated('E')],
  resolveVertex(vertexId) {
    resolved.push(vertexId);
    if (!data.has(vertexId)) throw new TypeError('Unknown context ID');
    return { kind: 'found', data: data.get(vertexId)! };
  },
  outgoing(vertex) {
    return links.get(vertex.vertexId)!.map(([to, kind]) => ({
      target: to === 'B' ? hydrated(to) : { vertexId: to },
      data: { kind },
    }));
  },
};
const vertices: string[] = [];
const relationships: string[] = [];
const runner = new GraphWalk({ source })
  .addVisitorFor(GraphWalkPhase.VERTEX, ({ vertex }) => {
    vertices.push(vertex.vertexId);
  })
  .addVisitorFor(GraphWalkPhase.EDGE, ({ edge, target }) => {
    assert.equal(target.kind, 'found');
    relationships.push(
      `${edge.from}:${edge.outgoingIndex}:${edge.data.kind}:${edge.to}`,
    );
  })
  .createRunner();
const observations = [
  ...runner.iterateEvents({
    emitEvents: [GraphWalkPhase.VERTEX, GraphWalkPhase.EDGE],
  }),
];
assert.deepEqual(vertices, ['A', 'E', 'B', 'C', 'D']);
assert.deepEqual(relationships, [
  'A:0:imports:B',
  'A:1:references:B',
  'A:2:cites:C',
  'B:0:definedIn:D',
  'C:0:cites:D',
  'D:0:cites:A',
]);
assert.deepEqual(resolved, ['C', 'D']);
assert.equal(observations.length, 11);
assert.deepEqual(runner.summary().outcome, { kind: 'exhausted' });
console.log(
  'Context:',
  vertices.length,
  'vertex callbacks;',
  relationships.length,
  'relationship callbacks;',
  runner.summary().outcome,
);
