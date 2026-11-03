import type { DepthFirstTreeVisitPhase } from './DepthFirstTraversalOrder';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { TreePhaseVisitorRegistrationRecord } from '@core/TraversalVisitor';

export type DepthFirstTreeVisitorRegistrationsByPhase<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
> = {
  [K in DepthFirstTreeVisitPhase]: TreePhaseVisitorRegistrationRecord<
    K,
    InputVertexTypes,
    RewrittenVertexTypes
  >[];
};
