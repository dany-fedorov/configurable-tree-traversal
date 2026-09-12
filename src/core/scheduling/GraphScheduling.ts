import { CTTRef } from '@core/CTTRef';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { hasVertexId, sameVertexId } from '@core/graph/identity';
import type { HintVertexId, Ref, VertexId } from '@core/graph/types';
import type { EligibleVisit, VertexWork } from '@core/scheduling/types';

export class GraphScheduling<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  private readonly work = new Map<Ref<T | R>, VertexWork<T | R>>();
  private readonly reverseDependencies = new Map<VertexId, Set<Ref<T | R>>>();
  private readonly eligible: EligibleVisit<T | R>[] = [];

  constructor(private readonly container: ResolvedGraphsContainer<T, R>) {}

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
      this.container.store.closeSlot(
        context.parentVertexRef,
        context.hintIndex,
        'deleted',
      );
      return null;
    }
    if (known?.kind === 'omitted') {
      if (result.vertexContent !== null) this.throwOmissionContentConflict();
      this.container.store.closeSlot(
        context.parentVertexRef,
        context.hintIndex,
        'omitted',
      );
      return null;
    }
    if (known?.kind === 'live') {
      this.container.acceptEdge(
        context.parentVertexRef,
        context.hintIndex,
        known.ref,
      );
      return known.ref;
    }
    if (result.vertexContent === null) {
      if (hasSuppliedId) {
        this.container.store.markOmitted(suppliedId);
        this.satisfy(suppliedId);
      }
      this.container.store.closeSlot(
        context.parentVertexRef,
        context.hintIndex,
        'omitted',
      );
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
      this.container.store.closeSlot(
        context.parentVertexRef,
        context.hintIndex,
        'deleted',
      );
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
  }

  takeReady(): Ref<T | R> | null {
    if (this.eligible[0]?.order !== 'ON_READY') return null;
    return this.eligible.shift()!.ref;
  }

  takeEligible(): EligibleVisit<T | R> | null {
    return this.eligible.shift() ?? null;
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

  private throwOmissionContentConflict(): never {
    throw new Error('Vertex omission conflicts with supplied content');
  }
}
