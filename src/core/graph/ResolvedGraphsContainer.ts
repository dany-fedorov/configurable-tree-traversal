import { makeDagGraphView } from '../../traversals/dag-traversal/lib/DagGraphView';
import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type {
  VertexResolutionContext,
  VertexResolved,
} from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { GraphStore } from '@core/graph/GraphStore';
import {
  StructuralGraphSnapshot,
  type StagedSnapshotVertex,
} from '@core/graph/snapshot';
import type { GraphStoreContract, Ref } from '@core/graph/types';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';

type GraphContainerOptions = {
  sourceMode: 'graph';
  syntheticRoot?: boolean;
  saveOriginal: boolean;
};

type TreeContainerOptions<
  T extends VertexTypes,
  R extends VertexTypes,
> = {
  sourceMode: 'tree';
  saveOriginal: boolean;
  treeContainer: DepthFirstTraversalResolvedTreesContainer<T, R>;
};

export type ResolvedGraphsContainerOptions<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> =
  | GraphContainerOptions
  | (unknown extends ID ? TreeContainerOptions<T, R> : never);

export class ResolvedGraphsContainer<
  T extends VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  readonly sourceMode: 'tree' | 'graph';
  readonly syntheticRoot: boolean;
  /** Stable private identity even when the holder is omitted or deleted. */
  readonly syntheticRootId: symbol | null;
  syntheticRootRef: Ref<T | R> | null = null;
  readonly publicResolvedGraph: ResolvedGraph<T | R, ID>;
  /** Raw bookkeeping includes a private symbol when syntheticRoot is enabled. */
  readonly store: GraphStoreContract<T | R, ID | symbol>;
  /** Unlike publicResolvedGraph, this view includes the synthetic root. */
  readonly resolvedGraph: ResolvedGraph<T | R, ID | symbol>;
  readonly notMutatedResolvedGraph: ResolvedGraphSnapshot<T, ID> | null;
  readonly notMutatedResolvedGraphRefsMap: Map<Ref<T | R>, Ref<T>> | null;
  readonly treeContainer: DepthFirstTraversalResolvedTreesContainer<
    T,
    R
  > | null;
  private readonly detachedAnchors = new Set<Ref<T | R>>();
  private readonly snapshot: StructuralGraphSnapshot<T, R> | null;

  constructor(options: ResolvedGraphsContainerOptions<T, R, ID>) {
    this.sourceMode = options.sourceMode;
    this.syntheticRoot =
      options.sourceMode === 'graph' && options.syntheticRoot === true;
    this.syntheticRootId = this.syntheticRoot ? Symbol() : null;
    this.treeContainer =
      options.sourceMode === 'tree' ? options.treeContainer : null;
    this.store =
      // The erased store contains source IDs plus a private synthetic-root symbol.
      (this.treeContainer?.resolvedTree.getGraphStore() ??
        new GraphStore<T | R>('dag')) as GraphStoreContract<T | R, ID | symbol>;
    this.resolvedGraph = this.store.graph;
    // The public forest view excludes the synthetic identity; other IDs come from the source.
    this.publicResolvedGraph = (
      this.syntheticRoot
        ? makeDagGraphView(this.resolvedGraph, () => this.syntheticRootRef)
        : this.resolvedGraph
    ) as ResolvedGraph<T | R, ID>;
    this.snapshot = options.saveOriginal
      ? new StructuralGraphSnapshot<T, R>()
      : null;
    // Snapshots preserve the exact identities accepted by this typed container.
    this.notMutatedResolvedGraph = (this.snapshot?.graph ??
      null) as ResolvedGraphSnapshot<T, ID> | null;
    this.notMutatedResolvedGraphRefsMap = this.snapshot?.refsMap ?? null;
  }

  acceptRoot(
    ref: Ref<T | R>,
    id: ID,
    dependsOnWork: readonly ID[] = [],
    dependsOnSubgraphCompletion: readonly ID[] = [],
  ): void {
    if (this.syntheticRoot) {
      this.syntheticRootRef = ref;
      this.store.insertVertex({ ref, id, dependsOnWork: [], depth: 0 });
      this.store.setRoot(ref);
      return;
    }
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    if (this.treeContainer !== null) {
      this.store.insertVertex({ ref, id, dependsOnWork: [], depth: 0 });
      this.treeContainer.setRoot(ref);
    } else {
      this.store.insertVertex({
        ref,
        id,
        dependsOnWork,
        dependsOnSubgraphCompletion,
        depth: 0,
      });
      this.store.setRoot(ref);
    }
    this.commitSnapshotVertex(staged);
    this.snapshot?.setRoot(ref);
  }

  acceptVertex(
    ref: Ref<T | R>,
    id: ID,
    dependsOnWork: readonly ID[],
    context: VertexResolutionContext<T | R>,
    dependsOnSubgraphCompletion: readonly ID[] = [],
  ): void {
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    if (this.treeContainer !== null) {
      this.treeContainer.validateSavedResolutionContext(context);
      this.store.insertVertex({ ref, id, dependsOnWork, depth: context.depth });
      this.treeContainer.setWithResolutionContext(ref, context);
    } else {
      this.store.insertVertex({
        ref,
        id,
        dependsOnWork,
        dependsOnSubgraphCompletion,
        depth: context.depth,
      });
    }
    this.commitSnapshotVertex(staged);
  }

  acceptDetachedVertex(
    ref: Ref<T | R>,
    id: ID,
    dependsOnWork: readonly ID[],
    dependsOnSubgraphCompletion: readonly ID[],
  ): void {
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    this.store.insertVertex({
      ref,
      id,
      dependsOnWork,
      dependsOnSubgraphCompletion,
      depth: this.syntheticRoot ? 1 : 0,
    });
    this.commitSnapshotVertex(staged);
    this.detachedAnchors.add(ref);
  }

  isDetachedAnchor(ref: Ref<T | R>): boolean {
    return this.detachedAnchors.has(ref);
  }

  acceptEdge(
    parent: Ref<T | R>,
    index: number,
    child: Ref<T | R>,
    legacyTopologyAlreadyLinked = false,
  ): void {
    const staged =
      parent === this.syntheticRootRef
        ? null
        : this.snapshot?.stageEdge(parent, index, child) ?? null;
    const oldSlot = this.store.getTraversalSlot(parent, index);
    const isAcknowledgment =
      oldSlot?.kind === 'linked' && oldSlot.childRef === child;
    let savedEdge: { parent: VertexResolved<T>; child: Ref<T> } | null = null;
    const treeContainer = this.treeContainer;
    if (
      treeContainer !== null &&
      treeContainer.notMutatedResolvedTree !== null &&
      treeContainer.notMutatedResolvedTreeRefsMap !== null &&
      !isAcknowledgment &&
      !legacyTopologyAlreadyLinked
    ) {
      const refs = treeContainer.notMutatedResolvedTreeRefsMap;
      const savedParentRef = refs.get(parent);
      const savedChildRef = refs.get(child);
      if (savedParentRef === undefined) {
        throw new Error('Could not find not mutated parent ref');
      }
      if (savedChildRef === undefined) {
        throw new Error('Could not find not mutated child ref');
      }
      const savedParent =
        treeContainer.notMutatedResolvedTree.get(savedParentRef);
      if (savedParent === null) {
        throw new Error('Could not find not mutated parent record');
      }
      savedEdge = { parent: savedParent, child: savedChildRef };
    }
    this.store.linkSlot(parent, index, child, legacyTopologyAlreadyLinked);
    savedEdge?.parent.pushChildren([savedEdge.child]);
    if (staged !== null) this.snapshot!.commitEdge(staged);
  }

  deleteVertices(refs: ReadonlySet<Ref<T | R>>): void {
    if (this.treeContainer === null) {
      for (const ref of refs) this.detachedAnchors.delete(ref);
      this.store.removeVertices(refs);
      return;
    }
    for (const ref of refs) {
      if (this.resolvedGraph.has(ref)) this.treeContainer.delete(ref);
    }
  }

  private commitSnapshotVertex(
    staged: StagedSnapshotVertex<T, R> | null,
  ): void {
    if (staged !== null) this.snapshot!.commitVertex(staged);
  }
}
