import { defineDag, prepareDagDefinition, type DagDefinition } from '../src';

function vertex(
  vertexId: string,
  overrides: Partial<DagDefinition<string, string>['vertices'][number]> = {},
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

// Accepting a disconnected record would silently drop authored work at replay.
test('materialized definitions reject records outside entry and prerequisite closure', () => {
  expect(
    prepareDagDefinition(
      defineDag({
        vertices: [vertex('root'), vertex('orphan')],
        omittedIds: [],
        entry: { kind: 'root', vertexId: 'root' },
      }),
    ),
  ).toEqual({
    kind: 'invalid',
    issues: [{ kind: 'unreachable', vertexIds: ['orphan'] }],
  });
});

// Structural cycles must be rejected before source replay can throw or loop.
test('materialized definitions report structural SCC membership', () => {
  expect(
    prepareDagDefinition(
      defineDag({
        vertices: [
          vertex('a', { slots: [{ kind: 'vertex', vertexId: 'b' }] }),
          vertex('b', { slots: [{ kind: 'vertex', vertexId: 'a' }] }),
        ],
        omittedIds: [],
        entry: { kind: 'root', vertexId: 'a' },
      }),
    ),
  ).toEqual({
    kind: 'invalid',
    issues: [{ kind: 'structuralCycle', vertexIds: ['a', 'b'] }],
  });
});

test('materialized definitions accept detached W and C prerequisite closures', () => {
  const result = prepareDagDefinition({
    vertices: [
      vertex('remoteC', { slots: [{ kind: 'vertex', vertexId: 'child' }] }),
      vertex('root', {
        dependsOnWork: ['remoteW'],
        dependsOnSubgraphCompletion: ['remoteC'],
      }),
      vertex('remoteW', { dependsOnWork: ['skip'] }),
      vertex('child'),
    ],
    omittedIds: ['skip'],
    entry: { kind: 'root', vertexId: 'root' },
  });
  if (result.kind !== 'valid') throw new Error(JSON.stringify(result));
  expect(result.dag.definition.vertices.map((v) => v.vertexId)).toEqual([
    'remoteC',
    'root',
    'remoteW',
    'child',
  ]);
  const runner = result.dag.createRunner();
  const graph = runner.getResolvedGraph();
  expect(graph.getParentsOf(graph.getVertexRefById('remoteC')!)).toEqual([]);
  expect(
    [...runner.iterateEvents()]
      .filter((event) => event.kind === 'workCompleted')
      .map((event) => event.vertexId),
  ).toEqual(['remoteW', 'remoteC', 'child', 'root']);
});

test.each(['dependsOnWork', 'dependsOnSubgraphCompletion'] as const)(
  'unknown %s endpoints use milestone diagnostics',
  (field) => {
    const result = prepareDagDefinition({
      vertices: [vertex('root', { [field]: ['missing'] })],
      omittedIds: [],
      entry: { kind: 'root', vertexId: 'root' },
    });
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') throw new Error('Expected invalid');
    expect(result).not.toHaveProperty('dag');
    expect(result.issues).toMatchObject([
      {
        kind: 'milestone',
        diagnostics: { unknownPrerequisiteIds: ['missing'] },
      },
    ]);
  },
);

test('combined W/C cycles use existing labelled milestone diagnostics', () => {
  const result = prepareDagDefinition({
    vertices: [
      vertex('root', {
        slots: [{ kind: 'vertex', vertexId: 'child' }],
        dependsOnSubgraphCompletion: ['child'],
      }),
      vertex('child', { dependsOnWork: ['root'] }),
    ],
    omittedIds: [],
    entry: { kind: 'root', vertexId: 'root' },
  });
  if (result.kind !== 'invalid') throw new Error('Expected invalid');
  expect(result).not.toHaveProperty('dag');
  expect(result.issues).toMatchObject([
    {
      kind: 'milestone',
      diagnostics: { dependencyCycleComponents: [['root', 'child']] },
    },
  ]);
});

test('structural validation distinguishes missing links, invalid omissions and unreachable declarations', () => {
  const result = prepareDagDefinition({
    vertices: [
      vertex('root', {
        slots: [
          { kind: 'vertex', vertexId: 'skip' },
          { kind: 'vertex', vertexId: 'missing' },
          { kind: 'omitted', identity: { vertexId: 'root' } },
          { kind: 'omitted', identity: { vertexId: 'unknown' } },
        ],
      }),
    ],
    omittedIds: ['skip', 'unused'],
    entry: { kind: 'root', vertexId: 'root' },
  });
  expect(result).toEqual({
    kind: 'invalid',
    issues: [
      {
        kind: 'missingStructuralEndpoint',
        parent: { vertexId: 'root' },
        vertexId: 'skip',
      },
      {
        kind: 'missingStructuralEndpoint',
        parent: { vertexId: 'root' },
        vertexId: 'missing',
      },
      { kind: 'invalidOmission', vertexIds: ['root', 'unknown'] },
      { kind: 'unreachable', vertexIds: ['unused'] },
    ],
  });
});

test.each([
  { kind: 'root', vertexId: 'missing' },
  { kind: 'root', vertexId: 'skip' },
  { kind: 'empty' },
  { kind: 'forest', slots: [{ kind: 'omitted', identity: null }] },
] as const)('invalid entry has no executable DAG %#', (entry) => {
  const result = prepareDagDefinition({
    vertices: [vertex('root')],
    omittedIds: ['skip'],
    entry,
  });
  if (result.kind !== 'invalid') throw new Error('Expected invalid');
  expect(result).not.toHaveProperty('dag');
  expect(result.issues[0]).toEqual({
    kind: 'invalidEntry',
    reason:
      entry.kind === 'root'
        ? 'unknownRoot'
        : entry.kind === 'empty'
        ? 'emptyWithVertices'
        : 'anonymousCatalogEntry',
    vertexIds:
      entry.kind === 'root'
        ? [entry.vertexId]
        : entry.kind === 'empty'
        ? ['root']
        : [],
  });
});

test('forest missing structural endpoints carry a null parent', () => {
  expect(
    prepareDagDefinition({
      vertices: [],
      omittedIds: [],
      entry: { kind: 'forest', slots: [{ kind: 'vertex', vertexId: null }] },
    }),
  ).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'missingStructuralEndpoint', parent: null, vertexId: null },
    ],
  });
});

