import type { MaterializedDagSource } from '../src/sources';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  materializeDagSourceFromRecords,
  materializeDagSourceFromRoots,
  materializeDagSourceFromRecordsAsync,
  materializeDagSourceFromRootsAsync,
} from '../src/sources';

test('a flat diamond discovers all records and releases dependencies after settlement', () => {
  const source = materializeDagSourceFromRecords(
    [
      { id: 'a', requires: [] },
      { id: 'b', requires: ['a'] },
      { id: 'c', requires: ['a'] },
      { id: 'd', requires: ['b', 'c'] },
    ],
    { id: (task) => task.id, dependsOnWork: (task) => task.requires },
  );
  const runner = new DagTraversal({
    ...source,
    workCompletion: 'externalSettlement',
  }).createRunner();
  runner.run();
  expect(
    runner.summary().awaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['a']);
  runner.settle(
    'a',
    { ok: true },
    runner.summary().vertices.get('a')!.generation!,
  );
  runner.run();
  expect(
    runner.summary().awaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['b', 'c']);
  runner.settle(
    'b',
    { ok: true },
    runner.summary().vertices.get('b')!.generation!,
  );
  runner.settle(
    'c',
    { ok: true },
    runner.summary().vertices.get('c')!.generation!,
  );
  runner.run();
  expect(
    runner.summary().awaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['d']);
});

test('arbitrary IDs retain identity and caller data stays shared and unfrozen', async () => {
  const objectId = {
    toString: () => {
      throw new Error('Do not stringify IDs');
    },
  };
  const ids: unknown[] = [undefined, null, NaN, objectId, Symbol('id'), 0];
  const items = ids.map((id) => ({ id, value: 1 }));
  for (const source of [
    materializeDagSourceFromRecords(items, { id: (item) => item.id }),
    await materializeDagSourceFromRecordsAsync(items, { id: async (item) => item.id }),
    materializeDagSourceFromRoots(items, { id: (item) => item.id }),
    await materializeDagSourceFromRootsAsync(items, { id: async (item) => item.id }),
  ]) {
    items[0]!.value = 2;
    const traversal = new DagTraversal(source);
    const seen: typeof items = [];
    traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    const runner = traversal.createRunner();
    runner.run();
    expect(seen).toEqual(items);
    const graph = runner.getResolvedGraph();
    for (const item of items)
      expect(graph.getVertexRefById(item.id)!.unref().getData()).toBe(item);
    expect(Object.isFrozen(objectId)).toBe(false);
    expect(Object.isFrozen(items[0])).toBe(false);
    expect(seen[0]!.value).toBe(2);
  }
});

test('materialization copies membership, children, and both milestone edges', async () => {
  for (const asyncSource of [false, true]) {
    const items = [
      { id: 'a', children: ['b'], dependencies: [], completion: [] },
      { id: 'b', children: [], dependencies: ['a'], completion: [] },
      { id: 'c', children: [], dependencies: [], completion: ['a'] },
    ];
    let calls = 0;
    const selectors = {
      id: (item: typeof items[number]) => {
        calls++;
        return item.id;
      },
      children: (item: typeof items[number]) => item.children,
      dependsOnWork: (item: typeof items[number]) => item.dependencies,
      dependsOnSubgraphCompletion: (item: typeof items[number]) => item.completion,
    };
    const source = asyncSource
      ? await materializeDagSourceFromRecordsAsync(items, selectors)
      : materializeDagSourceFromRecords(items, selectors);
    const first = items[0]!;
    first.children.length = 0;
    items[1]!.dependencies.length = 0;
    items[2]!.completion.length = 0;
    items.length = 0;
    for (let iteration = 0; iteration < 2; iteration++) {
      const runner = new DagTraversal({
        ...source,
        workCompletion: 'externalSettlement',
      }).createRunner();
      runner.run();
      expect(
        runner.summary().awaitingSettlement.map((work) => work.vertexId),
      ).toEqual(['a']);
      const graph = runner.getResolvedGraph();
      expect(graph.getVertexRefs()).toHaveLength(3);
      expect(graph.getParentsOf(graph.getVertexRefById('b')!)).toEqual([
        graph.getVertexRefById('a'),
      ]);
      graph.getVertexRefById('a')!.unref().$childHints.length = 0;
      runner.settle(
        'a',
        { ok: true },
        runner.summary().vertices.get('a')!.generation!,
      );
      runner.run();
      expect(
        runner.summary().awaitingSettlement.map((work) => work.vertexId),
      ).toEqual(['b']);
      runner.settle(
        'b',
        { ok: true },
        runner.summary().vertices.get('b')!.generation!,
      );
      runner.run();
      expect(
        runner.summary().awaitingSettlement.map((work) => work.vertexId),
      ).toEqual(['c']);
    }
    expect(calls).toBe(3);
  }
});

