import { graphResolution } from './source-result-fixtures';
import { treeResolution } from './source-result-fixtures';
import { ResolvedGraphsContainer } from '../src/core/graph/ResolvedGraphsContainer';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalBuilder } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { DagTraversalRunnerState } from '../src/traversals/dag-traversal/lib/DagTraversalRunnerState';
import {
  createInternalAsyncDagTraversal,
  createInternalDagTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const discovery of [
    'incrementalDuringTraversal',
    'completeBeforeAnyVisitor',
  ] as const) {
    test(`${Constructor.name} ${discovery} prepares without work and reuses discovery`, async () => {
      const calls: string[] = [];
      const visits: string[] = [];
      const traversal = new Constructor<G>({
        discoveryTiming: discovery,
        dagDiscoverySource: {
          resolveRootVertex: () => {
            calls.push('a');
            return {
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexId: 'a',
                vertexContentInput: {
                  $vertexData: 'a',
                  $childDiscoveryHints: ['b'],
                },
              },
            };
          },
          resolveChildVertexFromHint: (id) => {
            calls.push(id);
            return {
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexId: id,
                workWaitsForWorkOf: ['a'],
                vertexContentInput: {
                  $vertexData: id,
                  $childDiscoveryHints: [],
                },
              },
            };
          },
        },
      }).registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
        visits.push(vertex.getVertexData());
      });
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      expect(await runner.discoverValidateAndFreezeTopology()).toBe(runner);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
      expect(runner.getTraversalStopReason()).toBe('prepared');
      expect(runner.captureProgressSnapshot()).toMatchObject({
        discovery: { timing: 'completeBeforeAnyVisitor', complete: true },
        workCompletionCommittedVertexIds: [],
        subgraphCompletionCommittedVertexIds: [],
        workAwaitingSettlement: [],
      });
      expect(visits).toEqual([]);
      expect(calls).toEqual(['a', 'b']);
      await runner.discoverValidateAndFreezeTopology();
      const events = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
        events.push([event.vertex.getVertexData(), event.eventKind]);
      expect(events).toEqual([
        ['a', 'workCompletionCommitted'],
        ['b', 'workCompletionCommitted'],
        ['b', 'subgraphCompletionCommitted'],
        ['a', 'subgraphCompletionCommitted'],
      ]);
      expect(visits).toEqual(['a', 'b']);
      expect(calls).toEqual(['a', 'b']);
      await expect(async () =>
        runner.discoverValidateAndFreezeTopology(),
      ).rejects.toThrow(/execution/i);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
    });
  }
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const sourceMode of ['tree', 'graph'] as const) {
    for (const empty of [false, true]) {
      test(`${Constructor.name} prepares ${sourceMode} ${
        empty ? 'omitted' : 'nonempty'
      } roots`, async () => {
        const calls: string[] = [];
        const source = {
          resolveRootVertex: () => {
            calls.push('root');
            return empty
              ? { kind: 'vertexIntentionallyOmitted' as const }
              : {
                  kind: 'vertexResolved' as const,
                  resolvedVertexInput: {
                    vertexContentInput: {
                      $vertexData: 'root',
                      $childDiscoveryHints: ['child'],
                    },
                  },
                };
          },
          resolveChildVertexFromHint: () => {
            calls.push('child');
            return {
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexContentInput: {
                  $vertexData: 'child',
                  $childDiscoveryHints: [],
                },
              },
            };
          },
        };
        const runner = new Constructor<G>(
          sourceMode === 'tree'
            ? {
                treeDiscoverySource: {
                  resolveRootVertex: source.resolveRootVertex,
                  resolveChildVertexFromHint: source.resolveChildVertexFromHint,
                },
              }
            : {
                dagDiscoverySource: {
                  ...source,
                  resolveRootVertex: () =>
                    graphResolution(source.resolveRootVertex()),
                  resolveChildVertexFromHint: () =>
                    graphResolution(source.resolveChildVertexFromHint()),
                },
              },
        ).createIndependentRunnerFromCurrentOptions();
        await runner.discoverValidateAndFreezeTopology();
        await runner.discoverValidateAndFreezeTopology();
        expect(runner.getTraversalStopReason()).toBe('prepared');
        expect(runner.captureProgressSnapshot().counts).toMatchObject({
          retainedLiveVertices: empty ? 0 : 2,
          workCompletionCommittedVertices: 0,
          subgraphCompletionCommittedVertices: 0,
        });
        expect(calls).toEqual(empty ? ['root'] : ['root', 'child']);
        await runner.runUntilSuspendedOrTerminal();
        expect(runner.getTraversalStopReason()).toBe('finished');
        expect(calls).toEqual(empty ? ['root'] : ['root', 'child']);
      });
    }
  }

  for (const empty of [false, true]) {
    test(`${Constructor.name} hides synthetic bookkeeping during preparation`, async () => {
      const runner = new Constructor<G>({
        sourceRootIsHiddenEntryHolder: true,
        dagDiscoverySource: {
          resolveRootVertex: () =>
            empty
              ? {
                  omittedVertexIdentity: null,
                  kind: 'vertexIntentionallyOmitted' as const,
                  satisfiesWorkAndSubgraphCompletionPrerequisites:
                    true as const,
                }
              : {
                  kind: 'vertexResolved' as const,
                  resolvedVertexInput: {
                    vertexContentInput: {
                      $vertexData: 'synthetic',
                      $childDiscoveryHints: ['a'],
                    },
                  },
                },
          resolveChildVertexFromHint: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'a',
              vertexContentInput: {
                $vertexData: 'a',
                $childDiscoveryHints: [],
              },
            },
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await runner.discoverValidateAndFreezeTopology();
      expect(runner.getTraversalStopReason()).toBe('prepared');
      expect(runner.captureProgressSnapshot()).toMatchObject({
        counts: { retainedLiveVertices: empty ? 0 : 1 },
        workCompletionCommittedVertexIds: [],
        subgraphCompletionCommittedVertexIds: [],
        workAwaitingSettlement: [],
      });
      await runner.runUntilSuspendedOrTerminal();
      expect(runner.getTraversalStopReason()).toBe('finished');
    });
  }

  test(`${Constructor.name} prepares lookup closure and accepted work without committing completion`, async () => {
    const calls: unknown[] = [];
    const visits: string[] = [];
    const runner = new Constructor<G>({
      acceptedCompletedWorkVertexIds: new Set(['lookup']),
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForSubgraphCompletionOf: ['lookup'],
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: (id) => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
          },
        }),
        resolvePrerequisiteByVertexId: (id) => {
          calls.push(id);
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              vertexContentInput: {
                $vertexData: 'lookup',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        },
      },
    })
      .registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
        visits.push(vertex.getVertexData());
      })
      .createIndependentRunnerFromCurrentOptions();
    await runner.discoverValidateAndFreezeTopology();
    expect(calls).toEqual(['lookup']);
    expect(visits).toEqual([]);
    expect(runner.captureProgressSnapshot()).toMatchObject({
      workCompletionCommittedVertexIds: ['lookup'],
      subgraphCompletionCommittedVertexIds: [],
      workAwaitingSettlement: [],
      counts: { retainedLiveVertices: 3 },
    });
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      events.push([event.vertex.getVertexData(), event.eventKind]);
      if (event.eventKind === 'workCompletionCommitted')
        expect(
          runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        ).toContain(event.vertex.getVertexData());
      else
        expect(
          runner.captureProgressSnapshot().subgraphCompletionCommittedVertexIds,
        ).toContain(event.vertex.getVertexData());
    }
    expect(events).toEqual([
      ['child', 'workCompletionCommitted'],
      ['child', 'subgraphCompletionCommitted'],
      ['lookup', 'subgraphCompletionCommitted'],
      ['root', 'workCompletionCommitted'],
      ['root', 'subgraphCompletionCommitted'],
    ]);
    expect(visits).toEqual(['child', 'root']);
    expect(calls).toEqual(['lookup']);
  });

  for (const issue of [
    'missing',
    'workCycle',
    'completionCycle',
    'seedCycle',
    'unknownSeed',
  ] as const) {
    test(`${Constructor.name} preparation rejects ${issue} before visitors`, async () => {
      let visits = 0;
      const runner = new Constructor<G>({
        ...(issue === 'seedCycle'
          ? { acceptedCompletedWorkVertexIds: new Set(['root', 'lookup']) }
          : issue === 'unknownSeed'
          ? { acceptedCompletedWorkVertexIds: new Set(['unknown']) }
          : {}),
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              workWaitsForWorkOf: issue === 'unknownSeed' ? [] : ['lookup'],
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: [],
              },
            },
          }),
          resolveChildVertexFromHint: () => ({
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted' as const,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          }),
          resolvePrerequisiteByVertexId: () =>
            issue === 'missing'
              ? { kind: 'missing' }
              : {
                  kind: 'vertexResolved' as const,
                  resolvedVertexInput: {
                    vertexId: 'lookup',
                    ...(issue === 'completionCycle'
                      ? { workWaitsForSubgraphCompletionOf: ['root'] }
                      : { workWaitsForWorkOf: ['root'] }),
                    vertexContentInput: {
                      $vertexData: 'lookup',
                      $childDiscoveryHints: [],
                    },
                  },
                },
        },
      })
        .registerVisitorForPhase(Order.ON_WORK_READY, () => {
          visits++;
        })
        .createIndependentRunnerFromCurrentOptions();
      await expect(async () =>
        runner.discoverValidateAndFreezeTopology(),
      ).rejects.toThrow();
      expect(visits).toBe(0);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(runner.captureProgressSnapshot().workAwaitingSettlement).toEqual(
        [],
      );
    });
  }

  for (const error of [undefined, null, { exact: true }]) {
    for (const stage of ['root', 'child', 'lookup'] as const) {
      test(`${
        Constructor.name
      } retains exact ${stage} preparation error ${String(
        error,
      )}`, async () => {
        const runner = new Constructor<G>({
          dagDiscoverySource: {
            resolveRootVertex: () => {
              if (stage === 'root') throw error;
              return {
                kind: 'vertexResolved' as const,
                resolvedVertexInput: {
                  vertexId: 'root',
                  workWaitsForWorkOf: stage === 'lookup' ? ['lookup'] : [],
                  vertexContentInput: {
                    $vertexData: 'root',
                    $childDiscoveryHints: stage === 'child' ? ['child'] : [],
                  },
                },
              };
            },
            resolveChildVertexFromHint: () => {
              throw error;
            },
            resolvePrerequisiteByVertexId: () => {
              throw error;
            },
          },
        }).createIndependentRunnerFromCurrentOptions();
        await expect(async () =>
          runner.discoverValidateAndFreezeTopology(),
        ).rejects.toBe(error);
        await expect(async () =>
          runner.discoverValidateAndFreezeTopology(),
        ).rejects.toBe(error);
        await expect(async () =>
          runner.runUntilSuspendedOrTerminal(),
        ).rejects.toBe(error);
        expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
      });
    }
  }
}

