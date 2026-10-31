import {
  Vertex,
  GraphWalk,
  DagTraversal,
  bindDagWorkSession,
  mapDagFragmentIds,
  defineDag,
  defineDagFragment,
  prepareDagDefinition,
  rewriteObject,
  type VertexTypes,
  type VertexHandle,
  type GraphWalkLink,
  type GraphWalkSource,
  type DagWorkSessionControl,
  type DagVisitorPhase,
  type TreeDagExecutionInspection,
  type ObjectRewriteOutputResult,
  type ChildHintTransformer,
} from 'configurable-tree-traversal';
import type { GraphWalkHydration } from 'configurable-tree-traversal/traversals/graph-walk';
import type { PreparedDagVertexSummary } from 'configurable-tree-traversal/traversals/dag-traversal';

type T = VertexTypes<string, string>;
const vertex = new Vertex<T>({
  $data: 'root',
  $childHints: ['child'] as const,
});
const handle: VertexHandle<T> = {
  getRefId: () => 'standalone',
  getValue: () => vertex,
};
handle.getValue().clone().getChildHints().push('editable');
const transform: ChildHintTransformer<T> = (hints) => [...hints, 'replacement'];
void transform;
const hydration: GraphWalkHydration = 'inlineOrCached';
const links = (): GraphWalkLink<string, number, string, typeof hydration>[] => [
  {
    target: {
      kind: 'inline',
      vertexId: 'a',
      resolution: { kind: 'found', data: 'value' },
    },
    data: 1,
  },
];
const source: GraphWalkSource<string, number, string> = {
  hydration,
  roots: () => [],
  outgoing: links,
};
const walk = new GraphWalk({
  source,
  limits: { maxDepth: 1 },
  shouldFollowEdge: (_edge, ctx) => ctx.fromVertex.data.length > 0,
});
walk.configure({ replaceLimits: { maxCandidateReadAttempts: 10 } });
// @ts-expect-error Configuration replacement is explicit; constructor limits is not a patch key.
walk.configure({ limits: undefined });
const result: ObjectRewriteOutputResult<unknown> =
  rewriteObject(null).getOutputResult();
if (result.kind === 'present') {
  const value: unknown = result.value;
  void value;
}
const definition = defineDag({
  vertices: [
    {
      vertexId: 'a',
      data: 'task',
      slots: [],
      dependsOnWork: [],
      dependsOnSubgraphCompletion: [],
    },
  ],
  omittedIds: [],
  entry: { kind: 'root', vertexId: 'a' },
});
const fragment = defineDagFragment(definition, { start: 'a' });
const mapped = mapDagFragmentIds(fragment, { mapId: (id) => ({ id }) });
const port: { id: string } = mapped.ports.start;
void port;
const prepared = prepareDagDefinition(definition);
if (prepared.kind === 'valid') {
  const summary: PreparedDagVertexSummary<string, string> =
    prepared.dag.liveVertexSummaries[0]!;
  void summary;
  const controls: DagWorkSessionControl<string> =
    prepared.dag.createWorkSession();
  const inspection: TreeDagExecutionInspection<DagVisitorPhase> =
    controls.inspect();
  void inspection.chains;
  const runner = prepared.dag.createRunner({
    workCompletion: 'externalSettlement',
  });
  const bound: DagWorkSessionControl<string> = bindDagWorkSession(runner);
  void bound;
  const graph = runner.getResolvedGraphView();
  const ref = graph.getVertexRefById('a');
  if (ref) {
    const id: string = graph.requireVertexId(ref);
    void graph.requirePathsTo(ref);
    void id;
  }
}
const runner = new DagTraversal<T, T, string | undefined>({
  traversableGraph: {
    resolveRoot: () => ({
      kind: 'omitted',
      identity: { vertexId: undefined },
      satisfiesDependencies: true,
    }),
    resolveChild: () => ({
      kind: 'omitted',
      identity: null,
      satisfiesDependencies: true,
    }),
  },
  dependsOnWorkDefault: 'none',
}).createRunner();
const explanation = runner
  .inspectMilestones()
  .explain({ vertexId: undefined, milestone: 'work' });
if (explanation.kind === 'live') {
  const work = explanation.progress.work;
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
