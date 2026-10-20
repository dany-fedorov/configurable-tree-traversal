import assert from 'node:assert/strict';
import type { TreeTypeParameters } from '../src/core';
import {
  DagTraversal,
  DagTraversalOrder,
  hasSingleSink,
} from '../src/traversals/dag-traversal';

type Workflow = TreeTypeParameters<string, string>;
type Task = {
  children: string[];
  dependsOn: string[];
};

const tasks: Record<string, Task> = {
  root: { children: ['build', 'test', 'publish'], dependsOn: [] },
  build: { children: ['compile-module'], dependsOn: ['root'] },
  'compile-module': { children: ['publish'], dependsOn: ['build'] },
  test: { children: ['publish'], dependsOn: ['root'] },
  publish: { children: [], dependsOn: ['compile-module', 'test'] },
};

function resolveTask(id: string) {
  const task = tasks[id];
  if (task === undefined) throw new Error(`Unknown task: ${id}`);
  return {
    vertexId: id,
    dependsOn: task.dependsOn,
    vertexContent: { $d: id, $c: task.children },
  };
}

const traversal = new DagTraversal<Workflow>({
  traversableGraph: {
    makeRoot: () => resolveTask('root'),
    makeVertex: resolveTask,
    getVertexIdFromHint: (hint) => ({ vertexId: hint }),
  },
});
const readyTasks: string[] = [];
const completedSubtrees: string[] = [];

traversal.addVisitorFor(DagTraversalOrder.ON_READY, (vertex) => {
  const task = vertex.getData();
  if (task === 'publish') {
    assert(readyTasks.includes('compile-module'));
    assert(readyTasks.includes('test'));
    assert(!completedSubtrees.includes('compile-module'));
    assert(!completedSubtrees.includes('test'));
  }
  readyTasks.push(task);
});
traversal.addVisitorFor(DagTraversalOrder.ON_COMPLETE, (vertex) => {
  completedSubtrees.push(vertex.getData());
});

const runner = traversal.makeRunner().run();
assert.equal(readyTasks[0], 'root');
assert(readyTasks.indexOf('publish') > readyTasks.indexOf('compile-module'));
assert(readyTasks.indexOf('publish') > readyTasks.indexOf('test'));
assert.equal(new Set(readyTasks).size, 5);
assert.equal(completedSubtrees[0], 'publish');
assert.equal(completedSubtrees.at(-1), 'root');
assert.equal(hasSingleSink(runner.getResolvedGraph()), true);
