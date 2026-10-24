import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalVisitor,
  NoInferPhase,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
  VisitorPhaseInput,
  VisitorGroupDefinition,
} from '@core/TraversalVisitor';
import type { TraversalRunner } from '@core/TraversalRunner';

export abstract class Traversal<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
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

  abstract makeRunner(): TraversalRunner<ORDER, TTP, RW_TTP>;
}
