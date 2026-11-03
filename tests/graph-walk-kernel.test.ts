import {
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  GraphWalkRunner,
} from '../src';
import { InternalGraphWalkRunner } from '../src/traversals/graph-walk/GraphWalkRunner';
import { normalizeWalkOptions } from '../src/traversals/graph-walk/lib/normalizeWalkOptions';
import { SyncWalkSession } from '../src/traversals/graph-walk/lib/SyncWalkSession';
import { WalkKernel } from '../src/traversals/graph-walk/lib/WalkKernel';
import { idGraph } from './helpers/graph-walk-fixtures';

it('keeps poll passive and settles each issued request exactly once', () => {
  const calls: string[] = [];
  const source = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets() {
      calls.push('roots');
      return [];
    },
    enumerateOutgoingLinks: () => [],
  };
  const kernel = new WalkKernel(
    normalizeWalkOptions({ graphWalkDiscoverySource: source }),
  );
  expect(kernel.poll()).toEqual({ kind: 'WAIT' });
  expect(() => kernel.submit(0, { ok: true, value: [] })).toThrow();
  expect(() => kernel.acknowledgeObservation(0)).toThrow();
  kernel.resume();
  const action = kernel.poll();
  if (action.kind !== 'CALL') throw new Error('Expected source request');
  expect(calls).toEqual([]);
  expect(kernel.poll()).toEqual({ kind: 'WAIT' });
  expect(kernel.captureExecutionSnapshot()).toMatchObject({
    inFlightInvocationCount: 1,
    pendingInvocationRequests: [
      {
        runnerLocalInvocationRequestId: action.runnerLocalInvocationRequestId,
        operation: 'enumerateRootTargets',
      },
    ],
  });
  expect(() =>
    kernel.submit(action.runnerLocalInvocationRequestId + 1, {
      ok: true,
      value: [],
    }),
  ).toThrow();
  kernel.submit(action.runnerLocalInvocationRequestId, {
    ok: true,
    value: action.invoke(),
  });
  expect(calls).toEqual(['roots']);
  expect(() =>
    kernel.submit(action.runnerLocalInvocationRequestId, {
      ok: true,
      value: [],
    }),
  ).toThrow();
  expect(kernel.captureExecutionSnapshot().inFlightInvocationCount).toBe(0);
  expect(kernel.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
  expect(kernel.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  expect(kernel.poll()).toEqual({ kind: 'SUSPENDED' });
  expect(kernel.poll()).toEqual({ kind: 'SUSPENDED' });
});

it('rejects unissued settlements and wrong observation acknowledgements', () => {
  const kernel = new WalkKernel(
    normalizeWalkOptions({
      graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    }),
  );
  kernel.resume();
  const roots = kernel.poll();
  if (roots.kind !== 'CALL') throw new Error('Expected roots');
  kernel.submit(roots.runnerLocalInvocationRequestId, {
    ok: true,
    value: roots.invoke(),
  });
  const next = kernel.poll();
  if (next.kind !== 'CALL') throw new Error('Expected pull');
  kernel.submit(next.runnerLocalInvocationRequestId, {
    ok: true,
    value: next.invoke(),
  });
  expect(
    kernel.captureExecutionSnapshot().pendingInvocationRequests[0]?.operation,
  ).toBe('resolveVertexDataById');
  expect(() =>
    kernel.submit(next.runnerLocalInvocationRequestId + 1, {
      ok: true,
      value: null,
    }),
  ).toThrow();
  const resolve = kernel.poll();
  if (resolve.kind !== 'CALL') throw new Error('Expected resolution');
  kernel.submit(resolve.runnerLocalInvocationRequestId, {
    ok: true,
    value: resolve.invoke(),
  });
  const observation = kernel.poll();
  if (observation.kind !== 'OBSERVATION')
    throw new Error('Expected observation');
  expect(() =>
    kernel.acknowledgeObservation(observation.boundaryId + 1),
  ).toThrow();
  expect(kernel.poll()).toBe(observation);
  expect(observation.event()).toEqual({
    eventKind: 'vertexOccurrence',
    vertex: { vertexId: 'A', vertexData: 'A' },
    vertexHopDepth: 0,
    incomingEdgeFromParentRouteOccurrence: null,
  });
});

it('retains terminal outcomes when the internal close transition repeats', () => {
  const kernel = new WalkKernel(
    normalizeWalkOptions({ graphWalkDiscoverySource: idGraph([], []) }),
  );
  kernel.beginClose();
  kernel.beginClose();
  kernel.resume();
  expect(kernel.poll()).toEqual({ kind: 'FINISHED' });
  expect(kernel.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'permanentlyClosedByCaller',
  });
  const failed = new WalkKernel(
    normalizeWalkOptions({ graphWalkDiscoverySource: idGraph([], []) }),
  );
  failed.resume();
  const call = failed.poll();
  if (call.kind !== 'CALL') throw new Error('Expected roots');
  failed.submit(call.runnerLocalInvocationRequestId, {
    ok: false,
    error: undefined,
  });
  failed.beginClose();
  expect(failed.poll()).toEqual({ kind: 'FAILED', error: undefined });
});

it('prevents a synchronous session from acquiring externally outstanding work', () => {
  const kernel = new WalkKernel(
    normalizeWalkOptions({ graphWalkDiscoverySource: idGraph([], []) }),
  );
  kernel.resume();
  kernel.poll();
  const session = new SyncWalkSession(kernel);
  expect(() =>
    session.runAndIterateObservationEventsUntilSuspendedOrTerminal().next(),
  ).toThrow('unsettled request');
});

it('reports in-flight requests passively from inside source calls', () => {
  const snapshots: unknown[] = [];
  const source = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets() {
      snapshots.push(runner.captureExecutionSnapshot());
      return [{ vertexId: 'A' }];
    },
    resolveVertexDataById() {
      snapshots.push(runner.captureExecutionSnapshot());
      return { kind: 'found' as const, vertexData: 'A' };
    },
    enumerateOutgoingLinks() {
      snapshots.push(runner.captureExecutionSnapshot());
      return [];
    },
  };
  const runner: GraphWalkRunner<string, unknown, string> = new GraphWalkBuilder(
    {
      graphWalkDiscoverySource: source,
    },
  ).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { exclude: [Phase.ROUTE_PREFIX] },
    });
  iterator.next();
  expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(1);
  iterator.next();
  expect(snapshots).toEqual([
    expect.objectContaining({
      inFlightInvocationCount: 1,
      pendingInvocationRequests: [
        expect.objectContaining({ operation: 'enumerateRootTargets' }),
      ],
    }),
    expect.objectContaining({
      inFlightInvocationCount: 1,
      pendingInvocationRequests: [
        expect.objectContaining({ operation: 'resolveVertexDataById' }),
      ],
    }),
    expect.objectContaining({
      inFlightInvocationCount: 1,
      pendingInvocationRequests: [
        expect.objectContaining({ operation: 'enumerateOutgoingLinks' }),
      ],
    }),
  ]);
  expect(runner).toBeInstanceOf(InternalGraphWalkRunner);
});