test('structural self cycles use SameValueZero identity and deterministic declaration order', () => {
  const result = prepareDagDefinition({
    vertices: [
      {
        vertexId: NaN,
        data: 1,
        slots: [{ kind: 'vertex', vertexId: NaN }],
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
      },
    ],
    omittedIds: [],
    entry: { kind: 'root', vertexId: NaN },
  });
  expect(result).toEqual({
    kind: 'invalid',
    issues: [{ kind: 'structuralCycle', vertexIds: [NaN] }],
  });
});

test.each([{ omittedIds: [] }, { omittedIds: [undefined, null, NaN] }])(
  'empty entries preserve authored mode and known omitted identity seeds %#',
  ({ omittedIds }) => {
    const result = prepareDagDefinition({
      vertices: [],
      omittedIds,
      entry: { kind: 'empty' },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    expect(result.dag.definition).toEqual({
      vertices: [],
      omittedIds,
      entry: { kind: 'empty' },
    });
    expect([
      ...result.dag
        .createRunner({ completedWork: new Set(omittedIds) })
        .iterateEvents(),
    ]).toEqual([]);
  },
);

test('preparation normalizes shape before semantics and preserves exact accessor errors', () => {
  expect(() => prepareDagDefinition(null as any)).toThrow(TypeError);
  const error = { exact: true };
  try {
    prepareDagDefinition(
      Object.defineProperty({}, 'vertices', {
        get() {
          throw error;
        },
      }) as any,
    );
    throw new Error('Expected accessor failure');
  } catch (caught) {
    expect(caught).toBe(error);
  }
});

// Reordering authored records or replaying via a real root changes these facts.
test('forest definitions preserve authored order, structural sharing and omitted catalog entries', async () => {
  const id = { label: 'shared' };
  const data = { value: 1 };
  const input: DagDefinition<typeof data, unknown> = {
    vertices: [
      {
        vertexId: id,
        data,
        slots: [],
        dependsOnWork: [undefined],
        dependsOnSubgraphCompletion: [undefined],
      },
      {
        vertexId: null,
        data,
        slots: [
          { kind: 'vertex', vertexId: id },
          { kind: 'vertex', vertexId: id },
        ],
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
      },
    ],
    omittedIds: [undefined],
    entry: {
      kind: 'forest',
      slots: [
        { kind: 'omitted', identity: { vertexId: undefined } },
        { kind: 'vertex', vertexId: null },
      ],
    },
  };
  const result = prepareDagDefinition(input);
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.dag.definition).toEqual(input);
  expect(result.dag.definition).not.toBe(input);
  expect(result.dag.definition.vertices[0]!.vertexId).toBe(id);
  expect(result.dag.vertices[0]!.data).toBe(data);
  expect(result.dag.vertices[1]!.children).toEqual([id, id]);
  const runner = await result.dag.createAsyncRunner({
    completedWork: new Set([undefined]),
  });
  const events: unknown[] = [];
  for await (const event of runner.iterateEvents())
    events.push([event.vertexId, event.kind]);
  expect(events).toEqual([
    [null, 'workCompleted'],
    [id, 'workCompleted'],
    [id, 'subgraphCompleted'],
    [null, 'subgraphCompleted'],
  ]);
  expect(runner.summary().unusedCompletedWorkIds).toEqual([]);
});

test('forest omissions cannot masquerade as live or unknown identities', () => {
  expect(
    prepareDagDefinition({
      vertices: [],
      omittedIds: ['unused'],
      entry: {
        kind: 'forest',
        slots: [
          { kind: 'omitted', identity: { vertexId: 'unknown' } },
          { kind: 'omitted', identity: { vertexId: 'unknown' } },
        ],
      },
    }),
  ).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'invalidOmission', vertexIds: ['unknown'] },
      { kind: 'unreachable', vertexIds: ['unused'] },
    ],
  });
});

