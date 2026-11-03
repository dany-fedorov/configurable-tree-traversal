import type { TraversalExecutionSnapshot } from '@core/ExecutionInspection';
import type {
  TraversalRunnerStatus,
  TraversalStopReason,
} from '@core/TraversalRunner';
import type {
  TraversalEventKindForVisitorPhase,
  TraversalExecutionSelectionPatch,
} from '@core/TraversalRunnerIterableConfig';

/** Narrow a delivered record only when its public discriminant is known. */
export type TraversalEventNarrowedToSelectedKinds<
  Event,
  Kind extends string,
> = [Kind] extends [never]
  ? never
  : Event extends { eventKind: string }
  ? Event & { readonly eventKind: Kind }
  : Event;

/** Observational state and a cooperative pause request, independent of ownership. */
export interface TraversalExecutionState<
  Inspection extends TraversalExecutionSnapshot = TraversalExecutionSnapshot,
> {
  getTraversalLifecycleStatus(): TraversalRunnerStatus;
  getTraversalStopReason(): TraversalStopReason | null;
  isSuspended(): boolean;
  captureExecutionSnapshot(): Inspection;
  /** Records a new request only while RUNNING; the owner drives the safe boundary. */
  requestPauseAfterAdmittedCallbacksDrain(): boolean;
}

export interface SyncTraversalExecution<
  Phase extends string,
  Event,
  Inspection extends TraversalExecutionSnapshot = TraversalExecutionSnapshot,
  EmittedKind extends string = TraversalEventKindForVisitorPhase<Phase>,
> extends TraversalExecutionState<Inspection> {
  // Function properties preserve contravariance: a family cannot be widened to
  // accept phases which its concrete runner does not support.
  runAndIterateObservationEventsUntilSuspendedOrTerminal: {
    (): Generator<Event, void, unknown>;
    <Kind extends EmittedKind>(
      config: TraversalExecutionSelectionPatch<Phase, Kind> & {
        deliveredEventKinds: readonly Kind[];
      },
    ): Generator<
      TraversalEventNarrowedToSelectedKinds<Event, Kind>,
      void,
      unknown
    >;
    (config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>): Generator<
      Event,
      void,
      unknown
    >;
  };
  runUntilSuspendedOrTerminal: (
    config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>,
  ) => this;
}

export interface AsyncTraversalExecution<
  Phase extends string,
  Event,
  Inspection extends TraversalExecutionSnapshot = TraversalExecutionSnapshot,
  EmittedKind extends string = TraversalEventKindForVisitorPhase<Phase>,
> extends TraversalExecutionState<Inspection> {
  runAndIterateObservationEventsUntilSuspendedOrTerminal: {
    (): AsyncGenerator<Event, void, unknown>;
    <Kind extends EmittedKind>(
      config: TraversalExecutionSelectionPatch<Phase, Kind> & {
        deliveredEventKinds: readonly Kind[];
      },
    ): AsyncGenerator<
      TraversalEventNarrowedToSelectedKinds<Event, Kind>,
      void,
      unknown
    >;
    (
      config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>,
    ): AsyncGenerator<Event, void, unknown>;
  };
  runUntilSuspendedOrTerminal: (
    config?: TraversalExecutionSelectionPatch<Phase, EmittedKind>,
  ) => Promise<this>;
}
