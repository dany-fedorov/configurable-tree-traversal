import assert from 'node:assert/strict';
import { DagTraversal, type VertexTypes } from '../src';

type TaskId = 'research' | 'implement' | 'testPlan' | 'review';
type Workflow = VertexTypes<string, TaskId>;
const catalog: TaskId[] = ['research', 'implement', 'testPlan', 'review'];
const dependencies: Record<TaskId, TaskId[]> = {
  research: [],
  implement: ['research'],
  testPlan: ['research'],
  review: ['implement', 'testPlan'],
};
// In-memory stand-in for completion facts already accepted by your host.
const accepted = new Set<TaskId>(['research']);
let sourceCalls = 0;
function reconstruct() {
  return new DagTraversal<Workflow, Workflow, TaskId>({
    workCompletion: 'externalSettlement',
    syntheticRoot: true,
    completedWork: accepted,
    traversableGraph: {
      resolveRoot: () => {
        sourceCalls += 1;
        return {
          kind: 'found',
          vertex: {
            vertexId: 'research',
            vertexContent: { $data: '', $childHints: catalog },
          },
        };
      },
      resolveChild: (id) => {
        sourceCalls += 1;
        return {
          kind: 'found',
          vertex: {
            vertexId: id,
            dependsOn: dependencies[id],
            vertexContent: { $data: id, $childHints: [] },
          },
        };
      },
    },
  }).createRunner();
}

const runner = reconstruct();
assert.equal(runner.prepare(), runner);
assert.equal(runner.getStopReason(), 'prepared');
assert.equal(runner.summary().discovery.mode, 'eager');
assert.equal(runner.getResolvedGraph().getVertexRefs().length, 4);
assert.deepEqual(runner.summary().deferredFrontier, []);
assert.deepEqual(runner.summary().completedWorkIds, ['research']);
const preparedCalls = sourceCalls;
runner.prepare();
runner.run();
assert.equal(sourceCalls, preparedCalls); // No discovery replay on run.
assert.equal(runner.getStopReason(), 'awaitingSettlement');
assert.deepEqual(
  runner.summary().deferredFrontier.map(({ vertexId }) => vertexId),
  ['implement', 'testPlan'],
);
const work = runner.summary().deferredFrontier[0]!;
// The host claims/dispatches work, checks its attempt/revision, then accepts it.
accepted.add(work.vertexId);
assert.equal(
  runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation),
  true,
);
runner.run();
assert.deepEqual(runner.summary().readyIds, ['testPlan']);
assert.equal(
  runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation),
  false,
);
// A restart rebuilds accepted facts, never saved runner/generation objects.
assert.deepEqual(reconstruct().run().summary().readyIds, ['testPlan']);
const events = [];
while (runner.getStatus() !== 'FINISHED') {
  for (const next of runner.summary().deferredFrontier) {
    accepted.add(next.vertexId);
    runner.settle(next.vertexId, { kind: 'workCompleted' }, next.generation);
  }
  events.push(...runner.getIterable());
}
assert.equal(runner.getStopReason(), 'finished');
assert.deepEqual(runner.summary().deferredFrontier, []);
assert.equal(runner.summary().completedWorkIds.length, 4);
assert(events.some(({ kind }) => kind === 'workCompleted'));
assert(events.some(({ kind }) => kind === 'subgraphCompleted'));
assert.deepEqual(reconstruct().run().summary().readyIds, []);
console.log(
  'Prepared preview → guarded frontier → accepted results → finished',
);
