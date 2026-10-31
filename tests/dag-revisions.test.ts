import {
  bindAsyncDagWorkSession,
  DagVisitorPhase,
  defineDag,
  diffDagDefinitions,
  prepareDagDefinition,
  reviseDag,
  type DagDefinition,
  type DagDefinitionSlot,
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
  slots: [],
  dependsOnWork: [],
  dependsOnSubgraphCompletion: [],
  ...patch,
});

const definition = <ID>(
  vertices: readonly DagDefinitionVertex<unknown, ID>[],
  patch: Partial<DagDefinition<unknown, ID>> = {},
): DagDefinition<unknown, ID> =>
  defineDag({ vertices, omittedIds: [], entry: { kind: 'empty' }, ...patch });

const unchanged = {
  addedIds: [],
  removedIds: [],
  changedVertices: [],
  vertexOrderChanged: false,
  entryChanged: false,
  omissionsChanged: false,
};

describe('diffDagDefinitions', () => {
  test('reports no changes for separately copied equivalent declarations', () => {
    const data = { mutable: true };
    const before = definition([vertex('task', { data })]);
    const after = definition([vertex('task', { data })]);
    expect(diffDagDefinitions(before, after)).toEqual(unchanged);
    expect(diffDagDefinitions(definition([]), definition([]))).toEqual(
      unchanged,
    );
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
    const diff = diffDagDefinitions(before, after);
    expect(diff).toEqual({
      ...unchanged,
      addedIds: [added, NaN],
      removedIds: [removed, undefined],
      changedVertices: [
        { vertexId: 'second', aspects: ['data'] },
        { vertexId: 'first', aspects: ['data'] },
      ],
      vertexOrderChanged: true,
    });
    expect(diff.removedIds[0]).toBe(removed);
    expect(diff.addedIds[0]).toBe(added);
  });

  test('reports vertex reorder without reporting record changes', () => {
    expect(
      diffDagDefinitions(
        definition([vertex('a'), vertex('b')]),
        definition([vertex('b'), vertex('a')]),
      ),
    ).toEqual({ ...unchanged, vertexOrderChanged: true });
  });

  test('lists changed aspects in a fixed order and keeps W and C distinct', () => {
    const before = definition([
      vertex('task', {
        data: { version: 1 },
        slots: [{ kind: 'vertex', vertexId: 'old' }],
        dependsOnWork: ['a', 'b'],
        dependsOnSubgraphCompletion: ['a', 'b'],
      }),
    ]);
    const after = definition([
      vertex('task', {
        data: { version: 1 },
        slots: [{ kind: 'vertex', vertexId: 'new' }],
        dependsOnWork: ['b', 'a'],
        dependsOnSubgraphCompletion: ['b', 'a'],
      }),
    ]);
    expect(diffDagDefinitions(before, after).changedVertices).toEqual([
      {
        vertexId: 'task',
        aspects: [
          'data',
          'slots',
          'workDependencies',
          'subgraphCompletionDependencies',
        ],
      },
    ]);
    expect(
      diffDagDefinitions(
        definition([vertex('task', { dependsOnWork: ['a'] })]),
        definition([vertex('task', { dependsOnSubgraphCompletion: ['a'] })]),
      ).changedVertices,
    ).toEqual([
      {
        vertexId: 'task',
        aspects: ['workDependencies', 'subgraphCompletionDependencies'],
      },
    ]);
  });

  test('compares all ID positions with SameValueZero while preserving opaque identity', () => {
    const id = {};
    const slot = Symbol('slot');
    const before = definition(
      [
        vertex<unknown>(NaN, {
          slots: [
            { kind: 'vertex', vertexId: id },
            { kind: 'omitted', identity: { vertexId: undefined } },
            { kind: 'omitted', identity: null },
          ],
          dependsOnWork: [NaN, -0, id, slot],
          dependsOnSubgraphCompletion: [undefined],
        }),
      ],
      { omittedIds: [undefined, -0], entry: { kind: 'root', vertexId: NaN } },
    );
    const after = definition(
      [
        vertex<unknown>(NaN, {
          slots: [
            { kind: 'vertex', vertexId: id },
            { kind: 'omitted', identity: { vertexId: undefined } },
            { kind: 'omitted', identity: null },
          ],
          dependsOnWork: [NaN, +0, id, slot],
          dependsOnSubgraphCompletion: [undefined],
        }),
      ],
      { omittedIds: [undefined, +0], entry: { kind: 'root', vertexId: NaN } },
    );
    expect(diffDagDefinitions(before, after)).toEqual(unchanged);
    expect(
      diffDagDefinitions(definition([vertex(-0)]), definition([vertex(+0)])),
    ).toEqual(unchanged);
    expect(
      diffDagDefinitions(definition([vertex(id)]), definition([vertex({})])),
    ).toMatchObject({
      addedIds: [{}],
      removedIds: [id],
      vertexOrderChanged: true,
    });
  });

  test('uses Object.is for data without traversing or freezing opaque values', () => {
    const data = { nested: { version: 1 } };
    const before = definition([vertex('task', { data })]);
    data.nested.version = 2;
    expect(
      diffDagDefinitions(before, definition([vertex('task', { data })])),
    ).toEqual(unchanged);
    expect(
      diffDagDefinitions(
        before,
        definition([
          vertex('task', {
            data: { nested: { version: 2 } },
          }),
        ]),
      ),
    ).toMatchObject({
      changedVertices: [{ vertexId: 'task', aspects: ['data'] }],
    });
    expect(
      diffDagDefinitions(
        definition([vertex('task', { data: NaN })]),
        definition([vertex('task', { data: NaN })]),
      ),
    ).toEqual(unchanged);
    expect(
      diffDagDefinitions(
        definition([vertex('task', { data: -0 })]),
        definition([vertex('task', { data: +0 })]),
      ).changedVertices,
    ).toEqual([{ vertexId: 'task', aspects: ['data'] }]);
    const opaque = {
      get nested(): never {
        throw new Error('do not traverse data');
      },
    };
    expect(
      diffDagDefinitions(
        definition([vertex('task', { data: opaque })]),
        definition([vertex('task', { data: opaque })]),
      ),
    ).toEqual(unchanged);
    expect(Object.isFrozen(data)).toBe(false);
  });

  test.each<[DagDefinitionSlot<unknown>[], DagDefinitionSlot<unknown>[]]>([
    [[{ kind: 'vertex', vertexId: 'a' }], []],
    [[{ kind: 'vertex', vertexId: 'a' }], [{ kind: 'vertex', vertexId: 'b' }]],
    [
      [{ kind: 'vertex', vertexId: undefined }],
      [{ kind: 'omitted', identity: { vertexId: undefined } }],
    ],
    [
      [{ kind: 'omitted', identity: null }],
      [{ kind: 'omitted', identity: { vertexId: undefined } }],
    ],
    [
      [{ kind: 'omitted', identity: { vertexId: undefined } }],
      [{ kind: 'omitted', identity: null }],
    ],
    [
      [{ kind: 'omitted', identity: { vertexId: 'a' } }],
      [{ kind: 'omitted', identity: { vertexId: 'b' } }],
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
      diffDagDefinitions(
        definition([vertex<unknown>('task', { slots })]),
        definition([vertex<unknown>('task', { slots: nextSlots })]),
      ).changedVertices,
    ).toEqual([{ vertexId: 'task', aspects: ['slots'] }]);
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
    [{ kind: 'roots', slots: [] }, { kind: 'empty' }, true],
    [
      {
        kind: 'roots',
        slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
      },
      {
        kind: 'roots',
        slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
      },
      false,
    ],
    [
      {
        kind: 'roots',
        slots: [
          { kind: 'vertex', vertexId: 'a' },
          { kind: 'vertex', vertexId: 'b' },
        ],
      },
      {
        kind: 'roots',
        slots: [
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
        diffDagDefinitions(
          definition<unknown>([], { entry }),
          definition<unknown>([], { entry: nextEntry }),
        ),
      ).toEqual({ ...unchanged, entryChanged: changed });
    },
  );

  test('distinguishes a known omission from a live structural slot', () => {
    expect(
      diffDagDefinitions(
        definition([
          vertex<unknown>('task', {
            slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
          }),
        ]),
        definition([
          vertex<unknown>('task', {
            slots: [{ kind: 'vertex', vertexId: undefined }],
          }),
        ]),
      ).changedVertices,
    ).toEqual([{ vertexId: 'task', aspects: ['slots'] }]);
  });

  test('reports omission declaration ordering and membership changes', () => {
    const before = definition<unknown>([], { omittedIds: [undefined, NaN] });
    for (const omittedIds of [[NaN, undefined], [undefined], [undefined, {}]]) {
      expect(
        diffDagDefinitions(before, definition([], { omittedIds })),
      ).toEqual({ ...unchanged, omissionsChanged: true });
    }
  });

  test('owns immutable result wrappers while retaining caller ID references', () => {
    const id = {};
    const before = definition([vertex(id, { data: 1 })]);
    const after = definition([vertex(id, { data: 2 })]);
    const diff = diffDagDefinitions(before, after);
    expect(diff.changedVertices[0]!.vertexId).toBe(id);
    expect(Object.isFrozen(diff)).toBe(true);
    expect(Object.isFrozen(diff.addedIds)).toBe(true);
    expect(Object.isFrozen(diff.removedIds)).toBe(true);
    expect(Object.isFrozen(diff.changedVertices)).toBe(true);
    expect(Object.isFrozen(diff.changedVertices[0])).toBe(true);
    expect(Object.isFrozen(diff.changedVertices[0]!.aspects)).toBe(true);
    expect(Object.isFrozen(id)).toBe(false);
    expect(diffDagDefinitions(before, before)).toEqual(unchanged);
  });
});

describe('reviseDag', () => {
  test('rejects a dangling prerequisite without touching the original session', () => {
    const result = prepareDagDefinition(
      definition(
        [vertex('review', { dependsOnWork: ['research'] }), vertex('research')],
        { entry: { kind: 'root', vertexId: 'review' } },
      ),
    );
    if (result.kind !== 'valid') throw new Error('Expected valid fixture');
    const original = result.dag;
    const before = original.createWorkSession();
    expect(
      reviseDag(original, [
        { kind: 'removeVertexDeclaration', vertexId: 'research' },
      ]),
    ).toMatchObject({ kind: 'invalid', issues: [{ kind: 'milestone' }] });
    expect(original.definition.vertices.map((v) => v.vertexId)).toEqual([
      'review',
      'research',
    ]);
    expect(before.advance()).toMatchObject({
      kind: 'awaitingSettlement',
      workTickets: [{ vertexId: 'research' }],
    });
  });
});

const prepared = <ID>(
  vertices: readonly DagDefinitionVertex<unknown, ID>[],
  patch: Partial<DagDefinition<unknown, ID>> = {},
) => {
  const result = prepareDagDefinition(
    definition(vertices, {
      entry: {
        kind: 'roots',
        slots: vertices.map((v) => ({ kind: 'vertex', vertexId: v.vertexId })),
      },
      ...patch,
    }),
  );
  if (result.kind !== 'valid') throw new Error('Expected valid fixture');
  return result.dag;
};

const rawOperations = <ID = unknown>(value: unknown) =>
  value as readonly DagRevisionOperation<unknown, ID>[];

describe('ordered atomic revisions', () => {
  test('validates only the final candidate after temporarily dangling edits', () => {
    const original = prepared(
      [
        vertex('review', {
          dependsOnWork: ['research'],
          dependsOnSubgraphCompletion: ['research'],
        }),
        vertex('research'),
      ],
      { entry: { kind: 'root', vertexId: 'review' } },
    );
    const result = reviseDag(original, [
      { kind: 'removeVertexDeclaration', vertexId: 'research' },
      { kind: 'replaceVertex', vertex: vertex('review') },
    ]);
    expect(result.kind).toBe('valid');
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.dag.definition.vertices).toEqual([vertex('review')]);
    expect(result.changes).toEqual({
      ...unchanged,
      removedIds: ['research'],
      changedVertices: [
        {
          vertexId: 'review',
          aspects: ['workDependencies', 'subgraphCompletionDependencies'],
        },
      ],
      vertexOrderChanged: true,
    });
    expect(result.dag.createWorkSession().advance()).toMatchObject({
      kind: 'awaitingSettlement',
      workTickets: [{ vertexId: 'review' }],
    });
    expect(original.createWorkSession().advance()).toMatchObject({
      kind: 'awaitingSettlement',
      workTickets: [{ vertexId: 'research' }],
    });
  });

  test('retains replacement position, appends additions and applies repeated edits in order', () => {
    const original = prepared([vertex('a'), vertex('b'), vertex('c')]);
    const result = reviseDag(original, [
      { kind: 'replaceVertex', vertex: vertex('c', { data: 1 }) },
      { kind: 'removeVertexDeclaration', vertexId: 'b' },
      { kind: 'addVertex', vertex: vertex('b', { data: 'new' }) },
      { kind: 'replaceVertex', vertex: vertex('c', { data: 2 }) },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(
      result.dag.definition.vertices.map((v) => [v.vertexId, v.data]),
    ).toEqual([
      ['a', undefined],
      ['c', 2],
      ['b', 'new'],
    ]);
    expect(result.changes).toEqual({
      ...unchanged,
      changedVertices: [
        { vertexId: 'b', aspects: ['data'] },
        { vertexId: 'c', aspects: ['data'] },
      ],
      vertexOrderChanged: true,
    });
    expect(original.definition.vertices.map((v) => v.data)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  test('can replace a root with its child without removing descendants implicitly', () => {
    const original = prepared(
      [
        vertex('root', { slots: [{ kind: 'vertex', vertexId: 'child' }] }),
        vertex('child'),
      ],
      { entry: { kind: 'root', vertexId: 'root' } },
    );
    const invalid = reviseDag(original, [
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
    ]);
    expect(invalid).toEqual({
      kind: 'invalid',
      issues: [
        { kind: 'invalidEntry', reason: 'unknownRoot', vertexIds: ['root'] },
        { kind: 'unreachable', vertexIds: ['child'] },
      ],
    });
    const result = reviseDag(original, [
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
      { kind: 'replaceEntry', entry: { kind: 'root', vertexId: 'child' } },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.dag.definition.vertices).toEqual([vertex('child')]);
    expect(result.changes).toEqual({
      ...unchanged,
      removedIds: ['root'],
      vertexOrderChanged: true,
      entryChanged: true,
    });
    expect(original.createWorkSession().advance()).toMatchObject({
      kind: 'awaitingSettlement',
      workTickets: [{ vertexId: 'root' }, { vertexId: 'child' }],
    });
  });

  test('can remove every live record and replace the entry with empty', () => {
    const original = prepared([vertex('root')], {
      entry: { kind: 'root', vertexId: 'root' },
    });
    const result = reviseDag(original, [
      { kind: 'replaceEntry', entry: { kind: 'empty' } },
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.dag.definition).toEqual({
      vertices: [],
      omittedIds: [],
      entry: { kind: 'empty' },
    });
    expect(result.dag.createWorkSession().advance().kind).toBe('finished');
  });

  test('can replace omitted identities and entry slots in one batch', () => {
    const original = prepared<unknown>([vertex('root')], {
      omittedIds: ['old'],
      entry: {
        kind: 'roots',
        slots: [
          { kind: 'omitted', identity: { vertexId: 'old' } },
          { kind: 'vertex', vertexId: 'root' },
        ],
      },
    });
    const result = reviseDag(original, [
      { kind: 'replaceOmissions', omittedIds: [undefined] },
      {
        kind: 'replaceEntry',
        entry: {
          kind: 'roots',
          slots: [
            { kind: 'vertex', vertexId: 'root' },
            { kind: 'omitted', identity: { vertexId: undefined } },
          ],
        },
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.changes).toEqual({
      ...unchanged,
      entryChanged: true,
      omissionsChanged: true,
    });
    expect(result.dag.definition.omittedIds).toEqual([undefined]);
    expect(original.definition.omittedIds).toEqual(['old']);
  });

  test('an empty batch creates a fresh unseeded prepared DAG and session', () => {
    const original = prepared([vertex('task')]);
    const old = original.createWorkSession({
      completedWork: new Set(['task']),
    });
    expect(old.advance().kind).toBe('finished');
    const result = reviseDag(original, []);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.dag).not.toBe(original);
    expect(result.dag.definition).not.toBe(original.definition);
    expect(result.dag.definition.vertices[0]).not.toBe(
      original.definition.vertices[0],
    );
    expect(result.changes).toEqual(unchanged);
    expect(result.dag.createWorkSession().advance()).toMatchObject({
      kind: 'awaitingSettlement',
      workTickets: [{ vertexId: 'task' }],
    });
    expect(old.advance().kind).toBe('finished');
  });

  test.each([
    {
      name: 'unreachable addition',
      operations: [{ kind: 'addVertex', vertex: vertex('extra') }],
      issue: 'unreachable',
    },
    {
      name: 'dangling structural child',
      operations: [
        {
          kind: 'replaceVertex',
          vertex: vertex('root', {
            slots: [{ kind: 'vertex', vertexId: 'missing' }],
          }),
        },
      ],
      issue: 'missingStructuralEndpoint',
    },
    {
      name: 'structural cycle',
      operations: [
        {
          kind: 'replaceVertex',
          vertex: vertex('root', {
            slots: [{ kind: 'vertex', vertexId: 'root' }],
          }),
        },
      ],
      issue: 'structuralCycle',
    },
    {
      name: 'work cycle',
      operations: [
        {
          kind: 'replaceVertex',
          vertex: vertex('root', { dependsOnWork: ['root'] }),
        },
      ],
      issue: 'milestone',
    },
    {
      name: 'completion cycle',
      operations: [
        {
          kind: 'replaceVertex',
          vertex: vertex('root', { dependsOnSubgraphCompletion: ['root'] }),
        },
      ],
      issue: 'milestone',
    },
    {
      name: 'unknown omission reference',
      operations: [
        {
          kind: 'replaceVertex',
          vertex: vertex('root', {
            slots: [{ kind: 'omitted', identity: { vertexId: 'missing' } }],
          }),
        },
      ],
      issue: 'invalidOmission',
    },
  ])(
    'returns graph issues for $name and preserves old topology and work',
    ({ operations, issue }) => {
      const original = prepared([vertex('root')], {
        entry: { kind: 'root', vertexId: 'root' },
      });
      const session = original.createWorkSession();
      const before = original.definition;
      expect(
        reviseDag(original, rawOperations<string>(operations)),
      ).toMatchObject({
        kind: 'invalid',
        issues: [expect.objectContaining({ kind: issue })],
      });
      expect(original.definition).toBe(before);
      expect(original.definition.vertices).toEqual([vertex('root')]);
      expect(session.advance()).toMatchObject({
        kind: 'awaitingSettlement',
        workTickets: [{ vertexId: 'root' }],
      });
    },
  );

  test.each([
    { kind: 'addVertex', vertex: vertex('root') },
    { kind: 'replaceVertex', vertex: vertex('unknown') },
    { kind: 'removeVertexDeclaration', vertexId: 'unknown' },
    { kind: 'replaceOmissions', omittedIds: ['root'] },
    { kind: 'replaceOmissions', omittedIds: ['x', 'x'] },
  ])(
    'throws on programmer error $kind without adopting preceding edits',
    (operation) => {
      const original = prepared([vertex('root')]);
      const session = original.createWorkSession();
      expect(() =>
        reviseDag(
          original,
          rawOperations<string>([
            {
              kind: 'replaceVertex',
              vertex: vertex('root', { data: 'candidate' }),
            },
            operation,
          ]),
        ),
      ).toThrow(TypeError);
      expect(original.definition.vertices[0]!.data).toBeUndefined();
      expect(session.advance()).toMatchObject({
        kind: 'awaitingSettlement',
        workTickets: [{ vertexId: 'root' }],
      });
    },
  );

  test('allows a temporary live/omitted collision repaired before validation', () => {
    const original = prepared([vertex('root')]);
    const result = reviseDag(original, [
      { kind: 'replaceOmissions', omittedIds: ['root'] },
      { kind: 'removeVertexDeclaration', vertexId: 'root' },
      { kind: 'replaceEntry', entry: { kind: 'empty' } },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.dag.definition).toEqual({
      vertices: [],
      omittedIds: ['root'],
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
    const result = reviseDag(original, [
      { kind: 'replaceVertex', vertex: vertex(NaN, { data: 'nan' }) },
      { kind: 'replaceVertex', vertex: vertex(+0, { data: 'zero' }) },
      { kind: 'replaceVertex', vertex: vertex(id, { data: 'object' }) },
      { kind: 'replaceVertex', vertex: vertex(symbol, { data: 'symbol' }) },
      { kind: 'removeVertexDeclaration', vertexId: undefined },
      {
        kind: 'replaceEntry',
        entry: {
          kind: 'roots',
          slots: [NaN, +0, id, symbol, other].map((vertexId) => ({
            kind: 'vertex',
            vertexId,
          })),
        },
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(result.dag.definition.vertices.map((v) => v.data)).toEqual([
      'nan',
      'zero',
      'object',
      'symbol',
      undefined,
    ]);
    expect(result.dag.definition.vertices[2]!.vertexId).toBe(id);
    expect(result.dag.definition.vertices[4]!.vertexId).toBe(other);
    expect(result.changes.removedIds).toEqual([undefined]);
    expect(() =>
      reviseDag(original, [{ kind: 'addVertex', vertex: vertex(NaN) }]),
    ).toThrow(TypeError);
    expect(() =>
      reviseDag(original, [{ kind: 'addVertex', vertex: vertex(+0) }]),
    ).toThrow(TypeError);
    expect(() =>
      reviseDag(
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
    [{ kind: 'replaceVertex' }],
    [{ kind: 'addVertex', vertex: null }],
    [
      {
        kind: 'addVertex',
        vertex: {
          data: undefined,
          slots: [],
          dependsOnWork: [],
          dependsOnSubgraphCompletion: [],
        },
      },
    ],
    [{ kind: 'replaceEntry', entry: { kind: 'root' } }],
    [{ kind: 'replaceOmissions', omittedIds: null }],
    [{ kind: 'replaceEntry' }],
    [{ kind: 'replaceOmissions' }],
  ])(
    'rejects malformed operation shapes (%#) without mutating original',
    (value) => {
      const original = prepared<unknown>([vertex(undefined)]);
      expect(() => reviseDag(original, rawOperations(value))).toThrow(
        TypeError,
      );
      expect(original.createWorkSession().advance()).toMatchObject({
        kind: 'awaitingSettlement',
        workTickets: [{ vertexId: undefined }],
      });
    },
  );

  test('reads caller getters once, copies owned topology and never freezes opaque data or IDs', () => {
    const id = { task: 'new' };
    const data = { version: 1 };
    const original = prepared<unknown>([vertex(id)]);
    const reads: string[] = [];
    const slots: DagDefinitionSlot<unknown>[] = [];
    const dependsOnWork: unknown[] = [];
    const replacement = {
      get vertexId() {
        reads.push('vertexId');
        return id;
      },
      get data() {
        reads.push('data');
        return data;
      },
      get slots() {
        reads.push('slots');
        return slots;
      },
      get dependsOnWork() {
        reads.push('dependsOnWork');
        return dependsOnWork;
      },
      get dependsOnSubgraphCompletion() {
        reads.push('dependsOnSubgraphCompletion');
        return [];
      },
    };
    const result = reviseDag(original, [
      {
        get kind() {
          reads.push('kind');
          return 'replaceVertex' as const;
        },
        get vertex() {
          reads.push('vertex');
          return replacement;
        },
      },
    ]);
    if (result.kind !== 'valid') throw new Error('Expected revision');
    expect(reads).toEqual([
      'kind',
      'vertex',
      'vertexId',
      'data',
      'slots',
      'dependsOnWork',
      'dependsOnSubgraphCompletion',
    ]);
    slots.push({ kind: 'vertex', vertexId: 'late' });
    dependsOnWork.push('late');
    data.version = 2;
    id.task = 'changed';
    expect(result.dag.definition.vertices[0]).toEqual({
      vertexId: id,
      data,
      slots: [],
      dependsOnWork: [],
      dependsOnSubgraphCompletion: [],
    });
    expect(result.dag.definition.vertices[0]!.data).toBe(data);
    expect(result.dag.definition.vertices[0]!.vertexId).toBe(id);
    expect(Object.isFrozen(replacement)).toBe(false);
    expect(Object.isFrozen(data)).toBe(false);
    expect(Object.isFrozen(id)).toBe(false);
    expect(Object.isFrozen(result.dag.definition.vertices[0])).toBe(true);
  });

  test.each([
    'kind',
    'vertex',
    'vertexId',
    'data',
    'slots',
    'dependsOnWork',
    'dependsOnSubgraphCompletion',
    'entry',
    'omittedIds',
  ])('propagates exact caller getter errors at %s', (field) => {
    const error = { field };
    const original = prepared([vertex('root')]);
    const replacement = vertex('root');
    const operation: Record<string, unknown> =
      field === 'entry'
        ? { kind: 'replaceEntry' }
        : field === 'omittedIds'
        ? { kind: 'replaceOmissions' }
        : { kind: 'replaceVertex', vertex: replacement };
    Object.defineProperty(
      [
        'vertexId',
        'data',
        'slots',
        'dependsOnWork',
        'dependsOnSubgraphCompletion',
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
      reviseDag(original, rawOperations<string>([operation]));
    } catch (value) {
      caught = value;
    }
    expect(caught).toBe(error);
    expect(original.createWorkSession().advance()).toMatchObject({
      kind: 'awaitingSettlement',
      workTickets: [{ vertexId: 'root' }],
    });
  });
});

test('adds a new reachable vertex with explicit parent and prerequisite edits', () => {
  const original = prepared([vertex('root')], {
    entry: { kind: 'root', vertexId: 'root' },
  });
  const result = reviseDag(original, [
    { kind: 'addVertex', vertex: vertex('new', { data: 'added' }) },
    {
      kind: 'replaceVertex',
      vertex: vertex('root', {
        slots: [{ kind: 'vertex', vertexId: 'new' }],
        dependsOnWork: ['new'],
      }),
    },
  ]);
  if (result.kind !== 'valid') throw new Error('Expected revision');
  expect(result.changes).toEqual({
    ...unchanged,
    addedIds: ['new'],
    vertexOrderChanged: true,
    changedVertices: [
      { vertexId: 'root', aspects: ['slots', 'workDependencies'] },
    ],
  });
  expect(result.dag.createWorkSession().advance()).toMatchObject({
    kind: 'awaitingSettlement',
    workTickets: [{ vertexId: 'new' }],
  });
  expect(original.createWorkSession().advance()).toMatchObject({
    kind: 'awaitingSettlement',
    workTickets: [{ vertexId: 'root' }],
  });
});

describe('revision session isolation', () => {
  test.each([false, true])(
    'keeps tickets and accepted facts local (async=%s)',
    async (async) => {
      const original = prepared([
        vertex('build'),
        vertex('review', { dependsOnWork: ['build'] }),
      ]);
      const old = async
        ? await original.createAsyncWorkSession()
        : original.createWorkSession();
      const first = await old.advance();
      if (first.kind !== 'awaitingSettlement')
        throw new Error('Expected old frontier');
      const build = first.workTickets[0]!;
      expect(old.completeWork(build)).toEqual({ kind: 'accepted' });
      const waiting = await old.advance();
      if (waiting.kind !== 'awaitingSettlement')
        throw new Error('Expected review frontier');
      const oldReview = waiting.workTickets[0]!;
      const revision = reviseDag(original, [
        {
          kind: 'replaceVertex',
          vertex: vertex('review', {
            data: { instructions: 'revised' },
            dependsOnWork: ['build'],
          }),
        },
      ]);
      if (revision.kind !== 'valid') throw new Error('Expected valid revision');
      const fresh = async
        ? await revision.dag.createAsyncWorkSession()
        : revision.dag.createWorkSession();
      expect(fresh.summary().completedWorkIds).toEqual([]);
      expect(await fresh.advance()).toMatchObject({
        kind: 'awaitingSettlement',
        workTickets: [{ vertexId: 'build' }],
      });
      expect(() => fresh.completeWork(oldReview)).toThrow(TypeError);
      expect(old.completeWork(oldReview)).toEqual({ kind: 'accepted' });
      expect(await old.advance()).toEqual({ kind: 'finished' });
      expect(fresh.summary().completedWorkIds).toEqual([]);
      // The host has independently accepted build's unchanged artifact for this revision.
      const selectedFacts = new Set(['build']);
      const seeded = async
        ? await revision.dag.createAsyncWorkSession({
            completedWork: selectedFacts,
          })
        : revision.dag.createWorkSession({ completedWork: selectedFacts });
      expect(await seeded.advance()).toMatchObject({
        kind: 'awaitingSettlement',
        workTickets: [{ vertexId: 'review' }],
      });
      expect(seeded.summary().completedWorkIds).toEqual(['build']);
      expect(() => seeded.completeWork(oldReview)).toThrow(TypeError);
    },
  );

  test('revision leaves an admitted old async completion callback in its original execution', async () => {
    const original = prepared([vertex('task', { data: 'original' })]);
    const entered = deferred<void>();
    const release = deferred<void>();
    const completed: unknown[] = [];
    const oldRunner = await original.createAsyncRunner({
      workCompletion: 'externalSettlement',
      visitors: {
        [DagVisitorPhase.ON_SUBGRAPH_READY]: async (vertex) => {
          entered.resolve();
          await release.promise;
          completed.push(vertex.getData());
        },
      },
    });
    const old = bindAsyncDagWorkSession(oldRunner);
    const boundary = await old.advance();
    if (boundary.kind !== 'awaitingSettlement')
      throw new Error('Expected ticket');
    const oldTicket = boundary.workTickets[0]!;
    old.completeWork(oldTicket);
    let drained = false;
    const advancing = old.advance().then((value) => {
      drained = true;
      return value;
    });
    await entered.promise;
    const revision = reviseDag(original, [
      { kind: 'replaceVertex', vertex: vertex('task', { data: 'revised' }) },
    ]);
    if (revision.kind !== 'valid') throw new Error('Expected valid revision');
    const fresh = await revision.dag.createAsyncWorkSession();
    const freshBoundary = await fresh.advance();
    if (freshBoundary.kind !== 'awaitingSettlement')
      throw new Error('Expected fresh ticket');
    expect(() => fresh.completeWork(oldTicket)).toThrow(TypeError);
    expect(fresh.summary().completedWorkIds).toEqual([]);
    fresh.completeWork(freshBoundary.workTickets[0]!);
    expect(await fresh.advance()).toEqual({ kind: 'finished' });
    await eventLoopTurn();
    expect(drained).toBe(false);
    expect(completed).toEqual([]);
    release.resolve();
    expect(await advancing).toEqual({ kind: 'finished' });
    expect(completed).toEqual(['original']);
    expect(old.completeWork(oldTicket)).toEqual({ kind: 'alreadyAccepted' });
  });
});
