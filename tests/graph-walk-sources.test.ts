import {
  AsyncGraphWalkBuilder,
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  graphWalk,
  materializeGraphWalkSourceFromVertexRecords,
  materializeSynchronousGraphWalkSourceFromAsyncRecords,
  materializeGraphWalkSourceFromDagDeclarationRelations,
  copyAndNormalizeDagDefinition,
  validateAndPrepareDagDefinition,
} from '../src';

it.each([
  {},
  { getVertexId: (vertex: string) => vertex },
  { enumerateOutgoingLinks: () => [] },
])(
  'requires both catalog selectors before consuming records: %p',
  async (options) => {
    let opened = 0;
    function* records() {
      opened++;
      yield 'root';
    }
    const diagnostic =
      'Walking selectors require getVertexId/enumerateOutgoingLinks';
    expect(() =>
      materializeGraphWalkSourceFromVertexRecords(records(), options as never),
    ).toThrow(diagnostic);
    await expect(
      materializeSynchronousGraphWalkSourceFromAsyncRecords(
        records(),
        options as never,
      ),
    ).rejects.toThrow(diagnostic);
    expect(opened).toBe(0);
  },
);

it('captures catalog topology eagerly while retaining shallow caller data', () => {
  const a = { id: 'A' },
    b = { id: 'B' };
  const relation = { kind: 'cites' };
  const link = { toVertexId: 'B', edgeData: relation };
  const adjacency = [link, link];
  const roots = ['A'];
  const calls: string[] = [];
  const source = materializeGraphWalkSourceFromVertexRecords([a, b], {
    getVertexId: (item) => {
      calls.push(`id:${item.id}`);
      return item.id;
    },
    enumerateOutgoingLinks: (item) => {
      calls.push(`outgoing:${item.id}`);
      return item === a ? adjacency : [];
    },
    rootVertexIds: roots,
  });
  expect(source.vertexResolutionMode).toBe(
    'resolverWithOptionalInlineResolution',
  );
  expect(calls).toEqual(['id:A', 'outgoing:A', 'id:B', 'outgoing:B']);
  roots.length = 0;
  adjacency.length = 0;
  link.toVertexId = 'unknown';
  link.edgeData = { kind: 'replaced' };
  relation.kind = 'updated';
  const factory = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
  for (
    let runUntilSuspendedOrTerminal = 0;
    runUntilSuspendedOrTerminal < 2;
    runUntilSuspendedOrTerminal++
  ) {
    const events = [
      ...factory
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
        }),
    ];
    expect(
      events.map((event) => [
        event.edge.fromVertexId,
        event.edge.toVertexId,
        event.edge.sourceOutgoingLinkIndexBeforeFiltering,
      ]),
    ).toEqual([
      ['A', 'B', 0],
      ['A', 'B', 1],
    ]);
    expect(events[0]!.fromVertex.vertexData).toBe(a);
    expect(events[0]!.targetResolution).toEqual({
      kind: 'found',
      vertex: { vertexId: 'B', vertexData: b },
    });
    expect(events[0]!.edge.edgeData).toBe(relation);
  }
  expect(calls).toHaveLength(4);
  expect(graphWalk.materializeGraphWalkSourceFromVertexRecords).toBe(
    materializeGraphWalkSourceFromVertexRecords,
  );
});

it('returns detached root, resolution and outgoing wrappers for independent consumers', () => {
  const data = { id: undefined };
  const source = materializeGraphWalkSourceFromVertexRecords([data], {
    getVertexId: (item) => item.id,
    enumerateOutgoingLinks: () => [
      { toVertexId: undefined, edgeData: undefined },
    ],
    rootVertexIds: [undefined, undefined],
  });
  const first = [...source.enumerateRootTargets()];
  (first[0] as any).vertexId = 'changed';
  first.length = 0;
  const resolution = source.resolveVertexDataById!(undefined);
  (resolution as any).kind = 'omitted';
  const links = [
    ...source.enumerateOutgoingLinks({ vertexId: undefined, vertexData: data }),
  ];
  (links[0]!.targetToResolveOnAdmission as any).vertexId = 'changed';
  (links[0] as any).data = 'changed';
  links.length = 0;
  expect([...source.enumerateRootTargets()]).toEqual([
    { vertexId: undefined },
    { vertexId: undefined },
  ]);
  expect(source.resolveVertexDataById!(undefined)).toEqual({
    kind: 'found',
    vertexData: data,
  });
  expect([
    ...source.enumerateOutgoingLinks({ vertexId: undefined, vertexData: data }),
  ]).toEqual([
    {
      targetToResolveOnAdmission: { vertexId: undefined },
      edgeData: undefined,
    },
  ]);
});

