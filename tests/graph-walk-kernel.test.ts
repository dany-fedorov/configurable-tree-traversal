import { GraphWalk, GraphWalkRunner, GraphWalkPhase as Phase } from '../src';
import { WalkKernel } from '../src/traversals/graph-walk/lib/WalkKernel';
import { SyncWalkSession } from '../src/traversals/graph-walk/lib/SyncWalkSession';
import { normalizeWalkOptions } from '../src/traversals/graph-walk/lib/normalizeWalkOptions';
import { idGraph } from './helpers/graph-walk-fixtures';

it('keeps poll passive and settles each issued request exactly once', () => {
  const calls: string[] = [];
  const source = {
    roots() {
      calls.push('roots');
      return [];
    },
    outgoing: () => [],
  };
  const kernel = new WalkKernel(normalizeWalkOptions({ source }));
  expect(kernel.poll()).toEqual({ kind: 'WAIT' });
  expect(() => kernel.submit(0, { ok: true, value: [] })).toThrow();
  expect(() => kernel.acknowledgeObservation(0)).toThrow();
  kernel.resume();
  const action = kernel.poll();
  if (action.kind !== 'CALL') throw new Error('Expected source request');
  expect(calls).toEqual([]);
  expect(kernel.poll()).toEqual({ kind: 'WAIT' });
  expect(kernel.inspect()).toMatchObject({
    inFlightCallbackCount: 1,
    pendingRequests: [{ requestId: action.requestId, operation: 'roots' }],
  });
  expect(() =>
    kernel.submit(action.requestId + 1, { ok: true, value: [] }),
  ).toThrow();
  kernel.submit(action.requestId, { ok: true, value: action.invoke() });
  expect(calls).toEqual(['roots']);
  expect(() =>
    kernel.submit(action.requestId, { ok: true, value: [] }),
  ).toThrow();
  expect(kernel.inspect().inFlightCallbackCount).toBe(0);
  expect(kernel.requestPause()).toBe(true);
  expect(kernel.requestPause()).toBe(false);
  expect(kernel.poll()).toEqual({ kind: 'HALTED' });
  expect(kernel.poll()).toEqual({ kind: 'HALTED' });
});

it('rejects unissued settlements and wrong observation acknowledgements', () => {
  const kernel = new WalkKernel(
    normalizeWalkOptions({ source: idGraph(['A'], [['A', []]]) }),
  );
  kernel.resume();
  const roots = kernel.poll();
  if (roots.kind !== 'CALL') throw new Error('Expected roots');
  kernel.submit(roots.requestId, { ok: true, value: roots.invoke() });
  const next = kernel.poll();
  if (next.kind !== 'CALL') throw new Error('Expected pull');
  kernel.submit(next.requestId, { ok: true, value: next.invoke() });
  expect(kernel.inspect().pendingRequests[0]?.operation).toBe('resolveVertex');
  expect(() =>
    kernel.submit(next.requestId + 1, { ok: true, value: null }),
  ).toThrow();
  const resolve = kernel.poll();
  if (resolve.kind !== 'CALL') throw new Error('Expected resolution');
  kernel.submit(resolve.requestId, { ok: true, value: resolve.invoke() });
  const observation = kernel.poll();
  if (observation.kind !== 'OBSERVATION')
    throw new Error('Expected observation');
  expect(() =>
    kernel.acknowledgeObservation(observation.boundaryId + 1),
  ).toThrow();
  expect(kernel.poll()).toBe(observation);
  expect(observation.event()).toEqual({
    kind: 'vertex',
    vertex: { vertexId: 'A', data: 'A' },
    depth: 0,
    via: null,
  });
});

it('retains terminal outcomes when the internal close transition repeats', () => {
  const kernel = new WalkKernel(
    normalizeWalkOptions({ source: idGraph([], []) }),
  );
  kernel.beginClose();
  kernel.beginClose();
  kernel.resume();
  expect(kernel.poll()).toEqual({ kind: 'FINISHED' });
  expect(kernel.summary().outcome).toEqual({ kind: 'closed' });
  const failed = new WalkKernel(
    normalizeWalkOptions({ source: idGraph([], []) }),
  );
  failed.resume();
  const call = failed.poll();
  if (call.kind !== 'CALL') throw new Error('Expected roots');
  failed.submit(call.requestId, { ok: false, error: undefined });
  failed.beginClose();
  expect(failed.poll()).toEqual({ kind: 'FAILED', error: undefined });
});

it('prevents a synchronous session from acquiring externally outstanding work', () => {
  const kernel = new WalkKernel(
    normalizeWalkOptions({ source: idGraph([], []) }),
  );
  kernel.resume();
  kernel.poll();
  const session = new SyncWalkSession(kernel);
  expect(() => session.getIterable().next()).toThrow('unsettled request');
});

it('reports in-flight requests passively from inside source calls', () => {
  const snapshots: unknown[] = [];
  const source = {
    roots() {
      snapshots.push(runner.inspect());
      return [{ vertexId: 'A' }];
    },
    resolveVertex() {
      snapshots.push(runner.inspect());
      return { kind: 'found' as const, data: 'A' };
    },
    outgoing() {
      snapshots.push(runner.inspect());
      return [];
    },
  };
  const runner: GraphWalkRunner<string, unknown, string> = new GraphWalk({
    source,
  }).createRunner();
  const iterator = runner.getIterable({
    visitorPhases: { exclude: [Phase.PATH] },
  });
  iterator.next();
  expect(runner.inspect().openSourceIteratorCount).toBe(1);
  iterator.next();
  expect(snapshots).toEqual([
    expect.objectContaining({
      inFlightCallbackCount: 1,
      pendingRequests: [expect.objectContaining({ operation: 'roots' })],
    }),
    expect.objectContaining({
      inFlightCallbackCount: 1,
      pendingRequests: [
        expect.objectContaining({ operation: 'resolveVertex' }),
      ],
    }),
    expect.objectContaining({
      inFlightCallbackCount: 1,
      pendingRequests: [expect.objectContaining({ operation: 'outgoing' })],
    }),
  ]);
  expect(runner).toBeInstanceOf(GraphWalkRunner);
});
