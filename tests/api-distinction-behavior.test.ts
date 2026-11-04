import {
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  discoverValidateAndCaptureDag,
  rewriteObject,
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  TraversalVisitorCommandName as Command,
  type VertexDataAndChildHintTypes,
  type TreeDiscoverySource,
} from '../src';

type Tree = VertexDataAndChildHintTypes<string, string>;
const treeSource: TreeDiscoverySource<Tree> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: ['a', 'b'],
      },
    },
  }),
  resolveChildVertexFromHint: (hint) => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
    },
  }),
};

test('explicitly skipped expansion remains distinct from retained children and absent hints', async () => {
  for (const Builder of [
    DepthFirstTreeTraversalBuilder,
    AsyncDepthFirstTreeTraversalBuilder,
  ]) {
    const runner = new Builder<Tree>({
      treeDiscoverySource: treeSource,
      visitors: {
        AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES: (_v, ctx) =>
          ctx.isTreeRoot
            ? {
                commands: [
                  {
                    commandName:
                      Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
                  },
                ],
              }
            : undefined,
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const view = runner.getLiveResolvedTreeView(),
      root = view.getRootVertexHandleOrNull()!;
    expect(view.getChildVertexHandlesOrNull(root)).toHaveLength(1);
    expect(runner.isPendingChildDiscoveryDisabled(root)).toBe(true);
    expect(
      runner.isPendingChildDiscoveryDisabled(
        view.getChildVertexHandlesOrNull(root)![0]!,
      ),
    ).toBe(false);
    const empty = new Builder<Tree>({
      treeDiscoverySource: {
        ...treeSource,
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await empty.runUntilSuspendedOrTerminal();
    const emptyView = empty.getLiveResolvedTreeView();
    expect(
      emptyView.getChildVertexHandlesOrNull(
        emptyView.getRootVertexHandleOrNull()!,
      ),
    ).toEqual([]);
    expect(
      empty.isPendingChildDiscoveryDisabled(
        emptyView.getRootVertexHandleOrNull()!,
      ),
    ).toBe(false);
  }
});

test('limit replacement deliberately drops earlier bounds for sync and async walkers', async () => {
  const source = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets: () => [{ vertexId: 0 }],
    resolveVertexDataById: (id: number) => ({
      kind: 'found' as const,
      vertexData: id,
    }),
    enumerateOutgoingLinks: (v: { vertexId: number }) =>
      v.vertexId === 0
        ? [1, 2].map((vertexId) => ({
            targetToResolveOnAdmission: { vertexId },
            edgeData: 'edge',
          }))
        : [],
  };
  for (const Builder of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
    const builder = new Builder({
      graphWalkDiscoverySource: source,
      limits: {
        maxAdmittedRootOrLinkTargetOccurrences: 1,
        maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 10,
      },
    });
    const before = [];
    for await (const e of builder
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal())
      before.push(e);
    expect(before).toHaveLength(1);
    builder.patchOptionsForFutureRunners({
      replaceLimits: { maxRouteHopDepth: 1 },
    });
    const after = [];
    for await (const e of builder
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: ['vertexOccurrence', 'admittedEdgeOccurrence'],
      }))
      after.push(e);
    expect(
      after.filter((e) => e.eventKind === 'vertexOccurrence'),
    ).toHaveLength(3);
    const edge = after.find((e) => e.eventKind === 'admittedEdgeOccurrence');
    if (edge?.eventKind !== 'admittedEdgeOccurrence')
      throw new Error('Expected edge');
    expect(edge.fromVertex).toEqual({ vertexId: 0, vertexData: 0 });
  }
});

test('prepared summaries drop omission slots while faithful definitions retain identity', () => {
  const prepared = discoverValidateAndCaptureDag<
    VertexDataAndChildHintTypes<string, string>,
    string | undefined
  >({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: 'r',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['omit'],
          },
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted',
        omittedVertexIdentity: { vertexId: undefined },
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
    },
  });
  if (prepared.kind !== 'valid') throw new Error('Expected valid');
  expect(
    prepared.validatedTopology.liveVertexSummaries[0]!
      .liveStructuralChildVertexIds,
  ).toEqual([]);
  expect(
    prepared.validatedTopology.definition.vertexDeclarations[0]!
      .childDiscoverySlots,
  ).toEqual([
    {
      kind: 'omitted',
      omittedVertexIdentity: { vertexId: undefined },
    },
  ]);
  expect(prepared.validatedTopology.definition.omittedVertexIds).toEqual([
    undefined,
  ]);
  const runner = prepared.validatedTopology
    .createIndependentRunnerFromValidatedTopology()
    .runUntilSuspendedOrTerminal();
  expect(
    runner
      .captureMilestoneSnapshot()
      .explainMilestone({ vertexId: undefined, milestone: 'workCompletion' }),
  ).toMatchObject({
    kind: 'omitted',
    milestoneSatisfied: true,
    progress: null,
  });
  expect(
    runner
      .captureMilestoneSnapshot()
      .explainMilestone({ vertexId: 'missing', milestone: 'workCompletion' })
      .kind,
  ).toBe('unresolved');
  const root = runner
    .getLiveResolvedGraphView()
    .getDesignatedRootHandleOrNull()!;
  expect(
    runner.getLiveResolvedGraphView().getVertexSnapshotOrNull(root)!
      .orderedChildDiscoverySlots[0],
  ).toMatchObject({
    kind: 'omitted',
    omittedVertexIdentity: { vertexId: undefined },
  });
});

test('tagged rewrite output keeps null and undefined distinct from deleted roots', () => {
  expect(rewriteObject(null).getFinalOutputResult()).toEqual({
    kind: 'present',
    value: null,
  });
  expect(rewriteObject(undefined).getFinalOutputResult()).toEqual({
    kind: 'present',
    value: undefined,
  });
  let conversions = 0;
  const absent = rewriteObject(
    { a: 1 },
    {
      rewritePropertyAfterChildTraversal: (_p, ctx) =>
        ctx.isTreeRoot ? { kind: 'deletePropertySubtree' } : undefined,
      convertPresentRootOutputValue: (value) => {
        conversions++;
        return value;
      },
    },
  );
  expect(absent.capturedOutputResultAtReturn).toEqual({ kind: 'absent' });
  expect(absent.getFinalOutputResult()).toEqual({ kind: 'absent' });
  expect(conversions).toBe(0);
});
