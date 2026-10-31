import {
  vertexHandle,
  internalRef,
  resolutionContextView,
  resolvedGraphView,
} from './observationFacets';
import type { VertexHandle } from './CTTRef';
import type { ResolvedGraphView } from './ResolvedGraphView';
import { normalizePathOptions } from '@core/normalizePathOptions';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { MutableRef } from '@core/CTTRef';
import type { TreeSource, TreeVertexResolution } from '@core/TraversableTree';
import type { ResolvedTreeVertexTypes } from '@core/ResolvedTreeVertexTypes';
import type { ResolvedTreeView } from '@core/ResolvedTreeView';
import { GraphStore } from '@core/graph/GraphStore';
import { registerTreeGraphStore } from '@core/graph/treeStoreCapabilities';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

export type InternalVertexResolutionContext<TTP extends VertexTypes> = {
  depth: number;
  parentVertex: Vertex<TTP>;
  parentVertexRef: MutableRef<Vertex<TTP>>;
  hintIndex: number;
  vertexHint: TTP['VertexHint'];
};

export type TreeVertexMetadata<TTP extends VertexTypes> = {
  resolutionContext: InternalVertexResolutionContext<TTP> | null;
};

export type TreeVertexRecordContent<TTP extends VertexTypes> = {
  metadata: TreeVertexMetadata<TTP>;
  children: MutableRef<Vertex<TTP>>[];
};

export class TreeVertexRecord<TTP extends VertexTypes>
  implements TreeVertexRecordContent<TTP>
{
  readonly metadata: TreeVertexMetadata<TTP>;
  readonly children: MutableRef<Vertex<TTP>>[];

  constructor(vertexContent: TreeVertexRecordContent<TTP>) {
    this.metadata = vertexContent.metadata;
    this.children = vertexContent.children;
  }

  pushChildren(children: Array<MutableRef<Vertex<TTP>>>): void {
    for (const child of children) {
      this.children.push(child);
    }
  }

  getResolutionContext(): InternalVertexResolutionContext<TTP> | null {
    return this.metadata.resolutionContext;
  }

  setResolutionContext(
    resolutionContext: InternalVertexResolutionContext<TTP> | null,
  ): void {
    this.metadata.resolutionContext = resolutionContext;
  }

  getChildren(): MutableRef<Vertex<TTP>>[] {
    return this.children;
  }

  getParent(): MutableRef<Vertex<TTP>> | null {
    return this.metadata.resolutionContext?.parentVertexRef ?? null;
  }

  clone(
    content?: Partial<TreeVertexRecordContent<TTP>>,
  ): TreeVertexRecord<TTP> {
    const data = content?.metadata ?? this.metadata;
    const children = content?.children ?? this.children;
    return new TreeVertexRecord<TTP>({
      metadata: {
        ...data,
        resolutionContext:
          data.resolutionContext === null
            ? null
            : { ...data.resolutionContext },
      },
      children: children.slice(),
    });
  }
}

export type ResolvedTreeMap<TTP extends VertexTypes> = Map<
  MutableRef<Vertex<TTP>>,
  TreeVertexRecord<TTP>
>;

export type GetPathToOptions = {
  noRoot?: boolean | undefined;
  noSelf?: boolean | undefined;
};

