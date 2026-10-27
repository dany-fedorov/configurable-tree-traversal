import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { TreeSource } from '../src/core/TraversableTree';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { ObjectTreeSource } from '../src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';

type Node = { id: string; children: string[]; dependsOnWork?: string[] };
type TestGraph = VertexTypes<string, string>;

function graphAdapter(
  nodes: Record<string, Node> = {
    root: { id: 'root', children: ['A', 'B', 'join'] },
    A: { id: 'A', children: ['join'] },
    B: { id: 'B', children: ['join'] },
    join: { id: 'join', children: [], dependsOnWork: ['A', 'B'] },
  },
): DagDiscoverySource<TestGraph> {
  const make = (id: string) => {
    const node = nodes[id]!;
    return {
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: node.id, $childHints: node.children },
        vertexId: node.id,
        ...(node.dependsOnWork === undefined
          ? {}
          : { dependsOnWork: node.dependsOnWork }),
      },
    };
  };
  return {
    resolveRoot: () => make('root'),
    resolveChild: (hint) => make(hint),
    getVertexIdFromHint: (hint) => ({ vertexId: hint }),
  };
}

test('visits a shared join once after both prerequisites', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  }).createRunner();
  const values = [
    ...runner.iterateEvents({ emitEvents: ['workCompleted'] }),
  ].map(({ vertex }) => vertex.getData());
  expect(values).toEqual(['root', 'A', 'B', 'join']);
  const graph = runner.getResolvedGraph();
  const join = graph.getVertexRefById('join')!;
  expect(graph.getParentsOf(join)).toHaveLength(3);
  expect(graph.getStatusOf(join)).toBe('COMPLETE');
});

test('defaults to both orders and keeps initial and completion work in one FIFO', () => {
  const events = [
    ...new DagTraversal<TestGraph>({ traversableGraph: graphAdapter() })
      .createRunner()
      .iterateEvents(),
  ].map(({ vertex, kind }) => `${kind}:${vertex.getData()}`);

  expect(events).toEqual([
    'workCompleted:root',
    'workCompleted:A',
    'workCompleted:B',
    'workCompleted:join',
    'subgraphCompleted:join',
    'subgraphCompleted:A',
    'subgraphCompleted:B',
    'subgraphCompleted:root',
  ]);
});

test('distinguishes graph root from the retained traversal root', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  }).createRunner();
  const events = [...runner.iterateEvents({ emitEvents: ['workCompleted'] })];
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
      resolveRoot: () => ({
        satisfiesDependencies: true as const,
        kind: 'omitted' as const,
      }),
      resolveChild: () => ({
        satisfiesDependencies: true as const,
        kind: 'omitted' as const,
      }),
    },
  }).createRunner();

  expect([...runner.iterateEvents()]).toEqual([]);
  expect(runner.getStatus()).toBe(Status.FINISHED);
  expect(runner.getResolvedGraph().getRoot()).toBeNull();
});

test.each([
  ['missing dependency', ['absent']],
  ['dependency cycle', ['child']],
] as const)('fails a synchronous %s as a stall', (_name, dependsOnWork) => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [], dependsOnWork: [...dependsOnWork] },
    }),
  }).createRunner();

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
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: ['blocked'] },
          vertexId: 'root',
        },
      }),
      resolveChild: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'blocked', $childHints: [] },
          vertexId: 'blocked',
          dependsOnWork: [hostileId],
        },
      }),
    },
  }).createRunner();

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
  const resolveChild = adapter.resolveChild;
  adapter.resolveChild = (hint, options) => {
    resolutions.push(hint);
    return resolveChild(hint, options);
  };
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: adapter,
  }).createRunner();

  expect(() => runner.run()).toThrow(/discovery cycle/i);
  expect(resolutions).toEqual(['child']);
  expect(runner.getStatus()).toBe(Status.FAILED);
});

