import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversalOrder as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import type { MakeVertexResult } from '../src/core/TraversableTree';

type G = TreeTypeParameters<string, string>;

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const discovery of ['lazy', 'eager'] as const) {
    test(`${Constructor.name} ${discovery} resolves transitive dependencies as detached components`, async () => {
      const calls: unknown[] = [];
      const events: string[] = [];
      const source = {
        makeRoot: () => ({
          vertexId: 'app',
          dependsOn: ['parser'],
          vertexContent: { $d: 'app', $c: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite(id: unknown): MakeVertexResult<G> {
          expect(this).toBe(source);
          calls.push(id);
          return {
            dependsOn: id === 'parser' ? ['lexer'] : [],
            vertexContent: { $d: String(id), $c: [] },
          };
        },
      };
      const traversal = new Constructor<G>({
        traversableGraph: source,
        discovery,
        saveNotMutatedResolvedGraph: true,
      });
      traversal.addVisitorFor(Order.ON_READY, (v) => {
        events.push(v.getData());
      });
      const runner = traversal.makeRunner();
      expect(runner.summary().counts.discovered).toBe(0);
      expect(calls).toEqual([]);
      await runner.run();
      expect(calls).toEqual(['parser', 'lexer']);
      expect(events).toEqual(['lexer', 'parser', 'app']);
      const graph = runner.getResolvedGraph();
      const parser = graph.getVertexById('parser')!;
      expect(graph.getParentsOf(parser)).toEqual([]);
      expect(graph.getPathsTo(parser)).toEqual([[parser]]);
      expect(graph.get(parser)!.discoveryDepth).toBe(0);
      expect(graph.getIdOf(graph.getRoot()!)).toBe('app');
      expect(runner.summary().counts.subtreeCompleted).toBe(3);
    });
  }

  test.each([false, true])(
    `${Constructor.name} distinguishes missing from omitted (%s)`,
    async (omit) => {
      const calls: unknown[] = [];
      const source = {
        makeRoot: () => ({
          vertexId: 'app',
          dependsOn: ['external'],
          dependsOnComplete: ['external'],
          vertexContent: { $d: 'app', $c: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite: (id: unknown) => {
          calls.push(id);
          return omit ? { vertexContent: null } : undefined;
        },
      };
      const runner = new Constructor<G>({
        traversableGraph: source,
      }).makeRunner();
      if (omit) {
        await runner.run();
        expect(runner.summary().completedWorkIds).toEqual(['app']);
      } else {
        await expect(async () => {
          await runner.run();
        }).rejects.toMatchObject({
          name: 'DagTraversalStallError',
          diagnostics: { unknownPrerequisiteIds: ['external'] },
        });
        expect(
          runner.resolvedGraphsContainer.store.getIdState('external'),
        ).toBeUndefined();
      }
      expect(calls).toEqual(['external']);
    },
  );
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} coalesces raw IDs across both milestone lists and dependents`, async () => {
    const object = {};
    const fn = () => undefined;
    const ids = [undefined, null, NaN, +0, -0, object, fn, Symbol('id')];
    const calls: unknown[] = [];
    const source = {
      makeRoot: () => ({
        vertexId: 'root',
        vertexContent: { $d: 'root', $c: ['a', 'b'] },
      }),
      makeVertex: (id: string) => ({
        vertexId: id,
        dependsOn: ids,
        dependsOnComplete: ids,
        vertexContent: { $d: id, $c: [] },
      }),
      resolvePrerequisite: (id: unknown) => {
        calls.push(id);
        return { vertexId: id, vertexContent: { $d: 'external', $c: [] } };
      },
    };
    const runner = new Constructor<G>({
      traversableGraph: source,
    }).makeRunner();
    await runner.run();
    expect(calls).toEqual([undefined, null, NaN, 0, object, fn, ids[7]]);
    expect(runner.summary().counts.discovered).toBe(10);
  });

  test(`${Constructor.name} ordinary discovery satisfies available IDs without lookup`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['deep'],
          vertexContent: { $d: 'root', $c: ['branch'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: [],
          vertexContent: { $d: id, $c: id === 'branch' ? ['deep'] : [] },
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          return undefined;
        },
      },
    }).makeRunner();
    await runner.run();
    expect(calls).toEqual([]);
    expect(runner.summary().counts.discovered).toBe(3);
  });

  test(`${Constructor.name} seeded original declarations resolve but unrelated unused seeds do not`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      completedWork: new Set(['root', 'external', 'unused']),
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['external'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          return { vertexContent: null };
        },
      },
    }).makeRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toThrow('completedWork contains undiscovered vertex IDs');
    expect(calls).toEqual(['external']);
  });

  test(`${Constructor.name} root completion waits for independently anchored child work`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      syntheticRoot: true,
      saveNotMutatedResolvedGraph: true,
      traversableGraph: {
        makeRoot: () => ({ vertexContent: { $d: 'catalog', $c: ['app'] } }),
        makeVertex: (id) => ({
          vertexId: id,
          ...(id === 'app' ? { dependsOn: ['parser'] } : {}),
          vertexContent: { $d: id, $c: [] },
        }),
        resolvePrerequisite: () => ({
          vertexContent: { $d: 'parser', $c: ['generated'] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_COMPLETE, (v) => {
      events.push(v.getData());
    });
    const runner = traversal.makeRunner();
    await runner.run();
    const graph = runner.getResolvedGraph();
    const parser = graph.getVertexById('parser')!;
    expect(graph.get(parser)!.discoveryDepth).toBe(0);
    expect(graph.get(graph.getVertexById('generated')!)!.discoveryDepth).toBe(
      1,
    );
    expect(graph.getParentsOf(parser)).toEqual([]);
    expect(graph.getRoot()).toBeNull();
    expect(events).toContain('generated');
    expect(runner.summary().counts.subtreeCompleted).toBe(3);
    const saved = runner.resolvedGraphsContainer.notMutatedResolvedGraph!;
    const originalParser = saved.getVertexById('parser')!;
    expect(saved.getParentsOf(originalParser)).toEqual([]);
    expect(saved.getPathsTo(originalParser)).toEqual([[originalParser]]);
  });

  test.each([undefined, null, { reason: 'resolver' }])(
    `${Constructor.name} preserves exact resolver thrown value %#`,
    async (error) => {
      const runner = new Constructor<G>({
        traversableGraph: {
          makeRoot: () => ({
            vertexId: 'root',
            dependsOn: ['external'],
            vertexContent: { $d: 'root', $c: [] },
          }),
          makeVertex: () => ({ vertexContent: null }),
          resolvePrerequisite: () => {
            throw error;
          },
        },
      }).makeRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
    },
  );

  test(`${Constructor.name} validates an explicit result ID`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['external'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite: () => ({
          vertexId: undefined,
          vertexContent: null,
        }),
      },
    }).makeRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toThrow(
      'Prerequisite result vertex id and requested vertex id mismatch',
    );
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} a negative cache is superseded by later real discovery`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['external', 'loader'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: [],
          vertexContent: { $d: id, $c: [] },
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          return id === 'external'
            ? undefined
            : {
                dependsOn: ['external'],
                vertexContent: { $d: 'loader', $c: ['external'] },
              };
        },
      },
    }).makeRunner();
    await runner.run();
    expect(calls).toEqual(['external', 'loader']);
    expect(runner.summary().completedWorkIds).toEqual([
      'root',
      'loader',
      'external',
    ]);
  });

  test(`${Constructor.name} validates lookup cycles despite seeded initial work`, async () => {
    const runner = new Constructor<G>({
      completedWork: new Set(['root', 'external']),
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['external'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite: () => ({
          dependsOnComplete: ['root'],
          vertexContent: { $d: 'external', $c: [] },
        }),
      },
    }).makeRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: { dependencyCycles: [['root', 'external']] },
    });
  });
}

for (const kind of ['promise', 'getter', 'call'] as const) {
  test(`sync resolver preserves the thenable misuse contract (${kind})`, () => {
    const cause = {};
    const value =
      kind === 'promise'
        ? Promise.resolve(undefined)
        : kind === 'getter'
        ? Object.defineProperty({}, 'then', {
            get: () => {
              throw cause;
            },
          })
        : {
            then: () => {
              throw cause;
            },
          };
    const runner = new DagTraversal<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['external'],
          vertexContent: { $d: 'root', $c: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite: () => value as MakeVertexResult<G>,
      },
    }).makeRunner();
    let error: unknown;
    try {
      runner.run();
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      message:
        'Synchronous DagTraversalRunner callback RESOLVE_PREREQUISITE returned a thenable',
      ...(kind === 'promise' ? {} : { cause }),
    });
  });
}
