import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import { createAsyncDriver } from '../src/core/drivers/runAsync';
import type {
  CallbackBindings,
  TreeOrDagVisitorPhase,
} from '../src/core/effects/types';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { InternalVertexRef } from '../src/core/graph/types';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

function setup(options: {
  concurrency?: number;
  hasChildHintsListTransformer?: boolean;
  hasChildHintVertexIdResolver?: boolean;
  iterateOver?: TreeOrDagVisitorPhase[];
  visitorCount?: number;
  bindings: CallbackBindings<TestGraph>;
}) {
  const kernel = new TraversalKernel<TestGraph>({
    kind: 'depth-first',
    execution: 'async',
    sourceMode: 'tree',
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
    visitorMetadata:
      options.visitorCount === undefined
        ? {}
        : {
            BEFORE_CHILD_EXPANSION: Array.from(
              { length: options.visitorCount },
              (_, phaseRegistrationInsertionIndex) => ({
                phaseRegistrationInsertionIndex,
                descendingExecutionPriorityWithinGroup: 100,
                visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
              }),
            ),
          },
    iterableConfig: {
      iterateOver: options.iterateOver ?? ['BEFORE_CHILD_EXPANSION'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: {
      visitAfterChildIndices: { indices: [0] },
      visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [0] },
      alsoVisitAfterOnlyChild: true,
      allowBoundaryVisitsAfterOmittedChildSlots: true,
    },
    hasChildHintsListTransformer: options.hasChildHintsListTransformer ?? false,
    hasChildHintVertexIdResolver: options.hasChildHintVertexIdResolver ?? false,
    maxConcurrentCallbackInvocations: options.concurrency ?? Infinity,
  });
  const driver = createAsyncDriver(
    kernel,
    options.bindings,
    options.concurrency ?? Infinity,
  );
  return { kernel, driver, session: new AsyncRunnerSession(driver) };
}

test('captures prefetched sibling rejection and surfaces it in slot order', async () => {
  const childA = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const siblingError = new Error('B failed');
  const invoked: string[] = [];
  const errors: unknown[] = [];
  const listener = (error: unknown) => errors.push(error);
  process.on('unhandledRejection', listener);
  try {
    const { kernel, session } = setup({
      bindings: {
        invoke(call) {
          if (call.kind === 'MAKE_ROOT') {
            return {
              kind: call.kind,
              value: {
                vertexContent: {
                  $vertexData: 'root',
                  $childDiscoveryHints: ['A', 'B'],
                },
              },
            };
          }
          if (call.kind === 'MAKE_VERTEX') {
            invoked.push(call.context.childDiscoveryHint);
            return {
              kind: call.kind,
              value:
                call.context.childDiscoveryHint === 'A'
                  ? childA.promise
                  : Promise.reject(siblingError),
            };
          }
          throw new Error(`Unexpected ${call.kind}`);
        },
      },
    });
    const iterator =
      session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    const trace: string[] = [];
    trace.push((await iterator.next()).value!.vertex.getVertexData());
    const childEvent = iterator.next();
    await eventLoopTurn();

    expect(invoked).toEqual(['A', 'B']);
    expect(errors).toEqual([]);
    expect(kernel.getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.RUNNING,
    );

    childA.resolve({
      vertexContent: { $vertexData: 'A', $childDiscoveryHints: [] },
    });
    trace.push((await childEvent).value!.vertex.getVertexData());
    await expect(iterator.next()).rejects.toBe(siblingError);
    expect(trace).toEqual(['root', 'A']);
    expect(kernel.getTraversalLifecycleStatus()).toBe(
      TraversalRunnerStatus.FAILED,
    );
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('settle stores a child outcome without admitting its visitor chain', async () => {
  const child = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const visits: string[] = [];
  const { driver } = setup({
    visitorCount: 1,
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return { kind: call.kind, value: child.promise };
        }
        if (call.kind === 'VISIT') {
          visits.push(call.ref.getReferencedValue().getVertexData());
          return { kind: call.kind, value: undefined };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });

  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  await eventLoopTurn();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  await eventLoopTurn();
  const rootEvent = driver.advance('drive');
  if (rootEvent.kind !== 'EVENT') throw new Error('Expected root event');
  driver.acknowledgeEvent(rootEvent.boundaryId);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root']);

  child.resolve({
    vertexContent: { $vertexData: 'child', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root']);

  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root', 'child']);
});

test('the limiter includes promised sorting and prefetched child resolution', async () => {
  const sorted = deferred<string[]>();
  const child = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const started: string[] = [];
  const { driver, session } = setup({
    concurrency: 1,
    hasChildHintsListTransformer: true,
    bindings: {
      invoke(call) {
        started.push(call.kind);
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        }
        if (call.kind === 'SORT_HINTS')
          return { kind: call.kind, value: sorted.promise };
        if (call.kind === 'MAKE_VERTEX')
          return { kind: call.kind, value: child.promise };
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  const next = iterator.next();
  await eventLoopTurn();
  expect(started).toEqual(['MAKE_ROOT', 'SORT_HINTS']);
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);

  sorted.resolve(['child']);
  await eventLoopTurn();
  expect(started).toEqual(['MAKE_ROOT', 'SORT_HINTS', 'MAKE_VERTEX']);
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  child.resolve({
    vertexContent: { $vertexData: 'child', $childDiscoveryHints: [] },
  });
  await expect(next).resolves.toMatchObject({ done: false });
});

test.each(['SORT_HINTS', 'HINT_ID'] as const)(
  'surfaces an asynchronous %s failure',
  async (failedKind) => {
    const error = new Error(`${failedKind} failed`);
    const { session } = setup({
      hasChildHintsListTransformer: failedKind === 'SORT_HINTS',
      hasChildHintVertexIdResolver: failedKind === 'HINT_ID',
      bindings: {
        invoke(call) {
          if (call.kind === 'MAKE_ROOT') {
            return {
              kind: call.kind,
              value: {
                vertexContent: {
                  $vertexData: 'root',
                  $childDiscoveryHints: ['child'],
                },
              },
            };
          }
          if (call.kind === failedKind) {
            return { kind: call.kind, value: Promise.reject(error) } as never;
          }
          throw new Error(`Unexpected ${call.kind}`);
        },
      },
    });
    const iterator =
      session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    await iterator.next();
    await expect(iterator.next()).rejects.toBe(error);
  },
);

test('stores a child rejection while halted and surfaces it after resume', async () => {
  const child = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const error = new Error('stored child failure');
  const { kernel, session } = setup({
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX')
          return { kind: call.kind, value: child.promise };
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  const pending = iterator.next();
  await eventLoopTurn();
  const close = iterator.return(undefined);
  await expect(close).resolves.toMatchObject({ done: true });
  await expect(pending).resolves.toMatchObject({ done: true });

  child.reject(error);
  await eventLoopTurn();
  expect(kernel.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.SUSPENDED,
  );
  await expect(
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
  ).rejects.toBe(error);
});

test('runs promised hint identity hooks through the shared limit before resolvers', async () => {
  const firstId = deferred<{ vertexId: string }>();
  const calls: string[] = [];
  const { driver, session } = setup({
    concurrency: 1,
    hasChildHintVertexIdResolver: true,
    bindings: {
      invoke(call) {
        calls.push(`${call.kind}:${call.kind === 'HINT_ID' ? call.hint : ''}`);
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'HINT_ID') {
          return {
            kind: call.kind,
            value:
              call.hint === 'A'
                ? firstId.promise
                : Promise.resolve({ vertexId: call.hint }),
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: call.context.childDiscoveryHint,
                $childDiscoveryHints: [],
              },
            },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  const childEvent = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['MAKE_ROOT:', 'HINT_ID:A']);
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);

  firstId.resolve({ vertexId: 'A' });
  await eventLoopTurn();
  expect(calls.slice(0, 3)).toEqual(['MAKE_ROOT:', 'HINT_ID:A', 'HINT_ID:B']);
  await expect(childEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'A' } },
  });
});

test('known async hint identities are consumed without invoking a resolver', async () => {
  let resolverCalls = 0;
  const { session } = setup({
    hasChildHintVertexIdResolver: true,
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexId: 'root',
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['root'],
              },
            },
          };
        }
        if (call.kind === 'HINT_ID') {
          return {
            kind: call.kind,
            value: Promise.resolve({ vertexId: 'root' }),
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          resolverCalls += 1;
          return { kind: call.kind, value: { vertexContent: null } };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  await expect(iterator.next()).rejects.toThrow(/cycle/i);
  expect(resolverCalls).toBe(0);
});

const earlierIdentityCases: Array<
  [string, { $vertexData: string; $childDiscoveryHints: string[] } | null]
> = [
  ['live', { $vertexData: 'A', $childDiscoveryHints: [] }],
  ['omitted', null],
];

test.each(earlierIdentityCases)(
  'links a %s earlier identity from a later prefetched frame',
  async (_state, firstContent) => {
    const resolved: string[] = [];
    const { session } = setup({
      hasChildHintVertexIdResolver: true,
      bindings: {
        invoke(call) {
          if (call.kind === 'MAKE_ROOT') {
            return {
              kind: call.kind,
              value: {
                vertexId: 'root',
                vertexContent: {
                  $vertexData: 'root',
                  $childDiscoveryHints: ['A', 'B'],
                },
              },
            };
          }
          if (call.kind === 'HINT_ID') {
            return {
              kind: call.kind,
              value: Promise.resolve({ vertexId: call.hint }),
            };
          }
          if (call.kind === 'MAKE_VERTEX') {
            resolved.push(call.context.childDiscoveryHint);
            return {
              kind: call.kind,
              value:
                call.context.childDiscoveryHint === 'A'
                  ? { vertexId: 'A', vertexContent: firstContent }
                  : {
                      vertexId: 'B',
                      vertexContent: {
                        $vertexData: 'B',
                        $childDiscoveryHints: ['A'],
                      },
                    },
            };
          }
          throw new Error(`Unexpected ${call.kind}`);
        },
      },
    });
    await session.runUntilSuspendedOrTerminal();
    expect(resolved).toEqual(['A', 'B']);
  },
);

test('uses rewritten hints when admitting child prefetch', async () => {
  const resolvedHints: string[] = [];
  const { session } = setup({
    visitorCount: 1,
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['old'],
              },
            },
          };
        }
        if (call.kind === 'VISIT') {
          return call.ref.getReferencedValue().getVertexData() === 'root'
            ? {
                kind: call.kind,
                value: {
                  commands: [
                    {
                      commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                      commandArguments: { replacementChildHints: ['new'] },
                    },
                  ],
                },
              }
            : { kind: call.kind, value: undefined };
        }
        if (call.kind === 'MAKE_VERTEX') {
          resolvedHints.push(call.context.childDiscoveryHint);
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: call.context.childDiscoveryHint,
                $childDiscoveryHints: [],
              },
            },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  await iterator.next();
  expect(resolvedHints).toEqual(['new']);
});

test('at limit one a settled first child admits its queued sibling before acknowledgment', async () => {
  const first = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const calls: string[] = [];
  const { session } = setup({
    concurrency: 1,
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          calls.push(call.context.childDiscoveryHint);
          return {
            kind: call.kind,
            value:
              call.context.childDiscoveryHint === 'A'
                ? first.promise
                : {
                    vertexContent: {
                      $vertexData: 'B',
                      $childDiscoveryHints: [],
                    },
                  },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  const child = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['A']);
  first.resolve({
    vertexContent: { $vertexData: 'A', $childDiscoveryHints: [] },
  });
  await expect(child).resolves.toMatchObject({ done: false });
  await eventLoopTurn();
  expect(calls).toEqual(['A', 'B']);
});

test('breadth-first frames prefetch sorted siblings and consume them in queue order', async () => {
  const first = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const calls: string[] = [];
  const stateBridge = {
    status: TraversalRunnerStatus.NOT_STARTED,
    traversalRootVertexRef: null,
    subtreeTraversalDisabledRefs: new Set<InternalVertexRef<TestGraph>>(),
    visitorsState: {},
    queue: [],
    queueIndex: 0,
  };
  const kernel = new TraversalKernel<TestGraph, TestGraph>({
    kind: 'breadth-first',
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    stateBridge,
    visitorMetadata: {},
    iterableConfig: {
      iterateOver: ['AT_LEVEL_ORDER_VERTEX'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasChildHintsListTransformer: true,
    hasChildHintVertexIdResolver: false,
    maxConcurrentCallbackInvocations: 2,
  });
  const driver = createAsyncDriver<TestGraph>(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'SORT_HINTS') {
          return {
            kind: call.kind,
            value: Promise.resolve(call.hints.slice().reverse()),
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          calls.push(call.context.childDiscoveryHint);
          return {
            kind: call.kind,
            value:
              call.context.childDiscoveryHint === 'B'
                ? first.promise
                : {
                    vertexContent: {
                      $vertexData: 'A',
                      $childDiscoveryHints: [],
                    },
                  },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const session = new AsyncRunnerSession(driver);
  const iterator =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  const child = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['B', 'A']);
  first.resolve({
    vertexContent: { $vertexData: 'B', $childDiscoveryHints: [] },
  });
  await expect(child).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'B' }, order: 'AT_LEVEL_ORDER_VERTEX' },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'A' }, order: 'AT_LEVEL_ORDER_VERTEX' },
  });
  expect(
    driver.captureExecutionSnapshot().dependencyEligiblePhaseVisits,
  ).toEqual([]);
  expect(driver.captureExecutionSnapshot().vertexTraversalFrames).toEqual([]);
  expect(session.captureExecutionSnapshot().bufferedDeliveryEventCount).toBe(0);
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('breadth-first settle does not admit a resolved child visitor', async () => {
  const child = deferred<{
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const visits: string[] = [];
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
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    stateBridge,
    visitorMetadata: {
      AT_LEVEL_ORDER_VERTEX: [
        {
          phaseRegistrationInsertionIndex: 0,
          descendingExecutionPriorityWithinGroup: 100,
          visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
        },
      ],
    },
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
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return { kind: call.kind, value: child.promise };
        }
        if (call.kind === 'VISIT') {
          visits.push(call.ref.getReferencedValue().getVertexData());
          return { kind: call.kind, value: undefined };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    1,
  );

  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  await eventLoopTurn();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  await eventLoopTurn();
  const rootEvent = driver.advance('drive');
  if (rootEvent.kind !== 'EVENT') throw new Error('Expected root event');
  driver.acknowledgeEvent(rootEvent.boundaryId);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root']);

  child.resolve({
    vertexContent: { $vertexData: 'child', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root']);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root', 'child']);
});

test('breadth-first closes an unsorted empty async frame', async () => {
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
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
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
  const session = new AsyncRunnerSession(
    createAsyncDriver(
      kernel,
      {
        invoke(call) {
          if (call.kind !== 'MAKE_ROOT')
            throw new Error(`Unexpected ${call.kind}`);
          return {
            kind: call.kind,
            value: {
              vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
            },
          };
        },
      },
      1,
    ),
  );
  await expect(session.runUntilSuspendedOrTerminal()).resolves.toBe(session);
  expect(kernel.captureExecutionSnapshot().vertexTraversalFrames).toEqual([]);
});

test('breadth-first surfaces a prefetched resolver rejection', async () => {
  const error = new Error('breadth child failed');
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
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
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
  const iterator = new AsyncRunnerSession(
    createAsyncDriver(
      kernel,
      {
        invoke(call) {
          if (call.kind === 'MAKE_ROOT') {
            return {
              kind: call.kind,
              value: {
                vertexContent: {
                  $vertexData: 'root',
                  $childDiscoveryHints: ['child'],
                },
              },
            };
          }
          if (call.kind === 'MAKE_VERTEX') {
            return { kind: call.kind, value: Promise.reject(error) };
          }
          throw new Error(`Unexpected ${call.kind}`);
        },
      },
      1,
    ),
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await iterator.next();
  await expect(iterator.next()).rejects.toBe(error);
});
