import {
  bindAsyncDagExternalWorkSession,
  DagVisitorPhase,
  copyAndNormalizeDagDefinition,
  diffDagDefinitionDeclarationsShallowly,
  validateAndPrepareDagDefinition,
  applyDagDefinitionRevisionBatch,
  type DagDefinition,
  type DagStructuralDiscoverySlot,
  type DagDefinitionVertex,
  type DagRevisionOperation,
} from '../src';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

const vertex = <ID>(
  vertexId: ID,
  patch: Partial<DagDefinitionVertex<unknown, ID>> = {},
): DagDefinitionVertex<unknown, ID> => ({
  vertexId,
  data: undefined,
  childDiscoverySlots: [],
  workWaitsForWorkOf: [],
  workWaitsForSubgraphCompletionOf: [],
  ...patch,
});

const definition = <ID>(
  vertices: readonly DagDefinitionVertex<unknown, ID>[],
  patch: Partial<DagDefinition<unknown, ID>> = {},
): DagDefinition<unknown, ID> =>
  copyAndNormalizeDagDefinition({
    vertexDeclarations: vertices,
    omittedVertexIds: [],
    entry: { kind: 'empty' },
    ...patch,
  });

const unchanged = {
  addedVertexDeclarationIds: [],
  removedVertexDeclarationIds: [],
  changedVertexDeclarations: [],
  vertexDeclarationSequenceChanged: false,
  entryChanged: false,
  omittedVertexIdSequenceChanged: false,
};

