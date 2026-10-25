import type { NoInferPhase } from '@core/TraversalVisitor';
import {
  appendVisitorDefinition,
  appendVisitorGroup,
  copyVisitorRecords,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import type {
  VisitorPhaseInput,
  VisitorGroupDefinition,
} from '@core/TraversalVisitor';
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

  addVisitorFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    visitor: AsyncTraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] = appendVisitorDefinition<
      AsyncTraversalVisitor<ORDER, TTP, RW_TTP>
    >(
      this.visitors[order] as VisitorRecord<
        AsyncTraversalVisitor<ORDER, TTP, RW_TTP>
      >[],
      { visitor, ...options },
    );
    return this;
  }

  addVisitorGroupFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    group: VisitorGroupDefinition<
      AsyncTraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>
    >,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] = appendVisitorGroup<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>(
      this.visitors[order] as VisitorRecord<
        AsyncTraversalVisitor<ORDER, TTP, RW_TTP>
      >[],
      group,
    );
    return this;
  }

  listVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
  ): AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>[ORDER] {
    return copyVisitorRecords(this.visitors[order]);
  }

  setVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    input: VisitorPhaseInput<
      AsyncTraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>
    >,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] =
      normalizeVisitorDefinitions<AsyncTraversalVisitor<ORDER, TTP, RW_TTP>>(
        input,
      );
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
