import assert from 'node:assert/strict';
import {
  DagTraversal,
  DagTraversalOrder as Order,
} from '../src/traversals/dag-traversal';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type Build = TreeTypeParameters<string, string>;
const events: string[] = [];
const traversal = new DagTraversal<Build>({
  traversableGraph: {
    makeRoot: () => ({
      vertexId: 'build',
      vertexContent: { $d: 'build', $c: ['package', 'compile'] },
    }),
    makeVertex: (id) => ({
      vertexId: id,
      // Packaging needs the compiled bundle, including both retained children.
      ...(id === 'package' ? { dependsOnComplete: ['compile'] } : {}),
      vertexContent: {
        $d: id,
        $c: id === 'compile' ? ['compile-client', 'compile-server'] : [],
      },
    }),
  },
});
traversal.addVisitorFor(Order.ON_READY, (vertex) => {
  events.push(`work:${vertex.getData()}`);
});
traversal.addVisitorFor(Order.ON_COMPLETE, (vertex) => {
  events.push(`complete:${vertex.getData()}`);
});
const runner = traversal.makeRunner().run();
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
