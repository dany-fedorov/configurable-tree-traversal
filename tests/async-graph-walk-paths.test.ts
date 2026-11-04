import {
  AsyncGraphWalkBuilder,
  GraphWalkObservationKind as Phase,
} from '../src';
import type {
  AsyncGraphWalkDiscoverySource,
  GraphWalkRoutePrefixEvent,
} from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

const policies = [
  'allVertexSimpleRoutePrefixes',
  'allRoutePrefixesAllowingRepeatedVertices',
] as const;

it.each(policies)(
  'enumerates async %s diamond prefixes with one resolution/open per identity',
  async (routeEnumerationPolicy) => {
    const calls: string[] = [];
    const base = idGraph(
      ['A'],
      [
        ['A', ['B', 'C']],
        ['B', ['D']],
        ['C', ['D']],
        ['D', ['A']],
      ],
    );
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
        async enumerateRootTargets() {
          return base.enumerateRootTargets();
        },
        async resolveVertexDataById(id) {
          calls.push('resolve:' + id);
          return base.resolveVertexDataById!(id);
        },
        async *enumerateOutgoingLinks(vertex) {
          calls.push('open:' + vertex.vertexId);
          yield* base.enumerateOutgoingLinks(vertex);
        },
      },
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 3 },
      shouldAdmitOutgoingLinkTarget: async (_edge, context) =>
        context.routeEnumerationPolicy === routeEnumerationPolicy &&
        context.routePrefix.routeHopLength < 3,
      shouldExpandVertexOccurrence: async (_vertex, context) =>
        context.routeEnumerationPolicy === routeEnumerationPolicy &&
        context.routePrefix.routeHopLength >= 0,
    }).createIndependentRunnerFromCurrentOptions();
    const paths: string[] = [];
    for await (const path of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      },
    ))
      paths.push(
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      );
    expect(paths).toEqual(
      routeEnumerationPolicy === 'allVertexSimpleRoutePrefixes'
        ? ['A', 'AB', 'AC', 'ABD', 'ACD']
        : ['A', 'AB', 'AC', 'ABD', 'ACD', 'ABDA', 'ACDA'],
    );
    expect(calls).toEqual([
      'resolve:A',
      'open:A',
      'resolve:B',
      'resolve:C',
      'open:B',
      'resolve:D',
      'open:C',
      'open:D',
    ]);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      resolvedFoundVertexIdCount: 4,
      freshSourceOutgoingLinkCount: 5,
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 13,
    });
  },
);

it.each(policies)(
  'retains a partially consumed async adjacency across pause and reuses it for another %s prefix',
  async (routeEnumerationPolicy) => {
    // DFS reaches D twice while its first adjacency frame is suspended. The
    // nested occurrence must replay D->B then physically pull D->E exactly once.
    const adjacency = new Map([
      ['A', ['D']],
      ['D', ['B', 'E']],
      ['B', ['D']],
      ['E', []],
    ]);
    const trace: string[] = [];
    const source: AsyncGraphWalkDiscoverySource<string, undefined, string> = {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: async function* () {
        yield { vertexId: 'A' };
      },
      async resolveVertexDataById(vertexId) {
        trace.push('resolve:' + vertexId);
        return { kind: 'found', vertexData: vertexId };
      },
      async *enumerateOutgoingLinks(vertex) {
        trace.push('open:' + vertex.vertexId);
        try {
          for (const vertexId of adjacency.get(vertex.vertexId)!) {
            trace.push(vertex.vertexId + '>' + vertexId);
            yield {
              targetToResolveOnAdmission: { vertexId },
              edgeData: undefined,
            };
          }
        } finally {
          trace.push('done:' + vertex.vertexId);
        }
      },
    };
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: source,
      expansionOrder: 'depthFirst',
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 5 },
    }).createIndependentRunnerFromCurrentOptions();
    const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      },
    );
    const before: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await first.next();
      if (result.done) throw new Error('Expected prefix');
      before.push(
        result.value.verticesInRootToTargetOrder
          .map((v) => v.vertexId)
          .join(''),
      );
    }
    expect(before).toEqual(['A', 'AD', 'ADB']);
    await first.return();
    expect(trace).toEqual([
      'resolve:A',
      'open:A',
      'A>D',
      'resolve:D',
      'open:D',
      'D>B',
      'resolve:B',
    ]);
    expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(3);
    const rest: string[] = [];
    for await (const path of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      },
    ))
      rest.push(
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      );
    expect(rest).toEqual(
      routeEnumerationPolicy === 'allVertexSimpleRoutePrefixes'
        ? ['ADE']
        : ['ADBD', 'ADBDB', 'ADBDBD', 'ADBDE', 'ADE'],
    );
    expect(trace.filter((entry) => entry.startsWith('resolve:'))).toEqual([
      'resolve:A',
      'resolve:D',
      'resolve:B',
      'resolve:E',
    ]);
    expect(trace.filter((entry) => entry.startsWith('open:'))).toEqual([
      'open:A',
      'open:D',
      'open:B',
      'open:E',
    ]);
    expect(trace.filter((entry) => entry.includes('>'))).toEqual([
      'A>D',
      'D>B',
      'B>D',
      'D>E',
    ]);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      resolvedFoundVertexIdCount: 4,
      freshSourceOutgoingLinkCount: 4,
    });
    expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
  },
);

