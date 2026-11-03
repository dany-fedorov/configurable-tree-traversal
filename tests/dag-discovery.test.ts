import { graphResolution } from './source-result-fixtures';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import {
  createInternalAsyncDagTraversal,
  createInternalDagTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} eager discovery expands blocked grandchildren before visiting`, async () => {
    const resolved: string[] = [];
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      ...{ discoveryTiming: 'completeBeforeAnyVisitor' as const },
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a', 'b'],
            },
          },
        }),
        resolveChildHint: (hint) => {
          resolved.push(hint);
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: hint,
              workWaitsForWorkOf: hint === 'a' ? ['c'] : [],
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: hint === 'b' ? ['c'] : [],
              },
            },
          };
        },
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      expect(resolved).toEqual(['a', 'b', 'c']);
      seen.push(vertex.getVertexData());
    });
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['root', 'b', 'c', 'a']);
  });

  test.each(['cycle', 'missing', 'seed'])(
    `${Constructor.name} rejects eager %s before visitors`,
    async (invalid) => {
      const seen: string[] = [];
      const traversal = new Constructor<G>({
        ...{ discoveryTiming: 'completeBeforeAnyVisitor' as const },
        acceptedCompletedWorkVertexIds: new Set(
          invalid === 'cycle'
            ? ['root', 'a']
            : invalid === 'seed'
            ? ['unknown']
            : [],
        ),
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              workWaitsForWorkOf: invalid === 'cycle' ? ['a'] : [],
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['a'],
              },
            },
          }),
          resolveChildHint: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'a',
              workWaitsForWorkOf:
                invalid === 'cycle'
                  ? ['root']
                  : invalid === 'missing'
                  ? ['missing']
                  : [],
              vertexContentInput: {
                $vertexData: 'a',
                $childDiscoveryHints: [],
              },
            },
          }),
        },
      });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_WORK_READY,
        (vertex) => {
          seen.push(vertex.getVertexData());
        },
      );
      await expect(async () => {
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow();
      expect(seen).toEqual([]);
    },
  );

  test.each([
    Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
    Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
  ])(
    `${Constructor.name} rejects eager topology command %s`,
    async (command) => {
      const traversal = new Constructor<G>({
        ...{ discoveryTiming: 'completeBeforeAnyVisitor' as const },
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: [],
              },
            },
          }),
          resolveChildHint: () => ({
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
            kind: 'vertexIntentionallyOmitted' as const,
          }),
        },
      });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
        commands: [
          command === Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX
            ? { commandName: command }
            : {
                commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                commandArguments: { replacementChildHints: [] },
              },
        ],
      }));
      await expect(async () => {
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toThrow(/eager/i);
    },
  );
}

test('async eager discovery waits for actual promised resolver results', async () => {
  const resolved: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<G>({
    ...{ discoveryTiming: 'completeBeforeAnyVisitor' as const },
    dagDiscoverySource: {
      resolveRootVertex: async () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['a'],
          },
        },
      }),
      resolveChildHint: async (hint) => {
        await Promise.resolve();
        resolved.push(hint);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: hint,
            vertexContentInput: {
              $vertexData: hint,
              $childDiscoveryHints: hint === 'a' ? ['b'] : [],
            },
          },
        };
      },
    },
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, async () => {
    expect(resolved).toEqual(['a', 'b']);
  });
  await traversal
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} seeded lazy discovery validates original root dependency cycles`, async () => {
    const runner = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['root', 'a']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['a'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a'],
            },
          },
        }),
        resolveChildHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            workWaitsForWorkOf: ['root'],
            vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: { milestoneCycleVertexIdComponents: [['root', 'a']] },
    });
  });

  test(`${Constructor.name} eager ordinary root honors declared dependencies`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['a'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a'],
            },
          },
        }),
        resolveChildHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            workWaitsForWorkOf: [],
            vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getVertexData());
    });
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['a', 'root']);
  });

  test.each(['priority'])(
    `${Constructor.name} rejects unsupported %s graph metadata`,
    async (key) => {
      for (const root of [false, true]) {
        const traversal = new Constructor<G>({
          discoveryTiming: 'completeBeforeAnyVisitor',
          dagDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                ...(root ? { [key]: [] } : {}),
                vertexContentInput: {
                  $vertexData: 'root',
                  $childDiscoveryHints: ['a'],
                },
              },
            }),
            resolveChildHint: () => ({
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                [key]: [],
                vertexContentInput: {
                  $vertexData: 'a',
                  $childDiscoveryHints: [],
                },
              },
            }),
          },
        });
        await expect(async () => {
          await traversal
            .createIndependentRunnerFromCurrentOptions()
            .runUntilSuspendedOrTerminal();
        }).rejects.toThrow(/not supported/);
      }
    },
  );

  test.each([
    { discoveryTiming: 'completeBeforeAnyVisitor' as const },
    { sourceRootIsHiddenEntryHolder: true },
  ])(
    `${Constructor.name} rejects graph progress options with trees or injected continuation %j`,
    (options) => {
      const graph = {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      };
      expect(() =>
        new Constructor<G>({
          treeDiscoverySource: {
            resolveRootVertex: graph.resolveRootVertex,
            resolveChildVertexFromHint: graph.resolveChildHint,
          },
          ...options,
        }).createIndependentRunnerFromCurrentOptions(),
      ).toThrow(TypeError);
      const runner = new Constructor<G>({
        dagDiscoverySource: {
          ...graph,
          resolveRootVertex: () => graphResolution(graph.resolveRootVertex()),
          resolveChildHint: () => graphResolution(graph.resolveChildHint()),
        },
      }).createIndependentRunnerFromCurrentOptions();
      for (const injected of [
        { state: runnerInternals(runner).state },
        {
          resolvedGraphsContainer:
            runnerInternals(runner).resolvedGraphsContainer,
        },
      ]) {
        expect(() =>
          (Constructor === DagTraversalBuilder
            ? createInternalDagTraversal
            : createInternalAsyncDagTraversal)<G>({
            dagDiscoverySource: {
              ...graph,
              resolveRootVertex: () =>
                graphResolution(graph.resolveRootVertex()),
              resolveChildHint: () => graphResolution(graph.resolveChildHint()),
            },
            ...options,
            traversalRunnerInternalObjects: injected,
          }).createIndependentRunnerFromCurrentOptions(),
        ).toThrow(TypeError);
      }
    },
  );

  test(`${Constructor.name} accepts inactive progress options on trees`, async () => {
    await new Constructor<G>({
      discoveryTiming: 'incrementalDuringTraversal',
      sourceRootIsHiddenEntryHolder: false,
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
  });

  test(`${Constructor.name} eager data rewrites and deletion retain original snapshots`, async () => {
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      retainDiscoveredGraphBeforeVisitorCommands: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a', 'b'],
            },
          },
        }),
        resolveChildHint: (hint) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: hint,
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      (vertex) => ({
        commands: [
          vertex.getVertexData() === 'a'
            ? {
                commandName:
                  Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
              }
            : {
                commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: { replacementVertexData: 'rewritten' },
              },
        ],
      }),
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
    expect(
      runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull('a'),
    ).toBeNull();
    expect(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull('b')!
        .getCurrentVertexView()
        .getVertexData(),
    ).toBe('rewritten');
    expect(
      runner
        .preCommandDiscoveredGraphView!.getVertexHandleByIdOrNull('b')!
        .getCurrentVertexView()
        .getVertexData(),
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
    vertexContent: { $vertexData: 'root', $childDiscoveryHints: [] },
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

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} validates seeded lazy cycles before completion after discovery closes`, async () => {
    const completed: string[] = [];
    const traversal = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['root', 'a']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['a'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['a'],
            },
          },
        }),
        resolveChildHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'a',
            workWaitsForWorkOf: ['root'],
            vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      (vertex) => {
        completed.push(vertex.getVertexData());
      },
    );
    await expect(async () => {
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: { milestoneCycleVertexIdComponents: [['root', 'a']] },
    });
    expect(completed).toEqual([]);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} rejects graph completion metadata in tree-source mode`, async () => {
    let visits = 0;
    // @ts-expect-error Deliberately unsafe source validates the runtime boundary.
    const traversal = new Constructor<G>({
      treeDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            priority: 1,
            workWaitsForSubgraphCompletionOf: ['unused'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['child'],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            priority: 2,
            workWaitsForSubgraphCompletionOf: ['also ignored'],
            vertexContentInput: {
              $vertexData: 'child',
              $childDiscoveryHints: [],
            },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => {
      visits += 1;
    });
    await expect(async () => {
      await traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
    }).rejects.toThrow(/graph metadata/i);
    expect(visits).toBe(0);
  });
}
