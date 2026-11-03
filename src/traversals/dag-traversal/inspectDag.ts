import type { DagInspectionState } from '@core/graph/types';
import { dagRunnerCapabilities } from './lib/dagRunnerCapabilities';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DagMilestoneConstraint } from '@core/errors/DagTraversalStallError';
import { dependencyMilestones } from '@core/scheduling/dependencyMilestones';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import {
  makeDagInspection,
  type DagMilestoneSnapshot,
} from './lib/DagInspection';

/** Capture synchronously without advancing discovery or acquiring iterator ownership. */
export function captureDagMilestoneSnapshot<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  runner:
    | DagTraversalRunner<SourceVertexTypes, RewrittenVertexTypes, VertexId>
    | AsyncDagTraversalRunner<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >,
): DagMilestoneSnapshot<VertexId> {
  const capabilities = dagRunnerCapabilities.get(runner);
  if (capabilities === undefined)
    throw new TypeError(
      'Milestone inspection requires a registered DAG runner',
    );
  const state = capabilities.inspectState() as DagInspectionState<VertexId>;
  const captureProgressSnapshot = runner.captureProgressSnapshot();
  const graph = runner.getLiveResolvedGraphView();
  const declarations = graph.getVertexHandles().map((ref) => {
    const vertex = graph.getVertexSnapshotOrNull(ref)!;
    return {
      id: vertex.vertexId,
      work: vertex.workWaitsForWorkOf.slice(),
      complete: vertex.workWaitsForSubgraphCompletionOf?.slice() ?? [],
      children: graph
        .getStructuralChildHandlesInSlotOrderOrNull(ref)!
        .map((child) => graph.requireVertexId(child)),
    };
  });
  const { edges } = dependencyMilestones(declarations);
  // Topology and kernel facts share this runner's established identity domain.
  return makeDagInspection({
    state,
    captureProgressSnapshot,
    edges: edges as DagMilestoneConstraint<VertexId>[],
  });
}
