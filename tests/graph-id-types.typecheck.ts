import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
  TreeSource,
  VertexTypes,
  DagVertexResolution,
  DagVertexFound,
  MakeVertexResult,
  DagVertexOmitted,
  HintVertexId,
  ResolvedGraph,
  ResolvedGraphSnapshot,
  DagSummary,
  DagVertexProgress,
  DagTraversalStallDiagnostics,
} from '../src';

type W = VertexTypes<string, string>;
type R = VertexTypes<number, { next: string }>;
const source: DagDiscoverySource<W, W, string> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: {
      vertexId: 'a',
      vertexContent: { $data: 'a', $childHints: [] },
      dependsOn: ['b'],
      dependsOnComplete: ['c'],
    },
  }),
  resolveChild: (id, options) => {
    const graph: ResolvedGraph<W, string> = options.resolvedGraph;
    const snapshot: ResolvedGraphSnapshot<W, string> | null =
      options.notMutatedResolvedGraph;
    graph.getVertexRefById(id);
    // @ts-expect-error Selected ID domain applies to source graph views.
    graph.getVertexRefById(1);
    void snapshot;
    return {
      kind: 'found',
      vertex: { vertexId: id, vertexContent: { $data: id, $childHints: [] } },
    };
  },
  resolvePrerequisite: (id) => {
    const typed: string = id;
    return { kind: 'omitted', vertexId: typed, satisfiesDependencies: true };
  },
  getVertexIdFromHint: (id) => ({ vertexId: id }),
};
const traversal = new DagTraversal<W, W, string>({
  traversableGraph: source,
  completedWork: new Set(['b']),
});
const runner = traversal.createRunner();
const ids: readonly string[] = runner.summary().readyIds;
const summary: DagSummary<string> = runner.summary();
const progress: DagVertexProgress<string> | undefined =
  summary.vertices.get('a');
const diagnostics: DagTraversalStallDiagnostics<string> | null =
  summary.diagnostics;
const graph = runner.getResolvedGraph();
const ref = graph.getVertexRefById('a');
if (ref !== null) {
  const id: string = graph.getVertexId(ref);
  const alias: string = graph.getIdOf(ref);
  const dependencies: readonly string[] | undefined = graph.get(ref)?.dependsOn;
  void [id, alias, dependencies];
}
graph.getVertexById('a');
runner.settle('a', { kind: 'workCompleted' }, Symbol());
// @ts-expect-error String IDs reject numbers at settlement.
runner.settle(42, { kind: 'workCompleted' }, Symbol());
// @ts-expect-error String IDs reject objects at lookup.
graph.getVertexRefById({});
// @ts-expect-error Compatibility aliases preserve the same ID domain.
graph.getVertexById(42);
// @ts-expect-error Source prerequisite lookup accepts only strings.
source.resolvePrerequisite?.(42);
// @ts-expect-error Progress map lookup preserves ID.
summary.vertices.get(42);
// @ts-expect-error Configured completed work must use the source ID domain.
traversal.configure({ completedWork: new Set([42]) });
new DagTraversal<W, W, string>({
  traversableGraph: source,
  // @ts-expect-error Constructor completed work must use the selected ID domain.
  completedWork: new Set([{}]),
});
traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, (_vertex, options) => {
  const view: ResolvedGraph<W, string> = options.resolvedGraph;
  // @ts-expect-error Visitor graph ID lookup is checked.
  view.getVertexRefById(42);
});

const inferred = new DagTraversal({ traversableGraph: source }).createRunner();
const inferredIds: readonly string[] = inferred.summary().readyIds;
// @ts-expect-error Constructor inference retains the source ID domain.
inferred.settle(42, { kind: 'workCompleted' }, Symbol());
const helper = traverseDag({ traversableGraph: source });
const helperIds: readonly string[] = helper.summary().readyIds;
// @ts-expect-error New helper inference retains the source ID domain.
helper.getResolvedGraph().getVertexRefById(42);
const legacyHelper = traverseDag({ traversableGraph: source }, null);
const legacyIds: readonly string[] = legacyHelper.summary().readyIds;
// @ts-expect-error Deprecated helper inference retains the source ID domain.
legacyHelper.settle({}, { kind: 'workCompleted' }, Symbol());

