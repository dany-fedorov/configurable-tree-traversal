import type { Outcome } from '@core/effects/types';
import type { MaybePromise } from '@core/graph/types';
import { captureOutcome } from '@core/drivers/captureOutcome';

type QueuedCallback<T> = {
  requestId: number;
  invoke: () => MaybePromise<T>;
};

export type SettledCallback<T> = {
  requestId: number;
  outcome: Outcome<T>;
};

export class CallbackScheduler<T> {
  private readonly limit: number;
  private readonly queued: QueuedCallback<T>[] = [];
  private readonly settled: SettledCallback<T>[] = [];
  private activeCount = 0;

  public constructor(limit: number) {
    if (limit !== Infinity && (!Number.isInteger(limit) || limit <= 0)) {
      throw new TypeError('Callback limit must be a positive integer or Infinity');
    }
    this.limit = limit;
  }

  public get inFlight(): number {
    return this.activeCount;
  }

  public enqueue(requestId: number, invoke: () => MaybePromise<T>): void {
    this.queued.push({ requestId, invoke });
  }

  public startEligible(predicate: (requestId: number) => boolean): void {
    for (
      let index = 0;
      index < this.queued.length && this.activeCount < this.limit;
    ) {
      const callback = this.queued[index]!;
      if (!predicate(callback.requestId)) {
        index += 1;
        continue;
      }

      this.queued.splice(index, 1);
      this.activeCount += 1;
      void captureOutcome(callback.invoke).then((outcome) => {
        this.activeCount -= 1;
        this.settled.push({ requestId: callback.requestId, outcome });
      });
    }
  }

  public takeSettled(): SettledCallback<T> | undefined {
    return this.settled.shift();
  }

  public discardQueued(predicate: (requestId: number) => boolean): void {
    for (let index = this.queued.length - 1; index >= 0; index -= 1) {
      if (predicate(this.queued[index]!.requestId)) {
        this.queued.splice(index, 1);
      }
    }
  }
}
