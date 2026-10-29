import type { DagEvent } from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import type { DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type G = VertexTypes<{ task: string }, string>;
type ID = { readonly key: unique symbol };
declare const runner: DagTraversalRunner<G, G, ID>;
declare const asyncRunner: AsyncDagTraversalRunner<G, G, ID>;
function inspect(event: DagEvent<G, ID>) {
  const id: ID = event.vertexId;
  if (event.kind === 'workCompleted') {
    const kind: 'workCompleted' = event.kind;
    // @ts-expect-error Committed work cannot be a subgraph completion.
    const wrong: 'subgraphCompleted' = event.kind;
    void [kind, wrong];
  }
  // @ts-expect-error Committed events have no callback phase field.
  event.phase;
  // @ts-expect-error Removed order metadata is not a public event contract.
  event.order;
  void id;
}
for (const event of runner.iterateEvents()) inspect(event);
async function checkAsync() {
  for await (const event of asyncRunner.iterateEvents()) inspect(event);
}
declare const legacy: DagEvent<G>;
const unknownId: unknown = legacy.vertexId;
void [checkAsync, unknownId];
