import type { CallbackBindings, VisitOrder } from '../src/core/effects/types';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import { createAsyncDriver } from '../src/core/drivers/runAsync';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { TestGraph } from './helpers/graph-fixtures';
import type { Ref } from '../src/core/graph/types';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

function setup(options: {
  concurrency?: number;
  hasSorter?: boolean;
  hasHintIds?: boolean;
  iterateOver?: VisitOrder[];
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
      status: TraversalRunnerStatus.INITIAL,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata:
      options.visitorCount === undefined
        ? {}
        : {
            PRE_ORDER: Array.from(
              { length: options.visitorCount },
              (_, addedIndex) => ({
                addedIndex,
                priority: 100,
                resolutionStyle: Style.SEQUENTIAL,
              }),
            ),
          },
    iterableConfig: {
      iterateOver: options.iterateOver ?? ['PRE_ORDER'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: {
      visitParentAfterChildren: 0,
      visitParentAfterChildrenAllRangesOutOfBoundsFallback: 0,
      visitUpOneChildParents: true,
      considerVisitAfterNullContentVertices: true,
    },
    hasSorter: options.hasSorter ?? false,
    hasHintIds: options.hasHintIds ?? false,
    concurrency: options.concurrency ?? Infinity,
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
    vertexContent: { $d: string; $c: string[] };
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
              value: { vertexContent: { $d: 'root', $c: ['A', 'B'] } },
            };
          }
          if (call.kind === 'MAKE_VERTEX') {
            invoked.push(call.context.vertexHint);
            return {
              kind: call.kind,
              value:
                call.context.vertexHint === 'A'
                  ? childA.promise
                  : Promise.reject(siblingError),
            };
          }
          throw new Error(`Unexpected ${call.kind}`);
        },
      },
    });
    const iterator = session.getIterable();
    const trace: string[] = [];
    trace.push((await iterator.next()).value!.vertex.getData());
    const childEvent = iterator.next();
    await eventLoopTurn();

    expect(invoked).toEqual(['A', 'B']);
    expect(errors).toEqual([]);
    expect(kernel.getStatus()).toBe(TraversalRunnerStatus.RUNNING);

    childA.resolve({ vertexContent: { $d: 'A', $c: [] } });
    trace.push((await childEvent).value!.vertex.getData());
    await expect(iterator.next()).rejects.toBe(siblingError);
    expect(trace).toEqual(['root', 'A']);
    expect(kernel.getStatus()).toBe(TraversalRunnerStatus.FAILED);
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('settle stores a child outcome without admitting its visitor chain', async () => {
  const child = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const visits: string[] = [];
  const { driver } = setup({
    visitorCount: 1,
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['child'] } },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return { kind: call.kind, value: child.promise };
        }
        if (call.kind === 'VISIT') {
          visits.push(call.ref.unref().getData());
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

  child.resolve({ vertexContent: { $d: 'child', $c: [] } });
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root']);

  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root', 'child']);
});

test('the limiter includes promised sorting and prefetched child resolution', async () => {
  const sorted = deferred<string[]>();
  const child = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const started: string[] = [];
  const { driver, session } = setup({
    concurrency: 1,
    hasSorter: true,
    bindings: {
      invoke(call) {
        started.push(call.kind);
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['child'] } },
          };
        }
        if (call.kind === 'SORT_HINTS') return { kind: call.kind, value: sorted.promise };
        if (call.kind === 'MAKE_VERTEX') return { kind: call.kind, value: child.promise };
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator = session.getIterable();
  await iterator.next();
  const next = iterator.next();
  await eventLoopTurn();
  expect(started).toEqual(['MAKE_ROOT', 'SORT_HINTS']);
  expect(driver.inspect().inFlightCallbackCount).toBe(1);

  sorted.resolve(['child']);
  await eventLoopTurn();
  expect(started).toEqual(['MAKE_ROOT', 'SORT_HINTS', 'MAKE_VERTEX']);
  expect(driver.inspect().inFlightCallbackCount).toBe(1);
  child.resolve({ vertexContent: { $d: 'child', $c: [] } });
  await expect(next).resolves.toMatchObject({ done: false });
});

