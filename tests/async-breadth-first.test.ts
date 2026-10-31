import { treeResolution } from './source-result-fixtures';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncBreadthFirstTreeTraversal,
  BreadthFirstPhase as Order,
  BreadthFirstTreeTraversal,
} from '../src/traversals/breadth-first-traversal';
import { ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import {
  createInternalAsyncBreadthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type Node = { $data: string; $childHints: (Node | null)[] };
type Tree = VertexTypes<string, Node | null>;
const node = ($data: string, ...$childHints: (Node | null)[]): Node => ({
  $data,
  $childHints,
});

function traversal(
  root: Node | null = node('root', node('A'), node('B')),
  concurrency = Infinity,
) {
  return new AsyncBreadthFirstTreeTraversal<Tree>({
    traversableTree: {
      resolveRoot: () => treeResolution(root),
      resolveChild: async (hint) => treeResolution(hint),
    },
    concurrency,
  });
}

async function values(runner: {
  iterateEvents(): AsyncIterable<{ vertex: { getData(): string } }>;
}): Promise<string[]> {
  const seen: string[] = [];
  for await (const event of runner.iterateEvents())
    seen.push(event.vertex.getData());
  return seen;
}

test('accepts prefetched children in dequeue order rather than settlement order', async () => {
  const first = deferred<{
    kind: 'found';
    vertex: { vertexContent: { $data: string; $childHints: string[] } };
  }>();
  const second = deferred<{
    kind: 'found';
    vertex: { vertexContent: { $data: string; $childHints: string[] } };
  }>();
  const runner = new AsyncBreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['A', 'B'] } },
      }),
      resolveChild: (hint) => (hint === 'A' ? first.promise : second.promise),
    },
    concurrency: 2,
  }).createRunner();
  const iterator = runner.iterateEvents();

  expect((await iterator.next()).value?.vertex.getData()).toBe('root');
  const result = iterator.next();
  await eventLoopTurn();
  second.resolve({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'B', $childHints: [] } },
  });
  first.resolve({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'A', $childHints: [] } },
  });

  expect((await result).value?.vertex.getData()).toBe('A');
  expect((await iterator.next()).value?.vertex.getData()).toBe('B');
  expect(await iterator.next()).toEqual({ done: true, value: undefined });
});

test('projects level-order events and asynchronous visitor metadata', async () => {
  const metadata: Array<[string, number, string | undefined]> = [];
  const t = traversal(node('root', node('child')));
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex, options) => {
    metadata.push([
      vertex.getData(),
      options.phaseVisitIndex,
      options.previousPhaseVertexRef?.getValue().getData(),
    ]);
  });
  const events = [];
  for await (const event of t.createRunner().iterateEvents())
    events.push(event);

  expect(events.map(({ vertex }) => vertex.getData())).toEqual([
    'root',
    'child',
  ]);
  expect(events.map(({ phase }) => phase)).toEqual([
    Order.LEVEL_ORDER,
    Order.LEVEL_ORDER,
  ]);
  expect(events.map(({ isTreeRoot }) => isTreeRoot)).toEqual([true, false]);
  expect(events.every((event) => !('isTraversalRoot' in event))).toBe(true);
  expect(metadata).toEqual([
    ['root', 0, undefined],
    ['child', 1, 'root'],
  ]);
});

test('rejects graph metadata returned by an asynchronous tree source', async () => {
  const runner = new AsyncBreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
      resolveRoot: async () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: [] },
          vertexId: 'root',
        },
      }),
      resolveChild: () => ({ kind: 'omitted' as const }),
    },
  }).createRunner();

  await expect(runner.run()).rejects.toThrow(/tree source.*metadata/i);
});

test('deleting the root skips prefetched children and clears the tree root', async () => {
  const calls: string[] = [];
  const t = new AsyncBreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'root', $childHints: ['hidden'] } },
      }),
      resolveChild: async (hint) => {
        calls.push(hint);
        return {
          kind: 'found' as const,
          vertex: { vertexContent: { $data: hint, $childHints: [] } },
        };
      },
    },
    concurrency: 2,
  });
  t.addVisitorFor(Order.LEVEL_ORDER, async () => ({
    commands: [{ commandName: Command.DELETE_TREE_SUBTREE }],
  }));
  const runner = t.createRunner();

  const yielded: string[] = [];
  for await (const event of runner.iterateEvents()) {
    yielded.push(event.vertex.getData());
  }
  expect(yielded).toEqual([]);
  expect(calls).toEqual([]);
  expect(runner.getResolvedTreeView().getRoot()).toBeNull();
});

