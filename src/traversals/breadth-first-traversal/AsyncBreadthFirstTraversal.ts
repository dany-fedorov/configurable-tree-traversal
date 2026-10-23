import type { NoInferPhase } from '@core/TraversalVisitor';
import { normalizeVisitorOptions } from '@core/visitors/normalizeVisitorOptions';
import type { AsyncTraversalVisitor } from '@core/AsyncTraversalVisitor';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalVisitorFunctionOptions } from '@core/TraversalVisitor';
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

  // VIEW permits pre-typed callbacks whose input covers more phases. Both result
  // contracts remain enforced; only the order argument determines allowed commands.
  addVisitorFor<
    ORDER extends BreadthFirstTraversalOrder,
    VIEW extends string = ORDER,
  >(
    order: ORDER & ([NoInferPhase<ORDER>] extends [VIEW] ? unknown : never),
    visitor: (
      vertex: Parameters<AsyncTraversalVisitor<VIEW, TTP, RW_TTP>>[0],
      input: Parameters<AsyncTraversalVisitor<VIEW, TTP, RW_TTP>>[1],
    ) => ReturnType<AsyncTraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>> &
      ReturnType<AsyncTraversalVisitor<NoInferPhase<VIEW>, TTP, RW_TTP>>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    const effectiveOptions = normalizeVisitorOptions(options);
    const records = this.visitors[order as ORDER] as VisitorRecord<
      AsyncTraversalVisitor<ORDER, TTP, RW_TTP>
    >[];
    records.push({
      addedIndex:
        records.reduce((max, record) => Math.max(max, record.addedIndex), -1) +
        1,
      ...effectiveOptions,
      visitor: visitor as unknown as AsyncTraversalVisitor<ORDER, TTP, RW_TTP>,
    });
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] = sortVisitorRecords(records);
    return this;
  }

  listVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
  ): VisitorRecord<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>[] {
    return this.visitors[order as ORDER] as VisitorRecord<
      AsyncTraversalVisitor<ORDER, TTP, RW_TTP>
    >[];
  }

  setVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    visitorRecords: VisitorRecord<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>[],
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] = sortVisitorRecords(visitorRecords);
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
