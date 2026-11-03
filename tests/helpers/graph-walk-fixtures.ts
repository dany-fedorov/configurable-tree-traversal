import type { GraphWalkDiscoverySource } from '../../src';

export function idGraph(
  roots: readonly string[],
  adjacency: Iterable<readonly [string, readonly string[]]>,
): Extract<
  GraphWalkDiscoverySource<string, undefined, string>,
  { vertexResolutionMode: 'resolverWithOptionalInlineResolution' }
> {
  const byId = new Map(adjacency);
  return {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets: () => roots.map((vertexId) => ({ vertexId })),
    resolveVertexDataById(vertexId) {
      if (!byId.has(vertexId)) throw new TypeError('Unknown test ID');
      return { kind: 'found', vertexData: vertexId };
    },
    enumerateOutgoingLinks(vertex) {
      return byId.get(vertex.vertexId)!.map((to) => ({
        targetToResolveOnAdmission: { vertexId: to },
        edgeData: undefined,
      }));
    },
  };
}

type ContextData =
  | { kind: 'document'; title: string }
  | { kind: 'symbol'; name: string };
type Relation = { kind: 'imports' | 'references' | 'cites' | 'definedIn' };

export function contextFixture(): {
  source: GraphWalkDiscoverySource<ContextData, Relation, string>;
  calls: string[];
} {
  const calls: string[] = [];
  const data = new Map<string, ContextData>([
    ['A', { kind: 'document', title: 'A' }],
    ['B', { kind: 'symbol', name: 'B' }],
    ['C', { kind: 'document', title: 'C' }],
    ['D', { kind: 'document', title: 'D' }],
    ['E', { kind: 'symbol', name: 'E' }],
  ]);
  const links = new Map<string, readonly [string, Relation['kind']][]>([
    [
      'A',
      [
        ['B', 'imports'],
        ['B', 'references'],
        ['C', 'cites'],
      ],
    ],
    ['B', [['D', 'definedIn']]],
    ['C', [['D', 'cites']]],
    ['D', [['A', 'cites']]],
    ['E', []],
  ]);
  const source: GraphWalkDiscoverySource<ContextData, Relation, string> = {
    vertexResolutionMode: 'resolverWithOptionalInlineResolution' as const,
    enumerateRootTargets() {
      calls.push('roots');
      return [{ vertexId: 'A' }, { vertexId: 'E' }];
    },
    resolveVertexDataById(vertexId) {
      calls.push(`resolve:${vertexId}`);
      if (!data.has(vertexId)) throw new TypeError('Unknown context ID');
      return { kind: 'found', vertexData: data.get(vertexId)! };
    },
    enumerateOutgoingLinks(vertex) {
      calls.push(`outgoing:${vertex.vertexId}`);
      return (function* () {
        let index = 0;
        for (const [to, kind] of links.get(vertex.vertexId)!) {
          calls.push(`link:${vertex.vertexId}:${index++}`);
          yield {
            targetToResolveOnAdmission: { vertexId: to },
            edgeData: { kind },
          };
        }
      })();
    },
  };
  return { source, calls };
}
