import { TraversalVisitorCommandName as Command } from '../src';
import assert from 'node:assert/strict';
import {
  DagTraversal,
  DagTraversalOrder,
  TraversalRunnerStatus,
  type TreeTypeParameters,
} from '../src';

type Workflow = TreeTypeParameters<string, string>;
const dependencies: Record<string, string[]> = {
  design: [],
  backend: ['design'],
  frontend: ['design'],
  verify: ['backend', 'frontend'],
};

// A stand-in for accepted durable host facts loaded on each reconciliation tick.
const acceptedCompletedWork = new Set(['design']);
function reconstruct() {
  const traversal = new DagTraversal<Workflow>({
    completedWork: acceptedCompletedWork,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      // Supply the complete catalog, including disconnected components.
      makeRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: '', $childHints: Object.keys(dependencies) },
        },
      }),
      makeVertex: (id) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOn: dependencies[id]!,
          vertexContent: { $data: id, $childHints: [] },
        },
      }),
    },
  });
  // Inspection never executes business work or publishes success.
  traversal.addVisitorFor(DagTraversalOrder.ON_READY, () => ({
    commands: [{ commandName: Command.DEFER_READY }],
  }));
  return traversal.makeRunner().run();
}

const retained = reconstruct();
assert.equal(retained.getStatus(), TraversalRunnerStatus.HALTED);
assert.deepEqual(retained.summary().readyIds, ['backend', 'frontend']);
const backendGeneration = retained.summary().vertices.get('backend')!
  .generation!;

// The host claims/runs the activity, validates its attempt identity and durably
// accepts success before reporting it. Readiness alone is not host admission.
acceptedCompletedWork.add('backend');
retained.settle('backend', { kind: 'workCompleted' }, backendGeneration);
retained.run();
assert.deepEqual(retained.summary().readyIds, ['frontend']);
assert.equal(
  retained.settle('backend', { kind: 'workCompleted' }, backendGeneration),
  false,
);

// Restart/revision changes rebuild from durable facts. Never persist generation
// symbols or send a generation from the discarded runner to its replacement.
const rebuilt = reconstruct();
assert.deepEqual(rebuilt.summary().readyIds, retained.summary().readyIds);
acceptedCompletedWork.add('frontend');
const nextTick = reconstruct();
assert.deepEqual(nextTick.summary().readyIds, ['verify']);
console.log('Reconciliation frontier: backend + frontend → frontend → verify');
