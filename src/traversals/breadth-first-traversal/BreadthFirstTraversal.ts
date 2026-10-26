import { assertPublicOptions } from '@core/assertPublicOptions';
import type { VisitorRecord } from '@core/graph/types';
import { TreeTraversal } from '@core/Traversal';
import type {
  NoInferPhase,
  TraversalVisitor,
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
import { initBreadthFirstVisitors } from './init-helpers/initVisitors';
import {
  BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeBreadthFirstTraversalInstanceConfigs,
  type BreadthFirstTreeOptions,
  type BreadthFirstTreeOptionsPatch,
  type BreadthFirstTreeResolvedOptions,
} from './lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstPhase } from './lib/BreadthFirstTraversalOrder';
import {
  InternalBreadthFirstTreeRunner,
  type BreadthFirstTreeRunner,
} from './lib/BreadthFirstTraversalRunner';
import type { BreadthFirstTraversalVisitors } from './lib/BreadthFirstTraversalVisitors';

export class BreadthFirstTreeTraversal<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> extends TreeTraversal<BreadthFirstPhase, TTP, RW_TTP> {
  private icfg: BreadthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private visitors: BreadthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(icfgInput: BreadthFirstTreeOptions<TTP, RW_TTP>) {
    super();
    assertPublicOptions(icfgInput);
    this.icfg = mergeBreadthFirstTraversalInstanceConfigs(
      BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as BreadthFirstTreeResolvedOptions<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = initBreadthFirstVisitors(this.icfg);
  }

  configure(icfgInput: BreadthFirstTreeOptionsPatch<TTP, RW_TTP>): this {
    assertPublicOptions(icfgInput);
    this.icfg = mergeBreadthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initBreadthFirstVisitors(this.icfg);
    return this;
  }

  addVisitorFor<ORDER extends BreadthFirstPhase>(
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

  addVisitorGroupFor<ORDER extends BreadthFirstPhase>(
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

  listVisitorsFor<ORDER extends BreadthFirstPhase>(
    order: ORDER,
  ): BreadthFirstTraversalVisitors<TTP, RW_TTP>[ORDER] {
    return copyVisitorRecords(this.visitors[order]);
  }

  setVisitorsFor<ORDER extends BreadthFirstPhase>(
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

  createRunner(): BreadthFirstTreeRunner<TTP, RW_TTP> {
    return new InternalBreadthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
