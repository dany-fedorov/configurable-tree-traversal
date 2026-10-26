import {
  defineDagFragment,
  instantiateDagFragment,
  composeDag,
  DagFragmentValidationError,
  type DagDefinitionIssue,
} from '../src';
import * as dag from '../src/traversals/dag-traversal';

const vertex = <ID>(
  vertexId: ID,
  dependsOnWork: ID[] = [],
  dependsOnSubgraphCompletion: ID[] = [],
) => ({
  vertexId,
  data: { task: vertexId },
  slots: [],
  dependsOnWork,
  dependsOnSubgraphCompletion,
});

test('two object-ID instances compose a completion wire without sharing local identities', () => {
  const start = {};
  const finish = {};
  const fragment = defineDagFragment(
    {
      vertices: [vertex(start), vertex(finish, [start])],
      omittedIds: [],
      entry: {
        kind: 'forest',
        slots: [
          { kind: 'vertex', vertexId: start },
          { kind: 'vertex', vertexId: finish },
        ],
      },
    },
    { start, finish },
  );
  const firstIds = new Map([
    [start, { name: 'first-start' }],
    [finish, { name: 'first-finish' }],
  ]);
  const secondIds = new Map([
    [start, { name: 'second-start' }],
    [finish, { name: 'second-finish' }],
  ]);
  const first = instantiateDagFragment(fragment, {
    mapId: (id) => firstIds.get(id)!,
  });
  const second = instantiateDagFragment(fragment, {
    mapId: (id) => secondIds.get(id)!,
  });
  const result = composeDag([first, second], {
    dependencies: [
      {
        dependent: second.ports.start,
        prerequisite: { vertexId: first.ports.finish, milestone: 'subgraphCompletion' },
      },
    ],
  });
  if (result.kind !== 'valid') throw new Error('Expected valid composition');
  expect(result.dag.definition.vertices[2]!.dependsOnSubgraphCompletion).toEqual([
    firstIds.get(finish),
  ]);
  expect(
    [...result.dag.createRunner().iterateEvents()].map((e) => [
      e.vertexId.name,
      e.kind,
    ]),
  ).toEqual([
    ['first-start', 'workCompleted'],
    ['first-finish', 'workCompleted'],
    ['first-start', 'subgraphCompleted'],
    ['first-finish', 'subgraphCompleted'],
    ['second-start', 'workCompleted'],
    ['second-finish', 'workCompleted'],
    ['second-start', 'subgraphCompleted'],
    ['second-finish', 'subgraphCompleted'],
  ]);
});

const single = (id = 'a') =>
  defineDagFragment(
    {
      vertices: [vertex(id)],
      omittedIds: [],
      entry: { kind: 'root', vertexId: id },
    },
    { start: id },
  );

test('maps each live and omitted identity once across entry, slots, dependencies and ports', () => {
  const local = defineDagFragment(
    {
      vertices: [
        {
          ...vertex<unknown>(undefined, [NaN], [null]),
          slots: [
            { kind: 'omitted', identity: null },
            { kind: 'omitted', identity: { vertexId: NaN } },
            { kind: 'vertex', vertexId: null },
          ],
        },
        vertex<unknown>(null),
      ],
      omittedIds: [NaN],
      entry: { kind: 'root', vertexId: undefined },
    },
    { ['__proto__']: undefined, finish: null },
  );
  const seen: unknown[] = [];
  const mapped = [{ n: 0 }, { n: 1 }, { n: 2 }];
  const instance = instantiateDagFragment(local, {
    mapId: (id) => {
      seen.push(id);
      return mapped[seen.length - 1]!;
    },
  });
  expect(seen).toEqual([undefined, null, NaN]);
  expect(instance.ports.__proto__).toBe(mapped[0]);
  expect(instance.ports.finish).toBe(mapped[1]);
  expect(instance.definition).toEqual({
    entry: { kind: 'root', vertexId: mapped[0] },
    omittedIds: [mapped[2]],
    vertices: [
      {
        ...vertex(mapped[0]!, [mapped[2]!], [mapped[1]!]),
        data: local.definition.vertices[0]!.data,
        slots: [
          { kind: 'omitted', identity: null },
          { kind: 'omitted', identity: { vertexId: mapped[2] } },
          { kind: 'vertex', vertexId: mapped[1] },
        ],
      },
      { ...vertex(mapped[1]!), data: local.definition.vertices[1]!.data },
    ],
  });
});

