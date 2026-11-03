import { inspectInternalDagState } from './internal-runner-fixtures';
import { makeDagInspection } from '../src/traversals/dag-traversal/lib/DagInspection';
import {
  type VertexDataAndChildHintTypes,
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
  TraversalVisitorCommandName as Command,
  materializeMultiEntryDagInputFromRecordCatalog,
  captureDagMilestoneSnapshot,
} from '../src';

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} explains seeded W separately from child-blocked C and stops at satisfied edges`, async () => {
    const runner = new Constructor({
      ...materializeMultiEntryDagInputFromRecordCatalog(
        [
          {
            id: 'bundle',
            children: ['child'],
            work: [] as string[],
            complete: [] as string[],
          },
          { id: 'child', children: [], work: [], complete: [] },
          {
            id: 'review',
            children: [],
            work: ['bundle'],
            complete: ['bundle'],
          },
        ],
        {
          selectVertexId: (v) => v.id,
          selectStructuralChildVertexIds: (v) => v.children,
          selectWorkPrerequisiteVertexIds: (v) => v.work,
          selectSubgraphCompletionPrerequisiteVertexIds: (v) => v.complete,
        },
      ),
      acceptedCompletedWorkVertexIds: new Set(['bundle']),
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.discoverValidateAndFreezeTopology();
    await runner.runUntilSuspendedOrTerminal();
    const snapshot = captureDagMilestoneSnapshot(runner);
    expect(
      snapshot.explainMilestone({
        vertexId: 'bundle',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: true, blockers: [] });
    const result = snapshot.explainMilestone({
      vertexId: 'review',
      milestone: 'workCompletion',
    });
    expect(result).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      discoveryComplete: true,
      blockers: [
        {
          kind: 'unmetMilestoneConstraint',
          waitingMilestone: { vertexId: 'review', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'bundle',
            milestone: 'subgraphCompletion',
          },
          reason: 'subgraphCompletionDependency',
          prerequisiteStatus: {
            kind: 'live',
            workState: 'workCompletionCommitted',
            milestoneSatisfied: false,
          },
        },
        {
          kind: 'unmetMilestoneConstraint',
          waitingMilestone: {
            vertexId: 'bundle',
            milestone: 'subgraphCompletion',
          },
          prerequisiteMilestone: {
            vertexId: 'child',
            milestone: 'subgraphCompletion',
          },
          reason: 'structuralChild',
        },
        {
          kind: 'unmetMilestoneConstraint',
          waitingMilestone: {
            vertexId: 'child',
            milestone: 'subgraphCompletion',
          },
          prerequisiteMilestone: {
            vertexId: 'child',
            milestone: 'workCompletion',
          },
          reason: 'ownWork',
        },
        {
          kind: 'workCompletionUncommitted',
          targetMilestone: { vertexId: 'child', milestone: 'workCompletion' },
          workState: 'workCompletionDeferred',
        },
      ],
    });
    const child = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      child.vertexId,
      { kind: 'workCompleted' },
      child.settlementToken,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'bundle',
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: true, blockers: [] });
    expect(
      snapshot.explainMilestone({
        vertexId: 'review',
        milestone: 'workCompletion',
      }),
    ).toEqual(result);
    if (result.kind !== 'live' || result.progress === null)
      throw new Error('Expected live result');
    (result.progress.unmetPrerequisiteVertexIds as string[]).push('changed');
    result.targetMilestone.vertexId = 'changed';
    const edge = result.blockers[0]!;
    if (
      edge.kind !== 'unmetMilestoneConstraint' ||
      edge.prerequisiteStatus.kind !== 'live'
    )
      throw new Error('Expected constraint');
    edge.prerequisiteMilestone.vertexId = 'changed';
    edge.prerequisiteStatus.workState = 'waitingForPrerequisiteMilestones';
    (result.blockers as unknown[]).pop();
    expect(
      snapshot.explainMilestone({
        vertexId: 'review',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({
      targetMilestone: { vertexId: 'review' },
      progress: { unmetPrerequisiteVertexIds: ['bundle'] },
      blockers: [
        {
          prerequisiteMilestone: { vertexId: 'bundle' },
          prerequisiteStatus: { workState: 'workCompletionCommitted' },
        },
        {},
        {},
        { kind: 'workCompletionUncommitted' },
      ],
    });
  });

  test(`${Constructor.name} distinguishes ready work and pending completion before callback commit`, async () => {
    const traversal = new Constructor(
      materializeMultiEntryDagInputFromRecordCatalog([{ id: 'leaf' }], {
        selectVertexId: (v) => v.id,
      }),
    );
    let pending: unknown;
    traversal.registerVisitorCallbackForPhase(
      Order.ON_SUBGRAPH_COMPLETION_READY,
      () => {
        pending = captureDagMilestoneSnapshot(runner).explainMilestone({
          vertexId: 'leaf',
          milestone: 'subgraphCompletion',
        });
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.discoverValidateAndFreezeTopology();
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'leaf',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      blockers: [
        {
          kind: 'workCompletionUncommitted',
          workState: 'readyForWorkVisitorAdmission',
        },
      ],
    });
    await runner.runUntilSuspendedOrTerminal();
    expect(pending).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      blockers: [
        {
          kind: 'subgraphCompletionCommitPending',
          targetMilestone: {
            vertexId: 'leaf',
            milestone: 'subgraphCompletion',
          },
        },
      ],
    });
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'leaf',
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: true, blockers: [] });
  });

  test(`${Constructor.name} distinguishes omitted deleted and unknown targets`, async () => {
    const omitted = new Constructor({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexIntentionallyOmitted' as const,
          omittedVertexIdentity: { vertexId: undefined },
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await omitted.runUntilSuspendedOrTerminal();
    expect(
      captureDagMilestoneSnapshot(omitted).explainMilestone({
        vertexId: undefined,
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({
      kind: 'omitted',
      targetMilestone: { vertexId: undefined, milestone: 'subgraphCompletion' },
      milestoneSatisfied: true,
      progress: null,
      blockers: [],
      discoveryComplete: true,
    });
    const traversal = new Constructor(
      materializeMultiEntryDagInputFromRecordCatalog([{ id: 'deleted' }], {
        selectVertexId: (v) => v.id,
      }),
    );
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            Command.DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'deleted',
        milestone: 'workCompletion',
      }),
    ).toEqual({
      kind: 'deleted',
      targetMilestone: { vertexId: 'deleted', milestone: 'workCompletion' },
      discoveryComplete: true,
    });
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'unknown',
        milestone: 'workCompletion',
      }),
    ).toEqual({
      kind: 'unresolved',
      targetMilestone: { vertexId: 'unknown', milestone: 'workCompletion' },
      discoveryComplete: true,
    });
  });
}

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} marks only locally open completion discovery`, async () => {
    let calls = 0;
    const traversal = new Constructor<
      VertexDataAndChildHintTypes<string, string>
    >({
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
        resolveChildHint: (hint: string) => {
          calls++;
          return {
            kind: 'vertexResolved' as const,
            resolvedVertexInput: {
              vertexId: hint,
              vertexContentInput: {
                $vertexData: hint,
                $childDiscoveryHints: [],
              },
            },
          };
        },
      },
    });
    traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const initial = captureDagMilestoneSnapshot(runner);
    expect(
      initial.explainMilestone({
        vertexId: 'root',
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({
      kind: 'unresolved',
      targetMilestone: { vertexId: 'root', milestone: 'subgraphCompletion' },
      discoveryComplete: false,
    });
    await runner.runUntilSuspendedOrTerminal();
    const snapshot = captureDagMilestoneSnapshot(runner);
    expect(
      snapshot.explainMilestone({
        vertexId: 'root',
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      discoveryComplete: false,
      blockers: [
        { kind: 'unmetMilestoneConstraint', reason: 'ownWork' },
        {
          kind: 'childDiscoveryNotClosed',
          targetMilestone: {
            vertexId: 'root',
            milestone: 'subgraphCompletion',
          },
        },
        {
          kind: 'workCompletionUncommitted',
          workState: 'workVisitorChainAdmitted',
        },
      ],
    });
    expect(
      snapshot.explainMilestone({
        vertexId: 'root',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      blockers: [
        {
          kind: 'workCompletionUncommitted',
          workState: 'workVisitorChainAdmitted',
        },
      ],
    });
    expect(calls).toBe(0);
  });

  test(`${Constructor.name} reports unresolved constraints without treating omissions as blockers`, async () => {
    const runner = new Constructor({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: 'root',
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [],
            },
            workWaitsForWorkOf: ['omitted', 'unresolved'],
          },
        }),
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
        resolvePrerequisiteByVertexId: (id: unknown) =>
          id === 'omitted'
            ? {
                kind: 'vertexIntentionallyOmitted' as const,
                omittedVertexIdentity: { vertexId: id },
                satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              }
            : { kind: 'missing' as const },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(
      (async () => runner.discoverValidateAndFreezeTopology())(),
    ).rejects.toBeDefined();
    const inspection = captureDagMilestoneSnapshot(runner);
    expect(
      inspection.explainMilestone({
        vertexId: 'root',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      blockers: [
        {
          kind: 'unmetMilestoneConstraint',
          waitingMilestone: { vertexId: 'root', milestone: 'workCompletion' },
          prerequisiteMilestone: {
            vertexId: 'unresolved',
            milestone: 'workCompletion',
          },
          reason: 'workDependency',
          waiterStatus: {
            kind: 'live',
            workState: 'waitingForPrerequisiteMilestones',
            milestoneSatisfied: false,
          },
          prerequisiteStatus: { kind: 'unresolved' },
        },
      ],
    });
    expect(
      inspection.explainMilestone({
        vertexId: 'omitted',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({
      kind: 'omitted',
      milestoneSatisfied: true,
      progress: null,
      blockers: [],
    });
    expect(
      inspection.explainMilestone({
        vertexId: 'unresolved',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({ kind: 'unresolved' });
  });

  test(`${Constructor.name} bounds cyclic explanations`, async () => {
    const cyclic = new Constructor(
      materializeMultiEntryDagInputFromRecordCatalog(
        [
          { id: 'a', work: ['b'] },
          { id: 'b', work: ['a'] },
        ],
        {
          selectVertexId: (v) => v.id,
          selectWorkPrerequisiteVertexIds: (v) => v.work,
        },
      ),
    ).createIndependentRunnerFromCurrentOptions();
    await expect(
      (async () => cyclic.discoverValidateAndFreezeTopology())(),
    ).rejects.toBeDefined();
    expect(
      captureDagMilestoneSnapshot(cyclic).explainMilestone({
        vertexId: 'a',
        milestone: 'workCompletion',
      }),
    ).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      blockers: [
        {
          kind: 'unmetMilestoneConstraint',
          waitingMilestone: { vertexId: 'a' },
          prerequisiteMilestone: { vertexId: 'b' },
        },
        {
          kind: 'unmetMilestoneConstraint',
          waitingMilestone: { vertexId: 'b' },
          prerequisiteMilestone: { vertexId: 'a' },
        },
      ],
    });
  });
}

test('explanations walk deep unfinished work chains iteratively', () => {
  const records = Array.from({ length: 12000 }, (_, id) => ({
    id,
    work: id === 11999 ? [] : [id + 1],
  }));
  const runner = new DagTraversalBuilder({
    ...materializeMultiEntryDagInputFromRecordCatalog(records, {
      selectVertexId: (v) => v.id,
      selectWorkPrerequisiteVertexIds: (v) => v.work,
    }),
    workCompletionPolicy: 'requireExternalWorkSettlement',
  }).createIndependentRunnerFromCurrentOptions();
  runner.discoverValidateAndFreezeTopology();
  const result = captureDagMilestoneSnapshot(runner).explainMilestone({
    vertexId: 0,
    milestone: 'workCompletion',
  });
  if (result.kind !== 'live') throw new Error('Expected known work');
  expect(result.blockers).toHaveLength(12000);
  expect(result.blockers[11999]).toEqual({
    kind: 'workCompletionUncommitted',
    targetMilestone: { vertexId: 11999, milestone: 'workCompletion' },
    workState: 'readyForWorkVisitorAdmission',
  });
});

test('captured deleted endpoints remain explicit unsatisfied constraints', () => {
  const runner = new DagTraversalBuilder({
    ...materializeMultiEntryDagInputFromRecordCatalog([{ id: 'a' }], {
      selectVertexId: (v) => v.id,
    }),
    workCompletionPolicy: 'requireExternalWorkSettlement',
  }).createIndependentRunnerFromCurrentOptions();
  runner.discoverValidateAndFreezeTopology();
  const inspection = makeDagInspection({
    state: {
      ...inspectInternalDagState(runner),
      identityStates: [
        { vertexId: 'a', kind: 'live' },
        { vertexId: 'b', kind: 'deleted' },
      ],
    },
    captureProgressSnapshot: runner.captureProgressSnapshot(),
    edges: [
      {
        waitingMilestone: { vertexId: 'a', milestone: 'workCompletion' },
        prerequisiteMilestone: { vertexId: 'b', milestone: 'workCompletion' },
        reason: 'workDependency',
      },
    ],
  });
  expect(
    inspection.explainMilestone({ vertexId: 'a', milestone: 'workCompletion' }),
  ).toMatchObject({
    kind: 'live',
    milestoneSatisfied: false,
    blockers: [
      {
        kind: 'unmetMilestoneConstraint',
        prerequisiteStatus: { kind: 'deleted' },
      },
    ],
  });
});

test('a closed vertex does not inherit global discovery incompleteness from another pending source call', async () => {
  let release!: () => void;
  let pending!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const admitted = new Promise<void>((resolve) => {
    pending = resolve;
  });
  const runner = new AsyncDagTraversalBuilder<
    VertexDataAndChildHintTypes<string, string>
  >({
    maxConcurrentCallbackInvocations: 1,
    dagDiscoverySource: {
      resolveRootVertex: async () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['leaf', 'pending'],
          },
        },
      }),
      resolveChildHint: async (hint: string) => {
        if (hint === 'pending') {
          pending();
          await gate;
        }
        return {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: hint,
            vertexContentInput: { $vertexData: hint, $childDiscoveryHints: [] },
          },
        };
      },
    },
    workCompletionPolicy: 'requireExternalWorkSettlement',
  }).createIndependentRunnerFromCurrentOptions();
  const running = runner.runUntilSuspendedOrTerminal();
  await admitted;
  const inspection = captureDagMilestoneSnapshot(runner);
  expect(
    inspection.explainMilestone({
      vertexId: 'leaf',
      milestone: 'subgraphCompletion',
    }),
  ).toMatchObject({
    kind: 'live',
    milestoneSatisfied: false,
    discoveryComplete: false,
    blockers: [
      { kind: 'unmetMilestoneConstraint', reason: 'ownWork' },
      {
        kind: 'workCompletionUncommitted',
        targetMilestone: { vertexId: 'leaf', milestone: 'workCompletion' },
      },
    ],
  });
  release();
  await running;
  expect(
    inspection.explainMilestone({
      vertexId: 'leaf',
      milestone: 'subgraphCompletion',
    }).discoveryComplete,
  ).toBe(false);
});

