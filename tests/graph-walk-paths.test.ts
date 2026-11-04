import { GraphWalkBuilder, GraphWalkObservationKind as Phase } from '../src';
import type { GraphWalkDiscoverySource } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

const policies = [
  'allVertexSimpleRoutePrefixes',
  'allRoutePrefixesAllowingRepeatedVertices',
] as const;
const diamond = () =>
  idGraph(
    ['A'],
    [
      ['A', ['B', 'C']],
      ['B', ['D']],
      ['C', ['D']],
      ['D', ['A']],
    ],
  );

it.each(policies)(
  'enumerates bounded %s diamond prefixes with repeated observations',
  (routeEnumerationPolicy) => {
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: diamond(),
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 3 },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [
          Phase.VERTEX_OCCURRENCE,
          Phase.ADMITTED_EDGE_OCCURRENCE,
          Phase.ROUTE_PREFIX,
        ],
      }),
    ];
    const paths = events
      .filter((event) => event.eventKind === 'routePrefix')
      .map(
        (event) =>
          event.eventKind === 'routePrefix' &&
          event.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      );
    expect(paths).toEqual(
      routeEnumerationPolicy === 'allVertexSimpleRoutePrefixes'
        ? ['A', 'AB', 'AC', 'ABD', 'ACD']
        : ['A', 'AB', 'AC', 'ABD', 'ACD', 'ABDA', 'ACDA'],
    );
    expect(events.map((event) => event.eventKind)).toEqual([
      'vertexOccurrence',
      'routePrefix',
      ...Array.from({ length: paths.length - 1 }, () => [
        'admittedEdgeOccurrence',
        'vertexOccurrence',
        'routePrefix',
      ]).flat(),
    ]);
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        resolvedFoundVertexIdCount: 4,
        resolvedOmittedVertexIdCount: 0,
        freshSourceOutgoingLinkCount: 5,
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 13,
        admittedRootOrLinkTargetOccurrences: paths.length,
      },
      terminalOutcome:
        routeEnumerationPolicy === 'allVertexSimpleRoutePrefixes'
          ? { kind: 'explorationExhausted' }
          : {
              kind: 'traversalLimitsReached',
              reachedLimits: ['maxRouteHopDepth'],
            },
    });
  },
);

it.each(policies)(
  'distinguishes parallel links and replays cached done read attempts under %s',
  (routeEnumerationPolicy) => {
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'B']],
        ['B', []],
      ],
    );
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: source,
      routeEnumerationPolicy,
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 7 },
    }).createIndependentRunnerFromCurrentOptions();
    const paths = [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      }),
    ];
    expect(
      paths.map((path) =>
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'AB']);
    expect(
      paths.map((path) =>
        path.edgesInRootToTargetOrder.map(
          (edge) => edge.sourceOutgoingLinkIndexBeforeFiltering,
        ),
      ),
    ).toEqual([[], [0], [1]]);
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 7,
        admittedRootOrLinkTargetOccurrences: 3,
        resolvedFoundVertexIdCount: 2,
        freshSourceOutgoingLinkCount: 2,
      },
      terminalOutcome: { kind: 'explorationExhausted' },
    });
  },
);

it.each(policies)(
  'replays a physical done only within the remaining step budget under %s',
  (routeEnumerationPolicy) => {
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: idGraph(
        ['A'],
        [
          ['A', ['B', 'B']],
          ['B', []],
        ],
      ),
      routeEnumerationPolicy,
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 6 },
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 6,
        admittedRootOrLinkTargetOccurrences: 3,
        freshSourceOutgoingLinkCount: 2,
      },
      terminalOutcome: {
        kind: 'traversalLimitsReached',
        reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
      },
    });
  },
);

it.each(policies)(
  'adds a root reached earlier through another root, deduplicating declarations under %s',
  (routeEnumerationPolicy) => {
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: idGraph(
        ['A', 'B', 'B'],
        [
          ['A', ['B']],
          ['B', []],
        ],
      ),
      expansionOrder: 'depthFirst',
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 2 },
    }).createIndependentRunnerFromCurrentOptions();
    expect(
      [
        ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ROUTE_PREFIX],
        }),
      ].map((path) =>
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'B']);
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 8,
        admittedRootOrLinkTargetOccurrences: 3,
        resolvedFoundVertexIdCount: 2,
        freshSourceOutgoingLinkCount: 1,
      },
      terminalOutcome: { kind: 'explorationExhausted' },
    });
  },
);