test.each(['SORT_HINTS', 'HINT_ID'] as const)(
  'surfaces an asynchronous %s failure',
  async (failedKind) => {
    const error = new Error(`${failedKind} failed`);
    const { session } = setup({
      hasSorter: failedKind === 'SORT_HINTS',
      hasHintIds: failedKind === 'HINT_ID',
      bindings: {
        invoke(call) {
          if (call.kind === 'MAKE_ROOT') {
            return {
              kind: call.kind,
              value: { vertexContent: { $d: 'root', $c: ['child'] } },
            };
          }
          if (call.kind === failedKind) {
            return { kind: call.kind, value: Promise.reject(error) } as never;
          }
          throw new Error(`Unexpected ${call.kind}`);
        },
      },
    });
    const iterator = session.getIterable();
    await iterator.next();
    await expect(iterator.next()).rejects.toBe(error);
  },
);

test('stores a child rejection while halted and surfaces it after resume', async () => {
  const child = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const error = new Error('stored child failure');
  const { kernel, session } = setup({
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['child'] } },
          };
        }
        if (call.kind === 'MAKE_VERTEX') return { kind: call.kind, value: child.promise };
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator = session.getIterable();
  await iterator.next();
  const pending = iterator.next();
  await eventLoopTurn();
  const close = iterator.return(undefined);
  await expect(close).resolves.toMatchObject({ done: true });
  await expect(pending).resolves.toMatchObject({ done: true });

  child.reject(error);
  await eventLoopTurn();
  expect(kernel.getStatus()).toBe(TraversalRunnerStatus.HALTED);
  await expect(session.getIterable().next()).rejects.toBe(error);
});

test('runs promised hint identity hooks through the shared limit before resolvers', async () => {
  const firstId = deferred<{ vertexId: string }>();
  const calls: string[] = [];
  const { driver, session } = setup({
    concurrency: 1,
    hasHintIds: true,
    bindings: {
      invoke(call) {
        calls.push(`${call.kind}:${call.kind === 'HINT_ID' ? call.hint : ''}`);
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['A', 'B'] } },
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
            value: { vertexContent: { $d: call.context.vertexHint, $c: [] } },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator = session.getIterable();
  await iterator.next();
  const childEvent = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['MAKE_ROOT:', 'HINT_ID:A']);
  expect(driver.inspect().inFlightCallbackCount).toBe(1);

  firstId.resolve({ vertexId: 'A' });
  await eventLoopTurn();
  expect(calls.slice(0, 3)).toEqual([
    'MAKE_ROOT:',
    'HINT_ID:A',
    'HINT_ID:B',
  ]);
  await expect(childEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'A' } },
  });
});

test('known async hint identities are consumed without invoking a resolver', async () => {
  let resolverCalls = 0;
  const { session } = setup({
    hasHintIds: true,
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexId: 'root',
              vertexContent: { $d: 'root', $c: ['root'] },
            },
          };
        }
        if (call.kind === 'HINT_ID') {
          return { kind: call.kind, value: Promise.resolve({ vertexId: 'root' }) };
        }
        if (call.kind === 'MAKE_VERTEX') {
          resolverCalls += 1;
          return { kind: call.kind, value: { vertexContent: null } };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator = session.getIterable();
  await iterator.next();
  await expect(iterator.next()).rejects.toThrow(/cycle/i);
  expect(resolverCalls).toBe(0);
});

const earlierIdentityCases: Array<
  [string, { $d: string; $c: string[] } | null]
> = [
  ['live', { $d: 'A', $c: [] }],
  ['omitted', null],
];

