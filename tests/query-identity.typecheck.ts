import type { VertexHandle } from '../src';
import {
  MutableValueReference,
  core,
  MutableResolvedTreeStore,
  type LiveResolvedTreeView,
  type LiveResolvedGraphView,
  type LivePreCommandDiscoveredGraphView,
  type VertexDataAndChildHintTypes,
  type Vertex,
  type DepthFirstTreeRunner,
  type AsyncDepthFirstTreeRunner,
  type BreadthFirstTreeRunner,
  type AsyncBreadthFirstTreeRunner,
  type DagTraversalRunner,
  type AsyncDagTraversalRunner,
} from '../src';
import { MutableValueReference as CoreRef } from '../src/core';
import type { LiveResolvedTreeView as CoreView } from '../src/core';

type T = VertexDataAndChildHintTypes<{ label: string }, { label: string }>;
declare const ref: VertexHandle<T>;
const constructors: [
  typeof MutableValueReference,
  typeof MutableValueReference,
] = [core.MutableValueReference, CoreRef];
const id: string = ref.getReferenceIdentity();
const oldId: string = ref.getReferenceIdentity();
const tree = new MutableResolvedTreeStore<T>();
const view: LiveResolvedTreeView<T> = tree.getLiveReadOnlyTreeView();
const coreView: CoreView<T> = view;
const children: readonly VertexHandle<T>[] | null =
  view.getChildVertexHandlesOrNull(ref);
const path: readonly VertexHandle<T>[] =
  view.requireStructuralAncestorPathTo(ref);
// @ts-expect-error Query facade exposes no deletion operation.
view.delete(ref);
// @ts-expect-error Query facade exposes no mutable records.
view.get(ref);
// @ts-expect-error Query facade exposes no editing operation.
view.setRoot(ref);
// @ts-expect-error Query arrays are readonly.
view.getChildVertexHandlesOrNull(ref)!.push(ref);
// @ts-expect-error Query paths are readonly.
view.requireStructuralAncestorPathTo(ref).length = 0;
// @ts-expect-error Query contexts are readonly at their top level.
view.getChildDiscoveryContextOrNull(ref)!.discoveryDepthInEdges = 2;
// Opaque data, hints, refs, and vertices remain shallow identities.
view.getChildDiscoveryContextOrNull(ref)!.childDiscoveryHint.label = 'edited';
view
  .getChildDiscoveryContextOrNull(ref)!
  .parentVertexAtChildResolution.getVertexData().label = 'edited';
view
  .getRootVertexHandleOrNull()
  // @ts-expect-error observation handles cannot mutate
  ?.replaceReferencedValue(
    ref.getCurrentVertexView().createEditableShallowCloneWithContentOverrides(),
  );
// Advanced standalone container queries retain mutable detached return types.
declare const mutableRef: MutableValueReference<Vertex<T>>;
tree.getDetachedChildReferenceListOrNull(mutableRef)!.push(mutableRef);
tree.getDetachedChildDiscoveryContextOrNull(
  mutableRef,
)!.discoveryDepthInEdges = 2;
declare const graph: LiveResolvedGraphView<T>;
declare const snapshot: LivePreCommandDiscoveredGraphView<T>;
for (const facade of [graph, snapshot]) {
  const vertexId: unknown = facade.requireVertexId(ref);
  const oldVertexId: unknown = facade.requireVertexId(ref);
  const byId: VertexHandle<T> | null =
    facade.getVertexHandleByIdOrNull(undefined);
  const oldById: VertexHandle<T> | null = facade.getVertexHandleByIdOrNull(
    Symbol(),
  );
  void [vertexId, oldVertexId, byId, oldById];
}
declare const dfs: DepthFirstTreeRunner<T, T>;
declare const asyncDfs: AsyncDepthFirstTreeRunner<T, T>;
declare const bfs: BreadthFirstTreeRunner<T>;
declare const asyncBfs: AsyncBreadthFirstTreeRunner<T, T>;
declare const dag: DagTraversalRunner<T>;
declare const asyncDag: AsyncDagTraversalRunner<T>;
const treeViews: LiveResolvedTreeView<T>[] = [
  dfs.getLiveResolvedTreeView(),
  asyncDfs.getLiveResolvedTreeView(),
  bfs.getLiveResolvedTreeView(),
  asyncBfs.getLiveResolvedTreeView(),
];
const dagViews: (LiveResolvedTreeView<T> | null)[] = [
  dag.getLiveResolvedTreeView(),
  asyncDag.getLiveResolvedTreeView(),
];
void [constructors, id, oldId, coreView, children, path, treeViews, dagViews];
