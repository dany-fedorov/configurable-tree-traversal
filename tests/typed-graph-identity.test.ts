import {
  AsyncDagTraversal,
  DagTraversal,
  type TraversableGraph,
  type TreeTypeParameters,
} from '../src';

type TaskId = { task: string } | symbol | undefined | number;
type Task = TreeTypeParameters<string, TaskId>;

for (const Traversal of [
  DagTraversal<Task, Task, TaskId>,
  AsyncDagTraversal<Task, Task, TaskId>,
]) {
  test(`${Traversal.name} preserves typed arbitrary identities through lookup, snapshots, and guarded settlement`, async () => {
    const root = { task: 'root' };
    const prerequisite = Symbol('prerequisite');
    const lookups: TaskId[] = [];
    const source: TraversableGraph<Task, Task, TaskId> = {
      makeRoot: () => ({
        kind: 'found',
        vertex: {
          vertexId: root,
          vertexContent: { $data: 'root', $childHints: [undefined, NaN] },
        },
      }),
      makeVertex: (id) => ({
        kind: 'found',
        vertex: {
          vertexId: id,
          dependsOn: [prerequisite],
          vertexContent: { $data: 'child', $childHints: [] },
        },
      }),
      getVertexIdFromHint: (id) => ({ vertexId: id }),
      resolvePrerequisite: (id) => {
        lookups.push(id);
        return { kind: 'omitted', vertexId: id, satisfiesDependencies: true };
      },
    };
    const runner = new Traversal({
      traversableGraph: source,
      workCompletion: 'externalSettlement',
      discovery: 'eager',
      saveNotMutatedResolvedGraph: true,
    }).makeRunner();
    await runner.run();
    expect(lookups).toEqual([prerequisite]);
    const graph = runner.getResolvedGraph();
    const snapshot = runner.notMutatedResolvedGraph!;
    for (const id of [root, undefined, NaN]) {
      const ref = graph.getVertexRefById(id)!;
      expect(graph.getVertexId(ref)).toBe(id);
      expect(graph.getIdOf(ref)).toBe(id);
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

type NumericTask = TreeTypeParameters<string, number>;
class InheritedIdResult {
  get vertexId(): number {
    return 42;
  }
  vertexContent = { $data: 'inherited', $childHints: [] };
}

for (const asynchronous of [false, true]) {
  for (const shape of ['tagged', 'legacy'] as const) {
    for (const callback of ['root', 'hint', 'prerequisite'] as const) {
      test(`${
        asynchronous ? 'async' : 'sync'
      } ${shape} ${callback} rejects an inherited ID before generated or prerequisite fallback`, async () => {
        const inherited = new InheritedIdResult();
        const result = () =>
          shape === 'tagged'
            ? { kind: 'found' as const, vertex: inherited }
            : inherited;
        const source: TraversableGraph<NumericTask, NumericTask, number> = {
          makeRoot: () =>
            callback === 'root'
              ? result()
              : {
                  vertexId: 1,
                  dependsOn: callback === 'prerequisite' ? [42] : [],
                  vertexContent: {
                    $data: 'root',
                    $childHints: callback === 'hint' ? [42] : [],
                  },
                },
          makeVertex: result,
          resolvePrerequisite: result,
        };
        const runner = asynchronous
          ? new AsyncDagTraversal<NumericTask, NumericTask, number>({
              traversableGraph: {
                makeRoot: async () => source.makeRoot(),
                makeVertex: async () => result(),
                resolvePrerequisite: async () => result(),
              },
            }).makeRunner()
          : new DagTraversal<NumericTask, NumericTask, number>({
              traversableGraph: source,
            }).makeRunner();
        await expect(async () => {
          await runner.run();
        }).rejects.toThrow(/vertexId must be an own property/);
        expect(runner.getResolvedGraph().getVertexRefs()).toHaveLength(
          callback === 'root' ? 0 : 1,
        );
        expect(runner.getResolvedGraph().getVertexRefById(42)).toBeNull();
      });
    }
  }
}

for (const Traversal of [
  DagTraversal<Task, Task, TaskId>,
  AsyncDagTraversal<Task, Task, TaskId>,
]) {
  for (const shape of ['tagged', 'legacy'] as const) {
    test.each([42, undefined])(
      `${Traversal.name} ${shape} accepts an own getter ID %p`,
      async (id) => {
        const vertex = {
          get vertexId() {
            return id;
          },
          vertexContent: { $data: 'root', $childHints: [] },
        };
        const runner = new Traversal({
          traversableGraph: {
            makeRoot: () =>
              shape === 'tagged' ? { kind: 'found', vertex } : vertex,
            makeVertex: () => ({
              kind: 'omitted',
              satisfiesDependencies: true,
            }),
          },
        }).makeRunner();
        await runner.run();
        const graph = runner.getResolvedGraph();
        const ref = graph.getVertexRefById(id)!;
        expect(graph.getVertexId(ref)).toBe(id);
        expect(runner.summary().completedWorkIds).toEqual([id]);
      },
    );

    test.each([undefined, null, { original: true }])(
      `${Traversal.name} ${shape} preserves an own ID getter error %p`,
      async (error) => {
        const vertex = {
          get vertexId(): number {
            throw error;
          },
          vertexContent: { $data: 'root', $childHints: [] },
        };
        const runner = new Traversal({
          traversableGraph: {
            makeRoot: () =>
              shape === 'tagged' ? { kind: 'found', vertex } : vertex,
            makeVertex: () => ({
              kind: 'omitted',
              satisfiesDependencies: true,
            }),
          },
        }).makeRunner();
        await expect(async () => {
          await runner.run();
        }).rejects.toBe(error);
        expect(runner.getResolvedGraph().getVertexRefs()).toEqual([]);
      },
    );
  }
}

for (const Traversal of [
  DagTraversal<NumericTask, NumericTask, number>,
  AsyncDagTraversal<NumericTask, NumericTask, number>,
]) {
  test(`${Traversal.name} validates and schedules the same captured tagged payload`, async () => {
    let reads = 0;
    const original = {
      vertexId: 7,
      vertexContent: { $data: 'own', $childHints: [] },
    };
    const inherited = new InheritedIdResult();
    const runner = new Traversal({
      traversableGraph: {
        makeRoot: () => ({
          kind: 'found',
          get vertex() {
            reads += 1;
            return reads === 1 ? original : inherited;
          },
        }),
        makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true }),
      },
    }).makeRunner();
    await runner.run();
    expect(reads).toBe(1);
    expect(runner.summary().completedWorkIds).toEqual([7]);
    const graph = runner.getResolvedGraph();
    expect(graph.getVertexRefById(7)!.unref().getData()).toBe('own');
  });
}
