import type {
  TraversalExecutionState,
  ExecutionInspection,
  DagMilestoneSnapshot,
} from '../src';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import type { DagSummary } from '../src/traversals/dag-traversal/lib/DagProgress';
import type { DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import {
  createDagWorkSession,
  createAsyncDagWorkSession,
  type DagWorkSession,
  type AsyncDagWorkSession,
  type DagWorkBoundary,
  type DagSettlementReceipt,
  type DagWorkTicket,
} from '../src/traversals/dag-traversal/coordinateDag';

type TaskId = { readonly task: string };
type Input = VertexTypes<{ task: string }, number>;
type Output = VertexTypes<{ result: number }, string>;
declare const runner: DagTraversalRunner<Input, Output, TaskId>;
declare const asyncRunner: AsyncDagTraversalRunner<Input, Output, TaskId>;
const coordinator: DagWorkSession<TaskId> = createDagWorkSession(runner);
const asyncCoordinator: AsyncDagWorkSession<TaskId> =
  createAsyncDagWorkSession(asyncRunner);
const boundary: DagWorkBoundary<TaskId> = coordinator.advance();
const pending: Promise<DagWorkBoundary<TaskId>> = asyncCoordinator.advance();
const summary: DagSummary<TaskId> = coordinator.summary();
const requested: boolean = coordinator.requestPause();
if (boundary.kind === 'awaitingSettlement') {
  const ticket: DagWorkTicket<TaskId> = boundary.workTickets[0]!;
  const id: TaskId = ticket.vertexId;
  const accepted: DagSettlementReceipt = coordinator.completeWork(ticket);
  const failed: DagSettlementReceipt = asyncCoordinator.failTraversal(
    ticket,
    undefined,
  );
  // @ts-expect-error Fatal settlement has only the canonical method.
  coordinator.fail(ticket, undefined);
  // @ts-expect-error Async fatal settlement has only the canonical method.
  asyncCoordinator.fail(ticket, undefined);
  // @ts-expect-error Spreading drops private nominal ticket identity.
  coordinator.completeWork({ ...ticket });
  // @ts-expect-error Spreading cannot manufacture async fatal settlement authority.
  asyncCoordinator.failTraversal({ ...ticket }, undefined);
  // @ts-expect-error Tickets expose a readonly identity.
  ticket.vertexId = { task: 'changed' };
  // @ts-expect-error Frontier observations are readonly.
  boundary.workTickets.push(ticket);
  // @ts-expect-error A vertex ID alone is not a settlement capability.
  coordinator.completeWork(id);
  // @ts-expect-error Ticket identity cannot change generic families.
  const wrongId: DagWorkTicket<number> = ticket;
  void [id, accepted, failed, wrongId];
}
// @ts-expect-error Ticket ownership cannot be constructed by the caller.
const forged: DagWorkTicket<TaskId> = { vertexId: { task: 'forged' } };
// @ts-expect-error A sync facade cannot wrap an async runner.
createDagWorkSession(asyncRunner);
// @ts-expect-error An async facade cannot wrap a sync runner.
createAsyncDagWorkSession(runner);
void [pending, summary, requested, forged];

const syncState: TraversalExecutionState = coordinator;
const asyncState: TraversalExecutionState<ExecutionInspection> =
  asyncCoordinator;
const dependencies: DagMilestoneSnapshot<TaskId> =
  coordinator.inspectMilestones();
const asyncDependencies: DagMilestoneSnapshot<TaskId> =
  asyncCoordinator.inspectMilestones();
// @ts-expect-error Dependency queries preserve the coordinator ID domain.
dependencies.explain({ vertexId: 'wrong', milestone: 'work' });
void [syncState, asyncState, dependencies, asyncDependencies];

import * as publicApi from '../src';
// @ts-expect-error Tickets have no public runtime value or constructor.
new publicApi.DagWorkTicket();
