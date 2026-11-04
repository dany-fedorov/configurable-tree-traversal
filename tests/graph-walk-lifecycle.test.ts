import {
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalVisitorCommandName as C,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkDiscoverySource } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it.each([null, undefined, false, 0, '', Symbol('failure')])(
  'retains and rethrows exact visitor failure %p',
  (error) => {
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
      visitorsByObservationKind: {
        vertexOccurrence: () => {
          throw error;
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    for (let attempt = 0; attempt < 2; attempt++) {
      let caught = false;
      try {
        runner.runUntilSuspendedOrTerminal();
      } catch (value) {
        caught = true;
        expect(value).toBe(error);
      }
      expect(caught).toBe(true);
      expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
      expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
        kind: 'failed',
        error,
      });
    }
  },
);

it('drains the admitted visitor chain on cooperative pause with emissions disabled', () => {
  const seen: string[] = [];
  const fixture = contextFixture();
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: fixture.source,
    deliveredEventKinds: [],
  });
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, (event) => {
    seen.push(`first:${event.vertex.vertexId}`);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
    expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  });
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, (event) => {
    seen.push(`second:${event.vertex.vertexId}`);
  });
  const runner = t.createIndependentRunnerFromCurrentOptions();
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['first:A', 'second:A']);
  expect(runner.isSuspended()).toBe(true);
  expect(fixture.calls).toEqual(['roots', 'resolve:A']);
  runner.runUntilSuspendedOrTerminal({
    admittedVisitorCallbackPhases: { include: [] },
  });
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  expect(seen).toEqual(['first:A', 'second:A']);
});

it('keeps the admitted chain selection while applying a new delivery selector', () => {
  const seen: string[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
    seen.push('halt');
    return {
      commands: [{ commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY }],
    };
  });
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
    seen.push('remaining');
  });
  t.registerVisitorForObservationKind(Phase.ROUTE_PREFIX, () => {
    seen.push('routePrefix');
  });
  const runner = t
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['halt']);
  const resumed = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ROUTE_PREFIX],
      admittedVisitorCallbackPhases: { include: [] },
    }),
  ];
  expect(seen).toEqual(['halt', 'remaining']);
  expect(resumed).toMatchObject([{ eventKind: 'routePrefix' }]);
  expect(resumed.every((e) => e.eventKind === 'routePrefix')).toBe(true);
  expect(
    runner.captureProgressSnapshot().counts.acknowledgedObservationCountsByKind,
  ).toEqual({
    vertexOccurrence: 1,
    admittedEdgeOccurrence: 0,
    routePrefix: 1,
  });
});

it('pauses between edge/vertex/path without replay and never expands on iterator return', () => {
  const fixture = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: fixture.source,
  }).createIndependentRunnerFromCurrentOptions();
  const edges = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
  });
  expect(edges.next().value).toMatchObject({
    eventKind: 'admittedEdgeOccurrence',
    edge: {
      fromVertexId: 'A',
      toVertexId: 'B',
      sourceOutgoingLinkIndexBeforeFiltering: 0,
    },
  });
  edges.return();
  const atEdge = [...fixture.calls];
  const vertices =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
    });
  expect(vertices.next().value).toMatchObject({
    eventKind: 'vertexOccurrence',
    vertex: { vertexId: 'B' },
  });
  vertices.return();
  expect(fixture.calls).toEqual(atEdge);
  const paths = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: [Phase.ROUTE_PREFIX],
  });
  expect(paths.next().value).toMatchObject({
    eventKind: 'routePrefix',
    routeHopLength: 1,
  });
  paths.return();
  expect(fixture.calls).toEqual(atEdge);
  expect(
    runner.captureProgressSnapshot().counts.acknowledgedObservationCountsByKind,
  ).toEqual({
    vertexOccurrence: 3,
    admittedEdgeOccurrence: 1,
    routePrefix: 3,
  });
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
    }),
  ]).toEqual([]);
  expect(
    runner.captureProgressSnapshot().counts.acknowledgedObservationCountsByKind,
  ).toEqual({
    vertexOccurrence: 5,
    admittedEdgeOccurrence: 6,
    routePrefix: 5,
  });
});