export class ResolvedTreeStore<TTP extends VertexTypes>
  implements TreeSource<ResolvedTreeVertexTypes<TTP>>
{
  private readonly store: GraphStore<TTP>;
  private readonly readOnly: ResolvedTreeView<TTP>;

  constructor(/*config: ResolvedTreeConfig<TTP, RW_TTP>*/) {
    this.store = new GraphStore<TTP>('tree');
    registerTreeGraphStore(this, this.store);
    this.readOnly = Object.freeze({
      getRoot: () => vertexHandle(this.getRoot()),
      has: (ref: VertexHandle<TTP>) => this.has(internalRef(ref)),
      getChildrenOf: (ref: VertexHandle<TTP>) => {
        const children = this.getChildrenOf(internalRef(ref));
        return children === null
          ? null
          : Object.freeze(children.map((child) => vertexHandle(child)));
      },
      getParentOf: (ref: VertexHandle<TTP>) =>
        vertexHandle(this.getParentOf(internalRef(ref))),
      requirePathTo: (ref: VertexHandle<TTP>, options?: GetPathToOptions) =>
        Object.freeze(
          this.requirePathTo(internalRef(ref), options).map((item) =>
            vertexHandle(item),
          ),
        ),
      getResolutionContextOf: (ref: VertexHandle<TTP>) =>
        resolutionContextView(
          this.get(internalRef(ref))?.getResolutionContext() ?? null,
        ),
    });
  }

  /** A stable live facade without editing methods or mutable records. */
  asReadOnly(): ResolvedTreeView<TTP> {
    return this.readOnly;
  }

  getRoot(): MutableRef<Vertex<TTP>> | null {
    return this.store.graph.getRoot();
  }

  setRoot(root: MutableRef<Vertex<TTP>>): void {
    this.store.setRoot(root);
  }

  getResolvedGraphView(): ResolvedGraphView<TTP> {
    return resolvedGraphView(this.store.graph);
  }

  getChildrenOf(
    vertexRef: MutableRef<Vertex<TTP>>,
  ): Array<MutableRef<Vertex<TTP>>> | null {
    return this.get(vertexRef)?.getChildren().slice() ?? null;
  }

  getParentOf(
    vertexRef: MutableRef<Vertex<TTP>>,
  ): MutableRef<Vertex<TTP>> | null {
    return this.get(vertexRef)?.getParent() ?? null;
  }

  private deleteChildOf(
    parent: MutableRef<Vertex<TTP>>,
    child: MutableRef<Vertex<TTP>>,
  ): void {
    const resolved = this.get(parent);
    if (resolved !== null) {
      const newResolved = resolved.clone({
        children: resolved.getChildren().filter((c) => c !== child),
      });
      this.set(parent, newResolved);
    }
  }

  deleteSubtree(vertexRef: MutableRef<Vertex<TTP>>): void {
    const parent = this.getParentOf(vertexRef);
    if (parent !== null) {
      this.deleteChildOf(parent, vertexRef);
    }

    const refsToDelete = [vertexRef];
    const visited = new Set<MutableRef<Vertex<TTP>>>();
    while (refsToDelete.length > 0) {
      const currentRef = refsToDelete.pop();
      if (currentRef === undefined || visited.has(currentRef)) {
        continue;
      }
      visited.add(currentRef);
      const currentResolved = this.get(currentRef);
      if (currentResolved !== null) {
        for (const childRef of currentResolved.getChildren()) {
          refsToDelete.push(childRef);
        }
      }
    }
    this.store.removeVertices(visited);
  }

  has(vertexRef: MutableRef<Vertex<TTP>>): boolean {
    return this.store.graph.has(vertexRef);
  }

  get(vertexRef: MutableRef<Vertex<TTP>>): TreeVertexRecord<TTP> | null {
    return this.store.getTreeRecord(vertexRef);
  }

  set(
    vertexRef: MutableRef<Vertex<TTP>>,
    vertexResolved: TreeVertexRecord<TTP>,
  ): void {
    this.store.setTreeRecord(vertexRef, vertexResolved);
  }

  getResolutionContextOf(
    vertexRef: MutableRef<Vertex<TTP>>,
  ): InternalVertexResolutionContext<TTP> | null {
    const context = this.get(vertexRef)?.getResolutionContext() ?? null;
    return context === null ? null : { ...context };
  }

  pushChildrenTo(
    vertexRef: MutableRef<Vertex<TTP>>,
    children: Array<MutableRef<Vertex<TTP>>>,
  ): void {
    const parentVertexResolved = this.get(vertexRef);
    if (parentVertexResolved == null) {
      throw new Error(`Could not find ref - ${jsonStringifySafe(vertexRef)}`);
    }
    parentVertexResolved.pushChildren(children);
  }

  requirePathTo(
    vertexRef: MutableRef<Vertex<TTP>>,
    options?: GetPathToOptions,
  ): MutableRef<Vertex<TTP>>[] {
    const pathOptions = normalizePathOptions(options);
    if (!this.has(vertexRef)) {
      throw new Error(`Could not find ref - ${jsonStringifySafe(vertexRef)}`);
    }
    let curVertex = vertexRef;
    const reversedPath: MutableRef<Vertex<TTP>>[] = [curVertex];
    while (true) {
      const parent = this.getParentOf(curVertex);
      if (parent === null) {
        break;
      } else {
        reversedPath.push(parent);
        curVertex = parent;
      }
    }
    let straightPath = reversedPath.reverse();
    if (pathOptions.noRoot === true && straightPath[0] === this.getRoot()) {
      straightPath = straightPath.slice(1);
    }
    if (
      pathOptions.noSelf === true &&
      straightPath[straightPath.length - 1] === vertexRef
    ) {
      straightPath = straightPath.slice(0, -1);
    }
    return straightPath;
  }

  resolveRoot(): TreeVertexResolution<ResolvedTreeVertexTypes<TTP>> {
    const root = this.getRoot();
    if (root === null) {
      return { kind: 'omitted' };
    }
    return {
      kind: 'found',
      vertex: {
        vertexContent: {
          $data: root,
          $childHints: this.getChildrenOf(root) ?? [],
        },
      },
    };
  }

  resolveChild(
    vertexHint: ResolvedTreeVertexTypes<TTP>['VertexHint'],
  ): TreeVertexResolution<ResolvedTreeVertexTypes<TTP>> {
    return {
      kind: 'found',
      vertex: {
        vertexContent: {
          $data: vertexHint,
          $childHints: this.getChildrenOf(vertexHint) ?? [],
        },
      },
    };
  }
}

/** Stable detached discovery metadata; all CTT references are restricted. */
export type VertexResolutionContext<T extends VertexTypes> = Readonly<{
  depth: number;
  parentVertex: import('./Vertex').VertexView<T>;
  parentVertexRef: import('./CTTRef').VertexHandle<T>;
  hintIndex: number;
  vertexHint: T['VertexHint'];
}>;
