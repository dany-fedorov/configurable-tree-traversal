import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const cjs = createRequire(import.meta.url)('configurable-tree-traversal');

const vertexId = {};
const tree = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: {
      vertexContent: { $data: vertexId, $childHints: [] },
    },
  }),
  resolveChild: () => ({ kind: 'omitted' }),
};
const graph = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: {
      vertexId,
      vertexContent: { $data: vertexId, $childHints: [] },
    },
  }),
  resolveChild: () => ({
    identity: null,
    kind: 'omitted',
    satisfiesDependencies: true,
  }),
};
for (const lib of [esm, cjs]) {
  for (const Constructor of [lib.DagTraversal, lib.AsyncDagTraversal]) {
    let callbacks = 0;
    const traversal = new Constructor({
      traversableGraph: graph,
      workCompletion: 'externalSettlement',
    });
    traversal.addVisitorFor(lib.DagVisitorPhase.ON_WORK_READY, () => {
      callbacks++;
    });
    const runner = traversal.createRunner();
    await runner.run({ emitEvents: [] });
    const ticket = runner.summary().awaitingSettlement[0];
    assert.equal(ticket.vertexId, vertexId);
    runner.settle(vertexId, { kind: 'workCompleted' }, ticket.generation);
    const events = [];
    for await (const event of runner.iterateEvents({
      emitEvents: ['workCompleted'],
    }))
      events.push(event);
    assert.deepEqual(
      events.map((e) => e.kind),
      ['workCompleted'],
    );
    assert.equal(events[0].vertexId, vertexId);
    assert.equal(events[0].vertex.getData(), vertexId);
    assert.equal('setValue' in events[0].vertexRef, false);
    assert.equal(callbacks, 1);
    assert.equal(runner.getStopReason(), 'finished');
  }
  for (const [Constructor, options, phase, kind] of [
    [
      lib.AsyncDepthFirstTreeTraversal,
      { traversableTree: tree },
      lib.DepthFirstPhase.PRE_ORDER,
      lib.DepthFirstPhase.PRE_ORDER,
    ],
    [
      lib.AsyncBreadthFirstTreeTraversal,
      { traversableTree: tree },
      lib.BreadthFirstPhase.LEVEL_ORDER,
      lib.BreadthFirstPhase.LEVEL_ORDER,
    ],
    [
      lib.AsyncDagTraversal,
      { traversableGraph: graph },
      lib.DagVisitorPhase.ON_WORK_READY,
      'workCompleted',
    ],
  ]) {
    for (const initiallySelected of [false, true]) {
      let release;
      let started;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const admitted = new Promise((resolve) => {
        started = resolve;
      });
      let callbacks = 0;
      const traversal = new Constructor(options);
      traversal.addVisitorFor(phase, async () => {
        callbacks++;
        started();
        await gate;
      });
      const runner = traversal.createRunner();
      const first = runner.iterateEvents({
        emitEvents: initiallySelected ? [kind] : [],
      });
      const pending = first.next();
      await admitted;
      const closing = first.return();
      release();
      assert.equal((await closing).done, true);
      assert.equal((await pending).done, true);
      assert.equal(runner.inspect().bufferedEventCount, 1);
      const events = [];
      for await (const event of runner.iterateEvents({
        emitEvents: initiallySelected ? [] : [kind],
      }))
        events.push(event.kind ?? event.phase);
      assert.deepEqual(events, initiallySelected ? [] : [kind]);
      assert.equal(callbacks, 1);
      assert.equal(runner.getStopReason(), 'finished');
    }
  }
}
