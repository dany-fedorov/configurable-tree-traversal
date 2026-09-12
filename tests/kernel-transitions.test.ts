import { TraversalKernel } from '../src/core/TraversalKernel';
import type { CallbackReply } from '../src/core/effects/types';
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

function makeKernel(visitorCount = 1) {
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
    },
    iterableConfig: {
      iterateOver: ['ON_READY'],
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
