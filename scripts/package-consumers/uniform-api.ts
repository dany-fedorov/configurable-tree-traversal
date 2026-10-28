import { TraversalVisitorCommandName as VisitorCommand } from 'configurable-tree-traversal';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as D,
  DepthFirstTreeTraversal,
  DepthFirstPhase as F,
  BreadthFirstPhase as B,
  TraversalVisitorCommandName as C,
  core,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  traverseTreeBreadthFirst,
  traverseTreeBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from 'configurable-tree-traversal';
import type {
  VertexTypes,
  TreeSource,
  DagDiscoverySource,
  DagVertexResolution,
  DagVertexFound,
  PrerequisiteMissing,
  DagPrerequisiteResolution,
  VertexContent,
  VertexContentInput,
  VisitorRegistrationMetadata,
  TreeVisitor,
  DagVisitor,
  DagSettlementOutcome,
  DagWorkState,
} from 'configurable-tree-traversal';

type T = VertexTypes<string | undefined, string>;
const canonical: VertexContent<T> = { $data: 'root', $childHints: ['leaf'] };
// @ts-expect-error Retired content spelling is not accepted.
const legacy: VertexContentInput<T> = { $d: 'old', $c: [] };
const vertex = new core.Vertex<T>(canonical).clone({ $data: undefined });
const data: string | undefined = vertex.$data;
const alias: string | undefined = vertex.$data;
// @ts-expect-error mixed vertex spellings are ambiguous
new core.Vertex<T>({ $data: '', $c: [] });
const found: DagVertexFound<T> = {
  kind: 'found',
  vertex: { vertexId: undefined, vertexContent: canonical },
};
const omitted: import('configurable-tree-traversal').DagVertexOmitted = {
  kind: 'omitted',
  satisfiesDependencies: true,
};
const missing: PrerequisiteMissing = { kind: 'missing' };
const source: DagVertexResolution<T> = found;
const lookup: DagPrerequisiteResolution<T> = missing;
// @ts-expect-error missing is valid only in prerequisite lookup
const invalidSource: DagVertexResolution<T> = missing;
const tree: TreeSource<T> = {
  resolveRoot: () => ({ kind: 'found', vertex: { vertexContent: canonical } }),
  resolveChild: () => ({ kind: 'omitted' }),
};
const graph: DagDiscoverySource<T> = {
  resolveRoot: () => source,
  resolveChild: () => omitted,
  resolvePrerequisite: () => lookup,
};
const common: TreeVisitor<string, T, T> = (_vertex, options) => {
  const metadata: VisitorRegistrationMetadata = options.registration;
  // @ts-expect-error callback context exposes metadata, not executable records
  metadata.visitor;
  // @ts-expect-error callback metadata is readonly
  metadata.priority = 0;
  return { commands: [{ commandName: C.NOOP }] };
};
const dagCommon: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const depth = new DepthFirstTreeTraversal({ traversableTree: tree });
depth.addVisitorFor(F.POST_ORDER, common);
depth.configure({
  visitors: {
    [F.POST_ORDER]: [{ visitor: common, priority: 1 }],
  },
});
depth.setVisitorsFor(F.POST_ORDER, [{ visitor: common, priority: 1 }]);
const callback = depth.listVisitorsFor(F.POST_ORDER)[0]!.visitor;
depth.addVisitorFor(
  F.PRE_ORDER,
  (_v, options) => {
    const phase: F.PRE_ORDER = options.phase;
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
depth.addVisitorFor(F.PRE_ORDER, common, { commandCommitMode: 'afterGroup' });
depth.addVisitorFor(F.POST_ORDER, () => ({
  commands: [
    // @ts-expect-error hint rewriting is invalid after children complete
    { commandName: C.REWRITE_CHILD_HINTS, commandArguments: { newHints: [] } },
  ],
}));
const dag = new DagTraversal({
  traversableGraph: graph,
  rootWorkDependencies: 'honor',
  omittedWorkDependencies: 'none',
});
dag.addVisitorFor(D.ON_WORK_READY, (_v, options) => {
  const phase: D.ON_WORK_READY = options.phase;
  void phase;
  return { commands: [{ commandName: C.DEFER_WORK_COMPLETION }] };
});
dag.addVisitorFor(D.ON_WORK_READY, () => ({
  commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
}));
dag.addVisitorFor(D.ON_SUBGRAPH_READY, dagCommon);
dag.addVisitorFor(D.ON_SUBGRAPH_READY, () => ({
  // @ts-expect-error completion visitors cannot defer
  commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
}));
dag.addVisitorFor(D.ON_WORK_READY, () => ({
  // @ts-expect-error deferral must be the only command
  commands: [{ commandName: C.NOOP }, { commandName: C.DEFER_WORK_COMPLETION }],
}));
const outcome: DagSettlementOutcome = {
  kind: 'traversalFailed',
  error: undefined,
};
// @ts-expect-error Boolean settlement feedback is removed.
const oldOutcome: DagSettlementOutcome = { ok: false, error: undefined };
const work: DagWorkState = 'completed';
// @ts-expect-error old progress string is replaced
const oldWork: DagWorkState = 'succeeded';
const syncHelpers = [
  traverseTreeDepthFirst({
    traversableTree: tree,
    visitors: { [F.POST_ORDER]: common },
  }),
  traverseTreeBreadthFirst({
    traversableTree: tree,
    visitors: { [B.LEVEL_ORDER]: common },
  }),
  traverseDag({
    traversableGraph: graph,
    visitors: { [D.ON_WORK_READY]: dagCommon },
  }),
  traverseTreeDepthFirst({
    traversableTree: tree,
    visitors: { POST_ORDER: common },
  }),
  traverseTreeBreadthFirst({
    traversableTree: tree,
    visitors: { LEVEL_ORDER: common },
  }),
  traverseDag({
    ...{ traversableGraph: graph },
    visitors: { ON_WORK_READY: dagCommon },
  }),
];
const asyncHelpers: Promise<unknown>[] = [
  traverseTreeDepthFirstAsync({
    traversableTree: tree,
    visitors: { [F.POST_ORDER]: common },
  }),
  traverseTreeBreadthFirstAsync({
    traversableTree: tree,
    visitors: { [B.LEVEL_ORDER]: common },
  }),
  traverseDagAsync({
    traversableGraph: graph,
    visitors: { [D.ON_WORK_READY]: dagCommon },
  }),
  traverseTreeDepthFirstAsync({
    traversableTree: tree,
    visitors: { POST_ORDER: common },
  }),
  traverseTreeBreadthFirstAsync({
    traversableTree: tree,
    visitors: { LEVEL_ORDER: common },
  }),
  traverseDagAsync({
    ...{ traversableGraph: graph },
    visitors: { ON_WORK_READY: dagCommon },
  }),
];
// @ts-expect-error helper has exactly one source
traverseDag({ traversableTree: tree, traversableGraph: graph });
traverseDag({
  traversableGraph: graph,
  visitors: {
    // @ts-expect-error helper phase prevents completion deferral
    [D.ON_SUBGRAPH_READY]: () => ({
      commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
    }),
  },
});
const asyncDag = new AsyncDagTraversal({ traversableGraph: graph });
asyncDag.addVisitorFor(D.ON_WORK_READY, async () => ({
  commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
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

// All new contracts compile through both declaration loader branches.
import type {
  TreeVertexResolution,
  TreeVertexFound,
  TreeVertexOmitted,
  TraversalExecutionOptions,
  TraversalStopReason,
  VisitorPhaseInput,
  VisitorGroupMember,
  ResolvedTreeView,
  ObjectChildHookResult,
  ObjectTreeVertexTypes,
  MutationCommandBuilder,
  ObjectPropertyPatch,
} from 'configurable-tree-traversal';
import { ObjectTreeSource, rewriteObject } from 'configurable-tree-traversal';
const treeFound: TreeVertexFound<T> = {
  kind: 'found',
  vertex: { vertexContent: canonical },
};
const treeOmitted: TreeVertexOmitted = { kind: 'omitted' };
// @ts-expect-error Tree omissions cannot acknowledge graph milestones.
const graphOmissionAsTree: TreeVertexOmitted = omitted;
// @ts-expect-error Graph omissions require explicit acknowledgement.
const treeOmissionAsGraph: DagVertexResolution<T> = treeOmitted;
const undefinedAcknowledgement = {
  kind: 'omitted' as const,
  satisfiesDependencies: undefined,
};
// @ts-expect-error Even present undefined is graph metadata.
const undefinedOmissionAsTree: TreeVertexOmitted = undefinedAcknowledgement;
void [graphOmissionAsTree, treeOmissionAsGraph, undefinedOmissionAsTree];
const treeResult: TreeVertexResolution<T> = treeFound;
// @ts-expect-error Untagged tree results are removed.
const oldTreeResult: TreeVertexResolution<T> = { vertexContent: canonical };
// @ts-expect-error tree sources do not accept graph identity
const wrongTree: TreeVertexResolution<T> = found;
const execution: TraversalExecutionOptions<F> = {
  emitEvents: [],
  visitorPhases: { exclude: [] },
};
const bothSelectors: TraversalExecutionOptions<F> = {
  // @ts-expect-error a callback selector has exactly one mode
  visitorPhases: { include: [], exclude: [] },
};
const mixedSelectors: TraversalExecutionOptions<F> = {
  emitEvents: [],
  // @ts-expect-error canonical and legacy emission names cannot coexist
  iterateOver: [],
};
const phaseDefinition: VisitorPhaseInput<typeof common> = {
  groups: [
    {
      commandCommitMode: 'afterGroup',
      visitors: [{ visitor: common, priority: 1 }],
    },
    { visitors: [common] },
  ],
};
depth.configure({ visitors: { [F.POST_ORDER]: phaseDefinition } });
depth.setVisitorsFor(F.POST_ORDER, depth.listVisitorsFor(F.POST_ORDER));
depth.addVisitorGroupFor(F.POST_ORDER, { visitors: [common] });
const badMember: VisitorGroupMember<typeof common> = {
  visitor: common,
  // @ts-expect-error explicit group policy cannot be set by members
  commandCommitMode: 'afterGroup',
};
const externalDag = new DagTraversal({
  traversableGraph: graph,
  workCompletion: 'externalSettlement',
});
const externalRunner = externalDag.createRunner();
const reason: TraversalStopReason | null = externalRunner.getStopReason();
const treeView: ResolvedTreeView<T> | null =
  externalRunner.getResolvedTreeView();
if (treeView) {
  // @ts-expect-error safe facades have no raw records
  treeView.get(treeView.getRoot()!);
  // @ts-expect-error query collections are readonly
  treeView.getChildrenOf(treeView.getRoot()!)!.push(treeView.getRoot()!);
}
const resolved = externalRunner.getResolvedGraph();
const vertexRef = resolved.getVertexRefById(undefined);
if (vertexRef) {
  const referenceId: string = vertexRef.getRefId();
  const hostId: unknown = resolved.getVertexId(vertexRef);
  void [referenceId, hostId];
}
const hookResult: ObjectChildHookResult<ObjectTreeVertexTypes<string, number>> =
  { kind: 'useDefault' };
new ObjectTreeSource({ a: 1 }, { resolveChildHook: () => hookResult });
// @ts-expect-error Preferred object options use the tagged resolution hook.
new ObjectTreeSource({ a: 1 }, { makeVertexHook: () => ({ returnMe: null }) });
type Prop = ObjectTreeVertexTypes<string, number | undefined>;
const objectPatch: ObjectPropertyPatch<Prop> = { value: undefined };
const objectFactory = ObjectTreeSource.createObjectMutationBinder<Prop, Prop>();
const objectVisitor: TreeVisitor<F.POST_ORDER, Prop, Prop> = (v, options) => {
  const { makeMutationCommand } = objectFactory(v, options);
  makeMutationCommand({ kind: 'rewrite', patch: objectPatch });
  makeMutationCommand({ kind: 'rewrite', patch: { key: 'renamed' } });
  // @ts-expect-error typed object helper rejects wrong value types
  makeMutationCommand({ kind: 'rewrite', patch: { value: 'wrong' } });
};
declare const replace: MutationCommandBuilder<Prop>;
replace({ kind: 'rewrite', value: { key: 'new', value: 1 } });
// @ts-expect-error generic builder requires complete data by default
replace({ kind: 'rewrite', value: { key: 'incomplete' } });
rewriteObject({ a: 1 }, { resolveChildHook: () => ({ kind: 'useDefault' }) });
void [
  treeOmitted,
  treeResult,
  oldTreeResult,
  wrongTree,
  execution,
  bothSelectors,
  mixedSelectors,
  badMember,
  reason,
  objectVisitor,
];