const single = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted' as const,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
};
for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const injection of ['state', 'container', 'both'] as const) {
    test(`${Constructor.name} rejects empty injected ${injection} recoverably`, async () => {
      const state = new DagTraversalRunnerState<G>();
      const container = new ResolvedGraphsContainer<G>({
        sourceMode: 'graph',
        saveOriginal: false,
      });
      const runner = (
        Constructor === DagTraversalBuilder
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        dagDiscoverySource: single,
        traversalRunnerInternalObjects: {
          ...(injection !== 'container' ? { state } : {}),
          ...(injection !== 'state'
            ? { resolvedGraphsContainer: container }
            : {}),
        },
      }).createIndependentRunnerFromCurrentOptions();
      const before = runner.captureExecutionSnapshot();
      await expect(async () =>
        runner.discoverValidateAndFreezeTopology(),
      ).rejects.toThrow(/injected/i);
      expect(runner.captureExecutionSnapshot()).toEqual(before);
      expect(runner.captureProgressSnapshot().discovery.timing).toBe(
        'incrementalDuringTraversal',
      );
      await runner.runUntilSuspendedOrTerminal();
      expect(runner.getTraversalStopReason()).toBe('finished');
    });
  }

  test(`${Constructor.name} rejects prepare during suspended execution without poisoning`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: single,
    }).createIndependentRunnerFromCurrentOptions();
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
    expect((await iterator.next()).done).toBe(false);
    await expect(async () =>
      runner.discoverValidateAndFreezeTopology(),
    ).rejects.toThrow(/active iterator/i);
    await iterator.return();
    await expect(async () =>
      runner.discoverValidateAndFreezeTopology(),
    ).rejects.toThrow(/execution/i);
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalStopReason()).toBe('finished');
  });

  test(`${Constructor.name} invalid execution options do not prevent preparation`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: single,
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () =>
      runner.runUntilSuspendedOrTerminal({
        // @ts-expect-error Invalid phases also reject recoverably for JavaScript callers.
        deliveredEventKinds: ['BEFORE_CHILD_EXPANSION'],
      }),
    ).rejects.toThrow();
    await runner.discoverValidateAndFreezeTopology();
    expect(runner.getTraversalStopReason()).toBe('prepared');
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalStopReason()).toBe('finished');
  });

  for (const sourceMode of ['graph', 'tree'] as const) {
    test(`${Constructor.name} prepared ${sourceMode} topology stays frozen`, async () => {
      const source = {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      };
      const runner = new Constructor<G>(
        sourceMode === 'graph'
          ? {
              dagDiscoverySource: {
                ...source,
                resolveRootVertex: () =>
                  graphResolution(source.resolveRootVertex()),
                resolveChildVertexFromHint: () =>
                  graphResolution(source.resolveChildVertexFromHint()),
              },
            }
          : {
              treeDiscoverySource: {
                resolveRootVertex: source.resolveRootVertex,
                resolveChildVertexFromHint: source.resolveChildVertexFromHint,
              },
            },
      )
        .registerVisitorForPhase(Order.ON_WORK_READY, () => ({
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: ['unexpected'] },
            },
          ],
        }))
        .createIndependentRunnerFromCurrentOptions();
      await runner.discoverValidateAndFreezeTopology();
      await expect(async () =>
        runner.runUntilSuspendedOrTerminal(),
      ).rejects.toThrow(/topology|eager/i);
      expect(
        runner.captureProgressSnapshot().counts.workCompletionCommittedVertices,
      ).toBe(0);
    });
  }
}

