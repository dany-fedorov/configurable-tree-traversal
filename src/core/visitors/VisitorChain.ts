import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalVisitorCommand } from '@core/TraversalVisitor';
import { TraversalVisitorFunctionResolutionStyle } from '@core/TraversalVisitor';
import type {
  VisitorBatchCommit,
  VisitorChainInput,
  VisitorChainMetadata,
  VisitorChainPoll,
  VisitorOutcome,
} from '@core/visitors/types';

type Group = 'concurrent' | 'sequential';

export class VisitorChain<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  private readonly ref: VisitorChainInput<T, R>['ref'];
  private readonly concurrentRecordIndices: number[] = [];
  private readonly sequentialRecordIndices: number[] = [];
  private readonly metadata: VisitorChainMetadata<T | R>;
  private group: Group = 'concurrent';
  private groupPosition = 0;
  private awaitingOutcome = false;
  private pendingCommands: TraversalVisitorCommand<R>[] | null = null;
  private commandsEmitted = false;
  private readonly concurrentCommands: TraversalVisitorCommand<R>[] = [];
  private paused = false;
  private deleted = false;
  private done = false;
  private valid = true;

  constructor(input: VisitorChainInput<T, R>) {
    this.ref = input.ref;
    this.metadata = {
      ...input.metadata,
      curVertexVisitorVisitIndex: 0,
      vertexVisitorsChainState: null,
    };

    input.records.forEach((record, index) => {
      switch (record.resolutionStyle) {
        case TraversalVisitorFunctionResolutionStyle.CONCURRENT:
          this.concurrentRecordIndices.push(index);
          break;
        case TraversalVisitorFunctionResolutionStyle.SEQUENTIAL:
          this.sequentialRecordIndices.push(index);
          break;
        default:
          throw new TypeError('Unknown visitor resolution style');
      }
    });
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

    if (this.group === 'concurrent') {
      const recordIndex = this.concurrentRecordIndices[this.groupPosition];
      if (recordIndex !== undefined) return this.emitVisit(recordIndex, null);

      this.group = 'sequential';
      this.groupPosition = 0;
      if (this.concurrentRecordIndices.length === 0) return this.poll();
      this.pendingCommands = this.concurrentCommands.slice();
      return this.poll();
    }

    const recordIndex = this.sequentialRecordIndices[this.groupPosition];
    if (recordIndex !== undefined) {
      return this.emitVisit(
        recordIndex,
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
    const commands = outcome.value?.commands ?? [];
    this.groupPosition++;
    if (this.group === 'concurrent') {
      this.concurrentCommands.push(...commands);
    } else {
      this.pendingCommands = commands.slice();
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
