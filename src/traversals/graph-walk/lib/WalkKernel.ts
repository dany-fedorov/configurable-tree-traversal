import type { Outcome } from '@core/effects/types';
import type { VisitorRecord } from '@core/graph/types';
import { normalizeTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import type { TraversalStopReason } from '@core/TraversalRunner';
import { TraversalRunnerStatus as Status } from '@core/TraversalRunner';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import type { GraphWalkEdge, GraphWalkEvent } from '../GraphWalkEvent';
import type { GraphWalkRouteEnumerationContext } from '../GraphWalkOptions';
import { GraphWalkObservationKind as ObservationKind } from '../GraphWalkPhase';
import type {
  GraphWalkResolvedVertex,
  GraphWalkVertexResolutionResult,
} from '../GraphWalkSource';
import type { GraphWalkExecutionSnapshot } from './GraphWalkExecutionSnapshot';
import type {
  GraphWalkTerminalOutcome,
  GraphWalkProgressSnapshot,
} from './GraphWalkSummary';
import type {
  GraphWalkResolvedOptions,
  WalkVisitor,
} from './normalizeWalkOptions';
import type { WalkAction } from './WalkEffects';
import type { GraphWalkPendingInvocationOperation } from '../GraphWalkOperation';
import type { WalkRoute } from './WalkFrontier';
import { projectPath, routeContains, WalkFrontier } from './WalkFrontier';
import { WalkResources } from './WalkResources';
import type { WalkCursor, WalkTarget } from './WalkSourceCache';
import {
  copyResolution,
  makeCursor,
  pullCursor,
  readStep,
  WalkSourceCache,
} from './WalkSourceCache';
import { WalkVisitorChain } from './WalkVisitorChain';

const phases = [
  ObservationKind.VERTEX_OCCURRENCE,
  ObservationKind.ADMITTED_EDGE_OCCURRENCE,
  ObservationKind.ROUTE_PREFIX,
];
type Observation<VertexData, EdgeData, VertexId> = Extract<
  WalkAction<VertexData, EdgeData, VertexId>,
  { kind: 'OBSERVATION' }
> & {
  admittedTargetOccurrenceIndex: number;
  runnerLocalVertexIdentityToken: symbol;
};
type Request<VertexData, EdgeData, VertexId> = Extract<
  WalkAction<VertexData, EdgeData, VertexId>,
  { kind: 'CALL' }
> & {
  issued: boolean;
  accept: (value: unknown) => void;
};
type Candidate<VertexData, EdgeData, VertexId> = {
  targetToResolveOnAdmission: WalkTarget<VertexId>;
  parent: WalkRoute<VertexData, EdgeData, VertexId> | null;
  via: GraphWalkEdge<EdgeData, VertexId> | null;
};

/** Promise-free transition owner. Only CALL closures perform source I/O. */
export class WalkKernel<VertexData, EdgeData, VertexId> {
  private readonly resources = new WalkResources();
  private readonly vertexTokens = new Map<VertexId, symbol>();
  private tornDown = false;
  private status = Status.NOT_STARTED;
  private pauseRequested = false;
  private terminalOutcome: GraphWalkTerminalOutcome | null = null;
  private request: Request<VertexData, EdgeData, VertexId> | null = null;
  private runnerLocalInvocationRequestId = 0;
  private boundaryId = 0;
  private roots: WalkCursor | null = null;
  private readonly rootIds = new Set<VertexId>();
  private readonly cache: WalkSourceCache<VertexData, EdgeData, VertexId>;
  private readonly frontier: WalkFrontier<VertexData, EdgeData, VertexId>;
  private readonly observations: Observation<VertexData, EdgeData, VertexId>[] =
    [];
  private chain: WalkVisitorChain<VertexData, EdgeData, VertexId> | null = null;
  private expansion: WalkRoute<VertexData, EdgeData, VertexId> | null = null;
  private depthLimited = false;
  private counts = {
    rootOrLinkReadAttemptsIncludingDoneAndCacheReplay: 0,
    admittedRootOrLinkTargetOccurrences: 0,
    resolvedFoundVertexIdCount: 0,
    resolvedOmittedVertexIdCount: 0,
    freshSourceOutgoingLinkCount: 0,
    acknowledgedObservationCountsByKind: {
      [ObservationKind.VERTEX_OCCURRENCE]: 0,
      [ObservationKind.ADMITTED_EDGE_OCCURRENCE]: 0,
      [ObservationKind.ROUTE_PREFIX]: 0,
    },
  };
  private execution;

  constructor(
    private readonly options: GraphWalkResolvedOptions<
      VertexData,
      EdgeData,
      VertexId
    >,
    private readonly executionKind: 'sync' | 'async' = 'sync',
  ) {
    this.cache = new WalkSourceCache(
      options.graphWalkDiscoverySource.vertexResolutionMode,
    );
    this.frontier = new WalkFrontier(options.expansionOrder);
    this.execution = options.execution;
  }
  getTraversalLifecycleStatus(): Status {
    return this.status;
  }
  getTraversalStopReason(): TraversalStopReason | null {
    if (this.status === Status.SUSPENDED) return 'paused';
    if (this.status === Status.FINISHED) return 'finished';
    if (this.status === Status.FAILED) return 'failed';
    return null;
  }
  isSuspended(): boolean {
    return this.status === Status.SUSPENDED;
  }
  requestPauseAfterAdmittedCallbacksDrain(): boolean {
    if (this.status !== Status.RUNNING || this.pauseRequested) return false;
    this.pauseRequested = true;
    return true;
  }
  resume(config?: TraversalIterableConfigInput<ObservationKind>): void {
    const execution = normalizeTraversalExecutionOptions(
      phases,
      config,
      this.execution,
    );
    this.execution = execution;
    if (this.status !== Status.FINISHED && this.status !== Status.FAILED) {
      this.status = Status.RUNNING;
      this.pauseRequested = false;
      this.chain?.resume();
    }
  }
  beginClose(): void {
    if (this.status === Status.FAILED || this.status === Status.FINISHED)
      return;
    this.status = Status.FINISHED;
    this.terminalOutcome = { kind: 'permanentlyClosedByCaller' };
  }
  shouldEmit(observationKind: ObservationKind): boolean {
    return this.execution.deliveredEventKinds.includes(observationKind);
  }

  private call(
    operation: GraphWalkPendingInvocationOperation,
    invoke: () => unknown,
    accept: (value: unknown) => void,
    runnerLocalVertexIdentityToken?: symbol,
  ): void {
    this.request = {
      kind: 'CALL',
      runnerLocalInvocationRequestId: this.runnerLocalInvocationRequestId++,
      operation,
      runnerLocalVertexIdentityToken,
      invoke,
      accept,
      issued: false,
    };
  }
  submit(
    runnerLocalInvocationRequestId: number,
    terminalOutcome: Outcome<unknown>,
  ): void {
    const request = this.request;
    if (
      request === null ||
      request.runnerLocalInvocationRequestId !==
        runnerLocalInvocationRequestId ||
      !request.issued
    )
      throw new Error('Invalid walking request settlement');
    this.request = null;
    try {
      if (!terminalOutcome.ok) throw terminalOutcome.error;
      request.accept(terminalOutcome.value);
    } catch (error) {
      if (this.terminalOutcome?.kind !== 'failed') {
        this.status = Status.FAILED;
        this.terminalOutcome = { kind: 'failed', error };
      }
    }
  }
  acknowledgeObservation(boundaryId: number): void {
    const observation = this.observations[0];
    if (observation === undefined || observation.boundaryId !== boundaryId)
      throw new Error('Invalid walking observation acknowledgement');
    this.counts.acknowledgedObservationCountsByKind[
      observation.observationKind
    ]++;
    this.observations.shift();
    this.chain = null;
  }
  private token(vertexId: VertexId): symbol {
    let token = this.vertexTokens.get(vertexId);
    if (token === undefined) {
      token = Symbol('walking vertex');
      this.vertexTokens.set(vertexId, token);
    }
    return token;
  }
  private observe(
    observationKind: ObservationKind,
    event: () => GraphWalkEvent<VertexData, EdgeData, VertexId>,
    vertexId: VertexId,
  ): void {
    this.observations.push({
      kind: 'OBSERVATION',
      observationKind,
      runnerLocalVertexIdentityToken: this.token(vertexId),
      admittedTargetOccurrenceIndex:
        this.counts.admittedRootOrLinkTargetOccurrences - 1,
      boundaryId: this.boundaryId++,
      event,
    });
  }

  private admit(candidate: Candidate<VertexData, EdgeData, VertexId>): void {
    this.counts.admittedRootOrLinkTargetOccurrences++;
    const { targetToResolveOnAdmission } = candidate;
    if (this.cache.resolutions.has(targetToResolveOnAdmission.vertexId)) {
      this.commit(
        candidate,
        this.cache.resolutions.get(targetToResolveOnAdmission.vertexId)!,
        false,
      );
    } else if (
      targetToResolveOnAdmission.resolutionIfNotPreviouslyAdmitted !== undefined
    ) {
      this.commit(
        candidate,
        copyResolution<VertexData>(
          targetToResolveOnAdmission.resolutionIfNotPreviouslyAdmitted,
        ),
        true,
      );
    } else {
      const graphWalkDiscoverySource = this.options.graphWalkDiscoverySource;
      const resolveVertexDataById =
        graphWalkDiscoverySource.resolveVertexDataById;
      if (resolveVertexDataById === undefined)
        throw new TypeError('Cached walking target has no admitted resolution');
      this.call(
        'resolveVertexDataById',
        () =>
          resolveVertexDataById.call(
            graphWalkDiscoverySource.receiver,
            targetToResolveOnAdmission.vertexId,
          ),
        (value) =>
          this.commit(candidate, copyResolution<VertexData>(value), true),
        this.token(targetToResolveOnAdmission.vertexId),
      );
    }
  }
  private commit(
    candidate: Candidate<VertexData, EdgeData, VertexId>,
    result: GraphWalkVertexResolutionResult<VertexData>,
    fresh: boolean,
  ): void {
    const { targetToResolveOnAdmission, parent, via } = candidate;
    if (fresh) {
      this.cache.resolutions.set(targetToResolveOnAdmission.vertexId, result);
      if (result.kind === 'found') this.counts.resolvedFoundVertexIdCount++;
      else this.counts.resolvedOmittedVertexIdCount++;
    }
    const vertex: GraphWalkResolvedVertex<VertexData, VertexId> | null =
      result.kind === 'found'
        ? {
            vertexId: targetToResolveOnAdmission.vertexId,
            vertexData: result.vertexData,
          }
        : null;
    const depth = parent === null ? 0 : parent.depth + 1;
    if (via !== null) {
      const graphWalkDiscoverySource = parent!.vertex;
      this.observe(
        ObservationKind.ADMITTED_EDGE_OCCURRENCE,
        () => ({
          eventKind: 'admittedEdgeOccurrence',
          edge: { ...via },
          fromVertex: { ...graphWalkDiscoverySource },
          targetHopDepth: depth,
          targetResolution:
            vertex === null
              ? { kind: 'omitted' }
              : { kind: 'found', vertex: { ...vertex } },
        }),
        targetToResolveOnAdmission.vertexId,
      );
    }
    if (
      (fresh ||
        this.options.routeEnumerationPolicy !==
          'firstAdmittedFoundRoutePerVertex') &&
      vertex !== null
    ) {
      const route = { vertex, depth, via, parent };
      this.observe(
        ObservationKind.VERTEX_OCCURRENCE,
        () => ({
          eventKind: 'vertexOccurrence',
          vertex: { ...vertex },
          vertexHopDepth: depth,
          incomingEdgeFromParentRouteOccurrence:
            via === null ? null : { ...via },
        }),
        targetToResolveOnAdmission.vertexId,
      );
      this.observe(
        ObservationKind.ROUTE_PREFIX,
        () => projectPath(route),
        targetToResolveOnAdmission.vertexId,
      );
      this.expansion = route;
    }
  }

  private booleanResult(value: unknown): boolean {
    if (typeof value !== 'boolean')
      throw new TypeError('Walking predicates must return booleans');
    return value;
  }

  private routeContext(
    route: WalkRoute<VertexData, EdgeData, VertexId>,
  ): GraphWalkRouteEnumerationContext<VertexData, EdgeData, VertexId> {
    const routeEnumerationPolicy = this.options.routeEnumerationPolicy;
    return routeEnumerationPolicy === 'firstAdmittedFoundRoutePerVertex'
      ? { routeEnumerationPolicy }
      : { routeEnumerationPolicy, routePrefix: projectPath(route) };
  }

  private follow(candidate: Candidate<VertexData, EdgeData, VertexId>): void {
    if (
      this.options.routeEnumerationPolicy === 'allVertexSimpleRoutePrefixes' &&
      routeContains(
        candidate.parent!,
        candidate.targetToResolveOnAdmission.vertexId,
      )
    )
      return;
    const predicate = this.options.shouldAdmitOutgoingLinkTarget;
    if (predicate === undefined) this.admit(candidate);
    else {
      this.call(
        'shouldAdmitOutgoingLinkTarget',
        () =>
          predicate(
            { ...candidate.via! },
            {
              ...this.routeContext(candidate.parent!),
              fromVertex: { ...candidate.parent!.vertex },
              targetHopDepth: candidate.parent!.depth + 1,
            },
          ),
        (value) => {
          if (this.booleanResult(value)) this.admit(candidate);
        },
        this.token(candidate.targetToResolveOnAdmission.vertexId),
      );
    }
  }

  private expand(route: WalkRoute<VertexData, EdgeData, VertexId>): void {
    const accept = (expand: boolean) => {
      if (!expand) return;
      const maxRouteHopDepth = this.options.limits.maxRouteHopDepth;
      if (maxRouteHopDepth !== undefined && route.depth >= maxRouteHopDepth)
        this.depthLimited = true;
      else this.frontier.push(route);
    };
    const predicate = this.options.shouldExpandVertexOccurrence;
    if (predicate === undefined) accept(true);
    else {
      this.call(
        'shouldExpandVertexOccurrence',
        () =>
          predicate(
            { ...route.vertex },
            {
              ...this.routeContext(route),
              vertexHopDepth: route.depth,
              incomingEdgeFromParentRouteOccurrence:
                route.via === null ? null : { ...route.via },
            },
          ),
        (value) => accept(this.booleanResult(value)),
        this.token(route.vertex.vertexId),
      );
    }
  }

  /** Pure completion checks run before this gate; no exhaustion probing. */
  private limitBeforePull(): boolean {
    const {
      maxAdmittedRootOrLinkTargetOccurrences,
      maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay,
    } = this.options.limits;
    const admissionLimitReached =
      maxAdmittedRootOrLinkTargetOccurrences !== undefined &&
      this.counts.admittedRootOrLinkTargetOccurrences >=
        maxAdmittedRootOrLinkTargetOccurrences;
    const readLimitReached =
      maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay !== undefined &&
      this.counts.rootOrLinkReadAttemptsIncludingDoneAndCacheReplay >=
        maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay;
    if (!admissionLimitReached && !readLimitReached) return false;
    this.finish(admissionLimitReached, readLimitReached);
    return true;
  }

  private finish(
    admissionLimitReached = false,
    readLimitReached = false,
  ): void {
    const reachedLimits: (
      | 'maxRouteHopDepth'
      | 'maxAdmittedRootOrLinkTargetOccurrences'
      | 'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay'
    )[] = [];
    if (this.depthLimited) reachedLimits.push('maxRouteHopDepth');
    if (admissionLimitReached)
      reachedLimits.push('maxAdmittedRootOrLinkTargetOccurrences');
    if (readLimitReached)
      reachedLimits.push(
        'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay',
      );
    this.status = Status.FINISHED;
    this.terminalOutcome =
      reachedLimits.length > 0
        ? { kind: 'traversalLimitsReached', reachedLimits }
        : { kind: 'explorationExhausted' };
  }

  poll(retainObservation = false): WalkAction<VertexData, EdgeData, VertexId> {
    for (;;) {
      if (this.request !== null && this.request.issued) return { kind: 'WAIT' };
      if (this.terminalOutcome !== null) {
        if (!this.tornDown) {
          this.tornDown = true;
          this.request = null;
          this.pauseRequested = false;
          this.observations.length = 0;
          this.chain = null;
          this.expansion = null;
          this.frontier.clear();
          this.rootIds.clear();
          this.vertexTokens.clear();
          this.cache.resolutions.clear();
          this.cache.adjacency.clear();
          this.roots = null;
        }
        const resource = this.resources.takeLast();
        if (resource !== undefined) {
          this.call(
            'returnSourceIteratorForDisposal',
            () => {
              const close: (() => unknown) | undefined =
                resource.iterator.return;
              return close == null ? undefined : close.call(resource.iterator);
            },
            () => undefined,
            resource.runnerLocalVertexIdentityToken,
          );
          const request = this.request!;
          request.issued = true;
          const {
            kind,
            runnerLocalInvocationRequestId,
            operation,
            invoke,
            runnerLocalVertexIdentityToken,
          } = request;
          return {
            kind,
            runnerLocalInvocationRequestId,
            operation,
            invoke,
            runnerLocalVertexIdentityToken,
          };
        }
        return this.terminalOutcome.kind === 'failed'
          ? { kind: 'FAILED', error: this.terminalOutcome.error }
          : { kind: 'FINISHED' };
      }
      if (this.status === Status.SUSPENDED) return { kind: 'SUSPENDED' };
      if (this.status === Status.NOT_STARTED) return { kind: 'WAIT' };
      // An admitted callback chain drains on cooperative pause. HALT keeps the
      // same chain at its next callback until a new execution lease resumes it.
      if (this.chain !== null) {
        const chain = this.chain;
        if (
          chain.paused ||
          (chain.done && retainObservation && this.pauseRequested)
        ) {
          this.status = Status.SUSPENDED;
          return { kind: 'SUSPENDED' };
        }
        if (chain.done) return this.observations[0]!;
        this.call(
          'invokeVisitorCallback',
          () => chain.invoke(),
          (value) => chain.submit(value),
          this.observations[0]!.runnerLocalVertexIdentityToken,
        );
      } else if (this.pauseRequested) {
        this.status = Status.SUSPENDED;
        return { kind: 'SUSPENDED' };
      }
      if (this.request !== null) {
        this.request.issued = true;
        const {
          kind,
          runnerLocalInvocationRequestId,
          operation,
          invoke,
          runnerLocalVertexIdentityToken,
        } = this.request;
        return {
          kind,
          runnerLocalInvocationRequestId,
          operation,
          invoke,
          runnerLocalVertexIdentityToken,
        };
      }
      if (this.observations.length > 0) {
        const observation = this.observations[0]!;
        const {
          enableVisitorFunctionsFor: include,
          disableVisitorFunctionsFor: exclude,
        } = this.execution;
        const enabled =
          include !== null
            ? include.includes(observation.observationKind)
            : exclude === null ||
              !exclude.includes(observation.observationKind);
        // The observationKind-keyed records and projection originate at the same boundary.
        const records = enabled
          ? (this.options.visitorsByObservationKind[
              observation.observationKind
            ] as VisitorRecord<
              WalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
            >[])
          : [];
        this.chain = new WalkVisitorChain(
          records,
          observation.observationKind,
          observation.event,
          observation.admittedTargetOccurrenceIndex,
          this.counts.acknowledgedObservationCountsByKind[
            observation.observationKind
          ],
        );
        continue;
      }
      if (this.expansion !== null) {
        const route = this.expansion;
        this.expansion = null;
        this.expand(route);
        continue;
      }
      const graphWalkDiscoverySource = this.options.graphWalkDiscoverySource;
      if (this.roots === null) {
        if (this.limitBeforePull()) continue;
        this.call(
          'enumerateRootTargets',
          () =>
            graphWalkDiscoverySource.enumerateRootTargets.call(
              graphWalkDiscoverySource.receiver,
            ),
          (value) => {
            this.roots = makeCursor(value);
          },
        );
      } else if (
        !this.roots.done &&
        (this.options.expansionOrder === 'breadthFirst' ||
          this.frontier.size === 0)
      ) {
        if (this.limitBeforePull()) continue;
        const roots = this.roots;
        this.counts.rootOrLinkReadAttemptsIncludingDoneAndCacheReplay++;
        this.call(
          'readNextRootTarget',
          () => pullCursor(roots, this.executionKind, this.resources),
          (value) => {
            const step = readStep(value);
            if (step.done) {
              roots.done = true;
              this.resources.markSourceIteratorExhausted(roots.iterator!);
            } else {
              const targetToResolveOnAdmission = this.cache.copyTarget(
                step.value,
              );
              if (!this.rootIds.has(targetToResolveOnAdmission.vertexId)) {
                this.rootIds.add(targetToResolveOnAdmission.vertexId);
                this.admit({
                  targetToResolveOnAdmission,
                  parent: null,
                  via: null,
                });
              }
            }
          },
        );
      } else if (this.frontier.size > 0) {
        const frame = this.frontier.peek();
        const { route } = frame;
        const entries = this.cache.entries(route.vertex.vertexId);
        if (entries.cursor === null) {
          if (this.limitBeforePull()) continue;
          this.call(
            'enumerateOutgoingLinks',
            () =>
              graphWalkDiscoverySource.enumerateOutgoingLinks.call(
                graphWalkDiscoverySource.receiver,
                { ...route.vertex },
              ),
            (value) => {
              entries.cursor = makeCursor(value);
            },
            this.token(route.vertex.vertexId),
          );
        } else {
          if (this.limitBeforePull()) continue;
          const cursor = entries.cursor;
          const previouslyAdmittedVertex =
            frame.index < entries.links.length || cursor.done;
          this.counts.rootOrLinkReadAttemptsIncludingDoneAndCacheReplay++;
          this.call(
            'readNextOutgoingLinkOrCachedReplay',
            () =>
              previouslyAdmittedVertex
                ? frame.index < entries.links.length
                  ? { done: false, value: entries.links[frame.index] }
                  : { done: true }
                : pullCursor(
                    cursor,
                    this.executionKind,
                    this.resources,
                    this.token(route.vertex.vertexId),
                  ),
            (value) => {
              const step = readStep(value);
              if (step.done) {
                if (!previouslyAdmittedVertex) {
                  cursor.done = true;
                  this.resources.markSourceIteratorExhausted(cursor.iterator!);
                }
                this.frontier.remove();
              } else {
                const link = previouslyAdmittedVertex
                  ? entries.links[frame.index]!
                  : this.cache.copyLink(step.value);
                const index = frame.index++;
                if (!previouslyAdmittedVertex) {
                  entries.links.push(link);
                  this.counts.freshSourceOutgoingLinkCount++;
                }
                this.follow({
                  targetToResolveOnAdmission: link.targetToResolveOnAdmission,
                  parent: route,
                  via: {
                    fromVertexId: route.vertex.vertexId,
                    sourceOutgoingLinkIndexBeforeFiltering: index,
                    toVertexId: link.targetToResolveOnAdmission.vertexId,
                    edgeData: link.edgeData,
                  },
                });
              }
            },
            this.token(route.vertex.vertexId),
          );
        }
      } else {
        this.finish();
      }
    }
  }
  captureProgressSnapshot(): GraphWalkProgressSnapshot {
    return Object.freeze({
      status: this.status,
      counts: Object.freeze({
        ...this.counts,
        acknowledgedObservationCountsByKind: Object.freeze({
          ...this.counts.acknowledgedObservationCountsByKind,
        }),
      }),
      terminalOutcome:
        this.terminalOutcome === null
          ? null
          : this.terminalOutcome.kind === 'traversalLimitsReached'
          ? Object.freeze({
              ...this.terminalOutcome,
              reachedLimits: Object.freeze([
                ...this.terminalOutcome.reachedLimits,
              ]),
            })
          : Object.freeze({ ...this.terminalOutcome }),
    });
  }
  captureExecutionSnapshot(): GraphWalkExecutionSnapshot {
    const { deliveredEventKinds, admittedVisitorCallbackPhases } =
      normalizeTraversalExecutionOptions(phases, undefined, this.execution);
    const execution = { deliveredEventKinds, admittedVisitorCallbackPhases };
    Object.freeze(execution.deliveredEventKinds);
    if (execution.admittedVisitorCallbackPhases !== 'all') {
      if ('include' in execution.admittedVisitorCallbackPhases)
        Object.freeze(execution.admittedVisitorCallbackPhases.include);
      else Object.freeze(execution.admittedVisitorCallbackPhases.exclude);
      Object.freeze(execution.admittedVisitorCallbackPhases);
    }
    const counts = this.captureProgressSnapshot().counts;
    Object.freeze(counts.acknowledgedObservationCountsByKind);
    return Object.freeze({
      traversalAlgorithm: 'graph-walk',
      sourceMode: 'graph',
      concurrency: 1,
      traversalLifecycleStatus: this.status,
      traversalStopReason: this.getTraversalStopReason(),
      pauseRequested: this.pauseRequested,
      callbackExecutionMode: this.executionKind,
      expansionOrder: this.options.expansionOrder,
      routeEnumerationPolicy: this.options.routeEnumerationPolicy,
      executionOptions: Object.freeze(execution),
      counts: Object.freeze(counts),
      pendingRouteExpansionFrameCount: this.frontier.size,
      // A taken resource remains open until its return request settles.
      openSourceIteratorCount:
        this.resources.size +
        (this.request?.operation === 'returnSourceIteratorForDisposal' ? 1 : 0),
      pendingObservationKinds: Object.freeze(
        this.observations.map((item) => item.observationKind),
      ),
      visitorChainPosition:
        this.chain === null
          ? null
          : Object.freeze({
              observationKind: this.chain.observationKind,
              visitorIndexInObservationChain:
                this.chain.visitorIndexInObservationChain,
            }),
      pendingInvocationRequests: Object.freeze(
        this.request === null
          ? []
          : [
              Object.freeze({
                runnerLocalInvocationRequestId:
                  this.request.runnerLocalInvocationRequestId,
                operation: this.request.operation,
                runnerLocalVertexIdentityToken:
                  this.request.runnerLocalVertexIdentityToken,
              }),
            ],
      ),
      inFlightInvocationCount:
        this.request !== null && this.request.issued ? 1 : 0,
      bufferedDeliveryEventCount: this.observations.length,
    });
  }
}
