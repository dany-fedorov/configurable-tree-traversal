import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const cjs = createRequire(import.meta.url)('configurable-tree-traversal');

const vertexId = {};
const tree = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: vertexId, $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
};
const graph = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId,
      vertexContentInput: { $vertexData: vertexId, $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted',
    satisfiesWorkAndSubgraphCompletionPrerequisites: true,
  }),
};
for (const lib of [esm, cjs]) {
  for (const Constructor of [
    lib.DagTraversalBuilder,
    lib.AsyncDagTraversalBuilder,
  ]) {
    let callbacks = 0;
    const traversal = new Constructor({
      dagDiscoverySource: graph,
      workCompletionPolicy: 'requireExternalWorkSettlement',
    });
    traversal.registerVisitorForPhase(
      lib.DagVisitorPhase.ON_WORK_READY,
      () => {
        callbacks++;
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    const ticket = runner.captureProgressSnapshot().workAwaitingSettlement[0];
    assert.equal(ticket.vertexId, vertexId);
    runner.settleDeferredWork(
      vertexId,
      { kind: 'workCompleted' },
      ticket.settlementToken,
    );
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: ['workCompletionCommitted'],
      },
    ))
      events.push(event);
    assert.deepEqual(
      events.map((e) => e.eventKind),
      ['workCompletionCommitted'],
    );
    assert.equal(events[0].vertexId, vertexId);
    assert.equal(events[0].vertex.getVertexData(), vertexId);
    assert.equal('setValue' in events[0].vertexHandle, false);
    assert.equal(callbacks, 1);
    assert.equal(runner.getTraversalStopReason(), 'finished');
  }
  for (const [Constructor, options, phase, kind] of [
    [
      lib.AsyncDepthFirstTreeTraversalBuilder,
      { treeDiscoverySource: tree },
      lib.DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      lib.DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    ],
    [
      lib.AsyncBreadthFirstTreeTraversalBuilder,
      { treeDiscoverySource: tree },
      lib.BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
      lib.BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
    ],
    [
      lib.AsyncDagTraversalBuilder,
      { dagDiscoverySource: graph },
      lib.DagVisitorPhase.ON_WORK_READY,
      'workCompletionCommitted',
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
      traversal.registerVisitorForPhase(phase, async () => {
        callbacks++;
        started();
        await gate;
      });
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      const first =
        runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: initiallySelected ? [kind] : [],
        });
      const pending = first.next();
      await admitted;
      const closing = first.return();
      release();
      assert.equal((await closing).done, true);
      assert.equal((await pending).done, true);
      assert.equal(
        runner.captureExecutionSnapshot().bufferedDeliveryEventCount,
        1,
      );
      const events = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
        {
          deliveredEventKinds: initiallySelected ? [] : [kind],
        },
      ))
        events.push(event.eventKind);
      assert.deepEqual(events, initiallySelected ? [] : [kind]);
      assert.equal(callbacks, 1);
      assert.equal(runner.getTraversalStopReason(), 'finished');
    }
  }
}
