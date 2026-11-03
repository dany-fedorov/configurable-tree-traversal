import { treeResolution } from './source-result-fixtures';
import type { TreeDiscoverySource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  BreadthFirstTreeVisitPhase as BreadthOrder,
  BreadthFirstTreeTraversalBuilder,
} from '../src/traversals/breadth-first-traversal';
import {
  DepthFirstTreeVisitPhase as DepthOrder,
  DepthFirstTreeTraversalBuilder,
} from '../src/traversals/depth-first-traversal';

type Node = { $vertexData: number; $childDiscoveryHints: Array<Node | null> };
type Tree = VertexDataAndChildHintTypes<number, Node | null>;
const node = ($vertexData: number, ...$childDiscoveryHints: Array<Node | null>): Node => ({
  $vertexData,
  $childDiscoveryHints,
});
const fixture = () =>
  node(0, node(1, node(2), null, node(3)), node(4, null, node(5)));
const adapter = (root: Node | null): TreeDiscoverySource<Tree> => ({
  resolveRootVertex: () => treeResolution(root),
  resolveChildVertexFromHint: (hint) => treeResolution(hint),
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
      current.$childDiscoveryHints.push(random() % 6 === 0 ? null : build(depth + 1));
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
    pre.push(current.$vertexData);
    (levels[depth] ?? (levels[depth] = [])).push(current.$vertexData);
    const children = prune(current.$vertexData) ? [] : current.$childDiscoveryHints;
    if (children.length === 0) inside.push(current.$vertexData);
    children.forEach((child, index) => {
      if (child !== null) visit(child, depth + 1);
      if (index < children.length - 1 || children.length === 1)
        inside.push(current.$vertexData);
    });
    post.push(current.$vertexData);
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
      const dfs = new DepthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: adapter(root),
      });
      for (const [order, result] of [
        [DepthOrder.BEFORE_CHILD_EXPANSION, expected.pre],
        [DepthOrder.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES, expected.inside],
        [DepthOrder.AFTER_CHILD_SUBTREES, expected.post],
      ] as const) {
        expect(
          [...dfs.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal({ deliveredEventKinds: [order] })].map(
            (event) => event.vertex.getVertexData(),
          ),
        ).toEqual(result);
      }
      const bfs = new BreadthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: adapter(root),
      });
      expect(
        [...bfs.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal()].map((event) =>
          event.vertex.getVertexData(),
        ),
      ).toEqual(expected.breadth);
    });

    test('pruning preserves the remaining traversal and parent completion', () => {
      const root = generatedTree(seed);
      const prune = (id: number) => id > 0 && id % 3 === 0;
      const expected = reference(root, prune);
      const dfs = new DepthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: adapter(root),
      });
      dfs.registerVisitorCallbackForPhase(DepthOrder.BEFORE_CHILD_EXPANSION, (vertex) =>
        prune(vertex.getVertexData())
          ? { commands: [{ commandName: Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX }] }
          : undefined,
      );
      expect(
        [
          ...dfs
            .createIndependentRunnerFromCurrentOptions()
            .runAndIterateObservationEventsUntilSuspendedOrTerminal({ deliveredEventKinds: [DepthOrder.AFTER_CHILD_SUBTREES] }),
        ].map((event) => event.vertex.getVertexData()),
      ).toEqual(expected.post);
      const bfs = new BreadthFirstTreeTraversalBuilder<Tree>({
        treeDiscoverySource: adapter(root),
      });
      bfs.registerVisitorCallbackForPhase(BreadthOrder.AT_LEVEL_ORDER_VERTEX, (vertex) =>
        prune(vertex.getVertexData())
          ? { commands: [{ commandName: Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX }] }
          : undefined,
      );
      expect(
        [...bfs.createIndependentRunnerFromCurrentOptions().runAndIterateObservationEventsUntilSuspendedOrTerminal()].map((event) =>
          event.vertex.getVertexData(),
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
      ...new DepthFirstTreeTraversalBuilder<Tree>({ treeDiscoverySource: adapter(root) })
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ].map((event) => [event.eventKind, event.vertex.getVertexData()]);
    const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
      treeDiscoverySource: adapter(root),
    });
    const calls: number[] = [];
    traversal.registerVisitorCallbackForPhase(haltOrder, (vertex) => {
      calls.push(vertex.getVertexData());
      return { commands: [{ commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY }] };
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const actual: unknown[] = [];
    let resumes = 0;
    while (runner.getTraversalLifecycleStatus() !== Status.FINISHED) {
      if (++resumes > 30)
        throw new Error(
          'TreeTraversal did not finish after bounded resumptions',
        );
      for (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
        actual.push([event.eventKind, event.vertex.getVertexData()]);
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
    const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
      treeDiscoverySource: adapter(root),
      retainDiscoveredTreeBeforeVisitorCommands: true,
    });
    traversal.registerVisitorCallbackForPhase(order, (vertex) =>
      vertex.getVertexData() === 1
        ? { commands: [{ commandName: Command.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS }] }
        : undefined,
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
    const tree = runner.getLiveResolvedTreeView();
    const rootRef = tree.getRootVertexHandleOrNull()!;
    expect(
      tree.getChildVertexHandlesOrNull(rootRef)?.map((ref) => ref.getCurrentVertexView().getVertexData()),
    ).toEqual([4]);
    const surviving = tree.getChildVertexHandlesOrNull(rootRef)![0]!;
    expect(
      tree.getChildVertexHandlesOrNull(surviving)?.map((ref) => ref.getCurrentVertexView().getVertexData()),
    ).toEqual([5]);
    expect(
      tree
        .requireStructuralAncestorPathTo(tree.getChildVertexHandlesOrNull(surviving)![0]!)
        .map((ref) => ref.getCurrentVertexView().getVertexData()),
    ).toEqual([0, 4, 5]);
  },
);

test('disabling a subtree in-order stops unresolved children but retains completed descendants', () => {
  const traversal = new DepthFirstTreeTraversalBuilder<Tree>({
    treeDiscoverySource: adapter(node(0, node(1), node(2), node(3))),
  });
  traversal.registerVisitorCallbackForPhase(DepthOrder.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES, (vertex) =>
    vertex.getVertexData() === 0
      ? { commands: [{ commandName: Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX }] }
      : undefined,
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  expect(
    [...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({ deliveredEventKinds: [DepthOrder.AFTER_CHILD_SUBTREES] })].map(
      (event) => event.vertex.getVertexData(),
    ),
  ).toEqual([1, 0]);
  expect(
    runner
      .getLiveResolvedTreeView()
      .getChildVertexHandlesOrNull(runner.getLiveResolvedTreeView().getRootVertexHandleOrNull()!)
      ?.map((ref) => ref.getCurrentVertexView().getVertexData()),
  ).toEqual([1]);
});

describe.each(['depth', 'breadth'] as const)(
  '%s runner failure behavior',
  (strategy) => {
    const make = (tree: TreeDiscoverySource<Tree>) =>
      strategy === 'depth'
        ? new DepthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: tree,
          }).createIndependentRunnerFromCurrentOptions()
        : new BreadthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: tree,
          }).createIndependentRunnerFromCurrentOptions();

    test.each(['root', 'child'] as const)(
      'a thrown %s resolution cannot later report successful completion',
      (stage) => {
        const failure = new Error('adapter failed');
        let calls = 0;
        const runner = make({
          resolveRootVertex: () => {
            calls++;
            if (stage === 'root') throw failure;
            return {
              kind: "vertexResolved" as const,
              resolvedVertexInput: { vertexContentInput: node(0, node(1)) },
            };
          },
          resolveChildVertexFromHint: () => {
            calls++;
            throw failure;
          },
        });
        expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
        expect(runner.getTraversalLifecycleStatus()).toBe('FAILED');
        const callsAfterFailure = calls;
        expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
        expect(() => runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().next()).toThrow(failure);
        expect(calls).toBe(callsAfterFailure);
      },
    );

    test('consumer loop errors close the iterator without poisoning the runner', () => {
      const runner = make(adapter(node(0, node(1))));
      expect(() => {
        for (const _event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
          throw new Error('consumer failed');
      }).toThrow('consumer failed');
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
      runner.runUntilSuspendedOrTerminal();
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    });
  },
);

