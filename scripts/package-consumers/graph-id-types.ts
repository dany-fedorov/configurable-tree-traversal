// Packed public contracts; exercise actual calls under both declaration loaders.
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase,
  traverseDag,
  traverseDagAsync,
} from 'configurable-tree-traversal';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
  TreeDiscoverySource,
  VertexDataAndChildHintTypes,
  DagSourceVertexResolution,
  FoundDagSourceVertex,
  OmittedDagSourceVertex,
  ChildHintVertexIdentity,
  LiveResolvedGraphView,
  PreCommandDiscoveredGraphView,
  DagProgressSnapshot,
  DagVertexProgress,
  DagTraversalStallDiagnostics,
} from 'configurable-tree-traversal';

type W = VertexDataAndChildHintTypes<string, string>;
type R = VertexDataAndChildHintTypes<number, { next: string }>;
const source: DagDiscoverySource<W, W, string> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: 'a',
      vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
      workWaitsForWorkOf: ['b'],
      workWaitsForSubgraphCompletionOf: ['c'],
    },
  }),
  resolveChildHint: (id, options) => {
    const graph: LiveResolvedGraphView<W, string> =
      options.liveResolvedGraphView;
    const snapshot: PreCommandDiscoveredGraphView<W, string> | null =
      options.preCommandDiscoveredGraphView;
    graph.getVertexHandleByIdOrNull(id);
    // @ts-expect-error Selected ID domain applies to source graph views.
    graph.getVertexHandleByIdOrNull(1);
    void snapshot;
    return {
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexId: id,
        vertexContentInput: { $vertexData: id, $childDiscoveryHints: [] },
      },
    };
  },
  resolvePrerequisiteByVertexId: (id) => {
    const typed: string = id;
    return {
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: { vertexId: typed },
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    };
  },
  tryGetVertexIdentityFromHint: (id) => ({ vertexId: id }),
};
const traversal = new DagTraversalBuilder<W, W, string>({
  dagDiscoverySource: source,
  acceptedCompletedWorkVertexIds: new Set(['b']),
});
const runner = traversal.createIndependentRunnerFromCurrentOptions();
const ids: readonly string[] =
  runner.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds;
const captureProgressSnapshot: DagProgressSnapshot<string> =
  runner.captureProgressSnapshot();
const progress: DagVertexProgress<string> | undefined =
  captureProgressSnapshot.progressByVertexId.get('a');
const diagnostics: DagTraversalStallDiagnostics<string> | null =
  captureProgressSnapshot.invalidDependencyTopologyDiagnostics;
