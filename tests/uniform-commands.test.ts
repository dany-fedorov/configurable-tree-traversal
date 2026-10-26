import {
  DagTraversal,
  AsyncDagTraversal,
  DagVisitorPhase as DagOrder,
  DEFER_READY,
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  DepthFirstPhase as DfsOrder,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  BreadthFirstPhase as BfsOrder,
  TraversalVisitorCommandName as Command,
  TraversalVisitorFunctionResolutionStyle as Style,
} from '../src';
import type { VertexTypes } from '../src';

type G = VertexTypes<string, string>;
const source = {
  resolveRoot: () => ({
    vertexId: 'root',
    vertexContent: { $data: 'root', $childHints: [] as string[] },
  }),
  resolveChild: (id: string) => ({
    vertexId: id,
    vertexContent: { $data: id, $childHints: [] as string[] },
  }),
};
for (const Constructor of [DagTraversal<G>, AsyncDagTraversal<G>]) {
  test.each(['command', 'symbol'])(
    `${Constructor.name} %s deferral discards group effects and resumes external work`,
    async (form) => {
      const traversal = new Constructor({ traversableGraph: source });
      traversal.addVisitorFor(
        DagOrder.ON_WORK_READY,
        () => ({
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'committed' },
            },
          ],
        }),
        { commandCommitMode: 'afterGroup', priority: 200 },
      );
      traversal.addVisitorFor(
        DagOrder.ON_WORK_READY,
        () =>
          form === 'symbol'
            ? DEFER_READY
            : { commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] },
        { commandCommitMode: 'afterGroup' },
      );
      traversal.addVisitorFor(DagOrder.ON_WORK_READY, () => {
        throw new Error('must skip');
      });
      const runner = traversal.createRunner();
      await runner.run();
      expect(runner.summary().deferredWorkIds).toEqual(['root']);
      expect(runner.summary().completedWorkIds).toEqual([]);
      runner.settle(
        'root',
        { ok: true },
        runner.summary().vertices.get('root')!.generation!,
      );
      await runner.run();
      expect(runner.summary().completedWorkIds).toEqual(['root']);
      expect(
        runner.getResolvedGraph().getVertexById('root')!.getValue().$data,
      ).toBe('root');
    },
  );

  test(`${Constructor.name} rejects a mixed deferral before mutation`, async () => {
    const traversal = new Constructor({ traversableGraph: source });
    traversal.addVisitorFor(
      DagOrder.ON_WORK_READY,
      () =>
        ({
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'wrong' },
            },
            { commandName: Command.DEFER_WORK_COMPLETION },
          ],
        } as never),
    );
    const runner = traversal.createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toThrow(/sole command/);
    expect(
      runner.getResolvedGraph().getVertexById('root')!.getValue().$data,
    ).toBe('root');
  });
}
for (const [Constructor, order, sourceKey] of [
  [DepthFirstTreeTraversal<G>, DfsOrder.PRE_ORDER, 'traversableTree'],
  [AsyncDepthFirstTreeTraversal<G>, DfsOrder.PRE_ORDER, 'traversableTree'],
  [BreadthFirstTreeTraversal<G>, BfsOrder.LEVEL_ORDER, 'traversableTree'],
  [AsyncBreadthFirstTreeTraversal<G>, BfsOrder.LEVEL_ORDER, 'traversableTree'],
  [DagTraversal<G>, DagOrder.ON_WORK_READY, 'traversableGraph'],
  [AsyncDagTraversal<G>, DagOrder.ON_WORK_READY, 'traversableGraph'],
] as const) {
  const make = () =>
    new Constructor({
      [sourceKey]:
        sourceKey === 'traversableTree'
          ? {
              resolveRoot: () => ({
                vertexContent: source.resolveRoot().vertexContent,
              }),
              resolveChild: (id: string) => ({
                vertexContent: source.resolveChild(id).vertexContent,
              }),
            }
          : source,
    } as never);
  test(`${Constructor.name} rewrites actual child hints in its initial phase`, async () => {
    const traversal = make();
    const seen: string[] = [];
    const add = traversal.addVisitorFor.bind(
      traversal,
    ) as DepthFirstTreeTraversal<G>['addVisitorFor'];
    add(order as DfsOrder.PRE_ORDER, (vertex, options) => {
      seen.push(vertex.$data);
      if (options.isTraversalRoot)
        return {
          commands: [
            {
              commandName: Command.REWRITE_CHILD_HINTS,
              commandArguments: { newHints: ['child'] },
            },
          ],
        };
      return undefined;
    });
    await traversal.createRunner().run();
    expect(seen).toEqual(['root', 'child']);
  });
  test(`${Constructor.name} normalizes configuration and replacement records and rejects conflicts`, async () => {
    const traversal = make();
    const seen: string[] = [];
    const record = {
      addedIndex: 0,
      priority: 1,
      commandCommitMode: 'afterGroup' as const,
      visitor: () => {
        seen.push('configured');
      },
    };
    traversal.configure({ visitors: { [order]: [record] } } as never);
    await traversal.createRunner().run();
    const listed = (
      traversal.listVisitorsFor.bind(
        traversal,
      ) as DepthFirstTreeTraversal<G>['listVisitorsFor']
    )(order as never);
    expect(listed[0]).toMatchObject({
      commandCommitMode: 'afterGroup',
      resolutionStyle: Style.CONCURRENT,
    });
    (
      traversal.setVisitorsFor.bind(
        traversal,
      ) as DepthFirstTreeTraversal<G>['setVisitorsFor']
    )(
      order as never,
      [
        {
          ...record,
          visitor: () => {
            seen.push('replaced');
          },
        },
      ] as never,
    );
    await traversal.createRunner().run();
    expect(seen).toEqual(['configured', 'replaced']);
    const conflict = { ...record, resolutionStyle: Style.SEQUENTIAL };
    expect(() =>
      traversal.configure({ visitors: { [order]: [conflict] } } as never),
    ).toThrow(/conflict/i);
    expect(() =>
      (
        traversal.setVisitorsFor.bind(
          traversal,
        ) as DepthFirstTreeTraversal<G>['setVisitorsFor']
      )(order as never, [conflict] as never),
    ).toThrow(/conflict/i);
  });
  test(`${Constructor.name} supports canonical batching and child rewrites`, async () => {
    // The heterogeneous constructor table deliberately erases only its dispatch signature.
    const traversal = new Constructor({
      [sourceKey]:
        sourceKey === 'traversableTree'
          ? {
              resolveRoot: () => ({
                vertexContent: source.resolveRoot().vertexContent,
              }),
              resolveChild: (id: string) => ({
                vertexContent: source.resolveChild(id).vertexContent,
              }),
            }
          : source,
    } as never);
    const seen: string[] = [];
    const add = traversal.addVisitorFor.bind(
      traversal,
    ) as DepthFirstTreeTraversal<G>['addVisitorFor'];
    add(
      order as DfsOrder,
      (vertex) => {
        seen.push(`group1:${vertex.$data}`);
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'changed' },
            },
          ],
        };
      },
      { commandCommitMode: 'afterGroup' },
    );
    add(
      order as DfsOrder,
      (vertex) => {
        seen.push(`group2:${vertex.$data}`);
      },
      { resolutionStyle: Style.CONCURRENT },
    );
    add(
      order as DfsOrder.PRE_ORDER,
      (vertex) => {
        seen.push(`each:${vertex.$data}`);
        return {
          commands: [
            {
              commandName: Command.REWRITE_CHILD_HINTS,
              commandArguments: { newHints: [] },
            },
          ],
        };
      },
      { commandCommitMode: 'afterEachVisitor' },
    );
    await traversal.createRunner().run();
    expect(seen).toEqual(['group1:root', 'group2:root', 'each:changed']);
    expect(() =>
      add(order as DfsOrder, () => undefined, {
        commandCommitMode: 'afterEachVisitor',
        resolutionStyle: Style.CONCURRENT,
      }),
    ).toThrow(/conflict/i);
  });
}

