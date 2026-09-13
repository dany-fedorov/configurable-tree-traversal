import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { TraversableGraph } from '../src/core/TraversableGraph';
import type { TraversableTree } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import {
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src/core/TraversalVisitor';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { TraversableObjectTree } from '../src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree';

type Node = { id: string; children: string[]; dependsOn?: string[] };
type TestGraph = TreeTypeParameters<string, string>;

function graphAdapter(
  nodes: Record<string, Node> = {
    root: { id: 'root', children: ['A', 'B', 'join'] },
    A: { id: 'A', children: ['join'] },
    B: { id: 'B', children: ['join'] },
    join: { id: 'join', children: [], dependsOn: ['A', 'B'] },
  },
): TraversableGraph<TestGraph> {
  const make = (id: string) => {
    const node = nodes[id]!;
    return {
      vertexContent: { $d: node.id, $c: node.children },
      vertexId: node.id,
      ...(node.dependsOn === undefined ? {} : { dependsOn: node.dependsOn }),
    };
  };
  return {
    makeRoot: () => make('root'),
    makeVertex: (hint) => make(hint),
    getVertexIdFromHint: (hint) => ({ vertexId: hint }),
  };
}

test('visits a shared join once after both prerequisites', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  }).makeRunner();
  const values = [...runner.getIterable({ iterateOver: [Order.ON_READY] })].map(
    ({ vertex }) => vertex.getData(),
  );
  expect(values).toEqual(['root', 'A', 'B', 'join']);
  const graph = runner.getResolvedGraph();
  const join = graph.getVertexById('join')!;
  expect(graph.getParentsOf(join)).toHaveLength(3);
  expect(graph.getStatusOf(join)).toBe('COMPLETE');
});

test('defaults to both orders and keeps initial and completion work in one FIFO', () => {
  const events = [
    ...new DagTraversal<TestGraph>({ traversableGraph: graphAdapter() })
      .makeRunner()
      .getIterable(),
  ].map(({ vertex, order }) => `${order}:${vertex.getData()}`);

  expect(events).toEqual([
    'ON_READY:root',
    'ON_READY:A',
    'ON_READY:B',
    'ON_READY:join',
    'ON_COMPLETE:join',
    'ON_COMPLETE:A',
    'ON_COMPLETE:B',
    'ON_COMPLETE:root',
  ]);
});

test('distinguishes graph root from the retained traversal root', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  }).makeRunner();
  const events = [...runner.getIterable({ iterateOver: [Order.ON_READY] })];
  expect(events.map(({ isGraphRoot }) => isGraphRoot)).toEqual([
    true,
    false,
    false,
    false,
  ]);
  expect(events.map(({ isTraversalRoot }) => isTraversalRoot)).toEqual([
    true,
    false,
    false,
    false,
  ]);
  expect(runner.isGraphRootVertex(events[0]!.vertexRef)).toBe(true);
  expect(runner.isTraversalRootVertex(events[0]!.vertexRef)).toBe(true);
});

test('finishes an empty graph', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => ({ vertexContent: null }),
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner();

  expect([...runner.getIterable()]).toEqual([]);
  expect(runner.getStatus()).toBe(Status.FINISHED);
  expect(runner.getResolvedGraph().getRoot()).toBeNull();
});

test.each([
  ['missing dependency', ['absent']],
  ['dependency cycle', ['child']],
] as const)('fails a synchronous %s as a stall', (_name, dependsOn) => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [], dependsOn: [...dependsOn] },
    }),
  }).makeRunner();

  expect(() => runner.run()).toThrow(/stall.*child/i);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

test('reports hostile object dependency ids without coercing them', () => {
  let coercions = 0;
  const hostileId = {
    toString() {
      coercions += 1;
      throw new Error('must not coerce vertex ids');
    },
  };
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => ({
        vertexContent: { $d: 'root', $c: ['blocked'] },
        vertexId: 'root',
      }),
      makeVertex: () => ({
        vertexContent: { $d: 'blocked', $c: [] },
        vertexId: 'blocked',
        dependsOn: [hostileId],
      }),
    },
  }).makeRunner();

  expect(() => runner.run()).toThrow(
    /DAG traversal stalled: "blocked", reference#1/,
  );
  expect(coercions).toBe(0);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

