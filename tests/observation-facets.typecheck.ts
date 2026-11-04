import {
  Vertex,
  type VertexHandle,
  type VertexView,
  type VertexDataAndChildHintTypes,
  type DepthFirstTreeRunner,
  type AsyncDepthFirstTreeRunner,
  type DagTraversalRunner,
  type AsyncDagTraversalRunner,
  type TreeVisitorContext,
  type DagVisitorContext,
  type TreeChildResolverContext,
  type DagChildResolutionContext,
  type LiveResolvedGraphView,
  type MutableTreeChildDiscoveryContext,
} from '../src';
import type {
  MutableTreeChildDiscoveryContext as CoreMutableTreeChildDiscoveryContext,
} from '../src/core';
// @ts-expect-error removed graph view name
import type { ResolvedGraph as _ResolvedGraph } from '../src';
type Input = VertexDataAndChildHintTypes<{ input: string }, { hint: string }>;
type Output = VertexDataAndChildHintTypes<{ output: number }, { hint: string }>;
declare const handle: VertexHandle<Input>;
declare const vertex: VertexView<Input>;
// @ts-expect-error no editing capability on observation handles
handle.replaceReferencedValue(
  new Vertex<Input>({ $vertexData: { input: '' }, $childDiscoveryHints: [] }),
);
// @ts-expect-error CTT field is readonly
vertex.$vertexData = { input: 'changed' };
// @ts-expect-error hints are readonly
vertex.$childDiscoveryHints.push({ hint: 'changed' });
// @ts-expect-error query hints are readonly
vertex.getDetachedChildDiscoveryHints().length = 0;
// Opaque caller payloads remain shallow and writable.
vertex.getVertexData().input = 'caller update';
vertex.getDetachedChildDiscoveryHints()[0]!.hint = 'caller hint update';
vertex
  .createEditableShallowCloneWithContentOverrides()
  .getMutableChildDiscoveryHints()
  .push({ hint: 'independent clone' });

declare const tree: TreeVisitorContext<string, Input, Output>;
declare const dag: DagVisitorContext<Input, Output>;
declare const treeSource: TreeChildResolverContext<Input, Output>;
declare const dagSource: DagChildResolutionContext<Input, Output>;
// @ts-expect-error ordinary callbacks expose a query view only
tree.resolvedTree;
// @ts-expect-error old graph field removed
dag.resolvedGraph;
// @ts-expect-error no live store access
treeSource.resolvedTree;
// @ts-expect-error readonly nested source reference
treeSource.childDiscoveryContext.parentVertexHandle.replaceReferencedValue(
  vertex.createEditableShallowCloneWithContentOverrides(),
);
// @ts-expect-error old traversal-start flag removed
dag.isTraversalRoot;
// @ts-expect-error previous callback identity has no editing capability
tree.previousCommittedVisitVertexHandleForSamePhase?.replaceReferencedValue(
  vertex.createEditableShallowCloneWithContentOverrides(),
);
const originalInput: string = tree
  .livePreCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData().input;
tree
  .livePreCommandDiscoveredTreeView!.getRootVertexHandleOrNull()!
  .getCurrentVertexView()
  // @ts-expect-error original tree data stays in the input domain
  .getVertexData().output;
const originalGraphInput: string = dag
  .livePreCommandDiscoveredGraphView!.getDesignatedRootHandleOrNull()!
  .getCurrentVertexView()
  .getVertexData().input;
const treeParent: VertexHandle<Input | Output> =
  treeSource.childDiscoveryContext.parentVertexHandle;
if (dagSource.structuralChildResolution.parentVertexHandle === null) {
  const hiddenParent: null =
    dagSource.structuralChildResolution.parentVertexAtChildResolution;
  void hiddenParent;
} else {
  const parent: VertexView<Input | Output> =
    dagSource.structuralChildResolution.parentVertexAtChildResolution;
  void parent;
}
// @ts-expect-error synthetic entries have no public parent
dagSource.structuralChildResolution.parentVertexAtChildResolution.getVertexData();

declare const dfs: DepthFirstTreeRunner<Input, Output>;
declare const adfs: AsyncDepthFirstTreeRunner<Input, Output>;
declare const d: DagTraversalRunner<Input, Output>;
declare const ad: AsyncDagTraversalRunner<Input, Output>;
for (const runner of [dfs, adfs, d, ad]) {
  const graph: LiveResolvedGraphView<Input | Output> =
    runner.getLiveResolvedGraphView();
  // @ts-expect-error old graph getter removed
  runner.getResolvedGraph();
  // @ts-expect-error ordinary runners do not expose stores
  runner.getResolvedTreeStore();
  // @ts-expect-error independent traversal-start predicate removed
  runner.isTraversalRootVertex(handle);
  graph
    .getVertexSnapshotOrNull(handle)!
    // @ts-expect-error event record refs cannot edit
    .vertexHandle.replaceReferencedValue(
      vertex.createEditableShallowCloneWithContentOverrides(),
    );
  graph
    .getVertexSnapshotOrNull(handle)!
    // @ts-expect-error structural edges cannot edit
    .incomingStructuralChildEdges[0]!.parentVertexHandle.replaceReferencedValue(
      vertex.createEditableShallowCloneWithContentOverrides(),
    );
  const slot =
    graph.getVertexSnapshotOrNull(handle)!.orderedChildDiscoverySlots[0]!;
  if (slot.kind === 'linkedToVertex') {
    // @ts-expect-error structural slots cannot edit
    slot.childVertexHandle.replaceReferencedValue(
      vertex.createEditableShallowCloneWithContentOverrides(),
    );
  }
}
void [originalInput, originalGraphInput, treeParent];

// Editable storage contexts are available through both supported type entry points.
declare const editableDiscoveryContext: MutableTreeChildDiscoveryContext<Input>;
const coreEditableDiscoveryContext: CoreMutableTreeChildDiscoveryContext<Input> =
  editableDiscoveryContext;
editableDiscoveryContext.parentVertexReference.replaceReferencedValue(
  vertex.createEditableShallowCloneWithContentOverrides(),
);
// @ts-expect-error editable storage uses references rather than observation handles
editableDiscoveryContext.parentVertexHandle;
void coreEditableDiscoveryContext;
