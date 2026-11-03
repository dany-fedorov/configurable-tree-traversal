import { DagStructuralDiscoveryCycleError as SubpathCycleError } from '../src/traversals/dag-traversal';
import { DagStructuralDiscoveryCycleError } from '../src';
import {
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
} from '../src/traversals/dag-traversal/prepareDag';
import { DagTraversalStallError } from '../src/core/errors/DagTraversalStallError';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeDagInputFromRootRecords,
} from '../src/sources';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';

type T = VertexDataAndChildHintTypes<{ name: string }, string>;

function source(calls: string[] = []): DagDiscoverySource<T, T, string> {
  return {
    resolveRootVertex: () => {
      calls.push('root');
      return {
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: 'a',
          vertexContentInput: {
            $vertexData: { name: 'a' },
            $childDiscoveryHints: ['b'],
          },
        },
      };
    },
    resolveChildHint: (id) => {
      calls.push(id);
      return {
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: ['a'],
          vertexContentInput: {
            $vertexData: { name: id },
            $childDiscoveryHints: [],
          },
        },
      };
    },
  };
}

test('a prepared topology starts independent seeded runners without source I/O', () => {
  const calls: string[] = [];
  const result = discoverValidateAndCaptureDag({
    dagDiscoverySource: source(calls),
  });
  if (result.kind !== 'valid') throw new Error('Expected valid DAG');
  expect(calls).toEqual(['root', 'b']);
  const visited: string[] = [];
  const first =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      visitors: {
        [Order.ON_WORK_READY]: (vertex) => {
          visited.push(vertex.getVertexData().name);
        },
      },
    });
  const second =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      acceptedCompletedWorkVertexIds: new Set(['a']),
    });
  expect(visited).toEqual([]);
  expect(first.getTraversalStopReason()).toBe('prepared');
  expect(
    first.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
  ).not.toBe(second.getLiveResolvedGraphView().getDesignatedRootHandleOrNull());
  first.runUntilSuspendedOrTerminal();
  expect(
    second.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual(['a']);
  expect(visited).toEqual(['a', 'b']);
  expect(
    [...second.runAndIterateObservationEventsUntilSuspendedOrTerminal()]
      .filter((event) => event.eventKind === 'workCompletionCommitted')
      .map((event) => event.vertexId),
  ).toEqual(['b']);
  expect(calls).toEqual(['root', 'b']);
  expect(
    result.validatedTopology.liveVertexSummaries.map((vertex) => [
      vertex.vertexId,
      vertex.liveStructuralChildVertexIds,
    ]),
  ).toEqual([
    ['a', ['b']],
    ['b', []],
  ]);
});

