import {
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkDiscoverySource } from '../src';
import { idGraph } from './helpers/graph-walk-fixtures';

it('deduplicates arbitrary IDs by SameValueZero without coercion', () => {
  const object = {
    vertexId: 'not the ID',
    resolutionIfNotPreviouslyAdmitted: 'not hydration',
  };
  const other = {};
  const symbol = Symbol('id');
  const ids = [object, other, symbol, undefined, NaN, -0];
  const resolutions: unknown[] = [];
  const openings: unknown[] = [];
  const source: GraphWalkDiscoverySource<unknown, undefined, unknown> = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets: () =>
      [...ids, ...ids, 0].map((vertexId) => ({ vertexId })),
    resolveVertexDataById(vertexId) {
      resolutions.push(vertexId);
      return { kind: 'found', vertexData: undefined };
    },
    enumerateOutgoingLinks(vertex) {
      openings.push(vertex.vertexId);
      return [
        {
          targetToResolveOnAdmission: { vertexId: vertex.vertexId },
          edgeData: undefined,
        },
      ];
    },
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        Phase.VERTEX_OCCURRENCE,
        Phase.ADMITTED_EDGE_OCCURRENCE,
      ],
    }),
  ];
  expect(
    events.flatMap((event) =>
      event.eventKind === 'vertexOccurrence' ? [event.vertex.vertexId] : [],
    ),
  ).toEqual(ids);
  expect(resolutions).toEqual(ids);
  expect(openings).toEqual(ids);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    resolvedFoundVertexIdCount: 6,
    resolvedOmittedVertexIdCount: 0,
    admittedRootOrLinkTargetOccurrences: 12,
    freshSourceOutgoingLinkCount: 6,
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 26,
  });
});

it('caches first accepted inline hydration and omission, copying wrappers but sharing caller data', () => {
  const data = { label: 'A' };
  const root = {
    kind: 'inlineResolution' as const,
    vertexId: 'A',
    resolutionIfNotPreviouslyAdmitted: {
      kind: 'found' as const,
      vertexData: data,
    },
  };
  const link = {
    targetToResolveOnAdmission: {
      kind: 'inlineResolution' as const,
      vertexId: 'B',
      resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' as const },
    },
    edgeData: { relation: true },
  };
  const source: GraphWalkDiscoverySource<
    typeof data,
    typeof link.edgeData,
    string
  > = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => [
      root,
      {
        kind: 'inlineResolution' as const,
        vertexId: 'missing',
        resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' },
      },
    ],
    enumerateOutgoingLinks: (vertex) =>
      vertex.vertexId !== 'A'
        ? []
        : [
            link,
            link,
            {
              targetToResolveOnAdmission: {
                kind: 'inlineResolution' as const,
                vertexId: 'B',
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: data,
                },
              },
              edgeData: link.edgeData,
            },
            { targetToResolveOnAdmission: root, edgeData: link.edgeData },
          ],
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [
        Phase.VERTEX_OCCURRENCE,
        Phase.ADMITTED_EDGE_OCCURRENCE,
      ],
    });
  const first = iterator.next().value!;
  expect(first).toMatchObject({
    eventKind: 'vertexOccurrence',
    vertex: { vertexId: 'A', vertexData: data },
  });
  if (first.eventKind !== 'vertexOccurrence')
    throw new Error('Expected vertex');
  expect(first.vertex).not.toBe(root);
  expect(first.vertex.vertexData).toBe(data);
  root.vertexId = 'changed';
  const edges = [...iterator];
  expect(
    edges.flatMap((event) =>
      event.eventKind === 'admittedEdgeOccurrence'
        ? [
            [
              event.edge.fromVertexId,
              event.edge.toVertexId,
              event.edge.sourceOutgoingLinkIndexBeforeFiltering,
              event.targetResolution.kind,
            ],
          ]
        : [],
    ),
  ).toEqual([
    ['A', 'B', 0, 'omitted'],
    ['A', 'B', 1, 'omitted'],
    ['A', 'B', 2, 'omitted'],
    ['A', 'changed', 3, 'found'],
  ]);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    resolvedFoundVertexIdCount: 2,
    resolvedOmittedVertexIdCount: 2,
  });
  expect(Object.isFrozen(data)).toBe(false);
});

