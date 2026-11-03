import { GraphWalkBuilder, AsyncGraphWalkBuilder } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';
import { GraphWalkObservationKind as Phase } from '../src/traversals/graph-walk/GraphWalkPhase';
import type { GraphWalkDiscoverySource } from '../src/traversals/graph-walk/GraphWalkSource';
import { normalizeWalkOptions } from '../src/traversals/graph-walk/lib/normalizeWalkOptions';

const source: GraphWalkDiscoverySource<string, undefined, string> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  enumerateRootTargets: () => [],
  enumerateOutgoingLinks: () => [],
};

describe('walking configuration snapshots', () => {
  test('defaults are once/BFS with vertex emissions and all visitors, without source I/O', () => {
    const calls: string[] = [];
    const lazySource = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets() {
        calls.push('roots');
        return [];
      },
      enumerateOutgoingLinks() {
        calls.push('enumerateOutgoingLinks');
        return [];
      },
    };
    const config = normalizeWalkOptions({
      graphWalkDiscoverySource: lazySource,
    });
    expect(calls).toEqual([]);
    expect(config.expansionOrder).toBe('breadthFirst');
    expect(config.routeEnumerationPolicy).toBe(
      'firstAdmittedFoundRoutePerVertex',
    );
    expect(config.limits).toEqual({});
    expect(config.execution.deliveredEventKinds).toEqual([
      Phase.VERTEX_OCCURRENCE,
    ]);
    expect(config.execution.admittedVisitorCallbackPhases).toBe('all');
    expect(config.visitorsByObservationKind).toEqual({
      vertexOccurrence: [],
      admittedEdgeOccurrence: [],
      routePrefix: [],
    });
    expect(config.graphWalkDiscoverySource.receiver).toBe(lazySource);
    expect(config.graphWalkDiscoverySource.enumerateRootTargets).toBe(
      lazySource.enumerateRootTargets,
    );
    expect(
      config.graphWalkDiscoverySource.resolveVertexDataById,
    ).toBeUndefined();
    expect(config.shouldAdmitOutgoingLinkTarget).toBeUndefined();
    expect(config.shouldExpandVertexOccurrence).toBeUndefined();
  });

  test('construction and patches require a depth or step bound for enumeration', () => {
    for (const routeEnumerationPolicy of [
      'allVertexSimpleRoutePrefixes',
      'allRoutePrefixesAllowingRepeatedVertices',
    ]) {
      expect(() =>
        normalizeWalkOptions({
          graphWalkDiscoverySource: source,
          routeEnumerationPolicy,
        }),
      ).toThrow(TypeError);
      expect(() =>
        normalizeWalkOptions({
          graphWalkDiscoverySource: source,
          routeEnumerationPolicy,
          limits: { maxAdmittedRootOrLinkTargetOccurrences: 2 },
        }),
      ).toThrow(TypeError);
      expect(
        normalizeWalkOptions({
          graphWalkDiscoverySource: source,
          routeEnumerationPolicy,
          limits: { maxRouteHopDepth: 0 },
        }).routeEnumerationPolicy,
      ).toBe(routeEnumerationPolicy);
      expect(
        normalizeWalkOptions({
          graphWalkDiscoverySource: source,
          routeEnumerationPolicy,
          limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0 },
        }).routeEnumerationPolicy,
      ).toBe(routeEnumerationPolicy);
    }
    const unbounded = normalizeWalkOptions({
      graphWalkDiscoverySource: source,
    });
    expect(() =>
      normalizeWalkOptions(
        { routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices' },
        unbounded,
      ),
    ).toThrow(TypeError);
    expect(unbounded.routeEnumerationPolicy).toBe(
      'firstAdmittedFoundRoutePerVertex',
    );
    const bounded = normalizeWalkOptions({
      graphWalkDiscoverySource: source,
      limits: { maxRouteHopDepth: 3 },
    });
    const patched = normalizeWalkOptions(
      { routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices' },
      bounded,
    );
    expect(patched.routeEnumerationPolicy).toBe(
      'allRoutePrefixesAllowingRepeatedVertices',
    );
    expect(patched.limits).toEqual({ maxRouteHopDepth: 3 });
    expect(bounded.routeEnumerationPolicy).toBe(
      'firstAdmittedFoundRoutePerVertex',
    );
    expect(() => normalizeWalkOptions({ limits: {} }, patched)).toThrow(
      TypeError,
    );
    expect(patched.limits).toEqual({ maxRouteHopDepth: 3 });
  });

  test.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '1', null])(
    'rejects invalid bounds %p',
    (value) => {
      for (const key of [
        'maxRouteHopDepth',
        'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay',
        'maxAdmittedRootOrLinkTargetOccurrences',
      ]) {
        expect(() =>
          normalizeWalkOptions({
            graphWalkDiscoverySource: source,
            limits: { [key]: value },
          }),
        ).toThrow(TypeError);
      }
    },
  );

  test('copies selectors, limits and registration wrappers while retaining callbacks and receiver', () => {
    const deliveredEventKinds = [Phase.VERTEX_OCCURRENCE];
    const include = [Phase.ADMITTED_EDGE_OCCURRENCE];
    const limits = {
      maxRouteHopDepth: 4,
      maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: undefined,
    };
    const callback = () => undefined;
    const records = [
      { visitor: callback, descendingExecutionPriorityWithinGroup: 5 },
    ];
    const resolver = () => ({ kind: 'omitted' as const });
    const hydrated = {
      ...source,
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      resolveVertexDataById: resolver,
    };
    const config = normalizeWalkOptions({
      graphWalkDiscoverySource: hydrated,
      deliveredEventKinds,
      admittedVisitorCallbackPhases: { include },
      limits,
      visitorsByObservationKind: { vertexOccurrence: records },
      shouldAdmitOutgoingLinkTarget: callback,
      shouldExpandVertexOccurrence: callback,
    });
    deliveredEventKinds.length = 0;
    include.length = 0;
    limits.maxRouteHopDepth = 99;
    records[0]!.descendingExecutionPriorityWithinGroup = 99;
    hydrated.enumerateRootTargets = () => {
      throw new Error('changed');
    };
    expect(config.execution.deliveredEventKinds).toEqual([
      Phase.VERTEX_OCCURRENCE,
    ]);
    expect(config.execution.admittedVisitorCallbackPhases).toEqual({
      include: [Phase.ADMITTED_EDGE_OCCURRENCE],
    });
    expect(config.limits).toEqual({ maxRouteHopDepth: 4 });
    expect(
      config.visitorsByObservationKind.vertexOccurrence[0]!
        .descendingExecutionPriorityWithinGroup,
    ).toBe(5);
    expect(config.visitorsByObservationKind.vertexOccurrence[0]!.visitor).toBe(
      callback,
    );
    expect(config.graphWalkDiscoverySource.receiver).toBe(hydrated);
    expect(config.graphWalkDiscoverySource.enumerateRootTargets).toBe(
      source.enumerateRootTargets,
    );
    expect(config.graphWalkDiscoverySource.resolveVertexDataById).toBe(
      resolver,
    );
    expect(config.shouldAdmitOutgoingLinkTarget).toBe(callback);
    expect(config.shouldExpandVertexOccurrence).toBe(callback);
    expect(Object.isFrozen(hydrated)).toBe(false);
    const copy = normalizeWalkOptions({}, config);
    expect(copy.visitorsByObservationKind.vertexOccurrence[0]).not.toBe(
      config.visitorsByObservationKind.vertexOccurrence[0],
    );
    expect(copy.graphWalkDiscoverySource.enumerateRootTargets).toBe(
      config.graphWalkDiscoverySource.enumerateRootTargets,
    );
    expect(copy.limits).not.toBe(config.limits);
  });

  test('uses shared selector validation and field-wise legacy patches', () => {
    const config = normalizeWalkOptions({
      graphWalkDiscoverySource: source,
      deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
    });
    expect(config.execution.deliveredEventKinds).toEqual([
      Phase.ADMITTED_EDGE_OCCURRENCE,
    ]);
    const patched = normalizeWalkOptions(
      { admittedVisitorCallbackPhases: { exclude: [Phase.ROUTE_PREFIX] } },
      config,
    );
    expect(patched.execution.deliveredEventKinds).toEqual([
      Phase.ADMITTED_EDGE_OCCURRENCE,
    ]);
    expect(patched.execution.admittedVisitorCallbackPhases).toEqual({
      exclude: [Phase.ROUTE_PREFIX],
    });
    expect(() =>
      normalizeWalkOptions({
        graphWalkDiscoverySource: source,
        deliveredEventKinds: [],
        iterateOver: [],
      }),
    ).toThrow(TypeError);
    expect(() =>
      normalizeWalkOptions({
        graphWalkDiscoverySource: source,
        deliveredEventKinds: ['ON_WORK_READY'],
      }),
    ).toThrow(TypeError);
  });

  test.each([null, [], false, undefined])(
    'rejects nonobject options %p',
    (input) => {
      expect(() => normalizeWalkOptions(input)).toThrow(TypeError);
    },
  );

  test.each([
    undefined,
    null,
    [],
    1,
    { vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' },
    {
      vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
      rootVertexIds: 1,
      enumerateOutgoingLinks() {
        return [];
      },
    },
    {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets() {
        return [];
      },
      enumerateOutgoingLinks: null,
    },
    {
      ...source,
      vertexResolutionMode: 'resolverWithOptionalInlineResolution',
      resolveVertexDataById: 1,
    },
  ])('rejects malformed sources %p', (value) => {
    expect(() =>
      normalizeWalkOptions({ graphWalkDiscoverySource: value }),
    ).toThrow(TypeError);
  });

  test.each([
    { expansionOrder: 'DFS' },
    { expansionOrder: null },
    { routeEnumerationPolicy: 'paths' },
    { routeEnumerationPolicy: null },
    { limits: null },
    { limits: [] },
    { limits: 1 },
    { shouldAdmitOutgoingLinkTarget: false },
    { shouldExpandVertexOccurrence: false },
    { visitorsByObservationKind: null },
    { visitors: [] },
    { visitorsByObservationKind: 1 },
    { visitorsByObservationKind: { ON_WORK_READY: [] } },
    { visitorsByObservationKind: { vertexOccurrence: 1 } },
  ])('rejects malformed fields %p', (patch) => {
    expect(() =>
      normalizeWalkOptions({ graphWalkDiscoverySource: source, ...patch }),
    ).toThrow(TypeError);
  });

  test('rejects any own concurrency before reading options or source callbacks', () => {
    const input = {
      get graphWalkDiscoverySource() {
        throw 'source getter';
      },
    };
    Object.defineProperty(input, 'concurrency', { value: undefined });
    expect(() => normalizeWalkOptions(input)).toThrow(TypeError);
    const inherited = Object.assign(
      Object.create({ concurrency: 20 }) as object,
      { graphWalkDiscoverySource: source },
    );
    expect(normalizeWalkOptions(inherited).routeEnumerationPolicy).toBe(
      'firstAdmittedFoundRoutePerVertex',
    );
  });

  test('reads recognized getters once and propagates exact getter errors', () => {
    const reads: string[] = [];
    const input = Object.create(null) as Record<string, unknown>;
    const values = {
      graphWalkDiscoverySource: source,
      expansionOrder: 'depthFirst',
      routeEnumerationPolicy: 'firstAdmittedFoundRoutePerVertex',
      limits: { maxAdmittedRootOrLinkTargetOccurrences: 0 },
      shouldAdmitOutgoingLinkTarget: () => true,
      shouldExpandVertexOccurrence: () => false,
      visitorsByObservationKind: { admittedEdgeOccurrence: [] },
      deliveredEventKinds: [Phase.ROUTE_PREFIX],
    };
    for (const [key, value] of Object.entries(values))
      Object.defineProperty(input, key, {
        get() {
          reads.push(key);
          return value;
        },
      });
    expect(normalizeWalkOptions(input).expansionOrder).toBe('depthFirst');
    expect(reads).toEqual(Object.keys(values));
    for (const error of [null, undefined, Symbol('error')]) {
      let caught = false;
      try {
        normalizeWalkOptions({
          get graphWalkDiscoverySource() {
            throw error;
          },
        });
      } catch (value) {
        caught = true;
        expect(value).toBe(error);
      }
      expect(caught).toBe(true);
    }
  });

  test('captures nested source, limit and phase getters once without invoking callbacks', () => {
    const reads: string[] = [];
    const capturedSource = {
      get vertexResolutionMode() {
        reads.push('vertexResolutionMode');
        return 'inlineResolutionOrPreviouslyAdmittedVertex' as const;
      },
      get enumerateRootTargets() {
        reads.push('roots');
        return source.enumerateRootTargets;
      },
      get enumerateOutgoingLinks() {
        reads.push('enumerateOutgoingLinks');
        return source.enumerateOutgoingLinks;
      },
      get resolveVertexDataById() {
        reads.push('resolveVertexDataById');
        return undefined;
      },
    };
    normalizeWalkOptions({
      graphWalkDiscoverySource: capturedSource,
      limits: {
        get maxRouteHopDepth() {
          reads.push('maxRouteHopDepth');
          return 2;
        },
      },
      visitorsByObservationKind: {
        get vertexOccurrence() {
          reads.push('vertexOccurrence');
          return [];
        },
      },
    });
    expect(reads).toEqual([
      'vertexResolutionMode',
      'roots',
      'enumerateOutgoingLinks',
      'resolveVertexDataById',
      'maxRouteHopDepth',
      'vertexOccurrence',
    ]);
  });

  test('replaces supplied visitor phases and preserves other copied phases during patches', () => {
    const first = () => undefined;
    const second = () => undefined;
    const config = normalizeWalkOptions({
      graphWalkDiscoverySource: source,
      visitorsByObservationKind: {
        vertexOccurrence: first,
        admittedEdgeOccurrence: second,
      },
    });
    const patched = normalizeWalkOptions(
      { visitorsByObservationKind: { vertexOccurrence: [] } },
      config,
    );
    expect(patched.visitorsByObservationKind.vertexOccurrence).toEqual([]);
    expect(
      patched.visitorsByObservationKind.admittedEdgeOccurrence[0]!.visitor,
    ).toBe(second);
    expect(config.visitorsByObservationKind.vertexOccurrence[0]!.visitor).toBe(
      first,
    );
  });
});

