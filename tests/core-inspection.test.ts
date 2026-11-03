import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import type { TestGraph } from './helpers/graph-fixtures';

function setup() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const kernel = new TraversalKernel<TestGraph>({
    kind: 'dag',
    execution: 'sync',
    sourceMode: 'graph',
    container,
    stateBridge: {
      status: TraversalRunnerStatus.NOT_STARTED,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {
      ON_WORK_READY: [
        {
          phaseRegistrationInsertionIndex: 0,
          descendingExecutionPriorityWithinGroup: 100,
          visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
        },
      ],
    },
    iterableConfig: {
      iterateOver: ['ON_WORK_READY'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasChildHintsListTransformer: true,
    hasChildHintVertexIdResolver: true,
    maxConcurrentCallbackInvocations: 3,
  });
  return kernel;
}

test('inspection is detached, deeply frozen, callback-free, and side-effect free', () => {
  const kernel = setup();
  const action = kernel.poll('drive');
  if (action.kind !== 'CALL') throw new Error('Expected root call');

  const first = kernel.captureExecutionSnapshot();
  const second = kernel.captureExecutionSnapshot();
  expect(first).not.toBe(second);
  expect(first).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.RUNNING,
    traversalAlgorithm: 'dag',
    callbackExecutionMode: 'sync',
    sourceTopologyKind: 'graph',
    maxConcurrentCallbackInvocations: 3,
    hasChildHintsListTransformer: true,
    hasChildHintVertexIdResolver: true,
    unacknowledgedCommittedEventBoundaryCount: 0,
  });
  expect(first.pendingCallbackRequests).toEqual([
    {
      callbackRequestId: action.call.requestId,
      operation: 'resolveRootVertex',
      owner: {
        ownerKind: 'rootResolution',
        runnerLocalOwnerId: 1,
        validityGeneration: 0,
      },
      ownerStillValid: true,
    },
  ]);
  expect(first.pendingCallbackRequests).not.toBe(
    second.pendingCallbackRequests,
  );
  expect(first.pendingCallbackRequests[0]!.owner).not.toBe(
    second.pendingCallbackRequests[0]!.owner,
  );
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.executionOptions.deliveredEventKinds)).toBe(
    true,
  );
  expect(Object.isFrozen(first.pendingCallbackRequests[0]!.owner)).toBe(true);
  expect(JSON.stringify(first)).not.toMatch(/promise|root data/i);
  expect(kernel.poll('drive')).toEqual({ kind: 'WAIT' });
});

test('inspection remains readable in initial, halted, finished, and failed states', () => {
  const initial = setup();
  expect(initial.captureExecutionSnapshot().traversalLifecycleStatus).toBe(
    TraversalRunnerStatus.NOT_STARTED,
  );
  initial.requestHalt();
  expect(initial.poll('drive')).toEqual({ kind: 'SUSPENDED' });
  expect(initial.captureExecutionSnapshot().traversalLifecycleStatus).toBe(
    TraversalRunnerStatus.SUSPENDED,
  );

  const finished = setup();
  const empty = finished.poll('drive');
  if (empty.kind !== 'CALL') throw new Error('Expected root call');
  finished.submit({
    requestId: empty.call.requestId,
    kind: 'MAKE_ROOT',
    outcome: { ok: true, value: { vertexContent: null } },
  });
  expect(finished.poll('drive')).toEqual({ kind: 'FINISHED' });
  expect(finished.captureExecutionSnapshot().traversalLifecycleStatus).toBe(
    TraversalRunnerStatus.FINISHED,
  );

  const failed = setup();
  const call = failed.poll('drive');
  if (call.kind !== 'CALL') throw new Error('Expected root call');
  failed.submit({
    requestId: call.call.requestId,
    kind: 'MAKE_ROOT',
    outcome: { ok: false, error: 'broken' },
  });
  expect(failed.poll('drive')).toEqual({ kind: 'FAILED', error: 'broken' });
  expect(failed.captureExecutionSnapshot().traversalLifecycleStatus).toBe(
    TraversalRunnerStatus.FAILED,
  );
});

