import {
  copyAndNormalizeDagDefinition,
  validateAndPrepareDagDefinition,
  type DagDefinition,
} from '../src';

function vertex(
  vertexId: string,
  overrides: Partial<
    DagDefinition<string, string>['vertexDeclarations'][number]
  > = {},
) {
  return {
    vertexId,
    data: vertexId,
    childDiscoverySlots: [],
    workWaitsForWorkOf: [],
    workWaitsForSubgraphCompletionOf: [],
    ...overrides,
  };
}

// Accepting a disconnected record would silently drop authored work at replay.
test('materialized definitions reject records outside entry and prerequisite closure', () => {
  expect(
    validateAndPrepareDagDefinition(
      copyAndNormalizeDagDefinition({
        vertexDeclarations: [vertex('root'), vertex('orphan')],
        omittedVertexIds: [],
        entry: { kind: 'root', vertexId: 'root' },
      }),
    ),
  ).toEqual({
    kind: 'invalid',
    issues: [{ kind: 'outsideEntryDiscoveryClosure', vertexIds: ['orphan'] }],
  });
});

// Structural cycles must be rejected before source replay can throw or loop.
test('materialized definitions report structural SCC membership', () => {
  expect(
    validateAndPrepareDagDefinition(
      copyAndNormalizeDagDefinition({
        vertexDeclarations: [
          vertex('a', {
            childDiscoverySlots: [{ kind: 'vertex', vertexId: 'b' }],
          }),
          vertex('b', {
            childDiscoverySlots: [{ kind: 'vertex', vertexId: 'a' }],
          }),
        ],
        omittedVertexIds: [],
        entry: { kind: 'root', vertexId: 'a' },
      }),
    ),
  ).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'structuralChildCycleComponent', componentVertexIds: ['a', 'b'] },
    ],
  });
});

test('materialized definitions accept detached W and C prerequisite closures', () => {
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [
      vertex('remoteC', {
        childDiscoverySlots: [{ kind: 'vertex', vertexId: 'child' }],
      }),
      vertex('root', {
        workWaitsForWorkOf: ['remoteW'],
        workWaitsForSubgraphCompletionOf: ['remoteC'],
      }),
      vertex('remoteW', { workWaitsForWorkOf: ['skip'] }),
      vertex('child'),
    ],
    omittedVertexIds: ['skip'],
    entry: { kind: 'root', vertexId: 'root' },
  });
  if (result.kind !== 'valid') throw new Error(JSON.stringify(result));
  expect(
    result.validatedTopology.definition.vertexDeclarations.map(
      (v) => v.vertexId,
    ),
  ).toEqual(['remoteC', 'root', 'remoteW', 'child']);
  const runner =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology();
  const graph = runner.getLiveResolvedGraphView();
  expect(
    graph.getDistinctStructuralParentHandlesOrNull(
      graph.getVertexHandleByIdOrNull('remoteC')!,
    ),
  ).toEqual([]);
  expect(
    [...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()]
      .filter((event) => event.eventKind === 'workCompletionCommitted')
      .map((event) => event.vertexId),
  ).toEqual(['remoteW', 'remoteC', 'child', 'root']);
});

test.each(['workWaitsForWorkOf', 'workWaitsForSubgraphCompletionOf'] as const)(
  'unknown %s endpoints use milestone diagnostics',
  (field) => {
    const result = validateAndPrepareDagDefinition({
      vertexDeclarations: [vertex('root', { [field]: ['missing'] })],
      omittedVertexIds: [],
      entry: { kind: 'root', vertexId: 'root' },
    });
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') throw new Error('Expected invalid');
    expect(result).not.toHaveProperty('dag');
    expect(result.issues).toMatchObject([
      {
        kind: 'milestoneDependencyStall',
        diagnostics: { unresolvedPrerequisiteVertexIds: ['missing'] },
      },
    ]);
  },
);