it.each(['breadthFirst', 'depthFirst'] as const)(
  'walks a 20,000-vertex chain iteratively with %s',
  (expansionOrder) => {
    const source: GraphWalkDiscoverySource<number, undefined, number> = {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () => [{ vertexId: 0 }],
      resolveVertexDataById: (id) => ({ kind: 'found', vertexData: id }),
      enumerateOutgoingLinks: (vertex) =>
        vertex.vertexId === 19999
          ? []
          : [
              {
                targetToResolveOnAdmission: { vertexId: vertex.vertexId + 1 },
                edgeData: undefined,
              },
            ],
    };
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: source,
      expansionOrder,
      deliveredEventKinds: [],
    })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      resolvedFoundVertexIdCount: 20000,
      freshSourceOutgoingLinkCount: 19999,
      admittedRootOrLinkTargetOccurrences: 20000,
      rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 40001,
    });
  },
);

it('keeps independent runner caches and captured callback receivers', () => {
  const source = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    label: 'old',
    enumerateRootTargets() {
      return [{ vertexId: this.label }];
    },
    resolveVertexDataById(id: string) {
      return { kind: 'found' as const, vertexData: id };
    },
    enumerateOutgoingLinks() {
      return [];
    },
  };
  const factory = new GraphWalkBuilder({ graphWalkDiscoverySource: source });
  const first = factory.createIndependentRunnerFromCurrentOptions();
  source.enumerateRootTargets = () => {
    throw new Error('re-read callback');
  };
  source.label = 'new';
  const second = factory.createIndependentRunnerFromCurrentOptions();
  expect([
    ...first.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([
    ...second.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]);
  expect(
    first.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  ).toBe(1);
  expect(
    second.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  ).toBe(1);
});

it('exhausts empty roots and skips omitted roots without opening adjacency', () => {
  expect(
    new GraphWalkBuilder({ graphWalkDiscoverySource: idGraph([], []) })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .captureProgressSnapshot().counts
      .rootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
  ).toBe(1);
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      enumerateRootTargets: () => [{ vertexId: 0 }, { vertexId: 0 }],
      resolveVertexDataById: () => ({ kind: 'omitted' as const }),
      enumerateOutgoingLinks: () => {
        throw new Error('omitted');
      },
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ]).toEqual([]);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    admittedRootOrLinkTargetOccurrences: 1,
    resolvedOmittedVertexIdCount: 1,
    resolvedFoundVertexIdCount: 0,
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 3,
  });
});

it.each([undefined, null, false, 0, 'failure', { error: true }])(
  'retains exact thrown source values: %p',
  (error) => {
    const source = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets() {
        throw error;
      },
      enumerateOutgoingLinks: () => [],
    };
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    let caught: unknown = 'not thrown';
    try {
      runner.runUntilSuspendedOrTerminal();
    } catch (value) {
      caught = value;
    }
    expect(caught).toBe(error);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    expect(runner.getTraversalStopReason()).toBe('failed');
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'failed',
      error,
    });
    caught = 'not thrown';
    try {
      runner.runUntilSuspendedOrTerminal();
    } catch (value) {
      caught = value;
    }
    expect(caught).toBe(error);
  },
);

it('rejects a first-use cached target only at admission', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => [
        { kind: 'previouslyAdmittedVertex' as const, vertexId: 'A' },
      ],
      enumerateOutgoingLinks: () => [],
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(TypeError);
  expect(
    runner.captureProgressSnapshot().counts.admittedRootOrLinkTargetOccurrences,
  ).toBe(1);
});

