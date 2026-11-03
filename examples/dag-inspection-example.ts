import {
  DagTraversalBuilder,
  materializeMultiEntryDagInputFromRecordCatalog,
  captureDagMilestoneSnapshot,
} from '../src';
import assert from 'node:assert/strict';

// Parent work is reusable, while its unfinished child still blocks a C join.
const runner = new DagTraversalBuilder({
  ...materializeMultiEntryDagInputFromRecordCatalog(
    [
      { id: 'bundle', children: ['child'], complete: [] as string[] },
      { id: 'child', children: [], complete: [] },
      { id: 'review', children: [], complete: ['bundle'] },
    ],
    {
      selectVertexId: (item) => item.id,
      selectStructuralChildVertexIds: (item) => item.children,
      selectSubgraphCompletionPrerequisiteVertexIds: (item) => item.complete,
    },
  ),
  acceptedCompletedWorkVertexIds: new Set(['bundle']),
  workCompletionPolicy: 'requireExternalWorkSettlement',
}).createIndependentRunnerFromCurrentOptions();
runner.discoverValidateAndFreezeTopology();
runner.runUntilSuspendedOrTerminal();
const captured = runner.captureMilestoneSnapshot();
// The free function remains equivalent; async runners expose the same sync method.
assert.deepEqual(
  captureDagMilestoneSnapshot(runner).explainMilestone({
    vertexId: 'review',
    milestone: 'workCompletion',
  }),
  captured.explainMilestone({
    vertexId: 'review',
    milestone: 'workCompletion',
  }),
);
assert.equal(
  captured.explainMilestone({ vertexId: 'bundle', milestone: 'workCompletion' })
    .kind,
  'live',
);
const before = captured.explainMilestone({
  vertexId: 'review',
  milestone: 'workCompletion',
});
assert.equal(before.kind, 'live');
if (before.kind !== 'live') throw new Error('Expected discovered review');
assert.equal(before.milestoneSatisfied, false);
assert.deepEqual(
  before.blockers.map((blocker) => blocker.kind),
  [
    'unmetMilestoneConstraint',
    'unmetMilestoneConstraint',
    'unmetMilestoneConstraint',
    'workCompletionUncommitted',
  ],
);
console.log('Captured blockers:', before.blockers);

const child = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
runner.settleDeferredWork(
  child.vertexId,
  { kind: 'workCompleted' },
  child.settlementToken,
);
runner.runUntilSuspendedOrTerminal();
const after = runner.captureMilestoneSnapshot().explainMilestone({
  vertexId: 'bundle',
  milestone: 'subgraphCompletion',
});
assert.equal(after.kind === 'live' && after.milestoneSatisfied, true);
assert.deepEqual(
  captured.explainMilestone({
    vertexId: 'review',
    milestone: 'workCompletion',
  }),
  before,
);
// Static navigation keeps the original constraints after those milestones commit.
assert.equal(
  captureDagMilestoneSnapshot(runner).queryOriginalPrerequisiteMilestonesOf({
    vertexId: 'review',
    milestone: 'workCompletion',
  }).originalMilestoneConstraints.length,
  1,
);
const review = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
runner.settleDeferredWork(
  review.vertexId,
  { kind: 'workCompleted' },
  review.settlementToken,
);
runner.runUntilSuspendedOrTerminal();
