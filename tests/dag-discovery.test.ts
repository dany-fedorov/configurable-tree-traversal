import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';

type G = VertexTypes<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} eager discovery expands blocked grandchildren before visiting`, async () => {
    const resolved: string[] = [];
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      ...{ discovery: 'eager' as const },
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['a', 'b'] },
        }),
        resolveChild: (hint) => {
          resolved.push(hint);
          return {
            vertexId: hint,
            dependsOnWork: hint === 'a' ? ['c'] : [],
            vertexContent: { $d: hint, $c: hint === 'b' ? ['c'] : [] },
          };
        },
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      expect(resolved).toEqual(['a', 'b', 'c']);
      seen.push(vertex.getData());
    });
    await traversal.createRunner().run();
    expect(seen).toEqual(['root', 'b', 'c', 'a']);
  });

  test.each(['cycle', 'missing', 'seed'])(
    `${Constructor.name} rejects eager %s before visitors`,
    async (invalid) => {
      const seen: string[] = [];
      const traversal = new Constructor<G>({
        ...{ discovery: 'eager' as const },
        completedWork: new Set(
          invalid === 'cycle'
            ? ['root', 'a']
            : invalid === 'seed'
            ? ['unknown']
            : [],
        ),
        traversableGraph: {
          resolveRoot: () => ({
            vertexId: 'root',
            dependsOnWork: invalid === 'cycle' ? ['a'] : [],
            vertexContent: { $d: 'root', $c: ['a'] },
          }),
          resolveChild: () => ({
            vertexId: 'a',
            dependsOnWork:
              invalid === 'cycle'
                ? ['root']
                : invalid === 'missing'
                ? ['missing']
                : [],
            vertexContent: { $d: 'a', $c: [] },
          }),
        },
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
        seen.push(vertex.getData());
      });
      await expect(async () => {
        await traversal.createRunner().run();
      }).rejects.toThrow();
      expect(seen).toEqual([]);
    },
  );

  test.each([
    Command.DISABLE_SUBTREE_TRAVERSAL,
    Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
  ])(
    `${Constructor.name} rejects eager topology command %s`,
    async (command) => {
      const traversal = new Constructor<G>({
        ...{ discovery: 'eager' as const },
        traversableGraph: {
          resolveRoot: () => ({ vertexContent: { $d: 'root', $c: [] } }),
          resolveChild: () => ({ vertexContent: null }),
        },
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
        commands: [
          command === Command.DISABLE_SUBTREE_TRAVERSAL
            ? { commandName: command }
            : {
                commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
                commandArguments: { newHints: [] },
              },
        ],
      }));
      await expect(async () => {
        await traversal.createRunner().run();
      }).rejects.toThrow(/eager/i);
    },
  );
}

test('async eager discovery waits for actual promised resolver results', async () => {
  const resolved: string[] = [];
  const traversal = new AsyncDagTraversal<G>({
    ...{ discovery: 'eager' as const },
    traversableGraph: {
      resolveRoot: async () => ({
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: ['a'] },
      }),
      resolveChild: async (hint) => {
        await Promise.resolve();
        resolved.push(hint);
        return {
          vertexId: hint,
          vertexContent: { $d: hint, $c: hint === 'a' ? ['b'] : [] },
        };
      },
    },
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, async () => {
    expect(resolved).toEqual(['a', 'b']);
  });
  await traversal.createRunner().run();
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} seeded lazy discovery validates original root dependency cycles`, async () => {
    const runner = new Constructor<G>({
      completedWork: new Set(['root', 'a']),
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          dependsOnWork: ['a'],
          vertexContent: { $d: 'root', $c: ['a'] },
        }),
        resolveChild: () => ({
          vertexId: 'a',
          dependsOnWork: ['root'],
          vertexContent: { $d: 'a', $c: [] },
        }),
      },
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: { dependencyCycleComponents: [['root', 'a']] },
    });
  });

  test(`${Constructor.name} eager ordinary root honors declared dependencies`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          dependsOnWork: ['a'],
          vertexContent: { $d: 'root', $c: ['a'] },
        }),
        resolveChild: () => ({
          vertexId: 'a',
          dependsOnWork: [],
          vertexContent: { $d: 'a', $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getData());
    });
    await traversal.createRunner().run();
    expect(seen).toEqual(['a', 'root']);
  });

  test.each(['priority'])(
    `${Constructor.name} rejects unsupported %s graph metadata`,
    async (key) => {
      for (const root of [false, true]) {
        const traversal = new Constructor<G>({
          discovery: 'eager',
          traversableGraph: {
            resolveRoot: () => ({
              ...(root ? { [key]: [] } : {}),
              vertexContent: { $d: 'root', $c: ['a'] },
            }),
            resolveChild: () => ({
              [key]: [],
              vertexContent: { $d: 'a', $c: [] },
            }),
          },
        });
        await expect(async () => {
          await traversal.createRunner().run();
        }).rejects.toThrow(/not supported/);
      }
    },
  );

  test.each([{ discovery: 'eager' as const }, { syntheticRoot: true }])(
    `${Constructor.name} rejects graph progress options with trees or injected continuation %j`,
    (options) => {
      const graph = {
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
      };
      expect(() =>
        new Constructor<G>({
          traversableTree: graph,
          ...options,
        }).createRunner(),
      ).toThrow(TypeError);
      const runner = new Constructor<G>({
        traversableGraph: graph,
      }).createRunner();
      for (const injected of [
        { state: runner.state },
        { resolvedGraphsContainer: runner.resolvedGraphsContainer },
      ]) {
        expect(() =>
          new Constructor<G>({
            traversableGraph: graph,
            ...options,
            traversalRunnerInternalObjects: injected,
          }).createRunner(),
        ).toThrow(TypeError);
      }
    },
  );

  test(`${Constructor.name} accepts inactive progress options on trees`, async () => {
    await new Constructor<G>({
      discovery: 'lazy',
      syntheticRoot: false,
      traversableTree: {
        resolveRoot: () => ({ vertexContent: null }),
        resolveChild: () => ({ vertexContent: null }),
      },
    })
      .createRunner()
      .run();
  });

  test(`${Constructor.name} eager data rewrites and deletion retain original snapshots`, async () => {
    const traversal = new Constructor<G>({
      discovery: 'eager',
      retainOriginalGraphStructure: true,
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['a', 'b'] },
        }),
        resolveChild: (hint) => ({
          vertexId: hint,
          vertexContent: { $d: hint, $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => ({
      commands: [
        vertex.getData() === 'a'
          ? { commandName: Command.DELETE_VERTEX }
          : {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'rewritten' },
            },
      ],
    }));
    const runner = traversal.createRunner();
    await runner.run({ iterateOver: [] });
    expect(runner.getResolvedGraph().getVertexById('a')).toBeNull();
    expect(
      runner.getResolvedGraph().getVertexById('b')!.getValue().getData(),
    ).toBe('rewritten');
    expect(
      runner.originalGraphView!.getVertexById('b')!.getValue().getData(),
    ).toBe('b');
  });
}

