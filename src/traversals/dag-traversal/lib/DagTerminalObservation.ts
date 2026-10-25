import type { DagInspectionState } from '@core/graph/types';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { DagSummary } from './DagProgress';

type ObservationSource = {
  inspectDagState(): DagInspectionState;
  summary(): DagSummary;
};

// An enumerable private symbol preserves ordinary structural state copies while
// staying out of JSON. This is observation metadata, not executable continuation
// state or a serialized checkpoint; it retains no kernel or callbacks.
const observationKey = Symbol('DAG terminal observation');
type ObservedState = { [observationKey]?: DagTerminalObservation };
const observations = new WeakMap<object, DagTerminalObservation | undefined>();

function readObservation(state: object): DagTerminalObservation | undefined {
  return observations.get(state) ?? (state as ObservedState)[observationKey];
}

function retainObservation(
  state: object,
  observation: DagTerminalObservation | undefined,
): void {
  // Caller-owned state may be sealed or have an immutable metadata descriptor.
  // Always retain facts independently, and only write a permitted symbol value.
  observations.set(state, observation);
  const descriptor = Object.getOwnPropertyDescriptor(state, observationKey);
  if (descriptor === undefined) {
    if (Object.isExtensible(state)) {
      Object.defineProperty(state, observationKey, {
        value: observation,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  } else if (descriptor.writable === true) {
    Object.defineProperty(state, observationKey, { value: observation });
  }
}

export function copyDagTerminalObservation(
  from: object | null | undefined,
  to: object,
): void {
  // Reserve a writable slot before callers can seal a class instance. The slot
  // also lets later object spread/Object.assign copies retain terminal facts.
  retainObservation(to, from == null ? undefined : readObservation(from));
}

function unavailableObservation(): never {
  throw new Error(
    'Terminal DAG observation facts are unavailable: retain the original runner state or a structural copy of it',
  );
}
const unavailable: ObservationSource = {
  inspectDagState: unavailableObservation,
  summary: unavailableObservation,
};

export function getDagTerminalObservation(
  state: { status: TraversalRunnerStatus },
  hasVertices: boolean,
): ObservationSource | undefined {
  if (
    state.status !== TraversalRunnerStatus.FINISHED &&
    state.status !== TraversalRunnerStatus.FAILED
  )
    return undefined;
  const observation = readObservation(state);
  return observation ?? (hasVertices ? unavailable : undefined);
}

export function captureDagTerminalObservation(
  state: { status: TraversalRunnerStatus },
  source: ObservationSource,
): void {
  if (
    state.status === TraversalRunnerStatus.FINISHED ||
    state.status === TraversalRunnerStatus.FAILED
  ) {
    retainObservation(state, new DagTerminalObservation(source));
  }
}

class DagTerminalObservation implements ObservationSource {
  private readonly state: DagInspectionState;
  private readonly progress: DagSummary;

  constructor(source: ObservationSource) {
    this.state = source.inspectDagState();
    this.progress = source.summary();
  }

  inspectDagState(): DagInspectionState {
    return {
      identityStates: this.state.identityStates.map((item) => ({ ...item })),
      schedulingStates: this.state.schedulingStates.map((item) => ({
        ...item,
      })),
      discoveryComplete: this.state.discoveryComplete,
    };
  }

  summary(): DagSummary {
    const summary = this.progress;
    const diagnostics = summary.diagnostics;
    return {
      discovery: { ...summary.discovery },
      counts: { ...summary.counts },
      vertices: new Map(
        Array.from(summary.vertices, ([id, progress]) => [
          id,
          {
            ...progress,
            unmetPrerequisiteIds: progress.unmetPrerequisiteIds.slice(),
            unmetWorkPrerequisiteIds:
              progress.unmetWorkPrerequisiteIds!.slice(),
            ...(progress.unmetCompletePrerequisiteIds === undefined
              ? {}
              : {
                  unmetCompletePrerequisiteIds:
                    progress.unmetCompletePrerequisiteIds.slice(),
                }),
          },
        ]),
      ),
      readyIds: summary.readyIds.slice(),
      deferredIds: summary.deferredIds.slice(),
      deferredFrontier: summary.deferredFrontier.map((item) => ({ ...item })),
      inFlightIds: summary.inFlightIds.slice(),
      completedWorkIds: summary.completedWorkIds.slice(),
      completedSubtreeIds: summary.completedSubtreeIds.slice(),
      unusedCompletedWorkIds: summary.unusedCompletedWorkIds.slice(),
      diagnostics:
        diagnostics === null
          ? null
          : {
              dependencies: diagnostics.dependencies.map(({ id, unmet }) => ({
                id,
                unmet: unmet.slice(),
              })),
              unknownPrerequisiteIds:
                diagnostics.unknownPrerequisiteIds.slice(),
              dependencyCycles: diagnostics.dependencyCycles.map((ids) =>
                ids.slice(),
              ),
              dependencyEdges: diagnostics.dependencyEdges.map((edge) => ({
                from: { ...edge.from },
                to: { ...edge.to },
                reason: edge.reason,
              })),
              dependencyBlockedIds: diagnostics.dependencyBlockedIds.slice(),
              structurallyIncompleteIds:
                diagnostics.structurallyIncompleteIds.slice(),
            },
    };
  }
}
