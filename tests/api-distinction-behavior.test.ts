import {
  GraphWalk,
  AsyncGraphWalk,
  prepareDag,
  rewriteObject,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  TraversalVisitorCommandName as Command,
  type VertexTypes,
  type TreeSource,
} from '../src';

type Tree = VertexTypes<string, string>;
const treeSource: TreeSource<Tree> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: { vertexContent: { $data: 'root', $childHints: ['a', 'b'] } },
  }),
  resolveChild: (hint) => ({
    kind: 'found',
    vertex: { vertexContent: { $data: hint, $childHints: [] } },
  }),
};

test('explicitly skipped expansion remains distinct from retained children and absent hints', async () => {
  for (const Builder of [
    DepthFirstTreeTraversal,
    AsyncDepthFirstTreeTraversal,
  ]) {
    const runner = new Builder<Tree>({
      traversableTree: treeSource,
      visitors: {
        IN_ORDER: (_v, ctx) =>
          ctx.isTreeRoot
            ? { commands: [{ commandName: Command.SKIP_REMAINING_CHILDREN }] }
            : undefined,
      },
    }).createRunner();
    await runner.run();
    const view = runner.getResolvedTreeView(),
      root = view.getRoot()!;
    expect(view.getChildrenOf(root)).toHaveLength(1);
    expect(runner.isChildExpansionSkipped(root)).toBe(true);
    expect(runner.isChildExpansionSkipped(view.getChildrenOf(root)![0]!)).toBe(
      false,
    );
    const empty = new Builder<Tree>({
      traversableTree: {
        ...treeSource,
        resolveChild: () => ({ kind: 'omitted' }),
      },
    }).createRunner();
    await empty.run();
    const emptyView = empty.getResolvedTreeView();
    expect(emptyView.getChildrenOf(emptyView.getRoot()!)).toEqual([]);
    expect(empty.isChildExpansionSkipped(emptyView.getRoot()!)).toBe(false);
  }
});

test('limit replacement deliberately drops earlier bounds for sync and async walkers', async () => {
  const source = {
    hydration: 'resolver' as const,
    roots: () => [{ vertexId: 0 }],
    resolveVertex: (id: number) => ({ kind: 'found' as const, data: id }),
    outgoing: (v: { vertexId: number }) =>
      v.vertexId === 0
        ? [1, 2].map((vertexId) => ({ target: { vertexId }, data: 'edge' }))
        : [],
  };
  for (const Builder of [GraphWalk, AsyncGraphWalk]) {
    const builder = new Builder({
      source,
      limits: { maxAdmittedTargets: 1, maxCandidateReadAttempts: 10 },
    });
    const before = [];
    for await (const e of builder.createRunner().iterateEvents())
      before.push(e);
    expect(before).toHaveLength(1);
    builder.configure({ replaceLimits: { maxDepth: 1 } });
    const after = [];
    for await (const e of builder
      .createRunner()
      .iterateEvents({ emitEvents: ['vertex', 'edge'] }))
      after.push(e);
    expect(after.filter((e) => e.kind === 'vertex')).toHaveLength(3);
    const edge = after.find((e) => e.kind === 'edge');
    if (edge?.kind !== 'edge') throw new Error('Expected edge');
    expect(edge.fromVertex).toEqual({ vertexId: 0, data: 0 });
  }
});

test('prepared summaries drop omission slots while faithful definitions retain identity', () => {
  const prepared = prepareDag<VertexTypes<string, string>, string | undefined>({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: 'r',
          vertexContent: { $data: 'root', $childHints: ['omit'] },
        },
      }),
      resolveChild: () => ({
        kind: 'omitted',
        identity: { vertexId: undefined },
        satisfiesDependencies: true,
      }),
    },
  });
  if (prepared.kind !== 'valid') throw new Error('Expected valid');
  expect(prepared.dag.liveVertexSummaries[0]!.children).toEqual([]);
  expect(prepared.dag.definition.vertices[0]!.slots).toEqual([
    { kind: 'omitted', identity: { vertexId: undefined } },
  ]);
  expect(prepared.dag.definition.omittedIds).toEqual([undefined]);
  const runner = prepared.dag.createRunner().run();
  expect(
    runner
      .inspectMilestones()
      .explain({ vertexId: undefined, milestone: 'work' }),
  ).toMatchObject({ kind: 'omitted', satisfied: true, progress: null });
  expect(
    runner
      .inspectMilestones()
      .explain({ vertexId: 'missing', milestone: 'work' }).kind,
  ).toBe('unresolved');
  const root = runner.getResolvedGraphView().getRoot()!;
  expect(runner.getResolvedGraphView().get(root)!.slots[0]).toMatchObject({
    kind: 'omitted',
    identity: { vertexId: undefined },
  });
});

test('tagged rewrite output keeps null and undefined distinct from deleted roots', () => {
  expect(rewriteObject(null).getOutputResult()).toEqual({
    kind: 'present',
    value: null,
  });
  expect(rewriteObject(undefined).getOutputResult()).toEqual({
    kind: 'present',
    value: undefined,
  });
  let conversions = 0;
  const absent = rewriteObject(
    { a: 1 },
    {
      rewrite: (_p, ctx) => (ctx.isTreeRoot ? { kind: 'delete' } : undefined),
      convertRootValue: (value) => {
        conversions++;
        return value;
      },
    },
  );
  expect(absent.outputResultAtReturn).toEqual({ kind: 'absent' });
  expect(absent.getOutputResult()).toEqual({ kind: 'absent' });
  expect(conversions).toBe(0);
});