it.each(policies)(
  'evaluates follow and expansion for each %s prefix and caches omissions',
  (routeEnumerationPolicy) => {
    const expanded: string[] = [];
    const followed: string[] = [];
    const resolved: string[] = [];
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D', 'X']],
        ['C', ['D', 'X']],
        ['D', []],
      ],
    );
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: {
        ...source,
        resolveVertexDataById(id) {
          resolved.push(id);
          return id === 'X'
            ? { kind: 'omitted' }
            : source.resolveVertexDataById!(id);
        },
      },
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 3 },
      shouldAdmitOutgoingLinkTarget(edge, context) {
        if (
          context.routeEnumerationPolicy === 'firstAdmittedFoundRoutePerVertex'
        )
          throw new Error('Missing route context');
        const path = context.routePrefix.verticesInRootToTargetOrder
          .map((v) => v.vertexId)
          .join('');
        expect(context.fromVertex.vertexId).toBe(edge.fromVertexId);
        expect(context.targetHopDepth).toBe(
          context.routePrefix.routeHopLength + 1,
        );
        followed.push(path + edge.toVertexId);
        return path !== 'AB' || edge.toVertexId !== 'D';
      },
      shouldExpandVertexOccurrence(vertex, context) {
        if (
          context.routeEnumerationPolicy === 'firstAdmittedFoundRoutePerVertex'
        )
          throw new Error('Missing route context');
        expect(context.vertexHopDepth).toBe(context.routePrefix.routeHopLength);
        expect(
          context.routePrefix.verticesInRootToTargetOrder.at(-1)!.vertexId,
        ).toBe(vertex.vertexId);
        expect(context.incomingEdgeFromParentRouteOccurrence).toEqual(
          context.routePrefix.edgesInRootToTargetOrder.at(-1) ?? null,
        );
        expanded.push(
          context.routePrefix.verticesInRootToTargetOrder
            .map((v) => v.vertexId)
            .join(''),
        );
        return true;
      },
    }).createIndependentRunnerFromCurrentOptions();
    const events = [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [
          Phase.ADMITTED_EDGE_OCCURRENCE,
          Phase.ROUTE_PREFIX,
        ],
      }),
    ];
    expect(expanded).toEqual(['A', 'AB', 'AC', 'ACD']);
    expect(followed).toEqual(['AB', 'AC', 'ABD', 'ABX', 'ACD', 'ACX']);
    expect(resolved).toEqual(['A', 'B', 'C', 'X', 'D']);
    expect(
      events.filter(
        (event) =>
          event.eventKind === 'admittedEdgeOccurrence' &&
          event.targetResolution.kind === 'omitted',
      ),
    ).toHaveLength(2);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      admittedRootOrLinkTargetOccurrences: 6,
      resolvedFoundVertexIdCount: 4,
      resolvedOmittedVertexIdCount: 1,
      freshSourceOutgoingLinkCount: 6,
    });
  },
);

it.each(policies)(
  'can prune just one expansion of a shared target under %s',
  (routeEnumerationPolicy) => {
    const opened: string[] = [];
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D']],
        ['C', ['D']],
        ['D', ['E']],
        ['E', []],
      ],
    );
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: {
        ...source,
        enumerateOutgoingLinks(vertex) {
          opened.push(vertex.vertexId);
          return source.enumerateOutgoingLinks(vertex);
        },
      },
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 4 },
      shouldExpandVertexOccurrence: (_vertex, context) =>
        context.routeEnumerationPolicy !== 'firstAdmittedFoundRoutePerVertex' &&
        context.routePrefix.verticesInRootToTargetOrder
          .map((v) => v.vertexId)
          .join('') !== 'ABD',
    }).createIndependentRunnerFromCurrentOptions();
    expect(
      [
        ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ROUTE_PREFIX],
        }),
      ].map((path) =>
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'AC', 'ABD', 'ACD', 'ACDE']);
    expect(opened).toEqual(['A', 'B', 'C', 'D', 'E']);
  },
);

