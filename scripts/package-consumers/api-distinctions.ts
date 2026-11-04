import {
  Vertex,
  GraphWalkBuilder,
  DagTraversalBuilder,
  bindDagExternalWorkSession,
  mapDagFragmentIds,
  copyAndNormalizeDagDefinition,
  validateAndCreateDagFragment,
  validateAndPrepareDagDefinition,
  rewriteObject,
  type VertexDataAndChildHintTypes,
  type VertexHandle,
  type GraphWalkOutgoingLink,
  type GraphWalkDiscoverySource,
  type DagExternalWorkSessionControl,
  type DagVisitorPhase,
  type TreeOrDagExecutionSnapshot,
  type ObjectRewriteOutputResult,
  type ChildHintsListTransformer,
} from 'configurable-tree-traversal';
import type { GraphWalkVertexResolutionMode } from 'configurable-tree-traversal/traversals/graph-walk';
import type { ValidatedDagTopologyLiveVertexSummary } from 'configurable-tree-traversal/traversals/dag-traversal';

type T = VertexDataAndChildHintTypes<string, string>;
const vertex = new Vertex<T>({
  $vertexData: 'root',
  $childDiscoveryHints: ['child'] as const,
});
const handle: VertexHandle<T> = {
  getReferenceIdentity: () => 'standalone',
  getCurrentVertexView: () => vertex,
};
handle
  .getCurrentVertexView()
  .createEditableShallowCloneWithContentOverrides()
  .getMutableChildDiscoveryHints()
  .push('editable');
const transform: ChildHintsListTransformer<T> = (hints) => [
  ...hints,
  'replacement',
];
void transform;
const hydration: GraphWalkVertexResolutionMode =
  'inlineResolutionOrPreviouslyAdmittedVertex';
const links = (): GraphWalkOutgoingLink<
  string,
  number,
  string,
  typeof hydration
>[] => [
  {
    targetToResolveOnAdmission: {
      kind: 'inlineResolution',
      vertexId: 'a',
      resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'value' },
    },
    edgeData: 1,
  },
];
const source: GraphWalkDiscoverySource<string, number, string> = {
  vertexResolutionMode: hydration,
  enumerateRootTargets: () => [],
  enumerateOutgoingLinks: links,
};
const walk = new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  limits: { maxRouteHopDepth: 1 },
  shouldAdmitOutgoingLinkTarget: (_edge, ctx) =>
    ctx.fromVertex.vertexData.length > 0,
});
walk.patchOptionsForFutureRunners({
  replaceLimits: { maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 10 },
});
// @ts-expect-error Configuration replacement is explicit; constructor limits is not a patch key.
walk.patchOptionsForFutureRunners({ limits: undefined });
const result: ObjectRewriteOutputResult<unknown> =
  rewriteObject(null).getFinalOutputResult();
if (result.kind === 'present') {
  const value: unknown = result.value;
  void value;
}
const definition = copyAndNormalizeDagDefinition({
  vertexDeclarations: [
    {
      vertexId: 'a',
      data: 'task',
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [],
  entry: { kind: 'root', vertexId: 'a' },
});
const fragment = validateAndCreateDagFragment(definition, { start: 'a' });
const mapped = mapDagFragmentIds(fragment, { mapId: (id) => ({ id }) });
const port: { id: string } = mapped.vertexIdsByPortName.start;
void port;
const prepared = validateAndPrepareDagDefinition(definition);
if (prepared.kind === 'valid') {
  const captureProgressSnapshot: ValidatedDagTopologyLiveVertexSummary<
    string,
    string
  > = prepared.validatedTopology.liveVertexSummaries[0]!;
  void captureProgressSnapshot;
  const controls: DagExternalWorkSessionControl<string> =
    prepared.validatedTopology.createExternalWorkSession();
  const inspection: TreeOrDagExecutionSnapshot<DagVisitorPhase> =
    controls.captureExecutionSnapshot();
  void inspection.vertexPhaseVisitorChains;
  const runner =
    prepared.validatedTopology.createIndependentRunnerFromValidatedTopology({
      workCompletionPolicy: 'requireExternalWorkSettlement',
    });
  const bound: DagExternalWorkSessionControl<string> =
    bindDagExternalWorkSession(runner);
  void bound;
  const graph = runner.getLiveResolvedGraphView();
  const ref = graph.getVertexHandleByIdOrNull('a');
  if (ref) {
    const id: string = graph.requireVertexId(ref);
    void graph.requireAllStructuralAncestorPathsTo(ref);
    void id;
  }
}
const runner = new DagTraversalBuilder<T, T, string | undefined>({
  dagDiscoverySource: {
    resolveRootVertex: () => ({
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: { vertexId: undefined },
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    }),
    resolveChildVertexFromHint: () => ({
      kind: 'vertexIntentionallyOmitted',
      omittedVertexIdentity: null,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    }),
  },
  undeclaredWorkToWorkPrerequisitePolicy: 'none',
}).createIndependentRunnerFromCurrentOptions();
const explanation = runner
  .captureMilestoneSnapshot()
  .explainMilestone({ vertexId: undefined, milestone: 'workCompletion' });
if (explanation.kind === 'live') {
  const work = explanation.progress.workState;
  void work;
}
if (explanation.kind === 'omitted') {
  const none: null = explanation.progress;
  void none;
}
// @ts-expect-error Safe handles have one canonical public name.
import type { VertexRef } from 'configurable-tree-traversal';
declare const retiredHandle: VertexRef<T>;
void retiredHandle;
// @ts-expect-error Mapping returns a fragment, without an unenforced instance alias.
import type { DagFragmentInstance } from 'configurable-tree-traversal';
declare const retiredInstance: DagFragmentInstance<string, string>;
void retiredInstance;
