import { assertPublicOptions } from '@core/assertPublicOptions';
import type { VisitorRecord } from '@core/graph/types';
import type {
  NoInferPhase,
  TreeVisitor,
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
import { initVisitors } from '@depth-first-traversal/init-helpers/initVisitors';
import type {
  DepthFirstTreeOptions,
  DepthFirstTreeOptionsPatch,
  DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import {
  InternalDepthFirstTreeRunner,
  type DepthFirstTreeRunner,
} from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export class DepthFirstTreeTraversal<
  TTP extends VertexTypes = VertexTypes,
  RW_TTP extends VertexTypes = TTP,
> {
  private icfg: DepthFirstTreeResolvedOptions<TTP, RW_TTP>;

  private visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(icfgInput: DepthFirstTreeOptions<TTP, RW_TTP>) {
    assertPublicOptions(icfgInput, false);
    this.icfg = mergeInstanceConfigs(
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DepthFirstTreeResolvedOptions<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
  }

  configure(icfgInput: DepthFirstTreeOptionsPatch<TTP, RW_TTP>): this {
    assertPublicOptions(icfgInput, false);
    this.icfg = mergeInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
    return this;
  }

  addVisitorFor<Phase extends DepthFirstPhase>(
    phase: Phase,
    visitor: TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>[]
      >
    )[phase] = appendVisitorDefinition<TreeVisitor<Phase, TTP, RW_TTP>>(
      this.visitors[phase] as VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>[],
      { visitor, ...options },
    );
    return this;
  }

  addVisitorGroupFor<Phase extends DepthFirstPhase>(
    phase: Phase,
    group: VisitorGroupDefinition<
      TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>
    >,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>[]
      >
    )[phase] = appendVisitorGroup<TreeVisitor<Phase, TTP, RW_TTP>>(
      this.visitors[phase] as VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>[],
      group,
    );
    return this;
  }

  listVisitorsFor<Phase extends DepthFirstPhase>(
    phase: Phase,
  ): DepthFirstTraversalVisitors<TTP, RW_TTP>[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  setVisitorsFor<Phase extends DepthFirstPhase>(
    phase: Phase,
    input: VisitorPhaseInput<TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>>,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>[]
      >
    )[phase] =
      normalizeVisitorDefinitions<TreeVisitor<Phase, TTP, RW_TTP>>(input);
    return this;
  }

  createRunner(): DepthFirstTreeRunner<TTP, RW_TTP> {
    return new InternalDepthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
