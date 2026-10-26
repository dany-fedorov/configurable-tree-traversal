import assert from 'node:assert/strict';
import {
  AsyncDagTraversal,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import type { DagVertexFound } from '../src/core/TraversableTree';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type ModuleGraph = VertexTypes<string, string>;
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
const generatedStep = (id: string): DagVertexFound<ModuleGraph> => ({
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
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'app',
          // C includes parser's generated child step. Use dependsOn for W alone.
          dependsOnComplete: ['module:parser'],
          vertexContent: { $data: 'app', $childHints: [] },
        },
      }),
      resolveChild: generatedStep,
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
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
    events.push(vertex.getData());
  });
  const runner = traversal.createRunner();
  await runner.run();
  assert.deepEqual(events, [
    'module:lexer',
    'module:parser',
    'generate-parser',
    'app',
  ]);
  const graph = runner.getResolvedGraph();
  const parser = graph.getVertexRefById('module:parser')!;
  assert.deepEqual(graph.getParentsOf(parser), []);
  assert.deepEqual(graph.getPathsTo(parser), [[parser]]);
  assert.equal(runner.summary().counts.subtreeCompleted, 4);
  console.log(events.join('\n'));
}
void main();
