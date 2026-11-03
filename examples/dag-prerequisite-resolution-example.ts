import {
  AsyncDagTraversalBuilder,
  DagVisitorPhase as Order,
  type FoundDagSourceVertex,
  type VertexDataAndChildHintTypes,
} from '../src';
import assert from 'node:assert/strict';

type ModuleGraph = VertexDataAndChildHintTypes<string, string>;
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
const generatedStep = (id: string): FoundDagSourceVertex<ModuleGraph> => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexId: id,
    workWaitsForWorkOf: ['module:parser'],
    vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
  },
});

async function main() {
  const events: string[] = [];
  const traversal = new AsyncDagTraversalBuilder<ModuleGraph>({
    dagDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved' as const,
        resolvedVertexInput: {
          vertexId: 'app',
          // C includes parser's generated child step. Use dependsOnWork for W alone.
          workWaitsForSubgraphCompletionOf: ['module:parser'],
          vertexContentInput: { $vertexData: 'app', $childDiscoveryHints: [] },
        },
      }),
      resolveChildHint: generatedStep,
      resolvePrerequisiteByVertexId: async (id) => {
        if (typeof id !== 'string') return { kind: 'missing' };
        const definition = await moduleRegistry.find(id);
        return definition === undefined
          ? { kind: 'missing' }
          : {
              kind: 'vertexResolved' as const,
              resolvedVertexInput: {
                vertexId: id,
                workWaitsForWorkOf: definition.imports,
                vertexContentInput: {
                  $vertexData: id,
                  $childDiscoveryHints: definition.generatedSteps,
                },
              },
            };
      },
    },
  });
  traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, (vertex) => {
    events.push(vertex.getVertexData());
  });
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  assert.deepEqual(events, [
    'module:lexer',
    'module:parser',
    'generate-parser',
    'app',
  ]);
  const graph = runner.getLiveResolvedGraphView();
  const parser = graph.getVertexHandleByIdOrNull('module:parser')!;
  assert.deepEqual(graph.getDistinctStructuralParentHandlesOrNull(parser), []);
  assert.deepEqual(graph.requireAllStructuralAncestorPathsTo(parser), [
    [parser],
  ]);
  assert.equal(
    runner.captureProgressSnapshot().counts.subgraphCompletionCommittedVertices,
    4,
  );
  console.log(events.join('\n'));
}
void main();
