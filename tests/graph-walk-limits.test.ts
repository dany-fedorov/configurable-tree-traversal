import {
  AsyncGraphWalkBuilder,
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
} from '../src';
import type { GraphWalkExplorationLimits } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it.each([
  { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0 },
  { maxAdmittedRootOrLinkTargetOccurrences: 0 },
  {
    maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0,
    maxAdmittedRootOrLinkTargetOccurrences: 0,
  },
])('zero global cap %o performs no source calls', (limits) => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    limits,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(calls).toEqual([]);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0,
    admittedRootOrLinkTargetOccurrences: 0,
  });
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: Object.keys(limits).sort(),
  });
});

it('zero depth permits roots and never opens adjacency', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    limits: { maxRouteHopDepth: 0 },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(calls).toEqual(['roots', 'resolve:A', 'resolve:E']);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3,
    admittedRootOrLinkTargetOccurrences: 2,
  });
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxRouteHopDepth'],
  });
});

it('does not treat returning edge depth as a new vertex cutoff', () => {
  const self = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', ['A']]]),
    limits: { maxRouteHopDepth: 1 },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(self.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
  const boundary = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(
      ['A'],
      [
        ['A', ['B']],
        ['B', []],
      ],
    ),
    limits: { maxRouteHopDepth: 1 },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(boundary.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxRouteHopDepth'],
  });
});

it('runs expansion predicate before depth and lets host pruning exhaust', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    limits: { maxRouteHopDepth: 0 },
    shouldExpandVertexOccurrence: () => false,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
});

it.each([
  {
    limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 1 },
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 1,
    admittedRootOrLinkTargetOccurrences: 1,
  },
  {
    limits: { maxAdmittedRootOrLinkTargetOccurrences: 1 },
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 1,
    admittedRootOrLinkTargetOccurrences: 1,
  },
  {
    limits: {
      maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 1,
      maxAdmittedRootOrLinkTargetOccurrences: 1,
    },
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 1,
    admittedRootOrLinkTargetOccurrences: 1,
  },
])(
  'drains admitted observations without probing at exact cap $limits',
  ({
    limits,
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
    admittedRootOrLinkTargetOccurrences,
  }) => {
    const { source, calls } = contextFixture();
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: source,
      limits,
    }).createIndependentRunnerFromCurrentOptions();
    expect([
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.VERTEX_OCCURRENCE, Phase.ROUTE_PREFIX],
      }),
    ]).toHaveLength(2);
    expect(calls).toEqual(['roots', 'resolve:A']);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
      admittedRootOrLinkTargetOccurrences,
      acknowledgedObservationCountsByKind: {
        vertexOccurrence: 1,
        admittedEdgeOccurrence: 0,
        routePrefix: 1,
      },
    });
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'traversalLimitsReached',
      reachedLimits: Object.keys(limits).sort(),
    });
  },
);

it.each([
  {
    rootVertexIds: [],
    adjacency: [],
    maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 1,
    admittedRootOrLinkTargetOccurrences: 0,
  },
  {
    rootVertexIds: ['A'],
    adjacency: [['A', []]],
    maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3,
    admittedRootOrLinkTargetOccurrences: 1,
  },
] as { rootVertexIds: string[]; adjacency: [string, string[]][]; maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: number; admittedRootOrLinkTargetOccurrences: number }[])(
  'already proven exhaustion wins at step cap $maxCandidateReadAttempts',
  ({
    rootVertexIds,
    adjacency,
    maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
    admittedRootOrLinkTargetOccurrences,
  }) => {
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: idGraph(rootVertexIds, adjacency),
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay },
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'sourceRoutesExhausted',
    });
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay:
        maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
      admittedRootOrLinkTargetOccurrences,
    });
  },
);

it('does not open new adjacency after a root-done step reaches the global cap', () => {
  const { source, calls } = contextFixture();
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3 },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(calls).toEqual(['roots', 'resolve:A', 'resolve:E']);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
  });
});

it('counts duplicate and rejected candidates only as read attempts', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(
      ['A', 'A'],
      [
        ['A', ['B', 'B']],
        ['B', []],
      ],
    ),
    limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 5 },
    shouldAdmitOutgoingLinkTarget: () => false,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 5,
    admittedRootOrLinkTargetOccurrences: 1,
    freshSourceOutgoingLinkCount: 2,
  });
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
  });
});

it('counts omitted and returning targets toward the occurrence cap', () => {
  const source = {
    ...idGraph(['A'], [['A', ['B', 'A']]]),
    resolveVertexDataById: (id: string) =>
      id === 'B'
        ? { kind: 'omitted' as const }
        : { kind: 'found' as const, vertexData: id },
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    limits: { maxAdmittedRootOrLinkTargetOccurrences: 3 },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 4,
    admittedRootOrLinkTargetOccurrences: 3,
    resolvedFoundVertexIdCount: 1,
    resolvedOmittedVertexIdCount: 1,
    freshSourceOutgoingLinkCount: 2,
    acknowledgedObservationCountsByKind: {
      vertexOccurrence: 1,
      admittedEdgeOccurrence: 2,
      routePrefix: 1,
    },
  });
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxAdmittedRootOrLinkTargetOccurrences'],
  });
});

