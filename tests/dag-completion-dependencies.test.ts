import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
function bundleGraph() {
  return {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexId: 'root',
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: ['join', 'bundle'],
        },
      },
    }),
    resolveChildHint: (hint: string) => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexId: hint,
        ...(hint === 'join'
          ? {
              workWaitsForWorkOf: ['bundle'],
              workWaitsForSubgraphCompletionOf: ['bundle', 'bundle'],
            }
          : {}),
        vertexContentInput: {
          $vertexData: hint,
          $childDiscoveryHints: hint === 'bundle' ? ['a', 'b', 'a'] : [],
        },
      },
    }),
  };
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const discovery of [
    'incrementalDuringTraversal',
    'completeBeforeAnyVisitor',
  ] as const) {
    test(`${Constructor.name} ${discovery} joins committed bundle completion including duplicate children`, async () => {
      const events: string[] = [];
      const traversal = new Constructor<G>({
        discoveryTiming: discovery,
        dagDiscoverySource: bundleGraph(),
      });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
        events.push(`W:${v.getVertexData()}`);
      });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_SUBGRAPH_COMPLETION_READY,
        (v) => {
          events.push(`C:${v.getVertexData()}`);
        },
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(events.indexOf('W:join')).toBeGreaterThan(
        events.indexOf('C:bundle'),
      );
      expect(events.indexOf('C:bundle')).toBeGreaterThan(events.indexOf('C:a'));
      expect(events.indexOf('C:bundle')).toBeGreaterThan(events.indexOf('C:b'));
      expect(events.filter((event) => event === 'C:a')).toHaveLength(1);
      expect(
        runner.captureProgressSnapshot().progressByVertexId.get('join'),
      ).toMatchObject({
        unmetPrerequisiteVertexIds: [],
        unmetSubgraphCompletionMilestoneVertexIds: [],
        subgraphCompletionCommitted: true,
      });
      expect(
        runner
          .getLiveResolvedGraphView()
          .getVertexSnapshotOrNull(
            runner
              .getLiveResolvedGraphView()
              .getVertexHandleByIdOrNull('join')!,
          )!.workWaitsForWorkOf,
      ).toEqual(['bundle']);
    });
  }

  test.each(['child-ancestor', 'parent-child', 'self', 'mixed'])(
    `${Constructor.name} rejects eager milestone cycle %s before visitors`,
    async (kind) => {
      const events: string[] = [];
      const traversal = new Constructor<G>({
        discoveryTiming: 'completeBeforeAnyVisitor',
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints:
                  kind === 'parent-child' ? ['a'] : ['a', 'b'],
              },
            },
          }),
          resolveChildHint: (id) => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              ...(['mixed', 'parent-child'].includes(kind)
                ? { workWaitsForWorkOf: id === 'b' ? ['a'] : [] }
                : {}),
              workWaitsForSubgraphCompletionOf:
                kind === 'child-ancestor'
                  ? ['root']
                  : kind === 'self'
                  ? [id]
                  : id === 'a'
                  ? ['b']
                  : [],
              vertexContentInput: {
                $vertexData: id,
                $childDiscoveryHints:
                  kind === 'parent-child' && id === 'a' ? ['b'] : [],
              },
            },
          }),
        },
      });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
        events.push(v.getVertexData());
      });
      await expect(async () => {
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toMatchObject({
        name: 'DagTraversalStallError',
        diagnostics: { milestoneCycleVertexIdComponents: expect.any(Array) },
      });
      expect(events).toEqual([]);
    },
  );

  test(`${Constructor.name} seeded work cannot hide original completion cycles`, async () => {
    const runner = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['root', 'a']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
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
            workWaitsForSubgraphCompletionOf: ['root'],
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

  test.each(['absent', 'undefined', 'empty'])(
    `${Constructor.name} root completion %s does not control work prerequisite policy`,
    async (mode) => {
      const runner = new Constructor<G>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              workWaitsForWorkOf: ['missing'],
              ...(mode === 'absent'
                ? {}
                : Object.defineProperty(
                    {},
                    'workWaitsForSubgraphCompletionOf',
                    {
                      value: mode === 'empty' ? [] : undefined,
                      enumerable: true,
                    },
                  )),
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: [],
              },
            },
          }),
          resolveChildHint: () => ({
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toMatchObject({
        diagnostics: { unresolvedPrerequisiteVertexIds: ['missing'] },
      });
    },
  );
}

