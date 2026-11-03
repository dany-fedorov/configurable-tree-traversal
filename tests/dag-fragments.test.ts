import {
  validateAndCreateDagFragment,
  mapDagFragmentIds,
  composeAndValidateDagFragments,
  DagFragmentValidationError,
  type DagDefinitionIssue,
} from '../src';
import * as dag from '../src/traversals/dag-traversal';

const vertex = <ID>(
  vertexId: ID,
  workWaitsForWorkOf: ID[] = [],
  workWaitsForSubgraphCompletionOf: ID[] = [],
) => ({
  vertexId,
  data: { task: vertexId },
  childDiscoverySlots: [],
  workWaitsForWorkOf,
  workWaitsForSubgraphCompletionOf,
});

test('two object-ID instances compose a completion wire without sharing local identities', () => {
  const start = {};
  const finish = {};
  const fragment = validateAndCreateDagFragment(
    {
      vertexDeclarations: [vertex(start), vertex(finish, [start])],
      omittedVertexIds: [],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
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
  const first = mapDagFragmentIds(fragment, {
    mapId: (id) => firstIds.get(id)!,
  });
  const second = mapDagFragmentIds(fragment, {
    mapId: (id) => secondIds.get(id)!,
  });
  const result = composeAndValidateDagFragments([first, second], {
    additionalWorkPrerequisites: [
      {
        dependentWorkVertexId: second.vertexIdsByPortName.start,
        prerequisite: {
          vertexId: first.vertexIdsByPortName.finish,
          milestone: 'subgraphCompletion',
        },
      },
    ],
  });
  if (result.kind !== 'valid') throw new Error('Expected valid composition');
  expect(
    result.validatedTopology.definition.vertexDeclarations[2]!
      .workWaitsForSubgraphCompletionOf,
  ).toEqual([firstIds.get(finish)]);
  expect(
    [
      ...result.validatedTopology
        .createIndependentRunnerFromValidatedTopology()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ].map((e) => [e.vertexId.name, e.eventKind]),
  ).toEqual([
    ['first-start', 'workCompletionCommitted'],
    ['first-finish', 'workCompletionCommitted'],
    ['first-start', 'subgraphCompletionCommitted'],
    ['first-finish', 'subgraphCompletionCommitted'],
    ['second-start', 'workCompletionCommitted'],
    ['second-finish', 'workCompletionCommitted'],
    ['second-start', 'subgraphCompletionCommitted'],
    ['second-finish', 'subgraphCompletionCommitted'],
  ]);
});

const single = (id = 'a') =>
  validateAndCreateDagFragment(
    {
      vertexDeclarations: [vertex(id)],
      omittedVertexIds: [],
      entry: { kind: 'root', vertexId: id },
    },
    { start: id },
  );

test('maps each live and omitted identity once across entry, slots, dependencies and ports', () => {
  const local = validateAndCreateDagFragment(
    {
      vertexDeclarations: [
        {
          ...vertex<unknown>(undefined, [NaN], [null]),
          childDiscoverySlots: [
            { kind: 'omitted', omittedVertexIdentity: null },
            { kind: 'omitted', omittedVertexIdentity: { vertexId: NaN } },
            { kind: 'vertex', vertexId: null },
          ],
        },
        vertex<unknown>(null),
      ],
      omittedVertexIds: [NaN],
      entry: { kind: 'root', vertexId: undefined },
    },
    { ['__proto__']: undefined, finish: null },
  );
  const seen: unknown[] = [];
  const mapped = [{ n: 0 }, { n: 1 }, { n: 2 }];
  const instance = mapDagFragmentIds(local, {
    mapId: (id) => {
      seen.push(id);
      return mapped[seen.length - 1]!;
    },
  });
  expect(seen).toEqual([undefined, null, NaN]);
  expect(instance.vertexIdsByPortName.__proto__).toBe(mapped[0]);
  expect(instance.vertexIdsByPortName.finish).toBe(mapped[1]);
  expect(instance.definition).toEqual({
    entry: { kind: 'root', vertexId: mapped[0] },
    omittedVertexIds: [mapped[2]],
    vertexDeclarations: [
      {
        ...vertex(mapped[0]!, [mapped[2]!], [mapped[1]!]),
        data: local.definition.vertexDeclarations[0]!.data,
        childDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: null },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: mapped[2] } },
          { kind: 'vertex', vertexId: mapped[1] },
        ],
      },
      {
        ...vertex(mapped[1]!),
        data: local.definition.vertexDeclarations[1]!.data,
      },
    ],
  });
});

