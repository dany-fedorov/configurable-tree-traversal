import {
  AsyncGraphWalkBuilder,
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
} from '../src';

it.each([
  {},
  { vertexResolutionMode: 'resolverWithOptionalInlineResolution' },
  {
    vertexResolutionMode: 'unknown',
    resolveVertexDataById: () => ({ kind: 'omitted' }),
  },
  {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
    resolveVertexDataById: () => ({ kind: 'omitted' }),
  },
])('rejects invalid hydration declarations before discovery %#', (mode) => {
  const roots = jest.fn(() => []);
  const source = {
    rootVertexIds: roots,
    enumerateOutgoingLinks: () => [],
    ...mode,
  } as any;
  expect(
    () => new GraphWalkBuilder({ graphWalkDiscoverySource: source }),
  ).toThrow(TypeError);
  expect(
    () => new AsyncGraphWalkBuilder({ graphWalkDiscoverySource: source }),
  ).toThrow(TypeError);
  expect(roots).not.toHaveBeenCalled();
});

it.each(['sync', 'async'] as const)(
  'admits cached self/backedges and first inline omissions (%s)',
  async (execution) => {
    const root = {};
    const omitted = Symbol('omitted');
    const source = {
      vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
      enumerateRootTargets: () => [
        {
          kind: 'inlineResolution',
          vertexId: root,
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found',
            vertexData: 'root',
          },
        },
      ],
      enumerateOutgoingLinks: () => [
        {
          targetToResolveOnAdmission: {
            kind: 'previouslyAdmittedVertex',
            vertexId: root,
          },
          edgeData: 'self',
        },
        {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution',
            vertexId: omitted,
            resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' },
          },
          edgeData: 'omit',
        },
        {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution',
            vertexId: omitted,
            get resolutionIfNotPreviouslyAdmitted() {
              throw new Error('must keep first');
            },
          },
          edgeData: 'again',
        },
        {
          targetToResolveOnAdmission: {
            kind: 'previouslyAdmittedVertex',
            vertexId: omitted,
          },
          edgeData: 'cached omission',
        },
      ],
    } as any;
    const runner =
      execution === 'sync'
        ? new GraphWalkBuilder({
            graphWalkDiscoverySource: source,
          }).createIndependentRunnerFromCurrentOptions()
        : new AsyncGraphWalkBuilder({
            graphWalkDiscoverySource: source,
          }).createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
      },
    ))
      events.push(event);
    expect(
      events.map((event) =>
        event.eventKind === 'admittedEdgeOccurrence'
          ? event.targetResolution.kind
          : event.eventKind,
      ),
    ).toEqual(['found', 'omitted', 'omitted', 'omitted']);
    expect(runner.captureProgressSnapshot().counts).toMatchObject({
      resolvedFoundVertexIdCount: 1,
      resolvedOmittedVertexIdCount: 1,
    });
  },
);

it.each(['sync', 'async'] as const)(
  'rejects first-use cached targets at admission and ignores rejected inline links (%s)',
  async (execution) => {
    const source = {
      vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
      enumerateRootTargets: () => [
        {
          kind: 'inlineResolution',
          vertexId: 'a',
          resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'a' },
        },
      ],
      enumerateOutgoingLinks: () => [
        {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution',
            vertexId: 'b',
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found',
              vertexData: 'rejected',
            },
          },
          edgeData: 'reject',
        },
        {
          targetToResolveOnAdmission: {
            kind: 'previouslyAdmittedVertex',
            vertexId: 'b',
          },
          edgeData: 'accept',
        },
      ],
    } as any;
    const options = {
      graphWalkDiscoverySource: source,
      shouldAdmitOutgoingLinkTarget: (edge: { edgeData: unknown }) =>
        edge.edgeData !== 'reject',
    };
    const runner =
      execution === 'sync'
        ? new GraphWalkBuilder(
            options,
          ).createIndependentRunnerFromCurrentOptions()
        : new AsyncGraphWalkBuilder(
            options,
          ).createIndependentRunnerFromCurrentOptions();
    await expect(
      (async () => {
        for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
          void event;
      })(),
    ).rejects.toThrow('Cached walking target has no admitted resolution');
    expect(
      runner.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
    ).toBe(1);
  },
);

