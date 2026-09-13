import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import { createAsyncDriver } from '../src/core/drivers/runAsync';
import type {
  CallbackBindings,
  CallSpec,
  KernelPort,
} from '../src/core/effects/types';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { VisitResult } from '../src/core/graph/types';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

function makeKernel(
  concurrency = 2,
  container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  }),
  options: {
    hasSorter?: boolean;
    hasHintIds?: boolean;
    includeCompletion?: boolean;
    readyVisitorCount?: number;
  } = {},
) {
  return new TraversalKernel<TestGraph>({
    kind: 'dag',
    execution: 'async',
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
        ...Array.from(
          { length: options.readyVisitorCount ?? 1 },
          (_, addedIndex) => ({
            addedIndex,
            priority: 100,
            resolutionStyle: Style.SEQUENTIAL,
          }),
        ),
      ],
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
      iterateOver: options.includeCompletion
        ? ['ON_READY', 'ON_COMPLETE']
        : ['ON_READY'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasSorter: options.hasSorter ?? false,
    hasHintIds: options.hasHintIds ?? false,
    concurrency,
  });
}

test('delivers an unrelated DAG chain while another frame resolver is pending', async () => {
  const a = deferred<{
    vertexId: string;
    dependsOn: string[];
    vertexContent: { $d: string; $c: string[] };
  }>();
  const b = deferred<{
    vertexId: string;
    dependsOn: string[];
    vertexContent: { $d: string; $c: string[] };
  }>();
  const slow = deferred<{
    vertexId: string;
    dependsOn: string[];
    vertexContent: { $d: string; $c: string[] };
  }>();
  const bVisit = deferred<void>();
  const started: string[] = [];
  const kernel = makeKernel();
  const bindings: CallbackBindings<TestGraph> = {
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
      if (call.kind === 'MAKE_VERTEX') {
        const hint = call.context.vertexHint;
        started.push(hint);
        const value =
          hint === 'A' ? a.promise : hint === 'B' ? b.promise : slow.promise;
        return { kind: call.kind, value };
      }
      if (call.kind === 'VISIT') {
        const data = call.ref.unref().getData();
        return {
          kind: call.kind,
          value: data === 'B' ? bVisit.promise : undefined,
        };
      }
      throw new Error(`Unexpected ${call.kind}`);
    },
  };
  const driver = createAsyncDriver(kernel, bindings, 2);
  const iterator = new AsyncRunnerSession(driver).getIterable();

  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'root' } },
  });
  const aEvent = iterator.next();
  await eventLoopTurn();
  expect(started).toEqual(['A', 'B']);

  a.resolve({
    vertexId: 'A',
    dependsOn: ['root'],
    vertexContent: { $d: 'A', $c: ['slow'] },
  });
  b.resolve({
    vertexId: 'B',
    dependsOn: ['root'],
    vertexContent: { $d: 'B', $c: [] },
  });
  await expect(aEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'A' } },
  });

  const nextEvent = iterator.next();
  await eventLoopTurn();
  expect(started).toEqual(['A', 'B', 'slow']);
  expect(driver.inspect().inFlightCallbackCount).toBe(2);

  bVisit.resolve();
  await expect(nextEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'B' } },
  });
  expect(driver.inspect().inFlightCallbackCount).toBe(1);

  await iterator.return(undefined);
  slow.resolve({
    vertexId: 'slow',
    dependsOn: ['A'],
    vertexContent: { $d: 'slow', $c: [] },
  });
});

test('limits admitted DAG chains separately from physical callbacks', async () => {
  const visits = new Map(['A', 'B', 'C'].map((id) => [id, deferred<void>()]));
  const kernel = makeKernel(2);
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexId: 'root',
              vertexContent: { $d: 'root', $c: ['A', 'B', 'C'] },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.vertexHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              dependsOn: ['root'],
              vertexContent: { $d: id, $c: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          return {
            kind: call.kind,
            value: visits.get(call.ref.unref().getData())?.promise,
          };
        }
        throw new Error('Unexpected callback');
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(driver).getIterable();

  await iterator.next();
  const pending = iterator.next();
  await eventLoopTurn();
  await eventLoopTurn();

  expect(kernel.inspect().chains).toHaveLength(2);
  expect(kernel.inspect().readyVisits).toHaveLength(1);
  expect(driver.inspect().inFlightCallbackCount).toBe(2);

  const closing = iterator.return(undefined);
  visits.get('A')!.resolve();
  visits.get('B')!.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
});

