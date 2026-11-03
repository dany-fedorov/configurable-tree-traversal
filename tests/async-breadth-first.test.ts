import { treeResolution } from './source-result-fixtures';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase as Order,
  BreadthFirstTreeTraversalBuilder,
} from '../src/traversals/breadth-first-traversal';
import { ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import {
  createInternalAsyncBreadthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type Node = { $vertexData: string; $childDiscoveryHints: (Node | null)[] };
type Tree = VertexDataAndChildHintTypes<string, Node | null>;
const node = (
  $vertexData: string,
  ...$childDiscoveryHints: (Node | null)[]
): Node => ({
  $vertexData,
  $childDiscoveryHints,
});

function traversal(
  root: Node | null = node('root', node('A'), node('B')),
  maxConcurrentCallbackInvocations = Infinity,
) {
  return new AsyncBreadthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: {
      resolveRootVertex: () => treeResolution(root),
      resolveChildVertexFromHint: async (hint) => treeResolution(hint),
    },
    maxConcurrentCallbackInvocations,
  });
}

async function values(runner: {
  runAndIterateObservationEventsUntilSuspendedOrTerminal(): AsyncIterable<{
    vertex: { getVertexData(): string };
  }>;
}): Promise<string[]> {
  const seen: string[] = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
    seen.push(event.vertex.getVertexData());
  return seen;
}

test('accepts prefetched children in dequeue order rather than settlement order', async () => {
  const first = deferred<{
    kind: 'vertexResolved';
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: string;
        $childDiscoveryHints: string[];
      };
    };
  }>();
  const second = deferred<{
    kind: 'vertexResolved';
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: string;
        $childDiscoveryHints: string[];
      };
    };
  }>();
  const runner = new AsyncBreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['A', 'B'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) =>
        hint === 'A' ? first.promise : second.promise,
    },
    maxConcurrentCallbackInvocations: 2,
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();

  expect((await iterator.next()).value?.vertex.getVertexData()).toBe('root');
  const result = iterator.next();
  await eventLoopTurn();
  second.resolve({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'B', $childDiscoveryHints: [] },
    },
  });
  first.resolve({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'A', $childDiscoveryHints: [] },
    },
  });

  expect((await result).value?.vertex.getVertexData()).toBe('A');
  expect((await iterator.next()).value?.vertex.getVertexData()).toBe('B');
  expect(await iterator.next()).toEqual({ done: true, value: undefined });
});

test('projects level-order events and asynchronous visitor metadata', async () => {
  const metadata: Array<[string, number, string | undefined]> = [];
  const t = traversal(node('root', node('child')));
  t.registerVisitorCallbackForPhase(
    Order.AT_LEVEL_ORDER_VERTEX,
    async (vertex, options) => {
      metadata.push([
        vertex.getVertexData(),
        options.phaseVisitorChainIndex,
        options.previousCommittedVisitVertexHandleForSamePhase
          ?.getCurrentVertexView()
          .getVertexData(),
      ]);
    },
  );
  const events = [];
  for await (const event of t
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal())
    events.push(event);

  expect(events.map(({ vertex }) => vertex.getVertexData())).toEqual([
    'root',
    'child',
  ]);
  expect(events.map(({ eventKind: phase }) => phase)).toEqual([
    Order.AT_LEVEL_ORDER_VERTEX,
    Order.AT_LEVEL_ORDER_VERTEX,
  ]);
  expect(events.map(({ isTreeRoot }) => isTreeRoot)).toEqual([true, false]);
  expect(events.every((event) => !('isTraversalRoot' in event))).toBe(true);
  expect(metadata).toEqual([
    ['root', 0, undefined],
    ['child', 1, 'root'],
  ]);
});

test('rejects graph metadata returned by an asynchronous tree source', async () => {
  const runner = new AsyncBreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveRootVertex: async () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
          vertexId: 'root',
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();

  await expect(runner.runUntilSuspendedOrTerminal()).rejects.toThrow(
    /tree source.*metadata/i,
  );
});

test('deleting the root skips prefetched children and clears the tree root', async () => {
  const calls: string[] = [];
  const t = new AsyncBreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['hidden'],
          },
        },
      }),
      resolveChildVertexFromHint: async (hint) => {
        calls.push(hint);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
    maxConcurrentCallbackInvocations: 2,
  });
  t.registerVisitorCallbackForPhase(Order.AT_LEVEL_ORDER_VERTEX, async () => ({
    commands: [
      {
        commandName:
          Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
      },
    ],
  }));
  const runner = t.createIndependentRunnerFromCurrentOptions();

  const yielded: string[] = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
    yielded.push(event.vertex.getVertexData());
  }
  expect(yielded).toEqual([]);
  expect(calls).toEqual([]);
  expect(
    runner.getLiveResolvedTreeView().getRootVertexHandleOrNull(),
  ).toBeNull();
});

