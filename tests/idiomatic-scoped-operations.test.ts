import {
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  DagTraversal,
  DagVisitorPhase,
  DepthFirstPhase,
  DepthFirstTreeTraversal,
  defineDag,
  prepareDagDefinition,
  TraversalVisitorCommandName as importCommand,
  type VertexTypes,
  materializeWalkSourceFromDagDefinition,
  defineDagFragment,
  instantiateDagFragment,
  composeDag,
  reviseDag,
} from '../src';

type T = VertexTypes<string, string>;
const tree = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
  }),
  resolveChild: (id: string) => ({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: id, $childHints: [] as string[] } },
  }),
};
const graph = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { ...tree.resolveRoot().vertex, vertexId: 'root' },
  }),
  resolveChild: (id: string) => ({
    kind: 'found' as const,
    vertex: { ...tree.resolveChild(id).vertex, vertexId: id },
  }),
};

for (const Constructor of [
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
]) {
  test(`${Constructor.name} accepts only subtree deletion`, async () => {
    const valid = new Constructor({ traversableTree: tree });
    valid.addVisitorFor(DepthFirstPhase.PRE_ORDER, () => ({
      commands: [{ commandName: importCommand.DELETE_TREE_SUBTREE }],
    }));
    const runner = valid.createRunner();
    await runner.run();
    expect(runner.getResolvedTreeView().getRoot()).toBeNull();
    for (const commandName of [
      'DELETE_DAG_VERTEX_CASCADE',
      'DELETE_VERTEX',
      'DISABLE_SUBTREE_TRAVERSAL',
      'SET_VERTEX_VISITORS_CHAIN_STATE',
    ]) {
      const invalid = new Constructor({ traversableTree: tree });
      invalid.addVisitorFor(
        DepthFirstPhase.PRE_ORDER,
        () => ({ commands: [{ commandName }] } as never),
      );
      await expect(async () => {
        await invalid.createRunner().run();
      }).rejects.toThrow();
    }
  });
  test.each(['afterEachVisitor', 'afterGroup'] as const)(
    `${Constructor.name} state envelope honors %s and resets per phase`,
    async (commandCommitMode) => {
      const traversal = new Constructor({ traversableTree: tree });
      const state = { vertexVisitorsChainState: 'opaque payload is allowed' };
      const seen: unknown[] = [];
      traversal.addVisitorGroupFor(DepthFirstPhase.PRE_ORDER, {
        commandCommitMode,
        visitors: [
          (_vertex, context) => {
            seen.push(context.visitorChainState);
            return {
              commands: [
                {
                  commandName: importCommand.SET_VISITOR_CHAIN_STATE,
                  commandArguments: { state },
                },
              ],
            };
          },
          (_vertex, context) => {
            seen.push(context.visitorChainState);
          },
        ],
      });
      traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (_vertex, context) => {
        seen.push(context.visitorChainState);
        return {
          commands: [
            {
              commandName: importCommand.SET_VISITOR_CHAIN_STATE,
              commandArguments: { state: undefined },
            },
          ],
        };
      });
      traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (_vertex, context) => {
        seen.push(context.visitorChainState);
      });
      traversal.addVisitorFor(
        DepthFirstPhase.POST_ORDER,
        (_vertex, context) => {
          seen.push(context.visitorChainState);
        },
      );
      await traversal.createRunner().run();
      expect(seen).toEqual([
        null,
        commandCommitMode === 'afterEachVisitor' ? state : null,
        state,
        undefined,
        null,
        commandCommitMode === 'afterEachVisitor' ? state : null,
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
      const traversal = new Constructor({ traversableTree: tree });
      traversal.addVisitorFor(
        DepthFirstPhase.PRE_ORDER,
        () =>
          ({
            commands: [
              {
                commandName: importCommand.SET_VISITOR_CHAIN_STATE,
                commandArguments,
              },
            ],
          } as never),
      );
      await expect(async () => {
        await traversal.createRunner().run();
      }).rejects.toThrow();
    },
  );
}

