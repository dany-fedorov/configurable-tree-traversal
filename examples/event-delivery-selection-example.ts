import assert from 'node:assert/strict';
import {
  AsyncDagTraversalBuilder,
  DagVisitorPhase,
  type VertexDataAndChildHintTypes,
} from '../src';

async function main() {
  let workCallbacks = 0;
  const traversal = new AsyncDagTraversalBuilder<
    VertexDataAndChildHintTypes<string, never>
  >({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: 'task',
          vertexContentInput: { $vertexData: 'task', $childDiscoveryHints: [] },
        },
      }),
      resolveChildVertexFromHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted',
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
    },
    workCompletionPolicy: 'requireExternalWorkSettlement',
  });
  traversal.registerVisitorForPhase(
    DagVisitorPhase.ON_WORK_READY,
    () => {
      workCallbacks++;
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  assert.equal(runner.getTraversalStopReason(), 'awaitingSettlement');
  const work = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
  runner.settleDeferredWork(
    work.vertexId,
    { kind: 'workCompleted' },
    work.settlementToken,
  );

  // The committed work observation exists even though admission emitted nothing.
  const workEvents =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['workCompletionCommitted'],
    });
  const completed = await workEvents.next();
  assert.equal(completed.done, false);
  if (!completed.done) {
    const kind: 'workCompletionCommitted' = completed.value.eventKind;
    assert.equal(kind, 'workCompletionCommitted');
  }
  await workEvents.return();

  // A new lease selects completion; callbacks and committed work do not replay.
  const completionEvents = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: ['subgraphCompletionCommitted'],
    },
  )) {
    const kind: 'subgraphCompletionCommitted' = event.eventKind;
    completionEvents.push(kind);
  }
  assert.deepEqual(completionEvents, ['subgraphCompletionCommitted']);
  assert.equal(workCallbacks, 1);
  assert.equal(runner.getTraversalStopReason(), 'finished');
}
void main();
