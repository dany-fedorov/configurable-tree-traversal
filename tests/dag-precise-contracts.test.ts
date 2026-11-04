import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagStructuralDiscoveryCycleError,
  DagTraversalStallError,
  DagVisitorPhase,
  captureDagMilestoneSnapshot,
  materializeMultiEntryDagInputFromRecordCatalog,
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
  type DagDiscoverySource,
  type VertexDataAndChildHintTypes,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;
const found = (id: string, children: string[] = []) => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexId: id,
    vertexContentInput: { $vertexData: id, $childDiscoveryHints: children },
  },
});

for (const prepare of [
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
]) {
  test(`${prepare.name} returns the engine closed discovery witness as an issue`, async () => {
    const input = materializeMultiEntryDagInputFromRecordCatalog(
      [
        { id: 'a', children: ['b'] },
        { id: 'b', children: ['a'] },
      ],
      {
        selectVertexId: (v) => v.id,
        selectStructuralChildVertexIds: (v) => v.children,
      },
    );
    expect(await prepare(input)).toEqual({
      kind: 'invalid',
      issues: [
        {
          kind: 'discoveredStructuralChildCycleWitness',
          cycleWitnessVertexIds: ['b', 'a', 'b'],
        },
      ],
    });
  });

  for (const route of [
    'root',
    'child',
    'hint',
    'prerequisite',
    'workIterable',
    'completeIterable',
    'hintsGetter',
  ] as const) {
    test.each([
      undefined,
      null,
      Symbol('source error'),
      new DagStructuralDiscoveryCycleError(['caller', 'caller']),
      new DagTraversalStallError({
        blockedVertexPrerequisiteReports: [],
        unresolvedPrerequisiteVertexIds: [],
        milestoneCycleVertexIdComponents: [],
        nonCyclePrerequisiteBlockedVertexIds: [],
        incompleteVertexIdsWithoutUnmetPrerequisites: [],
      }),
    ])(
      `${prepare.name} preserves exact errors from ${route}: %p`,
      async (error) => {
        const fail = (): never => {
          throw error;
        };
        const throwingIds: string[] = [];
        throwingIds[Symbol.iterator] = fail;
        const source: DagDiscoverySource<T, T, string> = {
          resolveRootVertex: () => {
            if (route === 'root') return fail();
            const root = found('root', ['child']);
            if (route === 'hintsGetter')
              Object.defineProperty(
                root.resolvedVertexInput.vertexContentInput,
                '$childDiscoveryHints',
                {
                  get: fail,
                },
              );
            return {
              ...root,
              resolvedVertexInput: {
                ...root.resolvedVertexInput,
                workWaitsForWorkOf:
                  route === 'workIterable'
                    ? throwingIds
                    : route === 'prerequisite'
                    ? ['external']
                    : [],
                workWaitsForSubgraphCompletionOf:
                  route === 'completeIterable' ? throwingIds : [],
              },
            };
          },
          resolveChildVertexFromHint: (id) => (route === 'child' ? fail() : found(id)),
          tryGetVertexIdentityFromHint: (id) =>
            route === 'hint' ? fail() : { vertexId: id },
          resolvePrerequisiteByVertexId: () => fail(),
        };
        await expect(async () =>
          prepare({ dagDiscoverySource: source }),
        ).rejects.toBe(error);
      },
    );
  }
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const filtered of [false, true]) {
    test(`${Constructor.name} afterWorkReadyChain completes ${
      filtered ? 'filtered' : 'empty'
    } chains`, async () => {
      const traversal = new Constructor<T, T, string>({
        dagDiscoverySource: {
          resolveRootVertex: () => found('a'),
          resolveChildVertexFromHint: (id) => found(id),
        },
        workCompletionPolicy: 'afterWorkReadyVisitorChain',
      });
      if (filtered)
        traversal.registerVisitorForPhase(
          DagVisitorPhase.ON_WORK_READY,
          () => {
            throw Error('filtered visitor ran');
          },
        );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal({
        admittedVisitorCallbackPhases: { include: [] },
      });
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['a']);
      expect(
        runner.captureProgressSnapshot().subgraphCompletionCommittedVertexIds,
      ).toEqual(['a']);
      expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual(
        [],
      );
    });
  }
  test(`${Constructor.name} rejects removed visitorReturn atomically`, () => {
    const input = {
      dagDiscoverySource: {
        resolveRootVertex: () => found('a'),
        resolveChildVertexFromHint: (id: string) => found(id),
      },
    };
    expect(
      () =>
        new Constructor<T>({
          ...input,
          workCompletionPolicy: 'visitorReturn' as never,
        }),
    ).toThrow(TypeError);
    const traversal = new Constructor<T>({
      ...input,
      workCompletionPolicy: 'requireExternalWorkSettlement',
    });
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        workCompletionPolicy: 'visitorReturn' as never,
      }),
    ).toThrow(TypeError);
    expect(
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
  });
  test(`${Constructor.name} always reports independent W and C arrays including overlaps and empty waits`, async () => {
    const input = materializeMultiEntryDagInputFromRecordCatalog(
      [
        { id: 'review', work: ['work'], complete: ['work'] },
        { id: 'work', work: [], complete: [] },
      ],
      {
        selectVertexId: (v) => v.id,
        selectWorkPrerequisiteVertexIds: (v) => v.work,
        selectSubgraphCompletionPrerequisiteVertexIds: (v) => v.complete,
      },
    );
    const runner = new Constructor({
      ...input,
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('review'),
    ).toMatchObject({
      unmetPrerequisiteVertexIds: ['work'],
      unmetWorkMilestoneVertexIds: ['work'],
      unmetSubgraphCompletionMilestoneVertexIds: ['work'],
    });
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('work'),
    ).toMatchObject({
      unmetWorkMilestoneVertexIds: [],
      unmetSubgraphCompletionMilestoneVertexIds: [],
    });
    const explanation = captureDagMilestoneSnapshot(runner).explainMilestone({
      vertexId: 'work',
      milestone: 'workCompletion',
    });
    expect(explanation).toMatchObject({
      kind: 'live',
      progress: {
        unmetWorkMilestoneVertexIds: [],
        unmetSubgraphCompletionMilestoneVertexIds: [],
      },
    });
    const work = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      work.vertexId,
      { kind: 'workCompleted' },
      work.settlementToken,
    );
    await runner.runUntilSuspendedOrTerminal();
    const next = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      next.vertexId,
      { kind: 'workCompleted' },
      next.settlementToken,
    );
    await runner.runUntilSuspendedOrTerminal();
    for (const progress of runner
      .captureProgressSnapshot()
      .progressByVertexId.values())
      expect(progress).toMatchObject({
        unmetWorkMilestoneVertexIds: [],
        unmetSubgraphCompletionMilestoneVertexIds: [],
      });
  });
}

for (const prepare of [
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
]) {
  test(`${prepare.name} preserves a real engine error thrown by a source from an older runner`, async () => {
    for (const kind of ['cycle', 'milestone']) {
      const input = materializeMultiEntryDagInputFromRecordCatalog(
        [
          {
            id: 'a',
            children: kind === 'cycle' ? ['a'] : [],
            work: kind === 'milestone' ? ['missing'] : [],
          },
        ],
        {
          selectVertexId: (v) => v.id,
          selectStructuralChildVertexIds: (v) => v.children,
          selectWorkPrerequisiteVertexIds: (v) => v.work,
        },
      );
      let original: unknown;
      try {
        new DagTraversalBuilder(input)
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      } catch (error) {
        original = error;
      }
      expect(original).toBeInstanceOf(
        kind === 'cycle'
          ? DagStructuralDiscoveryCycleError
          : DagTraversalStallError,
      );
      await expect(async () =>
        prepare<T>({
          dagDiscoverySource: {
            resolveRootVertex: () => {
              throw original;
            },
            resolveChildVertexFromHint: (id) => found(id),
          },
        }),
      ).rejects.toBe(original);
    }
  });
}
