import {
  liveResolvedGraphView,
  livePreCommandDiscoveredGraphView,
} from '../observationFacets';
import type { LiveResolvedGraphView } from '../ResolvedGraphView';
import { makeDagGraphView } from '../../traversals/dag-traversal/lib/DagGraphView';
import type {
  InternalResolvedGraphView,
  LivePreCommandDiscoveredGraphView,
} from '@core/ResolvedGraphView';
import type {
  MutableTreeChildDiscoveryContext,
  MutableTreeVertexTopologyRecord,
} from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { GraphStore } from '@core/graph/GraphStore';
import { getTreeGraphStore } from './treeStoreCapabilities';
import {
  StructuralGraphSnapshot,
  type StagedSnapshotVertex,
} from '@core/graph/snapshot';
import type { GraphStoreContract, InternalVertexRef } from '@core/graph/types';
import type { DepthFirstTraversalResolvedTreesContainer } from '@depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer';

type GraphContainerOptions = {
  sourceMode: 'graph';
  syntheticRoot?: boolean;
  saveOriginal: boolean;
};

type TreeContainerOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  sourceMode: 'tree';
  saveOriginal: boolean;
  treeContainer: DepthFirstTraversalResolvedTreesContainer<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
};

export type ResolvedGraphsContainerOptions<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
  VertexId = unknown,
> =
  | GraphContainerOptions
  | (unknown extends VertexId
      ? TreeContainerOptions<InputVertexTypes, RewrittenVertexTypes>
      : never);

export class ResolvedGraphsContainer<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
  VertexId = unknown,