test('async preparation supports both sync and async independent sessions', async () => {
  const calls: string[] = [];
  const adapter = source(calls);
  const result = await discoverValidateAndCaptureDagAsync({
    dagDiscoverySource: {
      ...adapter,
      resolveRootVertex: async () => adapter.resolveRootVertex(),
    },
    maxConcurrentCallbackInvocations: 2,
  });
  if (result.kind !== 'valid') throw new Error('Expected valid DAG');
  const first = result.validatedTopology.createExternalWorkSession();
  const second = await result.validatedTopology.createAsyncExternalWorkSession({
    acceptedCompletedWorkVertexIds: new Set(['a']),
  });
  const work = first.runUntilWorkBoundary();
  const other = await second.runUntilWorkBoundary();
  if (work.kind !== 'awaitingSettlement' || other.kind !== 'awaitingSettlement')
    throw new Error('Expected frontier');
  expect(work.workSettlementTickets.map((ticket) => ticket.vertexId)).toEqual([
    'a',
  ]);
  expect(other.workSettlementTickets.map((ticket) => ticket.vertexId)).toEqual([
    'b',
  ]);
  expect(() =>
    first.acceptCompletedWork(other.workSettlementTickets[0]!),
  ).toThrow();
  second.acceptCompletedWork(other.workSettlementTickets[0]!);
  expect(await second.runUntilWorkBoundary()).toEqual({ kind: 'finished' });
  expect(
    first.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual([]);
  expect(calls).toEqual(['root', 'b']);
});

test('dependency invalidity is structured while adapter errors keep exact identity', async () => {
  const adapter = source();
  const root = adapter.resolveRootVertex();
  if (!('kind' in root) || root.kind !== 'vertexResolved')
    throw new Error('Expected found');
  root.resolvedVertexInput.workWaitsForWorkOf = ['missing'];
  const invalid = discoverValidateAndCaptureDag({
    dagDiscoverySource: { ...adapter, resolveRootVertex: () => root },
  });
  expect(invalid).toMatchObject({
    kind: 'invalid',
    issues: [
      {
        kind: 'milestoneDependencyStall',
        diagnostics: { unresolvedPrerequisiteVertexIds: ['missing'] },
      },
    ],
  });
  expect(invalid).not.toHaveProperty('diagnostics');
  const error = new DagTraversalStallError({
    blockedVertexPrerequisiteReports: [],
    unresolvedPrerequisiteVertexIds: [],
    milestoneCycleVertexIdComponents: [],
    nonCyclePrerequisiteBlockedVertexIds: [],
    incompleteVertexIdsWithoutUnmetPrerequisites: [],
  });
  expect(() =>
    discoverValidateAndCaptureDag({
      dagDiscoverySource: {
        ...adapter,
        resolveRootVertex: () => {
          throw error;
        },
      },
    }),
  ).toThrow(error);
  await expect(
    discoverValidateAndCaptureDagAsync({
      dagDiscoverySource: {
        ...adapter,
        resolveRootVertex: async () => {
          throw null;
        },
      },
    }),
  ).rejects.toBeNull();
});

for (const prepare of [
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
]) {
  test.each([
    undefined,
    null,
    Symbol('caller error'),
    { reason: 'caller error' },
    new DagStructuralDiscoveryCycleError(['caller', 'caller']),
    new DagTraversalStallError({
      blockedVertexPrerequisiteReports: [],
      unresolvedPrerequisiteVertexIds: [],
      milestoneCycleVertexIdComponents: [],
      nonCyclePrerequisiteBlockedVertexIds: [],
      incompleteVertexIdsWithoutUnmetPrerequisites: [],
    }),
  ])(`${prepare.name} preserves exact source failures: %p`, async (error) => {
    await expect(async () =>
      prepare<T, string>({
        dagDiscoverySource: {
          ...source(),
          resolveRootVertex: () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  });

  test(`${prepare.name} retains omitted hints and prerequisite identities across seeds`, async () => {
    const adapter: DagDiscoverySource<T, T, string> = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: 'a',
          vertexContentInput: {
            $vertexData: { name: 'a' },
            $childDiscoveryHints: ['skip', 'b'],
          },
        },
      }),
      tryGetVertexIdentityFromHint: (id) => ({ vertexId: id }),
      resolveChildHint: (id) =>
        id === 'skip'
          ? {
              omittedVertexIdentity: null,
              kind: 'vertexIntentionallyOmitted',
              satisfiesWorkAndSubgraphCompletionPrerequisites: true,
            }
          : {
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexId: id,
                workWaitsForWorkOf: ['skip', 'external'],
                workWaitsForSubgraphCompletionOf: ['skip'],
                vertexContentInput: {
                  $vertexData: { name: id },
                  $childDiscoveryHints: [],
                },
              },
            },
      resolvePrerequisiteByVertexId: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted',
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
    };
    const result = await prepare<T, string>({ dagDiscoverySource: adapter });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    const runner =
      result.validatedTopology.createIndependentRunnerFromValidatedTopology({
        acceptedCompletedWorkVertexIds: new Set(['skip', 'external']),
      });
    expect(
      runner.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
    ).toEqual([]);
    runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalStopReason()).toBe('finished');
    expect(
      result.validatedTopology.liveVertexSummaries.map(
        (vertex) => vertex.vertexId,
      ),
    ).toEqual(['a', 'b']);
  });

  test(`${prepare.name} distinguishes empty catalogs and explicitly omitted roots`, async () => {
    for (const explicit of [false, true]) {
      const result = await prepare<T, string>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            omittedVertexIdentity: explicit ? { vertexId: 'empty' } : null,
            kind: 'vertexIntentionallyOmitted',
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
          resolveChildHint: () => {
            throw new Error('No children');
          },
        },
      });
      if (result.kind !== 'valid') throw new Error('Expected valid');
      expect(result.validatedTopology.liveVertexSummaries).toEqual([]);
      const session = result.validatedTopology.createExternalWorkSession(
        explicit ? { acceptedCompletedWorkVertexIds: new Set(['empty']) } : {},
      );
      expect(session.runUntilWorkBoundary()).toEqual({ kind: 'finished' });
    }
    const empty = await prepare<
      VertexDataAndChildHintTypes<string, string>,
      string
    >(
      materializeMultiEntryDagInputFromRecordCatalog<string, string>([], {
        selectVertexId: (id) => id,
      }),
    );
    if (empty.kind !== 'valid') throw new Error('Expected valid');
    expect(
      empty.validatedTopology
        .createExternalWorkSession()
        .runUntilWorkBoundary(),
    ).toEqual({
      kind: 'finished',
    });
  });

  test(`${prepare.name} returns missing prerequisites as milestone issues`, async () => {
    const missing = await prepare<
      VertexDataAndChildHintTypes<string, string>,
      string
    >(
      materializeMultiEntryDagInputFromRecordCatalog(['a'], {
        selectVertexId: (id) => id,
        selectWorkPrerequisiteVertexIds: () => ['absent'],
      }),
    );
    expect(missing).toMatchObject({
      kind: 'invalid',
      issues: [
        {
          kind: 'milestoneDependencyStall',
          diagnostics: { unresolvedPrerequisiteVertexIds: ['absent'] },
        },
      ],
    });
    expect(missing).not.toHaveProperty('diagnostics');
  });

  test(`${prepare.name} returns dependency cycles as milestone issues`, async () => {
    const cycle = await prepare<
      VertexDataAndChildHintTypes<string, string>,
      string
    >(
      materializeMultiEntryDagInputFromRecordCatalog(['a', 'b'], {
        selectVertexId: (id) => id,
        selectWorkPrerequisiteVertexIds: (id) => [id === 'a' ? 'b' : 'a'],
      }),
    );
    expect(cycle).toMatchObject({
      kind: 'invalid',
      issues: [
        {
          kind: 'milestoneDependencyStall',
          diagnostics: {
            milestoneCycleVertexIdComponents: [
              expect.arrayContaining(['a', 'b']),
            ],
          },
        },
      ],
    });
    expect(cycle).not.toHaveProperty('diagnostics');
  });
}

