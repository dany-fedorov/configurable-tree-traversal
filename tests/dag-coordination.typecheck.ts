import type {
  TraversalExecutionState,
  TraversalExecutionSnapshot,
  DagMilestoneSnapshot,
} from '../src';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import type { DagProgressSnapshot } from '../src/traversals/dag-traversal/lib/DagProgress';
import type { DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import {
  bindDagExternalWorkSession,
  bindAsyncDagExternalWorkSession,
  type DagExternalWorkSession,
  type AsyncDagExternalWorkSession,
  type DagExternalWorkRunBoundary,
  type DagSettlementReceipt,
  type DagWorkSettlementTicket,
} from '../src/traversals/dag-traversal/coordinateDag';

type TaskId = { readonly task: string };
type Input = VertexDataAndChildHintTypes<{ task: string }, number>;
type Output = VertexDataAndChildHintTypes<{ result: number }, string>;
declare const runner: DagTraversalRunner<Input, Output, TaskId>;
declare const asyncRunner: AsyncDagTraversalRunner<Input, Output, TaskId>;
const coordinator: DagExternalWorkSession<TaskId> =
  bindDagExternalWorkSession(runner);
const asyncCoordinator: AsyncDagExternalWorkSession<TaskId> =
  bindAsyncDagExternalWorkSession(asyncRunner);
const boundary: DagExternalWorkRunBoundary<TaskId> =
  coordinator.runUntilWorkBoundary();
const pending: Promise<DagExternalWorkRunBoundary<TaskId>> =
  asyncCoordinator.runUntilWorkBoundary();
const captureProgressSnapshot: DagProgressSnapshot<TaskId> =
  coordinator.captureProgressSnapshot();
const requested: boolean =
  coordinator.requestPauseAfterAdmittedCallbacksDrain();
if (boundary.kind === 'awaitingSettlement') {
  const ticket: DagWorkSettlementTicket<TaskId> =
    boundary.workSettlementTickets[0]!;
  const id: TaskId = ticket.vertexId;
  const accepted: DagSettlementReceipt =
    coordinator.acceptCompletedWork(ticket);
  const failed: DagSettlementReceipt = asyncCoordinator.failTraversal(
    ticket,
    undefined,
  );
  // @ts-expect-error Fatal settlement has only the canonical method.
  coordinator.fail(ticket, undefined);
  // @ts-expect-error Async fatal settlement has only the canonical method.
  asyncCoordinator.fail(ticket, undefined);
  // @ts-expect-error Spreading drops private nominal ticket identity.
  coordinator.acceptCompletedWork({ ...ticket });
  // @ts-expect-error Spreading cannot manufacture async fatal settlement authority.
  asyncCoordinator.failTraversal({ ...ticket }, undefined);
  // @ts-expect-error Tickets expose a readonly identity.
  ticket.vertexId = { task: 'changed' };
  // @ts-expect-error Frontier observations are readonly.
  boundary.workSettlementTickets.push(ticket);
  // @ts-expect-error A vertex ID alone is not a settlement capability.
  coordinator.acceptCompletedWork(id);
  // @ts-expect-error Ticket identity cannot change generic families.
  const wrongId: DagWorkSettlementTicket<number> = ticket;
  void [id, accepted, failed, wrongId];
}
// @ts-expect-error Ticket ownership cannot be constructed by the caller.
const forged: DagWorkSettlementTicket<TaskId> = {
  vertexId: { task: 'forged' },
};
// @ts-expect-error A sync facade cannot wrap an async runner.
bindDagExternalWorkSession(asyncRunner);
// @ts-expect-error An async facade cannot wrap a sync runner.
bindAsyncDagExternalWorkSession(runner);
void [pending, captureProgressSnapshot, requested, forged];

const syncState: TraversalExecutionState = coordinator;
const asyncState: TraversalExecutionState<TraversalExecutionSnapshot> =
  asyncCoordinator;
const dependencies: DagMilestoneSnapshot<TaskId> =
  coordinator.captureMilestoneSnapshot();
const asyncDependencies: DagMilestoneSnapshot<TaskId> =
  asyncCoordinator.captureMilestoneSnapshot();
dependencies.explainMilestone({
  // @ts-expect-error Dependency queries preserve the coordinator ID domain.
  vertexId: 'wrong',
  milestone: 'workCompletion',
});
void [syncState, asyncState, dependencies, asyncDependencies];

import * as publicApi from '../src';
// @ts-expect-error Tickets have no public runtime value or constructor.
new publicApi.DagWorkSettlementTicket();
