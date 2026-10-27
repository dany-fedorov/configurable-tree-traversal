import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { definitionSource } from '../src/traversals/dag-traversal/lib/definitionSource';
import { materializeDagSourceFromRecords } from '../src';
import {
  defineDag,
  prepareDagDefinition,
  type DagDefinition,
  type DagDefinitionSlot,
} from '../src';
import { prepareDag } from '../src/traversals/dag-traversal/prepareDag';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type G = VertexTypes<string, string>;

function omissionSource(anonymous = false): DagDiscoverySource<G, G, string> {
  return {
    resolveRoot: () => ({
      kind: 'found',
      vertex: {
        vertexId: 'root',
        vertexContent: {
          $data: 'root',
          $childHints: anonymous
            ? ['before', 'skip', 'after', 'b', 'c']
            : ['skip', 'b', 'c'],
        },
      },
    }),
    resolveChild: (id) =>
      ['before', 'skip', 'after'].includes(id)
        ? {
            kind: 'omitted',
            satisfiesDependencies: true,
            ...(id === 'skip' ? { vertexId: id } : {}),
          }
        : {
            kind: 'found',
            vertex: {
              vertexId: id,
              dependsOnWork: id === 'b' ? ['skip'] : [],
              vertexContent: { $data: id, $childHints: [] },
            },
          },
  };
}

test('definitions retain an omitted discovery slot before its dependent sibling', () => {
  const result = prepareDag({ traversableGraph: omissionSource() });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.dag.definition.vertices[0]!.slots).toEqual([
    { kind: 'omitted', identity: { vertexId: 'skip' } },
    { kind: 'vertex', vertexId: 'b' },
    { kind: 'vertex', vertexId: 'c' },
  ]);
  expect(
    [...result.dag.createRunner().iterateEvents()].map((event) => [
      event.vertexId,
      event.kind,
    ]),
  ).toEqual([
    ['root', 'workCompleted'],
    ['b', 'workCompleted'],
    ['c', 'workCompleted'],
    ['b', 'subgraphCompleted'],
    ['c', 'subgraphCompleted'],
    ['root', 'subgraphCompleted'],
  ]);
});

// Removing copies/freezes would let later caller edits change replay topology.
test('defineDag owns wrappers while retaining arbitrary data and ID references', () => {
  const id = { name: 'id' };
  const data = { value: 1 };
  const input: DagDefinition<typeof data, unknown> = {
    vertices: [
      {
        vertexId: id,
        data,
        slots: [{ kind: 'omitted', identity: { vertexId: undefined } }],
        dependsOnWork: [undefined, undefined, NaN, NaN],
        dependsOnSubgraphCompletion: [null],
      },
    ],
    omittedIds: [undefined],
    entry: { kind: 'root', vertexId: id },
  };
  const definition = defineDag(input);
  expect(definition).not.toBe(input);
  expect(definition.vertices[0]!.data).toBe(data);
  expect(definition.vertices[0]!.vertexId).toBe(id);
  expect(definition.vertices[0]!.dependsOnWork).toEqual([undefined, NaN]);
  expect(definition.vertices[0]!.slots[0]).not.toBe(
    input.vertices[0]!.slots[0],
  );
  expect(() => (definition.vertices as unknown[]).pop()).toThrow();
  expect(() => (definition.vertices[0]!.slots as unknown[]).pop()).toThrow();
  expect(() =>
    (definition.vertices[0]!.dependsOnWork as unknown[]).pop(),
  ).toThrow();
  expect(() =>
    (definition.vertices[0]!.dependsOnSubgraphCompletion as unknown[]).pop(),
  ).toThrow();
  expect(() => (definition.omittedIds as unknown[]).pop()).toThrow();
  expect(Object.isFrozen(definition)).toBe(true);
  expect(Object.isFrozen(definition.vertices[0])).toBe(true);
  expect(Object.isFrozen(definition.entry)).toBe(true);
  expect(Object.isFrozen(definition.vertices[0]!.slots[0])).toBe(true);
  const slot = definition.vertices[0]!.slots[0]!;
  if (slot.kind === 'omitted')
    expect(Object.isFrozen(slot.identity)).toBe(true);
  expect(Object.isFrozen(id)).toBe(false);
  expect(Object.isFrozen(data)).toBe(false);
  data.value = 2;
  expect(definition.vertices[0]!.data.value).toBe(2);
});