test.each(earlierIdentityCases)(
  'links a %s earlier identity from a later prefetched frame',
  async (_state, firstContent) => {
    const resolved: string[] = [];
    const { session } = setup({
      hasHintIds: true,
      bindings: {
        invoke(call) {
          if (call.kind === 'MAKE_ROOT') {
            return {
              kind: call.kind,
              value: {
                vertexId: 'root',
                vertexContent: { $d: 'root', $c: ['A', 'B'] },
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
            resolved.push(call.context.vertexHint);
            return {
              kind: call.kind,
              value:
                call.context.vertexHint === 'A'
                  ? { vertexId: 'A', vertexContent: firstContent }
                  : {
                      vertexId: 'B',
                      vertexContent: { $d: 'B', $c: ['A'] },
                    },
            };
          }
          throw new Error(`Unexpected ${call.kind}`);
        },
      },
    });
    await session.run();
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
            value: { vertexContent: { $d: 'root', $c: ['old'] } },
          };
        }
        if (call.kind === 'VISIT') {
          return call.ref.unref().getData() === 'root'
            ? {
                kind: call.kind,
                value: {
                  commands: [
                    {
                      commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
                      commandArguments: { newHints: ['new'] },
                    },
                  ],
                },
              }
            : { kind: call.kind, value: undefined };
        }
        if (call.kind === 'MAKE_VERTEX') {
          resolvedHints.push(call.context.vertexHint);
          return {
            kind: call.kind,
            value: { vertexContent: { $d: call.context.vertexHint, $c: [] } },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator = session.getIterable();
  await iterator.next();
  await iterator.next();
  expect(resolvedHints).toEqual(['new']);
});

test('at limit one a settled first child admits its queued sibling before acknowledgment', async () => {
  const first = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const calls: string[] = [];
  const { session } = setup({
    concurrency: 1,
    bindings: {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['A', 'B'] } },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          calls.push(call.context.vertexHint);
          return {
            kind: call.kind,
            value:
              call.context.vertexHint === 'A'
                ? first.promise
                : { vertexContent: { $d: 'B', $c: [] } },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
  });
  const iterator = session.getIterable();
  await iterator.next();
  const child = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['A']);
  first.resolve({ vertexContent: { $d: 'A', $c: [] } });
  await expect(child).resolves.toMatchObject({ done: false });
  await eventLoopTurn();
  expect(calls).toEqual(['A', 'B']);
});

test('breadth-first frames prefetch sorted siblings and consume them in queue order', async () => {
  const first = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const calls: string[] = [];
  const stateBridge = {
    status: TraversalRunnerStatus.INITIAL,
    traversalRootVertexRef: null,
    subtreeTraversalDisabledRefs: new Set<Ref<TestGraph>>(),
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
      iterateOver: ['LEVEL_ORDER'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasSorter: true,
    hasHintIds: false,
    concurrency: 2,
  });
  const driver = createAsyncDriver<TestGraph>(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['A', 'B'] } },
          };
        }
        if (call.kind === 'SORT_HINTS') {
          return {
            kind: call.kind,
            value: Promise.resolve(call.hints.slice().reverse()),
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          calls.push(call.context.vertexHint);
          return {
            kind: call.kind,
            value:
              call.context.vertexHint === 'B'
                ? first.promise
                : { vertexContent: { $d: 'A', $c: [] } },
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const session = new AsyncRunnerSession(driver);
  const iterator = session.getIterable();
  await iterator.next();
  const child = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['B', 'A']);
  first.resolve({ vertexContent: { $d: 'B', $c: [] } });
  await expect(child).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'B' }, order: 'LEVEL_ORDER' },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'A' }, order: 'LEVEL_ORDER' },
  });
  expect(driver.inspect().readyVisits).toEqual([]);
  expect(driver.inspect().frames).toEqual([]);
  expect(session.inspect().bufferedEventCount).toBe(0);
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
});

test('breadth-first settle does not admit a resolved child visitor', async () => {
  const child = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const visits: string[] = [];
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
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    stateBridge,
    visitorMetadata: {
      LEVEL_ORDER: [
        { addedIndex: 0, priority: 100, resolutionStyle: Style.SEQUENTIAL },
      ],
    },
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
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: ['child'] } },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return { kind: call.kind, value: child.promise };
        }
        if (call.kind === 'VISIT') {
          visits.push(call.ref.unref().getData());
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

  child.resolve({ vertexContent: { $d: 'child', $c: [] } });
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root']);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(visits).toEqual(['root', 'child']);
});

test('breadth-first closes an unsorted empty async frame', async () => {
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
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
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
  const session = new AsyncRunnerSession(
    createAsyncDriver(
      kernel,
      {
        invoke(call) {
          if (call.kind !== 'MAKE_ROOT') throw new Error(`Unexpected ${call.kind}`);
          return {
            kind: call.kind,
            value: { vertexContent: { $d: 'root', $c: [] } },
          };
        },
      },
      1,
    ),
  );
  await expect(session.run()).resolves.toBe(session);
  expect(kernel.inspect().frames).toEqual([]);
});

test('breadth-first surfaces a prefetched resolver rejection', async () => {
  const error = new Error('breadth child failed');
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
    execution: 'async',
    sourceMode: 'tree',
    container: new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
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
  const iterator = new AsyncRunnerSession(
    createAsyncDriver(
      kernel,
      {
        invoke(call) {
          if (call.kind === 'MAKE_ROOT') {
            return {
              kind: call.kind,
              value: { vertexContent: { $d: 'root', $c: ['child'] } },
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
  ).getIterable();
  await iterator.next();
  await expect(iterator.next()).rejects.toBe(error);
});
