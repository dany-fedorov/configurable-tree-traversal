import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { GetPathToOptions, VertexResolved } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { createVertexIdLabeler } from '@core/graph/identity';
import type {
  ChildSlot,
  GraphEdge,
  GraphStoreContract,
  GraphVertex,
  GraphVertexStatus,
  IdState,
  Ref,
  VertexId,
} from '@core/graph/types';

type Entry<T extends TreeTypeParameters> = {
  ref: Ref<T>;
  id: VertexId;
  dependsOn: VertexId[];
  depth: number;
  status: GraphVertexStatus;
  incoming: GraphEdge<T>[];
  slots: ChildSlot<T>[] | null;
};

export class GraphStore<T extends TreeTypeParameters>
  implements GraphStoreContract<T>
{
  readonly graph: ResolvedGraph<T>;
  private readonly entries = new Map<Ref<T>, Entry<T>>();
  private readonly ids = new Map<VertexId, IdState<T>>();
  private readonly treeRecords = new Map<Ref<T>, VertexResolved<T>>();
  private readonly labelId = createVertexIdLabeler();
  private root: Ref<T> | null = null;

  constructor(readonly mode: 'tree' | 'dag') {
    this.graph = Object.freeze({
      get: (ref: Ref<T>) => this.getGraphVertex(ref),
      has: (ref: Ref<T>) => this.has(ref),
      getRoot: () => this.root,
      getVertexRefs: () => Array.from(this.entries.keys()),
      getVertexById: (id: VertexId) => this.getVertexById(id),
      getIdOf: (ref: Ref<T>) => this.getEntry(ref).id,
      getStatusOf: (ref: Ref<T>) => this.entries.get(ref)?.status ?? null,
      getParentsOf: (ref: Ref<T>) => this.getParents(ref),
      getChildrenOf: (ref: Ref<T>) => this.getChildren(ref),
      getPathsTo: (ref: Ref<T>, options?: GetPathToOptions) =>
        this.getPaths(ref, options),
    });
  }

  getIdState(id: VertexId): IdState<T> | undefined {
    const state = this.ids.get(id);
    return state?.kind === 'live' ? { kind: 'live', ref: state.ref } : state;
  }

  insertVertex(input: {
    ref: Ref<T>;
    id: VertexId;
    dependsOn: readonly VertexId[];
    depth: number;
  }): void {
    if (this.ids.has(input.id)) throw new Error('Vertex id is already indexed');
    if (this.entries.has(input.ref)) {
      throw new Error('Vertex reference is already registered');
    }
    this.entries.set(input.ref, {
      ref: input.ref,
      id: input.id,
      dependsOn: input.dependsOn.slice(),
      depth: input.depth,
      status: 'DISCOVERED',
      incoming: [],
      slots: null,
    });
    this.ids.set(input.id, { kind: 'live', ref: input.ref });
  }

  setRoot(ref: Ref<T> | null): void {
    if (this.mode === 'dag' && ref !== null) this.getEntry(ref);
    this.root = ref;
  }

  setStatus(ref: Ref<T>, status: GraphVertexStatus): void {
    this.getEntry(ref).status = status;
  }

  resetTraversal(ref: Ref<T>): void {
    if (this.mode !== 'tree') {
      throw new Error('Traversal reset requires tree mode');
    }
    const entry = this.getEntry(ref);
    entry.status = 'DISCOVERED';
    entry.slots = null;
  }

  prepareSlots(ref: Ref<T>, hints: readonly T['VertexHint'][]): void {
    const entry = this.getEntry(ref);
    if (entry.slots !== null) throw new Error('Vertex slots are already prepared');
    entry.slots = hints.map((hint) => ({ kind: 'pending', hint }));
  }

  linkSlot(
    parent: Ref<T>,
    index: number,
    child: Ref<T>,
    legacyTopologyAlreadyLinked = false,
  ): void {
    const parentEntry = this.getEntry(parent);
    const childEntry = this.getEntry(child);
    const slot = this.getSlot(parentEntry, index);
    if (slot.kind === 'linked') {
      if (slot.childRef === child) return;
      throw new Error('Slot is already linked to another vertex');
    }
    if (slot.kind !== 'pending') throw new Error('Slot is already closed');

    if (this.mode === 'dag') {
      const path = this.findPath(child, parent);
      if (path !== null) {
        const labels = [parent, ...path].map((ref) =>
          this.labelId(this.getEntry(ref).id),
        );
        throw new Error(`Discovery cycle detected: ${labels.join(' -> ')}`);
      }
    }

    const edge: GraphEdge<T> = {
      parentRef: parent,
      childRef: child,
      hintIndex: index,
      hint: slot.hint,
    };
    parentEntry.slots![index] = { kind: 'linked', hint: slot.hint, childRef: child };
    if (!legacyTopologyAlreadyLinked) childEntry.incoming.push(edge);
    if (this.mode === 'tree' && !legacyTopologyAlreadyLinked) {
      const record = this.treeRecords.get(parent);
      if (record !== undefined) record.pushChildren([child]);
    }
  }

  closeSlot(
    parent: Ref<T>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
  ): void {
    const entry = this.getEntry(parent);
    const slot = this.getSlot(entry, index);
    if (slot.kind !== 'pending') throw new Error('Slot is already resolved');
    entry.slots![index] = { kind: reason, hint: slot.hint };
  }

  markOmitted(id: VertexId): void {
    if (this.ids.has(id)) throw new Error('Vertex id is already indexed');
    this.ids.set(id, { kind: 'omitted' });
  }

  markDeleted(id: VertexId): void {
    if (this.ids.has(id)) throw new Error('Vertex id is already indexed');
    this.ids.set(id, { kind: 'deleted' });
  }

  removeVertices(refs: ReadonlySet<Ref<T>>): void {
    const removals = new Set<Ref<T>>();
    const removedIds: VertexId[] = [];
    for (const ref of refs) {
      const entry = this.entries.get(ref);
      if (entry !== undefined) {
        removals.add(ref);
        removedIds.push(entry.id);
      }
    }

    for (const entry of this.entries.values()) {
      if (removals.has(entry.ref)) continue;
      if (entry.slots !== null) {
        entry.slots = entry.slots.map((slot) =>
          slot.kind === 'linked' && removals.has(slot.childRef)
            ? { kind: 'deleted', hint: slot.hint }
            : slot,
        );
      }
      entry.incoming = entry.incoming.filter(
        (edge) => !removals.has(edge.parentRef),
      );
    }
    for (const ref of removals) {
      this.entries.delete(ref);
      this.treeRecords.delete(ref);
    }
    for (const id of removedIds) this.ids.set(id, { kind: 'deleted' });
    if (this.root !== null && refs.has(this.root)) this.root = null;
  }

  getTreeRecord(ref: Ref<T>): VertexResolved<T> | null {
    return this.treeRecords.get(ref) ?? null;
  }

  setTreeRecord(ref: Ref<T>, record: VertexResolved<T>): void {
    if (this.mode !== 'tree') throw new Error('Tree records require tree mode');
    if (!this.entries.has(ref)) {
      const id = ref.getId();
      const oldState = this.ids.get(id);
      if (oldState?.kind === 'live' && oldState.ref !== ref) {
        throw new Error('Vertex id is already indexed');
      }
      const context = record.getResolutionContext();
      this.entries.set(ref, {
        ref,
        id,
        dependsOn: [],
        depth: context?.depth ?? 0,
        status: 'DISCOVERED',
        incoming: [],
        slots: null,
      });
      this.ids.set(id, { kind: 'live', ref });
    }
    this.treeRecords.set(ref, record);
  }

  private has(ref: Ref<T>): boolean {
    return this.entries.has(ref);
  }

  private getEntry(ref: Ref<T>): Entry<T> {
    const entry = this.entries.get(ref);
    if (entry === undefined) throw new Error('Unknown vertex reference');
    return entry;
  }

  private getSlot(entry: Entry<T>, index: number): ChildSlot<T> {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error('Unknown vertex slot');
    }
    const slot = entry.slots?.[index];
    if (slot === undefined) throw new Error('Unknown vertex slot');
    return slot;
  }

  private getVertexById(id: VertexId): Ref<T> | null {
    const state = this.ids.get(id);
    return state?.kind === 'live' ? state.ref : null;
  }

  private getGraphVertex(ref: Ref<T>): GraphVertex<T> | null {
    const entry = this.entries.get(ref);
    if (entry === undefined) return null;
    const incoming =
      this.mode === 'tree' ? this.getTreeIncoming(ref) : entry.incoming.slice();
    const slots = entry.slots?.slice() ?? [];
    const discoveryDepth =
      this.mode === 'tree'
        ? this.treeRecords.get(ref)?.getResolutionContext()?.depth ?? entry.depth
        : entry.depth;
    return {
      vertexRef: ref,
      vertex: ref.unref(),
      vertexId: entry.id,
      discoveryDepth,
      dependsOn: entry.dependsOn.slice(),
      status: entry.status,
      incoming,
      slots,
    };
  }

  private getTreeIncoming(ref: Ref<T>): GraphEdge<T>[] {
    const context = this.treeRecords.get(ref)?.getResolutionContext();
    if (context === undefined || context === null) return [];
    return [
      {
        parentRef: context.parentVertexRef,
        childRef: ref,
        hintIndex: context.hintIndex,
        hint: context.vertexHint,
      },
    ];
  }

  private getParents(ref: Ref<T>): Ref<T>[] | null {
    if (!this.entries.has(ref)) return null;
    const incoming =
      this.mode === 'tree' ? this.getTreeIncoming(ref) : this.getEntry(ref).incoming;
    const seen = new Set<Ref<T>>();
    const parents: Ref<T>[] = [];
    for (const edge of incoming) {
      if (!seen.has(edge.parentRef)) {
        seen.add(edge.parentRef);
        parents.push(edge.parentRef);
      }
    }
    return parents;
  }

  private getChildren(ref: Ref<T>): Ref<T>[] | null {
    if (!this.entries.has(ref)) return null;
    if (this.mode === 'tree') {
      return this.treeRecords.get(ref)?.getChildren().slice() ?? [];
    }
    return (this.getEntry(ref).slots ?? []).flatMap((slot) =>
      slot.kind === 'linked' ? [slot.childRef] : [],
    );
  }

  private findPath(from: Ref<T>, to: Ref<T>): Ref<T>[] | null {
    const pending: Ref<T>[] = [from];
    const discovered = new Set<Ref<T>>([from]);
    const previous = new Map<Ref<T>, Ref<T>>();
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (current === to) {
        const path = [current];
        while (path[path.length - 1] !== from) {
          path.push(previous.get(path[path.length - 1]!)!);
        }
        return path.reverse();
      }
      const children = this.getChildren(current)!;
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index]!;
        if (!discovered.has(child)) {
          discovered.add(child);
          previous.set(child, current);
          pending.push(child);
        }
      }
    }
    return null;
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
        const parent = frame.parents[frame.index]!;
        frame.index += 1;
        reversedPath.push(parent);
        stack.push({
          parents: this.getParents(parent) ?? [],
          index: 0,
        });
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
      let filtered = path;
      if (options?.noRoot === true && filtered[0] === this.root) {
        filtered = filtered.slice(1);
      }
      if (options?.noSelf === true && filtered[filtered.length - 1] === ref) {
        filtered = filtered.slice(0, -1);
      }
      return filtered;
    });
  }
}
