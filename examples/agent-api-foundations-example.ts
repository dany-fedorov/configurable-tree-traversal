import assert from 'node:assert/strict';
import {
  graphFrom,
  prepareDag,
  type DagCoordinationBoundary,
  type DagWorkTicket,
} from '../src';

type TaskId = 'research' | 'implement' | 'testPlan' | 'review';
type Task = { id: TaskId; requires: TaskId[] };
const tasks: Task[] = [
  { id: 'research', requires: [] },
  { id: 'implement', requires: ['research'] },
  { id: 'testPlan', requires: ['research'] },
  { id: 'review', requires: ['implement', 'testPlan'] },
];

function work(
  boundary: DagCoordinationBoundary<TaskId>,
): readonly DagWorkTicket<TaskId>[] {
  assert.equal(boundary.kind, 'awaitingSettlement');
  if (boundary.kind !== 'awaitingSettlement') throw new Error('Expected work');
  return boundary.frontier;
}

async function main(): Promise<void> {
  const source = graphFrom(tasks, {
    id: (task) => task.id,
    dependencies: (task) => task.requires,
  });
  let sourceCalls = 0;
  const prepared = prepareDag({
    ...source,
    traversableGraph: {
      ...source.traversableGraph,
      makeRoot: () => {
        sourceCalls++;
        return source.traversableGraph.makeRoot();
      },
      makeVertex: (hint, context) => {
        sourceCalls++;
        return source.traversableGraph.makeVertex(hint, context);
      },
    },
  });
  if (prepared.kind === 'invalid') throw new Error('Invalid workflow');
  const { dag } = prepared;
  assert.equal(dag.vertices.length, 4);
  const discoveryCalls = sourceCalls;

  // This set stands in for completion facts durably accepted by the host.
  const accepted = new Set<TaskId>(['research']);
  const session = dag.createSession({ completedWork: accepted });
  const fresh = dag.createSession();
  const candidates = work(session.advance());
  assert.deepEqual(
    candidates.map((ticket) => ticket.vertexId),
    ['implement', 'testPlan'],
  );
  const research = work(fresh.advance())[0]!;
  assert.equal(research.vertexId, 'research');
  assert.throws(() => session.complete(research), TypeError);

  // Dispatch these tickets through host claims/capacity, then validate results.
  for (const ticket of candidates) {
    accepted.add(ticket.vertexId); // Persist acceptance before completing locally.
    assert.deepEqual(session.complete(ticket), { kind: 'accepted' });
    assert.deepEqual(session.complete(ticket), { kind: 'alreadyAccepted' });
  }
  const review = work(session.advance())[0]!;
  assert.equal(review.vertexId, 'review');
  accepted.add(review.vertexId);
  session.complete(review);
  assert.deepEqual(session.advance(), { kind: 'finished' });

  // Independent sessions own their progress and local ticket generations.
  assert.deepEqual(fresh.summary().completedWorkIds, []);
  fresh.complete(research);
  assert.deepEqual(
    work(fresh.advance()).map((ticket) => ticket.vertexId),
    ['implement', 'testPlan'],
  );

  // Recovery uses accepted facts, never serialized tickets or runner state.
  const recovered = await dag.createAsyncSession({
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
