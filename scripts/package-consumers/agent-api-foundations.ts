import {
  graphFrom,
  forestFrom,
  graphFromAsync,
  forestFromAsync,
  prepareDag,
  prepareDagAsync,
  coordinateDag,
  coordinateDagAsync,
  filterDagVisitor,
  filterAsyncDagVisitor,
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder,
  DEFER_READY,
} from 'configurable-tree-traversal';
import type {
  CollectionSource,
  TreeTypeParameters,
  PreparedDag,
  PrepareDagResult,
  DagEvent,
  DagWorkTicket,
  DagCoordinator,
  AsyncDagCoordinator,
  DagVisitorOptions,
} from 'configurable-tree-traversal';
import * as sourceSubpath from 'configurable-tree-traversal/sources/index';
import { graphFrom as explicitGraphFrom } from 'configurable-tree-traversal/sources/graphFrom.js';
import type { CollectionSource as SubpathSource } from 'configurable-tree-traversal/sources/types';
import type {
  PreparedDag as SubpathPreparedDag,
  DagEvent as SubpathEvent,
  DagWorkTicket as SubpathTicket,
} from 'configurable-tree-traversal/traversals/dag-traversal';
import cjs = require('configurable-tree-traversal');
import dagCjs = require('configurable-tree-traversal/traversals/dag-traversal');

type ID = { readonly key: unique symbol };
type Task = { kind: 'task'; id: ID; label: string; requires: readonly ID[] };
type Group = {
  kind: 'group';
  id: ID;
  children: readonly Item[];
  requires: readonly ID[];
};
type Item = Task | Group;
type T = TreeTypeParameters<Item, ID>;
declare const items: readonly Item[];
const source = graphFrom(items, {
  id: (item) => item.id,
  dependencies: (item) => item.requires,
});
const sourceIdentity: CollectionSource<Item, ID> = source;
const subpathIdentity: SubpathSource<Item, ID> = sourceIdentity;
const cjsIdentity: cjs.CollectionSource<Item, ID> = subpathIdentity;
const factoryIdentity: typeof graphFrom = sourceSubpath.graphFrom;
const explicitIdentity: typeof cjs.graphFrom = explicitGraphFrom;
const forest: CollectionSource<Item, ID> = forestFrom(items, {
  id: (item) => item.id,
  children: (item) => (item.kind === 'group' ? item.children : []),
});
const asyncSource: Promise<CollectionSource<Item, ID>> = graphFromAsync(items, {
  id: async (item) => item.id,
  dependencies: async (item) => item.requires,
});
const asyncForest: Promise<CollectionSource<Item, ID>> = forestFromAsync(
  items,
  {
    id: async (item) => item.id,
    children: async (item) => (item.kind === 'group' ? item.children : []),
  },
);

const prepared: PrepareDagResult<Item, ID> = prepareDag(source);
if (prepared.kind === 'valid') {
  const dag: PreparedDag<Item, ID> = prepared.dag;
  const subpath: SubpathPreparedDag<Item, ID> = dag;
  const required: cjs.PreparedDag<Item, ID> = subpath;
  const session: DagCoordinator<ID> = required.createSession();
  const boundary = session.advance();
  if (boundary.kind === 'awaitingSettlement') {
    const ticket: DagWorkTicket<ID> = boundary.frontier[0]!;
    const subpathTicket: SubpathTicket<ID> = ticket;
    const requiredTicket: dagCjs.DagWorkTicket<ID> = subpathTicket;
    const id: ID = requiredTicket.vertexId;
    session.complete(requiredTicket);
    // @ts-expect-error Tickets retain their exact ID domain.
    const wrong: DagWorkTicket<string> = ticket;
    // @ts-expect-error Tickets cannot be constructed from public fields.
    const forged: DagWorkTicket<ID> = { vertexId: id };
    // @ts-expect-error Ticket identity is readonly.
    ticket.vertexId = id;
    void [wrong, forged];
  }
  const coordinator: DagCoordinator<ID> = coordinateDag(
    dag.createRunner({ workCompletion: 'externalSettlement' }),
  );
  const vertex = dag.vertices[0]!;
  const data: Item = vertex.data;
  const children: readonly ID[] = vertex.children;
  // @ts-expect-error Definitions own their topology.
  dag.createRunner({ syntheticRoot: undefined });
  // @ts-expect-error Session seeds preserve the inferred ID domain.
  dag.createSession({ completedWork: new Set(['wrong']) });
  // @ts-expect-error Exposed vertex descriptions are readonly.
  vertex.children.push(vertex.vertexId);
  void [coordinator, data, children];
} else {
  const missing: readonly ID[] = prepared.diagnostics.unknownPrerequisiteIds;
  void missing;
}

