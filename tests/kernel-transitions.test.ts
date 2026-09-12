import { TraversalKernel } from '../src/core/TraversalKernel';
import type { CallbackReply, VisitOrder } from '../src/core/effects/types';
import type { Outcome } from '../src/core/effects/types';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import type { Ref } from '../src/core/graph/types';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { TestGraph } from './helpers/graph-fixtures';

function makeKernel(
  visitorCount = 1,
  options: { includeCompletion?: boolean; iterateOver?: VisitOrder[] } = {},
) {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const stateBridge = {
    status: TraversalRunnerStatus.INITIAL,
    traversalRootVertexRef: null,
    subtreeTraversalDisabledRefs: new Set<Ref<TestGraph>>(),
    visitorsState: {},
  };
  const kernel = new TraversalKernel<TestGraph>({
    kind: 'dag',
    execution: 'sync',
    sourceMode: 'graph',
    container,
    stateBridge,
    visitorMetadata: {
      ON_READY: Array.from({ length: visitorCount }, (_, addedIndex) => ({
        addedIndex,
        priority: 100,
        resolutionStyle: Style.SEQUENTIAL,
      })),
      ...(options.includeCompletion
        ? {
            ON_COMPLETE: [
              {
                addedIndex: 0,
                priority: 100,
                resolutionStyle: Style.SEQUENTIAL,
              },
            ],
          }
        : {}),
    },
    iterableConfig: {
      iterateOver: options.iterateOver ?? ['ON_READY'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasSorter: false,
    hasHintIds: false,
    concurrency: 1,
  });
  return { kernel, container, stateBridge };
}

function rootReply(
  requestId: number,
  outcome: Outcome<MakeVertexResult<TestGraph>>,
): Extract<CallbackReply<TestGraph>, { kind: 'MAKE_ROOT' }> {
  return { requestId, kind: 'MAKE_ROOT', outcome };
}

test('steps from an owned root request through visit and event backpressure', () => {
  const { kernel, container } = makeKernel();
  const root = kernel.poll('drive');
  expect(root.kind).toBe('CALL');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  expect(root.call).toMatchObject({
    kind: 'MAKE_ROOT',
    owner: { kind: 'root', id: 1, epoch: 0 },
  });

  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: {
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: [] },
      },
    }),
  );
  const visit = kernel.poll('drive');
  expect(visit.kind).toBe('CALL');
  if (visit.kind !== 'CALL') throw new Error('Expected visitor call');
  expect(visit.call).toMatchObject({ kind: 'VISIT', order: 'ON_READY' });

  kernel.submit({
    requestId: visit.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  const event = kernel.poll('drive');
  expect(event.kind).toBe('EVENT');
  if (event.kind !== 'EVENT') throw new Error('Expected event');
  expect(event.event.vertex.getData()).toBe('root');
  expect(kernel.inspect().frames).toEqual([]);
  expect(kernel.poll('drive')).toEqual(event);

  kernel.acknowledgeEvent(event.boundaryId);
  expect(kernel.poll('drive')).toEqual({ kind: 'FINISHED' });
  expect(container.resolvedGraph.getRoot()).not.toBeNull();
});

test('validates request ids and reply kinds exactly once', () => {
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');

  expect(() =>
    kernel.submit({
      requestId: root.call.requestId,
      kind: 'VISIT',
      outcome: { ok: true, value: undefined },
    }),
  ).toThrow(/kind/i);
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: { vertexContent: null },
    }),
  );
  expect(() =>
    kernel.submit(
      rootReply(root.call.requestId, {
        ok: true,
        value: { vertexContent: null },
      }),
    ),
  ).toThrow(/already submitted/i);
  expect(() =>
    kernel.submit(
      rootReply(999, { ok: true, value: { vertexContent: null } }),
    ),
  ).toThrow(/request/i);
});

test('retains a thrown undefined value in terminal failure state', () => {
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(rootReply(root.call.requestId, { ok: false, error: undefined }));

  expect(kernel.poll('drive')).toEqual({ kind: 'FAILED', error: undefined });
  expect(kernel.getFailure()).toEqual({ error: undefined });
  expect(kernel.getStatus()).toBe(TraversalRunnerStatus.FAILED);
  expect(kernel.poll('drive')).toEqual({ kind: 'FAILED', error: undefined });
});

test('returns WAIT for an outstanding callback and terminal state for an empty root', () => {
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  expect(kernel.poll('drive')).toEqual({ kind: 'WAIT' });
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: { vertexContent: null },
    }),
  );
  expect(kernel.poll('drive')).toEqual({ kind: 'FINISHED' });
});

