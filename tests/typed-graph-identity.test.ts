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
