import {
  AsyncGraphWalk,
  GraphWalk,
  GraphWalkPhase as Phase,
  graphWalk,
  materializeWalkSourceFromRecords,
  materializeWalkSourceFromRecordsAsync,
  materializeWalkSourceFromDagDefinition,
  defineDag,
  prepareDagDefinition,
} from '../src';

it('captures catalog topology eagerly while retaining shallow caller data', () => {
  const a = { id: 'A' },
    b = { id: 'B' };
  const relation = { kind: 'cites' };
  const link = { to: 'B', data: relation };
  const adjacency = [link, link];
  const roots = ['A'];
  const calls: string[] = [];
  const source = materializeWalkSourceFromRecords([a, b], {
    id: (item) => {
      calls.push(`id:${item.id}`);
      return item.id;
    },
    outgoing: (item) => {
      calls.push(`outgoing:${item.id}`);
      return item === a ? adjacency : [];
    },
    roots,
  });
  expect(source.hydration).toBe('resolver');
  expect(calls).toEqual(['id:A', 'outgoing:A', 'id:B', 'outgoing:B']);
  roots.length = 0;
  adjacency.length = 0;
  link.to = 'unknown';
  link.data = { kind: 'replaced' };
  relation.kind = 'updated';
  const factory = new GraphWalk({ source });
  for (let run = 0; run < 2; run++) {
    const events = [
      ...factory.createRunner().iterateEvents({ emitEvents: [Phase.EDGE] }),
    ];
    expect(
      events.map((event) => [
        event.edge.from,
        event.edge.to,
        event.edge.outgoingIndex,
      ]),
    ).toEqual([
      ['A', 'B', 0],
      ['A', 'B', 1],
    ]);
    expect(events[0]!.source.data).toBe(a);
    expect(events[0]!.target).toEqual({
      kind: 'found',
      vertex: { vertexId: 'B', data: b },
    });
    expect(events[0]!.edge.data).toBe(relation);
  }
  expect(calls).toHaveLength(4);
  expect(graphWalk.materializeWalkSourceFromRecords).toBe(
    materializeWalkSourceFromRecords,
  );
});

it('returns detached root, resolution and outgoing wrappers for independent consumers', () => {
  const data = { id: undefined };
  const source = materializeWalkSourceFromRecords([data], {
    id: (item) => item.id,
    outgoing: () => [{ to: undefined, data: undefined }],
    roots: [undefined, undefined],
  });
  const first = [...source.roots()];
  (first[0] as any).vertexId = 'changed';
  first.length = 0;
  const resolution = source.resolveVertex!(undefined);
  (resolution as any).kind = 'omitted';
  const links = [...source.outgoing({ vertexId: undefined, data })];
  (links[0]!.target as any).vertexId = 'changed';
  (links[0] as any).data = 'changed';
  links.length = 0;
  expect([...source.roots()]).toEqual([
    { vertexId: undefined },
    { vertexId: undefined },
  ]);
  expect(source.resolveVertex!(undefined)).toEqual({ kind: 'found', data });
  expect([...source.outgoing({ vertexId: undefined, data })]).toEqual([
    { target: { vertexId: undefined }, data: undefined },
  ]);
});

it('preserves arbitrary identity, parallel links and explicit root order without coercion', () => {
  const object = {},
    other = {},
    symbol = Symbol('id');
  const ids: unknown[] = [object, other, symbol, undefined, null, NaN, -0];
  const items = ids.map((id) => ({ id }));
  const source = materializeWalkSourceFromRecords(items, {
    id: (item) => item.id,
    outgoing: () => ids.map((to, data) => ({ to, data })),
    roots: [NaN, object, 0, symbol],
  });
  expect([...source.roots()].map((root) => root.vertexId)).toEqual([
    NaN,
    object,
    0,
    symbol,
  ]);
  for (const item of items)
    expect(source.resolveVertex!(item.id)).toEqual({
      kind: 'found',
      data: item,
    });
  expect(
    [...source.outgoing({ vertexId: object, data: items[0]! })].map(
      (link) => link.target.vertexId,
    ),
  ).toEqual(ids);
  expect(() => source.resolveVertex!({})).toThrow(TypeError);
  expect(() => source.outgoing({ vertexId: {}, data: items[0]! })).toThrow(
    TypeError,
  );
});