it('preserves arbitrary omittedVertexIdentity, parallel links and explicit root order without coercion', () => {
  const object = {},
    other = {},
    symbol = Symbol('id');
  const ids: unknown[] = [object, other, symbol, undefined, null, NaN, -0];
  const items = ids.map((id) => ({ id }));
  const source = materializeGraphWalkSourceFromVertexRecords(items, {
    getVertexId: (item) => item.id,
    enumerateOutgoingLinks: () =>
      ids.map((to, data) => ({ toVertexId: to, edgeData: data })),
    rootVertexIds: [NaN, object, 0, symbol],
  });
  expect(
    [...source.enumerateRootTargets()].map((root) => root.vertexId),
  ).toEqual([NaN, object, 0, symbol]);
  for (const item of items)
    expect(source.resolveVertexDataById!(item.id)).toEqual({
      kind: 'found',
      vertexData: item,
    });
  expect(
    [
      ...source.enumerateOutgoingLinks({
        vertexId: object,
        vertexData: items[0]!,
      }),
    ].map((link) => link.targetToResolveOnAdmission.vertexId),
  ).toEqual(ids);
  expect(() => source.resolveVertexDataById!({})).toThrow(TypeError);
  expect(() =>
    source.enumerateOutgoingLinks({ vertexId: {}, vertexData: items[0]! }),
  ).toThrow(TypeError);
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
      materializeGraphWalkSourceFromVertexRecords(items, {
        getVertexId: (value) => value.id,
        enumerateOutgoingLinks: () => [],
        rootVertexIds: [],
      }),
    ).toThrow(TypeError);
  },
);

it('rejects unknown roots and targets even in unreachable records', () => {
  expect(() =>
    materializeGraphWalkSourceFromVertexRecords(['a'], {
      getVertexId: (item) => item,
      enumerateOutgoingLinks: () => [],
      rootVertexIds: ['missing'],
    }),
  ).toThrow(TypeError);
  expect(() =>
    materializeGraphWalkSourceFromVertexRecords(['a', 'b'], {
      getVertexId: (item) => item,
      enumerateOutgoingLinks: (item) =>
        item === 'b' ? [{ toVertexId: 'missing', edgeData: 1 }] : [],
      rootVertexIds: ['a'],
    }),
  ).toThrow(TypeError);
});

it('allows empty catalog and root sets without inventing vertices', () => {
  const source = materializeGraphWalkSourceFromVertexRecords([], {
    getVertexId: (value) => value,
    enumerateOutgoingLinks: () => [],
    rootVertexIds: [],
  });
  expect([
    ...new GraphWalkBuilder({ graphWalkDiscoverySource: source })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
  expect(() => source.resolveVertexDataById!(undefined as never)).toThrow(
    TypeError,
  );
});

it('eagerly awaits async catalogs, selectors and roots into a synchronous reusable source', async () => {
  const a = { id: 'a' },
    b = { id: 'b' };
  const relation = { kind: 'link' };
  const link = { toVertexId: 'b', edgeData: relation };
  const calls: string[] = [];
  const source = await materializeSynchronousGraphWalkSourceFromAsyncRecords(
    (async function* () {
      yield a;
      yield b;
    })(),
    {
      getVertexId: async (item) => {
        calls.push(`id:${item.id}`);
        return item.id;
      },
      enumerateOutgoingLinks: async (item) => {
        calls.push(`outgoing:${item.id}`);
        return (async function* () {
          if (item === a) yield link;
        })();
      },
      rootVertexIds: (async function* () {
        calls.push('roots');
        yield 'a';
      })(),
    },
  );
  expect(source.vertexResolutionMode).toBe(
    'resolverWithOptionalInlineResolution',
  );
  expect(calls).toEqual(['id:a', 'outgoing:a', 'id:b', 'outgoing:b', 'roots']);
  link.toVertexId = 'unknown';
  const factory = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
  expect(
    [
      ...factory
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
        }),
    ].map((event) => event.edge.toVertexId),
  ).toEqual(['b']);
  const events = [];
  for await (const event of new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: source,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
    }))
    events.push(event);
  expect(events[0]!.edge.edgeData).toBe(relation);
  expect(calls).toHaveLength(5);
  expect(graphWalk.materializeSynchronousGraphWalkSourceFromAsyncRecords).toBe(
    materializeSynchronousGraphWalkSourceFromAsyncRecords,
  );
});

