import {
  defineDag,
  diffDagDefinitions,
  type DagDefinition,
  type DagDefinitionSlot,
  type DagDefinitionVertex,
} from '../src';

const vertex = <ID>(
  vertexId: ID,
  patch: Partial<DagDefinitionVertex<unknown, ID>> = {},
): DagDefinitionVertex<unknown, ID> => ({
  vertexId,
  data: undefined,
  slots: [],
  dependsOn: [],
  dependsOnComplete: [],
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
        dependsOn: ['a', 'b'],
        dependsOnComplete: ['a', 'b'],
      }),
    ]);
    const after = definition([
      vertex('task', {
        data: { version: 1 },
        slots: [{ kind: 'vertex', vertexId: 'new' }],
        dependsOn: ['b', 'a'],
        dependsOnComplete: ['b', 'a'],
      }),
    ]);
    expect(diffDagDefinitions(before, after).changedVertices).toEqual([
      {
        vertexId: 'task',
        aspects: [
          'data',
          'slots',
          'workDependencies',
          'completionDependencies',
        ],
      },
    ]);
    expect(
      diffDagDefinitions(
        definition([vertex('task', { dependsOn: ['a'] })]),
        definition([vertex('task', { dependsOnComplete: ['a'] })]),
      ).changedVertices,
    ).toEqual([
      {
        vertexId: 'task',
        aspects: ['workDependencies', 'completionDependencies'],
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
          dependsOn: [NaN, -0, id, slot],
          dependsOnComplete: [undefined],
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
          dependsOn: [NaN, +0, id, slot],
          dependsOnComplete: [undefined],
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
    [{ kind: 'forest', slots: [] }, { kind: 'empty' }, true],
    [
      {
        kind: 'forest',
        slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
      },
      {
        kind: 'forest',
        slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
      },
      false,
    ],
    [
      {
        kind: 'forest',
        slots: [
          { kind: 'vertex', vertexId: 'a' },
          { kind: 'vertex', vertexId: 'b' },
        ],
      },
      {
        kind: 'forest',
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
