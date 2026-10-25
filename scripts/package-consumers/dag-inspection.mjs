import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
assert.equal(esm.inspectDag, cjs.inspectDag);
assert.equal(esm.inspectDag, dag.inspectDag);
assert.equal(esm.inspectDag, cjsDag.inspectDag);
assert.equal(esm.inspectDag, esm.dagTraversal.inspectDag);
for (const Constructor of [esm.DagTraversal, cjs.AsyncDagTraversal]) {
  const task = { label: 'task' };
  const runner = new Constructor({
    ...esm.graphFrom([{ id: task }], { id: (item) => item.id }),
    workCompletion: 'externalSettlement',
  }).makeRunner();
  await runner.prepare();
  await runner.run();
  const snapshot = cjs.inspectDag(runner);
  const target = { vertexId: task, milestone: 'work' };
  assert.deepEqual(snapshot.explain(target).blockers, [
    { kind: 'unfinishedWork', target, work: 'deferred' },
  ]);
  const ticket = runner.summary().deferredFrontier[0];
  runner.settle(task, { kind: 'workCompleted' }, ticket.generation);
  await runner.run();
  assert.equal(snapshot.explain(target).satisfied, false);
  assert.equal(dag.inspectDag(runner).explain(target).satisfied, true);
  assert.deepEqual(snapshot.dependentsOf(target).milestones, [
    { vertexId: task, milestone: 'completion' },
  ]);
  assert.equal(
    snapshot.prerequisitesOf({ vertexId: task, milestone: 'completion' })
      .edges[0].reason,
    'ownWork',
  );
}
console.log('Packed DAG inspection consumers passed');
