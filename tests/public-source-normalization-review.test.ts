import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
  type DagDiscoverySource,
  type VertexDataAndChildHintTypes,
} from '../src';

type Graph = VertexDataAndChildHintTypes<string, string>;

function sourceRejectingEnumeration() {
  const enumerationFailure = { forbiddenOperation: 'enumerate source fields' };
  let enumerationCount = 0;
  const source: DagDiscoverySource<Graph, Graph, string | undefined> = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: resolve('root'),
    }),
    resolveChildHint: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: resolve('child'),
    }),
  };
  function resolve(data: string) {
    return new Proxy(
      Object.freeze({
        vertexId: data === 'root' ? 'root' : undefined,
        vertexContentInput: {
          $vertexData: data,
          $childDiscoveryHints: data === 'root' ? ['child'] : [],
        },
      }),
      {
        ownKeys() {
          enumerationCount++;
          throw enumerationFailure;
        },
      },
    );
  }
  return { source, getEnumerationCount: () => enumerationCount };
}

test.each([
  ['sync preparation', discoverValidateAndCaptureDag],
  ['async preparation', discoverValidateAndCaptureDagAsync],
] as const)(
  '%s does not enumerate source resolution fields',
  async (_label, prepare) => {
    const { source, getEnumerationCount } = sourceRejectingEnumeration();
    const result = await prepare({ dagDiscoverySource: source });
    if (result.kind !== 'valid') throw new Error('Expected valid DAG');
    expect(
      result.validatedTopology.liveVertexSummaries.map(
        ({ vertexId }) => vertexId,
      ),
    ).toEqual(['root', undefined]);
    const runner =
      result.validatedTopology.createIndependentRunnerFromValidatedTopology();
    runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['root', undefined]);
    expect(getEnumerationCount()).toBe(0);
  },
);

test.each([
  ['sync traversal', DagTraversalBuilder],
  ['async traversal', AsyncDagTraversalBuilder],
] as const)(
  '%s does not enumerate source resolution fields',
  async (_label, Builder) => {
    const { source, getEnumerationCount } = sourceRejectingEnumeration();
    const runner = new Builder({
      dagDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['root', undefined]);
    expect(getEnumerationCount()).toBe(0);
  },
);