test('preserves paused visitor outcomes through repeated resumptions', async () => {
  const seen: string[] = [];
  const t = traversal(node('root', node('child')));
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    seen.push(`halt:${vertex.getData()}`);
    return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
  });
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    seen.push(`after:${vertex.getData()}`);
  });
  const runner = t.createRunner();

  await runner.run({ emitEvents: [] });
  expect(runner.inspect().chains[0]).toMatchObject({
    phase: Order.LEVEL_ORDER,
    state: 'paused',
    visitorIndex: 1,
  });
  expect(seen).toEqual(['halt:root']);
  await runner.run({ emitEvents: [] });
  expect(seen).toEqual(['halt:root', 'after:root', 'halt:child']);
  await runner.run({ emitEvents: [] });
  expect(seen).toEqual([
    'halt:root',
    'after:root',
    'halt:child',
    'after:child',
  ]);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('retains prefetched outcomes settled during halt and resumes in dequeue order', async () => {
  type Result = {
    kind: 'found';
    vertex: { vertexContent: { $data: string; $childHints: string[] } };
  };
  const pending = {
    A: deferred<Result>(),
    B: deferred<Result>(),
    C: deferred<Result>(),
  };
  const calls: string[] = [];
  const traversal = new AsyncBreadthFirstTreeTraversal<TestGraph>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: ['A', 'B', 'C'] },
        },
      }),
      resolveChild: (hint) => {
        calls.push(hint);
        return pending[hint as keyof typeof pending].promise;
      },
    },
    concurrency: 3,
  });
  traversal.addVisitorFor(Order.LEVEL_ORDER, async (vertex) =>
    vertex.getData() === 'A'
      ? { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] }
      : undefined,
  );
  const runner = traversal.createRunner();
  const iterator = runner.iterateEvents();

  expect((await iterator.next()).value?.vertex.getData()).toBe('root');
  const halted = iterator.next();
  await eventLoopTurn();
  expect(calls).toEqual(['A', 'B', 'C']);
  pending.A.resolve({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'A', $childHints: [] } },
  });
  expect(await halted).toEqual({ done: true, value: undefined });
  expect(runner.getStatus()).toBe(Status.HALTED);

  pending.C.resolve({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'C', $childHints: [] } },
  });
  pending.B.resolve({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'B', $childHints: [] } },
  });
  await eventLoopTurn();

  await expect(values(runner)).resolves.toEqual(['A', 'B', 'C']);
  expect(calls).toEqual(['A', 'B', 'C']);
});

test('uses new iterator filters when resuming after consumer closure', async () => {
  const visited: string[] = [];
  const t = traversal(node('root', node('child')));
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    visited.push(vertex.getData());
  });
  const runner = t.createRunner();
  for await (const event of runner.iterateEvents({
    visitorPhases: { exclude: [Order.LEVEL_ORDER] },
  })) {
    expect(event.vertex.getData()).toBe('root');
    break;
  }
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(runner.isHalted()).toBe(true);
  expect(visited).toEqual([]);

  await runner.run({
    emitEvents: [],
    visitorPhases: { include: [Order.LEVEL_ORDER] },
  });
  expect(visited).toEqual(['child']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('directly exposes session iterator ownership and synchronous close control', async () => {
  const runner = traversal().createRunner();
  const first = runner.iterateEvents();
  expect((await first.next()).done).toBe(false);
  const second = runner.iterateEvents();
  await expect(second.next()).rejects.toThrow('Another active iterator');
  await expect(first.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(runner.getStatus()).toBe(Status.HALTED);
});

test('an unopened iterator does not change later execution filters', async () => {
  const visited: string[] = [];
  const t = traversal(node('root'));
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    visited.push(vertex.getData());
  });
  const runner = t.createRunner();

  runner.iterateEvents({
    visitorPhases: { exclude: [Order.LEVEL_ORDER] },
  });
  await runner.run();

  expect(visited).toEqual(['root']);
});

