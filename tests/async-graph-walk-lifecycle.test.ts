import {
  AsyncGraphWalk,
  GraphWalkPhase as Phase,
  TraversalVisitorCommandName as C,
} from '../src';
import type { AsyncGraphWalkSource, GraphWalkVertexResult } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it('return immediately pauses a pending resolver, retains its vertex, and drains queued demand as done', async () => {
  const started = deferred<void>();
  const resolution = deferred<GraphWalkVertexResult<string>>();
  let lookups = 0;
  const source: AsyncGraphWalkSource<string, undefined, string> = {
    roots: () => [{ vertexId: 'A' }],
    resolveVertex: () => {
      lookups++;
      started.resolve();
      return resolution.promise;
    },
    outgoing: () => [],
  };
  const runner = new AsyncGraphWalk({ source }).createRunner();
  const iterator = runner.iterateEvents();
  const pending = iterator.next();
  const queued = iterator.next();
  await started.promise;
  const closing = iterator.return(undefined);
  const closingAgain = iterator.return(undefined);
  const afterClose = iterator.next();
  expect(runner.inspect()).toMatchObject({
    pauseRequested: true,
    inFlightCallbackCount: 1,
    pendingRequests: [{ operation: 'resolveVertex' }],
  });
  resolution.resolve({ kind: 'found', data: 'A' });
  for (const result of await Promise.all([
    pending,
    queued,
    closing,
    closingAgain,
    afterClose,
  ]))
    expect(result).toEqual({ done: true, value: undefined });
  expect(runner.isHalted()).toBe(true);
  const resumed = runner.iterateEvents({ emitEvents: [Phase.VERTEX] });
  expect((await resumed.next()).value).toMatchObject({ kind: 'vertex' });
  await resumed.return(undefined);
  expect(lookups).toBe(1);
});

it('does not expand after delivery and rejects owners without changing their selectors', async () => {
  const calls: string[] = [];
  const runner = new AsyncGraphWalk({
    source: idGraph(['A'], [['A', []]]),
    expandVertex: async () => {
      calls.push('expand');
      return true;
    },
  }).createRunner();
  const owner = runner.iterateEvents();
  expect((await owner.next()).value).toMatchObject({ kind: 'vertex' });
  await Promise.resolve();
  expect(calls).toEqual([]);
  await expect(runner.run({ emitEvents: [] })).rejects.toThrow(
    'execution owner',
  );
  await expect(runner.iterateEvents({ emitEvents: [] }).next()).rejects.toThrow(
    'execution owner',
  );
  expect(runner.inspect().iterableConfig.emitEvents).toEqual([Phase.VERTEX]);
  await owner.return(undefined);
  expect(calls).toEqual([]);
  expect(await runner.run()).toBe(runner);
  expect(calls).toEqual(['expand']);
});

it('return drains a serial visitor chain while preserving its undelivered observation', async () => {
  const started = deferred<void>();
  const finish = deferred<void>();
  const trace: string[] = [];
  const walk = new AsyncGraphWalk({ source: idGraph(['A'], [['A', []]]) });
  walk.addVisitorFor(Phase.VERTEX, async () => {
    trace.push('first');
    started.resolve();
    await finish.promise;
    trace.push('settled');
  });
  walk.addVisitorFor(Phase.VERTEX, async () => {
    trace.push('second');
  });
  const runner = walk.createRunner();
  const iterator = runner.iterateEvents();
  const pending = iterator.next();
  await started.promise;
  const closing = iterator.return(undefined);
  expect(trace).toEqual(['first']);
  finish.resolve();
  expect(await pending).toEqual({ done: true, value: undefined });
  await closing;
  expect(trace).toEqual(['first', 'settled', 'second']);
  expect(runner.isHalted()).toBe(true);
  expect(runner.summary().counts.observations.vertex).toBe(0);
  const resumed = runner.iterateEvents({ visitorPhases: { include: [] } });
  expect((await resumed.next()).value).toMatchObject({ kind: 'vertex' });
  await resumed.return(undefined);
  expect(trace).toEqual(['first', 'settled', 'second']);
});