it('closing a never-started iterator leaves source, status and current owner untouched', () => {
  const fixture = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: fixture.source,
  }).createIndependentRunnerFromCurrentOptions();
  runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().return();
  expect(fixture.calls).toEqual([]);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.NOT_STARTED);
  const owner = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  owner.next();
  runner.runAndIterateObservationEventsUntilSuspendedOrTerminal().return();
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
  expect(owner.next().value).toMatchObject({
    eventKind: 'vertexOccurrence',
    vertex: { vertexId: 'E' },
  });
  owner.return();
});

it('rejects competing owners and reentrant run without corrupting the owning iterator', () => {
  const seen: string[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  const runner = t.createIndependentRunnerFromCurrentOptions();
  t.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => undefined);
  const owner = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect(owner.next().value).toMatchObject({ eventKind: 'vertexOccurrence' });
  expect(() =>
    runner
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [],
      })
      .next(),
  ).toThrow('execution owner');
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow('execution owner');
  expect(
    runner.captureExecutionSnapshot().executionOptions.deliveredEventKinds,
  ).toEqual([Phase.VERTEX_OCCURRENCE]);
  expect(owner.next().done).toBe(true);
  const reentrant = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  reentrant.registerVisitorForObservationKind(Phase.VERTEX_OCCURRENCE, () => {
    expect(() => nested.runUntilSuspendedOrTerminal()).toThrow(
      'execution owner',
    );
    seen.push('continued');
  });
  const nested = reentrant.createIndependentRunnerFromCurrentOptions();
  nested.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['continued']);
  expect(nested.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

it('consumer errors and iterator throw pause a resumable runner with completed callbacks retained', () => {
  const seen: string[] = [];
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
    visitorsByObservationKind: {
      vertexOccurrence: (event) => {
        seen.push(event.vertex.vertexId);
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  const error = Symbol('consumer');
  let caught = false;
  try {
    for (const _event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      throw error;
  } catch (value) {
    caught = true;
    expect(value).toBe(error);
  }
  expect(caught).toBe(true);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  const next = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  expect(next.next().value).toMatchObject({
    eventKind: 'vertexOccurrence',
    vertex: { vertexId: 'B' },
  });
  expect(() => next.throw(new Error('consumer throw'))).toThrow(
    'consumer throw',
  );
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  runner.runUntilSuspendedOrTerminal();
  expect(seen).toEqual(['A', 'B']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  const captureProgressSnapshot = runner.captureProgressSnapshot();
  expect(runner.runUntilSuspendedOrTerminal()).toBe(runner);
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
  expect(runner.captureProgressSnapshot()).toEqual(captureProgressSnapshot);
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
});

it('retains exact result getter failures before any command batch applies', () => {
  const error = undefined;
  const value = {
    get commands(): never {
      throw error;
    },
  };
  const source: GraphWalkDiscoverySource<string, undefined, string> = idGraph(
    ['A'],
    [['A', []]],
  );
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    visitorsByObservationKind: { vertexOccurrence: () => value },
  }).createIndependentRunnerFromCurrentOptions();
  let caught = false;
  try {
    runner.runUntilSuspendedOrTerminal();
  } catch (failure) {
    caught = true;
    expect(failure).toBe(error);
  }
  expect(caught).toBe(true);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
});

it('emits the drained observation before acknowledging cooperative pause and preserves its pending path', () => {
  const seen: string[] = [];
  const t = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  });
  t.appendVisitorGroupForObservationKind(Phase.VERTEX_OCCURRENCE, {
    visitorCommandCommitTiming: 'afterContiguousVisitorBatch' as const,
    visitors: [
      () => {
        expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
        seen.push('first');
      },
      () => {
        seen.push('second');
        expect(runner.captureExecutionSnapshot()).toMatchObject({
          visitorChainPosition: {
            observationKind: Phase.VERTEX_OCCURRENCE,
            visitorIndexInObservationChain: 1,
          },
          inFlightInvocationCount: 1,
          pendingInvocationRequests: [{ operation: 'invokeVisitorCallback' }],
        });
      },
    ],
  });
  const runner = t.createIndependentRunnerFromCurrentOptions();
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toMatchObject([{ eventKind: 'vertexOccurrence' }]);
  expect(seen).toEqual(['first', 'second']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.SUSPENDED);
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ROUTE_PREFIX],
    }),
  ]).toMatchObject([{ eventKind: 'routePrefix' }]);
  expect(seen).toEqual(['first', 'second']);
});
