import { DagTraversalBuilder, type VertexDataAndChildHintTypes } from '../src';
import assert from 'node:assert/strict';

type TaskId = 'research' | 'implement' | 'testPlan' | 'review';
type Workflow = VertexDataAndChildHintTypes<string, TaskId>;
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
  return new DagTraversalBuilder<Workflow, Workflow, TaskId>({
    workCompletionPolicy: 'requireExternalWorkSettlement',
    sourceRootIsHiddenEntryHolder: true,
    acceptedCompletedWorkVertexIds: accepted,
    dagDiscoverySource: {
      resolveRootVertex: () => {
        sourceCalls += 1;
        return {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: 'research',
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: catalog,
            },
          },
        };
      },
      resolveChildHint: (id) => {
        sourceCalls += 1;
        return {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: dependencies[id],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        };
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
}

const runner = reconstruct();
assert.equal(runner.discoverValidateAndFreezeTopology(), runner);
assert.equal(runner.getTraversalStopReason(), 'prepared');
assert.equal(
  runner.captureProgressSnapshot().discovery.timing,
  'completeBeforeAnyVisitor',
);
assert.equal(runner.getLiveResolvedGraphView().getVertexHandles().length, 4);
assert.deepEqual(runner.captureProgressSnapshot().workAwaitingSettlement, []);
assert.deepEqual(
  runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ['research'],
);
const preparedCalls = sourceCalls;
runner.discoverValidateAndFreezeTopology();
runner.runUntilSuspendedOrTerminal();
assert.equal(sourceCalls, preparedCalls); // No discovery replay on run.
assert.equal(runner.getTraversalStopReason(), 'awaitingSettlement');
assert.deepEqual(
  runner
    .captureProgressSnapshot()
    .workAwaitingSettlement.map(({ vertexId }) => vertexId),
  ['implement', 'testPlan'],
);
const work = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
// The host claims/dispatches work, checks its attempt/revision, then accepts it.
accepted.add(work.vertexId);
assert.equal(
  runner.settleDeferredWork(
    work.vertexId,
    { kind: 'workCompleted' },
    work.settlementToken,
  ),
  true,
);
runner.runUntilSuspendedOrTerminal();
assert.deepEqual(
  runner.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  ['testPlan'],
);
assert.equal(
  runner.settleDeferredWork(
    work.vertexId,
    { kind: 'workCompleted' },
    work.settlementToken,
  ),
  false,
);
// A restart rebuilds accepted facts, never saved runner/generation objects.
assert.deepEqual(
  reconstruct().runUntilSuspendedOrTerminal().captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  ['testPlan'],
);
const events = [];
while (runner.getTraversalLifecycleStatus() !== 'FINISHED') {
  for (const next of runner.captureProgressSnapshot().workAwaitingSettlement) {
    accepted.add(next.vertexId);
    runner.settleDeferredWork(
      next.vertexId,
      { kind: 'workCompleted' },
      next.settlementToken,
    );
  }
  events.push(
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  );
}
assert.equal(runner.getTraversalStopReason(), 'finished');
assert.deepEqual(runner.captureProgressSnapshot().workAwaitingSettlement, []);
assert.equal(
  runner.captureProgressSnapshot().workCompletionCommittedVertexIds.length,
  4,
);
assert(
  events.some(({ eventKind: kind }) => kind === 'workCompletionCommitted'),
);
assert(
  events.some(({ eventKind: kind }) => kind === 'subgraphCompletionCommitted'),
);
assert.deepEqual(
  reconstruct().runUntilSuspendedOrTerminal().captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  [],
);
console.log(
  'Prepared preview → guarded frontier → accepted results → finished',
);