test('prepared discovery retains undefined omission IDs and transitive detached prerequisites', async () => {
  type ID = string | undefined;
  type G = VertexDataAndChildHintTypes<ID, ID>;
  const adapter: DagDiscoverySource<G, G, ID> = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexId: 'root',
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: [undefined, 'work'],
        },
      },
    }),
    tryGetVertexIdentityFromHint: (vertexId) => ({ vertexId }),
    resolveChildHint: (id) =>
      id === undefined
        ? {
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted',
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }
        : {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: id,
              workWaitsForWorkOf: [undefined, 'remote'],
              vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
            },
          },
    resolvePrerequisiteByVertexId: (id) => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexId: id,
        workWaitsForWorkOf: id === 'remote' ? ['earlier'] : [],
        vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
      },
    }),
  };
  const original = new DagTraversalBuilder({ dagDiscoverySource: adapter })
    .createIndependentRunnerFromCurrentOptions()
    .discoverValidateAndFreezeTopology();
  const result = await discoverValidateAndCaptureDagAsync({
    dagDiscoverySource: adapter,
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology();
  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ].map((event) => [event.vertexId, event.eventKind]);
  expect(events).toEqual(
    [...original.runAndIterateObservationEventsUntilSuspendedOrTerminal()].map(
      (event) => [event.vertexId, event.eventKind],
    ),
  );
  const seeded =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      acceptedCompletedWorkVertexIds: new Set<ID>([
        undefined,
        'earlier',
        'remote',
      ]),
    });
  expect(
    seeded.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
  ).toEqual([]);
  expect(
    [...seeded.runAndIterateObservationEventsUntilSuspendedOrTerminal()]
      .filter((event) => event.eventKind === 'workCompletionCommitted')
      .map((event) => event.vertexId),
  ).toEqual(['root', 'work']);
  expect(
    runner
      .getLiveResolvedGraphView()
      .getDistinctStructuralParentHandlesOrNull(
        runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('remote')!,
      ),
  ).toEqual([]);
});

