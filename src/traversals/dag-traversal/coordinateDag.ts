import type { TraversalExecutionState } from '@core/TraversalExecution';
import type { TreeDagExecutionInspection } from '@core/CoreInspection';
import type { DagVisitorPhase } from './lib/DagTraversalOrder';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { inspectDagMilestones } from './inspectDag';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import type { DagMilestoneSnapshot } from './lib/DagInspection';
import type {
  DagDeferredWork,
  DagSettlementOutcome,
  DagSummary,
} from './lib/DagProgress';
import { dagRunnerCapabilities } from './lib/dagRunnerCapabilities';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';

/** Declaration only: issued objects use WeakMap ownership, with no constructor value. */
declare class NominalDagWorkTicket<ID> {
  private constructor();
  private readonly ticketIdentity: never;
  readonly vertexId: ID;
}

/** Local settlement capability issued by one coordinator; copying loses ownership. */
export type DagWorkTicket<ID = unknown> = NominalDagWorkTicket<ID>;

export type DagWorkBoundary<ID = unknown> =
  | Readonly<{
      kind: 'awaitingSettlement';
      workTickets: readonly DagWorkTicket<ID>[];
    }>
  | Readonly<{ kind: 'paused' }>
  | Readonly<{ kind: 'finished' }>;

export type DagSettlementReceipt =
  | Readonly<{ kind: 'accepted' }>
  | Readonly<{ kind: 'alreadyAccepted' }>;

export interface DagWorkSessionControl<ID = unknown>
  extends TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>> {
  completeWork(ticket: DagWorkTicket<ID>): DagSettlementReceipt;
  /** Fatal for the whole traversal; keep retryable work deferred instead. */
  failTraversal(
    ticket: DagWorkTicket<ID>,
    error: unknown,
  ): DagSettlementReceipt;
  /** Capture dependency explanations without advancing the coordinated runner. */
  inspectMilestones(): DagMilestoneSnapshot<ID>;
  summary(): DagSummary<ID>;
  requestPause(): boolean;
}

export interface DagWorkSession<ID = unknown>
  extends DagWorkSessionControl<ID> {
  advance(): DagWorkBoundary<ID>;
}

export interface AsyncDagWorkSession<ID = unknown>
  extends DagWorkSessionControl<ID> {
  advance(): Promise<DagWorkBoundary<ID>>;
}

type SettlementRunner<ID> = Pick<
  DagTraversalRunner<VertexTypes, VertexTypes, ID>,
  | 'settle'
  | 'summary'
  | 'requestPause'
  | 'getStopReason'
  | 'getStatus'
  | 'isHalted'
  | 'inspect'
>;

function makeCoordination<ID>(
  runner: SettlementRunner<ID>,
  inspectDependencies: () => DagMilestoneSnapshot<ID>,
) {
  if (
    dagRunnerCapabilities.get(runner)?.workCompletion !== 'externalSettlement'
  ) {
    throw new TypeError(
      'DAG coordination requires externalSettlement work completion',
    );
  }
  const tickets = new WeakMap<DagWorkTicket<ID>, DagDeferredWork<ID>>();
  const settle = (
    ticket: DagWorkTicket<ID>,
    outcome: DagSettlementOutcome,
  ): DagSettlementReceipt => {
    const work = tickets.get(ticket);
    if (work === undefined) {
      throw new TypeError('Unknown or foreign DAG work ticket');
    }
    return {
      kind: runner.settle(work.vertexId, outcome, work.generation)
        ? 'accepted'
        : 'alreadyAccepted',
    };
  };
  const failTraversal = (ticket: DagWorkTicket<ID>, error: unknown) =>
    settle(ticket, { kind: 'traversalFailed', error });
  return {
    completeWork: (ticket: DagWorkTicket<ID>) =>
      settle(ticket, { kind: 'workCompleted' }),
    failTraversal,
    getStatus: () => runner.getStatus(),
    getStopReason: () => runner.getStopReason(),
    isHalted: () => runner.isHalted(),
    inspect: () => runner.inspect(),
    inspectMilestones: inspectDependencies,
    summary: () => runner.summary(),
    requestPause: () => runner.requestPause(),
    boundary: (): DagWorkBoundary<ID> => {
      const reason = runner.getStopReason();
      if (reason === 'finished') return { kind: 'finished' };
      if (reason === 'paused') return { kind: 'paused' };
      return {
        kind: 'awaitingSettlement',
        workTickets: runner.summary().awaitingSettlement.map((work) => {
          // The private WeakMap, not a copyable field, proves ticket ownership.
          const ticket = Object.freeze({
            vertexId: work.vertexId,
          }) as DagWorkTicket<ID>;
          tickets.set(ticket, work);
          return ticket;
        }),
      };
    },
  };
}

/** Wrap an external-settlement runner without executing or acquiring it. */
export function bindDagWorkSession<
  T extends VertexTypes,
  R extends VertexTypes,
  ID,
>(runner: DagTraversalRunner<T, R, ID>): DagWorkSession<ID> {
  const { boundary, ...control } = makeCoordination(runner, () =>
    inspectDagMilestones(runner),
  );
  return {
    ...control,
    advance: () => {
      runner.run();
      return boundary();
    },
  };
}

/** Async execution uses the runner's existing ownership and drain semantics. */
export function bindAsyncDagWorkSession<
  T extends VertexTypes,
  R extends VertexTypes,
  ID,
>(runner: AsyncDagTraversalRunner<T, R, ID>): AsyncDagWorkSession<ID> {
  const { boundary, ...control } = makeCoordination(runner, () =>
    inspectDagMilestones(runner),
  );
  return {
    ...control,
    advance: async () => {
      await runner.run();
      return boundary();
    },
  };
}
