import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  type DagDiscoverySource,
  type VertexDataAndChildHintTypes,
} from '../src';

type TaskId = { task: string } | symbol | undefined | number;
type Task = VertexDataAndChildHintTypes<string, TaskId>;

for (const TreeTraversal of [
  DagTraversalBuilder<Task, Task, TaskId>,
  AsyncDagTraversalBuilder<Task, Task, TaskId>,
]) {
  test(`${TreeTraversal.name} preserves typed arbitrary identities through lookup, snapshots, and guarded settlement`, async () => {
    const root = { task: 'root' };
    const prerequisite = Symbol('prerequisite');
    const lookups: TaskId[] = [];
    const source: DagDiscoverySource<Task, Task, TaskId> = {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: root,
          vertexContentInput: {
            $vertexData: 'root',
            $childDiscoveryHints: [undefined, NaN],
          },
        },
      }),
      resolveChildVertexFromHint: (id) => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexId: id,
          workWaitsForWorkOf: [prerequisite],
          vertexContentInput: {
            $vertexData: 'child',
            $childDiscoveryHints: [],
          },
        },
      }),
      tryGetVertexIdentityFromHint: (id) => ({ vertexId: id }),
      resolvePrerequisiteByVertexId: (id) => {
        lookups.push(id);
        return {
          kind: 'vertexIntentionallyOmitted',
          omittedVertexIdentity: { vertexId: id },
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        };
      },
    };
    const runner = new TreeTraversal({
      dagDiscoverySource: source,
      workCompletionPolicy: 'requireExternalWorkSettlement',
      discoveryTiming: 'completeBeforeAnyVisitor',
      retainDiscoveredGraphBeforeVisitorCommands: true,
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(lookups).toEqual([prerequisite]);
    const graph = runner.getLiveResolvedGraphView();
    const snapshot = runner.livePreCommandDiscoveredGraphView!;
    for (const id of [root, undefined, NaN]) {
      const ref = graph.getVertexHandleByIdOrNull(id)!;
      expect(graph.requireVertexId(ref)).toBe(id);
      expect(graph.requireVertexId(ref)).toBe(id);
      expect(
        snapshot.requireVertexId(snapshot.getVertexHandleByIdOrNull(id)!),
      ).toBe(id);
      const generation = runner
        .captureProgressSnapshot()
        .progressByVertexId.get(id)!.settlementToken!;
      expect(() =>
        runner.settleDeferredWork(id, { kind: 'workCompleted' }, Symbol()),
      ).toThrow(/stale DAG settlement/);
      expect(
        runner.settleDeferredWork(id, { kind: 'workCompleted' }, generation),
      ).toBe(true);
    }
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([root, undefined, NaN]);
    expect(graph.getVertexHandleByIdOrNull({ task: 'root' })).toBeNull();
  });
}

type NumericTask = VertexDataAndChildHintTypes<string, number>;
class InheritedIdResult {
  get vertexId(): number {
    return 42;
  }
  vertexContentInput = { $vertexData: 'inherited', $childDiscoveryHints: [] };
}