test('unidentified omitted children do not become fake prepared identities', () => {
  const adapter: DagDiscoverySource<T, T, string> = {
    ...source(),
    resolveChildHint: () => ({
      omittedVertexIdentity: null,
      kind: 'vertexIntentionallyOmitted',
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    }),
  };
  const result = discoverValidateAndCaptureDag({ dagDiscoverySource: adapter });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner = result.validatedTopology
    .createIndependentRunnerFromValidatedTopology()
    .runUntilSuspendedOrTerminal();
  expect(
    result.validatedTopology.liveVertexSummaries.map(
      (vertex) => vertex.vertexId,
    ),
  ).toEqual(['a']);
  expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(1);
  expect(runner.getTraversalStopReason()).toBe('finished');
});

test('prepared definitions preserve effective implicit work dependencies and root policy', () => {
  const adapter = source();
  const resolveChild: typeof adapter.resolveChildHint = (id) => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: id,
      vertexContentInput: {
        $vertexData: { name: id },
        $childDiscoveryHints: [],
      },
    },
  });
  const implicit = discoverValidateAndCaptureDag({
    dagDiscoverySource: { ...adapter, resolveChildHint: resolveChild },
    undeclaredWorkPrerequisitePolicy: 'waitForDiscoveringParentWork',
  });
  if (implicit.kind !== 'valid') throw new Error('Expected valid');
  expect(
    implicit.validatedTopology.liveVertexSummaries[1]!.workWaitsForWorkOf,
  ).toEqual(['a']);
  const session = implicit.validatedTopology.createExternalWorkSession();
  const boundary = session.runUntilWorkBoundary();
  if (boundary.kind !== 'awaitingSettlement') throw new Error('Expected work');
  expect(
    boundary.workSettlementTickets.map((ticket) => ticket.vertexId),
  ).toEqual(['a']);
  session.acceptCompletedWork(boundary.workSettlementTickets[0]!);
  expect(session.runUntilWorkBoundary()).toMatchObject({
    workSettlementTickets: [{ vertexId: 'b' }],
  });

  const ignored = discoverValidateAndCaptureDag({
    rootWorkPrerequisitePolicy: 'ignore',
    dagDiscoverySource: {
      ...adapter,
      resolveChildHint: resolveChild,
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: 'a',
          workWaitsForWorkOf: ['b'],
          vertexContentInput: {
            $vertexData: { name: 'a' },
            $childDiscoveryHints: ['b'],
          },
        },
      }),
    },
  });
  if (ignored.kind !== 'valid') throw new Error('Expected valid');
  const runner =
    ignored.validatedTopology.createIndependentRunnerFromValidatedTopology();
  expect(
    [...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()]
      .filter((event) => event.eventKind === 'workCompletionCommitted')
      .map((event) => event.vertexId),
  ).toEqual(['a', 'b']);
});

