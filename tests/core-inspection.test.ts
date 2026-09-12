import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorFunctionResolutionStyle as Style } from '../src/core/TraversalVisitor';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
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
      status: TraversalRunnerStatus.INITIAL,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {
      ON_READY: [
        {
          addedIndex: 0,
          priority: 100,
          resolutionStyle: Style.SEQUENTIAL,
        },
      ],
    },
    iterableConfig: {
      iterateOver: ['ON_READY'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasSorter: true,
    hasHintIds: true,
    concurrency: 3,
  });
  return kernel;
}

test('inspection is detached, deeply frozen, callback-free, and side-effect free', () => {
  const kernel = setup();
  const action = kernel.poll('drive');
  if (action.kind !== 'CALL') throw new Error('Expected root call');

  const first = kernel.inspect();
  const second = kernel.inspect();
  expect(first).not.toBe(second);
  expect(first).toMatchObject({
    status: TraversalRunnerStatus.RUNNING,
    kind: 'dag',
    execution: 'sync',
    sourceMode: 'graph',
    concurrency: 3,
    hasSorter: true,
    hasHintIds: true,
    pendingEventBoundaryCount: 0,
  });
  expect(first.pendingRequests).toEqual([
    {
      requestId: action.call.requestId,
      kind: 'MAKE_ROOT',
      owner: { kind: 'root', id: 1, epoch: 0 },
      valid: true,
    },
  ]);
  expect(first.pendingRequests).not.toBe(second.pendingRequests);
  expect(first.pendingRequests[0]!.owner).not.toBe(
    second.pendingRequests[0]!.owner,
  );
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.iterableConfig.iterateOver)).toBe(true);
  expect(Object.isFrozen(first.pendingRequests[0]!.owner)).toBe(true);
  expect(JSON.stringify(first)).not.toMatch(/callback|promise|root data/i);
  expect(kernel.poll('drive')).toEqual({ kind: 'WAIT' });
});

test('inspection remains readable in initial, halted, finished, and failed states', () => {
  const initial = setup();
  expect(initial.inspect().status).toBe(TraversalRunnerStatus.INITIAL);
  initial.requestHalt();
  expect(initial.poll('drive')).toEqual({ kind: 'HALTED' });
  expect(initial.inspect().status).toBe(TraversalRunnerStatus.HALTED);

  const finished = setup();
  const empty = finished.poll('drive');
  if (empty.kind !== 'CALL') throw new Error('Expected root call');
  finished.submit({
    requestId: empty.call.requestId,
    kind: 'MAKE_ROOT',
    outcome: { ok: true, value: { vertexContent: null } },
  });
  expect(finished.poll('drive')).toEqual({ kind: 'FINISHED' });
  expect(finished.inspect().status).toBe(TraversalRunnerStatus.FINISHED);

  const failed = setup();
  const call = failed.poll('drive');
  if (call.kind !== 'CALL') throw new Error('Expected root call');
  failed.submit({
    requestId: call.call.requestId,
    kind: 'MAKE_ROOT',
    outcome: { ok: false, error: 'broken' },
  });
  expect(failed.poll('drive')).toEqual({ kind: 'FAILED', error: 'broken' });
  expect(failed.inspect().status).toBe(TraversalRunnerStatus.FAILED);
});
