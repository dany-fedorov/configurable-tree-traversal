import type { GraphWalkSource } from '../../src';

export function idGraph(
  roots: readonly string[],
  adjacency: Iterable<readonly [string, readonly string[]]>,
): Extract<
  GraphWalkSource<string, undefined, string>,
  { hydration: 'resolver' }
> {
  const byId = new Map(adjacency);
  return {
    hydration: 'resolver' as const,
    roots: () => roots.map((vertexId) => ({ vertexId })),
    resolveVertex(vertexId) {
      if (!byId.has(vertexId)) throw new TypeError('Unknown test ID');
      return { kind: 'found', data: vertexId };
    },
    outgoing(vertex) {
      return byId.get(vertex.vertexId)!.map((to) => ({
        target: { vertexId: to },
        data: undefined,
      }));
    },
  };
}

type ContextData =
  | { kind: 'document'; title: string }
  | { kind: 'symbol'; name: string };
type Relation = { kind: 'imports' | 'references' | 'cites' | 'definedIn' };

export function contextFixture(): {
  source: GraphWalkSource<ContextData, Relation, string>;
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
  const source: GraphWalkSource<ContextData, Relation, string> = {
    hydration: 'resolver' as const,
    roots() {
      calls.push('roots');
      return [{ vertexId: 'A' }, { vertexId: 'E' }];
    },
    resolveVertex(vertexId) {
      calls.push(`resolve:${vertexId}`);
      if (!data.has(vertexId)) throw new TypeError('Unknown context ID');
      return { kind: 'found', data: data.get(vertexId)! };
    },
    outgoing(vertex) {
      calls.push(`outgoing:${vertex.vertexId}`);
      return (function* () {
        let index = 0;
        for (const [to, kind] of links.get(vertex.vertexId)!) {
          calls.push(`link:${vertex.vertexId}:${index++}`);
          yield { target: { vertexId: to }, data: { kind } };
        }
      })();
    },
  };
  return { source, calls };
}
