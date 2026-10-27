import { inspectInternalDagState } from './internal-runner-fixtures';
import { makeDagInspection } from '../src/traversals/dag-traversal/lib/DagInspection';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as Order,
  TraversalVisitorCommandName as Command,
  materializeDagInputFromRecords,
  inspectDagMilestones,
} from '../src';

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} explains seeded W separately from child-blocked C and stops at satisfied edges`, async () => {
    const runner = new Constructor({
      ...materializeDagInputFromRecords(
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
          id: (v) => v.id,
          children: (v) => v.children,
          dependsOnWork: (v) => v.work,
          dependsOnSubgraphCompletion: (v) => v.complete,
        },
      ),
      completedWork: new Set(['bundle']),
      workCompletion: 'externalSettlement',
    }).createRunner();
    await runner.prepare();
    await runner.run();
    const snapshot = inspectDagMilestones(runner);
    expect(
      snapshot.explain({ vertexId: 'bundle', milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: true, blockers: [] });
    const result = snapshot.explain({ vertexId: 'review', milestone: 'work' });
    expect(result).toMatchObject({
      kind: 'known',
      satisfied: false,
      discoveryComplete: true,
      blockers: [
        {
          kind: 'constraint',
          waiter: { vertexId: 'review', milestone: 'work' },
          prerequisite: { vertexId: 'bundle', milestone: 'subgraphCompletion' },
          reason: 'subgraphCompletionDependency',
          prerequisiteStatus: {
            kind: 'live',
            work: 'completed',
            satisfied: false,
          },
        },
        {
          kind: 'constraint',
          waiter: { vertexId: 'bundle', milestone: 'subgraphCompletion' },
          prerequisite: { vertexId: 'child', milestone: 'subgraphCompletion' },
          reason: 'structuralChild',
        },
        {
          kind: 'constraint',
          waiter: { vertexId: 'child', milestone: 'subgraphCompletion' },
          prerequisite: { vertexId: 'child', milestone: 'work' },
          reason: 'ownWork',
        },
        {
          kind: 'unfinishedWork',
          target: { vertexId: 'child', milestone: 'work' },
          work: 'deferred',
        },
      ],
    });
    const child = runner.summary().awaitingSettlement[0]!;
    runner.settle(child.vertexId, { kind: 'workCompleted' }, child.generation);
    await runner.run();
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'bundle',
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({ kind: 'known', satisfied: true, blockers: [] });
    expect(snapshot.explain({ vertexId: 'review', milestone: 'work' })).toEqual(
      result,
    );
    if (result.kind !== 'known' || result.progress === null)
      throw new Error('Expected live result');
    (result.progress.unmetPrerequisiteIds as string[]).push('changed');
    result.target.vertexId = 'changed';
    const edge = result.blockers[0]!;
    if (edge.kind !== 'constraint' || edge.prerequisiteStatus.kind !== 'live')
      throw new Error('Expected constraint');
    edge.prerequisite.vertexId = 'changed';
    edge.prerequisiteStatus.work = 'pending';
    (result.blockers as unknown[]).pop();
    expect(
      snapshot.explain({ vertexId: 'review', milestone: 'work' }),
    ).toMatchObject({
      target: { vertexId: 'review' },
      progress: { unmetPrerequisiteIds: ['bundle'] },
      blockers: [
        {
          prerequisite: { vertexId: 'bundle' },
          prerequisiteStatus: { work: 'completed' },
        },
        {},
        {},
        { kind: 'unfinishedWork' },
      ],
    });
  });

  test(`${Constructor.name} distinguishes ready work and pending completion before callback commit`, async () => {
    const traversal = new Constructor(
      materializeDagInputFromRecords([{ id: 'leaf' }], { id: (v) => v.id }),
    );
    let pending: unknown;
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, () => {
      pending = inspectDagMilestones(runner).explain({
        vertexId: 'leaf',
        milestone: 'subgraphCompletion',
      });
    });
    const runner = traversal.createRunner();
    await runner.prepare();
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'leaf',
        milestone: 'work',
      }),
    ).toMatchObject({
      kind: 'known',
      satisfied: false,
      blockers: [{ kind: 'unfinishedWork', work: 'ready' }],
    });
    await runner.run();
    expect(pending).toMatchObject({
      kind: 'known',
      satisfied: false,
      blockers: [
        {
          kind: 'completionPending',
          target: { vertexId: 'leaf', milestone: 'subgraphCompletion' },
        },
      ],
    });
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'leaf',
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({ kind: 'known', satisfied: true, blockers: [] });
  });

  test(`${Constructor.name} distinguishes omitted deleted and unknown targets`, async () => {
    const omitted = new Constructor({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'omitted' as const,
          vertexId: undefined,
          satisfiesDependencies: true as const,
        }),
        resolveChild: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
      },
    }).createRunner();
    await omitted.run();
    expect(
      inspectDagMilestones(omitted).explain({
        vertexId: undefined,
        milestone: 'subgraphCompletion',
      }),
    ).toEqual({
      kind: 'known',
      target: { vertexId: undefined, milestone: 'subgraphCompletion' },
      satisfied: true,
      progress: null,
      blockers: [],
      discoveryComplete: true,
    });
    const traversal = new Constructor(
      materializeDagInputFromRecords([{ id: 'deleted' }], { id: (v) => v.id }),
    );
    traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
      commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }],
    }));
    const runner = traversal.createRunner();
    await runner.run();
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'deleted',
        milestone: 'work',
      }),
    ).toEqual({
      kind: 'deleted',
      target: { vertexId: 'deleted', milestone: 'work' },
      discoveryComplete: true,
    });
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'unknown',
        milestone: 'work',
      }),
    ).toEqual({
      kind: 'unknown',
      target: { vertexId: 'unknown', milestone: 'work' },
      discoveryComplete: true,
    });
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} marks only locally open completion discovery`, async () => {
    let calls = 0;
    const traversal = new Constructor({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['child'] },
          },
        }),
        resolveChild: (hint: string) => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: hint,
              vertexContent: { $data: hint, $childHints: [] },
            },
          };
        },
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
      commands: [{ commandName: Command.PAUSE_TRAVERSAL }],
    }));
    const runner = traversal.createRunner();
    const initial = inspectDagMilestones(runner);
    expect(
      initial.explain({ vertexId: 'root', milestone: 'subgraphCompletion' }),
    ).toEqual({
      kind: 'unknown',
      target: { vertexId: 'root', milestone: 'subgraphCompletion' },
      discoveryComplete: false,
    });
    await runner.run();
    const snapshot = inspectDagMilestones(runner);
    expect(
      snapshot.explain({ vertexId: 'root', milestone: 'subgraphCompletion' }),
    ).toMatchObject({
      kind: 'known',
      satisfied: false,
      discoveryComplete: false,
      blockers: [
        { kind: 'constraint', reason: 'ownWork' },
        {
          kind: 'discoveryOpen',
          target: { vertexId: 'root', milestone: 'subgraphCompletion' },
        },
        { kind: 'unfinishedWork', work: 'visiting' },
      ],
    });
    expect(
      snapshot.explain({ vertexId: 'root', milestone: 'work' }),
    ).toMatchObject({
      kind: 'known',
      satisfied: false,
      blockers: [{ kind: 'unfinishedWork', work: 'visiting' }],
    });
    expect(calls).toBe(0);
  });

  test(`${Constructor.name} reports unresolved constraints without treating omissions as blockers`, async () => {
    const runner = new Constructor({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: [] },
            dependsOnWork: ['omitted', 'unresolved'],
          },
        }),
        resolveChild: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: (id: unknown) =>
          id === 'omitted'
            ? {
                kind: 'omitted' as const,
                vertexId: id,
                satisfiesDependencies: true as const,
              }
            : { kind: 'missing' as const },
      },
    }).createRunner();
    await expect((async () => runner.prepare())()).rejects.toBeDefined();
    const inspection = inspectDagMilestones(runner);
    expect(
      inspection.explain({ vertexId: 'root', milestone: 'work' }),
    ).toMatchObject({
      kind: 'known',
      satisfied: false,
      blockers: [
        {
          kind: 'constraint',
          waiter: { vertexId: 'root', milestone: 'work' },
          prerequisite: { vertexId: 'unresolved', milestone: 'work' },
          reason: 'workDependency',
          waiterStatus: { kind: 'live', work: 'pending', satisfied: false },
          prerequisiteStatus: { kind: 'unresolved' },
        },
      ],
    });
    expect(
      inspection.explain({ vertexId: 'omitted', milestone: 'work' }),
    ).toMatchObject({
      kind: 'known',
      satisfied: true,
      progress: null,
      blockers: [],
    });
    expect(
      inspection.explain({ vertexId: 'unresolved', milestone: 'work' }),
    ).toMatchObject({ kind: 'unknown' });
  });

  test(`${Constructor.name} bounds cyclic explanations`, async () => {
    const cyclic = new Constructor(
      materializeDagInputFromRecords(
        [
          { id: 'a', work: ['b'] },
          { id: 'b', work: ['a'] },
        ],
        { id: (v) => v.id, dependsOnWork: (v) => v.work },
      ),
    ).createRunner();
    await expect((async () => cyclic.prepare())()).rejects.toBeDefined();
    expect(
      inspectDagMilestones(cyclic).explain({
        vertexId: 'a',
        milestone: 'work',
      }),
    ).toMatchObject({
      kind: 'known',
      satisfied: false,
      blockers: [
        {
          kind: 'constraint',
          waiter: { vertexId: 'a' },
          prerequisite: { vertexId: 'b' },
        },
        {
          kind: 'constraint',
          waiter: { vertexId: 'b' },
          prerequisite: { vertexId: 'a' },
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
  const runner = new DagTraversal({
    ...materializeDagInputFromRecords(records, {
      id: (v) => v.id,
      dependsOnWork: (v) => v.work,
    }),
    workCompletion: 'externalSettlement',
  }).createRunner();
  runner.prepare();
  const result = inspectDagMilestones(runner).explain({
    vertexId: 0,
    milestone: 'work',
  });
  if (result.kind !== 'known') throw new Error('Expected known work');
  expect(result.blockers).toHaveLength(12000);
  expect(result.blockers[11999]).toEqual({
    kind: 'unfinishedWork',
    target: { vertexId: 11999, milestone: 'work' },
    work: 'ready',
  });
});

test('captured deleted endpoints remain explicit unsatisfied constraints', () => {
  const runner = new DagTraversal({
    ...materializeDagInputFromRecords([{ id: 'a' }], { id: (v) => v.id }),
    workCompletion: 'externalSettlement',
  }).createRunner();
  runner.prepare();
  const inspection = makeDagInspection({
    state: {
      ...inspectInternalDagState(runner),
      identityStates: [
        { vertexId: 'a', kind: 'live' },
        { vertexId: 'b', kind: 'deleted' },
      ],
    },
    summary: runner.summary(),
    edges: [
      {
        waiter: { vertexId: 'a', milestone: 'work' },
        prerequisite: { vertexId: 'b', milestone: 'work' },
        reason: 'workDependency',
      },
    ],
  });
  expect(
    inspection.explain({ vertexId: 'a', milestone: 'work' }),
  ).toMatchObject({
    kind: 'known',
    satisfied: false,
    blockers: [{ kind: 'constraint', prerequisiteStatus: { kind: 'deleted' } }],
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
  const runner = new AsyncDagTraversal({
    concurrency: 1,
    traversableGraph: {
      resolveRoot: async () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ['leaf', 'pending'] },
        },
      }),
      resolveChild: async (hint: string) => {
        if (hint === 'pending') {
          pending();
          await gate;
        }
        return {
          kind: 'found' as const,
          vertex: {
            vertexId: hint,
            vertexContent: { $data: hint, $childHints: [] },
          },
        };
      },
    },
    workCompletion: 'externalSettlement',
  }).createRunner();
  const running = runner.run();
  await admitted;
  const inspection = inspectDagMilestones(runner);
  expect(
    inspection.explain({ vertexId: 'leaf', milestone: 'subgraphCompletion' }),
  ).toMatchObject({
    kind: 'known',
    satisfied: false,
    discoveryComplete: false,
    blockers: [
      { kind: 'constraint', reason: 'ownWork' },
      {
        kind: 'unfinishedWork',
        target: { vertexId: 'leaf', milestone: 'work' },
      },
    ],
  });
  release();
  await running;
  expect(
    inspection.explain({ vertexId: 'leaf', milestone: 'subgraphCompletion' })
      .discoveryComplete,
  ).toBe(false);
});

test('explanations retain SameValueZero IDs without freezing caller objects', () => {
  const object = { label: 'same' };
  const otherObject = { label: 'same' };
  const symbol = Symbol('task');
  const ids: unknown[] = [object, symbol, NaN, -0, undefined, null];
  const runner = new DagTraversal({
    ...materializeDagInputFromRecords(
      ids.map((id) => ({ id })),
      { id: (v) => v.id },
    ),
    workCompletion: 'externalSettlement',
  }).createRunner();
  runner.prepare();
  const inspection = inspectDagMilestones(runner);
  for (const id of ids) {
    const result = inspection.explain({ vertexId: id, milestone: 'work' });
    expect(result).toMatchObject({
      kind: 'known',
      satisfied: false,
      blockers: [{ kind: 'unfinishedWork', work: 'ready' }],
    });
    expect(result.target.vertexId).toBe(id);
  }
  expect(inspection.explain({ vertexId: +0, milestone: 'work' }).kind).toBe(
    'known',
  );
  expect(
    inspection.explain({ vertexId: otherObject, milestone: 'work' }).kind,
  ).toBe('unknown');
  expect(Object.isFrozen(object)).toBe(false);
});
