import { treeResolution } from './source-result-fixtures';
import type { TreeSource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  BreadthFirstPhase as BreadthOrder,
  BreadthFirstTreeTraversal,
} from '../src/traversals/breadth-first-traversal';
import {
  DepthFirstPhase as DepthOrder,
  DepthFirstTreeTraversal,
} from '../src/traversals/depth-first-traversal';

type Node = { $data: number; $childHints: Array<Node | null> };
type Tree = VertexTypes<number, Node | null>;
const node = ($data: number, ...$childHints: Array<Node | null>): Node => ({
  $data,
  $childHints,
});
const fixture = () =>
  node(0, node(1, node(2), null, node(3)), node(4, null, node(5)));
const adapter = (root: Node | null): TreeSource<Tree> => ({
  resolveRoot: () => treeResolution(root),
  resolveChild: (hint) => treeResolution(hint),
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
      current.$childHints.push(random() % 6 === 0 ? null : build(depth + 1));
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
    pre.push(current.$data);
    (levels[depth] ?? (levels[depth] = [])).push(current.$data);
    const children = prune(current.$data) ? [] : current.$childHints;
    if (children.length === 0) inside.push(current.$data);
    children.forEach((child, index) => {
      if (child !== null) visit(child, depth + 1);
      if (index < children.length - 1 || children.length === 1)
        inside.push(current.$data);
    });
    post.push(current.$data);
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
      const dfs = new DepthFirstTreeTraversal<Tree>({
        traversableTree: adapter(root),
      });
      for (const [order, result] of [
        [DepthOrder.PRE_ORDER, expected.pre],
        [DepthOrder.IN_ORDER, expected.inside],
        [DepthOrder.POST_ORDER, expected.post],
      ] as const) {
        expect(
          [...dfs.createRunner().iterateEvents({ emitEvents: [order] })].map(
            (event) => event.vertex.getData(),
          ),
        ).toEqual(result);
      }
      const bfs = new BreadthFirstTreeTraversal<Tree>({
        traversableTree: adapter(root),
      });
      expect(
        [...bfs.createRunner().iterateEvents()].map((event) =>
          event.vertex.getData(),
        ),
      ).toEqual(expected.breadth);
    });

    test('pruning preserves the remaining traversal and parent completion', () => {
      const root = generatedTree(seed);
      const prune = (id: number) => id > 0 && id % 3 === 0;
      const expected = reference(root, prune);
      const dfs = new DepthFirstTreeTraversal<Tree>({
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
            .createRunner()
            .iterateEvents({ emitEvents: [DepthOrder.POST_ORDER] }),
        ].map((event) => event.vertex.getData()),
      ).toEqual(expected.post);
      const bfs = new BreadthFirstTreeTraversal<Tree>({
        traversableTree: adapter(root),
      });
      bfs.addVisitorFor(BreadthOrder.LEVEL_ORDER, (vertex) =>
        prune(vertex.getData())
          ? { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] }
          : undefined,
      );
      expect(
        [...bfs.createRunner().iterateEvents()].map((event) =>
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
      ...new DepthFirstTreeTraversal<Tree>({ traversableTree: adapter(root) })
        .createRunner()
        .iterateEvents(),
    ].map((event) => [event.phase, event.vertex.getData()]);
    const traversal = new DepthFirstTreeTraversal<Tree>({
      traversableTree: adapter(root),
    });
    const calls: number[] = [];
    traversal.addVisitorFor(haltOrder, (vertex) => {
      calls.push(vertex.getData());
      return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
    });
    const runner = traversal.createRunner();
    const actual: unknown[] = [];
    let resumes = 0;
    while (runner.getStatus() !== Status.FINISHED) {
      if (++resumes > 30)
        throw new Error(
          'TreeTraversal did not finish after bounded resumptions',
        );
      for (const event of runner.iterateEvents())
        actual.push([event.phase, event.vertex.getData()]);
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
    const traversal = new DepthFirstTreeTraversal<Tree>({
      traversableTree: adapter(root),
      retainOriginalTreeStructure: true,
    });
    traversal.addVisitorFor(order, (vertex) =>
      vertex.getData() === 1
        ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
        : undefined,
    );
    const runner = traversal.createRunner().run();
    const tree = runner.getResolvedTreeStore();
    const rootRef = tree.getRoot()!;
    expect(
      tree.getChildrenOf(rootRef)?.map((ref) => ref.getValue().getData()),
    ).toEqual([4]);
    const surviving = tree.getChildrenOf(rootRef)![0]!;
    expect(
      tree.getChildrenOf(surviving)?.map((ref) => ref.getValue().getData()),
    ).toEqual([5]);
    expect(
      tree
        .getPathTo(tree.getChildrenOf(surviving)![0]!)
        .map((ref) => ref.getValue().getData()),
    ).toEqual([0, 4, 5]);
  },
);

test('disabling a subtree in-order stops unresolved children but retains completed descendants', () => {
  const traversal = new DepthFirstTreeTraversal<Tree>({
    traversableTree: adapter(node(0, node(1), node(2), node(3))),
  });
  traversal.addVisitorFor(DepthOrder.IN_ORDER, (vertex) =>
    vertex.getData() === 0
      ? { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] }
      : undefined,
  );
  const runner = traversal.createRunner();
  expect(
    [...runner.iterateEvents({ emitEvents: [DepthOrder.POST_ORDER] })].map(
      (event) => event.vertex.getData(),
    ),
  ).toEqual([1, 0]);
  expect(
    runner
      .getResolvedTreeStore()
      .getChildrenOf(runner.getResolvedTreeStore().getRoot()!)
      ?.map((ref) => ref.getValue().getData()),
  ).toEqual([1]);
});

