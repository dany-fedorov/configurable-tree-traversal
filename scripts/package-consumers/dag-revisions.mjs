import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
const entries = [esm, cjs, dag, cjsDag, esm.dagTraversal, cjs.dagTraversal];
for (const entry of entries) {
  assert.equal(
    entry.applyDagDefinitionRevisionBatch,
    esm.applyDagDefinitionRevisionBatch,
  );
  assert.equal(
    entry.diffDagDefinitionDeclarationsShallowly,
    esm.diffDagDefinitionDeclarationsShallowly,
  );
  const result = entry.validateAndPrepareDagDefinition(
    entry.copyAndNormalizeDagDefinition({
      vertexDeclarations: [
        {
          vertexId: 'task',
          data: 1,
          childDiscoverySlots: [],
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        },
      ],
      omittedVertexIds: [],
      entry: { kind: 'root', vertexId: 'task' },
    }),
  );
  assert.equal(result.kind, 'valid');
  const old = result.validatedTopology.createExternalWorkSession();
  const oldTicket = old.runUntilWorkBoundary().workSettlementTickets[0];
  const revision = entry.applyDagDefinitionRevisionBatch(
    result.validatedTopology,
    [
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: {
          ...result.validatedTopology.definition.vertexDeclarations[0],
          data: 2,
        },
      },
    ],
  );
  assert.equal(revision.kind, 'valid');
  assert.deepEqual(
    revision.declarationDiff,
    entry.diffDagDefinitionDeclarationsShallowly(
      result.validatedTopology.definition,
      revision.validatedTopology.definition,
    ),
  );
  assert.deepEqual(revision.declarationDiff.changedVertexDeclarations, [
    { vertexId: 'task', changedDeclarationFields: ['data'] },
  ]);
  for (const fresh of [
    revision.validatedTopology.createExternalWorkSession(),
    await revision.validatedTopology.createAsyncExternalWorkSession(),
  ]) {
    assert.deepEqual(
      fresh.captureProgressSnapshot().workCompletionCommittedVertexIds,
      [],
    );
    const ticket = (await fresh.runUntilWorkBoundary())
      .workSettlementTickets[0];
    assert.throws(() => fresh.acceptCompletedWork(oldTicket), TypeError);
    assert.equal(fresh.acceptCompletedWork(ticket).kind, 'accepted');
    assert.equal((await fresh.runUntilWorkBoundary()).kind, 'finished');
  }
  assert.equal(old.acceptCompletedWork(oldTicket).kind, 'accepted');
  assert.equal(old.runUntilWorkBoundary().kind, 'finished');
  assert.equal(
    entry.applyDagDefinitionRevisionBatch(result.validatedTopology, [
      { kind: 'removeVertexDeclaration', vertexId: 'task' },
    ]).kind,
    'invalid',
  );
}
console.log('Packed DAG revision consumers passed');
