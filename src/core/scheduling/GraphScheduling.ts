import { assertNoTreeMetadata } from '@core/drivers/normalizeSourceResult';
import { DagTraversalStallError } from '@core/errors/DagTraversalStallError';
import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';
import { dependencyMilestones } from './dependencyMilestones';
import { MutableRef } from '@core/CTTRef';
import type { VertexResolutionContext } from '@core/ResolvedTree';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { hasVertexId, sameVertexId } from '@core/graph/identity';
import type {
  GraphSchedulingState,
  HintVertexId,
  VertexRef,
  VertexId,
} from '@core/graph/types';
import type {
  EligibleVisit,
  GraphStall,
  VertexWork,
} from '@core/scheduling/types';

export class GraphScheduling<T extends VertexTypes, R extends VertexTypes = T> {
  private readonly work = new Map<VertexRef<T | R>, VertexWork<T | R>>();
  private readonly reverseDependencies = new Map<
    VertexId,
    Set<VertexRef<T | R>>
  >();
  private readonly reverseCompleteDependencies = new Map<
    VertexId,
    Set<VertexRef<T | R>>
  >();
  private completionValidation = false;
  private readonly removedRefs = new Set<VertexRef<T | R>>();
  private readonly reusableTreeChildren = new Map<
    VertexRef<T | R>,
    Map<number, { ref: VertexRef<T | R>; hint: (T | R)['VertexHint'] }>
  >();
  private eligible: EligibleVisit<T | R>[] = [];
  private eligibleHead = 0;
  private openDiscoveryCount = 0;
  private validatedTopologyVersion: number | null = null;

  private readonly unusedCompletedWork: Set<VertexId>;
  private readonly catalogIds = new Map<VertexId, number>();
  private readonly discoveryExpansion: VertexRef<T | R>[] = [];
  private readonly seededExpansion: VertexRef<T | R>[] = [];

  constructor(
    private readonly container: ResolvedGraphsContainer<T, R>,
    completedWork?: ReadonlySet<VertexId>,
    private eager = false,
    private readonly rootWorkDependencies: 'honor' | 'ignore' = 'honor',
    private readonly omittedWorkDependencies:
      | 'none'
      | 'discoveryParentWork' = 'none',
  ) {
    this.unusedCompletedWork = new Set(completedWork);
  }

  enableEagerDiscovery(): void {
    this.eager = true;
  }

  getUnusedCompletedWorkIds(): VertexId[] {
    return Array.from(this.unusedCompletedWork);
  }

  takeSeededExpansion(): VertexRef<T | R> | null {
    return this.seededExpansion.shift() ?? null;
  }

  /** Detached progress records; querying never advances scheduling queues. */
  inspectWork(): VertexWork<T | R>[] {
    return Array.from(this.work.values(), (work) => ({
      ...work,
      unmet: new Set(work.unmet),
      unmetComplete: new Set(work.unmetComplete),
      completionAccounted: work.completionAccounted.slice(),
    }));
  }

  /** Narrow detached facts for inspection; never advances any scheduler queue. */
  inspectSchedulingState(): readonly GraphSchedulingState[] {
    return Array.from(this.work.values(), (work) => ({
      vertexId: this.container.resolvedGraph.getVertexId(work.ref),
      expansion: work.expansion,
      initialCommitted: work.initialCommitted,
      completionCommitted: work.completionCommitted,
      remainingChildren: work.remainingChildren,
    }));
  }

  takeDiscoveryExpansion(): VertexRef<T | R> | null {
    return this.discoveryExpansion.shift() ?? null;
  }

  /** Closed hint expansion for every retained vertex; independent of work success. */
  isDiscoveryComplete(): boolean {
    return this.openDiscoveryCount === 0;
  }

  usesCompletionDependencies(): boolean {
    return this.completionValidation;
  }

  private declaredPrerequisites(ref: VertexRef<T | R>): VertexId[] {
    return Array.from(
      new Set([
        ...this.container.store.getDeclaredDependencies(ref),
        ...this.container.store.getDeclaredCompleteDependencies(ref),
      ]),
    );
  }

  /** Validate original declarations, even when a successful seed satisfied them. */
  validateDiscoveredGraph(): void {
    const dependencies = Array.from(this.work.keys(), (ref) => ({
      id: this.container.resolvedGraph.getVertexId(ref),
      missing: this.declaredPrerequisites(ref),
    }));
    const diagnostics = this.diagnoseStall({ dependencies, incomplete: [] });
    if (
      diagnostics.unknownPrerequisiteIds.length > 0 ||
      diagnostics.dependencyCycleComponents.length > 0
    ) {
      throw new DagTraversalStallError(diagnostics);
    }
    if (this.getUnusedCompletedWorkIds().length > 0) {
      throw new TypeError('completedWork contains undiscovered vertex IDs');
    }
    this.validatedTopologyVersion = this.container.store.getTopologyVersion();
  }

