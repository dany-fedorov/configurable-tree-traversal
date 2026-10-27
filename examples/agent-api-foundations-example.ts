import {
  materializeDagSourceFromRecords,
  prepareDag,
  type DagWorkBoundary,
  type DagWorkTicket,
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
  boundary: DagWorkBoundary<TaskId>,
): readonly DagWorkTicket<TaskId>[] {
  assert.equal(boundary.kind, 'awaitingSettlement');
  if (boundary.kind !== 'awaitingSettlement') throw new Error('Expected work');
  return boundary.workTickets;
}

async function main(): Promise<void> {
  const source = materializeDagSourceFromRecords(tasks, {
    id: (task) => task.id,
    dependsOnWork: (task) => task.requires,
  });
  let sourceCalls = 0;
  const prepared = prepareDag({
    ...source,
    traversableGraph: {
      ...source.traversableGraph,
      resolveRoot: () => {
        sourceCalls++;
        return source.traversableGraph.resolveRoot();
      },
      resolveChild: (hint, context) => {
        sourceCalls++;
        return source.traversableGraph.resolveChild(hint, context);
      },
    },
  });
  if (prepared.kind === 'invalid') throw new Error('Invalid workflow');
  const { dag } = prepared;
  // vertices is a live-child projection; definition carries ordered slots.
  assert.equal(dag.vertices.length, 4);
  assert.equal(dag.definition.vertices.length, 4);
  assert.equal(dag.definition.entry.kind, 'roots');
  const discoveryCalls = sourceCalls;

  // This set stands in for completion facts durably accepted by the host.
  const accepted = new Set<TaskId>(['research']);
  const session = dag.createWorkSession({ completedWork: accepted });
  const fresh = dag.createWorkSession();
  assert.equal(session.getStopReason(), 'prepared');
  assert.equal(
    session
      .inspectMilestones()
      .explain({ vertexId: 'review', milestone: 'work' }).kind,
    'known',
  );
  const candidates = work(session.advance());
  assert.deepEqual(
    candidates.map((ticket) => ticket.vertexId),
    ['implement', 'testPlan'],
  );
  const research = work(fresh.advance())[0]!;
  assert.equal(research.vertexId, 'research');
  assert.throws(() => session.completeWork(research), TypeError);

  // Dispatch only these frontier tickets through host claims/capacity.
  // workCompleted observations follow successful settlement.
  // Validate results before reporting them to the session.
  for (const ticket of candidates) {
    accepted.add(ticket.vertexId); // Persist acceptance before completing locally.
    assert.deepEqual(session.completeWork(ticket), { kind: 'accepted' });
    assert.deepEqual(session.completeWork(ticket), { kind: 'alreadyAccepted' });
  }
  const review = work(session.advance())[0]!;
  assert.equal(review.vertexId, 'review');
  accepted.add(review.vertexId);
  session.completeWork(review);
  assert.deepEqual(session.advance(), { kind: 'finished' });

  // Independent sessions own their progress and local ticket generations.
  assert.deepEqual(fresh.summary().completedWorkIds, []);
  fresh.completeWork(research);
  assert.deepEqual(
    work(fresh.advance()).map((ticket) => ticket.vertexId),
    ['implement', 'testPlan'],
  );

  // Recovery uses accepted facts, never serialized tickets or runner state.
  const recovered = await dag.createAsyncWorkSession({
    completedWork: accepted,
    concurrency: 2,
  });
  assert.deepEqual(await recovered.advance(), { kind: 'finished' });
  assert.equal(sourceCalls, discoveryCalls);
  console.log(
    'Prepared one graph; coordinated independent sessions without source replay.',
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
