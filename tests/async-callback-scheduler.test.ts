import { CallbackScheduler } from '../src/core/drivers/CallbackScheduler';
import { Wakeup } from '../src/core/drivers/Wakeup';
import { captureOutcome } from '../src/core/drivers/captureOutcome';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

test('captures a rejection before the consumer awaits its outcome', async () => {
  const errors: unknown[] = [];
  const listener = (error: unknown) => errors.push(error);
  process.on('unhandledRejection', listener);
  try {
    const error = new Error('late sibling');
    const outcome = captureOutcome(() => Promise.reject(error));
    await eventLoopTurn();
    expect(errors).toEqual([]);
    await expect(outcome).resolves.toEqual({ ok: false, error });
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('captures synchronous throws and preserves undefined failures', async () => {
  await expect(
    captureOutcome(() => {
      throw undefined;
    }),
  ).resolves.toEqual({ ok: false, error: undefined });
  await expect(captureOutcome(() => Promise.reject())).resolves.toEqual({
    ok: false,
    error: undefined,
  });
  await expect(captureOutcome(() => undefined)).resolves.toEqual({
    ok: true,
    value: undefined,
  });
});

test.each([1, 2, Infinity])(
  'limits physical callbacks through settlement at concurrency %s',
  async (limit) => {
    const scheduler = new CallbackScheduler<number>(limit);
    const calls = Array.from({ length: 4 }, () => deferred<number>());
    let active = 0;
    let maximum = 0;

    calls.forEach((call, requestId) => {
      scheduler.enqueue(requestId, () => {
        active += 1;
        maximum = Math.max(maximum, active);
        return call.promise.finally(() => {
          active -= 1;
        });
      });
    });

    scheduler.startEligible(() => true);
    expect(scheduler.inFlight).toBe(Math.min(limit, calls.length));
    expect(maximum).toBe(Math.min(limit, calls.length));

    for (let requestId = 0; requestId < calls.length; requestId += 1) {
      calls[requestId]!.resolve(requestId);
      await eventLoopTurn();
      scheduler.startEligible(() => true);
    }

    expect(maximum).toBe(Math.min(limit, calls.length));
    expect(scheduler.inFlight).toBe(0);
  },
);

test('returns tagged outcomes in settlement order including synchronous throws', async () => {
  const scheduler = new CallbackScheduler<string>(2);
  const first = deferred<string>();
  scheduler.enqueue(10, () => first.promise);
  scheduler.enqueue(11, () => {
    throw undefined;
  });
  scheduler.startEligible(() => true);
  await eventLoopTurn();

  expect(scheduler.takeSettled()).toEqual({
    requestId: 11,
    outcome: { ok: false, error: undefined },
  });
  expect(scheduler.takeSettled()).toBeUndefined();

  first.resolve('first');
  await eventLoopTurn();
  expect(scheduler.takeSettled()).toEqual({
    requestId: 10,
    outcome: { ok: true, value: 'first' },
  });
  expect(scheduler.takeSettled()).toBeUndefined();
});

test('bypasses paused work without reordering eligible peers', async () => {
  const scheduler = new CallbackScheduler<number>(1);
  const running = deferred<number>();
  const second = deferred<number>();
  const started: number[] = [];
  let paused = true;

  scheduler.enqueue(1, () => running.promise);
  scheduler.enqueue(2, () => {
    started.push(2);
    return 2;
  });
  scheduler.enqueue(3, () => {
    started.push(3);
    return second.promise;
  });
  scheduler.enqueue(4, () => {
    started.push(4);
    return 4;
  });

  scheduler.startEligible((requestId) => requestId === 1);
  running.resolve(1);
  await eventLoopTurn();
  scheduler.startEligible((requestId) => requestId !== 2 || !paused);
  expect(started).toEqual([3]);

  second.resolve(3);
  await eventLoopTurn();
  paused = false;
  scheduler.startEligible(() => true);
  expect(started).toEqual([3, 2]);
  await eventLoopTurn();
  scheduler.startEligible(() => true);
  expect(started).toEqual([3, 2, 4]);
});

test('discards only queued callbacks while invoked callbacks retain permits', async () => {
  const scheduler = new CallbackScheduler<number>(1);
  const invoked = deferred<number>();
  const started: number[] = [];
  scheduler.enqueue(1, () => {
    started.push(1);
    return invoked.promise;
  });
  scheduler.enqueue(2, () => {
    started.push(2);
    return 2;
  });
  scheduler.enqueue(3, () => {
    started.push(3);
    return 3;
  });

  scheduler.startEligible(() => true);
  scheduler.discardQueued((requestId) => requestId !== 3);
  scheduler.startEligible(() => true);
  expect(started).toEqual([1]);
  expect(scheduler.inFlight).toBe(1);

  invoked.resolve(1);
  await eventLoopTurn();
  scheduler.startEligible(() => true);
  expect(started).toEqual([1, 3]);
  await eventLoopTurn();
  expect(scheduler.takeSettled()).toEqual({
    requestId: 1,
    outcome: { ok: true, value: 1 },
  });
  expect(scheduler.takeSettled()).toEqual({
    requestId: 3,
    outcome: { ok: true, value: 3 },
  });
});

test.each([0, -1, 1.5, NaN, -Infinity])(
  'rejects invalid concurrency %s',
  (limit) => {
    expect(() => new CallbackScheduler(limit)).toThrow(/positive integer.*Infinity/i);
  },
);

test('remembers and coalesces wakeup notifications', async () => {
  const wakeup = new Wakeup();
  wakeup.notify();
  wakeup.notify();
  await expect(wakeup.wait()).resolves.toBeUndefined();

  let woke = false;
  const waiting = wakeup.wait().then(() => {
    woke = true;
  });
  await Promise.resolve();
  expect(woke).toBe(false);
  wakeup.notify();
  wakeup.notify();
  await waiting;
  expect(woke).toBe(true);

  let wokeAgain = false;
  const waitingAgain = wakeup.wait().then(() => {
    wokeAgain = true;
  });
  await Promise.resolve();
  expect(wokeAgain).toBe(false);
  wakeup.notify();
  await waitingAgain;
});
