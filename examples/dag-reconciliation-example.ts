import assert from 'node:assert/strict';
import {
  DagTraversal,
  TraversalRunnerStatus,
  type VertexTypes,
} from '../src';

type Workflow = VertexTypes<string, string>;
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
    workCompletion: 'externalSettlement',
    syntheticRoot: true,
    traversableGraph: {
      // Supply the complete catalog, including disconnected components.
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: '', $childHints: Object.keys(dependencies) },
        },
      }),
      resolveChild: (id) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOn: dependencies[id]!,
          vertexContent: { $data: id, $childHints: [] },
        },
      }),
    },
  });
  return traversal.createRunner().run();
}

const retained = reconstruct();
assert.equal(retained.getStatus(), TraversalRunnerStatus.HALTED);
assert.equal(retained.getStopReason(), 'awaitingSettlement');
assert.deepEqual(retained.summary().readyIds, ['backend', 'frontend']);
const backend = retained
  .summary()
  .deferredFrontier.find(({ vertexId }) => vertexId === 'backend')!;

// The host claims/runs the activity, validates its attempt identity and durably
// accepts success before reporting it. Readiness alone is not host admission.
acceptedCompletedWork.add('backend');
retained.settle(
  backend.vertexId,
  { kind: 'workCompleted' },
  backend.generation,
);
retained.run();
assert.deepEqual(retained.summary().readyIds, ['frontend']);
assert.equal(
  retained.settle(
    backend.vertexId,
    { kind: 'workCompleted' },
    backend.generation,
  ),
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
