import {
  GraphWalkBuilder,
  GraphWalkObservationKind,
  TraversalRunnerStatus,
} from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it('observes vertices and every parallel/returning relationship in one pass', () => {
  const { source, calls } = contextFixture();
  const walker = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
  const runner = walker.createIndependentRunnerFromCurrentOptions();
  expect(calls).toEqual([]);
  expect(runner.getTraversalLifecycleStatus()).toBe(
    TraversalRunnerStatus.NOT_STARTED,
  );
  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        GraphWalkObservationKind.VERTEX_OCCURRENCE,
        GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
      ],
    }),
  ];
  expect(
    events.map((event) =>
      event.eventKind === 'vertexOccurrence'
        ? `v:${event.vertex.vertexId}`
        : `e:${event.edge.fromVertexId}:${event.edge.toVertexId}:${event.edge.edgeData.kind}`,
    ),
  ).toEqual([
    'v:A',
    'v:E',
    'e:A:B:imports',
    'v:B',
    'e:A:B:references',
    'e:A:C:cites',
    'v:C',
    'e:B:D:definedIn',
    'v:D',
    'e:C:D:cites',
    'e:D:A:cites',
  ]);
  expect(runner.captureProgressSnapshot()).toEqual({
    status: TraversalRunnerStatus.FINISHED,
    terminalOutcome: { kind: 'explorationExhausted' },
    counts: {
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 14,
      admittedRootOrLinkTargetOccurrences: 8,
      resolvedFoundVertexIdCount: 5,
      resolvedOmittedVertexIdCount: 0,
      freshSourceOutgoingLinkCount: 6,
      acknowledgedObservationCountsByKind: {
        vertexOccurrence: 5,
        admittedEdgeOccurrence: 6,
        routePrefix: 5,
      },
    },
  });
  expect(calls.filter((call) => call.startsWith('resolve:'))).toEqual([
    'resolve:A',
    'resolve:E',
    'resolve:B',
    'resolve:C',
    'resolve:D',
  ]);
  expect(calls.filter((call) => call.startsWith('outgoing:'))).toEqual([
    'outgoing:A',
    'outgoing:E',
    'outgoing:B',
    'outgoing:C',
    'outgoing:D',
  ]);
});

it('discovers depth first in source order without pulling the next root early', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    expansionOrder: 'depthFirst',
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [GraphWalkObservationKind.VERTEX_OCCURRENCE],
    });
  expect(iterator.next().value).toMatchObject({
    eventKind: 'vertexOccurrence',
    vertex: { vertexId: 'A' },
  });
  expect(calls).toEqual(['roots', 'resolve:A']);
  expect([...iterator].map((event) => event.vertex.vertexId)).toEqual([
    'B',
    'D',
    'C',
    'E',
  ]);
});

it('projects first-discovery prefix paths including isolated roots', () => {
  const source = idGraph(
    ['A', 'E'],
    [
      ['A', ['B']],
      ['B', ['A']],
      ['E', []],
    ],
  );
  const events = [
    ...new GraphWalkBuilder({ graphWalkDiscoverySource: source })
      .createIndependentRunnerFromCurrentOptions()
      .runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [GraphWalkObservationKind.ROUTE_PREFIX],
      }),
  ];
  expect(
    events.map((event) => ({
      ids: event.verticesInRootToTargetOrder.map((vertex) => vertex.vertexId),
      edges: event.edgesInRootToTargetOrder.map((edge) => [
        edge.fromVertexId,
        edge.sourceOutgoingLinkIndexBeforeFiltering,
        edge.toVertexId,
      ]),
      depth: event.routeHopLength,
    })),
  ).toEqual([
    { ids: ['A'], edges: [], depth: 0 },
    { ids: ['E'], edges: [], depth: 0 },
    { ids: ['A', 'B'], edges: [['A', 0, 'B']], depth: 1 },
  ]);
});

it('selects edges independently and runs to exhaustion without selecting any records', () => {
  const { source } = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE],
    }),
  ]).toHaveLength(6);
  const hidden = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    deliveredEventKinds: [],
  }).createIndependentRunnerFromCurrentOptions();
  expect(hidden.runUntilSuspendedOrTerminal()).toBe(hidden);
  expect(hidden.captureProgressSnapshot()).toEqual(
    runner.captureProgressSnapshot(),
  );
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
});

