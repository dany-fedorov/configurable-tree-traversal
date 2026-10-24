import {
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  DagTraversal,
  AsyncDagTraversal,
  type TraversableTree,
  type TreeTypeParameters,
} from '../src';

type T = TreeTypeParameters<string, string>;
const content = { $data: 'root', $childHints: [] };
const root = { $data: 'root', $childHints: ['child'] };
for (const Constructor of [
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
  DagTraversal,
  AsyncDagTraversal,
]) {
  describe(Constructor.name, () => {
    test.each(['vertexId', 'dependsOn', 'dependsOnComplete'])(
      'rejects own %s, including undefined, before tagged results discard it',
      async (field) => {
        for (const value of [undefined, []]) {
          for (const result of [
            { vertexContent: null, [field]: value },
            {
              kind: 'found',
              vertex: { vertexContent: content, [field]: value },
            },
            {
              kind: 'found',
              vertex: { vertexContent: content },
              [field]: value,
            },
            { kind: 'omitted', satisfiesDependencies: true, [field]: value },
          ]) {
            for (const atRoot of [true, false]) {
              const source = {
                makeRoot: () => (atRoot ? result : { vertexContent: root }),
                makeVertex: () => result,
              } as TraversableTree<T>;
              const runner = new Constructor<T>({
                traversableTree: source,
              }).makeRunner();
              await expect(async () => {
                await runner.run();
              }).rejects.toThrow(/graph metadata/i);
            }
          }
        }
      },
    );
  });
}
