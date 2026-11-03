import {
  createVertexHandleFacet,
  internalRef,
  resolutionContextView,
  liveResolvedGraphView,
} from './observationFacets';
import type { VertexHandle } from './CTTRef';
import type { LiveResolvedGraphView } from './ResolvedGraphView';
import { normalizePathOptions } from '@core/normalizePathOptions';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MutableValueReference } from '@core/CTTRef';
import type {
  TreeDiscoverySource,
  TreeVertexResolution,
} from '@core/TraversableTree';
import type { StoredTreeReferenceVertexTypes } from '@core/ResolvedTreeVertexTypes';
import type { LiveResolvedTreeView } from '@core/ResolvedTreeView';
import { GraphStore } from '@core/graph/GraphStore';
import { registerTreeGraphStore } from '@core/graph/treeStoreCapabilities';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

export type InternalChildDiscoveryContext<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  discoveryDepthInEdges: number;
  parentVertexAtChildResolution: Vertex<InputVertexTypes>;
  parentVertexHandle: MutableValueReference<Vertex<InputVertexTypes>>;
  parentChildHintIndex: number;
  childDiscoveryHint: InputVertexTypes['ChildHint'];
};

export type TreeVertexDiscoveryMetadata<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  childDiscoveryContext: InternalChildDiscoveryContext<InputVertexTypes> | null;
};

export type TreeVertexTopologyRecordInput<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  metadata: TreeVertexDiscoveryMetadata<InputVertexTypes>;
  childReferences: MutableValueReference<Vertex<InputVertexTypes>>[];
};

export class MutableTreeVertexTopologyRecord<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> implements TreeVertexTopologyRecordInput<InputVertexTypes>
{
  readonly metadata: TreeVertexDiscoveryMetadata<InputVertexTypes>;
  readonly childReferences: MutableValueReference<Vertex<InputVertexTypes>>[];

  constructor(vertexContent: TreeVertexTopologyRecordInput<InputVertexTypes>) {
    this.metadata = vertexContent.metadata;
    this.childReferences = vertexContent.childReferences;
  }

  appendChildReferences(
    childReferences: Array<MutableValueReference<Vertex<InputVertexTypes>>>,
  ): void {
    for (const child of childReferences) {
      this.childReferences.push(child);
    }
  }

  getMutableChildDiscoveryContextOrNull(): InternalChildDiscoveryContext<InputVertexTypes> | null {
    return this.metadata.childDiscoveryContext;
  }

  replaceChildDiscoveryContext(
    childDiscoveryContext: InternalChildDiscoveryContext<InputVertexTypes> | null,
  ): void {
    this.metadata.childDiscoveryContext = childDiscoveryContext;
  }

  getMutableChildReferenceList(): MutableValueReference<
    Vertex<InputVertexTypes>
  >[] {
    return this.childReferences;
  }

  getParentVertexReferenceOrNull(): MutableValueReference<
    Vertex<InputVertexTypes>
  > | null {
    return this.metadata.childDiscoveryContext?.parentVertexHandle ?? null;
  }

  shallowCloneWithRecordOverrides(
    content?: Partial<TreeVertexTopologyRecordInput<InputVertexTypes>>,
  ): MutableTreeVertexTopologyRecord<InputVertexTypes> {
    const data = content?.metadata ?? this.metadata;
    const childReferences = content?.childReferences ?? this.childReferences;
    return new MutableTreeVertexTopologyRecord<InputVertexTypes>({
      metadata: {
        ...data,
        childDiscoveryContext:
          data.childDiscoveryContext === null
            ? null
            : { ...data.childDiscoveryContext },
      },
      childReferences: childReferences.slice(),
    });
  }
}

export type MutableTreeVertexRecordMap<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = Map<
  MutableValueReference<Vertex<InputVertexTypes>>,
  MutableTreeVertexTopologyRecord<InputVertexTypes>
>;

export type StructuralAncestorPathOptions = {
  includeDesignatedRoot?: boolean | undefined;
  includeTargetVertex?: boolean | undefined;
};

