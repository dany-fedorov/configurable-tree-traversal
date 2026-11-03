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
import { initVisitors } from '@depth-first-traversal/init-helpers/initVisitors';
import type {
  DepthFirstTreeTraversalBuilderOptions,
  DepthFirstTreeTraversalBuilderOptionsPatch,
  DepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import {
  InternalDepthFirstTreeRunner,
  type DepthFirstTreeRunner,
} from '@depth-first-traversal/lib/DepthFirstTraversalRunner';
import type { DepthFirstTreeVisitorRegistrationsByPhase } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';

export class DepthFirstTreeTraversalBuilder<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  private icfg: DepthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >;

  private visitors: DepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;

  constructor(
    icfgInput: DepthFirstTreeTraversalBuilderOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    assertPublicOptions(icfgInput, [
      ...TREE_OPTION_KEYS,
      'childBoundaryVisits',
    ]);
    this.icfg = mergeInstanceConfigs(
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DepthFirstTreeResolvedOptions<
        InputVertexTypes,
        RewrittenVertexTypes
      >,
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
  }

  patchOptionsForFutureRunners(
    icfgInput: DepthFirstTreeTraversalBuilderOptionsPatch<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ): this {
    assertPublicOptions(icfgInput, [
      ...TREE_OPTION_KEYS,
      'childBoundaryVisits',
    ]);
    this.icfg = mergeInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
    return this;
  }

  registerVisitorCallbackForPhase<Phase extends DepthFirstTreeVisitPhase>(
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

  appendVisitorGroupForPhase<Phase extends DepthFirstTreeVisitPhase>(
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
    Phase extends DepthFirstTreeVisitPhase,
  >(
    phase: Phase,
  ): DepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  replaceVisitorDefinitionsForPhase<Phase extends DepthFirstTreeVisitPhase>(
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

  createIndependentRunnerFromCurrentOptions(): DepthFirstTreeRunner<
    InputVertexTypes,
    RewrittenVertexTypes
  > {
    return new InternalDepthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