test('preserves forest order, detached prerequisites and empty-entry known omissions', () => {
  const a = validateAndCreateDagFragment(
    {
      vertexDeclarations: [vertex('a', ['remote']), vertex('remote')],
      omittedVertexIds: ['skip'],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
          { kind: 'vertex', vertexId: 'a' },
        ],
      },
    },
    { start: 'a' },
  );
  const omitted = validateAndCreateDagFragment(
    {
      vertexDeclarations: [],
      omittedVertexIds: ['empty-skip'],
      entry: { kind: 'empty' },
    },
    {},
  );
  const empty = validateAndCreateDagFragment(
    { vertexDeclarations: [], omittedVertexIds: [], entry: { kind: 'empty' } },
    {},
  );
  const result = composeAndValidateDagFragments([
    a,
    omitted,
    empty,
    single('b'),
  ]);
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.validatedTopology.definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
      { kind: 'vertex', vertexId: 'a' },
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 'empty-skip' } },
      { kind: 'vertex', vertexId: 'b' },
    ],
  });
  expect(
    result.validatedTopology.definition.vertexDeclarations.map(
      (v) => v.vertexId,
    ),
  ).toEqual(['a', 'remote', 'b']);
  expect(
    result.validatedTopology.definition.vertexDeclarations[0]!
      .childDiscoverySlots,
  ).toEqual([]);
  const runner =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      acceptedCompletedWorkVertexIds: new Set(['empty-skip']),
    });
  runner.runUntilSuspendedOrTerminal();
  expect(
    runner.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
  ).toEqual([]);
  expect(
    [
      ...result.validatedTopology
        .createIndependentRunnerFromValidatedTopology()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]
      .filter((e) => e.eventKind === 'workCompletionCommitted')
      .map((e) => e.vertexId),
  ).toEqual(['b', 'remote', 'a']);
});