it.each([0, 1])(
  'handles self-links at depth %i with eligibility before follow',
  (maxRouteHopDepth) => {
    for (const routeEnumerationPolicy of policies) {
      const followed: string[] = [];
      const runner = new GraphWalkBuilder({
        graphWalkDiscoverySource: idGraph(['A'], [['A', ['A']]]),
        routeEnumerationPolicy,
        limits: { maxRouteHopDepth },
        shouldAdmitOutgoingLinkTarget(edge) {
          followed.push(edge.toVertexId);
          return true;
        },
      }).createIndependentRunnerFromCurrentOptions();
      const paths = [
        ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ROUTE_PREFIX],
        }),
      ];
      const repeats =
        routeEnumerationPolicy === 'allRoutePrefixesAllowingRepeatedVertices' &&
        maxRouteHopDepth === 1;
      expect(
        paths.map((path) =>
          path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
        ),
      ).toEqual(repeats ? ['A', 'AA'] : ['A']);
      expect(followed).toEqual(repeats ? ['A'] : []);
      expect(runner.captureProgressSnapshot().terminalOutcome).toEqual(
        maxRouteHopDepth === 1 &&
          routeEnumerationPolicy === 'allVertexSimpleRoutePrefixes'
          ? { kind: 'explorationExhausted' }
          : {
              kind: 'traversalLimitsReached',
              reachedLimits: ['maxRouteHopDepth'],
            },
      );
    }
  },
);

it('tests simple path ancestry with SameValueZero and preserves object and symbol identities', () => {
  const object = {};
  const symbol = Symbol('vertexOccurrence');
  const ids = [NaN, -0, undefined, object, symbol];
  const links = new Map<unknown, unknown[]>([
    [NaN, [0]],
    [0, [undefined]],
    [undefined, [object]],
    [object, [symbol]],
    [symbol, [NaN]],
  ]);
  const followed: unknown[] = [];
  const source: GraphWalkDiscoverySource<unknown, undefined, unknown> = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets: () => [{ vertexId: NaN }],
    resolveVertexDataById: (id) => ({ kind: 'found', vertexData: id }),
    enumerateOutgoingLinks: (vertex) =>
      links.get(vertex.vertexId)!.map((vertexId) => ({
        targetToResolveOnAdmission: { vertexId },
        edgeData: undefined,
      })),
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
    limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 20 },
    shouldAdmitOutgoingLinkTarget(edge) {
      followed.push(edge.toVertexId);
      return true;
    },
  }).createIndependentRunnerFromCurrentOptions();
  const paths = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ROUTE_PREFIX],
    }),
  ];
  expect(paths).toHaveLength(5);
  expect(paths[4]!.verticesInRootToTargetOrder.map((v) => v.vertexId)).toEqual([
    NaN,
    0,
    undefined,
    object,
    symbol,
  ]);
  expect(followed).toEqual(
    ids.slice(1).map((id) => (Object.is(id, -0) ? 0 : id)),
  );
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'explorationExhausted',
  });
});

it.each(policies)(
  'keeps counters and source access independent of mixed %s selectors',
  (routeEnumerationPolicy) => {
    const results = [
      [],
      [Phase.ROUTE_PREFIX],
      [Phase.VERTEX_OCCURRENCE, Phase.ADMITTED_EDGE_OCCURRENCE],
      [Phase.ADMITTED_EDGE_OCCURRENCE, Phase.ROUTE_PREFIX],
    ].map((deliveredEventKinds) => {
      const calls: string[] = [];
      const source = diamond();
      const runner = new GraphWalkBuilder({
        graphWalkDiscoverySource: {
          ...source,
          resolveVertexDataById(id) {
            calls.push('resolve:' + id);
            return source.resolveVertexDataById!(id);
          },
          enumerateOutgoingLinks(vertex) {
            calls.push('open:' + vertex.vertexId);
            return source.enumerateOutgoingLinks(vertex);
          },
        },
        routeEnumerationPolicy,
        limits: { maxRouteHopDepth: 3 },
        admittedVisitorCallbackPhases: { include: [] },
      }).createIndependentRunnerFromCurrentOptions();
      [
        ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds,
        }),
      ];
      return { counts: runner.captureProgressSnapshot().counts, calls };
    });
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]!.calls).toEqual([
      'resolve:A',
      'open:A',
      'resolve:B',
      'resolve:C',
      'open:B',
      'resolve:D',
      'open:C',
      'open:D',
    ]);
  },
);

