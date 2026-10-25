import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';
import type {
  DagDeferredWork,
  DagSettlementOutcome,
  DagSummary,
} from './lib/DagProgress';

declare const ticketBrand: unique symbol;

/** Local settlement capability issued by one coordinator; copying loses ownership. */
export type DagWorkTicket<ID = unknown> = Readonly<{
  vertexId: ID;
  [ticketBrand]: never;
}>;

export type DagCoordinationBoundary<ID = unknown> =
  | Readonly<{
      kind: 'awaitingSettlement';
      frontier: readonly DagWorkTicket<ID>[];
    }>
  | Readonly<{ kind: 'paused' }>
  | Readonly<{ kind: 'finished' }>;

export type DagCoordinationResult =
  | Readonly<{ kind: 'accepted' }>
  | Readonly<{ kind: 'alreadyAccepted' }>;

interface DagCoordinationControl<ID> {
  complete(ticket: DagWorkTicket<ID>): DagCoordinationResult;
  fail(ticket: DagWorkTicket<ID>, error: unknown): DagCoordinationResult;
  summary(): DagSummary<ID>;
  requestPause(): boolean;
}

export interface DagCoordinator<ID = unknown>
  extends DagCoordinationControl<ID> {
  advance(): DagCoordinationBoundary<ID>;
}

export interface AsyncDagCoordinator<ID = unknown>
  extends DagCoordinationControl<ID> {
  advance(): Promise<DagCoordinationBoundary<ID>>;
}

type SettlementRunner<ID> = Pick<
  DagTraversalRunner<TreeTypeParameters, TreeTypeParameters, ID>,
  'settle' | 'summary' | 'requestPause' | 'getStopReason'
> & {
  readonly icfg: { workCompletion?: 'visitorReturn' | 'externalSettlement' };
};

function makeCoordination<ID>(runner: SettlementRunner<ID>) {
  if (runner.icfg.workCompletion !== 'externalSettlement') {
    throw new TypeError(
      'DAG coordination requires externalSettlement work completion',
    );
  }
  const tickets = new WeakMap<DagWorkTicket<ID>, DagDeferredWork<ID>>();
  const settle = (
    ticket: DagWorkTicket<ID>,
    outcome: DagSettlementOutcome,
  ): DagCoordinationResult => {
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
  return {
    complete: (ticket: DagWorkTicket<ID>) =>
      settle(ticket, { kind: 'workCompleted' }),
    fail: (ticket: DagWorkTicket<ID>, error: unknown) =>
      settle(ticket, { kind: 'traversalFailed', error }),
    summary: () => runner.summary(),
    requestPause: () => runner.requestPause(),
    boundary: (): DagCoordinationBoundary<ID> => {
      const reason = runner.getStopReason();
      if (reason === 'finished') return { kind: 'finished' };
      if (reason === 'paused') return { kind: 'paused' };
      return {
        kind: 'awaitingSettlement',
        frontier: runner.summary().deferredFrontier.map((work) => {
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
export function coordinateDag<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ID,
>(runner: DagTraversalRunner<T, R, ID>): DagCoordinator<ID> {
  const { boundary, ...control } = makeCoordination(runner);
  return {
    ...control,
    advance: () => {
      runner.run();
      return boundary();
    },
  };
}

/** Async execution uses the runner's existing ownership and drain semantics. */
export function coordinateDagAsync<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ID,
>(runner: AsyncDagTraversalRunner<T, R, ID>): AsyncDagCoordinator<ID> {
  const { boundary, ...control } = makeCoordination(runner);
  return {
    ...control,
    advance: async () => {
      await runner.run();
      return boundary();
    },
  };
}