it.each(policies)(
  'reuses shared async adjacency after pause for every queued %s prefix',
  async (routeEnumerationPolicy) => {
    const trace: string[] = [];
    const adjacency = new Map([
      ['A', ['B', 'C']],
      ['B', ['D']],
      ['C', ['D']],
      ['D', ['E', 'F']],
      ['E', []],
      ['F', []],
    ]);
    const runner = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: {
        vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
        enumerateRootTargets: () => [{ vertexId: 'A' }],
        async resolveVertexDataById(id: string) {
          trace.push('resolve:' + id);
          return { kind: 'found' as const, vertexData: id };
        },
        async *enumerateOutgoingLinks(vertex) {
          trace.push('open:' + vertex.vertexId);
          for (const id of adjacency.get(vertex.vertexId)!) {
            trace.push(vertex.vertexId + '>' + id);
            yield {
              targetToResolveOnAdmission: { vertexId: id },
              edgeData: undefined,
            };
          }
        },
      },
      routeEnumerationPolicy,
      limits: { maxRouteHopDepth: 4 },
    }).createIndependentRunnerFromCurrentOptions();
    const first = runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      },
    );
    const paths: GraphWalkRoutePrefixEvent<string, undefined, string>[] = [];
    for (let i = 0; i < 6; i++) {
      const next = await first.next();
      if (next.done) throw new Error('Expected path');
      paths.push(next.value);
    }
    expect(
      paths.map((path) =>
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      ),
    ).toEqual(['A', 'AB', 'AC', 'ABD', 'ACD', 'ABDE']);
    await first.return();
    expect(trace.filter((entry) => entry.startsWith('D>'))).toEqual(['D>E']);
    expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(1);
    const rest: string[] = [];
    for await (const path of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [Phase.ROUTE_PREFIX],
      },
    ))
      rest.push(
        path.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
      );
    expect(rest).toEqual(['ABDF', 'ACDE', 'ACDF']);
    expect(trace.filter((entry) => entry.startsWith('D>'))).toEqual([
      'D>E',
      'D>F',
    ]);
    expect(trace.filter((entry) => entry.startsWith('open:'))).toEqual([
      'open:A',
      'open:B',
      'open:C',
      'open:D',
      'open:E',
      'open:F',
    ]);
    expect(runner.captureProgressSnapshot()).toMatchObject({
      counts: {
        resolvedFoundVertexIdCount: 6,
        freshSourceOutgoingLinkCount: 6,
        admittedRootOrLinkTargetOccurrences: 9,
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 19,
      },
      terminalOutcome: { kind: 'explorationExhausted' },
    });
  },
);

it('closes each physical async iterator once after cached replay hits its step limit', async () => {
  const trace: string[] = [];
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: async function* () {
        try {
          yield {
            kind: 'inlineResolution' as const,
            vertexId: 'A',
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found' as const,
              vertexData: 'A',
            },
          };
        } finally {
          trace.push('close:roots');
        }
      },
      enumerateOutgoingLinks: async function* () {
        try {
          trace.push('pull:A');
          yield {
            targetToResolveOnAdmission: {
              kind: 'previouslyAdmittedVertex' as const,
              vertexId: 'A',
            },
            edgeData: undefined,
          };
          trace.push('unexpected second pull');
        } finally {
          trace.push('close:A');
        }
      },
    },
    expansionOrder: 'depthFirst',
    routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
    limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3 },
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ROUTE_PREFIX],
    });
  const paths: string[] = [];
  for (let i = 0; i < 3; i++) {
    const next = await iterator.next();
    if (next.done) throw new Error('Expected path');
    paths.push(
      next.value.verticesInRootToTargetOrder.map((v) => v.vertexId).join(''),
    );
  }
  expect(paths).toEqual(['A', 'AA', 'AAA']);
  expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(2);
  expect(trace).toEqual(['pull:A']);
  expect((await iterator.next()).done).toBe(true);
  await runner.closePermanentlyAndDisposeSourceIterators();
  expect(trace).toEqual(['pull:A', 'close:A', 'close:roots']);
  expect(runner.captureExecutionSnapshot().openSourceIteratorCount).toBe(0);
  expect(runner.captureProgressSnapshot()).toMatchObject({
    counts: {
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3,
      admittedRootOrLinkTargetOccurrences: 3,
      resolvedFoundVertexIdCount: 1,
      freshSourceOutgoingLinkCount: 1,
    },
    terminalOutcome: {
      kind: 'traversalLimitsReached',
      reachedLimits: ['maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'],
    },
  });
});