test('async completion admission and callback settlement do not release C until commit', async () => {
  const gate = deferred<void>();
  const entered = deferred<void>();
  const events: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 3,
    dagDiscoverySource: bundleGraph(),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
    events.push(v.getVertexData());
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    async (v) => {
      if (v.getVertexData() === 'bundle') {
        entered.resolve();
        await gate.promise;
      }
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  // Observe rejection too, so the RED run does not leave an unhandled rejection.
  const outcome = running.then(
    () => null,
    (error: unknown) => error,
  );
  await Promise.race([entered.promise, outcome]);
  expect(
    await Promise.race([outcome, eventLoopTurn().then(() => 'pending')]),
  ).toBe('pending');
  expect(events).not.toContain('join');
  expect(
    runner.captureProgressSnapshot().progressByVertexId.get('join'),
  ).toMatchObject({
    workState: 'waitingForPrerequisiteMilestones',
    unmetPrerequisiteVertexIds: ['bundle'],
    unmetSubgraphCompletionMilestoneVertexIds: ['bundle'],
  });
  gate.resolve();
  await running;
  expect(events).toContain('join');
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} seeded bundle waits for children and original completion callback`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['bundle']),
      dagDiscoverySource: bundleGraph(),
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getVertexData()}`);
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      (v) => {
        events.push(`C:${v.getVertexData()}`);
      },
    );
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(events).not.toContain('W:bundle');
    expect(events.indexOf('W:join')).toBeGreaterThan(
      events.indexOf('C:bundle'),
    );
    expect(events.indexOf('C:bundle')).toBeGreaterThan(events.indexOf('C:b'));
  });

  test(`${Constructor.name} eager root may join independent descendant completion`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForSubgraphCompletionOf: ['child'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['child'],
            },
          },
        }),
        resolveChildHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'child',
            workWaitsForWorkOf: [],
            vertexContentInput: {
              $vertexData: 'child',
              $childDiscoveryHints: [],
            },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getVertexData()}`);
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      (v) => {
        events.push(`C:${v.getVertexData()}`);
      },
    );
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(events).toEqual(['W:child', 'C:child', 'W:root', 'C:root']);
  });

  test(`${Constructor.name} lazy child waiting on ancestor completion reports the structural cycle`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['child'],
            },
          },
        }),
        resolveChildHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'child',
            workWaitsForSubgraphCompletionOf: ['root'],
            vertexContentInput: {
              $vertexData: 'child',
              $childDiscoveryHints: [],
            },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: {
        milestoneCycleVertexIdComponents: [['root', 'child']],
        blockedVertexPrerequisiteReports: [
          { vertexId: 'child', prerequisiteVertexIdsInReport: ['root'] },
        ],
        incompleteVertexIdsWithoutUnmetPrerequisites: ['root'],
      },
    });
  });

  test(`${Constructor.name} C gates preserve SameValueZero and detached summary arrays`, async () => {
    const reference = {};
    const fn = () => undefined;
    const ids = [undefined, NaN, reference, fn, null, -0];
    const completion = [...ids, NaN, reference, +0];
    const traversal = new Constructor<
      VertexDataAndChildHintTypes<unknown, unknown>
    >({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            workWaitsForSubgraphCompletionOf: ['ignored'],
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: ['join', ...ids],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            ...(id === 'join'
              ? { workWaitsForSubgraphCompletionOf: completion }
              : {}),
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) =>
      v.getVertexData() === 'join'
        ? undefined
        : {
            commands: [
              {
                commandName:
                  VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
              },
            ],
          },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const before = runner.captureProgressSnapshot();
    expect(before.counts.verticesWaitingForPrerequisiteMilestones).toBe(1);
    const join = before.progressByVertexId.get('join')!;
    expect(join).toMatchObject({
      workState: 'waitingForPrerequisiteMilestones',
      unmetPrerequisiteVertexIds: [undefined, NaN, reference, fn, null, 0],
      unmetSubgraphCompletionMilestoneVertexIds: [
        undefined,
        NaN,
        reference,
        fn,
        null,
        0,
      ],
    });
    (join.unmetSubgraphCompletionMilestoneVertexIds as unknown[]).length = 0;
    (join.unmetPrerequisiteVertexIds as unknown[]).length = 0;
    completion.length = 0;
    const graph = runner.getLiveResolvedGraphView();
    const stored = graph.getVertexSnapshotOrNull(
      graph.getVertexHandleByIdOrNull('join')!,
    )!;
    expect(stored.workWaitsForSubgraphCompletionOf).toHaveLength(6);
    expect(Object.isFrozen(stored.workWaitsForSubgraphCompletionOf)).toBe(true);
    expect(
      Reflect.set(stored.workWaitsForSubgraphCompletionOf!, 'length', 0),
    ).toBe(false);
    expect(
      graph.getVertexSnapshotOrNull(graph.getVertexHandleByIdOrNull('join')!)!
        .workWaitsForSubgraphCompletionOf,
    ).toHaveLength(6);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('join')!
        .unmetSubgraphCompletionMilestoneVertexIds,
    ).toHaveLength(6);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get(reference)!
        .unmetSubgraphCompletionMilestoneVertexIds,
    ).toEqual([]);
    for (const id of ids)
      runner.settleDeferredWork(
        id,
        { kind: 'workCompleted' },
        before.progressByVertexId.get(id)!.settlementToken!,
      );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('join'),
    ).toMatchObject({
      subgraphCompletionCommitted: true,
      unmetSubgraphCompletionMilestoneVertexIds: [],
    });
  });

  test(`${Constructor.name} shared children finish once before both bundle gates release`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['join', 'a', 'b'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: [],
            ...(id === 'join'
              ? { workWaitsForSubgraphCompletionOf: ['a', 'b'] }
              : {}),
            vertexContentInput: {
              $vertexData: id,
              $childDiscoveryHints: id === 'a' || id === 'b' ? ['shared'] : [],
            },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getVertexData()}`);
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      (v) => {
        events.push(`C:${v.getVertexData()}`);
      },
    );
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(events.filter((event) => event === 'C:shared')).toHaveLength(1);
    expect(events.indexOf('W:join')).toBeGreaterThan(events.indexOf('C:a'));
    expect(events.indexOf('W:join')).toBeGreaterThan(events.indexOf('C:b'));
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} disabling bundle discovery closes C while retaining its dependent`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({ dagDiscoverySource: bundleGraph() });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getVertexData()}`);
      return v.getVertexData() === 'bundle'
        ? {
            commands: [
              {
                commandName:
                  Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
              },
            ],
          }
        : undefined;
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      (v) => {
        events.push(`C:${v.getVertexData()}`);
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(events).not.toContain('W:a');
    expect(events.indexOf('W:join')).toBeGreaterThan(
      events.indexOf('C:bundle'),
    );
    expect(
      runner.captureProgressSnapshot().counts
        .subgraphCompletionCommittedVertices,
    ).toBe(3);
  });

  test(`${Constructor.name} a failed C visitor preserves the exact error and never admits its dependent`, async () => {
    for (const error of [undefined, null, { failure: 'subgraphCompletion' }]) {
      const seen: string[] = [];
      const traversal = new Constructor<G>({
        dagDiscoverySource: bundleGraph(),
      });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
        seen.push(v.getVertexData());
      });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_SUBGRAPH_COMPLETION_READY,
        (v) => {
          if (v.getVertexData() === 'bundle') throw error;
        },
      );
      await expect(async () => {
        await traversal
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
      expect(seen).not.toContain('join');
    }
  });
}

