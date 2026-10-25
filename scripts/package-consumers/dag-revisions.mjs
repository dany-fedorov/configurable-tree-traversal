import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
const entries = [esm, cjs, dag, cjsDag, esm.dagTraversal, cjs.dagTraversal];
for (const entry of entries) {
  assert.equal(entry.reviseDag, esm.reviseDag);
  assert.equal(entry.diffDagDefinitions, esm.diffDagDefinitions);
  const result = entry.prepareDagDefinition(
    entry.defineDag({
      vertices: [
        {
          vertexId: 'task',
          data: 1,
          slots: [],
          dependsOn: [],
          dependsOnComplete: [],
        },
      ],
      omittedIds: [],
      entry: { kind: 'root', vertexId: 'task' },
    }),
  );
  assert.equal(result.kind, 'valid');
  const old = result.dag.createSession();
  const oldTicket = old.advance().frontier[0];
  const revision = entry.reviseDag(result.dag, [
    {
      kind: 'replaceVertex',
      vertex: { ...result.dag.definition.vertices[0], data: 2 },
    },
  ]);
  assert.equal(revision.kind, 'valid');
  assert.deepEqual(
    revision.changes,
    entry.diffDagDefinitions(result.dag.definition, revision.dag.definition),
  );
  assert.deepEqual(revision.changes.changedVertices, [
    { vertexId: 'task', aspects: ['data'] },
  ]);
  for (const fresh of [
    revision.dag.createSession(),
    await revision.dag.createAsyncSession(),
  ]) {
    assert.deepEqual(fresh.summary().completedWorkIds, []);
    const ticket = (await fresh.advance()).frontier[0];
    assert.throws(() => fresh.complete(oldTicket), TypeError);
    assert.equal(fresh.complete(ticket).kind, 'accepted');
    assert.equal((await fresh.advance()).kind, 'finished');
  }
  assert.equal(old.complete(oldTicket).kind, 'accepted');
  assert.equal(old.advance().kind, 'finished');
  assert.equal(
    entry.reviseDag(result.dag, [{ kind: 'removeVertex', vertexId: 'task' }])
      .kind,
    'invalid',
  );
}
console.log('Packed DAG revision consumers passed');
