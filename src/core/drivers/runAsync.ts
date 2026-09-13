import type { DriverInspection } from '@core/CoreInspection';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  CallbackBindings,
  CallbackReply,
  CallbackValues,
  CallSpec,
  KernelEvent,
  KernelPort,
  PumpMode,
} from '@core/effects/types';
import type {
  AsyncSessionControl,
  SessionProgress,
} from '@core/kernelTypes';
import { CallbackScheduler } from '@core/drivers/CallbackScheduler';
import { Wakeup } from '@core/drivers/Wakeup';

export type AsyncDriverControl<T extends TreeTypeParameters> =
  AsyncSessionControl<KernelEvent<T>>;

export function createAsyncDriver<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  kernel: KernelPort<T, R>,
  bindings: CallbackBindings<T, R>,
  concurrency: number,
): AsyncDriverControl<T | R> {
  const wakeup = new Wakeup();
  const scheduler = new CallbackScheduler<
    CallbackValues<T, R>[keyof CallbackValues<T, R>]
  >(concurrency, () => wakeup.notify());
  const calls = new Map<number, CallSpec<T, R>>();
  const closeAcknowledgedBoundaries = new Set<number>();
  let emittedBoundaryId: number | null = null;
  let closing = false;

  function discardInvalidQueued(): void {
    const discarded = scheduler.discardQueued(
      (requestId) => !kernel.isRequestValid(requestId),
    );
    for (const requestId of discarded) {
      calls.delete(requestId);
      kernel.discardRequest(requestId);
    }
  }

  function submitSettled(): void {
    for (;;) {
      const settled = scheduler.takeSettled();
      if (settled === undefined) return;
      const call = calls.get(settled.requestId)!;
      calls.delete(settled.requestId);
      kernel.submit({
        requestId: call.requestId,
        kind: call.kind,
        outcome: settled.outcome,
      } as CallbackReply<T, R>);
    }
  }

  function enqueue(call: CallSpec<T, R>): void {
    calls.set(call.requestId, call);
    scheduler.enqueue(call.requestId, () => {
      const raw = bindings.invoke(call);
      if (raw.kind !== call.kind) {
        throw new Error(
          `Callback binding returned ${raw.kind} for ${call.kind} request`,
        );
      }
      return raw.value;
    });
  }

  return {
    advance(mode: PumpMode): SessionProgress<KernelEvent<T | R>> {
      if (closing && emittedBoundaryId !== null) {
        kernel.acknowledgeEvent(emittedBoundaryId);
        closeAcknowledgedBoundaries.add(emittedBoundaryId);
        emittedBoundaryId = null;
      }
      submitSettled();
      for (;;) {
        const action = kernel.poll(mode);
        discardInvalidQueued();
        if (action.kind === 'CALL') enqueue(action.call);
        scheduler.startEligible((requestId) =>
          kernel.isRequestEligible(requestId, mode),
        );
        if (action.kind === 'EVENT') {
          if (action.boundaryId === emittedBoundaryId) return { kind: 'WAIT' };
          emittedBoundaryId = action.boundaryId;
          return action;
        }
        if (action.kind !== 'CALL') return action;
      }
    },
    acknowledgeEvent: (boundaryId) => {
      if (closeAcknowledgedBoundaries.delete(boundaryId)) return;
      kernel.acknowledgeEvent(boundaryId);
      emittedBoundaryId = null;
    },
    requestHalt: () => {
      closing = true;
      kernel.requestHalt();
      wakeup.notify();
    },
    isHaltRequested: () => kernel.isHaltRequested(),
    resume: (config) => {
      closing = false;
      kernel.resume(config);
    },
    getStatus: () => kernel.getStatus(),
    getFailure: () => kernel.getFailure(),
    inspect(): DriverInspection {
      return Object.freeze({
        ...kernel.inspect(),
        inFlightCallbackCount: scheduler.inFlight,
      });
    },
    waitForProgress: () => wakeup.wait(),
  };
}

export const runAsync = createAsyncDriver;
