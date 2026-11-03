import type { TreePhaseVisitorRegistrationRecord } from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { BreadthFirstTreeVisitPhase } from './BreadthFirstTraversalOrder';

export type BreadthFirstTreeVisitorRegistrationsByPhase<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> = {
  [K in BreadthFirstTreeVisitPhase]: TreePhaseVisitorRegistrationRecord<
    K,
    InputVertexTypes,
    RewrittenVertexTypes
  >[];
};
