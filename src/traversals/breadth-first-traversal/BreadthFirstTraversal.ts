import { sortVisitorRecords } from '@core/executeVisitors';
import { Traversal } from '@core/Traversal';
import {
  DEFAULT_VISITOR_FN_OPTIONS,
  type TraversalVisitor,
  type TraversalVisitorFunctionOptions,
  type TraversalVisitorRecord,
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

  addVisitorFor(
    order: BreadthFirstTraversalOrder,
    visitor: TraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = DEFAULT_VISITOR_FN_OPTIONS,
  ): this {
    const effectiveOptions = { ...DEFAULT_VISITOR_FN_OPTIONS, ...options };
    const records = this.visitors[order];
    records.push({
      addedIndex:
        records.reduce((max, record) => Math.max(max, record.addedIndex), -1) +
        1,
      priority: effectiveOptions.priority,
      resolutionStyle: effectiveOptions.resolutionStyle,
      visitor,
    });
    this.visitors[order] = sortVisitorRecords(records);
    return this;
  }

  listVisitorsFor(
    order: BreadthFirstTraversalOrder,
  ): TraversalVisitorRecord<BreadthFirstTraversalOrder, TTP, RW_TTP>[] {
    return this.visitors[order];
  }

  setVisitorsFor(
    order: BreadthFirstTraversalOrder,
    visitorRecords: TraversalVisitorRecord<
      BreadthFirstTraversalOrder,
      TTP,
      RW_TTP
    >[],
  ): this {
    this.visitors[order] = sortVisitorRecords(visitorRecords);
    return this;
  }

  makeRunner(): BreadthFirstTraversalRunner<TTP, RW_TTP> {
    return new BreadthFirstTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