test('preserves paused visitor outcomes through repeated resumptions', async () => {
  const seen: string[] = [];
  const t = traversal(node('root', node('child')));
  t.registerVisitorCallbackForPhase(
    Order.AT_LEVEL_ORDER_VERTEX,
    async (vertex) => {
      seen.push(`halt:${vertex.getVertexData()}`);
      return {
        commands: [
          { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
        ],
      };
    },
  );
  t.registerVisitorCallbackForPhase(
    Order.AT_LEVEL_ORDER_VERTEX,
    async (vertex) => {
      seen.push(`after:${vertex.getVertexData()}`);
    },
  );
  const runner = t.createIndependentRunnerFromCurrentOptions();

  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(
    runner.captureExecutionSnapshot().vertexPhaseVisitorChains[0],
  ).toMatchObject({
    visitorPhase: Order.AT_LEVEL_ORDER_VERTEX,
    state: 'pausedAtCommandBoundary',
    visitorCallbackIndexInPhaseChain: 1,
  });
  expect(seen).toEqual(['halt:root']);
  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(seen).toEqual(['halt:root', 'after:root', 'halt:child']);
  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(seen).toEqual([
    'halt:root',
    'after:root',
    'halt:child',
    'after:child',
  ]);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

test('retains prefetched outcomes settled during halt and resumes in dequeue order', async () => {
  type Result = {
    kind: 'vertexResolved';
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: string;
        $childDiscoveryHints: string[];
      };
    };
  };
  const pending = {
    A: deferred<Result>(),
    B: deferred<Result>(),
    C: deferred<Result>(),
  };
  const calls: string[] = [];
  const traversal = new AsyncBreadthFirstTreeTraversalBuilder<TestGraph>({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['A', 'B', 'C'],
          },
        },
      }),
      resolveChildVertexFromHint: (hint) => {
        calls.push(hint);
        return pending[hint as keyof typeof pending].promise;
      },
    },
    maxConcurrentCallbackInvocations: 3,
  });
  traversal.registerVisitorCallbackForPhase(
    Order.AT_LEVEL_ORDER_VERTEX,
    async (vertex) =>
      vertex.getVertexData() === 'A'
        ? {
            commands: [
              {
                commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
              },
            ],
          }
        : undefined,
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();

  expect((await iterator.next()).value?.vertex.getVertexData()).toBe('root');
  const halted = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['A', 'B', 'C']);
  pending.A.resolve({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'A', $childDiscoveryHints: [] },
    },
  });
  expect(await halted).toEqual({ done: true, value: undefined });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);

  pending.C.resolve({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'C', $childDiscoveryHints: [] },
    },
  });
  pending.B.resolve({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'B', $childDiscoveryHints: [] },
    },
  });
  await eventLoopTurn();

  await expect(values(runner)).resolves.toEqual(['A', 'B', 'C']);
  expect(calls).toEqual(['A', 'B', 'C']);
});

test('uses new iterator filters when resuming after consumer closure', async () => {
  const visited: string[] = [];
  const t = traversal(node('root', node('child')));
  t.registerVisitorCallbackForPhase(
    Order.AT_LEVEL_ORDER_VERTEX,
    async (vertex) => {
      visited.push(vertex.getVertexData());
    },
  );
  const runner = t.createIndependentRunnerFromCurrentOptions();
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      admittedVisitorCallbackPhases: { exclude: [Order.AT_LEVEL_ORDER_VERTEX] },
    },
  )) {
    expect(event.vertex.getVertexData()).toBe('root');
    break;
  }
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect(runner.isSuspended()).toBe(true);
  expect(visited).toEqual([]);

  await runner.runUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
    admittedVisitorCallbackPhases: { include: [Order.AT_LEVEL_ORDER_VERTEX] },
  });
  expect(visited).toEqual(['child']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

test('directly exposes session iterator ownership and synchronous close control', async () => {
  const runner = traversal().createIndependentRunnerFromCurrentOptions();
  const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect((await first.next()).done).toBe(false);
  const second =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  await expect(second.next()).rejects.toThrow('Another active iterator');
  await expect(first.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
});

test('an unopened iterator does not change later execution filters', async () => {
  const visited: string[] = [];
  const t = traversal(node('root'));
  t.registerVisitorCallbackForPhase(
    Order.AT_LEVEL_ORDER_VERTEX,
    async (vertex) => {
      visited.push(vertex.getVertexData());
    },
  );
  const runner = t.createIndependentRunnerFromCurrentOptions();

  runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    admittedVisitorCallbackPhases: { exclude: [Order.AT_LEVEL_ORDER_VERTEX] },
  });
  await runner.runUntilSuspendedOrTerminal();

  expect(visited).toEqual(['root']);
});

test('a lease-rejected iterator does not change resumed execution filters', async () => {
  const visited: string[] = [];
  const t = traversal(node('root', node('child')));
  t.registerVisitorCallbackForPhase(
    Order.AT_LEVEL_ORDER_VERTEX,
    async (vertex) => {
      visited.push(vertex.getVertexData());
    },
  );
  const runner = t.createIndependentRunnerFromCurrentOptions();
  const active =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect((await active.next()).value?.vertex.getVertexData()).toBe('root');

  const rejected =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { exclude: [Order.AT_LEVEL_ORDER_VERTEX] },
    });
  await expect(rejected.next()).rejects.toThrow('Another active iterator');
  await active.return(undefined);
  await runner.runUntilSuspendedOrTerminal();

  expect(visited).toEqual(['root', 'child']);
});

