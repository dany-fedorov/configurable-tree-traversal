import { getVisitorBatchEnds } from './getVisitorBatchEnds';
import { DEFER_READY } from '../../traversals/dag-traversal/lib/DagProgress';
import { normalizeVisitorOptions } from './normalizeVisitorOptions';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TraversalVisitorCommand } from '@core/TraversalVisitor';
import type {
  VisitorBatchCommit,
  VisitorChainInput,
  VisitorChainMetadata,
  VisitorChainPoll,
  VisitorOutcome,
} from '@core/visitors/types';

export class VisitorChain<
  T extends VertexTypes,
  R extends VertexTypes = T,
> {
  private readonly canDeferReady: boolean;
  private readonly ref: VisitorChainInput<T, R>['ref'];
  private readonly batchEnds: boolean[];
  private readonly metadata: VisitorChainMetadata<T | R>;
  private position = 0;
  private awaitingOutcome = false;
  private pendingCommands: TraversalVisitorCommand<R>[] | null = null;
  private commandsEmitted = false;
  private readonly bufferedCommands: TraversalVisitorCommand<R>[] = [];
  private paused = false;
  private deleted = false;
  private done = false;
  private valid = true;

  constructor(input: VisitorChainInput<T, R>) {
    this.ref = input.ref;
    this.canDeferReady = input.family === 'dag' && input.order === 'ON_READY';
    this.metadata = {
      ...input.metadata,
      curVertexVisitorVisitIndex: 0,
      vertexVisitorsChainState: null,
    };

    const records = input.records.map((record) => ({
      ...record,
      ...normalizeVisitorOptions(record),
    }));
    this.batchEnds = getVisitorBatchEnds(records);
  }

  poll(): VisitorChainPoll<T, R> {
    if (!this.valid || this.done) return { kind: 'DONE' };
    if (this.paused) return { kind: 'PAUSED' };
    if (this.awaitingOutcome || this.commandsEmitted) return { kind: 'WAIT' };
    if (this.pendingCommands !== null) {
      this.commandsEmitted = true;
      return { kind: 'COMMANDS', commands: this.pendingCommands.slice() };
    }
    if (this.deleted) {
      this.done = true;
      return { kind: 'DONE' };
    }

    if (this.position < this.batchEnds.length) {
      return this.emitVisit(
        this.position,
        this.metadata.vertexVisitorsChainState,
      );
    }

    this.done = true;
    return { kind: 'DONE' };
  }

  submit(outcome: VisitorOutcome<R>): void {
    if (!this.valid || !this.awaitingOutcome) {
      throw new Error('Visitor chain is not waiting for an outcome');
    }
    if (!outcome.ok) {
      this.valid = false;
      throw outcome.error;
    }

    this.awaitingOutcome = false;
    this.metadata.curVertexVisitorVisitIndex++;
    const value =
      outcome.value === DEFER_READY
        ? {
            commands: [
              { commandName: TraversalVisitorCommandName.DEFER_READY as const },
            ],
          }
        : outcome.value;
    const commands = value?.commands ?? [];
    if (
      commands.some(
        (command) =>
          command.commandName === TraversalVisitorCommandName.DEFER_READY,
      )
    ) {
      if (commands.length !== 1)
        throw new TypeError('DEFER_READY must be the sole command');
      if (!this.canDeferReady)
        throw new TypeError(
          'DEFER_READY is only valid for DAG ON_READY visitors',
        );
      this.bufferedCommands.length = 0;
      this.pendingCommands = commands.slice();
      return;
    }
    this.bufferedCommands.push(...commands);
    if (this.batchEnds[this.position++]) {
      this.pendingCommands = this.bufferedCommands.splice(0);
    }
  }

  commitBatch(result: VisitorBatchCommit): void {
    if (!this.valid || this.pendingCommands === null || !this.commandsEmitted) {
      throw new Error('Visitor chain has no command batch to commit');
    }

    const ownHalt = this.pendingCommands.some(
      (command) =>
        command.commandName === TraversalVisitorCommandName.HALT_TRAVERSAL,
    );
    if (
      Object.prototype.hasOwnProperty.call(result, 'vertexVisitorsChainState')
    ) {
      this.metadata.vertexVisitorsChainState = result.vertexVisitorsChainState;
    }
    this.pendingCommands = null;
    this.commandsEmitted = false;
    this.deleted = result.deleted;
    if (result.deferred) this.done = true;
    this.paused = result.halt && ownHalt;
  }

  resume(): void {
    this.paused = false;
  }

  invalidate(): void {
    this.valid = false;
    this.awaitingOutcome = false;
    this.pendingCommands = null;
    this.commandsEmitted = false;
  }

  private emitVisit(
    recordIndex: number,
    chainState: unknown,
  ): VisitorChainPoll<T, R> {
    this.awaitingOutcome = true;
    return {
      kind: 'VISIT',
      ref: this.ref,
      recordIndex,
      metadata: {
        ...this.metadata,
        vertexVisitorsChainState: chainState,
      },
    };
  }
}
