import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  graphFrom,
  forestFrom,
  graphFromAsync,
  forestFromAsync,
} from '../src/sources';

test('a flat diamond discovers all records and releases dependencies after settlement', () => {
  const source = graphFrom(
    [
      { id: 'a', requires: [] },
      { id: 'b', requires: ['a'] },
      { id: 'c', requires: ['a'] },
      { id: 'd', requires: ['b', 'c'] },
    ],
    { id: (task) => task.id, dependencies: (task) => task.requires },
  );
  const runner = new DagTraversal({
    ...source,
    workCompletion: 'externalSettlement',
  }).makeRunner();
  runner.run();
  expect(
    runner.summary().deferredFrontier.map((work) => work.vertexId),
  ).toEqual(['a']);
  runner.settle(
    'a',
    { ok: true },
    runner.summary().vertices.get('a')!.generation!,
  );
  runner.run();
  expect(
    runner.summary().deferredFrontier.map((work) => work.vertexId),
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
    runner.summary().deferredFrontier.map((work) => work.vertexId),
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
    graphFrom(items, { id: (item) => item.id }),
    await graphFromAsync(items, { id: async (item) => item.id }),
    forestFrom(items, { id: (item) => item.id }),
    await forestFromAsync(items, { id: async (item) => item.id }),
  ]) {
    items[0]!.value = 2;
    const traversal = new DagTraversal(source);
    const seen: typeof items = [];
    traversal.addVisitorFor(DagTraversalOrder.ON_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    const runner = traversal.makeRunner();
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
      dependencies: (item: typeof items[number]) => item.dependencies,
      completionDependencies: (item: typeof items[number]) => item.completion,
    };
    const source = asyncSource
      ? await graphFromAsync(items, selectors)
      : graphFrom(items, selectors);
    const first = items[0]!;
    first.children.length = 0;
    items[1]!.dependencies.length = 0;
    items[2]!.completion.length = 0;
    items.length = 0;
    for (let iteration = 0; iteration < 2; iteration++) {
      const runner = new DagTraversal({
        ...source,
        workCompletion: 'externalSettlement',
      }).makeRunner();
      runner.run();
      expect(
        runner.summary().deferredFrontier.map((work) => work.vertexId),
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
        runner.summary().deferredFrontier.map((work) => work.vertexId),
      ).toEqual(['b']);
      runner.settle(
        'b',
        { ok: true },
        runner.summary().vertices.get('b')!.generation!,
      );
      runner.run();
      expect(
        runner.summary().deferredFrontier.map((work) => work.vertexId),
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
      graphFrom([item, item], { id: (record) => record.id }),
    ).toThrow(TypeError);
    await expect(
      graphFromAsync([item, item], { id: (record) => record.id }),
    ).rejects.toThrow(TypeError);
  },
);

test('forest permits repeated record identity but rejects different records sharing IDs', async () => {
  const roots = [{ id: undefined }, { id: undefined }];
  expect(() => forestFrom(roots, { id: (item) => item.id })).toThrow(TypeError);
  await expect(
    forestFromAsync(roots, { id: (item) => item.id }),
  ).rejects.toThrow(TypeError);
  for (const source of [
    forestFrom([roots[0]!, roots[0]!], { id: (item) => item.id }),
    await forestFromAsync([roots[0]!, roots[0]!], { id: (item) => item.id }),
  ]) {
    const runner = new DagTraversal(source).makeRunner();
    runner.run();
    expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(1);
  }
});

test('missing structural children reject during catalog materialization', async () => {
  expect(() =>
    graphFrom(['a'], { id: (item) => item, children: () => ['missing'] }),
  ).toThrow(TypeError);
  await expect(
    graphFromAsync(['a'], { id: (item) => item, children: () => ['missing'] }),
  ).rejects.toThrow(TypeError);
});

test('unknown prerequisites remain engine validation errors while known lookup is tagged found', () => {
  const source = graphFrom(['a'], {
    id: (item) => item,
    dependencies: () => ['missing'],
  });
  expect(source.traversableGraph.resolvePrerequisite!('a')).toMatchObject({
    kind: 'found',
    vertex: { vertexId: 'a' },
  });
  expect(source.traversableGraph.resolvePrerequisite!('missing')).toEqual({
    kind: 'missing',
  });
  expect(() => new DagTraversal(source).makeRunner().run()).toThrow();
});

test('a source rejects unknown structural lookup without omitting it', () => {
  const source = graphFrom(['a'], { id: (item) => item });
  const traversal = new DagTraversal({
    ...source,
    traversableGraph: {
      ...source.traversableGraph,
      makeVertex: (_hint, options) =>
        source.traversableGraph.makeVertex('missing', options),
    },
  });
  expect(() => traversal.makeRunner().run()).toThrow(TypeError);
});

test('async catalogs and promised iterable selectors preserve completion and structural edges', async () => {
  async function* catalog() {
    yield { id: 'a' };
    yield { id: 'b' };
  }
  async function* children(id: string) {
    if (id === 'a') yield 'b';
  }
  const source = await graphFromAsync(catalog(), {
    id: async (item) => item.id,
    children: (item) => children(item.id),
    dependencies: async () => [],
    completionDependencies: async () => [],
  });
  const runner = new AsyncDagTraversal(source).makeRunner();
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
    dependencies: async (item: typeof root) => (item === leaf ? ['root'] : []),
    completionDependencies: async () => [],
  };
  const source = await forestFromAsync(roots(), selectors);
  const runner = new DagTraversal({
    ...source,
    workCompletion: 'externalSettlement',
  }).makeRunner();
  runner.run();
  expect(
    runner.summary().deferredFrontier.map((work) => work.vertexId),
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
      dependencies: () => [],
      completionDependencies: (item: Item) => item.after,
    };
    const source = asyncSource
      ? await forestFromAsync(roots, selectors)
      : forestFrom(roots, selectors);
    root.children.length = 0;
    after.after.length = 0;
    roots.length = 0;
    const runner = new DagTraversal({
      ...source,
      workCompletion: 'externalSettlement',
    }).makeRunner();
    runner.run();
    expect(
      runner.summary().deferredFrontier.map((work) => work.vertexId),
    ).toEqual(['root', 'child']);
    runner.settle(
      'root',
      { ok: true },
      runner.summary().vertices.get('root')!.generation!,
    );
    runner.run();
    expect(
      runner.summary().deferredFrontier.map((work) => work.vertexId),
    ).toEqual(['child']);
    runner.settle(
      'child',
      { ok: true },
      runner.summary().vertices.get('child')!.generation!,
    );
    runner.run();
    expect(
      runner.summary().deferredFrontier.map((work) => work.vertexId),
    ).toEqual(['after']);
  }
});

