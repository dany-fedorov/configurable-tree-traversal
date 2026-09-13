import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  DEFAULT_VISITOR_FN_OPTIONS,
  type TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';
import {
  ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTraversalInstanceConfig,
  type AsyncDepthFirstTraversalInstanceConfigInput,
  type AsyncDepthFirstTraversalVisitors,
} from '@depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import { AsyncDepthFirstTraversalRunner } from '@depth-first-traversal/lib/AsyncDepthFirstTraversalRunner';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export class AsyncDepthFirstTraversal<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> {
  icfg: AsyncDepthFirstTraversalInstanceConfig<TTP, RW_TTP>;
  visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(
    icfgInput: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ) {
    this.icfg = mergeAsyncDepthFirstTraversalInstanceConfigs(
      ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
  }

  configure(
    icfgInput: AsyncDepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ): this {
    this.icfg = mergeAsyncDepthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
    return this;
  }

  addVisitorFor(
    order: DepthFirstTraversalOrder,
    visitor: AsyncTraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = DEFAULT_VISITOR_FN_OPTIONS,
  ): this {
    const effectiveOptions = { ...DEFAULT_VISITOR_FN_OPTIONS, ...options };
    this.visitors[order].push({
      priority: effectiveOptions.priority,
      visitor,
      addedIndex:
        this.visitors[order].reduce(
          (max, record) => Math.max(max, record.addedIndex),
          -1,
        ) + 1,
      resolutionStyle: effectiveOptions.resolutionStyle,
    });
    this.visitors[order] = sortVisitorRecords(this.visitors[order]);
    return this;
  }

  listVisitorsFor(
    order: DepthFirstTraversalOrder,
  ): VisitorRecord<
    AsyncTraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>
  >[] {
    return this.visitors[order];
  }

  setVisitorsFor(
    order: DepthFirstTraversalOrder,
    visitorRecords: VisitorRecord<
      AsyncTraversalVisitor<DepthFirstTraversalOrder, TTP, RW_TTP>
    >[],
  ): this {
    this.visitors[order] = sortVisitorRecords(visitorRecords);
    return this;
  }

  makeRunner(): AsyncDepthFirstTraversalRunner<TTP, RW_TTP> {
    return new AsyncDepthFirstTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }

  private initVisitors(
    visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>,
  ): AsyncDepthFirstTraversalVisitors<TTP, RW_TTP> {
    return Object.fromEntries(
      Object.entries(visitors).map(([order, records]) => [
        order,
        sortVisitorRecords(records),
      ]),
    ) as AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;
  }
}