describe.each(['depth', 'breadth'] as const)(
  '%s runner failure behavior',
  (strategy) => {
    const make = (tree: TreeSource<Tree>) =>
      strategy === 'depth'
        ? new DepthFirstTreeTraversal<Tree>({
            traversableTree: tree,
          }).createRunner()
        : new BreadthFirstTreeTraversal<Tree>({
            traversableTree: tree,
          }).createRunner();

    test.each(['root', 'child'] as const)(
      'a thrown %s resolution cannot later report successful completion',
      (stage) => {
        const failure = new Error('adapter failed');
        let calls = 0;
        const runner = make({
          resolveRoot: () => {
            calls++;
            if (stage === 'root') throw failure;
            return {
              kind: 'found' as const,
              vertex: { vertexContent: node(0, node(1)) },
            };
          },
          resolveChild: () => {
            calls++;
            throw failure;
          },
        });
        expect(() => runner.run()).toThrow(failure);
        expect(runner.getStatus()).toBe('FAILED');
        const callsAfterFailure = calls;
        expect(() => runner.run()).toThrow(failure);
        expect(() => runner.iterateEvents().next()).toThrow(failure);
        expect(calls).toBe(callsAfterFailure);
      },
    );

    test('consumer loop errors close the iterator without poisoning the runner', () => {
      const runner = make(adapter(node(0, node(1))));
      expect(() => {
        for (const _event of runner.iterateEvents())
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
        ? new DepthFirstTreeTraversal<Tree>({
            traversableTree: adapter(node(0, node(1))),
          })
        : new BreadthFirstTreeTraversal<Tree>({
            traversableTree: adapter(node(0, node(1))),
          });
    }
    function firstVisitor(
      t: ReturnType<typeof traversal>,
      visitor: () => void,
    ) {
      if (t instanceof DepthFirstTreeTraversal)
        t.addVisitorFor(DepthOrder.PRE_ORDER, visitor);
      else t.addVisitorFor(BreadthOrder.LEVEL_ORDER, visitor);
    }

    test('visitor exceptions leave a terminal failed runner', () => {
      const t = traversal();
      const failure = new Error('visitor failed');
      firstVisitor(t, () => {
        throw failure;
      });
      const runner = t.createRunner();
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
      const runner = t.createRunner();
      expect(() => runner.run()).toThrow(failure);
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(() => runner.run()).toThrow(failure);
    });

    test('an exception in a resumed visitor chain supersedes HALTED', () => {
      const t = traversal();
      const halt = () => ({
        commands: [{ commandName: Command.PAUSE_TRAVERSAL as const }],
      });
      if (t instanceof DepthFirstTreeTraversal)
        t.addVisitorFor(DepthOrder.PRE_ORDER, halt);
      else t.addVisitorFor(BreadthOrder.LEVEL_ORDER, halt);
      const failure = new Error('resumed visitor failed');
      firstVisitor(t, () => {
        throw failure;
      });
      const runner = t.createRunner().run();
      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(() => runner.run()).toThrow(failure);
      expect(runner.getStatus()).toBe(Status.FAILED);
    });

    test('simultaneous iterator rejection does not damage the original iterator', () => {
      const runner = traversal().createRunner();
      const iterator = runner.iterateEvents();
      expect(iterator.next().value?.vertex.getData()).toBe(0);
      expect(() => runner.iterateEvents().next()).toThrow(
        /one active iterator/,
      );
      const remaining = [...iterator].map((event) => event.vertex.getData());
      expect(remaining).toContain(1);
      expect(runner.getStatus()).toBe(Status.FINISHED);
    });

    test('a consumer-injected iterator exception closes only that iterator', () => {
      const runner = traversal().createRunner();
      const iterator = runner.iterateEvents();
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
        const runner = t.createRunner();
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
