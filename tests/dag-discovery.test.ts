import { graphResolution } from './source-result-fixtures';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  createInternalAsyncDagTraversal,
  createInternalDagTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type G = VertexTypes<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} eager discovery expands blocked grandchildren before visiting`, async () => {
    const resolved: string[] = [];
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      ...{ discovery: 'eager' as const },
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['a', 'b'] },
          },
        }),
        resolveChild: (hint) => {
          resolved.push(hint);
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: hint,
              dependsOnWork: hint === 'a' ? ['c'] : [],
              vertexContent: {
                $data: hint,
                $childHints: hint === 'b' ? ['c'] : [],
              },
            },
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
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              dependsOnWork: invalid === 'cycle' ? ['a'] : [],
              vertexContent: { $data: 'root', $childHints: ['a'] },
            },
          }),
          resolveChild: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'a',
              dependsOnWork:
                invalid === 'cycle'
                  ? ['root']
                  : invalid === 'missing'
                  ? ['missing']
                  : [],
              vertexContent: { $data: 'a', $childHints: [] },
            },
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

  test.each([Command.SKIP_REMAINING_CHILDREN, Command.REWRITE_CHILD_HINTS])(
    `${Constructor.name} rejects eager topology command %s`,
    async (command) => {
      const traversal = new Constructor<G>({
        ...{ discovery: 'eager' as const },
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: { vertexContent: { $data: 'root', $childHints: [] } },
          }),
          resolveChild: () => ({
            identity: null,
            satisfiesDependencies: true as const,
            kind: 'omitted' as const,
          }),
        },
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
        commands: [
          command === Command.SKIP_REMAINING_CHILDREN
            ? { commandName: command }
            : {
                commandName: Command.REWRITE_CHILD_HINTS,
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
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ['a'] },
        },
      }),
      resolveChild: async (hint) => {
        await Promise.resolve();
        resolved.push(hint);
        return {
          kind: 'found' as const,
          vertex: {
            vertexId: hint,
            vertexContent: {
              $data: hint,
              $childHints: hint === 'a' ? ['b'] : [],
            },
          },
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
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['a'],
            vertexContent: { $data: 'root', $childHints: ['a'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            dependsOnWork: ['root'],
            vertexContent: { $data: 'a', $childHints: [] },
          },
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
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['a'],
            vertexContent: { $data: 'root', $childHints: ['a'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            dependsOnWork: [],
            vertexContent: { $data: 'a', $childHints: [] },
          },
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
              kind: 'found' as const,
              vertex: {
                ...(root ? { [key]: [] } : {}),
                vertexContent: { $data: 'root', $childHints: ['a'] },
              },
            }),
            resolveChild: () => ({
              kind: 'found' as const,
              vertex: {
                [key]: [],
                vertexContent: { $data: 'a', $childHints: [] },
              },
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
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
      };
      expect(() =>
        new Constructor<G>({
          traversableTree: graph,
          ...options,
        }).createRunner(),
      ).toThrow(TypeError);
      const runner = new Constructor<G>({
        traversableGraph: {
          ...graph,
          resolveRoot: () => graphResolution(graph.resolveRoot()),
          resolveChild: () => graphResolution(graph.resolveChild()),
        },
      }).createRunner();
      for (const injected of [
        { state: runnerInternals(runner).state },
        {
          resolvedGraphsContainer:
            runnerInternals(runner).resolvedGraphsContainer,
        },
      ]) {
        expect(() =>
          (Constructor === DagTraversal
            ? createInternalDagTraversal
            : createInternalAsyncDagTraversal)<G>({
            traversableGraph: {
              ...graph,
              resolveRoot: () => graphResolution(graph.resolveRoot()),
              resolveChild: () => graphResolution(graph.resolveChild()),
            },
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
        resolveRoot: () => ({ kind: 'omitted' as const }),
        resolveChild: () => ({ kind: 'omitted' as const }),
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
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['a', 'b'] },
          },
        }),
        resolveChild: (hint) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: hint,
            vertexContent: { $data: hint, $childHints: [] },
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => ({
      commands: [
        vertex.getData() === 'a'
          ? { commandName: Command.DELETE_DAG_VERTEX_CASCADE }
          : {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: { newData: 'rewritten' },
            },
      ],
    }));
    const runner = traversal.createRunner();
    await runner.run({ emitEvents: [] });
    expect(runner.getResolvedGraphView().getVertexRefById('a')).toBeNull();
    expect(
      runner.getResolvedGraphView().getVertexRefById('b')!.getValue().getData(),
    ).toBe('rewritten');
    expect(
      runner.originalGraphView!.getVertexRefById('b')!.getValue().getData(),
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
    vertexContent: { $data: 'root', $childHints: [] },
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
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['a'],
            vertexContent: { $data: 'root', $childHints: ['a'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            dependsOnWork: ['root'],
            vertexContent: { $data: 'a', $childHints: [] },
          },
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
          kind: 'found' as const,
          vertex: {
            priority: 1,
            dependsOnSubgraphCompletion: ['unused'],
            vertexContent: { $data: 'root', $childHints: ['child'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            priority: 2,
            dependsOnSubgraphCompletion: ['also ignored'],
            vertexContent: { $data: 'child', $childHints: [] },
          },
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
