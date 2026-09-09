import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder as DepthOrder,
} from '../src/traversals/depth-first-traversal';
import {
  BreadthFirstTraversal,
  BreadthFirstTraversalOrder as BreadthOrder,
} from '../src/traversals/breadth-first-traversal';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { TraversableTree } from '../src/core/TraversableTree';

type Node = { $d: number; $c: Array<Node | null> };
type Tree = TreeTypeParameters<number, Node | null>;
const node = ($d: number, ...$c: Array<Node | null>): Node => ({ $d, $c });
const fixture = () =>
  node(0, node(1, node(2), null, node(3)), node(4, null, node(5)));
const adapter = (root: Node | null): TraversableTree<Tree> => ({
  makeRoot: () => ({ vertexContent: root }),
  makeVertex: (hint) => ({ vertexContent: hint }),
});

// A small recursive reference interpreter is deliberately separate from the
// production frame/queue machines. Inputs are reproducible and bounded.
function generatedTree(seed: number): Node {
  let state = seed;
  let id = 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  function build(depth: number): Node {
    const current = node(id++);
    if (depth === 5 || id >= 150) return current;
    const width = random() % 5;
    for (let i = 0; i < width; i++)
      current.$c.push(random() % 6 === 0 ? null : build(depth + 1));
    return current;
  }
  return build(0);
}
function reference(root: Node, prune = (_id: number) => false) {
  const pre: number[] = [];
  const inside: number[] = [];
  const post: number[] = [];
  const levels: number[][] = [];
  function visit(current: Node, depth: number) {
    pre.push(current.$d);
    (levels[depth] ?? (levels[depth] = [])).push(current.$d);
    const children = prune(current.$d) ? [] : current.$c;
    if (children.length === 0) inside.push(current.$d);
    children.forEach((child, index) => {
      if (child !== null) visit(child, depth + 1);
      if (index < children.length - 1 || children.length === 1)
        inside.push(current.$d);
    });
    post.push(current.$d);
  }
  visit(root, 0);
  return { pre, inside, post, breadth: levels.flat() };
}

describe.each(Array.from({ length: 24 }, (_, i) => i + 1))(
  'generated tree seed %i',
  (seed) => {
    test('all traversal orders agree with a separate reference interpreter', () => {
      const root = generatedTree(seed);
      const expected = reference(root);
      const dfs = new DepthFirstTraversal<Tree>({
        traversableTree: adapter(root),
      });
      for (const [order, result] of [
        [DepthOrder.PRE_ORDER, expected.pre],
        [DepthOrder.IN_ORDER, expected.inside],
        [DepthOrder.POST_ORDER, expected.post],
      ] as const) {
        expect(
          [...dfs.makeRunner().getIterable({ iterateOver: [order] })].map(
            (event) => event.vertex.getData(),
          ),
        ).toEqual(result);
      }
      const bfs = new BreadthFirstTraversal<Tree>({
        traversableTree: adapter(root),
      });
      expect(
        [...bfs.makeRunner().getIterable()].map((event) =>
          event.vertex.getData(),
        ),
      ).toEqual(expected.breadth);
    });

    test('pruning preserves the remaining traversal and parent completion', () => {
      const root = generatedTree(seed);
      const prune = (id: number) => id > 0 && id % 3 === 0;
      const expected = reference(root, prune);
      const dfs = new DepthFirstTraversal<Tree>({
        traversableTree: adapter(root),
      });
      dfs.addVisitorFor(DepthOrder.PRE_ORDER, (vertex) =>
        prune(vertex.getData())
          ? { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] }
          : undefined,
      );
      expect(
        [
          ...dfs
            .makeRunner()
            .getIterable({ iterateOver: [DepthOrder.POST_ORDER] }),
        ].map((event) => event.vertex.getData()),
      ).toEqual(expected.post);
      const bfs = new BreadthFirstTraversal<Tree>({
        traversableTree: adapter(root),
      });
      bfs.addVisitorFor(BreadthOrder.LEVEL_ORDER, (vertex) =>
        prune(vertex.getData())
          ? { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] }
          : undefined,
      );
      expect(
        [...bfs.makeRunner().getIterable()].map((event) =>
          event.vertex.getData(),
        ),
      ).toEqual(expected.breadth);
    });
  },
);

