import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalVisitor,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
} from '@core/TraversalVisitor';
import type { TraversalRunner } from '@core/TraversalRunner';

export abstract class Traversal<
  ORDER extends string,
  TTP extends TreeTypeParameters,
  RW_TTP extends TreeTypeParameters,
> {
  abstract addVisitorFor(
    order: ORDER,
    visitor: TraversalVisitor<ORDER, TTP, RW_TTP>,
    options?: TraversalVisitorFunctionOptions,
  ): this;

  abstract setVisitorsFor(
    order: ORDER,
    visitorRecords: TraversalVisitorRecord<ORDER, TTP, RW_TTP>[],
  ): this;

  abstract listVisitorsFor(
    order: ORDER,
  ): TraversalVisitorRecord<ORDER, TTP, RW_TTP>[];

  abstract makeRunner(): TraversalRunner<ORDER, TTP, RW_TTP>;
}
