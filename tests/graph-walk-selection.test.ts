import {
  DepthFirstTreeVisitPhase,
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
} from '../src';
import { contextFixture } from './helpers/graph-walk-fixtures';

it('selects observations independently of exploration and committed logical counts', () => {
  const left = contextFixture();
  const right = contextFixture();
  const first = new GraphWalkBuilder({
    graphWalkDiscoverySource: left.source,
  }).createIndependentRunnerFromCurrentOptions();
  const second = new GraphWalkBuilder({
    graphWalkDiscoverySource: right.source,
  }).createIndependentRunnerFromCurrentOptions();
  first.runUntilSuspendedOrTerminal({
    deliveredEventKinds: [],
    admittedVisitorCallbackPhases: { include: [] },
  });
  second.runUntilSuspendedOrTerminal({
    deliveredEventKinds: [
      Phase.VERTEX_OCCURRENCE,
      Phase.ADMITTED_EDGE_OCCURRENCE,
    ],
  });
  expect(first.captureProgressSnapshot().counts).toEqual(
    second.captureProgressSnapshot().counts,
  );
  expect(
    first.captureProgressSnapshot().counts.admittedRootOrLinkTargetOccurrences,
  ).toBe(8);
  expect(left.calls).toEqual(right.calls);
  expect(first.captureProgressSnapshot().counts).toMatchObject({
    resolvedFoundVertexIdCount: 5,
    resolvedOmittedVertexIdCount: 0,
    freshSourceOutgoingLinkCount: 6,
  });
});

it('enforces explicit delivery selectors on buffered observations across a pause', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: contextFixture().source,
  }).createIndependentRunnerFromCurrentOptions();
  const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['admittedEdgeOccurrence'],
  });
  expect(first.next().value).toMatchObject({
    eventKind: 'admittedEdgeOccurrence',
  });
  first.return();
  const second = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
    deliveredEventKinds: ['routePrefix'],
  });
  expect(second.next().value).toMatchObject({
    eventKind: 'routePrefix',
    routeHopLength: 1,
  });
  second.return();
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

it('validates and detaches selector patches before activation without changing prior state', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: contextFixture().source,
    deliveredEventKinds: ['admittedEdgeOccurrence'],
  }).createIndependentRunnerFromCurrentOptions();
  const original = runner.captureExecutionSnapshot().executionOptions;
  expect(() =>
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION as unknown as Phase,
      ],
    }),
  ).toThrow(TypeError);
  expect(() =>
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
      iterateOver: [Phase.ROUTE_PREFIX],
    } as never),
  ).toThrow(TypeError);
  expect(runner.captureExecutionSnapshot().executionOptions).toEqual(original);
  const deliveredEventKinds = [Phase.VERTEX_OCCURRENCE];
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds,
    });
  deliveredEventKinds[0] = Phase.ADMITTED_EDGE_OCCURRENCE;
  expect(iterator.next().value).toMatchObject({
    eventKind: 'vertexOccurrence',
  });
  iterator.return();
  expect(
    [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({}),
    ].every((e) => e.eventKind === 'vertexOccurrence'),
  ).toBe(true);
});

it('preserves legacy alias behavior through field-wise patches', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: contextFixture().source,
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
    });
  expect(iterator.next().value).toMatchObject({
    eventKind: 'admittedEdgeOccurrence',
  });
  iterator.return();
  expect(
    [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        admittedVisitorCallbackPhases: { exclude: [Phase.VERTEX_OCCURRENCE] },
      }),
    ].every((e) => e.eventKind === 'admittedEdgeOccurrence'),
  ).toBe(true);
});

it('retains nested undefined selector controls through walking detachment', async () => {
  const { AsyncGraphWalkBuilder } = await import('../src');
  for (const create of [
    () =>
      new GraphWalkBuilder({
        graphWalkDiscoverySource: contextFixture().source,
      }).createIndependentRunnerFromCurrentOptions(),
    () =>
      new AsyncGraphWalkBuilder({
        graphWalkDiscoverySource: contextFixture().source,
      }).createIndependentRunnerFromCurrentOptions(),
  ]) {
    const runner = create();
    const iterator =
      runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
        admittedVisitorCallbackPhases: { include: [] },
      });
    expect((await iterator.next()).done).toBe(false);
    await iterator.return();
    await runner.runUntilSuspendedOrTerminal({
      admittedVisitorCallbackPhases: { include: undefined },
    });
    expect(
      runner.captureExecutionSnapshot().executionOptions
        .admittedVisitorCallbackPhases,
    ).toEqual({
      include: [],
    });
  }
});
