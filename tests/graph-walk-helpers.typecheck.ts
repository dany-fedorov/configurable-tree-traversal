import {
  createAndRunGraphWalkUntilSuspendedOrTerminal,
  createAndRunGraphWalkUntilSuspendedOrTerminalAsync,
  graphWalk,
  GraphWalkObservationKind as Phase,
  type GraphWalkDiscoverySource,
  type GraphWalkRunner,
  type AsyncGraphWalkRunner,
} from '../src';
import {
  createAndRunGraphWalkUntilSuspendedOrTerminal as familyWalk,
  createAndRunGraphWalkUntilSuspendedOrTerminalAsync as familyWalkAsync,
} from '../src/traversals/graph-walk';

const id = Symbol('id');
type Data = { title: string };
type Edge = { kind: 'cites' };
const source: GraphWalkDiscoverySource<Data, Edge, typeof id> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  enumerateRootTargets: () => [
    {
      kind: 'inlineResolution' as const,
      vertexId: id,
      resolutionIfNotPreviouslyAdmitted: {
        kind: 'found',
        vertexData: { title: 'root' },
      },
    },
  ],
  enumerateOutgoingLinks: (vertex) => [
    {
      targetToResolveOnAdmission: {
        kind: 'previouslyAdmittedVertex' as const,
        vertexId: vertex.vertexId,
      },
      edgeData: { kind: 'cites' },
    },
  ],
};
const runner = createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    [Phase.ADMITTED_EDGE_OCCURRENCE]: (event) => {
      const relation: Edge = event.edge.edgeData;
      const target: typeof id = event.edge.toVertexId;
      const data: Data = event.fromVertex.vertexData;
      void [relation, target, data];
    },
  },
});
const typed: GraphWalkRunner<Data, Edge, typeof id> = runner;
const promised: Promise<AsyncGraphWalkRunner<Data, Edge, typeof id>> =
  createAndRunGraphWalkUntilSuspendedOrTerminalAsync({
    graphWalkDiscoverySource: source,
    visitorsByObservationKind: {
      [Phase.VERTEX_OCCURRENCE]: async (event) => {
        const data: Data = event.vertex.vertexData;
        const vertexId: typeof id = event.vertex.vertexId;
        void [data, vertexId];
      },
    },
  });
const family: typeof createAndRunGraphWalkUntilSuspendedOrTerminal = familyWalk;
const asyncFamily: typeof createAndRunGraphWalkUntilSuspendedOrTerminalAsync =
  familyWalkAsync;
const namespace: typeof createAndRunGraphWalkUntilSuspendedOrTerminal =
  graphWalk.createAndRunGraphWalkUntilSuspendedOrTerminal;
// @ts-expect-error Only canonical options are accepted.
createAndRunGraphWalkUntilSuspendedOrTerminal(source, {});
// @ts-expect-error Async helper also accepts only canonical options.
createAndRunGraphWalkUntilSuspendedOrTerminalAsync(source, null);
// @ts-expect-error Helper inference retains required route bounds.
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  routeEnumerationPolicy: 'allRoutePrefixesAllowingRepeatedVertices',
});
createAndRunGraphWalkUntilSuspendedOrTerminal({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: {
    // @ts-expect-error Sync helper does not widen callback return contracts.
    [Phase.ADMITTED_EDGE_OCCURRENCE]: async () => undefined,
  },
});
void [typed, promised, family, asyncFamily, namespace];