  /** Reuse only successful validation; a summary never publishes evidence. */
  diagnoseTopology(
    refs: readonly VertexRef<T | R>[],
  ): DagTraversalStallDiagnostics | null {
    if (
      this.validatedTopologyVersion ===
      this.container.store.getTopologyVersion()
    ) {
      return null;
    }
    return this.diagnoseStall({
      dependencies: refs.map((ref) => ({
        id: this.container.resolvedGraph.getVertexId(ref),
        missing: this.declaredPrerequisites(ref),
      })),
      incomplete: [],
    });
  }

  restoreDagSeed(readyVisits: readonly EligibleVisit<T | R>[]): void {
    const refs = this.container.resolvedGraph.getVertexRefs();
    const restoredWork = new Map<VertexRef<T | R>, VertexWork<T | R>>();
    const restoredDependencies = new Map<VertexId, Set<VertexRef<T | R>>>();
    const restoredCompleteDependencies = new Map<
      VertexId,
      Set<VertexRef<T | R>>
    >();
    const queued = new Map<VertexRef<T | R>, EligibleVisit<T | R>>();

    for (const visit of readyVisits) {
      if (!this.container.resolvedGraph.has(visit.ref)) {
        this.throwInvalidSeed('ready visit references an unknown vertex');
      }
      if (queued.has(visit.ref)) {
        this.throwInvalidSeed('ready visit is duplicated');
      }
      if (
        visit.order !== 'ON_WORK_READY' &&
        visit.order !== 'ON_SUBGRAPH_READY'
      ) {
        this.throwInvalidSeed('ready visit has an invalid order');
      }
      queued.set(visit.ref, visit);
    }

    for (const ref of refs) {
      const vertex = this.getVertex(ref);
      const slots = this.container.store.getTraversalSlots(ref);
      const unmet = this.registerDependencies(
        ref,
        vertex.dependsOnWork,
        restoredDependencies,
        false,
      );
      const unmetComplete = this.registerDependencies(
        ref,
        vertex.dependsOnSubgraphCompletion ?? [],
        restoredCompleteDependencies,
        true,
      );
      const hasUnmet = unmet.size > 0 || unmetComplete.size > 0;

      if (slots?.some((slot) => slot.kind === 'pending') === true) {
        this.throwInvalidSeed('vertex has a partially consumed expansion');
      }
      const completionAccounted =
        slots?.map(
          (slot) =>
            slot.kind !== 'linked' ||
            this.container.resolvedGraph.getVisitStageOf(slot.childRef) ===
              'COMPLETE',
        ) ?? [];
      const remainingChildren = completionAccounted.filter(
        (accounted) => !accounted,
      ).length;
      const status = vertex.visitStage;
      const queuedVisit = queued.get(ref);
      const work: VertexWork<T | R> = {
        ref,
        unmet,
        unmetComplete,
        expansion: slots === null ? 'unprepared' : 'closed',
        initialAdmitted: status !== 'DISCOVERED',
        initialCommitted:
          status === 'INITIAL_VISIT_COMMITTED' ||
          status === 'COMPLETION_VISIT_ELIGIBLE' ||
          status === 'COMPLETE',
        completionAdmitted:
          status === 'COMPLETION_VISIT_ELIGIBLE' || status === 'COMPLETE',
        completionCommitted: status === 'COMPLETE',
        completionAccounted,
        remainingChildren,
      };

      if (status === 'INITIAL_VISIT_STARTED') {
        this.throwInvalidSeed('vertex has an active initial visit');
      }
      if (status === 'DISCOVERED') {
        if (slots !== null || !hasUnmet || queuedVisit !== undefined) {
          this.throwInvalidSeed('DISCOVERED vertex is inconsistent');
        }
      } else if (status === 'INITIAL_VISIT_ELIGIBLE') {
        if (
          slots !== null ||
          hasUnmet ||
          queuedVisit?.order !== 'ON_WORK_READY'
        ) {
          this.throwInvalidSeed(
            'INITIAL_VISIT_ELIGIBLE vertex is inconsistent',
          );
        }
      } else if (status === 'INITIAL_VISIT_COMMITTED') {
        if (
          hasUnmet ||
          queuedVisit !== undefined ||
          (slots !== null && remainingChildren === 0)
        ) {
          this.throwInvalidSeed(
            'INITIAL_VISIT_COMMITTED vertex is inconsistent',
          );
        }
      } else if (status === 'COMPLETION_VISIT_ELIGIBLE') {
        if (
          slots === null ||
          hasUnmet ||
          remainingChildren !== 0 ||
          queuedVisit?.order !== 'ON_SUBGRAPH_READY'
        ) {
          this.throwInvalidSeed(
            'COMPLETION_VISIT_ELIGIBLE vertex is inconsistent',
          );
        }
      } else if (
        slots === null ||
        hasUnmet ||
        remainingChildren !== 0 ||
        queuedVisit !== undefined
      ) {
        this.throwInvalidSeed('COMPLETE vertex is inconsistent');
      }
      restoredWork.set(ref, work);
    }

    this.openDiscoveryCount = Array.from(restoredWork.values()).filter(
      (work) => work.expansion !== 'closed',
    ).length;
    this.validatedTopologyVersion = null;
    this.work.clear();
    for (const [ref, work] of restoredWork) this.work.set(ref, work);
    this.reverseDependencies.clear();
    for (const [id, dependents] of restoredDependencies) {
      this.reverseDependencies.set(id, dependents);
    }
    this.reverseCompleteDependencies.clear();
    for (const [id, dependents] of restoredCompleteDependencies) {
      this.reverseCompleteDependencies.set(id, dependents);
    }
    this.completionValidation = restoredCompleteDependencies.size > 0;
    this.eligible = readyVisits.map((visit) => ({ ...visit }));
    this.eligibleHead = 0;
  }

