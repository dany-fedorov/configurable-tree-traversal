import {
  CTTRef,
  core,
  ResolvedTree,
  type ResolvedTreeView,
  type ResolvedGraph,
  type ResolvedGraphSnapshot,
  type VertexTypes,
  type Vertex,
  type DepthFirstTreeRunner,
  type AsyncDepthFirstTreeRunner,
  type BreadthFirstTreeRunner,
  type AsyncBreadthFirstTreeRunner,
  type DagTraversalRunner,
  type AsyncDagTraversalRunner,
} from '../src';
import { CTTRef as CoreRef } from '../src/core';
import type { ResolvedTreeView as CoreView } from '../src/core';

type T = VertexTypes<{ label: string }, { label: string }>;
declare const ref: CTTRef<Vertex<T>>;
const constructors: [typeof CTTRef, typeof CTTRef] = [core.CTTRef, CoreRef];
const id: string = ref.getRefId();
const oldId: string = ref.getId();
const tree = new ResolvedTree<T>();
const view: ResolvedTreeView<T> = tree.asReadOnly();
const coreView: CoreView<T> = view;
const children: readonly CTTRef<Vertex<T>>[] | null = view.getChildrenOf(ref);
const path: readonly CTTRef<Vertex<T>>[] = view.getPathTo(ref);
// @ts-expect-error Query facade exposes no deletion operation.
view.delete(ref);
// @ts-expect-error Query facade exposes no mutable records.
view.get(ref);
// @ts-expect-error Query facade exposes no editing operation.
view.setRoot(ref);
// @ts-expect-error Query arrays are readonly.
view.getChildrenOf(ref)!.push(ref);
// @ts-expect-error Query paths are readonly.
view.getPathTo(ref).length = 0;
// @ts-expect-error Query contexts are readonly at their top level.
view.getResolutionContextOf(ref)!.depth = 2;
// Opaque data, hints, refs, and vertices remain shallow identities.
view.getResolutionContextOf(ref)!.vertexHint.label = 'edited';
view.getResolutionContextOf(ref)!.parentVertex.getData().label = 'edited';
view.getRoot()?.setPointsTo(ref.unref());
// Advanced container queries retain mutable detached return types.
tree.getChildrenOf(ref)!.push(ref);
tree.getResolutionContextOf(ref)!.depth = 2;
declare const graph: ResolvedGraph<T>;
declare const snapshot: ResolvedGraphSnapshot<T>;
for (const facade of [graph, snapshot]) {
  const vertexId: unknown = facade.getVertexId(ref);
  const oldVertexId: unknown = facade.getIdOf(ref);
  const byId: CTTRef<Vertex<T>> | null = facade.getVertexRefById(undefined);
  const oldById: CTTRef<Vertex<T>> | null = facade.getVertexById(Symbol());
  void [vertexId, oldVertexId, byId, oldById];
}
declare const dfs: DepthFirstTreeRunner<T, T>;
declare const asyncDfs: AsyncDepthFirstTreeRunner<T, T>;
declare const bfs: BreadthFirstTreeRunner<T>;
declare const asyncBfs: AsyncBreadthFirstTreeRunner<T, T>;
declare const dag: DagTraversalRunner<T>;
declare const asyncDag: AsyncDagTraversalRunner<T>;
const treeViews: ResolvedTreeView<T>[] = [
  dfs.getResolvedTreeView(),
  asyncDfs.getResolvedTreeView(),
  bfs.getResolvedTreeView(),
  asyncBfs.getResolvedTreeView(),
];
const dagViews: (ResolvedTreeView<T> | null)[] = [
  dag.getResolvedTreeView(),
  asyncDag.getResolvedTreeView(),
];
void [constructors, id, oldId, coreView, children, path, treeViews, dagViews];
