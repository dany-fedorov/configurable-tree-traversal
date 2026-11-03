import type { DagPrerequisiteLookupResult } from '../src/core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const discovery of [
    'incrementalDuringTraversal',
    'completeBeforeAnyVisitor',
  ] as const) {
    test(`${Constructor.name} ${discovery} resolves transitive dependencies as detached components`, async () => {
      const calls: unknown[] = [];
      const events: string[] = [];
      const source = {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'app',
            workWaitsForWorkOf: ['parser'],
            vertexContentInput: {
              $vertexData: 'app',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
        resolvePrerequisiteByVertexId(
          id: unknown,
        ): DagPrerequisiteLookupResult<G> {
          expect(this).toBe(source);
          calls.push(id);
          return {
            kind: 'vertexResolved',
            resolvedVertexInput: {
              workWaitsForWorkOf: id === 'parser' ? ['lexer'] : [],
              vertexContentInput: {
                $vertexData: String(id),
                $childDiscoveryHints: [],
              },
            },
          };
        },
      };
      const traversal = new Constructor<G>({
        dagDiscoverySource: source,
        discoveryTiming: discovery,
        retainDiscoveredGraphBeforeVisitorCommands: true,
      });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (v) => {
        events.push(v.getVertexData());
      });
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
        0,
      );
      expect(calls).toEqual([]);
      await runner.runUntilSuspendedOrTerminal();
      expect(calls).toEqual(['parser', 'lexer']);
      expect(events).toEqual(['lexer', 'parser', 'app']);
      const graph = runner.getLiveResolvedGraphView();
      const parser = graph.getVertexHandleByIdOrNull('parser')!;
      expect(graph.getDistinctStructuralParentHandlesOrNull(parser)).toEqual(
        [],
      );
      expect(graph.requireAllStructuralAncestorPathsTo(parser)).toEqual([
        [parser],
      ]);
      expect(
        graph.getVertexSnapshotOrNull(parser)!.firstDiscoveryDepthInEdges,
      ).toBe(0);
      expect(
        graph.requireVertexId(graph.getDesignatedRootHandleOrNull()!),
      ).toBe('app');
      expect(
        runner.captureProgressSnapshot().counts
          .subgraphCompletionCommittedVertices,
      ).toBe(3);
    });
  }

  test.each([false, true])(
    `${Constructor.name} distinguishes missing from omitted (%s)`,
    async (omit) => {
      const calls: unknown[] = [];
      const source = {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'app',
            workWaitsForWorkOf: ['external'],
            workWaitsForSubgraphCompletionOf: ['external'],
            vertexContentInput: {
              $vertexData: 'app',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
        resolvePrerequisiteByVertexId: (id: unknown) => {
          calls.push(id);
          return omit
            ? {
                omittedVertexIdentity: null,
                kind: 'vertexIntentionallyOmitted' as const,
                satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              }
            : { kind: 'missing' as const };
        },
      };
      const runner = new Constructor<G>({
        dagDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions();
      if (omit) {
        await runner.runUntilSuspendedOrTerminal();
        expect(
          runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        ).toEqual(['app']);
      } else {
        await expect(async () => {
          await runner.runUntilSuspendedOrTerminal();
        }).rejects.toMatchObject({
          name: 'DagTraversalStallError',
          diagnostics: { unresolvedPrerequisiteVertexIds: ['external'] },
        });
        expect(
          runnerInternals(runner).resolvedGraphsContainer.store.getIdState(
            'external',
          ),
        ).toBeUndefined();
      }
      expect(calls).toEqual(['external']);
    },
  );
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} coalesces raw IDs across both milestone lists and dependents`, async () => {
    const object = {};
    const fn = () => undefined;
    const ids = [undefined, null, NaN, +0, -0, object, fn, Symbol('id')];
    const calls: unknown[] = [];
    const source = {
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
      resolveChildHint: (id: string) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: ids,
          workWaitsForSubgraphCompletionOf: ids,
          vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
        },
      }),
      resolvePrerequisiteByVertexId: (id: unknown) => {
        calls.push(id);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            vertexContentInput: {
              $vertexData: 'external',
              $childDiscoveryHints: [],
            },
          },
        };
      },
    };
    const runner = new Constructor<G>({
      dagDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toEqual([undefined, null, NaN, 0, object, fn, ids[7]]);
    expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
      10,
    );
  });

  test(`${Constructor.name} ordinary discovery satisfies available IDs without lookup`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['deep'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['branch'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: [],
            vertexContentInput: {
              $vertexData: id,
              $childDiscoveryHints: id === 'branch' ? ['deep'] : [],
            },
          },
        }),
        resolvePrerequisiteByVertexId: (id) => {
          calls.push(id);
          return { kind: 'missing' as const };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toEqual([]);
    expect(runner.captureProgressSnapshot().counts.retainedLiveVertices).toBe(
      3,
    );
  });

  test(`${Constructor.name} seeded original declarations resolve but unrelated unused seeds do not`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['root', 'external', 'unused']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['external'],
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
        resolvePrerequisiteByVertexId: (id) => {
          calls.push(id);
          return {
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toThrow('acceptedCompletedWorkVertexIds contains undiscovered vertex IDs');
    expect(calls).toEqual(['external']);
  });

  test(`${Constructor.name} root completion waits for independently anchored child work`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      retainDiscoveredGraphBeforeVisitorCommands: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: ['app'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            ...(id === 'app' ? { workWaitsForWorkOf: ['parser'] } : {}),
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
        resolvePrerequisiteByVertexId: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'parser',
              $childDiscoveryHints: ['generated'],
            },
          },
        }),
      },
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      (v) => {
        events.push(v.getVertexData());
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const graph = runner.getLiveResolvedGraphView();
    const parser = graph.getVertexHandleByIdOrNull('parser')!;
    expect(
      graph.getVertexSnapshotOrNull(parser)!.firstDiscoveryDepthInEdges,
    ).toBe(0);
    expect(
      graph.getVertexSnapshotOrNull(
        graph.getVertexHandleByIdOrNull('generated')!,
      )!.firstDiscoveryDepthInEdges,
    ).toBe(1);
    expect(graph.getDistinctStructuralParentHandlesOrNull(parser)).toEqual([]);
    expect(graph.getDesignatedRootHandleOrNull()).toBeNull();
    expect(events).toContain('generated');
    expect(
      runner.captureProgressSnapshot().counts
        .subgraphCompletionCommittedVertices,
    ).toBe(3);
    const saved =
      runnerInternals(runner).resolvedGraphsContainer
        .preCommandDiscoveredGraphView!;
    const originalParser = saved.getVertexHandleByIdOrNull('parser')!;
    expect(
      saved.getDistinctStructuralParentHandlesOrNull(originalParser),
    ).toEqual([]);
    expect(saved.requireAllStructuralAncestorPathsTo(originalParser)).toEqual([
      [originalParser],
    ]);
  });

  test.each([undefined, null, { reason: 'resolver' }])(
    `${Constructor.name} preserves exact resolver thrown value %#`,
    async (error) => {
      const runner = new Constructor<G>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              workWaitsForWorkOf: ['external'],
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
          resolvePrerequisiteByVertexId: () => {
            throw error;
          },
        },
      }).createIndependentRunnerFromCurrentOptions();
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
    },
  );

  test(`${Constructor.name} validates an explicit result ID`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['external'],
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
        resolvePrerequisiteByVertexId: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          omittedVertexIdentity: { vertexId: undefined },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toThrow(
      'Prerequisite result vertex id and requested vertex id mismatch',
    );
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} a negative cache is superseded by later real discovery`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      discoveryTiming: 'completeBeforeAnyVisitor',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['external', 'loader'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForWorkOf: [],
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
        resolvePrerequisiteByVertexId: (id) => {
          calls.push(id);
          return id === 'external'
            ? { kind: 'missing' as const }
            : {
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  workWaitsForWorkOf: ['external'],
                  vertexContentInput: {
                    $vertexData: 'loader',
                    $childDiscoveryHints: ['external'],
                  },
                },
              };
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toEqual(['external', 'loader']);
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['root', 'loader', 'external']);
  });

  test(`${Constructor.name} validates lookup cycles despite seeded initial work`, async () => {
    const runner = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['root', 'external']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['external'],
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
        resolvePrerequisiteByVertexId: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            workWaitsForSubgraphCompletionOf: ['root'],
            vertexContentInput: {
              $vertexData: 'external',
              $childDiscoveryHints: [],
            },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      diagnostics: { milestoneCycleVertexIdComponents: [['root', 'external']] },
    });
  });
}

for (const kind of ['promise', 'getter', 'call'] as const) {
  test(`sync resolver preserves the thenable misuse contract (${kind})`, () => {
    const cause = {};
    const value =
      kind === 'promise'
        ? Promise.resolve({ kind: 'missing' })
        : kind === 'getter'
        ? Object.defineProperty({}, 'then', {
            get: () => {
              throw cause;
            },
          })
        : {
            then: () => {
              throw cause;
            },
          };
    const runner = new DagTraversalBuilder<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['external'],
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
        resolvePrerequisiteByVertexId: () =>
          value as DagPrerequisiteLookupResult<G>,
      },
    }).createIndependentRunnerFromCurrentOptions();
    let error: unknown;
    try {
      runner.runUntilSuspendedOrTerminal();
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      message:
        'Synchronous DagTraversalRunner callback RESOLVE_PREREQUISITE returned a thenable',
      ...(kind === 'promise' ? {} : { cause }),
    });
  });
}
