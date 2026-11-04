import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import type { DagDiscoverySource, VertexDataAndChildHintTypes } from '../src';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexDataAndChildHintTypes<string, string>;

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([undefined, new Set<unknown>()])(
    `${Constructor.name} honors root work prerequisites independently of completedWork (%s)`,
    async (acceptedCompletedWorkVertexIds) => {
      const visited: string[] = [];
      const runner = new Constructor<G>({
        ...(acceptedCompletedWorkVertexIds === undefined
          ? {}
          : { acceptedCompletedWorkVertexIds: acceptedCompletedWorkVertexIds }),
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              workWaitsForWorkOf: ['missing'],
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
        },
      })
        .registerVisitorForPhase(Order.ON_WORK_READY, (v) => {
          visited.push(v.getVertexData());
        })
        .createIndependentRunnerFromCurrentOptions();
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toMatchObject({ name: 'DagTraversalStallError' });
      expect(visited).toEqual([]);
    },
  );

  test.each([undefined, 'none', 'waitForDiscoveringParentWork'] as const)(
    `${Constructor.name} graph parent dependency is explicit (%s)`,
    async (undeclaredWorkToWorkPrerequisitePolicy) => {
      const visited: string[] = [];
      const runner = new Constructor<G>({
        discoveryTiming: 'completeBeforeAnyVisitor',
        ...(undeclaredWorkToWorkPrerequisitePolicy === undefined
          ? {}
          : {
              undeclaredWorkToWorkPrerequisitePolicy:
                undeclaredWorkToWorkPrerequisitePolicy,
            }),
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
          resolveChildVertexFromHint: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'child',
              vertexContentInput: {
                $vertexData: 'child',
                $childDiscoveryHints: [],
              },
            },
          }),
        },
      })
        .registerVisitorForPhase(Order.ON_WORK_READY, (v) => {
          visited.push(v.getVertexData());
          return {
            commands: [
              {
                commandName:
                  VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
              },
            ],
          };
        })
        .createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(visited).toEqual(
        undeclaredWorkToWorkPrerequisitePolicy === 'waitForDiscoveringParentWork'
          ? ['root']
          : ['root', 'child'],
      );
    },
  );

  test.each([undefined, new Set<unknown>()])(
    `${Constructor.name} ignore root work dependencies is independent of seeds (%s)`,
    async (acceptedCompletedWorkVertexIds) => {
      const runner = new Constructor<G>({
        ...{ rootWorkToWorkPrerequisitePolicy: 'ignore' },
        ...(acceptedCompletedWorkVertexIds === undefined
          ? {}
          : { acceptedCompletedWorkVertexIds: acceptedCompletedWorkVertexIds }),
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              workWaitsForWorkOf: ['missing'],
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
        },
      }).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ).toEqual(['root']);
    },
  );

  test(`${Constructor.name} normalizes canonical found and omitted results without losing ID identity`, async () => {
    const objectId = {};
    const source: DagDiscoverySource<G> = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: undefined,
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['child'],
          },
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: objectId,
          workWaitsForWorkOf: ['external'],
          workWaitsForSubgraphCompletionOf: ['external'],
          vertexContentInput: {
            $vertexData: 'child',
            $childDiscoveryHints: [],
          },
        },
      }),
      resolvePrerequisiteByVertexId: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted',
        satisfiesWorkAndSubgraphCompletionPrerequisites: true,
      }),
    };
    const runner = new Constructor<G>({
      dagDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([undefined, objectId]);
    expect(
      runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull(objectId),
    ).not.toBeNull();
    expect(
      runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull(undefined),
    ).not.toBeNull();
  });

  test(`${Constructor.name} canonical missing lookup leaves prerequisites unknown`, async () => {
    const source: DagDiscoverySource<G> = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          workWaitsForWorkOf: ['missing'],
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        },
      }),
      resolveChildVertexFromHint: () => ({
        omittedVertexIdentity: null,
        kind: 'vertexIntentionallyOmitted' as const,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      }),
      resolvePrerequisiteByVertexId: () => ({ kind: 'missing' }),
    };
    const runner = new Constructor<G>({
      dagDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      name: 'DagTraversalStallError',
      diagnostics: { unresolvedPrerequisiteVertexIds: ['missing'] },
    });
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} ignore root work dependencies still honors completion prerequisites`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      rootWorkToWorkPrerequisitePolicy: 'ignore',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['ignored'],
            workWaitsForSubgraphCompletionOf: ['missing'],
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
      },
    })
      .registerVisitorForPhase(Order.ON_WORK_READY, (v) => {
        visited.push(v.getVertexData());
      })
      .createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toMatchObject({
      name: 'DagTraversalStallError',
      diagnostics: { unresolvedPrerequisiteVertexIds: ['missing'] },
    });
    expect(visited).toEqual([]);
  });

  test.each([
    { kind: 'missing' },
    { kind: 'unresolved' },
    { kind: 'vertexResolved', resolvedVertexInput: null },
    { kind: 'vertexResolved', resolvedVertexInput: {} },
    {
      kind: 'vertexResolved',
      resolvedVertexInput: { vertexContentInput: null },
    },
    { kind: 'vertexIntentionallyOmitted' },
    {
      omittedVertexIdentity: null,
      kind: 'vertexIntentionallyOmitted',
      satisfiesWorkAndSubgraphCompletionPrerequisites: false,
    },
    {
      omittedVertexIdentity: null,
      kind: 'vertexIntentionallyOmitted',
      satisfiesWorkAndSubgraphCompletionPrerequisites: undefined,
    },
    null,
    undefined,
  ])(
    `${Constructor.name} rejects invalid root and hint results (%j)`,
    async (invalid) => {
      for (const root of [true, false]) {
        const source = {
          resolveRootVertex: () =>
            root
              ? invalid
              : {
                  kind: 'vertexResolved' as const,
                  resolvedVertexInput: {
                    vertexContentInput: {
                      $vertexData: 'root',
                      $childDiscoveryHints: ['child'],
                    },
                  },
                },
          resolveChildVertexFromHint: () => invalid,
        } as unknown as DagDiscoverySource<G>;
        const runner = new Constructor<G>({
          dagDiscoverySource: source,
        }).createIndependentRunnerFromCurrentOptions();
        await expect(async () => {
          await runner.runUntilSuspendedOrTerminal();
        }).rejects.toBeInstanceOf(TypeError);
      }
    },
  );

  test.each([
    { rootWorkToWorkPrerequisitePolicy: false },
    { rootWorkToWorkPrerequisitePolicy: null },
    { rootWorkToWorkPrerequisitePolicy: 'unknown' },
    { undeclaredWorkToWorkPrerequisitePolicy: 'true' },
    { undeclaredWorkToWorkPrerequisitePolicy: null },
  ])(
    `${Constructor.name} rejects malformed dependency policies (%j)`,
    (options) => {
      expect(() =>
        new Constructor<G>({
          ...options,
          dagDiscoverySource: {
            resolveRootVertex: () => ({
              omittedVertexIdentity: null,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              kind: 'vertexIntentionallyOmitted' as const,
            }),
            resolveChildVertexFromHint: () => ({
              omittedVertexIdentity: null,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              kind: 'vertexIntentionallyOmitted' as const,
            }),
          },
        } as never).createIndependentRunnerFromCurrentOptions(),
      ).toThrow(TypeError);
    },
  );

  test(`${Constructor.name} explicit empty dependencies override parent inheritance`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      undeclaredWorkToWorkPrerequisitePolicy: 'waitForDiscoveringParentWork',
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
        resolveChildVertexFromHint: () => ({
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
    })
      .registerVisitorForPhase(Order.ON_WORK_READY, (v) => {
        visited.push(v.getVertexData());
        return {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
      })
      .createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(visited).toEqual(['root', 'child']);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([undefined, {}])(
    `${Constructor.name} canonical omissions retain an own explicit ID (%j)`,
    async (id) => {
      const runner = new Constructor<G>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexIntentionallyOmitted',
            omittedVertexIdentity: { vertexId: id },
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
          resolveChildVertexFromHint: () => ({
            omittedVertexIdentity: null,
            kind: 'vertexIntentionallyOmitted',
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(
        runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
      ).toBeNull();
      expect(
        runnerInternals(runner).resolvedGraphsContainer.store.getIdState(id),
      ).toEqual({
        kind: 'omitted',
      });
    },
  );

  test(`${Constructor.name} canonical hint omission satisfies W and C with the hint identity`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: ['join', 'omitted'],
            },
          },
        }),
        tryGetVertexIdentityFromHint: (id) => ({ vertexId: id }),
        resolveChildVertexFromHint: (id) =>
          id === 'omitted'
            ? {
                omittedVertexIdentity: null,
                kind: 'vertexIntentionallyOmitted',
                satisfiesWorkAndSubgraphCompletionPrerequisites: true,
              }
            : {
                kind: 'vertexResolved',
                resolvedVertexInput: {
                  workWaitsForWorkOf: ['omitted'],
                  workWaitsForSubgraphCompletionOf: ['omitted'],
                  vertexContentInput: {
                    $vertexData: id,
                    $childDiscoveryHints: [],
                  },
                },
              },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['root', 'join']);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('join')!
        .subgraphCompletionCommitted,
    ).toBe(true);
  });

  test(`${Constructor.name} synthetic catalog roots never gate explicit parent inheritance`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      sourceRootIsHiddenEntryHolder: true,
      discoveryTiming: 'completeBeforeAnyVisitor',
      undeclaredWorkToWorkPrerequisitePolicy: 'waitForDiscoveringParentWork',
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'catalog',
              $childDiscoveryHints: ['child'],
            },
            workWaitsForWorkOf: ['ignored'],
          },
        }),
        resolveChildVertexFromHint: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'child',
            vertexContentInput: {
              $vertexData: 'child',
              $childDiscoveryHints: [],
            },
          },
        }),
      },
    })
      .registerVisitorForPhase(Order.ON_WORK_READY, (v) => {
        visited.push(v.getVertexData());
        return {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
      })
      .createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(visited).toEqual(['child']);
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('child')!
        .unmetPrerequisiteVertexIds,
    ).toEqual([]);
  });

  test(`${Constructor.name} rejects a bare null lookup without satisfying its dependency`, async () => {
    const runner = new Constructor<G>({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            workWaitsForWorkOf: ['missing'],
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
        resolvePrerequisiteByVertexId: () => null as never,
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(async () => {
      await runner.runUntilSuspendedOrTerminal();
    }).rejects.toBeInstanceOf(TypeError);
    expect(
      runnerInternals(runner).resolvedGraphsContainer.store.getIdState(
        'missing',
      ),
    ).toBeUndefined();
  });
}

for (const Constructor of [
  DagTraversalBuilder<G>,
  AsyncDagTraversalBuilder<G>,
]) {
  test.each([
    {},
    { satisfiesWorkAndSubgraphCompletionPrerequisites: undefined },
    { satisfiesWorkAndSubgraphCompletionPrerequisites: false },
  ])(
    `${Constructor.name} rejects unacknowledged prerequisite omission %j`,
    async (acknowledgement) => {
      const runner = new Constructor({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: 'root',
              workWaitsForWorkOf: ['optional'],
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
          resolvePrerequisiteByVertexId: () => ({
            kind: 'vertexIntentionallyOmitted',
            ...acknowledgement,
          }),
        } as unknown as DagDiscoverySource<G>,
      }).createIndependentRunnerFromCurrentOptions();
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toThrow(
        'Omitted source result requires satisfiesWorkAndSubgraphCompletionPrerequisites: true',
      );
    },
  );
}