test.each([undefined, NaN, 0, {}])(
  'catalog duplicates reject under SameValueZero identity (%p)',
  async (id) => {
    const item = { id };
    expect(() =>
      materializeDagSourceFromRecords([item, item], { id: (record) => record.id }),
    ).toThrow(TypeError);
    await expect(
      materializeDagSourceFromRecordsAsync([item, item], { id: (record) => record.id }),
    ).rejects.toThrow(TypeError);
  },
);

test('forest permits repeated record identity but rejects different records sharing IDs', async () => {
  const roots = [{ id: undefined }, { id: undefined }];
  expect(() => materializeDagSourceFromRoots(roots, { id: (item) => item.id })).toThrow(TypeError);
  await expect(
    materializeDagSourceFromRootsAsync(roots, { id: (item) => item.id }),
  ).rejects.toThrow(TypeError);
  for (const source of [
    materializeDagSourceFromRoots([roots[0]!, roots[0]!], { id: (item) => item.id }),
    await materializeDagSourceFromRootsAsync([roots[0]!, roots[0]!], { id: (item) => item.id }),
  ]) {
    const runner = new DagTraversal(source).createRunner();
    runner.run();
    expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(1);
  }
});

test('missing structural children reject during catalog materialization', async () => {
  expect(() =>
    materializeDagSourceFromRecords(['a'], { id: (item) => item, children: () => ['missing'] }),
  ).toThrow(TypeError);
  await expect(
    materializeDagSourceFromRecordsAsync(['a'], { id: (item) => item, children: () => ['missing'] }),
  ).rejects.toThrow(TypeError);
});

test('unknown prerequisites remain engine validation errors while known lookup is tagged found', () => {
  const source = materializeDagSourceFromRecords(['a'], {
    id: (item) => item,
    dependsOnWork: () => ['missing'],
  });
  expect(source.traversableGraph.resolvePrerequisite!('a')).toMatchObject({
    kind: 'found',
    vertex: { vertexId: 'a' },
  });
  expect(source.traversableGraph.resolvePrerequisite!('missing')).toEqual({
    kind: 'missing',
  });
  expect(() => new DagTraversal(source).createRunner().run()).toThrow();
});

test('a source rejects unknown structural lookup without omitting it', () => {
  const source = materializeDagSourceFromRecords(['a'], { id: (item) => item });
  const traversal = new DagTraversal({
    ...source,
    traversableGraph: {
      ...source.traversableGraph,
      resolveChild: (_hint, options) =>
        source.traversableGraph.resolveChild('missing', options),
    },
  });
  expect(() => traversal.createRunner().run()).toThrow(TypeError);
});

test('async catalogs and promised iterable selectors preserve completion and structural edges', async () => {
  async function* catalog() {
    yield { id: 'a' };
    yield { id: 'b' };
  }
  async function* children(id: string) {
    if (id === 'a') yield 'b';
  }
  const source = await materializeDagSourceFromRecordsAsync(catalog(), {
    id: async (item) => item.id,
    children: (item) => children(item.id),
    dependsOnWork: async () => [],
    dependsOnSubgraphCompletion: async () => [],
  });
  const runner = new AsyncDagTraversal(source).createRunner();
  await runner.run();
  const graph = runner.getResolvedGraph();
  expect(graph.getParentsOf(graph.getVertexRefById('b')!)).toEqual([
    graph.getVertexRefById('a'),
  ]);
});

test('forest async selectors and input materialize once, preserving milestone dependencies', async () => {
  const leaf = { id: 'leaf' };
  const root = { id: 'root' };
  async function* roots() {
    yield root;
  }
  async function* children(item: typeof root) {
    if (item === root) yield leaf;
  }
  const selectors = {
    id: (item: typeof root) => item.id,
    children,
    dependsOnWork: async (item: typeof root) =>
      item === leaf ? ['root'] : [],
    dependsOnSubgraphCompletion: async () => [],
  };
  const source = await materializeDagSourceFromRootsAsync(roots(), selectors);
  const runner = new DagTraversal({
    ...source,
    workCompletion: 'externalSettlement',
  }).createRunner();
  runner.run();
  expect(
    runner.summary().awaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['root']);
});

