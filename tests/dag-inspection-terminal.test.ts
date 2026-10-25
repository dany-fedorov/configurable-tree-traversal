import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalOrder as Order,
  DagTraversalRunnerState,
  inspectDag,
  graphFrom,
  DagTraversalStallError,
  DEFER_READY,
} from '../src';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type G = TreeTypeParameters<string, string>;

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const scenario of [
    'finished',
    'ready failure',
    'completion failure',
    'child source failure',
    'root source failure',
  ] as const) {
    test(`${Constructor.name} retains terminal observation facts after ${scenario}`, async () => {
      const failure = scenario === 'ready failure' ? undefined : { scenario };
      let sourceCalls = 0;
      let visits = 0;
      const traversableGraph = {
        makeRoot: () => {
          sourceCalls++;
          if (scenario === 'root source failure') throw failure;
          return {
            vertexId: 'a',
            vertexContent: {
              $data: 'a',
              $childHints: scenario === 'child source failure' ? ['b'] : [],
            },
          };
        },
        makeVertex: (hint: string) => {
          sourceCalls++;
          if (scenario === 'child source failure') throw failure;
          return {
            vertexId: hint,
            vertexContent: { $data: hint, $childHints: [] },
          };
        },
      };
      const traversal = new Constructor<G>({ traversableGraph });
      traversal.addVisitorFor(Order.ON_READY, () => {
        visits++;
        if (scenario === 'ready failure') throw failure;
      });
      traversal.addVisitorFor(Order.ON_COMPLETE, () => {
        visits++;
        if (scenario === 'completion failure') throw failure;
      });
      const runner = traversal.makeRunner();
      if (scenario === 'finished') await runner.run();
      else await expect((async () => runner.run())()).rejects.toBe(failure);
      const expectedStatus =
        scenario === 'finished' ? Status.FINISHED : Status.FAILED;
      const before = { sourceCalls, visits };
      const original = inspectDag(runner);
      for (const state of [
        runner.state,
        new DagTraversalRunnerState(runner.state),
        { ...runner.state },
        Object.assign({}, runner.state),
      ]) {
        const restored = new Constructor<G>({
          traversableGraph,
          traversalRunnerInternalObjects: {
            state,
            resolvedGraphsContainer: runner.resolvedGraphsContainer,
          },
        }).makeRunner();
        const captured = inspectDag(restored);
        for (const milestone of ['work', 'completion'] as const) {
          const result = captured.explain({ vertexId: 'a', milestone });
          expect(result).toEqual(
            original.explain({ vertexId: 'a', milestone }),
          );
          if (scenario === 'root source failure')
            expect(result).toMatchObject({
              kind: 'unknown',
              discoveryComplete: false,
            });
          else
            expect(result).toMatchObject({
              kind: 'known',
              satisfied:
                scenario === 'finished' ||
                (milestone === 'work' && scenario !== 'ready failure'),
              discoveryComplete:
                scenario === 'finished' || scenario === 'completion failure',
            });
        }
        expect(restored.summary()).toEqual(runner.summary());
        expect(restored.inspectDagState()).toEqual(runner.inspectDagState());
        expect(restored.getStatus()).toBe(expectedStatus);
        expect(restored.requestPause()).toBe(false);
        if (scenario === 'finished') await restored.run();
        else await expect((async () => restored.run())()).rejects.toBe(failure);
        expect({ sourceCalls, visits }).toEqual(before);
        expect(runner.getStatus()).toBe(expectedStatus);
        const summary = restored.summary();
        (summary.completedWorkIds as unknown[]).push('corruption');
        (summary.vertices as Map<unknown, unknown>).clear();
        const facts = restored.inspectDagState();
        (facts.identityStates as unknown[]).pop();
        (facts.schedulingStates as unknown[]).pop();
        expect(restored.summary()).toEqual(runner.summary());
        expect(restored.inspectDagState()).toEqual(runner.inspectDagState());
        expect(captured.explain({ vertexId: 'a', milestone: 'work' })).toEqual(
          original.explain({ vertexId: 'a', milestone: 'work' }),
        );
      }
    });
  }
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} retains terminal tree-source milestone identities`, async () => {
    let calls = 0;
    const traversableTree = {
      makeRoot: () => {
        calls++;
        return { vertexContent: { $data: 'root', $childHints: ['child'] } };
      },
      makeVertex: (hint: string) => {
        calls++;
        return { vertexContent: { $data: hint, $childHints: [] } };
      },
    };
    const runner = new Constructor<G>({ traversableTree }).makeRunner();
    await runner.run();
    const restored = new Constructor<G>({
      traversableTree,
      traversalRunnerInternalObjects: {
        state: new DagTraversalRunnerState(runner.state),
        resolvedGraphsContainer: runner.resolvedGraphsContainer,
      },
    }).makeRunner();
    const captured = inspectDag(restored);
    const graph = runner.getResolvedGraph();
    for (const ref of graph.getVertexRefs()) {
      for (const milestone of ['work', 'completion'] as const) {
        expect(
          captured.explain({ vertexId: graph.getVertexId(ref), milestone }),
        ).toMatchObject({
          kind: 'known',
          satisfied: true,
          discoveryComplete: true,
        });
      }
    }
    expect(restored.summary()).toEqual(runner.summary());
    expect(calls).toBe(2);
  });

  test(`${Constructor.name} retains failed preparation diagnostics and owns every copied observation wrapper`, async () => {
    const first = { name: 'first' };
    const second = { name: 'second' };
    const source = graphFrom(
      [
        { id: first, complete: [second] },
        { id: second, complete: [first] },
      ],
      {
        id: (item) => item.id,
        completionDependencies: (item) => item.complete,
      },
    );
    const runner = new Constructor(source).makeRunner();
    await expect((async () => runner.prepare())()).rejects.toBeInstanceOf(
      DagTraversalStallError,
    );
    const restored = new Constructor({
      traversableGraph: source.traversableGraph,
      traversalRunnerInternalObjects: {
        state: runner.state,
        resolvedGraphsContainer: runner.resolvedGraphsContainer,
      },
    }).makeRunner();
    const before = restored.summary();
    const expected = runner.summary();
    expect(before).toEqual(expected);
    const original = inspectDag(runner).explain({
      vertexId: first,
      milestone: 'completion',
    });
    expect(original).toMatchObject({
      kind: 'known',
      satisfied: false,
      discoveryComplete: true,
    });
    expect(
      inspectDag(restored).explain({
        vertexId: first,
        milestone: 'completion',
      }),
    ).toEqual(original);
    expect(before.vertices.get(first)!.id).toBe(first);
    const progress = before.vertices.get(first)!;
    (progress.unmetPrerequisiteIds as unknown[]).pop();
    (progress.unmetWorkPrerequisiteIds as unknown[]).push('changed');
    (progress.unmetCompletePrerequisiteIds as unknown[]).pop();
    (progress as { work: string }).work = 'completed';
    (before.discovery as { complete: boolean }).complete = false;
    (before.counts as { discovered: number }).discovered = 99;
    for (const values of [
      before.readyIds,
      before.deferredIds,
      before.inFlightIds,
      before.completedWorkIds,
      before.completedSubtreeIds,
      before.unusedCompletedWorkIds,
    ])
      (values as unknown[]).push('changed');
    const diagnostics = before.diagnostics!;
    diagnostics.dependencies[0]!.unmet.pop();
    diagnostics.dependencies[0]!.id = 'changed' as unknown as typeof first;
    diagnostics.unknownPrerequisiteIds.push({ name: 'changed' });
    diagnostics.dependencyCycles[0]!.pop();
    diagnostics.dependencyEdges[0]!.from.vertexId = { name: 'changed' };
    diagnostics.dependencyEdges[0]!.to.vertexId = { name: 'changed' };
    diagnostics.dependencyBlockedIds.pop();
    diagnostics.structurallyIncompleteIds.push({ name: 'changed' });
    const facts = restored.inspectDagState();
    (facts.identityStates[0] as { kind: string }).kind = 'deleted';
    (
      facts.schedulingStates[0] as { initialCommitted: boolean }
    ).initialCommitted = true;
    expect(restored.summary()).toEqual(expected);
    expect(restored.inspectDagState()).toEqual(runner.inspectDagState());
    expect(
      inspectDag(restored).explain({
        vertexId: first,
        milestone: 'completion',
      }),
    ).toEqual(original);
    expect(Object.isFrozen(first)).toBe(false);
  });

  test(`${Constructor.name} retains deferred work and earlier commits when a later visitor fails`, async () => {
    const source = graphFrom(
      [{ id: 'done' }, { id: 'deferred' }, { id: 'failed' }],
      { id: (item) => item.id },
    );
    const traversal = new Constructor({
      ...source,
      discovery: 'eager',
      ...(Constructor === AsyncDagTraversal ? { concurrency: 1 } : {}),
    });
    const failure = { problem: 'later visitor' };
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      if (vertex.getData().id === 'deferred') return DEFER_READY;
      if (vertex.getData().id === 'failed') throw failure;
      return undefined;
    });
    const runner = traversal.makeRunner();
    await expect((async () => runner.run())()).rejects.toBe(failure);
    const restored = new Constructor({
      traversableGraph: source.traversableGraph,
      traversalRunnerInternalObjects: {
        state: runner.state,
        resolvedGraphsContainer: runner.resolvedGraphsContainer,
      },
    }).makeRunner();
    expect(restored.summary()).toEqual(runner.summary());
    expect(
      inspectDag(restored).explain({ vertexId: 'done', milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: true });
    expect(
      inspectDag(restored).explain({ vertexId: 'deferred', milestone: 'work' }),
    ).toMatchObject({
      kind: 'known',
      satisfied: false,
      progress: { work: 'deferred' },
    });
    expect(
      inspectDag(restored).explain({ vertexId: 'failed', milestone: 'work' }),
    ).toMatchObject({ kind: 'known', satisfied: false });
    const summary = restored.summary();
    (summary.deferredFrontier[0] as { vertexId: string }).vertexId = 'changed';
    expect(restored.summary()).toEqual(runner.summary());
  });
}

test('terminal async observations stay stable after an invalidated callback settles', async () => {
  let reject!: (error: unknown) => void;
  let release!: () => void;
  let bothStarted!: () => void;
  const failing = new Promise<void>((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  const late = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    bothStarted = resolve;
  });
  const source = graphFrom([{ id: 'a' }, { id: 'b' }], {
    id: (item) => item.id,
  });
  const traversal = new AsyncDagTraversal({
    ...source,
    concurrency: 2,
    discovery: 'eager',
  });
  let callbacks = 0;
  traversal.addVisitorFor(Order.ON_READY, async (vertex) => {
    callbacks++;
    if (vertex.getData().id === 'a') await failing;
    else {
      bothStarted();
      await late;
    }
  });
  const runner = traversal.makeRunner();
  const running = runner.run();
  await started;
  const failure = { error: 'failed first' };
  reject(failure);
  await expect(running).rejects.toBe(failure);
  const restored = new AsyncDagTraversal({
    traversableGraph: source.traversableGraph,
    traversalRunnerInternalObjects: {
      state: runner.state,
      resolvedGraphsContainer: runner.resolvedGraphsContainer,
    },
  }).makeRunner();
  const captured = inspectDag(restored);
  expect(captured.explain({ vertexId: 'a', milestone: 'work' })).toMatchObject({
    kind: 'known',
    satisfied: false,
  });
  expect(captured.explain({ vertexId: 'b', milestone: 'work' })).toMatchObject({
    kind: 'known',
    satisfied: false,
  });
  release();
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(restored.summary()).toEqual(runner.summary());
  expect(restored.inspectDagState()).toEqual(runner.inspectDagState());
  expect(
    inspectDag(runner).explain({ vertexId: 'b', milestone: 'work' }),
  ).toEqual(captured.explain({ vertexId: 'b', milestone: 'work' }));
  await expect(restored.run()).rejects.toBe(failure);
  expect(callbacks).toBe(2);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} explains unavailable history for fabricated terminal state without changing lifecycle`, async () => {
    let calls = 0;
    const traversableGraph = {
      makeRoot: () => {
        calls++;
        return {
          vertexId: 'a',
          vertexContent: { $data: 'a', $childHints: [] },
        };
      },
      makeVertex: () => ({ vertexContent: null }),
    };
    const original = new Constructor<G>({ traversableGraph }).makeRunner();
    await original.run();
    for (const status of [Status.FINISHED, Status.FAILED]) {
      const error = { status };
      const state = new DagTraversalRunnerState<G>({
        status,
        failure: { error },
      });
      const restored = new Constructor<G>({
        traversableGraph,
        traversalRunnerInternalObjects: {
          state,
          resolvedGraphsContainer: original.resolvedGraphsContainer,
        },
      }).makeRunner();
      expect(() => inspectDag(restored)).toThrow(
        /terminal DAG observation.*unavailable/i,
      );
      expect(() => restored.summary()).toThrow(
        /terminal DAG observation.*unavailable/i,
      );
      expect(restored.getStatus()).toBe(status);
      if (status === Status.FAILED)
        await expect((async () => restored.run())()).rejects.toBe(error);
      else await restored.run();
      const empty = new Constructor<G>({
        traversableGraph,
        traversalRunnerInternalObjects: { state },
      }).makeRunner();
      expect(
        inspectDag(empty).explain({ vertexId: 'a', milestone: 'work' }),
      ).toMatchObject({ kind: 'unknown', discoveryComplete: false });
      expect(calls).toBe(1);
    }
  });
}