for (const Constructor of [DagTraversal<T>, AsyncDagTraversal<T>]) {
  test.each(['tree', 'graph'] as const)(
    `${Constructor.name} deletion follows runner family with %s input`,
    async (mode) => {
      const options =
        mode === 'tree'
          ? { traversableTree: tree }
          : { traversableGraph: graph };
      const valid = new Constructor(options);
      valid.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => ({
        commands: [{ commandName: importCommand.DELETE_DAG_VERTEX_CASCADE }],
      }));
      const runner = valid.createRunner();
      await runner.run();
      expect(runner.getResolvedGraph().getVertexRefs()).toEqual([]);
      const invalid = new Constructor(options);
      invalid.addVisitorFor(
        DagVisitorPhase.ON_WORK_READY,
        () =>
          ({
            commands: [{ commandName: importCommand.DELETE_TREE_SUBTREE }],
          } as never),
      );
      await expect(async () => {
        await invalid.createRunner().run();
      }).rejects.toThrow();
    },
  );
  test.each([
    { rootWorkDependencies: 'ignore' },
    { omittedWorkDependencies: 'none' },
    { rootDependencies: 'honor' },
    { implicitParentDependency: false },
  ])(
    `${Constructor.name} rejects ineffective or retired tree policies %p before I/O`,
    (policy) => {
      let calls = 0;
      const source = {
        ...tree,
        resolveRoot: () => {
          calls++;
          return tree.resolveRoot();
        },
      };
      expect(
        () => new Constructor({ traversableTree: source, ...policy } as never),
      ).toThrow();
      const traversal = new Constructor({ traversableTree: source });
      expect(() => traversal.configure(policy as never)).toThrow();
      expect(calls).toBe(0);
    },
  );
  test.each([
    { rootDependencies: 'honor' },
    { implicitParentDependency: true },
    { omittedWorkDependencies: true },
    { rootWorkDependencies: 'bad' },
  ])(
    `${Constructor.name} rejects invalid graph policy %p atomically`,
    async (policy) => {
      const traversal = new Constructor({ traversableGraph: graph });
      let replacementCalls = 0;
      expect(() =>
        traversal.configure({
          ...policy,
          traversableGraph: {
            ...graph,
            resolveRoot: () => {
              replacementCalls++;
              return graph.resolveRoot();
            },
          },
        } as never),
      ).toThrow();
      const seen: string[] = [];
      traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, (vertex) => {
        seen.push(vertex.$data);
      });
      await traversal.createRunner().run();
      expect(replacementCalls).toBe(0);
      expect(seen).toEqual(['root', 'child']);
    },
  );
}

test('roots entry preserves repeated ordered slots and own undefined omission identity', () => {
  const id = {};
  const definition = defineDag({
    vertices: [
      {
        vertexId: id,
        data: 'root',
        slots: [],
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
      },
    ],
    omittedIds: [undefined],
    entry: {
      kind: 'roots',
      slots: [
        { kind: 'vertex', vertexId: id },
        { kind: 'omitted', identity: { vertexId: undefined } },
        { kind: 'vertex', vertexId: id },
      ],
    },
  } as never);
  const prepared = prepareDagDefinition(definition);
  expect(prepared.kind).toBe('valid');
  if (prepared.kind !== 'valid') throw new Error('expected valid');
  expect(prepared.dag.definition.entry).toEqual(definition.entry);
  expect(prepared.dag.definition.vertices[0]!.vertexId).toBe(id);
  const runner = prepared.dag.createRunner().run();
  expect(runner.summary().completedWorkIds).toEqual([id]);
  expect([
    ...materializeWalkSourceFromDagDefinition(definition, {
      relations: ['children'],
    }).roots(),
  ]).toEqual([{ vertexId: id }, { vertexId: undefined }, { vertexId: id }]);
});

