import { assertPublicOptions } from '@core/assertPublicOptions';
import type { AsyncTreeVisitor } from '@core/AsyncTraversalVisitor';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type {
  NoInferPhase,
  TraversalVisitorFunctionOptions,
  VisitorGroupDefinition,
  VisitorPhaseInput,
} from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import {
  appendVisitorDefinition,
  appendVisitorGroup,
  copyVisitorRecords,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import {
  ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncBreadthFirstTraversalInstanceConfigs,
  type AsyncBreadthFirstTraversalVisitors,
  type AsyncBreadthFirstTreeOptions,
  type AsyncBreadthFirstTreeOptionsPatch,
  type AsyncBreadthFirstTreeResolvedOptions,
} from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import {
  InternalAsyncBreadthFirstTreeRunner,
  type AsyncBreadthFirstTreeRunner,
} from './lib/AsyncBreadthFirstTraversalRunner';
import type { BreadthFirstPhase } from './lib/BreadthFirstTraversalOrder';

export class AsyncBreadthFirstTreeTraversal<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> {
  private icfg: AsyncBreadthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private visitors: AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(icfgInput: AsyncBreadthFirstTreeOptions<TTP, RW_TTP>) {
    assertPublicOptions(icfgInput, false);
    this.icfg = mergeAsyncBreadthFirstTraversalInstanceConfigs(
      ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncBreadthFirstTreeResolvedOptions<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
  }

  configure(icfgInput: AsyncBreadthFirstTreeOptionsPatch<TTP, RW_TTP>): this {
    assertPublicOptions(icfgInput, false);
    this.icfg = mergeAsyncBreadthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
    return this;
  }

  addVisitorFor<Phase extends BreadthFirstPhase>(
    phase: Phase,
    visitor: AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<AsyncTreeVisitor<Phase, TTP, RW_TTP>>[]
      >
    )[phase] = appendVisitorDefinition<AsyncTreeVisitor<Phase, TTP, RW_TTP>>(
      this.visitors[phase] as VisitorRecord<
        AsyncTreeVisitor<Phase, TTP, RW_TTP>
      >[],
      { visitor, ...options },
    );
    return this;
  }

  addVisitorGroupFor<Phase extends BreadthFirstPhase>(
    phase: Phase,
    group: VisitorGroupDefinition<
      AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>
    >,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<AsyncTreeVisitor<Phase, TTP, RW_TTP>>[]
      >
    )[phase] = appendVisitorGroup<AsyncTreeVisitor<Phase, TTP, RW_TTP>>(
      this.visitors[phase] as VisitorRecord<
        AsyncTreeVisitor<Phase, TTP, RW_TTP>
      >[],
      group,
    );
    return this;
  }

  listVisitorsFor<Phase extends BreadthFirstPhase>(
    phase: Phase,
  ): AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  setVisitorsFor<Phase extends BreadthFirstPhase>(
    phase: Phase,
    input: VisitorPhaseInput<
      AsyncTreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>
    >,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<AsyncTreeVisitor<Phase, TTP, RW_TTP>>[]
      >
    )[phase] =
      normalizeVisitorDefinitions<AsyncTreeVisitor<Phase, TTP, RW_TTP>>(input);
    return this;
  }

  createRunner(): AsyncBreadthFirstTreeRunner<TTP, RW_TTP> {
    return new InternalAsyncBreadthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }

  private initVisitors(
    visitors: AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>,
  ): AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP> {
    return Object.fromEntries(
      Object.entries(visitors).map(([phase, records]) => [
        phase,
        sortVisitorRecords(records),
      ]),
    ) as AsyncBreadthFirstTraversalVisitors<TTP, RW_TTP>;
  }
}
