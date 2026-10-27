import { TraversalVisitorCommandName as VisitorCommand } from 'configurable-tree-traversal';
import {
  materializeDagSourceFromRecords,
  materializeDagSourceFromRoots,
  materializeDagSourceFromRecordsAsync,
  materializeDagSourceFromRootsAsync,
  prepareDag,
  prepareDagAsync,
  createDagWorkSession,
  createAsyncDagWorkSession,
  filterDagDataVisitor,
  filterAsyncDagDataVisitor,
  DagTraversal,
  AsyncDagTraversal,
  DagVisitorPhase,
} from 'configurable-tree-traversal';
import type {
  MaterializedDagSource,
  VertexTypes,
  PreparedDag,
  PrepareDagResult,
  DagEvent,
  DagWorkTicket,
  DagWorkSession,
  AsyncDagWorkSession,
  DagVisitorContext,
} from 'configurable-tree-traversal';
import * as sourceSubpath from 'configurable-tree-traversal/sources';
import { materializeDagSourceFromRecords as subpathMaterializeRecords } from 'configurable-tree-traversal/sources';
import type { MaterializedDagSource as SubpathSource } from 'configurable-tree-traversal/sources';
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
type T = VertexTypes<Item, ID>;
declare const items: readonly Item[];
const source = materializeDagSourceFromRecords(items, {
  id: (item) => item.id,
  dependsOnWork: (item) => item.requires,
});
const sourceIdentity: MaterializedDagSource<Item, ID> = source;
const subpathIdentity: SubpathSource<Item, ID> = sourceIdentity;
const cjsIdentity: cjs.MaterializedDagSource<Item, ID> = subpathIdentity;
const factoryIdentity: typeof materializeDagSourceFromRecords =
  sourceSubpath.materializeDagSourceFromRecords;
const explicitIdentity: typeof cjs.materializeDagSourceFromRecords =
  subpathMaterializeRecords;
const forest: MaterializedDagSource<Item, ID> = materializeDagSourceFromRoots(
  items,
  {
    id: (item) => item.id,
    children: (item) => (item.kind === 'group' ? item.children : []),
  },
);
const asyncSource: Promise<MaterializedDagSource<Item, ID>> =
  materializeDagSourceFromRecordsAsync(items, {
    id: async (item) => item.id,
    dependsOnWork: async (item) => item.requires,
  });
const asyncForest: Promise<MaterializedDagSource<Item, ID>> =
  materializeDagSourceFromRootsAsync(items, {
    id: async (item) => item.id,
    children: async (item) => (item.kind === 'group' ? item.children : []),
  });

const prepared: PrepareDagResult<Item, ID> = prepareDag(source);
if (prepared.kind === 'valid') {
  const dag: PreparedDag<Item, ID> = prepared.dag;
  const subpath: SubpathPreparedDag<Item, ID> = dag;
  const required: cjs.PreparedDag<Item, ID> = subpath;
  const session: DagWorkSession<ID> = required.createWorkSession();
  const boundary = session.advance();
  if (boundary.kind === 'awaitingSettlement') {
    const ticket: DagWorkTicket<ID> = boundary.workTickets[0]!;
    const subpathTicket: SubpathTicket<ID> = ticket;
    const requiredTicket: dagCjs.DagWorkTicket<ID> = subpathTicket;
    const id: ID = requiredTicket.vertexId;
    session.completeWork(requiredTicket);
    // @ts-expect-error Fatal settlement exposes only the canonical method.
    session.fail(requiredTicket, undefined);
    // @ts-expect-error Tickets retain their exact ID domain.
    const wrong: DagWorkTicket<string> = ticket;
    // @ts-expect-error Tickets cannot be constructed from public fields.
    const forged: DagWorkTicket<ID> = { vertexId: id };
    // @ts-expect-error Ticket identity is readonly.
    ticket.vertexId = id;
    void [wrong, forged];
  }
  const coordinator: DagWorkSession<ID> = createDagWorkSession(
    dag.createRunner({ workCompletion: 'externalSettlement' }),
  );
  const vertex = dag.vertices[0]!;
  const data: Item = vertex.data;
  const children: readonly ID[] = vertex.children;
  // @ts-expect-error Definitions own their topology.
  dag.createRunner({ syntheticRoot: undefined });
  // @ts-expect-error Session seeds preserve the inferred ID domain.
  dag.createWorkSession({ completedWork: new Set(['wrong']) });
  // @ts-expect-error Exposed vertex descriptions are readonly.
  vertex.children.push(vertex.vertexId);
  void [coordinator, data, children];
} else {
  for (const issue of prepared.issues) {
    if (issue.kind === 'milestone') {
      const missing: readonly ID[] = issue.diagnostics.unknownPrerequisiteIds;
      void missing;
    }
  }
  // @ts-expect-error Preparation invalidity has no top-level diagnostics alias.
  prepared.diagnostics;
}

