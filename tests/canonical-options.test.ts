import { bindDagExternalWorkSession } from '../src';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  AsyncGraphWalkBuilder,
  BreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  GraphWalkBuilder,
  rewriteObject,
} from '../src';

for (const Builder of [
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
]) {
  test(`${Builder.name} requires a source without calling it during construction or configuration`, async () => {
    let calls = 0;
    const treeDiscoverySource = {
      resolveRootVertex: () => {
        calls++;
        return { kind: 'vertexIntentionallyOmitted' as const };
      },
      resolveChildVertexFromHint: () => {
        calls++;
        return { kind: 'vertexIntentionallyOmitted' as const };
      },
    };
    const traversal = new Builder({ treeDiscoverySource });
    expect(traversal.patchOptionsForFutureRunners({ visitors: {} })).toBe(
      traversal,
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect(calls).toBe(0);
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        traversalRunnerInternalObjects: {},
      } as never),
    ).toThrow(TypeError);
    expect(
      () =>
        new Builder({
          treeDiscoverySource,
          traversalRunnerInternalObjects: {},
        } as never),
    ).toThrow(TypeError);
    expect(calls).toBe(0);
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toBe(1);
    expect(runner.captureExecutionSnapshot().executionOptions).toEqual({
      deliveredEventKinds: expect.any(Array),
      admittedVisitorCallbackPhases: 'all',
    });
  });
}
for (const Builder of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Builder.name} rejects raw state atomically without source IO`, async () => {
    let calls = 0;
    const dagDiscoverySource = {
      resolveRootVertex: () => {
        calls++;
        return {
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        };
      },
      resolveChildVertexFromHint: () => {
        calls++;
        return {
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted' as const,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        };
      },
    };
    const traversal = new Builder({ dagDiscoverySource });
    expect(traversal.patchOptionsForFutureRunners({ visitors: {} })).toBe(
      traversal,
    );
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        traversalRunnerInternalObjects: {},
      } as never),
    ).toThrow(TypeError);
    expect(
      () =>
        new Builder({
          dagDiscoverySource,
          traversalRunnerInternalObjects: {},
        } as never),
    ).toThrow(TypeError);
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect(calls).toBe(0);
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toBe(1);
    expect(runner.captureExecutionSnapshot().executionOptions).toEqual({
      deliveredEventKinds: [
        'workCompletionCommitted',
        'subgraphCompletionCommitted',
      ],
      admittedVisitorCallbackPhases: 'all',
    });
  });
}
for (const Builder of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
  test(`${Builder.name} inspection exposes only effective public selectors`, async () => {
    let calls = 0;
    const traversal = new Builder({
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () => {
          calls++;
          return [];
        },
        enumerateOutgoingLinks: () => [],
      },
    });
    expect(
      traversal.patchOptionsForFutureRunners({
        admittedVisitorCallbackPhases: { include: [] },
      }),
    ).toBe(traversal);
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    expect(calls).toBe(0);
    await runner.runUntilSuspendedOrTerminal();
    expect(calls).toBe(1);
    expect(runner.captureExecutionSnapshot().executionOptions).toEqual({
      deliveredEventKinds: ['vertexOccurrence'],
      admittedVisitorCallbackPhases: { include: [] },
    });
  });
}
test('rewrite helpers own fresh runner state', () => {
  expect(() =>
    rewriteObject({}, { traversalRunnerInternalObjects: {} } as never),
  ).toThrow(TypeError);
});

test('DAG coordination requires the registered runner identity', () => {
  const runner = new DagTraversalBuilder({
    workCompletionPolicy: 'requireExternalWorkSettlement',
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
      resolveChildVertexFromHint: () => ({
        omittedVertexIdentity: null,
        satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
        kind: 'vertexIntentionallyOmitted' as const,
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => bindDagExternalWorkSession(Object.create(runner))).toThrow(
    /requireExternalWorkSettlement/,
  );
  expect(() => bindDagExternalWorkSession(runner)).not.toThrow();
});