test('omission satisfies dependents without retaining the omitted vertex', () => {
  const adapter: DagDiscoverySource<TestGraph> = {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: 'root', $childHints: ['missing', 'dependent'] },
        vertexId: 'root',
      },
    }),
    resolveChild: (hint) =>
      hint === 'missing'
        ? {
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
            vertexId: 'missing',
          }
        : {
            kind: 'found' as const,
            vertex: {
              vertexContent: { $data: 'dependent', $childHints: [] },
              vertexId: 'dependent',
              dependsOnWork: ['missing'],
            },
          },
  };
  const runner = new DagTraversal<TestGraph>({ traversableGraph: adapter })
    .createRunner()
    .run();

  expect(runner.getResolvedGraph().getVertexRefById('missing')).toBeNull();
  expect(
    runner
      .getResolvedGraph()
      .getVertexRefById('dependent')!
      .getValue()
      .getData(),
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
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
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
  const runner = traversal.createRunner().run();
  const graph = runner.getResolvedGraph();

  expect(graph.getVertexRefById('rewrite')!.getValue().getData()).toBe(
    'rewritten',
  );
  expect(graph.getVertexRefById('hidden')).toBeNull();
  expect(graph.getVertexRefById('deleted')).toBeNull();
  expect(graph.getVertexRefById('late')).toBeNull();
});

test('rewrites hints at ON_WORK_READY and rejects the same command at ON_SUBGRAPH_READY', () => {
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['old'] },
      old: { id: 'old', children: [] },
      replacement: { id: 'replacement', children: [] },
    }),
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) =>
    vertex.getData() === 'root'
      ? {
          commands: [
            {
              commandName: Command.REWRITE_CHILD_HINTS,
              commandArguments: { newHints: ['replacement'] },
            },
          ],
        }
      : undefined,
  );
  const runner = traversal.createRunner().run();
  expect(runner.getResolvedGraph().getVertexRefById('old')).toBeNull();
  expect(
    runner.getResolvedGraph().getVertexRefById('replacement'),
  ).not.toBeNull();

  const invalid = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({ root: { id: 'root', children: [] } }),
  });
  invalid.addVisitorFor(
    Order.ON_SUBGRAPH_READY,
    () =>
      ({
        commands: [
          {
            commandName: Command.REWRITE_CHILD_HINTS,
            commandArguments: { newHints: [] },
          },
        ],
      } as never),
  );
  expect(() => invalid.createRunner().run()).toThrow(
    /only.*ON_WORK_READY|pre-order/i,
  );
});

test('captures a structural graph snapshot before rewrite and delete', () => {
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter({
      root: { id: 'root', children: ['child'] },
      child: { id: 'child', children: [] },
    }),
    retainOriginalGraphStructure: true,
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) =>
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
  const runner = traversal.createRunner().run();
  const snapshot = runner.originalGraphView;

  expect(runner.getResolvedGraph().getVertexRefById('child')).toBeNull();
  const child = snapshot!.getVertexRefById('child')!;
  expect(child.getValue().getData()).toBe('child');
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
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
    visits.push(vertex.getData());
    if (!halted) {
      halted = true;
      return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
    }
    return undefined;
  });
  const runner = traversal.createRunner();

  expect([...runner.iterateEvents()]).toEqual([]);
  expect(runner.isHalted()).toBe(true);
  runner.run();
  expect(visits).toEqual(['root', 'child']);
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('tree source receives a real tree context and graph visitors', () => {
  type TreeNode = { name: string; children: TreeNode[] };
  type Tree = VertexTypes<string, TreeNode>;
  const nodes = {
    root: { name: 'root', children: ['child'] },
    child: { name: 'child', children: [] },
  };
  let sawParent = false;
  const tree: TreeSource<Tree> = {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: 'root', $childHints: [nodes.child] },
      },
    }),
    resolveChild: (hint, options) => {
      sawParent = options.resolvedTree.has(
        options.resolutionContext.parentVertexRef,
      );
      return {
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: hint.name, $childHints: hint.children },
        },
      };
    },
  };
  const traversal = new DagTraversal<Tree>({ traversableTree: tree });
  traversal.addVisitorFor(Order.ON_WORK_READY, (_vertex, options) => {
    expect(options.resolvedGraph).toBeDefined();
    expect(options).not.toHaveProperty('resolvedTree');
  });

  traversal.createRunner().run();
  expect(sawParent).toBe(true);
});