describe('diffDagDefinitionDeclarationsShallowly', () => {
  test('reports no changes for separately copied equivalent declarations', () => {
    const data = { mutable: true };
    const before = definition([vertex('task', { data })]);
    const after = definition([vertex('task', { data })]);
    expect(diffDagDefinitionDeclarationsShallowly(before, after)).toEqual(
      unchanged,
    );
    expect(
      diffDagDefinitionDeclarationsShallowly(definition([]), definition([])),
    ).toEqual(unchanged);
  });

  test('orders removals and retained changes by old order, additions by new order', () => {
    const removed = {};
    const added = Symbol('added');
    const before = definition([
      vertex<unknown>('second', { data: 1 }),
      vertex<unknown>(removed),
      vertex<unknown>('first', { data: 1 }),
      vertex<unknown>(undefined),
    ]);
    const after = definition([
      vertex<unknown>(added),
      vertex<unknown>('first', { data: 2 }),
      vertex<unknown>(NaN),
      vertex<unknown>('second', { data: 2 }),
    ]);
    const diff = diffDagDefinitionDeclarationsShallowly(before, after);
    expect(diff).toEqual({
      ...unchanged,
      addedVertexDeclarationIds: [added, NaN],
      removedVertexDeclarationIds: [removed, undefined],
      changedVertexDeclarations: [
        { vertexId: 'second', changedDeclarationFields: ['data'] },
        { vertexId: 'first', changedDeclarationFields: ['data'] },
      ],
      vertexDeclarationSequenceChanged: true,
    });
    expect(diff.removedVertexDeclarationIds[0]).toBe(removed);
    expect(diff.addedVertexDeclarationIds[0]).toBe(added);
  });

  test('reports vertex reorder without reporting record changes', () => {
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex('a'), vertex('b')]),
        definition([vertex('b'), vertex('a')]),
      ),
    ).toEqual({ ...unchanged, vertexDeclarationSequenceChanged: true });
  });

  test('lists changed aspects in a fixed order and keeps W and C distinct', () => {
    const before = definition([
      vertex('task', {
        data: { version: 1 },
        childDiscoverySlots: [{ kind: 'vertex', vertexId: 'old' }],
        workWaitsForWorkOf: ['a', 'b'],
        workWaitsForSubgraphCompletionOf: ['a', 'b'],
      }),
    ]);
    const after = definition([
      vertex('task', {
        data: { version: 1 },
        childDiscoverySlots: [{ kind: 'vertex', vertexId: 'new' }],
        workWaitsForWorkOf: ['b', 'a'],
        workWaitsForSubgraphCompletionOf: ['b', 'a'],
      }),
    ]);
    expect(
      diffDagDefinitionDeclarationsShallowly(before, after)
        .changedVertexDeclarations,
    ).toEqual([
      {
        vertexId: 'task',
        changedDeclarationFields: [
          'data',
          'childDiscoverySlots',
          'workWaitsForWorkOf',
          'workWaitsForSubgraphCompletionOf',
        ],
      },
    ]);
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex('task', { workWaitsForWorkOf: ['a'] })]),
        definition([
          vertex('task', { workWaitsForSubgraphCompletionOf: ['a'] }),
        ]),
      ).changedVertexDeclarations,
    ).toEqual([
      {
        vertexId: 'task',
        changedDeclarationFields: [
          'workWaitsForWorkOf',
          'workWaitsForSubgraphCompletionOf',
        ],
      },
    ]);
  });

  test('compares all ID positions with SameValueZero while preserving opaque identity', () => {
    const id = {};
    const slot = Symbol('slot');
    const before = definition(
      [
        vertex<unknown>(NaN, {
          childDiscoverySlots: [
            { kind: 'vertex', vertexId: id },
            { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
            { kind: 'omitted', omittedVertexIdentity: null },
          ],
          workWaitsForWorkOf: [NaN, -0, id, slot],
          workWaitsForSubgraphCompletionOf: [undefined],
        }),
      ],
      {
        omittedVertexIds: [undefined, -0],
        entry: { kind: 'root', vertexId: NaN },
      },
    );
    const after = definition(
      [
        vertex<unknown>(NaN, {
          childDiscoverySlots: [
            { kind: 'vertex', vertexId: id },
            { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
            { kind: 'omitted', omittedVertexIdentity: null },
          ],
          workWaitsForWorkOf: [NaN, +0, id, slot],
          workWaitsForSubgraphCompletionOf: [undefined],
        }),
      ],
      {
        omittedVertexIds: [undefined, +0],
        entry: { kind: 'root', vertexId: NaN },
      },
    );
    expect(diffDagDefinitionDeclarationsShallowly(before, after)).toEqual(
      unchanged,
    );
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex(-0)]),
        definition([vertex(+0)]),
      ),
    ).toEqual(unchanged);
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex(id)]),
        definition([vertex({})]),
      ),
    ).toMatchObject({
      addedVertexDeclarationIds: [{}],
      removedVertexDeclarationIds: [id],
      vertexDeclarationSequenceChanged: true,
    });
  });

  test('uses Object.is for data without traversing or freezing opaque values', () => {
    const data = { nested: { version: 1 } };
    const before = definition([vertex('task', { data })]);
    data.nested.version = 2;
    expect(
      diffDagDefinitionDeclarationsShallowly(
        before,
        definition([vertex('task', { data })]),
      ),
    ).toEqual(unchanged);
    expect(
      diffDagDefinitionDeclarationsShallowly(
        before,
        definition([
          vertex('task', {
            data: { nested: { version: 2 } },
          }),
        ]),
      ),
    ).toMatchObject({
      changedVertexDeclarations: [
        { vertexId: 'task', changedDeclarationFields: ['data'] },
      ],
    });
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex('task', { data: NaN })]),
        definition([vertex('task', { data: NaN })]),
      ),
    ).toEqual(unchanged);
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex('task', { data: -0 })]),
        definition([vertex('task', { data: +0 })]),
      ).changedVertexDeclarations,
    ).toEqual([{ vertexId: 'task', changedDeclarationFields: ['data'] }]);
    const opaque = {
      get nested(): never {
        throw new Error('do not traverse data');
      },
    };
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex('task', { data: opaque })]),
        definition([vertex('task', { data: opaque })]),
      ),
    ).toEqual(unchanged);
    expect(Object.isFrozen(data)).toBe(false);
  });

  test.each<
    [
      DagStructuralDiscoverySlot<unknown>[],
      DagStructuralDiscoverySlot<unknown>[],
    ]
  >([
    [[{ kind: 'vertex', vertexId: 'a' }], []],
    [[{ kind: 'vertex', vertexId: 'a' }], [{ kind: 'vertex', vertexId: 'b' }]],
    [
      [{ kind: 'vertex', vertexId: undefined }],
      [{ kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } }],
    ],
    [
      [{ kind: 'omitted', omittedVertexIdentity: null }],
      [{ kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } }],
    ],
    [
      [{ kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } }],
      [{ kind: 'omitted', omittedVertexIdentity: null }],
    ],
    [
      [{ kind: 'omitted', omittedVertexIdentity: { vertexId: 'a' } }],
      [{ kind: 'omitted', omittedVertexIdentity: { vertexId: 'b' } }],
    ],
    [
      [
        { kind: 'vertex', vertexId: 'a' },
        { kind: 'vertex', vertexId: 'b' },
      ],
      [
        { kind: 'vertex', vertexId: 'b' },
        { kind: 'vertex', vertexId: 'a' },
      ],
    ],
  ])('reports ordered slot changes (%#)', (slots, nextSlots) => {
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([vertex<unknown>('task', { childDiscoverySlots: slots })]),
        definition([
          vertex<unknown>('task', { childDiscoverySlots: nextSlots }),
        ]),
      ).changedVertexDeclarations,
    ).toEqual([
      { vertexId: 'task', changedDeclarationFields: ['childDiscoverySlots'] },
    ]);
  });

  test.each<
    [
      DagDefinition<unknown, unknown>['entry'],
      DagDefinition<unknown, unknown>['entry'],
      boolean,
    ]
  >([
    [{ kind: 'empty' }, { kind: 'empty' }, false],
    [
      { kind: 'root', vertexId: undefined },
      { kind: 'root', vertexId: undefined },
      false,
    ],
    [{ kind: 'root', vertexId: undefined }, { kind: 'empty' }, true],
    [{ kind: 'root', vertexId: 'a' }, { kind: 'root', vertexId: 'b' }, true],
    [{ kind: 'roots', entryDiscoverySlots: [] }, { kind: 'empty' }, true],
    [
      {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
        ],
      },
      {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
        ],
      },
      false,
    ],
    [
      {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'vertex', vertexId: 'a' },
          { kind: 'vertex', vertexId: 'b' },
        ],
      },
      {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'vertex', vertexId: 'b' },
          { kind: 'vertex', vertexId: 'a' },
        ],
      },
      true,
    ],
  ])(
    'compares entry mode and ordered entry contents (%#)',
    (entry, nextEntry, changed) => {
      expect(
        diffDagDefinitionDeclarationsShallowly(
          definition<unknown>([], { entry }),
          definition<unknown>([], { entry: nextEntry }),
        ),
      ).toEqual({ ...unchanged, entryChanged: changed });
    },
  );

  test('distinguishes a known omission from a live structural slot', () => {
    expect(
      diffDagDefinitionDeclarationsShallowly(
        definition([
          vertex<unknown>('task', {
            childDiscoverySlots: [
              {
                kind: 'omitted',
                omittedVertexIdentity: { vertexId: undefined },
              },
            ],
          }),
        ]),
        definition([
          vertex<unknown>('task', {
            childDiscoverySlots: [{ kind: 'vertex', vertexId: undefined }],
          }),
        ]),
      ).changedVertexDeclarations,
    ).toEqual([
      { vertexId: 'task', changedDeclarationFields: ['childDiscoverySlots'] },
    ]);
  });

  test('reports omission declaration ordering and membership changes', () => {
    const before = definition<unknown>([], {
      omittedVertexIds: [undefined, NaN],
    });
    for (const omittedVertexIds of [
      [NaN, undefined],
      [undefined],
      [undefined, {}],
    ]) {
      expect(
        diffDagDefinitionDeclarationsShallowly(
          before,
          definition([], { omittedVertexIds }),
        ),
      ).toEqual({ ...unchanged, omittedVertexIdSequenceChanged: true });
    }
  });

  test('owns immutable result wrappers while retaining caller ID references', () => {
    const id = {};
    const before = definition([vertex(id, { data: 1 })]);
    const after = definition([vertex(id, { data: 2 })]);
    const diff = diffDagDefinitionDeclarationsShallowly(before, after);
    expect(diff.changedVertexDeclarations[0]!.vertexId).toBe(id);
    expect(Object.isFrozen(diff)).toBe(true);
    expect(Object.isFrozen(diff.addedVertexDeclarationIds)).toBe(true);
    expect(Object.isFrozen(diff.removedVertexDeclarationIds)).toBe(true);
    expect(Object.isFrozen(diff.changedVertexDeclarations)).toBe(true);
    expect(Object.isFrozen(diff.changedVertexDeclarations[0])).toBe(true);
    expect(
      Object.isFrozen(
        diff.changedVertexDeclarations[0]!.changedDeclarationFields,
      ),
    ).toBe(true);
    expect(Object.isFrozen(id)).toBe(false);
    expect(diffDagDefinitionDeclarationsShallowly(before, before)).toEqual(
      unchanged,
    );
  });
});

