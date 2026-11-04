import type { CallbackBindings, KernelPort } from '../src/core/effects/types';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { runSync, type SyncDriverState } from '../src/core/drivers/runSync';
import { createCallbackBindings } from '../src/core/drivers/callbackBindings';
import type { TestGraph } from './helpers/graph-fixtures';
import { MutableValueReference } from '../src/core/CTTRef';
import { Vertex } from '../src/core/Vertex';

function setup(
  iterateOver: Array<'ON_WORK_READY' | 'ON_SUBGRAPH_COMPLETION_READY'> = [],
) {
  const kernel = new TraversalKernel<TestGraph>({
    kind: 'dag',
    execution: 'sync',
    sourceMode: 'graph',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    stateBridge: {
      status: TraversalRunnerStatus.NOT_STARTED,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {},
    iterableConfig: {
      iterateOver,
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

test('invokes callbacks synchronously and restores the physical count', () => {
  const kernel = setup(['ON_WORK_READY']);
  const runtime: SyncDriverState = { inFlightInvocationCount: 0 };
  const seen: number[] = [];
  const bindings: CallbackBindings<TestGraph> = {
    invoke(call) {
      seen.push(runtime.inFlightInvocationCount);
      if (call.kind !== 'MAKE_ROOT') throw new Error('Unexpected callback');
      return {
        kind: 'MAKE_ROOT',
        value: {
          vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      };
    },
  };

  const iterator = runSync(kernel, bindings, runtime);
  const event = iterator.next();
  expect(event.done).toBe(false);
  expect(event.value).not.toBeNull();
  expect(seen).toEqual([1]);
  expect(runtime.inFlightInvocationCount).toBe(0);
  expect(iterator.next()).toEqual({ done: true, value: undefined });
});

test('yields null at a retained halt boundary and resumes the loop', () => {
  const kernel = setup();
  kernel.requestHalt();
  const runtime = { inFlightInvocationCount: 0 };
  const bindings: CallbackBindings<TestGraph> = {
    invoke: () => ({
      kind: 'MAKE_ROOT',
      value: { vertexContent: null },
    }),
  };
  const iterator = runSync(kernel, bindings, runtime);
  expect(iterator.next()).toEqual({ done: false, value: null });
  kernel.resume();
  expect(iterator.next()).toEqual({ done: true, value: undefined });
});

test('restores the physical count and rethrows original callback errors', () => {
  const failure = { reason: 'original' };
  const runtime = { inFlightInvocationCount: 0 };
  const iterator = runSync<TestGraph>(
    setup(),
    {
      invoke: () => {
        throw failure;
      },
    },
    runtime,
  );

  let caught: unknown;
  try {
    iterator.next();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBe(failure);
  expect(runtime.inFlightInvocationCount).toBe(0);
});

test.each([
  ['promise', Promise.reject(new Error('rejected'))],
  [
    'custom thenable',
    {
      then: (_resolve: unknown, reject: (error: unknown) => void) =>
        reject('no'),
    },
  ],
  [
    'throwing then getter',
    Object.defineProperty({}, 'then', {
      get() {
        throw new Error('getter failed');
      },
    }),
  ],
  [
    'throwing then call',
    {
      then() {
        throw new Error('call failed');
      },
    },
  ],
])(
  'rejects a %s from a synchronous callback without leaking it',
  (_name, value) => {
    const iterator = runSync<TestGraph>(
      setup(),
      {
        invoke: () => ({ kind: 'MAKE_ROOT', value } as never),
      },
      { inFlightInvocationCount: 0 },
    );
    expect(() => iterator.next()).toThrow(/synchronous runner.*MAKE_ROOT/i);
  },
);

test('rejects WAIT and mismatched callback transport results', () => {
  const waiting = {
    poll: () => ({ kind: 'WAIT' as const }),
  } as unknown as KernelPort<TestGraph>;
  expect(() =>
    runSync(
      waiting,
      { invoke: () => ({ kind: 'MAKE_ROOT', value: { vertexContent: null } }) },
      { inFlightInvocationCount: 0 },
    ).next(),
  ).toThrow(/stalled/i);

  const iterator = runSync(
    setup(),
    {
      invoke: () => ({
        kind: 'VISIT',
        value: undefined,
      }),
    } as CallbackBindings<TestGraph>,
    { inFlightInvocationCount: 0 },
  );
  expect(() => iterator.next()).toThrow(/returned VISIT.*MAKE_ROOT/i);
});

test('callback bindings dispatch every request by its discriminant', () => {
  const calls: string[] = [];
  const bindings = createCallbackBindings<TestGraph>({
    source: {
      resolveRoot: () => {
        calls.push('root');
        return { vertexContent: null };
      },
      resolveChild: () => {
        calls.push('vertex');
        return { vertexContent: null };
      },
      getVertexIdFromHint: () => {
        calls.push('id');
        return { vertexId: 'hint' };
      },
    },
    sortHints: (hints) => {
      calls.push('transformHints');
      return hints.reverse();
    },
    visit: {
      ON_WORK_READY: () => {
        calls.push('visit');
        return undefined;
      },
    },
  });
  const rootCall = setup().poll('drive');
  if (rootCall.kind !== 'CALL') throw new Error('Expected root call');
  expect(bindings.invoke(rootCall.call)).toEqual({
    kind: 'MAKE_ROOT',
    value: { vertexContent: null },
  });
  const ref = new MutableValueReference(
    new Vertex<TestGraph>({
      $vertexData: 'parent',
      $childDiscoveryHints: ['a'],
    }),
  );
  const owner = {
    ownerKind: 'vertexTraversalFrame' as const,
    runnerLocalOwnerId: 2,
    validityGeneration: 0,
  };
  expect(
    bindings.invoke({
      requestId: 2,
      owner,
      kind: 'SORT_HINTS',
      hints: ['a', 'b'],
    }),
  ).toEqual({ kind: 'SORT_HINTS', value: ['b', 'a'] });
  expect(
    bindings.invoke({
      requestId: 3,
      owner,
      kind: 'HINT_ID',
      hint: 'a',
      hintIndex: 0,
    }),
  ).toEqual({ kind: 'HINT_ID', value: { vertexId: 'hint' } });
  expect(
    bindings.invoke({
      requestId: 4,
      owner,
      kind: 'MAKE_VERTEX',
      context: {
        discoveryDepthInEdges: 1,
        parentVertexAtChildResolution: ref.getReferencedValue(),
        parentVertexReference: ref,
        parentChildHintIndex: 0,
        childDiscoveryHint: 'a',
      },
    }),
  ).toEqual({ kind: 'MAKE_VERTEX', value: { vertexContent: null } });
  expect(
    bindings.invoke({
      requestId: 5,
      owner: {
        ownerKind: 'vertexPhaseVisitorChain',
        runnerLocalOwnerId: 3,
        validityGeneration: 0,
      },
      kind: 'VISIT',
      ref,
      order: 'ON_WORK_READY',
      recordIndex: 0,
      metadata: {
        phaseVisitorChainIndex: 0,
        visitorCallbackIndexInPhaseChain: 0,
        previousCommittedVisitVertexHandleForSamePhase: null,
        currentVertexPhaseChainState: null,
      },
    }),
  ).toEqual({ kind: 'VISIT', value: undefined });
  expect(calls).toEqual(['root', 'transformHints', 'id', 'vertex', 'visit']);
});

test('callback bindings use sort fallback and reject missing visitors', () => {
  const bindings = createCallbackBindings<TestGraph>({
    source: {
      resolveRoot: () => ({ vertexContent: null }),
      resolveChild: () => ({ vertexContent: null }),
    },
    visit: {},
  });
  const owner = {
    ownerKind: 'vertexTraversalFrame' as const,
    runnerLocalOwnerId: 1,
    validityGeneration: 0,
  };
  expect(
    bindings.invoke({
      requestId: 1,
      owner,
      kind: 'SORT_HINTS',
      hints: ['a'],
    }),
  ).toEqual({ kind: 'SORT_HINTS', value: ['a'] });
  expect(() =>
    bindings.invoke({
      requestId: 2,
      owner: {
        ownerKind: 'vertexPhaseVisitorChain',
        runnerLocalOwnerId: 2,
        validityGeneration: 0,
      },
      kind: 'VISIT',
      ref: new MutableValueReference(
        new Vertex<TestGraph>({
          $vertexData: 'root',
          $childDiscoveryHints: [],
        }),
      ),
      order: 'ON_WORK_READY',
      recordIndex: 0,
      metadata: {
        phaseVisitorChainIndex: 0,
        visitorCallbackIndexInPhaseChain: 0,
        previousCommittedVisitVertexHandleForSamePhase: null,
        currentVertexPhaseChainState: null,
      },
    }),
  ).toThrow(/no callback binding/i);
});
