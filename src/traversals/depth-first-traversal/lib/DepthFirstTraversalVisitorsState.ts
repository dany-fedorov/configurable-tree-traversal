import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TreeVisitorContext } from '@core/TraversalVisitor';

export type DepthFirstTraversalVisitorsState<
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> = {
  [K in DepthFirstPhase]: Pick<
    TreeVisitorContext<DepthFirstPhase, TTP, RW_TTP>,
    'phaseVisitIndex' | 'visitorIndex'
  > & {
    previousPhaseVertexRef:
      | import('@core/graph/types').VertexRef<TTP | RW_TTP>
      | null;
  };
};
