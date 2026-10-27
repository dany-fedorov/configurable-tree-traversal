import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import type { DagDiscoverySource, VertexTypes } from '../src';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as Order,
} from '../src';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexTypes<string, string>;

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each([undefined, new Set<unknown>()])(
    `${Constructor.name} honors root work prerequisites independently of completedWork (%s)`,
    async (completedWork) => {
      const visited: string[] = [];
      const runner = new Constructor<G>({
        ...(completedWork === undefined ? {} : { completedWork }),
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              dependsOnWork: ['missing'],
              vertexContent: { $data: 'root', $childHints: [] },
            },
          }),
          resolveChild: () => ({
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          }),
        },
      })
        .addVisitorFor(Order.ON_WORK_READY, (v) => {
          visited.push(v.getData());
        })
        .createRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toMatchObject({ name: 'DagTraversalStallError' });
      expect(visited).toEqual([]);
    },
  );

  test.each([undefined, 'none', 'discoveryParentWork'] as const)(
    `${Constructor.name} graph parent dependency is explicit (%s)`,
    async (omittedWorkDependencies) => {
      const visited: string[] = [];
      const runner = new Constructor<G>({
        discovery: 'eager',
        ...(omittedWorkDependencies === undefined
          ? {}
          : { omittedWorkDependencies }),
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              vertexContent: { $data: 'root', $childHints: ['child'] },
            },
          }),
          resolveChild: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'child',
              vertexContent: { $data: 'child', $childHints: [] },
            },
          }),
        },
      })
        .addVisitorFor(Order.ON_WORK_READY, (v) => {
          visited.push(v.getData());
          return {
            commands: [
              { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
            ],
          };
        })
        .createRunner();
      await runner.run();
      expect(visited).toEqual(
        omittedWorkDependencies === 'discoveryParentWork'
          ? ['root']
          : ['root', 'child'],
      );
    },
  );

  test.each([undefined, new Set<unknown>()])(
    `${Constructor.name} ignore root work dependencies is independent of seeds (%s)`,
    async (completedWork) => {
      const runner = new Constructor<G>({
        ...{ rootWorkDependencies: 'ignore' },
        ...(completedWork === undefined ? {} : { completedWork }),
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              dependsOnWork: ['missing'],
              vertexContent: { $data: 'root', $childHints: [] },
            },
          }),
          resolveChild: () => ({
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          }),
        },
      }).createRunner();
      await runner.run();
      expect(runner.summary().completedWorkIds).toEqual(['root']);
    },
  );

  test(`${Constructor.name} normalizes canonical found and omitted results without losing ID identity`, async () => {
    const objectId = {};
    const source: DagDiscoverySource<G> = {
      resolveRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: undefined,
          vertexContent: { $data: 'root', $childHints: ['child'] },
        },
      }),
      resolveChild: () => ({
        kind: 'found',
        vertex: {
          vertexId: objectId,
          dependsOnWork: ['external'],
          dependsOnSubgraphCompletion: ['external'],
          vertexContent: { $data: 'child', $childHints: [] },
        },
      }),
      resolvePrerequisite: () => ({
        kind: 'omitted',
        satisfiesDependencies: true,
      }),
    };
    const runner = new Constructor<G>({
      traversableGraph: source,
    }).createRunner();
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([undefined, objectId]);
    expect(runner.getResolvedGraph().getVertexRefById(objectId)).not.toBeNull();
    expect(
      runner.getResolvedGraph().getVertexRefById(undefined),
    ).not.toBeNull();
  });

  test(`${Constructor.name} canonical missing lookup leaves prerequisites unknown`, async () => {
    const source: DagDiscoverySource<G> = {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          dependsOnWork: ['missing'],
          vertexContent: { $data: 'root', $childHints: [] },
        },
      }),
      resolveChild: () => ({
        kind: 'omitted' as const,
        satisfiesDependencies: true as const,
      }),
      resolvePrerequisite: () => ({ kind: 'missing' }),
    };
    const runner = new Constructor<G>({
      traversableGraph: source,
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      name: 'DagTraversalStallError',
      diagnostics: { unknownPrerequisiteIds: ['missing'] },
    });
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} ignore root work dependencies still honors completion prerequisites`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      rootWorkDependencies: 'ignore',
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['ignored'],
            dependsOnSubgraphCompletion: ['missing'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
      },
    })
      .addVisitorFor(Order.ON_WORK_READY, (v) => {
        visited.push(v.getData());
      })
      .createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      name: 'DagTraversalStallError',
      diagnostics: { unknownPrerequisiteIds: ['missing'] },
    });
    expect(visited).toEqual([]);
  });

  test.each([
    { kind: 'missing' },
    { kind: 'unknown' },
    { kind: 'found', vertex: null },
    { kind: 'found', vertex: {} },
    { kind: 'found', vertex: { vertexContent: null } },
    { kind: 'omitted' },
    { kind: 'omitted', satisfiesDependencies: false },
    { kind: 'omitted', satisfiesDependencies: undefined },
    null,
    undefined,
  ])(
    `${Constructor.name} rejects invalid root and hint results (%j)`,
    async (invalid) => {
      for (const root of [true, false]) {
        const source = {
          resolveRoot: () =>
            root
              ? invalid
              : {
                  kind: 'found' as const,
                  vertex: {
                    vertexContent: { $data: 'root', $childHints: ['child'] },
                  },
                },
          resolveChild: () => invalid,
        } as unknown as DagDiscoverySource<G>;
        const runner = new Constructor<G>({
          traversableGraph: source,
        }).createRunner();
        await expect(async () => {
          await runner.run();
        }).rejects.toBeInstanceOf(TypeError);
      }
    },
  );

  test.each([
    { rootWorkDependencies: false },
    { rootWorkDependencies: null },
    { rootWorkDependencies: 'unknown' },
    { omittedWorkDependencies: 'true' },
    { omittedWorkDependencies: null },
  ])(
    `${Constructor.name} rejects malformed dependency policies (%j)`,
    (options) => {
      expect(() =>
        new Constructor<G>({
          ...options,
          traversableGraph: {
            resolveRoot: () => ({
              satisfiesDependencies: true as const,
              kind: 'omitted' as const,
            }),
            resolveChild: () => ({
              satisfiesDependencies: true as const,
              kind: 'omitted' as const,
            }),
          },
        } as never).createRunner(),
      ).toThrow(TypeError);
    },
  );

  test(`${Constructor.name} explicit empty dependencies override parent inheritance`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      omittedWorkDependencies: 'discoveryParentWork',
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['child'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'child',
            dependsOnWork: [],
            vertexContent: { $data: 'child', $childHints: [] },
          },
        }),
      },
    })
      .addVisitorFor(Order.ON_WORK_READY, (v) => {
        visited.push(v.getData());
        return {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        };
      })
      .createRunner();
    await runner.run();
    expect(visited).toEqual(['root', 'child']);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each([undefined, {}])(
    `${Constructor.name} canonical omissions retain an own explicit ID (%j)`,
    async (id) => {
      const runner = new Constructor<G>({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'omitted',
            vertexId: id,
            satisfiesDependencies: true,
          }),
          resolveChild: () => ({
            kind: 'omitted',
            satisfiesDependencies: true,
          }),
        },
      }).createRunner();
      await runner.run();
      expect(runner.getResolvedGraph().getRoot()).toBeNull();
      expect(
        runnerInternals(runner).resolvedGraphsContainer.store.getIdState(id),
      ).toEqual({
        kind: 'omitted',
      });
    },
  );

  test(`${Constructor.name} canonical hint omission satisfies W and C with the hint identity`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['join', 'omitted'] },
          },
        }),
        getVertexIdFromHint: (id) => ({ vertexId: id }),
        resolveChild: (id) =>
          id === 'omitted'
            ? { kind: 'omitted', satisfiesDependencies: true }
            : {
                kind: 'found',
                vertex: {
                  dependsOnWork: ['omitted'],
                  dependsOnSubgraphCompletion: ['omitted'],
                  vertexContent: { $data: id, $childHints: [] },
                },
              },
      },
    }).createRunner();
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual(['root', 'join']);
    expect(runner.summary().vertices.get('join')!.subgraphComplete).toBe(true);
  });

  test(`${Constructor.name} synthetic catalog roots never gate explicit parent inheritance`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      syntheticRoot: true,
      discovery: 'eager',
      omittedWorkDependencies: 'discoveryParentWork',
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexContent: { $data: 'catalog', $childHints: ['child'] },
            dependsOnWork: ['ignored'],
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'child',
            vertexContent: { $data: 'child', $childHints: [] },
          },
        }),
      },
    })
      .addVisitorFor(Order.ON_WORK_READY, (v) => {
        visited.push(v.getData());
        return {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        };
      })
      .createRunner();
    await runner.run();
    expect(visited).toEqual(['child']);
    expect(
      runner.summary().vertices.get('child')!.unmetPrerequisiteIds,
    ).toEqual([]);
  });

  test(`${Constructor.name} rejects a bare null lookup without satisfying its dependency`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnWork: ['missing'],
            vertexContent: { $data: 'root', $childHints: [] },
          },
        }),
        resolveChild: () => ({
          kind: 'omitted' as const,
          satisfiesDependencies: true as const,
        }),
        resolvePrerequisite: () => null as never,
      },
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toBeInstanceOf(TypeError);
    expect(
      runnerInternals(runner).resolvedGraphsContainer.store.getIdState(
        'missing',
      ),
    ).toBeUndefined();
  });
}

for (const Constructor of [DagTraversal<G>, AsyncDagTraversal<G>]) {
  test.each([
    {},
    { satisfiesDependencies: undefined },
    { satisfiesDependencies: false },
  ])(
    `${Constructor.name} rejects unacknowledged prerequisite omission %j`,
    async (acknowledgement) => {
      const runner = new Constructor({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              dependsOnWork: ['optional'],
              vertexContent: { $data: 'root', $childHints: [] },
            },
          }),
          resolveChild: () => ({
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          }),
          resolvePrerequisite: () => ({ kind: 'omitted', ...acknowledgement }),
        } as unknown as DagDiscoverySource<G>,
      }).createRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toThrow(
        'Omitted source result requires satisfiesDependencies: true',
      );
    },
  );
}
