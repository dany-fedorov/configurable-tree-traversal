import type { TraversalExecutionState } from '@core/TraversalExecution';
import type { TreeOrDagExecutionSnapshot } from '@core/CoreInspection';
import type { DagVisitorPhase } from './lib/DagTraversalOrder';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { captureDagMilestoneSnapshot } from './inspectDag';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import type { DagMilestoneSnapshot } from './lib/DagInspection';
import type {
  DagWorkAwaitingSettlement,
  DagSettlementOutcome,
  DagProgressSnapshot,
} from './lib/DagProgress';
import { dagRunnerCapabilities } from './lib/dagRunnerCapabilities';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';

/** Declaration only: issued objects use WeakMap ownership, with no constructor value. */
declare class NominalDagWorkSettlementTicket<VertexId> {
  private constructor();
  private readonly ticketIdentity: never;
  readonly vertexId: VertexId;
}

/** Local settlement capability issued by one coordinator; copying loses ownership. */
export type DagWorkSettlementTicket<VertexId = unknown> =
  NominalDagWorkSettlementTicket<VertexId>;

export type DagExternalWorkRunBoundary<VertexId = unknown> =
  | Readonly<{
      kind: 'awaitingSettlement';
      workSettlementTickets: readonly DagWorkSettlementTicket<VertexId>[];
    }>
  | Readonly<{ kind: 'paused' }>
  | Readonly<{ kind: 'finished' }>;

export type DagSettlementReceipt =
  | Readonly<{ kind: 'accepted' }>
  | Readonly<{ kind: 'alreadyAccepted' }>;

export interface DagExternalWorkSessionControl<VertexId = unknown>
  extends TraversalExecutionState<TreeOrDagExecutionSnapshot<DagVisitorPhase>> {
  acceptCompletedWork(
    ticket: DagWorkSettlementTicket<VertexId>,
  ): DagSettlementReceipt;
  /** Fatal for the whole traversal; keep retryable work deferred instead. */
  failTraversal(
    ticket: DagWorkSettlementTicket<VertexId>,
    error: unknown,
  ): DagSettlementReceipt;
  /** Capture dependency explanations without advancing the coordinated runner. */
  captureMilestoneSnapshot(): DagMilestoneSnapshot<VertexId>;
  captureProgressSnapshot(): DagProgressSnapshot<VertexId>;
  requestPauseAfterAdmittedCallbacksDrain(): boolean;
}

export interface DagExternalWorkSession<VertexId = unknown>
  extends DagExternalWorkSessionControl<VertexId> {
  runUntilWorkBoundary(): DagExternalWorkRunBoundary<VertexId>;
}

export interface AsyncDagExternalWorkSession<VertexId = unknown>
  extends DagExternalWorkSessionControl<VertexId> {
  runUntilWorkBoundary(): Promise<DagExternalWorkRunBoundary<VertexId>>;
}

type SettlementRunner<VertexId> = Pick<
  DagTraversalRunner<
    VertexDataAndChildHintTypes,
    VertexDataAndChildHintTypes,
    VertexId
  >,
  | 'settleDeferredWork'
  | 'captureProgressSnapshot'
  | 'requestPauseAfterAdmittedCallbacksDrain'
  | 'getTraversalStopReason'
  | 'getTraversalLifecycleStatus'
  | 'isSuspended'
  | 'captureExecutionSnapshot'
>;

function makeCoordination<VertexId>(
  runner: SettlementRunner<VertexId>,
  inspectDependencies: () => DagMilestoneSnapshot<VertexId>,
) {
  if (
    dagRunnerCapabilities.get(runner)?.workCompletionPolicy !==
    'requireExternalWorkSettlement'
  ) {
    throw new TypeError(
      'DAG coordination requires workCompletionPolicy: requireExternalWorkSettlement',
    );
  }
  const tickets = new WeakMap<
    DagWorkSettlementTicket<VertexId>,
    DagWorkAwaitingSettlement<VertexId>
  >();
  const settleDeferredWork = (
    ticket: DagWorkSettlementTicket<VertexId>,
    outcome: DagSettlementOutcome,
  ): DagSettlementReceipt => {
    const work = tickets.get(ticket);
    if (work === undefined) {
      throw new TypeError('Unknown or foreign DAG work ticket');
    }
    return {
      kind: runner.settleDeferredWork(
        work.vertexId,
        outcome,
        work.settlementToken,
      )
        ? 'accepted'
        : 'alreadyAccepted',
    };
  };
  const failTraversal = (
    ticket: DagWorkSettlementTicket<VertexId>,
    error: unknown,
  ) => settleDeferredWork(ticket, { kind: 'traversalFailed', error });
  return {
    acceptCompletedWork: (ticket: DagWorkSettlementTicket<VertexId>) =>
      settleDeferredWork(ticket, { kind: 'workCompleted' }),
    failTraversal,
    getTraversalLifecycleStatus: () => runner.getTraversalLifecycleStatus(),
    getTraversalStopReason: () => runner.getTraversalStopReason(),
    isSuspended: () => runner.isSuspended(),
    captureExecutionSnapshot: () => runner.captureExecutionSnapshot(),
    captureMilestoneSnapshot: inspectDependencies,
    captureProgressSnapshot: () => runner.captureProgressSnapshot(),
    requestPauseAfterAdmittedCallbacksDrain: () =>
      runner.requestPauseAfterAdmittedCallbacksDrain(),
    boundary: (): DagExternalWorkRunBoundary<VertexId> => {
      const reason = runner.getTraversalStopReason();
      if (reason === 'finished') return { kind: 'finished' };
      if (reason === 'paused') return { kind: 'paused' };
      return {
        kind: 'awaitingSettlement',
        workSettlementTickets: runner
          .captureProgressSnapshot()
          .workAwaitingSettlement.map((work) => {
            // The private WeakMap, not a copyable field, proves ticket ownership.
            const ticket = Object.freeze({
              vertexId: work.vertexId,
            }) as DagWorkSettlementTicket<VertexId>;
            tickets.set(ticket, work);
            return ticket;
          }),
      };
    },
  };
}

/** Wrap an external-settlement runner without executing or acquiring it. */
export function bindDagExternalWorkSession<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  runner: DagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>,
): DagExternalWorkSession<VertexId> {
  const { boundary, ...control } = makeCoordination(runner, () =>
    captureDagMilestoneSnapshot(runner),
  );
  return {
    ...control,
    runUntilWorkBoundary: () => {
      runner.runUntilSuspendedOrTerminal();
      return boundary();
    },
  };
}

/** Async execution uses the runner's existing ownership and drain semantics. */
export function bindAsyncDagExternalWorkSession<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  runner: AsyncDagTraversalRunner<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
): AsyncDagExternalWorkSession<VertexId> {
  const { boundary, ...control } = makeCoordination(runner, () =>
    captureDagMilestoneSnapshot(runner),
  );
  return {
    ...control,
    runUntilWorkBoundary: async () => {
      await runner.runUntilSuspendedOrTerminal();
      return boundary();
    },
  };
}
