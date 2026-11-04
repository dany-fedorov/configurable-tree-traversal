import {
  DagTraversalBuilder,
  TraversalRunnerStatus,
  type VertexDataAndChildHintTypes,
} from '../src';
import assert from 'node:assert/strict';

type Workflow = VertexDataAndChildHintTypes<string, string>;
const dependencies: Record<string, string[]> = {
  design: [],
  backend: ['design'],
  frontend: ['design'],
  verify: ['backend', 'frontend'],
};

// A stand-in for accepted durable host facts loaded on each reconciliation tick.
const acceptedCompletedWork = new Set(['design']);
function reconstruct() {
  const traversal = new DagTraversalBuilder<Workflow>({
    acceptedCompletedWorkVertexIds: acceptedCompletedWork,
    discoveryTiming: 'completeBeforeAnyVisitor',
    workCompletionPolicy: 'requireExternalWorkSettlement',
    sourceRootIsHiddenEntryHolder: true,
    dagDiscoverySource: {
      // Supply the complete catalog, including disconnected components.
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: '',
            $childDiscoveryHints: Object.keys(dependencies),
          },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: dependencies[id]!,
          vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
        },
      }),
    },
  });
  return traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
}

const retained = reconstruct();
assert.equal(
  retained.getTraversalLifecycleStatus(),
  TraversalRunnerStatus.SUSPENDED,
);
assert.equal(retained.getTraversalStopReason(), 'awaitingSettlement');
assert.deepEqual(
  retained.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  ['backend', 'frontend'],
);
const backend = retained
  .captureProgressSnapshot()
  .workAwaitingSettlement.find(({ vertexId }) => vertexId === 'backend')!;

// The host claims/runs the activity, validates its attempt identity and durably
// accepts success before reporting it. Readiness alone is not host admission.
acceptedCompletedWork.add('backend');
retained.settleDeferredWork(
  backend.vertexId,
  { kind: 'workCompleted' },
  backend.settlementToken,
);
retained.runUntilSuspendedOrTerminal();
assert.deepEqual(
  retained.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  ['frontend'],
);
assert.equal(
  retained.settleDeferredWork(
    backend.vertexId,
    { kind: 'workCompleted' },
    backend.settlementToken,
  ),
  false,
);

// Restart/revision changes rebuild from durable facts. Never persist generation
// symbols or send a generation from the discarded runner to its replacement.
const rebuilt = reconstruct();
assert.deepEqual(
  rebuilt.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  retained.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
);
acceptedCompletedWork.add('frontend');
const nextTick = reconstruct();
assert.deepEqual(
  nextTick.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds,
  ['verify'],
);
console.log('Reconciliation frontier: backend + frontend → frontend → verify');