test('structural links append independently of explicit work and completion wires', () => {
  const instances = [single('a'), single('b'), single('c')];
  const result = composeAndValidateDagFragments(instances, {
    additionalStructuralChildLinks: [
      { parentVertexId: 'a', childVertexId: 'c' },
      { parentVertexId: 'a', childVertexId: 'b' },
    ],
    additionalWorkPrerequisites: [
      {
        dependentWorkVertexId: 'b',
        prerequisite: { vertexId: 'a', milestone: 'workCompletion' },
      },
      {
        dependentWorkVertexId: 'b',
        prerequisite: { vertexId: 'a', milestone: 'workCompletion' },
      },
      {
        dependentWorkVertexId: 'c',
        prerequisite: { vertexId: 'b', milestone: 'subgraphCompletion' },
      },
    ],
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(
    result.validatedTopology.definition.vertexDeclarations.map((v) => ({
      id: v.vertexId,
      childDiscoverySlots: v.childDiscoverySlots,
      w: v.workWaitsForWorkOf,
      c: v.workWaitsForSubgraphCompletionOf,
    })),
  ).toEqual([
    {
      id: 'a',
      childDiscoverySlots: [
        { kind: 'vertex', vertexId: 'c' },
        { kind: 'vertex', vertexId: 'b' },
      ],
      w: [],
      c: [],
    },
    { id: 'b', childDiscoverySlots: [], w: ['a'], c: [] },
    { id: 'c', childDiscoverySlots: [], w: [], c: ['b'] },
  ]);
  expect(
    instances[0]!.definition.vertexDeclarations[0]!.childDiscoverySlots,
  ).toEqual([]);
  const structuralOnly = composeAndValidateDagFragments(instances, {
    additionalStructuralChildLinks: [
      { parentVertexId: 'a', childVertexId: 'b' },
    ],
  });
  if (structuralOnly.kind !== 'valid') throw new Error('Expected valid');
  expect(
    structuralOnly.validatedTopology.definition.vertexDeclarations[1]!
      .workWaitsForWorkOf,
  ).toEqual([]);
});

test('composition validates structural and combined W/C cycles through the shared validator', () => {
  expect(
    composeAndValidateDagFragments([single('a'), single('b')], {
      additionalStructuralChildLinks: [
        { parentVertexId: 'a', childVertexId: 'b' },
        { parentVertexId: 'b', childVertexId: 'a' },
      ],
    }),
  ).toMatchObject({
    kind: 'invalid',
    issues: [
      { kind: 'structuralChildCycleComponent', componentVertexIds: ['a', 'b'] },
    ],
  });
  expect(
    composeAndValidateDagFragments([single('a'), single('b')], {
      additionalStructuralChildLinks: [
        { parentVertexId: 'a', childVertexId: 'b' },
      ],
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: 'b',
          prerequisite: { vertexId: 'a', milestone: 'subgraphCompletion' },
        },
      ],
    }),
  ).toMatchObject({
    kind: 'invalid',
    issues: [{ kind: 'milestoneDependencyStall' }],
  });
  expect(composeAndValidateDagFragments([])).toMatchObject({
    kind: 'valid',
    validatedTopology: {
      definition: { entry: { kind: 'roots', entryDiscoverySlots: [] } },
    },
  });
});

test.each([
  {
    vertexDeclarations: [vertex('a', ['outside'])],
    omittedVertexIds: [],
    entry: { kind: 'root' as const, vertexId: 'a' },
  },
  {
    vertexDeclarations: [vertex('a'), vertex('outsideEntryDiscoveryClosure')],
    omittedVertexIds: [],
    entry: { kind: 'root' as const, vertexId: 'a' },
  },
])('rejects non-closed fragment definitions before mapping', (definition) => {
  expect(() =>
    validateAndCreateDagFragment(definition, { start: 'a' }),
  ).toThrow(TypeError);
});

test('rejects unknown/omitted ports, malformed port maps and symbol port names', () => {
  const definition = {
    vertexDeclarations: [vertex('a')],
    omittedVertexIds: ['skip'],
    entry: {
      kind: 'roots' as const,
      entryDiscoverySlots: [
        { kind: 'vertex' as const, vertexId: 'a' },
        {
          kind: 'omitted' as const,
          omittedVertexIdentity: { vertexId: 'skip' },
        },
      ],
    },
  };
  for (const vertexIdsByPortName of [
    { start: 'unknown' },
    { start: 'skip' },
    null,
    [],
    'a',
    { [Symbol()]: 'a' },
  ]) {
    expect(() =>
      validateAndCreateDagFragment(definition, vertexIdsByPortName as any),
    ).toThrow(TypeError);
  }
});

test('maps SameValueZero identities and rejects mapped live/omitted collisions', () => {
  const fragment = validateAndCreateDagFragment(
    {
      vertexDeclarations: [vertex<unknown>('a')],
      omittedVertexIds: [undefined],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'vertex', vertexId: 'a' },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
        ],
      },
    },
    { a: 'a' },
  );
  expect(() => mapDagFragmentIds(fragment, { mapId: () => NaN })).toThrow(
    TypeError,
  );
  const result = mapDagFragmentIds(single(), { mapId: () => undefined });
  expect(result.vertexIdsByPortName.start).toBeUndefined();
  expect(composeAndValidateDagFragments([result]).kind).toBe('valid');
});