  enrollExisting(ref: VertexRef<T | R>): void {
    if (!this.work.has(ref)) {
      this.captureReusableTreeChildren(ref);
      this.container.store.resetTraversal(ref);
      this.register(ref, []);
    }
  }

  acceptRoot(result: MakeVertexResult<T>): VertexRef<T | R> | null {
    this.rejectTreeMetadata(result);
    const resultHasId = hasVertexId(result);
    const suppliedId = this.container.syntheticRoot
      ? this.container.syntheticRootId!
      : resultHasId
      ? result.vertexId
      : undefined;
    const known = resultHasId
      ? this.getKnownResult(suppliedId, result)
      : undefined;

    if (known?.kind === 'deleted') return null;
    if (known?.kind === 'omitted') {
      return null;
    }
    if (known?.kind === 'live') {
      this.container.store.setRoot(known.ref);
      return known.ref;
    }
    if (result.vertexContent === null) {
      if (resultHasId) {
        this.acceptOmission(suppliedId);
      }
      return null;
    }

    const accepted =
      resultHasId || this.container.syntheticRoot
        ? {
            ref: new MutableRef(new Vertex<T | R>(result.vertexContent)),
            id: suppliedId,
          }
        : this.makeUniqueRef(result.vertexContent);
    const dependencies =
      this.container.sourceMode === 'graph' &&
      this.rootWorkDependencies === 'honor' &&
      !this.container.syntheticRoot
        ? Array.from(new Set(result.dependsOnWork))
        : [];
    const completeDependencies = this.container.syntheticRoot
      ? []
      : this.getCompleteDependencies(result);
    if (
      [...dependencies, ...completeDependencies].some(
        (id) => this.container.store.getIdState(id)?.kind === 'deleted',
      )
    ) {
      this.container.store.markDeleted(accepted.id);
      this.deleteDependentsOf(accepted.id);
      return null;
    }
    this.container.acceptRoot(
      accepted.ref,
      accepted.id,
      dependencies,
      completeDependencies,
    );
    this.register(accepted.ref, dependencies, completeDependencies);
    return accepted.ref;
  }

  acceptVertex(
    context: VertexResolutionContext<T | R>,
    result: MakeVertexResult<T>,
    hintIdentity?: HintVertexId,
  ): VertexRef<T | R> | null {
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

    const existingTreeChild =
      result.vertexContent === null
        ? null
        : this.findExistingTreeChild(context);
    if (existingTreeChild !== null) {
      this.container.acceptEdge(
        context.parentVertexRef,
        context.hintIndex,
        existingTreeChild,
        true,
      );
      this.noteLinkedSlot(context.parentVertexRef, context.hintIndex);
      this.enrollExisting(existingTreeChild);
      return existingTreeChild;
    }

    const hasSuppliedId = resultHasId || hintHasId;
    const suppliedId = resultHasId
      ? result.vertexId
      : hintHasId
      ? hintIdentity.vertexId
      : undefined;
    if (context.parentVertexRef === this.container.syntheticRootRef) {
      if (!hasSuppliedId)
        throw new TypeError('Catalog entries require explicit vertex IDs');
      const previous = this.catalogIds.get(suppliedId);
      if (previous !== undefined && previous !== context.hintIndex) {
        throw new TypeError('Duplicate catalog vertex ID');
      }
      this.catalogIds.set(suppliedId, context.hintIndex);
    }
    const known = hasSuppliedId
      ? this.getKnownResult(suppliedId, result)
      : undefined;

    if (known?.kind === 'deleted') {
      this.closeSlot(context.parentVertexRef, context.hintIndex, 'deleted');
      return null;
    }
    if (known?.kind === 'omitted') {
      this.closeSlot(context.parentVertexRef, context.hintIndex, 'omitted', {
        vertexId: suppliedId,
      });
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
        this.acceptOmission(suppliedId);
      }
      this.closeSlot(
        context.parentVertexRef,
        context.hintIndex,
        'omitted',
        hasSuppliedId ? { vertexId: suppliedId } : undefined,
      );
      return null;
    }