test('rejects discovery cycles found through known-id hints', () => {
  const resolutions: string[] = [];
  const adapter = graphAdapter({
    root: { id: 'root', children: ['child'] },
    child: { id: 'child', children: ['root'] },
  });
  const makeVertex = adapter.makeVertex;
  adapter.makeVertex = (hint, options) => {
    resolutions.push(hint);
    return makeVertex(hint, options);
  };
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: adapter,
  }).makeRunner();

  expect(() => runner.run()).toThrow(/discovery cycle/i);
  expect(resolutions).toEqual(['child']);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

test('omission satisfies dependents without retaining the omitted vertex', () => {
  const adapter: TraversableGraph<TestGraph> = {
    makeRoot: () => ({
      vertexContent: { $d: 'root', $c: ['missing', 'dependent'] },
      vertexId: 'root',
    }),
    makeVertex: (hint) =>
      hint === 'missing'
        ? { vertexContent: null, vertexId: 'missing' }
        : {
            vertexContent: { $d: 'dependent', $c: [] },
            vertexId: 'dependent',
            dependsOn: ['missing'],
          },
  };
  const runner = new DagTraversal<TestGraph>({ traversableGraph: adapter })
    .makeRunner()
    .run();

  expect(runner.getResolvedGraph().getVertexById('missing')).toBeNull();
  expect(
    runner.getResolvedGraph().getVertexById('dependent')!.unref().getData(),
  ).toBe('dependent');
});

test('applies rewrite, disable, and delete commands with tombstones', () => {
  const adapter = graphAdapter({
    root: { id: 'root', children: ['rewrite', 'disabled', 'deleted'] },
    rewrite: { id: 'rewrite', children: [] },
    disabled: { id: 'disabled', children: ['hidden'] },
    hidden: { id: 'hidden', children: [] },
    deleted: { id: 'deleted', children: ['late'] },
    late: { id: 'late', children: [] },
  });
  const traversal = new DagTraversal<TestGraph>({ traversableGraph: adapter });
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    switch (vertex.getData()) {
      case 'rewrite':
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'rewritten' },
            },
          ],
        };
      case 'disabled':
        return {
          commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }],
        };
      case 'deleted':
        return { commands: [{ commandName: Command.DELETE_VERTEX }] };
    }
    return undefined;
  });
  const runner = traversal.makeRunner().run();
  const graph = runner.getResolvedGraph();

  expect(graph.getVertexById('rewrite')!.unref().getData()).toBe('rewritten');
  expect(graph.getVertexById('hidden')).toBeNull();
  expect(graph.getVertexById('deleted')).toBeNull();
  expect(graph.getVertexById('late')).toBeNull();
});

test('rewrites hints at ON_READY and rejects the same command at ON_COMPLETE', () => {
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['old'] },
      old: { id: 'old', children: [] },
      replacement: { id: 'replacement', children: [] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'root'
      ? {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
              commandArguments: { newHints: ['replacement'] },
            },
          ],
        }
      : undefined,
  );
  const runner = traversal.makeRunner().run();
  expect(runner.getResolvedGraph().getVertexById('old')).toBeNull();
  expect(runner.getResolvedGraph().getVertexById('replacement')).not.toBeNull();

  const invalid = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({ root: { id: 'root', children: [] } }),
  });
  invalid.addVisitorFor(Order.ON_COMPLETE, () => ({
    commands: [
      {
        commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
        commandArguments: { newHints: [] },
      },
    ],
  }));
  expect(() => invalid.makeRunner().run()).toThrow(/only.*ON_READY|pre-order/i);
});

