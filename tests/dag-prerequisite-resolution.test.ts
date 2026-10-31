import type { DagPrerequisiteResolution } from '../src/core/TraversableTree';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexTypes<string, string>;

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const discovery of ['lazy', 'eager'] as const) {
    test(`${Constructor.name} ${discovery} resolves transitive dependencies as detached components`, async () => {
      const calls: unknown[] = [];
      const events: string[] = [];
      const source = {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'app',
            dependsOnWork: ['parser'],
            vertexContent: { $data: 'app', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite(id: unknown): DagPrerequisiteResolution<G> {
          expect(this).toBe(source);
          calls.push(id);
          return {
            kind: 'found',
            vertex: {
              dependsOnWork: id === 'parser' ? ['lexer'] : [],
              vertexContent: { $data: String(id), $childHints: [] },
            },
          };
        },
      };
      const traversal = new Constructor<G>({
        traversableGraph: source,
        discovery,
        retainOriginalGraphStructure: true,
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
        events.push(v.getData());
      });
      const runner = traversal.createRunner();
      expect(runner.summary().counts.discovered).toBe(0);
      expect(calls).toEqual([]);
      await runner.run();
      expect(calls).toEqual(['parser', 'lexer']);
      expect(events).toEqual(['lexer', 'parser', 'app']);
      const graph = runner.getResolvedGraphView();
      const parser = graph.getVertexRefById('parser')!;
      expect(graph.getParentsOf(parser)).toEqual([]);
      expect(graph.requirePathsTo(parser)).toEqual([[parser]]);
      expect(graph.get(parser)!.discoveryDepth).toBe(0);
      expect(graph.requireVertexId(graph.getRoot()!)).toBe('app');
      expect(runner.summary().counts.subgraphCompleted).toBe(3);
    });
  }

  test.each([false, true])(
    `${Constructor.name} distinguishes missing from omitted (%s)`,
    async (omit) => {
      const calls: unknown[] = [];
      const source = {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'app',
            dependsOnWork: ['external'],
            dependsOnSubgraphCompletion: ['external'],
            vertexContent: { $data: 'app', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: (id: unknown) => {
          calls.push(id);
          return omit
            ? {
                identity: null,
                kind: 'omitted' as const,
                satisfiesDependencies: true as const,
              }
            : { kind: 'missing' as const };
        },
      };
      const runner = new Constructor<G>({
        traversableGraph: source,
      }).createRunner();
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
          runnerInternals(runner).resolvedGraphsContainer.store.getIdState(
            'external',
          ),
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
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ['a', 'b'] },
        },
      }),
      resolveChild: (id: string) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOnWork: ids,
          dependsOnSubgraphCompletion: ids,
          vertexContent: { $data: id, $childHints: [] },
        },
      }),
      resolvePrerequisite: (id: unknown) => {
        calls.push(id);
        return {
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            vertexContent: { $data: 'external', $childHints: [] },
          },
        };
      },
    };
    const runner = new Constructor<G>({
      traversableGraph: source,
    }).createRunner();
    await runner.run();
    expect(calls).toEqual([undefined, null, NaN, 0, object, fn, ids[7]]);
    expect(runner.summary().counts.discovered).toBe(10);
  });

  test(`${Constructor.name} ordinary discovery satisfies available IDs without lookup`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['deep'],
            vertexContent: { $data: 'root', $childHints: ['branch'] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: [],
            vertexContent: {
              $data: id,
              $childHints: id === 'branch' ? ['deep'] : [],
            },
          },
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          return { kind: 'missing' as const };
        },
      },
    }).createRunner();
    await runner.run();
    expect(calls).toEqual([]);
    expect(runner.summary().counts.discovered).toBe(3);
  });

  test(`${Constructor.name} seeded original declarations resolve but unrelated unused seeds do not`, async () => {
    const calls: unknown[] = [];
    const runner = new Constructor<G>({
      completedWork: new Set(['root', 'external', 'unused']),
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['external'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          return {
            identity: null,
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          };
        },
      },
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toThrow('completedWork contains undiscovered vertex IDs');
    expect(calls).toEqual(['external']);
  });

  test(`${Constructor.name} root completion waits for independently anchored child work`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      syntheticRoot: true,
      retainOriginalGraphStructure: true,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: { vertexContent: { $data: 'catalog', $childHints: ['app'] } },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            ...(id === 'app' ? { dependsOnWork: ['parser'] } : {}),
            vertexContent: { $data: id, $childHints: [] },
          },
        }),
        resolvePrerequisite: () => ({
          kind: 'found' as const,
          vertex: {
            vertexContent: { $data: 'parser', $childHints: ['generated'] },
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (v) => {
      events.push(v.getData());
    });
    const runner = traversal.createRunner();
    await runner.run();
    const graph = runner.getResolvedGraphView();
    const parser = graph.getVertexRefById('parser')!;
    expect(graph.get(parser)!.discoveryDepth).toBe(0);
    expect(
      graph.get(graph.getVertexRefById('generated')!)!.discoveryDepth,
    ).toBe(1);
    expect(graph.getParentsOf(parser)).toEqual([]);
    expect(graph.getRoot()).toBeNull();
    expect(events).toContain('generated');
    expect(runner.summary().counts.subgraphCompleted).toBe(3);
    const saved =
      runnerInternals(runner).resolvedGraphsContainer.originalGraphView!;
    const originalParser = saved.getVertexRefById('parser')!;
    expect(saved.getParentsOf(originalParser)).toEqual([]);
    expect(saved.requirePathsTo(originalParser)).toEqual([[originalParser]]);
  });

  test.each([undefined, null, { reason: 'resolver' }])(
    `${Constructor.name} preserves exact resolver thrown value %#`,
    async (error) => {
      const runner = new Constructor<G>({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              dependsOnWork: ['external'],
              vertexContent: { $data: 'root', $childHints: [] },
            },
          }),
          resolveChild: () => ({
            identity: null,
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          }),
          resolvePrerequisite: () => {
            throw error;
          },
        },
      }).createRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
    },
  );

  test(`${Constructor.name} validates an explicit result ID`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['external'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
          identity: { vertexId: undefined },
        }),
      },
    }).createRunner();
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
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['external', 'loader'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: [],
            vertexContent: { $data: id, $childHints: [] },
          },
        }),
        resolvePrerequisite: (id) => {
          calls.push(id);
          return id === 'external'
            ? { kind: 'missing' as const }
            : {
                kind: 'found' as const,
                vertex: {
                  dependsOnWork: ['external'],
                  vertexContent: { $data: 'loader', $childHints: ['external'] },
                },
              };
        },
      },
    }).createRunner();
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
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['external'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: () => ({
          kind: 'found' as const,
          vertex: {
            dependsOnSubgraphCompletion: ['root'],
            vertexContent: { $data: 'external', $childHints: [] },
          },
        }),
      },
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: { dependencyCycleComponents: [['root', 'external']] },
    });
  });
}

for (const kind of ['promise', 'getter', 'call'] as const) {
  test(`sync resolver preserves the thenable misuse contract (${kind})`, () => {
    const cause = {};
    const value =
      kind === 'promise'
        ? Promise.resolve({ kind: 'missing' })
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
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['external'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          identity: null,
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: () => value as DagPrerequisiteResolution<G>,
      },
    }).createRunner();
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