it.each([
  { enumerateRootTargets: () => null },
  { enumerateRootTargets: () => ({ [Symbol.iterator]: () => null }) },
  { enumerateRootTargets: () => ({ [Symbol.iterator]: () => ({ next: 1 }) }) },
  {
    enumerateRootTargets: () => ({
      [Symbol.iterator]: () => ({ next: () => null }),
    }),
  },
  { enumerateRootTargets: () => [null] },
  { enumerateRootTargets: () => [{}] },
  { resolveVertexDataById: () => ({ kind: 'missing' }) },
  { resolveVertexDataById: () => ({ kind: 'found' }) },
  { enumerateOutgoingLinks: () => [null] },
  { enumerateOutgoingLinks: () => [{}] },
  { enumerateRootTargets: () => Promise.resolve([]) },
  {
    resolveVertexDataById: () =>
      Promise.resolve({ kind: 'found', vertexData: 1 }),
  },
  { enumerateOutgoingLinks: () => Promise.resolve([]) },
])('rejects malformed sync source protocols %#', (patch) => {
  const source = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution',
    enumerateRootTargets: () => [{ vertexId: 'A' }],
    resolveVertexDataById: () => ({ kind: 'found', vertexData: 1 }),
    enumerateOutgoingLinks: () => [],
    ...patch,
  } as unknown as GraphWalkDiscoverySource<number, undefined, string>;
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(TypeError);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
});

it('counts a candidate before rejecting malformed inline hydration', () => {
  const source = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => [
      {
        kind: 'inlineResolution' as const,
        vertexId: 'A',
        resolutionIfNotPreviouslyAdmitted: { kind: 'missing' },
      },
    ],
    enumerateOutgoingLinks: () => [],
  } as unknown as GraphWalkDiscoverySource<string, undefined, string>;
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(TypeError);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    admittedRootOrLinkTargetOccurrences: 1,
    resolvedFoundVertexIdCount: 0,
    resolvedOmittedVertexIdCount: 0,
  });
});

it.each([false, {}, { [Symbol.iterator]: 1 }])(
  'rejects noniterable source values: %p',
  (value) => {
    const source = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => value,
      enumerateOutgoingLinks: () => [],
    } as unknown as GraphWalkDiscoverySource<unknown, unknown, unknown>;
    expect(() =>
      new GraphWalkBuilder({ graphWalkDiscoverySource: source })
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).toThrow(TypeError);
  },
);

it('observes rejected thenables returned from callbacks and next methods', async () => {
  const error = new Error('rejection');
  const rejected = Promise.reject(error);
  const source = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => rejected,
    enumerateOutgoingLinks: () => [],
  } as unknown as GraphWalkDiscoverySource<unknown, unknown, unknown>;
  expect(() =>
    new GraphWalkBuilder({ graphWalkDiscoverySource: source })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow(TypeError);
  const iteratorSource = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => ({
      [Symbol.iterator]: () => ({ next: () => Promise.reject(error) }),
    }),
    enumerateOutgoingLinks: () => [],
  } as unknown as GraphWalkDiscoverySource<unknown, unknown, unknown>;
  expect(() =>
    new GraphWalkBuilder({ graphWalkDiscoverySource: iteratorSource })
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).toThrow(TypeError);
  await Promise.resolve();
});