test('forest copies child records and completion constraints before caller mutation', async () => {
  type Item = { id: string; children: Item[]; after: string[] };
  for (const asyncSource of [false, true]) {
    const child: Item = { id: 'child', children: [], after: [] };
    const root: Item = { id: 'root', children: [child], after: [] };
    const after: Item = { id: 'after', children: [], after: ['root'] };
    const roots = [root, after];
    const selectors = {
      id: (item: Item) => item.id,
      children: (item: Item) => item.children,
      dependsOnWork: () => [],
      dependsOnSubgraphCompletion: (item: Item) => item.after,
    };
    const source = asyncSource
      ? await materializeDagSourceFromRootsAsync(roots, selectors)
      : materializeDagSourceFromRoots(roots, selectors);
    root.children.length = 0;
    after.after.length = 0;
    roots.length = 0;
    const runner = new DagTraversal({
      ...source,
      workCompletion: 'externalSettlement',
    }).createRunner();
    runner.run();
    expect(
      runner.summary().awaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['root', 'child']);
    runner.settle(
      'root',
      { ok: true },
      runner.summary().vertices.get('root')!.generation!,
    );
    runner.run();
    expect(
      runner.summary().awaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['child']);
    runner.settle(
      'child',
      { ok: true },
      runner.summary().vertices.get('child')!.generation!,
    );
    runner.run();
    expect(
      runner.summary().awaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['after']);
  }
});

test('empty forests produce finished empty graphs with no holder events', async () => {
  for (const source of [
    materializeDagSourceFromRoots([], { id: (item: string) => item }),
    await materializeDagSourceFromRootsAsync([], { id: (item: string) => item }),
  ]) {
    const runner = new DagTraversal(source).createRunner();
    expect([...runner.iterateEvents()]).toEqual([]);
    expect(runner.getResolvedGraph().getVertexRefs()).toEqual([]);
  }
});

test('forest materialization is iterative for deep input and leaves cycle validation to the engine', () => {
  type Item = { id: number; children: Item[] };
  let root: Item = { id: 15000, children: [] };
  for (let id = 14999; id >= 0; id--) root = { id, children: [root] };
  const selectors = {
    id: (item: Item) => item.id,
    children: (item: Item) => item.children,
    dependsOnWork: () => [],
    dependsOnSubgraphCompletion: () => [],
  };
  expect(() => materializeDagSourceFromRoots([root], selectors)).not.toThrow();
  const cycle: Item = { id: 0, children: [] };
  cycle.children.push(cycle);
  const source = materializeDagSourceFromRoots([cycle], selectors);
  expect(() => new DagTraversal(source).createRunner().run()).toThrow();
});

test('selector and catalog failures retain exact identity', async () => {
  const error = { failure: true };
  const id = () => {
    throw error;
  };
  for (const factory of [materializeDagSourceFromRecords, materializeDagSourceFromRoots]) {
    try {
      factory([1], { id });
      throw new Error('Expected selector failure');
    } catch (actual) {
      expect(actual).toBe(error);
    }
  }
  for (const factory of [materializeDagSourceFromRecordsAsync, materializeDagSourceFromRootsAsync]) {
    await expect(
      factory([1], { id: () => Promise.reject(error) }),
    ).rejects.toBe(error);
    async function* catalog(): AsyncGenerator<number> {
      throw error;
    }
    await expect(factory(catalog(), { id: (item) => item })).rejects.toBe(
      error,
    );
    await expect(
      factory([1], {
        id: (item) => item,
        children: () => Promise.reject(error),
      }),
    ).rejects.toBe(error);
  }
});

test('empty and disconnected catalogs expose only actual records', async () => {
  const empty = new DagTraversal(
    materializeDagSourceFromRecords([], { id: (item: string) => item }),
  ).createRunner();
  empty.run();
  expect(empty.getResolvedGraph().getVertexRefs()).toEqual([]);
  const source = await materializeDagSourceFromRecordsAsync([1, 2], { id: (item) => item });
  const runner = new AsyncDagTraversal(source).createRunner();
  await runner.run();
  expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(2);
});

test('forest expansion shares records across parents', async () => {
  type Item = { id: string; children: Item[] };
  const leaf: Item = { id: 'leaf', children: [] };
  const roots: Item[] = [
    { id: 'a', children: [leaf] },
    { id: 'b', children: [leaf] },
  ];
  for (const source of [
    materializeDagSourceFromRoots(roots, {
      id: (item) => item.id,
      children: (item) => item.children,
    }),
    await materializeDagSourceFromRootsAsync(roots, {
      id: (item) => item.id,
      children: (item) => item.children,
    }),
  ]) {
    const runner = new DagTraversal(source).createRunner();
    runner.run();
    const graph = runner.getResolvedGraph();
    expect(graph.getVertexRefs()).toHaveLength(3);
    expect(
      graph
        .getParentsOf(graph.getVertexRefById('leaf')!)!
        .map((ref) => graph.getVertexId(ref)),
    ).toEqual(['a', 'b']);
    expect(graph.getParentsOf(graph.getVertexRefById('a')!)).toEqual([]);
  }
});