function inspect(event: DagEvent<T, ID>) {
  const subpath: SubpathEvent<T, ID> = event;
  const required: cjs.DagEvent<T, ID> = subpath;
  const id: ID = required.vertexId;
  if (event.kind === 'workCompleted') {
    const phase: DagTraversalOrder.ON_READY = event.order;
    // @ts-expect-error Committed work events cannot have completion order.
    const wrong: DagTraversalOrder.ON_COMPLETE = event.order;
    void [phase, wrong];
  } else {
    const phase: DagTraversalOrder.ON_COMPLETE = event.order;
    void phase;
  }
  void id;
}

const isTask = (data: Item): data is Task => data.kind === 'task';
const traversal = new DagTraversal(source);
traversal.addVisitorFor(
  DagTraversalOrder.ON_READY,
  filterDagVisitor(isTask, (data, options) => {
    const narrowed: Task = data;
    const context: DagVisitorOptions<T, T, DagTraversalOrder.ON_READY, ID> =
      options;
    // @ts-expect-error A type guard narrows data, not the heterogeneous graph.
    const invalid: Task = options.vertexRef.unref().getData();
    void [narrowed, context, invalid];
    return DEFER_READY;
  }),
);
traversal.addVisitorFor(
  DagTraversalOrder.ON_COMPLETE,
  // @ts-expect-error Completion phase cannot defer work through a filter.
  filterDagVisitor(isTask, () => DEFER_READY),
);
for (const event of traversal.makeRunner().getIterable()) inspect(event);

async function checkAsync() {
  const result: PrepareDagResult<Item, ID> = await prepareDagAsync(
    await asyncSource,
  );
  if (result.kind !== 'valid') return;
  const session: AsyncDagCoordinator<ID> = await result.dag.createAsyncSession({
    concurrency: 2,
  });
  const coordinator: AsyncDagCoordinator<ID> = coordinateDagAsync(
    await result.dag.createAsyncRunner({
      workCompletion: 'externalSettlement',
    }),
  );
  await session.advance();
  await coordinator.advance();
  const asyncTraversal = new AsyncDagTraversal(await asyncForest);
  asyncTraversal.addVisitorFor(
    DagTraversalOrder.ON_READY,
    filterAsyncDagVisitor(isTask, async (data, options) => {
      const task: Task = data;
      const context: DagVisitorOptions<T, T, DagTraversalOrder.ON_READY, ID> =
        options;
      void [task, context];
    }),
  );
  for await (const event of asyncTraversal.makeRunner().getIterable())
    inspect(event);
}

// @ts-expect-error Graph selectors accept IDs as structural children.
graphFrom(items, { id: (item) => item.id, children: () => items });
// @ts-expect-error Preparation cannot accept completed execution facts.
prepareDag({ ...source, completedWork: new Set<ID>() });
void [cjsIdentity, factoryIdentity, explicitIdentity, forest, checkAsync];

function inspectSession(session: DagCoordinator<ID> | AsyncDagCoordinator<ID>) {
  const state: import('configurable-tree-traversal').TraversalExecutionState =
    session;
  const inspection: import('configurable-tree-traversal').DagInspection<ID> =
    session.inspectDag();
  const fatal: (ticket: DagWorkTicket<ID>, error: unknown) => unknown =
    session.failTraversal;
  const ErrorConstructor: typeof cjs.DagDiscoveryCycleError =
    dagCjs.DagDiscoveryCycleError;
  const error = new ErrorConstructor<ID>([]);
  const witness: readonly ID[] = error.vertexIds;
  void [state, inspection, fatal, witness];
}
void inspectSession;