const graph = runner.getLiveResolvedGraphView();
const ref = graph.getVertexHandleByIdOrNull('a');
if (ref !== null) {
  const id: string = graph.requireVertexId(ref);
  const alias: string = graph.requireVertexId(ref);
  const dependencies: readonly string[] | undefined =
    graph.getVertexSnapshotOrNull(ref)?.workWaitsForWorkOf;
  void [id, alias, dependencies];
}
graph.getVertexHandleByIdOrNull('a');
runner.settleDeferredWork('a', { kind: 'workCompleted' }, Symbol());
// @ts-expect-error String IDs reject numbers at settlement.
runner.settleDeferredWork(42, { kind: 'workCompleted' }, Symbol());
// @ts-expect-error String IDs reject objects at lookup.
graph.getVertexHandleByIdOrNull({});
// @ts-expect-error Compatibility aliases preserve the same ID domain.
graph.getVertexHandleByIdOrNull(42);
// @ts-expect-error Source prerequisite lookup accepts only strings.
source.resolvePrerequisiteByVertexId?.(42);
// @ts-expect-error Progress map lookup preserves ID.
captureProgressSnapshot.progressByVertexId.get(42);
traversal.patchOptionsForFutureRunners({
  // @ts-expect-error Configured completed work must use the source ID domain.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
new DagTraversalBuilder<W, W, string>({
  dagDiscoverySource: source,
  // @ts-expect-error Constructor completed work must use the selected ID domain.
  acceptedCompletedWorkVertexIds: new Set([{}]),
});
traversal.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_WORK_READY,
  (_vertex, options) => {
    const view: LiveResolvedGraphView<W, string> =
      options.liveResolvedGraphView;
    // @ts-expect-error Visitor graph ID lookup is checked.
    view.getVertexHandleByIdOrNull(42);
  },
);

const inferred = new DagTraversalBuilder({
  dagDiscoverySource: source,
}).createIndependentRunnerFromCurrentOptions();
const inferredIds: readonly string[] =
  inferred.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds;
// @ts-expect-error Constructor inference retains the source ID domain.
inferred.settleDeferredWork(42, { kind: 'workCompleted' }, Symbol());
const helper = traverseDag({ dagDiscoverySource: source });
const helperIds: readonly string[] =
  helper.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds;
// @ts-expect-error New helper inference retains the source ID domain.
helper.getLiveResolvedGraphView().getVertexHandleByIdOrNull(42);
const legacyHelper = traverseDag({ ...{ dagDiscoverySource: source } });
const legacyIds: readonly string[] =
  legacyHelper.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds;
// @ts-expect-error Deprecated helper inference retains the source ID domain.
legacyHelper.settleDeferredWork({}, { kind: 'workCompleted' }, Symbol());

const asyncSource: AsyncDagDiscoverySource<W, W, string> = source;
const asyncTraversal = new AsyncDagTraversalBuilder({
  dagDiscoverySource: asyncSource,
});
const asyncRunner = asyncTraversal.createIndependentRunnerFromCurrentOptions();
const asyncIds: readonly string[] =
  asyncRunner.captureProgressSnapshot()
    .workVisitorReadyOrWorkCompletionDeferredVertexIds;
// @ts-expect-error Async inferred settlement uses string IDs.
asyncRunner.settleDeferredWork(42, { kind: 'workCompleted' }, Symbol());
asyncTraversal.patchOptionsForFutureRunners({
  // @ts-expect-error Async configure checks completed work IDs.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
async function asyncHelpers() {
  const current = await traverseDagAsync({ dagDiscoverySource: asyncSource });
  const old = await traverseDagAsync({
    ...{ dagDiscoverySource: asyncSource },
  });
  const a: readonly string[] =
    current.captureProgressSnapshot()
      .workVisitorReadyOrWorkCompletionDeferredVertexIds;
  const b: readonly string[] =
    old.captureProgressSnapshot()
      .workVisitorReadyOrWorkCompletionDeferredVertexIds;
  // @ts-expect-error Async helper inferred ID domain.
  current.settleDeferredWork(42, { kind: 'workCompleted' }, Symbol());
  // @ts-expect-error Async deprecated helper inferred ID domain.
  old.getLiveResolvedGraphView().getVertexHandleByIdOrNull({});
  void [a, b];
}

const missingTagged: FoundDagSourceVertex<W, string> = {
  kind: 'vertexResolved',
  // @ts-expect-error Typed found content cannot fall back to a generated UUID.
  resolvedVertexInput: {
    vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
  },
};
const canonicalFound: DagSourceVertexResolution<W, string> = {
  kind: 'vertexResolved',
  resolvedVertexInput: {
    vertexId: 'a',
    vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
  },
};
const missingLegacy: DagSourceVertexResolution<W, string> = {
  // @ts-expect-error Untagged live source content is removed.
  vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
};
void canonicalFound;
const missingUnion: DagSourceVertexResolution<W, string> = {
  kind: 'vertexResolved',
  // @ts-expect-error Source union must not admit tagged missing IDs.
  resolvedVertexInput: {
    vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
  },
};
const omitted: OmittedDagSourceVertex<string> = {
  omittedVertexIdentity: null,
  kind: 'vertexIntentionallyOmitted',
  satisfiesWorkAndSubgraphCompletionPrerequisites: true,
};
const legacyOmitted: DagSourceVertexResolution<W, string> = {
  // @ts-expect-error Untagged graph omission is removed.
  vertexContentInput: null,
};
const wrongDependency: FoundDagSourceVertex<W, string> = {
  kind: 'vertexResolved',
  resolvedVertexInput: {
    vertexId: 'a',
    vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    // @ts-expect-error Work dependencies use the selected ID type.
    workWaitsForWorkOf: [42],
  },
};
const wrongComplete: FoundDagSourceVertex<W, string> = {
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexId: 'a',
    vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    // @ts-expect-error Completion dependencies use the selected ID type.
    workWaitsForSubgraphCompletionOf: [{}],
  },
};
// @ts-expect-error Hint IDs use the selected domain independently of hints.
const wrongHint: ChildHintVertexIdentity<string> = { vertexId: 42 };
const tree: TreeDiscoverySource<W> = {
  resolveRootVertex: () => ({ kind: 'vertexIntentionallyOmitted' }),
  resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
};
// @ts-expect-error Generated tree identities cannot promise a string ID domain.
new DagTraversalBuilder<W, W, string>({ treeDiscoverySource: tree });
// @ts-expect-error Async tree identities cannot promise a string ID domain.
new AsyncDagTraversalBuilder<W, W, string>({ treeDiscoverySource: tree });
// @ts-expect-error Helper tree identities cannot promise a string ID domain.
traverseDag<W, W, string>({ treeDiscoverySource: tree });
// @ts-expect-error Async helper tree identities cannot promise a string ID domain.
traverseDagAsync<W, W, string>({ treeDiscoverySource: tree });
// @ts-expect-error Configure cannot introduce tree identities to a typed graph.
traversal.patchOptionsForFutureRunners({ treeDiscoverySource: tree });

function arbitraryIds<ID>(id: ID) {
  const typed: DagDiscoverySource<W, W, ID> = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexId: id,
        vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
      },
    }),
    resolveChildHint: () => ({
      omittedVertexIdentity: null,
      kind: 'vertexIntentionallyOmitted',
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    }),
    tryGetVertexIdentityFromHint: () => ({ vertexId: id }),
  };
  const runUntilSuspendedOrTerminal = new DagTraversalBuilder<W, W, ID>({
    dagDiscoverySource: typed,
    acceptedCompletedWorkVertexIds: new Set([id]),
  }).createIndependentRunnerFromCurrentOptions();
  runUntilSuspendedOrTerminal.settleDeferredWork(
    id,
    { kind: 'workCompleted' },
    Symbol(),
  );
  runUntilSuspendedOrTerminal
    .getLiveResolvedGraphView()
    .getVertexHandleByIdOrNull(id);
  const result: readonly ID[] =
    runUntilSuspendedOrTerminal.captureProgressSnapshot()
      .workVisitorReadyOrWorkCompletionDeferredVertexIds;
  return result;
}
declare const branded: string & { readonly taskId: unique symbol };
arbitraryIds(branded);
arbitraryIds({ task: 'a' });
arbitraryIds(Symbol());
arbitraryIds(undefined);
arbitraryIds<string | undefined>('a');
arbitraryIds<string | number>(42);
const unknownSource: DagDiscoverySource<W> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    },
  }),
  resolveChildHint: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    },
  }),
};
new DagTraversalBuilder({ dagDiscoverySource: unknownSource })
  .createIndependentRunnerFromCurrentOptions()
  .settleDeferredWork({}, { kind: 'workCompleted' }, Symbol());
