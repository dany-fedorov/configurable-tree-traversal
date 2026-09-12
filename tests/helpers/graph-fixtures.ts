import type { TreeTypeParameters } from '../../src/core/TreeTypeParameters';

export type TestGraph = TreeTypeParameters<string, string>;

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
      vertexId: id,
      dependsOn: entry.dependencies.slice(),
      vertexContent: { $d: id, $c: entry.children.slice() },
    };
  }

  return { makeRoot: () => result('root'), makeVertex: result };
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