test('prepared forest completion joins retain structural sharing and order', () => {
  type Item = { id: string; children: Item[]; after?: string[] };
  const shared: Item = { id: 'shared', children: [] };
  const roots: Item[] = [
    { id: 'left', children: [shared] },
    { id: 'right', children: [shared] },
    { id: 'review', children: [], after: ['left', 'right'] },
  ];
  const result = discoverValidateAndCaptureDag(
    materializeDagInputFromRootRecords(roots, {
      selectVertexId: (item) => item.id,
      selectStructuralChildRecords: (item) => item.children,
      selectSubgraphCompletionPrerequisiteVertexIds: (item) => item.after ?? [],
    }),
  );
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology();
  const graph = runner.getLiveResolvedGraphView();
  expect(graph.getDesignatedRootHandleOrNull()).toBeNull();
  expect(
    graph
      .getDistinctStructuralParentHandlesOrNull(
        graph.getVertexHandleByIdOrNull('shared')!,
      )!
      .map((ref) => graph.requireVertexId(ref)),
  ).toEqual(['left', 'right']);
  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ].map((event) => [event.vertexId, event.eventKind]);
  const review = events.findIndex(
    ([id, kind]) => id === 'review' && kind === 'workCompletionCommitted',
  );
  expect(
    events.findIndex(
      ([id, kind]) => id === 'left' && kind === 'subgraphCompletionCommitted',
    ),
  ).toBeLessThan(review);
  expect(
    events.findIndex(
      ([id, kind]) => id === 'right' && kind === 'subgraphCompletionCommitted',
    ),
  ).toBeLessThan(review);
});

test('definition arrays are immutable while arbitrary IDs and data stay shallow', async () => {
  const objectId = { key: 'object' };
  const symbol = Symbol('id');
  const ids: unknown[] = [undefined, null, NaN, objectId, symbol];
  const items = ids.map((id) => ({ id, label: 'original' }));
  const result = discoverValidateAndCaptureDag(
    materializeMultiEntryDagInputFromRecordCatalog(items, {
      selectVertexId: (item) => item.id,
    }),
  );
  if (result.kind !== 'valid') throw new Error('Expected valid');
  expect(() =>
    (result.validatedTopology.liveVertexSummaries as unknown[]).pop(),
  ).toThrow();
  expect(() =>
    (
      result.validatedTopology.liveVertexSummaries[0]!
        .liveStructuralChildVertexIds as unknown[]
    ).push(symbol),
  ).toThrow();
  expect(Object.isFrozen(objectId)).toBe(false);
  expect(Object.isFrozen(items[0])).toBe(false);
  items[0]!.label = 'updated';
  const first =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      retainDiscoveredGraphBeforeVisitorCommands: true,
    });
  const second =
    await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology();
  expect(
    first
      .getLiveResolvedGraphView()
      .getVertexHandles()
      .map((ref) => first.getLiveResolvedGraphView().requireVertexId(ref)),
  ).toEqual(ids);
  expect(
    second
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull(undefined)!
      .getCurrentVertexView()
      .getVertexData(),
  ).toBe(items[0]);
  expect(
    second
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull(undefined)!
      .getCurrentVertexView()
      .getVertexData().label,
  ).toBe('updated');
  first.runUntilSuspendedOrTerminal();
  await second.runUntilSuspendedOrTerminal();
  expect(first.preCommandDiscoveredGraphView).not.toBeNull();
});

test('prepared runners reject topology-changing visitor commands independently', () => {
  const result = discoverValidateAndCaptureDag({
    dagDiscoverySource: source(),
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const runner =
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      visitors: {
        [Order.ON_WORK_READY]: () => ({
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: [] },
            },
          ],
        }),
      },
    });
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(/topology/);
  expect(
    result.validatedTopology
      .createIndependentRunnerFromValidatedTopology()
      .runUntilSuspendedOrTerminal()
      .getTraversalStopReason(),
  ).toBe('finished');
});

