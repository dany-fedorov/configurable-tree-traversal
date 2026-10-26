import assert from 'node:assert/strict';
import {
  AsyncGraphWalk,
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  GraphWalkPhase,
  type AsyncGraphWalkSource,
  type ExecutionInspection,
  type SyncTraversalExecution,
  type AsyncTraversalExecution,
  type TraversalExecutionState,
  type TreeSource,
  type VertexTypes,
} from '../src';

type Code = { kind: 'file'; path: string } | { kind: 'symbol'; name: string };
type Reference = { kind: 'defines' | 'references' };
const source: AsyncGraphWalkSource<Code, Reference, string> = {
  async roots() {
    return [
      {
        vertexId: 'file',
        resolution: {
          kind: 'found',
          data: { kind: 'file', path: 'src/main.ts' },
        },
      },
    ];
  },
  async outgoing(vertex) {
    if (vertex.data.kind === 'symbol') return [];
    // Lazy links wrap targets; materializeWalkSourceFromRecords catalog links instead use { to, data }.
    return [
      {
        target: {
          vertexId: 'symbol',
          resolution: {
            kind: 'found' as const,
            data: { kind: 'symbol' as const, name: 'main' },
          },
        },
        data: { kind: 'defines' as const },
      },
    ];
  },
};
// Both tree/DAG and walking runners fit the common inspection contract.
function snapshot(state: TraversalExecutionState<ExecutionInspection>) {
  return state.inspect();
}
// Keep Phase generic; widening to string would grant unsupported phases.
function runSync<Phase extends string, Event>(
  execution: SyncTraversalExecution<Phase, Event, ExecutionInspection>,
  phase: Phase,
) {
  return execution.run({ emitEvents: [phase] });
}
function runAsync<Phase extends string, Event>(
  execution: AsyncTraversalExecution<Phase, Event, ExecutionInspection>,
  phase: Phase,
) {
  return execution.run({ emitEvents: [phase] });
}
const tree: TreeSource<VertexTypes<string, string>> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: {
      vertexContent: { $data: 'main.ts', $childHints: [] },
    },
  }),
  resolveChild: () => ({ kind: 'omitted' }),
};
const treeRunner = new DepthFirstTreeTraversal({
  traversableTree: tree,
}).createRunner();
assert.equal(snapshot(treeRunner).execution, 'sync');
runSync(treeRunner, DepthFirstPhase.PRE_ORDER);

async function main() {
  const references: string[] = [];
  const runner = new AsyncGraphWalk({ source })
    .addVisitorFor(GraphWalkPhase.EDGE, (event) => {
      // Endpoint discriminants narrow directly; no ID registry or cast is needed.
      if (
        event.source.data.kind === 'file' &&
        event.target.kind === 'found' &&
        event.target.vertex.data.kind === 'symbol'
      ) {
        references.push(
          `${event.source.data.path} ${event.edge.data.kind} ${event.target.vertex.data.name}`,
        );
      }
    })
    .createRunner();
  assert.equal(snapshot(runner).kind, 'graph-walk');
  await runAsync(runner, GraphWalkPhase.EDGE);
  assert.deepEqual(references, ['src/main.ts defines main']);
  assert.deepEqual(runner.summary().outcome, { kind: 'exhausted' });
  console.log('Typed references:', references);
  // A fresh runner can use explicitly narrowed iteration instead of callbacks.
  const iteratorRunner = new AsyncGraphWalk({ source }).createRunner();
  for await (const event of iteratorRunner.iterateEvents({
    emitEvents: [GraphWalkPhase.EDGE],
  })) {
    assert.equal(event.edge.data.kind, 'defines');
    assert.equal(event.source.data.kind, 'file');
  }
}
main().catch((error: unknown) => {
  throw error;
});