test('rejects cross-instance live/omitted collisions and invalid wire endpoints or milestone kinds', () => {
  expect(() => composeAndValidateDagFragments([single(), single()])).toThrow(
    TypeError,
  );
  const omitted = validateAndCreateDagFragment(
    {
      vertexDeclarations: [],
      omittedVertexIds: ['a'],
      entry: { kind: 'empty' },
    },
    {},
  );
  expect(() => composeAndValidateDagFragments([single(), omitted])).toThrow(
    TypeError,
  );
  const instances = [single()];
  for (const options of [
    {
      additionalStructuralChildLinks: [
        { parentVertexId: 'unknown', childVertexId: 'a' },
      ],
    },
    {
      additionalStructuralChildLinks: [
        { parentVertexId: 'a', childVertexId: 'unknown' },
      ],
    },
    {
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: 'unknown',
          prerequisite: { vertexId: 'a', milestone: 'workCompletion' },
        },
      ],
    },
    {
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: 'a',
          prerequisite: { vertexId: 'unknown', milestone: 'workCompletion' },
        },
      ],
    },
    {
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: 'a',
          prerequisite: { vertexId: 'a', milestone: 'ready' },
        },
      ],
    },
  ])
    expect(() =>
      composeAndValidateDagFragments(instances, options as any),
    ).toThrow(TypeError);
  expect(() =>
    composeAndValidateDagFragments([single(), omitted], {
      additionalStructuralChildLinks: [
        { parentVertexId: 'a', childVertexId: 'a' },
      ],
    }),
  ).toThrow(TypeError);
});

test('retains caller error identity for mapping and port getters', () => {
  const failure = { reason: 'mapping' };
  expect.assertions(2);
  try {
    mapDagFragmentIds(single(), {
      mapId: () => {
        throw failure;
      },
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  const vertexIdsByPortName = Object.defineProperty({}, 'start', {
    get: () => {
      throw failure;
    },
  });
  try {
    validateAndCreateDagFragment(single().definition, vertexIdsByPortName);
  } catch (error) {
    expect(error).toBe(failure);
  }
});

test('copies and freezes owned fragment topology and port wrappers without freezing opaque IDs/data', () => {
  const id = { name: 'local' };
  const data = { task: 'opaque' };
  const definition = {
    vertexDeclarations: [{ ...vertex(id), data }],
    omittedVertexIds: [],
    entry: { kind: 'root' as const, vertexId: id },
  };
  const vertexIdsByPortName = Object.defineProperty({}, 'entry', {
    value: id,
  }) as {
    entry: typeof id;
  };
  const fragment = validateAndCreateDagFragment(
    definition,
    vertexIdsByPortName,
  );
  definition.vertexDeclarations.length = 0;
  expect(fragment.vertexIdsByPortName.entry).toBe(id);
  expect(fragment.definition.vertexDeclarations[0]!.data).toBe(data);
  expect(Object.isFrozen(fragment)).toBe(true);
  expect(Object.isFrozen(fragment.vertexIdsByPortName)).toBe(true);
  expect(
    Object.isFrozen(
      fragment.definition.vertexDeclarations[0]!.childDiscoverySlots,
    ),
  ).toBe(true);
  const mappedId = { name: 'mapped' };
  const instance = mapDagFragmentIds(fragment, { mapId: () => mappedId });
  expect(Object.isFrozen(instance)).toBe(true);
  expect(Object.isFrozen(instance.vertexIdsByPortName)).toBe(true);
  expect(Object.isFrozen(instance.definition)).toBe(true);
  expect(Object.isFrozen(id)).toBe(false);
  expect(Object.isFrozen(mappedId)).toBe(false);
  expect(Object.isFrozen(data)).toBe(false);
});

test('remaps forest entry references and empty omission catalogs before composition', async () => {
  const forest = validateAndCreateDagFragment(
    {
      vertexDeclarations: [vertex('a')],
      omittedVertexIds: ['skip'],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
          { kind: 'vertex', vertexId: 'a' },
        ],
      },
    },
    { a: 'a' },
  );
  const mapped = mapDagFragmentIds(forest, {
    mapId: (id) => (id === 'a' ? 1 : 2),
  });
  expect(mapped.definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 2 } },
      { kind: 'vertex', vertexId: 1 },
    ],
  });
  const empty = mapDagFragmentIds(
    validateAndCreateDagFragment(
      {
        vertexDeclarations: [],
        omittedVertexIds: ['root-skip'],
        entry: { kind: 'empty' },
      },
      {},
    ),
    { mapId: () => undefined },
  );
  expect(empty.definition).toEqual({
    vertexDeclarations: [],
    omittedVertexIds: [undefined],
    entry: { kind: 'empty' },
  });
  const result = composeAndValidateDagFragments<unknown, number | undefined>(
    [mapped, empty],
    {
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: 1,
          prerequisite: { vertexId: undefined, milestone: 'workCompletion' },
        },
        {
          dependentWorkVertexId: 1,
          prerequisite: {
            vertexId: undefined,
            milestone: 'subgraphCompletion',
          },
        },
      ],
    },
  );
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const events: unknown[] = [];
  for await (const event of (
    await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology()
  ).runAndIterateObservationEventsUntilSuspendedOrTerminal())
    events.push([event.vertexId, event.eventKind]);
  expect(events).toEqual([
    [1, 'workCompletionCommitted'],
    [1, 'subgraphCompletionCommitted'],
  ]);
});