test('scheduler discovery queries are detached and do not consume eligible work', async () => {
  const { GraphScheduling } = await import(
    '../src/core/scheduling/GraphScheduling'
  );
  const { ResolvedGraphsContainer } = await import(
    '../src/core/graph/ResolvedGraphsContainer'
  );
  const container = new ResolvedGraphsContainer<G>({
    sourceMode: 'graph',
    saveOriginal: false,
  });
  const scheduler = new GraphScheduling(container);
  const root = scheduler.acceptRoot({
    vertexId: 'root',
    vertexContent: { $d: 'root', $c: [] },
  })!;
  expect(scheduler.isDiscoveryComplete()).toBe(false);
  const query = scheduler as typeof scheduler & {
    inspectWork(): import('../src/core/scheduling/types').VertexWork<G>[];
  };
  const before = query.inspectWork();
  expect(before[0]!.initialCommitted).toBe(false);
  before[0]!.unmet.add('invented');
  before[0]!.completionAccounted.push(true);
  before[0]!.initialCommitted = true;
  expect(query.inspectWork()[0]).toMatchObject({
    unmet: new Set(),
    completionAccounted: [],
    initialCommitted: false,
  });
  scheduler.prepareSlots(root, []);
  scheduler.closeExpansion(root);
  expect(scheduler.isDiscoveryComplete()).toBe(true);
  expect(scheduler.takeReady()).toBe(root);
  scheduler.markPreVisited(root);
  expect(query.inspectWork()[0]!.completionCommitted).toBe(false);
  expect(scheduler.takeCompleting()).toBe(root);
  scheduler.markComplete(root);
  expect(query.inspectWork()[0]!.completionCommitted).toBe(true);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} validates seeded lazy cycles before completion after discovery closes`, async () => {
    const completed: string[] = [];
    const traversal = new Constructor<G>({
      completedWork: new Set(['root', 'a']),
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          dependsOnWork: ['a'],
          vertexContent: { $d: 'root', $c: ['a'] },
        }),
        resolveChild: () => ({
          vertexId: 'a',
          dependsOnWork: ['root'],
          vertexContent: { $d: 'a', $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (vertex) => {
      completed.push(vertex.getData());
    });
    await expect(async () => {
      await traversal.createRunner().run();
    }).rejects.toMatchObject({
      diagnostics: { dependencyCycleComponents: [['root', 'a']] },
    });
    expect(completed).toEqual([]);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} rejects graph completion metadata in tree-source mode`, async () => {
    let visits = 0;
    // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
    const traversal = new Constructor<G>({
      traversableTree: {
        resolveRoot: () => ({
          priority: 1,
          dependsOnSubgraphCompletion: ['unused'],
          vertexContent: { $d: 'root', $c: ['child'] },
        }),
        resolveChild: () => ({
          priority: 2,
          dependsOnSubgraphCompletion: ['also ignored'],
          vertexContent: { $d: 'child', $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      visits += 1;
    });
    await expect(async () => {
      await traversal.createRunner().run();
    }).rejects.toThrow(/graph metadata/i);
    expect(visits).toBe(0);
  });
}
