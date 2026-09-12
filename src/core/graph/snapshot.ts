import { CTTRef } from '@core/CTTRef';
import type { ResolvedGraphSnapshot } from '@core/ResolvedGraph';
import type { GetPathToOptions } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { Ref, VertexId } from '@core/graph/types';

type SnapshotEntry<T extends TreeTypeParameters> = {
  ref: Ref<T>;
  id: VertexId;
  incoming: SnapshotEdge<T>[];
  children: SnapshotEdge<T>[];
};

type SnapshotEdge<T extends TreeTypeParameters> = {
  parentRef: Ref<T>;
  childRef: Ref<T>;
  hintIndex: number;
};

export type StagedSnapshotVertex<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  activeRef: Ref<T | R>;
  snapshotRef: Ref<T>;
  id: VertexId;
};

export type StagedSnapshotEdge<T extends TreeTypeParameters> = {
  parent: SnapshotEntry<T>;
  child: SnapshotEntry<T>;
  hintIndex: number;
  idempotent: boolean;
};

export class StructuralGraphSnapshot<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  readonly graph: ResolvedGraphSnapshot<T>;
  readonly refsMap = new Map<Ref<T | R>, Ref<T>>();
  private readonly entries = new Map<Ref<T>, SnapshotEntry<T>>();
  private readonly ids = new Map<VertexId, Ref<T>>();
  private root: Ref<T> | null = null;

  constructor() {
    this.graph = Object.freeze({
      has: (ref: Ref<T>) => this.entries.has(ref),
      getRoot: () => this.root,
      getVertexRefs: () => Array.from(this.entries.keys()),
      getVertexById: (id: VertexId) => this.ids.get(id) ?? null,
      getIdOf: (ref: Ref<T>) => this.getEntry(ref).id,
      getParentsOf: (ref: Ref<T>) => this.getParents(ref),
      getChildrenOf: (ref: Ref<T>) => this.getChildren(ref),
      getPathsTo: (ref: Ref<T>, options?: GetPathToOptions) =>
        this.getPaths(ref, options),
    });
  }

  stageVertex(ref: Ref<T | R>, id: VertexId): StagedSnapshotVertex<T, R> {
    if (this.refsMap.has(ref)) {
      throw new Error('Vertex reference is already captured');
    }
    if (this.ids.has(id)) throw new Error('Vertex id is already captured');
    const vertex = ref.unref();
    return {
      activeRef: ref,
      snapshotRef: new CTTRef(
        new Vertex<T>({
          $d: vertex.getData() as T['VertexData'],
          $c: vertex.getChildrenHints().slice() as T['VertexHint'][],
        }),
      ),
      id,
    };
  }

  commitVertex(staged: StagedSnapshotVertex<T, R>): void {
    const entry: SnapshotEntry<T> = {
      ref: staged.snapshotRef,
      id: staged.id,
      incoming: [],
      children: [],
    };
    this.entries.set(staged.snapshotRef, entry);
    this.ids.set(staged.id, staged.snapshotRef);
    this.refsMap.set(staged.activeRef, staged.snapshotRef);
  }

  setRoot(ref: Ref<T | R>): void {
    const snapshotRef = this.refsMap.get(ref);
    if (snapshotRef === undefined) {
      throw new Error('Could not find original root reference');
    }
    this.root = snapshotRef;
  }

  stageEdge(
    parentRef: Ref<T | R>,
    hintIndex: number,
    childRef: Ref<T | R>,
  ): StagedSnapshotEdge<T> {
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

  commitEdge(staged: StagedSnapshotEdge<T>): void {
    if (staged.idempotent) return;
    const edge = {
      parentRef: staged.parent.ref,
      childRef: staged.child.ref,
      hintIndex: staged.hintIndex,
    };
    staged.parent.children.push(edge);
    staged.child.incoming.push(edge);
  }

  private getEntry(ref: Ref<T>): SnapshotEntry<T> {
    const entry = this.entries.get(ref);
    if (entry === undefined) throw new Error('Unknown vertex reference');
    return entry;
  }

  private getMappedEntry(
    ref: Ref<T | R>,
    role: 'parent' | 'child',
  ): SnapshotEntry<T> {
    const snapshotRef = this.refsMap.get(ref);
    if (snapshotRef === undefined) {
      throw new Error(`Could not find original ${role} reference`);
    }
    return this.getEntry(snapshotRef);
  }

  private getParents(ref: Ref<T>): Ref<T>[] | null {
    const entry = this.entries.get(ref);
    if (entry === undefined) return null;
    const seen = new Set<Ref<T>>();
    const parents: Ref<T>[] = [];
    for (const edge of entry.incoming) {
      if (!seen.has(edge.parentRef)) {
        seen.add(edge.parentRef);
        parents.push(edge.parentRef);
      }
    }
    return parents;
  }

  private getChildren(ref: Ref<T>): Ref<T>[] | null {
    const entry = this.entries.get(ref);
    if (entry === undefined) return null;
    return entry.children
      .slice()
      .sort((a, b) => a.hintIndex - b.hintIndex)
      .map((edge) => edge.childRef);
  }

  private getPaths(ref: Ref<T>, options?: GetPathToOptions): Ref<T>[][] {
    this.getEntry(ref);
    const paths: Ref<T>[][] = [];
    const reversedPath: Ref<T>[] = [ref];
    const stack: Array<{ parents: Ref<T>[]; index: number }> = [
      { parents: this.getParents(ref)!, index: 0 },
    ];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.parents.length === 0) {
        paths.push(reversedPath.slice().reverse());
        stack.pop();
        reversedPath.pop();
      } else if (frame.index < frame.parents.length) {
        const parent = frame.parents[frame.index++]!;
        reversedPath.push(parent);
        stack.push({ parents: this.getParents(parent) ?? [], index: 0 });
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
      if (options?.noRoot === true && result[0] === this.root) {
        result = result.slice(1);
      }
      if (options?.noSelf === true && result[result.length - 1] === ref) {
        result = result.slice(0, -1);
      }
      return result;
    });
  }
}