test('prepared option boundaries reject overrides including present undefined before callbacks', async () => {
  const calls: string[] = [];
  expect(() =>
    discoverValidateAndCaptureDag({
      dagDiscoverySource: source(calls),
      visitors: undefined,
    } as any),
  ).toThrow(TypeError);
  expect(calls).toEqual([]);
  const result = discoverValidateAndCaptureDag({
    dagDiscoverySource: source(calls),
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  for (const field of [
    'dagDiscoverySource',
    'treeDiscoverySource',
    'syntheticRoot',
    'discovery',
    'rootWorkPrerequisitePolicy',
    'undeclaredWorkPrerequisitePolicy',
    'transformChildHintsBeforeResolution',
    'traversalRunnerInternalObjects',
  ]) {
    expect(() =>
      result.validatedTopology.createIndependentRunnerFromValidatedTopology({
        [field]: undefined,
      } as any),
    ).toThrow(TypeError);
    await expect(
      result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology(
        { [field]: undefined } as any,
      ),
    ).rejects.toThrow(TypeError);
  }
  expect(() =>
    result.validatedTopology.createExternalWorkSession({
      workCompletionPolicy: 'afterWorkReadyVisitorChain',
    } as any),
  ).toThrow(TypeError);
  await expect(
    result.validatedTopology.createAsyncExternalWorkSession({
      visitors: {},
    } as any),
  ).rejects.toThrow(TypeError);
  expect(() =>
    result.validatedTopology.createIndependentRunnerFromValidatedTopology({
      [Symbol('extra')]: true,
    } as any),
  ).toThrow(TypeError);
});

test('source callback failures are never mistaken for validation results', async () => {
  const error = new DagTraversalStallError({
    blockedVertexPrerequisiteReports: [],
    unresolvedPrerequisiteVertexIds: [],
    milestoneCycleVertexIdComponents: [],
    nonCyclePrerequisiteBlockedVertexIds: [],
    incompleteVertexIdsWithoutUnmetPrerequisites: [],
  });
  for (const prepare of [
    discoverValidateAndCaptureDag,
    discoverValidateAndCaptureDagAsync,
  ]) {
    const adapter = source();
    for (const hook of [
      'resolveChildHint',
      'tryGetVertexIdentityFromHint',
    ] as const) {
      await expect(async () =>
        prepare({
          dagDiscoverySource: {
            ...adapter,
            [hook]: () => {
              throw error;
            },
          },
        }),
      ).rejects.toBe(error);
    }
    await expect(async () =>
      prepare({
        dagDiscoverySource: {
          ...adapter,
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'a',
              workWaitsForWorkOf: ['external'],
              vertexContentInput: {
                $vertexData: { name: 'a' },
                $childDiscoveryHints: [],
              },
            },
          }),
          resolvePrerequisiteByVertexId: () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  }
});

test('hint identity may be unknown and default async sessions remain independent', async () => {
  const result = await discoverValidateAndCaptureDagAsync({
    dagDiscoverySource: {
      ...source(),
      tryGetVertexIdentityFromHint: () => undefined,
    },
  });
  if (result.kind !== 'valid') throw new Error('Expected valid');
  const first = await result.validatedTopology.createAsyncExternalWorkSession();
  const second =
    await result.validatedTopology.createAsyncExternalWorkSession();
  expect(await first.runUntilWorkBoundary()).toMatchObject({
    kind: 'awaitingSettlement',
    workSettlementTickets: [{ vertexId: 'a' }],
  });
  expect(second.captureProgressSnapshot().workAwaitingSettlement).toEqual([]);
});

for (const prepare of [
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
]) {
  test(`${prepare.name} preserves non-enumerable IDs and inherited source fields`, async () => {
    class Entry {
      vertexId!: string;
      constructor(id: string) {
        Object.defineProperty(this, 'vertexId', { value: id });
      }
      get vertexContentInput() {
        return {
          $vertexData: { name: this.vertexId },
          $childDiscoveryHints: this.vertexId === 'a' ? ['b'] : [],
        };
      }
      get workWaitsForWorkOf() {
        return this.vertexId === 'b' ? ['a'] : [];
      }
      get workWaitsForSubgraphCompletionOf() {
        return [];
      }
    }
    const result = await prepare<T, string>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: new Entry('a'),
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved',
          resolvedVertexInput: new Entry(id),
        }),
      },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid');
    expect(
      result.validatedTopology.liveVertexSummaries.map((vertex) => [
        vertex.vertexId,
        vertex.workWaitsForWorkOf,
      ]),
    ).toEqual([
      ['a', []],
      ['b', ['a']],
    ]);
    expect(
      result.validatedTopology
        .createIndependentRunnerFromValidatedTopology({
          acceptedCompletedWorkVertexIds: new Set(['a']),
        })
        .runUntilSuspendedOrTerminal()
        .captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['a', 'b']);
  });

  test(`${prepare.name} preserves omission order with own and hint-supplied IDs`, async () => {
    for (const hintSupplied of [false, true]) {
      const adapter: DagDiscoverySource<T, T, string> = {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: { name: 'root' },
              $childDiscoveryHints: ['skip', 'b', 'c'],
            },
          },
        }),
        ...(hintSupplied
          ? { tryGetVertexIdentityFromHint: (id: string) => ({ vertexId: id }) }
          : {}),
        resolveChildHint: (id) =>
          id === 'skip'
            ? {
                omittedVertexIdentity: hintSupplied ? null : { vertexId: id },
                kind: 'vertexIntentionallyOmitted',
                satisfiesWorkAndSubgraphCompletionPrerequisites: true,
              }
            : {
                kind: 'vertexResolved',
                resolvedVertexInput: {
                  vertexId: id,
                  workWaitsForWorkOf: id === 'b' ? ['skip'] : [],
                  vertexContentInput: {
                    $vertexData: { name: id },
                    $childDiscoveryHints: [],
                  },
                },
              },
      };
      const original = new DagTraversalBuilder({ dagDiscoverySource: adapter })
        .createIndependentRunnerFromCurrentOptions()
        .discoverValidateAndFreezeTopology();
      const result = await prepare<T, string>({ dagDiscoverySource: adapter });
      if (result.kind !== 'valid') throw new Error('Expected valid');
      const replay =
        result.validatedTopology.createIndependentRunnerFromValidatedTopology();
      const events = [
        ...replay.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
      ].map((event) => [event.vertexId, event.eventKind]);
      expect(events).toEqual(
        [
          ...original.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
        ].map((event) => [event.vertexId, event.eventKind]),
      );
      expect(
        events
          .filter(([, kind]) => kind === 'workCompletionCommitted')
          .map(([id]) => id),
      ).toEqual(['root', 'b', 'c']);
    }
  });
}