test.each([
  null,
  [],
  {},
  { vertices: [], omittedIds: [], entry: null },
  { vertices: null, omittedIds: [], entry: { kind: 'empty' } },
  { vertices: [], omittedIds: null, entry: { kind: 'empty' } },
  { vertices: [], omittedIds: [], entry: { kind: 'other' } },
  { vertices: [], omittedIds: [], entry: { kind: 'root' } },
  { vertices: [null], omittedIds: [], entry: { kind: 'empty' } },
  {
    vertices: [
      {
        data: 0,
        slots: [],
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
      },
    ],
    omittedIds: [],
    entry: { kind: 'empty' },
  },
  {
    vertices: [
      {
        vertexId: 0,
        slots: [],
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
      },
    ],
    omittedIds: [],
    entry: { kind: 'empty' },
  },
  { vertices: [], omittedIds: [], entry: { kind: 'forest', slots: [null] } },
  {
    vertices: [],
    omittedIds: [],
    entry: { kind: 'forest', slots: [{ kind: 'other' }] },
  },
  {
    vertices: [],
    omittedIds: [],
    entry: { kind: 'forest', slots: [{ kind: 'vertex' }] },
  },
  {
    vertices: [],
    omittedIds: [],
    entry: { kind: 'forest', slots: [{ kind: 'omitted' }] },
  },
  {
    vertices: [],
    omittedIds: [],
    entry: { kind: 'forest', slots: [{ kind: 'omitted', identity: {} }] },
  },
])('defineDag rejects malformed declarations %#', (input) => {
  expect(() => defineDag(input as any)).toThrow(TypeError);
});

test.each(['vertices', 'omittedIds', 'mixed'] as const)(
  'defineDag rejects SameValueZero duplicate %s declarations',
  (domain) => {
    const vertex = {
      vertexId: NaN,
      data: 0,
      slots: [],
      dependsOnWork: [],
      dependsOnSubgraphCompletion: [],
    };
    expect(() =>
      defineDag({
        vertices:
          domain === 'omittedIds'
            ? []
            : domain === 'vertices'
            ? [vertex, vertex]
            : [vertex],
        omittedIds:
          domain === 'vertices'
            ? []
            : domain === 'omittedIds'
            ? [NaN, NaN]
            : [NaN],
        entry: { kind: 'empty' },
      }),
    ).toThrow(TypeError);
  },
);

test('defineDag preserves non-enumerable own undefined IDs and exact accessor failures', () => {
  const entry = Object.defineProperty({ kind: 'root' as const }, 'vertexId', {
    value: undefined,
  }) as { kind: 'root'; vertexId: undefined };
  expect(
    defineDag({ vertices: [], omittedIds: [undefined], entry }).entry,
  ).toEqual({ kind: 'root', vertexId: undefined });
  const error = { exact: true };
  let caught: unknown;
  try {
    defineDag(
      Object.defineProperty({}, 'vertices', {
        get() {
          throw error;
        },
      }) as any,
    );
  } catch (value) {
    caught = value;
  }
  expect(caught).toBe(error);
});

for (const anonymous of [false, true]) {
  test(`definition replay preserves work and completion order with anonymous omissions ${anonymous}`, async () => {
    const adapter = omissionSource(anonymous);
    const original = new DagTraversal({ traversableGraph: adapter })
      .createRunner()
      .prepare();
    const result = prepareDag({ traversableGraph: adapter });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    const definition = defineDag(result.dag.definition);
    expect(definition.vertices[0]!.slots).toEqual(
      anonymous
        ? [
            { kind: 'omitted', identity: null },
            { kind: 'omitted', identity: { vertexId: 'skip' } },
            { kind: 'omitted', identity: null },
            { kind: 'vertex', vertexId: 'b' },
            { kind: 'vertex', vertexId: 'c' },
          ]
        : [
            { kind: 'omitted', identity: { vertexId: 'skip' } },
            { kind: 'vertex', vertexId: 'b' },
            { kind: 'vertex', vertexId: 'c' },
          ],
    );
    const roundtrip = prepareDagDefinition(definition);
    if (roundtrip.kind !== 'valid') throw new Error('Expected valid');
    expect(roundtrip.dag.definition).toEqual(definition);
    const replay = roundtrip.dag.createRunner();
    const replayAsync = await roundtrip.dag.createAsyncRunner();
    const expected = [
      ['root', 'workCompleted'],
      ['b', 'workCompleted'],
      ['c', 'workCompleted'],
      ['b', 'subgraphCompleted'],
      ['c', 'subgraphCompleted'],
      ['root', 'subgraphCompleted'],
    ];
    expect(
      [...original.iterateEvents()].map((event) => [
        event.vertexId,
        event.kind,
      ]),
    ).toEqual(expected);
    expect(
      [...replay.iterateEvents()].map((event) => [event.vertexId, event.kind]),
    ).toEqual(expected);
    const events: unknown[] = [];
    for await (const event of replayAsync.iterateEvents())
      events.push([event.vertexId, event.kind]);
    expect(events).toEqual(expected);
    expect(replay.summary().counts.discovered).toBe(3);
    expect(replay.summary().unusedCompletedWorkIds).toEqual([]);
    expect(
      replay.getResolvedGraph().getRoot()!.getValue().getChildrenHints(),
    ).toEqual(['skip', 'b', 'c']);
  });
}

