import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  type DagSourceVertexResolution,
  type VertexDataAndChildHintTypes,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;
for (const Builder of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([
    {
      kind: 'vertexIntentionallyOmitted',
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    },
    {
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: null,
      vertexId: undefined,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    },
    {
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: undefined,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    },
    {
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: 1,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    },
    {
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: [],
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    },
    {
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: {},
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    },
    {
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: Object.create({ vertexId: 'inherited' }),
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    },
  ])(
    `${Builder.name} rejects malformed or retired omission identity %#`,
    async (bad) => {
      const runner = new Builder<T>({
        dagDiscoverySource: {
          resolveRootVertex: () =>
            bad as unknown as DagSourceVertexResolution<T>,
          resolveChildHint: () => ({
            kind: 'vertexIntentionallyOmitted',
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await expect(
        Promise.resolve().then(async () => {
          await runner.runUntilSuspendedOrTerminal();
        }),
      ).rejects.toBeInstanceOf(TypeError);
    },
  );

  test.each([undefined, null, Symbol('identity failure')])(
    `${Builder.name} preserves an omission identity getter failure %#`,
    async (failure) => {
      const runner = new Builder<T>({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexIntentionallyOmitted',
            get omittedVertexIdentity(): never {
              throw failure;
            },
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
          resolveChildHint: () => ({
            kind: 'vertexIntentionallyOmitted',
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await expect(
        Promise.resolve().then(async () => {
          await runner.runUntilSuspendedOrTerminal();
        }),
      ).rejects.toBe(failure);
    },
  );
}
for (const Builder of [
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
]) {
  test(`${Builder.name} rejects graph identity before reading its value`, async () => {
    let reads = 0;
    const bad = {
      kind: 'vertexIntentionallyOmitted' as const,
      get omittedVertexIdentity() {
        reads++;
        return null;
      },
    };
    const runner = new Builder<T>({
      treeDiscoverySource: {
        resolveRootVertex: () => bad as never,
        resolveChildVertexFromHint: () => ({
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await expect(
      Promise.resolve().then(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(reads).toBe(0);
  });
}

for (const Builder of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test.each([false, true])(
    `${Builder.name} reads structural omission identity getters once (identified=%s)`,
    async (identified) => {
      let reads = 0;
      class Omission {
        get kind() {
          return 'vertexIntentionallyOmitted' as const;
        }
        get omittedVertexIdentity() {
          reads++;
          return identified ? { vertexId: undefined } : null;
        }
        get satisfiesWorkAndSubgraphCompletionPrerequisites() {
          return true as const;
        }
      }
      const runner = new Builder<T>({
        dagDiscoverySource: {
          resolveRootVertex: () => new Omission(),
          resolveChildHint: () => ({
            kind: 'vertexIntentionallyOmitted',
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          }),
        },
        ...(identified
          ? { acceptedCompletedWorkVertexIds: new Set([undefined]) }
          : {}),
      }).createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(reads).toBe(1);
      expect(
        runner.captureProgressSnapshot().unmatchedCompletedWorkSeedVertexIds,
      ).toEqual([]);
    },
  );
}
