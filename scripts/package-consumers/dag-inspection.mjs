import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
assert.equal(esm.inspectDagMilestones, cjs.inspectDagMilestones);
assert.equal(esm.inspectDagMilestones, dag.inspectDagMilestones);
assert.equal(esm.inspectDagMilestones, cjsDag.inspectDagMilestones);
assert.equal(esm.inspectDagMilestones, esm.dagTraversal.inspectDagMilestones);
for (const Constructor of [esm.DagTraversal, cjs.AsyncDagTraversal]) {
  const task = { label: 'task' };
  const runner = new Constructor({
    ...esm.materializeDagInputFromRecords([{ id: task }], { id: (item) => item.id }),
    workCompletion: 'externalSettlement',
  }).createRunner();
  const target = { vertexId: task, milestone: 'work' };
  assert.deepEqual(runner.inspectMilestones().explain(target), {
    kind: 'unknown',
    target,
    discoveryComplete: false,
  });
  await runner.prepare();
  await runner.run();
  const snapshot = cjs.inspectDagMilestones(runner);
  assert.deepEqual(
    runner.inspectMilestones().explain(target),
    snapshot.explain(target),
  );
  assert.deepEqual(snapshot.explain(target).blockers, [
    { kind: 'unfinishedWork', target, work: 'deferred' },
  ]);
  const ticket = runner.summary().awaitingSettlement[0];
  runner.settle(task, { kind: 'workCompleted' }, ticket.generation);
  await runner.run();
  assert.equal(snapshot.explain(target).satisfied, false);
  assert.equal(dag.inspectDagMilestones(runner).explain(target).satisfied, true);
  assert.equal(runner.inspectMilestones().explain(target).satisfied, true);
  assert.deepEqual(snapshot.dependentsOf(target).milestones, [
    { vertexId: task, milestone: 'subgraphCompletion' },
  ]);
  assert.equal(
    snapshot.prerequisitesOf({ vertexId: task, milestone: 'subgraphCompletion' })
      .edges[0].reason,
    'ownWork',
  );
}
console.log('Packed DAG inspection consumers passed');