export class MutableResolvedTreeStore<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> implements
    TreeDiscoverySource<StoredTreeReferenceVertexTypes<InputVertexTypes>>
{
  private readonly store: GraphStore<InputVertexTypes>;
  private readonly readOnly: LiveResolvedTreeView<InputVertexTypes>;

  constructor(/*config: ResolvedTreeConfig<TTP, RW_TTP>*/) {
    this.store = new GraphStore<InputVertexTypes>('tree');
    registerTreeGraphStore(this, this.store);
    this.readOnly = Object.freeze({
      getRootVertexHandleOrNull: () =>
        createVertexHandleFacet(this.getRootVertexReferenceOrNull()),
      containsVertexHandle: (ref: VertexHandle<InputVertexTypes>) =>
        this.containsVertexReference(internalRef(ref)),
      getChildVertexHandlesOrNull: (ref: VertexHandle<InputVertexTypes>) => {
        const children = this.getDetachedChildReferenceListOrNull(
          internalRef(ref),
        );
        return children === null
          ? null
          : Object.freeze(
              children.map((child) => createVertexHandleFacet(child)),
            );
      },
      getParentVertexHandleOrNull: (ref: VertexHandle<InputVertexTypes>) =>
        createVertexHandleFacet(
          this.getParentVertexReferenceOrNull(internalRef(ref)),
        ),
      requireStructuralAncestorPathTo: (
        ref: VertexHandle<InputVertexTypes>,
        options?: StructuralAncestorPathOptions,
      ) =>
        Object.freeze(
          this.requireStructuralAncestorPathTo(internalRef(ref), options).map(
            (item) => createVertexHandleFacet(item),
          ),
        ),
      getChildDiscoveryContextOrNull: (ref: VertexHandle<InputVertexTypes>) =>
        resolutionContextView(
          this.getMutableVertexRecordOrNull(
            internalRef(ref),
          )?.getMutableChildDiscoveryContextOrNull() ?? null,
        ),
    });
  }

  /** A stable live facade without editing methods or mutable records. */
  getLiveReadOnlyTreeView(): LiveResolvedTreeView<InputVertexTypes> {
    return this.readOnly;
  }

  getRootVertexReferenceOrNull(): MutableValueReference<
    Vertex<InputVertexTypes>
  > | null {
    return this.store.graph.getRoot();
  }

  setRootVertexReference(
    root: MutableValueReference<Vertex<InputVertexTypes>>,
  ): void {
    this.store.setRoot(root);
  }

  getLiveResolvedGraphView(): LiveResolvedGraphView<InputVertexTypes> {
    return liveResolvedGraphView(this.store.graph);
  }

  getDetachedChildReferenceListOrNull(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
  ): Array<MutableValueReference<Vertex<InputVertexTypes>>> | null {
    return (
      this.getMutableVertexRecordOrNull(vertexHandle)
        ?.getMutableChildReferenceList()
        .slice() ?? null
    );
  }

  getParentVertexReferenceOrNull(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
  ): MutableValueReference<Vertex<InputVertexTypes>> | null {
    return (
      this.getMutableVertexRecordOrNull(
        vertexHandle,
      )?.getParentVertexReferenceOrNull() ?? null
    );
  }

  private deleteChildOf(
    parent: MutableValueReference<Vertex<InputVertexTypes>>,
    child: MutableValueReference<Vertex<InputVertexTypes>>,
  ): void {
    const resolved = this.getMutableVertexRecordOrNull(parent);
    if (resolved !== null) {
      const newResolved = resolved.shallowCloneWithRecordOverrides({
        childReferences: resolved
          .getMutableChildReferenceList()
          .filter((c) => c !== child),
      });
      this.setVertexRecord(parent, newResolved);
    }
  }

  deleteSubtree(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
  ): void {
    const parent = this.getParentVertexReferenceOrNull(vertexHandle);
    if (parent !== null) {
      this.deleteChildOf(parent, vertexHandle);
    }

    const refsToDelete = [vertexHandle];
    const visited = new Set<MutableValueReference<Vertex<InputVertexTypes>>>();
    while (refsToDelete.length > 0) {
      const currentRef = refsToDelete.pop();
      if (currentRef === undefined || visited.has(currentRef)) {
        continue;
      }
      visited.add(currentRef);
      const currentResolved = this.getMutableVertexRecordOrNull(currentRef);
      if (currentResolved !== null) {
        for (const childRef of currentResolved.getMutableChildReferenceList()) {
          refsToDelete.push(childRef);
        }
      }
    }
    this.store.removeVertices(visited);
  }

  containsVertexReference(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
  ): boolean {
    return this.store.graph.has(vertexHandle);
  }

  getMutableVertexRecordOrNull(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
  ): MutableTreeVertexTopologyRecord<InputVertexTypes> | null {
    return this.store.getTreeRecord(vertexHandle);
  }

  setVertexRecord(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
    vertexResolved: MutableTreeVertexTopologyRecord<InputVertexTypes>,
  ): void {
    this.store.setTreeRecord(vertexHandle, vertexResolved);
  }

  getDetachedChildDiscoveryContextOrNull(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
  ): InternalChildDiscoveryContext<InputVertexTypes> | null {
    const context =
      this.getMutableVertexRecordOrNull(
        vertexHandle,
      )?.getMutableChildDiscoveryContextOrNull() ?? null;
    return context === null ? null : { ...context };
  }

  appendChildReferencesTo(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
    children: Array<MutableValueReference<Vertex<InputVertexTypes>>>,
  ): void {
    const parentVertexResolved =
      this.getMutableVertexRecordOrNull(vertexHandle);
    if (parentVertexResolved == null) {
      throw new Error(
        `Could not find ref - ${jsonStringifySafe(vertexHandle)}`,
      );
    }
    parentVertexResolved.appendChildReferences(children);
  }

  requireStructuralAncestorPathTo(
    vertexHandle: MutableValueReference<Vertex<InputVertexTypes>>,
    options?: StructuralAncestorPathOptions,
  ): MutableValueReference<Vertex<InputVertexTypes>>[] {
    const pathOptions = normalizePathOptions(options);
    if (!this.containsVertexReference(vertexHandle)) {
      throw new Error(
        `Could not find ref - ${jsonStringifySafe(vertexHandle)}`,
      );
    }
    let curVertex = vertexHandle;
    const reversedPath: MutableValueReference<Vertex<InputVertexTypes>>[] = [
      curVertex,
    ];
    while (true) {
      const parent = this.getParentVertexReferenceOrNull(curVertex);
      if (parent === null) {
        break;
      } else {
        reversedPath.push(parent);
        curVertex = parent;
      }
    }
    let straightPath = reversedPath.reverse();
    if (
      pathOptions.includeDesignatedRoot === false &&
      straightPath[0] === this.getRootVertexReferenceOrNull()
    ) {
      straightPath = straightPath.slice(1);
    }
    if (
      pathOptions.includeTargetVertex === false &&
      straightPath[straightPath.length - 1] === vertexHandle
    ) {
      straightPath = straightPath.slice(0, -1);
    }
    return straightPath;
  }

  resolveRootVertex(): TreeVertexResolution<
    StoredTreeReferenceVertexTypes<InputVertexTypes>
  > {
    const root = this.getRootVertexReferenceOrNull();
    if (root === null) {
      return { kind: 'vertexIntentionallyOmitted' };
    }
    return {
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: root,
          $childDiscoveryHints:
            this.getDetachedChildReferenceListOrNull(root) ?? [],
        },
      },
    };
  }

  resolveChildVertexFromHint(
    vertexHint: StoredTreeReferenceVertexTypes<InputVertexTypes>['ChildHint'],
  ): TreeVertexResolution<StoredTreeReferenceVertexTypes<InputVertexTypes>> {
    return {
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: {
          $vertexData: vertexHint,
          $childDiscoveryHints:
            this.getDetachedChildReferenceListOrNull(vertexHint) ?? [],
        },
      },
    };
  }
}

/** Stable detached discovery metadata; all CTT references are restricted. */
export type ChildDiscoveryContext<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = Readonly<{
  discoveryDepthInEdges: number;
  parentVertexAtChildResolution: import('./Vertex').VertexView<InputVertexTypes>;
  parentVertexHandle: import('./CTTRef').VertexHandle<InputVertexTypes>;
  parentChildHintIndex: number;
  childDiscoveryHint: InputVertexTypes['ChildHint'];
}>;