it('accepts synchronous async-adapter inputs and validates their captured membership', async () => {
  const source = await materializeSynchronousGraphWalkSourceFromAsyncRecords(
    [undefined],
    {
      getVertexId: (value) => value,
      enumerateOutgoingLinks: () => [],
      rootVertexIds: [undefined],
    },
  );
  expect(source.resolveVertexDataById!(undefined)).toEqual({
    kind: 'found',
    vertexData: undefined,
  });
  await expect(
    materializeSynchronousGraphWalkSourceFromAsyncRecords([NaN, NaN], {
      getVertexId: (value) => value,
      enumerateOutgoingLinks: () => [],
      rootVertexIds: [],
    }),
  ).rejects.toThrow(TypeError);
  await expect(
    materializeSynchronousGraphWalkSourceFromAsyncRecords(['a'], {
      getVertexId: (value) => value,
      enumerateOutgoingLinks: () => [],
      rootVertexIds: ['missing'],
    }),
  ).rejects.toThrow(TypeError);
  await expect(
    materializeSynchronousGraphWalkSourceFromAsyncRecords(['a'], {
      getVertexId: (value) => value,
      enumerateOutgoingLinks: () => [{ toVertexId: 'missing', edgeData: 1 }],
      rootVertexIds: [],
    }),
  ).rejects.toThrow(TypeError);
});

it.each([null, undefined, { exact: true }])(
  'retains exact synchronous and asynchronous selector failures %#',
  async (error) => {
    try {
      materializeGraphWalkSourceFromVertexRecords(['a'], {
        getVertexId: () => {
          throw error;
        },
        enumerateOutgoingLinks: () => [],
        rootVertexIds: [],
      });
      throw new Error('Expected failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    try {
      await materializeSynchronousGraphWalkSourceFromAsyncRecords(['a'], {
        getVertexId: (value) => value,
        enumerateOutgoingLinks: async () => {
          throw error;
        },
        rootVertexIds: [],
      });
      throw new Error('Expected failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
  },
);

function dagVertex<ID>(
  vertexId: ID,
  overrides: Partial<import('../src').DagVertexDeclaration<ID, ID>> = {},
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

it('walks cyclic definitions without DAG preparation or callback execution', () => {
  const a = dagVertex('a', {
    childDiscoverySlots: [{ kind: 'vertex', vertexId: 'b' }],
    workWaitsForWorkOf: ['missing'],
  });
  const b = dagVertex('b', {
    childDiscoverySlots: [{ kind: 'vertex', vertexId: 'a' }],
  });
  const definition = copyAndNormalizeDagDefinition({
    vertexDeclarations: [a, b],
    omittedVertexIds: [],
    entry: { kind: 'root', vertexId: 'a' },
  });
  expect(validateAndPrepareDagDefinition(definition).kind).toBe('invalid');
  const source = materializeGraphWalkSourceFromDagDeclarationRelations(
    definition,
    {
      includeDeclarationRelations: ['parentToChildSlots'],
    },
  );
  expect(source.vertexResolutionMode).toBe(
    'resolverWithOptionalInlineResolution',
  );
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  expect(
    [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
      }),
    ].map((event) => [
      event.edge.fromVertexId,
      event.edge.toVertexId,
      event.edge.edgeData,
    ]),
  ).toEqual([
    ['a', 'b', { kind: 'structuralChildSlot', childSlotIndex: 0 }],
    ['b', 'a', { kind: 'structuralChildSlot', childSlotIndex: 0 }],
  ]);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'explorationExhausted',
  });
  expect(graphWalk.materializeGraphWalkSourceFromDagDeclarationRelations).toBe(
    materializeGraphWalkSourceFromDagDeclarationRelations,
  );
});

