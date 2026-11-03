import {
  GraphWalkBuilder,
  GraphWalkObservationKind as Phase,
  TraversalRunnerStatus as Status,
} from '../src';
import type { GraphWalkDiscoverySource, GraphWalkBuilderOptions } from '../src';
import { contextFixture, idGraph } from './helpers/graph-walk-fixtures';

it('filters before inline hydration and target lookup, keeping link indices', () => {
  const { source, calls } = contextFixture();
  const followed: string[] = [];
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    shouldAdmitOutgoingLinkTarget(edge, context) {
      expect(context.routeEnumerationPolicy).toBe(
        'firstAdmittedFoundRoutePerVertex',
      );
      expect(context.fromVertex.vertexId).toBe(edge.fromVertexId);
      expect(context.targetHopDepth).toBeGreaterThan(0);
      followed.push(
        `${edge.fromVertexId}:${edge.sourceOutgoingLinkIndexBeforeFiltering}`,
      );
      return edge.toVertexId !== 'B';
    },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal({ deliveredEventKinds: [] });
  expect(calls).not.toContain('resolve:B');
  expect(followed).toEqual(['A:0', 'A:1', 'A:2', 'C:0', 'D:0']);
  expect(runner.captureProgressSnapshot().counts).toMatchObject({
    admittedRootOrLinkTargetOccurrences: 5,
    freshSourceOutgoingLinkCount: 5,
    resolvedFoundVertexIdCount: 4,
    acknowledgedObservationCountsByKind: {
      vertexOccurrence: 4,
      admittedEdgeOccurrence: 3,
      routePrefix: 4,
    },
  });
  const poison = {
    get kind() {
      throw new Error('Must not hydrate');
    },
  };
  const inline = new GraphWalkBuilder({
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
      enumerateOutgoingLinks: () => [
        {
          targetToResolveOnAdmission: {
            kind: 'inlineResolution' as const,
            vertexId: 'B',
            resolutionIfNotPreviouslyAdmitted: poison,
          },
          edgeData: undefined,
        },
      ],
    } as unknown as GraphWalkDiscoverySource<string, undefined, string>,
    shouldAdmitOutgoingLinkTarget: () => false,
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  expect(inline.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
});

it('emits pruned occurrences before expansion and retains the first pruning decision', () => {
  const { source, calls } = contextFixture();
  const expanded: string[] = [];
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    shouldExpandVertexOccurrence(vertex, context) {
      expanded.push(vertex.vertexId);
      expect(context.routeEnumerationPolicy).toBe(
        'firstAdmittedFoundRoutePerVertex',
      );
      expect(
        context.incomingEdgeFromParentRouteOccurrence === null
          ? context.vertexHopDepth === 0
          : context.incomingEdgeFromParentRouteOccurrence.toVertexId ===
              vertex.vertexId,
      ).toBe(true);
      return vertex.vertexId !== 'B';
    },
  }).createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.VERTEX_OCCURRENCE],
    });
  expect(iterator.next().value).toMatchObject({ vertex: { vertexId: 'A' } });
  expect(expanded).toEqual([]);
  expect([...iterator].map((e) => e.vertex.vertexId)).toEqual([
    'E',
    'B',
    'C',
    'D',
  ]);
  expect(expanded).toEqual(['A', 'E', 'B', 'C', 'D']);
  expect(calls).not.toContain('outgoing:B');
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
});

it.each([
  'shouldAdmitOutgoingLinkTarget',
  'shouldExpandVertexOccurrence',
] as const)('%s rejects nonbooleans and synchronous thenables', (key) => {
  for (const result of [undefined, null, 1, 'yes', {}, Promise.resolve(true)]) {
    const options = {
      graphWalkDiscoverySource: idGraph(['A'], [['A', ['A']]]),
      [key]: () => result,
    } as unknown as GraphWalkBuilderOptions<string, undefined, string>;
    const runner = new GraphWalkBuilder(
      options,
    ).createIndependentRunnerFromCurrentOptions();
    expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(TypeError);
    expect(runner.getTraversalLifecycleStatus()).toBe(Status.FAILED);
    const terminalOutcome = runner.captureProgressSnapshot().terminalOutcome;
    expect(terminalOutcome).toMatchObject({ kind: 'failed' });
    if (terminalOutcome?.kind !== 'failed') throw new Error('Expected failure');
    expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
      terminalOutcome.error as Error,
    );
  }
});

it.each([
  'shouldAdmitOutgoingLinkTarget',
  'shouldExpandVertexOccurrence',
] as const)('%s retains arbitrary thrown values', (key) => {
  for (const error of [undefined, null, Symbol('error')]) {
    const runner = new GraphWalkBuilder({
      graphWalkDiscoverySource: idGraph(['A'], [['A', ['A']]]),
      [key]: () => {
        throw error;
      },
    }).createIndependentRunnerFromCurrentOptions();
    for (let index = 0; index < 2; index++) {
      let caught = false;
      try {
        runner.runUntilSuspendedOrTerminal();
      } catch (value) {
        caught = true;
        expect(value).toBe(error);
      }
      expect(caught).toBe(true);
    }
    expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
      kind: 'failed',
      error,
    });
  }
});

it('detaches predicate wrappers from subsequent observations and expansion', () => {
  const source = idGraph(
    ['A'],
    [
      ['A', ['B']],
      ['B', []],
    ],
  );
  const runner = new GraphWalkBuilder({
    graphWalkDiscoverySource: source,
    shouldAdmitOutgoingLinkTarget(edge, context) {
      (edge as { toVertexId: string }).toVertexId = 'bad';
      (context.fromVertex as { vertexId: string }).vertexId = 'bad';
      return true;
    },
    shouldExpandVertexOccurrence(vertex, context) {
      (vertex as { vertexId: string }).vertexId = 'bad';
      if (context.incomingEdgeFromParentRouteOccurrence !== null)
        (
          context.incomingEdgeFromParentRouteOccurrence as {
            toVertexId: string;
          }
        ).toVertexId = 'bad';
      return true;
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect([
    ...runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
      deliveredEventKinds: [Phase.ADMITTED_EDGE_OCCURRENCE],
    }),
  ]).toMatchObject([
    {
      edge: { fromVertexId: 'A', toVertexId: 'B' },
      fromVertex: { vertexId: 'A' },
      targetResolution: { vertex: { vertexId: 'B' } },
    },
  ]);
  expect(runner.captureProgressSnapshot().terminalOutcome).toEqual({
    kind: 'sourceRoutesExhausted',
  });
});
