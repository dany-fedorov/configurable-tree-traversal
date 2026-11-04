import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import {
  assertPublicOptions,
  TREE_OPTION_KEYS,
} from '@core/assertPublicOptions';
import type { VisitorRecord } from '@core/graph/types';
import type {
  PreventVisitorReturnFromWideningPhase,
  TreeVertexPhaseVisitorCallback,
  VisitorRegistrationOptions,
  VisitorGroupDefinition,
  VisitorDefinitionsForPhase,
} from '@core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
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
  type BreadthFirstTreeTraversalBuilderOptions,
  type BreadthFirstTreeTraversalBuilderOptionsPatch,
  type BreadthFirstTreeResolvedOptions,
} from './lib/BreadthFirstTraversalInstanceConfig';
import type { BreadthFirstTreeVisitPhase } from './lib/BreadthFirstTraversalOrder';
import {
  InternalBreadthFirstTreeRunner,
  type BreadthFirstTreeRunner,
} from './lib/BreadthFirstTraversalRunner';
import type { BreadthFirstTreeVisitorRegistrationsByPhase } from './lib/BreadthFirstTraversalVisitors';

export class BreadthFirstTreeTraversalBuilder<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  private icfg: BreadthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private visitors: BreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;

  constructor(
    icfgInput: BreadthFirstTreeTraversalBuilderOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    assertPublicOptions(icfgInput, [...TREE_OPTION_KEYS]);
    this.icfg = mergeBreadthFirstTraversalInstanceConfigs(
      BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as BreadthFirstTreeResolvedOptions<
        InputVertexTypes,
        RewrittenVertexTypes
      >,
      icfgInput,
    );
    this.visitors = initBreadthFirstVisitors(this.icfg);
  }

  patchOptionsForFutureRunners(
    icfgInput: BreadthFirstTreeTraversalBuilderOptionsPatch<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ): this {
    assertPublicOptions(icfgInput, [...TREE_OPTION_KEYS]);
    this.icfg = mergeBreadthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initBreadthFirstVisitors(this.icfg);
    return this;
  }

  registerVisitorForPhase<Phase extends BreadthFirstTreeVisitPhase>(
    phase: Phase,
    visitor: TreeVertexPhaseVisitorCallback<
      InputVertexTypes,
      RewrittenVertexTypes,
      PreventVisitorReturnFromWideningPhase<Phase>
    >,
    options: Partial<VisitorRegistrationOptions> = {},
  ): this {
    assertOwnKeys(options, [
      'descendingExecutionPriorityWithinGroup',
      'visitorCommandCommitTiming',
    ]);
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<
          TreeVertexPhaseVisitorCallback<
            InputVertexTypes,
            RewrittenVertexTypes,
            Phase
          >
        >[]
      >
    )[phase] = appendVisitorDefinition<
      TreeVertexPhaseVisitorCallback<
        InputVertexTypes,
        RewrittenVertexTypes,
        Phase
      >
    >(
      this.visitors[phase] as VisitorRecord<
        TreeVertexPhaseVisitorCallback<
          InputVertexTypes,
          RewrittenVertexTypes,
          Phase
        >
      >[],
      { visitor, ...definedOptions(options) },
    );
    return this;
  }

  appendVisitorGroupForPhase<Phase extends BreadthFirstTreeVisitPhase>(
    phase: Phase,
    group: VisitorGroupDefinition<
      TreeVertexPhaseVisitorCallback<
        InputVertexTypes,
        RewrittenVertexTypes,
        PreventVisitorReturnFromWideningPhase<Phase>
      >
    >,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<
          TreeVertexPhaseVisitorCallback<
            InputVertexTypes,
            RewrittenVertexTypes,
            Phase
          >
        >[]
      >
    )[phase] = appendVisitorGroup<
      TreeVertexPhaseVisitorCallback<
        InputVertexTypes,
        RewrittenVertexTypes,
        Phase
      >
    >(
      this.visitors[phase] as VisitorRecord<
        TreeVertexPhaseVisitorCallback<
          InputVertexTypes,
          RewrittenVertexTypes,
          Phase
        >
      >[],
      group,
    );
    return this;
  }

  getDetachedVisitorRegistrationRecordsForPhase<
    Phase extends BreadthFirstTreeVisitPhase,
  >(
    phase: Phase,
  ): BreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  replaceVisitorDefinitionsForPhase<Phase extends BreadthFirstTreeVisitPhase>(
    phase: Phase,
    input: VisitorDefinitionsForPhase<
      TreeVertexPhaseVisitorCallback<
        InputVertexTypes,
        RewrittenVertexTypes,
        PreventVisitorReturnFromWideningPhase<Phase>
      >
    >,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<
          TreeVertexPhaseVisitorCallback<
            InputVertexTypes,
            RewrittenVertexTypes,
            Phase
          >
        >[]
      >
    )[phase] =
      normalizeVisitorDefinitions<
        TreeVertexPhaseVisitorCallback<
          InputVertexTypes,
          RewrittenVertexTypes,
          Phase
        >
      >(input);
    return this;
  }

  createIndependentRunnerFromCurrentOptions(): BreadthFirstTreeRunner<
    InputVertexTypes,
    RewrittenVertexTypes
  > {
    return new InternalBreadthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
