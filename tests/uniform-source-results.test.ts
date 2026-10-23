import {
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  DagTraversal,
  DepthFirstTraversal,
} from '../src';
import type { AsyncTraversableTree, TreeTypeParameters } from '../src';

type T = TreeTypeParameters<string, string>;

for (const Constructor of [
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  DagTraversal,
  AsyncDagTraversal,
]) {
  test(`${Constructor.name} accepts canonical found/omitted tree results in structural order`, async () => {
    const source = {
      makeRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexContent: { $data: 'root', $childHints: ['a', 'omit', 'b'] },
        },
      }),
      makeVertex: (hint: string) =>
        hint === 'omit'
          ? { kind: 'omitted' as const, satisfiesDependencies: true as const }
          : {
              kind: 'found' as const,
              vertex: { vertexContent: { $data: hint, $childHints: [] } },
            },
    };
    const runner = new Constructor<T>({ traversableTree: source }).makeRunner();
    const seen: string[] = [];
    for await (const event of runner.getIterable()) {
      if (event !== null) seen.push(event.vertex.getData());
    }
    expect(seen.filter((data, index) => seen.indexOf(data) === index)).toEqual([
      'root',
      'a',
      'b',
    ]);
  });

  test(`${Constructor.name} accepts an anonymous canonical omitted tree root`, async () => {
    const runner = new Constructor<T>({
      traversableTree: {
        makeRoot: () => ({ kind: 'omitted', satisfiesDependencies: true }),
        makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).makeRunner();
    await runner.run();
    const seen: unknown[] = [];
    for await (const event of runner.getIterable()) seen.push(event);
    expect(seen).toEqual([]);
  });
}

for (const Constructor of [
  AsyncDepthFirstTraversal,
  AsyncBreadthFirstTraversal,
  AsyncDagTraversal,
]) {
  test(`${Constructor.name} normalizes promised canonical tree results`, async () => {
    const source: AsyncTraversableTree<T> = {
      makeRoot: async () => ({
        kind: 'found',
        vertex: { vertexContent: { $data: 'root', $childHints: ['child'] } },
      }),
      makeVertex: async () => ({
        kind: 'found',
        vertex: { vertexContent: { $data: 'child', $childHints: [] } },
      }),
    };
    const runner = new Constructor<T>({ traversableTree: source }).makeRunner();
    const seen: string[] = [];
    for await (const event of runner.getIterable()) {
      if (event !== null) seen.push(event.vertex.getData());
    }
    expect(seen.filter((data, index) => seen.indexOf(data) === index)).toEqual([
      'root',
      'child',
    ]);
  });
}
