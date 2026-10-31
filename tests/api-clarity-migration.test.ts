import * as publicApi from '../src';
import {
  DagTraversal,
  AsyncDagTraversal,
  inspectDagMilestones,
  materializeDagInputFromRecords,
  prepareDag,
} from '../src';

describe('API clarity migration', () => {
  test('materialized DAG sources create host-controlled work sessions', () => {
    const prepared = prepareDag(
      materializeDagInputFromRecords([{ id: 'a' }], { id: (x) => x.id }),
    );
    if (prepared.kind === 'invalid') {
      throw new Error('unexpected invalid fixture');
    }
    expect(prepared.dag.createWorkSession().advance().kind).toBe(
      'awaitingSettlement',
    );
  });
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} hides inspection assembly while capturing live and terminal milestones`, async () => {
    let calls = 0;
    const runner = new Constructor({
      traversableGraph: {
        resolveRoot: () => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: 'a',
              vertexContent: { $data: 'a', $childHints: [] as string[] },
            },
          };
        },
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
      },
      workCompletion: 'externalSettlement',
    }).createRunner();
    expect('inspectDagState' in runner).toBe(false);
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'a',
        milestone: 'work',
      }),
    ).toMatchObject({ kind: 'unresolved', discoveryComplete: false });
    expect(calls).toBe(0);
    await runner.run();
    const captured = runner.inspectMilestones();
    const ticket = runner.summary().awaitingSettlement[0]!;
    runner.settle(
      ticket.vertexId,
      { kind: 'workCompleted' },
      ticket.generation,
    );
    await runner.run();
    expect(
      inspectDagMilestones(runner).explain({
        vertexId: 'a',
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({ kind: 'live', satisfied: true });
    expect(
      captured.explain({ vertexId: 'a', milestone: 'work' }),
    ).toMatchObject({ kind: 'live', satisfied: false });
    expect(calls).toBe(1);
  });
}

test('milestone inspection rejects an unregistered structural impostor before invoking its methods', () => {
  const runner = new DagTraversal(
    materializeDagInputFromRecords([{ id: 'a' }], {
      id: (item) => item.id,
    }),
  ).createRunner();
  const impostor = Object.create(runner) as typeof runner;
  let called = false;
  impostor.summary = () => {
    called = true;
    return runner.summary();
  };
  expect(() => inspectDagMilestones(impostor)).toThrow(/registered DAG runner/);
  expect(called).toBe(false);
});

// Public namespaces must reference the same constructors, sentinels and helpers
// as root named imports, so consumers can mix either import style safely.
test('public family namespaces preserve every named runtime export identity', () => {
  for (const namespace of [
    publicApi.core,
    publicApi.depthFirstTraversal,
    publicApi.breadthFirstTraversal,
    publicApi.dagTraversal,
    publicApi.graphWalk,
    publicApi.traversableObjectTree,
    publicApi.objectRewrite,
  ]) {
    for (const [name, value] of Object.entries(namespace)) {
      expect((publicApi as Record<string, unknown>)[name]).toBe(value);
    }
  }
});