it('retains earlier depth cutoffs when a later global cap ends exploration', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(
      ['A', 'B'],
      [
        ['A', []],
        ['B', []],
      ],
    ),
    limits: {
      maxRouteHopDepth: 0,
      maxAdmittedRootOrLinkTargetOccurrences: 1,
      maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 1,
    },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: [
      'maxRouteHopDepth',
      'maxAdmittedRootOrLinkTargetOccurrences',
      'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay',
    ],
  });
});

it.each(['breadthFirst', 'depthFirst'] as const)(
  '%s retains first-discovery depth and does not reexpand on shorter routes',
  (expansionOrder) => {
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'D']],
        ['B', ['D']],
        ['D', ['E']],
        ['E', []],
      ],
    );
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: source,
      expansionOrder,
      limits: { maxRouteHopDepth: 2 },
    }).createIndependentRunnerFromCurrentOptions();
    const vertices = [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
      }),
    ].map((e) => [e.vertex.vertexId, e.vertexHopDepth]);
    expect(vertices).toEqual(
      expansionOrder === 'breadthFirst'
        ? [
            ['A', 0],
            ['B', 1],
            ['D', 1],
            ['E', 2],
          ]
        : [
            ['A', 0],
            ['B', 1],
            ['D', 2],
          ],
    );
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'traversalLimitsReached',
      reachedLimits: ['maxRouteHopDepth'],
    });
  },
);

it('replaces supplied limits and atomically rejects invalid patches', () => {
  const factory = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    limits: {
      maxRouteHopDepth: 0,
      maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0,
    },
  });
  factory.patchOptionsForFutureRunners({
    replaceLimits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3 },
  });
  const snapshot = factory.createIndependentRunnerFromCurrentOptions();
  expect(() =>
    factory.patchOptionsForFutureRunners({
      replaceLimits: {
        maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: -1,
      },
    }),
  ).toThrow(TypeError);
  expect(
    snapshot.runUntilSuspendedOrTerminal().captureProgressSnapshot()
      .terminalOutcome,
  ).toEqual({ kind: 'sourceRoutesExhausted' });
  expect(
    factory
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .captureProgressSnapshot().terminalOutcome,
  ).toEqual({
    kind: 'sourceRoutesExhausted',
  });
  const limits: GraphWalkExplorationLimits = { maxRouteHopDepth: 0 };
  factory.patchOptionsForFutureRunners({ replaceLimits: limits });
  const bounded = factory.createIndependentRunnerFromCurrentOptions();
  limits.maxRouteHopDepth = 8;
  expect(
    bounded.runUntilSuspendedOrTerminal().captureProgressSnapshot()
      .terminalOutcome,
  ).toEqual({
    kind: 'traversalLimitsReached',
    reachedLimits: ['maxRouteHopDepth'],
  });
});

it.each([GraphWalkBuilder, AsyncGraphWalkBuilder])(
  '%p charges rejected links without resolving their targets',
  async (Factory) => {
    const resolved: string[] = [];
    const source = {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () => [{ vertexId: 'A' }],
      resolveVertexDataById(vertexId: string) {
        resolved.push(vertexId);
        if (vertexId !== 'A') throw new Error('Rejected target was resolved');
        return { kind: 'found' as const, vertexData: vertexId };
      },
      enumerateOutgoingLinks: () => [
        {
          targetToResolveOnAdmission: { vertexId: 'rejected' },
          edgeData: undefined,
        },
      ],
    };
    const runner = new Factory({
      graphWalkDiscoverySource: source,
      shouldAdmitOutgoingLinkTarget: () => false,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(resolved).toEqual(['A']);
    const captureProgressSnapshot = runner.captureProgressSnapshot();
    expect(
      captureProgressSnapshot.counts
        .rootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
    ).toBe(4);
    expect(captureProgressSnapshot.counts.freshSourceOutgoingLinkCount).toBe(1);
    expect(captureProgressSnapshot.counts.resolvedFoundVertexIdCount).toBe(1);
    expect(
      captureProgressSnapshot.counts.admittedRootOrLinkTargetOccurrences,
    ).toBe(1);
    expect(
      captureProgressSnapshot.counts.acknowledgedObservationCountsByKind,
    ).toEqual({
      vertexOccurrence: 1,
      admittedEdgeOccurrence: 0,
      routePrefix: 1,
    });
    expect(captureProgressSnapshot.terminalOutcome).toEqual({
      kind: 'sourceRoutesExhausted',
    });
  },
);