    const accepted = hasSuppliedId
      ? {
          ref: new MutableRef(new Vertex<T | R>(result.vertexContent)),
          id: suppliedId,
        }
      : this.makeUniqueRef(result.vertexContent);
    const dependencies = this.getDependencies(context, result);
    const completeDependencies = this.getCompleteDependencies(result);
    if (
      [...dependencies, ...completeDependencies].some(
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
      completeDependencies,
    );
    this.container.acceptEdge(
      context.parentVertexRef,
      context.hintIndex,
      accepted.ref,
    );
    this.noteLinkedSlot(context.parentVertexRef, context.hintIndex);
    this.register(accepted.ref, dependencies, completeDependencies);
    return accepted.ref;
  }

  /** Original declarations retain demand even after W seeds satisfy residual waits. */
  hasPrerequisiteDemand(id: VertexId): boolean {
    return (
      (this.reverseDependencies.get(id)?.size ?? 0) > 0 ||
      (this.reverseCompleteDependencies.get(id)?.size ?? 0) > 0
    );
  }

  getUnknownPrerequisiteIds(): VertexId[] {
    return Array.from(
      new Set([
        ...this.reverseDependencies.keys(),
        ...this.reverseCompleteDependencies.keys(),
      ]),
    ).filter(
      (id) =>
        this.hasPrerequisiteDemand(id) &&
        this.container.store.getIdState(id) === undefined,
    );
  }

  acceptPrerequisite(
    id: VertexId,
    result: MakeVertexResult<T>,
  ): VertexRef<T | R> | null {
    this.rejectTreeMetadata(result);
    if (hasVertexId(result) && !sameVertexId(id, result.vertexId)) {
      throw new Error(
        'Prerequisite result vertex id and requested vertex id mismatch',
      );
    }
    const known = this.getKnownResult(id, result);
    if (known?.kind === 'deleted') return null;
    if (known?.kind === 'omitted') {
      return null;
    }
    if (known?.kind === 'live') return known.ref;
    if (result.vertexContent === null) {
      this.acceptOmission(id);
      return null;
    }
    const dependencies = Array.from(new Set(result.dependsOnWork));
    const completeDependencies = this.getCompleteDependencies(result);
    if (
      [...dependencies, ...completeDependencies].some(
        (dependency) =>
          this.container.store.getIdState(dependency)?.kind === 'deleted',
      )
    ) {
      this.container.store.markDeleted(id);
      this.deleteDependentsOf(id);
      return null;
    }
    const ref = new MutableRef(new Vertex<T | R>(result.vertexContent));
    this.container.acceptDetachedVertex(
      ref,
      id,
      dependencies,
      completeDependencies,
    );
    this.register(ref, dependencies, completeDependencies);
    return ref;
  }

  acceptKnownHint(
    context: VertexResolutionContext<T | R>,
    hintIdentity: HintVertexId,
  ): boolean {
    if (!hasVertexId(hintIdentity)) return false;
    if (this.container.store.getIdState(hintIdentity.vertexId) === undefined) {
      return false;
    }
    this.acceptVertex(context, { vertexContent: null }, hintIdentity);
    return true;
  }

  markPreVisited(ref: VertexRef<T | R>): void {
    const vertex = this.container.resolvedGraph.get(ref);
    if (vertex === null) throw new Error('Unknown vertex reference');
    const vertexWork = this.work.get(ref);
    if (vertexWork === undefined) throw new Error('Vertex is not enrolled');
    if (vertexWork.initialCommitted) return;

    vertexWork.initialCommitted = true;
    this.container.store.setVisitStage(ref, 'INITIAL_VISIT_COMMITTED');
    this.satisfy(vertex.vertexId);
    this.enqueueCompletion(vertexWork);
  }

