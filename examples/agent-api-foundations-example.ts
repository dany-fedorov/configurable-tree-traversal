import {
  materializeMultiEntryDagInputFromRecordCatalog,
  discoverValidateAndCaptureDag,
  type DagExternalWorkRunBoundary,
  type DagWorkSettlementTicket,
} from '../src';
import assert from 'node:assert/strict';

type TaskId = 'research' | 'implement' | 'testPlan' | 'review';
type Task = { id: TaskId; requires: TaskId[] };
const tasks: Task[] = [
  { id: 'research', requires: [] },
  { id: 'implement', requires: ['research'] },
  { id: 'testPlan', requires: ['research'] },
  { id: 'review', requires: ['implement', 'testPlan'] },
];

function work(
  boundary: DagExternalWorkRunBoundary<TaskId>,
): readonly DagWorkSettlementTicket<TaskId>[] {
  assert.equal(boundary.kind, 'awaitingSettlement');
  if (boundary.kind !== 'awaitingSettlement') throw new Error('Expected work');
  return boundary.workSettlementTickets;
}

async function main(): Promise<void> {
  const source = materializeMultiEntryDagInputFromRecordCatalog(tasks, {
    selectVertexId: (task) => task.id,
    selectWorkPrerequisiteVertexIds: (task) => task.requires,
  });
  let sourceCalls = 0;
  const prepared = discoverValidateAndCaptureDag({
    ...source,
    dagDiscoverySource: {
      ...source.dagDiscoverySource,
      resolveRootVertex: () => {
        sourceCalls++;
        return source.dagDiscoverySource.resolveRootVertex();
      },
      resolveChildHint: (hint, context) => {
        sourceCalls++;
        return source.dagDiscoverySource.resolveChildHint(hint, context);
      },
    },
  });
  if (prepared.kind === 'invalid') throw new Error('Invalid workflow');
  const { validatedTopology: dag } = prepared;
  // vertices is a live-child projection; definition carries ordered slots.
  assert.equal(dag.liveVertexSummaries.length, 4);
  assert.equal(dag.definition.vertexDeclarations.length, 4);
  assert.equal(dag.definition.entry.kind, 'roots');
  const discoveryCalls = sourceCalls;

  // This set stands in for completion facts durably accepted by the host.
  const accepted = new Set<TaskId>(['research']);
  const session = dag.createExternalWorkSession({
    acceptedCompletedWorkVertexIds: accepted,
  });
  const fresh = dag.createExternalWorkSession();
  assert.equal(session.getTraversalStopReason(), 'prepared');
  assert.equal(
    session
      .captureMilestoneSnapshot()
      .explainMilestone({ vertexId: 'review', milestone: 'workCompletion' })
      .kind,
    'live',
  );
  const candidates = work(session.runUntilWorkBoundary());
  assert.deepEqual(
    candidates.map((ticket) => ticket.vertexId),
    ['implement', 'testPlan'],
  );
  const research = work(fresh.runUntilWorkBoundary())[0]!;
  assert.equal(research.vertexId, 'research');
  assert.throws(() => session.acceptCompletedWork(research), TypeError);

  // Dispatch only these frontier tickets through host claims/capacity.
  // workCompleted observations follow successful settlement.
  // Validate results before reporting them to the session.
  for (const ticket of candidates) {
    accepted.add(ticket.vertexId); // Persist acceptance before completing locally.
    assert.deepEqual(session.acceptCompletedWork(ticket), { kind: 'accepted' });
    assert.deepEqual(session.acceptCompletedWork(ticket), {
      kind: 'alreadyAccepted',
    });
  }
  const review = work(session.runUntilWorkBoundary())[0]!;
  assert.equal(review.vertexId, 'review');
  accepted.add(review.vertexId);
  session.acceptCompletedWork(review);
  assert.deepEqual(session.runUntilWorkBoundary(), { kind: 'finished' });

  // Independent sessions own their progress and local ticket generations.
  assert.deepEqual(
    fresh.captureProgressSnapshot().workCompletionCommittedVertexIds,
    [],
  );
  fresh.acceptCompletedWork(research);
  assert.deepEqual(
    work(fresh.runUntilWorkBoundary()).map((ticket) => ticket.vertexId),
    ['implement', 'testPlan'],
  );

  // Recovery uses accepted facts, never serialized tickets or runner state.
  const recovered = await dag.createAsyncExternalWorkSession({
    acceptedCompletedWorkVertexIds: accepted,
    maxConcurrentCallbackInvocations: 2,
  });
  assert.deepEqual(await recovered.runUntilWorkBoundary(), {
    kind: 'finished',
  });
  assert.equal(sourceCalls, discoveryCalls);
  console.log(
    'Prepared one graph; coordinated independent sessions without source replay.',
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
