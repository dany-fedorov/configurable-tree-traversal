import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  type AsyncDagDiscoverySource,
  type AsyncTreeDiscoverySource,
  type TreeVertexResolution,
  type TreeOrDagCallbackOperation,
  type VertexDataAndChildHintTypes,
} from '../src';

type Tree = VertexDataAndChildHintTypes<string, string>;
const treeChildOperation: TreeOrDagCallbackOperation =
  'resolveChildVertexFromHint';
type PendingRunner = {
  runUntilSuspendedOrTerminal(): Promise<unknown>;
  captureExecutionSnapshot(): {
    sourceTopologyKind: 'tree' | 'graph';
    pendingCallbackRequests: readonly {
      operation: TreeOrDagCallbackOperation;
    }[];
  };
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

const treeRunners: readonly [
  string,
  (source: AsyncTreeDiscoverySource<Tree>) => PendingRunner,
][] = [
  [
    'async depth-first tree',
    (source) =>
      new AsyncDepthFirstTreeTraversalBuilder({
        treeDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions(),
  ],
  [
    'async breadth-first tree',
    (source) =>
      new AsyncBreadthFirstTreeTraversalBuilder({
        treeDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions(),
  ],
  [
    'async DAG with a tree source',
    (source) =>
      new AsyncDagTraversalBuilder({
        treeDiscoverySource: source,
      }).createIndependentRunnerFromCurrentOptions(),
  ],
];

it.each(treeRunners)(
  '%s identifies the pending tree child resolver',
  async (_name, createRunner) => {
    const entered = deferred<void>();
    const child = deferred<TreeVertexResolution<Tree>>();
    const runner = createRunner({
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: ['child'],
          },
        },
      }),
      resolveChildVertexFromHint: () => {
        entered.resolve();
        return child.promise;
      },
    });
    const execution = runner.runUntilSuspendedOrTerminal();
    await entered.promise;
    try {
      const snapshot = runner.captureExecutionSnapshot();
      expect(snapshot.sourceTopologyKind).toBe('tree');
      expect(
        snapshot.pendingCallbackRequests.map(({ operation }) => operation),
      ).toEqual([treeChildOperation]);
    } finally {
      child.resolve({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: 'child',
            $childDiscoveryHints: [],
          },
        },
      });
      await execution;
    }
  },
);

it('async DAG with a graph source identifies the pending graph child resolver', async () => {
  const entered = deferred<void>();
  const child = deferred<void>();
  const rootId = {};
  const childId = Symbol('child');
  const source: AsyncDagDiscoverySource<Tree> = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexId: rootId,
        vertexContentInput: {
          $vertexData: 'root',
          $childDiscoveryHints: ['child'],
        },
      },
    }),
    resolveChildHint: async () => {
      entered.resolve();
      await child.promise;
      return {
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: childId,
          vertexContentInput: {
            $vertexData: 'child',
            $childDiscoveryHints: [],
          },
        },
      };
    },
  };
  const runner = new AsyncDagTraversalBuilder({
    dagDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const execution = runner.runUntilSuspendedOrTerminal();
  await entered.promise;
  try {
    const snapshot = runner.captureExecutionSnapshot();
    expect(snapshot.sourceTopologyKind).toBe('graph');
    expect(
      snapshot.pendingCallbackRequests.map(({ operation }) => operation),
    ).toEqual(['resolveChildHint']);
  } finally {
    child.resolve();
    await execution;
  }
});