it('awaits async resolver roots and links without eagerly resolving inline targets', async () => {
  const resolveVertexDataById = jest.fn(async (vertexId: string) => ({
    kind: 'found',
    vertexData: vertexId,
  }));
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution',
      enumerateRootTargets: async () =>
        (async function* () {
          yield {
            vertexId: 'a',
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found',
              vertexData: 'inlineResolution',
            },
          };
        })(),
      resolveVertexDataById,
      enumerateOutgoingLinks: async (vertex: { vertexId: string }) =>
        (async function* () {
          if (vertex.vertexId === 'a')
            yield {
              targetToResolveOnAdmission: { vertexId: 'b' },
              edgeData: null,
            };
        })(),
    } as any,
  }).createIndependentRunnerFromCurrentOptions();
  expect(resolveVertexDataById).not.toHaveBeenCalled();
  await runner.runUntilSuspendedOrTerminal();
  expect(resolveVertexDataById).toHaveBeenCalledTimes(1);
  expect(resolveVertexDataById).toHaveBeenCalledWith('b');
});

it.each(['sync', 'async'] as const)(
  'validates inlineOrCached target tags without accepting legacy targets (%s)',
  async (execution) => {
    for (const target of [
      { vertexId: 'a' },
      { kind: 'other', vertexId: 'a' },
      { kind: 'inlineResolution', vertexId: 'a' },
    ]) {
      const source = {
        vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
        enumerateRootTargets: () => [target],
        enumerateOutgoingLinks: () => [],
      } as any;
      const runner =
        execution === 'sync'
          ? new GraphWalkBuilder({
              graphWalkDiscoverySource: source,
            }).createIndependentRunnerFromCurrentOptions()
          : new AsyncGraphWalkBuilder({
              graphWalkDiscoverySource: source,
            }).createIndependentRunnerFromCurrentOptions();
      await expect(
        (async () => {
          for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
            void event;
        })(),
      ).rejects.toThrow(TypeError);
    }
  },
);

it('awaits promised async iterables in inlineOrCached mode and retains backedges', async () => {
  const source = {
    vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
    enumerateRootTargets: async () =>
      (async function* () {
        yield {
          kind: 'inlineResolution' as const,
          vertexId: 'a',
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found' as const,
            vertexData: 'first',
          },
        };
      })(),
    enumerateOutgoingLinks: async (vertex: { vertexId: string }) =>
      (async function* () {
        if (vertex.vertexId === 'a')
          yield {
            targetToResolveOnAdmission: {
              kind: 'inlineResolution' as const,
              vertexId: 'b',
              resolutionIfNotPreviouslyAdmitted: {
                kind: 'found' as const,
                vertexData: 'second',
              },
            },
            edgeData: 'forward',
          };
        else
          yield {
            targetToResolveOnAdmission: {
              kind: 'previouslyAdmittedVertex' as const,
              vertexId: 'a',
            },
            edgeData: 'back',
          };
      })(),
  };
  const runner = new AsyncGraphWalkBuilder({
    graphWalkDiscoverySource: source,
  }).createIndependentRunnerFromCurrentOptions();
  const events = [];
  for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(
    {
      deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
    },
  ))
    events.push(event);
  expect(
    events.map((event) => [event.edge.fromVertexId, event.edge.toVertexId]),
  ).toEqual([
    ['a', 'b'],
    ['b', 'a'],
  ]);
  expect(
    runner.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  ).toBe(2);
});

it.each(['sync', 'async'] as const)(
  'treats captured undefined resolver fields and getters as no resolver (%s)',
  async (execution) => {
    for (const accessor of [false, true]) {
      let reads = 0;
      const source = {
        vertexResolutionMode:
          'inlineResolutionOrPreviouslyAdmittedVertex' as const,
        enumerateRootTargets: () => [
          {
            kind: 'inlineResolution' as const,
            vertexId: 'a',
            resolutionIfNotPreviouslyAdmitted: {
              kind: 'found' as const,
              vertexData: 'a',
            },
          },
        ],
        enumerateOutgoingLinks: () => [
          {
            targetToResolveOnAdmission: {
              kind: 'previouslyAdmittedVertex' as const,
              vertexId: 'a',
            },
            edgeData: null,
          },
        ],
        resolveVertexDataById: undefined,
      };
      if (accessor) {
        Object.defineProperty(source, 'resolveVertexDataById', {
          get() {
            reads++;
            return undefined;
          },
        });
      }
      const factory =
        execution === 'sync'
          ? new GraphWalkBuilder({ graphWalkDiscoverySource: source })
          : new AsyncGraphWalkBuilder({ graphWalkDiscoverySource: source });
      const runner = factory.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      expect(reads).toBe(accessor ? 1 : 0);
      expect(
        runner.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
      ).toBe(1);
    }
  },
);
