import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { definitionSource } from '../src/traversals/dag-traversal/lib/definitionSource';
import { materializeMultiEntryDagInputFromRecordCatalog } from '../src';
import {
  copyAndNormalizeDagDefinition,
  validateAndPrepareDagDefinition,
  type DagDefinition,
  type DagStructuralDiscoverySlot,
} from '../src';
import { discoverValidateAndCaptureDag } from '../src/traversals/dag-traversal/prepareDag';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';

type G = VertexDataAndChildHintTypes<string, string>;

function omissionSource(anonymous = false): DagDiscoverySource<G, G, string> {
  return {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexId: 'root',
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: anonymous
            ? ['before', 'skip', 'after', 'b', 'c']
            : ['skip', 'b', 'c'],
        },
      },
    }),
    resolveChildHint: (id) =>
      ['before', 'skip', 'after'].includes(id)
        ? {
            omittedVertexIdentity: id === 'skip' ? { vertexId: id } : null,
            kind: 'vertexIntentionallyOmitted',
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }
        : {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: id,
              workWaitsForWorkOf: id === 'b' ? ['skip'] : [],
              vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
            },
          },
  };
}

test('definitions retain an omitted discovery slot before its dependent sibling', () => {
  const result = discoverValidateAndCaptureDag({
    dagDiscoverySource: omissionSource(),
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(
    result.validatedTopology.definition.vertexDeclarations[0]!
      .childDiscoverySlots,
  ).toEqual([
    { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
    { kind: 'vertex', vertexId: 'b' },
    { kind: 'vertex', vertexId: 'c' },
  ]);
  expect(
    [
      ...result.validatedTopology
        .createIndependentRunnerFromValidatedTopology()
        .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ].map((event) => [event.vertexId, event.eventKind]),
  ).toEqual([
    ['root', 'workCompletionCommitted'],
    ['b', 'workCompletionCommitted'],
    ['c', 'workCompletionCommitted'],
    ['b', 'subgraphCompletionCommitted'],
    ['c', 'subgraphCompletionCommitted'],
    ['root', 'subgraphCompletionCommitted'],
  ]);
});

// Removing copies/freezes would let later caller edits change replay topology.
test('defineDag owns wrappers while retaining arbitrary data and ID references', () => {
  const id = { name: 'id' };
  const data = { value: 1 };
  const input: DagDefinition<typeof data, unknown> = {
    vertexDeclarations: [
      {
        vertexId: id,
        data,
        childDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
        ],
        workWaitsForWorkOf: [undefined, undefined, NaN, NaN],
        workWaitsForSubgraphCompletionOf: [null],
      },
    ],
    omittedVertexIds: [undefined],
    entry: { kind: 'root', vertexId: id },
  };
  const definition = copyAndNormalizeDagDefinition(input);
  expect(definition).not.toBe(input);
  expect(definition.vertexDeclarations[0]!.data).toBe(data);
  expect(definition.vertexDeclarations[0]!.vertexId).toBe(id);
  expect(definition.vertexDeclarations[0]!.workWaitsForWorkOf).toEqual([
    undefined,
    NaN,
  ]);
  expect(definition.vertexDeclarations[0]!.childDiscoverySlots[0]).not.toBe(
    input.vertexDeclarations[0]!.childDiscoverySlots[0],
  );
  expect(() => (definition.vertexDeclarations as unknown[]).pop()).toThrow();
  expect(() =>
    (definition.vertexDeclarations[0]!.childDiscoverySlots as unknown[]).pop(),
  ).toThrow();
  expect(() =>
    (definition.vertexDeclarations[0]!.workWaitsForWorkOf as unknown[]).pop(),
  ).toThrow();
  expect(() =>
    (
      definition.vertexDeclarations[0]!
        .workWaitsForSubgraphCompletionOf as unknown[]
    ).pop(),
  ).toThrow();
  expect(() => (definition.omittedVertexIds as unknown[]).pop()).toThrow();
  expect(Object.isFrozen(definition)).toBe(true);
  expect(Object.isFrozen(definition.vertexDeclarations[0])).toBe(true);
  expect(Object.isFrozen(definition.entry)).toBe(true);
  expect(
    Object.isFrozen(definition.vertexDeclarations[0]!.childDiscoverySlots[0]),
  ).toBe(true);
  const slot = definition.vertexDeclarations[0]!.childDiscoverySlots[0]!;
  if (slot.kind === 'omitted')
    expect(Object.isFrozen(slot.omittedVertexIdentity)).toBe(true);
  expect(Object.isFrozen(id)).toBe(false);
  expect(Object.isFrozen(data)).toBe(false);
  data.value = 2;
  expect(definition.vertexDeclarations[0]!.data.value).toBe(2);
});

test.each([
  null,
  [],
  {},
  { vertexDeclarations: [], omittedVertexIds: [], entry: null },
  { vertexDeclarations: null, omittedVertexIds: [], entry: { kind: 'empty' } },
  { vertexDeclarations: [], omittedVertexIds: null, entry: { kind: 'empty' } },
  { vertexDeclarations: [], omittedVertexIds: [], entry: { kind: 'other' } },
  { vertexDeclarations: [], omittedVertexIds: [], entry: { kind: 'root' } },
  {
    vertexDeclarations: [null],
    omittedVertexIds: [],
    entry: { kind: 'empty' },
  },
  {
    vertexDeclarations: [
      {
        data: 0,
        childDiscoverySlots: [],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [],
    entry: { kind: 'empty' },
  },
  {
    vertexDeclarations: [
      {
        vertexId: 0,
        childDiscoverySlots: [],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [],
    entry: { kind: 'empty' },
  },
  {
    vertexDeclarations: [],
    omittedVertexIds: [],
    entry: { kind: 'roots', entryDiscoverySlots: [null] },
  },
  {
    vertexDeclarations: [],
    omittedVertexIds: [],
    entry: { kind: 'roots', entryDiscoverySlots: [{ kind: 'other' }] },
  },
  {
    vertexDeclarations: [],
    omittedVertexIds: [],
    entry: { kind: 'roots', entryDiscoverySlots: [{ kind: 'vertex' }] },
  },
  {
    vertexDeclarations: [],
    omittedVertexIds: [],
    entry: {
      kind: 'roots',
      entryDiscoverySlots: [{ kind: 'vertexIntentionallyOmitted' }],
    },
  },
  {
    vertexDeclarations: [],
    omittedVertexIds: [],
    entry: {
      kind: 'roots',
      entryDiscoverySlots: [{ kind: 'omitted', omittedVertexIdentity: {} }],
    },
  },
])('defineDag rejects malformed declarations %#', (input) => {
  expect(() => copyAndNormalizeDagDefinition(input as any)).toThrow(TypeError);
});

test.each(['vertices', 'omittedVertexIds', 'mixed'] as const)(
  'defineDag rejects SameValueZero duplicate %s declarations',
  (domain) => {
    const vertex = {
      vertexId: NaN,
      data: 0,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    };
    expect(() =>
      copyAndNormalizeDagDefinition({
        vertexDeclarations:
          domain === 'omittedVertexIds'
            ? []
            : domain === 'vertices'
            ? [vertex, vertex]
            : [vertex],
        omittedVertexIds:
          domain === 'vertices'
            ? []
            : domain === 'omittedVertexIds'
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
    copyAndNormalizeDagDefinition({
      vertexDeclarations: [],
      omittedVertexIds: [undefined],
      entry,
    }).entry,
  ).toEqual({ kind: 'root', vertexId: undefined });
  const error = { exact: true };
  let caught: unknown;
  try {
    copyAndNormalizeDagDefinition(
      Object.defineProperty({}, 'vertexDeclarations', {
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
    const original = new DagTraversalBuilder({ dagDiscoverySource: adapter })
      .createIndependentRunnerFromCurrentOptions()
      .discoverValidateAndFreezeTopology();
    const result = discoverValidateAndCaptureDag({
      dagDiscoverySource: adapter,
    });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    const definition = copyAndNormalizeDagDefinition(
      result.validatedTopology.definition,
    );
    expect(definition.vertexDeclarations[0]!.childDiscoverySlots).toEqual(
      anonymous
        ? [
            { kind: 'omitted', omittedVertexIdentity: null },
            { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
            { kind: 'omitted', omittedVertexIdentity: null },
            { kind: 'vertex', vertexId: 'b' },
            { kind: 'vertex', vertexId: 'c' },
          ]
        : [
            { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
            { kind: 'vertex', vertexId: 'b' },
            { kind: 'vertex', vertexId: 'c' },
          ],
    );
    const roundtrip = validateAndPrepareDagDefinition(definition);
    if (roundtrip.kind !== 'valid') throw new Error('Expected valid');
    expect(roundtrip.validatedTopology.definition).toEqual(definition);
    const replay =
      roundtrip.validatedTopology.createIndependentRunnerFromValidatedTopology();
    const replayAsync =
      await roundtrip.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology();
    const expected = [
      ['root', 'workCompletionCommitted'],
      ['b', 'workCompletionCommitted'],
      ['c', 'workCompletionCommitted'],
      ['b', 'subgraphCompletionCommitted'],
      ['c', 'subgraphCompletionCommitted'],
      ['root', 'subgraphCompletionCommitted'],
    ];
    expect(
      [
        ...original.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
      ].map((event) => [event.vertexId, event.eventKind]),
    ).toEqual(expected);
    expect(
      [...replay.runAndIterateObservationEventsUntilSuspendedOrTerminal()].map(
        (event) => [event.vertexId, event.eventKind],
      ),
    ).toEqual(expected);
    const events: unknown[] = [];
    for await (const event of replayAsync.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      events.push([event.vertexId, event.eventKind]);
    expect(events).toEqual(expected);
    expect(replay.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
      3,
    );
    expect(
      replay.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
    ).toEqual([]);
    expect(
      replay
        .getLiveResolvedGraphView()
        .getDesignatedRootHandleOrNull()!
        .getCurrentVertexView()
        .getDetachedChildDiscoveryHints(),
    ).toEqual(['skip', 'b', 'c']);
  });
}

test('definitions retain empty and omitted roots separately from forest catalogs', () => {
  for (const identified of [false, true]) {
    const result = discoverValidateAndCaptureDag<G, unknown>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          omittedVertexIdentity: identified ? { vertexId: undefined } : null,
          kind: 'vertexIntentionallyOmitted',
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
        resolveChildHint: () => {
          throw new Error('No children');
        },
      },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    expect(result.validatedTopology.definition).toEqual({
      vertexDeclarations: [],
      omittedVertexIds: identified ? [undefined] : [],
      entry: { kind: 'empty' },
    });
    const replay = new DagTraversalBuilder(
      definitionSource(result.validatedTopology.definition),
    )
      .createIndependentRunnerFromCurrentOptions()
      .discoverValidateAndFreezeTopology();
    expect([
      ...replay.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
    ]).toEqual([]);
    expect(replay.getTraversalStopReason()).toBe('finished');
  }
  const forest = discoverValidateAndCaptureDag(
    materializeMultiEntryDagInputFromRecordCatalog(['a', 'b'], {
      selectVertexId: (id) => id,
    }),
  );
  if (forest.kind !== 'valid') throw new Error('Expected valid');
  expect(forest.validatedTopology.definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'vertex', vertexId: 'a' },
      { kind: 'vertex', vertexId: 'b' },
    ],
  });
  const empty = discoverValidateAndCaptureDag(
    materializeMultiEntryDagInputFromRecordCatalog<string, string>([], {
      selectVertexId: (id) => id,
    }),
  );
  if (empty.kind !== 'valid') throw new Error('Expected valid');
  expect(empty.validatedTopology.definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [],
  });
  const omittedHolder = discoverValidateAndCaptureDag<G, string>({
    sourceRootIsHiddenEntryHolder: true,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted',
      }),
      resolveChildHint: () => {
        throw new Error('No children');
      },
    },
  });
  if (omittedHolder.kind !== 'valid') throw new Error('Expected valid');
  expect(omittedHolder.validatedTopology.definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [],
  });
});

test('definition replay retains structural sharing and detached prerequisites without caller callbacks', () => {
  const rootId = { label: 'root' };
  const sharedId = { label: 'shared' };
  const remoteId = { label: 'remote' };
  type ID = typeof rootId | undefined;
  type ObjectGraph = VertexDataAndChildHintTypes<{ label: string }, ID>;
  const calls: unknown[] = [];
  const adapter: DagDiscoverySource<ObjectGraph, ObjectGraph, ID> = {
    resolveRootVertex: () => {
      calls.push('root');
      return {
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: rootId,
          vertexContentInput: {
            $vertexData: rootId,
            $childDiscoveryHints: [undefined, sharedId, sharedId],
          },
        },
      };
    },
    tryGetVertexIdentityFromHint: (vertexId) =>
      Object.defineProperty({}, 'vertexId', { value: vertexId }) as {
        vertexId: ID;
      },
    resolveChildHint: (id) => {
      calls.push(id);
      return id === undefined
        ? {
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted',
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }
        : {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: sharedId,
              workWaitsForWorkOf: [undefined, remoteId],
              vertexContentInput: {
                $vertexData: sharedId,
                $childDiscoveryHints: [],
              },
            },
          };
    },
    resolvePrerequisiteByVertexId: (id) => {
      calls.push(id);
      return {
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: remoteId,
          vertexContentInput: {
            $vertexData: remoteId,
            $childDiscoveryHints: [],
          },
        },
      };
    },
  };
  const result = discoverValidateAndCaptureDag({ dagDiscoverySource: adapter });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(calls).toEqual(['root', undefined, sharedId, remoteId]);
  expect(
    result.validatedTopology.definition.vertexDeclarations.map(
      (vertex) => vertex.vertexId,
    ),
  ).toEqual([rootId, sharedId, remoteId]);
  expect(
    result.validatedTopology.definition.vertexDeclarations[0]!
      .childDiscoverySlots,
  ).toEqual([
    { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
    { kind: 'vertex', vertexId: sharedId },
    { kind: 'vertex', vertexId: sharedId },
  ]);
  expect(result.validatedTopology.definition.omittedVertexIds).toEqual([
    undefined,
  ]);
  expect(
    result.validatedTopology.liveVertexSummaries[0]!
      .liveStructuralChildVertexIds,
  ).toEqual([sharedId, sharedId]);
  const roundtrip = validateAndPrepareDagDefinition(
    result.validatedTopology.definition,
  );
  if (roundtrip.kind !== 'valid') throw new Error('Expected valid');
  expect(roundtrip.validatedTopology.definition).toEqual(
    result.validatedTopology.definition,
  );
  const replay =
    roundtrip.validatedTopology.createIndependentRunnerFromValidatedTopology();
  const graph = replay.getLiveResolvedGraphView();
  expect(
    graph.getDistinctStructuralParentHandlesOrNull(
      graph.getVertexHandleByIdOrNull(remoteId)!,
    ),
  ).toEqual([]);
  expect(
    graph
      .getVertexHandleByIdOrNull(sharedId)!
      .getCurrentVertexView()
      .getVertexData(),
  ).toBe(sharedId);
  expect(
    [...replay.runAndIterateObservationEventsUntilSuspendedOrTerminal()]
      .filter((event) => event.eventKind === 'workCompletionCommitted')
      .map((event) => event.vertexId),
  ).toEqual([rootId, remoteId, sharedId]);
  expect(calls).toEqual(['root', undefined, sharedId, remoteId]);
});

test('defineDag accepts graph-invalid source facts without executing or validating them', () => {
  const definition = copyAndNormalizeDagDefinition({
    vertexDeclarations: [
      {
        vertexId: 'a',
        data: 1,
        childDiscoverySlots: [{ kind: 'vertex', vertexId: 'missing' }],
        workWaitsForWorkOf: ['a'],
        workWaitsForSubgraphCompletionOf: ['unknown'],
      },
    ],
    omittedVertexIds: ['outsideEntryDiscoveryClosure'],
    entry: {
      kind: 'roots',
      entryDiscoverySlots: [{ kind: 'omitted', omittedVertexIdentity: null }],
    },
  });
  expect(definition.vertexDeclarations[0]!.workWaitsForWorkOf).toEqual(['a']);
  expect(definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [{ kind: 'omitted', omittedVertexIdentity: null }],
  });
});

test('an omitted synthetic catalog root does not expose its private holder identity', () => {
  const result = discoverValidateAndCaptureDag<G, string>({
    sourceRootIsHiddenEntryHolder: true,
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexIntentionallyOmitted',
        omittedVertexIdentity: { vertexId: 'catalog' },
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
      resolveChildHint: () => {
        throw new Error('No children');
      },
    },
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.validatedTopology.definition).toEqual({
    vertexDeclarations: [],
    omittedVertexIds: [],
    entry: { kind: 'roots', entryDiscoverySlots: [] },
  });
  expect(() =>
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      acceptedCompletedWorkVertexIds: new Set(['catalog']),
    }),
  ).toThrow(TypeError);
  expect([
    ...result.validatedTopology
      .createIndependentRunnerFromValidatedTopology()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
});

test('a live synthetic holder preserves omitted catalog entries for seed reuse', () => {
  const result = discoverValidateAndCaptureDag({
    dagDiscoverySource: omissionSource(),
    sourceRootIsHiddenEntryHolder: true,
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(result.validatedTopology.definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
      { kind: 'vertex', vertexId: 'b' },
      { kind: 'vertex', vertexId: 'c' },
    ],
  });
  expect(result.validatedTopology.definition.omittedVertexIds).toEqual([
    'skip',
  ]);
  expect(
    result.validatedTopology.definition.vertexDeclarations.map(
      (vertex) => vertex.vertexId,
    ),
  ).toEqual(['b', 'c']);
  expect(
    result.validatedTopology
      .createIndependentRunnerFromValidatedTopology({
        acceptedCompletedWorkVertexIds: new Set(['skip']),
      })
      .runUntilSuspendedOrTerminal()
      .captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual(['b', 'c']);
});

test('definition copies remain independent of later caller edits to arrays and wrappers', () => {
  const slot: { kind: 'omitted'; omittedVertexIdentity: { vertexId: string } } =
    {
      kind: 'omitted',
      omittedVertexIdentity: { vertexId: 'skip' },
    };
  const vertex = {
    vertexId: 'a',
    data: 1,
    childDiscoverySlots: [slot],
    workWaitsForWorkOf: ['skip'],
    workWaitsForSubgraphCompletionOf: ['skip'],
  };
  const entry: {
    kind: 'roots';
    entryDiscoverySlots: DagStructuralDiscoverySlot<string>[];
  } = {
    kind: 'roots',
    entryDiscoverySlots: [{ kind: 'vertex', vertexId: 'a' }],
  };
  const input = {
    vertexDeclarations: [vertex],
    omittedVertexIds: ['skip'],
    entry,
  };
  const definition = copyAndNormalizeDagDefinition(input);
  slot.omittedVertexIdentity.vertexId = 'changed';
  vertex.vertexId = 'changed';
  vertex.childDiscoverySlots.length = 0;
  vertex.workWaitsForWorkOf.length = 0;
  vertex.workWaitsForSubgraphCompletionOf.length = 0;
  input.vertexDeclarations.length = 0;
  input.omittedVertexIds.length = 0;
  entry.entryDiscoverySlots.length = 0;
  expect(definition).toEqual({
    vertexDeclarations: [
      {
        vertexId: 'a',
        data: 1,
        childDiscoverySlots: [
          { kind: 'omitted', omittedVertexIdentity: { vertexId: 'skip' } },
        ],
        workWaitsForWorkOf: ['skip'],
        workWaitsForSubgraphCompletionOf: ['skip'],
      },
    ],
    omittedVertexIds: ['skip'],
    entry: {
      kind: 'roots',
      entryDiscoverySlots: [{ kind: 'vertex', vertexId: 'a' }],
    },
  });
  if (definition.entry.kind !== 'roots') throw new Error('Expected forest');
  const entrySlots = definition.entry.entryDiscoverySlots;
  expect(() => (entrySlots as unknown[]).pop()).toThrow();
});