describe('applyDagDefinitionRevisionBatch', () => {
  test('rejects a dangling prerequisite without touching the original session', () => {
    const result = validateAndPrepareDagDefinition(
      definition(
        [
          vertex('review', { workWaitsForWorkOf: ['research'] }),
          vertex('research'),
        ],
        { entry: { kind: 'root', vertexId: 'review' } },
      ),
    );
    if (result.kind !== 'valid') throw new Error('Expected valid fixture');
    const original = result.validatedTopology;
    const before = original.createExternalWorkSession();
    expect(
      applyDagDefinitionRevisionBatch(original, [
        { kind: 'removeVertexDeclaration', vertexId: 'research' },
      ]),
    ).toMatchObject({
      kind: 'invalid',
      issues: [{ kind: 'milestoneDependencyStall' }],
    });
    expect(
      original.definition.vertexDeclarations.map((v) => v.vertexId),
    ).toEqual(['review', 'research']);
    expect(before.runUntilWorkBoundary()).toMatchObject({
      kind: 'awaitingSettlement',
      workSettlementTickets: [{ vertexId: 'research' }],
    });
  });
});

const prepared = <ID>(
  vertices: readonly DagDefinitionVertex<unknown, ID>[],
  patch: Partial<DagDefinition<unknown, ID>> = {},
) => {
  const result = validateAndPrepareDagDefinition(
    definition(vertices, {
      entry: {
        kind: 'roots',
        entryDiscoverySlots: vertices.map((v) => ({
          kind: 'vertex',
          vertexId: v.vertexId,
        })),
      },
      ...patch,
    }),
  );
  if (result.kind !== 'valid') throw new Error('Expected valid fixture');
  return result.validatedTopology;
};