for (const Constructor of [
  DagTraversal<T>,
  AsyncDagTraversal<T>,
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
]) {
  test.each(['rootWorkDependencies', 'omittedWorkDependencies'])(
    `${Constructor.name} rejects explicit nonenumerable tree policy %s`,
    (key) => {
      const options = Object.defineProperty({ traversableTree: tree }, key, {
        value: undefined,
      });
      expect(() => new Constructor(options as never)).toThrow(TypeError);
      const traversal = new Constructor({ traversableTree: tree });
      expect(() =>
        traversal.configure(
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
        slots: children.map((id) => ({
          kind: 'vertex' as const,
          vertexId: id,
        })),
        dependsOnWork,
        dependsOnSubgraphCompletion,
      });
      const result = prepareDagDefinition({
        vertices: [
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
        omittedIds: [],
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
          vertex: import('../src').Vertex<T>,
        ) => {
          visited.push(vertex.$data);
          return vertex.$data === target
            ? {
                commands: [
                  { commandName: importCommand.DELETE_DAG_VERTEX_CASCADE },
                ],
              }
            : undefined;
        },
      };
      const runner = asynchronous
        ? await result.dag.createAsyncRunner({ visitors })
        : result.dag.createRunner({ visitors });
      await runner.run();
      const ids = runner
        .getResolvedGraph()
        .getVertexRefs()
        .map((ref) => runner.getResolvedGraph().getVertexId(ref));
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
    const definition = defineDag<string, unknown>({
      vertices: [
        {
          vertexId: id,
          data: 'first',
          slots: [],
          dependsOnWork: [],
          dependsOnSubgraphCompletion: [],
        },
        {
          vertexId: second,
          data: 'second',
          slots: [slot],
          dependsOnWork: [],
          dependsOnSubgraphCompletion: [],
        },
      ],
      omittedIds: [omitted],
      entry: {
        kind: 'roots',
        slots: [
          slot,
          { kind: 'omitted', identity: { vertexId: omitted } },
          { kind: 'vertex', vertexId: second },
          slot,
        ],
      },
    });
    const fragment = defineDagFragment(definition, { first: id });
    const instance = instantiateDagFragment(fragment, {
      mapId: (value) => value,
    });
    const result = composeDag([instance]);
    if (result.kind !== 'valid') throw new Error('expected valid composition');
    const revised = reviseDag(result.dag, []);
    if (revised.kind !== 'valid') throw new Error('expected valid revision');
    expect(fragment.definition.entry).toEqual(definition.entry);
    expect(instance.definition.entry).toEqual(definition.entry);
    expect(result.dag.definition.entry).toEqual(definition.entry);
    expect(revised.dag.definition.entry).toEqual(definition.entry);
    expect(revised.changes.entryChanged).toBe(false);
    const sync = revised.dag.createRunner().run();
    const asyncRunner = await revised.dag.createAsyncRunner();
    await asyncRunner.run();
    for (const runner of [sync, asyncRunner]) {
      expect(runner.summary().completedWorkIds).toEqual([id, second]);
      const shared = runner.getResolvedGraph().getVertexRefById(id)!;
      const parent = runner.getResolvedGraph().getVertexRefById(second)!;
      expect(runner.getResolvedGraph().getChildrenOf(parent)).toEqual([shared]);
    }
    expect([
      ...materializeWalkSourceFromDagDefinition(revised.dag.definition, {
        relations: ['children'],
      }).roots(),
    ]).toEqual([
      { vertexId: id },
      { vertexId: omitted },
      { vertexId: second },
      { vertexId: id },
    ]);
  },
);

test('retired declaration names reject without changing a prepared definition', () => {
  const result = prepareDagDefinition({
    vertices: [],
    omittedIds: [],
    entry: { kind: 'roots', slots: [] },
  });
  if (result.kind !== 'valid') throw new Error('expected valid empty roots');
  expect(() =>
    defineDag({
      vertices: [],
      omittedIds: [],
      entry: { kind: 'forest', slots: [] },
    } as never),
  ).toThrow();
  expect(() =>
    reviseDag(result.dag, [
      { kind: 'removeVertex', vertexId: undefined },
    ] as never),
  ).toThrow();
  expect(result.dag.definition.entry).toEqual({ kind: 'roots', slots: [] });
});