test.each(Object.values(DepthOrder))(
  'halting on every %s visit preserves every pending event',
  (haltOrder) => {
    const root = fixture();
    const expected = [
      ...new DepthFirstTraversal<Tree>({ traversableTree: adapter(root) })
        .makeRunner()
        .getIterable(),
    ].map((event) => [event.order, event.vertex.getData()]);
    const traversal = new DepthFirstTraversal<Tree>({
      traversableTree: adapter(root),
    });
    const calls: number[] = [];
    traversal.addVisitorFor(haltOrder, (vertex) => {
      calls.push(vertex.getData());
      return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
    });
    const runner = traversal.makeRunner();
    const actual: unknown[] = [];
    let resumes = 0;
    while (runner.getStatus() !== Status.FINISHED) {
      if (++resumes > 30)
        throw new Error('Traversal did not finish after bounded resumptions');
      for (const event of runner.getIterable())
        actual.push([event.order, event.vertex.getData()]);
    }
    expect(actual).toEqual(expected);
    expect(calls).toEqual(
      expected.filter(([order]) => order === haltOrder).map(([, id]) => id),
    );
  },
);

test.each(Object.values(DepthOrder))(
  'deleting a branch during %s leaves consistent siblings and ancestry',
  (order) => {
    const root = fixture();
    const traversal = new DepthFirstTraversal<Tree>({
      traversableTree: adapter(root),
      saveNotMutatedResolvedTree: true,
    });
    traversal.addVisitorFor(order, (vertex) =>
      vertex.getData() === 1
        ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
        : undefined,
    );
    const runner = traversal.makeRunner().run();
    const tree = runner.getResolvedTree();
    const rootRef = tree.getRoot()!;
    expect(
      tree.getChildrenOf(rootRef)?.map((ref) => ref.unref().getData()),
    ).toEqual([4]);
    const surviving = tree.getChildrenOf(rootRef)![0]!;
    expect(
      tree.getChildrenOf(surviving)?.map((ref) => ref.unref().getData()),
    ).toEqual([5]);
    expect(
      tree
        .getPathTo(tree.getChildrenOf(surviving)![0]!)
        .map((ref) => ref.unref().getData()),
    ).toEqual([0, 4, 5]);
  },
);

test('disabling a subtree in-order stops unresolved children but retains completed descendants', () => {
  const traversal = new DepthFirstTraversal<Tree>({
    traversableTree: adapter(node(0, node(1), node(2), node(3))),
  });
  traversal.addVisitorFor(DepthOrder.IN_ORDER, (vertex) =>
    vertex.getData() === 0
      ? { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] }
      : undefined,
  );
  const runner = traversal.makeRunner();
  expect(
    [...runner.getIterable({ iterateOver: [DepthOrder.POST_ORDER] })].map(
      (event) => event.vertex.getData(),
    ),
  ).toEqual([1, 0]);
  expect(
    runner
      .getResolvedTree()
      .getChildrenOf(runner.getResolvedTree().getRoot()!)
      ?.map((ref) => ref.unref().getData()),
  ).toEqual([1]);
});

describe.each(['depth', 'breadth'] as const)(
  '%s runner failure behavior',
  (strategy) => {
    const make = (tree: TraversableTree<Tree>) =>
      strategy === 'depth'
        ? new DepthFirstTraversal<Tree>({ traversableTree: tree }).makeRunner()
        : new BreadthFirstTraversal<Tree>({
            traversableTree: tree,
          }).makeRunner();

    test.each(['root', 'child'] as const)(
      'a thrown %s resolution cannot later report successful completion',
      (stage) => {
        const failure = new Error('adapter failed');
        let calls = 0;
        const runner = make({
          makeRoot: () => {
            calls++;
            if (stage === 'root') throw failure;
            return { vertexContent: node(0, node(1)) };
          },
          makeVertex: () => {
            calls++;
            throw failure;
          },
        });
        expect(() => runner.run()).toThrow(failure);
        expect(runner.getStatus()).toBe('FAILED');
        const callsAfterFailure = calls;
        expect(() => runner.run()).toThrow(failure);
        expect(() => runner.getIterable().next()).toThrow(failure);
        expect(calls).toBe(callsAfterFailure);
      },
    );

    test('consumer loop errors close the iterator without poisoning the runner', () => {
      const runner = make(adapter(node(0, node(1))));
      expect(() => {
        for (const _event of runner.getIterable())
          throw new Error('consumer failed');
      }).toThrow('consumer failed');
      expect(runner.getStatus()).toBe(Status.HALTED);
      runner.run();
      expect(runner.getStatus()).toBe(Status.FINISHED);
    });
  },
);