it.each(policies)(
  'makes no source calls with zero global %s limits',
  (routeEnumerationPolicy) => {
    for (const limits of [
      { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0 },
      { maxRouteHopDepth: 2, maxAdmittedRootOrLinkTargetOccurrences: 0 },
    ]) {
      const calls: string[] = [];
      const runner = new GraphWalkBuilder({
        graphWalkDiscoverySource: {
          vertexResolutionMode:
            'inlineResolutionOrPreviouslyAdmittedVertex' as const,
          enumerateRootTargets() {
            calls.push('roots');
            return [];
          },
          enumerateOutgoingLinks: () => [],
        },
        routeEnumerationPolicy,
        limits,
      })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal();
      expect(calls).toEqual([]);
      expect(
        runner.captureProgressSnapshot().counts
          .rootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
      ).toBe(0);
    }
  },
);

it.each(policies)(
  'bounds filtered %s candidates and closes the partial physical stream',
  (routeEnumerationPolicy) => {
    const calls: string[] = [];
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () => [
          {
            kind: 'inlineResolution' as const,
            vertexId: 'A',
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found' as const,
              vertexData: 'A',
            },
          },
        ],
        enumerateOutgoingLinks: function* () {
          try {
            for (const vertexId of ['B', 'C', 'D']) {
              calls.push(vertexId);
              yield {
                targetToResolveOnAdmission: {
                  kind: 'previouslyAdmittedVertex' as const,
                  vertexId,
                },
                edgeData: undefined,
              };
            }
          } finally {
            calls.push('permanentlyClosedByCaller');
          }
        },
      },
      routeEnumerationPolicy,
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 4 },
      shouldAdmitOutgoingLinkTarget: () => false,
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(calls).toEqual(['B', 'C', 'permanentlyClosedByCaller']);
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 4,
        admittedRootOrLinkTargetOccurrences: 1,
        resolvedFoundVertexIdCount: 1,
        freshSourceOutgoingLinkCount: 2,
      },
      terminalOutcome: {
        kind: 'traversalLimitsReached',
        reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
      },
    });
    expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
  },
);

it.each(policies)(
  'keeps deep %s routes iterative without materializing hidden path prefixes',
  (routeEnumerationPolicy) => {
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
        enumerateRootTargets: () => [{ vertexId: 0 }],
        resolveVertexDataById: (id: number) => ({
          kind: 'found' as const,
          vertexData: id,
        }),
        enumerateOutgoingLinks: (vertex) => [
          {
            targetToResolveOnAdmission: { vertexId: vertex.vertexId + 1 },
            edgeData: undefined,
          },
        ],
      },
      expansionOrder: 'depthFirst',
      routeEnumerationPolicy,
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 12000 },
      deliveredEventKinds: [],
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 12000,
        admittedRootOrLinkTargetOccurrences: 12000,
      },
      terminalOutcome: {
        kind: 'traversalLimitsReached',
        reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
      },
    });
  },
);

it.each(policies)(
  'keeps route bounds atomic across construction and merged configure for %s',
  (routeEnumerationPolicy) => {
    const source = idGraph(['A'], [['A', ['A']]]);
    expect(
      () =>
        // @ts-expect-error Runtime callers must also provide a route exploration bound.
        new GraphWalkBuilder({
          graphWalkDiscoverySource: source,
          routeEnumerationPolicy,
        }),
    ).toThrow(TypeError);
    const factory = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
    expect(() =>
      factory.patchOptionsForFutureRunners({ routeEnumerationPolicy }),
    ).toThrow(TypeError);
    expect(
      factory
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal()
        .captureProgressSnapshot().terminalOutcome,
    ).toEqual({
      kind: 'explorationExhausted',
    });
    factory
      .patchOptionsForFutureRunners({ replaceLimits: { maxRouteHopDepth: 1 } })
      .patchOptionsForFutureRunners({ routeEnumerationPolicy });
    expect(() =>
      factory.patchOptionsForFutureRunners({
        replaceLimits: { maxAdmittedRootOrLinkTargetOccurrences: 5 },
      }),
    ).toThrow(TypeError);
    const runner = factory.createIndependentRunnerFromCurrentOptions();
    expect([
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      }),
    ]).toHaveLength(
      routeEnumerationPolicy === 'allRoutePrefixesAllowingRepeatedVertices'
        ? 2
        : 1,
    );
  },
);