const asyncSource: AsyncDagDiscoverySource<W, W, string> = source;
const asyncTraversal = new AsyncDagTraversal({ traversableGraph: asyncSource });
const asyncRunner = asyncTraversal.createRunner();
const asyncIds: readonly string[] = asyncRunner.summary().readyIds;
// @ts-expect-error Async inferred settlement uses string IDs.
asyncRunner.settle(42, { kind: 'workCompleted' }, Symbol());
// @ts-expect-error Async configure checks completed work IDs.
asyncTraversal.configure({ completedWork: new Set([42]) });
async function asyncHelpers() {
  const current = await traverseDagAsync({ traversableGraph: asyncSource });
  const old = await traverseDagAsync({ traversableGraph: asyncSource }, null);
  const a: readonly string[] = current.summary().readyIds;
  const b: readonly string[] = old.summary().readyIds;
  // @ts-expect-error Async helper inferred ID domain.
  current.settle(42, { kind: 'workCompleted' }, Symbol());
  // @ts-expect-error Async deprecated helper inferred ID domain.
  old.getResolvedGraph().getVertexById({});
  void [a, b];
}

const missingTagged: DagVertexFound<W, string> = {
  kind: 'found',
  // @ts-expect-error Typed found content cannot fall back to a generated UUID.
  vertex: { vertexContent: { $data: 'a', $childHints: [] } },
};
// @ts-expect-error Legacy live content also requires a typed ID.
const missingLegacy: MakeVertexResult<W, string> = {
  vertexContent: { $data: 'a', $childHints: [] },
};
const missingUnion: DagVertexResolution<W, string> = {
  kind: 'found',
  // @ts-expect-error Source union must not admit tagged missing IDs.
  vertex: { vertexContent: { $data: 'a', $childHints: [] } },
};
const omitted: DagVertexOmitted<string> = {
  kind: 'omitted',
  satisfiesDependencies: true,
};
const legacyOmitted: MakeVertexResult<W, string> = { vertexContent: null };
const wrongDependency: DagVertexFound<W, string> = {
  kind: 'found',
  vertex: {
    vertexId: 'a',
    vertexContent: { $data: 'a', $childHints: [] },
    // @ts-expect-error Work dependencies use the selected ID type.
    dependsOn: [42],
  },
};
const wrongComplete: MakeVertexResult<W, string> = {
  vertexId: 'a',
  vertexContent: { $data: 'a', $childHints: [] },
  // @ts-expect-error Completion dependencies use the selected ID type.
  dependsOnComplete: [{}],
};
// @ts-expect-error Hint IDs use the selected domain independently of hints.
const wrongHint: HintVertexId<string> = { vertexId: 42 };
const tree: TreeSource<W> = {
  resolveRoot: () => ({ vertexContent: null }),
  resolveChild: () => ({ vertexContent: null }),
};
// @ts-expect-error Generated tree identities cannot promise a string ID domain.
new DagTraversal<W, W, string>({ traversableTree: tree });
// @ts-expect-error Async tree identities cannot promise a string ID domain.
new AsyncDagTraversal<W, W, string>({ traversableTree: tree });
// @ts-expect-error Helper tree identities cannot promise a string ID domain.
traverseDag<W, W, string>({ traversableTree: tree });
// @ts-expect-error Async helper tree identities cannot promise a string ID domain.
traverseDagAsync<W, W, string>({ traversableTree: tree });
// @ts-expect-error Configure cannot introduce tree identities to a typed graph.
traversal.configure({ traversableTree: tree });

