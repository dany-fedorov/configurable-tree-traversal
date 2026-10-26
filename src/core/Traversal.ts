import type { VertexTypes } from '@core/TreeTypeParameters';
import type {
  TraversalVisitor,
  NoInferPhase,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
  VisitorPhaseInput,
  VisitorGroupDefinition,
} from '@core/TraversalVisitor';
import type { TreeTraversalRunner } from '@core/TraversalRunner';

/** Historical tree-only builder base; generic runner wrappers use execution capabilities. */
export abstract class TreeTraversal<
  ORDER extends string,
  TTP extends VertexTypes,
  RW_TTP extends VertexTypes,
> {
  abstract addVisitorFor<PHASE extends ORDER>(
    order: PHASE,
    visitor: TraversalVisitor<NoInferPhase<PHASE>, TTP, RW_TTP>,
    options?: Partial<TraversalVisitorFunctionOptions>,
  ): this;

  abstract addVisitorGroupFor<PHASE extends ORDER>(
    order: PHASE,
    group: VisitorGroupDefinition<
      TraversalVisitor<NoInferPhase<PHASE>, TTP, RW_TTP>
    >,
  ): this;

  abstract setVisitorsFor<PHASE extends ORDER>(
    order: PHASE,
    visitorRecords: VisitorPhaseInput<
      TraversalVisitor<NoInferPhase<PHASE>, TTP, RW_TTP>
    >,
  ): this;

  abstract listVisitorsFor<PHASE extends ORDER>(
    order: PHASE,
  ): { [P in PHASE]: TraversalVisitorRecord<P, TTP, RW_TTP>[] }[PHASE];

  abstract createRunner(): TreeTraversalRunner<ORDER, TTP, RW_TTP>;
}