test.each([
  {
    additionalStructuralChildLinks: [
      { parentVertexId: 'skip', childVertexId: 'a' },
    ],
  },
  {
    additionalStructuralChildLinks: [
      { parentVertexId: 'a', childVertexId: 'skip' },
    ],
  },
  {
    additionalWorkPrerequisites: [
      {
        dependentWorkVertexId: 'skip',
        prerequisite: { vertexId: 'a', milestone: 'workCompletion' as const },
      },
    ],
  },
])(
  'omitted identities cannot be structural endpoints or wire dependents: %o',
  (options) => {
    const omitted = validateAndCreateDagFragment(
      {
        vertexDeclarations: [],
        omittedVertexIds: ['skip'],
        entry: { kind: 'empty' },
      },
      {},
    );
    expect(() =>
      composeAndValidateDagFragments([single(), omitted], options),
    ).toThrow(TypeError);
  },
);

test('composition retains omitted discovery positions before dependent siblings', async () => {
  const fragment = validateAndCreateDagFragment(
    {
      vertexDeclarations: [
        {
          ...vertex('root'),
          childDiscoverySlots: [
            { kind: 'omitted', omittedVertexIdentity: null },
            { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
            { kind: 'vertex', vertexId: 'b' },
            { kind: 'vertex', vertexId: 'c' },
          ],
        },
        vertex('b', ['skip']),
        vertex('c'),
      ],
      omittedVertexIds: ['skip'],
      entry: { kind: 'root', vertexId: 'root' },
    },
    { root: 'root' },
  );
  const instance = mapDagFragmentIds(fragment, { mapId: (id) => id });
  const result = composeAndValidateDagFragments([instance]);
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(
    result.validatedTopology.definition.vertexDeclarations[0]!
      .childDiscoverySlots,
  ).toEqual([
    { kind: 'omitted', omittedVertexIdentity: null },
    { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
    { kind: 'vertex', vertexId: 'b' },
    { kind: 'vertex', vertexId: 'c' },
  ]);
  for (const runner of [
    result.validatedTopology.createIndependentRunnerFromValidatedTopology(),
    await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology(),
  ]) {
    const events: unknown[] = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push([event.vertexId, event.eventKind]);
    expect(events).toEqual([
      ['root', 'workCompletionCommitted'],
      ['b', 'workCompletionCommitted'],
      ['c', 'workCompletionCommitted'],
      ['b', 'subgraphCompletionCommitted'],
      ['c', 'subgraphCompletionCommitted'],
      ['root', 'subgraphCompletionCommitted'],
    ]);
  }
});

test('missing wire fields are malformed even when undefined is a live identity', () => {
  const instance = mapDagFragmentIds(single(), { mapId: () => undefined });
  for (const options of [
    { additionalStructuralChildLinks: [{}] },
    { additionalStructuralChildLinks: [null] },
    { additionalStructuralChildLinks: ['invalid'] },
    { additionalStructuralChildLinks: [[]] },
    {
      additionalStructuralChildLinks: [
        Object.create({ parentVertexId: undefined, childVertexId: undefined }),
      ],
    },
    { additionalStructuralChildLinks: [{ parentVertexId: undefined }] },
    { additionalStructuralChildLinks: [{ childVertexId: undefined }] },
    {
      additionalWorkPrerequisites: [
        { prerequisite: { vertexId: undefined, milestone: 'workCompletion' } },
      ],
    },
    {
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: undefined,
          prerequisite: { milestone: 'workCompletion' },
        },
      ],
    },
    {
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: undefined,
          prerequisite: { vertexId: undefined },
        },
      ],
    },
  ])
    expect(() =>
      composeAndValidateDagFragments([instance], options as any),
    ).toThrow(TypeError);
  const valid = composeAndValidateDagFragments([instance], {
    additionalWorkPrerequisites: [
      {
        dependentWorkVertexId: undefined,
        prerequisite: { vertexId: undefined, milestone: 'workCompletion' },
      },
    ],
  });
  expect(valid).toMatchObject({
    kind: 'invalid',
    issues: [{ kind: 'milestoneDependencyStall' }],
  });
});