test('captures a structural graph snapshot before rewrite and delete', () => {
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [] },
    }),
    saveNotMutatedResolvedGraph: true,
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'child'
      ? {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'changed' },
            },
            { commandName: Command.DELETE_VERTEX },
          ],
        }
      : undefined,
  );
  const runner = traversal.makeRunner().run();
  const snapshot = runner.notMutatedResolvedGraph;

  expect(runner.getResolvedGraph().getVertexById('child')).toBeNull();
  const child = snapshot!.getVertexById('child')!;
  expect(child.unref().getData()).toBe('child');
  expect(snapshot!.getParentsOf(child)).toHaveLength(1);
  expect('getStatusOf' in snapshot!).toBe(false);
});

test('halts synchronously and resumes without repeating a visitor', () => {
  const visits: string[] = [];
  let halted = false;
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    visits.push(vertex.getData());
    if (!halted) {
      halted = true;
      return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
    }
    return undefined;
  });
  const runner = traversal.makeRunner();

  expect([...runner.getIterable()]).toEqual([]);
  expect(runner.isHalted()).toBe(true);
  runner.run();
  expect(visits).toEqual(['root', 'child']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('tree source receives a real tree context and graph visitors', () => {
  type TreeNode = { name: string; children: TreeNode[] };
  type Tree = TreeTypeParameters<string, TreeNode>;
  const nodes = {
    root: { name: 'root', children: ['child'] },
    child: { name: 'child', children: [] },
  };
  let sawParent = false;
  const tree: TraversableTree<Tree> = {
    makeRoot: () => ({
      vertexContent: { $d: 'root', $c: [nodes.child] },
    }),
    makeVertex: (hint, options) => {
      sawParent = options.resolvedTree.has(
        options.resolutionContext.parentVertexRef,
      );
      return { vertexContent: { $d: hint.name, $c: hint.children } };
    },
  };
  const traversal = new DagTraversal<Tree>({ traversableTree: tree });
  traversal.addVisitorFor(Order.ON_READY, (_vertex, options) => {
    expect(options.resolvedGraph).toBeDefined();
    expect(options).not.toHaveProperty('resolvedTree');
  });

  traversal.makeRunner().run();
  expect(sawParent).toBe(true);
});

test('runs TraversableObjectTree with its real ancestor context', () => {
  const input = { branch: { leaf: 1 } };
  const runner = new DagTraversal({
    traversableTree: new TraversableObjectTree(input),
  }).makeRunner();

  expect(
    [...runner.getIterable({ iterateOver: [Order.ON_READY] })].map(
      ({ vertex }) => vertex.getData().key,
    ),
  ).toEqual(['__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__', 'branch', 'leaf']);
  expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(3);
});

test('tree source rejects graph metadata', () => {
  const tree = {
    makeRoot: () => ({
      vertexContent: { $d: 'root', $c: [] },
      vertexId: 'root',
    }),
    makeVertex: () => ({ vertexContent: null }),
  };
  const runner = new DagTraversal<TestGraph>({
    traversableTree: tree,
  }).makeRunner();

  expect(() => runner.run()).toThrow(/tree source.*metadata/i);
});

test.each([false, true])(
  'sorts copied hints before resolution with hint identity %s',
  (identifyHints) => {
    const hints = ['b', 'a'];
    const adapter: TraversableGraph<TestGraph> = {
      makeRoot: () => ({
        vertexContent: { $d: 'root', $c: hints },
        vertexId: 'root',
      }),
      makeVertex: (hint) => ({
        vertexContent: { $d: hint, $c: [] },
        vertexId: hint,
      }),
      ...(identifyHints
        ? { getVertexIdFromHint: (hint: string) => ({ vertexId: hint }) }
        : {}),
    };
    const events = [
      ...new DagTraversal<TestGraph>({
        traversableGraph: adapter,
        sortChildrenHints: (children) => children.reverse(),
      })
        .makeRunner()
        .getIterable({ iterateOver: [Order.ON_READY] }),
    ];

    expect(events.map(({ vertex }) => vertex.getData())).toEqual([
      'root',
      'a',
      'b',
    ]);
    expect(hints).toEqual(['b', 'a']);
  },
);

test('tracks visitor metadata and concurrent-to-sequential chain state', () => {
  const seen: Array<[string, number, number, string | null, unknown]> = [];
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [] },
    }),
  });
  traversal.addVisitorFor(
    Order.ON_READY,
    () => ({
      commands: [
        {
          commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
          commandArguments: { vertexVisitorsChainState: 'shared' },
        },
      ],
    }),
    { resolutionStyle: Style.CONCURRENT },
  );
  traversal.addVisitorFor(Order.ON_READY, (vertex, options) => {
    seen.push([
      vertex.getData(),
      options.vertexVisitIndex,
      options.curVertexVisitorVisitIndex,
      options.previousVisitedVertexRef?.unref().getData() ?? null,
      options.vertexVisitorsChainState,
    ]);
  });

  traversal.makeRunner().run();
  expect(seen).toEqual([
    ['root', 0, 1, null, 'shared'],
    ['child', 1, 1, 'root', 'shared'],
  ]);
});

