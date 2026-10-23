import assert from 'node:assert/strict';
import {
  AsyncDagTraversal,
  DagTraversalOrder as Order,
} from '../src/traversals/dag-traversal';
import type { FoundVertexResult } from '../src/core/TraversableTree';
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
const generatedStep = (id: string): FoundVertexResult<ModuleGraph> => ({
  kind: 'found' as const,
  vertex: {
    vertexId: id,
    dependsOn: ['module:parser'],
    vertexContent: { $data: id, $childHints: [] },
  },
});

async function main() {
  const events: string[] = [];
  const traversal = new AsyncDagTraversal<ModuleGraph>({
    traversableGraph: {
      makeRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'app',
          // C includes parser's generated child step. Use dependsOn for W alone.
          dependsOnComplete: ['module:parser'],
          vertexContent: { $data: 'app', $childHints: [] },
        },
      }),
      makeVertex: generatedStep,
      resolvePrerequisite: async (id) => {
        if (typeof id !== 'string') return { kind: 'missing' };
        const definition = await moduleRegistry.find(id);
        return definition === undefined
          ? { kind: 'missing' }
          : {
              kind: 'found' as const,
              vertex: {
                vertexId: id,
                dependsOn: definition.imports,
                vertexContent: {
                  $data: id,
                  $childHints: definition.generatedSteps,
                },
              },
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