it.each(policies)(
  'validates async %s bounds atomically before source I/O',
  async (routeEnumerationPolicy) => {
    const source = idGraph(['A'], [['A', ['A']]]);
    expect(
      () =>
        // @ts-expect-error Runtime callers must also provide a route exploration bound.
        new AsyncGraphWalkBuilder({
          graphWalkDiscoverySource: source,
          routeEnumerationPolicy,
        }),
    ).toThrow(TypeError);
    const factory = new AsyncGraphWalkBuilder({
      graphWalkDiscoverySource: source,
    });
    expect(() =>
      factory.patchOptionsForFutureRunners({ routeEnumerationPolicy }),
    ).toThrow(TypeError);
    expect(
      (
        await factory
          .createIndependentRunnerFromCurrentOptions()
          .runUntilSuspendedOrTerminal()
      ).captureProgressSnapshot().terminalOutcome,
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
    const runner = await factory
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().counts
        .admittedRootOrLinkTargetOccurrences,
    ).toBe(
      routeEnumerationPolicy === 'allRoutePrefixesAllowingRepeatedVertices'
        ? 2
        : 1,
    );
  },
);

it.each(policies)(
  'keeps async %s admission and I/O independent of selectors at an occurrence limit',
  async (routeEnumerationPolicy) => {
    const results = [];
    for (const deliveredEventKinds of [
      [],
      [Phase.ROUTE_PREFIX],
      [Phase.VERTEX_OCCURRENCE, Phase.ADMITTED_EDGE_OCCURRENCE],
      [Phase.ADMITTED_EDGE_OCCURRENCE, Phase.ROUTE_PREFIX],
    ]) {
      const calls: string[] = [];
      const source = idGraph(
        ['A'],
        [
          ['A', ['B', 'B']],
          ['B', ['A']],
        ],
      );
      const runner = new AsyncGraphWalkBuilder({
        graphWalkDiscoverySource: {
          ...source,
          async resolveVertexDataById(id) {
            calls.push('resolve:' + id);
            return source.resolveVertexDataById!(id);
          },
          async *enumerateOutgoingLinks(vertex) {
            calls.push('open:' + vertex.vertexId);
            yield* source.enumerateOutgoingLinks(vertex);
          },
        },
        routeEnumerationPolicy,
        limits: {
          maxRouteHopDepth: 4,
          maxAdmittedRootOrLinkTargetOccurrences: 3,
        },
      }).createIndependentRunnerFromCurrentOptions();
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
        {
          deliveredEventKinds,
        },
      ))
        expect(deliveredEventKinds).toContain(event.eventKind);
      results.push({
        captureProgressSnapshot: runner.captureProgressSnapshot(),
        calls,
      });
    }
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]).toMatchObject({
      captureProgressSnapshot: {
        counts: {
          rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 4,
          admittedRootOrLinkTargetOccurrences: 3,
          resolvedFoundVertexIdCount: 2,
          freshSourceOutgoingLinkCount: 2,
        },
        terminalOutcome: {
          kind: 'traversalLimitsReached',
          reachedLimits: ['maxAdmittedRootOrLinkTargetOccurrences'],
        },
      },
      calls: ['resolve:A', 'open:A', 'resolve:B'],
    });
  },
);

it.each(policies)(
  'performs no async source I/O at zero %s global bounds',
  async (routeEnumerationPolicy) => {
    for (const limits of [
      { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0 },
      { maxRouteHopDepth: 2, maxAdmittedRootOrLinkTargetOccurrences: 0 },
    ]) {
      const calls: string[] = [];
      const runner = await new AsyncGraphWalkBuilder({
        graphWalkDiscoverySource: {
          vertexResolutionMode:
            'inlineResolutionOrPreviouslyAdmittedVertex' as const,
          async enumerateRootTargets() {
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
      expect(runner.captureProgressSnapshot().counts).toMatchObject({
        rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0,
        admittedRootOrLinkTargetOccurrences: 0,
      });
    }
  },
);

it.each(policies)(
  'bounds filtered async %s links and awaits partial-stream cleanup',
  async (routeEnumerationPolicy) => {
    const calls: string[] = [];
    const runner = await new AsyncGraphWalkBuilder({
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
        async *enumerateOutgoingLinks() {
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
            await Promise.resolve();
            calls.push('permanentlyClosedByCaller');
          }
        },
      },
      routeEnumerationPolicy,
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 4 },
      shouldAdmitOutgoingLinkTarget: async () => false,
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
