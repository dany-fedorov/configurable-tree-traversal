import {
  DagTraversalBuilder,
  DagVisitorPhase as Order,
  type VertexDataAndChildHintTypes,
} from '../src';
import assert from 'node:assert/strict';

type Build = VertexDataAndChildHintTypes<string, string>;
const events: string[] = [];
const traversal = new DagTraversalBuilder<Build>({
  dagDiscoverySource: {
    resolveRootVertex: () => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexId: 'build',
        vertexContentInput: {
          $vertexData: 'build',
          $childDiscoveryHints: ['package', 'compile'],
        },
      },
    }),
    resolveChildVertexFromHint: (id) => ({
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexId: id,
        workWaitsForWorkOf: [
          id === 'package' || id === 'compile' ? 'build' : 'compile',
        ],
        // Packaging needs the compiled bundle, including both retained children.
        ...(id === 'package'
          ? { workWaitsForSubgraphCompletionOf: ['compile'] }
          : {}),
        vertexContentInput: {
          $vertexData: id,
          $childDiscoveryHints:
            id === 'compile' ? ['compile-client', 'compile-server'] : [],
        },
      },
    }),
  },
});
traversal.registerVisitorForPhase(Order.ON_WORK_READY, (vertex) => {
  events.push(`work:${vertex.getVertexData()}`);
});
traversal.registerVisitorForPhase(
  Order.ON_SUBGRAPH_COMPLETION_READY,
  (vertex) => {
    events.push(`complete:${vertex.getVertexData()}`);
  },
);
const runner = traversal
  .createIndependentRunnerFromCurrentOptions()
  .runUntilSuspendedOrTerminal();
assert(events.indexOf('work:package') > events.indexOf('complete:compile'));
assert(
  events.indexOf('complete:compile') >
    events.indexOf('complete:compile-client'),
);
assert(
  events.indexOf('complete:compile') >
    events.indexOf('complete:compile-server'),
);
assert.deepEqual(
  runner.captureProgressSnapshot().progressByVertexId.get('package')!
    .unmetSubgraphCompletionMilestoneVertexIds,
  [],
);
console.log(events.join('\n'));
