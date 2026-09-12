import type { ResolvedGraph, ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type {
  VertexResolutionContext,
  VertexResolved,
} from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { GraphStore } from '@core/graph/GraphStore';
import {
  StructuralGraphSnapshot,
  type StagedSnapshotVertex,
} from '@core/graph/snapshot';
import type { GraphStoreContract, Ref, VertexId } from '@core/graph/types';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';

type GraphContainerOptions = {
  sourceMode: 'graph';
  saveOriginal: boolean;
};

type TreeContainerOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  sourceMode: 'tree';
  saveOriginal: boolean;
  treeContainer: DepthFirstTraversalResolvedTreesContainer<T, R>;
};

export type ResolvedGraphsContainerOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = GraphContainerOptions | TreeContainerOptions<T, R>;

export class ResolvedGraphsContainer<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  readonly sourceMode: 'tree' | 'graph';
  readonly store: GraphStoreContract<T | R>;
  readonly resolvedGraph: ResolvedGraph<T | R>;
  readonly notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
  readonly notMutatedResolvedGraphRefsMap: Map<Ref<T | R>, Ref<T>> | null;
  readonly treeContainer: DepthFirstTraversalResolvedTreesContainer<
    T,
    R
  > | null;
  private readonly snapshot: StructuralGraphSnapshot<T, R> | null;

  constructor(options: ResolvedGraphsContainerOptions<T, R>) {
    this.sourceMode = options.sourceMode;
    this.treeContainer =
      options.sourceMode === 'tree' ? options.treeContainer : null;
    this.store =
      this.treeContainer?.resolvedTree.getGraphStore() ??
      new GraphStore<T | R>('dag');
    this.resolvedGraph = this.store.graph;
    this.snapshot = options.saveOriginal
      ? new StructuralGraphSnapshot<T, R>()
      : null;
    this.notMutatedResolvedGraph = this.snapshot?.graph ?? null;
    this.notMutatedResolvedGraphRefsMap = this.snapshot?.refsMap ?? null;
  }

  acceptRoot(ref: Ref<T | R>, id: VertexId): void {
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    if (this.treeContainer !== null) {
      this.store.insertVertex({ ref, id, dependsOn: [], depth: 0 });
      this.treeContainer.setRoot(ref);
    } else {
      this.store.insertVertex({ ref, id, dependsOn: [], depth: 0 });
      this.store.setRoot(ref);
    }
    this.commitSnapshotVertex(staged);
    this.snapshot?.setRoot(ref);
  }

  acceptVertex(
    ref: Ref<T | R>,
    id: VertexId,
    dependsOn: readonly VertexId[],
    context: VertexResolutionContext<T | R>,
  ): void {
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    if (this.treeContainer !== null) {
      this.treeContainer.validateSavedResolutionContext(context);
      this.store.insertVertex({ ref, id, dependsOn, depth: context.depth });
      this.treeContainer.setWithResolutionContext(ref, context);
    } else {
      this.store.insertVertex({ ref, id, dependsOn, depth: context.depth });
    }
    this.commitSnapshotVertex(staged);
  }

  acceptEdge(parent: Ref<T | R>, index: number, child: Ref<T | R>): void {
    const staged = this.snapshot?.stageEdge(parent, index, child) ?? null;
    const oldSlot = this.resolvedGraph.get(parent)?.slots[index];
    const isAcknowledgment =
      oldSlot?.kind === 'linked' && oldSlot.childRef === child;
    let savedEdge: { parent: VertexResolved<T>; child: Ref<T> } | null = null;
    const treeContainer = this.treeContainer;
    if (
      treeContainer !== null &&
      treeContainer.notMutatedResolvedTree !== null &&
      treeContainer.notMutatedResolvedTreeRefsMap !== null &&
      !isAcknowledgment
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
    this.store.linkSlot(parent, index, child);
    savedEdge?.parent.pushChildren([savedEdge.child]);
    if (staged !== null) this.snapshot!.commitEdge(staged);
  }

  deleteVertices(refs: ReadonlySet<Ref<T | R>>): void {
    if (this.treeContainer === null) {
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
