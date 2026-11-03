import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type {
  CallbackBindings,
  CallbackReply,
  CallSpec,
  KernelEvent,
  KernelPort,
  RawCallbackResult,
} from '@core/effects/types';

export type SyncDriverState = { inFlightInvocationCount: number };

export function* runSync<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
>(
  kernel: KernelPort<InputVertexTypes, RewrittenVertexTypes>,
  bindings: CallbackBindings<InputVertexTypes, RewrittenVertexTypes>,
  runtimeState: SyncDriverState,
  runnerName?: string,
): Generator<KernelEvent<InputVertexTypes | RewrittenVertexTypes> | null> {
  for (;;) {
    const action = kernel.poll('drive');
    switch (action.kind) {
      case 'CALL':
        invokeAndSubmit(
          kernel,
          bindings,
          runtimeState,
          action.call,
          runnerName,
        );
        break;
      case 'EVENT':
        if (kernel.shouldEmit(action.event.order)) yield action.event;
        kernel.acknowledgeEvent(action.boundaryId);
        break;
      case 'SUSPENDED':
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
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(
  kernel: KernelPort<InputVertexTypes, RewrittenVertexTypes>,
  bindings: CallbackBindings<InputVertexTypes, RewrittenVertexTypes>,
  runtimeState: SyncDriverState,
  call: CallSpec<InputVertexTypes, RewrittenVertexTypes>,
  runnerName?: string,
): void {
  let raw: RawCallbackResult<InputVertexTypes, RewrittenVertexTypes>;
  runtimeState.inFlightInvocationCount += 1;
  try {
    raw = bindings.invoke(call);
  } catch (error) {
    kernel.submit({
      requestId: call.requestId,
      kind: call.kind,
      outcome: { ok: false, error },
    } as CallbackReply<InputVertexTypes, RewrittenVertexTypes>);
    return;
  } finally {
    runtimeState.inFlightInvocationCount -= 1;
  }

  if (raw.kind !== call.kind) {
    throw new Error(
      `Callback binding returned ${raw.kind} for ${call.kind} request`,
    );
  }
  const misuse = observeThenable(raw.value, call.kind, runnerName);
  kernel.submit({
    requestId: call.requestId,
    kind: call.kind,
    outcome:
      misuse === null
        ? { ok: true, value: raw.value }
        : { ok: false, error: misuse },
  } as CallbackReply<InputVertexTypes, RewrittenVertexTypes>);
}

function observeThenable(
  value: unknown,
  callbackName: string,
  runnerName?: string,
): TypeError | null {
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
    return thenableError(callbackName, runnerName, error);
  }
  if (typeof then !== 'function') return null;
  try {
    then.call(
      value,
      () => undefined,
      () => undefined,
    );
  } catch (error) {
    return thenableError(callbackName, runnerName, error);
  }
  return thenableError(callbackName, runnerName);
}

function thenableError(
  callbackName: string,
  runnerName?: string,
  cause?: unknown,
): TypeError {
  const error = new TypeError(
    `Synchronous ${
      runnerName ?? 'runner'
    } callback ${callbackName} returned a thenable`,
  );
  if (arguments.length > 2) {
    (error as TypeError & { cause?: unknown }).cause = cause;
  }
  return error;
}