test('combined W/C cycles use existing labelled milestone diagnostics', () => {
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [
      vertex('root', {
        childDiscoverySlots: [{ kind: 'vertex', vertexId: 'child' }],
        workWaitsForSubgraphCompletionOf: ['child'],
      }),
      vertex('child', { workWaitsForWorkOf: ['root'] }),
    ],
    omittedVertexIds: [],
    entry: { kind: 'root', vertexId: 'root' },
  });
  if (result.kind !== 'invalid') throw new Error('Expected invalid');
  expect(result).not.toHaveProperty('dag');
  expect(result.issues).toMatchObject([
    {
      kind: 'milestoneDependencyStall',
      diagnostics: { milestoneCycleVertexIdComponents: [['root', 'child']] },
    },
  ]);
});

test('structural validation distinguishes missing links, invalid omissions and unreachable declarations', () => {
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [
      vertex('root', {
        childDiscoverySlots: [
          { kind: 'vertex', vertexId: 'skip' },
          { kind: 'vertex', vertexId: 'missing' },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'root' } },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'unknown' } },
        ],
      }),
    ],
    omittedVertexIds: ['skip', 'unused'],
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
      { kind: 'omissionIdentityNotDeclared', vertexIds: ['root', 'unknown'] },
      { kind: 'outsideEntryDiscoveryClosure', vertexIds: ['unused'] },
    ],
  });
});

test.each([
  { kind: 'root', vertexId: 'missing' },
  { kind: 'root', vertexId: 'skip' },
  { kind: 'empty' },
  {
    kind: 'roots',
    entryDiscoverySlots: [{ kind: 'omitted', omittedVertexIdentity: null }],
  },
] as const)('invalid entry has no executable DAG %#', (entry) => {
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [vertex('root')],
    omittedVertexIds: ['skip'],
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
        : 'entryOmissionMissingIdentity',
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
    validateAndPrepareDagDefinition({
      vertexDeclarations: [],
      omittedVertexIds: [],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [{ kind: 'vertex', vertexId: null }],
      },
    }),
  ).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'missingStructuralEndpoint', parent: null, vertexId: null },
    ],
  });
});

test('structural self cycles use SameValueZero identity and deterministic declaration order', () => {
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [
      {
        vertexId: NaN,
        data: 1,
        childDiscoverySlots: [{ kind: 'vertex', vertexId: NaN }],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [],
    entry: { kind: 'root', vertexId: NaN },
  });
  expect(result).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'structuralChildCycleComponent', componentVertexIds: [NaN] },
    ],
  });
});

