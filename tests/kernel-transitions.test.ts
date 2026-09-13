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
import { CTTRef } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';

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

function makeBreadthKernel() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const stateBridge = {
    status: TraversalRunnerStatus.INITIAL,
    traversalRootVertexRef: null,
    subtreeTraversalDisabledRefs: new Set<Ref<TestGraph>>(),
    visitorsState: {},
    queue: [],
    queueIndex: 0,
  };
  const kernel = new TraversalKernel<TestGraph>({
    kind: 'breadth-first',
    execution: 'sync',
    sourceMode: 'tree',
    container,
    stateBridge,
    visitorMetadata: {},
    iterableConfig: {
      iterateOver: ['LEVEL_ORDER'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasSorter: false,
    hasHintIds: false,
    concurrency: 1,
  });
  return kernel;
}

function makeDepthKernel() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  return new TraversalKernel<TestGraph>({
    kind: 'depth-first',
    execution: 'sync',
    sourceMode: 'tree',
    container,
    stateBridge: {
      status: TraversalRunnerStatus.INITIAL,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {},
    iterableConfig: {
      iterateOver: ['PRE_ORDER', 'IN_ORDER', 'POST_ORDER'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: {
      visitParentAfterChildren: 0,
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: 0,
      visitUpOneChildParents: true,
      considerVisitAfterNullContentVertices: true,
    },
    hasSorter: false,
    hasHintIds: false,
    concurrency: 1,
  });
}

function rootReply(
  requestId: number,
  outcome: Outcome<MakeVertexResult<TestGraph>>,
): Extract<CallbackReply<TestGraph>, { kind: 'MAKE_ROOT' }> {
  return { requestId, kind: 'MAKE_ROOT', outcome };
}

function invokePrivate<R>(
  target: object,
  name: string,
  ...args: unknown[]
): R {
  const method = (target as unknown as Record<string, unknown>)[name] as (
    ...values: unknown[]
  ) => R;
  return method.apply(target, args);
}

function setPrivate(target: object, name: string, value: unknown): void {
  (target as unknown as Record<string, unknown>)[name] = value;
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

test('reports public request, halt, event, and failed-resume guards', () => {
  const { kernel, stateBridge } = makeKernel();
  expect(kernel.isHaltRequested()).toBe(false);
  expect(kernel.isRequestEligible(999, 'drive')).toBe(false);
  expect(() => kernel.acknowledgeEvent(999)).toThrow(/unknown event/i);
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  expect(kernel.isRequestEligible(root.call.requestId, 'drive')).toBe(true);
  expect(kernel.isRequestEligible(root.call.requestId, 'drain')).toBe(false);
  invokePrivate<void>(kernel, 'invalidateOwner', root.call.owner);
  expect(kernel.isRequestEligible(root.call.requestId, 'drive')).toBe(false);
  (
    kernel as unknown as {
      invalidOwners: Set<string>;
    }
  ).invalidOwners.clear();
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: false,
      error: new Error('failed root'),
    }),
  );
  expect(kernel.isRequestEligible(root.call.requestId, 'drive')).toBe(false);
  expect(kernel.poll('drive')).toMatchObject({ kind: 'FAILED' });
  kernel.resume();
  expect(stateBridge.status).toBe(TraversalRunnerStatus.FAILED);
});

test('resume copies every optional filter shape without retaining caller arrays', () => {
  const { kernel } = makeKernel();
  kernel.resume({});
  kernel.resume({
    iterateOver: ['ON_COMPLETE'],
    enableVisitorFunctionsFor: ['ON_READY'],
    disableVisitorFunctionsFor: ['ON_COMPLETE'],
  });
  const configured = kernel.inspect().iterableConfig;
  kernel.resume({});
  expect(kernel.inspect().iterableConfig).toEqual(configured);
  kernel.resume({
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
  });
  expect(kernel.inspect().iterableConfig).toMatchObject({
    enableVisitorFunctionsFor: null,
    disableVisitorFunctionsFor: null,
  });
});

test.each([
  'advanceChains',
  'admitEligibleVisit',
  'admitExpansion',
] as const)('converts a thrown %s transition to FAILED', (method) => {
  const { kernel } = makeKernel();
  if (method === 'admitExpansion') {
    setPrivate(kernel, 'admitEligibleVisit', () => false);
  }
  setPrivate(kernel, method, () => {
    throw new Error(`${method} failed`);
  });
  expect(kernel.poll('drive')).toMatchObject({
    kind: 'FAILED',
    error: expect.objectContaining({ message: `${method} failed` }),
  });
});

test('private invalidation removes frames and boundaries and is idempotent', () => {
  const { kernel } = makeKernel();
  const vertexRef = new CTTRef(
    new Vertex<TestGraph>({ $d: 'removed', $c: [] }),
  );
  const owner = { kind: 'frame' as const, id: 20, epoch: 0 };
  const fields = kernel as unknown as {
    boundaries: Array<{ event: { vertexRef: Ref<TestGraph> } }>;
    frames: Map<number, { owner: typeof owner; ref: Ref<TestGraph> }>;
    pendingRequests: Map<
      number,
      { call: { owner: typeof owner }; submitted: boolean }
    >;
  };
  fields.frames.set(owner.id, { owner, ref: vertexRef });
  fields.boundaries.push({ event: { vertexRef } });
  invokePrivate<void>(
    kernel,
    'invalidateRefs',
    new Set([vertexRef]),
    { kind: 'chain', id: 99, epoch: 0 },
  );
  expect(fields.frames.size).toBe(0);
  expect(fields.boundaries).toEqual([]);

  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  invokePrivate<void>(kernel, 'fail', new Error('forced'));
  expect(fields.pendingRequests.size).toBe(1);
  invokePrivate<void>(kernel, 'fail', new Error('ignored'));
  expect(kernel.getFailure()).toMatchObject({
    error: expect.objectContaining({ message: 'forced' }),
  });
});

test('detects a running chain when deciding whether a halt can settle', () => {
  const { kernel } = makeKernel();
  const fields = kernel as unknown as {
    chains: Map<number, { state: { phase: string } }>;
  };
  fields.chains.set(1, { state: { phase: 'running' } });
  expect(invokePrivate<boolean>(kernel, 'hasRunningChain')).toBe(true);
  setPrivate(kernel, 'advanceChains', () => null);
  kernel.requestHalt();
  expect(kernel.poll('drive')).toEqual({ kind: 'WAIT' });
});

test('kernel inspection maps breadth-first policy frames', () => {
  const kernel = makeBreadthKernel();
  const vertexRef = new CTTRef(
    new Vertex<TestGraph>({ $d: 'parent', $c: [] }),
  );
  const fields = kernel as unknown as {
    breadthFirstPolicy: {
      enqueueExpansion(
        owner: { kind: 'frame'; id: number; epoch: number },
        ref: Ref<TestGraph>,
        depth: number,
      ): void;
    };
  };
  fields.breadthFirstPolicy.enqueueExpansion(
    { kind: 'frame', id: 2, epoch: 0 },
    vertexRef,
    0,
  );
  expect(kernel.inspect().frames).toEqual([
    expect.objectContaining({ vertexRefId: vertexRef.getId(), stage: 'resolve' }),
  ]);

  const scheduling = (
    kernel as unknown as {
      scheduling: { eligible: Array<{ ref: Ref<TestGraph>; order: string }> };
    }
  ).scheduling;
  scheduling.eligible.push({ ref: vertexRef, order: 'ON_COMPLETE' });
  expect(kernel.inspect().readyVisits).toEqual([
    { vertexRefId: vertexRef.getId(), order: 'LEVEL_ORDER' },
  ]);
});

test('kernel inspection reports a depth-first child-wait frame index', () => {
  const kernel = makeDepthKernel();
  const vertexRef = new CTTRef(
    new Vertex<TestGraph>({ $d: 'parent', $c: ['child'] }),
  );
  const policy = (
    kernel as unknown as {
      depthFirstPolicy: {
        push(
          owner: { kind: 'frame'; id: number; epoch: number },
          ref: Ref<TestGraph>,
          depth: number,
        ): void;
        getFrames(): Array<{ stage: string; nextChild: number }>;
      };
    }
  ).depthFirstPolicy;
  policy.push({ kind: 'frame', id: 2, epoch: 0 }, vertexRef, 0);
  const frame = policy.getFrames()[0]!;
  frame.stage = 'child-wait';
  frame.nextChild = 1;
  expect(kernel.inspect().frames[0]?.pendingIndices).toEqual([0]);
});

test('a frame outside an actionable internal stage cannot advance', () => {
  const { kernel } = makeKernel();
  const fields = kernel as unknown as {
    frames: Map<number, { stage: string }>;
  };
  fields.frames.set(1, { stage: 'invalid' });
  expect(invokePrivate(kernel, 'advanceFrames')).toBeNull();
});

test.each(['identify', 'resolve'] as const)(
  'a %s frame waits while its owner has an outstanding callback',
  (stage) => {
    const { kernel } = makeKernel();
    const owner = { kind: 'frame' as const, id: 20, epoch: 0 };
    const vertexRef = new CTTRef(
      new Vertex<TestGraph>({ $d: 'parent', $c: ['child'] }),
    );
    const fields = kernel as unknown as {
      frames: Map<number, object>;
      pendingRequests: Map<number, object>;
    };
    fields.frames.set(owner.id, {
      owner,
      ref: vertexRef,
      stage,
      hints: ['child'],
      nextIdentityIndex: 0,
      nextConsumeIndex: 0,
      hintIds: new Map(),
      contexts: new Map(),
      pendingIndices: new Set(),
      outcomes: new Map(),
    });
    fields.pendingRequests.set(1, {
      call: { owner },
      submitted: false,
    });
    expect(invokePrivate(kernel, 'advanceFrames')).toBeNull();
  },
);

test('drops an orphaned submitted callback reply', () => {
  const { kernel } = makeKernel();
  const fields = kernel as unknown as {
    submittedOutcomes: object[];
  };
  fields.submittedOutcomes.push({
    requestId: 999,
    kind: 'MAKE_ROOT',
    outcome: { ok: true, value: { vertexContent: null } },
  });
  invokePrivate<void>(kernel, 'processSubmittedOutcomes');
  expect(fields.submittedOutcomes).toEqual([]);
});

test('reports an incomplete-work DAG stall without dependency ids', () => {
  const { kernel } = makeKernel();
  const vertexRef = new CTTRef(
    new Vertex<TestGraph>({ $d: 'incomplete', $c: [] }),
  );
  setPrivate(kernel, 'rootRequested', true);
  setPrivate(kernel, 'scheduling', {
    inspectEligible: () => [],
    getStall: () => ({ dependencies: [], incomplete: [vertexRef] }),
    takeEligible: () => null,
  });
  expect(kernel.poll('drive')).toMatchObject({
    kind: 'FAILED',
    error: expect.objectContaining({ message: expect.stringMatching(/incomplete work/) }),
  });
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
  const event = kernel.poll('drain');
  if (event.kind !== 'EVENT') throw new Error('Expected retained event');
  expect(kernel.inspect()).toMatchObject({
    haltRequested: true,
    chains: [],
    pendingRequests: [],
    pendingEventBoundaryCount: 1,
  });
  kernel.acknowledgeEvent(event.boundaryId);
  expect(kernel.poll('drain')).toEqual({ kind: 'HALTED' });
  expect(kernel.inspect().status).toBe(TraversalRunnerStatus.HALTED);
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

test('retains every started-chain event in FIFO order while halting', () => {
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

  kernel.requestHalt();
  kernel.submit({
    requestId: visitA.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  kernel.submit({
    requestId: visitB.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });

  const first = kernel.poll('drain');
  if (first.kind !== 'EVENT') throw new Error('Expected first retained event');
  expect(first.event.vertex.getData()).toBe('a');
  expect(kernel.inspect().pendingEventBoundaryCount).toBe(2);
  expect(kernel.poll('drain')).toEqual(first);
  kernel.acknowledgeEvent(first.boundaryId);
  expect(kernel.inspect().pendingEventBoundaryCount).toBe(1);

  const second = kernel.poll('drain');
  if (second.kind !== 'EVENT') throw new Error('Expected second retained event');
  expect(second.boundaryId).not.toBe(first.boundaryId);
  expect(second.event.vertex.getData()).toBe('b');
  kernel.acknowledgeEvent(second.boundaryId);
  expect(kernel.inspect().pendingEventBoundaryCount).toBe(0);
  expect(kernel.poll('drain')).toEqual({ kind: 'HALTED' });
});
