import { TraversalVisitorCommandName as Command } from '@core/TraversalVisitor';
import type { VisitorRegistrationMetadata } from '@core/TraversalVisitor';
import type { VisitorRecord } from '@core/graph/types';
import { getVisitorBatchEnds } from '@core/visitors/getVisitorBatchEnds';
import type { GraphWalkObservationKind } from '../GraphWalkPhase';
import type { GraphWalkEventForObservationKind } from '../GraphWalkEvent';
import type { WalkVisitor } from './normalizeWalkOptions';

/** A single admitted observation retains its callbacks and commit boundaries. */
export class WalkVisitorChain<
  VertexData,
  EdgeData,
  VertexId,
  ObservationKind extends GraphWalkObservationKind = GraphWalkObservationKind,
> {
  private readonly batchEnds: boolean[];
  private readonly bufferedCommands: Command[] = [];
  visitorIndexInObservationChain = 0;
  paused = false;
  constructor(
    private readonly records: readonly VisitorRecord<
      WalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
    >[],
    readonly observationKind: ObservationKind,
    private readonly event: () => GraphWalkEventForObservationKind<
      VertexData,
      EdgeData,
      ObservationKind,
      VertexId
    >,
    private readonly admittedTargetOccurrenceIndex: number,
    private readonly observationIndexWithinKind: number,
  ) {
    this.batchEnds = getVisitorBatchEnds(records);
  }
  get done(): boolean {
    return this.visitorIndexInObservationChain === this.records.length;
  }
  invoke(): unknown {
    const record = this.records[this.visitorIndexInObservationChain]!;
    const visitorRegistrationMetadata: VisitorRegistrationMetadata = {
      phaseRegistrationInsertionIndex: record.phaseRegistrationInsertionIndex,
      descendingExecutionPriorityWithinGroup:
        record.descendingExecutionPriorityWithinGroup,
      visitorCommandCommitTiming: record.visitorCommandCommitTiming,
      visitorGroup: record.visitorGroup,
    };
    return record.visitor(this.event(), {
      observationKind: this.observationKind,
      admittedTargetOccurrenceIndex: this.admittedTargetOccurrenceIndex,
      observationIndexWithinKind: this.observationIndexWithinKind,
      visitorIndexInObservationChain: this.visitorIndexInObservationChain,
      visitorRegistrationMetadata,
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
            (command as { commandArguments?: unknown }).commandArguments !==
              undefined
          )
            throw new TypeError('Walking commands do not accept arguments');
          const name = (command as { commandName?: unknown }).commandName;
          if (
            name !== Command.NO_OPERATION &&
            name !== Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY
          )
            throw new TypeError(
              'Walking only supports NOOP and PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY',
            );
          return name;
        });
        this.bufferedCommands.push(...names);
      }
    }
    if (this.batchEnds[this.visitorIndexInObservationChain++]) {
      // All commands are validated and captured before this batch can apply.
      this.paused = this.bufferedCommands.includes(
        Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
      );
      this.bufferedCommands.length = 0;
    }
  }
  resume(): void {
    this.paused = false;
  }
}