new DagTraversalBuilder({ treeDiscoverySource: tree });
const rewriteSource: DagDiscoverySource<W, R, string> = {
  resolveRootVertex: source.resolveRootVertex,
  resolveChildHint: (hint, options) => {
    const rewrittenGraph: LiveResolvedGraphView<W | R, string> =
      options.liveResolvedGraphView;
    const original: PreCommandDiscoveredGraphView<W, string> | null =
      options.preCommandDiscoveredGraphView;
    const data: string = hint;
    void [rewrittenGraph, original];
    return {
      kind: 'vertexResolved' as const,
      resolvedVertexInput: {
        vertexId: hint,
        vertexContentInput: { $vertexData: data, $childDiscoveryHints: [] },
      },
    };
  },
};
new DagTraversalBuilder<W, R, string>({
  dagDiscoverySource: rewriteSource,
}).registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_WORK_READY,
  (vertex, options) => {
    const data: string | number = vertex.$vertexData;
    const view: LiveResolvedGraphView<W | R, string> =
      options.liveResolvedGraphView;
    void [data, view];
  },
);
void [
  ids,
  progress,
  diagnostics,
  inferredIds,
  helperIds,
  legacyIds,
  asyncIds,
  asyncHelpers,
  missingTagged,
  missingLegacy,
  missingUnion,
  omitted,
  legacyOmitted,
  wrongDependency,
  wrongComplete,
  wrongHint,
];

const containerGraph: LiveResolvedGraphView<W, string> =
  runner.getLiveResolvedGraphView();
const containerSnapshot: PreCommandDiscoveredGraphView<W, string> | null =
  runner.preCommandDiscoveredGraphView;
