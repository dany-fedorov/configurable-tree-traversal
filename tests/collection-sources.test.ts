import type { MaterializedDagTraversalInput } from '../src/sources';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeDagInputFromRootRecords,
  materializeMultiEntryDagInputFromRecordCatalogAsync,
  materializeDagInputFromRootRecordsAsync,
} from '../src/sources';

test('a flat diamond discovers all records and releases dependencies after settlement', () => {
  const source = materializeMultiEntryDagInputFromRecordCatalog(
    [
      { id: 'a', requires: [] },
      { id: 'b', requires: ['a'] },
      { id: 'c', requires: ['a'] },
      { id: 'd', requires: ['b', 'c'] },
    ],
    {
      selectVertexId: (task) => task.id,
      selectWorkPrerequisiteVertexIds: (task) => task.requires,
    },
  );
  const runner = new DagTraversalBuilder({
    ...source,
    workCompletionPolicy: 'requireExternalWorkSettlement',
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  expect(
    runner
      .captureProgressSnapshot()
      .workAwaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['a']);
  runner.settleDeferredWork(
    'a',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().progressByVertexId.get('a')!
      .settlementToken!,
  );
  runner.runUntilSuspendedOrTerminal();
  expect(
    runner
      .captureProgressSnapshot()
      .workAwaitingSettlement.map((work) => work.vertexId),
  ).toEqual(['b', 'c']);
  runner.settleDeferredWork(
    'b',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().progressByVertexId.get('b')!
      .settlementToken!,
  );
  runner.settleDeferredWork(
    'c',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().progressByVertexId.get('c')!
      .settlementToken!,
  );
  runner.runUntilSuspendedOrTerminal();
  expect(
    runner
      .captureProgressSnapshot()
      .workAwaitingSettlement.map((work) => work.vertexId),
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
    materializeMultiEntryDagInputFromRecordCatalog(items, {
      selectVertexId: (item) => item.id,
    }),
    await materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
      selectVertexId: async (item) => item.id,
    }),
    materializeDagInputFromRootRecords(items, {
      selectVertexId: (item) => item.id,
    }),
    await materializeDagInputFromRootRecordsAsync(items, {
      selectVertexId: async (item) => item.id,
    }),
  ]) {
    items[0]!.value = 2;
    const traversal = new DagTraversalBuilder(source);
    const seen: typeof items = [];
    traversal.registerVisitorCallbackForPhase(
      DagVisitorPhase.ON_WORK_READY,
      (vertex) => {
        seen.push(vertex.getVertexData());
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(items);
    const graph = runner.getLiveResolvedGraphView();
    for (const item of items)
      expect(
        graph
          .getVertexHandleByIdOrNull(item.id)!
          .getCurrentVertexView()
          .getVertexData(),
      ).toBe(item);
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
      selectVertexId: (item: typeof items[number]) => {
        calls++;
        return item.id;
      },
      selectStructuralChildVertexIds: (item: typeof items[number]) =>
        item.children,
      selectWorkPrerequisiteVertexIds: (item: typeof items[number]) =>
        item.dependencies,
      selectSubgraphCompletionPrerequisiteVertexIds: (
        item: typeof items[number],
      ) => item.completion,
    };
    const source = asyncSource
      ? await materializeMultiEntryDagInputFromRecordCatalogAsync(
          items,
          selectors,
        )
      : materializeMultiEntryDagInputFromRecordCatalog(items, selectors);
    const first = items[0]!;
    first.children.length = 0;
    items[1]!.dependencies.length = 0;
    items[2]!.completion.length = 0;
    items.length = 0;
    for (let iteration = 0; iteration < 2; iteration++) {
      const runner = new DagTraversalBuilder({
        ...source,
        workCompletionPolicy: 'requireExternalWorkSettlement',
      }).createIndependentRunnerFromCurrentOptions();
      runner.runUntilSuspendedOrTerminal();
      expect(
        runner
          .captureProgressSnapshot()
          .workAwaitingSettlement.map((work) => work.vertexId),
      ).toEqual(['a']);
      const graph = runner.getLiveResolvedGraphView();
      expect(graph.getVertexHandles()).toHaveLength(3);
      expect(
        graph.getDistinctStructuralParentHandlesOrNull(
          graph.getVertexHandleByIdOrNull('b')!,
        ),
      ).toEqual([graph.getVertexHandleByIdOrNull('a')]);
      expect(() => {
        graph
          .getVertexHandleByIdOrNull('a')!
          // @ts-expect-error readonly observation collection
          .getCurrentVertexView().$childDiscoveryHints.length = 0;
      }).toThrow(TypeError);
      runner.settleDeferredWork(
        'a',
        { kind: 'workCompleted' },
        runner.captureProgressSnapshot().progressByVertexId.get('a')!
          .settlementToken!,
      );
      runner.runUntilSuspendedOrTerminal();
      expect(
        runner
          .captureProgressSnapshot()
          .workAwaitingSettlement.map((work) => work.vertexId),
      ).toEqual(['b']);
      runner.settleDeferredWork(
        'b',
        { kind: 'workCompleted' },
        runner.captureProgressSnapshot().progressByVertexId.get('b')!
          .settlementToken!,
      );
      runner.runUntilSuspendedOrTerminal();
      expect(
        runner
          .captureProgressSnapshot()
          .workAwaitingSettlement.map((work) => work.vertexId),
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
      materializeMultiEntryDagInputFromRecordCatalog([item, item], {
        selectVertexId: (record) => record.id,
      }),
    ).toThrow(TypeError);
    await expect(
      materializeMultiEntryDagInputFromRecordCatalogAsync([item, item], {
        selectVertexId: (record) => record.id,
      }),
    ).rejects.toThrow(TypeError);
  },
);

test('forest permits repeated record identity but rejects different records sharing IDs', async () => {
  const roots = [{ id: undefined }, { id: undefined }];
  expect(() =>
    materializeDagInputFromRootRecords(roots, {
      selectVertexId: (item) => item.id,
    }),
  ).toThrow(TypeError);
  await expect(
    materializeDagInputFromRootRecordsAsync(roots, {
      selectVertexId: (item) => item.id,
    }),
  ).rejects.toThrow(TypeError);
  for (const source of [
    materializeDagInputFromRootRecords([roots[0]!, roots[0]!], {
      selectVertexId: (item) => item.id,
    }),
    await materializeDagInputFromRootRecordsAsync([roots[0]!, roots[0]!], {
      selectVertexId: (item) => item.id,
    }),
  ]) {
    const runner = new DagTraversalBuilder(
      source,
    ).createIndependentRunnerFromCurrentOptions();
    runner.runUntilSuspendedOrTerminal();
    expect(runner.getLiveResolvedGraphView().getVertexHandles()).toHaveLength(
      1,
    );
  }
});

test('missing structural children reject during catalog materialization', async () => {
  expect(() =>
    materializeMultiEntryDagInputFromRecordCatalog(['a'], {
      selectVertexId: (item) => item,
      selectStructuralChildVertexIds: () => ['missing'],
    }),
  ).toThrow(TypeError);
  await expect(
    materializeMultiEntryDagInputFromRecordCatalogAsync(['a'], {
      selectVertexId: (item) => item,
      selectStructuralChildVertexIds: () => ['missing'],
    }),
  ).rejects.toThrow(TypeError);
});

test('unknown prerequisites remain engine validation errors while known lookup is tagged found', () => {
  const source = materializeMultiEntryDagInputFromRecordCatalog(['a'], {
    selectVertexId: (item) => item,
    selectWorkPrerequisiteVertexIds: () => ['missing'],
  });
  expect(
    source.dagDiscoverySource.resolvePrerequisiteByVertexId!('a'),
  ).toMatchObject({
    kind: 'vertexResolved',
    resolvedVertexInput: { vertexId: 'a' },
  });
  expect(
    source.dagDiscoverySource.resolvePrerequisiteByVertexId!('missing'),
  ).toEqual({
    kind: 'missing',
  });
  expect(() =>
    new DagTraversalBuilder(source)
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow();
});

test('a source rejects unknown structural lookup without omitting it', () => {
  const source = materializeMultiEntryDagInputFromRecordCatalog(['a'], {
    selectVertexId: (item) => item,
  });
  const traversal = new DagTraversalBuilder({
    ...source,
    dagDiscoverySource: {
      ...source.dagDiscoverySource,
      resolveChildHint: (_hint, options) =>
        source.dagDiscoverySource.resolveChildHint('missing', options),
    },
  });
  expect(() =>
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow(TypeError);
});

test('async catalogs and promised iterable selectors preserve completion and structural edges', async () => {
  async function* catalog() {
    yield { id: 'a' };
    yield { id: 'b' };
  }
  async function* children(id: string) {
    if (id === 'a') yield 'b';
  }
  const source = await materializeMultiEntryDagInputFromRecordCatalogAsync(
    catalog(),
    {
      selectVertexId: async (item) => item.id,
      selectStructuralChildVertexIds: (item) => children(item.id),
      selectWorkPrerequisiteVertexIds: async () => [],
      selectSubgraphCompletionPrerequisiteVertexIds: async () => [],
    },
  );
  const runner = new AsyncDagTraversalBuilder(
    source,
  ).createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  const graph = runner.getLiveResolvedGraphView();
  expect(
    graph.getDistinctStructuralParentHandlesOrNull(
      graph.getVertexHandleByIdOrNull('b')!,
    ),
  ).toEqual([graph.getVertexHandleByIdOrNull('a')]);
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
    selectVertexId: (item: typeof root) => item.id,
    selectStructuralChildRecords: children,
    selectWorkPrerequisiteVertexIds: async (item: typeof root) =>
      item === leaf ? ['root'] : [],
    selectSubgraphCompletionPrerequisiteVertexIds: async () => [],
  };
  const source = await materializeDagInputFromRootRecordsAsync(
    roots(),
    selectors,
  );
  const runner = new DagTraversalBuilder({
    ...source,
    workCompletionPolicy: 'requireExternalWorkSettlement',
  }).createIndependentRunnerFromCurrentOptions();
  runner.runUntilSuspendedOrTerminal();
  expect(
    runner
      .captureProgressSnapshot()
      .workAwaitingSettlement.map((work) => work.vertexId),
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
      selectVertexId: (item: Item) => item.id,
      selectStructuralChildRecords: (item: Item) => item.children,
      selectWorkPrerequisiteVertexIds: () => [],
      selectSubgraphCompletionPrerequisiteVertexIds: (item: Item) => item.after,
    };
    const source = asyncSource
      ? await materializeDagInputFromRootRecordsAsync(roots, selectors)
      : materializeDagInputFromRootRecords(roots, selectors);
    root.children.length = 0;
    after.after.length = 0;
    roots.length = 0;
    const runner = new DagTraversalBuilder({
      ...source,
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    runner.runUntilSuspendedOrTerminal();
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['root', 'child']);
    runner.settleDeferredWork(
      'root',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('root')!
        .settlementToken!,
    );
    runner.runUntilSuspendedOrTerminal();
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['child']);
    runner.settleDeferredWork(
      'child',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('child')!
        .settlementToken!,
    );
    runner.runUntilSuspendedOrTerminal();
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId),
    ).toEqual(['after']);
  }
});

