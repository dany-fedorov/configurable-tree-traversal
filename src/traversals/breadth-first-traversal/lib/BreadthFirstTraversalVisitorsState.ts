import type { TreeVisitorContext } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstTreeVisitPhase } from './BreadthFirstTraversalOrder';

export type BreadthFirstTraversalVisitorsState<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  [K in BreadthFirstTreeVisitPhase]: Pick<
    TreeVisitorContext<
      BreadthFirstTreeVisitPhase,
      InputVertexTypes,
      RewrittenVertexTypes
    >,
    'phaseVisitorChainIndex' | 'visitorCallbackIndexInPhaseChain'
  > & {
    previousCommittedVisitVertexHandleForSamePhase:
      | import('@core/graph/types').InternalVertexRef<
          InputVertexTypes | RewrittenVertexTypes
        >
      | null;
  };
};
