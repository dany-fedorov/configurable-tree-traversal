import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalOrder as Order,
  DEFER_READY,
} from '../src';
import type { TraversableGraph, TreeTypeParameters } from '../src';

type G = TreeTypeParameters<string, string>;

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each([undefined, new Set<unknown>()])(
    `${Constructor.name} honors root work prerequisites independently of completedWork (%s)`,
    async (completedWork) => {
      const visited: string[] = [];
      const runner = new Constructor<G>({
        ...(completedWork === undefined ? {} : { completedWork }),
        traversableGraph: {
          makeRoot: () => ({
            vertexId: 'root',
            dependsOn: ['missing'],
            vertexContent: { $data: 'root', $childHints: [] },
          }),
          makeVertex: () => ({ vertexContent: null }),
        },
      })
        .addVisitorFor(Order.ON_READY, (v) => {
          visited.push(v.getData());
        })
        .makeRunner();
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
          makeRoot: () => ({
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['child'] },
          }),
          makeVertex: () => ({
            vertexId: 'child',
            vertexContent: { $data: 'child', $childHints: [] },
          }),
        },
      })
        .addVisitorFor(Order.ON_READY, (v) => {
          visited.push(v.getData());
          return DEFER_READY;
        })
        .makeRunner();
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
          makeRoot: () => ({
            vertexId: 'root',
            dependsOn: ['missing'],
            vertexContent: { $data: 'root', $childHints: [] },
          }),
          makeVertex: () => ({ vertexContent: null }),
        },
      }).makeRunner();
      await runner.run();
      expect(runner.summary().completedWorkIds).toEqual(['root']);
    },
  );

  test(`${Constructor.name} normalizes canonical found and omitted results without losing ID identity`, async () => {
    const objectId = {};
    const source: TraversableGraph<G> = {
      makeRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: undefined,
          vertexContent: { $data: 'root', $childHints: ['child'] },
        },
      }),
      makeVertex: () => ({
        kind: 'found',
        vertex: {
          vertexId: objectId,
          dependsOn: ['external'],
          dependsOnComplete: ['external'],
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
    }).makeRunner();
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([undefined, objectId]);
    expect(runner.getResolvedGraph().getVertexById(objectId)).not.toBeNull();
    expect(runner.getResolvedGraph().getVertexById(undefined)).not.toBeNull();
  });

  test(`${Constructor.name} canonical missing lookup leaves prerequisites unknown`, async () => {
    const source: TraversableGraph<G> = {
      makeRoot: () => ({
        vertexId: 'root',
        dependsOn: ['missing'],
        vertexContent: { $data: 'root', $childHints: [] },
      }),
      makeVertex: () => ({ vertexContent: null }),
      resolvePrerequisite: () => ({ kind: 'missing' }),
    };
    const runner = new Constructor<G>({
      traversableGraph: source,
    }).makeRunner();
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
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['ignored'],
          dependsOnComplete: ['missing'],
          vertexContent: { $data: 'root', $childHints: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
      },
    })
      .addVisitorFor(Order.ON_READY, (v) => {
        visited.push(v.getData());
      })
      .makeRunner();
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
    null,
    undefined,
  ])(
    `${Constructor.name} rejects invalid root and hint results (%j)`,
    async (invalid) => {
      for (const root of [true, false]) {
        const source = {
          makeRoot: () =>
            root
              ? invalid
              : { vertexContent: { $data: 'root', $childHints: ['child'] } },
          makeVertex: () => invalid,
        } as unknown as TraversableGraph<G>;
        const runner = new Constructor<G>({
          traversableGraph: source,
        }).makeRunner();
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
            makeRoot: () => ({ vertexContent: null }),
            makeVertex: () => ({ vertexContent: null }),
          },
        } as never).makeRunner(),
      ).toThrow(TypeError);
    },
  );

  test(`${Constructor.name} explicit empty dependencies override parent inheritance`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      implicitParentDependency: true,
      discovery: 'eager',
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ['child'] },
        }),
        makeVertex: () => ({
          vertexId: 'child',
          dependsOn: [],
          vertexContent: { $data: 'child', $childHints: [] },
        }),
      },
    })
      .addVisitorFor(Order.ON_READY, (v) => {
        visited.push(v.getData());
        return DEFER_READY;
      })
      .makeRunner();
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
          makeRoot: () => ({
            kind: 'omitted',
            vertexId: id,
            satisfiesDependencies: true,
          }),
          makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
        },
      }).makeRunner();
      await runner.run();
      expect(runner.getResolvedGraph().getRoot()).toBeNull();
      expect(runner.resolvedGraphsContainer.store.getIdState(id)).toEqual({
        kind: 'omitted',
      });
    },
  );

  test(`${Constructor.name} canonical hint omission satisfies W and C with the hint identity`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          kind: 'found',
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['join', 'omitted'] },
          },
        }),
        getVertexIdFromHint: (id) => ({ vertexId: id }),
        makeVertex: (id) =>
          id === 'omitted'
            ? { kind: 'omitted', satisfiesDependencies: true }
            : {
                kind: 'found',
                vertex: {
                  dependsOn: ['omitted'],
                  dependsOnComplete: ['omitted'],
                  vertexContent: { $data: id, $childHints: [] },
                },
              },
      },
    }).makeRunner();
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual(['root', 'join']);
    expect(runner.summary().vertices.get('join')!.subtreeComplete).toBe(true);
  });

  test(`${Constructor.name} synthetic catalog roots never gate explicit parent inheritance`, async () => {
    const visited: string[] = [];
    const runner = new Constructor<G>({
      syntheticRoot: true,
      discovery: 'eager',
      implicitParentDependency: true,
      traversableGraph: {
        makeRoot: () => ({
          vertexContent: { $data: 'catalog', $childHints: ['child'] },
          dependsOn: ['ignored'],
        }),
        makeVertex: () => ({
          vertexId: 'child',
          vertexContent: { $data: 'child', $childHints: [] },
        }),
      },
    })
      .addVisitorFor(Order.ON_READY, (v) => {
        visited.push(v.getData());
        return DEFER_READY;
      })
      .makeRunner();
    await runner.run();
    expect(visited).toEqual(['child']);
    expect(
      runner.summary().vertices.get('child')!.unmetPrerequisiteIds,
    ).toEqual([]);
  });

  test(`${Constructor.name} rejects a bare null lookup without satisfying its dependency`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          dependsOn: ['missing'],
          vertexContent: { $data: 'root', $childHints: [] },
        }),
        makeVertex: () => ({ vertexContent: null }),
        resolvePrerequisite: () => null as never,
      },
    }).makeRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toBeInstanceOf(TypeError);
    expect(
      runner.resolvedGraphsContainer.store.getIdState('missing'),
    ).toBeUndefined();
  });
}