test('accepts duplicate identities in resolver settlement order', async () => {
  const first = deferred<{
    vertexId: string;
    dependsOn: string[];
    vertexContent: { $d: string; $c: string[] };
  }>();
  const second = deferred<{
    vertexId: string;
    dependsOn: string[];
    vertexContent: { $d: string; $c: string[] };
  }>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const kernel = makeKernel(2, container);
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexId: 'root',
              vertexContent: { $d: 'root', $c: ['first', 'second'] },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return {
            kind: call.kind,
            value:
              call.context.vertexHint === 'first'
                ? first.promise
                : second.promise,
          };
        }
        if (call.kind === 'VISIT') return { kind: call.kind, value: undefined };
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );

  driver.advance('drive');
  await eventLoopTurn();
  driver.advance('drive');
  await eventLoopTurn();
  const rootEvent = driver.advance('drive');
  if (rootEvent.kind !== 'EVENT') throw new Error('Expected root event');
  driver.acknowledgeEvent(rootEvent.boundaryId);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });

  second.resolve({
    vertexId: 'duplicate',
    dependsOn: ['root'],
    vertexContent: { $d: 'second-won', $c: [] },
  });
  await eventLoopTurn();
  driver.advance('drive');

  expect(kernel.inspect().frames[0]?.pendingIndices).toEqual([0]);
  expect(
    container.resolvedGraph.getVertexRefs().map((ref) => ref.unref().getData()),
  ).toEqual(['root', 'second-won']);

  first.resolve({
    vertexId: 'duplicate',
    dependsOn: ['root'],
    vertexContent: { $d: 'first-lost', $c: [] },
  });
  await eventLoopTurn();
  driver.advance('drive');
  driver.advance('drive');
  const rootRef = container.resolvedGraph.getRoot()!;
  const children = container.resolvedGraph.getChildrenOf(rootRef)!;
  expect(children).toHaveLength(2);
  expect(children[0]).toBe(children[1]);
  expect(container.resolvedGraph.getVertexRefs()).toHaveLength(2);
});

test('tracks concurrent hint-id outcomes by their own frame indices after sorting', async () => {
  const sorted = deferred<string[]>();
  const firstId = deferred<{ vertexId: string }>();
  const secondId = deferred<{ vertexId: string }>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  container.store.markOmitted('known-omission');
  const kernel = makeKernel(2, container, {
    hasSorter: true,
    hasHintIds: true,
  });
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexId: 'root',
              vertexContent: { $d: 'root', $c: ['first', 'second'] },
            },
          };
        }
        if (call.kind === 'VISIT') return { kind: call.kind, value: undefined };
        if (call.kind === 'SORT_HINTS') {
          return { kind: call.kind, value: sorted.promise };
        }
        if (call.kind === 'HINT_ID') {
          return {
            kind: call.kind,
            value: call.hintIndex === 0 ? firstId.promise : secondId.promise,
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return { kind: call.kind, value: { vertexContent: null } };
        }
        throw new Error('Unexpected callback');
      },
    },
    2,
  );

  driver.advance('drive');
  await eventLoopTurn();
  driver.advance('drive');
  await eventLoopTurn();
  const rootEvent = driver.advance('drive');
  if (rootEvent.kind !== 'EVENT') throw new Error('Expected root event');
  driver.acknowledgeEvent(rootEvent.boundaryId);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(kernel.inspect().frames[0]).toMatchObject({
    stage: 'sort',
    pendingIndices: [],
  });

  sorted.resolve(['first', 'second']);
  await eventLoopTurn();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(driver.inspect().inFlightCallbackCount).toBe(2);

  secondId.resolve({ vertexId: 'second' });
  await eventLoopTurn();
  driver.advance('drive');
  expect(kernel.inspect().frames[0]?.pendingIndices).toEqual([0]);

  firstId.resolve({ vertexId: 'known-omission' });
  await eventLoopTurn();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  await eventLoopTurn();
  driver.advance('drive');
  expect(kernel.inspect().frames).toEqual([]);
});

