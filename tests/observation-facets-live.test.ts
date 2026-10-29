import {
  AsyncDagTraversal,
  DagTraversal,
  MutableRef,
  ResolvedTreeStore,
  TreeVertexRecord,
  Vertex,
  type VertexTypes,
} from '../src';

test('standalone live facets refresh mutable vertex hints without changing retained hint snapshots', () => {
  type T = VertexTypes<string, { label: string }>;
  const vertex = new Vertex<T>({ $data: 'root', $childHints: [] });
  const ref = new MutableRef(vertex);
  const store = new ResolvedTreeStore<T>();
  store.set(
    ref,
    new TreeVertexRecord<T>({
      metadata: { resolutionContext: null },
      children: [],
    }),
  );
  store.setRoot(ref);
  const view = store.asReadOnly();
  const handle = view.getRoot()!;
  const observed = handle.getValue();
  const oldHints = observed.getChildrenHints();
  const oldFieldHints = observed.$childHints;
  const hint = { label: 'new-child' };

  vertex.getChildrenHints().push(hint);

  const currentHandle = store.asReadOnly().getRoot()!;
  expect(currentHandle).toBe(handle);
  expect(currentHandle.getValue()).toBe(observed);
  const currentHints = currentHandle.getValue().getChildrenHints();
  expect(currentHints).toEqual([hint]);
  expect(currentHandle.getValue().$childHints).toEqual([hint]);
  expect(currentHandle.getValue().hasNoChildHints()).toBe(false);
  expect(currentHandle.getValue().clone().getChildrenHints()).toEqual(
    currentHints,
  );
  expect(currentHints[0]).toBe(hint);
  expect(Object.isFrozen(hint)).toBe(false);
  expect(Object.isFrozen(currentHints)).toBe(true);
  expect(currentHints).not.toBe(vertex.getChildrenHints());
  expect(oldHints).toEqual([]);
  expect(oldFieldHints).toEqual([]);
  expect(Object.isFrozen(oldHints)).toBe(true);
  expect(Object.isFrozen(oldFieldHints)).toBe(true);

  const replacement = { label: 'replacement' };
  vertex.getChildrenHints()[0] = replacement;
  expect(observed.getChildrenHints()).toEqual([replacement]);
  expect(observed.$childHints[0]).toBe(replacement);
  expect(currentHints).toEqual([hint]);
  vertex.getChildrenHints().length = 0;
  expect(observed.getChildrenHints()).toEqual([]);
  expect(observed.hasNoChildHints()).toBe(true);
  expect(observed.clone().getChildrenHints()).toEqual([]);
});

for (const Builder of [DagTraversal, AsyncDagTraversal]) {
  test(`${Builder.name} freezes copied work and subgraph dependency arrays shallowly`, async () => {
    const workId = { label: 'work' };
    const completeId = Symbol('complete');
    const work = [workId];
    const complete = [completeId];
    const runner = new Builder<VertexTypes<string, unknown>>({
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found',
          vertex: {
            vertexContent: {
              $data: 'holder',
              $childHints: [workId, completeId, 'child'],
            },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found',
          vertex: {
            vertexId: id,
            ...(id === 'child'
              ? { dependsOnWork: work, dependsOnSubgraphCompletion: complete }
              : {}),
            vertexContent: { $data: 'vertex', $childHints: [] },
          },
        }),
      },
    }).createRunner();
    await runner.run();
    const graph = runner.getResolvedGraphView();
    const child = graph.getVertexRefById('child')!;
    const record = graph.get(child)!;
    expect(Object.isFrozen(record.dependsOnWork)).toBe(true);
    expect(Object.isFrozen(record.dependsOnSubgraphCompletion)).toBe(true);
    expect(record.dependsOnWork).not.toBe(work);
    expect(record.dependsOnSubgraphCompletion).not.toBe(complete);
    expect(record.dependsOnWork[0]).toBe(workId);
    expect(record.dependsOnSubgraphCompletion![0]).toBe(completeId);
    expect(Object.isFrozen(workId)).toBe(false);
    expect(Reflect.set(record.dependsOnWork, 0, 'tamper')).toBe(false);
    expect(Reflect.set(record.dependsOnSubgraphCompletion!, 0, 'tamper')).toBe(
      false,
    );
    expect(graph.get(child)!.dependsOnWork).toEqual([workId]);
    expect(graph.get(child)!.dependsOnSubgraphCompletion).toEqual([completeId]);
    expect(
      graph.get(graph.getVertexRefById(workId)!)!.dependsOnSubgraphCompletion,
    ).toBeUndefined();
  });
}
