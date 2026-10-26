import type { DagInspectionState } from '@core/graph/types';
import { dagRunnerCapabilities } from './lib/dagRunnerCapabilities';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DagWaitEdge } from '@core/errors/DagTraversalStallError';
import { dependencyMilestones } from '@core/scheduling/dependencyMilestones';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import {
  makeDagInspection,
  type DagMilestoneSnapshot,
} from './lib/DagInspection';

/** Capture synchronously without advancing discovery or acquiring iterator ownership. */
export function inspectDagMilestones<
  T extends VertexTypes,
  R extends VertexTypes,
  ID,
>(
  runner: DagTraversalRunner<T, R, ID> | AsyncDagTraversalRunner<T, R, ID>,
): DagMilestoneSnapshot<ID> {
  const capabilities = dagRunnerCapabilities.get(runner);
  if (capabilities === undefined)
    throw new TypeError(
      'Milestone inspection requires a registered DAG runner',
    );
  const state = capabilities.inspectState() as DagInspectionState<ID>;
  const summary = runner.summary();
  const graph = runner.getResolvedGraph();
  const declarations = graph.getVertexRefs().map((ref) => {
    const vertex = graph.get(ref)!;
    return {
      id: vertex.vertexId,
      work: vertex.dependsOnWork.slice(),
      complete: vertex.dependsOnSubgraphCompletion?.slice() ?? [],
      children: graph
        .getChildrenOf(ref)!
        .map((child) => graph.getVertexId(child)),
    };
  });
  const { edges } = dependencyMilestones(declarations);
  // Topology and kernel facts share this runner's established identity domain.
  return makeDagInspection({
    state,
    summary,
    edges: edges as DagWaitEdge<ID>[],
  });
}