test('empty forests produce finished empty graphs with no holder events', async () => {
  for (const source of [
    forestFrom([], { id: (item: string) => item }),
    await forestFromAsync([], { id: (item: string) => item }),
  ]) {
    const runner = new DagTraversal(source).makeRunner();
    expect([...runner.getIterable()]).toEqual([]);
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
    dependencies: () => [],
    completionDependencies: () => [],
  };
  expect(() => forestFrom([root], selectors)).not.toThrow();
  const cycle: Item = { id: 0, children: [] };
  cycle.children.push(cycle);
  const source = forestFrom([cycle], selectors);
  expect(() => new DagTraversal(source).makeRunner().run()).toThrow();
});

test('selector and catalog failures retain exact identity', async () => {
  const error = { failure: true };
  const id = () => {
    throw error;
  };
  for (const factory of [graphFrom, forestFrom]) {
    try {
      factory([1], { id });
      throw new Error('Expected selector failure');
    } catch (actual) {
      expect(actual).toBe(error);
    }
  }
  for (const factory of [graphFromAsync, forestFromAsync]) {
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
    graphFrom([], { id: (item: string) => item }),
  ).makeRunner();
  empty.run();
  expect(empty.getResolvedGraph().getVertexRefs()).toEqual([]);
  const source = await graphFromAsync([1, 2], { id: (item) => item });
  const runner = new AsyncDagTraversal(source).makeRunner();
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
    forestFrom(roots, {
      id: (item) => item.id,
      children: (item) => item.children,
    }),
    await forestFromAsync(roots, {
      id: (item) => item.id,
      children: (item) => item.children,
    }),
  ]) {
    const runner = new DagTraversal(source).makeRunner();
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
