import { TraversalVisitorCommandName as Command } from '@core/TraversalVisitor';
import type { VisitorRegistrationMetadata } from '@core/TraversalVisitor';
import type { VisitorRecord } from '@core/graph/types';
import { getVisitorBatchEnds } from '@core/visitors/getVisitorBatchEnds';
import type { GraphWalkPhase } from '../GraphWalkPhase';
import type { GraphWalkEventFor } from '../GraphWalkEvent';
import type { WalkVisitor } from './normalizeWalkOptions';

/** A single admitted observation retains its callbacks and commit boundaries. */
export class WalkVisitorChain<
  Data,
  Edge,
  ID,
  Phase extends GraphWalkPhase = GraphWalkPhase,
> {
  private readonly batchEnds: boolean[];
  private readonly bufferedCommands: Command[] = [];
  position = 0;
  paused = false;
  constructor(
    private readonly records: readonly VisitorRecord<
      WalkVisitor<Data, Edge, Phase, ID>
    >[],
    readonly phase: Phase,
    private readonly event: () => GraphWalkEventFor<Data, Edge, Phase, ID>,
    private readonly occurrenceIndex: number,
    private readonly observationIndex: number,
  ) {
    this.batchEnds = getVisitorBatchEnds(records);
  }
  get done(): boolean {
    return this.position === this.records.length;
  }
  invoke(): unknown {
    const record = this.records[this.position]!;
    const visitorRecord: VisitorRegistrationMetadata = {
      addedIndex: record.addedIndex,
      priority: record.priority,
      commandCommitMode: record.commandCommitMode,
      resolutionStyle: record.resolutionStyle,
      visitorGroup: record.visitorGroup,
    };
    return record.visitor(this.event(), {
      order: this.phase,
      occurrenceIndex: this.occurrenceIndex,
      observationIndex: this.observationIndex,
      visitorIndex: this.position,
      visitorRecord,
    });
  }
  submit(value: unknown): void {
    if (value !== undefined) {
      if (value === null || typeof value !== 'object' || Array.isArray(value))
        throw new TypeError(
          'Walking visitors must return void or a command result',
        );
      const commands = (value as { commands?: unknown }).commands;
      if (commands !== undefined) {
        if (!Array.isArray(commands))
          throw new TypeError('Walking commands must be an array');
        const names = Array.from(commands, (command: unknown) => {
          if (
            command === null ||
            typeof command !== 'object' ||
            'commandArguments' in command
          )
            throw new TypeError('Walking commands do not accept arguments');
          const name = (command as { commandName?: unknown }).commandName;
          if (name !== Command.NOOP && name !== Command.HALT_TRAVERSAL)
            throw new TypeError(
              'Walking only supports NOOP and HALT_TRAVERSAL',
            );
          return name;
        });
        this.bufferedCommands.push(...names);
      }
    }
    if (this.batchEnds[this.position++]) {
      // All commands are validated and captured before this batch can apply.
      this.paused = this.bufferedCommands.includes(Command.HALT_TRAVERSAL);
      this.bufferedCommands.length = 0;
    }
  }
  resume(): void {
    this.paused = false;
  }
}
