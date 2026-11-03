import {
  type VertexDataAndChildHintTypes,
  DagTraversalBuilder,
  DagVisitorPhase,
  hasExactlyOneResolvedStructuralLeaf,
} from '../src';
import assert from 'node:assert/strict';

type Workflow = VertexDataAndChildHintTypes<string, string>;
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
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: id,
      workWaitsForWorkOf: task.dependsOnWork,
      vertexContentInput: {
        $vertexData: id,
        $childDiscoveryHints: task.children,
      },
    },
  };
}

const traversal = new DagTraversalBuilder<Workflow>({
  dagDiscoverySource: {
    resolveRootVertex: () => resolveTask('root'),
    resolveChildHint: resolveTask,
    tryGetVertexIdentityFromHint: (hint) => ({ vertexId: hint }),
  },
});
const readyTasks: string[] = [];
const completedSubtrees: string[] = [];

traversal.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_WORK_READY,
  (vertex) => {
    const task = vertex.getVertexData();
    if (task === 'publish') {
      assert(readyTasks.includes('compile-module'));
      assert(readyTasks.includes('test'));
      assert(!completedSubtrees.includes('compile-module'));
      assert(!completedSubtrees.includes('test'));
    }
    readyTasks.push(task);
  },
);
traversal.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY,
  (vertex) => {
    completedSubtrees.push(vertex.getVertexData());
  },
);

const runner = traversal
  .createIndependentRunnerFromCurrentOptions()
  .runUntilSuspendedOrTerminal();
assert.equal(readyTasks[0], 'root');
assert(readyTasks.indexOf('publish') > readyTasks.indexOf('compile-module'));
assert(readyTasks.indexOf('publish') > readyTasks.indexOf('test'));
assert.equal(new Set(readyTasks).size, 5);
assert.equal(completedSubtrees[0], 'publish');
assert.equal(completedSubtrees.at(-1), 'root');
assert.equal(
  hasExactlyOneResolvedStructuralLeaf(runner.getLiveResolvedGraphView()),
  true,
);
