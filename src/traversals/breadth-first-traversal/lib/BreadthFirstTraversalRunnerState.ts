import type { MutableValueReference } from '@core/CTTRef';
import type { InternalChildDiscoveryContext } from '@core/ResolvedTree';
import { TraversalRunnerStatus } from '@core/TraversalRunner';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import { BreadthFirstTreeVisitPhase } from './BreadthFirstTraversalOrder';
import type { BreadthFirstTraversalVisitorsState } from './BreadthFirstTraversalVisitorsState';

export function initBreadthFirstVisitorsState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
>(): BreadthFirstTraversalVisitorsState<
  InputVertexTypes,
  RewrittenVertexTypes
> {
  return {
    [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: {
      phaseVisitorChainIndex: 0,
      visitorCallbackIndexInPhaseChain: 0,
      previousCommittedVisitVertexHandleForSamePhase: null,
    },
  };
}

export class BreadthFirstTraversalRunnerState<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  queue: InternalChildDiscoveryContext<
    InputVertexTypes | RewrittenVertexTypes
  >[];
  queueIndex: number;
  visitorsState: BreadthFirstTraversalVisitorsState<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  traversalRootVertexRef: MutableValueReference<
    Vertex<InputVertexTypes | RewrittenVertexTypes>
  > | null;
  status: TraversalRunnerStatus;
  subtreeTraversalDisabledRefs: Set<
    MutableValueReference<Vertex<InputVertexTypes | RewrittenVertexTypes>>
  >;

  constructor(
    from?: Partial<
      BreadthFirstTraversalRunnerState<InputVertexTypes, RewrittenVertexTypes>
    > | null,
  ) {
    this.queue = from?.queue ?? [];
    this.queueIndex = from?.queueIndex ?? 0;
    this.visitorsState = from?.visitorsState ?? initBreadthFirstVisitorsState();
    this.traversalRootVertexRef = from?.traversalRootVertexRef ?? null;
    this.status = from?.status ?? TraversalRunnerStatus.NOT_STARTED;
    this.subtreeTraversalDisabledRefs =
      from?.subtreeTraversalDisabledRefs ?? new Set();
  }
}