test('preserves forest order, detached prerequisites and empty-entry known omissions', () => {
  const a = defineDagFragment(
    {
      vertices: [vertex('a', ['remote']), vertex('remote')],
      omittedIds: ['skip'],
      entry: {
        kind: 'forest',
        slots: [
          { kind: 'omitted', identity: { vertexId: 'skip' } },
          { kind: 'vertex', vertexId: 'a' },
        ],
      },
    },
    { start: 'a' },
  );
  const omitted = defineDagFragment(
    { vertices: [], omittedIds: ['empty-skip'], entry: { kind: 'empty' } },
    {},
  );
  const empty = defineDagFragment(
    { vertices: [], omittedIds: [], entry: { kind: 'empty' } },
    {},
  );
  const result = composeDag([a, omitted, empty, single('b')]);
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.dag.definition.entry).toEqual({
    kind: 'forest',
    slots: [
      { kind: 'omitted', identity: { vertexId: 'skip' } },
      { kind: 'vertex', vertexId: 'a' },
      { kind: 'omitted', identity: { vertexId: 'empty-skip' } },
      { kind: 'vertex', vertexId: 'b' },
    ],
  });
  expect(result.dag.definition.vertices.map((v) => v.vertexId)).toEqual([
    'a',
    'remote',
    'b',
  ]);
  expect(result.dag.definition.vertices[0]!.slots).toEqual([]);
  const runner = result.dag.createRunner({
    completedWork: new Set(['empty-skip']),
  });
  runner.run();
  expect(runner.summary().unusedCompletedWorkIds).toEqual([]);
  expect(
    [...result.dag.createRunner().iterateEvents()]
      .filter((e) => e.kind === 'workCompleted')
      .map((e) => e.vertexId),
  ).toEqual(['b', 'remote', 'a']);
});