it('projects selected DAG includeDeclarationRelations in canonical order with parallel childDiscoverySlots and dependent-to-prerequisite direction', () => {
  const definition = copyAndNormalizeDagDefinition({
    vertexDeclarations: [
      dagVertex('a', {
        childDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: null },
          { kind: 'vertex', vertexId: 'b' },
          { kind: 'vertex', vertexId: 'b' },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
        ],
        workWaitsForWorkOf: ['c', 'b', 'skip'],
        workWaitsForSubgraphCompletionOf: ['b', 'a', 'skip'],
      }),
      dagVertex('b'),
      dagVertex('c'),
    ],
    omittedVertexIds: ['skip'],
    entry: { kind: 'root', vertexId: 'a' },
  });
  const source = materializeGraphWalkSourceFromDagDeclarationRelations(
    definition,
    {
      includeDeclarationRelations: [
        'dependentToSubgraphCompletionPrerequisites',
        'dependentToWorkPrerequisites',
        'parentToChildSlots',
      ],
    },
  );
  const edges = [
    ...new GraphWalkBuilder({ graphWalkDiscoverySource: source })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
      }),
  ];
  expect(
    edges.map((event) => [
      event.edge.fromVertexId,
      event.edge.toVertexId,
      event.edge.edgeData,
      event.targetResolution.kind,
    ]),
  ).toEqual([
    ['a', 'b', { kind: 'structuralChildSlot', childSlotIndex: 1 }, 'found'],
    ['a', 'b', { kind: 'structuralChildSlot', childSlotIndex: 2 }, 'found'],
    [
      'a',
      'skip',
      { kind: 'structuralChildSlot', childSlotIndex: 3 },
      'omitted',
    ],
    ['a', 'c', { kind: 'workPrerequisite' }, 'found'],
    ['a', 'b', { kind: 'workPrerequisite' }, 'found'],
    ['a', 'skip', { kind: 'workPrerequisite' }, 'omitted'],
    ['a', 'b', { kind: 'subgraphCompletionPrerequisite' }, 'found'],
    ['a', 'a', { kind: 'subgraphCompletionPrerequisite' }, 'found'],
    ['a', 'skip', { kind: 'subgraphCompletionPrerequisite' }, 'omitted'],
  ]);
  expect(
    edges.map((event) => event.edge.sourceOutgoingLinkIndexBeforeFiltering),
  ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

it.each([
  'dependentToWorkPrerequisites',
  'dependentToSubgraphCompletionPrerequisites',
] as const)(
  'allows cyclic %s and ignores unselected missing relationships',
  (relation) => {
    const source = materializeGraphWalkSourceFromDagDeclarationRelations(
      copyAndNormalizeDagDefinition({
        vertexDeclarations: [
          dagVertex('a', {
            childDiscoverySlots: [{ kind: 'vertex', vertexId: 'unknown' }],
            workWaitsForWorkOf:
              relation === 'dependentToWorkPrerequisites' ? ['b'] : ['missing'],
            workWaitsForSubgraphCompletionOf:
              relation === 'dependentToSubgraphCompletionPrerequisites'
                ? ['b']
                : ['missing'],
          }),
          dagVertex('b', {
            workWaitsForWorkOf: ['a'],
            workWaitsForSubgraphCompletionOf: ['a'],
          }),
        ],
        omittedVertexIds: [],
        entry: { kind: 'root', vertexId: 'a' },
      }),
      { includeDeclarationRelations: [relation] },
    );
    const events = [
      ...new GraphWalkBuilder({ graphWalkDiscoverySource: source })
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
        }),
    ];
    expect(
      events.map((event) => [
        event.edge.fromVertexId,
        event.edge.toVertexId,
        event.edge.edgeData.kind,
      ]),
    ).toEqual([
      [
        'a',
        'b',
        relation === 'dependentToWorkPrerequisites'
          ? 'workPrerequisite'
          : 'subgraphCompletionPrerequisite',
      ],
      [
        'b',
        'a',
        relation === 'dependentToWorkPrerequisites'
          ? 'workPrerequisite'
          : 'subgraphCompletionPrerequisite',
      ],
    ]);
  },
);

