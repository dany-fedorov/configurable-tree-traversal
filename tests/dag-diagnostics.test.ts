import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
} from '../src/traversals/dag-traversal';
import {
  DagTraversalStallError,
  type VertexDataAndChildHintTypes,
} from '../src/core';
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
    blockedVertexPrerequisiteReports: [
      { vertexId: 'A', prerequisiteVertexIdsInReport: ['B', 'unknown'] },
      { vertexId: 'B', prerequisiteVertexIdsInReport: ['A'] },
      { vertexId: 'C', prerequisiteVertexIdsInReport: ['A'] },
      { vertexId: 'D', prerequisiteVertexIdsInReport: ['D'] },
    ],
    unresolvedPrerequisiteVertexIds: ['unknown'],
    milestoneCycleVertexIdComponents: [['A', 'B'], ['D']],
    nonCyclePrerequisiteBlockedVertexIds: ['C'],
    incompleteVertexIdsWithoutUnmetPrerequisites: ['root'],
    originalMilestoneConstraints: expect.any(Array),
  });
}

test('sync stalls distinguish unknown prerequisites, cycle members and downstream work', () => {
  const runner = new DagTraversalBuilder<
    VertexDataAndChildHintTypes<string, string>
  >({
    dagDiscoverySource: graphAdapter(fixture),
  }).createIndependentRunnerFromCurrentOptions();
  try {
    runner.runUntilSuspendedOrTerminal();
    throw new Error('Expected stall');
  } catch (error) {
    check(error);
  }
});

test('async stalls report the same detached diagnostic contract', async () => {
  const runner = new AsyncDagTraversalBuilder<
    VertexDataAndChildHintTypes<string, string>
  >({
    dagDiscoverySource: graphAdapter(fixture),
  }).createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal().then(() => {
    throw new Error('Expected stall');
  }, check);
});