function inspect(event: DagEvent<T, ID>) {
  const subpath: SubpathEvent<T, ID> = event;
  const required: cjs.DagEvent<T, ID> = subpath;
  const id: ID = required.vertexId;
  if (event.kind === 'workCompleted') {
    const kind: 'workCompleted' = event.kind;
    // @ts-expect-error Committed work cannot be subgraph completion.
    const wrong: 'subgraphCompleted' = event.kind;
    void [kind, wrong];
  }
  // @ts-expect-error Committed events have no callback phase metadata.
  event.phase;
  // @ts-expect-error Removed order metadata is not a public event contract.
  event.order;
  void id;
}

const isTask = (data: Item): data is Task => data.kind === 'task';
const traversal = new DagTraversal(source);
traversal.addVisitorFor(
  DagVisitorPhase.ON_WORK_READY,
  filterDagDataVisitor(isTask, (data, options) => {
    const narrowed: Task = data;
    const context: DagVisitorContext<T, T, DagVisitorPhase.ON_WORK_READY, ID> =
      options;
    // @ts-expect-error A type guard narrows data, not the heterogeneous graph.
    const invalid: Task = options.vertexRef.getValue().getData();
    void [narrowed, context, invalid];
    return {
      commands: [
        { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
      ],
    };
  }),
);
traversal.addVisitorFor(
  DagVisitorPhase.ON_SUBGRAPH_READY,
  filterDagDataVisitor(isTask, () => ({
    // @ts-expect-error Completion phase cannot defer work through a filter.
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
  })),
);
for (const event of traversal.createRunner().iterateEvents()) inspect(event);

async function checkAsync() {
  const result: PrepareDagResult<Item, ID> = await prepareDagAsync(
    await asyncSource,
  );
  if (result.kind !== 'valid') return;
  const session: AsyncDagWorkSession<ID> =
    await result.dag.createAsyncWorkSession({
      concurrency: 2,
    });
  const coordinator: AsyncDagWorkSession<ID> = createAsyncDagWorkSession(
    await result.dag.createAsyncRunner({
      workCompletion: 'externalSettlement',
    }),
  );
  await session.advance();
  await coordinator.advance();
  const asyncTraversal = new AsyncDagTraversal(await asyncForest);
  asyncTraversal.addVisitorFor(
    DagVisitorPhase.ON_WORK_READY,
    filterAsyncDagDataVisitor(isTask, async (data, options) => {
      const task: Task = data;
      const context: DagVisitorContext<
        T,
        T,
        DagVisitorPhase.ON_WORK_READY,
        ID
      > = options;
      void [task, context];
    }),
  );
  for await (const event of asyncTraversal.createRunner().iterateEvents())
    inspect(event);
}

materializeDagSourceFromRecords(items, {
  // @ts-expect-error Graph selectors accept IDs as structural children.
  id: (item) => item.id,
  children: () => items,
});
// @ts-expect-error Preparation cannot accept completed execution facts.
prepareDag({ ...source, completedWork: new Set<ID>() });
void [cjsIdentity, factoryIdentity, explicitIdentity, forest, checkAsync];

function inspectSession(session: DagWorkSession<ID> | AsyncDagWorkSession<ID>) {
  const state: import('configurable-tree-traversal').TraversalExecutionState =
    session;
  const inspection: import('configurable-tree-traversal').DagMilestoneSnapshot<ID> =
    session.inspectMilestones();
  const fatal: (ticket: DagWorkTicket<ID>, error: unknown) => unknown =
    session.failTraversal;
  const ErrorConstructor: typeof cjs.DagDiscoveryCycleError =
    dagCjs.DagDiscoveryCycleError;
  const error = new ErrorConstructor<ID>([]);
  const witness: readonly ID[] = error.vertexIds;
  void [state, inspection, fatal, witness];
}
void inspectSession;
