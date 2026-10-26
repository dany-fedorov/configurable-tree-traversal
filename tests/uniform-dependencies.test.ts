import type { DagDiscoverySource, VertexTypes } from '../src';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as Order,
  DEFER_READY,
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
            vertexId: 'root',
            dependsOnWork: ['missing'],
            vertexContent: { $data: 'root', $childHints: [] },
          }),
          resolveChild: () => ({ vertexContent: null }),
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

  test.each([undefined, false, true])(
    `${Constructor.name} graph parent dependency is explicit (%s)`,
    async (implicitParentDependency) => {
      const visited: string[] = [];
      const runner = new Constructor<G>({
        discovery: 'eager',
        ...(implicitParentDependency === undefined
          ? {}
          : { implicitParentDependency }),
        traversableGraph: {
          resolveRoot: () => ({
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['child'] },
          }),
          resolveChild: () => ({
            vertexId: 'child',
            vertexContent: { $data: 'child', $childHints: [] },
          }),
        },
      })
        .addVisitorFor(Order.ON_WORK_READY, (v) => {
          visited.push(v.getData());
          return DEFER_READY;
        })
        .createRunner();
      await runner.run();
      expect(visited).toEqual(
        implicitParentDependency === true ? ['root'] : ['root', 'child'],
      );
    },
  );

  test.each([undefined, new Set<unknown>()])(
    `${Constructor.name} ignore root work dependencies is independent of seeds (%s)`,
    async (completedWork) => {
      const runner = new Constructor<G>({
        ...{ rootDependencies: 'ignore' },
        ...(completedWork === undefined ? {} : { completedWork }),
        traversableGraph: {
          resolveRoot: () => ({
            vertexId: 'root',
            dependsOnWork: ['missing'],
            vertexContent: { $data: 'root', $childHints: [] },
          }),
          resolveChild: () => ({ vertexContent: null }),
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
    expect(runner.getResolvedGraph().getVertexById(objectId)).not.toBeNull();
    expect(runner.getResolvedGraph().getVertexById(undefined)).not.toBeNull();
  });

  test(`${Constructor.name} canonical missing lookup leaves prerequisites unknown`, async () => {
    const source: DagDiscoverySource<G> = {
      resolveRoot: () => ({
        vertexId: 'root',
        dependsOnWork: ['missing'],
        vertexContent: { $data: 'root', $childHints: [] },
      }),
      resolveChild: () => ({ vertexContent: null }),
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
      rootDependencies: 'ignore',
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          dependsOnWork: ['ignored'],
          dependsOnSubgraphCompletion: ['missing'],
          vertexContent: { $data: 'root', $childHints: [] },
        }),
        resolveChild: () => ({ vertexContent: null }),
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
              : { vertexContent: { $data: 'root', $childHints: ['child'] } },
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
    { rootDependencies: false },
    { rootDependencies: null },
    { rootDependencies: 'unknown' },
    { implicitParentDependency: 'true' },
    { implicitParentDependency: null },
  ])(
    `${Constructor.name} rejects malformed dependency policies (%j)`,
    (options) => {
      expect(() =>
        new Constructor<G>({
          ...options,
          traversableGraph: {
            resolveRoot: () => ({ vertexContent: null }),
            resolveChild: () => ({ vertexContent: null }),
          },
        } as never).createRunner(),
      ).toThrow(TypeError);
    },
  );

  test(`${Constructor.name} explicit empty dependencies override parent inheritance`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      implicitParentDependency: true,
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ['child'] },
        }),
        resolveChild: () => ({
          vertexId: 'child',
          dependsOnWork: [],
          vertexContent: { $data: 'child', $childHints: [] },
        }),
      },
    })
      .addVisitorFor(Order.ON_WORK_READY, (v) => {
        visited.push(v.getData());
        return DEFER_READY;
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
      implicitParentDependency: true,
      traversableGraph: {
        resolveRoot: () => ({
          vertexContent: { $data: 'catalog', $childHints: ['child'] },
          dependsOnWork: ['ignored'],
        }),
        resolveChild: () => ({
          vertexId: 'child',
          vertexContent: { $data: 'child', $childHints: [] },
        }),
      },
    })
      .addVisitorFor(Order.ON_WORK_READY, (v) => {
        visited.push(v.getData());
        return DEFER_READY;
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
          vertexId: 'root',
          dependsOnWork: ['missing'],
          vertexContent: { $data: 'root', $childHints: [] },
        }),
        resolveChild: () => ({ vertexContent: null }),
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
            vertexId: 'root',
            dependsOnWork: ['optional'],
            vertexContent: { $data: 'root', $childHints: [] },
          }),
          resolveChild: () => ({ vertexContent: null }),
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