test('reports a missing prerequisite separately from its blocked vertex', () => {
  const runner = new DagTraversalBuilder<
    VertexDataAndChildHintTypes<string, string>
  >({
    dagDiscoverySource: graphAdapter({
      root: { children: ['task'], dependencies: [] },
      task: { children: [], dependencies: ['absent'] },
    }),
  }).createIndependentRunnerFromCurrentOptions();
  try {
    runner.runUntilSuspendedOrTerminal();
    throw new Error('Expected stall');
  } catch (error) {
    expect((error as DagTraversalStallError).diagnostics).toEqual({
      blockedVertexPrerequisiteReports: [
        { vertexId: 'task', prerequisiteVertexIdsInReport: ['absent'] },
      ],
      unresolvedPrerequisiteVertexIds: ['absent'],
      milestoneCycleVertexIdComponents: [],
      nonCyclePrerequisiteBlockedVertexIds: ['task'],
      incompleteVertexIdsWithoutUnmetPrerequisites: ['root'],
      originalMilestoneConstraints: expect.any(Array),
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
    blockedVertexPrerequisiteReports: [
      {
        vertexId: hostile,
        prerequisiteVertexIdsInReport: [undefined, null, NaN, -0],
      },
    ],
    unresolvedPrerequisiteVertexIds: [undefined, null, NaN, -0],
    milestoneCycleVertexIdComponents: [[hostile]],
    nonCyclePrerequisiteBlockedVertexIds: [hostile],
    incompleteVertexIdsWithoutUnmetPrerequisites: [hostile],
  };
  const error = new DagTraversalStallError(diagnostics);
  diagnostics.blockedVertexPrerequisiteReports[0]!.prerequisiteVertexIdsInReport.length = 0;
  diagnostics.unresolvedPrerequisiteVertexIds.length = 0;
  diagnostics.milestoneCycleVertexIdComponents[0]!.length = 0;
  diagnostics.nonCyclePrerequisiteBlockedVertexIds.length = 0;
  diagnostics.incompleteVertexIdsWithoutUnmetPrerequisites.length = 0;
  expect(error.diagnostics.blockedVertexPrerequisiteReports).toEqual([
    {
      vertexId: hostile,
      prerequisiteVertexIdsInReport: [undefined, null, NaN, -0],
    },
  ]);
  expect(error.diagnostics.unresolvedPrerequisiteVertexIds).toEqual([
    undefined,
    null,
    NaN,
    -0,
  ]);
  expect(error.diagnostics.milestoneCycleVertexIdComponents).toEqual([
    [hostile],
  ]);
  expect(error.diagnostics.nonCyclePrerequisiteBlockedVertexIds[0]).toBe(
    hostile,
  );
  expect(
    error.diagnostics.incompleteVertexIdsWithoutUnmetPrerequisites[0],
  ).toBe(hostile);
  expect(
    new DagTraversalStallError({
      blockedVertexPrerequisiteReports: [],
      unresolvedPrerequisiteVertexIds: [],
      milestoneCycleVertexIdComponents: [],
      nonCyclePrerequisiteBlockedVertexIds: [],
      incompleteVertexIdsWithoutUnmetPrerequisites: ['root'],
    }).message,
  ).toBe('DAG traversal stalled: incomplete work');
});

test('diagnoses a deep dependency chain without using the call stack', () => {
  const count = 12000;
  const runner = new DagTraversalBuilder<
    VertexDataAndChildHintTypes<string, number>,
    VertexDataAndChildHintTypes<string, number>,
    string | number
  >({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: Array.from({ length: count }, (_, i) => i),
          },
        },
      }),
      resolveChildHint: (id: number) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: [id === count - 1 ? id : id + 1],
          vertexContentInput: {
            $vertexData: 'task',
            $childDiscoveryHints: [] as number[],
          },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  try {
    runner.runUntilSuspendedOrTerminal();
    throw new Error('Expected stall');
  } catch (error) {
    const diagnostics = (error as DagTraversalStallError).diagnostics;
    expect(diagnostics.milestoneCycleVertexIdComponents).toEqual([[count - 1]]);
    expect(diagnostics.nonCyclePrerequisiteBlockedVertexIds).toHaveLength(
      count - 1,
    );
    expect(diagnostics.unresolvedPrerequisiteVertexIds).toEqual([]);
  }
});

test('scheduler diagnostics preserve arbitrary missing and cyclic IDs', () => {
  const hostile = Object.create(null) as object;
  const ids: unknown[] = [hostile, undefined, null, NaN, -0];
  const runner = new DagTraversalBuilder({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ids,
          },
        },
      }),
      resolveChildHint: (id: unknown) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: [id, 'missing'],
          vertexContentInput: {
            $vertexData: 'task',
            $childDiscoveryHints: [] as unknown[],
          },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  try {
    runner.runUntilSuspendedOrTerminal();
    throw new Error('Expected stall');
  } catch (error) {
    const diagnostics = (error as DagTraversalStallError).diagnostics;
    expect(diagnostics.milestoneCycleVertexIdComponents).toEqual([
      [hostile],
      [undefined],
      [null],
      [NaN],
      [0],
    ]);
    expect(diagnostics.unresolvedPrerequisiteVertexIds).toEqual(['missing']);
    expect(diagnostics.blockedVertexPrerequisiteReports[0]!.vertexId).toBe(
      hostile,
    );
  }
});

test('keeps undefined first when its cycle was discovered first', () => {
  const runner = new DagTraversalBuilder({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'root',
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: [undefined, 'b'] as unknown[],
          },
        },
      }),
      resolveChildHint: (id: unknown) => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: [id === undefined ? 'b' : undefined],
          vertexContentInput: {
            $vertexData: 'task',
            $childDiscoveryHints: [] as unknown[],
          },
        },
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  try {
    runner.runUntilSuspendedOrTerminal();
    throw new Error('Expected stall');
  } catch (error) {
    expect(
      (error as DagTraversalStallError).diagnostics
        .milestoneCycleVertexIdComponents,
    ).toEqual([[undefined, 'b']]);
  }
});