test('reserves initial metadata at admission while completion visits interleave', async () => {
  const aVisit = deferred<void>();
  const seen: Array<{
    vertex: string;
    order: string;
    index: number;
    previous: string | null;
  }> = [];
  const kernel = makeKernel(
    2,
    new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    { includeCompletion: true },
  );
  const driver = createAsyncDriver(
    kernel,
    {
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
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.vertexHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              dependsOn: ['root'],
              vertexContent: { $d: id, $c: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          seen.push({
            vertex: call.ref.unref().getData(),
            order: call.order,
            index: call.metadata.vertexVisitIndex,
            previous:
              call.metadata.previousVisitedVertexRef?.unref().getData() ?? null,
          });
          return {
            kind: call.kind,
            value:
              call.order === 'ON_READY' && call.ref.unref().getData() === 'A'
                ? aVisit.promise
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(driver).getIterable();

  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $d: 'root' }, order: 'ON_READY' },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $d: 'B' }, order: 'ON_READY' },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $d: 'B' }, order: 'ON_COMPLETE' },
  });

  expect(seen.filter(({ order }) => order === 'ON_READY')).toEqual([
    { vertex: 'root', order: 'ON_READY', index: 0, previous: null },
    { vertex: 'A', order: 'ON_READY', index: 1, previous: 'root' },
    { vertex: 'B', order: 'ON_READY', index: 2, previous: 'root' },
  ]);

  aVisit.resolve();
  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $d: 'A' }, order: 'ON_READY' },
  });
  await iterator.return(undefined);
});

