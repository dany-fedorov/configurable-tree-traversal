import {
  Vertex,
  type VertexHandle,
  type VertexView,
  type VertexTypes,
  type DepthFirstTreeRunner,
  type AsyncDepthFirstTreeRunner,
  type DagTraversalRunner,
  type AsyncDagTraversalRunner,
  type TreeVisitorContext,
  type DagVisitorContext,
  type TreeChildResolutionContext,
  type DagChildResolutionContext,
  type ResolvedGraphView,
} from '../src';
// @ts-expect-error removed graph view name
import type { ResolvedGraph as _ResolvedGraph } from '../src';
type Input = VertexTypes<{ input: string }, { hint: string }>;
type Output = VertexTypes<{ output: number }, { hint: string }>;
declare const handle: VertexHandle<Input>;
declare const vertex: VertexView<Input>;
// @ts-expect-error no editing capability on observation handles
handle.setValue(new Vertex<Input>({ $data: { input: '' }, $childHints: [] }));
// @ts-expect-error CTT field is readonly
vertex.$data = { input: 'changed' };
// @ts-expect-error hints are readonly
vertex.$childHints.push({ hint: 'changed' });
// @ts-expect-error query hints are readonly
vertex.getChildHints().length = 0;
// Opaque caller payloads remain shallow and writable.
vertex.getData().input = 'caller update';
vertex.getChildHints()[0]!.hint = 'caller hint update';
vertex.clone().getChildHints().push({ hint: 'independent clone' });

declare const tree: TreeVisitorContext<string, Input, Output>;
declare const dag: DagVisitorContext<Input, Output>;
declare const treeSource: TreeChildResolutionContext<Input, Output>;
declare const dagSource: DagChildResolutionContext<Input, Output>;
// @ts-expect-error ordinary callbacks expose a query view only
tree.resolvedTree;
// @ts-expect-error old graph field removed
dag.resolvedGraph;
// @ts-expect-error no live store access
treeSource.resolvedTree;
// @ts-expect-error readonly nested source reference
treeSource.resolutionContext.parentVertexRef.setValue(vertex);
// @ts-expect-error old traversal-start flag removed
dag.isTraversalRoot;
// @ts-expect-error previous callback identity has no editing capability
tree.previousPhaseVertexRef?.setValue(vertex);
const originalInput: string = tree
  .originalTreeView!.getRoot()!
  .getValue()
  .getData().input;
// @ts-expect-error original tree data stays in the input domain
tree.originalTreeView!.getRoot()!.getValue().getData().output;
const originalGraphInput: string = dag
  .originalGraphView!.getRoot()!
  .getValue()
  .getData().input;
const treeParent: VertexHandle<Input | Output> =
  treeSource.resolutionContext.parentVertexRef;
if (dagSource.resolutionContext.parentVertexRef === null) {
  const hiddenParent: null = dagSource.resolutionContext.parentVertex;
  void hiddenParent;
} else {
  const parent: VertexView<Input | Output> =
    dagSource.resolutionContext.parentVertex;
  void parent;
}
// @ts-expect-error synthetic entries have no public parent
dagSource.resolutionContext.parentVertex.getData();

declare const dfs: DepthFirstTreeRunner<Input, Output>;
declare const adfs: AsyncDepthFirstTreeRunner<Input, Output>;
declare const d: DagTraversalRunner<Input, Output>;
declare const ad: AsyncDagTraversalRunner<Input, Output>;
for (const runner of [dfs, adfs, d, ad]) {
  const graph: ResolvedGraphView<Input | Output> =
    runner.getResolvedGraphView();
  // @ts-expect-error old graph getter removed
  runner.getResolvedGraph();
  // @ts-expect-error ordinary runners do not expose stores
  runner.getResolvedTreeStore();
  // @ts-expect-error independent traversal-start predicate removed
  runner.isTraversalRootVertex(handle);
  // @ts-expect-error event record refs cannot edit
  graph.get(handle)!.vertexRef.setValue(vertex);
  // @ts-expect-error structural edges cannot edit
  graph.get(handle)!.incoming[0]!.parentRef.setValue(vertex);
  const slot = graph.get(handle)!.slots[0]!;
  if (slot.kind === 'linked') {
    // @ts-expect-error structural slots cannot edit
    slot.childRef.setValue(vertex);
  }
}
void [originalInput, originalGraphInput, treeParent];
