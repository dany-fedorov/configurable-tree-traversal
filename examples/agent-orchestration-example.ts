import assert from 'node:assert/strict';
import {
  DagTraversal,
  DagTraversalOrder,
  DEFER_READY,
  type TreeTypeParameters,
} from '../src';

type Workflow = TreeTypeParameters<string, string>;
const dependencies: Record<string, string[]> = {
  research: [],
  implement: ['research'],
  testPlan: ['research'],
  review: ['implement', 'testPlan'],
};
// In-memory stand-in for completion facts already accepted by your host.
const accepted = new Set(['research']);
function reconstruct() {
  const traversal = new DagTraversal<Workflow>({
    discovery: 'eager',
    syntheticRoot: true,
    completedWork: accepted,
    traversableGraph: {
      makeRoot: () => ({
        vertexContent: { $d: '', $c: Object.keys(dependencies) },
      }),
      makeVertex: (id) => ({
        vertexId: id,
        dependsOn: dependencies[id]!,
        vertexContent: { $d: id, $c: [] },
      }),
    },
  });
  traversal.addVisitorFor(DagTraversalOrder.ON_READY, () => DEFER_READY);
  return traversal.makeRunner().run();
}

const runner = reconstruct();
const snapshot = runner.summary();
console.log(snapshot.readyIds); // ['implement', 'testPlan']
assert.deepEqual(snapshot.readyIds, ['implement', 'testPlan']);
const generation = snapshot.vertices.get('implement')!.generation!;

// A real host claims work, dispatches an agent, validates its attempt/revision,
// and durably accepts its result BEFORE settling it. This example simulates that.
accepted.add('implement');
assert.equal(runner.settle('implement', { ok: true }, generation), true);
runner.run();
assert.deepEqual(runner.summary().readyIds, ['testPlan']);
assert.equal(runner.settle('implement', { ok: true }, generation), false);

// A restart rebuilds from accepted facts, never saved runner/generation objects.
assert.deepEqual(reconstruct().summary().readyIds, ['testPlan']);
accepted.add('testPlan');
assert.deepEqual(reconstruct().summary().readyIds, ['review']);
console.log('Agent frontier: implement + testPlan → testPlan → review');
