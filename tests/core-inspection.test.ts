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
        vertexContent: { $d: 'private-root-data', $c: ['private-hint'] },
      },
    },
  });
  const visit = kernel.poll('drive');
  if (visit.kind !== 'CALL' || visit.call.kind !== 'VISIT') {
    throw new Error('Expected visitor call');
  }

  const firstChain = kernel.inspect();
  const secondChain = kernel.inspect();
  expect(firstChain.chains).toHaveLength(1);
  expect(firstChain.chains).not.toBe(secondChain.chains);
  expect(firstChain.chains[0]).not.toBe(secondChain.chains[0]);
  expect(firstChain.chains[0]!.owner).not.toBe(secondChain.chains[0]!.owner);
  expect(Object.isFrozen(firstChain.chains)).toBe(true);
  expect(Object.isFrozen(firstChain.chains[0])).toBe(true);
  expect(Object.isFrozen(firstChain.chains[0]!.owner)).toBe(true);
  expect(Object.isFrozen(firstChain.chains[0]!.config.iterateOver)).toBe(true);
  expect(JSON.stringify(firstChain)).not.toMatch(
    /private-root-data|private-hint|promise/i,
  );
  expect(() => {
    (firstChain.chains[0]!.owner as { id: number }).id = 999;
  }).toThrow(TypeError);
  expect(kernel.inspect().chains[0]!.owner.id).toBe(2);
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

  const firstFrame = kernel.inspect();
  const secondFrame = kernel.inspect();
  expect(firstFrame.frames).toHaveLength(1);
  expect(firstFrame.frames[0]).toMatchObject({
    stage: 'sort',
    pendingIndices: [],
  });
  expect(firstFrame.frames).not.toBe(secondFrame.frames);
  expect(firstFrame.frames[0]).not.toBe(secondFrame.frames[0]);
  expect(firstFrame.frames[0]!.owner).not.toBe(secondFrame.frames[0]!.owner);
  expect(firstFrame.frames[0]!.pendingIndices).not.toBe(
    secondFrame.frames[0]!.pendingIndices,
  );
  expect(Object.isFrozen(firstFrame.frames[0])).toBe(true);
  expect(Object.isFrozen(firstFrame.frames[0]!.owner)).toBe(true);
  expect(Object.isFrozen(firstFrame.frames[0]!.pendingIndices)).toBe(true);
  expect(JSON.stringify(firstFrame)).not.toMatch(
    /private-root-data|private-hint|promise/i,
  );
  expect(() => {
    (firstFrame.frames[0]!.pendingIndices as number[]).push(1);
  }).toThrow(TypeError);
  expect(kernel.inspect().frames[0]!.pendingIndices).toEqual([]);
  expect(kernel.poll('drive')).toEqual({ kind: 'WAIT' });
});