it('copies mutable definitions and separates generated relationship wrappers across consumers', () => {
  const id = {},
    other = {};
  const data = { label: 'shared' };
  const childDiscoverySlots = [{ kind: 'vertex' as const, vertexId: other }];
  const workWaitsForWorkOf = [other],
    workWaitsForSubgraphCompletionOf = [other];
  const entry = { kind: 'root' as const, vertexId: id };
  const vertices = [
    {
      vertexId: id,
      data: data,
      childDiscoverySlots,
      workWaitsForWorkOf,
      workWaitsForSubgraphCompletionOf,
    },
    {
      vertexId: other,
      data: data,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
  ];
  const includeDeclarationRelations = [
    'parentToChildSlots',
    'dependentToWorkPrerequisites',
    'dependentToSubgraphCompletionPrerequisites',
  ] as const;
  const source = materializeGraphWalkSourceFromDagDeclarationRelations(
    { vertexDeclarations: vertices, omittedVertexIds: [], entry },
    { includeDeclarationRelations },
  );
  childDiscoverySlots[0]!.vertexId = {};
  childDiscoverySlots.length = 0;
  workWaitsForWorkOf.length = 0;
  workWaitsForSubgraphCompletionOf.length = 0;
  entry.vertexId = {};
  vertices.length = 0;
  const roots = [...source.enumerateRootTargets()];
  (roots[0] as any).vertexId = 'changed';
  const resolution = source.resolveVertexDataById!(id);
  (resolution as any).data = null;
  const links = [
    ...source.enumerateOutgoingLinks({ vertexId: id, vertexData: data }),
  ];
  (links[0]!.targetToResolveOnAdmission as any).vertexId = 'changed';
  (links[0]!.edgeData as any).childSlotIndex = 99;
  (links[1]!.edgeData as any).kind = 'changed';
  const factory = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
  for (
    let runUntilSuspendedOrTerminal = 0;
    runUntilSuspendedOrTerminal < 2;
    runUntilSuspendedOrTerminal++
  ) {
    const events = [
      ...factory
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
        }),
    ];
    expect(
      events.map((event) => [event.edge.toVertexId, event.edge.edgeData]),
    ).toEqual([
      [other, { kind: 'structuralChildSlot', childSlotIndex: 0 }],
      [other, { kind: 'workPrerequisite' }],
      [other, { kind: 'subgraphCompletionPrerequisite' }],
    ]);
    expect(events[0]!.fromVertex.vertexData).toBe(data);
    (events[0]!.edge.edgeData as any).kind = 'mutated';
  }
  expect(() => source.resolveVertexDataById!({})).toThrow(TypeError);
  expect(() =>
    source.enumerateOutgoingLinks({ vertexId: {}, vertexData: data }),
  ).toThrow(TypeError);
});