test('exposes lifecycle statuses while each visitor chain runs', () => {
  const statuses: string[] = [];
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({ root: { id: 'root', children: [] } }),
  });
  for (const order of [Order.ON_READY, Order.ON_COMPLETE]) {
    traversal.addVisitorFor(order, (_vertex, options) => {
      statuses.push(options.resolvedGraph.getStatusOf(options.vertexRef)!);
    });
  }

  traversal.makeRunner().run();
  expect(statuses).toEqual(['PRE_VISITING', 'COMPLETING']);
});

test('tombstones deleted ids and closes later arrivals', () => {
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['victim', 'survivor'] },
      victim: { id: 'victim', children: [] },
      survivor: { id: 'survivor', children: ['victim'] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'victim'
      ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
      : undefined,
  );
  const graph = traversal.makeRunner().run().getResolvedGraph();
  const survivor = graph.getVertexById('survivor')!;

  expect(graph.getVertexById('victim')).toBeNull();
  expect(graph.get(survivor)!.slots).toEqual([
    { kind: 'deleted', hint: 'victim' },
  ]);
});

test('deleting the graph root empties the graph', () => {
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) =>
    vertex.getData() === 'root'
      ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
      : undefined,
  );
  const runner = traversal.makeRunner().run();

  expect(runner.getResolvedGraph().getRoot()).toBeNull();
  expect(runner.getResolvedGraph().getVertexRefs()).toEqual([]);
});

test('rejects thenables and retains callback failures', () => {
  const error = new Error('visitor failed');
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: [] },
    }),
  });
  traversal.addVisitorFor(Order.ON_READY, () => {
    throw error;
  });
  const runner = traversal.makeRunner();
  expect(() => runner.run()).toThrow(error);
  expect(runner.getStatus()).toBe(Status.FAILED);
  expect(() => runner.run()).toThrow(error);

  const promised = new DagTraversal<TestGraph>({
    traversableGraph: {
      makeRoot: () => Promise.resolve({ vertexContent: null }) as never,
      makeVertex: () => ({ vertexContent: null }),
    },
  }).makeRunner();
  expect(() => promised.run()).toThrow(/synchronous.*thenable/i);
});

test('enforces one iterator and resumes after consumer close', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  }).makeRunner();
  const first = runner.getIterable({ iterateOver: [Order.ON_READY] });
  expect(first.next().value?.vertex.getData()).toBe('root');
  const second = runner.getIterable();
  expect(() => second.next()).toThrow(/one active iterator/i);
  first.return?.(undefined);
  expect(runner.isHalted()).toBe(true);

  expect(
    [...runner.getIterable({ iterateOver: [Order.ON_READY] })].map(
      ({ vertex }) => vertex.getData(),
    ),
  ).toEqual(['A', 'B', 'join']);
});
