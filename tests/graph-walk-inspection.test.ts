import {
  AsyncGraphWalk,
  GraphWalk,
  GraphWalkPhase as Phase,
  TraversalRunnerStatus as Status,
} from '../src';

it('captures passive frozen detached mechanical state while a visitor is pending', async () => {
  const id = { secret: 'caller id' };
  const data = { secret: 'caller data' };
  let release!: () => void;
  let entered!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let calls = 0;
  const runner = new AsyncGraphWalk({
    source: {
      roots: () => [{ vertexId: id, resolution: { kind: 'found', data } }],
      outgoing: () => {
        calls++;
        return [];
      },
    },
    visitors: {
      [Phase.VERTEX]: async () => {
        entered();
        await pending;
      },
    },
  }).createRunner();
  const running = runner.run();
  await started;
  const snapshot = runner.inspect();
  expect(snapshot).toMatchObject({
    kind: 'graph-walk',
    sourceMode: 'graph',
    concurrency: 1,
    status: Status.RUNNING,
    execution: 'async',
    inFlightCallbackCount: 1,
    bufferedEventCount: 2,
    frontierSize: 0,
    openSourceIteratorCount: 1,
    pendingObservationKinds: [Phase.VERTEX, Phase.PATH],
    activeVisitor: { phase: Phase.VERTEX, position: 0 },
    pendingRequests: [{ operation: 'visitor' }],
  });
  const token = snapshot.pendingRequests[0]!.vertexToken;
  expect(typeof token).toBe('symbol');
  expect(runner.inspect().pendingRequests[0]!.vertexToken).toBe(token);
  function check(value: unknown) {
    expect(value).not.toBe(id);
    expect(value).not.toBe(data);
    expect(typeof value).not.toBe('function');
    expect(value).not.toBeInstanceOf(Promise);
    if (value !== null && typeof value === 'object') {
      expect(Object.isFrozen(value)).toBe(true);
      for (const child of Object.values(value)) check(child);
    }
  }
  check(snapshot);
  expect(() => Object.assign(snapshot.counts, { steps: 900 })).toThrow();
  expect(runner.inspect()).toEqual(snapshot);
  expect(runner.inspect()).not.toBe(snapshot);
  expect(calls).toBe(0);
  expect(Object.isFrozen(id)).toBe(false);
  expect(Object.isFrozen(data)).toBe(false);
  expect(runner.requestPause()).toBe(true);
  expect(runner.requestPause()).toBe(false);
  release();
  await running;
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(runner.inspect().inFlightCallbackCount).toBe(0);
  expect(runner.inspect().bufferedEventCount).toBe(1);
  await runner.close();
  expect(runner.inspect()).toMatchObject({
    status: Status.FINISHED,
    bufferedEventCount: 0,
    frontierSize: 0,
    openSourceIteratorCount: 0,
    activeVisitor: null,
    pendingRequests: [],
  });
});

it('freezes owned summary records without freezing arbitrary failure objects', () => {
  const error = { reason: 'caller error' };
  const runner = new GraphWalk({
    source: {
      roots() {
        throw error;
      },
      outgoing: () => [],
    },
  }).createRunner();
  try {
    runner.run();
  } catch (observed) {
    expect(observed).toBe(error);
  }
  const summary = runner.summary();
  expect(Object.isFrozen(summary)).toBe(true);
  expect(Object.isFrozen(summary.counts)).toBe(true);
  expect(Object.isFrozen(summary.counts.observations)).toBe(true);
  expect(Object.isFrozen(summary.outcome)).toBe(true);
  expect(Object.isFrozen(error)).toBe(false);
  expect(runner.summary()).not.toBe(summary);
  expect(runner.requestPause()).toBe(false);
});

it('uses consistent private tokens across source, predicate, observation, and cleanup requests', () => {
  const tokens: (symbol | undefined)[] = [];
  const operations: string[] = [];
  const id = {
    toString() {
      throw new Error('Must not stringify caller IDs');
    },
  };
  function snapshot() {
    const inspection = runner.inspect();
    expect(inspection.inFlightCallbackCount).toBe(1);
    operations.push(inspection.pendingRequests[0]!.operation);
    tokens.push(inspection.pendingRequests[0]!.vertexToken);
  }
  const runner = new GraphWalk({
    strategy: 'depthFirst',
    limits: { maxOccurrences: 2 },
    source: {
      roots: () => [{ vertexId: id }],
      resolveVertex: () => {
        snapshot();
        return { kind: 'found', data: id };
      },
      outgoing: () => {
        snapshot();
        return {
          [Symbol.iterator]() {
            return {
              next() {
                snapshot();
                return {
                  done: false,
                  value: { target: { vertexId: id }, data: id },
                };
              },
              return() {
                snapshot();
                return { done: true, value: undefined };
              },
            };
          },
        };
      },
    },
    followEdge: () => {
      snapshot();
      return true;
    },
    expandVertex: () => {
      snapshot();
      return true;
    },
    visitors: { [Phase.VERTEX]: snapshot, [Phase.EDGE]: snapshot },
  }).createRunner();
  runner.run();
  expect(operations).toEqual([
    'resolveVertex',
    'visitor',
    'expandVertex',
    'outgoing',
    'edgeNext',
    'followEdge',
    'visitor',
    'iteratorReturn',
  ]);
  expect(typeof tokens[0]).toBe('symbol');
  expect(new Set(tokens).size).toBe(1);
  expect(Object.isFrozen(id)).toBe(false);
});

it('keeps tokens local to each runner, and terminal close discards an unissued resolver without invoking it', async () => {
  let release!: (value: IteratorResult<{ vertexId: number }>) => void;
  let entered!: () => void;
  let pending = new Promise<IteratorResult<{ vertexId: number }>>((resolve) => {
    release = resolve;
  });
  let started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let resolutions = 0;
  let returns = 0;
  const factory = new AsyncGraphWalk({
    source: {
      roots: () => ({
        [Symbol.asyncIterator]() {
          return {
            next() {
              entered();
              return pending;
            },
            async return() {
              returns++;
              return { done: true, value: undefined };
            },
          };
        },
      }),
      resolveVertex: () => {
        resolutions++;
        return { kind: 'found', data: 1 };
      },
      outgoing: () => [],
    },
  });
  const runner = factory.createRunner();
  const iterator = runner.getIterable();
  const next = iterator.next();
  await started;
  const returned = iterator.return();
  release({ done: false, value: { vertexId: 1 } });
  await next;
  await returned;
  const paused = runner.inspect();
  expect(paused).toMatchObject({
    status: Status.HALTED,
    inFlightCallbackCount: 0,
    pendingRequests: [{ operation: 'resolveVertex' }],
  });
  pending = new Promise<IteratorResult<{ vertexId: number }>>((resolve) => {
    release = resolve;
  });
  started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const other = factory.createRunner();
  const otherIterator = other.getIterable();
  const otherNext = otherIterator.next();
  await started;
  const otherReturn = otherIterator.return();
  release({ done: false, value: { vertexId: 1 } });
  await otherNext;
  await otherReturn;
  expect(other.inspect().pendingRequests[0]!.vertexToken).not.toBe(
    paused.pendingRequests[0]!.vertexToken,
  );
  await runner.close();
  await other.close();
  expect(resolutions).toBe(0);
  expect(returns).toBe(2);
  expect(runner.inspect().pendingRequests).toEqual([]);
});