test('wire endpoint getters run once and retain exact thrown values', () => {
  const failure = { kind: 'wire getter' };
  expect.assertions(3);
  const instances = [single('a'), single('b')];
  try {
    composeAndValidateDagFragments(instances, {
      additionalStructuralChildLinks: [
        Object.defineProperty({ parentVertexId: 'a' }, 'childVertexId', {
          get: () => {
            throw failure;
          },
        }) as { parentVertexId: string; childVertexId: string },
      ],
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  try {
    composeAndValidateDagFragments(instances, {
      additionalWorkPrerequisites: [
        {
          dependentWorkVertexId: 'b',
          prerequisite: Object.defineProperty(
            { milestone: 'workCompletion' as const },
            'vertexId',
            {
              get: () => {
                throw failure;
              },
            },
          ) as { vertexId: string; milestone: 'workCompletion' },
        },
      ],
    });
  } catch (error) {
    expect(error).toBe(failure);
  }
  let reads = 0;
  const childVertexId = Object.defineProperty(
    { parentVertexId: 'a' },
    'childVertexId',
    {
      get: () => {
        reads++;
        return reads === 1 ? 'b' : 'unknown';
      },
    },
  ) as { parentVertexId: string; childVertexId: string };
  const result = composeAndValidateDagFragments(instances, {
    additionalStructuralChildLinks: [childVertexId],
  });
  expect(result).toMatchObject({
    kind: 'valid',
    validatedTopology: {
      definition: {
        vertexDeclarations: [
          {
            vertexId: 'a',
            childDiscoverySlots: [{ kind: 'vertex', vertexId: 'b' }],
          },
          { vertexId: 'b' },
        ],
      },
    },
  });
});

test('fragment validation exposes structural issues with shallow object and undefined identities', () => {
  const id = { task: 'root' };
  const definition = {
    vertexDeclarations: [
      {
        ...vertex<unknown>(id),
        childDiscoverySlots: [{ kind: 'vertex' as const, vertexId: undefined }],
      },
    ],
    omittedVertexIds: [],
    entry: { kind: 'root' as const, vertexId: id },
  };
  expect.assertions(8);
  try {
    validateAndCreateDagFragment(definition, { root: id });
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
      vertexDeclarations: [vertex<unknown>(id, [undefined])],
      omittedVertexIds: [],
      entry: { kind: 'root' as const, vertexId: id },
    },
    vertexIdsByPortName: { root: id },
  };
  expect.assertions(6);
  try {
    mapDagFragmentIds(fragment, {
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
        kind: 'milestoneDependencyStall',
        diagnostics: { unresolvedPrerequisiteVertexIds: [undefined] },
      },
    ]);
    const issue = error.issues[0]!;
    if (issue.kind !== 'milestoneDependencyStall')
      throw new Error('Expected milestone issue');
    const edge = issue.diagnostics.originalMilestoneConstraints.find(
      (edge) => edge.reason === 'workDependency',
    )!;
    expect(edge.waitingMilestone.vertexId).toBe(id);
    expect(edge.prerequisiteMilestone.vertexId).toBeUndefined();
    expect(
      Object.prototype.hasOwnProperty.call(
        edge.prerequisiteMilestone,
        'vertexId',
      ),
    ).toBe(true);
    expect(mappings).toBe(0);
  }
});

test('fragment validation errors detach their issue array while retaining issue and ID identity', () => {
  const id = {};
  const issue: DagDefinitionIssue<typeof id> = {
    kind: 'outsideEntryDiscoveryClosure',
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
    () => validateAndCreateDagFragment(valid.definition, { start: 'unknown' }),
    () => validateAndCreateDagFragment(valid.definition, null as any),
    () => validateAndCreateDagFragment(null as any, {}),
    () =>
      mapDagFragmentIds(
        { ...valid, vertexIdsByPortName: { start: 'unknown' } },
        { mapId: (id) => id },
      ),
    () =>
      mapDagFragmentIds(
        validateAndCreateDagFragment(
          {
            vertexDeclarations: [vertex('a'), vertex('b')],
            omittedVertexIds: [],
            entry: {
              kind: 'roots',
              entryDiscoverySlots: [
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

test.each(['structuralChildCycleComponent', 'milestoneDependencyStall'] as const)(
  'closed invalid fragments preserve %s details through construction and instantiation',
  (kind) => {
    const id = { task: 'root' };
    const definition = {
      vertexDeclarations: [
        {
          ...vertex<unknown>(id),
          childDiscoverySlots: [
            { kind: 'vertex' as const, vertexId: undefined },
          ],
        },
        {
          ...vertex<unknown>(undefined, [], kind === 'milestoneDependencyStall' ? [id] : []),
          childDiscoverySlots:
            kind === 'structuralChildCycleComponent'
              ? [{ kind: 'vertex' as const, vertexId: id }]
              : [],
        },
      ],
      omittedVertexIds: [],
      entry: { kind: 'root' as const, vertexId: id },
    };
    for (const construct of [
      () => validateAndCreateDagFragment(definition, { root: id }),
      () =>
        mapDagFragmentIds(
          { definition, vertexIdsByPortName: { root: id } },
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
        if (issue.kind === 'structuralChildCycleComponent') {
          expect(issue.componentVertexIds).toEqual([id, undefined]);
          expect(issue.componentVertexIds[0]).toBe(id);
        } else if (issue.kind === 'milestoneDependencyStall') {
          const edge = issue.diagnostics.originalMilestoneConstraints.find(
            (edge) => edge.reason === 'subgraphCompletionDependency',
          )!;
          expect(edge.waitingMilestone.vertexId).toBeUndefined();
          expect(edge.prerequisiteMilestone.vertexId).toBe(id);
        }
      }
    }
  },
);