test('commits a halting command batch once and resumes at the next visitor', () => {
  const { kernel } = makeKernel(2);
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: { vertexContent: { $d: 'root', $c: [] } },
    }),
  );
  const first = kernel.poll('drive');
  if (first.kind !== 'CALL' || first.call.kind !== 'VISIT') {
    throw new Error('Expected first visitor call');
  }
  kernel.submit({
    requestId: first.call.requestId,
    kind: 'VISIT',
    outcome: {
      ok: true,
      value: {
        commands: [
          {
            commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
            commandArguments: { vertexVisitorsChainState: 'once' },
          },
          { commandName: Command.HALT_TRAVERSAL },
        ],
      },
    },
  });

  expect(kernel.poll('drive')).toEqual({ kind: 'HALTED' });
  expect(kernel.inspect().chains[0]).toMatchObject({
    phase: 'paused',
    position: 1,
    waitingFor: 'none',
  });
  kernel.resume();
  const second = kernel.poll('drive');
  if (second.kind !== 'CALL' || second.call.kind !== 'VISIT') {
    throw new Error('Expected second visitor call');
  }
  expect(second.call.recordIndex).toBe(1);
  expect(second.call.metadata).toMatchObject({
    curVertexVisitorVisitIndex: 1,
    vertexVisitorsChainState: 'once',
  });
});

test('disables an unexpanded subtree without failing its current chain', () => {
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: { vertexContent: { $d: 'root', $c: ['never-resolved'] } },
    }),
  );
  const visit = kernel.poll('drive');
  if (visit.kind !== 'CALL' || visit.call.kind !== 'VISIT') {
    throw new Error('Expected visitor call');
  }
  kernel.submit({
    requestId: visit.call.requestId,
    kind: 'VISIT',
    outcome: {
      ok: true,
      value: { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] },
    },
  });

  const event = kernel.poll('drive');
  expect(event.kind).toBe('EVENT');
  if (event.kind !== 'EVENT') throw new Error('Expected event');
  kernel.acknowledgeEvent(event.boundaryId);
  expect(kernel.poll('drive')).toEqual({ kind: 'FINISHED' });
});

test('drains an already started chain before reporting HALTED', () => {
  const { kernel } = makeKernel(2);
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: { vertexContent: { $d: 'root', $c: [] } },
    }),
  );
  const first = kernel.poll('drive');
  if (first.kind !== 'CALL' || first.call.kind !== 'VISIT') {
    throw new Error('Expected first visitor call');
  }

  kernel.requestHalt();
  kernel.submit({
    requestId: first.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  const second = kernel.poll('drain');
  if (second.kind !== 'CALL' || second.call.kind !== 'VISIT') {
    throw new Error('Expected draining visitor call');
  }
  expect(second.call.recordIndex).toBe(1);

  kernel.submit({
    requestId: second.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  expect(kernel.poll('drain')).toEqual({ kind: 'HALTED' });
  expect(kernel.inspect()).toMatchObject({
    status: TraversalRunnerStatus.HALTED,
    chains: [],
    pendingRequests: [],
    pendingEventBoundaryCount: 1,
  });
});

test('does not hide a submitted live failure behind a halt request', () => {
  const failure = { reason: 'visitor failed while halting' };
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: { vertexContent: { $d: 'root', $c: [] } },
    }),
  );
  const visit = kernel.poll('drive');
  if (visit.kind !== 'CALL' || visit.call.kind !== 'VISIT') {
    throw new Error('Expected visitor call');
  }

  kernel.requestHalt();
  kernel.submit({
    requestId: visit.call.requestId,
    kind: 'VISIT',
    outcome: { ok: false, error: failure },
  });
  expect(kernel.poll('drain')).toEqual({ kind: 'FAILED', error: failure });
});

