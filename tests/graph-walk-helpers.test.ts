import {
  graphWalk,
  GraphWalkObservationKind as Phase,
  TraversalRunnerStatus as Status,
  TraversalVisitorCommandName as Command,
  createAndRunGraphWalkUntilSuspendedOrTerminal,
  createAndRunGraphWalkUntilSuspendedOrTerminalAsync,
} from '../src';
import {
  createAndRunGraphWalkUntilSuspendedOrTerminal as familyWalk,
  createAndRunGraphWalkUntilSuspendedOrTerminalAsync as familyWalkAsync,
} from '../src/traversals/graph-walk';
import { InternalAsyncGraphWalkRunner as AsyncGraphWalkRunner } from '../src/traversals/graph-walk/AsyncGraphWalkRunner';
import { InternalGraphWalkRunner as GraphWalkRunner } from '../src/traversals/graph-walk/GraphWalkRunner';
import { idGraph } from './helpers/graph-walk-fixtures';

it('runs canonical phase-keyed visitors and returns independent sync runners', () => {
  const source = idGraph(
    ['A'],
    [
      ['A', ['B']],
      ['B', []],
    ],
  );
  const seen: string[] = [];
  const runner = createAndRunGraphWalkUntilSuspendedOrTerminal({
    graphWalkDiscoverySource: source,
    deliveredEventKinds: [],
    visitorsByObservationKind: {
      [Phase.VERTEX_OCCURRENCE]: (event) => {
        seen.push(`v:${event.vertex.vertexData}`);
      },
      [Phase.ADMITTED_EDGE_OCCURRENCE]: (event) => {
        seen.push(`e:${event.edge.toVertexId}`);
      },
    },
  });
  expect(runner).toBeInstanceOf(GraphWalkRunner);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  expect(seen).toEqual(['v:A', 'e:B', 'v:B']);
  expect(
    runner.captureProgressSnapshot().counts.resolvedFoundVertexIdCount,
  ).toBe(2);
  expect(
    createAndRunGraphWalkUntilSuspendedOrTerminal({
      graphWalkDiscoverySource: source,
    }),
  ).not.toBe(runner);
  expect(familyWalk).toBe(createAndRunGraphWalkUntilSuspendedOrTerminal);
  expect(graphWalk.createAndRunGraphWalkUntilSuspendedOrTerminal).toBe(
    createAndRunGraphWalkUntilSuspendedOrTerminal,
  );
});

it('awaits async visitors and returns the completed async runner', async () => {
  const seen: string[] = [];
  const runner = await createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
    graphWalkDiscoverySource: idGraph(
      ['A'],
      [
        ['A', ['B']],
        ['B', []],
      ],
    ),
    routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
    limits: { maxRouteHopDepth: 1 },
    deliveredEventKinds: [],
    visitorsByObservationKind: {
      [Phase.VERTEX_OCCURRENCE]: async (event) => {
        seen.push(`v:${event.vertex.vertexData}`);
      },
      [Phase.ADMITTED_EDGE_OCCURRENCE]: async (event) => {
        seen.push(`e:${event.edge.toVertexId}`);
      },
      [Phase.ROUTE_PREFIX]: async (event) => {
        seen.push(`p:${event.routeHopLength}`);
      },
    },
  });
  expect(runner).toBeInstanceOf(AsyncGraphWalkRunner);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
  expect(seen).toEqual(['v:A', 'p:0', 'e:B', 'v:B', 'p:1']);
  expect(familyWalkAsync).toBe(
    createAndRunGraphWalkUntilSuspendedOrTerminalAsync,
  );
  expect(graphWalk.createAndRunGraphWalkUntilSuspendedOrTerminalAsync).toBe(
    createAndRunGraphWalkUntilSuspendedOrTerminalAsync,
  );
});

it('returns a halted sync runner that resumes after the admitted callback', () => {
  const seen: string[] = [];
  const runner = createAndRunGraphWalkUntilSuspendedOrTerminal({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    visitorsByObservationKind: {
      [Phase.VERTEX_OCCURRENCE]: [
        () => {
          seen.push('halt');
          return {
            commands: [
              {
                commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
              },
            ],
          };
        },
        () => {
          seen.push('tail');
        },
      ],
    },
  });
  expect(runner.getTraversalStopReason()).toBe('paused');
  expect(seen).toEqual(['halt']);
  expect(runner.runUntilSuspendedOrTerminal()).toBe(runner);
  expect(seen).toEqual(['halt', 'tail']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

it('returns a halted async runner that resumes after the admitted callback', async () => {
  const seen: string[] = [];
  const runner = await createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
    graphWalkDiscoverySource: idGraph(['A'], [['A', []]]),
    visitorsByObservationKind: {
      [Phase.VERTEX_OCCURRENCE]: [
        async () => {
          seen.push('halt');
          return {
            commands: [
              {
                commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
              },
            ],
          };
        },
        async () => {
          seen.push('tail');
        },
      ],
    },
  });
  expect(runner.getTraversalStopReason()).toBe('paused');
  expect(seen).toEqual(['halt']);
  expect(await runner.runUntilSuspendedOrTerminal()).toBe(runner);
  expect(seen).toEqual(['halt', 'tail']);
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.FINISHED);
});

it.each([null, undefined, { error: 'opaque' }])(
  'retains exact thrown and rejected values: %p',
  async (error) => {
    const source = idGraph(['A'], [['A', []]]);
    const throws = () => {
      throw error;
    };
    const unreadable = {
      vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
      resolveVertexDataById: source.resolveVertexDataById,
      get enumerateRootTargets(): typeof source.enumerateRootTargets {
        throw error;
      },
      enumerateOutgoingLinks: source.enumerateOutgoingLinks,
    };
    try {
      createAndRunGraphWalkUntilSuspendedOrTerminal({
        graphWalkDiscoverySource: unreadable,
      });
      throw new Error('Expected constructor failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    await expect(
      createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
        graphWalkDiscoverySource: unreadable,
      }),
    ).rejects.toBe(error);
    try {
      createAndRunGraphWalkUntilSuspendedOrTerminal({
        graphWalkDiscoverySource: { ...source, enumerateRootTargets: throws },
      });
      throw new Error('Expected sync source failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    try {
      createAndRunGraphWalkUntilSuspendedOrTerminal({
        graphWalkDiscoverySource: source,
        visitorsByObservationKind: { [Phase.VERTEX_OCCURRENCE]: throws },
      });
      throw new Error('Expected sync visitor failure');
    } catch (caught) {
      expect(caught).toBe(error);
    }
    await expect(
      createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
        graphWalkDiscoverySource: {
          ...source,
          enumerateRootTargets: async () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
    await expect(
      createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
        graphWalkDiscoverySource: source,
        visitorsByObservationKind: {
          [Phase.VERTEX_OCCURRENCE]: async () => {
            throw error;
          },
        },
      }),
    ).rejects.toBe(error);
  },
);