describe.each(['depth', 'breadth'] as const)(
  '%s callback and iterator boundaries',
  (strategy) => {
    function traversal() {
      return strategy === 'depth'
        ? new DepthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: adapter(node(0, node(1))),
          })
        : new BreadthFirstTreeTraversalBuilder<Tree>({
            treeDiscoverySource: adapter(node(0, node(1))),
          });
    }
    function firstVisitor(
      t: ReturnType<typeof traversal>,
      visitor: () => void,
    ) {
      if (t instanceof DepthFirstTreeTraversalBuilder)
        t.registerVisitorCallbackForPhase(DepthOrder.BEFORE_CHILD_EXPANSION, visitor);
      else t.registerVisitorCallbackForPhase(BreadthOrder.AT_LEVEL_ORDER_VERTEX, visitor);
    }

    test('visitor exceptions leave a terminal failed runner', () => {
      const t = traversal();
      const failure = new Error('visitor failed');
      firstVisitor(t, () => {
        throw failure;
      });
      const runner = t.createIndependentRunnerFromCurrentOptions();
      expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
    });

    test('sort exceptions leave a terminal failed runner', () => {
      const failure = new Error('sort failed');
      const t = traversal().patchOptionsForFutureRunners({
        transformChildHintsBeforeResolution: () => {
          throw failure;
        },
      });
      const runner = t.createIndependentRunnerFromCurrentOptions();
      expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
    });

    test('an exception in a resumed visitor chain supersedes HALTED', () => {
      const t = traversal();
      const halt = () => ({
        commands: [{ commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY as const }],
      });
      if (t instanceof DepthFirstTreeTraversalBuilder)
        t.registerVisitorCallbackForPhase(DepthOrder.BEFORE_CHILD_EXPANSION, halt);
      else t.registerVisitorCallbackForPhase(BreadthOrder.AT_LEVEL_ORDER_VERTEX, halt);
      const failure = new Error('resumed visitor failed');
      firstVisitor(t, () => {
        throw failure;
      });
      const runner = t.createIndependentRunnerFromCurrentOptions().runUntilSuspendedOrTerminal();
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
      expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(failure);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    });

    test('simultaneous iterator rejection does not damage the original iterator', () => {
      const runner = traversal().createIndependentRunnerFromCurrentOptions();
      const iterator = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
      expect(iterator.next().value?.vertex.getVertexData()).toBe(0);
      expect(() => runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().next()).toThrow(
        /one active iterator/,
      );
      const remaining = [...iterator].map((event) => event.vertex.getVertexData());
      expect(remaining).toContain(1);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    });

    test('a consumer-injected iterator exception closes only that iterator', () => {
      const runner = traversal().createIndependentRunnerFromCurrentOptions();
      const iterator = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
      iterator.next();
      const failure = new Error('consumer aborted iterator');
      expect(() => iterator.throw(failure)).toThrow(failure);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
      runner.runUntilSuspendedOrTerminal();
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    });

    test.each([null, undefined, 0, 'failure'])(
      'non-Error thrown value %p is retained exactly',
      (reason) => {
        const t = traversal();
        firstVisitor(t, () => {
          throw reason;
        });
        const runner = t.createIndependentRunnerFromCurrentOptions();
        const capture = () => {
          try {
            runner.runUntilSuspendedOrTerminal();
            return { caught: false, reason: undefined };
          } catch (error) {
            return { caught: true, reason: error };
          }
        };
        expect(capture()).toEqual({ caught: true, reason });
        expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
        expect(capture()).toEqual({ caught: true, reason });
      },
    );
  },
);