type MilestoneItem = {
  id: string;
  children: MilestoneItem[];
  dependencies: string[];
  completionDependencies: string[];
};
type MilestoneSelectors = {
  id(item: MilestoneItem): string;
  dependsOnWork(item: MilestoneItem): string[];
  dependsOnSubgraphCompletion(item: MilestoneItem): string[];
};

test.each([
  [
    'materializeDagSourceFromRecords',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): MaterializedDagSource<MilestoneItem, string> =>
      materializeDagSourceFromRecords(items, {
        ...selectors,
        children: (item) => item.children.map((child) => child.id),
      }),
  ],
  [
    'materializeDagSourceFromRecordsAsync',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): Promise<MaterializedDagSource<MilestoneItem, string>> =>
      materializeDagSourceFromRecordsAsync(items, {
        ...selectors,
        children: async (item) => item.children.map((child) => child.id),
      }),
  ],
  [
    'materializeDagSourceFromRoots',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): MaterializedDagSource<MilestoneItem, string> =>
      materializeDagSourceFromRoots(items, { ...selectors, children: (item) => item.children }),
  ],
  [
    'materializeDagSourceFromRootsAsync',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): Promise<MaterializedDagSource<MilestoneItem, string>> =>
      materializeDagSourceFromRootsAsync(items, {
        ...selectors,
        children: async (item) => item.children,
      }),
  ],
] as const)(
  '%s canonical selectors distinguish work from subgraph completion',
  async (_name, make) => {
    const child: MilestoneItem = {
      id: 'child',
      children: [],
      dependencies: [],
      completionDependencies: [],
    };
    const group: MilestoneItem = {
      id: 'group',
      children: [child],
      dependencies: [],
      completionDependencies: [],
    };
    const items: MilestoneItem[] = [
      {
        id: 'afterComplete',
        children: [],
        dependencies: [],
        completionDependencies: ['group'],
      },
      {
        id: 'afterWork',
        children: [],
        dependencies: ['group'],
        completionDependencies: [],
      },
      group,
    ];
    const source = await make([...items, child], {
      id: (item) => item.id,
      dependsOnWork: (item) => item.dependencies,
      dependsOnSubgraphCompletion: (item) => item.completionDependencies,
    });
    const runner = new DagTraversal({
      ...source,
      workCompletion: 'externalSettlement',
    }).createRunner();
    runner.run();
    expect(
      runner
        .summary()
        .awaitingSettlement.map((work) => work.vertexId)
        .sort(),
    ).toEqual(['child', 'group']);
    runner.settle(
      'group',
      { ok: true },
      runner.summary().vertices.get('group')!.generation!,
    );
    runner.run();
    expect(
      runner
        .summary()
        .awaitingSettlement.map((work) => work.vertexId)
        .sort(),
    ).toEqual(['afterWork', 'child']);
    runner.settle(
      'child',
      { ok: true },
      runner.summary().vertices.get('child')!.generation!,
    );
    runner.run();
    expect(
      runner
        .summary()
        .awaitingSettlement.map((work) => work.vertexId)
        .sort(),
    ).toEqual(['afterComplete', 'afterWork']);
  },
);

for (const [name, make] of [
  ['materializeDagSourceFromRecords', materializeDagSourceFromRecords],
  ['materializeDagSourceFromRoots', materializeDagSourceFromRoots],
  ['materializeDagSourceFromRecordsAsync', materializeDagSourceFromRecordsAsync],
  ['materializeDagSourceFromRootsAsync', materializeDagSourceFromRootsAsync],
] as const) {
  for (const key of ['dependencies', 'completionDependencies']) {
    for (const inherited of [false, true]) {
      for (const presentUndefined of [false, true]) {
        test.each([false, true])(
          `${name} rejects ${inherited ? 'inherited' : 'own'} ${key}=${
            presentUndefined ? 'undefined' : 'callback'
          } before callbacks (empty=%s)`,
          async (empty) => {
            const calls: string[] = [];
            const retired = {
              [key]: presentUndefined
                ? undefined
                : () => {
                    calls.push('retired');
                    return [];
                  },
            };
            const selectors = Object.assign(
              inherited ? Object.create(retired) : retired,
              {
                id: () => {
                  calls.push('id');
                  return 'a';
                },
                children: () => {
                  calls.push('children');
                  return [];
                },
                dependsOnWork: () => {
                  calls.push('dependsOnWork');
                  return [];
                },
                dependsOnSubgraphCompletion: () => {
                  calls.push('dependsOnSubgraphCompletion');
                  return [];
                },
              },
            );
            const items = {
              *[Symbol.iterator]() {
                calls.push('catalog');
                if (!empty) yield 'a';
              },
            };
            await expect(
              Promise.resolve().then(() => make(items, selectors)),
            ).rejects.toThrow(TypeError);
            expect(calls).toEqual([]);
          },
        );
      }
    }
  }
}