for (const async of [false, true]) {
  test.each([false, true])(
    `${
      async ? 'async' : 'sync'
    } discovery cycles expose an identity-preserving closed witness (self=%p)`,
    async (self) => {
      const a = { name: 'same' };
      const b = self ? a : { name: 'same' };
      const graph = materializeMultiEntryDagInputFromRecordCatalog(
        [{ id: a, children: [b] }, ...(self ? [] : [{ id: b, children: [a] }])],
        {
          selectVertexId: (item) => item.id,
          selectStructuralChildVertexIds: (item) => item.children,
        },
      );
      const result = async
        ? await discoverValidateAndCaptureDagAsync(graph)
        : discoverValidateAndCaptureDag(graph);
      expect(result).toEqual({
        kind: 'invalid',
        issues: [
          {
            kind: 'discoveredStructuralChildCycleWitness',
            cycleWitnessVertexIds: self ? [a, a] : [b, a, b],
          },
        ],
      });
      if (result.kind !== 'invalid') throw Error('Expected invalid result');
      const issue = result.issues[0]!;
      if (issue.kind !== 'discoveredStructuralChildCycleWitness')
        throw Error('Expected discovery cycle issue');
      expect(issue.cycleWitnessVertexIds[0]).toBe(b);
      let failure: unknown;
      try {
        if (async)
          await new AsyncDagTraversalBuilder(graph)
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal();
        else
          new DagTraversalBuilder(graph)
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal();
      } catch (error) {
        failure = error;
      }
      expect(SubpathCycleError).toBe(DagStructuralDiscoveryCycleError);
      expect(failure).toBeInstanceOf(DagStructuralDiscoveryCycleError);
      if (!(failure instanceof DagStructuralDiscoveryCycleError))
        throw Error('Expected typed discovery cycle');
      expect(failure.name).toBe('DagStructuralDiscoveryCycleError');
      expect(failure.message).toMatch(/^Discovery cycle detected:/);
      expect(failure.cycleWitnessVertexIds).toEqual(self ? [a, a] : [b, a, b]);
      expect(failure.cycleWitnessVertexIds[0]).toBe(b);
      expect(Object.isFrozen(failure.cycleWitnessVertexIds)).toBe(true);
    },
  );
}
