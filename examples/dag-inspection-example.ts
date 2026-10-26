import assert from 'node:assert/strict';
import { DagTraversal, materializeDagSourceFromRecords, inspectDagMilestones } from '../src';

// Parent work is reusable, while its unfinished child still blocks a C join.
const runner = new DagTraversal({
  ...materializeDagSourceFromRecords(
    [
      { id: 'bundle', children: ['child'], complete: [] as string[] },
      { id: 'child', children: [], complete: [] },
      { id: 'review', children: [], complete: ['bundle'] },
    ],
    {
      id: (item) => item.id,
      children: (item) => item.children,
      dependsOnComplete: (item) => item.complete,
    },
  ),
  completedWork: new Set(['bundle']),
  workCompletion: 'externalSettlement',
}).createRunner();
runner.prepare();
runner.run();
const captured = runner.inspectMilestones();
// The free function remains equivalent; async runners expose the same sync method.
assert.deepEqual(
  inspectDagMilestones(runner).explain({ vertexId: 'review', milestone: 'work' }),
  captured.explain({ vertexId: 'review', milestone: 'work' }),
);
assert.equal(
  captured.explain({ vertexId: 'bundle', milestone: 'work' }).kind,
  'known',
);
const before = captured.explain({ vertexId: 'review', milestone: 'work' });
assert.equal(before.kind, 'known');
if (before.kind !== 'known') throw new Error('Expected discovered review');
assert.equal(before.satisfied, false);
assert.deepEqual(
  before.blockers.map((blocker) => blocker.kind),
  ['constraint', 'constraint', 'constraint', 'unfinishedWork'],
);
console.log('Captured blockers:', before.blockers);

const child = runner.summary().deferredFrontier[0]!;
runner.settle(child.vertexId, { kind: 'workCompleted' }, child.generation);
runner.run();
const after = runner.inspectMilestones().explain({
  vertexId: 'bundle',
  milestone: 'completion',
});
assert.equal(after.kind === 'known' && after.satisfied, true);
assert.deepEqual(
  captured.explain({ vertexId: 'review', milestone: 'work' }),
  before,
);
// Static navigation keeps the original constraints after those milestones commit.
assert.equal(
  inspectDagMilestones(runner).prerequisitesOf({ vertexId: 'review', milestone: 'work' })
    .edges.length,
  1,
);
const review = runner.summary().deferredFrontier[0]!;
runner.settle(review.vertexId, { kind: 'workCompleted' }, review.generation);
runner.run();