test('structural SCCs retain declaration order and stay separate before milestone validation', () => {
  expect(
    prepareDagDefinition({
      vertices: [
        vertex('a', {
          slots: [{ kind: 'vertex', vertexId: 'b' }],
          dependsOnWork: ['missing'],
        }),
        vertex('b', { slots: [{ kind: 'vertex', vertexId: 'a' }] }),
        vertex('c', { slots: [{ kind: 'vertex', vertexId: 'c' }] }),
      ],
      omittedIds: [],
      entry: {
        kind: 'forest',
        slots: [
          { kind: 'vertex', vertexId: 'a' },
          { kind: 'vertex', vertexId: 'c' },
        ],
      },
    }),
  ).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'structuralCycle', vertexIds: ['a', 'b'] },
      { kind: 'structuralCycle', vertexIds: ['c'] },
    ],
  });
});

test('undefined is a live root identity rather than an absent record', () => {
  const result = prepareDagDefinition({
    vertices: [
      {
        vertexId: undefined,
        data: 'live',
        slots: [],
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
      },
    ],
    omittedIds: [],
    entry: { kind: 'root', vertexId: undefined },
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(
    [...result.dag.createRunner().iterateEvents()].map((event) => [
      event.vertexId,
      event.kind,
    ]),
  ).toEqual([
    [undefined, 'workCompleted'],
    [undefined, 'subgraphCompleted'],
  ]);
});

test('membership and SCC validation handle deep unreachable structures without recursion', () => {
  const vertices = Array.from({ length: 12000 }, (_, vertexId) => ({
    vertexId,
    data: vertexId,
    slots:
      vertexId === 11999
        ? []
        : [{ kind: 'vertex' as const, vertexId: vertexId + 1 }],
    dependsOnWork: [],
    dependsOnSubgraphCompletion: [],
  }));
  const result = prepareDagDefinition({
    vertices,
    omittedIds: [],
    entry: { kind: 'forest', slots: [] },
  });
  expect(result).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'unreachable', vertexIds: vertices.map((v) => v.vertexId) },
    ],
  });
});
