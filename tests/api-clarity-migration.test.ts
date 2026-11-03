import * as publicApi from '../src';
import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  captureDagMilestoneSnapshot,
  materializeMultiEntryDagInputFromRecordCatalog,
  discoverValidateAndCaptureDag,
} from '../src';

describe('API clarity migration', () => {
  test('materialized DAG sources create host-controlled work sessions', () => {
    const prepared = discoverValidateAndCaptureDag(
      materializeMultiEntryDagInputFromRecordCatalog([{ id: 'a' }], { selectVertexId: (x) => x.id }),
    );
    if (prepared.kind === 'invalid') {
      throw new Error('unexpected invalid fixture');
    }
    expect(prepared.validatedTopology.createExternalWorkSession().runUntilWorkBoundary().kind).toBe(
      'awaitingSettlement',
    );
  });
});

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} hides inspection assembly while capturing live and terminal milestones`, async () => {
    let calls = 0;
    const runner = new Constructor({
      dagDiscoverySource: {
        resolveRootVertex: () => {
          calls++;
          return {
            kind: "vertexResolved" as const,
            resolvedVertexInput: {
              vertexId: 'a',
              vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] as string[] },
            },
          };
        },
        resolveChildHint: () => ({
          omittedVertexIdentity: null,
          kind: "vertexIntentionallyOmitted" as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        }),
      },
      workCompletionPolicy: "requireExternalWorkSettlement",
    }).createIndependentRunnerFromCurrentOptions();
    expect('inspectDagState' in runner).toBe(false);
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'a',
        milestone: "workCompletion",
      }),
    ).toMatchObject({ kind: 'unresolved', discoveryComplete: false });
    expect(calls).toBe(0);
    await runner.runUntilSuspendedOrTerminal();
    const captured = runner.captureMilestoneSnapshot();
    const ticket = runner.captureProgressSnapshot().workAwaitingSettlement[0]!;
    runner.settleDeferredWork(
      ticket.vertexId,
      { kind: 'workCompleted' },
      ticket.settlementToken,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      captureDagMilestoneSnapshot(runner).explainMilestone({
        vertexId: 'a',
        milestone: 'subgraphCompletion',
      }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: true });
    expect(
      captured.explainMilestone({ vertexId: 'a', milestone: "workCompletion" }),
    ).toMatchObject({ kind: 'live', milestoneSatisfied: false });
    expect(calls).toBe(1);
  });
}

test('milestone inspection rejects an unregistered structural impostor before invoking its methods', () => {
  const runner = new DagTraversalBuilder(
    materializeMultiEntryDagInputFromRecordCatalog([{ id: 'a' }], {
      selectVertexId: (item) => item.id,
    }),
  ).createIndependentRunnerFromCurrentOptions();
  const impostor = Object.create(runner) as typeof runner;
  let called = false;
  impostor.captureProgressSnapshot = () => {
    called = true;
    return runner.captureProgressSnapshot();
  };
  expect(() => captureDagMilestoneSnapshot(impostor)).toThrow(/registered DAG runner/);
  expect(called).toBe(false);
});

// Public namespaces must reference the same constructors, sentinels and helpers
// as root named imports, so consumers can mix either import style safely.
test('public family namespaces preserve every named runtime export identity', () => {
  for (const namespace of [
    publicApi.core,
    publicApi.depthFirstTreeTraversal,
    publicApi.breadthFirstTreeTraversal,
    publicApi.dagTraversal,
    publicApi.graphWalk,
    publicApi.objectPropertyTree,
    publicApi.objectRewrite,
  ]) {
    for (const [name, value] of Object.entries(namespace)) {
      expect((publicApi as Record<string, unknown>)[name]).toBe(value);
    }
  }
});
