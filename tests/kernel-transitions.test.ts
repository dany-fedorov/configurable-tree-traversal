import { MutableValueReference } from '../src/core/CTTRef';
import type {
  CallbackReply,
  Outcome,
  TreeOrDagVisitorPhase,
} from '../src/core/effects/types';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { InternalVertexRef } from '../src/core/graph/types';
import type { GraphScheduling } from '../src/core/scheduling/GraphScheduling';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';
import type { TestGraph } from './helpers/graph-fixtures';

function makeKernel(
  visitorCount = 1,
  options: {
    includeCompletion?: boolean;
    iterateOver?: TreeOrDagVisitorPhase[];
  } = {},
) {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const stateBridge = {
    status: TraversalRunnerStatus.NOT_STARTED,
    traversalRootVertexRef: null,
    subtreeTraversalDisabledRefs: new Set<InternalVertexRef<TestGraph>>(),
    visitorsState: {},
  };
  const kernel = new TraversalKernel<TestGraph>({
    kind: 'dag',
    execution: 'sync',
    sourceMode: 'graph',
    container,
    stateBridge,
    visitorMetadata: {
      ON_WORK_READY: Array.from(
        { length: visitorCount },
        (_, phaseRegistrationInsertionIndex) => ({
          phaseRegistrationInsertionIndex,
          descendingExecutionPriorityWithinGroup: 100,
          visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
        }),
      ),
      ...(options.includeCompletion
        ? {
            ON_SUBGRAPH_COMPLETION_READY: [
              {
                phaseRegistrationInsertionIndex: 0,
                descendingExecutionPriorityWithinGroup: 100,
                visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
              },
            ],
          }
        : {}),
    },
    iterableConfig: {
      iterateOver: options.iterateOver ?? ['ON_WORK_READY'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasChildHintsListTransformer: false,
    hasChildHintVertexIdResolver: false,
    maxConcurrentCallbackInvocations: 1,
  });
  return { kernel, container, stateBridge };
}

function acknowledgeObservation(
  kernel: TraversalKernel<TestGraph>,
  order: TreeOrDagVisitorPhase,
) {
  const observation = kernel.poll('drive');
  expect(observation).toMatchObject({ kind: 'EVENT', event: { order } });
  if (observation.kind !== 'EVENT') throw new Error('Expected observation');
  kernel.acknowledgeEvent(observation.boundaryId);
}

function makeBreadthKernel() {
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const stateBridge = {
    status: TraversalRunnerStatus.NOT_STARTED,
    traversalRootVertexRef: null,
    subtreeTraversalDisabledRefs: new Set<InternalVertexRef<TestGraph>>(),
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
      iterateOver: ['AT_LEVEL_ORDER_VERTEX'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasChildHintsListTransformer: false,
    hasChildHintVertexIdResolver: false,
    maxConcurrentCallbackInvocations: 1,
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
      status: TraversalRunnerStatus.NOT_STARTED,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {},
    iterableConfig: {
      iterateOver: [
        'BEFORE_CHILD_EXPANSION',
        'AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES',
        'AFTER_CHILD_SUBTREES',
      ],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: {
      visitAfterChildIndices: { indices: [0] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [0] },
      alsoVisitAfterOnlyChild: true,
      allowBoundaryVisitsAfterOmittedChildSlots: true,
    },
    hasChildHintsListTransformer: false,
    hasChildHintVertexIdResolver: false,
    maxConcurrentCallbackInvocations: 1,
  });
}

function rootReply(
  requestId: number,
  outcome: Outcome<MakeVertexResult<TestGraph>>,
): Extract<CallbackReply<TestGraph>, { kind: 'MAKE_ROOT' }> {
  return { requestId, kind: 'MAKE_ROOT', outcome };
}

function invokePrivate<R>(target: object, name: string, ...args: unknown[]): R {
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
  expect(kernel.captureProgressSnapshot().discovery).toEqual({
    timing: 'incrementalDuringTraversal',
    complete: false,
  });
  expect(kernel.captureProgressSnapshot().counts.retainedLiveVertices).toBe(0);
  const root = kernel.poll('drive');
  expect(root.kind).toBe('CALL');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  expect(root.call).toMatchObject({
    kind: 'MAKE_ROOT',
    owner: {
      ownerKind: 'rootResolution',
      runnerLocalOwnerId: 1,
      validityGeneration: 0,
    },
  });

  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: {
        vertexId: 'root',
        vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
      },
    }),
  );
  const visit = kernel.poll('drive');
  expect(visit.kind).toBe('CALL');
  if (visit.kind !== 'CALL') throw new Error('Expected visitor call');
  expect(visit.call).toMatchObject({ kind: 'VISIT', order: 'ON_WORK_READY' });

  kernel.submit({
    requestId: visit.call.requestId,
    kind: 'VISIT',
    outcome: { ok: true, value: undefined },
  });
  const event = kernel.poll('drive');
  expect(event.kind).toBe('EVENT');
  if (event.kind !== 'EVENT') throw new Error('Expected event');
  expect(event.event.vertex.getVertexData()).toBe('root');
  expect(kernel.captureExecutionSnapshot().vertexTraversalFrames).toEqual([]);
  expect(kernel.poll('drive')).toEqual(event);

  kernel.acknowledgeEvent(event.boundaryId);
  acknowledgeObservation(kernel, 'ON_SUBGRAPH_COMPLETION_READY');
  expect(kernel.poll('drive')).toEqual({ kind: 'FINISHED' });
  expect(container.liveResolvedGraphView.getRoot()).not.toBeNull();
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
    deliveredEventKinds: ['subgraphCompletionCommitted'],
    admittedVisitorCallbackPhases: { include: ['ON_WORK_READY'] },
  });
  const configured = kernel.captureExecutionSnapshot().executionOptions;
  kernel.resume({});
  expect(kernel.captureExecutionSnapshot().executionOptions).toEqual(
    configured,
  );
  kernel.resume({
    admittedVisitorCallbackPhases: 'all',
  });
  expect(kernel.captureExecutionSnapshot().executionOptions).toEqual({
    deliveredEventKinds: ['subgraphCompletionCommitted'],
    admittedVisitorCallbackPhases: 'all',
  });
});

