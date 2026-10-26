import type { DagEvent } from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import type { DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { VertexTypes } from '../src/core/TreeTypeParameters';

type G = VertexTypes<{ task: string }, string>;
type ID = { readonly key: unique symbol };
declare const runner: DagTraversalRunner<G, G, ID>;
declare const asyncRunner: AsyncDagTraversalRunner<G, G, ID>;
function inspect(event: DagEvent<G, ID>) {
  const id: ID = event.vertexId;
  if (event.kind === 'workCompleted') {
    const phase: Order.ON_READY = event.order;
    // @ts-expect-error A work milestone cannot be a completion phase.
    const wrong: Order.ON_COMPLETE = event.order;
    void [phase, wrong];
  } else {
    const phase: Order.ON_COMPLETE = event.order;
    void phase;
  }
  if (event.order === Order.ON_READY) {
    const kind: 'workCompleted' = event.kind;
    void kind;
  }
  void id;
}
for (const event of runner.getIterable()) inspect(event);
async function checkAsync() {
  for await (const event of asyncRunner.getIterable()) inspect(event);
}
declare const legacy: DagEvent<G>;
const unknownId: unknown = legacy.vertexId;
void [checkAsync, unknownId];