for (const adopt of [false, true]) {
  test(`async preparation drains pending source and ${
    adopt ? 'run adopts' : 'prepare resumes'
  } eager discovery`, async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const calls: string[] = [];
    const visits: string[] = [];
    const runner = new AsyncDagTraversalBuilder<G>({
      maxConcurrentCallbackInvocations: 1,
      dagDiscoverySource: {
        resolveRootVertex: () => {
          calls.push('root');
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['a', 'b'],
              },
            },
          };
        },
        resolveChildVertexFromHint: async (id) => {
          calls.push(id);
          if (id === 'a') {
            entered();
            await gate;
          }
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: id,
              vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
            },
          };
        },
      },
    })
      .registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
        visits.push(vertex.getVertexData());
      })
      .createIndependentRunnerFromCurrentOptions();
    let finished = false;
    const preparing = runner.discoverValidateAndFreezeTopology().then(() => {
      finished = true;
    });
    await started;
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
    await expect(runner.discoverValidateAndFreezeTopology()).rejects.toThrow(
      /active iterator/i,
    );
    await expect(runner.runUntilSuspendedOrTerminal()).rejects.toThrow(
      /active iterator/i,
    );
    await Promise.resolve();
    expect(finished).toBe(false);
    expect(calls).toEqual(['root', 'a']);
    release();
    await preparing;
    expect(runner.getTraversalStopReason()).toBe('paused');
    expect(calls).toEqual(['root', 'a']);
    expect(visits).toEqual([]);
    expect(runner.captureProgressSnapshot().discovery).toEqual({
      timing: 'completeBeforeAnyVisitor',
      complete: false,
    });
    if (adopt) await runner.runUntilSuspendedOrTerminal();
    else {
      await runner.discoverValidateAndFreezeTopology();
      expect(runner.getTraversalStopReason()).toBe('prepared');
      expect(visits).toEqual([]);
      await runner.runUntilSuspendedOrTerminal();
    }
    expect(calls).toEqual(['root', 'a', 'b']);
    expect(visits).toEqual(['root', 'a', 'b']);
    expect(runner.getTraversalStopReason()).toBe('finished');
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  for (const injection of ['state', 'container'] as const) {
    test(`${Constructor.name} rejects injected tree ${injection} without changing continuation`, async () => {
      const tree = {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      };
      const fresh = new Constructor<G>({
        treeDiscoverySource: tree,
      }).createIndependentRunnerFromCurrentOptions();
      const runner = (
        Constructor === DagTraversalBuilder
          ? createInternalDagTraversal
          : createInternalAsyncDagTraversal
      )<G>({
        treeDiscoverySource: tree,
        traversalRunnerInternalObjects:
          injection === 'state'
            ? { state: runnerInternals(fresh).state }
            : {
                resolvedGraphsContainer:
                  runnerInternals(fresh).resolvedGraphsContainer,
              },
      }).createIndependentRunnerFromCurrentOptions();
      const before = runner.captureExecutionSnapshot();
      await expect(async () =>
        runner.discoverValidateAndFreezeTopology(),
      ).rejects.toThrow(/injected/i);
      expect(runner.captureExecutionSnapshot()).toEqual(before);
      await runner.runUntilSuspendedOrTerminal();
      expect(runner.getTraversalStopReason()).toBe('finished');
    });
  }
  test(`${Constructor.name} injected failure wins over preparation validation`, async () => {
    const runner = (
      Constructor === DagTraversalBuilder
        ? createInternalDagTraversal
        : createInternalAsyncDagTraversal
    )<G>({
      dagDiscoverySource: single,
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState<G>({
          status: Status.FAILED,
          failure: { error: undefined },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () =>
      runner.discoverValidateAndFreezeTopology(),
    ).rejects.toBeUndefined();
  });

  for (const stage of [
    'root',
    'child',
    'transformHints',
    'omittedVertexIdentity',
  ] as const) {
    test(`${Constructor.name} preparation retains ${stage} source pipeline failure`, async () => {
      const error = Symbol(stage);
      const source = {
        resolveRootVertex: () => {
          if (stage === 'root') throw error;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexContentInput: {
                $vertexData: 'root',
                $childDiscoveryHints: ['child'],
              },
            },
          };
        },
        resolveChildVertexFromHint: () => {
          throw error;
        },
      };
      const runner = new Constructor<G>({
        ...(stage === 'omittedVertexIdentity'
          ? {
              dagDiscoverySource: {
                ...source,
                tryGetVertexIdentityFromHint: () => {
                  throw error;
                },
              },
            }
          : {
              treeDiscoverySource: {
                resolveRootVertex: source.resolveRootVertex,
                resolveChildVertexFromHint: source.resolveChildVertexFromHint,
              },
            }),
        ...(stage === 'transformHints'
          ? {
              transformChildHintsBeforeResolution: () => {
                throw error;
              },
            }
          : {}),
      }).createIndependentRunnerFromCurrentOptions();
      await expect(async () =>
        runner.discoverValidateAndFreezeTopology(),
      ).rejects.toBe(error);
      await expect(async () =>
        runner.runUntilSuspendedOrTerminal(),
      ).rejects.toBe(error);
    });
  }
}