// @ts-expect-error Public graph lookups retain the ID domain.
runner.getLiveResolvedGraphView().getVertexHandleByIdOrNull(42);
// @ts-expect-error Raw container state is not a public capability.
runner.resolvedGraphsContainer;
// @ts-expect-error The exposed snapshot alias retains the ID domain.
containerSnapshot?.getVertexHandleByIdOrNull(42);
// @ts-expect-error The runner snapshot retains the ID domain.
runner.preCommandDiscoveredGraphView?.getVertexHandleByIdOrNull(42);
new DagTraversalBuilder({
  dagDiscoverySource: source,
  // @ts-expect-error Inferred constructors cannot seed wrong-domain completed work.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
traverseDag({
  dagDiscoverySource: source,
  // @ts-expect-error Inferred new helpers cannot seed wrong-domain completed work.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
traverseDag({
  dagDiscoverySource: source,
  // @ts-expect-error Options-object helpers cannot seed wrong-domain work.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
new AsyncDagTraversalBuilder({
  dagDiscoverySource: asyncSource,
  // @ts-expect-error Inferred async constructors cannot seed wrong-domain completed work.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
traverseDagAsync({
  dagDiscoverySource: asyncSource,
  // @ts-expect-error Inferred async helpers cannot seed wrong-domain completed work.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
traverseDagAsync({
  dagDiscoverySource: asyncSource,
  // @ts-expect-error Options-object helpers cannot seed wrong-domain work.
  acceptedCompletedWorkVertexIds: new Set([42]),
});
const missingRoot: DagDiscoverySource<W, W, string> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    // @ts-expect-error Actual source root callbacks require an explicit live identity.
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    },
  }),
  resolveChildHint: source.resolveChildHint,
};
const missingChild: AsyncDagDiscoverySource<W, W, string> = {
  resolveRootVertex: source.resolveRootVertex,
  // @ts-expect-error Async legacy source child callbacks require an explicit live identity.
  resolveChildHint: async () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
    },
  }),
};
const wrongSourceDependency: DagDiscoverySource<W, W, string> = {
  // prettier-ignore
  // @ts-expect-error Actual source callbacks reject wrong-domain dependencies.
  resolveRootVertex: () => ({ kind: "vertexResolved" as const, resolvedVertexInput: { vertexId: 'a', workWaitsForWorkOf: [42], vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] } } }),
  resolveChildHint: source.resolveChildHint,
};
declare const brandedSource: DagDiscoverySource<W, W, typeof branded>;
const brandedRunner = new DagTraversalBuilder({
  dagDiscoverySource: brandedSource,
}).createIndependentRunnerFromCurrentOptions();
brandedRunner.settleDeferredWork(branded, { kind: 'workCompleted' }, Symbol());
// @ts-expect-error Unbranded strings cannot settle branded-ID work.
brandedRunner.settleDeferredWork('a', { kind: 'workCompleted' }, Symbol());
const rewriting = new DagTraversalBuilder({
  dagDiscoverySource: rewriteSource,
});
const rewritingIds: readonly string[] = rewriting
  .createIndependentRunnerFromCurrentOptions()
  .captureProgressSnapshot().workVisitorReadyOrWorkCompletionDeferredVertexIds;
rewriting.registerVisitorCallbackForPhase(
  DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY,
  (_vertex, options) => {
    const view: LiveResolvedGraphView<W | R, string> =
      options.liveResolvedGraphView;
    // @ts-expect-error Rewriting does not broaden the ID domain.
    view.getVertexHandleByIdOrNull({});
  },
);
void [
  containerGraph,
  missingRoot,
  missingChild,
  wrongSourceDependency,
  rewritingIds,
];

// Public views retain the caller's identity domain and hide synthetic holders.
if (ref !== null) {
  const publicId: string = containerGraph.requireVertexId(ref);
  // @ts-expect-error Public string IDs cannot become synthetic symbols.
  const syntheticId: symbol = containerGraph.requireVertexId(ref);
  void [publicId, syntheticId];
}

// Canonical found results remain extensible object types.
interface DefaultFoundResult extends FoundDagSourceVertex<W> {
  note?: string;
}
const extendedDefault: DefaultFoundResult = {
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexContentInput: { $vertexData: 'a', $childDiscoveryHints: [] },
  },
};
void extendedDefault;
