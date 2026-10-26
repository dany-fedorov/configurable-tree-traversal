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
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { TraversalVisitorFunctionOptions } from '@core/TraversalVisitor';
import {
  ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTraversalInstanceConfig,
  type AsyncDepthFirstTraversalInstanceConfigInput,
  type AsyncDepthFirstTraversalVisitors,
} from '@depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import { AsyncDepthFirstTreeRunner } from '@depth-first-traversal/lib/AsyncDepthFirstTraversalRunner';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export class AsyncDepthFirstTreeTraversal<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
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

  addVisitorFor<ORDER extends DepthFirstTraversalOrder>(
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

  addVisitorGroupFor<ORDER extends DepthFirstTraversalOrder>(
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

  listVisitorsFor<ORDER extends DepthFirstTraversalOrder>(
    order: ORDER,
  ): AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>[ORDER] {
    return copyVisitorRecords(this.visitors[order]);
  }

  setVisitorsFor<ORDER extends DepthFirstTraversalOrder>(
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

  createRunner(): AsyncDepthFirstTreeRunner<TTP, RW_TTP> {
    return new AsyncDepthFirstTreeRunner({
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
