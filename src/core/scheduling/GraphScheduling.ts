import { assertNoTreeMetadata } from '@core/drivers/normalizeSourceResult';
import { engineDagValidationErrors } from '@core/errors/engineDagValidationErrors';
import { DagTraversalStallError } from '@core/errors/DagTraversalStallError';
import type { DagTraversalStallDiagnostics } from '@core/errors/DagTraversalStallError';
import { dependencyMilestones } from './dependencyMilestones';
import { MutableValueReference } from '@core/CTTRef';
import type { InternalChildDiscoveryContext } from '@core/ResolvedTree';
import type { MakeVertexResult } from '@core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import { Vertex } from '@core/Vertex';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { hasVertexId, sameVertexId } from '@core/graph/identity';
import type {
  GraphSchedulingState,
  ChildHintVertexIdentity,
  InternalVertexRef,
  VertexId,
} from '@core/graph/types';
import type {
  EligibleVisit,
  GraphStall,
  VertexWork,
} from '@core/scheduling/types';

export class GraphScheduling<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  private readonly work = new Map<
    InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    VertexWork<InputVertexTypes | RewrittenVertexTypes>
  >();
  private readonly reverseDependencies = new Map<
    VertexId,
    Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>>
  >();
  private readonly reverseCompleteDependencies = new Map<
    VertexId,
    Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>>
  >();
  private completionValidation = false;
  private readonly removedRefs = new Set<
    InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>
  >();
  private readonly reusableTreeChildren = new Map<
    InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    Map<
      number,
      {
        ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
        hint: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'];
      }
    >
  >();
  private eligible: EligibleVisit<InputVertexTypes | RewrittenVertexTypes>[] =
    [];
  private eligibleHead = 0;
  private openDiscoveryCount = 0;
  private validatedTopologyVersion: number | null = null;

  private readonly unusedCompletedWork: Set<VertexId>;
  private readonly catalogIds = new Map<VertexId, number>();
  private readonly discoveryExpansion: InternalVertexRef<
    InputVertexTypes | RewrittenVertexTypes
  >[] = [];
  private readonly seededExpansion: InternalVertexRef<
    InputVertexTypes | RewrittenVertexTypes
  >[] = [];

  constructor(
    private readonly container: ResolvedGraphsContainer<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
    acceptedCompletedWorkVertexIds?: ReadonlySet<VertexId>,
    private eager = false,
    private readonly rootWorkPrerequisitePolicy: 'honor' | 'ignore' = 'honor',
    private readonly undeclaredWorkPrerequisitePolicy:
      | 'none'
      | 'waitForDiscoveringParentWork' = 'none',
  ) {
    this.unusedCompletedWork = new Set(acceptedCompletedWorkVertexIds);
  }

  enableEagerDiscovery(): void {
    this.eager = true;
  }

  getUnusedCompletedWorkIds(): VertexId[] {
    return Array.from(this.unusedCompletedWork);
  }

  takeSeededExpansion(): InternalVertexRef<
    InputVertexTypes | RewrittenVertexTypes
  > | null {
    return this.seededExpansion.shift() ?? null;
  }

  /** Detached progress records; querying never advances scheduling queues. */
  inspectWork(): VertexWork<InputVertexTypes | RewrittenVertexTypes>[] {
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
      vertexId: this.container.liveResolvedGraphView.requireVertexId(work.ref),
      expansion: work.expansion,
      initialCommitted: work.initialCommitted,
      completionCommitted: work.completionCommitted,
      remainingChildren: work.remainingChildren,
    }));
  }

  takeDiscoveryExpansion(): InternalVertexRef<
    InputVertexTypes | RewrittenVertexTypes
  > | null {
    return this.discoveryExpansion.shift() ?? null;
  }

  /** Closed childDiscoveryHint expansion for every retained resolvedVertexInput; independent of work success. */
  isDiscoveryComplete(): boolean {
    return this.openDiscoveryCount === 0;
  }

  usesCompletionDependencies(): boolean {
    return this.completionValidation;
  }

  private declaredPrerequisites(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): VertexId[] {
    return Array.from(
      new Set([
        ...this.container.store.getDeclaredDependencies(ref),
        ...this.container.store.getDeclaredCompleteDependencies(ref),
      ]),
    );
  }

  /** Validate original declarations, even when a successful seed satisfied them. */
  validateDiscoveredGraph(): void {
    const blockedVertexPrerequisiteReports = Array.from(
      this.work.keys(),
      (ref) => ({
        id: this.container.liveResolvedGraphView.requireVertexId(ref),
        missing: this.declaredPrerequisites(ref),
      }),
    );
    const diagnostics = this.diagnoseStall({
      dependencies: blockedVertexPrerequisiteReports,
      incomplete: [],
    });
    if (
      diagnostics.unresolvedPrerequisiteVertexIds.length > 0 ||
      diagnostics.milestoneCycleVertexIdComponents.length > 0
    ) {
      const error = new DagTraversalStallError(diagnostics);
      engineDagValidationErrors.set(this.container.store, error);
      throw error;
    }
    if (this.getUnusedCompletedWorkIds().length > 0) {
      throw new TypeError(
        'acceptedCompletedWorkVertexIds contains undiscovered vertex IDs',
      );
    }
    this.validatedTopologyVersion = this.container.store.getTopologyVersion();
  }

  /** Reuse only successful validation; a summary never publishes evidence. */
  diagnoseTopology(
    refs: readonly InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>[],
  ): DagTraversalStallDiagnostics | null {
    if (
      this.validatedTopologyVersion ===
      this.container.store.getTopologyVersion()
    ) {
      return null;
    }
    return this.diagnoseStall({
      dependencies: refs.map((ref) => ({
        id: this.container.liveResolvedGraphView.requireVertexId(ref),
        missing: this.declaredPrerequisites(ref),
      })),
      incomplete: [],
    });
  }

  restoreDagSeed(
    dependencyEligiblePhaseVisits: readonly EligibleVisit<
      InputVertexTypes | RewrittenVertexTypes
    >[],
  ): void {
    const refs = this.container.liveResolvedGraphView.getVertexRefs();
    const restoredWork = new Map<
      InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
      VertexWork<InputVertexTypes | RewrittenVertexTypes>
    >();
    const restoredDependencies = new Map<
      VertexId,
      Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>>
    >();
    const restoredCompleteDependencies = new Map<
      VertexId,
      Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>>
    >();
    const queued = new Map<
      InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
      EligibleVisit<InputVertexTypes | RewrittenVertexTypes>
    >();

    for (const visit of dependencyEligiblePhaseVisits) {
      if (!this.container.liveResolvedGraphView.has(visit.ref)) {
        this.throwInvalidSeed('ready visit references an unknown vertex');
      }
      if (queued.has(visit.ref)) {
        this.throwInvalidSeed('ready visit is duplicated');
      }
      if (
        visit.order !== 'ON_WORK_READY' &&
        visit.order !== 'ON_SUBGRAPH_COMPLETION_READY'
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
        vertex.workWaitsForWorkOf,
        restoredDependencies,
        false,
      );
      const unmetComplete = this.registerDependencies(
        ref,
        vertex.workWaitsForSubgraphCompletionOf ?? [],
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
            this.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
              slot.childRef,
            ) === 'COMPLETION_VISIT_COMMITTED',
        ) ?? [];
      const remainingChildren = completionAccounted.filter(
        (accounted) => !accounted,
      ).length;
      const status = vertex.visitStage;
      const queuedVisit = queued.get(ref);
      const work: VertexWork<InputVertexTypes | RewrittenVertexTypes> = {
        ref,
        unmet,
        unmetComplete,
        expansion: slots === null ? 'unprepared' : 'closed',
        initialAdmitted: status !== 'DISCOVERED',
        initialCommitted:
          status === 'INITIAL_VISIT_COMMITTED' ||
          status === 'COMPLETION_VISIT_ELIGIBLE' ||
          status === 'COMPLETION_VISIT_COMMITTED',
        completionAdmitted:
          status === 'COMPLETION_VISIT_ELIGIBLE' ||
          status === 'COMPLETION_VISIT_COMMITTED',
        completionCommitted: status === 'COMPLETION_VISIT_COMMITTED',
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
          queuedVisit?.order !== 'ON_SUBGRAPH_COMPLETION_READY'
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
        this.throwInvalidSeed(
          'COMPLETION_VISIT_COMMITTED vertex is inconsistent',
        );
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
    this.eligible = dependencyEligiblePhaseVisits.map((visit) => ({
      ...visit,
    }));
    this.eligibleHead = 0;
  }

  enrollExisting(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
    if (!this.work.has(ref)) {
      this.captureReusableTreeChildren(ref);
      this.container.store.resetTraversal(ref);
      this.register(ref, []);
    }
  }

  acceptRoot(
    result: MakeVertexResult<InputVertexTypes>,
  ): InternalVertexRef<InputVertexTypes | RewrittenVertexTypes> | null {
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
            ref: new MutableValueReference(
              new Vertex<InputVertexTypes | RewrittenVertexTypes>(
                result.vertexContent,
              ),
            ),
            id: suppliedId,
          }
        : this.makeUniqueRef(result.vertexContent);
    const blockedVertexPrerequisiteReports =
      this.container.sourceMode === 'graph' &&
      this.rootWorkPrerequisitePolicy === 'honor' &&
      !this.container.syntheticRoot
        ? Array.from(new Set(result.workWaitsForWorkOf))
        : [];
    const completeDependencies = this.container.syntheticRoot
      ? []
      : this.getCompleteDependencies(result);
    if (
      [...blockedVertexPrerequisiteReports, ...completeDependencies].some(
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
      blockedVertexPrerequisiteReports,
      completeDependencies,
    );
    this.register(
      accepted.ref,
      blockedVertexPrerequisiteReports,
      completeDependencies,
    );
    return accepted.ref;
  }

  acceptVertex(
    context: InternalChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >,
    result: MakeVertexResult<InputVertexTypes>,
    hintIdentity?: ChildHintVertexIdentity,
  ): InternalVertexRef<InputVertexTypes | RewrittenVertexTypes> | null {
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
        context.parentVertexHandle,
        context.parentChildHintIndex,
        existingTreeChild,
        true,
      );
      this.noteLinkedSlot(
        context.parentVertexHandle,
        context.parentChildHintIndex,
      );
      this.enrollExisting(existingTreeChild);
      return existingTreeChild;
    }

    const hasSuppliedId = resultHasId || hintHasId;
    const suppliedId = resultHasId
      ? result.vertexId
      : hintHasId
      ? hintIdentity.vertexId
      : undefined;
    if (context.parentVertexHandle === this.container.syntheticRootRef) {
      if (!hasSuppliedId)
        throw new TypeError('Catalog entries require explicit vertex IDs');
      const previous = this.catalogIds.get(suppliedId);
      if (previous !== undefined && previous !== context.parentChildHintIndex) {
        throw new TypeError('Duplicate catalog vertex ID');
      }
      this.catalogIds.set(suppliedId, context.parentChildHintIndex);
    }
    const known = hasSuppliedId
      ? this.getKnownResult(suppliedId, result)
      : undefined;

    if (known?.kind === 'deleted') {
      this.closeSlot(
        context.parentVertexHandle,
        context.parentChildHintIndex,
        'deleted',
      );
      return null;
    }
    if (known?.kind === 'omitted') {
      this.closeSlot(
        context.parentVertexHandle,
        context.parentChildHintIndex,
        'omitted',
        {
          vertexId: suppliedId,
        },
      );
      return null;
    }
    if (known?.kind === 'live') {
      this.container.acceptEdge(
        context.parentVertexHandle,
        context.parentChildHintIndex,
        known.ref,
      );
      this.noteLinkedSlot(
        context.parentVertexHandle,
        context.parentChildHintIndex,
      );
      return known.ref;
    }
    if (result.vertexContent === null) {
      if (hasSuppliedId) {
        this.acceptOmission(suppliedId);
      }
      this.closeSlot(
        context.parentVertexHandle,
        context.parentChildHintIndex,
        'omitted',
        hasSuppliedId ? { vertexId: suppliedId } : undefined,
      );
      return null;
    }

    const accepted = hasSuppliedId
      ? {
          ref: new MutableValueReference(
            new Vertex<InputVertexTypes | RewrittenVertexTypes>(
              result.vertexContent,
            ),
          ),
          id: suppliedId,
        }
      : this.makeUniqueRef(result.vertexContent);
    const blockedVertexPrerequisiteReports = this.getDependencies(
      context,
      result,
    );
    const completeDependencies = this.getCompleteDependencies(result);
    if (
      [...blockedVertexPrerequisiteReports, ...completeDependencies].some(
        (id) => this.container.store.getIdState(id)?.kind === 'deleted',
      )
    ) {
      this.container.store.markDeleted(accepted.id);
      this.closeSlot(
        context.parentVertexHandle,
        context.parentChildHintIndex,
        'deleted',
      );
      this.deleteDependentsOf(accepted.id);
      return null;
    }
    this.container.acceptVertex(
      accepted.ref,
      accepted.id,
      blockedVertexPrerequisiteReports,
      context,
      completeDependencies,
    );
    this.container.acceptEdge(
      context.parentVertexHandle,
      context.parentChildHintIndex,
      accepted.ref,
    );
    this.noteLinkedSlot(
      context.parentVertexHandle,
      context.parentChildHintIndex,
    );
    this.register(
      accepted.ref,
      blockedVertexPrerequisiteReports,
      completeDependencies,
    );
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
    result: MakeVertexResult<InputVertexTypes>,
  ): InternalVertexRef<InputVertexTypes | RewrittenVertexTypes> | null {
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
    const blockedVertexPrerequisiteReports = Array.from(
      new Set(result.workWaitsForWorkOf),
    );
    const completeDependencies = this.getCompleteDependencies(result);
    if (
      [...blockedVertexPrerequisiteReports, ...completeDependencies].some(
        (dependency) =>
          this.container.store.getIdState(dependency)?.kind === 'deleted',
      )
    ) {
      this.container.store.markDeleted(id);
      this.deleteDependentsOf(id);
      return null;
    }
    const ref = new MutableValueReference(
      new Vertex<InputVertexTypes | RewrittenVertexTypes>(result.vertexContent),
    );
    this.container.acceptDetachedVertex(
      ref,
      id,
      blockedVertexPrerequisiteReports,
      completeDependencies,
    );
    this.register(ref, blockedVertexPrerequisiteReports, completeDependencies);
    return ref;
  }

  acceptKnownHint(
    context: InternalChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >,
    hintIdentity: ChildHintVertexIdentity,
  ): boolean {
    if (!hasVertexId(hintIdentity)) return false;
    if (this.container.store.getIdState(hintIdentity.vertexId) === undefined) {
      return false;
    }
    this.acceptVertex(context, { vertexContent: null }, hintIdentity);
    return true;
  }

  markPreVisited(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
    const vertex = this.container.liveResolvedGraphView.get(ref);
    if (vertex === null) throw new Error('Unknown vertex reference');
    const vertexWork = this.work.get(ref);
    if (vertexWork === undefined) throw new Error('Vertex is not enrolled');
    if (vertexWork.initialCommitted) return;

    vertexWork.initialCommitted = true;
    this.container.store.setVisitStage(ref, 'INITIAL_VISIT_COMMITTED');
    this.satisfy(vertex.vertexId);
    this.enqueueCompletion(vertexWork);
  }

  markPreVisiting(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
    this.getWork(ref);
    this.container.store.setVisitStage(ref, 'INITIAL_VISIT_STARTED');
  }

  prepareSlots(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    hints: readonly (InputVertexTypes | RewrittenVertexTypes)['ChildHint'][],
  ): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.expansion !== 'unprepared') {
      throw new Error('Vertex expansion is already prepared');
    }
    this.container.store.prepareSlots(ref, hints);
    vertexWork.expansion = 'open';
  }

  restoreConsumedTreeSlot(
    context: InternalChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >,
  ): void {
    const child = this.findExistingTreeChild(context);
    if (child === null) {
      this.closeSlot(
        context.parentVertexHandle,
        context.parentChildHintIndex,
        'omitted',
      );
      return;
    }
    this.container.acceptEdge(
      context.parentVertexHandle,
      context.parentChildHintIndex,
      child,
      true,
    );
    this.noteLinkedSlot(
      context.parentVertexHandle,
      context.parentChildHintIndex,
    );
    this.container.store.setVisitStage(child, 'COMPLETION_VISIT_COMMITTED');
  }

  closeExpansion(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
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
          this.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
            slot.childRef,
          ) === 'COMPLETION_VISIT_COMMITTED')
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
    parent: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    index: number,
    reason: 'omitted' | 'deleted' | 'disabled',
    omittedIdentity?: ChildHintVertexIdentity,
  ): void {
    this.container.store.closeSlot(parent, index, reason, omittedIdentity);
    const vertexWork = this.work.get(parent);
    if (vertexWork === undefined) return;
    if (vertexWork.expansion === 'unprepared') vertexWork.expansion = 'open';
    this.accountSlot(vertexWork, index);
  }

  markComplete(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
    const vertexWork = this.getWork(ref);
    if (vertexWork.completionCommitted) return;
    const vertex = this.getVertex(ref);

    vertexWork.completionCommitted = true;
    this.container.store.setVisitStage(ref, 'COMPLETION_VISIT_COMMITTED');
    this.satisfy(vertex.vertexId, true);
    for (const edge of vertex.incoming) {
      const parentWork = this.work.get(edge.parentRef);
      if (parentWork !== undefined)
        this.accountSlot(parentWork, edge.hintIndex);
    }
  }

  takeReady(): InternalVertexRef<
    InputVertexTypes | RewrittenVertexTypes
  > | null {
    if (this.peekEligible()?.order !== 'ON_WORK_READY') return null;
    return this.dequeueEligible()!.ref;
  }

  takeEligible(): EligibleVisit<
    InputVertexTypes | RewrittenVertexTypes
  > | null {
    return this.dequeueEligible();
  }

  inspectEligible(): readonly EligibleVisit<
    InputVertexTypes | RewrittenVertexTypes
  >[] {
    return this.eligible.slice(this.eligibleHead);
  }

  takeCompleting(): InternalVertexRef<
    InputVertexTypes | RewrittenVertexTypes
  > | null {
    if (this.peekEligible()?.order !== 'ON_SUBGRAPH_COMPLETION_READY')
      return null;
    return this.dequeueEligible()!.ref;
  }

  deleteVertex(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>> {
    if (!this.container.liveResolvedGraphView.has(ref)) return new Set();

    const root = this.container.liveResolvedGraphView.getRoot();
    if (ref === root) {
      return this.deleteRefs(
        this.container.liveResolvedGraphView.getVertexRefs(),
      );
    }
    return this.deleteRefs([ref]);
  }

  /** Every mutation reports removals once so effect owners cannot outlive consumers. */
  takeRemovedRefs(): Set<
    InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>
  > {
    const removed = new Set(this.removedRefs);
    this.removedRefs.clear();
    return removed;
  }

  private deleteDependentsOf(
    id: VertexId,
  ): Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>> {
    return this.deleteRefs([
      ...(this.reverseDependencies.get(id) ?? []),
      ...(this.reverseCompleteDependencies.get(id) ?? []),
    ]);
  }

  private deleteRefs(
    initialRefs: readonly InternalVertexRef<
      InputVertexTypes | RewrittenVertexTypes
    >[],
  ): Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>> {
    const removals = new Set<
      InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>
    >();
    const pending: InternalVertexRef<
      InputVertexTypes | RewrittenVertexTypes
    >[] = [];
    for (const ref of initialRefs) this.addRemoval(ref, removals, pending);
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (current === this.container.liveResolvedGraphView.getRoot()) {
        for (const ref of this.container.liveResolvedGraphView.getVertexRefs()) {
          this.addRemoval(ref, removals, pending);
        }
      }
      const vertex = this.container.liveResolvedGraphView.get(current)!;

      for (const dependent of [
        ...(this.reverseDependencies.get(vertex.vertexId) ?? []),
        ...(this.reverseCompleteDependencies.get(vertex.vertexId) ?? []),
      ]) {
        this.addRemoval(dependent, removals, pending);
      }
      for (const child of this.container.liveResolvedGraphView.getChildrenOf(
        current,
      )!) {
        if (removals.has(child) || this.container.isDetachedAnchor(child))
          continue;
        const parents =
          this.container.liveResolvedGraphView.getParentsOf(child)!;
        if (parents.every((parent) => removals.has(parent))) {
          this.addRemoval(child, removals, pending);
        }
      }
    }

    const survivingSlots: Array<{
      parent: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
      index: number;
    }> = [];
    for (const removal of removals) {
      const vertex = this.container.liveResolvedGraphView.get(removal)!;
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

  disableSubtree(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
    const vertex = this.getVertex(ref);
    for (let index = 0; index < vertex.slots.length; index += 1) {
      if (vertex.slots[index]!.kind === 'pending') {
        this.closeSlot(ref, index, 'disabled');
      }
    }
    this.closeExpansion(ref);
  }

  getStall(): GraphStall<InputVertexTypes | RewrittenVertexTypes> | null {
    if (this.peekEligible() !== null) return null;
    const blockedVertexPrerequisiteReports: GraphStall<
      InputVertexTypes | RewrittenVertexTypes
    >['dependencies'] = [];
    const incomplete: InternalVertexRef<
      InputVertexTypes | RewrittenVertexTypes
    >[] = [];
    for (const [ref, vertexWork] of this.work) {
      if (vertexWork.completionCommitted) continue;
      if (vertexWork.unmet.size > 0 || vertexWork.unmetComplete.size > 0) {
        blockedVertexPrerequisiteReports.push({
          id: this.container.liveResolvedGraphView.requireVertexId(ref),
          missing: Array.from(
            new Set([...vertexWork.unmet, ...vertexWork.unmetComplete]),
          ),
        });
      } else {
        incomplete.push(ref);
      }
    }
    return blockedVertexPrerequisiteReports.length === 0 &&
      incomplete.length === 0
      ? null
      : { dependencies: blockedVertexPrerequisiteReports, incomplete };
  }

  diagnoseStall(
    stall: GraphStall<InputVertexTypes | RewrittenVertexTypes>,
  ): DagTraversalStallDiagnostics {
    const blockedVertexPrerequisiteReports = stall.dependencies.map(
      ({ id, missing }) => ({
        vertexId: id,
        prerequisiteVertexIdsInReport: missing.slice(),
      }),
    );
    const unknown = new Set<VertexId>();
    for (const {
      prerequisiteVertexIdsInReport,
    } of blockedVertexPrerequisiteReports) {
      for (const dependency of prerequisiteVertexIdsInReport) {
        if (this.container.store.getIdState(dependency) === undefined)
          unknown.add(dependency);
      }
    }
    const { edges, cycles } = dependencyMilestones(
      Array.from(
        this.container.liveResolvedGraphView.getVertexRefs(),
        (ref) => ({
          id: this.container.liveResolvedGraphView.requireVertexId(ref),
          work: this.container.store.getDeclaredDependencies(ref),
          complete: this.container.store.getDeclaredCompleteDependencies(ref),
          children: this.container.liveResolvedGraphView
            .getChildrenOf(ref)!
            .map((child) =>
              this.container.liveResolvedGraphView.requireVertexId(child),
            ),
        }),
      ),
    );
    const syntheticId = this.container.syntheticRootId;
    // Analyze the full internal topology, then hide only synthetic bookkeeping.
    const originalMilestoneConstraints = edges
      .filter(
        ({ waitingMilestone, prerequisiteMilestone }) =>
          syntheticId === null ||
          (!sameVertexId(waitingMilestone.vertexId, syntheticId) &&
            !sameVertexId(prerequisiteMilestone.vertexId, syntheticId)),
      )
      .map(({ waitingMilestone, prerequisiteMilestone, reason }) => ({
        waitingMilestone: { ...waitingMilestone },
        prerequisiteMilestone: { ...prerequisiteMilestone },
        reason,
      }));
    const cycleMembers = new Set(cycles.flat());
    return {
      blockedVertexPrerequisiteReports,
      unresolvedPrerequisiteVertexIds: Array.from(unknown),
      milestoneCycleVertexIdComponents: cycles,
      originalMilestoneConstraints,
      nonCyclePrerequisiteBlockedVertexIds: blockedVertexPrerequisiteReports
        .filter(({ vertexId }) => !cycleMembers.has(vertexId))
        .map(({ vertexId }) => vertexId),
      incompleteVertexIdsWithoutUnmetPrerequisites: stall.incomplete.map(
        (ref) => this.container.liveResolvedGraphView.requireVertexId(ref),
      ),
    };
  }

  /** Root, discovery and lookup acceptance share identity/conflict semantics. */
  private getKnownResult(
    id: VertexId,
    result: MakeVertexResult<InputVertexTypes>,
  ) {
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

  private rejectTreeMetadata(result: MakeVertexResult<InputVertexTypes>): void {
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
    content: NonNullable<MakeVertexResult<InputVertexTypes>['vertexContent']>,
  ): {
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
    id: string;
  } {
    while (true) {
      const ref = new MutableValueReference(
        new Vertex<InputVertexTypes | RewrittenVertexTypes>(content),
      );
      const id = ref.getReferenceIdentity();
      if (this.container.store.getIdState(id) === undefined) return { ref, id };
    }
  }

  private getDependencies(
    context: InternalChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >,
    result: MakeVertexResult<InputVertexTypes>,
  ): VertexId[] {
    const declared = result.workWaitsForWorkOf;
    if (declared !== undefined) return Array.from(new Set(declared));
    return (this.container.sourceMode === 'graph' &&
      this.undeclaredWorkPrerequisitePolicy === 'none') ||
      context.parentVertexHandle === this.container.syntheticRootRef
      ? []
      : [
          this.container.liveResolvedGraphView.requireVertexId(
            context.parentVertexHandle,
          ),
        ];
  }

  private findExistingTreeChild(
    context: InternalChildDiscoveryContext<
      InputVertexTypes | RewrittenVertexTypes
    >,
  ): InternalVertexRef<InputVertexTypes | RewrittenVertexTypes> | null {
    const candidates = this.reusableTreeChildren.get(
      context.parentVertexHandle,
    );
    const candidate = candidates?.get(context.parentChildHintIndex);
    if (candidate === undefined) return null;
    candidates!.delete(context.parentChildHintIndex);
    if (candidates!.size === 0) {
      this.reusableTreeChildren.delete(context.parentVertexHandle);
    }
    return sameVertexId(candidate.hint, context.childDiscoveryHint)
      ? candidate.ref
      : null;
  }

  private captureReusableTreeChildren(
    parent: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
    const tree = this.container.treeContainer?.resolvedTree;
    if (tree === undefined) return;
    const candidates = new Map<
      number,
      {
        ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>;
        hint: (InputVertexTypes | RewrittenVertexTypes)['ChildHint'];
      }
    >();
    for (const child of tree.getDetachedChildReferenceListOrNull(parent)!) {
      const context = tree.getDetachedChildDiscoveryContextOrNull(child);
      if (
        context?.parentVertexHandle === parent &&
        !candidates.has(context.parentChildHintIndex)
      ) {
        candidates.set(context.parentChildHintIndex, {
          ref: child,
          hint: context.childDiscoveryHint,
        });
      }
    }
    if (candidates.size > 0) this.reusableTreeChildren.set(parent, candidates);
  }

  private getCompleteDependencies(
    result: MakeVertexResult<InputVertexTypes>,
  ): VertexId[] {
    if (this.container.sourceMode === 'tree') return [];
    if (result.workWaitsForSubgraphCompletionOf !== undefined)
      this.completionValidation = true;
    return Array.from(new Set(result.workWaitsForSubgraphCompletionOf));
  }

  private registerDependencies(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    blockedVertexPrerequisiteReports: readonly VertexId[],
    reverse: Map<
      VertexId,
      Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>>
    >,
    complete: boolean,
  ): Set<VertexId> {
    const unmet = new Set<VertexId>();
    for (const dependency of blockedVertexPrerequisiteReports) {
      let dependents = reverse.get(dependency);
      if (dependents === undefined) {
        dependents = new Set();
        reverse.set(dependency, dependents);
      }
      dependents.add(ref);
      const state = this.container.store.getIdState(dependency);
      if (state?.kind === 'omitted') continue;
      if (state?.kind === 'live') {
        const status =
          this.container.liveResolvedGraphView.getVertexVisitSchedulingStageOrNull(
            state.ref,
          );
        if (
          status === 'COMPLETION_VISIT_COMMITTED' ||
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
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    blockedVertexPrerequisiteReports: readonly VertexId[],
    completeDependencies: readonly VertexId[] = [],
  ): void {
    const unmet = this.registerDependencies(
      ref,
      blockedVertexPrerequisiteReports,
      this.reverseDependencies,
      false,
    );
    const unmetComplete = this.registerDependencies(
      ref,
      completeDependencies,
      this.reverseCompleteDependencies,
      true,
    );

    const vertexWork: VertexWork<InputVertexTypes | RewrittenVertexTypes> = {
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
        this.container.liveResolvedGraphView.requireVertexId(ref),
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

  private enqueueReady(
    vertexWork: VertexWork<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
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

  private peekEligible(): EligibleVisit<
    InputVertexTypes | RewrittenVertexTypes
  > | null {
    return this.eligible[this.eligibleHead] ?? null;
  }

  private dequeueEligible(): EligibleVisit<
    InputVertexTypes | RewrittenVertexTypes
  > | null {
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

  private noteLinkedSlot(
    parent: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    index: number,
  ): void {
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

  private accountSlot(
    vertexWork: VertexWork<InputVertexTypes | RewrittenVertexTypes>,
    index: number,
  ): void {
    if (vertexWork.completionAccounted[index] === true) return;
    vertexWork.completionAccounted[index] = true;
    if (vertexWork.expansion === 'closed') {
      vertexWork.remainingChildren -= 1;
      this.enqueueCompletion(vertexWork);
    }
  }

  private enqueueCompletion(
    vertexWork: VertexWork<InputVertexTypes | RewrittenVertexTypes>,
  ): void {
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
    this.eligible.push({
      ref: vertexWork.ref,
      order: 'ON_SUBGRAPH_COMPLETION_READY',
    });
  }

  private addRemoval(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
    removals: Set<InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>>,
    pending: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>[],
  ): void {
    if (!this.container.liveResolvedGraphView.has(ref) || removals.has(ref))
      return;
    removals.add(ref);
    pending.push(ref);
  }

  private getVertex(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ) {
    const vertex = this.container.liveResolvedGraphView.get(ref);
    if (vertex === null) throw new Error('Unknown vertex reference');
    return vertex;
  }

  private getWork(
    ref: InternalVertexRef<InputVertexTypes | RewrittenVertexTypes>,
  ): VertexWork<InputVertexTypes | RewrittenVertexTypes> {
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
