import type { TreeOrDagCallbackDriverSnapshot } from '@core/CoreInspection';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  CallbackBindings,
  CallbackReply,
  CallbackValues,
  CallSpec,
  KernelEvent,
  KernelPort,
  PumpMode,
} from '@core/effects/types';
import type { AsyncSessionControl, SessionProgress } from '@core/kernelTypes';
import { CallbackScheduler } from '@core/drivers/CallbackScheduler';
import { Wakeup } from '@core/drivers/Wakeup';

export type AsyncDriverControl<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = AsyncSessionControl<KernelEvent<InputVertexTypes>> & {
  notifyProgress(): void;
};

export function createAsyncDriver<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(
  kernel: KernelPort<InputVertexTypes, RewrittenVertexTypes>,
  bindings: CallbackBindings<InputVertexTypes, RewrittenVertexTypes>,
  maxConcurrentCallbackInvocations: number,
): AsyncDriverControl<InputVertexTypes | RewrittenVertexTypes> {
  const wakeup = new Wakeup();
  const scheduler = new CallbackScheduler<
    CallbackValues<InputVertexTypes, RewrittenVertexTypes>[keyof CallbackValues<
      InputVertexTypes,
      RewrittenVertexTypes
    >]
  >(maxConcurrentCallbackInvocations, () => wakeup.notify());
  const calls = new Map<
    number,
    CallSpec<InputVertexTypes, RewrittenVertexTypes>
  >();
  const closeAcknowledgedBoundaries = new Set<number>();
  let emittedBoundaryId: number | null = null;
  let closing = false;

  function clearFailedBoundaryBookkeeping(): void {
    closeAcknowledgedBoundaries.clear();
    emittedBoundaryId = null;
  }

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
      } as CallbackReply<InputVertexTypes, RewrittenVertexTypes>);
    }
  }

  function enqueue(
    call: CallSpec<InputVertexTypes, RewrittenVertexTypes>,
  ): void {
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
    advance(
      mode: PumpMode,
    ): SessionProgress<KernelEvent<InputVertexTypes | RewrittenVertexTypes>> {
      if (closing && emittedBoundaryId !== null) {
        kernel.acknowledgeEvent(emittedBoundaryId);
        closeAcknowledgedBoundaries.add(emittedBoundaryId);
        emittedBoundaryId = null;
      }
      try {
        submitSettled();
        let effectiveMode = mode;
        for (;;) {
          const action = kernel.poll(effectiveMode);
          discardInvalidQueued();
          if (action.kind === 'CALL') enqueue(action.call);
          scheduler.startEligible((requestId) => {
            // Invoking one queued callback can request pause reentrantly, so
            // refresh the mode before admitting each subsequent callback.
            if (kernel.isHaltRequested()) effectiveMode = 'drain';
            return kernel.isRequestEligible(requestId, effectiveMode);
          });
          if (action.kind === 'EVENT') {
            if (action.boundaryId === emittedBoundaryId)
              return { kind: 'WAIT' };
            emittedBoundaryId = action.boundaryId;
            return action;
          }
          if (action.kind === 'FAILED') clearFailedBoundaryBookkeeping();
          if (action.kind !== 'CALL') return action;
        }
      } catch (error) {
        clearFailedBoundaryBookkeeping();
        throw error;
      }
    },
    shouldEmitEvent: (event) => kernel.shouldEmit(event.order),
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
    resume: (config, preparation) => {
      closing = false;
      kernel.resume(config, preparation);
    },
    getTraversalLifecycleStatus: () => kernel.getTraversalLifecycleStatus(),
    getTraversalStopReason: () => kernel.getTraversalStopReason(),
    getFailure: () => kernel.getFailure(),
    captureExecutionSnapshot(): TreeOrDagCallbackDriverSnapshot {
      return Object.freeze({
        ...kernel.captureExecutionSnapshot(),
        inFlightInvocationCount: scheduler.inFlight,
      });
    },
    waitForProgress: () => wakeup.wait(),
    notifyProgress: () => wakeup.notify(),
  };
}

export const runAsync = createAsyncDriver;
