import type { NoInferPhase } from '@core/TraversalVisitor';
import { normalizeVisitorOptions } from '@core/visitors/normalizeVisitorOptions';
import { sortVisitorRecords } from '@core/executeVisitors';
import { Traversal } from '@core/Traversal';
import type {
  TraversalVisitor,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
} from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { initBreadthFirstVisitors } from './init-helpers/initVisitors';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeBreadthFirstTraversalInstanceConfigs,
  type BreadthFirstTraversalInstanceConfig,
  type BreadthFirstTraversalInstanceConfigInput,
} from './lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTraversalOrder } from './lib/BreadthFirstTraversalOrder';
import { BreadthFirstTraversalRunner } from './lib/BreadthFirstTraversalRunner';
import type { BreadthFirstTraversalVisitors } from './lib/BreadthFirstTraversalVisitors';

export class BreadthFirstTraversal<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> extends Traversal<BreadthFirstTraversalOrder, TTP, RW_TTP> {
  icfg: BreadthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  visitors: BreadthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(
    icfgInput: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ) {
    super();
    this.icfg = mergeBreadthFirstTraversalInstanceConfigs(
      BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as BreadthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = initBreadthFirstVisitors(this.icfg);
  }

  configure(
    icfgInput: BreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ): this {
    this.icfg = mergeBreadthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initBreadthFirstVisitors(this.icfg);
    return this;
  }

  // VIEW permits pre-typed callbacks whose input covers more phases. Both result
  // contracts remain enforced; only the order argument determines allowed commands.
  addVisitorFor<
    ORDER extends BreadthFirstTraversalOrder,
    VIEW extends string = ORDER,
  >(
    order: ORDER & ([NoInferPhase<ORDER>] extends [VIEW] ? unknown : never),
    visitor: (
      vertex: Parameters<TraversalVisitor<VIEW, TTP, RW_TTP>>[0],
      input: Parameters<TraversalVisitor<VIEW, TTP, RW_TTP>>[1],
    ) => ReturnType<TraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>> &
      ReturnType<TraversalVisitor<NoInferPhase<VIEW>, TTP, RW_TTP>>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    const effectiveOptions = normalizeVisitorOptions(options);
    const records = this.visitors[order as ORDER] as TraversalVisitorRecord<
      ORDER,
      TTP,
      RW_TTP
    >[];
    records.push({
      addedIndex:
        records.reduce((max, record) => Math.max(max, record.addedIndex), -1) +
        1,
      ...effectiveOptions,
      visitor: visitor as unknown as TraversalVisitor<ORDER, TTP, RW_TTP>,
    });
    (
      this.visitors as Record<
        ORDER,
        TraversalVisitorRecord<ORDER, TTP, RW_TTP>[]
      >
    )[order] = sortVisitorRecords(records);
    return this;
  }

  listVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
  ): TraversalVisitorRecord<ORDER, TTP, RW_TTP>[] {
    return this.visitors[order as ORDER] as TraversalVisitorRecord<
      ORDER,
      TTP,
      RW_TTP
    >[];
  }

  setVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    visitorRecords: TraversalVisitorRecord<NoInferPhase<ORDER>, TTP, RW_TTP>[],
  ): this {
    (
      this.visitors as Record<
        ORDER,
        TraversalVisitorRecord<ORDER, TTP, RW_TTP>[]
      >
    )[order] = sortVisitorRecords(visitorRecords);
    return this;
  }

  makeRunner(): BreadthFirstTraversalRunner<TTP, RW_TTP> {
    return new BreadthFirstTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
