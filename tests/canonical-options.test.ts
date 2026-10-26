import { createDagWorkSession } from '../src';
import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTreeTraversal,
  AsyncGraphWalk,
  BreadthFirstTreeTraversal,
  DagTraversal,
  DepthFirstTreeTraversal,
  GraphWalk,
  rewriteObject,
} from '../src';

for (const Builder of [
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
]) {
  test(`${Builder.name} requires a source without calling it during construction or configuration`, async () => {
    let calls = 0;
    const traversableTree = {
      resolveRoot: () => {
        calls++;
        return { kind: 'omitted' as const };
      },
      resolveChild: () => {
        calls++;
        return { kind: 'omitted' as const };
      },
    };
    const traversal = new Builder({ traversableTree });
    expect(traversal.configure({ visitors: {} })).toBe(traversal);
    const runner = traversal.createRunner();
    expect(calls).toBe(0);
    expect(() =>
      traversal.configure({ traversalRunnerInternalObjects: {} } as never),
    ).toThrow(/not a public option/);
    expect(
      () =>
        new Builder({
          traversableTree,
          traversalRunnerInternalObjects: {},
        } as never),
    ).toThrow(/not a public option/);
    expect(calls).toBe(0);
    await runner.run();
    expect(calls).toBe(1);
    expect(runner.inspect().executionOptions).toEqual({
      emitEvents: expect.any(Array),
      visitorPhases: 'all',
    });
  });
}
for (const Builder of [DagTraversal, AsyncDagTraversal]) {
  test(`${Builder.name} rejects raw state atomically without source IO`, async () => {
    let calls = 0;
    const traversableGraph = {
      resolveRoot: () => {
        calls++;
        return {
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        };
      },
      resolveChild: () => {
        calls++;
        return {
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        };
      },
    };
    const traversal = new Builder({ traversableGraph });
    expect(traversal.configure({ visitors: {} })).toBe(traversal);
    expect(() =>
      traversal.configure({ traversalRunnerInternalObjects: {} } as never),
    ).toThrow(/not a public option/);
    expect(
      () =>
        new Builder({
          traversableGraph,
          traversalRunnerInternalObjects: {},
        } as never),
    ).toThrow(/not a public option/);
    const runner = traversal.createRunner();
    expect(calls).toBe(0);
    await runner.run();
    expect(calls).toBe(1);
    expect(runner.inspect().executionOptions).toEqual({
      emitEvents: ['workCompleted', 'subgraphCompleted'],
      visitorPhases: 'all',
    });
  });
}
for (const Builder of [GraphWalk, AsyncGraphWalk]) {
  test(`${Builder.name} inspection exposes only effective public selectors`, async () => {
    let calls = 0;
    const traversal = new Builder({
      source: {
        roots: () => {
          calls++;
          return [];
        },
        outgoing: () => [],
      },
    });
    expect(traversal.configure({ visitorPhases: { include: [] } })).toBe(
      traversal,
    );
    const runner = traversal.createRunner();
    expect(calls).toBe(0);
    await runner.run();
    expect(calls).toBe(1);
    expect(runner.inspect().executionOptions).toEqual({
      emitEvents: ['vertex'],
      visitorPhases: { include: [] },
    });
  });
}
test('rewrite helpers own fresh runner state', () => {
  expect(() =>
    rewriteObject({}, { traversalRunnerInternalObjects: {} } as never),
  ).toThrow(/not a public option/);
});

test('DAG coordination requires the registered runner identity', () => {
  const runner = new DagTraversal({
    workCompletion: 'externalSettlement',
    traversableGraph: {
      resolveRoot: () => ({ vertexContent: null }),
      resolveChild: () => ({ vertexContent: null }),
    },
  }).createRunner();
  expect(() => createDagWorkSession(Object.create(runner))).toThrow(
    /externalSettlement/,
  );
  expect(() => createDagWorkSession(runner)).not.toThrow();
});
