import {
  AsyncBreadthFirstTraversal,
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder as Order,
} from '../src/traversals/breadth-first-traversal';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG } from '../src/traversals/breadth-first-traversal/lib/AsyncBreadthFirstTraversalInstanceConfig';
import type { TestGraph } from './helpers/graph-fixtures';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type Node = { $d: string; $c: (Node | null)[] };
type Tree = TreeTypeParameters<string, Node | null>;
const node = ($d: string, ...$c: (Node | null)[]): Node => ({ $d, $c });

function traversal(
  root: Node | null = node('root', node('A'), node('B')),
  concurrency = Infinity,
) {
  return new AsyncBreadthFirstTraversal<Tree>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: root }),
      makeVertex: async (hint) => ({ vertexContent: hint }),
    },
    concurrency,
  });
}

async function values(
  runner: ReturnType<ReturnType<typeof traversal>['makeRunner']>,
): Promise<string[]> {
  const seen: string[] = [];
  for await (const event of runner.getIterable())
    seen.push(event.vertex.getData());
  return seen;
}

test('accepts prefetched children in dequeue order rather than settlement order', async () => {
  const first = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const second = deferred<{ vertexContent: { $d: string; $c: string[] } }>();
  const runner = new AsyncBreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
      makeVertex: (hint) => (hint === 'A' ? first.promise : second.promise),
    },
    concurrency: 2,
  }).makeRunner();
  const iterator = runner.getIterable();

  expect((await iterator.next()).value?.vertex.getData()).toBe('root');
  const result = iterator.next();
  await eventLoopTurn();
  second.resolve({ vertexContent: { $d: 'B', $c: [] } });
  first.resolve({ vertexContent: { $d: 'A', $c: [] } });

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
      options.vertexVisitIndex,
      options.previousVisitedVertexRef?.unref().getData(),
    ]);
  });
  const events = [];
  for await (const event of t.makeRunner().getIterable()) events.push(event);

  expect(events.map(({ vertex }) => vertex.getData())).toEqual([
    'root',
    'child',
  ]);
  expect(events.map(({ order }) => order)).toEqual([
    Order.LEVEL_ORDER,
    Order.LEVEL_ORDER,
  ]);
  expect(
    events.map(({ isTreeRoot, isTraversalRoot }) => [
      isTreeRoot,
      isTraversalRoot,
    ]),
  ).toEqual([
    [true, true],
    [false, false],
  ]);
  expect(metadata).toEqual([
    ['root', 0, undefined],
    ['child', 1, 'root'],
  ]);
});

test('rejects graph metadata returned by an asynchronous tree source', async () => {
  const runner = new AsyncBreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: async () => ({
        vertexContent: { $d: 'root', $c: [] },
        vertexId: 'root',
      }),
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner();

  await expect(runner.run()).rejects.toThrow(/tree source.*metadata/i);
});

test('deleting the root skips prefetched children and clears the tree root', async () => {
  const calls: string[] = [];
  const t = new AsyncBreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['hidden'] } }),
      makeVertex: async (hint) => {
        calls.push(hint);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
    concurrency: 2,
  });
  t.addVisitorFor(Order.LEVEL_ORDER, async () => ({
    commands: [{ commandName: Command.DELETE_VERTEX }],
  }));
  const runner = t.makeRunner();

  const yielded: string[] = [];
  for await (const event of runner.getIterable()) {
    yielded.push(event.vertex.getData());
  }
  expect(yielded).toEqual([]);
  expect(calls).toEqual([]);
  expect(runner.getResolvedTree().getRoot()).toBeNull();
});