function arbitraryIds<ID>(id: ID) {
  const typed: DagDiscoverySource<W, W, ID> = {
    resolveRoot: () => ({
      kind: 'found',
      vertex: { vertexId: id, vertexContent: { $data: 'a', $childHints: [] } },
    }),
    resolveChild: () => ({ kind: 'omitted', satisfiesDependencies: true }),
    getVertexIdFromHint: () => ({ vertexId: id }),
  };
  const run = new DagTraversal<W, W, ID>({
    traversableGraph: typed,
    completedWork: new Set([id]),
  }).createRunner();
  run.settle(id, { kind: 'workCompleted' }, Symbol());
  run.getResolvedGraph().getVertexRefById(id);
  const result: readonly ID[] = run.summary().readyIds;
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
  resolveRoot: () => ({ vertexContent: { $data: 'a', $childHints: [] } }),
  resolveChild: () => ({
    kind: 'found',
    vertex: { vertexContent: { $data: 'a', $childHints: [] } },
  }),
};
new DagTraversal({ traversableGraph: unknownSource })
  .createRunner()
  .settle({}, { kind: 'workCompleted' }, Symbol());
new DagTraversal({ traversableTree: tree });
const rewriteSource: DagDiscoverySource<W, R, string> = {
  resolveRoot: source.resolveRoot,
  resolveChild: (hint, options) => {
    const rewrittenGraph: ResolvedGraph<W | R, string> = options.resolvedGraph;
    const original: ResolvedGraphSnapshot<W, string> | null =
      options.notMutatedResolvedGraph;
    const data: string = hint;
    void [rewrittenGraph, original];
    return { vertexId: hint, vertexContent: { $data: data, $childHints: [] } };
  },
};
new DagTraversal<W, R, string>({
  traversableGraph: rewriteSource,
}).addVisitorFor(DagVisitorPhase.ON_WORK_READY, (vertex, options) => {
  const data: string | number = vertex.$data;
  const view: ResolvedGraph<W | R, string> = options.resolvedGraph;
  void [data, view];
});
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

const containerGraph: ResolvedGraph<W, string | symbol> =
  runner.resolvedGraphsContainer.resolvedGraph;
const containerSnapshot: ResolvedGraphSnapshot<W, string> | null =
  runner.resolvedGraphsContainer.notMutatedResolvedGraph;
// @ts-expect-error Exposed container graph lookups retain the ID domain.
runner.resolvedGraphsContainer.publicResolvedGraph.getVertexRefById(42);
// @ts-expect-error The exposed store lookup retains the ID domain.
runner.resolvedGraphsContainer.store.getIdState(42);
// @ts-expect-error The exposed snapshot alias retains the ID domain.
containerSnapshot?.getVertexById(42);
// @ts-expect-error The runner snapshot retains the ID domain.
runner.notMutatedResolvedGraph?.getVertexRefById(42);
// @ts-expect-error Inferred constructors cannot seed wrong-domain completed work.
new DagTraversal({ traversableGraph: source, completedWork: new Set([42]) });
// @ts-expect-error Inferred new helpers cannot seed wrong-domain completed work.
traverseDag({ traversableGraph: source, completedWork: new Set([42]) });
traverseDag({ traversableGraph: source }, null, {
  // @ts-expect-error Inferred old helpers cannot seed wrong-domain completed work.
  completedWork: new Set([42]),
});
// @ts-expect-error Inferred async constructors cannot seed wrong-domain completed work.
new AsyncDagTraversal({
  traversableGraph: asyncSource,
  completedWork: new Set([42]),
});
traverseDagAsync({
  // @ts-expect-error Inferred async helpers cannot seed wrong-domain completed work.
  traversableGraph: asyncSource,
  completedWork: new Set([42]),
});
traverseDagAsync({ traversableGraph: asyncSource }, null, {
  // @ts-expect-error Inferred async old helpers cannot seed wrong-domain completed work.
  completedWork: new Set([42]),
});
const missingRoot: DagDiscoverySource<W, W, string> = {
  resolveRoot: () => ({
    kind: 'found',
    // @ts-expect-error Actual source root callbacks require an explicit live identity.
    vertex: { vertexContent: { $data: 'a', $childHints: [] } },
  }),
  resolveChild: source.resolveChild,
};
const missingChild: AsyncDagDiscoverySource<W, W, string> = {
  resolveRoot: source.resolveRoot,
  // @ts-expect-error Async legacy source child callbacks require an explicit live identity.
  resolveChild: async () => ({ vertexContent: { $data: 'a', $childHints: [] } }),
};
const wrongSourceDependency: DagDiscoverySource<W, W, string> = {
  // prettier-ignore
  // @ts-expect-error Actual source callbacks reject wrong-domain dependencies.
  resolveRoot: () => ({ vertexId: 'a', dependsOn: [42], vertexContent: { $data: 'a', $childHints: [] } }),
  resolveChild: source.resolveChild,
};
declare const brandedSource: DagDiscoverySource<W, W, typeof branded>;
const brandedRunner = new DagTraversal({
  traversableGraph: brandedSource,
}).createRunner();
brandedRunner.settle(branded, { kind: 'workCompleted' }, Symbol());
// @ts-expect-error Unbranded strings cannot settle branded-ID work.
brandedRunner.settle('a', { kind: 'workCompleted' }, Symbol());
const rewriting = new DagTraversal({ traversableGraph: rewriteSource });
const rewritingIds: readonly string[] = rewriting
  .createRunner()
  .summary().readyIds;
