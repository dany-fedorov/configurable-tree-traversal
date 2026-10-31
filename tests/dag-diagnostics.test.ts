import {
  DagTraversal,
  AsyncDagTraversal,
} from '../src/traversals/dag-traversal';
import { DagTraversalStallError, type VertexTypes } from '../src/core';
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
      { vertexId: 'A', unmetPrerequisiteIds: ['B', 'unknown'] },
      { vertexId: 'B', unmetPrerequisiteIds: ['A'] },
      { vertexId: 'C', unmetPrerequisiteIds: ['A'] },
      { vertexId: 'D', unmetPrerequisiteIds: ['D'] },
    ],
    unknownPrerequisiteIds: ['unknown'],
    dependencyCycleComponents: [['A', 'B'], ['D']],
    dependencyBlockedIds: ['C'],
    structurallyIncompleteIds: ['root'],
    dependencyEdges: expect.any(Array),
  });
}

test('sync stalls distinguish unknown prerequisites, cycle members and downstream work', () => {
  const runner = new DagTraversal<VertexTypes<string, string>>({
    traversableGraph: graphAdapter(fixture),
  }).createRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    check(error);
  }
});

test('async stalls report the same detached diagnostic contract', async () => {
  const runner = new AsyncDagTraversal<VertexTypes<string, string>>({
    traversableGraph: graphAdapter(fixture),
  }).createRunner();
  await runner.run().then(() => {
    throw new Error('Expected stall');
  }, check);
});

test('reports a missing prerequisite separately from its blocked vertex', () => {
  const runner = new DagTraversal<VertexTypes<string, string>>({
    traversableGraph: graphAdapter({
      root: { children: ['task'], dependencies: [] },
      task: { children: [], dependencies: ['absent'] },
    }),
  }).createRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    expect((error as DagTraversalStallError).diagnostics).toEqual({
      dependencies: [{ vertexId: 'task', unmetPrerequisiteIds: ['absent'] }],
      unknownPrerequisiteIds: ['absent'],
      dependencyCycleComponents: [],
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
    dependencies: [
      { vertexId: hostile, unmetPrerequisiteIds: [undefined, null, NaN, -0] },
    ],
    unknownPrerequisiteIds: [undefined, null, NaN, -0],
    dependencyCycleComponents: [[hostile]],
    dependencyBlockedIds: [hostile],
    structurallyIncompleteIds: [hostile],
  };
  const error = new DagTraversalStallError(diagnostics);
  diagnostics.dependencies[0]!.unmetPrerequisiteIds.length = 0;
  diagnostics.unknownPrerequisiteIds.length = 0;
  diagnostics.dependencyCycleComponents[0]!.length = 0;
  diagnostics.dependencyBlockedIds.length = 0;
  diagnostics.structurallyIncompleteIds.length = 0;
  expect(error.diagnostics.dependencies).toEqual([
    { vertexId: hostile, unmetPrerequisiteIds: [undefined, null, NaN, -0] },
  ]);
  expect(error.diagnostics.unknownPrerequisiteIds).toEqual([
    undefined,
    null,
    NaN,
    -0,
  ]);
  expect(error.diagnostics.dependencyCycleComponents).toEqual([[hostile]]);
  expect(error.diagnostics.dependencyBlockedIds[0]).toBe(hostile);
  expect(error.diagnostics.structurallyIncompleteIds[0]).toBe(hostile);
  expect(
    new DagTraversalStallError({
      dependencies: [],
      unknownPrerequisiteIds: [],
      dependencyCycleComponents: [],
      dependencyBlockedIds: [],
      structurallyIncompleteIds: ['root'],
    }).message,
  ).toBe('DAG traversal stalled: incomplete work');
});

test('diagnoses a deep dependency chain without using the call stack', () => {
  const count = 12000;
  const runner = new DagTraversal<
    VertexTypes<string, number>,
    VertexTypes<string, number>,
    string | number
  >({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          vertexContent: {
            $data: 'root',
            $childHints: Array.from({ length: count }, (_, i) => i),
          },
        },
      }),
      resolveChild: (id: number) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOnWork: [id === count - 1 ? id : id + 1],
          vertexContent: { $data: 'task', $childHints: [] as number[] },
        },
      }),
    },
  }).createRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    const diagnostics = (error as DagTraversalStallError).diagnostics;
    expect(diagnostics.dependencyCycleComponents).toEqual([[count - 1]]);
    expect(diagnostics.dependencyBlockedIds).toHaveLength(count - 1);
    expect(diagnostics.unknownPrerequisiteIds).toEqual([]);
  }
});

test('scheduler diagnostics preserve arbitrary missing and cyclic IDs', () => {
  const hostile = Object.create(null) as object;
  const ids: unknown[] = [hostile, undefined, null, NaN, -0];
  const runner = new DagTraversal({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ids },
        },
      }),
      resolveChild: (id: unknown) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOnWork: [id, 'missing'],
          vertexContent: { $data: 'task', $childHints: [] as unknown[] },
        },
      }),
    },
  }).createRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    const diagnostics = (error as DagTraversalStallError).diagnostics;
    expect(diagnostics.dependencyCycleComponents).toEqual([
      [hostile],
      [undefined],
      [null],
      [NaN],
      [0],
    ]);
    expect(diagnostics.unknownPrerequisiteIds).toEqual(['missing']);
    expect(diagnostics.dependencies[0]!.vertexId).toBe(hostile);
  }
});

test('keeps undefined first when its cycle was discovered first', () => {
  const runner = new DagTraversal({
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          vertexContent: {
            $data: 'root',
            $childHints: [undefined, 'b'] as unknown[],
          },
        },
      }),
      resolveChild: (id: unknown) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOnWork: [id === undefined ? 'b' : undefined],
          vertexContent: { $data: 'task', $childHints: [] as unknown[] },
        },
      }),
    },
  }).createRunner();
  try {
    runner.run();
    throw new Error('Expected stall');
  } catch (error) {
    expect(
      (error as DagTraversalStallError).diagnostics.dependencyCycleComponents,
    ).toEqual([[undefined, 'b']]);
  }
});
