import {
  DepthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
  AsyncBreadthFirstTreeTraversal,
  DagTraversal,
  AsyncDagTraversal,
  type TreeSource,
  type VertexTypes,
} from '../src';

type T = VertexTypes<string, string>;
const content = { $data: 'root', $childHints: [] };
const root = { $data: 'root', $childHints: ['child'] };
for (const Constructor of [
  DepthFirstTreeTraversal<T>,
  AsyncDepthFirstTreeTraversal<T>,
  BreadthFirstTreeTraversal<T>,
  AsyncBreadthFirstTreeTraversal<T>,
  DagTraversal<T>,
  AsyncDagTraversal<T>,
]) {
  describe(Constructor.name, () => {
    test.each([
      'vertexId',
      'dependsOnWork',
      'dependsOnSubgraphCompletion',
      'satisfiesDependencies',
    ])(
      'rejects own %s, including undefined, before tagged results discard it',
      async (field) => {
        for (const value of [undefined, true, false, []]) {
          for (const result of [
            { kind: 'omitted' as const, [field]: value },
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
                resolveRoot: () =>
                  atRoot
                    ? result
                    : {
                        kind: 'found' as const,
                        vertex: { vertexContent: root },
                      },
                resolveChild: () => result,
              } as TreeSource<T>;
              const runner = new Constructor({
                traversableTree: source,
              }).createRunner();
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