rewriting.addVisitorFor(DagVisitorPhase.ON_SUBGRAPH_READY, (_vertex, options) => {
  const view: ResolvedGraph<W | R, string> = options.resolvedGraph;
  // @ts-expect-error Rewriting does not broaden the ID domain.
  view.getVertexById({});
});
void [
  containerGraph,
  missingRoot,
  missingChild,
  wrongSourceDependency,
  rewritingIds,
];

// Raw bookkeeping can expose the private synthetic root, unlike the public forest view.
if (ref !== null) {
  const rawId: string | symbol = containerGraph.getVertexId(ref);
  // @ts-expect-error The raw container may return its private synthetic symbol.
  const unsafeRawId: string = containerGraph.getVertexId(ref);
  const publicId: string =
    runner.resolvedGraphsContainer.publicResolvedGraph.getVertexId(ref);
  void [rawId, unsafeRawId, publicId];
}

// Default legacy results remain object types usable by existing extending interfaces.
interface DefaultLegacyResult extends MakeVertexResult<W> {
  note?: string;
}
const extendedDefault: DefaultLegacyResult = {
  vertexContent: { $data: 'a', $childHints: [] },
};
void extendedDefault;

// Own undefined source placeholders do not select or replace a source.
new DagTraversal({
  traversableGraph: source,
  traversableTree: undefined,
}).configure({
  traversableGraph: undefined,
  traversableTree: undefined,
});
new AsyncDagTraversal({
  traversableGraph: asyncSource,
  traversableTree: undefined,
}).configure({
  traversableGraph: undefined,
  traversableTree: undefined,
});
new DagTraversal({
  traversableTree: tree,
  traversableGraph: undefined,
}).configure({
  traversableTree: undefined,
  traversableGraph: undefined,
});
new AsyncDagTraversal({
  traversableTree: tree,
  traversableGraph: undefined,
}).configure({
  traversableTree: undefined,
  traversableGraph: undefined,
});
// @ts-expect-error A defined constructor source is still required.
new DagTraversal({ traversableGraph: undefined, traversableTree: undefined });
// @ts-expect-error Async construction also requires a defined source.
new AsyncDagTraversal({
  traversableGraph: undefined,
  traversableTree: undefined,
});
// @ts-expect-error Two defined sources are still mutually exclusive.
new DagTraversal({ traversableGraph: source, traversableTree: tree });
new AsyncDagTraversal<W, W, string>({
  // @ts-expect-error Explicit undefined does not allow typed graph IDs on tree sources.
  traversableTree: tree,
  traversableGraph: undefined,
});
traversal.configure({ traversableTree: undefined });
// @ts-expect-error Source patch placeholders do not admit a defined tree in a typed graph.
traversal.configure({ traversableGraph: undefined, traversableTree: tree });

const syncPlaceholderSummary: DagSummary<string> = new DagTraversal({
  traversableGraph: source,
  traversableTree: undefined,
})
  .createRunner()
  .summary();
const asyncPlaceholderSummary: DagSummary<string> = new AsyncDagTraversal({
  traversableGraph: source,
  traversableTree: undefined,
})
  .createRunner()
  .summary();
void [syncPlaceholderSummary, asyncPlaceholderSummary];
