import assert from 'node:assert/strict';
import {
  AsyncDagTraversal,
  DagTraversalOrder as Order,
} from '../src/traversals/dag-traversal';
import type { MakeVertexResult } from '../src/core/TraversableTree';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type ModuleGraph = TreeTypeParameters<string, string>;
const modules = new Map([
  [
    'module:parser',
    { imports: ['module:lexer'], generatedSteps: ['generate-parser'] },
  ],
  ['module:lexer', { imports: [], generatedSteps: [] }],
]);
const moduleRegistry = {
  async find(id: string) {
    return modules.get(id);
  },
};
const generatedStep = (id: string): MakeVertexResult<ModuleGraph> => ({
  vertexId: id,
  vertexContent: { $d: id, $c: [] },
});

async function main() {
  const events: string[] = [];
  const traversal = new AsyncDagTraversal<ModuleGraph>({
    traversableGraph: {
      makeRoot: () => ({
        vertexId: 'app',
        // C includes parser's generated child step. Use dependsOn for W alone.
        dependsOnComplete: ['module:parser'],
        vertexContent: { $d: 'app', $c: [] },
      }),
      makeVertex: generatedStep,
      resolvePrerequisite: async (id) => {
        if (typeof id !== 'string') return undefined;
        const definition = await moduleRegistry.find(id);
        return definition === undefined
          ? undefined
          : {
              vertexId: id,
              dependsOn: definition.imports,
              vertexContent: { $d: id, $c: definition.generatedSteps },
            };
      },
    },
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    events.push(vertex.getData());
  });
  const runner = traversal.makeRunner();
  await runner.run();
  assert.deepEqual(events, [
    'module:lexer',
    'module:parser',
    'generate-parser',
    'app',
  ]);
  const graph = runner.getResolvedGraph();
  const parser = graph.getVertexById('module:parser')!;
  assert.deepEqual(graph.getParentsOf(parser), []);
  assert.deepEqual(graph.getPathsTo(parser), [[parser]]);
  assert.equal(runner.summary().counts.subtreeCompleted, 4);
  console.log(events.join('\n'));
}
void main();