for (const Constructor of [DagTraversal<G>, AsyncDagTraversal<G>]) {
  test(`${Constructor.name} preserves committed effects before deferral and validates generations`, async () => {
    const traversal = new Constructor({ traversableGraph: source });
    traversal.addVisitorFor(DagOrder.ON_WORK_READY, () => ({
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: { newData: 'kept' },
        },
      ],
    }));
    traversal.addVisitorFor(DagOrder.ON_WORK_READY, () => ({
      commands: [{ commandName: Command.DEFER_WORK_COMPLETION }],
    }));
    const runner = traversal.createRunner();
    await runner.run();
    expect(
      runner.getResolvedGraph().getVertexById('root')!.getValue().$data,
    ).toBe('kept');
    const generation = runner.summary().vertices.get('root')!.generation!;
    expect(() => runner.settle('root', { ok: true }, Symbol())).toThrow();
    expect(runner.settle('root', { ok: true }, generation)).toBe(true);
    expect(runner.settle('root', { ok: true }, generation)).toBe(false);
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual(['root']);
  });

  test.each([
    Command.REWRITE_CHILD_HINTS,
    Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
  ] as const)(
    `${Constructor.name} validates %s during completion and eager discovery`,
    async (commandName) => {
      const rewrite = (): import('../src').TraversalVisitorResult<
        G,
        'ON_WORK_READY'
      > => ({
        commands: [{ commandName, commandArguments: { newHints: [] } }],
      });
      const completion = new Constructor({ traversableGraph: source });
      completion.addVisitorFor(DagOrder.ON_SUBGRAPH_READY, rewrite as never);
      await expect(async () => {
        await completion.createRunner().run();
      }).rejects.toThrow(/ON_WORK_READY/);
      const eager = new Constructor({
        traversableGraph: source,
        discovery: 'eager',
      });
      eager.addVisitorFor(DagOrder.ON_WORK_READY, rewrite);
      await expect(async () => {
        await eager.createRunner().run();
      }).rejects.toThrow(/eager discovery/);
    },
  );

  test(`${Constructor.name} rejects command deferral during completion`, async () => {
    const traversal = new Constructor({ traversableGraph: source });
    traversal.addVisitorFor(
      DagOrder.ON_SUBGRAPH_READY,
      () =>
        ({
          commands: [{ commandName: Command.DEFER_WORK_COMPLETION }],
        } as never),
    );
    await expect(async () => {
      await traversal.createRunner().run();
    }).rejects.toThrow(/ON_WORK_READY/);
  });
}

