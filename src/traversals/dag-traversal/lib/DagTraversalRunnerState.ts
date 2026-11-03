import type { MutableValueReference } from '@core/CTTRef';
import type { TreeOrDagVisitorPhase } from '@core/effects/types';
import type { VisitorExecutionState } from '@core/executeVisitors';
import type { InternalVertexRef } from '@core/graph/types';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { copyDagTerminalObservation } from './DagTerminalObservation';
import { DagVisitorPhase } from './DagTraversalOrder';

export type DagTraversalVisitorsState<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
> = {
  [K in DagVisitorPhase]: VisitorExecutionState<SourceVertexTypes>;
};

function initVisitorsState<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
>(): DagTraversalVisitorsState<SourceVertexTypes> {
  return {
    [DagVisitorPhase.ON_WORK_READY]: {
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
    },
    [DagVisitorPhase.ON_SUBGRAPH_COMPLETION_READY]: {
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
    },
  };
}

export class DagTraversalRunnerState<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
> {
  status: TraversalRunnerStatus;
  traversalRootVertexRef: MutableValueReference<
    Vertex<SourceVertexTypes | RewrittenVertexTypes>
  > | null;
  subtreeTraversalDisabledRefs: Set<
    MutableValueReference<Vertex<SourceVertexTypes | RewrittenVertexTypes>>
  >;
  visitorsState: Partial<
    Record<
      TreeOrDagVisitorPhase,
      VisitorExecutionState<SourceVertexTypes | RewrittenVertexTypes>
    >
  >;
  dependencyEligiblePhaseVisits: Array<{
    vertexHandle: InternalVertexRef<SourceVertexTypes | RewrittenVertexTypes>;
    order: DagVisitorPhase;
  }>;
  expansionQueue: InternalVertexRef<SourceVertexTypes | RewrittenVertexTypes>[];
  failure: { error: unknown } | null;

  constructor(
    from?: Partial<
      DagTraversalRunnerState<SourceVertexTypes, RewrittenVertexTypes>
    > | null,
  ) {
    this.status = from?.status ?? TraversalRunnerStatus.NOT_STARTED;
    this.traversalRootVertexRef = from?.traversalRootVertexRef ?? null;
    this.subtreeTraversalDisabledRefs =
      from?.subtreeTraversalDisabledRefs ?? new Set();
    this.visitorsState =
      from?.visitorsState ??
      initVisitorsState<SourceVertexTypes | RewrittenVertexTypes>();
    this.dependencyEligiblePhaseVisits =
      from?.dependencyEligiblePhaseVisits ?? [];
    this.expansionQueue = from?.expansionQueue ?? [];
    this.failure = from?.failure ?? null;
    copyDagTerminalObservation(from, this);
  }
}
