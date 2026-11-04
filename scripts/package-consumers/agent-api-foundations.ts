import { TraversalVisitorCommandName as VisitorCommand } from 'configurable-tree-traversal';
import {
  materializeMultiEntryDagInputFromRecordCatalog,
  materializeDagInputFromRootRecords,
  materializeMultiEntryDagInputFromRecordCatalogAsync,
  materializeDagInputFromRootRecordsAsync,
  discoverValidateAndCaptureDag,
  discoverValidateAndCaptureDagAsync,
  bindDagExternalWorkSession,
  bindAsyncDagExternalWorkSession,
  createConditionalDagDataVisitor,
  createConditionalAsyncDagDataVisitor,
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagVisitorPhase,
} from 'configurable-tree-traversal';
import type {
  MaterializedDagTraversalInput,
  VertexDataAndChildHintTypes,
  ValidatedReusableDagTopology,
  DagTopologyValidationResult,
  DagCommittedMilestoneEvent,
  DagWorkSettlementTicket,
  DagExternalWorkSession,
  AsyncDagExternalWorkSession,
  DagVisitorContext,
} from 'configurable-tree-traversal';
import * as sourceSubpath from 'configurable-tree-traversal/dag-input-materialization';
import { materializeMultiEntryDagInputFromRecordCatalog as subpathMaterializeRecords } from 'configurable-tree-traversal/dag-input-materialization';
import type { MaterializedDagTraversalInput as SubpathSource } from 'configurable-tree-traversal/dag-input-materialization';
import type {
  ValidatedReusableDagTopology as SubpathPreparedDag,
  DagCommittedMilestoneEvent as SubpathEvent,
  DagWorkSettlementTicket as SubpathTicket,
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
type T = VertexDataAndChildHintTypes<Item, ID>;
declare const items: readonly Item[];
const source = materializeMultiEntryDagInputFromRecordCatalog(items, {
  selectVertexId: (item) => item.id,
  selectWorkPrerequisiteVertexIds: (item) => item.requires,
});
const sourceIdentity: MaterializedDagTraversalInput<Item, ID> = source;
const subpathIdentity: SubpathSource<Item, ID> = sourceIdentity;
const cjsIdentity: cjs.MaterializedDagTraversalInput<Item, ID> =
  subpathIdentity;
const factoryIdentity: typeof materializeMultiEntryDagInputFromRecordCatalog =
  sourceSubpath.materializeMultiEntryDagInputFromRecordCatalog;
const explicitIdentity: typeof cjs.materializeMultiEntryDagInputFromRecordCatalog =
  subpathMaterializeRecords;
const forest: MaterializedDagTraversalInput<Item, ID> =
  materializeDagInputFromRootRecords(items, {
    selectVertexId: (item) => item.id,
    selectStructuralChildRecords: (item) =>
      item.kind === 'group' ? item.children : [],
  });
const asyncSource: Promise<MaterializedDagTraversalInput<Item, ID>> =
  materializeMultiEntryDagInputFromRecordCatalogAsync(items, {
    selectVertexId: async (item) => item.id,
    selectWorkPrerequisiteVertexIds: async (item) => item.requires,
  });
const asyncForest: Promise<MaterializedDagTraversalInput<Item, ID>> =
  materializeDagInputFromRootRecordsAsync(items, {
    selectVertexId: async (item) => item.id,
    selectStructuralChildRecords: async (item) =>
      item.kind === 'group' ? item.children : [],
  });

const prepared: DagTopologyValidationResult<Item, ID> =
  discoverValidateAndCaptureDag(source);
if (prepared.kind === 'valid') {
  const dag: ValidatedReusableDagTopology<Item, ID> =
    prepared.validatedTopology;
  const subpath: SubpathPreparedDag<Item, ID> = dag;
  const required: cjs.ValidatedReusableDagTopology<Item, ID> = subpath;
  const session: DagExternalWorkSession<ID> =
    required.createExternalWorkSession();
  const boundary = session.runUntilWorkBoundary();
  if (boundary.kind === 'awaitingSettlement') {
    const ticket: DagWorkSettlementTicket<ID> =
      boundary.workSettlementTickets[0]!;
    const subpathTicket: SubpathTicket<ID> = ticket;
    const requiredTicket: dagCjs.DagWorkSettlementTicket<ID> = subpathTicket;
    const id: ID = requiredTicket.vertexId;
    session.acceptCompletedWork(requiredTicket);
    // @ts-expect-error A spread loses nominal ticket ownership.
    session.acceptCompletedWork({ ...requiredTicket });
    // @ts-expect-error A copied ticket cannot authorize fatal settlement either.
    session.failTraversal({ ...ticket }, undefined);
    // @ts-expect-error Fatal settlement exposes only the canonical method.
    session.fail(requiredTicket, undefined);
    // @ts-expect-error Tickets retain their exact ID domain.
    const wrong: DagWorkSettlementTicket<string> = ticket;
    // @ts-expect-error Tickets cannot be constructed from public fields.
    const forged: DagWorkSettlementTicket<ID> = { vertexId: id };
    // @ts-expect-error Ticket identity is readonly.
    ticket.vertexId = id;
    void [wrong, forged];
  }
  const coordinator: DagExternalWorkSession<ID> = bindDagExternalWorkSession(
    dag.createIndependentRunnerFromValidatedTopology({
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }),
  );
  const vertex = dag.liveVertexSummaries[0]!;
  const data: Item = vertex.data;
  const children: readonly ID[] = vertex.liveStructuralChildVertexIds;
  // @ts-expect-error Definitions own their topology.
  dag.createIndependentRunnerFromValidatedTopology({
    sourceRootIsHiddenEntryHolder: undefined,
  });
  dag.createExternalWorkSession({
    // @ts-expect-error Session seeds preserve the inferred ID domain.
    acceptedCompletedWorkVertexIds: new Set(['wrong']),
  });
  // @ts-expect-error Exposed vertex descriptions are readonly.
  vertex.liveStructuralChildVertexIds.push(vertex.vertexId);
  void [coordinator, data, children];
} else {
  for (const issue of prepared.issues) {
    if (issue.kind === 'discoveredStructuralChildCycleWitness') {
      const witness: readonly ID[] = issue.cycleWitnessVertexIds;
      void witness;
    }
    if (issue.kind === 'milestoneDependencyStall') {
      const missing: readonly ID[] =
        issue.diagnostics.unresolvedPrerequisiteVertexIds;
      void missing;
    }
  }
  // @ts-expect-error Preparation invalidity has no top-level diagnostics alias.
  prepared.diagnostics;
}

function captureExecutionSnapshot(event: DagCommittedMilestoneEvent<T, ID>) {
  const subpath: SubpathEvent<T, ID> = event;
  const required: cjs.DagCommittedMilestoneEvent<T, ID> = subpath;
  const id: ID = required.vertexId;
  if (event.eventKind === 'workCompletionCommitted') {
    const kind: 'workCompletionCommitted' = event.eventKind;
    // @ts-expect-error Committed work cannot be subgraph completion.
    const wrong: 'subgraphCompletionCommitted' = event.eventKind;
    void [kind, wrong];
  }
  // @ts-expect-error Committed events have no callback phase metadata.
  event.visitorPhase;
  // @ts-expect-error Removed order metadata is not a public event contract.
  event.order;
  void id;
}

const isTask = (data: Item): data is Task => data.kind === 'task';
const traversal = new DagTraversalBuilder(source);
traversal.registerVisitorForPhase(
  DagVisitorPhase.ON_WORK_READY,
  createConditionalDagDataVisitor(isTask, (data, options) => {
    const narrowed: Task = data;
    const context: DagVisitorContext<T, T, DagVisitorPhase.ON_WORK_READY, ID> =
      options;
    // @ts-expect-error A type guard narrows data, not the heterogeneous graph.
    const invalid: Task = options.vertexHandle
      .getCurrentVertexView()
      .getVertexData();
    void [narrowed, context, invalid];
    return {
      commands: [
        {
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    };
  }),
);
traversal.registerVisitorForPhase(
  DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY,
  createConditionalDagDataVisitor(isTask, () => ({
    commands: [
      {
        // @ts-expect-error Completion phase cannot defer work through a filter.
        commandName:
          VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
      },
    ],
  })),
);
for (const event of traversal
  .createIndependentRunnerFromCurrentOptions()
  .runAndIterateObservationEventsUntilSuspendedOrTerminal())
  captureExecutionSnapshot(event);

async function checkAsync() {
  const result: DagTopologyValidationResult<Item, ID> =
    await discoverValidateAndCaptureDagAsync(await asyncSource);
  if (result.kind !== 'valid') return;
  const session: AsyncDagExternalWorkSession<ID> =
    await result.validatedTopology.createAsyncExternalWorkSession({
      maxConcurrentCallbackInvocations: 2,
    });
  const coordinator: AsyncDagExternalWorkSession<ID> =
    bindAsyncDagExternalWorkSession(
      await result.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology(
        {
          workCompletionPolicy: 'requireExternalWorkSettlement',
        },
      ),
    );
  await session.runUntilWorkBoundary();
  await coordinator.runUntilWorkBoundary();
  const asyncTraversal = new AsyncDagTraversalBuilder(await asyncForest);
  asyncTraversal.registerVisitorForPhase(
    DagVisitorPhase.ON_WORK_READY,
    createConditionalAsyncDagDataVisitor(isTask, async (data, options) => {
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
  for await (const event of asyncTraversal
    .createIndependentRunnerFromCurrentOptions()
    .runAndIterateObservationEventsUntilSuspendedOrTerminal())
    captureExecutionSnapshot(event);
}

materializeMultiEntryDagInputFromRecordCatalog(items, {
  // @ts-expect-error Graph selectors accept IDs as structural children.
  selectVertexId: (item) => item.id,
  selectStructuralChildVertexIds: () => items,
});
discoverValidateAndCaptureDag({
  ...source,
  // @ts-expect-error Preparation cannot accept completed execution facts.
  acceptedCompletedWorkVertexIds: new Set<ID>(),
});
void [cjsIdentity, factoryIdentity, explicitIdentity, forest, checkAsync];

function inspectSession(
  session: DagExternalWorkSession<ID> | AsyncDagExternalWorkSession<ID>,
) {
  const state: import('configurable-tree-traversal').TraversalExecutionState =
    session;
  const inspection: import('configurable-tree-traversal').DagMilestoneSnapshot<ID> =
    session.captureMilestoneSnapshot();
  const fatal: (
    ticket: DagWorkSettlementTicket<ID>,
    error: unknown,
  ) => unknown = session.failTraversal;
  const ErrorConstructor: typeof cjs.DagStructuralDiscoveryCycleError =
    dagCjs.DagStructuralDiscoveryCycleError;
  const error = new ErrorConstructor<ID>([]);
  const witness: readonly ID[] = error.cycleWitnessVertexIds;
  void [state, inspection, fatal, witness];
}
void inspectSession;

// @ts-expect-error Work tickets are type-only, with no constructor value.
new cjs.DagWorkSettlementTicket();
// @ts-expect-error DAG-subpath tickets are also type-only.
new dagCjs.DagWorkSettlementTicket();
// @ts-expect-error The namespace does not expose a ticket constructor.
new cjs.dagTraversal.DagWorkSettlementTicket();
new DagTraversalBuilder({
  ...source,
  workCompletionPolicy: 'afterWorkReadyVisitorChain',
});
// @ts-expect-error The retired completion literal is not accepted.
new DagTraversalBuilder({ ...source, workCompletionPolicy: 'visitorReturn' });
const exactProgress = new DagTraversalBuilder(source)
  .createIndependentRunnerFromCurrentOptions()
  .captureProgressSnapshot()
  .progressByVertexId.get(items[0]!.id)!;
const exactWork: readonly ID[] = exactProgress.unmetWorkMilestoneVertexIds;
const exactCompletion: readonly ID[] =
  exactProgress.unmetSubgraphCompletionMilestoneVertexIds;
void [exactWork, exactCompletion];