describe.each(['depth', 'breadth'] as const)(
  '%s callback and iterator boundaries',
  (strategy) => {
    function traversal() {
      return strategy === 'depth'
        ? new DepthFirstTraversal<Tree>({
            traversableTree: adapter(node(0, node(1))),
          })
        : new BreadthFirstTraversal<Tree>({
            traversableTree: adapter(node(0, node(1))),
          });
    }
    function firstVisitor(
      t: ReturnType<typeof traversal>,
      visitor: () => void,
    ) {
      if (t instanceof DepthFirstTraversal)
        t.addVisitorFor(DepthOrder.PRE_ORDER, visitor);
      else t.addVisitorFor(BreadthOrder.LEVEL_ORDER, visitor);
    }

    test('visitor exceptions leave a terminal failed runner', () => {
      const t = traversal();
      const failure = new Error('visitor failed');
      firstVisitor(t, () => {
        throw failure;
      });
      const runner = t.makeRunner();
      expect(() => runner.run()).toThrow(failure);
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(() => runner.run()).toThrow(failure);
    });

    test('sort exceptions leave a terminal failed runner', () => {
      const failure = new Error('sort failed');
      const t = traversal().configure({
        sortChildrenHints: () => {
          throw failure;
        },
      });
      const runner = t.makeRunner();
      expect(() => runner.run()).toThrow(failure);
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(() => runner.run()).toThrow(failure);
    });

    test('an exception in a resumed visitor chain supersedes HALTED', () => {
      const t = traversal();
      const halt = () => ({
        commands: [{ commandName: Command.HALT_TRAVERSAL as const }],
      });
      if (t instanceof DepthFirstTraversal)
        t.addVisitorFor(DepthOrder.PRE_ORDER, halt);
      else t.addVisitorFor(BreadthOrder.LEVEL_ORDER, halt);
      const failure = new Error('resumed visitor failed');
      firstVisitor(t, () => {
        throw failure;
      });
      const runner = t.makeRunner().run();
      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(() => runner.run()).toThrow(failure);
      expect(runner.getStatus()).toBe(Status.FAILED);
    });

    test('simultaneous iterator rejection does not damage the original iterator', () => {
      const runner = traversal().makeRunner();
      const iterator = runner.getIterable();
      expect(iterator.next().value?.vertex.getData()).toBe(0);
      expect(() => runner.getIterable().next()).toThrow(/one active iterator/);
      const remaining = [...iterator].map((event) => event.vertex.getData());
      expect(remaining).toContain(1);
      expect(runner.getStatus()).toBe(Status.FINISHED);
    });

    test('a consumer-injected iterator exception closes only that iterator', () => {
      const runner = traversal().makeRunner();
      const iterator = runner.getIterable();
      iterator.next();
      const failure = new Error('consumer aborted iterator');
      expect(() => iterator.throw(failure)).toThrow(failure);
      expect(runner.getStatus()).toBe(Status.HALTED);
      runner.run();
      expect(runner.getStatus()).toBe(Status.FINISHED);
    });

    test.each([null, undefined, 0, 'failure'])(
      'non-Error thrown value %p is retained exactly',
      (reason) => {
        const t = traversal();
        firstVisitor(t, () => {
          throw reason;
        });
        const runner = t.makeRunner();
        const capture = () => {
          try {
            runner.run();
            return { caught: false, reason: undefined };
          } catch (error) {
            return { caught: true, reason: error };
          }
        };
        expect(capture()).toEqual({ caught: true, reason });
        expect(runner.getStatus()).toBe(Status.FAILED);
        expect(capture()).toEqual({ caught: true, reason });
      },
    );
  },
);