test('halt during held async C preserves pending completion and releases only after resume', async () => {
  const gate = deferred<void>();
  const entered = deferred<void>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<G>({
    maxConcurrentCallbackInvocations: 3,
    dagDiscoverySource: bundleGraph(),
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
    seen.push(v.getVertexData());
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    async (v) => {
      if (v.getVertexData() === 'bundle') {
        entered.resolve();
        await gate.promise;
      }
    },
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
    });
  const running = iterator.next();
  await entered.promise;
  expect(
    runner.captureProgressSnapshot().progressByVertexId.get('join')!.workState,
  ).toBe('waitingForPrerequisiteMilestones');
  const closing = iterator.return(undefined);
  gate.resolve();
  await closing;
  await running;
  expect(seen).not.toContain('join');
  await runner.runUntilSuspendedOrTerminal();
  expect(seen).toContain('join');
  expect(
    runner.captureProgressSnapshot().progressByVertexId.get('join')!
      .subgraphCompletionCommitted,
  ).toBe(true);
});

test('validated summaries read completion presence without copying original declarations', () => {
  const runner = new DagTraversalBuilder<G>({
    discoveryTiming: 'completeBeforeAnyVisitor',
    dagDiscoverySource: bundleGraph(),
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  const declarations = jest.spyOn(
    runnerInternals(runner).resolvedGraphsContainer.store,
    'getDeclaredCompleteDependencies',
  );
  try {
    const captureProgressSnapshot = runner.captureProgressSnapshot();
    expect(
      captureProgressSnapshot.progressByVertexId.get('join')!
        .unmetSubgraphCompletionMilestoneVertexIds,
    ).toEqual([]);
    expect(declarations).not.toHaveBeenCalled();
  } finally {
    declarations.mockRestore();
  }
});
