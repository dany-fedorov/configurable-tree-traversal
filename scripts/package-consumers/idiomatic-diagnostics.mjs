import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');

for (const api of [esm, cjs]) {
  let release;
  let enter;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const entered = new Promise((resolve) => {
    enter = resolve;
  });
  const id = { opaque: true };
  let sourceCalls = 0;
  const runner = new api.AsyncDagTraversalBuilder({
    dagDiscoverySource: {
      resolveRootVertex: () => {
        sourceCalls++;
        return {
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: id,
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        };
      },
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted',
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
    },
    visitors: {
      ON_WORK_READY: async () => {
        enter();
        await gate;
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await entered;
  const inspection = runner.captureExecutionSnapshot();
  const chain = inspection.vertexPhaseVisitorChains[0];
  assert.equal(chain.visitorPhase, 'ON_WORK_READY');
  assert.equal(chain.state, 'active');
  assert.equal(chain.visitorCallbackIndexInPhaseChain, 0);
  assert.equal(
    chain.executionSelectionsAtAdmission.admittedVisitorCallbackPhases,
    'all',
  );
  assert.equal(chain.visitorCommandCommitTiming, 'afterEachVisitorCallback');
  for (const key of ['order', 'group', 'position', 'config'])
    assert.equal(key in chain, false);
  assert.equal(inspection.inFlightInvocationCount, 1);
  assert.equal(
    inspection.pendingCallbackRequests[0].operation,
    'invokeVisitorCallback',
  );
  assert.equal('kind' in inspection.pendingCallbackRequests[0], false);
  assert.deepEqual(inspection.pendingCallbackRequests[0].owner, chain.owner);
  assert.deepEqual(runner.captureExecutionSnapshot(), inspection);
  assert.equal(sourceCalls, 1);
  const graph = runner.getLiveResolvedGraphView();
  const ref = graph.getVertexHandleByIdOrNull(id);
  assert.equal(graph.getVertexSnapshotOrNull(ref).vertexId, id);
  assert.equal(
    graph.getVertexSnapshotOrNull(ref).schedulingVisitStage,
    'INITIAL_VISIT_STARTED',
  );
  assert.equal(
    graph.getVertexVisitSchedulingStageOrNull(ref),
    'INITIAL_VISIT_STARTED',
  );
  assert.equal('status' in graph.getVertexSnapshotOrNull(ref), false);
  assert.equal('getStatusOf' in graph, false);
  release();
  await running;
  assert.equal(
    graph.getVertexVisitSchedulingStageOrNull(ref),
    'COMPLETION_VISIT_COMMITTED',
  );
  assert.equal(
    runner.getTraversalLifecycleStatus(),
    api.TraversalRunnerStatus.FINISHED,
  );
}
