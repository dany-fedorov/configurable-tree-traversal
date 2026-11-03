import { AsyncRunnerSession } from '../src/core/drivers/AsyncRunnerSession';
import { createAsyncDriver } from '../src/core/drivers/runAsync';
import type {
  CallbackBindings,
  CallSpec,
  KernelPort,
} from '../src/core/effects/types';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import type { VisitorCallbackReturnValue } from '../src/core/graph/types';
import { TraversalKernel } from '../src/core/TraversalKernel';
import { TraversalRunnerStatus } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

function makeKernel(
  maxConcurrentCallbackInvocations = 2,
  container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  }),
  options: {
    hasChildHintsListTransformer?: boolean;
    hasChildHintVertexIdResolver?: boolean;
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
      status: TraversalRunnerStatus.NOT_STARTED,
      traversalRootVertexRef: null,
      subtreeTraversalDisabledRefs: new Set(),
      visitorsState: {},
    },
    visitorMetadata: {
      ON_WORK_READY: [
        ...Array.from(
          { length: options.readyVisitorCount ?? 1 },
          (_, phaseRegistrationInsertionIndex) => ({
            phaseRegistrationInsertionIndex,
            descendingExecutionPriorityWithinGroup: 100,
            visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
          }),
        ),
      ],
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
      iterateOver: options.includeCompletion
        ? ['ON_WORK_READY', 'ON_SUBGRAPH_COMPLETION_READY']
        : ['ON_WORK_READY'],
      enableVisitorFunctionsFor: null,
      disableVisitorFunctionsFor: null,
    },
    inOrderConfig: null,
    hasChildHintsListTransformer: options.hasChildHintsListTransformer ?? false,
    hasChildHintVertexIdResolver: options.hasChildHintVertexIdResolver ?? false,
    maxConcurrentCallbackInvocations,
  });
}

test('delivers an unrelated DAG chain while another frame resolver is pending', async () => {
  const a = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const b = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const slow = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
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
            vertexContent: {
              $vertexData: 'root',
              $childDiscoveryHints: ['A', 'B'],
            },
          },
        };
      }
      if (call.kind === 'MAKE_VERTEX') {
        const hint = call.context.childDiscoveryHint;
        started.push(hint);
        const value =
          hint === 'A' ? a.promise : hint === 'B' ? b.promise : slow.promise;
        return { kind: call.kind, value };
      }
      if (call.kind === 'VISIT') {
        const data = call.ref.getReferencedValue().getVertexData();
        return {
          kind: call.kind,
          value: data === 'B' ? bVisit.promise : undefined,
        };
      }
      throw new Error(`Unexpected ${call.kind}`);
    },
  };
  const driver = createAsyncDriver(kernel, bindings, 2);
  const iterator = new AsyncRunnerSession(
    driver,
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await expect(iterator.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'root' } },
  });
  const aEvent = iterator.next();
  await eventLoopTurn();
  expect(started).toEqual(['A', 'B']);

  a.resolve({
    vertexId: 'A',
    workWaitsForWorkOf: ['root'],
    vertexContent: { $vertexData: 'A', $childDiscoveryHints: ['slow'] },
  });
  b.resolve({
    vertexId: 'B',
    workWaitsForWorkOf: ['root'],
    vertexContent: { $vertexData: 'B', $childDiscoveryHints: [] },
  });
  await expect(aEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'A' } },
  });

  const nextEvent = iterator.next();
  await eventLoopTurn();
  expect(started).toEqual(['A', 'B', 'slow']);
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(2);

  bVisit.resolve();
  await expect(nextEvent).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'B' } },
  });
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);

  await iterator.return(undefined);
  slow.resolve({
    vertexId: 'slow',
    workWaitsForWorkOf: ['A'],
    vertexContent: { $vertexData: 'slow', $childDiscoveryHints: [] },
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B', 'C'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.childDiscoveryHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              workWaitsForWorkOf: ['root'],
              vertexContent: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          return {
            kind: call.kind,
            value: visits.get(call.ref.getReferencedValue().getVertexData())
              ?.promise,
          };
        }
        throw new Error('Unexpected callback');
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(
    driver,
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await iterator.next();
  const pending = iterator.next();
  await eventLoopTurn();
  await eventLoopTurn();

  expect(
    kernel.captureExecutionSnapshot().vertexPhaseVisitorChains,
  ).toHaveLength(2);
  expect(
    kernel.captureExecutionSnapshot().dependencyEligiblePhaseVisits,
  ).toHaveLength(1);
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(2);

  const closing = iterator.return(undefined);
  visits.get('A')!.resolve();
  visits.get('B')!.resolve();
  await expect(closing).resolves.toEqual({ done: true, value: undefined });
  await expect(pending).resolves.toEqual({ done: true, value: undefined });
});