test('snapshots builder configuration and reuses injected tree storage and state', async () => {
  const first = await traversal(node('root', node('child')))
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const state = runnerInternals(
    traversal().createIndependentRunnerFromCurrentOptions(),
  ).state;
  const visitors: string[] = [];
  const t = createInternalAsyncBreadthFirstTreeTraversal<Tree>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChildVertexFromHint: (hint) => treeResolution(hint),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
      state,
    },
  }).patchOptionsForFutureRunners({
    transformChildHintsBeforeResolution: async (hints) => hints.reverse(),
  });
  t.replaceVisitorDefinitionsForPhase(Order.AT_LEVEL_ORDER_VERTEX, [
    {
      descendingExecutionPriorityWithinGroup: 1,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      visitor: async (vertex) => {
        visitors.push(vertex.getVertexData());
      },
    },
  ]);
  expect(
    t.getDetachedVisitorRegistrationRecordsForPhase(
      Order.AT_LEVEL_ORDER_VERTEX,
    ),
  ).toHaveLength(1);
  const runner = t.createIndependentRunnerFromCurrentOptions();
  t.registerVisitorCallbackForPhase(Order.AT_LEVEL_ORDER_VERTEX, async () => {
    visitors.push('late');
  });

  expect(runnerInternals(runner).state.visitorsState).toBe(state.visitorsState);
  expect(runnerInternals(runner).state.subtreeTraversalDisabledRefs).toBe(
    state.subtreeTraversalDisabledRefs,
  );
  await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(visitors).toEqual(['root', 'child']);
  expect(runner.getLiveResolvedTreeView().getRootVertexHandleOrNull()).toBe(
    first.getLiveResolvedTreeView().getRootVertexHandleOrNull(),
  );
  expect(
    runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
  ).toBe(first.getLiveResolvedGraphView().getDesignatedRootHandleOrNull());
});

test.each([null, undefined])(
  'rethrows an original %p failure on every attempted rerun',
  async (failure) => {
    const runner = new AsyncBreadthFirstTreeTraversalBuilder<TestGraph>({
      treeDiscoverySource: {
        resolveRootVertex: async () => {
          throw failure;
        },
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toBe(failure);
    await expect(
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
    ).rejects.toBe(failure);
  },
);

test('validates, defaults, and inspects concurrency without advancing traversal', () => {
  const runner = traversal(
    undefined,
    2,
  ).createIndependentRunnerFromCurrentOptions();
  expect(runner.captureExecutionSnapshot()).toMatchObject({
    callbackExecutionMode: 'async',
    traversalAlgorithm: 'breadth-first',
    maxConcurrentCallbackInvocations: 2,
    inFlightInvocationCount: 0,
    bufferedDeliveryEventCount: 0,
  });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.NOT_STARTED);
  expect(() => traversal(undefined, 0)).toThrow(TypeError);
  expect(() => traversal(undefined, 1.5)).toThrow(TypeError);
  expect(
    traversal()
      .createIndependentRunnerFromCurrentOptions()
      .captureExecutionSnapshot().maxConcurrentCallbackInvocations,
  ).toBe(Infinity);
  expect(
    Object.isFrozen(ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG),
  ).toBe(true);
  expect(
    Object.isFrozen(
      ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.visitors,
    ),
  ).toBe(true);
  expect(
    Object.isFrozen(
      ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.visitors[
        Order.AT_LEVEL_ORDER_VERTEX
      ],
    ),
  ).toBe(true);
  expect(
    Object.isFrozen(
      ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG.traversalRunnerInternalObjects,
    ),
  ).toBe(true);
});

test('matches synchronous BFS for timing-independent generated trees', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    let value = seed;
    const random = () =>
      ((value = (value * 48271) % 2147483647) - 1) / 2147483646;
    const make = (depth: number, label: string): Node =>
      node(
        label,
        ...(depth === 0
          ? []
          : Array.from({ length: Math.floor(random() * 4) }, (_, index) =>
              random() < 0.25 ? null : make(depth - 1, `${label}.${index}`),
            )),
      );
    const root = make(4, 'root');
    const tree = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: { vertexContentInput: root },
      }),
      resolveChildVertexFromHint: (hint: Node | null) => treeResolution(hint),
    };
    const expected = Array.from(
      new BreadthFirstTreeTraversalBuilder<Tree>({ treeDiscoverySource: tree })
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
      (event) => event.vertex.getVertexData(),
    );
    await expect(
      values(
        new AsyncBreadthFirstTreeTraversalBuilder<Tree>({
          treeDiscoverySource: tree,
          maxConcurrentCallbackInvocations: 3,
        }).createIndependentRunnerFromCurrentOptions(),
      ),
    ).resolves.toEqual(expected);
  }
});
