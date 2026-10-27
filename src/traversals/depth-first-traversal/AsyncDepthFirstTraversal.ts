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
  ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTraversalVisitors,
  type AsyncDepthFirstTreeOptions,
  type AsyncDepthFirstTreeOptionsPatch,
  type AsyncDepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import {
  InternalAsyncDepthFirstTreeRunner,
  type AsyncDepthFirstTreeRunner,
} from '@depth-first-traversal/lib/AsyncDepthFirstTraversalRunner';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export class AsyncDepthFirstTreeTraversal<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> {
  private icfg: AsyncDepthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(icfgInput: AsyncDepthFirstTreeOptions<TTP, RW_TTP>) {
    assertPublicOptions(icfgInput, false);
    this.icfg = mergeAsyncDepthFirstTraversalInstanceConfigs(
      ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDepthFirstTreeResolvedOptions<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
  }

  configure(icfgInput: AsyncDepthFirstTreeOptionsPatch<TTP, RW_TTP>): this {
    assertPublicOptions(icfgInput, false);
    this.icfg = mergeAsyncDepthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
    return this;
  }

  addVisitorFor<Phase extends DepthFirstPhase>(
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

  addVisitorGroupFor<Phase extends DepthFirstPhase>(
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

  listVisitorsFor<Phase extends DepthFirstPhase>(
    phase: Phase,
  ): AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  setVisitorsFor<Phase extends DepthFirstPhase>(
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

  createRunner(): AsyncDepthFirstTreeRunner<TTP, RW_TTP> {
    return new InternalAsyncDepthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }

  private initVisitors(
    visitors: AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>,
  ): AsyncDepthFirstTraversalVisitors<TTP, RW_TTP> {
    return Object.fromEntries(
      Object.entries(visitors).map(([phase, records]) => [
        phase,
        sortVisitorRecords(records),
      ]),
    ) as AsyncDepthFirstTraversalVisitors<TTP, RW_TTP>;
  }
}