it('preserves forest root childDiscoverySlots, arbitrary identities and known omitted roots', () => {
  const object = {},
    symbol = Symbol('id');
  const ids: unknown[] = [undefined, null, NaN, -0, object, symbol];
  const source = materializeGraphWalkSourceFromDagDeclarationRelations(
    copyAndNormalizeDagDefinition({
      vertexDeclarations: ids.map((id) => dagVertex(id)),
      omittedVertexIds: ['skip'],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: null },
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
          ...ids.map((vertexId) => ({ kind: 'vertex' as const, vertexId })),
          { kind: 'vertex', vertexId: object },
        ],
      },
    }),
    { includeDeclarationRelations: ['parentToChildSlots'] },
  );
  expect(
    [...source.enumerateRootTargets()].map((root) => root.vertexId),
  ).toEqual(['skip', ...ids, object]);
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  expect(
    [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
      }),
    ].map((event) => event.vertex.vertexId),
  ).toEqual(ids);
  expect(
    runner.captureProgressSnapshot().counts.resolvedOmittedVertexIdCount,
  ).toBe(1);
  expect(source.resolveVertexDataById!('skip')).toEqual({ kind: 'omitted' });
  expect([
    ...source.enumerateOutgoingLinks({ vertexId: 'skip', vertexData: null }),
  ]).toEqual([]);
});

it('permits omitted root entries and empty entries without fabricating roots', () => {
  const omitted = materializeGraphWalkSourceFromDagDeclarationRelations(
    copyAndNormalizeDagDefinition({
      vertexDeclarations: [],
      omittedVertexIds: [undefined],
      entry: { kind: 'root', vertexId: undefined },
    }),
    { includeDeclarationRelations: ['parentToChildSlots'] },
  );
  expect([...omitted.enumerateRootTargets()]).toEqual([
    { vertexId: undefined },
  ]);
  expect([
    ...new GraphWalkBuilder({ graphWalkDiscoverySource: omitted })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
  const empty = materializeGraphWalkSourceFromDagDeclarationRelations(
    copyAndNormalizeDagDefinition({
      vertexDeclarations: [dagVertex('unreachable')],
      omittedVertexIds: ['skip'],
      entry: { kind: 'empty' },
    }),
    { includeDeclarationRelations: ['parentToChildSlots'] },
  );
  expect([...empty.enumerateRootTargets()]).toEqual([]);
  expect([
    ...new GraphWalkBuilder({ graphWalkDiscoverySource: empty })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
});

it.each([
  undefined,
  null,
  {},
  { includeDeclarationRelations: [] },
  { includeDeclarationRelations: 'parentToChildSlots' },
  { includeDeclarationRelations: ['unknown'] },
  { includeDeclarationRelations: [1] },
  { includeDeclarationRelations: ['parentToChildSlots', 'parentToChildSlots'] },
])(
  'requires explicit nonempty unique supported DAG includeDeclarationRelations %#',
  (options) => {
    const definition = copyAndNormalizeDagDefinition({
      vertexDeclarations: [],
      omittedVertexIds: [],
      entry: { kind: 'empty' },
    });
    expect(() =>
      materializeGraphWalkSourceFromDagDeclarationRelations(
        definition,
        options as any,
      ),
    ).toThrow(TypeError);
  },
);

it.each([
  {
    vertexDeclarations: [dagVertex('a'), dagVertex('a')],
    omittedVertexIds: [],
  },
  { vertexDeclarations: [dagVertex('a')], omittedVertexIds: ['a'] },
  { vertexDeclarations: [], omittedVertexIds: [NaN, NaN] },
])(
  'rejects inconsistent declared identities even with no selected edges %#',
  (records) => {
    expect(() =>
      materializeGraphWalkSourceFromDagDeclarationRelations<unknown, unknown>(
        { ...records, entry: { kind: 'empty' } },
        { includeDeclarationRelations: ['parentToChildSlots'] },
      ),
    ).toThrow(TypeError);
  },
);

it.each([
  { childDiscoverySlots: [{ kind: 'vertex', vertexId: 'unknown' }] },
  { childDiscoverySlots: [{ kind: 'vertex', vertexId: 'skip' }] },
  {
    childDiscoverySlots: [
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 'a' } },
    ],
  },
  {
    childDiscoverySlots: [
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 'unknown' } },
    ],
  },
] as const)(
  'validates selected child membership and live/omitted consistency %#',
  (overrides) => {
    const definition = copyAndNormalizeDagDefinition({
      vertexDeclarations: [dagVertex('a', overrides)],
      omittedVertexIds: ['skip'],
      entry: { kind: 'root', vertexId: 'a' },
    });
    expect(() =>
      materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
        includeDeclarationRelations: ['parentToChildSlots'],
      }),
    ).toThrow(TypeError);
    expect([
      ...new GraphWalkBuilder({
        graphWalkDiscoverySource:
          materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
            includeDeclarationRelations: ['dependentToWorkPrerequisites'],
          }),
      })
        .createIndependentRunnerFromCurrentOptions()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
        }),
    ]).toHaveLength(1);
  },
);