for (const asynchronous of [false, true]) {
  for (const shape of ['tagged'] as const) {
    for (const callback of ['root', 'hint', 'prerequisite'] as const) {
      test(`${
        asynchronous ? 'async' : 'sync'
      } ${shape} ${callback} rejects an inherited ID before generated or prerequisite fallback`, async () => {
        const inherited = new InheritedIdResult();
        const result = () => ({
          kind: 'vertexResolved' as const,
          resolvedVertexInput: inherited,
        });
        const source: DagDiscoverySource<NumericTask, NumericTask, number> = {
          resolveRootVertex: () =>
            callback === 'root'
              ? result()
              : {
                  kind: 'vertexResolved' as const,
                  resolvedVertexInput: {
                    vertexId: 1,
                    workWaitsForWorkOf: callback === 'prerequisite' ? [42] : [],
                    vertexContentInput: {
                      $vertexData: 'root',
                      $childDiscoveryHints: callback === 'hint' ? [42] : [],
                    },
                  },
                },
          resolveChildVertexFromHint: result,
          resolvePrerequisiteByVertexId: result,
        };
        const runner = asynchronous
          ? new AsyncDagTraversalBuilder<NumericTask, NumericTask, number>({
              dagDiscoverySource: {
                resolveRootVertex: async () => source.resolveRootVertex(),
                resolveChildVertexFromHint: async () => result(),
                resolvePrerequisiteByVertexId: async () => result(),
              },
            }).createIndependentRunnerFromCurrentOptions()
          : new DagTraversalBuilder<NumericTask, NumericTask, number>({
              dagDiscoverySource: source,
            }).createIndependentRunnerFromCurrentOptions();
        await expect(async () => {
          await runner.runUntilSuspendedOrTerminal();
        }).rejects.toThrow(/vertexId must be an own property/);
        expect(
          runner.getLiveResolvedGraphView().getVertexHandles(),
        ).toHaveLength(callback === 'root' ? 0 : 1);
        expect(
          runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull(42),
        ).toBeNull();
      });
    }
  }
}

for (const TreeTraversal of [
  DagTraversalBuilder<Task, Task, TaskId>,
  AsyncDagTraversalBuilder<Task, Task, TaskId>,
]) {
  for (const shape of ['tagged'] as const) {
    test.each([42, undefined])(
      `${TreeTraversal.name} ${shape} accepts an own getter ID %p`,
      async (id) => {
        const vertex = {
          get vertexId() {
            return id;
          },
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        };
        const runner = new TreeTraversal({
          dagDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved',
              resolvedVertexInput: vertex,
            }),
            resolveChildVertexFromHint: () => ({
              omittedVertexIdentity: null,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              kind: 'vertexIntentionallyOmitted',
            }),
          },
        }).createIndependentRunnerFromCurrentOptions();
        await runner.runUntilSuspendedOrTerminal();
        const graph = runner.getLiveResolvedGraphView();
        const ref = graph.getVertexHandleByIdOrNull(id)!;
        expect(graph.requireVertexId(ref)).toBe(id);
        expect(
          runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        ).toEqual([id]);
      },
    );

    test.each([undefined, null, { original: true }])(
      `${TreeTraversal.name} ${shape} preserves an own ID getter error %p`,
      async (error) => {
        const vertex = {
          get vertexId(): number {
            throw error;
          },
          vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
        };
        const runner = new TreeTraversal({
          dagDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved',
              resolvedVertexInput: vertex,
            }),
            resolveChildVertexFromHint: () => ({
              omittedVertexIdentity: null,
              satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
              kind: 'vertexIntentionallyOmitted',
            }),
          },
        }).createIndependentRunnerFromCurrentOptions();
        await expect(async () => {
          await runner.runUntilSuspendedOrTerminal();
        }).rejects.toBe(error);
        expect(runner.getLiveResolvedGraphView().getVertexHandles()).toEqual(
          [],
        );
      },
    );
  }
}

for (const TreeTraversal of [
  DagTraversalBuilder<NumericTask, NumericTask, number>,
  AsyncDagTraversalBuilder<NumericTask, NumericTask, number>,
]) {
  test(`${TreeTraversal.name} validates and schedules the same captured tagged payload`, async () => {
    let reads = 0;
    const original = {
      vertexId: 7,
      vertexContentInput: { $vertexData: 'own', $childDiscoveryHints: [] },
    };
    const inherited = new InheritedIdResult();
    const runner = new TreeTraversal({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          get resolvedVertexInput() {
            reads += 1;
            return reads === 1 ? original : inherited;
          },
        }),
        resolveChildVertexFromHint: () => ({
          omittedVertexIdentity: null,
          satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
          kind: 'vertexIntentionallyOmitted',
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(reads).toBe(1);
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual([7]);
    const graph = runner.getLiveResolvedGraphView();
    expect(
      graph
        .getVertexHandleByIdOrNull(7)!
        .getCurrentVertexView()
        .getVertexData(),
    ).toBe('own');
  });
}
