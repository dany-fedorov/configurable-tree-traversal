import type { DagInspectionState } from '@core/graph/types';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { DagProgressSnapshot } from './DagProgress';

type ObservationSource = {
  inspectDagState(): DagInspectionState;
  captureProgressSnapshot(): DagProgressSnapshot;
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
  captureProgressSnapshot: unavailableObservation,
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
  private readonly progress: DagProgressSnapshot;

  constructor(source: ObservationSource) {
    this.state = source.inspectDagState();
    this.progress = source.captureProgressSnapshot();
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

  captureProgressSnapshot(): DagProgressSnapshot {
    const captureProgressSnapshot = this.progress;
    const invalidDependencyTopologyDiagnostics =
      captureProgressSnapshot.invalidDependencyTopologyDiagnostics;
    return {
      discovery: { ...captureProgressSnapshot.discovery },
      counts: { ...captureProgressSnapshot.counts },
      progressByVertexId: new Map(
        Array.from(
          captureProgressSnapshot.progressByVertexId,
          ([id, progress]) => [
            id,
            {
              ...progress,
              unmetPrerequisiteVertexIds:
                progress.unmetPrerequisiteVertexIds.slice(),
              unmetWorkMilestoneVertexIds:
                progress.unmetWorkMilestoneVertexIds.slice(),
              unmetSubgraphCompletionMilestoneVertexIds:
                progress.unmetSubgraphCompletionMilestoneVertexIds.slice(),
            },
          ],
        ),
      ),
      workVisitorReadyOrWorkCompletionDeferredVertexIds:
        captureProgressSnapshot.workVisitorReadyOrWorkCompletionDeferredVertexIds.slice(),
      workCompletionDeferredVertexIds:
        captureProgressSnapshot.workCompletionDeferredVertexIds.slice(),
      workAwaitingSettlement:
        captureProgressSnapshot.workAwaitingSettlement.map((item) => ({
          ...item,
        })),
      admittedVisitorChainVertexIds:
        captureProgressSnapshot.admittedVisitorChainVertexIds.slice(),
      workCompletionCommittedVertexIds:
        captureProgressSnapshot.workCompletionCommittedVertexIds.slice(),
      subgraphCompletionCommittedVertexIds:
        captureProgressSnapshot.subgraphCompletionCommittedVertexIds.slice(),
      unmatchedCompletedWorkSeedVertexIds:
        captureProgressSnapshot.unmatchedCompletedWorkSeedVertexIds.slice(),
      invalidDependencyTopologyDiagnostics:
        invalidDependencyTopologyDiagnostics === null
          ? null
          : {
              blockedVertexPrerequisiteReports:
                invalidDependencyTopologyDiagnostics.blockedVertexPrerequisiteReports.map(
                  ({ vertexId, unmetPrerequisiteVertexIds }) => ({
                    vertexId,
                    unmetPrerequisiteVertexIds:
                      unmetPrerequisiteVertexIds.slice(),
                  }),
                ),
              unresolvedPrerequisiteVertexIds:
                invalidDependencyTopologyDiagnostics.unresolvedPrerequisiteVertexIds.slice(),
              milestoneCycleVertexIdComponents:
                invalidDependencyTopologyDiagnostics.milestoneCycleVertexIdComponents.map(
                  (ids) => ids.slice(),
                ),
              originalMilestoneConstraints:
                invalidDependencyTopologyDiagnostics.originalMilestoneConstraints.map(
                  (edge) => ({
                    waitingMilestone: { ...edge.waitingMilestone },
                    prerequisiteMilestone: { ...edge.prerequisiteMilestone },
                    reason: edge.reason,
                  }),
                ),
              nonCyclePrerequisiteBlockedVertexIds:
                invalidDependencyTopologyDiagnostics.nonCyclePrerequisiteBlockedVertexIds.slice(),
              incompleteVertexIdsWithoutUnmetPrerequisites:
                invalidDependencyTopologyDiagnostics.incompleteVertexIdsWithoutUnmetPrerequisites.slice(),
            },
    };
  }
}
