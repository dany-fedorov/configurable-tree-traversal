import {
  DagTraversal,
  AsyncDagTraversal,
} from '../src/traversals/dag-traversal';
import { DagTraversalStallError, type TreeTypeParameters } from '../src/core';
import { graphAdapter } from './helpers/graph-fixtures';

const fixture = {
  root: { children: ['A', 'B', 'C', 'D'], dependencies: [] },
  A: { children: [], dependencies: ['B', 'unknown'] },
  B: { children: [], dependencies: ['A'] },
  C: { children: [], dependencies: ['A'] },
  D: { children: [], dependencies: ['D'] },
};

function check(error: unknown) {
  expect(error).toBeInstanceOf(DagTraversalStallError);
  const stall = error as DagTraversalStallError;
  expect(stall.name).toBe('DagTraversalStallError');
  expect(stall.message).toMatch(/^DAG traversal stalled:/);
  expect(stall.diagnostics).toEqual({
    dependencies: [
      { id: 'A', unmet: ['B', 'unknown'] },
      { id: 'B', unmet: ['A'] },
      { id: 'C', unmet: ['A'] },
      { id: 'D', unmet: ['D'] },
    ],
    unknownPrerequisiteIds: ['unknown'],
    dependencyCycles: [['A', 'B'], ['D']],
    dependencyBlockedIds: ['C'],
    structurallyIncompleteIds: ['root'],
    dependencyEdges: expect.any(Array),
  });
}

test('sync stalls distinguish unknown prerequisites, cycle members and downstream work', () => {
  const runner = new DagTraversal({
    traversableGraph: graphAdapter(fixture),
  }).makeRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    check(error);
  }
});

test('async stalls report the same detached diagnostic contract', async () => {
  const runner = new AsyncDagTraversal({
    traversableGraph: graphAdapter(fixture),
  }).makeRunner();
  await runner.run().then(() => {
    throw new Error('Expected stall');
  }, check);
});

test('reports a missing prerequisite separately from its blocked vertex', () => {
  const runner = new DagTraversal({
    traversableGraph: graphAdapter({
      root: { children: ['task'], dependencies: [] },
      task: { children: [], dependencies: ['absent'] },
    }),
  }).makeRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    expect((error as DagTraversalStallError).diagnostics).toEqual({
      dependencies: [{ id: 'task', unmet: ['absent'] }],
      unknownPrerequisiteIds: ['absent'],
      dependencyCycles: [],
      dependencyBlockedIds: ['task'],
      structurallyIncompleteIds: ['root'],
      dependencyEdges: expect.any(Array),
    });
  }
});

test('detaches reports and retains hostile and SameValueZero IDs without coercion', () => {
  const hostile = {
    toString() {
      throw new Error('Do not coerce');
    },
  };
  const diagnostics = {
    dependencies: [{ id: hostile, unmet: [undefined, null, NaN, -0] }],
    unknownPrerequisiteIds: [undefined, null, NaN, -0],
    dependencyCycles: [[hostile]],
    dependencyBlockedIds: [hostile],
    structurallyIncompleteIds: [hostile],
  };
  const error = new DagTraversalStallError(diagnostics);
  diagnostics.dependencies[0]!.unmet.length = 0;
  diagnostics.unknownPrerequisiteIds.length = 0;
  diagnostics.dependencyCycles[0]!.length = 0;
  diagnostics.dependencyBlockedIds.length = 0;
  diagnostics.structurallyIncompleteIds.length = 0;
  expect(error.diagnostics.dependencies).toEqual([
    { id: hostile, unmet: [undefined, null, NaN, -0] },
  ]);
  expect(error.diagnostics.unknownPrerequisiteIds).toEqual([
    undefined,
    null,
    NaN,
    -0,
  ]);
  expect(error.diagnostics.dependencyCycles).toEqual([[hostile]]);
  expect(error.diagnostics.dependencyBlockedIds[0]).toBe(hostile);
  expect(error.diagnostics.structurallyIncompleteIds[0]).toBe(hostile);
  expect(
    new DagTraversalStallError({
      dependencies: [],
      unknownPrerequisiteIds: [],
      dependencyCycles: [],
      dependencyBlockedIds: [],
      structurallyIncompleteIds: ['root'],
    }).message,
  ).toBe('DAG traversal stalled: incomplete work');
});

test('diagnoses a deep dependency chain without using the call stack', () => {
  const count = 12000;
  const runner = new DagTraversal<
    TreeTypeParameters<string, number>,
    TreeTypeParameters<string, number>,
    string | number
  >({
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        vertexContent: {
          $d: 'root',
          $c: Array.from({ length: count }, (_, i) => i),
        },
      }),
      makeVertex: (id: number) => ({
        vertexId: id,
        dependsOn: [id === count - 1 ? id : id + 1],
        vertexContent: { $d: 'task', $c: [] as number[] },
      }),
    },
  }).makeRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    const diagnostics = (error as DagTraversalStallError).diagnostics;
    expect(diagnostics.dependencyCycles).toEqual([[count - 1]]);
    expect(diagnostics.dependencyBlockedIds).toHaveLength(count - 1);
    expect(diagnostics.unknownPrerequisiteIds).toEqual([]);
  }
});

test('scheduler diagnostics preserve arbitrary missing and cyclic IDs', () => {
  const hostile = Object.create(null) as object;
  const ids: unknown[] = [hostile, undefined, null, NaN, -0];
  const runner = new DagTraversal({
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: ids },
      }),
      makeVertex: (id: unknown) => ({
        vertexId: id,
        dependsOn: [id, 'missing'],
        vertexContent: { $d: 'task', $c: [] as unknown[] },
      }),
    },
  }).makeRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    const diagnostics = (error as DagTraversalStallError).diagnostics;
    expect(diagnostics.dependencyCycles).toEqual([
      [hostile],
      [undefined],
      [null],
      [NaN],
      [0],
    ]);
    expect(diagnostics.unknownPrerequisiteIds).toEqual(['missing']);
    expect(diagnostics.dependencies[0]!.id).toBe(hostile);
  }
});

test('keeps undefined first when its cycle was discovered first', () => {
  const runner = new DagTraversal({
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: [undefined, 'b'] as unknown[] },
      }),
      makeVertex: (id: unknown) => ({
        vertexId: id,
        dependsOn: [id === undefined ? 'b' : undefined],
        vertexContent: { $d: 'task', $c: [] as unknown[] },
      }),
    },
  }).makeRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    expect(
      (error as DagTraversalStallError).diagnostics.dependencyCycles,
    ).toEqual([[undefined, 'b']]);
  }
});