it.each([
  'roots',
  'rootNext',
  'outgoing',
  'edgeNext',
  'followEdge',
  'expandVertex',
] as const)(
  'return pauses pending %s without pulling another item or losing continuation',
  async (operation) => {
    const started = deferred<void>();
    const finish = deferred<void>();
    const calls: string[] = [];
    let gated = false;
    const step = async <T>(name: string, value: T): Promise<T> => {
      calls.push(name);
      if (name === operation && !gated) {
        gated = true;
        started.resolve();
        await finish.promise;
      }
      return value;
    };
    const source: AsyncGraphWalkSource<string, undefined, string> = {
      roots: () =>
        step('roots', {
          [Symbol.asyncIterator]() {
            let index = 0;
            return {
              next: () =>
                step(
                  'rootNext',
                  index++ === 0
                    ? { done: false, value: { vertexId: 'A' } }
                    : { done: true, value: undefined },
                ),
            };
          },
        }),
      resolveVertex: (id) =>
        step(`resolve:${id}`, { kind: 'found' as const, data: id }),
      outgoing: ({ vertexId }) =>
        step('outgoing', {
          [Symbol.asyncIterator]() {
            let index = 0;
            return {
              next: () =>
                step(
                  'edgeNext',
                  vertexId === 'A' && index++ === 0
                    ? {
                        done: false,
                        value: { target: { vertexId: 'B' }, data: undefined },
                      }
                    : { done: true, value: undefined },
                ),
            };
          },
        }),
    };
    const runner = new AsyncGraphWalk({
      source,
      emitEvents: [],
      followEdge: () => step('followEdge', true),
      expandVertex: () => step('expandVertex', true),
    }).createRunner();
    const iterator = runner.iterateEvents();
    const pending = iterator.next();
    await started.promise;
    const before = [...calls];
    expect(runner.inspect().pendingRequests).toMatchObject([{ operation }]);
    const closing = iterator.return(undefined);
    finish.resolve();
    expect(await pending).toEqual({ done: true, value: undefined });
    await closing;
    expect(calls).toEqual(before);
    expect(runner.isHalted()).toBe(true);
    await runner.run();
    expect(runner.summary().counts).toMatchObject({
      foundVertices: 2,
      observedLinks: 1,
    });
    expect(calls.filter((call) => call === 'resolve:A')).toHaveLength(1);
    expect(calls.filter((call) => call === 'resolve:B')).toHaveLength(1);
    expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
  },
);

it.each([undefined, null, false, 0, '', Symbol('error')])(
  'retains exact async rejection %p on every execution attempt',
  async (error) => {
    const runner = new AsyncGraphWalk({
      source: idGraph(['A'], [['A', []]]),
      visitors: { vertex: () => Promise.reject(error) },
    }).createRunner();
    for (let attempt = 0; attempt < 2; attempt++) {
      let caught = false;
      try {
        await runner.run();
      } catch (value) {
        caught = true;
        expect(value).toBe(error);
      }
      expect(caught).toBe(true);
      expect(runner.summary().outcome).toEqual({ kind: 'failed', error });
      expect(runner.getStopReason()).toBe('failed');
    }
  },
);

it('throw pauses pending work, preserves source failure, and rejects close with the consumer error', async () => {
  const started = deferred<void>();
  const result = deferred<GraphWalkVertexResult<string>>();
  const runner = new AsyncGraphWalk({
    source: {
      roots: () => [{ vertexId: 'A' }],
      resolveVertex: () => {
        started.resolve();
        return result.promise;
      },
      outgoing: () => [],
    },
  }).createRunner();
  const iterator = runner.iterateEvents();
  const pending = iterator.next();
  await started.promise;
  const throwing = iterator.throw(undefined);
  const closing = iterator.return(undefined);
  const assertions = Promise.all([
    expect(pending).rejects.toBe(null),
    expect(throwing).rejects.toBeUndefined(),
    expect(closing).rejects.toBe(null),
  ]);
  result.reject(null);
  await assertions;
  expect(runner.summary().outcome).toEqual({ kind: 'failed', error: null });
  await expect(runner.run()).rejects.toBe(null);
});

it('unopened and closed returns/throws never acquire ownership or change runner progress', async () => {
  const runner = new AsyncGraphWalk({
    source: idGraph(['A'], [['A', []]]),
  }).createRunner();
  const fresh = runner.iterateEvents();
  await expect(fresh.throw(undefined)).rejects.toBeUndefined();
  expect(await fresh.next()).toEqual({ done: true, value: undefined });
  expect(runner.getStopReason()).toBe(null);
  expect(runner.requestPause()).toBe(false);
  const owner = runner.iterateEvents();
  await owner.next();
  await runner.iterateEvents().return(undefined);
  await expect(runner.iterateEvents().throw('consumer')).rejects.toBe('consumer');
  expect(runner.isHalted()).toBe(false);
  await owner.return(undefined);
  expect(await owner.return(undefined)).toEqual({
    done: true,
    value: undefined,
  });
  await expect(owner.throw(null)).rejects.toBe(null);
  expect(runner.isHalted()).toBe(true);
  await runner.run();
  const summary = runner.summary();
  expect(await runner.run()).toBe(runner);
  expect(runner.summary()).toEqual(summary);
  expect(runner.requestPause()).toBe(false);
});

it('serves queued demand in order and lets independent runners progress while another callback is pending', async () => {
  const started = deferred<void>();
  const finish = deferred<void>();
  const walk = new AsyncGraphWalk({
    source: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
  });
  const independent = walk.createRunner();
  walk.addVisitorFor(Phase.VERTEX, async (event) => {
    if (event.vertex.vertexId === 'A') {
      started.resolve();
      await finish.promise;
    }
  });
  const runner = walk.createRunner();
  const iterator = runner.iterateEvents();
  const first = iterator.next();
  const second = iterator.next();
  const final = iterator.next();
  await started.promise;
  await independent.run();
  expect(independent.summary().outcome).toEqual({ kind: 'exhausted' });
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  finish.resolve();
  expect((await first).value).toMatchObject({ vertex: { vertexId: 'A' } });
  expect((await second).value).toMatchObject({ vertex: { vertexId: 'B' } });
  expect(await final).toEqual({ done: true, value: undefined });
});