test('preserves paused visitor outcomes through repeated resumptions', async () => {
  const seen: string[] = [];
  const t = traversal(node('root', node('child')));
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    seen.push(`halt:${vertex.getData()}`);
    return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
  });
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    seen.push(`after:${vertex.getData()}`);
  });
  const runner = t.makeRunner();

  await runner.run({ iterateOver: [] });
  expect(runner.inspect().chains[0]).toMatchObject({
    order: Order.LEVEL_ORDER,
    phase: 'paused',
    position: 1,
  });
  expect(seen).toEqual(['halt:root']);
  await runner.run({ iterateOver: [] });
  expect(seen).toEqual(['halt:root', 'after:root', 'halt:child']);
  await runner.run({ iterateOver: [] });
  expect(seen).toEqual([
    'halt:root',
    'after:root',
    'halt:child',
    'after:child',
  ]);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('uses new iterator filters when resuming after consumer closure', async () => {
  const visited: string[] = [];
  const t = traversal(node('root', node('child')));
  t.addVisitorFor(Order.LEVEL_ORDER, async (vertex) => {
    visited.push(vertex.getData());
  });
  const runner = t.makeRunner();
  for await (const event of runner.getIterable({
    disableVisitorFunctionsFor: [Order.LEVEL_ORDER],
  })) {
    expect(event.vertex.getData()).toBe('root');
    break;
  }
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(runner.isHalted()).toBe(true);
  expect(visited).toEqual([]);

  await runner.run({
    iterateOver: [],
    enableVisitorFunctionsFor: [Order.LEVEL_ORDER],
  });
  expect(visited).toEqual(['child']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('directly exposes session iterator ownership and synchronous close control', async () => {
  const runner = traversal().makeRunner();
  const first = runner.getIterable();
  expect((await first.next()).done).toBe(false);
  const second = runner.getIterable();
  await expect(second.next()).rejects.toThrow('Another active iterator');
  await expect(first.return(undefined)).resolves.toEqual({
    done: true,
    value: undefined,
  });
  expect(runner.getStatus()).toBe(Status.HALTED);
});

test('snapshots builder configuration and reuses injected tree storage and state', async () => {
  const first = await traversal(node('root', node('child')))
    .makeRunner()
    .run();
  const state = traversal().makeRunner().state;
  const visitors: string[] = [];
  const t = new AsyncBreadthFirstTraversal<Tree>({
    traversableTree: {
      makeRoot: () => {
        throw new Error('Existing root must be reused');
      },
      makeVertex: (hint) => ({ vertexContent: hint }),
    },
    traversalRunnerInternalObjects: {
      resolvedTreesContainer: first.resolvedTreesContainer,
      state,
    },
  }).configure({ sortChildrenHints: async (hints) => hints.reverse() });
  t.setVisitorsFor(Order.LEVEL_ORDER, [
    {
      addedIndex: 10,
      priority: 1,
      resolutionStyle: Style.SEQUENTIAL,
      visitor: async (vertex) => {
        visitors.push(vertex.getData());
      },
    },
  ]);
  expect(t.listVisitorsFor(Order.LEVEL_ORDER)).toHaveLength(1);
  const runner = t.makeRunner();
  t.addVisitorFor(Order.LEVEL_ORDER, async () => {
    visitors.push('late');
  });

  expect(runner.state.visitorsState).toBe(state.visitorsState);
  expect(runner.state.subtreeTraversalDisabledRefs).toBe(
    state.subtreeTraversalDisabledRefs,
  );
  await runner.run({ iterateOver: [] });
  expect(visitors).toEqual(['root', 'child']);
  expect(runner.getResolvedTree().getRoot()).toBe(
    first.getResolvedTree().getRoot(),
  );
  expect(runner.getResolvedGraph().getRoot()).toBe(
    first.getResolvedGraph().getRoot(),
  );
});

test.each([null, undefined])(
  'rethrows an original %p failure on every attempted rerun',
  async (failure) => {
    const runner = new AsyncBreadthFirstTraversal<TestGraph>({
      traversableTree: {
        makeRoot: async () => {
          throw failure;
        },
        makeVertex: () => ({ vertexContent: null }),
      },
    }).makeRunner();
    await expect(runner.run()).rejects.toBe(failure);
    expect(runner.getStatus()).toBe(Status.FAILED);
    await expect(runner.run()).rejects.toBe(failure);
    await expect(runner.getIterable().next()).rejects.toBe(failure);
  },
);

test('validates, defaults, and inspects concurrency without advancing traversal', () => {
  const runner = traversal(undefined, 2).makeRunner();
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
  expect(
    Object.isFrozen(ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG),
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
      makeRoot: () => ({ vertexContent: root }),
      makeVertex: (hint: Node | null) => ({ vertexContent: hint }),
    };
    const expected = Array.from(
      new BreadthFirstTraversal<Tree>({ traversableTree: tree })
        .makeRunner()
        .getIterable(),
      (event) => event.vertex.getData(),
    );
    await expect(
      values(
        new AsyncBreadthFirstTraversal<Tree>({
          traversableTree: tree,
          concurrency: 3,
        }).makeRunner(),
      ),
    ).resolves.toEqual(expected);
  }
});
