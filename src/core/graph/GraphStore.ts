import { normalizePathOptions } from '@core/normalizePathOptions';
import type { InternalResolvedGraphView } from '@core/ResolvedGraphView';
import type { GetPathToOptions, TreeVertexRecord } from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { engineDagValidationErrors } from '@core/errors/engineDagValidationErrors';
import { DagDiscoveryCycleError } from '@core/errors/DagDiscoveryCycleError';
import type {
  InternalChildSlot,
  InternalStructuralChildEdge,
  GraphIdentityState,
  GraphStoreContract,
  InternalResolvedGraphVertex,
  ResolvedVisitStage,
  HintVertexId,
  IdState,
  InternalVertexRef,
  VertexId,
} from '@core/graph/types';

type Entry<T extends VertexTypes> = {
  ref: InternalVertexRef<T>;
  id: VertexId;
  dependsOnWork: VertexId[];
  dependsOnSubgraphCompletion: VertexId[];
  depth: number;
  visitStage: ResolvedVisitStage;
  incoming: InternalStructuralChildEdge<T>[];
  slots: InternalChildSlot<T>[] | null;
};

export class GraphStore<T extends VertexTypes>
  implements GraphStoreContract<T>
{
  readonly graph: InternalResolvedGraphView<T>;
  private readonly entries = new Map<InternalVertexRef<T>, Entry<T>>();
  private readonly ids = new Map<VertexId, IdState<T>>();
  private readonly treeRecords = new Map<
    InternalVertexRef<T>,
    TreeVertexRecord<T>
  >();
  private root: InternalVertexRef<T> | null = null;
  private topologyVersion = 0;

  constructor(readonly mode: 'tree' | 'dag') {
    const getVertexRefById = (id: VertexId) => this.getVertexById(id);
    const requireVertexId = (ref: InternalVertexRef<T>) =>
      this.getEntry(ref).id;
    this.graph = Object.freeze({
      get: (ref: InternalVertexRef<T>) => this.getGraphVertex(ref),
      has: (ref: InternalVertexRef<T>) => this.has(ref),
      getRoot: () => this.root,
      getVertexRefs: () => Array.from(this.entries.keys()),
      getVertexRefById,
      requireVertexId,
      getVisitStageOf: (ref: InternalVertexRef<T>) =>
        this.entries.get(ref)?.visitStage ?? null,
      getParentsOf: (ref: InternalVertexRef<T>) => this.getParents(ref),
      getChildrenOf: (ref: InternalVertexRef<T>) => this.getChildren(ref),
      requirePathsTo: (ref: InternalVertexRef<T>, options?: GetPathToOptions) =>
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

  getTraversalSlots(
    ref: InternalVertexRef<T>,
  ): readonly InternalChildSlot<T>[] | null {
    return this.getEntry(ref).slots?.map((slot) => ({ ...slot })) ?? null;
  }

  /** Narrow detached reads for internal traversal consumers. */
  getTraversalSlot(
    ref: InternalVertexRef<T>,
    index: number,
  ): InternalChildSlot<T> | undefined {
    const slot = this.getEntry(ref).slots?.[index];
    return slot === undefined ? undefined : { ...slot };
  }

  getDiscoveryDepth(ref: InternalVertexRef<T>): number {
    const entry = this.getEntry(ref);
    return this.mode === 'tree'
      ? this.treeRecords.get(ref)?.getResolutionContext()?.depth ?? entry.depth
      : entry.depth;
  }

  getDeclaredDependencies(ref: InternalVertexRef<T>): VertexId[] {
    return this.getEntry(ref).dependsOnWork.slice();
  }

  getDeclaredCompleteDependencies(ref: InternalVertexRef<T>): VertexId[] {
    return this.getEntry(ref).dependsOnSubgraphCompletion.slice();
  }

  getTopologyVersion(): number {
    return this.topologyVersion;
  }

  insertVertex(input: {
    ref: InternalVertexRef<T>;
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

  setRoot(ref: InternalVertexRef<T> | null): void {
    if (this.mode === 'dag' && ref !== null) this.getEntry(ref);
    this.root = ref;
  }

  setVisitStage(
    ref: InternalVertexRef<T>,
    visitStage: ResolvedVisitStage,
  ): void {
    this.getEntry(ref).visitStage = visitStage;
  }

  resetTraversal(ref: InternalVertexRef<T>): void {
    if (this.mode !== 'tree') {
      throw new Error('TreeTraversal reset requires tree mode');
    }
    const entry = this.getEntry(ref);
    entry.visitStage = 'DISCOVERED';
    entry.slots = null;
    this.topologyVersion += 1;
  }

  prepareSlots(
    ref: InternalVertexRef<T>,
    hints: readonly T['VertexHint'][],
  ): void {
    const entry = this.getEntry(ref);
    if (entry.slots !== null)
      throw new Error('Vertex slots are already prepared');
    entry.slots = hints.map((hint) => ({ kind: 'pending', hint }));
    this.topologyVersion += 1;
  }

  linkSlot(
    parent: InternalVertexRef<T>,
    index: number,
    child: InternalVertexRef<T>,
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

    const edge: InternalStructuralChildEdge<T> = {
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
    parent: InternalVertexRef<T>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: HintVertexId,
  ): void {
    const entry = this.getEntry(parent);
    const slot = this.getSlot(entry, index);
    if (slot.kind !== 'pending') throw new Error('Slot is already resolved');
    entry.slots![index] =
      reason === 'omitted'
        ? {
            kind: 'omitted',
            hint: slot.hint,
            identity:
              omittedIdentity === undefined
                ? null
                : { vertexId: omittedIdentity.vertexId },
          }
        : { kind: reason, hint: slot.hint };
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

  removeVertices(refs: ReadonlySet<InternalVertexRef<T>>): void {
    const removals = new Set<InternalVertexRef<T>>();
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

  getTreeRecord(ref: InternalVertexRef<T>): TreeVertexRecord<T> | null {
    return this.treeRecords.get(ref) ?? null;
  }

  setTreeRecord(ref: InternalVertexRef<T>, record: TreeVertexRecord<T>): void {
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

  private has(ref: InternalVertexRef<T>): boolean {
    return this.entries.has(ref);
  }

  private getEntry(ref: InternalVertexRef<T>): Entry<T> {
    const entry = this.entries.get(ref);
    if (entry === undefined) throw new Error('Unknown vertex reference');
    return entry;
  }

  private getSlot(entry: Entry<T>, index: number): InternalChildSlot<T> {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error('Unknown vertex slot');
    }
    const slot = entry.slots?.[index];
    if (slot === undefined) throw new Error('Unknown vertex slot');
    return slot;
  }

  private getVertexById(id: VertexId): InternalVertexRef<T> | null {
    const state = this.ids.get(id);
    return state?.kind === 'live' ? state.ref : null;
  }

  private getGraphVertex(
    ref: InternalVertexRef<T>,
  ): InternalResolvedGraphVertex<T> | null {
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

  private getTreeIncoming(
    ref: InternalVertexRef<T>,
  ): InternalStructuralChildEdge<T>[] {
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

  private getParents(ref: InternalVertexRef<T>): InternalVertexRef<T>[] | null {
    if (!this.entries.has(ref)) return null;
    const incoming =
      this.mode === 'tree'
        ? this.getTreeIncoming(ref)
        : this.getEntry(ref).incoming;
    const seen = new Set<InternalVertexRef<T>>();
    const parents: InternalVertexRef<T>[] = [];
    for (const edge of incoming) {
      if (!seen.has(edge.parentRef)) {
        seen.add(edge.parentRef);
        parents.push(edge.parentRef);
      }
    }
    return parents;
  }

  private getChildren(
    ref: InternalVertexRef<T>,
  ): InternalVertexRef<T>[] | null {
    if (!this.entries.has(ref)) return null;
    if (this.mode === 'tree') {
      return this.treeRecords.get(ref)?.getChildren().slice() ?? [];
    }
    return (this.getEntry(ref).slots ?? []).flatMap((slot) =>
      slot.kind === 'linked' ? [slot.childRef] : [],
    );
  }

  private findPath(
    from: InternalVertexRef<T>,
    to: InternalVertexRef<T>,
  ): InternalVertexRef<T>[] | null {
    const pending: InternalVertexRef<T>[] = [from];
    const discovered = new Set<InternalVertexRef<T>>([from]);
    const previous = new Map<InternalVertexRef<T>, InternalVertexRef<T>>();
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
    ref: InternalVertexRef<T>,
    options?: GetPathToOptions,
  ): InternalVertexRef<T>[][] {
    const pathOptions = normalizePathOptions(options);
    this.getEntry(ref);
    const paths: InternalVertexRef<T>[][] = [];
    const reversedPath: InternalVertexRef<T>[] = [ref];
    const stack: Array<{ parents: InternalVertexRef<T>[]; index: number }> = [
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
