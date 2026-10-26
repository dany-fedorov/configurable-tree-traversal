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
  DepthFirstTraversal<T>,
  AsyncDepthFirstTraversal<T>,
  BreadthFirstTraversal<T>,
  AsyncBreadthFirstTraversal<T>,
  DagTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  describe(Constructor.name, () => {
    test.each([
      'vertexId',
      'dependsOn',
      'dependsOnComplete',
      'satisfiesDependencies',
    ])(
      'rejects own %s, including undefined, before tagged results discard it',
      async (field) => {
        for (const value of [undefined, true, false, []]) {
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
            { kind: 'omitted', [field]: value },
          ]) {
            for (const atRoot of [true, false]) {
              const source = {
                makeRoot: () => (atRoot ? result : { vertexContent: root }),
                makeVertex: () => result,
              } as TraversableTree<T>;
              const runner = new Constructor({
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