test('sync preparation is owned during callbacks and can pause at the root', () => {
  let rootCalls = 0;
  const runner: ReturnType<
    DagTraversalBuilder<G>['createIndependentRunnerFromCurrentOptions']
  > = new DagTraversalBuilder<G>({
    treeDiscoverySource: {
      resolveRootVertex: () => {
        rootCalls++;
        expect(() => runner.discoverValidateAndFreezeTopology()).toThrow(
          /active iterator/i,
        );
        expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
          /active iterator/i,
        );
        expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
          },
        };
      },
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  runner.discoverValidateAndFreezeTopology();
  expect(runner.getTraversalStopReason()).toBe('paused');
  runner.discoverValidateAndFreezeTopology();
  expect(runner.getTraversalStopReason()).toBe('prepared');
  expect(rootCalls).toBe(1);
  runner.runUntilSuspendedOrTerminal();
  expect(runner.getTraversalStopReason()).toBe('finished');
});

for (const omitted of [false, true]) {
  test(`async tree preparation drains a pending ${
    omitted ? 'omitted' : 'vertexResolved'
  } root before pausing`, async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let calls = 0;
    const runner = new AsyncDagTraversalBuilder<G>({
      treeDiscoverySource: {
        resolveRootVertex: async () => {
          calls++;
          entered();
          await gate;
          return treeResolution(
            omitted ? null : { $vertexData: 'root', $childDiscoveryHints: [] },
          );
        },
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const preparing = runner.discoverValidateAndFreezeTopology();
    await started;
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(1);
    release();
    await preparing;
    expect(runner.getTraversalStopReason()).toBe('paused');
    expect(runner.captureExecutionSnapshot().inFlightInvocationCount).toBe(0);
    await runner.discoverValidateAndFreezeTopology();
    expect(runner.getTraversalStopReason()).toBe('prepared');
    expect(
      runner.captureProgressSnapshot().counts.workCompletionCommittedVertices,
    ).toBe(0);
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toBe(1);
    expect(runner.getTraversalStopReason()).toBe('finished');
  });
}
