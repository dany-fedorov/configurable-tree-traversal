import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as D,
  TraversalVisitorCommandName as C,
} from '../src';
import { traversalInternals } from './internal-runner-fixtures';
type T = { VertexData: string; ChildHint: string };
const dagDiscoverySource = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'root',
      vertexContentInput: {
        $vertexData: 'root',
        $childDiscoveryHints: [] as string[],
      },
    },
  }),
  resolveChildVertexFromHint: () => ({
    omittedVertexIdentity: null,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};
for (const Ctor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Ctor.name}: flat priority order precedes batching mode`, async () => {
    const seen: string[] = [];
    const t = new (Ctor as typeof DagTraversalBuilder)<T>({
      dagDiscoverySource,
    });
    t.registerVisitorForPhase(
      D.ON_WORK_READY,
      () => {
        seen.push('high');
      },
      {
        descendingExecutionPriorityWithinGroup: 1000,
        visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
      },
    );
    t.registerVisitorForPhase(
      D.ON_WORK_READY,
      () => {
        seen.push('low');
      },
      {
        descendingExecutionPriorityWithinGroup: 1,
        visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
      },
    );
    await t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['high', 'low']);
  });
  test(`${Ctor.name}: groups preserve boundaries, committed state and list/set append order`, async () => {
    const seen: unknown[] = [];
    const t = new (Ctor as typeof DagTraversalBuilder)<T>({
      dagDiscoverySource,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitors: [
                () => ({
                  commands: [
                    {
                      commandName: C.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
                      commandArguments: {
                        phaseChainState: 'committed',
                      },
                    },
                  ],
                }),
              ],
            },
            {
              visitorCommandCommitTiming:
                'afterContiguousVisitorBatch' as const,
              visitors: [
                {
                  descendingExecutionPriorityWithinGroup: 1,
                  visitor: (_v, o) => {
                    seen.push(['low', o.currentVertexPhaseChainState]);
                  },
                },
                {
                  descendingExecutionPriorityWithinGroup: 2,
                  visitor: (_v, o) => {
                    seen.push(['high', o.currentVertexPhaseChainState]);
                    return {
                      commands: [
                        {
                          commandName: C.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
                          commandArguments: {
                            phaseChainState: 'buffered',
                          },
                        },
                      ],
                    };
                  },
                },
              ],
            },
          ],
        },
      },
    });
    t.replaceVisitorDefinitionsForPhase(
      D.ON_WORK_READY,
      t.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY),
    );
    t.registerVisitorForPhase(
      D.ON_WORK_READY,
      (_v, o) => {
        seen.push(['implicit', o.currentVertexPhaseChainState]);
      },
      { descendingExecutionPriorityWithinGroup: 1000 },
    );
    t.appendVisitorGroupForPhase(D.ON_WORK_READY, {
      visitors: [
        () => {
          seen.push('explicit');
        },
      ],
    });
    t.registerVisitorForPhase(
      D.ON_WORK_READY,
      () => {
        seen.push('tail');
      },
      { descendingExecutionPriorityWithinGroup: 9999 },
    );
    t.patchOptionsForFutureRunners({
      visitors: {
        [D.ON_WORK_READY]: t.getDetachedVisitorRegistrationRecordsForPhase(
          D.ON_WORK_READY,
        ),
      },
    });
    await t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual([
      ['high', 'committed'],
      ['low', 'committed'],
      ['implicit', 'buffered'],
      'explicit',
      'tail',
    ]);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  // Sync callbacks work on both runtimes. Separate compile fixtures cover async callback signatures.
  const Ctor = Constructor as typeof DagTraversalBuilder;
  test(`${Constructor.name}: flat afterGroup entries commit in contiguous sorted batches`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({ dagDiscoverySource });
    const add = (
      descendingExecutionPriorityWithinGroup: number,
      mode: 'afterEachVisitorCallback' | 'afterContiguousVisitorBatch',
      next: string,
    ) =>
      t.registerVisitorForPhase(
        D.ON_WORK_READY,
        (v) => {
          seen.push(v.getVertexData());
          return {
            commands: [
              {
                commandName: C.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: { replacementVertexData: next },
              },
            ],
          };
        },
        {
          descendingExecutionPriorityWithinGroup:
            descendingExecutionPriorityWithinGroup,
          visitorCommandCommitTiming: mode,
        },
      );
    add(1, 'afterContiguousVisitorBatch', 'last');
    add(4, 'afterContiguousVisitorBatch', 'first');
    add(3, 'afterContiguousVisitorBatch', 'second');
    add(2, 'afterEachVisitorCallback', 'third');
    await t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['root', 'root', 'second', 'third']);
  });
  test(`${Constructor.name}: stable equal priorities ignore deprecated caller indexes`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      dagDiscoverySource,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitors: [
                {
                  visitor: () => {
                    seen.push('first');
                  },
                  descendingExecutionPriorityWithinGroup: 1,
                },
                {
                  visitor: () => {
                    seen.push('second');
                  },
                  descendingExecutionPriorityWithinGroup: 1,
                },
              ],
            },
            {
              visitors: [
                {
                  visitor: () => {
                    seen.push('third');
                  },
                  descendingExecutionPriorityWithinGroup: 9999,
                },
              ],
            },
          ],
        },
      },
    });
    t.registerVisitorForPhase(D.ON_WORK_READY, () => {
      seen.push('fourth');
    });
    t.registerVisitorForPhase(D.ON_WORK_READY, () => {
      seen.push('fifth');
    });
    await t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['first', 'second', 'third', 'fourth', 'fifth']);
    t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, [
      {
        visitor: () => {
          seen.push('legacy-first');
        },
        descendingExecutionPriorityWithinGroup: 1,
      },
      {
        visitor: () => {
          seen.push('legacy-second');
        },
        descendingExecutionPriorityWithinGroup: 1,
      },
    ]);
    await t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen.slice(-2)).toEqual(['legacy-first', 'legacy-second']);
  });
  test(`${Constructor.name}: explicit deferral rolls back only its current batch`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      dagDiscoverySource,
      workCompletionPolicy: 'requireExternalWorkSettlement',
    });
    t.appendVisitorGroupForPhase(D.ON_WORK_READY, {
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
      visitors: [
        () => ({
          commands: [
            {
              commandName: C.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'committed' },
            },
          ],
        }),
      ],
    });
    t.appendVisitorGroupForPhase(D.ON_WORK_READY, {
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
      visitors: [
        (v) => {
          seen.push(v.getVertexData());
          return {
            commands: [
              {
                commandName: C.REPLACE_CURRENT_VERTEX_DATA,
                commandArguments: { replacementVertexData: 'discarded' },
              },
            ],
          };
        },
        () => ({
          commands: [
            { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
          ],
        }),
      ],
    });
    t.appendVisitorGroupForPhase(D.ON_WORK_READY, {
      visitors: [
        () => {
          seen.push('must skip');
        },
      ],
    });
    const runner = t.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['committed']);
    expect(
      runner
        .getLiveResolvedGraphView()
        .getDesignatedRootHandleOrNull()!
        .getCurrentVertexView()
        .getVertexData(),
    ).toBe('committed');
    const generation = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('root')!.settlementToken!;
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().progressByVertexId.get('root')!
        .settlementToken,
    ).toBe(generation);
    runner.settleDeferredWork('root', { kind: 'workCompleted' }, generation);
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['root']);
    expect(seen).toEqual(['committed']);
  });
  test(`${Constructor.name}: normally completed groups commit before external settlement`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      dagDiscoverySource,
      workCompletionPolicy: 'requireExternalWorkSettlement',
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitorCommandCommitTiming:
                'afterContiguousVisitorBatch' as const,
              visitors: [
                () => ({
                  commands: [
                    {
                      commandName: C.REPLACE_CURRENT_VERTEX_DATA,
                      commandArguments: { replacementVertexData: 'committed' },
                    },
                  ],
                }),
              ],
            },
            {
              visitors: [
                (v) => {
                  seen.push(v.getVertexData());
                },
              ],
            },
          ],
        },
      },
    });
    const runner = t.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['committed']);
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([]);
    expect(runner.getTraversalStopReason()).toBe('awaitingSettlement');
    runner.settleDeferredWork(
      'root',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().progressByVertexId.get('root')!
        .settlementToken!,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(runner.getTraversalStopReason()).toBe('finished');
  });
  test(`${Constructor.name}: halt resumes the remaining groups after committing its batch`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      dagDiscoverySource,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitorCommandCommitTiming:
                'afterContiguousVisitorBatch' as const,
              visitors: [
                () => ({
                  commands: [
                    {
                      commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
                    },
                  ],
                }),
                () => ({
                  commands: [
                    {
                      commandName: C.REPLACE_CURRENT_VERTEX_DATA,
                      commandArguments: { replacementVertexData: 'after-halt' },
                    },
                  ],
                }),
              ],
            },
            {
              visitors: [
                (v) => {
                  seen.push(v.getVertexData());
                },
              ],
            },
          ],
        },
      },
    });
    const runner = t.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual([]);
    expect(runner.getTraversalStopReason()).toBe('paused');
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['after-halt']);
    expect(runner.getTraversalStopReason()).toBe('finished');
  });
  test(`${Constructor.name}: deletion ends the chain before later groups`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      dagDiscoverySource,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitorCommandCommitTiming:
                'afterContiguousVisitorBatch' as const,
              visitors: [
                () => ({
                  commands: [
                    {
                      commandName:
                        C.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
                    },
                  ],
                }),
                () => {
                  seen.push('same batch');
                },
              ],
            },
            {
              visitors: [
                () => {
                  seen.push('must skip');
                },
              ],
            },
          ],
        },
      },
    });
    const runner = t.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['same batch']);
    expect(
      runner.getLiveResolvedGraphView().getDesignatedRootHandleOrNull(),
    ).toBeNull();
  });
  test(`${Constructor.name}: invalid group replacements are atomic and normalized policy remains owned by the group`, async () => {
    const seen: string[] = [];
    const t = new Ctor<T>({
      dagDiscoverySource,
      visitors: {
        [D.ON_WORK_READY]: {
          groups: [
            {
              visitorCommandCommitTiming:
                'afterContiguousVisitorBatch' as const,
              visitors: [
                () => {
                  seen.push('original');
                },
              ],
            },
          ],
        },
      },
    });
    const original = t.getDetachedVisitorRegistrationRecordsForPhase(
      D.ON_WORK_READY,
    );
    const malformed: unknown[] = [
      null,
      7,
      {},
      { visitor: 7 },
      { groups: null },
      { groups: [null] },
      { groups: [7] },
      { groups: [{}] },
      { groups: [{ visitors: [null] }] },
      {
        groups: [
          {
            visitors: [
              {
                visitor: () => undefined,
                visitorCommandCommitTiming:
                  'afterContiguousVisitorBatch' as const,
              },
            ],
          },
        ],
      },
      {
        groups: [
          {
            visitors: [
              {
                visitor: () => undefined,
                visitorCommandCommitTiming: undefined,
              },
            ],
          },
        ],
      },
    ];
    for (const input of malformed) {
      expect(() =>
        t.patchOptionsForFutureRunners({
          workCompletionPolicy: 'requireExternalWorkSettlement',
          visitors: { [D.ON_WORK_READY]: input as never },
        }),
      ).toThrow(TypeError);
      expect(
        t.getDetachedVisitorRegistrationRecordsForPhase(D.ON_WORK_READY),
      ).toEqual(original);
      expect(traversalInternals(t).icfg.workCompletionPolicy).toBeUndefined();
    }
    expect(() =>
      t.appendVisitorGroupForPhase(D.ON_WORK_READY, {
        visitors: [original[0]!],
      } as never),
    ).toThrow(/own/);
    const changed = original.map((record) => ({
      ...record,
      visitorCommandCommitTiming: 'afterEachVisitorCallback' as const,
    }));
    expect(() =>
      t.replaceVisitorDefinitionsForPhase(D.ON_WORK_READY, changed),
    ).toThrow(/conflicting/);
    expect(Object.isFrozen(original[0]!.visitorGroup)).toBe(true);
    await t
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(seen).toEqual(['original']);
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each(['definition', 'group'] as const)(
    `${Constructor.name}: captures a %s callback getter once before registration`,
    async (shape) => {
      let reads = 0;
      const calls: string[] = [];
      const member = {
        get visitor() {
          reads++;
          return reads === 1
            ? () => {
                calls.push('captured');
              }
            : null;
        },
      };
      const input =
        shape === 'definition'
          ? member
          : {
              groups: [
                {
                  visitorCommandCommitTiming:
                    'afterContiguousVisitorBatch' as const,
                  visitors: [member],
                },
              ],
            };
      const t = new Constructor<T>({ dagDiscoverySource });
      t.patchOptionsForFutureRunners({
        visitors: { [D.ON_WORK_READY]: input as never },
      });
      expect(reads).toBe(1);
      await t
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
      expect(calls).toEqual(['captured']);
      expect(reads).toBe(1);
    },
  );
}
