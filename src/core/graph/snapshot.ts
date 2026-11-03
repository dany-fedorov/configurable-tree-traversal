import { normalizePathOptions } from '@core/normalizePathOptions';
import { MutableValueReference } from '@core/CTTRef';
import type { InternalResolvedGraphView } from '@core/ResolvedGraphView';
import type { StructuralAncestorPathOptions } from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { InternalVertexRef, VertexId } from '@core/graph/types';

type SnapshotEntry<InputVertexTypes extends VertexDataAndChildHintTypes> = {
  ref: InternalVertexRef<InputVertexTypes>;
  id: VertexId;
  incoming: SnapshotEdge<InputVertexTypes>[];
  children: SnapshotEdge<InputVertexTypes>[];
};

type SnapshotEdge<InputVertexTypes extends VertexDataAndChildHintTypes> = {
  parentRef: InternalVertexRef<InputVertexTypes>;
  childRef: InternalVertexRef<InputVertexTypes>;
  hintIndex: number;
};

export type StagedSnapshotVertex<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  activeRef: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
  snapshotRef: InternalVertexRef<InputVertexTypes>;
  id: VertexId;
};

export type StagedSnapshotEdge<
  InputVertexTypes extends VertexDataAndChildHintTypes,
> = {
  parent: SnapshotEntry<InputVertexTypes>;
  child: SnapshotEntry<InputVertexTypes>;
  hintIndex: number;
  idempotent: boolean;
};

