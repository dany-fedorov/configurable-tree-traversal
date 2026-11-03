import {
  AsyncGraphWalkBuilder,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  GraphWalkObservationKind,
  type AsyncGraphWalkDiscoverySource,
  type TraversalEventKindForVisitorPhase,
  type SyncTraversalExecution,
  type AsyncTraversalExecution,
  type TraversalExecutionState,
  type TreeDiscoverySource,
  type VertexDataAndChildHintTypes,
} from '../src';
import assert from 'node:assert/strict';

type Code = { kind: 'file'; path: string } | { kind: 'symbol'; name: string };
type Reference = { kind: 'defines' | 'references' };
const source: AsyncGraphWalkDiscoverySource<Code, Reference, string> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  async enumerateRootTargets() {
    return [
      {
        kind: 'inlineResolution' as const,
        vertexId: 'file',
        resolutionIfNotPreviouslyAdmitted: {
          kind: 'found',
          vertexData: { kind: 'file', path: 'src/main.ts' },
        },
      },
    ];
  },
  async enumerateOutgoingLinks(vertex) {
    if (vertex.vertexData.kind === 'symbol') return [];
    // Lazy links wrap targets; materializeWalkSourceFromRecords catalog links instead use { to, data }.
    return [
      {
        targetToResolveOnAdmission: {
          kind: 'inlineResolution' as const,
          vertexId: 'symbol',
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found' as const,
            vertexData: { kind: 'symbol' as const, name: 'main' },
          },
        },
        edgeData: { kind: 'defines' as const },
      },
    ];
  },
};
// Both tree/DAG and walking runners fit the common inspection contract.
function snapshot(state: TraversalExecutionState) {
  return state.captureExecutionSnapshot();
}
// Keep Phase generic; widening to string would grant unsupported phases.
function runSync<Phase extends string, Event>(
  execution: SyncTraversalExecution<Phase, Event>,
  eventKind: TraversalEventKindForVisitorPhase<Phase>,
) {
  return execution.runUntilSuspendedOrTerminal({
    deliveredEventKinds: [eventKind],
  });
}
function runAsync<Phase extends string, Event>(
  execution: AsyncTraversalExecution<Phase, Event>,
  eventKind: TraversalEventKindForVisitorPhase<Phase>,
) {
  return execution.runUntilSuspendedOrTerminal({
    deliveredEventKinds: [eventKind],
  });
}
const tree: TreeDiscoverySource<VertexDataAndChildHintTypes<string, string>> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'main.ts', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
};
const treeRunner = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: tree,
}).createIndependentRunnerFromCurrentOptions();
assert.equal(snapshot(treeRunner).callbackExecutionMode, 'sync');
runSync(treeRunner, DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION);

async function main() {
  const references: string[] = [];
  const runner = new AsyncGraphWalkBuilder({ graphWalkDiscoverySource: source })
    .addVisitorForObservationKind(
      GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
      (event) => {
        // Endpoint discriminants narrow directly; no ID registry or cast is needed.
        if (
          event.fromVertex.vertexData.kind === 'file' &&
          event.targetResolution.kind === 'found' &&
          event.targetResolution.vertex.vertexData.kind === 'symbol'
        ) {
          references.push(
            `${event.fromVertex.vertexData.path} ${event.edge.edgeData.kind} ${event.targetResolution.vertex.vertexData.name}`,
          );
        }
      },
    )
    .createIndependentRunnerFromCurrentOptions();
  assert.equal(snapshot(runner).traversalAlgorithm, 'graph-walk');
  await runAsync(runner, GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE);
  assert.deepEqual(references, ['src/main.ts defines main']);
  assert.deepEqual(runner.captureProgressSnapshot().terminalOutcome, {
    kind: 'sourceRoutesExhausted',
  });
  console.log('Typed references:', references);
  // A fresh runner can use explicitly narrowed iteration instead of callbacks.
  const iteratorRunner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  for await (const event of iteratorRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: [GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE],
    },
  )) {
    assert.equal(event.edge.edgeData.kind, 'defines');
    assert.equal(event.fromVertex.vertexData.kind, 'file');
  }
}
main().catch((error: unknown) => {
  throw error;
});
