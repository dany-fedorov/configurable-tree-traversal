import {
  type VertexTypes,
  DagTraversal,
  DagVisitorPhase,
  hasSingleStructuralSink,
} from '../src';
import assert from 'node:assert/strict';

type Workflow = VertexTypes<string, string>;
type Task = {
  children: string[];
  dependsOnWork: string[];
};

const tasks: Record<string, Task> = {
  root: { children: ['build', 'test', 'publish'], dependsOnWork: [] },
  build: { children: ['compile-module'], dependsOnWork: ['root'] },
  'compile-module': { children: ['publish'], dependsOnWork: ['build'] },
  test: { children: ['publish'], dependsOnWork: ['root'] },
  publish: { children: [], dependsOnWork: ['compile-module', 'test'] },
};

function resolveTask(id: string) {
  const task = tasks[id];
  if (task === undefined) throw new Error(`Unknown task: ${id}`);
  return {
    kind: 'found' as const,
    vertex: {
      vertexId: id,
      dependsOnWork: task.dependsOnWork,
      vertexContent: { $data: id, $childHints: task.children },
    },
  };
}

const traversal = new DagTraversal<Workflow>({
  traversableGraph: {
    resolveRoot: () => resolveTask('root'),
    resolveChild: resolveTask,
    getVertexIdFromHint: (hint) => ({ vertexId: hint }),
  },
});
const readyTasks: string[] = [];
const completedSubtrees: string[] = [];

traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, (vertex) => {
  const task = vertex.getData();
  if (task === 'publish') {
    assert(readyTasks.includes('compile-module'));
    assert(readyTasks.includes('test'));
    assert(!completedSubtrees.includes('compile-module'));
    assert(!completedSubtrees.includes('test'));
  }
  readyTasks.push(task);
});
traversal.addVisitorFor(DagVisitorPhase.ON_SUBGRAPH_READY, (vertex) => {
  completedSubtrees.push(vertex.getData());
});

const runner = traversal.createRunner().run();
assert.equal(readyTasks[0], 'root');
assert(readyTasks.indexOf('publish') > readyTasks.indexOf('compile-module'));
assert(readyTasks.indexOf('publish') > readyTasks.indexOf('test'));
assert.equal(new Set(readyTasks).size, 5);
assert.equal(completedSubtrees[0], 'publish');
assert.equal(completedSubtrees.at(-1), 'root');
assert.equal(hasSingleStructuralSink(runner.getResolvedGraph()), true);