test.each(['advanceChains', 'admitEligibleVisit', 'admitExpansion'] as const)(
  'converts a thrown %s transition to FAILED',
  (method) => {
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
  },
);

test('private invalidation removes frames and boundaries and is idempotent', () => {
  const { kernel } = makeKernel();
  const vertexHandle = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'removed', $childDiscoveryHints: [] }),
  );
  const owner = {
    ownerKind: 'vertexTraversalFrame' as const,
    runnerLocalOwnerId: 20,
    validityGeneration: 0,
  };
  const fields = kernel as unknown as {
    boundaries: Array<{
      event: { vertexHandle: InternalVertexRef<TestGraph> };
    }>;
    frames: Map<
      number,
      { owner: typeof owner; ref: InternalVertexRef<TestGraph> }
    >;
    pendingRequests: Map<
      number,
      { call: { owner: typeof owner }; submitted: boolean }
    >;
  };
  fields.frames.set(owner.runnerLocalOwnerId, { owner, ref: vertexHandle });
  fields.boundaries.push({ event: { vertexHandle } });
  invokePrivate<void>(kernel, 'invalidateRefs', new Set([vertexHandle]), {
    ownerKind: 'vertexPhaseVisitorChain',
    runnerLocalOwnerId: 99,
    validityGeneration: 0,
  });
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
  const vertexHandle = new MutableValueReference(
    new Vertex<TestGraph>({ $vertexData: 'parent', $childDiscoveryHints: [] }),
  );
  const fields = kernel as unknown as {
    breadthFirstPolicy: {
      enqueueExpansion(
        owner: {
          ownerKind: 'vertexTraversalFrame';
          runnerLocalOwnerId: number;
          validityGeneration: number;
        },
        ref: InternalVertexRef<TestGraph>,
        depth: number,
      ): void;
    };
  };
  fields.breadthFirstPolicy.enqueueExpansion(
    {
      ownerKind: 'vertexTraversalFrame',
      runnerLocalOwnerId: 2,
      validityGeneration: 0,
    },
    vertexHandle,
    0,
  );
  expect(kernel.captureExecutionSnapshot().vertexTraversalFrames).toEqual([
    expect.objectContaining({
      vertexReferenceIdentity: vertexHandle.getReferenceIdentity(),
      stage: 'resolvingChildVertexContent',
    }),
  ]);

  const scheduling = (
    kernel as unknown as {
      scheduling: {
        eligible: Array<{ ref: InternalVertexRef<TestGraph>; order: string }>;
      };
    }
  ).scheduling;
  scheduling.eligible.push({
    ref: vertexHandle,
    order: 'ON_SUBGRAPH_COMPLETION_READY',
  });
  expect(
    kernel.captureExecutionSnapshot().dependencyEligiblePhaseVisits,
  ).toEqual([
    {
      vertexReferenceIdentity: vertexHandle.getReferenceIdentity(),
      visitorPhase: 'AT_LEVEL_ORDER_VERTEX',
    },
  ]);
});

