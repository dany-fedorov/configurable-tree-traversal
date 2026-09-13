import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  DEFAULT_VISITOR_FN_OPTIONS,
  type TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';
import {
  ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncBreadthFirstTraversalInstanceConfigs,
  type AsyncBreadthFirstTraversalInstanceConfig,
  type AsyncBreadthFirstTraversalInstanceConfigInput,
  type AsyncBreadthFirstTraversalVisitors,
} from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import { AsyncBreadthFirstTraversalRunner } from './lib/AsyncBreadthFirstTraversalRunner';
import type { BreadthFirstTraversalOrder } from './lib/BreadthFirstTraversalOrder';

export class AsyncBreadthFirstTraversal<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> {
  icfg: AsyncBreadthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  visitors: AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(
    icfgInput: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ) {
    this.icfg = mergeAsyncBreadthFirstTraversalInstanceConfigs(
      ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncBreadthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
  }

  configure(
    icfgInput: AsyncBreadthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ): this {
    this.icfg = mergeAsyncBreadthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
    return this;
  }

  addVisitorFor(
    order: BreadthFirstTraversalOrder,
    visitor: AsyncTraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP>,
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
  ): VisitorRecord<
    AsyncTraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP>
  >[] {
    return this.visitors[order];
  }

  setVisitorsFor(
    order: BreadthFirstTraversalOrder,
    visitorRecords: VisitorRecord<
      AsyncTraversalVisitor<BreadthFirstTraversalOrder, TTP, RW_TTP>
    >[],
  ): this {
    this.visitors[order] = sortVisitorRecords(visitorRecords);
    return this;
  }

  makeRunner(): AsyncBreadthFirstTraversalRunner<TTP, RW_TTP> {
    return new AsyncBreadthFirstTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }

  private initVisitors(
    visitors: AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>,
  ): AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP> {
    return Object.fromEntries(
      Object.entries(visitors).map(([order, records]) => [
        order,
        sortVisitorRecords(records),
      ]),
    ) as AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>;
  }
}