it.each([
  'dependentToWorkPrerequisites',
  'dependentToSubgraphCompletionPrerequisites',
] as const)(
  'validates missing selected %s endpoints in unreachable records',
  (relation) => {
    const definition = copyAndNormalizeDagDefinition({
      vertexDeclarations: [
        dagVertex('a', {
          workWaitsForWorkOf: ['missing'],
          workWaitsForSubgraphCompletionOf: ['missing'],
        }),
      ],
      omittedVertexIds: [],
      entry: { kind: 'empty' },
    });
    expect(() =>
      materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
        includeDeclarationRelations: [relation],
      }),
    ).toThrow(TypeError);
  },
);

it.each([
  { kind: 'root', vertexId: 'unknown' },
  {
    kind: 'roots',
    entryDiscoverySlots: [{ kind: 'vertex', vertexId: 'unknown' }],
  },
  {
    kind: 'roots',
    entryDiscoverySlots: [{ kind: 'vertex', vertexId: 'skip' }],
  },
  {
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 'a' } },
    ],
  },
  {
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 'unknown' } },
    ],
  },
] as const)(
  'always validates root membership and forest slot consistency %#',
  (entry) => {
    const definition = copyAndNormalizeDagDefinition({
      vertexDeclarations: [dagVertex('a')],
      omittedVertexIds: ['skip'],
      entry,
    });
    expect(() =>
      materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
        includeDeclarationRelations: ['dependentToWorkPrerequisites'],
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
  const definition = copyAndNormalizeDagDefinition({
    vertexDeclarations: [
      {
        vertexId: 'task',
        data: task,
        childDiscoverySlots: [],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [],
    entry: { kind: 'root', vertexId: 'task' },
  });
  const source = materializeGraphWalkSourceFromDagDeclarationRelations(
    definition,
    {
      includeDeclarationRelations: ['parentToChildSlots'],
    },
  );
  const syncEvents = [
    ...new GraphWalkBuilder({ graphWalkDiscoverySource: source })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
      }),
  ];
  expect(syncEvents[0]!.vertex.vertexData).toBe(task);
  const asyncEvents = [];
  for await (const event of new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: source,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
    }))
    asyncEvents.push(event);
  expect(asyncEvents[0]!.vertex.vertexData).toBe(task);
  expect(calls).toBe(0);
});

it('copies async links as they are yielded, before the iterator reuses its wrapper', async () => {
  const link = { toVertexId: 'b', edgeData: { kind: 'first' } };
  const first = link.edgeData;
  const source = await materializeSynchronousGraphWalkSourceFromAsyncRecords(
    ['a', 'b', 'c'],
    {
      getVertexId: (id) => id,
      enumerateOutgoingLinks: (id) =>
        (async function* () {
          if (id !== 'a') return;
          yield link;
          link.toVertexId = 'c';
          link.edgeData = { kind: 'second' };
          yield link;
        })(),
      rootVertexIds: ['a'],
    },
  );
  const events = [
    ...new GraphWalkBuilder({ graphWalkDiscoverySource: source })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
      }),
  ];
  expect(events.map((event) => event.edge.toVertexId)).toEqual(['b', 'c']);
  expect(events[0]!.edge.edgeData).toBe(first);
  expect(events[1]!.edge.edgeData).toBe(link.edgeData);
});