test('runs ObjectTreeSource with its real ancestor context', () => {
  const input = { branch: { leaf: 1 } };
  const runner = new DagTraversal({
    traversableTree: new ObjectTreeSource(input),
  }).createRunner();

  expect(
    [...runner.iterateEvents({ emitEvents: ['workCompleted'] })].map(
      ({ vertex }) => vertex.getData().key,
    ),
  ).toEqual(['__TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__', 'branch', 'leaf']);
  expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(3);
});

test('tree source rejects graph metadata', () => {
  const tree = {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: 'root', $childHints: [] },
        vertexId: 'root',
      },
    }),
    resolveChild: () => ({
      kind: 'omitted' as const,
      satisfiesDependencies: true as const,
    }),
  };
  const runner = new DagTraversal<TestGraph>({
    // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
    traversableTree: tree,
  }).createRunner();

  expect(() => runner.run()).toThrow(/tree source.*metadata/i);
});

test.each([false, true])(
  'sorts copied hints before resolution with hint identity %s',
  (identifyHints) => {
    const hints = ['b', 'a'];
    const adapter: DagDiscoverySource<TestGraph> = {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: hints },
          vertexId: 'root',
        },
      }),
      resolveChild: (hint) => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: hint, $childHints: [] },
          vertexId: hint,
        },
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
        .createRunner()
        .iterateEvents({ emitEvents: ['workCompleted'] }),
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
    Order.ON_WORK_READY,
    () => ({
      commands: [
        {
          commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
          commandArguments: { vertexVisitorsChainState: 'shared' },
        },
      ],
    }),
    { commandCommitMode: 'afterGroup' as const },
  );
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex, options) => {
    seen.push([
      vertex.getData(),
      options.phaseVisitIndex,
      options.visitorIndex,
      options.previousPhaseVertexRef?.getValue().getData() ?? null,
      options.visitorChainState,
    ]);
  });

  traversal.createRunner().run();
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
  for (const order of [Order.ON_WORK_READY, Order.ON_SUBGRAPH_READY]) {
    traversal.addVisitorFor(order, (_vertex, options) => {
      statuses.push(options.resolvedGraph.getStatusOf(options.vertexRef)!);
    });
  }

  traversal.createRunner().run();
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
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) =>
    vertex.getData() === 'victim'
      ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
      : undefined,
  );
  const graph = traversal.createRunner().run().getResolvedGraph();
  const survivor = graph.getVertexRefById('survivor')!;

  expect(graph.getVertexRefById('victim')).toBeNull();
  expect(graph.get(survivor)!.slots).toEqual([
    { kind: 'deleted', hint: 'victim' },
  ]);
});

test('deleting the graph root empties the graph', () => {
  const traversal = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) =>
    vertex.getData() === 'root'
      ? { commands: [{ commandName: Command.DELETE_VERTEX }] }
      : undefined,
  );
  const runner = traversal.createRunner().run();

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
  traversal.addVisitorFor(Order.ON_WORK_READY, () => {
    throw error;
  });
  const runner = traversal.createRunner();
  expect(() => runner.run()).toThrow(error);
  expect(runner.getStatus()).toBe(Status.FAILED);
  expect(() => runner.run()).toThrow(error);

  const promised = new DagTraversal<TestGraph>({
    traversableGraph: {
      resolveRoot: () =>
        Promise.resolve({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }) as never,
      resolveChild: () => ({
        satisfiesDependencies: true as const,
        kind: 'omitted' as const,
      }),
    },
  }).createRunner();
  expect(() => promised.run()).toThrow(/synchronous.*thenable/i);
});

test('enforces one iterator and resumes after consumer close', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  }).createRunner();
  const first = runner.iterateEvents({ emitEvents: ['workCompleted'] });
  expect(first.next().value?.vertex.getData()).toBe('root');
  const second = runner.iterateEvents();
  expect(() => second.next()).toThrow(/one active iterator/i);
  first.return?.(undefined);
  expect(runner.isHalted()).toBe(true);

  expect(
    [...runner.iterateEvents({ emitEvents: ['workCompleted'] })].map(
      ({ vertex }) => vertex.getData(),
    ),
  ).toEqual(['A', 'B', 'join']);
});
