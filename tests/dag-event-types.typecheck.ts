import type { DagCommittedMilestoneEvent } from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import type { DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';

type G = VertexDataAndChildHintTypes<{ task: string }, string>;
type ID = { readonly key: unique symbol };
declare const runner: DagTraversalRunner<G, G, ID>;
declare const asyncRunner: AsyncDagTraversalRunner<G, G, ID>;
function captureExecutionSnapshot(event: DagCommittedMilestoneEvent<G, ID>) {
  const id: ID = event.vertexId;
  if (event.eventKind === 'workCompletionCommitted') {
    const kind: 'workCompletionCommitted' = event.eventKind;
    // @ts-expect-error Committed work cannot be a subgraph completion.
    const wrong: 'subgraphCompletionCommitted' = event.eventKind;
    void [kind, wrong];
  }
  // @ts-expect-error Committed events have no callback phase field.
  event.visitorPhase;
  // @ts-expect-error Removed order metadata is not a public event contract.
  event.order;
  void id;
}
for (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
  captureExecutionSnapshot(event);
async function checkAsync() {
  for await (const event of asyncRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
    captureExecutionSnapshot(event);
}
declare const legacy: DagCommittedMilestoneEvent<G>;
const unknownId: unknown = legacy.vertexId;
void [checkAsync, unknownId];
