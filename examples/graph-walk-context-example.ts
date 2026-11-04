import {
  GraphWalkBuilder,
  GraphWalkObservationKind,
  type GraphWalkDiscoverySource,
  type GraphWalkVertexResolutionTarget,
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
const hydrated = (
  vertexId: string,
): GraphWalkVertexResolutionTarget<Context, string> => ({
  vertexId,
  resolutionIfNotPreviouslyAdmitted: {
    kind: 'found',
    vertexData: data.get(vertexId)!,
  },
});
const resolved: string[] = [];
const source: GraphWalkDiscoverySource<Context, Relation, string> = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
  enumerateRootTargets: () => [hydrated('A'), hydrated('E')],
  resolveVertexDataById(vertexId) {
    resolved.push(vertexId);
    if (!data.has(vertexId)) throw new TypeError('Unknown context ID');
    return { kind: 'found', vertexData: data.get(vertexId)! };
  },
  enumerateOutgoingLinks(vertex) {
    return links.get(vertex.vertexId)!.map(([to, kind]) => ({
      targetToResolveOnAdmission: to === 'B' ? hydrated(to) : { vertexId: to },
      edgeData: { kind },
    }));
  },
};
const vertices: string[] = [];
const relationships: string[] = [];
const runner = new GraphWalkBuilder({ graphWalkDiscoverySource: source })
  .registerVisitorForObservationKind(
    GraphWalkObservationKind.VERTEX_OCCURRENCE,
    ({ vertex }) => {
      vertices.push(vertex.vertexId);
    },
  )
  .registerVisitorForObservationKind(
    GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
    ({ edge, targetResolution: target }) => {
      assert.equal(target.kind, 'found');
      relationships.push(
        `${edge.fromVertexId}:${edge.sourceOutgoingLinkIndexBeforeFiltering}:${edge.edgeData.kind}:${edge.toVertexId}`,
      );
    },
  )
  .createIndependentRunnerFromCurrentOptions();
const observations = [
  ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [
      GraphWalkObservationKind.VERTEX_OCCURRENCE,
      GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
    ],
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
assert.deepEqual(runner.captureProgressSnapshot().terminalOutcome, {
  kind: 'explorationExhausted',
});
console.log(
  'Context:',
  vertices.length,
  'vertex callbacks;',
  relationships.length,
  'relationship callbacks;',
  runner.captureProgressSnapshot().terminalOutcome,
);