test('delivers an event committed from an earlier reply before a later failure', () => {
  const failure = { reason: 'later sibling failed' };
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: {
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: ['a', 'b'] },
      },
    }),
  );
  const rootVisit = kernel.poll('drive');
  if (rootVisit.kind !== 'CALL' || rootVisit.call.kind !== 'VISIT') {
    throw new Error('Expected root visitor call');
  }
  kernel.submit({
    requestId: rootVisit.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  const rootEvent = kernel.poll('drive');
  if (rootEvent.kind !== 'EVENT') throw new Error('Expected root event');
  kernel.acknowledgeEvent(rootEvent.boundaryId);

  const makeA = kernel.poll('drive');
  if (makeA.kind !== 'CALL' || makeA.call.kind !== 'MAKE_VERTEX') {
    throw new Error('Expected first child request');
  }
  kernel.submit({
    requestId: makeA.call.requestId,
    kind: 'MAKE_VERTEX',
    outcome: {
      ok: true,
      value: { vertexId: 'a', vertexContent: { $d: 'a', $c: [] } },
    },
  });
  const makeB = kernel.poll('drive');
  if (makeB.kind !== 'CALL' || makeB.call.kind !== 'MAKE_VERTEX') {
    throw new Error('Expected second child request');
  }
  kernel.submit({
    requestId: makeB.call.requestId,
    kind: 'MAKE_VERTEX',
    outcome: {
      ok: true,
      value: { vertexId: 'b', vertexContent: { $d: 'b', $c: [] } },
    },
  });
  const visitA = kernel.poll('drive');
  if (visitA.kind !== 'CALL' || visitA.call.kind !== 'VISIT') {
    throw new Error('Expected first child visitor call');
  }
  const visitB = kernel.poll('drive');
  if (visitB.kind !== 'CALL' || visitB.call.kind !== 'VISIT') {
    throw new Error('Expected second child visitor call');
  }

  kernel.submit({
    requestId: visitA.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  kernel.submit({
    requestId: visitB.call.requestId,
    kind: 'VISIT',
    outcome: { ok: false, error: failure },
  });

  const event = kernel.poll('drive');
  expect(event.kind).toBe('EVENT');
  if (event.kind !== 'EVENT') throw new Error('Expected surviving event');
  expect(event.event.vertex.getData()).toBe('a');
  kernel.acknowledgeEvent(event.boundaryId);
  expect(kernel.poll('drive')).toEqual({ kind: 'FAILED', error: failure });
});

test('discards a reply whose chain owner was invalidated by deletion', () => {
  const { kernel } = makeKernel(1, {
    includeCompletion: true,
    iterateOver: [],
  });
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: {
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: ['a', 'b'] },
      },
    }),
  );
  const rootVisit = kernel.poll('drive');
  if (rootVisit.kind !== 'CALL' || rootVisit.call.kind !== 'VISIT') {
    throw new Error('Expected root visitor call');
  }
  kernel.submit({
    requestId: rootVisit.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  const makeA = kernel.poll('drive');
  if (makeA.kind !== 'CALL' || makeA.call.kind !== 'MAKE_VERTEX') {
    throw new Error('Expected first child request');
  }
  kernel.submit({
    requestId: makeA.call.requestId,
    kind: 'MAKE_VERTEX',
    outcome: {
      ok: true,
      value: {
        vertexId: 'a',
        dependsOn: ['root'],
        vertexContent: { $d: 'a', $c: [] },
      },
    },
  });
  const makeB = kernel.poll('drive');
  if (makeB.kind !== 'CALL' || makeB.call.kind !== 'MAKE_VERTEX') {
    throw new Error('Expected second child request');
  }
  kernel.submit({
    requestId: makeB.call.requestId,
    kind: 'MAKE_VERTEX',
    outcome: {
      ok: true,
      value: {
        vertexId: 'b',
        dependsOn: ['a'],
        vertexContent: { $d: 'b', $c: [] },
      },
    },
  });
  const visitA = kernel.poll('drive');
  if (visitA.kind !== 'CALL' || visitA.call.kind !== 'VISIT') {
    throw new Error('Expected A visitor call');
  }
  kernel.submit({
    requestId: visitA.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  const visitB = kernel.poll('drive');
  if (visitB.kind !== 'CALL' || visitB.call.kind !== 'VISIT') {
    throw new Error('Expected B visitor call');
  }
  const completeA = kernel.poll('drive');
  if (completeA.kind !== 'CALL' || completeA.call.kind !== 'VISIT') {
    throw new Error('Expected A completion visitor call');
  }
  expect(completeA.call.order).toBe('ON_COMPLETE');

  kernel.submit({
    requestId: completeA.call.requestId,
    kind: 'VISIT',
    outcome: {
      ok: true,
      value: { commands: [{ commandName: Command.DELETE_VERTEX }] },
    },
  });
  kernel.poll('drive');
  kernel.submit({
    requestId: visitB.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  kernel.poll('drive');

  expect(
    kernel
      .inspect()
      .pendingRequests.some(
        (request) => request.requestId === visitB.call.requestId,
      ),
  ).toBe(false);
  expect(
    kernel
      .inspect()
      .chains.some((chain) => chain.owner.id === visitB.call.owner.id),
  ).toBe(false);
});