test('explanations retain SameValueZero IDs without freezing caller objects', () => {
  const object = { label: 'same' };
  const otherObject = { label: 'same' };
  const symbol = Symbol('task');
  const ids: unknown[] = [object, symbol, NaN, -0, undefined, null];
  const runner = new DagTraversalBuilder({
    ...materializeMultiEntryDagInputFromRecordCatalog(
      ids.map((id) => ({ id })),
      { selectVertexId: (v) => v.id },
    ),
    workCompletionPolicy: 'requireExternalWorkSettlement',
  }).createIndependentRunnerFromCurrentOptions();
  runner.discoverValidateAndFreezeTopology();
  const inspection = captureDagMilestoneSnapshot(runner);
  for (const id of ids) {
    const result = inspection.explainMilestone({
      vertexId: id,
      milestone: 'workCompletion',
    });
    expect(result).toMatchObject({
      kind: 'live',
      milestoneSatisfied: false,
      blockers: [
        {
          kind: 'workCompletionUncommitted',
          workState: 'readyForWorkVisitorAdmission',
        },
      ],
    });
    expect(result.targetMilestone.vertexId).toBe(id);
  }
  expect(
    inspection.explainMilestone({ vertexId: +0, milestone: 'workCompletion' })
      .kind,
  ).toBe('live');
  expect(
    inspection.explainMilestone({
      vertexId: otherObject,
      milestone: 'workCompletion',
    }).kind,
  ).toBe('unresolved');
  expect(Object.isFrozen(object)).toBe(false);
});