test('a lease-rejected iterator does not change resumed execution filters', async () => {
  const visited: string[] = [];
  const t = traversal(node('root', node('child')));
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    visited.push(vertex.getData());
  });
  const runner = t.createRunner();
  const active = runner.iterateEvents();
  expect((await active.next()).value?.vertex.getData()).toBe('root');

  const rejected = runner.iterateEvents({
    visitorPhases: { exclude: [Order.LEVEL_ORDER] },
  });
  await expect(rejected.next()).rejects.toThrow('Another active iterator');
  await active.return(undefined);
  await runner.run();

  expect(visited).toEqual(['root', 'child']);
});

test('snapshots builder configuration and reuses injected tree storage and state', async () => {
  const first = await traversal(node('root', node('child')))
    .createRunner()
    .run();
  const state = runnerInternals(traversal().createRunner()).state;
  const visitors: string[] = [];
  const t = createInternalAsyncBreadthFirstTreeTraversal<Tree>({
    traversableTree: {
      resolveRoot: () => {
        throw new Error('Existing root must be reused');
      },
      resolveChild: (hint) => treeResolution(hint),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: runnerInternals(first).resolvedTreesContainer,
      state,
    },
  }).configure({ transformChildHints: async (hints) => hints.reverse() });
  t.setVisitorsFor(Order.LEVEL_ORDER, [
    {
      priority: 1,
      commandCommitMode: 'afterEachVisitor' as const,
      visitor: async (vertex) => {
        visitors.push(vertex.getData());
      },
    },
  ]);
  expect(t.listVisitorsFor(Order.LEVEL_ORDER)).toHaveLength(1);
  const runner = t.createRunner();
  t.addVisitorFor(Order.LEVEL_ORDER, async () => {
    visitors.push('late');
  });

  expect(runnerInternals(runner).state.visitorsState).toBe(state.visitorsState);
  expect(runnerInternals(runner).state.subtreeTraversalDisabledRefs).toBe(
    state.subtreeTraversalDisabledRefs,
  );
  await runner.run({ emitEvents: [] });
  expect(visitors).toEqual(['root', 'child']);
  expect(runner.getResolvedTreeView().getRoot()).toBe(
    first.getResolvedTreeView().getRoot(),
  );
  expect(runner.getResolvedGraphView().getRoot()).toBe(
    first.getResolvedGraphView().getRoot(),
  );
});

test.each([null, undefined])(
  'rethrows an original %p failure on every attempted rerun',
  async (failure) => {
    const runner = new AsyncBreadthFirstTreeTraversal<TestGraph>({
      traversableTree: {
        resolveRoot: async () => {
          throw failure;
        },
        resolveChild: () => ({ kind: 'omitted' as const }),
      },
    }).createRunner();
    await expect(runner.run()).rejects.toBe(failure);
    expect(runner.getStatus()).toBe(Status.FAILED);
    await expect(runner.run()).rejects.toBe(failure);
    await expect(runner.iterateEvents().next()).rejects.toBe(failure);
  },
);

test('validates, defaults, and inspects concurrency without advancing traversal', () => {
  const runner = traversal(undefined, 2).createRunner();
  expect(runner.inspect()).toMatchObject({
    execution: 'async',
    kind: 'breadth-first',
    concurrency: 2,
    inFlightCallbackCount: 0,
    bufferedEventCount: 0,
  });
  expect(runner.getStatus()).toBe(Status.INITIAL);
  expect(() => traversal(undefined, 0)).toThrow(TypeError);
  expect(() => traversal(undefined, 1.5)).toThrow(TypeError);
  expect(traversal().createRunner().inspect().concurrency).toBe(Infinity);
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
        Order.LEVEL_ORDER
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
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: root },
      }),
      resolveChild: (hint: Node | null) => treeResolution(hint),
    };
    const expected = Array.from(
      new BreadthFirstTreeTraversal<Tree>({ traversableTree: tree })
        .createRunner()
        .iterateEvents(),
      (event) => event.vertex.getData(),
    );
    await expect(
      values(
        new AsyncBreadthFirstTreeTraversal<Tree>({
          traversableTree: tree,
          concurrency: 3,
        }).createRunner(),
      ),
    ).resolves.toEqual(expected);
  }
});
