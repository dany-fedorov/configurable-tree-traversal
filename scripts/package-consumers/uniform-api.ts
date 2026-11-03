import { TraversalVisitorCommandName as VisitorCommand } from 'configurable-tree-traversal';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as D,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase as F,
  BreadthFirstTreeVisitPhase as B,
  TraversalVisitorCommandName as C,
  core,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  traverseDag,
  traverseDagAsync,
} from 'configurable-tree-traversal';
import type {
  VertexDataAndChildHintTypes,
  TreeDiscoverySource,
  DagDiscoverySource,
  DagSourceVertexResolution,
  FoundDagSourceVertex,
  DagPrerequisiteLookupMissing,
  DagPrerequisiteLookupResult,
  VertexContent,
  VertexContentInput,
  VisitorRegistrationMetadata,
  TreeVertexPhaseVisitorCallback,
  DagVisitor,
  DagSettlementOutcome,
  DagWorkState,
} from 'configurable-tree-traversal';
type T = VertexDataAndChildHintTypes<string | undefined, string>;
const canonical: VertexContent<T> = {
  $vertexData: 'root',
  $childDiscoveryHints: ['leaf'],
};
// @ts-expect-error Retired content spelling is not accepted.
const legacy: VertexContentInput<T> = { $d: 'old', $c: [] };
const vertex = new core.Vertex<T>(
  canonical,
).createEditableShallowCloneWithContentOverrides({ $vertexData: undefined });
const data: string | undefined = vertex.$vertexData;
const alias: string | undefined = vertex.$vertexData;
// @ts-expect-error mixed vertex spellings are ambiguous
new core.Vertex<T>({ $vertexData: '', $c: [] });
const found: FoundDagSourceVertex<T> = {
  kind: 'vertexResolved',
  resolvedVertexInput: { vertexId: undefined, vertexContentInput: canonical },
};
const omitted: import('configurable-tree-traversal').OmittedDagSourceVertex = {
  omittedVertexIdentity: null,
  kind: 'vertexIntentionallyOmitted',
  satisfiesWorkAndSubgraphCompletionPrerequisites: true,
};
const missing: DagPrerequisiteLookupMissing = { kind: 'missing' };
const source: DagSourceVertexResolution<T> = found;
const lookup: DagPrerequisiteLookupResult<T> = missing;
// @ts-expect-error missing is valid only in prerequisite lookup
const invalidSource: DagSourceVertexResolution<T> = missing;
const tree: TreeDiscoverySource<T> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: { vertexContentInput: canonical },
  }),
  resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
};
const graph: DagDiscoverySource<T> = {
  resolveRootVertex: () => source,
  resolveChildHint: () => omitted,
  resolvePrerequisiteByVertexId: () => lookup,
};
const common: TreeVertexPhaseVisitorCallback<T, T, string> = (
  _vertex,
  options,
) => {
  const metadata: VisitorRegistrationMetadata =
    options.visitorRegistrationMetadata;
  // @ts-expect-error callback context exposes metadata, not executable records
  metadata.visitor;
  // @ts-expect-error callback metadata is readonly
  metadata.descendingExecutionPriorityWithinGroup = 0;
  return { commands: [{ commandName: C.NO_OPERATION }] };
};
const dagCommon: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const depth = new DepthFirstTreeTraversalBuilder({ treeDiscoverySource: tree });
depth.registerVisitorCallbackForPhase(F.AFTER_CHILD_SUBTREES, common);
depth.patchOptionsForFutureRunners({
  visitors: {
    [F.AFTER_CHILD_SUBTREES]: [
      { visitor: common, descendingExecutionPriorityWithinGroup: 1 },
    ],
  },
});
depth.replaceVisitorDefinitionsForPhase(F.AFTER_CHILD_SUBTREES, [
  { visitor: common, descendingExecutionPriorityWithinGroup: 1 },
]);
const callback = depth.getDetachedVisitorRegistrationRecordsForPhase(
  F.AFTER_CHILD_SUBTREES,
)[0]!.visitor;
depth.registerVisitorCallbackForPhase(
  F.BEFORE_CHILD_EXPANSION,
  (_v, options) => {
    const phase: F.BEFORE_CHILD_EXPANSION = options.visitorPhase;
    void phase;
    return {
      commands: [
        {
          commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
          commandArguments: { replacementChildHints: [] },
        },
      ],
    };
  },
  { visitorCommandCommitTiming: 'afterContiguousVisitorBatch' },
);
depth.registerVisitorCallbackForPhase(F.BEFORE_CHILD_EXPANSION, common, {
  visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
});
depth.registerVisitorCallbackForPhase(F.AFTER_CHILD_SUBTREES, () => ({
  commands: [
    {
      // @ts-expect-error hint rewriting is invalid after children complete
      commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
      // @ts-expect-error post-child callbacks do not accept replacement child hints
      commandArguments: { replacementChildHints: [] },
    },
  ],
}));
const dag = new DagTraversalBuilder({
  dagDiscoverySource: graph,
  rootWorkPrerequisitePolicy: 'honor',
  undeclaredWorkPrerequisitePolicy: 'none',
});
dag.registerVisitorCallbackForPhase(D.ON_WORK_READY, (_v, options) => {
  const phase: D.ON_WORK_READY = options.visitorPhase;
  void phase;
  return {
    commands: [
      { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
    ],
  };
});
dag.registerVisitorCallbackForPhase(D.ON_WORK_READY, () => ({
  commands: [
    {
      commandName:
        VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
    },
  ],
}));
dag.registerVisitorCallbackForPhase(D.ON_SUBGRAPH_COMPLETION_READY, dagCommon);
dag.registerVisitorCallbackForPhase(D.ON_SUBGRAPH_COMPLETION_READY, () => ({
  commands: [
    // @ts-expect-error completion visitors cannot defer
    { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
  ],
}));
dag.registerVisitorCallbackForPhase(D.ON_WORK_READY, () => ({
  commands: [
    // @ts-expect-error deferral must be the only command
    { commandName: C.NO_OPERATION },
    { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
  ],
}));
const outcome: DagSettlementOutcome = {
  kind: 'traversalFailed',
  error: undefined,
};
// @ts-expect-error Boolean settlement feedback is removed.
const oldOutcome: DagSettlementOutcome = { ok: false, error: undefined };
const work: DagWorkState = 'workCompletionCommitted';
// @ts-expect-error old progress string is replaced
const oldWork: DagWorkState = 'succeeded';
const syncHelpers = [
  runTreeDepthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: tree,
    visitors: { [F.AFTER_CHILD_SUBTREES]: common },
  }),
  runTreeBreadthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: tree,
    visitors: { [B.AT_LEVEL_ORDER_VERTEX]: common },
  }),
  traverseDag({
    dagDiscoverySource: graph,
    visitors: { [D.ON_WORK_READY]: dagCommon },
  }),
  runTreeDepthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: tree,
    visitors: { AFTER_CHILD_SUBTREES: common },
  }),
  runTreeBreadthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: tree,
    visitors: { AT_LEVEL_ORDER_VERTEX: common },
  }),
  traverseDag({
    ...{ dagDiscoverySource: graph },
    visitors: { ON_WORK_READY: dagCommon },
  }),
];
const asyncHelpers: Promise<unknown>[] = [
  runTreeDepthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree,
    visitors: { [F.AFTER_CHILD_SUBTREES]: common },
  }),
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree,
    visitors: { [B.AT_LEVEL_ORDER_VERTEX]: common },
  }),
  traverseDagAsync({
    dagDiscoverySource: graph,
    visitors: { [D.ON_WORK_READY]: dagCommon },
  }),
  runTreeDepthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree,
    visitors: { AFTER_CHILD_SUBTREES: common },
  }),
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree,
    visitors: { AT_LEVEL_ORDER_VERTEX: common },
  }),
  traverseDagAsync({
    ...{ dagDiscoverySource: graph },
    visitors: { ON_WORK_READY: dagCommon },
  }),
];
// @ts-expect-error helper has exactly one source
traverseDag({ treeDiscoverySource: tree, dagDiscoverySource: graph });
traverseDag({
  dagDiscoverySource: graph,
  visitors: {
    // @ts-expect-error helper phase prevents completion deferral
    [D.ON_SUBGRAPH_COMPLETION_READY]: () => ({
      commands: [
        { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
      ],
    }),
  },
});
const asyncDag = new AsyncDagTraversalBuilder({ dagDiscoverySource: graph });
asyncDag.registerVisitorCallbackForPhase(D.ON_WORK_READY, async () => ({
  commands: [
    { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
  ],
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
  TreeVertexResolutionFound,
  TreeVertexResolutionOmitted,
  TraversalExecutionSelectionPatch,
  TraversalStopReason,
  VisitorDefinitionsForPhase,
  VisitorGroupMember,
  LiveResolvedTreeView,
  ObjectChildPropertyResolutionOverrideResult,
  ObjectPropertyTreeVertexTypes,
  VertexDataMutationCommandBuilder,
  ObjectPropertyKeyValuePatch,
} from 'configurable-tree-traversal';
import {
  ObjectPropertyTreeSource,
  rewriteObject,
} from 'configurable-tree-traversal';
const treeFound: TreeVertexResolutionFound<T> = {
  kind: 'vertexResolved',
  resolvedVertexInput: { vertexContentInput: canonical },
};
const treeOmitted: TreeVertexResolutionOmitted = {
  kind: 'vertexIntentionallyOmitted',
};
// @ts-expect-error Tree omissions cannot acknowledge graph milestones.
const graphOmissionAsTree: TreeVertexResolutionOmitted = omitted;
// @ts-expect-error Graph omissions require explicit acknowledgement.
const treeOmissionAsGraph: DagSourceVertexResolution<T> = treeOmitted;
const undefinedAcknowledgement = {
  identity: null,
  kind: 'omitted' as const,
  satisfiesDependencies: undefined,
};
// @ts-expect-error Even present undefined is graph metadata.
const undefinedOmissionAsTree: TreeVertexResolutionOmitted =
  undefinedAcknowledgement;
void [graphOmissionAsTree, treeOmissionAsGraph, undefinedOmissionAsTree];
const treeResult: TreeVertexResolution<T> = treeFound;
const oldTreeResult: TreeVertexResolution<T> = {
  // @ts-expect-error Untagged tree results are removed.
  vertexContentInput: canonical,
};
// @ts-expect-error tree sources do not accept graph identity
const wrongTree: TreeVertexResolution<T> = found;
const execution: TraversalExecutionSelectionPatch<F> = {
  deliveredEventKinds: [],
  admittedVisitorCallbackPhases: { exclude: [] },
};
const bothSelectors: TraversalExecutionSelectionPatch<F> = {
  // @ts-expect-error a callback selector has exactly one mode
  admittedVisitorCallbackPhases: { include: [], exclude: [] },
};
const mixedSelectors: TraversalExecutionSelectionPatch<F> = {
  deliveredEventKinds: [],
  // @ts-expect-error canonical and legacy emission names cannot coexist
  iterateOver: [],
};
const phaseDefinition: VisitorDefinitionsForPhase<typeof common> = {
  groups: [
    {
      visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
      visitors: [
        { visitor: common, descendingExecutionPriorityWithinGroup: 1 },
      ],
    },
    { visitors: [common] },
  ],
};
depth.patchOptionsForFutureRunners({
  visitors: { [F.AFTER_CHILD_SUBTREES]: phaseDefinition },
});
depth.replaceVisitorDefinitionsForPhase(
  F.AFTER_CHILD_SUBTREES,
  depth.getDetachedVisitorRegistrationRecordsForPhase(F.AFTER_CHILD_SUBTREES),
);
depth.appendVisitorGroupForPhase(F.AFTER_CHILD_SUBTREES, {
  visitors: [common],
});
const badMember: VisitorGroupMember<typeof common> = {
  visitor: common,
  // @ts-expect-error explicit group policy cannot be set by members
  visitorCommandCommitTiming: 'afterGroup',
};
const externalDag = new DagTraversalBuilder({
  dagDiscoverySource: graph,
  workCompletionPolicy: 'requireExternalWorkSettlement',
});
const externalRunner = externalDag.createIndependentRunnerFromCurrentOptions();
const reason: TraversalStopReason | null =
  externalRunner.getTraversalStopReason();
const treeView: LiveResolvedTreeView<T> | null =
  externalRunner.getLiveResolvedTreeView();
if (treeView) {
  // @ts-expect-error safe facades have no raw records
  treeView.get(treeView.getRootVertexHandleOrNull()!);
  treeView
    .getChildVertexHandlesOrNull(treeView.getRootVertexHandleOrNull()!)!
    // @ts-expect-error query collections are readonly
    .push(treeView.getRootVertexHandleOrNull()!);
}
const resolved = externalRunner.getLiveResolvedGraphView();
const vertexHandle = resolved.getVertexHandleByIdOrNull(undefined);
if (vertexHandle) {
  const referenceId: string = vertexHandle.getReferenceIdentity();
  const hostId: unknown = resolved.requireVertexId(vertexHandle);
  void [referenceId, hostId];
}
const hookResult: ObjectChildPropertyResolutionOverrideResult<
  ObjectPropertyTreeVertexTypes<string, number>
> = { kind: 'useDefaultChildPropertyResolution' };
new ObjectPropertyTreeSource(
  { a: 1 },
  { resolveChildPropertyOrUseDefault: () => hookResult },
);
new ObjectPropertyTreeSource(
  { a: 1 },
  // @ts-expect-error Preferred object options use the tagged resolution hook.
  { makeVertexHook: () => ({ returnMe: null }) },
);
type Prop = ObjectPropertyTreeVertexTypes<string, number | undefined>;
const objectPatch: ObjectPropertyKeyValuePatch<Prop> = {
  propertyValue: undefined,
};
const objectFactory =
  ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
    Prop,
    Prop
  >();
const objectVisitor: TreeVertexPhaseVisitorCallback<
  Prop,
  Prop,
  F.AFTER_CHILD_SUBTREES
> = (v, options) => {
  const { createObjectPropertyMutationCommand: makeVertexDataMutationCommand } =
    objectFactory(v, options);
  makeVertexDataMutationCommand({
    kind: 'patchPropertyKeyOrValue',
    propertyPatch: objectPatch,
  });
  makeVertexDataMutationCommand({
    kind: 'patchPropertyKeyOrValue',
    propertyPatch: { propertyKey: 'renamed' },
  });
  makeVertexDataMutationCommand({
    kind: 'patchPropertyKeyOrValue',
    // @ts-expect-error typed object helper rejects wrong value types
    propertyPatch: { propertyValue: 'wrong' },
  });
};
declare const replace: VertexDataMutationCommandBuilder<Prop>;
replace({
  kind: 'replaceData',
  replacementData: { propertyKey: 'new', propertyValue: 1 },
});
replace({
  kind: 'replaceData',
  // @ts-expect-error generic builder requires complete data by default
  replacementData: { propertyKey: 'incomplete' },
});
rewriteObject(
  { a: 1 },
  {
    resolveChildPropertyOrUseDefault: () => ({
      kind: 'useDefaultChildPropertyResolution',
    }),
  },
);
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
