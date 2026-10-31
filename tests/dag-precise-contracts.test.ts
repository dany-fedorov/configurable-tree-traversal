import {
  AsyncDagTraversal,
  DagTraversal,
  DagDiscoveryCycleError,
  DagTraversalStallError,
  DagVisitorPhase,
  inspectDagMilestones,
  materializeDagInputFromRecords,
  prepareDag,
  prepareDagAsync,
  type DagDiscoverySource,
  type VertexTypes,
} from '../src';

type T = VertexTypes<string, string>;
const found = (id: string, children: string[] = []) => ({
  kind: 'found' as const,
  vertex: { vertexId: id, vertexContent: { $data: id, $childHints: children } },
});

for (const prepare of [prepareDag, prepareDagAsync]) {
  test(`${prepare.name} returns the engine closed discovery witness as an issue`, async () => {
    const input = materializeDagInputFromRecords(
      [
        { id: 'a', children: ['b'] },
        { id: 'b', children: ['a'] },
      ],
      { id: (v) => v.id, children: (v) => v.children },
    );
    expect(await prepare(input)).toEqual({
      kind: 'invalid',
      issues: [
        { kind: 'discoveryCycle', cycleWitnessVertexIds: ['b', 'a', 'b'] },
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
      new DagDiscoveryCycleError(['caller', 'caller']),
      new DagTraversalStallError({
        dependencies: [],
        unknownPrerequisiteIds: [],
        dependencyCycleComponents: [],
        dependencyBlockedIds: [],
        structurallyIncompleteIds: [],
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
          resolveRoot: () => {
            if (route === 'root') return fail();
            const root = found('root', ['child']);
            if (route === 'hintsGetter')
              Object.defineProperty(root.vertex.vertexContent, '$childHints', {
                get: fail,
              });
            return {
              ...root,
              vertex: {
                ...root.vertex,
                dependsOnWork:
                  route === 'workIterable'
                    ? throwingIds
                    : route === 'prerequisite'
                    ? ['external']
                    : [],
                dependsOnSubgraphCompletion:
                  route === 'completeIterable' ? throwingIds : [],
              },
            };
          },
          resolveChild: (id) => (route === 'child' ? fail() : found(id)),
          getVertexIdFromHint: (id) =>
            route === 'hint' ? fail() : { vertexId: id },
          resolvePrerequisite: () => fail(),
        };
        await expect(async () =>
          prepare({ traversableGraph: source }),
        ).rejects.toBe(error);
      },
    );
  }
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const filtered of [false, true]) {
    test(`${Constructor.name} afterWorkReadyChain completes ${
      filtered ? 'filtered' : 'empty'
    } chains`, async () => {
      const traversal = new Constructor<T, T, string>({
        traversableGraph: {
          resolveRoot: () => found('a'),
          resolveChild: (id) => found(id),
        },
        workCompletion: 'afterWorkReadyChain',
      });
      if (filtered)
        traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => {
          throw Error('filtered visitor ran');
        });
      const runner = traversal.createRunner();
      await runner.run({ visitorPhases: { include: [] } });
      expect(runner.summary().completedWorkIds).toEqual(['a']);
      expect(runner.summary().completedSubgraphIds).toEqual(['a']);
      expect(runner.summary().awaitingSettlement).toEqual([]);
    });
  }
  test(`${Constructor.name} rejects removed visitorReturn atomically`, () => {
    const input = {
      traversableGraph: {
        resolveRoot: () => found('a'),
        resolveChild: (id: string) => found(id),
      },
    };
    expect(
      () =>
        new Constructor<T>({
          ...input,
          workCompletion: 'visitorReturn' as never,
        }),
    ).toThrow(TypeError);
    const traversal = new Constructor<T>({
      ...input,
      workCompletion: 'externalSettlement',
    });
    expect(() =>
      traversal.configure({ workCompletion: 'visitorReturn' as never }),
    ).toThrow(TypeError);
    expect(traversal.createRunner().summary().completedWorkIds).toEqual([]);
  });
  test(`${Constructor.name} always reports independent W and C arrays including overlaps and empty waits`, async () => {
    const input = materializeDagInputFromRecords(
      [
        { id: 'review', work: ['work'], complete: ['work'] },
        { id: 'work', work: [], complete: [] },
      ],
      {
        id: (v) => v.id,
        dependsOnWork: (v) => v.work,
        dependsOnSubgraphCompletion: (v) => v.complete,
      },
    );
    const runner = new Constructor({
      ...input,
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.run();
    expect(runner.summary().vertices.get('review')).toMatchObject({
      unmetPrerequisiteIds: ['work'],
      unmetWorkPrerequisiteIds: ['work'],
      unmetSubgraphPrerequisiteIds: ['work'],
    });
    expect(runner.summary().vertices.get('work')).toMatchObject({
      unmetWorkPrerequisiteIds: [],
      unmetSubgraphPrerequisiteIds: [],
    });
    const explanation = inspectDagMilestones(runner).explain({
      vertexId: 'work',
      milestone: 'work',
    });
    expect(explanation).toMatchObject({
      kind: 'live',
      progress: {
        unmetWorkPrerequisiteIds: [],
        unmetSubgraphPrerequisiteIds: [],
      },
    });
    const work = runner.summary().awaitingSettlement[0]!;
    runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation);
    await runner.run();
    const next = runner.summary().awaitingSettlement[0]!;
    runner.settle(next.vertexId, { kind: 'workCompleted' }, next.generation);
    await runner.run();
    for (const progress of runner.summary().vertices.values())
      expect(progress).toMatchObject({
        unmetWorkPrerequisiteIds: [],
        unmetSubgraphPrerequisiteIds: [],
      });
  });
}

for (const prepare of [prepareDag, prepareDagAsync]) {
  test(`${prepare.name} preserves a real engine error thrown by a source from an older runner`, async () => {
    for (const kind of ['cycle', 'milestone']) {
      const input = materializeDagInputFromRecords(
        [
          {
            id: 'a',
            children: kind === 'cycle' ? ['a'] : [],
            work: kind === 'milestone' ? ['missing'] : [],
          },
        ],
        {
          id: (v) => v.id,
          children: (v) => v.children,
          dependsOnWork: (v) => v.work,
        },
      );
      let original: unknown;
      try {
        new DagTraversal(input).createRunner().run();
      } catch (error) {
        original = error;
      }
      expect(original).toBeInstanceOf(
        kind === 'cycle' ? DagDiscoveryCycleError : DagTraversalStallError,
      );
      await expect(async () =>
        prepare<T>({
          traversableGraph: {
            resolveRoot: () => {
              throw original;
            },
            resolveChild: (id) => found(id),
          },
        }),
      ).rejects.toBe(original);
    }
  });
}
