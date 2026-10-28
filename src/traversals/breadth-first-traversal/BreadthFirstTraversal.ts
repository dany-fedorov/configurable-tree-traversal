import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import {
  assertPublicOptions,
  TREE_OPTION_KEYS,
} from '@core/assertPublicOptions';
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
> {
  private icfg: BreadthFirstTreeResolvedOptions<TTP, RW_TTP>;
  private visitors: BreadthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(icfgInput: BreadthFirstTreeOptions<TTP, RW_TTP>) {
    assertPublicOptions(icfgInput, [...TREE_OPTION_KEYS]);
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
    assertPublicOptions(icfgInput, [...TREE_OPTION_KEYS]);
    this.icfg = mergeBreadthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initBreadthFirstVisitors(this.icfg);
    return this;
  }

  addVisitorFor<Phase extends BreadthFirstPhase>(
    phase: Phase,
    visitor: TreeVisitor<NoInferPhase<Phase>, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    assertOwnKeys(options, ['priority', 'commandCommitMode']);
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>[]
      >
    )[phase] = appendVisitorDefinition<TreeVisitor<Phase, TTP, RW_TTP>>(
      this.visitors[phase] as VisitorRecord<TreeVisitor<Phase, TTP, RW_TTP>>[],
      { visitor, ...definedOptions(options) },
    );
    return this;
  }

  addVisitorGroupFor<Phase extends BreadthFirstPhase>(
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

  listVisitorsFor<Phase extends BreadthFirstPhase>(
    phase: Phase,
  ): BreadthFirstTraversalVisitors<TTP, RW_TTP>[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  setVisitorsFor<Phase extends BreadthFirstPhase>(
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

  createRunner(): BreadthFirstTreeRunner<TTP, RW_TTP> {
    return new InternalBreadthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
