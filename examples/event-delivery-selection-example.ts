import assert from 'node:assert/strict';
import { AsyncDagTraversal, DagVisitorPhase, type VertexTypes } from '../src';

async function main() {
  let workCallbacks = 0;
  const traversal = new AsyncDagTraversal<VertexTypes<string, never>>({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: 'task',
          vertexContent: { $data: 'task', $childHints: [] },
        },
      }),
      resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
    },
    workCompletion: 'externalSettlement',
  });
  traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => {
    workCallbacks++;
  });
  const runner = traversal.createRunner();
  await runner.run({ emitEvents: [] });
  assert.equal(runner.getStopReason(), 'awaitingSettlement');
  const work = runner.summary().awaitingSettlement[0]!;
  runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation);

  // The committed work observation exists even though admission emitted nothing.
  const workEvents = runner.iterateEvents({ emitEvents: ['workCompleted'] });
  const completed = await workEvents.next();
  assert.equal(completed.done, false);
  if (!completed.done) {
    const kind: 'workCompleted' = completed.value.kind;
    assert.equal(kind, 'workCompleted');
  }
  await workEvents.return();

  // A new lease selects completion; callbacks and committed work do not replay.
  const completionEvents = [];
  for await (const event of runner.iterateEvents({
    emitEvents: ['subgraphCompleted'],
  })) {
    const kind: 'subgraphCompleted' = event.kind;
    completionEvents.push(kind);
  }
  assert.deepEqual(completionEvents, ['subgraphCompleted']);
  assert.equal(workCallbacks, 1);
  assert.equal(runner.getStopReason(), 'finished');
}
void main();
