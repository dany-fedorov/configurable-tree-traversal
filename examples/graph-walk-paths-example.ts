import {
  GraphWalkBuilder,
  GraphWalkObservationKind,
  materializeGraphWalkSourceFromVertexRecords,
} from '../src';
import assert from 'node:assert/strict';

const source = materializeGraphWalkSourceFromVertexRecords(
  [
    { id: 'claim', links: ['evidence', 'evidence'] }, // Distinct provenance links.
    { id: 'evidence', links: ['claim'] },
  ],
  {
    getVertexId: (item) => item.id,
    enumerateOutgoingLinks: (item) =>
      item.links.map((to) => ({ toVertexId: to, edgeData: { kind: 'cites' } })),
    rootVertexIds: ['claim'],
  },
);
for (const revisit of [
  'allVertexSimpleRoutePrefixes',
  'allRoutePrefixesAllowingRepeatedVertices',
] as const) {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    routeEnumerationPolicy: revisit,
    limits: { maxRouteHopDepth: 2 },
  }).createIndependentRunnerFromCurrentOptions();
  const paths = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [GraphWalkObservationKind.ROUTE_PREFIX],
    }),
  ];
  // Paths include the zero-edge root and every admitted prefix, not only leaves.
  assert.equal(paths[0]!.routeHopLength, 0);
  assert.equal(
    paths[1]!.edgesInRootToTargetOrder[0]!
      .sourceOutgoingLinkIndexBeforeFiltering,
    0,
  );
  assert.equal(
    paths[2]!.edgesInRootToTargetOrder[0]!
      .sourceOutgoingLinkIndexBeforeFiltering,
    1,
  );
  assert.equal(
    paths.length,
    revisit === 'allVertexSimpleRoutePrefixes' ? 3 : 5,
  );
  const outcome = runner.captureProgressSnapshot().terminalOutcome;
  assert.deepEqual(
    outcome,
    revisit === 'allVertexSimpleRoutePrefixes'
      ? { kind: 'sourceRoutesExhausted' }
      : { kind: 'traversalLimitsReached', reachedLimits: ['maxRouteHopDepth'] },
  );
  console.log(
    revisit,
    paths.map((path) =>
      path.verticesInRootToTargetOrder.map((vertex) => vertex.vertexId),
    ),
    outcome,
  );
}
// A step budget also terminates repeated walks; truncation is part of the result.
const capped = new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
  limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 4 },
})
  .createIndependentRunnerFromCurrentOptions()
  .runUntilSuspendedOrTerminal();
assert.deepEqual(capped.captureProgressSnapshot().terminalOutcome, {
  kind: 'traversalLimitsReached',
  reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
});
console.log('Step budget:', capped.captureProgressSnapshot());