it.each([
  'targetToResolveOnAdmission',
  'resolutionIfNotPreviouslyAdmitted',
  'kind',
  'vertexData',
  'done',
  'then',
] as const)('retains exact errors from source-owned %s getters', (key) => {
  const error = { key };
  const bad = Object.defineProperty({}, key, {
    get() {
      throw error;
    },
  });
  const source = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets: () =>
      key === 'then'
        ? bad
        : key === 'done'
        ? { [Symbol.iterator]: () => ({ next: () => bad }) }
        : [{ vertexId: 'A' }],
    resolveVertexDataById: () =>
      key === 'kind'
        ? bad
        : key === 'vertexData'
        ? Object.assign(bad, { kind: 'found' })
        : { kind: 'found', vertexData: 1 },
    enumerateOutgoingLinks: () =>
      key === 'targetToResolveOnAdmission'
        ? [bad]
        : key === 'resolutionIfNotPreviouslyAdmitted'
        ? [
            {
              targetToResolveOnAdmission: Object.assign(bad, {
                vertexId: 'B',
              }),
            },
          ]
        : [],
  } as unknown as GraphWalkDiscoverySource<unknown, unknown, unknown>;
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  let caught: unknown;
  try {
    runner.runUntilSuspendedOrTerminal();
  } catch (value) {
    caught = value;
  }
  expect(caught).toBe(error);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'failed',
    error,
  });
});

it('ignores later inline hydration without reading its getters', () => {
  const poisoned = {
    kind: 'inlineResolution' as const,
    vertexId: 'A',
    get resolutionIfNotPreviouslyAdmitted(): never {
      throw new Error('cached inline value must not be read');
    },
  };
  const source: GraphWalkDiscoverySource<string, undefined, string> = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: () => [
      {
        kind: 'inlineResolution' as const,
        vertexId: 'A',
        resolutionIfNotPreviouslyAdmitted: {
          kind: 'found',
          vertexData: 'first',
        },
      },
      poisoned,
    ],
    enumerateOutgoingLinks: () => [
      { targetToResolveOnAdmission: poisoned, edgeData: undefined },
    ],
  };
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
    }),
  ]).toMatchObject([
    {
      targetResolution: {
        kind: 'found',
        vertex: { vertexId: 'A', vertexData: 'first' },
      },
    },
  ]);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    resolvedFoundVertexIdCount: 1,
    admittedRootOrLinkTargetOccurrences: 2,
    freshSourceOutgoingLinkCount: 1,
  });
});

it.each(['roots', 'enumerateOutgoingLinks'] as const)(
  'observes rejected promises from the %s iterator factory before retaining TypeError',
  async (location) => {
    const rejection = { location };
    const rejected = Promise.reject(rejection);
    const observed: unknown[] = [];
    // Use a real rejected promise. Record whether the walker installs and runs
    // its rejection handler, with a separate fallback solely to keep RED safe.
    Object.defineProperty(rejected, 'then', {
      value(
        onFulfilled: (value: unknown) => unknown,
        onRejected: (error: unknown) => unknown,
      ) {
        return Promise.prototype.then.call(
          rejected,
          onFulfilled,
          (error: unknown) => {
            observed.push(error);
            return onRejected(error);
          },
        );
      },
    });
    const malformed = { [Symbol.iterator]: () => rejected };
    const source = {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () =>
        location === 'roots'
          ? malformed
          : [
              {
                kind: 'inlineResolution' as const,
                vertexId: 'A',
                resolutionIfNotPreviouslyAdmitted: {
                  kind: 'found',
                  vertexData: 'A',
                },
              },
            ],
      enumerateOutgoingLinks: () => malformed,
    } as unknown as GraphWalkDiscoverySource<string, undefined, string>;
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: source,
    }).createIndependentRunnerFromCurrentOptions();
    let failure: unknown;
    try {
      runner.runUntilSuspendedOrTerminal();
    } catch (error) {
      failure = error;
    } finally {
      // Bypass the instrumented method: this fallback cannot satisfy observed.
      Promise.prototype.then.call(rejected, undefined, () => undefined);
    }
    expect(failure).toBeInstanceOf(TypeError);
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'failed',
      error: failure,
    });
    let repeated: unknown;
    try {
      runner.runUntilSuspendedOrTerminal();
    } catch (error) {
      repeated = error;
    }
    expect(repeated).toBe(failure);
    await Promise.resolve();
    expect(observed).toEqual([rejection]);
  },
);
