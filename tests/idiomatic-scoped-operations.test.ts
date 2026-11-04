import {
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  DepthFirstTreeVisitPhase,
  DepthFirstTreeTraversalBuilder,
  copyAndNormalizeDagDefinition,
  validateAndPrepareDagDefinition,
  TraversalVisitorCommandName as importCommand,
  type VertexDataAndChildHintTypes,
  materializeGraphWalkSourceFromDagDeclarationRelations,
  validateAndCreateDagFragment,
  mapDagFragmentIds,
  composeAndValidateDagFragments,
  applyDagDefinitionRevisionBatch,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;
const tree = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: ['child'],
      },
    },
  }),
  resolveChildVertexFromHint: (id: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: id,
        $childDiscoveryHints: [] as string[],
      },
    },
  }),
};
const graph = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      ...tree.resolveRootVertex().resolvedVertexInput,
      vertexId: 'root',
    },
  }),
  resolveChildVertexFromHint: (id: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      ...tree.resolveChildVertexFromHint(id).resolvedVertexInput,
      vertexId: id,
    },
  }),
};

for (const Constructor of [
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
]) {
  test(`${Constructor.name} accepts only subtree deletion`, async () => {
    const valid = new Constructor({ treeDiscoverySource: tree });
    valid.registerVisitorForPhase(
      DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
      () => ({
        commands: [
          {
            commandName:
              importCommand.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
          },
        ],
      }),
    );
    const runner = valid.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.getLiveResolvedTreeView().getRootVertexHandleOrNull(),
    ).toBeNull();
    for (const commandName of [
      'DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS',
      'DELETE_VERTEX',
      'DISABLE_SUBTREE_TRAVERSAL',
      'SET_VERTEX_VISITORS_CHAIN_STATE',
    ]) {
      const invalid = new Constructor({ treeDiscoverySource: tree });
      invalid.registerVisitorForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        () => ({ commands: [{ commandName }] } as never),
      );
      await expect(async () => {
        await invalid
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow();
    }
  });
  test.each([
    'afterEachVisitorCallback',
    'afterContiguousVisitorBatch',
  ] as const)(
    `${Constructor.name} state envelope honors %s and resets per phase`,
    async (visitorCommandCommitTiming) => {
      const traversal = new Constructor({ treeDiscoverySource: tree });
      const state = { vertexVisitorsChainState: 'opaque payload is allowed' };
      const seen: unknown[] = [];
      traversal.appendVisitorGroupForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        {
          visitorCommandCommitTiming,
          visitors: [
            (_vertex, context) => {
              seen.push(context.currentVertexPhaseChainState);
              return {
                commands: [
                  {
                    commandName:
                      importCommand.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
                    commandArguments: { phaseChainState: state },
                  },
                ],
              };
            },
            (_vertex, context) => {
              seen.push(context.currentVertexPhaseChainState);
            },
          ],
        },
      );
      traversal.registerVisitorForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        (_vertex, context) => {
          seen.push(context.currentVertexPhaseChainState);
          return {
            commands: [
              {
                commandName: importCommand.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
                commandArguments: { phaseChainState: undefined },
              },
            ],
          };
        },
      );
      traversal.registerVisitorForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        (_vertex, context) => {
          seen.push(context.currentVertexPhaseChainState);
        },
      );
      traversal.registerVisitorForPhase(
        DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
        (_vertex, context) => {
          seen.push(context.currentVertexPhaseChainState);
        },
      );
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
      expect(seen).toEqual([
        null,
        visitorCommandCommitTiming === 'afterEachVisitorCallback'
          ? state
          : null,
        state,
        undefined,
        null,
        visitorCommandCommitTiming === 'afterEachVisitorCallback'
          ? state
          : null,
        state,
        undefined,
        null,
        null,
      ]);
    },
  );
  test.each([
    null,
    undefined,
    1,
    { vertexVisitorsChainState: 1 },
    {},
    { state: 1, vertexVisitorsChainState: 2 },
  ])(
    `${Constructor.name} rejects retired or missing state envelope %p`,
    async (commandArguments) => {
      const traversal = new Constructor({ treeDiscoverySource: tree });
      traversal.registerVisitorForPhase(
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
        () =>
          ({
            commands: [
              {
                commandName: importCommand.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
                commandArguments,
              },
            ],
          } as never),
      );
      await expect(async () => {
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow();
    },
  );
}

for (const Constructor of [
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  test.each(['tree', 'graph'] as const)(
    `${Constructor.name} deletion follows runner family with %s input`,
    async (mode) => {
      const options =
        mode === 'tree'
          ? { treeDiscoverySource: tree }
          : { dagDiscoverySource: graph };
      const valid = new Constructor(options);
      valid.registerVisitorForPhase(
        DagVisitorPhase.ON_WORK_READY,
        () => ({
          commands: [
            {
              commandName:
                importCommand.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
            },
          ],
        }),
      );
      const runner = valid.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(runner.getLiveResolvedGraphView().getVertexHandles()).toEqual([]);
      const invalid = new Constructor(options);
      invalid.registerVisitorForPhase(
        DagVisitorPhase.ON_WORK_READY,
        () =>
          ({
            commands: [
              {
                commandName:
                  importCommand.DELETE_CURRENT_VERTEX_AND_RESOLVED_TREE_DESCENDANTS,
              },
            ],
          } as never),
      );
      await expect(async () => {
        await invalid
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow();
    },
  );
  test.each([
    { rootWorkToWorkPrerequisitePolicy: 'ignore' },
    { undeclaredWorkToWorkPrerequisitePolicy: 'none' },
    { rootDependencies: 'honor' },
    { implicitParentDependency: false },
  ])(
    `${Constructor.name} rejects ineffective or retired tree policies %p before I/O`,
    (policy) => {
      let calls = 0;
      const source = {
        ...tree,
        resolveRootVertex: () => {
          calls++;
          return tree.resolveRootVertex();
        },
      };
      expect(
        () =>
          new Constructor({ treeDiscoverySource: source, ...policy } as never),
      ).toThrow();
      const traversal = new Constructor({ treeDiscoverySource: source });
      expect(() =>
        traversal.patchOptionsForFutureRunners(policy as never),
      ).toThrow();
      expect(calls).toBe(0);
    },
  );
  test.each([
    { rootDependencies: 'honor' },
    { implicitParentDependency: true },
    { undeclaredWorkToWorkPrerequisitePolicy: true },
    { rootWorkToWorkPrerequisitePolicy: 'bad' },
  ])(
    `${Constructor.name} rejects invalid graph policy %p atomically`,
    async (policy) => {
      const traversal = new Constructor({ dagDiscoverySource: graph });
      let replacementCalls = 0;
      expect(() =>
        traversal.patchOptionsForFutureRunners({
          ...policy,
          dagDiscoverySource: {
            ...graph,
            resolveRootVertex: () => {
              replacementCalls++;
              return graph.resolveRootVertex();
            },
          },
        } as never),
      ).toThrow();
      const seen: string[] = [];
      traversal.registerVisitorForPhase(
        DagVisitorPhase.ON_WORK_READY,
        (vertex) => {
          seen.push(vertex.$vertexData);
        },
      );
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
      expect(replacementCalls).toBe(0);
      expect(seen).toEqual(['root', 'child']);
    },
  );
}

test('roots entry preserves repeated ordered slots and own undefined omission identity', () => {
  const id = {};
  const definition = copyAndNormalizeDagDefinition({
    vertexDeclarations: [
      {
        vertexId: id,
        data: 'root',
        childDiscoverySlots: [],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [undefined],
    entry: {
      kind: 'roots',
      entryDiscoverySlots: [
        { kind: 'vertex', vertexId: id },
        { kind: 'omitted', omittedVertexIdentity: { vertexId: undefined } },
        { kind: 'vertex', vertexId: id },
      ],
    },
  } as never);
  const prepared = validateAndPrepareDagDefinition(definition);
  expect(prepared.kind).toBe('valid');
  if (prepared.kind !== 'valid') throw new Error('expected valid');
  expect(prepared.validatedTopology.definition.entry).toEqual(definition.entry);
  expect(
    prepared.validatedTopology.definition.vertexDeclarations[0]!.vertexId,
  ).toBe(id);
  const runner = prepared.validatedTopology
    .createIndependentRunnerFromValidatedTopology()
    .runUntilSuspendedOrTerminal();
  expect(
    runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual([id]);
  expect([
    ...materializeGraphWalkSourceFromDagDeclarationRelations(definition, {
      includeDeclarationRelations: ['parentToChildSlots'],
    }).enumerateRootTargets(),
  ]).toEqual([{ vertexId: id }, { vertexId: undefined }, { vertexId: id }]);
});

for (const Constructor of [
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
]) {
  test.each(['rootWorkToWorkPrerequisitePolicy', 'undeclaredWorkToWorkPrerequisitePolicy'])(
    `${Constructor.name} rejects explicit nonenumerable tree policy %s`,
    (key) => {
      const options = Object.defineProperty(
        { treeDiscoverySource: tree },
        key,
        {
          value: undefined,
        },
      );
      expect(() => new Constructor(options as never)).toThrow(TypeError);
      const traversal = new Constructor({ treeDiscoverySource: tree });
      expect(() =>
        traversal.patchOptionsForFutureRunners(
          Object.defineProperty({}, key, { value: undefined }) as never,
        ),
      ).toThrow(TypeError);
    },
  );
}

for (const asynchronous of [false, true]) {
  test.each(['victim', 'root'])(
    `prepared DAG cascade retains correct ownership (async=${asynchronous}, target=%s)`,
    async (target) => {
      const vertex = (
        vertexId: string,
        children: string[] = [],
        dependsOnWork: string[] = [],
        dependsOnSubgraphCompletion: string[] = [],
      ) => ({
        vertexId,
        data: vertexId,
        childDiscoverySlots: children.map((id) => ({
          kind: 'vertex' as const,
          vertexId: id,
        })),
        workWaitsForWorkOf: dependsOnWork,
        workWaitsForSubgraphCompletionOf: dependsOnSubgraphCompletion,
      });
      const result = validateAndPrepareDagDefinition({
        vertexDeclarations: [
          vertex('root', ['victim', 'safe', 'w', 'c'], ['anchor']),
          vertex('victim', ['orphan', 'shared']),
          vertex('safe', ['shared']),
          vertex('orphan'),
          vertex('shared'),
          vertex('w', [], ['victim']),
          vertex('c', [], [], ['victim']),
          vertex('anchor', ['anchorChild']),
          vertex('anchorChild'),
        ],
        omittedVertexIds: [],
        entry: { kind: 'root', vertexId: 'root' },
      });
      if (result.kind !== 'valid') throw new Error('expected valid');
      const visited: string[] = [];
      const visitors: {
        ON_WORK_READY: import('../src').DagVisitor<
          T,
          T,
          DagVisitorPhase.ON_WORK_READY,
          string
        >;
      } = {
        [DagVisitorPhase.ON_WORK_READY]: (
          vertex: import('../src').VertexView<T>,
        ) => {
          visited.push(vertex.$vertexData);
          return vertex.$vertexData === target
            ? {
                commands: [
                  {
                    commandName:
                      importCommand.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
                  },
                ],
              }
            : undefined;
        },
      };
      const runner = asynchronous
        ? await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology(
            { visitors },
          )
        : result.validatedTopology.createIndependentRunnerFromValidatedTopology(
            { visitors },
          );
      await runner.runUntilSuspendedOrTerminal();
      const ids = runner
        .getLiveResolvedGraphView()
        .getVertexHandles()
        .map((ref) => runner.getLiveResolvedGraphView().requireVertexId(ref));
      expect(new Set(ids)).toEqual(
        new Set(
          target === 'root'
            ? []
            : ['root', 'safe', 'shared', 'anchor', 'anchorChild'],
        ),
      );
      expect(visited).toContain('anchor');
      if (target === 'victim') {
        expect(visited).not.toContain('w');
        expect(visited).not.toContain('c');
      } else {
        expect(visited.indexOf('anchor')).toBeLessThan(visited.indexOf('root'));
      }
    },
  );
}

test.each([undefined, NaN, Symbol('live'), {}])(
  'repeated roots retain SameValueZero identity through fragments and revisions (%p)',
  async (id) => {
    const omitted = Symbol('omitted');
    const second = Symbol('second');
    const slot = { kind: 'vertex' as const, vertexId: id };
    const definition = copyAndNormalizeDagDefinition<string, unknown>({
      vertexDeclarations: [
        {
          vertexId: id,
          data: 'first',
          childDiscoverySlots: [],
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        },
        {
          vertexId: second,
          data: 'second',
          childDiscoverySlots: [slot],
          workWaitsForWorkOf: [],
          workWaitsForSubgraphCompletionOf: [],
        },
      ],
      omittedVertexIds: [omitted],
      entry: {
        kind: 'roots',
        entryDiscoverySlots: [
          slot,
          { kind: 'omitted', omittedVertexIdentity: { vertexId: omitted } },
          { kind: 'vertex', vertexId: second },
          slot,
        ],
      },
    });
    const fragment = validateAndCreateDagFragment(definition, { first: id });
    const instance = mapDagFragmentIds(fragment, {
      mapId: (value) => value,
    });
    const result = composeAndValidateDagFragments([instance]);
    if (result.kind !== 'valid') throw new Error('expected valid composition');
    const revised = applyDagDefinitionRevisionBatch(
      result.validatedTopology,
      [],
    );
    if (revised.kind !== 'valid') throw new Error('expected valid revision');
    expect(fragment.definition.entry).toEqual(definition.entry);
    expect(instance.definition.entry).toEqual(definition.entry);
    expect(result.validatedTopology.definition.entry).toEqual(definition.entry);
    expect(revised.validatedTopology.definition.entry).toEqual(
      definition.entry,
    );
    expect(revised.declarationDiff.entryChanged).toBe(false);
    const sync = revised.validatedTopology
      .createIndependentRunnerFromValidatedTopology()
      .runUntilSuspendedOrTerminal();
    const asyncRunner =
      await revised.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology();
    await asyncRunner.runUntilSuspendedOrTerminal();
    for (const runner of [sync, asyncRunner]) {
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual([id, second]);
      const shared = runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull(id)!;
      const parent = runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull(second)!;
      expect(
        runner
          .getLiveResolvedGraphView()
          .getStructuralChildHandlesInSlotOrderOrNull(parent),
      ).toEqual([shared]);
    }
    expect([
      ...materializeGraphWalkSourceFromDagDeclarationRelations(
        revised.validatedTopology.definition,
        {
          includeDeclarationRelations: ['parentToChildSlots'],
        },
      ).enumerateRootTargets(),
    ]).toEqual([
      { vertexId: id },
      { vertexId: omitted },
      { vertexId: second },
      { vertexId: id },
    ]);
  },
);

test('retired declaration names reject without changing a prepared definition', () => {
  const result = validateAndPrepareDagDefinition({
    vertexDeclarations: [],
    omittedVertexIds: [],
    entry: { kind: 'roots', entryDiscoverySlots: [] },
  });
  if (result.kind !== 'valid') throw new Error('expected valid empty roots');
  expect(() =>
    copyAndNormalizeDagDefinition({
      vertices: [],
      omittedIds: [],
      entry: { kind: 'forest', slots: [] },
    } as never),
  ).toThrow();
  expect(() =>
    applyDagDefinitionRevisionBatch(result.validatedTopology, [
      { kind: 'removeVertex', vertexId: undefined },
    ] as never),
  ).toThrow();
  expect(result.validatedTopology.definition.entry).toEqual({
    kind: 'roots',
    entryDiscoverySlots: [],
  });
});