it.each([
  [NaN, NaN],
  [-0, 0],
  [undefined, undefined],
  [{}, 'same-record'],
])(
  'rejects duplicate catalog IDs including repeated records %#',
  (first, second) => {
    const item = { id: first };
    const items =
      second === 'same-record' ? [item, item] : [item, { id: second }];
    expect(() =>
      materializeWalkSourceFromRecords(items, {
        id: (value) => value.id,
        outgoing: () => [],
        roots: [],
      }),
    ).toThrow(TypeError);
  },
);

it('rejects unknown roots and targets even in unreachable records', () => {
  expect(() =>
    materializeWalkSourceFromRecords(['a'], {
      id: (item) => item,
      outgoing: () => [],
      roots: ['missing'],
    }),
  ).toThrow(TypeError);
  expect(() =>
    materializeWalkSourceFromRecords(['a', 'b'], {
      id: (item) => item,
      outgoing: (item) => (item === 'b' ? [{ to: 'missing', data: 1 }] : []),
      roots: ['a'],
    }),
  ).toThrow(TypeError);
});

it('allows empty catalog and root sets without inventing vertices', () => {
  const source = materializeWalkSourceFromRecords([], {
    id: (value) => value,
    outgoing: () => [],
    roots: [],
  });
  expect([...new GraphWalk({ source }).createRunner().iterateEvents()]).toEqual(
    [],
  );
  expect(() => source.resolveVertex!(undefined as never)).toThrow(TypeError);
});

it('eagerly awaits async catalogs, selectors and roots into a synchronous reusable source', async () => {
  const a = { id: 'a' },
    b = { id: 'b' };
  const relation = { kind: 'link' };
  const link = { to: 'b', data: relation };
  const calls: string[] = [];
  const source = await materializeWalkSourceFromRecordsAsync(
    (async function* () {
      yield a;
      yield b;
    })(),
    {
      id: async (item) => {
        calls.push(`id:${item.id}`);
        return item.id;
      },
      outgoing: async (item) => {
        calls.push(`outgoing:${item.id}`);
        return (async function* () {
          if (item === a) yield link;
        })();
      },
      roots: (async function* () {
        calls.push('roots');
        yield 'a';
      })(),
    },
  );
  expect(source.hydration).toBe('resolver');
  expect(calls).toEqual(['id:a', 'outgoing:a', 'id:b', 'outgoing:b', 'roots']);
  link.to = 'unknown';
  const factory = new GraphWalk({ source });
  expect(
    [...factory.createRunner().iterateEvents({ emitEvents: [Phase.EDGE] })].map(
      (event) => event.edge.to,
    ),
  ).toEqual(['b']);
  const events = [];
  for await (const event of new AsyncGraphWalk({ source })
    .createRunner()
    .iterateEvents({ emitEvents: [Phase.EDGE] }))
    events.push(event);
  expect(events[0]!.edge.data).toBe(relation);
  expect(calls).toHaveLength(5);
  expect(graphWalk.materializeWalkSourceFromRecordsAsync).toBe(
    materializeWalkSourceFromRecordsAsync,
  );
});

it('accepts synchronous async-adapter inputs and validates their captured membership', async () => {
  const source = await materializeWalkSourceFromRecordsAsync([undefined], {
    id: (value) => value,
    outgoing: () => [],
    roots: [undefined],
  });
  expect(source.resolveVertex!(undefined)).toEqual({
    kind: 'found',
    data: undefined,
  });
  await expect(
    materializeWalkSourceFromRecordsAsync([NaN, NaN], {
      id: (value) => value,
      outgoing: () => [],
      roots: [],
    }),
  ).rejects.toThrow(TypeError);
  await expect(
    materializeWalkSourceFromRecordsAsync(['a'], {
      id: (value) => value,
      outgoing: () => [],
      roots: ['missing'],
    }),
  ).rejects.toThrow(TypeError);
  await expect(
    materializeWalkSourceFromRecordsAsync(['a'], {
      id: (value) => value,
      outgoing: () => [{ to: 'missing', data: 1 }],
      roots: [],
    }),
  ).rejects.toThrow(TypeError);
});