test('kernel inspection reports a depth-first child-wait frame index', () => {
  const kernel = makeDepthKernel();
  const vertexHandle = new MutableValueReference(
    new Vertex<TestGraph>({
      $vertexData: 'parent',
      $childDiscoveryHints: ['child'],
    }),
  );
  const policy = (
    kernel as unknown as {
      depthFirstPolicy: {
        push(
          owner: {
            ownerKind: 'vertexTraversalFrame';
            runnerLocalOwnerId: number;
            validityGeneration: number;
          },
          ref: InternalVertexRef<TestGraph>,
          depth: number,
        ): void;
        getFrames(): Array<{ stage: string; nextChild: number }>;
      };
    }
  ).depthFirstPolicy;
  policy.push(
    {
      ownerKind: 'vertexTraversalFrame',
      runnerLocalOwnerId: 2,
      validityGeneration: 0,
    },
    vertexHandle,
    0,
  );
  const frame = policy.getFrames()[0]!;
  frame.stage = 'waitingForChildResolution';
  frame.nextChild = 1;
  expect(
    kernel.captureExecutionSnapshot().vertexTraversalFrames[0]
      ?.pendingChildHintIndices,
  ).toEqual([0]);
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
    const owner = {
      ownerKind: 'vertexTraversalFrame' as const,
      runnerLocalOwnerId: 20,
      validityGeneration: 0,
    };
    const vertexHandle = new MutableValueReference(
      new Vertex<TestGraph>({
        $vertexData: 'parent',
        $childDiscoveryHints: ['child'],
      }),
    );
    const fields = kernel as unknown as {
      frames: Map<number, object>;
      pendingRequests: Map<number, object>;
    };
    fields.frames.set(owner.runnerLocalOwnerId, {
      owner,
      ref: vertexHandle,
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
  const scheduling = (
    kernel as unknown as { scheduling: GraphScheduling<TestGraph> }
  ).scheduling;
  const vertexHandle = scheduling.acceptRoot({
    vertexId: 'incomplete',
    vertexContent: { $vertexData: 'incomplete', $childDiscoveryHints: [] },
  })!;
  scheduling.takeReady();
  scheduling.markPreVisited(vertexHandle);
  setPrivate(kernel, 'rootRequested', true);
  expect(kernel.poll('drive')).toMatchObject({
    kind: 'FAILED',
    error: expect.objectContaining({
      message: expect.stringMatching(/incomplete work/),
    }),
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
    kernel.submit(rootReply(999, { ok: true, value: { vertexContent: null } })),
  ).toThrow(/request/i);
});

test('retains a thrown undefined value in terminal failure state', () => {
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, { ok: false, error: undefined }),
  );

  expect(kernel.poll('drive')).toEqual({ kind: 'FAILED', error: undefined });
  expect(kernel.getFailure()).toEqual({ error: undefined });
  expect(kernel.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.FAILED,
  );
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
      value: {
        vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
      },
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
            commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
            commandArguments: { phaseChainState: 'once' },
          },
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      },
    },
  });

  // Batch commit is synchronous: observe its real boundary before forwarding
  // to the existing implementation, without changing command execution.
  const originalCommit = (
    kernel as unknown as { commitCommands(...args: unknown[]): unknown }
  ).commitCommands;
  const commitSnapshots: ReturnType<
    TraversalKernel<TestGraph>['captureExecutionSnapshot']
  >[] = [];
  setPrivate(kernel, 'commitCommands', (...args: unknown[]) => {
    commitSnapshots.push(kernel.captureExecutionSnapshot());
    return originalCommit.apply(kernel, args);
  });

  expect(kernel.poll('drive')).toEqual({ kind: 'SUSPENDED' });
  expect(
    kernel.captureExecutionSnapshot().vertexPhaseVisitorChains[0],
  ).toMatchObject({
    state: 'pausedAtCommandBoundary',
    visitorCallbackIndexInPhaseChain: 1,
    pendingCallbackOrCommandBatch: 'none',
  });
  expect(commitSnapshots).toMatchObject([
    {
      vertexPhaseVisitorChains: [
        {
          state: 'active',
          pendingCallbackOrCommandBatch: 'commandBatchCommit',
        },
      ],
    },
  ]);

  kernel.resume();
  const second = kernel.poll('drive');
  if (second.kind !== 'CALL' || second.call.kind !== 'VISIT') {
    throw new Error('Expected second visitor call');
  }
  expect(second.call.recordIndex).toBe(1);
  expect(second.call.metadata).toMatchObject({
    visitorCallbackIndexInPhaseChain: 1,
    currentVertexPhaseChainState: 'once',
  });
});

test('disables an unexpanded subtree without failing its current chain', () => {
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: {
        vertexContent: {
          $vertexData: 'root',
          $childDiscoveryHints: ['never-resolved'],
        },
      },
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
      value: {
        commands: [
          {
            commandName: Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
          },
        ],
      },
    },
  });

  const event = kernel.poll('drive');
  expect(event.kind).toBe('EVENT');
  if (event.kind !== 'EVENT') throw new Error('Expected event');
  kernel.acknowledgeEvent(event.boundaryId);
  acknowledgeObservation(kernel, 'ON_SUBGRAPH_COMPLETION_READY');
  expect(kernel.poll('drive')).toEqual({ kind: 'FINISHED' });
});

