import { WalkVisitorChain } from './WalkVisitorChain';
import type { WalkVisitor } from './normalizeWalkOptions';
import type { VisitorRecord } from '@core/graph/types';
import { TraversalRunnerStatus as Status } from '@core/TraversalRunner';
import type { TraversalStopReason } from '@core/TraversalRunner';
import type { Outcome } from '@core/effects/types';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import { normalizeTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import { GraphWalkPhase as Phase } from '../GraphWalkPhase';
import type {
  GraphWalkVertex,
  GraphWalkVertexResult,
} from '../GraphWalkSource';
import type { GraphWalkEdge, GraphWalkEvent } from '../GraphWalkEvent';
import type { NormalizedWalkOptions } from './normalizeWalkOptions';
import type { WalkAction, WalkOperation } from './WalkEffects';
import type { GraphWalkSummary, GraphWalkOutcome } from './GraphWalkSummary';
import type { GraphWalkInspection } from './GraphWalkInspection';
import { WalkFrontier, projectPath } from './WalkFrontier';
import type { WalkRoute } from './WalkFrontier';
import {
  WalkSourceCache,
  copyResolution,
  makeCursor,
  pullCursor,
  readStep,
} from './WalkSourceCache';
import type { WalkCursor, WalkTarget } from './WalkSourceCache';

const phases = [Phase.VERTEX, Phase.EDGE, Phase.PATH];
type Observation<Data, Edge, ID> = Extract<
  WalkAction<Data, Edge, ID>,
  { kind: 'OBSERVATION' }
> & { occurrenceIndex: number };
type Request<Data, Edge, ID> = Extract<
  WalkAction<Data, Edge, ID>,
  { kind: 'CALL' }
> & {
  issued: boolean;
  accept: (value: unknown) => void;
};
type Candidate<Data, Edge, ID> = {
  target: WalkTarget<ID>;
  parent: WalkRoute<Data, Edge, ID> | null;
  via: GraphWalkEdge<Edge, ID> | null;
};

/** Promise-free transition owner. Only CALL closures perform source I/O. */
export class WalkKernel<Data, Edge, ID> {
  private status = Status.INITIAL;
  private haltRequested = false;
  private outcome: GraphWalkOutcome | null = null;
  private request: Request<Data, Edge, ID> | null = null;
  private requestId = 0;
  private boundaryId = 0;
  private roots: WalkCursor | null = null;
  private readonly rootIds = new Set<ID>();
  private readonly cache = new WalkSourceCache<Data, Edge, ID>();
  private readonly frontier: WalkFrontier<Data, Edge, ID>;
  private readonly observations: Observation<Data, Edge, ID>[] = [];
  private chain: WalkVisitorChain<Data, Edge, ID> | null = null;
  private expansion: WalkRoute<Data, Edge, ID> | null = null;
  private depthLimited = false;
  private counts = {
    steps: 0,
    occurrences: 0,
    foundVertices: 0,
    omittedVertices: 0,
    observedLinks: 0,
    observations: { [Phase.VERTEX]: 0, [Phase.EDGE]: 0, [Phase.PATH]: 0 },
  };
  private execution;

  constructor(private readonly options: NormalizedWalkOptions<Data, Edge, ID>) {
    this.frontier = new WalkFrontier(options.strategy);
    this.execution = options.execution;
  }
  getStatus(): Status {
    return this.status;
  }
  getStopReason(): TraversalStopReason | null {
    if (this.status === Status.HALTED) return 'paused';
    if (this.status === Status.FINISHED) return 'finished';
    if (this.status === Status.FAILED) return 'failed';
    return null;
  }
  isHalted(): boolean {
    return this.status === Status.HALTED;
  }
  requestPause(): boolean {
    if (this.status !== Status.RUNNING || this.haltRequested) return false;
    this.haltRequested = true;
    return true;
  }
  resume(config?: TraversalIterableConfigInput<Phase>): void {
    const execution = normalizeTraversalExecutionOptions(
      phases,
      config,
      this.execution,
    );
    this.execution = execution;
    if (this.status !== Status.FINISHED && this.status !== Status.FAILED) {
      this.status = Status.RUNNING;
      this.haltRequested = false;
      this.chain?.resume();
    }
  }
  beginClose(): void {
    if (this.status === Status.FAILED || this.status === Status.FINISHED)
      return;
    this.status = Status.FINISHED;
    this.outcome = { kind: 'closed' };
  }
  shouldEmit(phase: Phase): boolean {
    return this.execution.emitPhases.includes(phase);
  }

  private call(
    operation: WalkOperation,
    invoke: () => unknown,
    accept: (value: unknown) => void,
  ): void {
    this.request = {
      kind: 'CALL',
      requestId: this.requestId++,
      operation,
      invoke,
      accept,
      issued: false,
    };
  }
  submit(requestId: number, outcome: Outcome<unknown>): void {
    const request = this.request;
    if (request === null || request.requestId !== requestId || !request.issued)
      throw new Error('Invalid walking request settlement');
    this.request = null;
    try {
      if (!outcome.ok) throw outcome.error;
      request.accept(outcome.value);
    } catch (error) {
      this.status = Status.FAILED;
      this.outcome = { kind: 'failed', error };
    }
  }
  acknowledgeObservation(boundaryId: number): void {
    const observation = this.observations[0];
    if (observation === undefined || observation.boundaryId !== boundaryId)
      throw new Error('Invalid walking observation acknowledgement');
    this.counts.observations[observation.phase]++;
    this.observations.shift();
    this.chain = null;
  }
  private observe(
    phase: Phase,
    event: () => GraphWalkEvent<Data, Edge, ID>,
  ): void {
    this.observations.push({
      kind: 'OBSERVATION',
      phase,
      occurrenceIndex: this.counts.occurrences - 1,
      boundaryId: this.boundaryId++,
      event,
    });
  }

  private admit(candidate: Candidate<Data, Edge, ID>): void {
    this.counts.occurrences++;
    const { target } = candidate;
    if (this.cache.resolutions.has(target.vertexId)) {
      this.commit(
        candidate,
        this.cache.resolutions.get(target.vertexId)!,
        false,
      );
    } else if (target.resolution !== undefined) {
      this.commit(candidate, copyResolution<Data>(target.resolution), true);
    } else {
      const source = this.options.source;
      this.call(
        'resolveVertex',
        () => {
          if (source.resolveVertex === undefined)
            throw new TypeError(
              'An unresolved walking target requires resolveVertex',
            );
          return source.resolveVertex.call(source.receiver, target.vertexId);
        },
        (value) => this.commit(candidate, copyResolution<Data>(value), true),
      );
    }
  }
  private commit(
    candidate: Candidate<Data, Edge, ID>,
    result: GraphWalkVertexResult<Data>,
    fresh: boolean,
  ): void {
    const { target, parent, via } = candidate;
    if (fresh) {
      this.cache.resolutions.set(target.vertexId, result);
      if (result.kind === 'found') this.counts.foundVertices++;
      else this.counts.omittedVertices++;
    }
    const vertex: GraphWalkVertex<Data, ID> | null =
      result.kind === 'found'
        ? { vertexId: target.vertexId, data: result.data }
        : null;
    const depth = parent === null ? 0 : parent.depth + 1;
    if (via !== null) {
      const source = parent!.vertex;
      this.observe(Phase.EDGE, () => ({
        kind: 'edge',
        edge: { ...via },
        source: { ...source },
        depth,
        target:
          vertex === null
            ? { kind: 'omitted' }
            : { kind: 'found', vertex: { ...vertex } },
      }));
    }
    if (fresh && vertex !== null) {
      const route = { vertex, depth, via, parent };
      this.observe(Phase.VERTEX, () => ({
        kind: 'vertex',
        vertex: { ...vertex },
        depth,
        via: via === null ? null : { ...via },
      }));
      this.observe(Phase.PATH, () => projectPath(route));
      this.expansion = route;
    }
  }

  private booleanResult(value: unknown): boolean {
    if (typeof value !== 'boolean')
      throw new TypeError('Walking predicates must return booleans');
    return value;
  }

  private follow(candidate: Candidate<Data, Edge, ID>): void {
    const predicate = this.options.followEdge;
    if (predicate === undefined) this.admit(candidate);
    else {
      this.call(
        'followEdge',
        () =>
          predicate(
            { ...candidate.via! },
            {
              revisit: 'once',
              source: { ...candidate.parent!.vertex },
              depth: candidate.parent!.depth + 1,
            },
          ),
        (value) => {
          if (this.booleanResult(value)) this.admit(candidate);
        },
      );
    }
  }

  private expand(route: WalkRoute<Data, Edge, ID>): void {
    const accept = (expand: boolean) => {
      if (!expand) return;
      const maxDepth = this.options.limits.maxDepth;
      if (maxDepth !== undefined && route.depth >= maxDepth)
        this.depthLimited = true;
      else this.frontier.push(route);
    };
    const predicate = this.options.expandVertex;
    if (predicate === undefined) accept(true);
    else {
      this.call(
        'expandVertex',
        () =>
          predicate(
            { ...route.vertex },
            {
              revisit: 'once',
              depth: route.depth,
              via: route.via === null ? null : { ...route.via },
            },
          ),
        (value) => accept(this.booleanResult(value)),
      );
    }
  }

  /** Pure completion checks run before this gate; no exhaustion probing. */
  private limitBeforePull(): boolean {
    const { maxOccurrences, maxSteps } = this.options.limits;
    const occurrences =
      maxOccurrences !== undefined && this.counts.occurrences >= maxOccurrences;
    const steps = maxSteps !== undefined && this.counts.steps >= maxSteps;
    if (!occurrences && !steps) return false;
    this.finish(occurrences, steps);
    return true;
  }

  private finish(occurrences = false, steps = false): void {
    const reasons: ('maxDepth' | 'maxOccurrences' | 'maxSteps')[] = [];
    if (this.depthLimited) reasons.push('maxDepth');
    if (occurrences) reasons.push('maxOccurrences');
    if (steps) reasons.push('maxSteps');
    this.status = Status.FINISHED;
    this.outcome =
      reasons.length > 0 ? { kind: 'limited', reasons } : { kind: 'exhausted' };
  }

  poll(): WalkAction<Data, Edge, ID> {
    for (;;) {
      if (this.outcome?.kind === 'failed')
        return { kind: 'FAILED', error: this.outcome.error };
      if (this.status === Status.FINISHED) return { kind: 'FINISHED' };
      if (this.request !== null && this.request.issued) return { kind: 'WAIT' };
      if (this.status === Status.HALTED) return { kind: 'HALTED' };
      if (this.status === Status.INITIAL) return { kind: 'WAIT' };
      // An admitted callback chain drains on cooperative pause. HALT keeps the
      // same chain at its next callback until a new execution lease resumes it.
      if (this.chain !== null) {
        const chain = this.chain;
        if (chain.paused) {
          this.status = Status.HALTED;
          return { kind: 'HALTED' };
        }
        if (chain.done) return this.observations[0]!;
        this.call(
          'visitor',
          () => chain.invoke(),
          (value) => chain.submit(value),
        );
      } else if (this.haltRequested) {
        this.status = Status.HALTED;
        return { kind: 'HALTED' };
      }
      if (this.request !== null) {
        this.request.issued = true;
        const { kind, requestId, operation, invoke } = this.request;
        return { kind, requestId, operation, invoke };
      }
      if (this.observations.length > 0) {
        const observation = this.observations[0]!;
        const {
          enableVisitorFunctionsFor: include,
          disableVisitorFunctionsFor: exclude,
        } = this.execution;
        const enabled =
          include !== null
            ? include.includes(observation.phase)
            : exclude === null || !exclude.includes(observation.phase);
        // The phase-keyed records and projection originate at the same boundary.
        const records = enabled
          ? (this.options.visitors[observation.phase] as VisitorRecord<
              WalkVisitor<Data, Edge, Phase, ID>
            >[])
          : [];
        this.chain = new WalkVisitorChain(
          records,
          observation.phase,
          observation.event,
          observation.occurrenceIndex,
          this.counts.observations[observation.phase],
        );
        continue;
      }
      if (this.expansion !== null) {
        const route = this.expansion;
        this.expansion = null;
        this.expand(route);
        continue;
      }
      const source = this.options.source;
      if (this.roots === null) {
        if (this.limitBeforePull()) continue;
        this.call(
          'roots',
          () => source.roots.call(source.receiver),
          (value) => {
            this.roots = makeCursor(value);
          },
        );
      } else if (
        !this.roots.done &&
        (this.options.strategy === 'breadthFirst' || this.frontier.size === 0)
      ) {
        if (this.limitBeforePull()) continue;
        const roots = this.roots;
        this.counts.steps++;
        this.call(
          'rootNext',
          () => pullCursor(roots),
          (value) => {
            const step = readStep(value);
            if (step.done) roots.done = true;
            else {
              const target = this.cache.copyTarget(step.value);
              if (!this.rootIds.has(target.vertexId)) {
                this.rootIds.add(target.vertexId);
                this.admit({ target, parent: null, via: null });
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
            'outgoing',
            () => source.outgoing.call(source.receiver, { ...route.vertex }),
            (value) => {
              entries.cursor = makeCursor(value);
            },
          );
        } else if (entries.cursor.done) {
          this.frontier.remove();
        } else {
          if (this.limitBeforePull()) continue;
          const cursor = entries.cursor;
          this.counts.steps++;
          this.call(
            'edgeNext',
            () => pullCursor(cursor),
            (value) => {
              const step = readStep(value);
              if (step.done) cursor.done = true;
              else {
                const link = this.cache.copyLink(step.value);
                const index = frame.index++;
                entries.links.push(link);
                this.counts.observedLinks++;
                this.follow({
                  target: link.target,
                  parent: route,
                  via: {
                    from: route.vertex.vertexId,
                    index,
                    to: link.target.vertexId,
                    data: link.data,
                  },
                });
              }
            },
          );
        }
      } else {
        this.finish();
      }
    }
  }
  summary(): GraphWalkSummary {
    return {
      status: this.status,
      counts: { ...this.counts, observations: { ...this.counts.observations } },
      outcome:
        this.outcome === null
          ? null
          : this.outcome.kind === 'limited'
          ? { ...this.outcome, reasons: [...this.outcome.reasons] }
          : { ...this.outcome },
    };
  }
  inspect(): GraphWalkInspection {
    const execution = normalizeTraversalExecutionOptions(
      phases,
      undefined,
      this.execution,
    );
    Object.freeze(execution.emitPhases);
    Object.freeze(execution.iterateOver);
    if (execution.enableVisitorFunctionsFor !== null)
      Object.freeze(execution.enableVisitorFunctionsFor);
    if (execution.disableVisitorFunctionsFor !== null)
      Object.freeze(execution.disableVisitorFunctionsFor);
    if (execution.visitorPhases !== 'all') {
      if ('include' in execution.visitorPhases)
        Object.freeze(execution.visitorPhases.include);
      else Object.freeze(execution.visitorPhases.exclude);
      Object.freeze(execution.visitorPhases);
    }
    const counts = this.summary().counts;
    Object.freeze(counts.observations);
    let openSourceIteratorCount =
      this.roots !== null && this.roots.iterator !== null && !this.roots.done
        ? 1
        : 0;
    for (const { cursor } of this.cache.adjacency.values()) {
      if (cursor !== null && cursor.iterator !== null && !cursor.done)
        openSourceIteratorCount++;
    }
    return Object.freeze({
      kind: 'graph-walk',
      sourceMode: 'graph',
      concurrency: 1,
      status: this.status,
      stopReason: this.getStopReason(),
      haltRequested: this.haltRequested,
      execution: 'sync',
      strategy: this.options.strategy,
      revisit: this.options.revisit,
      iterableConfig: Object.freeze(execution),
      counts: Object.freeze(counts),
      frontierSize: this.frontier.size,
      openSourceIteratorCount,
      pendingObservationKinds: Object.freeze(
        this.observations.map((item) => item.phase),
      ),
      activeVisitor:
        this.chain === null
          ? null
          : Object.freeze({
              phase: this.chain.phase,
              position: this.chain.position,
            }),
      pendingRequests: Object.freeze(
        this.request === null
          ? []
          : [
              Object.freeze({
                requestId: this.request.requestId,
                operation: this.request.operation,
              }),
            ],
      ),
      inFlightCallbackCount:
        this.request !== null && this.request.issued ? 1 : 0,
      bufferedEventCount: this.observations.length,
    });
  }
}
