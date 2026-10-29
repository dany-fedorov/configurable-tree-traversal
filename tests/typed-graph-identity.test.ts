import {
  AsyncDagTraversal,
  DagTraversal,
  type DagDiscoverySource,
  type VertexTypes,
} from '../src';

type TaskId = { task: string } | symbol | undefined | number;
type Task = VertexTypes<string, TaskId>;

for (const TreeTraversal of [
  DagTraversal<Task, Task, TaskId>,
  AsyncDagTraversal<Task, Task, TaskId>,
]) {
  test(`${TreeTraversal.name} preserves typed arbitrary identities through lookup, snapshots, and guarded settlement`, async () => {
    const root = { task: 'root' };
    const prerequisite = Symbol('prerequisite');
    const lookups: TaskId[] = [];
    const source: DagDiscoverySource<Task, Task, TaskId> = {
      resolveRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: root,
          vertexContent: { $data: 'root', $childHints: [undefined, NaN] },
        },
      }),
      resolveChild: (id) => ({
        kind: 'found',
        vertex: {
          vertexId: id,
          dependsOnWork: [prerequisite],
          vertexContent: { $data: 'child', $childHints: [] },
        },
      }),
      getVertexIdFromHint: (id) => ({ vertexId: id }),
      resolvePrerequisite: (id) => {
        lookups.push(id);
        return { kind: 'omitted', vertexId: id, satisfiesDependencies: true };
      },
    };
    const runner = new TreeTraversal({
      traversableGraph: source,
      workCompletion: 'externalSettlement',
      discovery: 'eager',
      retainOriginalGraphStructure: true,
    }).createRunner();
    await runner.run();
    expect(lookups).toEqual([prerequisite]);
    const graph = runner.getResolvedGraphView();
    const snapshot = runner.originalGraphView!;
    for (const id of [root, undefined, NaN]) {
      const ref = graph.getVertexRefById(id)!;
      expect(graph.getVertexId(ref)).toBe(id);
      expect(graph.getVertexId(ref)).toBe(id);
      expect(snapshot.getVertexId(snapshot.getVertexRefById(id)!)).toBe(id);
      const generation = runner.summary().vertices.get(id)!.generation!;
      expect(() =>
        runner.settle(id, { kind: 'workCompleted' }, Symbol()),
      ).toThrow(/stale DAG settlement/);
      expect(runner.settle(id, { kind: 'workCompleted' }, generation)).toBe(
        true,
      );
    }
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([root, undefined, NaN]);
    expect(graph.getVertexRefById({ task: 'root' })).toBeNull();
  });
}

type NumericTask = VertexTypes<string, number>;
class InheritedIdResult {
  get vertexId(): number {
    return 42;
  }
  vertexContent = { $data: 'inherited', $childHints: [] };
}

for (const asynchronous of [false, true]) {
  for (const shape of ['tagged'] as const) {
    for (const callback of ['root', 'hint', 'prerequisite'] as const) {
      test(`${
        asynchronous ? 'async' : 'sync'
      } ${shape} ${callback} rejects an inherited ID before generated or prerequisite fallback`, async () => {
        const inherited = new InheritedIdResult();
        const result = () => ({ kind: 'found' as const, vertex: inherited });
        const source: DagDiscoverySource<NumericTask, NumericTask, number> = {
          resolveRoot: () =>
            callback === 'root'
              ? result()
              : {
                  kind: 'found' as const,
                  vertex: {
                    vertexId: 1,
                    dependsOnWork: callback === 'prerequisite' ? [42] : [],
                    vertexContent: {
                      $data: 'root',
                      $childHints: callback === 'hint' ? [42] : [],
                    },
                  },
                },
          resolveChild: result,
          resolvePrerequisite: result,
        };
        const runner = asynchronous
          ? new AsyncDagTraversal<NumericTask, NumericTask, number>({
              traversableGraph: {
                resolveRoot: async () => source.resolveRoot(),
                resolveChild: async () => result(),
                resolvePrerequisite: async () => result(),
              },
            }).createRunner()
          : new DagTraversal<NumericTask, NumericTask, number>({
              traversableGraph: source,
            }).createRunner();
        await expect(async () => {
          await runner.run();
        }).rejects.toThrow(/vertexId must be an own property/);
        expect(runner.getResolvedGraphView().getVertexRefs()).toHaveLength(
          callback === 'root' ? 0 : 1,
        );
        expect(runner.getResolvedGraphView().getVertexRefById(42)).toBeNull();
      });
    }
  }
}

for (const TreeTraversal of [
  DagTraversal<Task, Task, TaskId>,
  AsyncDagTraversal<Task, Task, TaskId>,
]) {
  for (const shape of ['tagged'] as const) {
    test.each([42, undefined])(
      `${TreeTraversal.name} ${shape} accepts an own getter ID %p`,
      async (id) => {
        const vertex = {
          get vertexId() {
            return id;
          },
          vertexContent: { $data: 'root', $childHints: [] },
        };
        const runner = new TreeTraversal({
          traversableGraph: {
            resolveRoot: () => ({ kind: 'found', vertex }),
            resolveChild: () => ({
              satisfiesDependencies: true as const,
              kind: 'omitted',
            }),
          },
        }).createRunner();
        await runner.run();
        const graph = runner.getResolvedGraphView();
        const ref = graph.getVertexRefById(id)!;
        expect(graph.getVertexId(ref)).toBe(id);
        expect(runner.summary().completedWorkIds).toEqual([id]);
      },
    );

    test.each([undefined, null, { original: true }])(
      `${TreeTraversal.name} ${shape} preserves an own ID getter error %p`,
      async (error) => {
        const vertex = {
          get vertexId(): number {
            throw error;
          },
          vertexContent: { $data: 'root', $childHints: [] },
        };
        const runner = new TreeTraversal({
          traversableGraph: {
            resolveRoot: () => ({ kind: 'found', vertex }),
            resolveChild: () => ({
              satisfiesDependencies: true as const,
              kind: 'omitted',
            }),
          },
        }).createRunner();
        await expect(async () => {
          await runner.run();
        }).rejects.toBe(error);
        expect(runner.getResolvedGraphView().getVertexRefs()).toEqual([]);
      },
    );
  }
}

for (const TreeTraversal of [
  DagTraversal<NumericTask, NumericTask, number>,
  AsyncDagTraversal<NumericTask, NumericTask, number>,
]) {
  test(`${TreeTraversal.name} validates and schedules the same captured tagged payload`, async () => {
    let reads = 0;
    const original = {
      vertexId: 7,
      vertexContent: { $data: 'own', $childHints: [] },
    };
    const inherited = new InheritedIdResult();
    const runner = new TreeTraversal({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found',
          get vertex() {
            reads += 1;
            return reads === 1 ? original : inherited;
          },
        }),
        resolveChild: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted',
        }),
      },
    }).createRunner();
    await runner.run();
    expect(reads).toBe(1);
    expect(runner.summary().completedWorkIds).toEqual([7]);
    const graph = runner.getResolvedGraphView();
    expect(graph.getVertexRefById(7)!.getValue().getData()).toBe('own');
  });
}