it.each([null, undefined, { exact: true }])(
  'retains exact synchronous and asynchronous selector failures %#',
  async (error) => {
    try {
      materializeWalkSourceFromRecords(['a'], {
        id: () => {
          throw error;
        },
        outgoing: () => [],
        roots: [],
      });
      throw new Error('Expected failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    try {
      await materializeWalkSourceFromRecordsAsync(['a'], {
        id: (value) => value,
        outgoing: async () => {
          throw error;
        },
        roots: [],
      });
      throw new Error('Expected failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
  },
);

function dagVertex<ID>(
  vertexId: ID,
  overrides: Partial<import('../src').DagDefinitionVertex<ID, ID>> = {},
) {
  return {
    vertexId,
    data: vertexId,
    slots: [],
    dependsOnWork: [],
    dependsOnSubgraphCompletion: [],
    ...overrides,
  };
}

it('walks cyclic definitions without DAG preparation or callback execution', () => {
  const a = dagVertex('a', {
    slots: [{ kind: 'vertex', vertexId: 'b' }],
    dependsOnWork: ['missing'],
  });
  const b = dagVertex('b', { slots: [{ kind: 'vertex', vertexId: 'a' }] });
  const definition = defineDag({
    vertices: [a, b],
    omittedIds: [],
    entry: { kind: 'root', vertexId: 'a' },
  });
  expect(prepareDagDefinition(definition).kind).toBe('invalid');
  const source = materializeWalkSourceFromDagDefinition(definition, {
    relations: ['children'],
  });
  expect(source.hydration).toBe('resolver');
  const runner = new GraphWalk({ source }).createRunner();
  expect(
    [...runner.iterateEvents({ emitEvents: [Phase.EDGE] })].map((event) => [
      event.edge.from,
      event.edge.to,
      event.edge.data,
    ]),
  ).toEqual([
    ['a', 'b', { kind: 'child', slotIndex: 0 }],
    ['b', 'a', { kind: 'child', slotIndex: 0 }],
  ]);
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
  expect(graphWalk.materializeWalkSourceFromDagDefinition).toBe(
    materializeWalkSourceFromDagDefinition,
  );
});

it('projects selected DAG relations in canonical order with parallel slots and dependent-to-prerequisite direction', () => {
  const definition = defineDag({
    vertices: [
      dagVertex('a', {
        slots: [
          { kind: 'omitted', identity: null },
          { kind: 'vertex', vertexId: 'b' },
          { kind: 'vertex', vertexId: 'b' },
          { kind: 'omitted', identity: { vertexId: 'skip' } },
        ],
        dependsOnWork: ['c', 'b', 'skip'],
        dependsOnSubgraphCompletion: ['b', 'a', 'skip'],
      }),
      dagVertex('b'),
      dagVertex('c'),
    ],
    omittedIds: ['skip'],
    entry: { kind: 'root', vertexId: 'a' },
  });
  const source = materializeWalkSourceFromDagDefinition(definition, {
    relations: [
      'subgraphCompletionDependencies',
      'workDependencies',
      'children',
    ],
  });
  const edges = [
    ...new GraphWalk({ source })
      .createRunner()
      .iterateEvents({ emitEvents: [Phase.EDGE] }),
  ];
  expect(
    edges.map((event) => [
      event.edge.from,
      event.edge.to,
      event.edge.data,
      event.target.kind,
    ]),
  ).toEqual([
    ['a', 'b', { kind: 'child', slotIndex: 1 }, 'found'],
    ['a', 'b', { kind: 'child', slotIndex: 2 }, 'found'],
    ['a', 'skip', { kind: 'child', slotIndex: 3 }, 'omitted'],
    ['a', 'c', { kind: 'workDependency' }, 'found'],
    ['a', 'b', { kind: 'workDependency' }, 'found'],
    ['a', 'skip', { kind: 'workDependency' }, 'omitted'],
    ['a', 'b', { kind: 'subgraphCompletionDependency' }, 'found'],
    ['a', 'a', { kind: 'subgraphCompletionDependency' }, 'found'],
    ['a', 'skip', { kind: 'subgraphCompletionDependency' }, 'omitted'],
  ]);
  expect(edges.map((event) => event.edge.outgoingIndex)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8,
  ]);
});

it.each(['workDependencies', 'subgraphCompletionDependencies'] as const)(
  'allows cyclic %s and ignores unselected missing relationships',
  (relation) => {
    const source = materializeWalkSourceFromDagDefinition(
      defineDag({
        vertices: [
          dagVertex('a', {
            slots: [{ kind: 'vertex', vertexId: 'unknown' }],
            dependsOnWork:
              relation === 'workDependencies' ? ['b'] : ['missing'],
            dependsOnSubgraphCompletion:
              relation === 'subgraphCompletionDependencies'
                ? ['b']
                : ['missing'],
          }),
          dagVertex('b', {
            dependsOnWork: ['a'],
            dependsOnSubgraphCompletion: ['a'],
          }),
        ],
        omittedIds: [],
        entry: { kind: 'root', vertexId: 'a' },
      }),
      { relations: [relation] },
    );
    const events = [
      ...new GraphWalk({ source })
        .createRunner()
        .iterateEvents({ emitEvents: [Phase.EDGE] }),
    ];
    expect(
      events.map((event) => [
        event.edge.from,
        event.edge.to,
        event.edge.data.kind,
      ]),
    ).toEqual([
      [
        'a',
        'b',
        relation === 'workDependencies'
          ? 'workDependency'
          : 'subgraphCompletionDependency',
      ],
      [
        'b',
        'a',
        relation === 'workDependencies'
          ? 'workDependency'
          : 'subgraphCompletionDependency',
      ],
    ]);
  },
);

it('copies mutable definitions and separates generated relationship wrappers across consumers', () => {
  const id = {},
    other = {};
  const data = { label: 'shared' };
  const slots = [{ kind: 'vertex' as const, vertexId: other }];
  const dependsOnWork = [other],
    dependsOnSubgraphCompletion = [other];
  const entry = { kind: 'root' as const, vertexId: id };
  const vertices = [
    { vertexId: id, data, slots, dependsOnWork, dependsOnSubgraphCompletion },
    {
      vertexId: other,
      data,
      slots: [],
      dependsOnWork: [],
      dependsOnSubgraphCompletion: [],
    },
  ];
  const relations = [
    'children',
    'workDependencies',
    'subgraphCompletionDependencies',
  ] as const;
  const source = materializeWalkSourceFromDagDefinition(
    { vertices, omittedIds: [], entry },
    { relations },
  );
  slots[0]!.vertexId = {};
  slots.length = 0;
  dependsOnWork.length = 0;
  dependsOnSubgraphCompletion.length = 0;
  entry.vertexId = {};
  vertices.length = 0;
  const roots = [...source.roots()];
  (roots[0] as any).vertexId = 'changed';
  const resolution = source.resolveVertex!(id);
  (resolution as any).data = null;
  const links = [...source.outgoing({ vertexId: id, data })];
  (links[0]!.target as any).vertexId = 'changed';
  (links[0]!.data as any).slotIndex = 99;
  (links[1]!.data as any).kind = 'changed';
  const factory = new GraphWalk({ source });
  for (let run = 0; run < 2; run++) {
    const events = [
      ...factory.createRunner().iterateEvents({ emitEvents: [Phase.EDGE] }),
    ];
    expect(events.map((event) => [event.edge.to, event.edge.data])).toEqual([
      [other, { kind: 'child', slotIndex: 0 }],
      [other, { kind: 'workDependency' }],
      [other, { kind: 'subgraphCompletionDependency' }],
    ]);
    expect(events[0]!.source.data).toBe(data);
    (events[0]!.edge.data as any).kind = 'mutated';
  }
  expect(() => source.resolveVertex!({})).toThrow(TypeError);
  expect(() => source.outgoing({ vertexId: {}, data })).toThrow(TypeError);
});

it('preserves forest root slots, arbitrary identities and known omitted roots', () => {
  const object = {},
    symbol = Symbol('id');
  const ids: unknown[] = [undefined, null, NaN, -0, object, symbol];
  const source = materializeWalkSourceFromDagDefinition(
    defineDag({
      vertices: ids.map((id) => dagVertex(id)),
      omittedIds: ['skip'],
      entry: {
        kind: 'roots',
        slots: [
          { kind: 'omitted', identity: null },
          { kind: 'omitted', identity: { vertexId: 'skip' } },
          ...ids.map((vertexId) => ({ kind: 'vertex' as const, vertexId })),
          { kind: 'vertex', vertexId: object },
        ],
      },
    }),
    { relations: ['children'] },
  );
  expect([...source.roots()].map((root) => root.vertexId)).toEqual([
    'skip',
    ...ids,
    object,
  ]);
  const runner = new GraphWalk({ source }).createRunner();
  expect(
    [...runner.iterateEvents({ emitEvents: [Phase.VERTEX] })].map(
      (event) => event.vertex.vertexId,
    ),
  ).toEqual(ids);
  expect(runner.summary().counts.uniqueOmittedVertices).toBe(1);
  expect(source.resolveVertex!('skip')).toEqual({ kind: 'omitted' });
  expect([...source.outgoing({ vertexId: 'skip', data: null })]).toEqual([]);
});

it('permits omitted root entries and empty entries without fabricating roots', () => {
  const omitted = materializeWalkSourceFromDagDefinition(
    defineDag({
      vertices: [],
      omittedIds: [undefined],
      entry: { kind: 'root', vertexId: undefined },
    }),
    { relations: ['children'] },
  );
  expect([...omitted.roots()]).toEqual([{ vertexId: undefined }]);
  expect([
    ...new GraphWalk({ source: omitted }).createRunner().iterateEvents(),
  ]).toEqual([]);
  const empty = materializeWalkSourceFromDagDefinition(
    defineDag({
      vertices: [dagVertex('unreachable')],
      omittedIds: ['skip'],
      entry: { kind: 'empty' },
    }),
    { relations: ['children'] },
  );
  expect([...empty.roots()]).toEqual([]);
  expect([
    ...new GraphWalk({ source: empty }).createRunner().iterateEvents(),
  ]).toEqual([]);
});

it.each([
  undefined,
  null,
  {},
  { relations: [] },
  { relations: 'children' },
  { relations: ['unknown'] },
  { relations: [1] },
  { relations: ['children', 'children'] },
])(
  'requires explicit nonempty unique supported DAG relations %#',
  (options) => {
    const definition = defineDag({
      vertices: [],
      omittedIds: [],
      entry: { kind: 'empty' },
    });
    expect(() =>
      materializeWalkSourceFromDagDefinition(definition, options as any),
    ).toThrow(TypeError);
  },
);

it.each([
  { vertices: [dagVertex('a'), dagVertex('a')], omittedIds: [] },
  { vertices: [dagVertex('a')], omittedIds: ['a'] },
  { vertices: [], omittedIds: [NaN, NaN] },
])(
  'rejects inconsistent declared identities even with no selected edges %#',
  (records) => {
    expect(() =>
      materializeWalkSourceFromDagDefinition<unknown, unknown>(
        { ...records, entry: { kind: 'empty' } },
        { relations: ['children'] },
      ),
    ).toThrow(TypeError);
  },
);

it.each([
  { slots: [{ kind: 'vertex', vertexId: 'unknown' }] },
  { slots: [{ kind: 'vertex', vertexId: 'skip' }] },
  { slots: [{ kind: 'omitted', identity: { vertexId: 'a' } }] },
  { slots: [{ kind: 'omitted', identity: { vertexId: 'unknown' } }] },
] as const)(
  'validates selected child membership and live/omitted consistency %#',
  (overrides) => {
    const definition = defineDag({
      vertices: [dagVertex('a', overrides)],
      omittedIds: ['skip'],
      entry: { kind: 'root', vertexId: 'a' },
    });
    expect(() =>
      materializeWalkSourceFromDagDefinition(definition, {
        relations: ['children'],
      }),
    ).toThrow(TypeError);
    expect([
      ...new GraphWalk({
        source: materializeWalkSourceFromDagDefinition(definition, {
          relations: ['workDependencies'],
        }),
      })
        .createRunner()
        .iterateEvents({ emitEvents: [Phase.VERTEX] }),
    ]).toHaveLength(1);
  },
);

it.each(['workDependencies', 'subgraphCompletionDependencies'] as const)(
  'validates missing selected %s endpoints in unreachable records',
  (relation) => {
    const definition = defineDag({
      vertices: [
        dagVertex('a', {
          dependsOnWork: ['missing'],
          dependsOnSubgraphCompletion: ['missing'],
        }),
      ],
      omittedIds: [],
      entry: { kind: 'empty' },
    });
    expect(() =>
      materializeWalkSourceFromDagDefinition(definition, {
        relations: [relation],
      }),
    ).toThrow(TypeError);
  },
);

it.each([
  { kind: 'root', vertexId: 'unknown' },
  { kind: 'roots', slots: [{ kind: 'vertex', vertexId: 'unknown' }] },
  { kind: 'roots', slots: [{ kind: 'vertex', vertexId: 'skip' }] },
  { kind: 'roots', slots: [{ kind: 'omitted', identity: { vertexId: 'a' } }] },
  {
    kind: 'roots',
    slots: [{ kind: 'omitted', identity: { vertexId: 'unknown' } }],
  },
] as const)(
  'always validates root membership and forest slot consistency %#',
  (entry) => {
    const definition = defineDag({
      vertices: [dagVertex('a')],
      omittedIds: ['skip'],
      entry,
    });
    expect(() =>
      materializeWalkSourceFromDagDefinition(definition, {
        relations: ['workDependencies'],
      }),
    ).toThrow(TypeError);
  },
);

it('keeps DAG task callbacks opaque through sync and async walking', async () => {
  let calls = 0;
  const task = () => {
    calls++;
    throw new Error('Host task must not execute');
  };
  const definition = defineDag({
    vertices: [
      {
        vertexId: 'task',
        data: task,
        slots: [],
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
      },
    ],
    omittedIds: [],
    entry: { kind: 'root', vertexId: 'task' },
  });
  const source = materializeWalkSourceFromDagDefinition(definition, {
    relations: ['children'],
  });
  const syncEvents = [
    ...new GraphWalk({ source })
      .createRunner()
      .iterateEvents({ emitEvents: [Phase.VERTEX] }),
  ];
  expect(syncEvents[0]!.vertex.data).toBe(task);
  const asyncEvents = [];
  for await (const event of new AsyncGraphWalk({ source })
    .createRunner()
    .iterateEvents({ emitEvents: [Phase.VERTEX] }))
    asyncEvents.push(event);
  expect(asyncEvents[0]!.vertex.data).toBe(task);
  expect(calls).toBe(0);
});

it('copies async links as they are yielded, before the iterator reuses its wrapper', async () => {
  const link = { to: 'b', data: { kind: 'first' } };
  const first = link.data;
  const source = await materializeWalkSourceFromRecordsAsync(['a', 'b', 'c'], {
    id: (id) => id,
    outgoing: (id) =>
      (async function* () {
        if (id !== 'a') return;
        yield link;
        link.to = 'c';
        link.data = { kind: 'second' };
        yield link;
      })(),
    roots: ['a'],
  });
  const events = [
    ...new GraphWalk({ source })
      .createRunner()
      .iterateEvents({ emitEvents: [Phase.EDGE] }),
  ];
  expect(events.map((event) => event.edge.to)).toEqual(['b', 'c']);
  expect(events[0]!.edge.data).toBe(first);
  expect(events[1]!.edge.data).toBe(link.data);
});