  markPreVisiting(ref: VertexRef<T | R>): void {
    this.getWork(ref);
    this.container.store.setVisitStage(ref, 'INITIAL_VISIT_STARTED');
  }

  prepareSlots(
    ref: VertexRef<T | R>,
    hints: readonly (T | R)['VertexHint'][],
  ): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.expansion !== 'unprepared') {
      throw new Error('Vertex expansion is already prepared');
    }
    this.container.store.prepareSlots(ref, hints);
    vertexWork.expansion = 'open';
  }

  restoreConsumedTreeSlot(context: VertexResolutionContext<T | R>): void {
    const child = this.findExistingTreeChild(context);
    if (child === null) {
      this.closeSlot(context.parentVertexRef, context.hintIndex, 'omitted');
      return;
    }
    this.container.acceptEdge(
      context.parentVertexRef,
      context.hintIndex,
      child,
      true,
    );
    this.noteLinkedSlot(context.parentVertexRef, context.hintIndex);
    this.container.store.setVisitStage(child, 'COMPLETE');
  }

  closeExpansion(ref: VertexRef<T | R>): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.expansion === 'closed') return;
    if (vertexWork.expansion === 'unprepared') {
      throw new Error('Cannot close an unprepared vertex expansion');
    }
    const vertex = this.getVertex(ref);

    vertexWork.expansion = 'closed';
    this.openDiscoveryCount -= 1;
    vertexWork.remainingChildren = 0;
    for (let index = 0; index < vertex.slots.length; index += 1) {
      if (vertexWork.completionAccounted[index] === true) continue;
      const slot = vertex.slots[index]!;
      if (
        slot.kind !== 'pending' &&
        (slot.kind !== 'linked' ||
          this.container.resolvedGraph.getVisitStageOf(slot.childRef) ===
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
    parent: VertexRef<T | R>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: HintVertexId,
  ): void {
    this.container.store.closeSlot(parent, index, reason, omittedIdentity);
    const vertexWork = this.work.get(parent);
    if (vertexWork === undefined) return;
    if (vertexWork.expansion === 'unprepared') vertexWork.expansion = 'open';
    this.accountSlot(vertexWork, index);
  }

  markComplete(ref: VertexRef<T | R>): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.completionCommitted) return;
    const vertex = this.getVertex(ref);

    vertexWork.completionCommitted = true;
    this.container.store.setVisitStage(ref, 'COMPLETE');
    this.satisfy(vertex.vertexId, true);
    for (const edge of vertex.incoming) {
      const parentWork = this.work.get(edge.parentRef);
      if (parentWork !== undefined)
        this.accountSlot(parentWork, edge.hintIndex);
    }
  }

  takeReady(): VertexRef<T | R> | null {
    if (this.peekEligible()?.order !== 'ON_WORK_READY') return null;
    return this.dequeueEligible()!.ref;
  }

  takeEligible(): EligibleVisit<T | R> | null {
    return this.dequeueEligible();
  }

  inspectEligible(): readonly EligibleVisit<T | R>[] {
    return this.eligible.slice(this.eligibleHead);
  }

  takeCompleting(): VertexRef<T | R> | null {
    if (this.peekEligible()?.order !== 'ON_SUBGRAPH_READY') return null;
    return this.dequeueEligible()!.ref;
  }

  deleteVertex(ref: VertexRef<T | R>): Set<VertexRef<T | R>> {
    if (!this.container.resolvedGraph.has(ref)) return new Set();

    const root = this.container.resolvedGraph.getRoot();
    if (ref === root) {
      return this.deleteRefs(this.container.resolvedGraph.getVertexRefs());
    }
    return this.deleteRefs([ref]);
  }

  /** Every mutation reports removals once so effect owners cannot outlive consumers. */
  takeRemovedRefs(): Set<VertexRef<T | R>> {
    const removed = new Set(this.removedRefs);
    this.removedRefs.clear();
    return removed;
  }

  private deleteDependentsOf(id: VertexId): Set<VertexRef<T | R>> {
    return this.deleteRefs([
      ...(this.reverseDependencies.get(id) ?? []),
      ...(this.reverseCompleteDependencies.get(id) ?? []),
    ]);
  }

  private deleteRefs(
    initialRefs: readonly VertexRef<T | R>[],
  ): Set<VertexRef<T | R>> {
    const removals = new Set<VertexRef<T | R>>();
    const pending: VertexRef<T | R>[] = [];
    for (const ref of initialRefs) this.addRemoval(ref, removals, pending);
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (current === this.container.resolvedGraph.getRoot()) {
        for (const ref of this.container.resolvedGraph.getVertexRefs()) {
          this.addRemoval(ref, removals, pending);
        }
      }
      const vertex = this.container.resolvedGraph.get(current)!;

      for (const dependent of [
        ...(this.reverseDependencies.get(vertex.vertexId) ?? []),
        ...(this.reverseCompleteDependencies.get(vertex.vertexId) ?? []),
      ]) {
        this.addRemoval(dependent, removals, pending);
      }
      for (const child of this.container.resolvedGraph.getChildrenOf(
        current,
      )!) {
        if (removals.has(child) || this.container.isDetachedAnchor(child))
          continue;
        const parents = this.container.resolvedGraph.getParentsOf(child)!;
        if (parents.every((parent) => removals.has(parent))) {
          this.addRemoval(child, removals, pending);
        }
      }
    }

    const survivingSlots: Array<{ parent: VertexRef<T | R>; index: number }> =
      [];
    for (const removal of removals) {
      const vertex = this.container.resolvedGraph.get(removal)!;
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
    for (const ref of removals) this.removedRefs.add(ref);
    for (const removal of removals) {
      const work = this.work.get(removal);
      if (work !== undefined && work.expansion !== 'closed') {
        this.openDiscoveryCount -= 1;
      }
      this.work.delete(removal);
    }
    for (const dependents of [
      ...this.reverseDependencies.values(),
      ...this.reverseCompleteDependencies.values(),
    ]) {
      for (const dependent of dependents) {
        if (removals.has(dependent)) dependents.delete(dependent);
      }
    }
    this.eligible = this.eligible
      .slice(this.eligibleHead)
      .filter((entry) => !removals.has(entry.ref));
    this.eligibleHead = 0;
    for (const slot of survivingSlots) {
      const parentWork = this.work.get(slot.parent);
      if (parentWork !== undefined) this.accountSlot(parentWork, slot.index);
    }
    return removals;
  }

  disableSubtree(ref: VertexRef<T | R>): void {
    const vertex = this.getVertex(ref);
    for (let index = 0; index < vertex.slots.length; index += 1) {
      if (vertex.slots[index]!.kind === 'pending') {
        this.closeSlot(ref, index, 'disabled');
      }
    }
    this.closeExpansion(ref);
  }

  getStall(): GraphStall<T | R> | null {
    if (this.peekEligible() !== null) return null;
    const dependencies: GraphStall<T | R>['dependencies'] = [];
    const incomplete: VertexRef<T | R>[] = [];
    for (const [ref, vertexWork] of this.work) {
      if (vertexWork.completionCommitted) continue;
      if (vertexWork.unmet.size > 0 || vertexWork.unmetComplete.size > 0) {
        dependencies.push({
          id: this.container.resolvedGraph.getVertexId(ref),
          missing: Array.from(
            new Set([...vertexWork.unmet, ...vertexWork.unmetComplete]),
          ),
        });
      } else {
        incomplete.push(ref);
      }
    }
    return dependencies.length === 0 && incomplete.length === 0
      ? null
      : { dependencies, incomplete };
  }

  diagnoseStall(stall: GraphStall<T | R>): DagTraversalStallDiagnostics {
    const dependencies = stall.dependencies.map(({ id, missing }) => ({
      id,
      unmet: missing.slice(),
    }));
    const unknown = new Set<VertexId>();
    for (const { unmet } of dependencies) {
      for (const dependency of unmet) {
        if (this.container.store.getIdState(dependency) === undefined)
          unknown.add(dependency);
      }
    }
    const { edges, cycles } = dependencyMilestones(
      Array.from(this.container.resolvedGraph.getVertexRefs(), (ref) => ({
        id: this.container.resolvedGraph.getVertexId(ref),
        work: this.container.store.getDeclaredDependencies(ref),
        complete: this.container.store.getDeclaredCompleteDependencies(ref),
        children: this.container.resolvedGraph
          .getChildrenOf(ref)!
          .map((child) => this.container.resolvedGraph.getVertexId(child)),
      })),
    );
    const syntheticId = this.container.syntheticRootId;
    // Analyze the full internal topology, then hide only synthetic bookkeeping.
    const dependencyEdges = edges
      .filter(
        ({ waiter, prerequisite }) =>
          syntheticId === null ||
          (!sameVertexId(waiter.vertexId, syntheticId) &&
            !sameVertexId(prerequisite.vertexId, syntheticId)),
      )
      .map(({ waiter, prerequisite, reason }) => ({
        waiter: { ...waiter },
        prerequisite: { ...prerequisite },
        reason,
      }));
    const cycleMembers = new Set(cycles.flat());
    return {
      dependencies,
      unknownPrerequisiteIds: Array.from(unknown),
      dependencyCycleComponents: cycles,
      dependencyEdges,
      dependencyBlockedIds: dependencies
        .filter(({ id }) => !cycleMembers.has(id))
        .map(({ id }) => id),
      structurallyIncompleteIds: stall.incomplete.map((ref) =>
        this.container.resolvedGraph.getVertexId(ref),
      ),
    };
  }

  /** Root, discovery and lookup acceptance share identity/conflict semantics. */
  private getKnownResult(id: VertexId, result: MakeVertexResult<T>) {
    const known = this.container.store.getIdState(id);
    if (known?.kind === 'omitted' && result.vertexContent !== null) {
      this.throwOmissionContentConflict();
    }
    return known;
  }

  private acceptOmission(id: VertexId): void {
    this.container.store.markOmitted(id);
    this.unusedCompletedWork.delete(id);
    this.satisfy(id);
    this.satisfy(id, true);
  }

  private rejectTreeMetadata(result: MakeVertexResult<T>): void {
    if (
      this.container.sourceMode === 'graph' &&
      Object.prototype.hasOwnProperty.call(result, 'priority')
    ) {
      throw new TypeError('priority metadata is not supported');
    }
    if (this.container.sourceMode === 'tree') {
      assertNoTreeMetadata(result);
    }
  }

  private makeUniqueRef(
    content: NonNullable<MakeVertexResult<T>['vertexContent']>,
  ): { ref: VertexRef<T | R>; id: string } {
    while (true) {
      const ref = new MutableRef(new Vertex<T | R>(content));
      const id = ref.getRefId();
      if (this.container.store.getIdState(id) === undefined) return { ref, id };
    }
  }

  private getDependencies(
    context: VertexResolutionContext<T | R>,
    result: MakeVertexResult<T>,
  ): VertexId[] {
    const declared = result.dependsOnWork;
    if (declared !== undefined) return Array.from(new Set(declared));
    return (this.container.sourceMode === 'graph' &&
      this.omittedWorkDependencies === 'none') ||
      context.parentVertexRef === this.container.syntheticRootRef
      ? []
      : [this.container.resolvedGraph.getVertexId(context.parentVertexRef)];
  }

  private findExistingTreeChild(
    context: VertexResolutionContext<T | R>,
  ): VertexRef<T | R> | null {
    const candidates = this.reusableTreeChildren.get(context.parentVertexRef);
    const candidate = candidates?.get(context.hintIndex);
    if (candidate === undefined) return null;
    candidates!.delete(context.hintIndex);
    if (candidates!.size === 0) {
      this.reusableTreeChildren.delete(context.parentVertexRef);
    }
    return sameVertexId(candidate.hint, context.vertexHint)
      ? candidate.ref
      : null;
  }

  private captureReusableTreeChildren(parent: VertexRef<T | R>): void {
    const tree = this.container.treeContainer?.resolvedTree;
    if (tree === undefined) return;
    const candidates = new Map<
      number,
      { ref: VertexRef<T | R>; hint: (T | R)['VertexHint'] }
    >();
    for (const child of tree.getChildrenOf(parent)!) {
      const context = tree.getResolutionContextOf(child);
      if (
        context?.parentVertexRef === parent &&
        !candidates.has(context.hintIndex)
      ) {
        candidates.set(context.hintIndex, {
          ref: child,
          hint: context.vertexHint,
        });
      }
    }
    if (candidates.size > 0) this.reusableTreeChildren.set(parent, candidates);
  }

  private getCompleteDependencies(result: MakeVertexResult<T>): VertexId[] {
    if (this.container.sourceMode === 'tree') return [];
    if (result.dependsOnSubgraphCompletion !== undefined)
      this.completionValidation = true;
    return Array.from(new Set(result.dependsOnSubgraphCompletion));
  }

  private registerDependencies(
    ref: VertexRef<T | R>,
    dependencies: readonly VertexId[],
    reverse: Map<VertexId, Set<VertexRef<T | R>>>,
    complete: boolean,
  ): Set<VertexId> {
    const unmet = new Set<VertexId>();
    for (const dependency of dependencies) {
      let dependents = reverse.get(dependency);
      if (dependents === undefined) {
        dependents = new Set();
        reverse.set(dependency, dependents);
      }
      dependents.add(ref);
      const state = this.container.store.getIdState(dependency);
      if (state?.kind === 'omitted') continue;
      if (state?.kind === 'live') {
        const status = this.container.resolvedGraph.getVisitStageOf(state.ref);
        if (
          status === 'COMPLETE' ||
          (!complete &&
            (status === 'INITIAL_VISIT_COMMITTED' ||
              status === 'COMPLETION_VISIT_ELIGIBLE'))
        )
          continue;
      }
      unmet.add(dependency);
    }
    return unmet;
  }

  private register(
    ref: VertexRef<T | R>,
    dependencies: readonly VertexId[],
    completeDependencies: readonly VertexId[] = [],
  ): void {
    const unmet = this.registerDependencies(
      ref,
      dependencies,
      this.reverseDependencies,
      false,
    );
    const unmetComplete = this.registerDependencies(
      ref,
      completeDependencies,
      this.reverseCompleteDependencies,
      true,
    );

    const vertexWork: VertexWork<T | R> = {
      ref,
      unmet,
      unmetComplete,
      expansion: 'unprepared',
      initialAdmitted: false,
      initialCommitted: false,
      completionAdmitted: false,
      completionCommitted: false,
      completionAccounted: [],
      remainingChildren: 0,
    };
    this.work.set(ref, vertexWork);
    this.openDiscoveryCount += 1;
    if (this.eager) this.discoveryExpansion.push(ref);
    if (
      ref === this.container.syntheticRootRef ||
      this.unusedCompletedWork.delete(
        this.container.resolvedGraph.getVertexId(ref),
      )
    ) {
      vertexWork.initialAdmitted = true;
      this.markPreVisited(ref);
      this.seededExpansion.push(ref);
    } else {
      this.enqueueReady(vertexWork);
    }
  }

  private satisfy(id: VertexId, complete = false): void {
    const dependents = (
      complete ? this.reverseCompleteDependencies : this.reverseDependencies
    ).get(id);
    if (dependents === undefined) return;
    for (const ref of dependents) {
      const vertexWork = this.work.get(ref);
      if (
        vertexWork !== undefined &&
        (complete ? vertexWork.unmetComplete : vertexWork.unmet).delete(id)
      ) {
        this.enqueueReady(vertexWork);
      }
    }
  }

  private enqueueReady(vertexWork: VertexWork<T | R>): void {
    if (
      vertexWork.unmet.size !== 0 ||
      vertexWork.unmetComplete.size !== 0 ||
      vertexWork.initialAdmitted
    )
      return;
    vertexWork.initialAdmitted = true;
    this.container.store.setVisitStage(
      vertexWork.ref,
      'INITIAL_VISIT_ELIGIBLE',
    );
    this.eligible.push({ ref: vertexWork.ref, order: 'ON_WORK_READY' });
  }

  private peekEligible(): EligibleVisit<T | R> | null {
    return this.eligible[this.eligibleHead] ?? null;
  }

  private dequeueEligible(): EligibleVisit<T | R> | null {
    const entry = this.peekEligible();
    if (entry === null) return null;
    this.eligibleHead += 1;
    if (this.eligibleHead === this.eligible.length) {
      this.eligible.length = 0;
      this.eligibleHead = 0;
    } else if (
      this.eligibleHead >= 1_024 &&
      this.eligibleHead * 2 >= this.eligible.length
    ) {
      this.eligible = this.eligible.slice(this.eligibleHead);
      this.eligibleHead = 0;
    }
    return entry;
  }

  private noteLinkedSlot(parent: VertexRef<T | R>, index: number): void {
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
    this.container.store.setVisitStage(
      vertexWork.ref,
      'COMPLETION_VISIT_ELIGIBLE',
    );
    this.eligible.push({ ref: vertexWork.ref, order: 'ON_SUBGRAPH_READY' });
  }

  private addRemoval(
    ref: VertexRef<T | R>,
    removals: Set<VertexRef<T | R>>,
    pending: VertexRef<T | R>[],
  ): void {
    if (!this.container.resolvedGraph.has(ref) || removals.has(ref)) return;
    removals.add(ref);
    pending.push(ref);
  }

  private getVertex(ref: VertexRef<T | R>) {
    const vertex = this.container.resolvedGraph.get(ref);
    if (vertex === null) throw new Error('Unknown vertex reference');
    return vertex;
  }

  private getWork(ref: VertexRef<T | R>): VertexWork<T | R> {
    const vertexWork = this.work.get(ref);
    if (vertexWork === undefined) throw new Error('Vertex is not enrolled');
    return vertexWork;
  }

  private throwOmissionContentConflict(): never {
    throw new Error('Vertex omission conflicts with supplied content');
  }

  private throwInvalidSeed(detail: string): never {
    throw new Error(`Invalid injected DAG seed: ${detail}`);
  }
}