it('materializes a deep pending path iteratively after an emission selector change', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: idGraph(['A'], [['A', ['A']]]),
    expansionOrder: 'depthFirst',
    routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
    limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 12000 },
  }).createIndependentRunnerFromCurrentOptions();
  const vertices =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
    });
  for (let i = 0; i < 12000; i++) expect(vertices.next().done).toBe(false);
  vertices.return();
  const paths = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ROUTE_PREFIX],
    }),
  ];
  expect(paths).toHaveLength(1);
  expect(paths[0]!.routeHopLength).toBe(11999);
  expect(paths[0]!.verticesInRootToTargetOrder).toHaveLength(12000);
  expect(paths[0]!.edgesInRootToTargetOrder).toHaveLength(11999);
  expect(paths[0]!.edgesInRootToTargetOrder[11998]).toEqual({
    fromVertexId: 'A',
    toVertexId: 'A',
    sourceOutgoingLinkIndexBeforeFiltering: 0,
    edgeData: undefined,
  });
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 12000,
    admittedRootOrLinkTargetOccurrences: 12000,
    resolvedFoundVertexIdCount: 1,
    freshSourceOutgoingLinkCount: 1,
  });
});

it('keeps once paths first-discovery only without a route bound', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: diamond(),
  }).createIndependentRunnerFromCurrentOptions();
  expect(
    [
      ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      }),
    ].map((path) =>
      path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
    ),
  ).toEqual(['A', 'AB', 'AC', 'ABD']);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'explorationExhausted',
  });
});

it.each(policies)(
  'can reject a cached link on one %s route and admit it on another',
  (routeEnumerationPolicy) => {
    const calls: string[] = [];
    const source = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D']],
        ['C', ['D']],
        ['D', ['E']],
        ['E', []],
      ],
    );
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: {
        ...source,
        resolveVertexDataById(id) {
          calls.push('resolve:' + id);
          return source.resolveVertexDataById!(id);
        },
        enumerateOutgoingLinks(vertex) {
          calls.push('open:' + vertex.vertexId);
          return source.enumerateOutgoingLinks(vertex);
        },
      },
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 4 },
      shouldAdmitOutgoingLinkTarget(_edge, context) {
        if (
          context.routeEnumerationPolicy === 'firstAdmittedFoundRoutePerVertex'
        )
          throw new Error('Expected route');
        const path = context.routePrefix.verticesInRootToTargetOrder
          .map((v) => v.vertexId)
          .join('');
        // Mutating a projected wrapper cannot change ancestry or future contexts.
        Reflect.set(
          context.routePrefix.verticesInRootToTargetOrder[0]!,
          'vertexId',
          'mutated',
        );
        return path !== 'ABD';
      },
    }).createIndependentRunnerFromCurrentOptions();
    expect(
      [
        ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
          deliveredEventKinds: [Phase.ROUTE_PREFIX],
        }),
      ].map((path) =>
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'AC', 'ABD', 'ACD', 'ACDE']);
    expect(calls).toEqual([
      'resolve:A',
      'open:A',
      'resolve:B',
      'resolve:C',
      'open:B',
      'resolve:D',
      'open:C',
      'open:D',
      'resolve:E',
      'open:E',
    ]);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      admittedRootOrLinkTargetOccurrences: 6,
      resolvedFoundVertexIdCount: 5,
      freshSourceOutgoingLinkCount: 5,
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 14,
    });
  },
);

it.each([-0, 0])(
  'rejects a signed-zero simple-path self-link from %p before follow',
  (vertexId) => {
    const calls: number[] = [];
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () => [
          {
            kind: 'inlineResolution' as const,
            vertexId,
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found' as const,
              vertexData: vertexId,
            },
          },
        ],
        enumerateOutgoingLinks: () => [
          {
            targetToResolveOnAdmission: {
              kind: 'previouslyAdmittedVertex' as const,
              vertexId: -vertexId,
            },
            edgeData: undefined,
          },
        ],
      },
      routeEnumerationPolicy: 'allVertexSimpleRoutePrefixes',
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 10 },
      shouldAdmitOutgoingLinkTarget(edge) {
        calls.push(edge.toVertexId);
        return true;
      },
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(calls).toEqual([]);
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        admittedRootOrLinkTargetOccurrences: 1,
        freshSourceOutgoingLinkCount: 1,
      },
      terminalOutcome: { kind: 'explorationExhausted' },
    });
  },
);
