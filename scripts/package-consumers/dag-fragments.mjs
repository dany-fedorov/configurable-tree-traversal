import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
for (const name of [
  'DagFragmentValidationError',
  'copyAndNormalizeDagDefinition',
  'validateAndPrepareDagDefinition',
  'validateAndCreateDagFragment',
  'mapDagFragmentIds',
  'composeAndValidateDagFragments',
]) {
  for (const entry of [cjs, dag, cjsDag, esm.dagTraversal])
    assert.equal(esm[name], entry[name]);
}
const definition = cjs.copyAndNormalizeDagDefinition({
  vertexDeclarations: [
    {
      vertexId: 'start',
      data: { task: 'build' },
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
    {
      vertexId: 'finish',
      data: { task: 'review' },
      childDiscoverySlots: [],
      workWaitsForWorkOf: ['start'],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [],
  entry: {
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'vertex', vertexId: 'start' },
      { kind: 'vertex', vertexId: 'finish' },
    ],
  },
});
const fragment = dag.validateAndCreateDagFragment(definition, {
  start: 'start',
  finish: 'finish',
});
const first = cjs.mapDagFragmentIds(fragment, {
  mapId: (local) => ({ run: 'first', local }),
});
const second = esm.mapDagFragmentIds(fragment, {
  mapId: (local) => ({ run: 'second', local }),
});
const result = cjsDag.composeAndValidateDagFragments([first, second], {
  additionalWorkPrerequisites: [
    {
      dependentWorkVertexId: second.vertexIdsByPortName.start,
      prerequisite: {
        vertexId: first.vertexIdsByPortName.finish,
        milestone: 'subgraphCompletion',
      },
    },
  ],
});
assert.equal(result.kind, 'valid');
assert.equal(
  result.validatedTopology.definition.vertexDeclarations[2]
    .workWaitsForSubgraphCompletionOf[0],
  first.vertexIdsByPortName.finish,
);
for (const runner of [
  result.validatedTopology.createIndependentRunnerFromValidatedTopology(),
  await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology(),
]) {
  const seen = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
    seen.push([event.vertexId, event.eventKind]);
  assert.equal(seen[0][0], first.vertexIdsByPortName.start);
  assert.equal(seen[3][0], first.vertexIdsByPortName.finish);
  assert.equal(seen[3][1], 'subgraphCompletionCommitted');
  assert.equal(seen[4][0], second.vertexIdsByPortName.start);
  assert.equal(seen[7][0], second.vertexIdsByPortName.finish);
  assert.equal(
    runner.captureProgressSnapshot().counts.subgraphCompletionCommittedVertices,
    4,
  );
}
assert.throws(
  () => esm.composeAndValidateDagFragments([first, first]),
  TypeError,
);
assert.equal(
  dag.composeAndValidateDagFragments([first, second], {
    additionalWorkPrerequisites: [
      {
        dependentWorkVertexId: first.vertexIdsByPortName.start,
        prerequisite: {
          vertexId: second.vertexIdsByPortName.finish,
          milestone: 'subgraphCompletion',
        },
      },
      {
        dependentWorkVertexId: second.vertexIdsByPortName.start,
        prerequisite: {
          vertexId: first.vertexIdsByPortName.finish,
          milestone: 'subgraphCompletion',
        },
      },
    ],
  }).kind,
  'invalid',
);

const objectId = { task: 'root' };
assert.throws(
  () =>
    cjsDag.validateAndCreateDagFragment(
      {
        vertexDeclarations: [
          {
            vertexId: objectId,
            data: null,
            childDiscoverySlots: [],
            workWaitsForWorkOf: [undefined],
            workWaitsForSubgraphCompletionOf: [],
          },
        ],
        omittedVertexIds: [],
        entry: { kind: 'root', vertexId: objectId },
      },
      {},
    ),
  (error) => {
    assert(error instanceof esm.DagFragmentValidationError);
    assert(error instanceof TypeError);
    assert.equal(error.issues[0].kind, 'milestoneDependencyStall');
    const edge = error.issues[0].diagnostics.originalMilestoneConstraints.find(
      (edge) => edge.reason === 'workDependency',
    );
    assert.equal(edge.waitingMilestone.vertexId, objectId);
    assert.equal(edge.prerequisiteMilestone.vertexId, undefined);
    return true;
  },
);
console.log('Packed DAG fragment consumers passed');
