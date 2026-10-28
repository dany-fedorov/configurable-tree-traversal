import { normalizePathOptions } from '@core/normalizePathOptions';
import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { GetPathToOptions, TreeVertexRecord } from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { engineDagValidationErrors } from '@core/errors/engineDagValidationErrors';
import { DagDiscoveryCycleError } from '@core/errors/DagDiscoveryCycleError';
import type {
  ChildSlot,
  StructuralChildEdge,
  GraphIdentityState,
  GraphStoreContract,
  ResolvedGraphVertex,
  ResolvedVisitStage,
  HintVertexId,
  IdState,
  VertexRef,
  VertexId,
} from '@core/graph/types';

type Entry<T extends VertexTypes> = {
  ref: VertexRef<T>;
  id: VertexId;
  dependsOnWork: VertexId[];
  dependsOnSubgraphCompletion: VertexId[];
  depth: number;
  visitStage: ResolvedVisitStage;
  incoming: StructuralChildEdge<T>[];
  slots: ChildSlot<T>[] | null;
};

export class GraphStore<T extends VertexTypes>
  implements GraphStoreContract<T>
{
  readonly graph: ResolvedGraph<T>;
  private readonly entries = new Map<VertexRef<T>, Entry<T>>();
  private readonly ids = new Map<VertexId, IdState<T>>();
  private readonly treeRecords = new Map<VertexRef<T>, TreeVertexRecord<T>>();
  private root: VertexRef<T> | null = null;
  private topologyVersion = 0;

  constructor(readonly mode: 'tree' | 'dag') {
    const getVertexRefById = (id: VertexId) => this.getVertexById(id);
    const getVertexId = (ref: VertexRef<T>) => this.getEntry(ref).id;
    this.graph = Object.freeze({
      get: (ref: VertexRef<T>) => this.getGraphVertex(ref),
      has: (ref: VertexRef<T>) => this.has(ref),
      getRoot: () => this.root,
      getVertexRefs: () => Array.from(this.entries.keys()),
      getVertexRefById,
      getVertexId,
      getVisitStageOf: (ref: VertexRef<T>) =>
        this.entries.get(ref)?.visitStage ?? null,
      getParentsOf: (ref: VertexRef<T>) => this.getParents(ref),
      getChildrenOf: (ref: VertexRef<T>) => this.getChildren(ref),
      getPathsTo: (ref: VertexRef<T>, options?: GetPathToOptions) =>
        this.getPaths(ref, options),
    });
  }

  getIdState(id: VertexId): IdState<T> | undefined {
    const state = this.ids.get(id);
    return state?.kind === 'live' ? { kind: 'live', ref: state.ref } : state;
  }

  /** Includes known omissions and tombstones, without exposing live references. */
  inspectIdentityStates(): readonly GraphIdentityState[] {
    return Array.from(this.ids, ([vertexId, { kind }]) => ({ vertexId, kind }));
  }

  getTraversalSlots(ref: VertexRef<T>): readonly ChildSlot<T>[] | null {
    return this.getEntry(ref).slots?.map((slot) => ({ ...slot })) ?? null;
  }

  /** Narrow detached reads for internal traversal consumers. */
  getTraversalSlot(ref: VertexRef<T>, index: number): ChildSlot<T> | undefined {
    const slot = this.getEntry(ref).slots?.[index];
    return slot === undefined ? undefined : { ...slot };
  }

  getDiscoveryDepth(ref: VertexRef<T>): number {
    const entry = this.getEntry(ref);
    return this.mode === 'tree'
      ? this.treeRecords.get(ref)?.getResolutionContext()?.depth ?? entry.depth
      : entry.depth;
  }

  getDeclaredDependencies(ref: VertexRef<T>): VertexId[] {
    return this.getEntry(ref).dependsOnWork.slice();
  }

  getDeclaredCompleteDependencies(ref: VertexRef<T>): VertexId[] {
    return this.getEntry(ref).dependsOnSubgraphCompletion.slice();
  }

  getTopologyVersion(): number {
    return this.topologyVersion;
  }

  insertVertex(input: {
    ref: VertexRef<T>;
    id: VertexId;
    dependsOnWork: readonly VertexId[];
    dependsOnSubgraphCompletion?: readonly VertexId[];
    depth: number;
  }): void {
    if (this.ids.has(input.id)) throw new Error('Vertex id is already indexed');
    if (this.entries.has(input.ref)) {
      throw new Error('Vertex reference is already registered');
    }
    this.entries.set(input.ref, {
      ref: input.ref,
      id: input.id,
      dependsOnWork: input.dependsOnWork.slice(),
      dependsOnSubgraphCompletion:
        input.dependsOnSubgraphCompletion?.slice() ?? [],
      depth: input.depth,
      visitStage: 'DISCOVERED',
      incoming: [],
      slots: null,
    });
    this.ids.set(input.id, { kind: 'live', ref: input.ref });
    this.topologyVersion += 1;
  }

  setRoot(ref: VertexRef<T> | null): void {
    if (this.mode === 'dag' && ref !== null) this.getEntry(ref);
    this.root = ref;
  }

  setVisitStage(ref: VertexRef<T>, visitStage: ResolvedVisitStage): void {
    this.getEntry(ref).visitStage = visitStage;
  }

  resetTraversal(ref: VertexRef<T>): void {
    if (this.mode !== 'tree') {
      throw new Error('TreeTraversal reset requires tree mode');
    }
    const entry = this.getEntry(ref);
    entry.visitStage = 'DISCOVERED';
    entry.slots = null;
    this.topologyVersion += 1;
  }

  prepareSlots(ref: VertexRef<T>, hints: readonly T['VertexHint'][]): void {
    const entry = this.getEntry(ref);
    if (entry.slots !== null)
      throw new Error('Vertex slots are already prepared');
    entry.slots = hints.map((hint) => ({ kind: 'pending', hint }));
    this.topologyVersion += 1;
  }

  linkSlot(
    parent: VertexRef<T>,
    index: number,
    child: VertexRef<T>,
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
        const error = new DagDiscoveryCycleError(
          [parent, ...path].map((ref) => this.getEntry(ref).id),
        );
        engineDagValidationErrors.set(this, error);
        throw error;
      }
    }

    const edge: StructuralChildEdge<T> = {
      parentRef: parent,
      childRef: child,
      hintIndex: index,
      hint: slot.hint,
    };
    parentEntry.slots![index] = {
      kind: 'linked',
      hint: slot.hint,
      childRef: child,
    };
    this.topologyVersion += 1;
    if (!legacyTopologyAlreadyLinked) childEntry.incoming.push(edge);
    if (this.mode === 'tree' && !legacyTopologyAlreadyLinked) {
      const record = this.treeRecords.get(parent);
      if (record !== undefined) record.pushChildren([child]);
    }
  }

  closeSlot(
    parent: VertexRef<T>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: HintVertexId,
  ): void {
    const entry = this.getEntry(parent);
    const slot = this.getSlot(entry, index);
    if (slot.kind !== 'pending') throw new Error('Slot is already resolved');
    entry.slots![index] = {
      kind: reason,
      hint: slot.hint,
      ...(omittedIdentity === undefined
        ? {}
        : { vertexId: omittedIdentity.vertexId }),
    };
    this.topologyVersion += 1;
  }

  markOmitted(id: VertexId): void {
    if (this.ids.has(id)) throw new Error('Vertex id is already indexed');
    this.ids.set(id, { kind: 'omitted' });
    this.topologyVersion += 1;
  }

  markDeleted(id: VertexId): void {
    if (this.ids.has(id)) throw new Error('Vertex id is already indexed');
    this.ids.set(id, { kind: 'deleted' });
    this.topologyVersion += 1;
  }

  removeVertices(refs: ReadonlySet<VertexRef<T>>): void {
    const removals = new Set<VertexRef<T>>();
    const removedIds: VertexId[] = [];
    for (const ref of refs) {
      const entry = this.entries.get(ref);
      if (entry !== undefined) {
        removals.add(ref);
        removedIds.push(entry.id);
      }
    }

    if (removals.size > 0) this.topologyVersion += 1;
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

  getTreeRecord(ref: VertexRef<T>): TreeVertexRecord<T> | null {
    return this.treeRecords.get(ref) ?? null;
  }

  setTreeRecord(ref: VertexRef<T>, record: TreeVertexRecord<T>): void {
    if (this.mode !== 'tree') throw new Error('Tree records require tree mode');
    if (!this.entries.has(ref)) {
      const id = ref.getRefId();
      const oldState = this.ids.get(id);
      if (oldState?.kind === 'live' && oldState.ref !== ref) {
        throw new Error('Vertex id is already indexed');
      }
      const context = record.getResolutionContext();
      this.entries.set(ref, {
        ref,
        id,
        dependsOnWork: [],
        dependsOnSubgraphCompletion: [],
        depth: context?.depth ?? 0,
        visitStage: 'DISCOVERED',
        incoming: [],
        slots: null,
      });
      this.ids.set(id, { kind: 'live', ref });
      this.topologyVersion += 1;
    }
    this.treeRecords.set(ref, record);
  }

  private has(ref: VertexRef<T>): boolean {
    return this.entries.has(ref);
  }

  private getEntry(ref: VertexRef<T>): Entry<T> {
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

  private getVertexById(id: VertexId): VertexRef<T> | null {
    const state = this.ids.get(id);
    return state?.kind === 'live' ? state.ref : null;
  }

  private getGraphVertex(ref: VertexRef<T>): ResolvedGraphVertex<T> | null {
    const entry = this.entries.get(ref);
    if (entry === undefined) return null;
    const incoming = (
      this.mode === 'tree' ? this.getTreeIncoming(ref) : entry.incoming
    ).map((edge) => ({ ...edge }));
    const slots = entry.slots?.map((slot) => ({ ...slot })) ?? [];
    return {
      vertexRef: ref,
      vertex: ref.getValue(),
      vertexId: entry.id,
      discoveryDepth: this.getDiscoveryDepth(ref),
      dependsOnWork: entry.dependsOnWork.slice(),
      ...(entry.dependsOnSubgraphCompletion.length > 0
        ? {
            dependsOnSubgraphCompletion:
              entry.dependsOnSubgraphCompletion.slice(),
          }
        : {}),
      visitStage: entry.visitStage,
      incoming,
      slots,
    };
  }

  private getTreeIncoming(ref: VertexRef<T>): StructuralChildEdge<T>[] {
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

  private getParents(ref: VertexRef<T>): VertexRef<T>[] | null {
    if (!this.entries.has(ref)) return null;
    const incoming =
      this.mode === 'tree'
        ? this.getTreeIncoming(ref)
        : this.getEntry(ref).incoming;
    const seen = new Set<VertexRef<T>>();
    const parents: VertexRef<T>[] = [];
    for (const edge of incoming) {
      if (!seen.has(edge.parentRef)) {
        seen.add(edge.parentRef);
        parents.push(edge.parentRef);
      }
    }
    return parents;
  }

  private getChildren(ref: VertexRef<T>): VertexRef<T>[] | null {
    if (!this.entries.has(ref)) return null;
    if (this.mode === 'tree') {
      return this.treeRecords.get(ref)?.getChildren().slice() ?? [];
    }
    return (this.getEntry(ref).slots ?? []).flatMap((slot) =>
      slot.kind === 'linked' ? [slot.childRef] : [],
    );
  }

  private findPath(
    from: VertexRef<T>,
    to: VertexRef<T>,
  ): VertexRef<T>[] | null {
    const pending: VertexRef<T>[] = [from];
    const discovered = new Set<VertexRef<T>>([from]);
    const previous = new Map<VertexRef<T>, VertexRef<T>>();
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

  private getPaths(
    ref: VertexRef<T>,
    options?: GetPathToOptions,
  ): VertexRef<T>[][] {
    const pathOptions = normalizePathOptions(options);
    this.getEntry(ref);
    const paths: VertexRef<T>[][] = [];
    const reversedPath: VertexRef<T>[] = [ref];
    const stack: Array<{ parents: VertexRef<T>[]; index: number }> = [
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
      if (pathOptions.noRoot === true && filtered[0] === this.root) {
        filtered = filtered.slice(1);
      }
      if (
        pathOptions.noSelf === true &&
        filtered[filtered.length - 1] === ref
      ) {
        filtered = filtered.slice(0, -1);
      }
      return filtered;
    });
  }
}