test('inspection detaches and freezes populated chain and frame records', () => {
  const kernel = setup();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit({
    requestId: root.call.requestId,
    kind: 'MAKE_ROOT',
    outcome: {
      ok: true,
      value: {
        vertexId: 'root',
        vertexContent: {
          $vertexData: 'private-root-data',
          $childDiscoveryHints: ['private-hint'],
        },
      },
    },
  });
  const visit = kernel.poll('drive');
  if (visit.kind !== 'CALL' || visit.call.kind !== 'VISIT') {
    throw new Error('Expected visitor call');
  }

  const firstChain = kernel.captureExecutionSnapshot();
  const secondChain = kernel.captureExecutionSnapshot();
  expect(firstChain.vertexPhaseVisitorChains).toHaveLength(1);
  expect(firstChain.vertexPhaseVisitorChains).not.toBe(
    secondChain.vertexPhaseVisitorChains,
  );
  expect(firstChain.vertexPhaseVisitorChains[0]).not.toBe(
    secondChain.vertexPhaseVisitorChains[0],
  );
  expect(firstChain.vertexPhaseVisitorChains[0]!.owner).not.toBe(
    secondChain.vertexPhaseVisitorChains[0]!.owner,
  );
  expect(Object.isFrozen(firstChain.vertexPhaseVisitorChains)).toBe(true);
  expect(Object.isFrozen(firstChain.vertexPhaseVisitorChains[0])).toBe(true);
  expect(Object.isFrozen(firstChain.vertexPhaseVisitorChains[0]!.owner)).toBe(
    true,
  );
  expect(
    Object.isFrozen(
      firstChain.vertexPhaseVisitorChains[0]!.executionSelectionsAtAdmission
        .deliveredEventKinds,
    ),
  ).toBe(true);
  expect(JSON.stringify(firstChain)).not.toMatch(
    /private-root-data|private-hint|promise/i,
  );
  expect(() => {
    (
      firstChain.vertexPhaseVisitorChains[0]!.owner as {
        runnerLocalOwnerId: number;
      }
    ).runnerLocalOwnerId = 999;
  }).toThrow(TypeError);
  expect(
    kernel.captureExecutionSnapshot().vertexPhaseVisitorChains[0]!.owner
      .runnerLocalOwnerId,
  ).toBe(2);
  expect(kernel.poll('drive')).toEqual({ kind: 'WAIT' });

  kernel.submit({
    requestId: visit.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  const event = kernel.poll('drive');
  if (event.kind !== 'EVENT') throw new Error('Expected root event');
  kernel.acknowledgeEvent(event.boundaryId);
  const sort = kernel.poll('drive');
  if (sort.kind !== 'CALL' || sort.call.kind !== 'SORT_HINTS') {
    throw new Error('Expected sort request');
  }

  const firstFrame = kernel.captureExecutionSnapshot();
  const secondFrame = kernel.captureExecutionSnapshot();
  expect(firstFrame.vertexTraversalFrames).toHaveLength(1);
  expect(firstFrame.vertexTraversalFrames[0]).toMatchObject({
    stage: 'transformingChildHints',
    pendingChildHintIndices: [],
  });
  expect(firstFrame.vertexTraversalFrames).not.toBe(
    secondFrame.vertexTraversalFrames,
  );
  expect(firstFrame.vertexTraversalFrames[0]).not.toBe(
    secondFrame.vertexTraversalFrames[0],
  );
  expect(firstFrame.vertexTraversalFrames[0]!.owner).not.toBe(
    secondFrame.vertexTraversalFrames[0]!.owner,
  );
  expect(firstFrame.vertexTraversalFrames[0]!.pendingChildHintIndices).not.toBe(
    secondFrame.vertexTraversalFrames[0]!.pendingChildHintIndices,
  );
  expect(Object.isFrozen(firstFrame.vertexTraversalFrames[0])).toBe(true);
  expect(Object.isFrozen(firstFrame.vertexTraversalFrames[0]!.owner)).toBe(
    true,
  );
  expect(
    Object.isFrozen(
      firstFrame.vertexTraversalFrames[0]!.pendingChildHintIndices,
    ),
  ).toBe(true);
  expect(JSON.stringify(firstFrame)).not.toMatch(
    /private-root-data|private-hint|promise/i,
  );
  expect(() => {
    (
      firstFrame.vertexTraversalFrames[0]!.pendingChildHintIndices as number[]
    ).push(1);
  }).toThrow(TypeError);
  expect(
    kernel.captureExecutionSnapshot().vertexTraversalFrames[0]!
      .pendingChildHintIndices,
  ).toEqual([]);
  expect(kernel.poll('drive')).toEqual({ kind: 'WAIT' });
});
