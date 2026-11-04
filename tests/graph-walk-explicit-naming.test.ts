import { GraphWalkBuilder } from '../src/traversals/graph-walk/GraphWalk';

it('keeps first admitted omissions while observing parallel links through the explicit protocol', () => {
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: {
      vertexResolutionMode:
        'inlineResolutionOrPreviouslyAdmittedVertex' as const,
      enumerateRootTargets: () => [
        {
          kind: 'inlineResolution' as const,
          vertexId: 'root',
          resolutionIfNotPreviouslyAdmitted: {
            kind: 'found' as const,
            vertexData: 'root',
          },
        },
      ],
      enumerateOutgoingLinks: () => [
        {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution' as const,
            vertexId: 'omitted',
            resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' as const },
          },
          edgeData: 'first',
        },
        {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution' as const,
            vertexId: 'omitted',
            get resolutionIfNotPreviouslyAdmitted(): never {
              throw new Error('must retain first accepted omission');
            },
          },
          edgeData: 'second',
        },
      ],
    },
    deliveredEventKinds: ['admittedEdgeOccurrence'],
  }).createIndependentRunnerFromCurrentOptions();
  const events = [
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal(),
  ];
  expect(events).toMatchObject([
    {
      eventKind: 'admittedEdgeOccurrence',
      targetResolution: { kind: 'omitted' },
      targetHopDepth: 1,
      edge: { fromVertexId: 'root', toVertexId: 'omitted', edgeData: 'first' },
    },
    {
      eventKind: 'admittedEdgeOccurrence',
      targetResolution: { kind: 'omitted' },
      targetHopDepth: 1,
      edge: { edgeData: 'second' },
    },
  ]);
  expect(runner.captureProgressSnapshot()).toMatchObject({
    terminalOutcome: { kind: 'explorationExhausted' },
    counts: {
      resolvedFoundVertexIdCount: 1,
      resolvedOmittedVertexIdCount: 1,
      admittedRootOrLinkTargetOccurrences: 3,
    },
  });
});