it('pauses without expanding yielded occurrences and resumes pending phases with new selectors', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(false);
  expect(runner.getTraversalStopReason()).toBeNull();
  expect(runner.isSuspended()).toBe(false);
  const idle = runner.captureExecutionSnapshot();
  expect(idle).toMatchObject({
    traversalAlgorithm: 'graph-walk',
    callbackExecutionMode: 'sync',
    openSourceIteratorCount: 0,
    pendingRouteExpansionFrameCount: 0,
  });
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE],
    });
  const edge = iterator.next().value!;
  expect(edge.eventKind).toBe('admittedEdgeOccurrence');
  expect(calls).not.toContain('outgoing:B');
  iterator.return();
  expect(runner.isSuspended()).toBe(true);
  expect(runner.getTraversalStopReason()).toBe('paused');
  expect(runner.captureProgressSnapshot().terminalOutcome).toBeNull();
  const before = calls.slice();
  const inspection = runner.captureExecutionSnapshot();
  expect(calls).toEqual(before);
  expect(inspection.pendingObservationKinds).toEqual([
    GraphWalkObservationKind.VERTEX_OCCURRENCE,
    GraphWalkObservationKind.ROUTE_PREFIX,
  ]);
  expect(inspection.openSourceIteratorCount).toBe(1);
  expect(Object.isFrozen(inspection)).toBe(true);
  expect(
    Object.isFrozen(inspection.counts.acknowledgedObservationCountsByKind),
  ).toBe(true);
  expect(Object.isFrozen(inspection.executionOptions.deliveredEventKinds)).toBe(
    true,
  );
  const vertices = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [GraphWalkObservationKind.VERTEX_OCCURRENCE],
      admittedVisitorCallbackPhases: { include: [] },
    }),
  ];
  expect(vertices.map((event) => event.vertex.vertexId)).toEqual([
    'B',
    'C',
    'D',
  ]);
  expect(
    runner.captureExecutionSnapshot().executionOptions
      .admittedVisitorCallbackPhases,
  ).toEqual({
    include: [],
  });
  expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
  expect(idle.counts.admittedRootOrLinkTargetOccurrences).toBe(0);
  expect(inspection.counts.admittedRootOrLinkTargetOccurrences).toBe(3);
});

it('retains detached emitted wrappers across caller mutation', () => {
  const source = idGraph(
    ['A'],
    [
      ['A', ['B']],
      ['B', []],
    ],
  );
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
        GraphWalkObservationKind.ROUTE_PREFIX,
      ],
    });
  const root = iterator.next().value!;
  if (root.eventKind !== 'routePrefix') throw new Error('Expected path');
  (root.verticesInRootToTargetOrder[0] as { vertexId: string }).vertexId =
    'bad';
  (root.edgesInRootToTargetOrder as unknown[]).push('bad');
  const edge = iterator.next().value!;
  if (edge.eventKind !== 'admittedEdgeOccurrence')
    throw new Error('Expected edge');
  (edge.edge as { toVertexId: string }).toVertexId = 'bad';
  (edge.fromVertex as { vertexId: string }).vertexId = 'bad';
  expect(iterator.next().value).toMatchObject({
    eventKind: 'routePrefix',
    verticesInRootToTargetOrder: [{ vertexId: 'A' }, { vertexId: 'B' }],
    edgesInRootToTargetOrder: [{ fromVertexId: 'A', toVertexId: 'B' }],
  });
  expect(iterator.next().done).toBe(true);
});

it('protects execution ownership and validates selector patches atomically', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  iterator.next();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow('execution owner');
  expect(() =>
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: ['wrong' as GraphWalkObservationKind],
    }),
  ).toThrow(TypeError);
  iterator.return();
  const factory = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph([], []),
  });
  expect(
    factory.patchOptionsForFutureRunners({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: {
        exclude: [GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE],
      },
    }),
  ).toBe(factory);
  const configured = factory.createIndependentRunnerFromCurrentOptions();
  expect(
    configured.captureExecutionSnapshot().executionOptions
      .admittedVisitorCallbackPhases,
  ).toEqual({
    exclude: [GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE],
  });
  expect(
    configured.runUntilSuspendedOrTerminal().getTraversalStopReason(),
  ).toBe('finished');
});

it('acknowledges an existing pause request when the iterator owner returns', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  iterator.next();
  expect(runner.requestPauseAfterAdmittedCallbacksDrain()).toBe(true);
  const before = calls.slice();
  iterator.return();
  expect(runner.isSuspended()).toBe(true);
  expect(runner.getTraversalStopReason()).toBe('paused');
  expect(calls).toEqual(before);
  runner.runUntilSuspendedOrTerminal();
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'explorationExhausted',
  });
});