for (const Factory of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
  test(`${Factory.name} rejects unknown options and limit keys before discovery and preserves configuration`, async () => {
    const roots = jest.fn(() => []);
    const lazy = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: roots,
      enumerateOutgoingLinks: () => [],
    };
    const traversal = new Factory({
      graphWalkDiscoverySource: lazy,
      limits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0 },
    });
    for (const key of ['stratgey', Symbol('option')]) {
      const bad = Object.defineProperty({}, key, { value: 'depthFirst' });
      expect(
        () =>
          new Factory({
            graphWalkDiscoverySource: lazy,
            ...bad,
            [key]: 'depthFirst',
          }),
      ).toThrow(TypeError);
      expect(() => traversal.patchOptionsForFutureRunners(bad)).toThrow(
        TypeError,
      );
    }
    expect(
      () =>
        new Factory({
          graphWalkDiscoverySource: lazy,
          limits: {
            maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 2,
            maxDepht: 1,
          } as never,
        }),
    ).toThrow(TypeError);
    expect(() =>
      traversal.patchOptionsForFutureRunners({
        replaceLimits: {
          maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 2,
          maxDepht: 1,
        } as never,
      }),
    ).toThrow(TypeError);
    expect(roots).not.toHaveBeenCalled();
    await traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(roots).not.toHaveBeenCalled();
  });
}

