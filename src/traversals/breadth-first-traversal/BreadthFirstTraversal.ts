import type { VisitorRecord } from '@core/graph/types';
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
import { Traversal } from '@core/Traversal';
import type {
  TraversalVisitor,
  TraversalVisitorFunctionOptions,
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

  addVisitorFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    visitor: TraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<TraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] = appendVisitorDefinition<TraversalVisitor<ORDER, TTP, RW_TTP>>(
      this.visitors[order] as VisitorRecord<
        TraversalVisitor<ORDER, TTP, RW_TTP>
      >[],
      { visitor, ...options },
    );
    return this;
  }

  addVisitorGroupFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    group: VisitorGroupDefinition<
      TraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>
    >,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<TraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] = appendVisitorGroup<TraversalVisitor<ORDER, TTP, RW_TTP>>(
      this.visitors[order] as VisitorRecord<
        TraversalVisitor<ORDER, TTP, RW_TTP>
      >[],
      group,
    );
    return this;
  }

  listVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
  ): BreadthFirstTraversalVisitors<TTP, RW_TTP>[ORDER] {
    return copyVisitorRecords(this.visitors[order]);
  }

  setVisitorsFor<ORDER extends BreadthFirstTraversalOrder>(
    order: ORDER,
    input: VisitorPhaseInput<
      TraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>
    >,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<TraversalVisitor<ORDER, TTP, RW_TTP>>[]
      >
    )[order] =
      normalizeVisitorDefinitions<TraversalVisitor<ORDER, TTP, RW_TTP>>(input);
    return this;
  }

  makeRunner(): BreadthFirstTraversalRunner<TTP, RW_TTP> {
    return new BreadthFirstTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