test('empty forests produce finished empty graphs with no holder events', async () => {
  for (const source of [
    materializeDagInputFromRootRecords([], {
      selectVertexId: (item: string) => item,
    }),
    await materializeDagInputFromRootRecordsAsync([], {
      selectVertexId: (item: string) => item,
    }),
  ]) {
    const runner = new DagTraversalBuilder(
      source,
    ).createIndependentRunnerFromCurrentOptions();
    expect([
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]).toEqual([]);
    expect(runner.getLiveResolvedGraphView().getVertexHandles()).toEqual([]);
  }
});

test('forest materialization is iterative for deep input and leaves cycle validation to the engine', () => {
  type Item = { id: number; children: Item[] };
  let root: Item = { id: 15000, children: [] };
  for (let id = 14999; id >= 0; id--) root = { id, children: [root] };
  const selectors = {
    selectVertexId: (item: Item) => item.id,
    selectStructuralChildRecords: (item: Item) => item.children,
    selectWorkPrerequisiteVertexIds: () => [],
    selectSubgraphCompletionPrerequisiteVertexIds: () => [],
  };
  expect(() =>
    materializeDagInputFromRootRecords([root], selectors),
  ).not.toThrow();
  const cycle: Item = { id: 0, children: [] };
  cycle.children.push(cycle);
  const source = materializeDagInputFromRootRecords([cycle], selectors);
  expect(() =>
    new DagTraversalBuilder(source)
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow();
});

test('selector and catalog failures retain exact identity', async () => {
  const error = { failure: true };
  const id = () => {
    throw error;
  };
  for (const factory of [
    materializeMultiEntryDagInputFromRecordCatalog,
    materializeDagInputFromRootRecords,
  ]) {
    try {
      factory([1], { selectVertexId: id });
      throw new Error('Expected selector failure');
    } catch (actual) {
      expect(actual).toBe(error);
    }
  }
  for (const factory of [
    materializeMultiEntryDagInputFromRecordCatalogAsync,
    materializeDagInputFromRootRecordsAsync,
  ]) {
    await expect(
      factory([1], { selectVertexId: () => Promise.reject(error) }),
    ).rejects.toBe(error);
    async function* catalog(): AsyncGenerator<number> {
      throw error;
    }
    await expect(
      factory(catalog(), { selectVertexId: (item) => item }),
    ).rejects.toBe(error);
    await expect(
      factory([1], {
        selectVertexId: (item) => item,
        [factory === materializeMultiEntryDagInputFromRecordCatalogAsync
          ? 'selectStructuralChildVertexIds'
          : 'selectStructuralChildRecords']: () => Promise.reject(error),
      }),
    ).rejects.toBe(error);
  }
});

test('empty and disconnected catalogs expose only actual records', async () => {
  const empty = new DagTraversalBuilder(
    materializeMultiEntryDagInputFromRecordCatalog([], {
      selectVertexId: (item: string) => item,
    }),
  ).createIndependentRunnerFromCurrentOptions();
  empty.runUntilSuspendedOrTerminal();
  expect(empty.getLiveResolvedGraphView().getVertexHandles()).toEqual([]);
  const source = await materializeMultiEntryDagInputFromRecordCatalogAsync(
    [1, 2],
    {
      selectVertexId: (item) => item,
    },
  );
  const runner = new AsyncDagTraversalBuilder(
    source,
  ).createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  expect(runner.getLiveResolvedGraphView().getVertexHandles()).toHaveLength(2);
});

test('forest expansion shares records across parents', async () => {
  type Item = { id: string; children: Item[] };
  const leaf: Item = { id: 'leaf', children: [] };
  const roots: Item[] = [
    { id: 'a', children: [leaf] },
    { id: 'b', children: [leaf] },
  ];
  for (const source of [
    materializeDagInputFromRootRecords(roots, {
      selectVertexId: (item) => item.id,
      selectStructuralChildRecords: (item) => item.children,
    }),
    await materializeDagInputFromRootRecordsAsync(roots, {
      selectVertexId: (item) => item.id,
      selectStructuralChildRecords: (item) => item.children,
    }),
  ]) {
    const runner = new DagTraversalBuilder(
      source,
    ).createIndependentRunnerFromCurrentOptions();
    runner.runUntilSuspendedOrTerminal();
    const graph = runner.getLiveResolvedGraphView();
    expect(graph.getVertexHandles()).toHaveLength(3);
    expect(
      graph
        .getDistinctStructuralParentHandlesOrNull(
          graph.getVertexHandleByIdOrNull('leaf')!,
        )!
        .map((ref) => graph.requireVertexId(ref)),
    ).toEqual(['a', 'b']);
    expect(
      graph.getDistinctStructuralParentHandlesOrNull(
        graph.getVertexHandleByIdOrNull('a')!,
      ),
    ).toEqual([]);
  }
});

type MilestoneItem = {
  id: string;
  children: MilestoneItem[];
  dependencies: string[];
  completionDependencies: string[];
};
type MilestoneSelectors = {
  selectVertexId(item: MilestoneItem): string;
  selectWorkPrerequisiteVertexIds(item: MilestoneItem): string[];
  selectSubgraphCompletionPrerequisiteVertexIds(item: MilestoneItem): string[];
};

test.each([
  [
    'materializeMultiEntryDagInputFromRecordCatalog',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): MaterializedDagTraversalInput<MilestoneItem, string> =>
      materializeMultiEntryDagInputFromRecordCatalog(items, {
        ...selectors,
        selectStructuralChildVertexIds: (item) =>
          item.children.map((child) => child.id),
      }),
  ],
  [
    'materializeMultiEntryDagInputFromRecordCatalogAsync',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): Promise<MaterializedDagTraversalInput<MilestoneItem, string>> =>
      materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
        ...selectors,
        selectStructuralChildVertexIds: async (item) =>
          item.children.map((child) => child.id),
      }),
  ],
  [
    'materializeDagInputFromRootRecords',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): MaterializedDagTraversalInput<MilestoneItem, string> =>
      materializeDagInputFromRootRecords(items, {
        ...selectors,
        selectStructuralChildRecords: (item) => item.children,
      }),
  ],
  [
    'materializeDagInputFromRootRecordsAsync',
    (
      items: MilestoneItem[],
      selectors: MilestoneSelectors,
    ): Promise<MaterializedDagTraversalInput<MilestoneItem, string>> =>
      materializeDagInputFromRootRecordsAsync(items, {
        ...selectors,
        selectStructuralChildRecords: async (item) => item.children,
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
      selectVertexId: (item) => item.id,
      selectWorkPrerequisiteVertexIds: (item) => item.dependencies,
      selectSubgraphCompletionPrerequisiteVertexIds: (item) =>
        item.completionDependencies,
    });
    const runner = new DagTraversalBuilder({
      ...source,
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    runner.runUntilSuspendedOrTerminal();
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId)
        .sort(),
    ).toEqual(['child', 'group']);
    runner.settleDeferredWork(
      'group',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('group')!
        .settlementToken!,
    );
    runner.runUntilSuspendedOrTerminal();
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId)
        .sort(),
    ).toEqual(['afterWork', 'child']);
    runner.settleDeferredWork(
      'child',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('child')!
        .settlementToken!,
    );
    runner.runUntilSuspendedOrTerminal();
    expect(
      runner
        .captureProgressSnapshot()
        .workAwaitingSettlement.map((work) => work.vertexId)
        .sort(),
    ).toEqual(['afterComplete', 'afterWork']);
  },
);

for (const [name, make] of [
  [
    'materializeMultiEntryDagInputFromRecordCatalog',
    materializeMultiEntryDagInputFromRecordCatalog,
  ],
  ['materializeDagInputFromRootRecords', materializeDagInputFromRootRecords],
  [
    'materializeMultiEntryDagInputFromRecordCatalogAsync',
    materializeMultiEntryDagInputFromRecordCatalogAsync,
  ],
  [
    'materializeDagInputFromRootRecordsAsync',
    materializeDagInputFromRootRecordsAsync,
  ],
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
                selectVertexId: () => {
                  calls.push('id');
                  return 'a';
                },
                [name.includes('RootRecords')
                  ? 'selectStructuralChildRecords'
                  : 'selectStructuralChildVertexIds']: () => {
                  calls.push('children');
                  return [];
                },
                selectWorkPrerequisiteVertexIds: () => {
                  calls.push('dependsOnWork');
                  return [];
                },
                selectSubgraphCompletionPrerequisiteVertexIds: () => {
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