test('definitions retain empty and omitted roots separately from forest catalogs', () => {
  for (const identified of [false, true]) {
    const result = prepareDag<G, unknown>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'omitted',
          satisfiesDependencies: true,
          ...(identified ? { vertexId: undefined } : {}),
        }),
        resolveChild: () => {
          throw new Error('No children');
        },
      },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    expect(result.dag.definition).toEqual({
      vertices: [],
      omittedIds: identified ? [undefined] : [],
      entry: { kind: 'empty' },
    });
    const replay = new DagTraversal(definitionSource(result.dag.definition))
      .createRunner()
      .prepare();
    expect([...replay.iterateEvents()]).toEqual([]);
    expect(replay.getStopReason()).toBe('finished');
  }
  const forest = prepareDag(
    materializeDagSourceFromRecords(['a', 'b'], { id: (id) => id }),
  );
  if (forest.kind !== 'valid') throw new Error('Expected valid');
  expect(forest.dag.definition.entry).toEqual({
    kind: 'forest',
    slots: [
      { kind: 'vertex', vertexId: 'a' },
      { kind: 'vertex', vertexId: 'b' },
    ],
  });
  const empty = prepareDag(
    materializeDagSourceFromRecords<string, string>([], { id: (id) => id }),
  );
  if (empty.kind !== 'valid') throw new Error('Expected valid');
  expect(empty.dag.definition.entry).toEqual({ kind: 'forest', slots: [] });
  const omittedHolder = prepareDag<G, string>({
    syntheticRoot: true,
    traversableGraph: {
      resolveRoot: () => ({
        satisfiesDependencies: true as const,
        kind: 'omitted',
      }),
      resolveChild: () => {
        throw new Error('No children');
      },
    },
  });
  if (omittedHolder.kind !== 'valid') throw new Error('Expected valid');
  expect(omittedHolder.dag.definition.entry).toEqual({
    kind: 'forest',
    slots: [],
  });
});

test('definition replay retains structural sharing and detached prerequisites without caller callbacks', () => {
  const rootId = { label: 'root' };
  const sharedId = { label: 'shared' };
  const remoteId = { label: 'remote' };
  type ID = typeof rootId | undefined;
  type ObjectGraph = VertexTypes<{ label: string }, ID>;
  const calls: unknown[] = [];
  const adapter: DagDiscoverySource<ObjectGraph, ObjectGraph, ID> = {
    resolveRoot: () => {
      calls.push('root');
      return {
        kind: 'found',
        vertex: {
          vertexId: rootId,
          vertexContent: {
            $data: rootId,
            $childHints: [undefined, sharedId, sharedId],
          },
        },
      };
    },
    getVertexIdFromHint: (vertexId) =>
      Object.defineProperty({}, 'vertexId', { value: vertexId }) as {
        vertexId: ID;
      },
    resolveChild: (id) => {
      calls.push(id);
      return id === undefined
        ? { kind: 'omitted', satisfiesDependencies: true }
        : {
            kind: 'found',
            vertex: {
              vertexId: sharedId,
              dependsOnWork: [undefined, remoteId],
              vertexContent: { $data: sharedId, $childHints: [] },
            },
          };
    },
    resolvePrerequisite: (id) => {
      calls.push(id);
      return {
        kind: 'found',
        vertex: {
          vertexId: remoteId,
          vertexContent: { $data: remoteId, $childHints: [] },
        },
      };
    },
  };
  const result = prepareDag({ traversableGraph: adapter });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(calls).toEqual(['root', undefined, sharedId, remoteId]);
  expect(
    result.dag.definition.vertices.map((vertex) => vertex.vertexId),
  ).toEqual([rootId, sharedId, remoteId]);
  expect(result.dag.definition.vertices[0]!.slots).toEqual([
    { kind: 'omitted', identity: { vertexId: undefined } },
    { kind: 'vertex', vertexId: sharedId },
    { kind: 'vertex', vertexId: sharedId },
  ]);
  expect(result.dag.definition.omittedIds).toEqual([undefined]);
  expect(result.dag.vertices[0]!.children).toEqual([sharedId, sharedId]);
  const roundtrip = prepareDagDefinition(result.dag.definition);
  if (roundtrip.kind !== 'valid') throw new Error('Expected valid');
  expect(roundtrip.dag.definition).toEqual(result.dag.definition);
  const replay = roundtrip.dag.createRunner();
  const graph = replay.getResolvedGraph();
  expect(graph.getParentsOf(graph.getVertexRefById(remoteId)!)).toEqual([]);
  expect(graph.getVertexRefById(sharedId)!.getValue().getData()).toBe(sharedId);
  expect(
    [...replay.iterateEvents()]
      .filter((event) => event.kind === 'workCompleted')
      .map((event) => event.vertexId),
  ).toEqual([rootId, remoteId, sharedId]);
  expect(calls).toEqual(['root', undefined, sharedId, remoteId]);
});