for (const Factory of [GraphWalkBuilder, AsyncGraphWalkBuilder]) {
  test(`${Factory.name} accepts initially absent null predicates`, async () => {
    const walk = new Factory({
      graphWalkDiscoverySource: idGraph(
        ['root'],
        [
          ['root', ['child']],
          ['child', []],
        ],
      ),
      shouldAdmitOutgoingLinkTarget: null,
      shouldExpandVertexOccurrence: null,
    });
    const runner = walk.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
    ).toBe(2);
    expect(
      runner.captureProgressSnapshot().counts.freshSourceOutgoingLinkCount,
    ).toBe(1);
  });

  test.each([
    'shouldAdmitOutgoingLinkTarget',
    'shouldExpandVertexOccurrence',
  ] as const)(
    `${Factory.name} resets %s with null and retains it with undefined or omission atomically`,
    async (predicate) => {
      const walk = new Factory({
        graphWalkDiscoverySource: idGraph(
          ['root'],
          [
            ['root', ['child']],
            ['child', []],
          ],
        ),
        [predicate]: () => false,
      });
      async function found() {
        const runner = walk.createIndependentRunnerFromCurrentOptions();
        await runner.runUntilSuspendedOrTerminal();
        return runner.captureProgressSnapshot().counts
          .resolvedFoundVertexIdCount;
      }
      expect(await found()).toBe(1);
      walk.patchOptionsForFutureRunners({ [predicate]: undefined });
      walk.patchOptionsForFutureRunners({});
      expect(await found()).toBe(1);
      expect(() =>
        walk.patchOptionsForFutureRunners({
          [predicate]: null,
          deliveredEventKinds: ['invalid'] as never,
        }),
      ).toThrow(TypeError);
      expect(await found()).toBe(1);
      walk.patchOptionsForFutureRunners({ [predicate]: null });
      expect(await found()).toBe(2);
    },
  );
}

it.each(['followEdge', 'expandVertex'])(
  'rejects removed predicate option %s instead of retaining an alias',
  (key) => {
    const source = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => [],
      enumerateOutgoingLinks: () => [],
    };
    expect(
      () =>
        new GraphWalkBuilder({
          graphWalkDiscoverySource: source,
          [key]: () => true,
        } as never),
    ).toThrow(TypeError);
  },
);
it.each(['maxSteps', 'maxOccurrences'])(
  'rejects removed walking limit %s instead of retaining an alias',
  (key) => {
    const source = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => [],
      enumerateOutgoingLinks: () => [],
    };
    expect(
      () =>
        new GraphWalkBuilder({
          graphWalkDiscoverySource: source,
          limits: { [key]: 1 },
        } as never),
    ).toThrow(TypeError);
  },
);
