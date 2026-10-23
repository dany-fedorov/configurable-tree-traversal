import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalOrder as D,
  DepthFirstTraversal,
  DepthFirstTraversalOrder as F,
  BreadthFirstTraversalOrder as B,
  TraversalVisitorCommandName as C,
  TraversalVisitorFunctionResolutionStyle as Style,
  DEFER_READY,
  core,
  traverseDepthFirst,
  traverseDepthFirstAsync,
  traverseBreadthFirst,
  traverseBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from 'configurable-tree-traversal';
import type {
  TreeTypeParameters,
  TraversableTree,
  TraversableGraph,
  SourceVertexResult,
  FoundVertexResult,
  OmittedVertexResult,
  MissingVertexResult,
  PrerequisiteResolutionResult,
  VertexContent,
  LegacyVertexContent,
  VisitorRegistrationMetadata,
  TraversalVisitor,
  DagVisitor,
  DagSettlementOutcome,
  DagWorkState,
} from 'configurable-tree-traversal';

type T = TreeTypeParameters<string | undefined, string>;
const canonical: VertexContent<T> = { $data: 'root', $childHints: ['leaf'] };
const legacy: LegacyVertexContent<T> = { $d: 'old', $c: [] };
const vertex = new core.Vertex<T>(legacy).clone({ $data: undefined });
const data: string | undefined = vertex.$data;
const alias: string | undefined = vertex.$d;
// @ts-expect-error mixed vertex spellings are ambiguous
new core.Vertex<T>({ $data: '', $c: [] });
const found: FoundVertexResult<T> = {
  kind: 'found',
  vertex: { vertexId: undefined, vertexContent: canonical },
};
const omitted: OmittedVertexResult = {
  kind: 'omitted',
  satisfiesDependencies: true,
};
const missing: MissingVertexResult = { kind: 'missing' };
const source: SourceVertexResult<T> = found;
const lookup: PrerequisiteResolutionResult<T> = missing;
// @ts-expect-error missing is valid only in prerequisite lookup
const invalidSource: SourceVertexResult<T> = missing;
const tree: TraversableTree<T> = {
  makeRoot: () => ({ kind: 'found', vertex: { vertexContent: canonical } }),
  makeVertex: () => omitted,
};
const graph: TraversableGraph<T> = {
  makeRoot: () => source,
  makeVertex: () => omitted,
  resolvePrerequisite: () => lookup,
};
const common: TraversalVisitor<string, T, T> = (_vertex, options) => {
  const metadata: VisitorRegistrationMetadata = options.visitorRecord;
  // @ts-expect-error callback context exposes metadata, not executable records
  metadata.visitor;
  // @ts-expect-error callback metadata is readonly
  metadata.priority = 0;
  return { commands: [{ commandName: C.NOOP }] };
};
const dagCommon: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const depth = new DepthFirstTraversal({ traversableTree: tree });
depth.addVisitorFor(F.POST_ORDER, common);
depth.configure({
  visitors: {
    [F.POST_ORDER]: [{ visitor: common, priority: 1, addedIndex: 0 }],
  },
});
depth.setVisitorsFor(F.POST_ORDER, [
  { visitor: common, priority: 1, addedIndex: 0 },
]);
const callback = depth.listVisitorsFor(F.POST_ORDER)[0].visitor;
depth.addVisitorFor(
  F.PRE_ORDER,
  (_v, options) => {
    const phase: F.PRE_ORDER = options.order;
    void phase;
    return {
      commands: [
        {
          commandName: C.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [] },
        },
      ],
    };
  },
  { commandCommitMode: 'afterGroup' },
);
depth.addVisitorFor(F.PRE_ORDER, common, { resolutionStyle: Style.CONCURRENT });
depth.addVisitorFor(F.POST_ORDER, () => ({
  commands: [
    // @ts-expect-error hint rewriting is invalid after children complete
    { commandName: C.REWRITE_CHILD_HINTS, commandArguments: { newHints: [] } },
  ],
}));
const dag = new DagTraversal({
  traversableGraph: graph,
  rootDependencies: 'honor',
  implicitParentDependency: false,
});
dag.addVisitorFor(D.ON_READY, (_v, options) => {
  const phase: D.ON_READY = options.order;
  void phase;
  return { commands: [{ commandName: C.DEFER_READY }] };
});
dag.addVisitorFor(D.ON_READY, () => DEFER_READY);
dag.addVisitorFor(D.ON_COMPLETE, dagCommon);
dag.addVisitorFor(D.ON_COMPLETE, () => ({
  // @ts-expect-error completion visitors cannot defer
  commands: [{ commandName: C.DEFER_READY }],
}));
dag.addVisitorFor(D.ON_READY, () => ({
  // @ts-expect-error deferral must be the only command
  commands: [{ commandName: C.NOOP }, { commandName: C.DEFER_READY }],
}));
const outcome: DagSettlementOutcome = {
  kind: 'traversalFailed',
  error: undefined,
};
const oldOutcome: DagSettlementOutcome = { ok: false, error: undefined };
const work: DagWorkState = 'completed';
// @ts-expect-error old progress string is replaced
const oldWork: DagWorkState = 'succeeded';
const syncHelpers = [
  traverseDepthFirst({
    traversableTree: tree,
    visitors: { [F.POST_ORDER]: common },
  }),
  traverseBreadthFirst({
    traversableTree: tree,
    visitors: { [B.LEVEL_ORDER]: common },
  }),
  traverseDag({
    traversableGraph: graph,
    visitors: { [D.ON_READY]: dagCommon },
  }),
  traverseDepthFirst(tree, { postOrderVisitor: common }),
  traverseBreadthFirst(tree, common),
  traverseDag({ traversableGraph: graph }, { onReadyVisitor: dagCommon }),
];
const asyncHelpers: Promise<unknown>[] = [
  traverseDepthFirstAsync({
    traversableTree: tree,
    visitors: { [F.POST_ORDER]: common },
  }),
  traverseBreadthFirstAsync({
    traversableTree: tree,
    visitors: { [B.LEVEL_ORDER]: common },
  }),
  traverseDagAsync({
    traversableGraph: graph,
    visitors: { [D.ON_READY]: dagCommon },
  }),
  traverseDepthFirstAsync(tree, { postOrderVisitor: common }),
  traverseBreadthFirstAsync(tree, common),
  traverseDagAsync({ traversableGraph: graph }, { onReadyVisitor: dagCommon }),
];
// @ts-expect-error helper has exactly one source
traverseDag({ traversableTree: tree, traversableGraph: graph });
traverseDag({
  traversableGraph: graph,
  visitors: {
    // @ts-expect-error helper phase prevents completion deferral
    [D.ON_COMPLETE]: () => ({ commands: [{ commandName: C.DEFER_READY }] }),
  },
});
const asyncDag = new AsyncDagTraversal({ traversableGraph: graph });
asyncDag.addVisitorFor(D.ON_READY, async () => ({
  commands: [{ commandName: C.DEFER_READY }],
}));
void [
  data,
  alias,
  invalidSource,
  callback,
  outcome,
  oldOutcome,
  work,
  oldWork,
  syncHelpers,
  asyncHelpers,
];
