import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagVisitorPhase as Order,
  type DagProgressSnapshot,
} from '../src/traversals/dag-traversal';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';

type G = VertexDataAndChildHintTypes<string, string>;
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} invalid summary blocks only unmet work alongside seeded and ready components`, async () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      acceptedCompletedWorkVertexIds: new Set(['done']),
      dagDiscoverySource: {
        resolveRootVertex: () => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: '',
                $childDiscoveryHints: ['done', 'ready', 'bad'],
              },
            },
          };
        },
        resolveChildHint: (id) => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              workWaitsForWorkOf:
                id === 'ready' ? ['done'] : id === 'bad' ? ['missing'] : [],
              vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        },
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => {
      calls++;
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: { unresolvedPrerequisiteVertexIds: ['missing'] },
    });
    const captureProgressSnapshot = runner.captureProgressSnapshot();
    expect(captureProgressSnapshot.discovery.complete).toBe(true);
    expect(
      captureProgressSnapshot.progressByVertexId.get('done')!.workState,
    ).toBe('workCompletionCommitted');
    expect(
      captureProgressSnapshot.progressByVertexId.get('ready')!.workState,
    ).toBe('readyForWorkVisitorAdmission');
    expect(
      captureProgressSnapshot.progressByVertexId.get('ready')!
        .unmetPrerequisiteVertexIds,
    ).toEqual([]);
    expect(
      captureProgressSnapshot.progressByVertexId.get('bad')!.workState,
    ).toBe('waitingForPrerequisiteMilestones');
    expect(
      captureProgressSnapshot.invalidDependencyTopologyDiagnostics,
    ).toEqual({
      blockedVertexPrerequisiteReports: [
        { vertexId: 'bad', prerequisiteVertexIdsInReport: ['missing'] },
      ],
      unresolvedPrerequisiteVertexIds: ['missing'],
      milestoneCycleVertexIdComponents: [],
      nonCyclePrerequisiteBlockedVertexIds: ['bad'],
      incompleteVertexIdsWithoutUnmetPrerequisites: [],
      originalMilestoneConstraints: expect.any(Array),
    });
    captureProgressSnapshot.invalidDependencyTopologyDiagnostics!.blockedVertexPrerequisiteReports[0]!.prerequisiteVertexIdsInReport.length = 0;
    captureProgressSnapshot.invalidDependencyTopologyDiagnostics!.nonCyclePrerequisiteBlockedVertexIds.length = 0;
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics!
        .blockedVertexPrerequisiteReports,
    ).toEqual([{ vertexId: 'bad', prerequisiteVertexIdsInReport: ['missing'] }]);
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics!
        .nonCyclePrerequisiteBlockedVertexIds,
    ).toEqual(['bad']);
    expect(calls).toBe(4);
  });

  test(`${Constructor.name} partial summary retains original seeded cycles while projecting actual unmet work`, async () => {
    const bad = Object.create(null) as object;
    const missing = { missing: true };
    const cycle = undefined;
    const snapshots: DagProgressSnapshot[] = [];
    const runner = new Constructor<
      VertexDataAndChildHintTypes<unknown, unknown>
    >({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      acceptedCompletedWorkVertexIds: new Set<unknown>(['done', cycle]),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: ['done', 'ready', bad, cycle],
            },
          },
        }),
        resolveChildHint: (id) => {
          if (id === 'probe') {
            snapshots.push(runner.captureProgressSnapshot());
            return {
              kind: 'vertexIntentionallyOmitted' as const,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              omittedVertexIdentity: { vertexId: id },
            };
          }
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              workWaitsForWorkOf:
                id === 'ready'
                  ? ['done']
                  : id === bad
                  ? [missing]
                  : id === cycle
                  ? [cycle]
                  : [],
              vertexContentInput: {
                $vertexData: id,
                $childDiscoveryHints: id === cycle ? ['probe'] : [],
              },
            },
          };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: {
        unresolvedPrerequisiteVertexIds: [missing],
        milestoneCycleVertexIdComponents: [[cycle]],
      },
    });
    expect(snapshots).toHaveLength(1);
    const partial = snapshots[0]!;
    expect(partial.discovery.complete).toBe(false);
    expect(partial.progressByVertexId.get(cycle)!.workState).toBe(
      'workCompletionCommitted',
    );
    expect(partial.invalidDependencyTopologyDiagnostics).toEqual({
      blockedVertexPrerequisiteReports: [
        { vertexId: bad, prerequisiteVertexIdsInReport: [missing] },
      ],
      unresolvedPrerequisiteVertexIds: [missing],
      milestoneCycleVertexIdComponents: [[cycle]],
      nonCyclePrerequisiteBlockedVertexIds: [bad],
      incompleteVertexIdsWithoutUnmetPrerequisites: [],
      originalMilestoneConstraints: expect.any(Array),
    });
    expect(
      partial.invalidDependencyTopologyDiagnostics!
        .blockedVertexPrerequisiteReports[0]!.vertexId,
    ).toBe(bad);
    expect(
      partial.invalidDependencyTopologyDiagnostics!
        .blockedVertexPrerequisiteReports[0]!.prerequisiteVertexIdsInReport[0],
    ).toBe(missing);
    const complete = runner.captureProgressSnapshot();
    expect(complete.discovery.complete).toBe(true);
    expect(complete.invalidDependencyTopologyDiagnostics).toEqual(
      partial.invalidDependencyTopologyDiagnostics,
    );
    partial.invalidDependencyTopologyDiagnostics!.milestoneCycleVertexIdComponents[0]!.length = 0;
    partial.invalidDependencyTopologyDiagnostics!.unresolvedPrerequisiteVertexIds.length = 0;
    partial.invalidDependencyTopologyDiagnostics!.blockedVertexPrerequisiteReports.length = 0;
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics,
    ).toEqual(complete.invalidDependencyTopologyDiagnostics);
  });

  test(`${Constructor.name} defers a diamond without publishing success and settles once`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      acceptedCompletedWorkVertexIds: new Set(['design']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: ['design', 'backend', 'frontend', 'verify'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf:
              id === 'design'
                ? []
                : id === 'verify'
                ? ['backend', 'frontend']
                : ['design'],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getVertexData());
      return {
        commands: [
          {
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
        ],
      };
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect(runner.captureProgressSnapshot().discovery.complete).toBe(false);
    expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
      0,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
    expect(
      runner.captureProgressSnapshot()
        .workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(['backend', 'frontend']);
    expect(runner.captureProgressSnapshot().counts).toEqual({
      retainedLiveVertices: 4,
      verticesWaitingForPrerequisiteMilestones: 1,
      workVisitorReadyOrWorkCompletionDeferredVertices: 2,
      workCompletionDeferredVertices: 2,
      verticesWithAdmittedVisitorChains: 0,
      workCompletionCommittedVertices: 1,
      subgraphCompletionCommittedVertices: 1,
    });
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics,
    ).toBeNull();
    const backend = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('backend')!.settlementToken!;
    expect(
      runner.settleDeferredWork('backend', { kind: 'workCompleted' }, backend),
    ).toBe(true);
    expect(
      runner.settleDeferredWork('backend', { kind: 'workCompleted' }, backend),
    ).toBe(false);
    expect(() =>
      runner.settleDeferredWork(
        'backend',
        { kind: 'traversalFailed', error: null },
        backend,
      ),
    ).toThrow();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot()
        .workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(['frontend']);
    const frontend = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('frontend')!.settlementToken!;
    runner.settleDeferredWork('frontend', { kind: 'workCompleted' }, frontend);
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot()
        .workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(['verify']);
    runner.settleDeferredWork(
      'verify',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('verify')!
        .settlementToken!,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    expect(
      runner.captureProgressSnapshot().counts.workCompletionCommittedVertices,
    ).toBe(4);
    expect(
      runner.captureProgressSnapshot().counts
        .subgraphCompletionCommittedVertices,
    ).toBe(4);
    expect(
      runner.settleDeferredWork('backend', { kind: 'workCompleted' }, backend),
    ).toBe(false);
    expect(seen).toEqual(['backend', 'frontend', 'verify']);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} agrees with an independent exhaustive four-vertex frontier oracle`, async () => {
    const ids = ['a', 'b', 'c', 'd'];
    const possible = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ] as const;
    for (let edges = 0; edges < 64; edges++) {
      const dependencies = ids.map((_, to) =>
        possible
          .filter(
            ([, targetMilestone], bit) =>
              targetMilestone === to && (edges & (1 << bit)) !== 0,
          )
          .map(([from]) => ids[from]!),
      );
      for (let mask = 0; mask < 16; mask++) {
        const completed = new Set(
          ids.filter((_, i) => (mask & (1 << i)) !== 0),
        );
        if (
          ids.some(
            (id, i) =>
              completed.has(id) &&
              dependencies[i]!.some((dependency) => !completed.has(dependency)),
          )
        )
          continue;
        const expected = ids.filter(
          (id, i) =>
            !completed.has(id) &&
            dependencies[i]!.every((dependency) => completed.has(dependency)),
        );
        const traversal = new Constructor<G>({
          discoveryTiming: 'completeBeforeAnyVisitor',
          sourceRootIsHiddenEntryHolder: true,
          acceptedCompletedWorkVertexIds: completed,
          dagDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexContentInput: {
                  $vertexData: '',
                  $childDiscoveryHints: ids,
                },
              },
            }),
            resolveChildHint: (id) => ({
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexId: id,
                workWaitsForWorkOf: dependencies[ids.indexOf(id)]!,
                vertexContentInput: {
                  $vertexData: id,
                  $childDiscoveryHints: [],
                },
              },
            }),
          },
        });
        traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        }));
        const runner = traversal.createIndependentRunnerFromCurrentOptions();
        await runner.runUntilSuspendedOrTerminal();
        expect(
          runner.captureProgressSnapshot()
            .workVisitorReadyOrWorkCompletionDeferredVertexIds,
        ).toEqual(expected);
        expect(runner.captureProgressSnapshot().discovery.complete).toBe(true);
        expect(
          runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        ).toEqual([...completed]);
      }
    }
  });

  test(`${Constructor.name} summaries retain arbitrary ID identity, detach containers and never call adapters or visitors`, async () => {
    const first = { key: 'same' };
    const second = { key: 'same' };
    const ids = [first, second, undefined, null, NaN];
    let calls = 0;
    const traversal = new Constructor<
      VertexDataAndChildHintTypes<unknown, unknown>
    >({
      discoveryTiming: 'completeBeforeAnyVisitor',
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: '',
                $childDiscoveryHints: ids,
              },
            },
          };
        },
        resolveChildHint: (id) => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              workWaitsForWorkOf: [],
              vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        },
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
      calls++;
      const captureProgressSnapshot = runner.captureProgressSnapshot();
      expect(
        captureProgressSnapshot.admittedVisitorChainVertexIds.includes(
          vertex.getVertexData(),
        ),
      ).toBe(true);
      expect(
        captureProgressSnapshot.progressByVertexId.get(vertex.getVertexData())!
          .workState,
      ).toBe('workVisitorChainAdmitted');
      return {
        commands: [
          {
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
        ],
      };
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const count = calls;
    const captureProgressSnapshot = runner.captureProgressSnapshot();
    expect(
      captureProgressSnapshot.workVisitorReadyOrWorkCompletionDeferredVertexIds,
    ).toEqual(ids);
    (
      captureProgressSnapshot.workVisitorReadyOrWorkCompletionDeferredVertexIds as unknown[]
    ).length = 0;
    (
      captureProgressSnapshot.progressByVertexId as Map<unknown, unknown>
    ).clear();
    first.key = 'changed';
    expect(Object.isFrozen(first)).toBe(false);
    const fresh = runner.captureProgressSnapshot();
    expect(fresh.workVisitorReadyOrWorkCompletionDeferredVertexIds).toEqual(
      ids,
    );
    expect(fresh.progressByVertexId.get(first)!.vertexId).toBe(first);
    expect(fresh.progressByVertexId.get(second)!.vertexId).toBe(second);
    expect(calls).toBe(count);
    for (const id of ids)
      runner.settleDeferredWork(
        id,
        { kind: 'workCompleted' },
        fresh.progressByVertexId.get(id)!.settlementToken!,
      );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(ids);
  });

  test(`${Constructor.name} eager deferred parents cannot hide descendant topology`, async () => {
    const traversal = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
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
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: [id === 'child' ? 'root' : 'child'],
            vertexContentInput: {
              $vertexData: id,
              $childDiscoveryHints: id === 'child' ? ['leaf'] : [],
            },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
      3,
    );
    expect(runner.captureProgressSnapshot().discovery.complete).toBe(true);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('leaf')!
        .unmetPrerequisiteVertexIds,
    ).toEqual(['child']);
    (
      runner.captureProgressSnapshot().progressByVertexId.get('leaf')!
        .unmetPrerequisiteVertexIds as unknown[]
    ).length = 0;
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('leaf')!
        .unmetPrerequisiteVertexIds,
    ).toEqual(['child']);
  });

  test.each(['cycle', 'missing'])(
    `${Constructor.name} eager %s fails before deferring and remains inspectable`,
    async (invalid) => {
      const traversal = new Constructor<G>({
        discoveryTiming: 'completeBeforeAnyVisitor',
        sourceRootIsHiddenEntryHolder: true,
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: '',
                $childDiscoveryHints: ['a', 'b'],
              },
            },
          }),
          resolveChildHint: (id) => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              workWaitsForWorkOf:
                invalid === 'cycle' ? [id === 'a' ? 'b' : 'a'] : ['missing'],
              vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
            },
          }),
        },
      });
      let visited = false;
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => {
        visited = true;
        return {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
      });
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toThrow();
      expect(visited).toBe(false);
      expect(
        runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics,
      ).not.toBeNull();
      expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
        2,
      );
      expect(runner.captureProgressSnapshot().discovery.complete).toBe(true);
    },
  );
}