test('drains an already started chain before reporting HALTED', () => {
  const { kernel } = makeKernel(2);
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: {
        vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
      },
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
  expect(kernel.captureExecutionSnapshot()).toMatchObject({
    pauseRequested: true,
    vertexPhaseVisitorChains: [],
    pendingCallbackRequests: [],
    unacknowledgedCommittedEventBoundaryCount: 1,
  });
  kernel.acknowledgeEvent(event.boundaryId);
  expect(kernel.poll('drain')).toEqual({ kind: 'SUSPENDED' });
  expect(kernel.captureExecutionSnapshot().traversalLifecycleStatus).toBe(
    TraversalRunnerStatus.SUSPENDED,
  );
});

test('does not hide a submitted live failure behind a halt request', () => {
  const failure = { reason: 'visitor failed while halting' };
  const { kernel } = makeKernel();
  const root = kernel.poll('drive');
  if (root.kind !== 'CALL') throw new Error('Expected root call');
  kernel.submit(
    rootReply(root.call.requestId, {
      ok: true,
      value: {
        vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
      },
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
        vertexContent: {
          $vertexData: 'root',
          $childDiscoveryHints: ['a', 'b'],
        },
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
      value: {
        vertexId: 'a',
        vertexContent: { $vertexData: 'a', $childDiscoveryHints: [] },
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
        vertexContent: { $vertexData: 'b', $childDiscoveryHints: [] },
      },
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
  expect(event.event.vertex.getVertexData()).toBe('a');
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
        vertexContent: {
          $vertexData: 'root',
          $childDiscoveryHints: ['a', 'b'],
        },
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
  acknowledgeObservation(kernel, 'ON_WORK_READY');
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
        workWaitsForWorkOf: ['root'],
        vertexContent: { $vertexData: 'a', $childDiscoveryHints: [] },
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
        workWaitsForWorkOf: ['a'],
        vertexContent: { $vertexData: 'b', $childDiscoveryHints: [] },
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
  acknowledgeObservation(kernel, 'ON_WORK_READY');
  const visitB = kernel.poll('drive');
  if (visitB.kind !== 'CALL' || visitB.call.kind !== 'VISIT') {
    throw new Error('Expected B visitor call');
  }
  const completeA = kernel.poll('drive');
  if (completeA.kind !== 'CALL' || completeA.call.kind !== 'VISIT') {
    throw new Error('Expected A completion visitor call');
  }
  expect(completeA.call.order).toBe('ON_SUBGRAPH_COMPLETION_READY');

  kernel.submit({
    requestId: completeA.call.requestId,
    kind: 'VISIT',
    outcome: {
      ok: true,
      value: {
        commands: [
          {
            commandName:
              Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
          },
        ],
      },
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
      .captureExecutionSnapshot()
      .pendingCallbackRequests.some(
        (request) => request.callbackRequestId === visitB.call.requestId,
      ),
  ).toBe(false);
  expect(
    kernel
      .captureExecutionSnapshot()
      .vertexPhaseVisitorChains.some(
        (chain) =>
          chain.owner.runnerLocalOwnerId ===
          visitB.call.owner.runnerLocalOwnerId,
      ),
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
        vertexContent: {
          $vertexData: 'root',
          $childDiscoveryHints: ['a', 'b'],
        },
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
      value: {
        vertexId: 'a',
        vertexContent: { $vertexData: 'a', $childDiscoveryHints: [] },
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
        vertexContent: { $vertexData: 'b', $childDiscoveryHints: [] },
      },
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
  expect(first.event.vertex.getVertexData()).toBe('a');
  expect(
    kernel.captureExecutionSnapshot().unacknowledgedCommittedEventBoundaryCount,
  ).toBe(2);
  expect(kernel.poll('drain')).toEqual(first);
  kernel.acknowledgeEvent(first.boundaryId);
  expect(
    kernel.captureExecutionSnapshot().unacknowledgedCommittedEventBoundaryCount,
  ).toBe(1);

  const second = kernel.poll('drain');
  if (second.kind !== 'EVENT')
    throw new Error('Expected second retained event');
  expect(second.boundaryId).not.toBe(first.boundaryId);
  expect(second.event.vertex.getVertexData()).toBe('b');
  kernel.acknowledgeEvent(second.boundaryId);
  expect(
    kernel.captureExecutionSnapshot().unacknowledgedCommittedEventBoundaryCount,
  ).toBe(0);
  expect(kernel.poll('drain')).toEqual({ kind: 'SUSPENDED' });
});
