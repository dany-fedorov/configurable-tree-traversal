import type { TreeVisitorContext } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstPhase } from './BreadthFirstTraversalOrder';

export type BreadthFirstTraversalVisitorsState<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> = {
  [K in BreadthFirstPhase]: Pick<
    TreeVisitorContext<BreadthFirstPhase, TTP, RW_TTP>,
    | 'phaseVisitIndex'
    | 'visitorIndex'
    | 'previousPhaseVertexRef'
  >;
};