test('async summary excludes unresolved callbacks and includes active completion chains', async () => {
  const { deferred, eventLoopTurn } = await import('./helpers/graph-fixtures');
  const root = deferred<{
    kind: 'vertexResolved';
    resolvedVertexInput: {
      vertexId: string;
      vertexContentInput: {
        $vertexData: string;
        $childDiscoveryHints: string[];
      };
    };
  }>();
  const complete = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<G>({
    dagDiscoverySource: {
      resolveRootVertex: () => root.promise,
      resolveChildHint: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    () => complete.promise,
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await eventLoopTurn();
  expect(runner.captureProgressSnapshot().discovery.complete).toBe(false);
  expect(
    runner.captureProgressSnapshot().admittedVisitorChainVertexIds,
  ).toEqual([]);
  expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
  root.resolve({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  });
  await eventLoopTurn();
  expect(
    runner.captureProgressSnapshot().admittedVisitorChainVertexIds,
  ).toEqual(['root']);
  expect(
    runner.captureProgressSnapshot().progressByVertexId.get('root')!.workState,
  ).toBe('workCompletionCommitted');
  expect(
    runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual(['root']);
  expect(
    runner.captureProgressSnapshot().subgraphCompletionCommittedVertexIds,
  ).toEqual([]);
  complete.resolve();
  await running;
  expect(
    runner.captureProgressSnapshot().subgraphCompletionCommittedVertexIds,
  ).toEqual(['root']);
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} known lazy cycles remain invalid alongside legitimate deferred work`, async () => {
    const traversal = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: '',
              $childDiscoveryHints: ['a', 'b'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: id === 'b' ? ['b'] : [],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toThrow(/stalled/);
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics!
        .milestoneCycleVertexIdComponents,
    ).toEqual([['b']]);
    runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics!.milestoneCycleVertexIdComponents[0]!.length = 0;
    expect(
      runner.captureProgressSnapshot().invalidDependencyTopologyDiagnostics!
        .milestoneCycleVertexIdComponents,
    ).toEqual([['b']]);
  });

  test(`${Constructor.name} empty-root discovery closes only after resolution and preserves unused seeds in summary`, async () => {
    const traversal = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['missing']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect(
      runner.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
    ).toEqual(['missing']);
    (
      runner.captureProgressSnapshot()
        .unmatchedCompletedWorkSeedVertexIds as unknown[]
    ).length = 0;
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toThrow(/acceptedCompletedWorkVertexIds/);
    expect(
      runner.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
    ).toEqual(['missing']);
    expect(runner.captureProgressSnapshot().discovery.complete).toBe(true);
    expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
      0,
    );
  });
}