it('cooperative pause drains a selected chain and delivers its observation before halting', async () => {
  const calls: string[] = [];
  const walk = new AsyncGraphWalk({ source: idGraph(['A'], [['A', []]]) });
  walk.addVisitorFor(Phase.VERTEX, async () => {
    expect(runner.requestPause()).toBe(true);
    expect(runner.requestPause()).toBe(false);
    calls.push('first');
  });
  walk.addVisitorFor(Phase.VERTEX, async () => {
    calls.push('second');
  });
  const runner = walk.createRunner();
  const iterator = runner.iterateEvents();
  expect((await iterator.next()).value).toMatchObject({ kind: 'vertex' });
  expect(await iterator.next()).toEqual({ done: true, value: undefined });
  expect(runner.isHalted()).toBe(true);
  const paths = runner.iterateEvents({
    emitEvents: [Phase.PATH],
    visitorPhases: { include: [] },
  });
  expect((await paths.next()).value).toMatchObject({ kind: 'path' });
  await paths.return(undefined);
  expect(calls).toEqual(['first', 'second']);
});

it('acknowledges pause between deliveries without new demand or expansion', async () => {
  const runner = new AsyncGraphWalk({
    source: idGraph(['A'], [['A', []]]),
  }).createRunner();
  const iterator = runner.iterateEvents();
  await iterator.next();
  expect(runner.requestPause()).toBe(true);
  await iterator.return(undefined);
  expect(runner.getStopReason()).toBe('paused');
  expect(runner.summary().counts.observations).toEqual({
    vertex: 1,
    edge: 0,
    path: 0,
  });
});

it('retains the admitted async chain across HALT and uses the new lease emission selector', async () => {
  const calls: string[] = [];
  const walk = new AsyncGraphWalk({ source: idGraph(['A'], [['A', []]]) });
  walk.addVisitorGroupFor(Phase.VERTEX, {
    commandCommitMode: 'afterGroup',
    visitors: [
      async () => {
        calls.push('halt');
        return { commands: [{ commandName: C.PAUSE_TRAVERSAL }] };
      },
      async () => {
        calls.push('group-end');
      },
    ],
  });
  walk.addVisitorFor(Phase.VERTEX, async () => {
    calls.push('tail');
  });
  const runner = walk.createRunner();
  await runner.run();
  expect(runner.isHalted()).toBe(true);
  expect(calls).toEqual(['halt', 'group-end']);
  const phases = [Phase.PATH];
  const resumed = runner.iterateEvents({
    emitEvents: phases,
    visitorPhases: { include: [] },
  });
  phases[0] = Phase.VERTEX;
  expect((await resumed.next()).value).toMatchObject({ kind: 'path' });
  expect(calls).toEqual(['halt', 'group-end', 'tail']);
  await resumed.return(undefined);
  await runner.run();
  expect(calls).toEqual(['halt', 'group-end', 'tail']);
});

it('consumer exceptions and successful pending throw pause without failing the runner', async () => {
  const error = Symbol('consumer');
  const runner = new AsyncGraphWalk({
    source: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
  }).createRunner();
  let caught = false;
  try {
    for await (const _event of runner.iterateEvents()) throw error;
  } catch (value) {
    caught = true;
    expect(value).toBe(error);
  }
  expect(caught).toBe(true);
  expect(runner.isHalted()).toBe(true);
  const next = runner.iterateEvents();
  expect((await next.next()).value).toMatchObject({
    vertex: { vertexId: 'B' },
  });
  await expect(next.throw(error)).rejects.toBe(error);
  expect(runner.isHalted()).toBe(true);
  expect(runner.summary().outcome).toBe(null);
  await runner.run();
  expect(runner.summary().outcome).toEqual({ kind: 'exhausted' });
});

it('invalid selectors fail before acquisition and immediate return admits no source work', async () => {
  const runner = new AsyncGraphWalk({
    source: {
      roots: () => {
        throw new Error('source must not be called');
      },
      outgoing: () => [],
    },
  }).createRunner();
  expect(() =>
    runner.iterateEvents({ emitEvents: ['invalid' as Phase] }),
  ).toThrow(TypeError);
  const iterator = runner.iterateEvents();
  const pending = iterator.next();
  await iterator.return(undefined);
  expect(await pending).toEqual({ done: true, value: undefined });
  expect(runner.isHalted()).toBe(true);
  expect(runner.summary().counts.steps).toBe(0);
});

it('completion records cannot corrupt later iterator completion', async () => {
  const runner = new AsyncGraphWalk({ source: idGraph([], []) }).createRunner();
  const first = await runner.iterateEvents().next();
  Reflect.set(first, 'done', false);
  expect(await runner.iterateEvents().next()).toEqual({
    done: true,
    value: undefined,
  });
});
