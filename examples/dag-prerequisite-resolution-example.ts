import {
  AsyncDagTraversal,
  DagVisitorPhase as Order,
  type DagVertexFound,
  type VertexTypes,
} from '../src';
import assert from 'node:assert/strict';

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
    dependsOnWork: ['module:parser'],
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
          // C includes parser's generated child step. Use dependsOnWork for W alone.
          dependsOnSubgraphCompletion: ['module:parser'],
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
                dependsOnWork: definition.imports,
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
  const graph = runner.getResolvedGraphView();
  const parser = graph.getVertexRefById('module:parser')!;
  assert.deepEqual(graph.getParentsOf(parser), []);
  assert.deepEqual(graph.getPathsTo(parser), [[parser]]);
  assert.equal(runner.summary().counts.subgraphCompleted, 4);
  console.log(events.join('\n'));
}
void main();
