import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  CallbackBindings,
  CallbackReply,
  CallSpec,
  KernelEvent,
  KernelPort,
  RawCallbackResult,
} from '@core/effects/types';

export type SyncDriverState = { inFlightCallbackCount: number };

export function* runSync<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  kernel: KernelPort<T, R>,
  bindings: CallbackBindings<T, R>,
  runtimeState: SyncDriverState,
): Generator<KernelEvent<T | R> | null> {
  for (;;) {
    const action = kernel.poll('drive');
    switch (action.kind) {
      case 'CALL':
        invokeAndSubmit(kernel, bindings, runtimeState, action.call);
        break;
      case 'EVENT':
        yield action.event;
        kernel.acknowledgeEvent(action.boundaryId);
        break;
      case 'HALTED':
        yield null;
        break;
      case 'FINISHED':
        return;
      case 'FAILED':
        throw action.error;
      case 'WAIT':
        throw new Error(
          'Synchronous runner stalled without a callback or retained boundary',
        );
    }
  }
}

function invokeAndSubmit<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
>(
  kernel: KernelPort<T, R>,
  bindings: CallbackBindings<T, R>,
  runtimeState: SyncDriverState,
  call: CallSpec<T, R>,
): void {
  let raw: RawCallbackResult<T, R>;
  runtimeState.inFlightCallbackCount += 1;
  try {
    raw = bindings.invoke(call);
  } catch (error) {
    kernel.submit({
      requestId: call.requestId,
      kind: call.kind,
      outcome: { ok: false, error },
    } as CallbackReply<T, R>);
    return;
  } finally {
    runtimeState.inFlightCallbackCount -= 1;
  }

  if (raw.kind !== call.kind) {
    throw new Error(
      `Callback binding returned ${raw.kind} for ${call.kind} request`,
    );
  }
  const misuse = observeThenable(raw.value, call.kind);
  kernel.submit({
    requestId: call.requestId,
    kind: call.kind,
    outcome:
      misuse === null
        ? { ok: true, value: raw.value }
        : { ok: false, error: misuse },
  } as CallbackReply<T, R>);
}

function observeThenable(value: unknown, callbackName: string): TypeError | null {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return null;
  }
  let then: unknown;
  try {
    then = (value as { then?: unknown }).then;
  } catch (error) {
    return thenableError(callbackName, error);
  }
  if (typeof then !== 'function') return null;
  try {
    then.call(
      value,
      () => undefined,
      () => undefined,
    );
  } catch (error) {
    return thenableError(callbackName, error);
  }
  return thenableError(callbackName);
}

function thenableError(callbackName: string, cause?: unknown): TypeError {
  const error = new TypeError(
    `Synchronous runner callback ${callbackName} returned a thenable`,
  );
  if (arguments.length > 1) {
    (error as TypeError & { cause?: unknown }).cause = cause;
  }
  return error;
}