test('async command deferral releases callback capacity while work prerequisites remain blocked', async () => {
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 1,
    syntheticRoot: true,
    discovery: 'eager',
    traversableGraph: {
      resolveRoot: () => ({
        vertexContent: { $data: '', $childHints: ['a', 'b', 'c'] },
      }),
      resolveChild: (id) => ({
        ...source.resolveChild(id),
        dependsOnWork: id === 'c' ? ['a'] : [],
      }),
    },
  });
  const seen: string[] = [];
  traversal.addVisitorFor(DagOrder.ON_WORK_READY, async (vertex) => {
    seen.push(vertex.$data);
    return { commands: [{ commandName: Command.DEFER_WORK_COMPLETION }] };
  });
  const runner = traversal.createRunner();
  await runner.run();
  expect(seen).toEqual(['a', 'b']);
  expect(runner.summary().activeVisitorVertexIds).toEqual([]);
  expect(runner.summary().completedWorkIds).toEqual([]);
  runner.settle(
    'a',
    { ok: true },
    runner.summary().vertices.get('a')!.generation!,
  );
  await runner.run();
  expect(seen).toEqual(['a', 'b', 'c']);
});

test('rejects an unknown canonical commit mode without registering the callback', () => {
  const traversal = new DagTraversal<G>({ traversableGraph: source });
  expect(() =>
    traversal.addVisitorFor(DagOrder.ON_WORK_READY, () => undefined, {
      commandCommitMode: 'parallel' as never,
    }),
  ).toThrow(/Unknown visitor command commit mode/);
  expect(traversal.listVisitorsFor(DagOrder.ON_WORK_READY)).toEqual([]);
});

test.each(['afterGroup', 'afterEachVisitor'] as const)(
  'inspection exposes canonical %s while a callback is pending',
  async (commandCommitMode) => {
    const { deferred, eventLoopTurn } = await import(
      './helpers/graph-fixtures'
    );
    const pending = deferred<void>();
    const traversal = new AsyncDagTraversal<G>({ traversableGraph: source });
    traversal.addVisitorFor(DagOrder.ON_WORK_READY, () => pending.promise, {
      commandCommitMode,
    });
    const runner = traversal.createRunner();
    const running = runner.run();
    await eventLoopTurn();
    expect(runner.inspect().chains[0]).toMatchObject({ commandCommitMode });
    pending.resolve();
    await running;
  },
);