const rawOperations = <ID = unknown>(value: unknown) =>
  value as readonly DagRevisionOperation<unknown, ID>[];

describe('ordered atomic revisions', () => {
  test('validates only the final candidate after temporarily dangling edits', () => {
    const original = prepared(
      [
        vertex('review', {
          workWaitsForWorkOf: ['research'],
          workWaitsForSubgraphCompletionOf: ['research'],
        }),
        vertex('research'),
      ],
      { entry: { kind: 'root', vertexId: 'review' } },
    );
    const result = applyDagDefinitionRevisionBatch(original, [
      { kind: 'removeVertexDeclaration', vertexId: 'research' },
      { kind: 'replaceVertexDeclaration', vertexDeclaration: vertex('review') },
    ]);
    expect(result.kind).toBe('valid');
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.validatedTopology.definition.vertexDeclarations).toEqual([
      vertex('review'),
    ]);
    expect(result.changes).toEqual({
      ...unchanged,
      removedVertexDeclarationIds: ['research'],
      changedVertexDeclarations: [
        {
          vertexId: 'review',
          changedDeclarationFields: [
            'workWaitsForWorkOf',
            'workWaitsForSubgraphCompletionOf',
          ],
        },
      ],
      vertexDeclarationSequenceChanged: true,
    });
    expect(
      result.validatedTopology
        .createExternalWorkSession()
        .runUntilWorkBoundary(),
    ).toMatchObject({
      kind: 'awaitingSettlement',
      workSettlementTickets: [{ vertexId: 'review' }],
    });
    expect(
      original.createExternalWorkSession().runUntilWorkBoundary(),
    ).toMatchObject({
      kind: 'awaitingSettlement',
      workSettlementTickets: [{ vertexId: 'research' }],
    });
  });

  test('retains replacement position, appends additions and applies repeated edits in order', () => {
    const original = prepared([vertex('a'), vertex('b'), vertex('c')]);
    const result = applyDagDefinitionRevisionBatch(original, [
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: vertex('c', { data: 1 }),
      },
      { kind: 'removeVertexDeclaration', vertexId: 'b' },
      {
        kind: 'addVertexDeclaration',
        vertexDeclaration: vertex('b', { data: 'new' }),
      },
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: vertex('c', { data: 2 }),
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(
      result.validatedTopology.definition.vertexDeclarations.map((v) => [
        v.vertexId,
        v.data,
      ]),
    ).toEqual([
      ['a', undefined],
      ['c', 2],
      ['b', 'new'],
    ]);
    expect(result.changes).toEqual({
      ...unchanged,
      changedVertexDeclarations: [
        { vertexId: 'b', changedDeclarationFields: ['data'] },
        { vertexId: 'c', changedDeclarationFields: ['data'] },
      ],
      vertexDeclarationSequenceChanged: true,
    });
    expect(original.definition.vertexDeclarations.map((v) => v.data)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  test('can replace a root with its child without removing descendants implicitly', () => {
    const original = prepared(
      [
        vertex('root', {
          childDiscoverySlots: [{ kind: 'vertex', vertexId: 'child' }],
        }),
        vertex('child'),
      ],
      { entry: { kind: 'root', vertexId: 'root' } },
    );
    const invalid = applyDagDefinitionRevisionBatch(original, [
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
    ]);
    expect(invalid).toEqual({
      kind: 'invalid',
      issues: [
        { kind: 'invalidEntry', reason: 'unknownRoot', vertexIds: ['root'] },
        { kind: 'outsideEntryDiscoveryClosure', vertexIds: ['child'] },
      ],
    });
    const result = applyDagDefinitionRevisionBatch(original, [
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
      {
        kind: 'replaceEntryDeclaration',
        entry: { kind: 'root', vertexId: 'child' },
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.validatedTopology.definition.vertexDeclarations).toEqual([
      vertex('child'),
    ]);
    expect(result.changes).toEqual({
      ...unchanged,
      removedVertexDeclarationIds: ['root'],
      vertexDeclarationSequenceChanged: true,
      entryChanged: true,
    });
    expect(
      original.createExternalWorkSession().runUntilWorkBoundary(),
    ).toMatchObject({
      kind: 'awaitingSettlement',
      workSettlementTickets: [{ vertexId: 'root' }, { vertexId: 'child' }],
    });
  });

  test('can remove every live record and replace the entry with empty', () => {
    const original = prepared([vertex('root')], {
      entry: { kind: 'root', vertexId: 'root' },
    });
    const result = applyDagDefinitionRevisionBatch(original, [
      { kind: 'replaceEntryDeclaration', entry: { kind: 'empty' } },
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.validatedTopology.definition).toEqual({
      vertexDeclarations: [],
      omittedVertexIds: [],
      entry: { kind: 'empty' },
    });
    expect(
      result.validatedTopology
        .createExternalWorkSession()
        .runUntilWorkBoundary().kind,
    ).toBe('finished');
  });

  test('can replace omitted identities and entry slots in one batch', () => {
    const original = prepared<unknown>([vertex('root')], {
      omittedVertexIds: ['old'],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'old' } },
          { kind: 'vertex', vertexId: 'root' },
        ],
      },
    });
    const result = applyDagDefinitionRevisionBatch(original, [
      { kind: 'replaceOmittedVertexIds', omittedVertexIds: [undefined] },
      {
        kind: 'replaceEntryDeclaration',
        entry: {
          kind: 'roots',
          entryDiscoverySlots: [
            { kind: 'vertex', vertexId: 'root' },
            { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
          ],
        },
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.changes).toEqual({
      ...unchanged,
      entryChanged: true,
      omittedVertexIdSequenceChanged: true,
    });
    expect(result.validatedTopology.definition.omittedVertexIds).toEqual([
      undefined,
    ]);
    expect(original.definition.omittedVertexIds).toEqual(['old']);
  });

  test('an empty batch creates a fresh unseeded prepared DAG and session', () => {
    const original = prepared([vertex('task')]);
    const old = original.createExternalWorkSession({
      acceptedCompletedWorkVertexIds: new Set(['task']),
    });
    expect(old.runUntilWorkBoundary().kind).toBe('finished');
    const result = applyDagDefinitionRevisionBatch(original, []);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.validatedTopology).not.toBe(original);
    expect(result.validatedTopology.definition).not.toBe(original.definition);
    expect(result.validatedTopology.definition.vertexDeclarations[0]).not.toBe(
      original.definition.vertexDeclarations[0],
    );
    expect(result.changes).toEqual(unchanged);
    expect(
      result.validatedTopology
        .createExternalWorkSession()
        .runUntilWorkBoundary(),
    ).toMatchObject({
      kind: 'awaitingSettlement',
      workSettlementTickets: [{ vertexId: 'task' }],
    });
    expect(old.runUntilWorkBoundary().kind).toBe('finished');
  });

  test.each([
    {
      name: 'unreachable addition',
      operations: [
        { kind: 'addVertexDeclaration', vertexDeclaration: vertex('extra') },
      ],
      issue: 'outsideEntryDiscoveryClosure',
    },
    {
      name: 'dangling structural child',
      operations: [
        {
          kind: 'replaceVertexDeclaration',
          vertexDeclaration: vertex('root', {
            childDiscoverySlots: [{ kind: 'vertex', vertexId: 'missing' }],
          }),
        },
      ],
      issue: 'missingStructuralEndpoint',
    },
    {
      name: 'structural cycle',
      operations: [
        {
          kind: 'replaceVertexDeclaration',
          vertexDeclaration: vertex('root', {
            childDiscoverySlots: [{ kind: 'vertex', vertexId: 'root' }],
          }),
        },
      ],
      issue: 'structuralChildCycleComponent',
    },
    {
      name: 'work cycle',
      operations: [
        {
          kind: 'replaceVertexDeclaration',
          vertexDeclaration: vertex('root', { workWaitsForWorkOf: ['root'] }),
        },
      ],
      issue: 'milestoneDependencyStall',
    },
    {
      name: 'completion cycle',
      operations: [
        {
          kind: 'replaceVertexDeclaration',
          vertexDeclaration: vertex('root', {
            workWaitsForSubgraphCompletionOf: ['root'],
          }),
        },
      ],
      issue: 'milestoneDependencyStall',
    },
    {
      name: 'unknown omission reference',
      operations: [
        {
          kind: 'replaceVertexDeclaration',
          vertexDeclaration: vertex('root', {
            childDiscoverySlots: [
              {
                kind: 'omitted',
                omittedVertexIdentity: { vertexId: 'missing' },
              },
            ],
          }),
        },
      ],
      issue: 'omissionIdentityNotDeclared',
    },
  ])(
    'returns graph issues for $name and preserves old topology and work',
    ({ operations, issue }) => {
      const original = prepared([vertex('root')], {
        entry: { kind: 'root', vertexId: 'root' },
      });
      const session = original.createExternalWorkSession();
      const before = original.definition;
      expect(
        applyDagDefinitionRevisionBatch(
          original,
          rawOperations<string>(operations),
        ),
      ).toMatchObject({
        kind: 'invalid',
        issues: [expect.objectContaining({ kind: issue })],
      });
      expect(original.definition).toBe(before);
      expect(original.definition.vertexDeclarations).toEqual([vertex('root')]);
      expect(session.runUntilWorkBoundary()).toMatchObject({
        kind: 'awaitingSettlement',
        workSettlementTickets: [{ vertexId: 'root' }],
      });
    },
  );

  test.each([
    { kind: 'addVertexDeclaration', vertexDeclaration: vertex('root') },
    { kind: 'replaceVertexDeclaration', vertexDeclaration: vertex('unknown') },
    { kind: 'removeVertexDeclaration', vertexId: 'unknown' },
    { kind: 'replaceOmittedVertexIds', omittedVertexIds: ['root'] },
    { kind: 'replaceOmittedVertexIds', omittedVertexIds: ['x', 'x'] },
  ])(
    'throws on programmer error $kind without adopting preceding edits',
    (operation) => {
      const original = prepared([vertex('root')]);
      const session = original.createExternalWorkSession();
      expect(() =>
        applyDagDefinitionRevisionBatch(
          original,
          rawOperations<string>([
            {
              kind: 'replaceVertexDeclaration',
              vertexDeclaration: vertex('root', { data: 'candidate' }),
            },
            operation,
          ]),
        ),
      ).toThrow(TypeError);
      expect(original.definition.vertexDeclarations[0]!.data).toBeUndefined();
      expect(session.runUntilWorkBoundary()).toMatchObject({
        kind: 'awaitingSettlement',
        workSettlementTickets: [{ vertexId: 'root' }],
      });
    },
  );

  test('allows a temporary live/omitted collision repaired before validation', () => {
    const original = prepared([vertex('root')]);
    const result = applyDagDefinitionRevisionBatch(original, [
      { kind: 'replaceOmittedVertexIds', omittedVertexIds: ['root'] },
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
      { kind: 'replaceEntryDeclaration', entry: { kind: 'empty' } },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.validatedTopology.definition).toEqual({
      vertexDeclarations: [],
      omittedVertexIds: ['root'],
      entry: { kind: 'empty' },
    });
  });

  test('preserves SameValueZero IDs, own undefined and distinct object identity', () => {
    const id = {};
    const other = {};
    const symbol = Symbol('task');
    const original = prepared<unknown>([
      vertex(NaN),
      vertex(-0),
      vertex(undefined),
      vertex(id),
      vertex(symbol),
      vertex(other),
    ]);
    const result = applyDagDefinitionRevisionBatch(original, [
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: vertex(NaN, { data: 'nan' }),
      },
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: vertex(+0, { data: 'zero' }),
      },
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: vertex(id, { data: 'object' }),
      },
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: vertex(symbol, { data: 'symbol' }),
      },
      { kind: 'removeVertexDeclaration', vertexId: undefined },
      {
        kind: 'replaceEntryDeclaration',
        entry: {
          kind: 'roots',
          entryDiscoverySlots: [NaN, +0, id, symbol, other].map((vertexId) => ({
            kind: 'vertex',
            vertexId,
          })),
        },
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(
      result.validatedTopology.definition.vertexDeclarations.map((v) => v.data),
    ).toEqual(['nan', 'zero', 'object', 'symbol', undefined]);
    expect(
      result.validatedTopology.definition.vertexDeclarations[2]!.vertexId,
    ).toBe(id);
    expect(
      result.validatedTopology.definition.vertexDeclarations[4]!.vertexId,
    ).toBe(other);
    expect(result.changes.removedVertexDeclarationIds).toEqual([undefined]);
    expect(() =>
      applyDagDefinitionRevisionBatch(original, [
        { kind: 'addVertexDeclaration', vertexDeclaration: vertex(NaN) },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      applyDagDefinitionRevisionBatch(original, [
        { kind: 'addVertexDeclaration', vertexDeclaration: vertex(+0) },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      applyDagDefinitionRevisionBatch(
        original,
        rawOperations<string>([{ kind: 'removeVertexDeclaration' }]),
      ),
    ).toThrow(TypeError);
  });

  test.each([
    null,
    {},
    'operations',
    [null],
    [false],
    [[]],
    [{ kind: 'unresolved' }],
    [Object.create({ kind: 'removeVertexDeclaration', vertexId: undefined })],
    [{ kind: 'removeVertexDeclaration' }],
    [{ kind: 'replaceVertexDeclaration' }],
    [{ kind: 'addVertexDeclaration', vertexDeclaration: null }],
    [
      {
        kind: 'addVertexDeclaration',
        vertexDeclaration: {
          data: undefined,
          childDiscoverySlots: [],
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        },
      },
    ],
    [{ kind: 'replaceEntryDeclaration', entry: { kind: 'root' } }],
    [{ kind: 'replaceOmittedVertexIds', omittedVertexIds: null }],
    [{ kind: 'replaceEntryDeclaration' }],
    [{ kind: 'replaceOmittedVertexIds' }],
  ])(
    'rejects malformed operation shapes (%#) without mutating original',
    (value) => {
      const original = prepared<unknown>([vertex(undefined)]);
      expect(() =>
        applyDagDefinitionRevisionBatch(original, rawOperations(value)),
      ).toThrow(TypeError);
      expect(
        original.createExternalWorkSession().runUntilWorkBoundary(),
      ).toMatchObject({
        kind: 'awaitingSettlement',
        workSettlementTickets: [{ vertexId: undefined }],
      });
    },
  );

  test('reads caller getters once, copies owned topology and never freezes opaque data or IDs', () => {
    const id = { task: 'new' };
    const data = { version: 1 };
    const original = prepared<unknown>([vertex(id)]);
    const reads: string[] = [];
    const slots: DagStructuralDiscoverySlot<unknown>[] = [];
    const workWaitsForWorkOf: unknown[] = [];
    const replacement = {
      get vertexId() {
        reads.push('vertexId');
        return id;
      },
      get data() {
        reads.push('data');
        return data;
      },
      get childDiscoverySlots() {
        reads.push('childDiscoverySlots');
        return slots;
      },
      get workWaitsForWorkOf() {
        reads.push('workWaitsForWorkOf');
        return workWaitsForWorkOf;
      },
      get workWaitsForSubgraphCompletionOf() {
        reads.push('workWaitsForSubgraphCompletionOf');
        return [];
      },
    };
    const result = applyDagDefinitionRevisionBatch(original, [
      {
        get kind() {
          reads.push('kind');
          return 'replaceVertexDeclaration' as const;
        },
        get vertexDeclaration() {
          reads.push('vertexDeclaration');
          return replacement;
        },
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(reads).toEqual([
      'kind',
      'vertexDeclaration',
      'vertexId',
      'data',
      'childDiscoverySlots',
      'workWaitsForWorkOf',
      'workWaitsForSubgraphCompletionOf',
    ]);
    slots.push({ kind: 'vertex', vertexId: 'late' });
    workWaitsForWorkOf.push('late');
    data.version = 2;
    id.task = 'changed';
    expect(result.validatedTopology.definition.vertexDeclarations[0]).toEqual({
      vertexId: id,
      data,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    });
    expect(
      result.validatedTopology.definition.vertexDeclarations[0]!.data,
    ).toBe(data);
    expect(
      result.validatedTopology.definition.vertexDeclarations[0]!.vertexId,
    ).toBe(id);
    expect(Object.isFrozen(replacement)).toBe(false);
    expect(Object.isFrozen(data)).toBe(false);
    expect(Object.isFrozen(id)).toBe(false);
    expect(
      Object.isFrozen(
        result.validatedTopology.definition.vertexDeclarations[0],
      ),
    ).toBe(true);
  });

  test.each([
    'kind',
    'vertexDeclaration',
    'vertexId',
    'data',
    'childDiscoverySlots',
    'workWaitsForWorkOf',
    'workWaitsForSubgraphCompletionOf',
    'entry',
    'omittedVertexIds',
  ])('propagates exact caller getter errors at %s', (field) => {
    const error = { field };
    const original = prepared([vertex('root')]);
    const replacement = vertex('root');
    const operation: Record<string, unknown> =
      field === 'entry'
        ? { kind: 'replaceEntryDeclaration' }
        : field === 'omittedVertexIds'
        ? { kind: 'replaceOmittedVertexIds' }
        : { kind: 'replaceVertexDeclaration', vertexDeclaration: replacement };
    Object.defineProperty(
      [
        'vertexId',
        'data',
        'childDiscoverySlots',
        'workWaitsForWorkOf',
        'workWaitsForSubgraphCompletionOf',
      ].includes(field)
        ? replacement
        : operation,
      field,
      {
        get() {
          throw error;
        },
      },
    );
    let caught: unknown;
    try {
      applyDagDefinitionRevisionBatch(
        original,
        rawOperations<string>([operation]),
      );
    } catch (value) {
      caught = value;
    }
    expect(caught).toBe(error);
    expect(
      original.createExternalWorkSession().runUntilWorkBoundary(),
    ).toMatchObject({
      kind: 'awaitingSettlement',
      workSettlementTickets: [{ vertexId: 'root' }],
    });
  });
});

test('adds a new reachable vertex with explicit parent and prerequisite edits', () => {
  const original = prepared([vertex('root')], {
    entry: { kind: 'root', vertexId: 'root' },
  });
  const result = applyDagDefinitionRevisionBatch(original, [
    {
      kind: 'addVertexDeclaration',
      vertexDeclaration: vertex('new', { data: 'added' }),
    },
    {
      kind: 'replaceVertexDeclaration',
      vertexDeclaration: vertex('root', {
        childDiscoverySlots: [{ kind: 'vertex', vertexId: 'new' }],
        workWaitsForWorkOf: ['new'],
      }),
    },
  ]);
  if (result.kind !== 'valid') throw new Error('Expected revision');
  expect(result.changes).toEqual({
    ...unchanged,
    addedVertexDeclarationIds: ['new'],
    vertexDeclarationSequenceChanged: true,
    changedVertexDeclarations: [
      {
        vertexId: 'root',
        changedDeclarationFields: ['childDiscoverySlots', 'workWaitsForWorkOf'],
      },
    ],
  });
  expect(
    result.validatedTopology.createExternalWorkSession().runUntilWorkBoundary(),
  ).toMatchObject({
    kind: 'awaitingSettlement',
    workSettlementTickets: [{ vertexId: 'new' }],
  });
  expect(
    original.createExternalWorkSession().runUntilWorkBoundary(),
  ).toMatchObject({
    kind: 'awaitingSettlement',
    workSettlementTickets: [{ vertexId: 'root' }],
  });
});

describe('revision session isolation', () => {
  test.each([false, true])(
    'keeps tickets and accepted facts local (async=%s)',
    async (async) => {
      const original = prepared([
        vertex('build'),
        vertex('review', { workWaitsForWorkOf: ['build'] }),
      ]);
      const old = async
        ? await original.createAsyncExternalWorkSession()
        : original.createExternalWorkSession();
      const first = await old.runUntilWorkBoundary();
      if (first.kind !== 'awaitingSettlement')
        throw new Error('Expected old frontier');
      const build = first.workSettlementTickets[0]!;
      expect(old.acceptCompletedWork(build)).toEqual({ kind: 'accepted' });
      const waiting = await old.runUntilWorkBoundary();
      if (waiting.kind !== 'awaitingSettlement')
        throw new Error('Expected review frontier');
      const oldReview = waiting.workSettlementTickets[0]!;
      const revision = applyDagDefinitionRevisionBatch(original, [
        {
          kind: 'replaceVertexDeclaration',
          vertexDeclaration: vertex('review', {
            data: { instructions: 'revised' },
            workWaitsForWorkOf: ['build'],
          }),
        },
      ]);
      if (revision.kind !== 'valid') throw new Error('Expected valid revision');
      const fresh = async
        ? await revision.validatedTopology.createAsyncExternalWorkSession()
        : revision.validatedTopology.createExternalWorkSession();
      expect(
        fresh.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([]);
      expect(await fresh.runUntilWorkBoundary()).toMatchObject({
        kind: 'awaitingSettlement',
        workSettlementTickets: [{ vertexId: 'build' }],
      });
      expect(() => fresh.acceptCompletedWork(oldReview)).toThrow(TypeError);
      expect(old.acceptCompletedWork(oldReview)).toEqual({ kind: 'accepted' });
      expect(await old.runUntilWorkBoundary()).toEqual({ kind: 'finished' });
      expect(
        fresh.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([]);
      // The host has independently accepted build's unchanged artifact for this revision.
      const selectedFacts = new Set(['build']);
      const seeded = async
        ? await revision.validatedTopology.createAsyncExternalWorkSession({
            acceptedCompletedWorkVertexIds: selectedFacts,
          })
        : revision.validatedTopology.createExternalWorkSession({
            acceptedCompletedWorkVertexIds: selectedFacts,
          });
      expect(await seeded.runUntilWorkBoundary()).toMatchObject({
        kind: 'awaitingSettlement',
        workSettlementTickets: [{ vertexId: 'review' }],
      });
      expect(
        seeded.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['build']);
      expect(() => seeded.acceptCompletedWork(oldReview)).toThrow(TypeError);
    },
  );

  test('revision leaves an admitted old async completion callback in its original execution', async () => {
    const original = prepared([vertex('task', { data: 'original' })]);
    const entered = deferred<void>();
    const release = deferred<void>();
    const completed: unknown[] = [];
    const oldRunner =
      await original.createIndependentAsyncRunnerFromValidatedTopology({
        workCompletionPolicy: 'requireExternalWorkSettlement',
        visitors: {
          [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: async (vertex) => {
            entered.resolve();
            await release.promise;
            completed.push(vertex.getVertexData());
          },
        },
      });
    const old = bindAsyncDagExternalWorkSession(oldRunner);
    const boundary = await old.runUntilWorkBoundary();
    if (boundary.kind !== 'awaitingSettlement')
      throw new Error('Expected ticket');
    const oldTicket = boundary.workSettlementTickets[0]!;
    old.acceptCompletedWork(oldTicket);
    let drained = false;
    const advancing = old.runUntilWorkBoundary().then((value) => {
      drained = true;
      return value;
    });
    await entered.promise;
    const revision = applyDagDefinitionRevisionBatch(original, [
      {
        kind: 'replaceVertexDeclaration',
        vertexDeclaration: vertex('task', { data: 'revised' }),
      },
    ]);
    if (revision.kind !== 'valid') throw new Error('Expected valid revision');
    const fresh =
      await revision.validatedTopology.createAsyncExternalWorkSession();
    const freshBoundary = await fresh.runUntilWorkBoundary();
    if (freshBoundary.kind !== 'awaitingSettlement')
      throw new Error('Expected fresh ticket');
    expect(() => fresh.acceptCompletedWork(oldTicket)).toThrow(TypeError);
    expect(
      fresh.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    fresh.acceptCompletedWork(freshBoundary.workSettlementTickets[0]!);
    expect(await fresh.runUntilWorkBoundary()).toEqual({ kind: 'finished' });
    await eventLoopTurn();
    expect(drained).toBe(false);
    expect(completed).toEqual([]);
    release.resolve();
    expect(await advancing).toEqual({ kind: 'finished' });
    expect(completed).toEqual(['original']);
    expect(old.acceptCompletedWork(oldTicket)).toEqual({
      kind: 'alreadyAccepted',
    });
  });
});
