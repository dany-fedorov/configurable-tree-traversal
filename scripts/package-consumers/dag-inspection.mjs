import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
assert.equal(esm.captureDagMilestoneSnapshot, cjs.captureDagMilestoneSnapshot);
assert.equal(esm.captureDagMilestoneSnapshot, dag.captureDagMilestoneSnapshot);
assert.equal(
  esm.captureDagMilestoneSnapshot,
  cjsDag.captureDagMilestoneSnapshot,
);
assert.equal(
  esm.captureDagMilestoneSnapshot,
  esm.dagTraversal.captureDagMilestoneSnapshot,
);
for (const Constructor of [
  esm.DagTraversalBuilder,
  cjs.AsyncDagTraversalBuilder,
]) {
  const task = { label: 'task' };
  const runner = new Constructor({
    ...esm.materializeMultiEntryDagInputFromRecordCatalog([{ id: task }], {
      selectVertexId: (item) => item.id,
    }),
    workCompletionPolicy: 'requireExternalWorkSettlement',
  }).createIndependentRunnerFromCurrentOptions();
  const target = { vertexId: task, milestone: 'workCompletion' };
  assert.deepEqual(runner.captureMilestoneSnapshot().explainMilestone(target), {
    kind: 'unresolved',
    targetMilestone: target,
    discoveryComplete: false,
  });
  await runner.discoverValidateAndFreezeTopology();
  await runner.runUntilSuspendedOrTerminal();
  const snapshot = cjs.captureDagMilestoneSnapshot(runner);
  assert.deepEqual(
    runner.captureMilestoneSnapshot().explainMilestone(target),
    snapshot.explainMilestone(target),
  );
  assert.deepEqual(snapshot.explainMilestone(target).blockers, [
    {
      kind: 'workCompletionUncommitted',
      targetMilestone: target,
      workState: 'workCompletionDeferred',
    },
  ]);
  const ticket = runner.captureProgressSnapshot().workAwaitingSettlement[0];
  runner.settleDeferredWork(
    task,
    { kind: 'workCompleted' },
    ticket.settlementToken,
  );
  await runner.runUntilSuspendedOrTerminal();
  assert.equal(snapshot.explainMilestone(target).milestoneSatisfied, false);
  assert.equal(
    dag.captureDagMilestoneSnapshot(runner).explainMilestone(target)
      .milestoneSatisfied,
    true,
  );
  assert.equal(
    runner.captureMilestoneSnapshot().explainMilestone(target)
      .milestoneSatisfied,
    true,
  );
  assert.deepEqual(
    snapshot.queryOriginalDependentMilestonesOf(target).reachedMilestones,
    [{ vertexId: task, milestone: 'subgraphCompletion' }],
  );
  assert.equal(
    snapshot.queryOriginalPrerequisiteMilestonesOf({
      vertexId: task,
      milestone: 'subgraphCompletion',
    }).originalMilestoneConstraints[0].reason,
    'ownWork',
  );
}
console.log('Packed DAG inspection consumers passed');
