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

function retainObservation(
  state: object,
  observation: DagTerminalObservation,
): void {
  Object.defineProperty(state, observationKey, {
    value: observation,
    enumerable: true,
    configurable: true,
  });
}

export function copyDagTerminalObservation(from: object, to: object): void {
  const observation = (from as ObservedState)[observationKey];
  if (observation !== undefined) retainObservation(to, observation);
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
  const observation = (state as ObservedState)[observationKey];
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
