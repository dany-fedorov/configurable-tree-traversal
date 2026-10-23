import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalVisitor,
  NoInferPhase,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
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

  abstract setVisitorsFor<PHASE extends ORDER>(
    order: PHASE,
    visitorRecords: TraversalVisitorRecord<NoInferPhase<PHASE>, TTP, RW_TTP>[],
  ): this;

  abstract listVisitorsFor<PHASE extends ORDER>(
    order: PHASE,
  ): { [P in PHASE]: TraversalVisitorRecord<P, TTP, RW_TTP>[] }[PHASE];

  abstract makeRunner(): TraversalRunner<ORDER, TTP, RW_TTP>;
}
