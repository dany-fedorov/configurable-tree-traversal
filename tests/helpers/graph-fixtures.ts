import type { VertexDataAndChildHintTypes } from '../../src/core/TreeTypeParameters';

export type TestGraph = VertexDataAndChildHintTypes<string, string>;
export type GraphFixture = Record<
  string,
  {
    children: string[];
    dependencies: string[];
  }
>;

export const diamond: GraphFixture = {
  root: { children: ['A', 'B', 'join'], dependencies: [] },
  A: { children: ['join'], dependencies: ['root'] },
  B: { children: ['join'], dependencies: ['root'] },
  join: { children: [], dependencies: ['A', 'B'] },
};

export function graphAdapter(nodes: GraphFixture = diamond) {
  function result(id: string) {
    const entry = nodes[id];
    if (entry === undefined) throw new Error(`Unknown fixture id: ${id}`);
    return {
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexId: id,
        workWaitsForWorkOf: entry.dependencies.slice(),
        vertexContentInput: {
          $vertexData: id,
          $childDiscoveryHints: entry.children.slice(),
        },
      },
    };
  }
  return { resolveRootVertex: () => result('root'), resolveChildVertexFromHint: result };
}

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function eventLoopTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