test('accepts duplicate identities in resolver settlement order', async () => {
  const first = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const second = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['first', 'second'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          return {
            kind: call.kind,
            value:
              call.context.childDiscoveryHint === 'first'
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
    workWaitsForWorkOf: ['root'],
    vertexContent: { $vertexData: 'second-won', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  driver.advance('drive');

  expect(
    kernel.captureExecutionSnapshot().vertexTraversalFrames[0]
      ?.pendingChildHintIndices,
  ).toEqual([0]);
  expect(
    container.liveResolvedGraphView
      .getVertexRefs()
      .map((ref) => ref.getReferencedValue().getVertexData()),
  ).toEqual(['root', 'second-won']);

  first.resolve({
    vertexId: 'duplicate',
    workWaitsForWorkOf: ['root'],
    vertexContent: { $vertexData: 'first-lost', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  driver.advance('drive');
  driver.advance('drive');
  const rootRef = container.liveResolvedGraphView.getRoot()!;
  const children = container.liveResolvedGraphView.getChildrenOf(rootRef)!;
  expect(children).toHaveLength(2);
  expect(children[0]).toBe(children[1]);
  expect(container.liveResolvedGraphView.getVertexRefs()).toHaveLength(2);
});

test('preserves resolver settlement order across a halt and resume', async () => {
  const blocker = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const first = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const second = deferred<{
    vertexId: string;
    workWaitsForWorkOf: string[];
    vertexContent: { $vertexData: string; $childDiscoveryHints: string[] };
  }>();
  const blockerVisit = deferred<void>();
  const container = new ResolvedGraphsContainer<TestGraph>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const kernel = makeKernel(3, container);
  const driver = createAsyncDriver(
    kernel,
    {
      invoke(call) {
        if (call.kind === 'MAKE_ROOT') {
          return {
            kind: call.kind,
            value: {
              vertexId: 'root',
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['blocker', 'first', 'second'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const value =
            call.context.childDiscoveryHint === 'blocker'
              ? blocker.promise
              : call.context.childDiscoveryHint === 'first'
              ? first.promise
              : second.promise;
          return { kind: call.kind, value };
        }
        if (call.kind === 'VISIT') {
          return {
            kind: call.kind,
            value:
              call.ref.getReferencedValue().getVertexData() === 'blocker'
                ? blockerVisit.promise
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    3,
  );

  driver.advance('drive');
  await eventLoopTurn();
  driver.advance('drive');
  await eventLoopTurn();
  const rootEvent = driver.advance('drive');
  if (rootEvent.kind !== 'EVENT') throw new Error('Expected root event');
  driver.acknowledgeEvent(rootEvent.boundaryId);
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });

  blocker.resolve({
    vertexId: 'blocker',
    workWaitsForWorkOf: ['root'],
    vertexContent: { $vertexData: 'blocker', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  driver.requestHalt();

  second.resolve({
    vertexId: 'duplicate',
    workWaitsForWorkOf: ['root'],
    vertexContent: { $vertexData: 'second-won', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  expect(driver.advance('drain')).toEqual({ kind: 'WAIT' });
  first.resolve({
    vertexId: 'duplicate',
    workWaitsForWorkOf: ['root'],
    vertexContent: { $vertexData: 'first-lost', $childDiscoveryHints: [] },
  });
  await eventLoopTurn();
  expect(driver.advance('drain')).toEqual({ kind: 'WAIT' });
  expect(
    container.liveResolvedGraphView
      .getVertexRefs()
      .map((ref) => ref.getReferencedValue().getVertexData()),
  ).toEqual(['root', 'blocker']);

  blockerVisit.resolve();
  await eventLoopTurn();
  expect(driver.advance('drain')).toMatchObject({
    kind: 'EVENT',
    event: { vertex: { $vertexData: 'blocker' } },
  });
  expect(driver.advance('drain')).toEqual({ kind: 'SUSPENDED' });

  driver.resume();
  driver.advance('drive');
  expect(
    container.liveResolvedGraphView
      .getVertexRefs()
      .map((ref) => ref.getReferencedValue().getVertexData()),
  ).toContain('second-won');
  expect(
    container.liveResolvedGraphView
      .getVertexRefs()
      .map((ref) => ref.getReferencedValue().getVertexData()),
  ).not.toContain('first-lost');
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
    hasChildHintsListTransformer: true,
    hasChildHintVertexIdResolver: true,
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['first', 'second'],
              },
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
  expect(
    kernel.captureExecutionSnapshot().vertexTraversalFrames[0],
  ).toMatchObject({
    stage: 'transformingChildHints',
    pendingChildHintIndices: [],
  });

  sorted.resolve(['first', 'second']);
  await eventLoopTurn();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  expect(driver.captureExecutionSnapshot().inFlightInvocationCount).toBe(2);

  secondId.resolve({ vertexId: 'second' });
  await eventLoopTurn();
  driver.advance('drive');
  expect(
    kernel.captureExecutionSnapshot().vertexTraversalFrames[0]
      ?.pendingChildHintIndices,
  ).toEqual([0]);

  firstId.resolve({ vertexId: 'known-omission' });
  await eventLoopTurn();
  expect(driver.advance('drive')).toEqual({ kind: 'WAIT' });
  await eventLoopTurn();
  driver.advance('drive');
  expect(kernel.captureExecutionSnapshot().vertexTraversalFrames).toEqual([]);
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.childDiscoveryHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              workWaitsForWorkOf: ['root'],
              vertexContent: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          seen.push({
            vertex: call.ref.getReferencedValue().getVertexData(),
            order: call.order,
            index: call.metadata.phaseVisitorChainIndex,
            previous:
              call.metadata.previousCommittedVisitVertexHandleForSamePhase
                ?.getReferencedValue()
                .getVertexData() ?? null,
          });
          return {
            kind: call.kind,
            value:
              call.order === 'ON_WORK_READY' &&
              call.ref.getReferencedValue().getVertexData() === 'A'
                ? aVisit.promise
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(
    driver,
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $vertexData: 'root' }, order: 'ON_WORK_READY' },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $vertexData: 'B' }, order: 'ON_WORK_READY' },
  });
  await expect(iterator.next()).resolves.toMatchObject({
    value: {
      vertex: { $vertexData: 'B' },
      order: 'ON_SUBGRAPH_COMPLETION_READY',
    },
  });

  expect(seen.filter(({ order }) => order === 'ON_WORK_READY')).toEqual([
    { vertex: 'root', order: 'ON_WORK_READY', index: 0, previous: null },
    { vertex: 'A', order: 'ON_WORK_READY', index: 1, previous: 'root' },
    { vertex: 'B', order: 'ON_WORK_READY', index: 2, previous: 'root' },
  ]);

  aVisit.resolve();
  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $vertexData: 'A' }, order: 'ON_WORK_READY' },
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const hint = call.context.childDiscoveryHint;
          if (hint === 'A' || hint === 'B') {
            return {
              kind: call.kind,
              value: {
                vertexId: hint,
                workWaitsForWorkOf: ['root'],
                vertexContent: {
                  $vertexData: hint,
                  $childDiscoveryHints: [`join-from-${hint}`],
                },
              },
            };
          }
          return {
            kind: call.kind,
            value: {
              vertexId: 'join',
              workWaitsForWorkOf: ['A', 'B'],
              vertexContent: { $vertexData: 'join', $childDiscoveryHints: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.getReferencedValue().getVertexData();
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
  const iterator = new AsyncRunnerSession(
    driver,
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await iterator.next();
  const aEvent = iterator.next();
  await eventLoopTurn();
  aVisit.resolve();
  await expect(aEvent).resolves.toMatchObject({
    value: { vertex: { $vertexData: 'A' } },
  });

  const bEvent = iterator.next();
  await eventLoopTurn();
  expect(visited).not.toContain('join');
  bVisit.resolve();
  await expect(bEvent).resolves.toMatchObject({
    value: { vertex: { $vertexData: 'B' } },
  });

  await expect(iterator.next()).resolves.toMatchObject({
    value: { vertex: { $vertexData: 'join' } },
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.childDiscoveryHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              workWaitsForWorkOf: id === 'B' ? ['A'] : ['root'],
              vertexContent: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.getReferencedValue().getVertexData();
          if (data === 'B' && call.order === 'ON_WORK_READY') {
            return { kind: call.kind, value: bVisit.promise };
          }
          return {
            kind: call.kind,
            value:
              data === 'A' && call.order === 'ON_SUBGRAPH_COMPLETION_READY'
                ? {
                    commands: [
                      {
                        commandName:
                          Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
                      },
                    ],
                  }
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const iterator = new AsyncRunnerSession(
    driver,
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  });

  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(driver.captureExecutionSnapshot()).toMatchObject({
    traversalLifecycleStatus: TraversalRunnerStatus.FINISHED,
    inFlightInvocationCount: 1,
    pendingCallbackRequests: [{ ownerStillValid: false }],
  });
  expect(
    container.liveResolvedGraphView
      .getVertexRefs()
      .map((ref) => ref.getReferencedValue().getVertexData()),
  ).not.toContain('B');

  bVisit.reject(new Error('late invalid failure'));
  await eventLoopTurn();
  expect(driver.advance('settle')).toEqual({ kind: 'FINISHED' });
  expect(kernel.getFailure()).toBeNull();
});

test('retains the first live failure and discards a later chain mutation', async () => {
  const failure = new Error('first live failure');
  const aVisit = deferred<void>();
  const bVisit = deferred<VisitorCallbackReturnValue<TestGraph>>();
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.childDiscoveryHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              workWaitsForWorkOf: ['root'],
              vertexContent: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.getReferencedValue().getVertexData();
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
  const iterator = new AsyncRunnerSession(
    driver,
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  });
  const result = iterator.next();
  await eventLoopTurn();
  await eventLoopTurn();

  aVisit.reject(failure);
  await expect(result).rejects.toBe(failure);
  bVisit.resolve({
    commands: [
      {
        commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: 'mutated' },
      },
    ],
  });
  await eventLoopTurn();

  expect(driver.advance('settle')).toEqual({ kind: 'FAILED', error: failure });
  expect(kernel.getFailure()).toEqual({ error: failure });
  expect(
    container.liveResolvedGraphView
      .getVertexRefs()
      .map((ref) => ref.getReferencedValue().getVertexData()),
  ).toContain('B');
  expect(
    container.liveResolvedGraphView
      .getVertexRefs()
      .map((ref) => ref.getReferencedValue().getVertexData()),
  ).not.toContain('mutated');
});

test('recalculates drain eligibility before releasing a queued frame permit', async () => {
  const running = deferred<{ vertexContent: null }>();
  const calls: CallSpec<TestGraph>[] = [
    {
      requestId: 1,
      kind: 'MAKE_ROOT',
      owner: {
        ownerKind: 'vertexPhaseVisitorChain',
        runnerLocalOwnerId: 1,
        validityGeneration: 0,
      },
    },
    {
      requestId: 2,
      kind: 'MAKE_ROOT',
      owner: {
        ownerKind: 'vertexTraversalFrame',
        runnerLocalOwnerId: 2,
        validityGeneration: 0,
      },
    },
  ];
  const started: number[] = [];
  let halted = false;
  const kernel = {
    poll() {
      if (halted) return { kind: 'SUSPENDED' as const };
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

  expect(driver.advance('drive')).toEqual({ kind: 'SUSPENDED' });
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
              vertexContent: {
                $vertexData: 'root',
                $childDiscoveryHints: ['A', 'B'],
              },
            },
          };
        }
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.childDiscoveryHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              workWaitsForWorkOf: ['root'],
              vertexContent: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        }
        if (call.kind === 'VISIT') {
          const data = call.ref.getReferencedValue().getVertexData();
          calls.push(`${data}:${call.recordIndex}`);
          return {
            kind: call.kind,
            value:
              data === 'A' && call.recordIndex === 0
                ? {
                    commands: [
                      {
                        commandName:
                          Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
                      },
                    ],
                  }
                : undefined,
          };
        }
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    2,
  );
  const session = new AsyncRunnerSession(driver);
  const first =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();

  await first.next();
  await expect(first.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'B' } },
  });
  await expect(first.next()).resolves.toEqual({ done: true, value: undefined });
  expect(calls.filter((call) => call.startsWith('A:'))).toEqual(['A:0']);
  expect(calls.filter((call) => call.startsWith('B:'))).toEqual(['B:0', 'B:1']);

  const resumed =
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(resumed.next()).resolves.toMatchObject({
    done: false,
    value: { vertex: { $vertexData: 'A' } },
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
        observedInFlight.push(
          driver.captureExecutionSnapshot().inFlightInvocationCount,
        );
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
        if (call.kind === 'MAKE_VERTEX') {
          const id = call.context.childDiscoveryHint;
          return {
            kind: call.kind,
            value: {
              vertexId: id,
              workWaitsForWorkOf: ['root'],
              vertexContent: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        }
        if (call.kind === 'VISIT') return { kind: call.kind, value: undefined };
        throw new Error(`Unexpected ${call.kind}`);
      },
    },
    1,
  );

  const iterator = new AsyncRunnerSession(
    driver,
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
  });
  await expect(iterator.next()).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(observedInFlight.length).toBeGreaterThan(4);
  expect(observedInFlight.every((count) => count === 1)).toBe(true);
});
