import { CTTRef } from '@core/CTTRef';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { hasVertexId, sameVertexId } from '@core/graph/identity';
import type { HintVertexId, Ref, VertexId } from '@core/graph/types';
import type {
  EligibleVisit,
  GraphStall,
  VertexWork,
} from '@core/scheduling/types';

export class GraphScheduling<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  private readonly work = new Map<Ref<T | R>, VertexWork<T | R>>();
  private readonly reverseDependencies = new Map<VertexId, Set<Ref<T | R>>>();
  private readonly eligible: EligibleVisit<T | R>[] = [];

  constructor(private readonly container: ResolvedGraphsContainer<T, R>) {}

  enrollExisting(ref: Ref<T | R>): void {
    if (!this.work.has(ref)) {
      this.container.store.resetTraversal(ref);
      this.register(ref, []);
    }
  }

  acceptRoot(result: MakeVertexResult<T>): Ref<T | R> | null {
    this.rejectTreeMetadata(result);
    const resultHasId = hasVertexId(result);
    const suppliedId = resultHasId ? result.vertexId : undefined;
    const known = resultHasId
      ? this.container.store.getIdState(suppliedId)
      : undefined;

    if (known?.kind === 'deleted') return null;
    if (known?.kind === 'omitted') {
      if (result.vertexContent !== null) this.throwOmissionContentConflict();
      return null;
    }
    if (known?.kind === 'live') {
      this.container.store.setRoot(known.ref);
      return known.ref;
    }
    if (result.vertexContent === null) {
      if (resultHasId) {
        this.container.store.markOmitted(suppliedId);
        this.satisfy(suppliedId);
      }
      return null;
    }

    const accepted = resultHasId
      ? {
          ref: new CTTRef(new Vertex<T | R>(result.vertexContent)),
          id: suppliedId,
        }
      : this.makeUniqueRef(result.vertexContent);
    this.container.acceptRoot(accepted.ref, accepted.id);
    this.register(accepted.ref, []);
    return accepted.ref;
  }

  acceptVertex(
    context: VertexResolutionContext<T | R>,
    result: MakeVertexResult<T>,
    hintIdentity?: HintVertexId,
  ): Ref<T | R> | null {
    this.rejectTreeMetadata(result);
    const resultHasId = hasVertexId(result);
    const hintHasId = hintIdentity !== undefined && hasVertexId(hintIdentity);
    if (
      resultHasId &&
      hintHasId &&
      !sameVertexId(result.vertexId, hintIdentity.vertexId)
    ) {
      throw new Error('Result vertex id and hint vertex id mismatch');
    }

    const hasSuppliedId = resultHasId || hintHasId;
    const suppliedId = resultHasId
      ? result.vertexId
      : hintHasId
      ? hintIdentity.vertexId
      : undefined;
    const known = hasSuppliedId
      ? this.container.store.getIdState(suppliedId)
      : undefined;

    if (known?.kind === 'deleted') {
      this.closeSlot(context.parentVertexRef, context.hintIndex, 'deleted');
      return null;
    }
    if (known?.kind === 'omitted') {
      if (result.vertexContent !== null) this.throwOmissionContentConflict();
      this.closeSlot(context.parentVertexRef, context.hintIndex, 'omitted');
      return null;
    }
    if (known?.kind === 'live') {
      this.container.acceptEdge(
        context.parentVertexRef,
        context.hintIndex,
        known.ref,
      );
      this.noteLinkedSlot(context.parentVertexRef, context.hintIndex);
      return known.ref;
    }
    if (result.vertexContent === null) {
      if (hasSuppliedId) {
        this.container.store.markOmitted(suppliedId);
        this.satisfy(suppliedId);
      }
      this.closeSlot(context.parentVertexRef, context.hintIndex, 'omitted');
      return null;
    }

    const accepted = hasSuppliedId
      ? {
          ref: new CTTRef(new Vertex<T | R>(result.vertexContent)),
          id: suppliedId,
        }
      : this.makeUniqueRef(result.vertexContent);
    const dependencies = this.getDependencies(context, result);
    if (
      dependencies.some(
        (id) => this.container.store.getIdState(id)?.kind === 'deleted',
      )
    ) {
      this.container.store.markDeleted(accepted.id);
      this.closeSlot(context.parentVertexRef, context.hintIndex, 'deleted');
      this.deleteDependentsOf(accepted.id);
      return null;
    }
    this.container.acceptVertex(
      accepted.ref,
      accepted.id,
      dependencies,
      context,
    );
    this.container.acceptEdge(
      context.parentVertexRef,
      context.hintIndex,
      accepted.ref,
    );
    this.noteLinkedSlot(context.parentVertexRef, context.hintIndex);
    this.register(accepted.ref, dependencies);
    return accepted.ref;
  }

  markPreVisited(ref: Ref<T | R>): void {
    const vertex = this.container.resolvedGraph.get(ref);
    if (vertex === null) throw new Error('Unknown vertex reference');
    const vertexWork = this.work.get(ref);
    if (vertexWork === undefined) throw new Error('Vertex is not enrolled');
    if (vertexWork.initialCommitted) return;

    vertexWork.initialCommitted = true;
    this.container.store.setStatus(ref, 'PRE_VISITED');
    this.satisfy(vertex.vertexId);
    this.enqueueCompletion(vertexWork);
  }

  prepareSlots(ref: Ref<T | R>, hints: readonly (T | R)['VertexHint'][]): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.expansion !== 'unprepared') {
      throw new Error('Vertex expansion is already prepared');
    }
    this.container.store.prepareSlots(ref, hints);
    vertexWork.expansion = 'open';
  }

  closeExpansion(ref: Ref<T | R>): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.expansion === 'closed') return;
    if (vertexWork.expansion === 'unprepared') {
      throw new Error('Cannot close an unprepared vertex expansion');
    }
    const vertex = this.getVertex(ref);

    vertexWork.expansion = 'closed';
    vertexWork.remainingChildren = 0;
    for (let index = 0; index < vertex.slots.length; index += 1) {
      if (vertexWork.completionAccounted[index] === true) continue;
      const slot = vertex.slots[index]!;
      if (
        slot.kind !== 'pending' &&
        (slot.kind !== 'linked' ||
          this.container.resolvedGraph.getStatusOf(slot.childRef) ===
            'COMPLETE')
      ) {
        vertexWork.completionAccounted[index] = true;
      } else {
        vertexWork.completionAccounted[index] = false;
        vertexWork.remainingChildren += 1;
      }
    }
    this.enqueueCompletion(vertexWork);
  }

  closeSlot(
    parent: Ref<T | R>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
  ): void {
    this.container.store.closeSlot(parent, index, reason);
    const vertexWork = this.work.get(parent);
    if (vertexWork === undefined) return;
    if (vertexWork.expansion === 'unprepared') vertexWork.expansion = 'open';
    this.accountSlot(vertexWork, index);
  }

  markComplete(ref: Ref<T | R>): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.completionCommitted) return;
    const vertex = this.getVertex(ref);

    vertexWork.completionCommitted = true;
    this.container.store.setStatus(ref, 'COMPLETE');
    for (const edge of vertex.incoming) {
      const parentWork = this.work.get(edge.parentRef);
      if (parentWork !== undefined)
        this.accountSlot(parentWork, edge.hintIndex);
    }
  }

  takeReady(): Ref<T | R> | null {
    if (this.eligible[0]?.order !== 'ON_READY') return null;
    return this.eligible.shift()!.ref;
  }

  takeEligible(): EligibleVisit<T | R> | null {
    return this.eligible.shift() ?? null;
  }

  inspectEligible(): readonly EligibleVisit<T | R>[] {
    return this.eligible.slice();
  }

  takeCompleting(): Ref<T | R> | null {
    if (this.eligible[0]?.order !== 'ON_COMPLETE') return null;
    return this.eligible.shift()!.ref;
  }

  deleteVertex(ref: Ref<T | R>): Set<Ref<T | R>> {
    if (!this.container.resolvedGraph.has(ref)) return new Set();

    const root = this.container.resolvedGraph.getRoot();
    if (ref === root) {
      return this.deleteRefs(this.container.resolvedGraph.getVertexRefs());
    }
    return this.deleteRefs([ref]);
  }

  private deleteDependentsOf(id: VertexId): Set<Ref<T | R>> {
    return this.deleteRefs(Array.from(this.reverseDependencies.get(id) ?? []));
  }

  private deleteRefs(initialRefs: readonly Ref<T | R>[]): Set<Ref<T | R>> {
    const removals = new Set<Ref<T | R>>();
    const pending: Ref<T | R>[] = [];
    for (const ref of initialRefs) this.addRemoval(ref, removals, pending);
    while (pending.length > 0) {
      const current = pending.pop()!;
      const vertex = this.container.resolvedGraph.get(current);
      if (vertex === null) continue;

      for (const dependent of this.reverseDependencies.get(vertex.vertexId) ??
        []) {
        this.addRemoval(dependent, removals, pending);
      }
      for (const child of this.container.resolvedGraph.getChildrenOf(current) ??
        []) {
        if (removals.has(child)) continue;
        const parents = this.container.resolvedGraph.getParentsOf(child) ?? [];
        if (parents.every((parent) => removals.has(parent))) {
          this.addRemoval(child, removals, pending);
        }
      }
    }

    const survivingSlots: Array<{ parent: Ref<T | R>; index: number }> = [];
    for (const removal of removals) {
      const vertex = this.container.resolvedGraph.get(removal);
      if (vertex === null) continue;
      for (const edge of vertex.incoming) {
        if (!removals.has(edge.parentRef)) {
          survivingSlots.push({
            parent: edge.parentRef,
            index: edge.hintIndex,
          });
        }
      }
    }

    this.container.deleteVertices(removals);
    for (const removal of removals) this.work.delete(removal);
    for (const dependents of this.reverseDependencies.values()) {
      for (const dependent of dependents) {
        if (removals.has(dependent)) dependents.delete(dependent);
      }
    }
    for (let index = this.eligible.length - 1; index >= 0; index -= 1) {
      if (removals.has(this.eligible[index]!.ref))
        this.eligible.splice(index, 1);
    }
    for (const slot of survivingSlots) {
      const parentWork = this.work.get(slot.parent);
      if (parentWork !== undefined) this.accountSlot(parentWork, slot.index);
    }
    return removals;
  }

  disableSubtree(ref: Ref<T | R>): void {
    const vertex = this.getVertex(ref);
    for (let index = 0; index < vertex.slots.length; index += 1) {
      if (vertex.slots[index]!.kind === 'pending') {
        this.closeSlot(ref, index, 'disabled');
      }
    }
    this.closeExpansion(ref);
  }

  getStall(): GraphStall<T | R> | null {
    if (this.eligible.length > 0) return null;
    const dependencies: GraphStall<T | R>['dependencies'] = [];
    const incomplete: Ref<T | R>[] = [];
    for (const [ref, vertexWork] of this.work) {
      if (vertexWork.completionCommitted) continue;
      if (vertexWork.unmet.size > 0) {
        dependencies.push({
          id: this.container.resolvedGraph.getIdOf(ref),
          missing: Array.from(vertexWork.unmet),
        });
      } else {
        incomplete.push(ref);
      }
    }
    return dependencies.length === 0 && incomplete.length === 0
      ? null
      : { dependencies, incomplete };
  }

  private rejectTreeMetadata(result: MakeVertexResult<T>): void {
    if (
      this.container.sourceMode === 'tree' &&
      (hasVertexId(result) ||
        Object.prototype.hasOwnProperty.call(result, 'dependsOn'))
    ) {
      throw new Error('Tree-source results cannot contain graph metadata');
    }
  }

  private makeUniqueRef(
    content: NonNullable<MakeVertexResult<T>['vertexContent']>,
  ): { ref: Ref<T | R>; id: string } {
    while (true) {
      const ref = new CTTRef(new Vertex<T | R>(content));
      const id = ref.getId();
      if (this.container.store.getIdState(id) === undefined) return { ref, id };
    }
  }

  private getDependencies(
    context: VertexResolutionContext<T | R>,
    result: MakeVertexResult<T>,
  ): VertexId[] {
    const declared = result.dependsOn;
    if (declared !== undefined) return Array.from(new Set(declared));
    return [this.container.resolvedGraph.getIdOf(context.parentVertexRef)];
  }

  private register(ref: Ref<T | R>, dependencies: readonly VertexId[]): void {
    const unmet = new Set<VertexId>();
    for (const dependency of dependencies) {
      let dependents = this.reverseDependencies.get(dependency);
      if (dependents === undefined) {
        dependents = new Set();
        this.reverseDependencies.set(dependency, dependents);
      }
      dependents.add(ref);

      const state = this.container.store.getIdState(dependency);
      if (state?.kind === 'omitted') continue;
      if (state?.kind === 'live') {
        const status = this.container.resolvedGraph.getStatusOf(state.ref);
        if (
          status === 'PRE_VISITED' ||
          status === 'COMPLETING' ||
          status === 'COMPLETE'
        ) {
          continue;
        }
      }
      unmet.add(dependency);
    }

    const vertexWork: VertexWork<T | R> = {
      ref,
      unmet,
      expansion: 'unprepared',
      initialAdmitted: false,
      initialCommitted: false,
      completionAdmitted: false,
      completionCommitted: false,
      completionAccounted: [],
      remainingChildren: 0,
    };
    this.work.set(ref, vertexWork);
    this.enqueueReady(vertexWork);
  }

  private satisfy(id: VertexId): void {
    const dependents = this.reverseDependencies.get(id);
    if (dependents === undefined) return;
    for (const ref of dependents) {
      const vertexWork = this.work.get(ref);
      if (vertexWork !== undefined && vertexWork.unmet.delete(id)) {
        this.enqueueReady(vertexWork);
      }
    }
  }

  private enqueueReady(vertexWork: VertexWork<T | R>): void {
    if (vertexWork.unmet.size !== 0 || vertexWork.initialAdmitted) return;
    vertexWork.initialAdmitted = true;
    this.container.store.setStatus(vertexWork.ref, 'READY');
    this.eligible.push({ ref: vertexWork.ref, order: 'ON_READY' });
  }

  private noteLinkedSlot(parent: Ref<T | R>, index: number): void {
    const vertexWork = this.work.get(parent);
    if (vertexWork === undefined) return;
    if (vertexWork.expansion === 'closed') {
      throw new Error('Cannot link a slot after expansion is closed');
    }
    if (vertexWork.expansion === 'unprepared') vertexWork.expansion = 'open';
    if (vertexWork.completionAccounted[index] === undefined) {
      vertexWork.completionAccounted[index] = false;
    }
  }

  private accountSlot(vertexWork: VertexWork<T | R>, index: number): void {
    if (vertexWork.completionAccounted[index] === true) return;
    vertexWork.completionAccounted[index] = true;
    if (vertexWork.expansion === 'closed') {
      vertexWork.remainingChildren -= 1;
      if (vertexWork.remainingChildren < 0) {
        throw new Error('Completion slot accounting underflow');
      }
      this.enqueueCompletion(vertexWork);
    }
  }

  private enqueueCompletion(vertexWork: VertexWork<T | R>): void {
    if (
      !vertexWork.initialCommitted ||
      vertexWork.expansion !== 'closed' ||
      vertexWork.remainingChildren !== 0 ||
      vertexWork.completionAdmitted ||
      vertexWork.completionCommitted
    ) {
      return;
    }
    vertexWork.completionAdmitted = true;
    this.container.store.setStatus(vertexWork.ref, 'COMPLETING');
    this.eligible.push({ ref: vertexWork.ref, order: 'ON_COMPLETE' });
  }

  private addRemoval(
    ref: Ref<T | R>,
    removals: Set<Ref<T | R>>,
    pending: Ref<T | R>[],
  ): void {
    if (!this.container.resolvedGraph.has(ref) || removals.has(ref)) return;
    removals.add(ref);
    pending.push(ref);
  }

  private getVertex(ref: Ref<T | R>) {
    const vertex = this.container.resolvedGraph.get(ref);
    if (vertex === null) throw new Error('Unknown vertex reference');
    return vertex;
  }

  private getWork(ref: Ref<T | R>): VertexWork<T | R> {
    const vertexWork = this.work.get(ref);
    if (vertexWork === undefined) throw new Error('Vertex is not enrolled');
    return vertexWork;
  }

  private throwOmissionContentConflict(): never {
    throw new Error('Vertex omission conflicts with supplied content');
  }
}