test('defineDag accepts graph-invalid source facts without executing or validating them', () => {
  const definition = defineDag({
    vertices: [
      {
        vertexId: 'a',
        data: 1,
        slots: [{ kind: 'vertex', vertexId: 'missing' }],
        dependsOnWork: ['a'],
        dependsOnSubgraphCompletion: ['unknown'],
      },
    ],
    omittedIds: ['unreachable'],
    entry: { kind: 'forest', slots: [{ kind: 'omitted', identity: null }] },
  });
  expect(definition.vertices[0]!.dependsOnWork).toEqual(['a']);
  expect(definition.entry).toEqual({
    kind: 'forest',
    slots: [{ kind: 'omitted', identity: null }],
  });
});

test('an omitted synthetic catalog root does not expose its private holder identity', () => {
  const result = prepareDag<G, string>({
    syntheticRoot: true,
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'omitted',
        vertexId: 'catalog',
        satisfiesDependencies: true,
      }),
      resolveChild: () => {
        throw new Error('No children');
      },
    },
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.dag.definition).toEqual({
    vertices: [],
    omittedIds: [],
    entry: { kind: 'forest', slots: [] },
  });
  expect(() =>
    result.dag.createRunner({ completedWork: new Set(['catalog']) }),
  ).toThrow(TypeError);
  expect([...result.dag.createRunner().iterateEvents()]).toEqual([]);
});

test('a live synthetic holder preserves omitted catalog entries for seed reuse', () => {
  const result = prepareDag({
    traversableGraph: omissionSource(),
    syntheticRoot: true,
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.dag.definition.entry).toEqual({
    kind: 'forest',
    slots: [
      { kind: 'omitted', identity: { vertexId: 'skip' } },
      { kind: 'vertex', vertexId: 'b' },
      { kind: 'vertex', vertexId: 'c' },
    ],
  });
  expect(result.dag.definition.omittedIds).toEqual(['skip']);
  expect(
    result.dag.definition.vertices.map((vertex) => vertex.vertexId),
  ).toEqual(['b', 'c']);
  expect(
    result.dag
      .createRunner({ completedWork: new Set(['skip']) })
      .run()
      .summary().completedWorkIds,
  ).toEqual(['b', 'c']);
});

test('definition copies remain independent of later caller edits to arrays and wrappers', () => {
  const slot: { kind: 'omitted'; identity: { vertexId: string } } = {
    kind: 'omitted',
    identity: { vertexId: 'skip' },
  };
  const vertex = {
    vertexId: 'a',
    data: 1,
    slots: [slot],
    dependsOnWork: ['skip'],
    dependsOnSubgraphCompletion: ['skip'],
  };
  const entry: { kind: 'forest'; slots: DagDefinitionSlot<string>[] } = {
    kind: 'forest',
    slots: [{ kind: 'vertex', vertexId: 'a' }],
  };
  const input = { vertices: [vertex], omittedIds: ['skip'], entry };
  const definition = defineDag(input);
  slot.identity.vertexId = 'changed';
  vertex.vertexId = 'changed';
  vertex.slots.length = 0;
  vertex.dependsOnWork.length = 0;
  vertex.dependsOnSubgraphCompletion.length = 0;
  input.vertices.length = 0;
  input.omittedIds.length = 0;
  entry.slots.length = 0;
  expect(definition).toEqual({
    vertices: [
      {
        vertexId: 'a',
        data: 1,
        slots: [{ kind: 'omitted', identity: { vertexId: 'skip' } }],
        dependsOnWork: ['skip'],
        dependsOnSubgraphCompletion: ['skip'],
      },
    ],
    omittedIds: ['skip'],
    entry: { kind: 'forest', slots: [{ kind: 'vertex', vertexId: 'a' }] },
  });
  if (definition.entry.kind !== 'forest') throw new Error('Expected forest');
  const entrySlots = definition.entry.slots;
  expect(() => (entrySlots as unknown[]).pop()).toThrow();
});
