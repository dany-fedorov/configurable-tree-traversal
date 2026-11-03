import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import type { TreeVisitorContext } from '@core/TraversalVisitor';

export type DepthFirstTraversalVisitorsState<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  [K in DepthFirstTreeVisitPhase]: Pick<
    TreeVisitorContext<
      DepthFirstTreeVisitPhase,
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
