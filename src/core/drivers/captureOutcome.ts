import type { Outcome } from '@core/effects/types';
import type { MaybePromise } from '@core/graph/types';

export function captureOutcome<T>(
  invoke: () => MaybePromise<T>,
): Promise<Outcome<T>> {
  try {
    return Promise.resolve(invoke()).then(
      (value): Outcome<T> => ({ ok: true, value }),
      (error: unknown): Outcome<T> => ({ ok: false, error }),
    );
  } catch (error) {
    return Promise.resolve({ ok: false, error });
  }
}
