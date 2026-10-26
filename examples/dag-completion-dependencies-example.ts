import assert from 'node:assert/strict';
import {
  DagTraversal,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type Build = VertexTypes<string, string>;
const events: string[] = [];
const traversal = new DagTraversal<Build>({
  traversableGraph: {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexId: 'build',
        vertexContent: { $data: 'build', $childHints: ['package', 'compile'] },
      },
    }),
    resolveChild: (id) => ({
      kind: 'found' as const,
      vertex: {
        vertexId: id,
        dependsOn: [id === 'package' || id === 'compile' ? 'build' : 'compile'],
        // Packaging needs the compiled bundle, including both retained children.
        ...(id === 'package' ? { dependsOnComplete: ['compile'] } : {}),
        vertexContent: {
          $data: id,
          $childHints:
            id === 'compile' ? ['compile-client', 'compile-server'] : [],
        },
      },
    }),
  },
});
traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
  events.push(`work:${vertex.getData()}`);
});
traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (vertex) => {
  events.push(`complete:${vertex.getData()}`);
});
const runner = traversal.createRunner().run();
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
  runner.summary().vertices.get('package')!.unmetCompletePrerequisiteIds,
  [],
);
console.log(events.join('\n'));
