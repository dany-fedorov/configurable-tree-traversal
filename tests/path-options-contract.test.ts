import { createVertexHandleFacet } from '../src/core/observationFacets';
import {
  AsyncDagTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  MutableValueReference,
  ObjectPropertyTreeSource,
  MutableResolvedTreeStore,
  MutableTreeVertexTopologyRecord,
  Vertex,
  type StructuralAncestorPathOptions,
  type VertexDataAndChildHintTypes,
} from '../src';

type Query = (options?: StructuralAncestorPathOptions) => unknown;
function verifyQuery(query: Query) {
  const defaultPath = query();
  expect(query({})).toEqual(defaultPath);
  expect(
    query({ includeDesignatedRoot: undefined, includeTargetVertex: undefined }),
  ).toEqual(defaultPath);
  for (const key of ['noRot', Symbol('includeTargetVertex')]) {
    expect(() =>
      query(Object.defineProperty({}, key, { value: true }) as never),
    ).toThrow(TypeError);
  }
  for (const value of [null, 1, 'yes'])
    expect(() => query({ includeDesignatedRoot: value } as never)).toThrow(
      TypeError,
    );
  expect(() => query({ includeTargetVertex: null } as never)).toThrow(
    TypeError,
  );
  expect(() => query(null as never)).toThrow(TypeError);
  let reads = 0;
  query({
    get includeDesignatedRoot() {
      reads++;
      return true;
    },
  });
  expect(reads).toBe(1);
}

for (const create of [
  () =>
    new DepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource({ a: 1 }),
      retainDiscoveredTreeBeforeVisitorCommands: true,
    }),
  () =>
    new AsyncDepthFirstTreeTraversalBuilder({
      treeDiscoverySource: new ObjectPropertyTreeSource({ a: 1 }),
      retainDiscoveredTreeBeforeVisitorCommands: true,
    }),
])
  test('tree live and original path option bags are strict and detached', async () => {
    const traversal = create();
    traversal.registerVisitorForPhase(
      DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
      (_vertex, context) => {
        const view = context.livePreCommandDiscoveredTreeView!;
        verifyQuery((options) =>
          view.requireStructuralAncestorPathTo(
            view.getRootVertexHandleOrNull()!,
            options,
          ),
        );
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    for (const view of [runner.getLiveResolvedTreeView()]) {
      const root = view.getRootVertexHandleOrNull()!;
      verifyQuery((options) =>
        view.requireStructuralAncestorPathTo(root, options),
      );
      expect(
        view.requireStructuralAncestorPathTo(root, {
          includeDesignatedRoot: false,
          includeTargetVertex: false,
        }),
      ).toEqual([]);
    }
  });

const id = { opaque: true };
const graph = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: id,
      vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted' as const,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
};
for (const create of [
  () =>
    new DagTraversalBuilder({
      dagDiscoverySource: graph,
      retainDiscoveredGraphBeforeVisitorCommands: true,
    }).createIndependentRunnerFromCurrentOptions(),
  () =>
    new AsyncDagTraversalBuilder({
      dagDiscoverySource: graph,
      retainDiscoveredGraphBeforeVisitorCommands: true,
    }).createIndependentRunnerFromCurrentOptions(),
])
  test('graph live and original path options reject unknown fields and retain opaque IDs', async () => {
    const runner = create();
    await runner.runUntilSuspendedOrTerminal();
    for (const view of [
      runner.getLiveResolvedGraphView(),
      runner.livePreCommandDiscoveredGraphView!,
    ]) {
      const root = view.getDesignatedRootHandleOrNull()!;
      verifyQuery((options) =>
        view.requireAllStructuralAncestorPathsTo(root, options),
      );
      expect(view.requireVertexId(root)).toBe(id);
      expect(
        view.requireAllStructuralAncestorPathsTo(root, {
          includeDesignatedRoot: false,
          includeTargetVertex: false,
        }),
      ).toEqual([[]]);
    }
  });

test('explicit tree store and its graph route share strict path option semantics', () => {
  type T = VertexDataAndChildHintTypes<number, never>;
  const root = new MutableValueReference(
    new Vertex<T>({ $vertexData: 1, $childDiscoveryHints: [] }),
  );
  const store = new MutableResolvedTreeStore<T>();
  store.setVertexRecord(
    root,
    new MutableTreeVertexTopologyRecord<T>({
      metadata: { childDiscoveryContext: null },
      childReferences: [],
    }),
  );
  store.setRootVertexReference(root);
  verifyQuery((options) =>
    store.requireStructuralAncestorPathTo(root, options),
  );
  verifyQuery((options) =>
    store
      .getLiveResolvedGraphView()
      .requireAllStructuralAncestorPathsTo(
        createVertexHandleFacet(root),
        options,
      ),
  );
});

test('graph query controls read accessors once across multiple paths', () => {
  type T = VertexDataAndChildHintTypes<string, string>;
  const data: Record<string, string[]> = {
    root: ['left', 'right'],
    left: ['leaf'],
    right: ['leaf'],
    leaf: [],
  };
  const found = (vertexId: string) => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId,
      vertexContentInput: {
        $vertexData: vertexId,
        $childDiscoveryHints: data[vertexId]!,
      },
    },
  });
  const runner = new DagTraversalBuilder<T, T, string>({
    retainDiscoveredGraphBeforeVisitorCommands: true,
    dagDiscoverySource: {
      resolveRootVertex: () => found('root'),
      resolveChildVertexFromHint: (hint) => found(hint),
      tryGetVertexIdentityFromHint: (vertexId) => ({ vertexId }),
    },
  })
    .createIndependentRunnerFromCurrentOptions()
    .runUntilSuspendedOrTerminal();
  for (const view of [
    runner.getLiveResolvedGraphView(),
    runner.livePreCommandDiscoveredGraphView!,
  ]) {
    const leaf = view.getVertexHandleByIdOrNull('leaf')!;
    let rootReads = 0;
    let selfReads = 0;
    const paths = view.requireAllStructuralAncestorPathsTo(leaf, {
      get includeDesignatedRoot() {
        rootReads++;
        return false;
      },
      get includeTargetVertex() {
        selfReads++;
        return false;
      },
    });
    expect(
      paths.map((path) => path.map((ref) => view.requireVertexId(ref))),
    ).toEqual([['left'], ['right']]);
    expect([rootReads, selfReads]).toEqual([1, 1]);
  }
});
