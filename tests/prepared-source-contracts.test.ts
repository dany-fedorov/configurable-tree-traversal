import {
  prepareDag,
  prepareDagAsync,
} from '../src/traversals/dag-traversal/prepareDag';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';

type G = VertexTypes<string, string>;

for (const prepare of [prepareDag, prepareDagAsync]) {
  test(`${prepare.name} preserves non-enumerable own undefined identity`, async () => {
    const vertex = Object.defineProperty(
      { vertexContent: { $data: 'task', $childHints: [] } },
      'vertexId',
      { value: undefined },
    );
    const result = await prepare<G, unknown>({
      traversableGraph: {
        resolveRoot: () => ({ kind: 'found', vertex }),
        resolveChild: () => ({
          identity: null,
          satisfiesDependencies: true as const,
          kind: 'omitted',
        }),
      },
    });
    if (result.kind !== 'valid') throw new Error('Expected valid DAG');
    expect(
      result.dag.liveVertexSummaries.map((entry) => entry.vertexId),
    ).toEqual([undefined]);
    expect(
      result.dag
        .createRunner({ completedWork: new Set([undefined]) })
        .run()
        .summary().completedWorkIds,
    ).toEqual([undefined]);
  });

  test(`${prepare.name} rejects own non-enumerable priority without reading it`, async () => {
    const vertex = Object.defineProperty(
      { vertexId: 'task', vertexContent: { $data: 'task', $childHints: [] } },
      'priority',
      {
        get() {
          throw new Error('The engine checks presence, not priority value');
        },
      },
    );
    await expect(async () => {
      await prepare<G, string>({
        traversableGraph: {
          resolveRoot: () => ({ kind: 'found', vertex }),
          resolveChild: () => ({
            identity: null,
            satisfiesDependencies: true as const,
            kind: 'omitted',
          }),
        },
      });
    }).rejects.toThrow(/priority metadata is not supported/);
  });

  test.each(['vertexId', 'dependsOnWork', 'dependsOnSubgraphCompletion'])(
    `${prepare.name} preserves exact non-enumerable %s getter errors`,
    async (field) => {
      const error = { field };
      const vertex = Object.defineProperty(
        { vertexId: 'task', vertexContent: { $data: 'task', $childHints: [] } },
        field,
        {
          enumerable: false,
          get() {
            throw error;
          },
        },
      );
      await expect(async () => {
        await prepare<G, string>({
          traversableGraph: {
            resolveRoot: () => ({ kind: 'found', vertex }),
            resolveChild: () => ({
              identity: null,
              satisfiesDependencies: true as const,
              kind: 'omitted',
            }),
          },
        });
      }).rejects.toBe(error);
    },
  );

  test(`${prepare.name} preserves inherited content and both dependency kinds`, async () => {
    class Entry {
      constructor(readonly vertexId: string) {}
      get vertexContent() {
        return {
          $data: this.vertexId,
          $childHints: this.vertexId === 'root' ? ['a', 'b', 'c'] : [],
        };
      }
      get dependsOnWork() {
        return this.vertexId === 'b' ? ['a'] : [];
      }
      get dependsOnSubgraphCompletion() {
        return this.vertexId === 'c' ? ['b'] : [];
      }
    }
    const source: DagDiscoverySource<G, G, string> = {
      resolveRoot: () => ({ kind: 'found', vertex: new Entry('root') }),
      resolveChild: (id) => ({ kind: 'found', vertex: new Entry(id) }),
    };
    const result = await prepare<G, string>({ traversableGraph: source });
    if (result.kind !== 'valid') throw new Error('Expected valid DAG');
    expect(
      result.dag.liveVertexSummaries.map(
        ({ vertexId, dependsOnWork, dependsOnSubgraphCompletion }) => [
          vertexId,
          dependsOnWork,
          dependsOnSubgraphCompletion,
        ],
      ),
    ).toEqual([
      ['root', [], []],
      ['a', [], []],
      ['b', ['a'], []],
      ['c', [], ['b']],
    ]);
    expect(result.dag.createRunner().run().summary().completedWorkIds).toEqual([
      'root',
      'a',
      'b',
      'c',
    ]);
  });
}

for (const prepare of [prepareDag, prepareDagAsync]) {
  test.each([false, true])(
    `${prepare.name} ignores inherited hint identity without reading its getter (%s)`,
    async (throwingGetter) => {
      const prototype = throwingGetter
        ? {
            get vertexId(): string {
              throw new Error('Inherited hint identity must not be read');
            },
          }
        : { vertexId: 'wrong' };
      const inherited = Object.create(prototype) as { vertexId: string };
      const result = await prepare<G, string>({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found',
            vertex: {
              vertexId: 'root',
              vertexContent: { $data: 'root', $childHints: ['b'] },
            },
          }),
          getVertexIdFromHint: () => inherited,
          resolveChild: () => ({
            kind: 'found',
            vertex: {
              vertexId: 'b',
              vertexContent: { $data: 'b', $childHints: [] },
            },
          }),
        },
      });
      if (result.kind !== 'valid') throw new Error('Expected valid DAG');
      expect(
        result.dag.liveVertexSummaries.map(({ vertexId }) => vertexId),
      ).toEqual(['root', 'b']);
      expect(
        result.dag.createRunner().run().summary().completedWorkIds,
      ).toEqual(['root', 'b']);
    },
  );

  test.each([undefined, 'omitted'])(
    `${prepare.name} retains non-enumerable own hint identity %s for omitted work`,
    async (id) => {
      const wrapper = Object.defineProperty({}, 'vertexId', { value: id }) as {
        vertexId: typeof id;
      };
      const result = await prepare<G, unknown>({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found',
            vertex: {
              vertexId: 'root',
              vertexContent: { $data: 'root', $childHints: ['skip', 'b'] },
            },
          }),
          getVertexIdFromHint: (hint) =>
            hint === 'skip' ? wrapper : { vertexId: hint },
          resolveChild: (hint) =>
            hint === 'skip'
              ? { identity: null, kind: 'omitted', satisfiesDependencies: true }
              : {
                  kind: 'found',
                  vertex: {
                    vertexId: 'b',
                    dependsOnWork: [id],
                    vertexContent: { $data: 'b', $childHints: [] },
                  },
                },
        },
      });
      if (result.kind !== 'valid') throw new Error('Expected valid DAG');
      expect(
        result.dag.liveVertexSummaries.map(({ vertexId, dependsOnWork }) => [
          vertexId,
          dependsOnWork,
        ]),
      ).toEqual([
        ['root', []],
        ['b', [id]],
      ]);
      const runner = result.dag.createRunner({ completedWork: new Set([id]) });
      expect(runner.run().summary().completedWorkIds).toEqual(['root', 'b']);
    },
  );
}
