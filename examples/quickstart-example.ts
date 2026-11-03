import assert from 'node:assert/strict';
import {
  materializeMultiEntryDagInputFromRecordCatalog,
  discoverValidateAndCaptureDag,
} from '../src';

const tasks = [
  { id: 'research', requires: [] },
  { id: 'implement', requires: ['research'] },
  { id: 'testPlan', requires: ['research'] },
  { id: 'review', requires: ['implement', 'testPlan'] },
];
const prepared = discoverValidateAndCaptureDag(
  materializeMultiEntryDagInputFromRecordCatalog(tasks, {
    selectVertexId: (task) => task.id,
    selectWorkPrerequisiteVertexIds: (task) => task.requires,
  }),
);
if (prepared.kind === 'invalid') throw new Error('Invalid task graph');

// Simulate completion facts already accepted by the host.
const output: string[] = [];
function report(line: string): void {
  output.push(line);
  console.log(line);
}
const accepted = new Set(['research']);
const session = prepared.validatedTopology.createExternalWorkSession({
  acceptedCompletedWorkVertexIds: accepted,
});
while (true) {
  const boundary = session.runUntilWorkBoundary();
  if (boundary.kind === 'finished') {
    report('finished');
    break;
  }
  if (boundary.kind === 'paused') throw new Error('Unexpected pause');
  report(
    `ready: ${boundary.workSettlementTickets
      .map((t) => t.vertexId)
      .join(', ')}`,
  );
  for (const ticket of boundary.workSettlementTickets) {
    // Simulation: a real host dispatches, validates and persists acceptance here.
    accepted.add(ticket.vertexId);
    session.acceptCompletedWork(ticket);
  }
}

assert.deepEqual(output, [
  'ready: implement, testPlan',
  'ready: review',
  'finished',
]);
