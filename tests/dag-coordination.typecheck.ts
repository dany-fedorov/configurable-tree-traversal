import type {
  TraversalExecutionState,
  ExecutionInspection,
  DagInspection,
} from '../src';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { DagSummary } from '../src/traversals/dag-traversal/lib/DagProgress';
import type { DagTraversalRunner } from '../src/traversals/dag-traversal/lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
import {
  coordinateDag,
  coordinateDagAsync,
  type DagCoordinator,
  type AsyncDagCoordinator,
  type DagCoordinationBoundary,
  type DagCoordinationResult,
  type DagWorkTicket,
} from '../src/traversals/dag-traversal/coordinateDag';

type TaskId = { readonly task: string };
type Input = TreeTypeParameters<{ task: string }, number>;
type Output = TreeTypeParameters<{ result: number }, string>;
declare const runner: DagTraversalRunner<Input, Output, TaskId>;
declare const asyncRunner: AsyncDagTraversalRunner<Input, Output, TaskId>;
const coordinator: DagCoordinator<TaskId> = coordinateDag(runner);
const asyncCoordinator: AsyncDagCoordinator<TaskId> =
  coordinateDagAsync(asyncRunner);
const boundary: DagCoordinationBoundary<TaskId> = coordinator.advance();
const pending: Promise<DagCoordinationBoundary<TaskId>> =
  asyncCoordinator.advance();
const summary: DagSummary<TaskId> = coordinator.summary();
const requested: boolean = coordinator.requestPause();
if (boundary.kind === 'awaitingSettlement') {
  const ticket: DagWorkTicket<TaskId> = boundary.frontier[0]!;
  const id: TaskId = ticket.vertexId;
  const accepted: DagCoordinationResult = coordinator.complete(ticket);
  const failed: DagCoordinationResult = asyncCoordinator.failTraversal(
    ticket,
    undefined,
  );
  // @ts-expect-error Fatal settlement has only the canonical method.
  coordinator.fail(ticket, undefined);
  // @ts-expect-error Async fatal settlement has only the canonical method.
  asyncCoordinator.fail(ticket, undefined);
  // @ts-expect-error Tickets expose a readonly identity.
  ticket.vertexId = { task: 'changed' };
  // @ts-expect-error Frontier observations are readonly.
  boundary.frontier.push(ticket);
  // @ts-expect-error A vertex ID alone is not a settlement capability.
  coordinator.complete(id);
  // @ts-expect-error Ticket identity cannot change generic families.
  const wrongId: DagWorkTicket<number> = ticket;
  void [id, accepted, failed, wrongId];
}
// @ts-expect-error Ticket ownership cannot be constructed by the caller.
const forged: DagWorkTicket<TaskId> = { vertexId: { task: 'forged' } };
// @ts-expect-error A sync facade cannot wrap an async runner.
coordinateDag(asyncRunner);
// @ts-expect-error An async facade cannot wrap a sync runner.
coordinateDagAsync(runner);
void [pending, summary, requested, forged];

const syncState: TraversalExecutionState = coordinator;
const asyncState: TraversalExecutionState<ExecutionInspection> =
  asyncCoordinator;
const dependencies: DagInspection<TaskId> = coordinator.inspectDag();
const asyncDependencies: DagInspection<TaskId> = asyncCoordinator.inspectDag();
// @ts-expect-error Dependency queries preserve the coordinator ID domain.
dependencies.explain({ vertexId: 'wrong', milestone: 'work' });
void [syncState, asyncState, dependencies, asyncDependencies];