test.each([
  { omittedVertexIds: [] },
  { omittedVertexIds: [undefined, null, NaN] },
])(
  'empty entries preserve authored mode and known omitted identity seeds %#',
  ({ omittedVertexIds }) => {
    const result = validateAndPrepareDagDefinition({
      vertexDeclarations: [],
      omittedVertexIds,
      entry: { kind: 'empty' },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    expect(result.validatedTopology.definition).toEqual({
      vertexDeclarations: [],
      omittedVertexIds,
      entry: { kind: 'empty' },
    });
    expect([
      ...result.validatedTopology
        .createIndependentRunnerFromValidatedTopology({
          acceptedCompletedWorkVertexIds: new Set(omittedVertexIds),
        })
        .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]).toEqual([]);
  },
);

test('preparation normalizes shape before semantics and preserves exact accessor errors', () => {
  expect(() => validateAndPrepareDagDefinition(null as any)).toThrow(TypeError);
  const error = { exact: true };
  try {
    validateAndPrepareDagDefinition(
      Object.defineProperty({}, 'vertexDeclarations', {
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
    vertexDeclarations: [
      {
        vertexId: id,
        data,
        childDiscoverySlots: [],
        workWaitsForWorkOf: [undefined],
        workWaitsForSubgraphCompletionOf: [undefined],
      },
      {
        vertexId: null,
        data,
        childDiscoverySlots: [
          { kind: 'vertex', vertexId: id },
          { kind: 'vertex', vertexId: id },
        ],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [undefined],
    entry: {
      kind: 'roots',
      entryDiscoverySlots: [
        { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
        { kind: 'vertex', vertexId: null },
      ],
    },
  };
  const result = validateAndPrepareDagDefinition(input);
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.validatedTopology.definition).toEqual(input);
  expect(result.validatedTopology.definition).not.toBe(input);
  expect(
    result.validatedTopology.definition.vertexDeclarations[0]!.vertexId,
  ).toBe(id);
  expect(result.validatedTopology.liveVertexSummaries[0]!.data).toBe(data);
  expect(
    result.validatedTopology.liveVertexSummaries[1]!
      .liveStructuralChildVertexIds,
  ).toEqual([id, id]);
  const runner =
    await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology(
      {
        acceptedCompletedWorkVertexIds: new Set([undefined]),
      },
    );
  const events: unknown[] = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
    events.push([event.vertexId, event.eventKind]);
  expect(events).toEqual([
    [null, 'workCompletionCommitted'],
    [id, 'workCompletionCommitted'],
    [id, 'subgraphCompletionCommitted'],
    [null, 'subgraphCompletionCommitted'],
  ]);
  expect(
    runner.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
  ).toEqual([]);
});

test('forest omissions cannot masquerade as live or unknown identities', () => {
  expect(
    validateAndPrepareDagDefinition({
      vertexDeclarations: [],
      omittedVertexIds: ['unused'],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'unknown' } },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'unknown' } },
        ],
      },
    }),
  ).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'omissionIdentityNotDeclared', vertexIds: ['unknown'] },
      { kind: 'outsideEntryDiscoveryClosure', vertexIds: ['unused'] },
    ],
  });
});

test('structural SCCs retain declaration order and stay separate before milestone validation', () => {
  expect(
    validateAndPrepareDagDefinition({
      vertexDeclarations: [
        vertex('a', {
          childDiscoverySlots: [{ kind: 'vertex', vertexId: 'b' }],
          workWaitsForWorkOf: ['missing'],
        }),
        vertex('b', {
          childDiscoverySlots: [{ kind: 'vertex', vertexId: 'a' }],
        }),
        vertex('c', {
          childDiscoverySlots: [{ kind: 'vertex', vertexId: 'c' }],
        }),
      ],
      omittedVertexIds: [],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'vertex', vertexId: 'a' },
          { kind: 'vertex', vertexId: 'c' },
        ],
      },
    }),
  ).toEqual({
    kind: 'invalid',
    issues: [
      { kind: 'structuralChildCycleComponent', componentVertexIds: ['a', 'b'] },
      { kind: 'structuralChildCycleComponent', componentVertexIds: ['c'] },
    ],
  });
});

test('undefined is a live root identity rather than an absent record', () => {
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [
      {
        vertexId: undefined,
        data: 'live',
        childDiscoverySlots: [],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [],
    entry: { kind: 'root', vertexId: undefined },
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(
    [
      ...result.validatedTopology
        .createIndependentRunnerFromValidatedTopology()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ].map((event) => [event.vertexId, event.eventKind]),
  ).toEqual([
    [undefined, 'workCompletionCommitted'],
    [undefined, 'subgraphCompletionCommitted'],
  ]);
});

test('membership and SCC validation handle deep unreachable structures without recursion', () => {
  const vertices = Array.from({ length: 12000 }, (_, vertexId) => ({
    vertexId,
    data: vertexId,
    childDiscoverySlots:
      vertexId === 11999
        ? []
        : [{ kind: 'vertex' as const, vertexId: vertexId + 1 }],
    workWaitsForWorkOf: [],
    workWaitsForSubgraphCompletionOf: [],
  }));
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: vertices,
    omittedVertexIds: [],
    entry: { kind: 'roots', entryDiscoverySlots: [] },
  });
  expect(result).toEqual({
    kind: 'invalid',
    issues: [
      {
        kind: 'outsideEntryDiscoveryClosure',
        vertexIds: vertices.map((v) => v.vertexId),
      },
    ],
  });
});
