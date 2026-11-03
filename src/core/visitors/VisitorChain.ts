import { getVisitorBatchEnds } from './getVisitorBatchEnds';
import { normalizeVisitorOptions } from './normalizeVisitorOptions';
import { TraversalVisitorCommandName } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { TraversalVisitorCommand } from '@core/TraversalVisitor';
import type {
  VisitorBatchCommit,
  VisitorChainInput,
  VisitorChainMetadata,
  VisitorChainPoll,
  VisitorOutcome,
} from '@core/visitors/types';

export class VisitorChain<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  private readonly canDeferReady: boolean;
  private readonly ref: VisitorChainInput<
    InputVertexTypes,
    RewrittenVertexTypes
  >['ref'];
  private readonly batchEnds: boolean[];
  private readonly metadata: VisitorChainMetadata<
    InputVertexTypes | RewrittenVertexTypes
  >;
  private position = 0;
  private awaitingOutcome = false;
  private pendingCommands:
    | TraversalVisitorCommand<
        RewrittenVertexTypes,
        TraversalVisitorCommandName,
        InputVertexTypes['ChildHint']
      >[]
    | null = null;
  private commandsEmitted = false;
  private readonly bufferedCommands: TraversalVisitorCommand<
    RewrittenVertexTypes,
    TraversalVisitorCommandName,
    InputVertexTypes['ChildHint']
  >[] = [];
  private paused = false;
  private deleted = false;
  private done = false;
  private valid = true;

  constructor(
    input: VisitorChainInput<InputVertexTypes, RewrittenVertexTypes>,
  ) {
    this.ref = input.ref;
    this.canDeferReady =
      input.family === 'dag' && input.order === 'ON_WORK_READY';
    this.metadata = {
      ...input.metadata,
      visitorCallbackIndexInPhaseChain: 0,
      currentVertexPhaseChainState: null,
    };

    const records = input.records.map((record) => ({
      ...record,
      ...normalizeVisitorOptions(record),
    }));
    this.batchEnds = getVisitorBatchEnds(records);
  }

  poll(): VisitorChainPoll<InputVertexTypes, RewrittenVertexTypes> {
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
        this.metadata.currentVertexPhaseChainState,
      );
    }

    this.done = true;
    return { kind: 'DONE' };
  }

  submit(
    outcome: VisitorOutcome<
      RewrittenVertexTypes,
      InputVertexTypes['ChildHint']
    >,
  ): void {
    if (!this.valid || !this.awaitingOutcome) {
      throw new Error('Visitor chain is not waiting for an outcome');
    }
    if (!outcome.ok) {
      this.valid = false;
      throw outcome.error;
    }

    this.awaitingOutcome = false;
    this.metadata.visitorCallbackIndexInPhaseChain++;
    const value = outcome.value;
    if (typeof value === 'symbol') {
      throw new TypeError('Invalid visitor result; use canonical commands');
    }
    const commands = value?.commands ?? [];
    if (
      commands.some(
        (command) =>
          command.commandName ===
          TraversalVisitorCommandName.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
      )
    ) {
      if (commands.length !== 1)
        throw new TypeError('DEFER_WORK_COMPLETION must be the sole command');
      if (!this.canDeferReady)
        throw new TypeError(
          'DEFER_WORK_COMPLETION is only valid for DAG ON_WORK_READY visitors',
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
        command.commandName ===
        TraversalVisitorCommandName.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
    );
    if (
      Object.prototype.hasOwnProperty.call(
        result,
        'currentVertexPhaseChainState',
      )
    ) {
      this.metadata.currentVertexPhaseChainState =
        result.currentVertexPhaseChainState;
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
  ): VisitorChainPoll<InputVertexTypes, RewrittenVertexTypes> {
    this.awaitingOutcome = true;
    return {
      kind: 'VISIT',
      ref: this.ref,
      recordIndex,
      metadata: {
        ...this.metadata,
        currentVertexPhaseChainState: chainState,
      },
    };
  }
}
