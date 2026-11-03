import {
  DepthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
  AsyncBreadthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  type TreeDiscoverySource,
  type VertexDataAndChildHintTypes,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;
const content = { $vertexData: 'root', $childDiscoveryHints: [] };
const root = { $vertexData: 'root', $childDiscoveryHints: ['child'] };
for (const Constructor of [
  DepthFirstTreeTraversalBuilder<T>,
  AsyncDepthFirstTreeTraversalBuilder<T>,
  BreadthFirstTreeTraversalBuilder<T>,
  AsyncBreadthFirstTreeTraversalBuilder<T>,
  DagTraversalBuilder<T>,
  AsyncDagTraversalBuilder<T>,
]) {
  describe(Constructor.name, () => {
    test.each([
      'vertexId',
      'workWaitsForWorkOf',
      'workWaitsForSubgraphCompletionOf',
      'satisfiesWorkAndSubgraphCompletionPrerequisites',
    ])(
      'rejects own %s, including undefined, before tagged results discard it',
      async (field) => {
        for (const value of [undefined, true, false, []]) {
          for (const result of [
            { kind: 'vertexIntentionallyOmitted' as const, [field]: value },
            {
              kind: 'vertexResolved',
              resolvedVertexInput: {
                vertexContentInput: content,
                [field]: value,
              },
            },
            {
              kind: 'vertexResolved',
              resolvedVertexInput: { vertexContentInput: content },
              [field]: value,
            },
            { kind: 'vertexIntentionallyOmitted', [field]: value },
          ]) {
            for (const atRoot of [true, false]) {
              const source = {
                resolveRootVertex: () =>
                  atRoot
                    ? result
                    : {
                        kind: 'vertexResolved' as const,
                        resolvedVertexInput: { vertexContentInput: root },
                      },
                resolveChildVertexFromHint: () => result,
              } as TreeDiscoverySource<T>;
              const runner = new Constructor({
                treeDiscoverySource: source,
              }).createIndependentRunnerFromCurrentOptions();
              await expect(async () => {
                await runner.runUntilSuspendedOrTerminal();
              }).rejects.toThrow(/graph metadata/i);
            }
          }
        }
      },
    );
  });
}
