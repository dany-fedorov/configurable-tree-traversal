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
import type { VertexTypes } from '@core/TreeTypeParameters';
import { TreeTraversal } from '@core/Traversal';
import type {
  DepthFirstTraversalInstanceConfig,
  DepthFirstTraversalInstanceConfigInput,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type {
  TraversalVisitor,
  TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';
import { initVisitors } from '@depth-first-traversal/init-helpers/initVisitors';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstTreeRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';

export class DepthFirstTreeTraversal<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> extends TreeTraversal<DepthFirstPhase, TTP, RW_TTP> {
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>;

  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>) {
    super();
    this.icfg = mergeInstanceConfigs(
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
  }

  configure(
    icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ): this {
    this.icfg = mergeInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
    return this;
  }

  addVisitorFor<ORDER extends DepthFirstPhase>(
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

  addVisitorGroupFor<ORDER extends DepthFirstPhase>(
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

  listVisitorsFor<ORDER extends DepthFirstPhase>(
    order: ORDER,
  ): DepthFirstTraversalVisitors<TTP, RW_TTP>[ORDER] {
    return copyVisitorRecords(this.visitors[order]);
  }

  setVisitorsFor<ORDER extends DepthFirstPhase>(
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

  createRunner() {
    return new DepthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