> {
  readonly sourceMode: 'tree' | 'graph';
  readonly syntheticRoot: boolean;
  /** Stable private identity even when the holder is omitted or deleted. */
  readonly syntheticRootId: symbol | null;
  syntheticRootRef: InternalVertexRef<
    InputVertexTypes | RewrittenVertexTypes
  > | null = null;
  readonly publicResolvedGraph: LiveResolvedGraphView<
    InputVertexTypes | RewrittenVertexTypes,
    VertexId
  >;
  /** Raw bookkeeping includes a private symbol when syntheticRoot is enabled. */
  readonly store: GraphStoreContract<
    InputVertexTypes | RewrittenVertexTypes,
    VertexId | symbol
  >;
  /** Unlike publicResolvedGraph, this view includes the synthetic root. */
  readonly liveResolvedGraphView: InternalResolvedGraphView<
    InputVertexTypes | RewrittenVertexTypes,
    VertexId | symbol
  >;
  readonly livePreCommandDiscoveredGraphView: LivePreCommandDiscoveredGraphView<
    InputVertexTypes,
    VertexId
  > | null;
  readonly originalGraphRefsMap: Map<
    InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    InternalVertexRef<InputVertexTypes>
  > | null;
  readonly treeContainer: DepthFirstTraversalResolvedTreesContainer<
    InputVertexTypes,
    RewrittenVertexTypes
  > | null;
  private readonly detachedAnchors = new Set<
    InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>
  >();
  private readonly snapshot: StructuralGraphSnapshot<
    InputVertexTypes,
    RewrittenVertexTypes
  > | null;

  constructor(
    options: ResolvedGraphsContainerOptions<
      InputVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ) {
    this.sourceMode = options.sourceMode;
    this.syntheticRoot =
      options.sourceMode === 'graph' && options.syntheticRoot === true;
    this.syntheticRootId = this.syntheticRoot ? Symbol() : null;
    this.treeContainer =
      options.sourceMode === 'tree' ? options.treeContainer : null;
    this.store =
      // The erased store contains source IDs plus a private synthetic-root symbol.
      (
        this.treeContainer === null
          ? new GraphStore<InputVertexTypes | RewrittenVertexTypes>('dag')
          : getTreeGraphStore(this.treeContainer.resolvedTree)
      ) as GraphStoreContract<
        InputVertexTypes | RewrittenVertexTypes,
        VertexId | symbol
      >;
    this.liveResolvedGraphView = this.store.graph;
    // The public forest view excludes the synthetic identity; other IDs come from the source.
    this.publicResolvedGraph = liveResolvedGraphView(
      this.syntheticRoot
        ? makeDagGraphView(
            this.liveResolvedGraphView,
            () => this.syntheticRootRef,
          )
        : this.liveResolvedGraphView,
    ) as LiveResolvedGraphView<
      InputVertexTypes | RewrittenVertexTypes,
      VertexId
    >;
    this.snapshot = options.saveOriginal
      ? new StructuralGraphSnapshot<InputVertexTypes, RewrittenVertexTypes>()
      : null;
    // Snapshots preserve the exact identities accepted by this typed container.
    this.livePreCommandDiscoveredGraphView = (
      this.snapshot === null
        ? null
        : livePreCommandDiscoveredGraphView(this.snapshot.graph)
    ) as LivePreCommandDiscoveredGraphView<InputVertexTypes, VertexId> | null;
    this.originalGraphRefsMap = this.snapshot?.refsMap ?? null;
  }

  acceptRoot(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    id: VertexId,
    workWaitsForWorkOf: readonly VertexId[] = [],
    workWaitsForSubgraphCompletionOf: readonly VertexId[] = [],
  ): void {
    if (this.syntheticRoot) {
      this.syntheticRootRef = ref;
      this.store.insertVertex({ ref, id, workWaitsForWorkOf: [], depth: 0 });
      this.store.setRoot(ref);
      return;
    }
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    if (this.treeContainer !== null) {
      this.store.insertVertex({ ref, id, workWaitsForWorkOf: [], depth: 0 });
      this.treeContainer.setRoot(ref);
    } else {
      this.store.insertVertex({
        ref,
        id,
        workWaitsForWorkOf,
        workWaitsForSubgraphCompletionOf,
        depth: 0,
      });
      this.store.setRoot(ref);
    }
    this.commitSnapshotVertex(staged);
    this.snapshot?.setRoot(ref);
  }

  acceptVertex(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    id: VertexId,
    workWaitsForWorkOf: readonly VertexId[],
    context: MutableTreeChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >,
    workWaitsForSubgraphCompletionOf: readonly VertexId[] = [],
  ): void {
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    if (this.treeContainer !== null) {
      this.treeContainer.validateSavedResolutionContext(context);
      this.store.insertVertex({
        ref,
        id,
        workWaitsForWorkOf,
        depth: context.discoveryDepthInEdges,
      });
      this.treeContainer.setWithResolutionContext(ref, context);
    } else {
      this.store.insertVertex({
        ref,
        id,
        workWaitsForWorkOf,
        workWaitsForSubgraphCompletionOf,
        depth: context.discoveryDepthInEdges,
      });
    }
    this.commitSnapshotVertex(staged);
  }

  acceptDetachedVertex(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    id: VertexId,
    workWaitsForWorkOf: readonly VertexId[],
    workWaitsForSubgraphCompletionOf: readonly VertexId[],
  ): void {
    const staged = this.snapshot?.stageVertex(ref, id) ?? null;
    this.store.insertVertex({
      ref,
      id,
      workWaitsForWorkOf,
      workWaitsForSubgraphCompletionOf,
      depth: this.syntheticRoot ? 1 : 0,
    });
    this.commitSnapshotVertex(staged);
    this.detachedAnchors.add(ref);
  }

  isDetachedAnchor(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): boolean {
    return this.detachedAnchors.has(ref);
  }

  acceptEdge(
    parent: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    index: number,
    child: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    legacyTopologyAlreadyLinked = false,
  ): void {
    const staged =
      parent === this.syntheticRootRef
        ? null
        : this.snapshot?.stageEdge(parent, index, child) ?? null;
    const oldSlot = this.store.getTraversalSlot(parent, index);
    const isAcknowledgment =
      oldSlot?.kind === 'linked' && oldSlot.childRef === child;
    let savedEdge: {
      parent: MutableTreeVertexTopologyRecord<InputVertexTypes>;
      child: InternalVertexRef<InputVertexTypes>;
    } | null = null;
    const treeContainer = this.treeContainer;
    if (
      treeContainer !== null &&
      treeContainer.livePreCommandDiscoveredTreeView !== null &&
      treeContainer.originalTreeRefsMap !== null &&
      !isAcknowledgment &&
      !legacyTopologyAlreadyLinked
    ) {
      const refs = treeContainer.originalTreeRefsMap;
      const savedParentRef = refs.get(parent);
      const savedChildRef = refs.get(child);
      if (savedParentRef === undefined) {
        throw new Error('Could not find not mutated parent ref');
      }
      if (savedChildRef === undefined) {
        throw new Error('Could not find not mutated child ref');
      }
      const savedParent =
        treeContainer.livePreCommandDiscoveredTreeView.getMutableVertexRecordOrNull(
          savedParentRef,
        );
      if (savedParent === null) {
        throw new Error('Could not find not mutated parent record');
      }
      savedEdge = { parent: savedParent, child: savedChildRef };
    }
    this.store.linkSlot(parent, index, child, legacyTopologyAlreadyLinked);
    savedEdge?.parent.appendChildReferences([savedEdge.child]);
    if (staged !== null) this.snapshot!.commitEdge(staged);
  }

  deleteVertices(
    refs: ReadonlySet<
      InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>
    >,
  ): void {
    if (this.treeContainer === null) {
      for (const ref of refs) this.detachedAnchors.delete(ref);
      this.store.removeVertices(refs);
      return;
    }
    for (const ref of refs) {
      if (this.liveResolvedGraphView.has(ref)) this.treeContainer.delete(ref);
    }
  }

  private commitSnapshotVertex(
    staged: StagedSnapshotVertex<InputVertexTypes, RewrittenVertexTypes> | null,
  ): void {
    if (staged !== null) this.snapshot!.commitVertex(staged);
  }
}