export class StructuralGraphSnapshot<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  readonly graph: Omit<
    InternalResolvedGraphView<InputVertexTypes>,
    'get' | 'getVertexVisitSchedulingStageOrNull'
  >;
  readonly refsMap = new Map<
    InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    InternalVertexRef<InputVertexTypes>
  >();
  private readonly entries = new Map<
    InternalVertexRef<InputVertexTypes>,
    SnapshotEntry<InputVertexTypes>
  >();
  private readonly ids = new Map<
    VertexId,
    InternalVertexRef<InputVertexTypes>
  >();
  private root: InternalVertexRef<InputVertexTypes> | null = null;

  constructor() {
    const getVertexRefById = (id: VertexId) => this.ids.get(id) ?? null;
    const requireVertexId = (ref: InternalVertexRef<InputVertexTypes>) =>
      this.getEntry(ref).id;
    this.graph = Object.freeze({
      has: (ref: InternalVertexRef<InputVertexTypes>) => this.entries.has(ref),
      getRoot: () => this.root,
      getVertexRefs: () => Array.from(this.entries.keys()),
      getVertexRefById,
      requireVertexId,
      getParentsOf: (ref: InternalVertexRef<InputVertexTypes>) =>
        this.getParents(ref),
      getChildrenOf: (ref: InternalVertexRef<InputVertexTypes>) =>
        this.getChildren(ref),
      requirePathsTo: (
        ref: InternalVertexRef<InputVertexTypes>,
        options?: StructuralAncestorPathOptions,
      ) => this.getPaths(ref, options),
    });
  }

  stageVertex(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    id: VertexId,
  ): StagedSnapshotVertex<InputVertexTypes, RewrittenVertexTypes> {
    if (this.refsMap.has(ref)) {
      throw new Error('Vertex reference is already captured');
    }
    if (this.ids.has(id)) throw new Error('Vertex id is already captured');
    const vertex = ref.getReferencedValue();
    return {
      activeRef: ref,
      snapshotRef: new MutableValueReference(
        new Vertex<InputVertexTypes>({
          $vertexData: vertex.getVertexData() as InputVertexTypes['VertexData'],
          $childDiscoveryHints: vertex
            .getMutableChildDiscoveryHints()
            .slice() as InputVertexTypes['ChildHint'][],
        }),
      ),
      id,
    };
  }

  commitVertex(
    staged: StagedSnapshotVertex<InputVertexTypes, RewrittenVertexTypes>,
  ): void {
    const entry: SnapshotEntry<InputVertexTypes> = {
      ref: staged.snapshotRef,
      id: staged.id,
      incoming: [],
      children: [],
    };
    this.entries.set(staged.snapshotRef, entry);
    this.ids.set(staged.id, staged.snapshotRef);
    this.refsMap.set(staged.activeRef, staged.snapshotRef);
  }

  setRoot(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
    const snapshotRef = this.refsMap.get(ref);
    if (snapshotRef === undefined) {
      throw new Error('Could not find original root reference');
    }
    this.root = snapshotRef;
  }

  stageEdge(
    parentRef: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    hintIndex: number,
    childRef: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): StagedSnapshotEdge<InputVertexTypes> {
    if (!Number.isInteger(hintIndex) || hintIndex < 0) {
      throw new Error('Unknown vertex slot');
    }
    const parent = this.getMappedEntry(parentRef, 'parent');
    const child = this.getMappedEntry(childRef, 'child');
    const oldEdge = parent.children.find(
      (edge) => edge.hintIndex === hintIndex,
    );
    if (oldEdge !== undefined && oldEdge.childRef !== child.ref) {
      throw new Error(
        'Original graph slot is already linked to another vertex',
      );
    }
    return {
      parent,
      child,
      hintIndex,
      idempotent: oldEdge !== undefined,
    };
  }

  commitEdge(staged: StagedSnapshotEdge<InputVertexTypes>): void {
    if (staged.idempotent) return;
    const edge = {
      parentRef: staged.parent.ref,
      childRef: staged.child.ref,
      hintIndex: staged.hintIndex,
    };
    staged.parent.children.push(edge);
    staged.child.incoming.push(edge);
  }

  private getEntry(
    ref: InternalVertexRef<InputVertexTypes>,
  ): SnapshotEntry<InputVertexTypes> {
    const entry = this.entries.get(ref);
    if (entry === undefined) throw new Error('Unknown vertex reference');
    return entry;
  }

  private getMappedEntry(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    role: 'parent' | 'child',
  ): SnapshotEntry<InputVertexTypes> {
    const snapshotRef = this.refsMap.get(ref);
    if (snapshotRef === undefined) {
      throw new Error(`Could not find original ${role} reference`);
    }
    return this.getEntry(snapshotRef);
  }

  private getParents(
    ref: InternalVertexRef<InputVertexTypes>,
  ): InternalVertexRef<InputVertexTypes>[] | null {
    const entry = this.entries.get(ref);
    if (entry === undefined) return null;
    const seen = new Set<InternalVertexRef<InputVertexTypes>>();
    const parents: InternalVertexRef<InputVertexTypes>[] = [];
    for (const edge of entry.incoming) {
      if (!seen.has(edge.parentRef)) {
        seen.add(edge.parentRef);
        parents.push(edge.parentRef);
      }
    }
    return parents;
  }

  private getChildren(
    ref: InternalVertexRef<InputVertexTypes>,
  ): InternalVertexRef<InputVertexTypes>[] | null {
    const entry = this.entries.get(ref);
    if (entry === undefined) return null;
    return entry.children
      .slice()
      .sort((a, b) => a.hintIndex - b.hintIndex)
      .map((edge) => edge.childRef);
  }

  private getPaths(
    ref: InternalVertexRef<InputVertexTypes>,
    options?: StructuralAncestorPathOptions,
  ): InternalVertexRef<InputVertexTypes>[][] {
    const pathOptions = normalizePathOptions(options);
    this.getEntry(ref);
    const paths: InternalVertexRef<InputVertexTypes>[][] = [];
    const reversedPath: InternalVertexRef<InputVertexTypes>[] = [ref];
    const stack: Array<{
      parents: InternalVertexRef<InputVertexTypes>[];
      index: number;
    }> = [{ parents: this.getParents(ref)!, index: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.parents.length === 0) {
        paths.push(reversedPath.slice().reverse());
        stack.pop();
        reversedPath.pop();
      } else if (frame.index < frame.parents.length) {
        const parent = frame.parents[frame.index++]!;
        reversedPath.push(parent);
        stack.push({ parents: this.getParents(parent)!, index: 0 });
      } else {
        stack.pop();
        reversedPath.pop();
      }
    }
    const vertexOrder = Array.from(this.entries.keys());
    paths.sort((first, second) => {
      let index = 0;
      while (first[index] === second[index]) index += 1;
      if (index === 0) {
        return vertexOrder.indexOf(first[0]!) - vertexOrder.indexOf(second[0]!);
      }
      const children = this.getChildren(first[index - 1]!)!;
      return children.indexOf(first[index]!) - children.indexOf(second[index]!);
    });
    return paths.map((path) => {
      let result = path;
      if (
        pathOptions.includeDesignatedRoot === false &&
        result[0] === this.root
      ) {
        result = result.slice(1);
      }
      if (
        pathOptions.includeTargetVertex === false &&
        result[result.length - 1] === ref
      ) {
        result = result.slice(0, -1);
      }
      return result;
    });
  }
}
