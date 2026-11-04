import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as c from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
import * as walk from 'configurable-tree-traversal/traversals/graph-walk';
const require = createRequire(import.meta.url),
  cjs = require('configurable-tree-traversal');
assert.equal(c.bindDagExternalWorkSession, cjs.bindDagExternalWorkSession);
assert.equal(c.mapDagFragmentIds, dag.mapDagFragmentIds);
assert.equal(c.GraphWalkBuilder, walk.GraphWalkBuilder);
assert.equal(c.createDagWorkSession, undefined);
assert.equal(c.instantiateDagFragment, undefined);
const hint = { id: 1 },
  data = { value: 1 },
  input = [hint];
const vertex = new c.Vertex({ $vertexData: data, $childDiscoveryHints: input });
vertex
  .createEditableShallowCloneWithContentOverrides()
  .getMutableChildDiscoveryHints()
  .push({ id: 2 });
assert.deepEqual(vertex.getDetachedChildDiscoveryHints(), [hint]);
assert.notEqual(vertex.getDetachedChildDiscoveryHints(), input);
assert.equal(vertex.getDetachedChildDiscoveryHints()[0], hint);
assert.equal(vertex.getVertexData(), data);
assert.deepEqual(c.rewriteObject(null).getFinalOutputResult(), {
  kind: 'present',
  value: null,
});
assert.deepEqual(c.rewriteObject(undefined).getFinalOutputResult(), {
  kind: 'present',
  value: undefined,
});
assert.deepEqual(
  c
    .rewriteObject(1, {
      rewritePropertyAfterChildTraversal: () => ({
        kind: 'deletePropertySubtree',
      }),
    })
    .getFinalOutputResult(),
  { kind: 'absent' },
);
const source = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution',
  enumerateRootTargets: () => [{ vertexId: 0 }],
  resolveVertexDataById: (id) => ({ kind: 'found', vertexData: id }),
  enumerateOutgoingLinks: (v) =>
    v.vertexId === 0
      ? [{ targetToResolveOnAdmission: { vertexId: 1 }, edgeData: 'edge' }]
      : [],
};
const builder = new c.GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  limits: { maxAdmittedRootOrLinkTargetOccurrences: 1 },
});
assert.equal(
  [
    ...builder
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ].length,
  1,
);
assert.throws(
  () => builder.patchOptionsForFutureRunners({ limits: undefined }),
  TypeError,
);
builder.patchOptionsForFutureRunners({
  replaceLimits: { maxRouteHopDepth: 1 },
});
const events = [
  ...builder
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['vertexOccurrence', 'admittedEdgeOccurrence'],
    }),
];
assert.equal(
  events.filter((e) => e.eventKind === 'vertexOccurrence').length,
  2,
);
assert.deepEqual(
  events.find((e) => e.eventKind === 'admittedEdgeOccurrence').fromVertex,
  {
    vertexId: 0,
    vertexData: 0,
  },
);
const definition = c.copyAndNormalizeDagDefinition({
  vertexDeclarations: [
    {
      vertexId: 'a',
      data: 1,
      childDiscoverySlots: [
        { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
      ],
      workWaitsForWorkOf: [undefined],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [undefined],
  entry: { kind: 'root', vertexId: 'a' },
});
const prepared = c.validateAndPrepareDagDefinition(definition);
assert.equal(prepared.kind, 'valid');
assert.deepEqual(
  prepared.validatedTopology.liveVertexSummaries[0]
    .liveStructuralChildVertexIds,
  [],
);
assert.equal(
  prepared.validatedTopology.definition.vertexDeclarations[0]
    .childDiscoverySlots.length,
  1,
);
const runner =
    prepared.validatedTopology.createIndependentRunnerFromValidatedTopology({
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }),
  session = c.bindDagExternalWorkSession(runner);
const boundary = session.runUntilWorkBoundary();
assert.equal(boundary.kind, 'awaitingSettlement');
assert.ok(
  Array.isArray(session.captureExecutionSnapshot().vertexPhaseVisitorChains),
);
assert.equal(
  session
    .captureMilestoneSnapshot()
    .explainMilestone({ vertexId: undefined, milestone: 'workCompletion' })
    .kind,
  'omitted',
);
assert.equal(
  session
    .captureMilestoneSnapshot()
    .explainMilestone({ vertexId: 'missing', milestone: 'workCompletion' })
    .kind,
  'unresolved',
);
const graph = runner.getLiveResolvedGraphView(),
  root = graph.getVertexHandleByIdOrNull('a');
assert.equal(graph.requireVertexId(root), 'a');
assert.deepEqual(graph.requireAllStructuralAncestorPathsTo(root), [[root]]);
const foreign = new c.MutableValueReference(
  new c.Vertex({ $vertexData: 0, $childDiscoveryHints: [] }),
);
assert.equal(graph.getStructuralChildHandlesInSlotOrderOrNull(foreign), null);
assert.throws(() => graph.requireVertexId(foreign));
session.acceptCompletedWork(boundary.workSettlementTickets[0]);
assert.equal(session.runUntilWorkBoundary().kind, 'finished');
const fragment = c.validateAndCreateDagFragment(definition, { start: 'a' }),
  mapped = c.mapDagFragmentIds(fragment, { mapId: (id) => ({ id }) });
assert.deepEqual(mapped.vertexIdsByPortName.start, { id: 'a' });
const error = new c.DagTraversalStallError({
  blockedVertexPrerequisiteReports: [
    { vertexId: 'a', unmetPrerequisiteVertexIds: ['b'] },
  ],
  unresolvedPrerequisiteVertexIds: ['b'],
  milestoneCycleVertexIdComponents: [],
  nonCyclePrerequisiteBlockedVertexIds: ['a'],
  incompleteVertexIdsWithoutUnmetPrerequisites: [],
});
assert.deepEqual(error.diagnostics.blockedVertexPrerequisiteReports, [
  { vertexId: 'a', unmetPrerequisiteVertexIds: ['b'] },
]);
const cycle = new c.DagStructuralDiscoveryCycleError(['a', 'a']);
assert.deepEqual(cycle.cycleWitnessVertexIds, ['a', 'a']);