test('structural links append independently of explicit work and completion wires', () => {
  const instances = [single('a'), single('b'), single('c')];
  const result = composeDag(instances, {
    children: [
      { parent: 'a', child: 'c' },
      { parent: 'a', child: 'b' },
    ],
    dependencies: [
      { dependent: 'b', prerequisite: { vertexId: 'a', milestone: 'work' } },
      { dependent: 'b', prerequisite: { vertexId: 'a', milestone: 'work' } },
      {
        dependent: 'c',
        prerequisite: { vertexId: 'b', milestone: 'subgraphCompletion' },
      },
    ],
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(
    result.dag.definition.vertices.map((v) => ({
      id: v.vertexId,
      slots: v.slots,
      w: v.dependsOnWork,
      c: v.dependsOnSubgraphCompletion,
    })),
  ).toEqual([
    {
      id: 'a',
      slots: [
        { kind: 'vertex', vertexId: 'c' },
        { kind: 'vertex', vertexId: 'b' },
      ],
      w: [],
      c: [],
    },
    { id: 'b', slots: [], w: ['a'], c: [] },
    { id: 'c', slots: [], w: [], c: ['b'] },
  ]);
  expect(instances[0]!.definition.vertices[0]!.slots).toEqual([]);
  const structuralOnly = composeDag(instances, {
    children: [{ parent: 'a', child: 'b' }],
  });
  if (structuralOnly.kind !== 'valid') throw new Error('Expected valid');
  expect(structuralOnly.dag.definition.vertices[1]!.dependsOnWork).toEqual([]);
});

test('composition validates structural and combined W/C cycles through the shared validator', () => {
  expect(
    composeDag([single('a'), single('b')], {
      children: [
        { parent: 'a', child: 'b' },
        { parent: 'b', child: 'a' },
      ],
    }),
  ).toMatchObject({
    kind: 'invalid',
    issues: [{ kind: 'structuralCycle', vertexIds: ['a', 'b'] }],
  });
  expect(
    composeDag([single('a'), single('b')], {
      children: [{ parent: 'a', child: 'b' }],
      dependencies: [
        {
          dependent: 'b',
          prerequisite: { vertexId: 'a', milestone: 'subgraphCompletion' },
        },
      ],
    }),
  ).toMatchObject({ kind: 'invalid', issues: [{ kind: 'milestone' }] });
  expect(composeDag([])).toMatchObject({
    kind: 'valid',
    dag: { definition: { entry: { kind: 'forest', slots: [] } } },
  });
});

test.each([
  {
    vertices: [vertex('a', ['outside'])],
    omittedIds: [],
    entry: { kind: 'root' as const, vertexId: 'a' },
  },
  {
    vertices: [vertex('a'), vertex('unreachable')],
    omittedIds: [],
    entry: { kind: 'root' as const, vertexId: 'a' },
  },
])('rejects non-closed fragment definitions before mapping', (definition) => {
  expect(() => defineDagFragment(definition, { start: 'a' })).toThrow(
    TypeError,
  );
});

test('rejects unknown/omitted ports, malformed port maps and symbol port names', () => {
  const definition = {
    vertices: [vertex('a')],
    omittedIds: ['skip'],
    entry: {
      kind: 'forest' as const,
      slots: [
        { kind: 'vertex' as const, vertexId: 'a' },
        { kind: 'omitted' as const, identity: { vertexId: 'skip' } },
      ],
    },
  };
  for (const ports of [
    { start: 'unknown' },
    { start: 'skip' },
    null,
    [],
    'a',
    { [Symbol()]: 'a' },
  ]) {
    expect(() => defineDagFragment(definition, ports as any)).toThrow(
      TypeError,
    );
  }
});

test('maps SameValueZero identities and rejects mapped live/omitted collisions', () => {
  const fragment = defineDagFragment(
    {
      vertices: [vertex<unknown>('a')],
      omittedIds: [undefined],
      entry: {
        kind: 'forest',
        slots: [
          { kind: 'vertex', vertexId: 'a' },
          { kind: 'omitted', identity: { vertexId: undefined } },
        ],
      },
    },
    { a: 'a' },
  );
  expect(() => instantiateDagFragment(fragment, { mapId: () => NaN })).toThrow(
    TypeError,
  );
  const result = instantiateDagFragment(single(), { mapId: () => undefined });
  expect(result.ports.start).toBeUndefined();
  expect(composeDag([result]).kind).toBe('valid');
});

test('rejects cross-instance live/omitted collisions and invalid wire endpoints or milestone kinds', () => {
  expect(() => composeDag([single(), single()])).toThrow(TypeError);
  const omitted = defineDagFragment(
    { vertices: [], omittedIds: ['a'], entry: { kind: 'empty' } },
    {},
  );
  expect(() => composeDag([single(), omitted])).toThrow(TypeError);
  const instances = [single()];
  for (const options of [
    { children: [{ parent: 'unknown', child: 'a' }] },
    { children: [{ parent: 'a', child: 'unknown' }] },
    {
      dependencies: [
        {
          dependent: 'unknown',
          prerequisite: { vertexId: 'a', milestone: 'work' },
        },
      ],
    },
    {
      dependencies: [
        {
          dependent: 'a',
          prerequisite: { vertexId: 'unknown', milestone: 'work' },
        },
      ],
    },
    {
      dependencies: [
        { dependent: 'a', prerequisite: { vertexId: 'a', milestone: 'ready' } },
      ],
    },
  ])
    expect(() => composeDag(instances, options as any)).toThrow(TypeError);
  expect(() =>
    composeDag([single(), omitted], {
      children: [{ parent: 'a', child: 'a' }],
    }),
  ).toThrow(TypeError);
});

test('retains caller error identity for mapping and port getters', () => {
  const failure = { reason: 'mapping' };
  expect.assertions(2);
  try {
    instantiateDagFragment(single(), {
      mapId: () => {
        throw failure;
      },
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  const ports = Object.defineProperty({}, 'start', {
    get: () => {
      throw failure;
    },
  });
  try {
    defineDagFragment(single().definition, ports);
  } catch (error) {
    expect(error).toBe(failure);
  }
});

test('copies and freezes owned fragment topology and port wrappers without freezing opaque IDs/data', () => {
  const id = { name: 'local' };
  const data = { task: 'opaque' };
  const definition = {
    vertices: [{ ...vertex(id), data }],
    omittedIds: [],
    entry: { kind: 'root' as const, vertexId: id },
  };
  const ports = Object.defineProperty({}, 'entry', { value: id }) as {
    entry: typeof id;
  };
  const fragment = defineDagFragment(definition, ports);
  definition.vertices.length = 0;
  expect(fragment.ports.entry).toBe(id);
  expect(fragment.definition.vertices[0]!.data).toBe(data);
  expect(Object.isFrozen(fragment)).toBe(true);
  expect(Object.isFrozen(fragment.ports)).toBe(true);
  expect(Object.isFrozen(fragment.definition.vertices[0]!.slots)).toBe(true);
  const mappedId = { name: 'mapped' };
  const instance = instantiateDagFragment(fragment, { mapId: () => mappedId });
  expect(Object.isFrozen(instance)).toBe(true);
  expect(Object.isFrozen(instance.ports)).toBe(true);
  expect(Object.isFrozen(instance.definition)).toBe(true);
  expect(Object.isFrozen(id)).toBe(false);
  expect(Object.isFrozen(mappedId)).toBe(false);
  expect(Object.isFrozen(data)).toBe(false);
});

test('remaps forest entry references and empty omission catalogs before composition', async () => {
  const forest = defineDagFragment(
    {
      vertices: [vertex('a')],
      omittedIds: ['skip'],
      entry: {
        kind: 'forest',
        slots: [
          { kind: 'omitted', identity: { vertexId: 'skip' } },
          { kind: 'vertex', vertexId: 'a' },
        ],
      },
    },
    { a: 'a' },
  );
  const mapped = instantiateDagFragment(forest, {
    mapId: (id) => (id === 'a' ? 1 : 2),
  });
  expect(mapped.definition.entry).toEqual({
    kind: 'forest',
    slots: [
      { kind: 'omitted', identity: { vertexId: 2 } },
      { kind: 'vertex', vertexId: 1 },
    ],
  });
  const empty = instantiateDagFragment(
    defineDagFragment(
      { vertices: [], omittedIds: ['root-skip'], entry: { kind: 'empty' } },
      {},
    ),
    { mapId: () => undefined },
  );
  expect(empty.definition).toEqual({
    vertices: [],
    omittedIds: [undefined],
    entry: { kind: 'empty' },
  });
  const result = composeDag<unknown, number | undefined>([mapped, empty], {
    dependencies: [
      {
        dependent: 1,
        prerequisite: { vertexId: undefined, milestone: 'work' },
      },
      {
        dependent: 1,
        prerequisite: { vertexId: undefined, milestone: 'subgraphCompletion' },
      },
    ],
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const events: unknown[] = [];
  for await (const event of (
    await result.dag.createAsyncRunner()
  ).iterateEvents())
    events.push([event.vertexId, event.kind]);
  expect(events).toEqual([
    [1, 'workCompleted'],
    [1, 'subgraphCompleted'],
  ]);
});

test.each([
  { children: [{ parent: 'skip', child: 'a' }] },
  { children: [{ parent: 'a', child: 'skip' }] },
  {
    dependencies: [
      {
        dependent: 'skip',
        prerequisite: { vertexId: 'a', milestone: 'work' as const },
      },
    ],
  },
])(
  'omitted identities cannot be structural endpoints or wire dependents: %o',
  (options) => {
    const omitted = defineDagFragment(
      { vertices: [], omittedIds: ['skip'], entry: { kind: 'empty' } },
      {},
    );
    expect(() => composeDag([single(), omitted], options)).toThrow(TypeError);
  },
);

test('composition retains omitted discovery positions before dependent siblings', async () => {
  const fragment = defineDagFragment(
    {
      vertices: [
        {
          ...vertex('root'),
          slots: [
            { kind: 'omitted', identity: null },
            { kind: 'omitted', identity: { vertexId: 'skip' } },
            { kind: 'vertex', vertexId: 'b' },
            { kind: 'vertex', vertexId: 'c' },
          ],
        },
        vertex('b', ['skip']),
        vertex('c'),
      ],
      omittedIds: ['skip'],
      entry: { kind: 'root', vertexId: 'root' },
    },
    { root: 'root' },
  );
  const instance = instantiateDagFragment(fragment, { mapId: (id) => id });
  const result = composeDag([instance]);
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.dag.definition.vertices[0]!.slots).toEqual([
    { kind: 'omitted', identity: null },
    { kind: 'omitted', identity: { vertexId: 'skip' } },
    { kind: 'vertex', vertexId: 'b' },
    { kind: 'vertex', vertexId: 'c' },
  ]);
  for (const runner of [
    result.dag.createRunner(),
    await result.dag.createAsyncRunner(),
  ]) {
    const events: unknown[] = [];
    for await (const event of runner.iterateEvents())
      events.push([event.vertexId, event.kind]);
    expect(events).toEqual([
      ['root', 'workCompleted'],
      ['b', 'workCompleted'],
      ['c', 'workCompleted'],
      ['b', 'subgraphCompleted'],
      ['c', 'subgraphCompleted'],
      ['root', 'subgraphCompleted'],
    ]);
  }
});

test('missing wire fields are malformed even when undefined is a live identity', () => {
  const instance = instantiateDagFragment(single(), { mapId: () => undefined });
  for (const options of [
    { children: [{}] },
    { children: [null] },
    { children: ['invalid'] },
    { children: [[]] },
    { children: [Object.create({ parent: undefined, child: undefined })] },
    { children: [{ parent: undefined }] },
    { children: [{ child: undefined }] },
    {
      dependencies: [
        { prerequisite: { vertexId: undefined, milestone: 'work' } },
      ],
    },
    {
      dependencies: [
        { dependent: undefined, prerequisite: { milestone: 'work' } },
      ],
    },
    {
      dependencies: [
        { dependent: undefined, prerequisite: { vertexId: undefined } },
      ],
    },
  ])
    expect(() => composeDag([instance], options as any)).toThrow(TypeError);
  const valid = composeDag([instance], {
    dependencies: [
      {
        dependent: undefined,
        prerequisite: { vertexId: undefined, milestone: 'work' },
      },
    ],
  });
  expect(valid).toMatchObject({
    kind: 'invalid',
    issues: [{ kind: 'milestone' }],
  });
});

test('wire endpoint getters run once and retain exact thrown values', () => {
  const failure = { kind: 'wire getter' };
  expect.assertions(3);
  const instances = [single('a'), single('b')];
  try {
    composeDag(instances, {
      children: [
        Object.defineProperty({ parent: 'a' }, 'child', {
          get: () => {
            throw failure;
          },
        }) as { parent: string; child: string },
      ],
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  try {
    composeDag(instances, {
      dependencies: [
        {
          dependent: 'b',
          prerequisite: Object.defineProperty(
            { milestone: 'work' as const },
            'vertexId',
            {
              get: () => {
                throw failure;
              },
            },
          ) as { vertexId: string; milestone: 'work' },
        },
      ],
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  let reads = 0;
  const child = Object.defineProperty({ parent: 'a' }, 'child', {
    get: () => {
      reads++;
      return reads === 1 ? 'b' : 'unknown';
    },
  }) as { parent: string; child: string };
  const result = composeDag(instances, { children: [child] });
  expect(result).toMatchObject({
    kind: 'valid',
    dag: {
      definition: {
        vertices: [
          { vertexId: 'a', slots: [{ kind: 'vertex', vertexId: 'b' }] },
          { vertexId: 'b' },
        ],
      },
    },
  });
});

test('fragment validation exposes structural issues with shallow object and undefined identities', () => {
  const id = { task: 'root' };
  const definition = {
    vertices: [
      {
        ...vertex<unknown>(id),
        slots: [{ kind: 'vertex' as const, vertexId: undefined }],
      },
    ],
    omittedIds: [],
    entry: { kind: 'root' as const, vertexId: id },
  };
  expect.assertions(8);
  try {
    defineDagFragment(definition, { root: id });
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    expect(error).toBeInstanceOf(DagFragmentValidationError);
    expect(error).toBeInstanceOf(dag.DagFragmentValidationError);
    if (!(error instanceof DagFragmentValidationError)) throw error;
    expect(error.name).toBe('DagFragmentValidationError');
    expect(error.issues).toEqual([
      {
        kind: 'missingStructuralEndpoint',
        parent: { vertexId: id },
        vertexId: undefined,
      },
    ]);
    const issue = error.issues[0]!;
    if (issue.kind !== 'missingStructuralEndpoint')
      throw new Error('Expected structural issue');
    expect(issue.parent!.vertexId).toBe(id);
    expect(Object.prototype.hasOwnProperty.call(issue, 'vertexId')).toBe(true);
    expect(issue.vertexId).toBeUndefined();
  }
});

test('forged fragments expose milestone validation before any mapping', () => {
  const id = { task: 'root' };
  let mappings = 0;
  const fragment = {
    definition: {
      vertices: [vertex<unknown>(id, [undefined])],
      omittedIds: [],
      entry: { kind: 'root' as const, vertexId: id },
    },
    ports: { root: id },
  };
  expect.assertions(6);
  try {
    instantiateDagFragment(fragment, {
      mapId: () => {
        mappings++;
        return 'mapped';
      },
    });
  } catch (error) {
    expect(error).toBeInstanceOf(DagFragmentValidationError);
    if (!(error instanceof DagFragmentValidationError)) throw error;
    expect(error.issues).toMatchObject([
      {
        kind: 'milestone',
        diagnostics: { unknownPrerequisiteIds: [undefined] },
      },
    ]);
    const issue = error.issues[0]!;
    if (issue.kind !== 'milestone') throw new Error('Expected milestone issue');
    const edge = issue.diagnostics.dependencyEdges.find(
      (edge) => edge.reason === 'workDependency',
    )!;
    expect(edge.waiter.vertexId).toBe(id);
    expect(edge.prerequisite.vertexId).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(edge.prerequisite, 'vertexId')).toBe(
      true,
    );
    expect(mappings).toBe(0);
  }
});

test('fragment validation errors detach their issue array while retaining issue and ID identity', () => {
  const id = {};
  const issue: DagDefinitionIssue<typeof id> = {
    kind: 'unreachable',
    vertexIds: [id],
  };
  const issues = [issue];
  const error = new DagFragmentValidationError(issues);
  issues.length = 0;
  expect(error.issues).toEqual([issue]);
  expect(error.issues[0]).toBe(issue);
  expect(Object.isFrozen(id)).toBe(false);
});

test('fragment port and mapping failures retain their plain TypeError taxonomy', () => {
  const valid = single();
  for (const operation of [
    () => defineDagFragment(valid.definition, { start: 'unknown' }),
    () => defineDagFragment(valid.definition, null as any),
    () => defineDagFragment(null as any, {}),
    () =>
      instantiateDagFragment(
        { ...valid, ports: { start: 'unknown' } },
        { mapId: (id) => id },
      ),
    () =>
      instantiateDagFragment(
        defineDagFragment(
          {
            vertices: [vertex('a'), vertex('b')],
            omittedIds: [],
            entry: {
              kind: 'forest',
              slots: [
                { kind: 'vertex', vertexId: 'a' },
                { kind: 'vertex', vertexId: 'b' },
              ],
            },
          },
          {},
        ),
        { mapId: () => 'same' },
      ),
  ]) {
    expect(operation).toThrow(TypeError);
    expect(operation).not.toThrow(DagFragmentValidationError);
  }
});

test.each(['structuralCycle', 'milestone'] as const)(
  'closed invalid fragments preserve %s details through construction and instantiation',
  (kind) => {
    const id = { task: 'root' };
    const definition = {
      vertices: [
        {
          ...vertex<unknown>(id),
          slots: [{ kind: 'vertex' as const, vertexId: undefined }],
        },
        {
          ...vertex<unknown>(undefined, [], kind === 'milestone' ? [id] : []),
          slots:
            kind === 'structuralCycle'
              ? [{ kind: 'vertex' as const, vertexId: id }]
              : [],
        },
      ],
      omittedIds: [],
      entry: { kind: 'root' as const, vertexId: id },
    };
    for (const construct of [
      () => defineDagFragment(definition, { root: id }),
      () =>
        instantiateDagFragment(
          { definition, ports: { root: id } },
          {
            mapId: () => {
              throw new Error('Validation must precede mapping');
            },
          },
        ),
    ]) {
      try {
        construct();
        throw new Error('Expected invalid fragment');
      } catch (error) {
        if (!(error instanceof DagFragmentValidationError)) throw error;
        expect(error.issues).toHaveLength(1);
        const issue = error.issues[0]!;
        expect(issue.kind).toBe(kind);
        if (issue.kind === 'structuralCycle') {
          expect(issue.vertexIds).toEqual([id, undefined]);
          expect(issue.vertexIds[0]).toBe(id);
        } else if (issue.kind === 'milestone') {
          const edge = issue.diagnostics.dependencyEdges.find(
            (edge) => edge.reason === 'subgraphCompletionDependency',
          )!;
          expect(edge.waiter.vertexId).toBeUndefined();
          expect(edge.prerequisite.vertexId).toBe(id);
        }
      }
    }
  },
);
