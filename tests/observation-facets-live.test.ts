import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  MutableValueReference,
  MutableResolvedTreeStore,
  MutableTreeVertexTopologyRecord,
  Vertex,
  type VertexDataAndChildHintTypes,
} from '../src';

test('standalone live facets refresh mutable vertex hints without changing retained hint snapshots', () => {
  type T = VertexDataAndChildHintTypes<string, { label: string }>;
  const vertex = new Vertex<T>({
    $vertexData: 'root',
    $childDiscoveryHints: [],
  });
  const ref = new MutableValueReference(vertex);
  const store = new MutableResolvedTreeStore<T>();
  store.setVertexRecord(
    ref,
    new MutableTreeVertexTopologyRecord<T>({
      metadata: { childDiscoveryContext: null },
      childReferences: [],
    }),
  );
  store.setRootVertexReference(ref);
  const view = store.getLiveReadOnlyTreeView();
  const handle = view.getRootVertexHandleOrNull()!;
  const observed = handle.getCurrentVertexView();
  const oldHints = observed.getDetachedChildDiscoveryHints();
  const oldFieldHints = observed.$childDiscoveryHints;
  const hint = { label: 'new-child' };

  vertex.getMutableChildDiscoveryHints().push(hint);

  const currentHandle = store
    .getLiveReadOnlyTreeView()
    .getRootVertexHandleOrNull()!;
  expect(currentHandle).toBe(handle);
  expect(currentHandle.getCurrentVertexView()).toBe(observed);
  const currentHints = currentHandle
    .getCurrentVertexView()
    .getDetachedChildDiscoveryHints();
  expect(currentHints).toEqual([hint]);
  expect(currentHandle.getCurrentVertexView().$childDiscoveryHints).toEqual([
    hint,
  ]);
  expect(currentHandle.getCurrentVertexView().hasChildDiscoveryHints()).toBe(
    true,
  );
  expect(
    currentHandle
      .getCurrentVertexView()
      .createEditableShallowCloneWithContentOverrides()
      .getMutableChildDiscoveryHints(),
  ).toEqual(currentHints);
  expect(currentHints[0]).toBe(hint);
  expect(Object.isFrozen(hint)).toBe(false);
  expect(Object.isFrozen(currentHints)).toBe(true);
  expect(currentHints).not.toBe(vertex.getMutableChildDiscoveryHints());
  expect(oldHints).toEqual([]);
  expect(oldFieldHints).toEqual([]);
  expect(Object.isFrozen(oldHints)).toBe(true);
  expect(Object.isFrozen(oldFieldHints)).toBe(true);

  const replacement = { label: 'replacement' };
  vertex.getMutableChildDiscoveryHints()[0] = replacement;
  expect(observed.getDetachedChildDiscoveryHints()).toEqual([replacement]);
  expect(observed.$childDiscoveryHints[0]).toBe(replacement);
  expect(currentHints).toEqual([hint]);
  vertex.getMutableChildDiscoveryHints().length = 0;
  expect(observed.getDetachedChildDiscoveryHints()).toEqual([]);
  expect(observed.hasChildDiscoveryHints()).toBe(false);
  expect(
    observed
      .createEditableShallowCloneWithContentOverrides()
      .getMutableChildDiscoveryHints(),
  ).toEqual([]);
});

for (const Builder of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Builder.name} freezes copied work and subgraph dependency arrays shallowly`, async () => {
    const workId = { label: 'work' };
    const completeId = Symbol('complete');
    const work = [workId];
    const complete = [completeId];
    const runner = new Builder<VertexDataAndChildHintTypes<string, unknown>>({
      sourceRootIsHiddenEntryHolder: true,
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexContentInput: {
              $vertexData: 'holder',
              $childDiscoveryHints: [workId, completeId, 'child'],
            },
          },
        }),
        resolveChildHint: (id) => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: id,
            ...(id === 'child'
              ? {
                  workWaitsForWorkOf: work,
                  workWaitsForSubgraphCompletionOf: complete,
                }
              : {}),
            vertexContentInput: {
              $vertexData: 'vertex',
              $childDiscoveryHints: [],
            },
          },
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const graph = runner.getLiveResolvedGraphView();
    const child = graph.getVertexHandleByIdOrNull('child')!;
    const record = graph.getVertexSnapshotOrNull(child)!;
    expect(Object.isFrozen(record.workWaitsForWorkOf)).toBe(true);
    expect(Object.isFrozen(record.workWaitsForSubgraphCompletionOf)).toBe(true);
    expect(record.workWaitsForWorkOf).not.toBe(work);
    expect(record.workWaitsForSubgraphCompletionOf).not.toBe(complete);
    expect(record.workWaitsForWorkOf[0]).toBe(workId);
    expect(record.workWaitsForSubgraphCompletionOf![0]).toBe(completeId);
    expect(Object.isFrozen(workId)).toBe(false);
    expect(Reflect.set(record.workWaitsForWorkOf, 0, 'tamper')).toBe(false);
    expect(
      Reflect.set(record.workWaitsForSubgraphCompletionOf!, 0, 'tamper'),
    ).toBe(false);
    expect(graph.getVertexSnapshotOrNull(child)!.workWaitsForWorkOf).toEqual([
      workId,
    ]);
    expect(
      graph.getVertexSnapshotOrNull(child)!.workWaitsForSubgraphCompletionOf,
    ).toEqual([completeId]);
    expect(
      graph.getVertexSnapshotOrNull(graph.getVertexHandleByIdOrNull(workId)!)!
        .workWaitsForSubgraphCompletionOf,
    ).toBeUndefined();
  });
}

for (const Builder of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Builder.name} projects deliberately skipped child discovery without resolving hints`, async () => {
    const rootId = Symbol('root');
    const hint = { label: 'unresolved-child' };
    let childResolutionCalls = 0;
    const runner = new Builder<
      VertexDataAndChildHintTypes<string, typeof hint>
    >({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          resolvedVertexInput: {
            vertexId: rootId,
            vertexContentInput: {
              $vertexData: 'root',
              $childDiscoveryHints: [hint],
            },
          },
        }),
        resolveChildHint: () => {
          childResolutionCalls++;
          return {
            kind: 'vertexIntentionallyOmitted',
            omittedVertexIdentity: null,
            satisfiesWorkAndSubgraphCompletionPrerequisites: true,
          };
        },
      },
      visitors: {
        [DagVisitorPhase.ON_WORK_READY]: () => ({
          commands: [
            {
              commandName:
                Command.SKIP_PENDING_CHILD_DISCOVERY_OF_CURRENT_VERTEX,
            },
          ],
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    const graph = runner.getLiveResolvedGraphView();
    const root = graph.getVertexHandleByIdOrNull(rootId)!;
    const slots =
      graph.getVertexSnapshotOrNull(root)!.orderedChildDiscoverySlots;
    expect(slots).toEqual([
      { kind: 'discoverySkipped', childDiscoveryHint: hint },
    ]);
    expect(slots[0]!.childDiscoveryHint).toBe(hint);
    expect(graph.getStructuralChildHandlesInSlotOrderOrNull(root)).toEqual([]);
    expect(childResolutionCalls).toBe(0);
  });
}