test('admits an independent join once after all dependencies commit', async () => {
  const aVisit = deferred<void>();
  const bVisit = deferred<void>();
  const visited: string[] = [];
  const kernel = makeKernel();
  const driver = createAsyncDriver(
    kernel,
    {
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
        if (call.kind === 'MAKE_VERTEX') {
          const hint = call.context.vertexHint;
          if (hint === 'A' || hint === 'B') {
            return {
              kind: call.kind,
              value: {
                vertexId: hint,
                dependsOn: ['root'],
                vertexContent: { $d: hint, $c: [`join-from-${hint}`] },
              },
            };
          }
          return {
            kind: call.kind,
            value: {
              vertexId: 'join',
              dependsOn: ['A', 'B'],
              vertexContent: { $d: 'join', $c: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.unref().getData();
          visited.push(data);
          return {
            kind: call.kind,
            value:
              data === 'A'
                ? aVisit.promise
                : data === 'B'
                ? bVisit.promise
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(driver).getIterable();

  await iterator.next();
  const aEvent = iterator.next();
  await eventLoopTurn();
  aVisit.resolve();
  await expect(aEvent).resolves.toMatchObject({
    value: { vertex: { $d: 'A' } },
  });

  const bEvent = iterator.next();
  await eventLoopTurn();
  expect(visited).not.toContain('join');
  bVisit.resolve();
  await expect(bEvent).resolves.toMatchObject({
    value: { vertex: { $d: 'B' } },
  });

  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $d: 'join' } },
  });
  expect(visited.filter((data) => data === 'join')).toHaveLength(1);
  await iterator.return(undefined);
});

test('finishes after deletion without awaiting an invalidated running callback', async () => {
  const bVisit = deferred<void>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const kernel = makeKernel(2, container, { includeCompletion: true });
  const driver = createAsyncDriver(
    kernel,
    {
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
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.vertexHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              dependsOn: id === 'B' ? ['A'] : ['root'],
              vertexContent: { $d: id, $c: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.unref().getData();
          if (data === 'B' && call.order === 'ON_READY') {
            return { kind: call.kind, value: bVisit.promise };
          }
          return {
            kind: call.kind,
            value:
              data === 'A' && call.order === 'ON_COMPLETE'
                ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(driver).getIterable({
    iterateOver: [],
  });

  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(driver.inspect()).toMatchObject({
    status: TraversalRunnerStatus.FINISHED,
    inFlightCallbackCount: 1,
    pendingRequests: [{ valid: false }],
  });
  expect(
    container.resolvedGraph.getVertexRefs().map((ref) => ref.unref().getData()),
  ).not.toContain('B');

  bVisit.reject(new Error('late invalid failure'));
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'FINISHED' });
  expect(kernel.getFailure()).toBeNull();
});

test('retains the first live failure and discards a later chain mutation', async () => {
  const failure = new Error('first live failure');
  const aVisit = deferred<void>();
  const bVisit = deferred<VisitResult<TestGraph>>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const kernel = makeKernel(2, container);
  const driver = createAsyncDriver(
    kernel,
    {
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
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.vertexHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              dependsOn: ['root'],
              vertexContent: { $d: id, $c: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.unref().getData();
          return {
            kind: call.kind,
            value:
              data === 'A'
                ? aVisit.promise
                : data === 'B'
                ? bVisit.promise
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(driver).getIterable({
    iterateOver: [],
  });
  const result = iterator.next();
  await eventLoopTurn();
  await eventLoopTurn();

  aVisit.reject(failure);
  await expect(result).rejects.toBe(failure);
  bVisit.resolve({
    commands: [
      {
        commandName: Command.REWRITE_VERTEX_DATA,
        commandArguments: { newData: 'mutated' },
      },
    ],
  });
  await eventLoopTurn();

  expect(driver.advance('settle')).toEqual({ kind: 'FAILED', error: failure });
  expect(kernel.getFailure()).toEqual({ error: failure });
  expect(
    container.resolvedGraph.getVertexRefs().map((ref) => ref.unref().getData()),
  ).toContain('B');
  expect(
    container.resolvedGraph.getVertexRefs().map((ref) => ref.unref().getData()),
  ).not.toContain('mutated');
});

test('recalculates drain eligibility before releasing a queued frame permit', async () => {
  const running = deferred<{ vertexContent: null }>();
  const calls: CallSpec<TestGraph>[] = [
    {
      requestId: 1,
      kind: 'MAKE_ROOT',
      owner: { kind: 'chain', id: 1, epoch: 0 },
    },
    {
      requestId: 2,
      kind: 'MAKE_ROOT',
      owner: { kind: 'frame', id: 2, epoch: 0 },
    },
  ];
  const started: number[] = [];
  let halted = false;
  const kernel = {
    poll() {
      if (halted) return { kind: 'HALTED' as const };
      const call = calls.shift();
      return call === undefined
        ? { kind: 'WAIT' as const }
        : { kind: 'CALL' as const, call };
    },
    submit() {
      halted = true;
    },
    isRequestEligible(requestId: number, mode: string) {
      return requestId === 1 || mode !== 'drain';
    },
    isRequestValid() {
      return true;
    },
    isHaltRequested() {
      return halted;
    },
  } as unknown as KernelPort<TestGraph>;
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        started.push(call.requestId);
        return {
          kind: 'MAKE_ROOT',
          value:
            call.requestId === 1 ? running.promise : { vertexContent: null },
        };
      },
    } as CallbackBindings<TestGraph>,
    1,
  );

  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(started).toEqual([1]);
  running.resolve({ vertexContent: null });
  await eventLoopTurn();

  expect(driver.advance('drive')).toEqual({ kind: 'HALTED' });
  expect(started).toEqual([1]);
});

test('retains a halted chain while another started DAG chain completes', async () => {
  const calls: string[] = [];
  const kernel = makeKernel(
    2,
    new ResolvedGraphsContainer<TestGraph>({
      sourceMode: 'graph',
      saveOriginal: false,
    }),
    { readyVisitorCount: 2 },
  );
  const driver = createAsyncDriver(
    kernel,
    {
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
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.vertexHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              dependsOn: ['root'],
              vertexContent: { $d: id, $c: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.unref().getData();
          calls.push(`${data}:${call.recordIndex}`);
          return {
            kind: call.kind,
            value:
              data === 'A' && call.recordIndex === 0
                ? { commands: [{ commandName: Command.HALT_TRAVERSAL }] }
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const session = new AsyncRunnerSession(driver);
  const first = session.getIterable();

  await first.next();
  await expect(first.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'B' } },
  });
  await expect(first.next()).resolves.toEqual({ done: true, value: undefined });
  expect(calls.filter((call) => call.startsWith('A:'))).toEqual(['A:0']);
  expect(calls.filter((call) => call.startsWith('B:'))).toEqual(['B:0', 'B:1']);

  const resumed = session.getIterable();
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $d: 'A' } },
  });
  expect(calls.filter((call) => call.startsWith('A:'))).toEqual(['A:0', 'A:1']);
  await resumed.return(undefined);
});

test('progresses resolver and visitor jobs without nesting a single permit', async () => {
  const observedInFlight: number[] = [];
  const kernel = makeKernel(1);
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        observedInFlight.push(driver.inspect().inFlightCallbackCount);
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexId: 'root',
              vertexContent: { $d: 'root', $c: ['A', 'B'] },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.vertexHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              dependsOn: ['root'],
              vertexContent: { $d: id, $c: [] },
            },
          };
        }
        if (call.kind === 'VISIT') return { kind: call.kind, value: undefined };
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    1,
  );

  const iterator = new AsyncRunnerSession(driver).getIterable({
    iterateOver: [],
  });
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(observedInFlight.length).toBeGreaterThan(4);
  expect(observedInFlight.every((count) => count === 1)).toBe(true);
});
