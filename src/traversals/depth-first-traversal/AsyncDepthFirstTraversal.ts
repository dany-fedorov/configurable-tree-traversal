import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import {
  assertPublicOptions,
  TREE_OPTION_KEYS,
} from '@core/assertPublicOptions';
import type { AsyncTreeVertexPhaseVisitorCallback } from '@core/AsyncTraversalVisitor';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type {
  PreventVisitorReturnFromWideningPhase,
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
import {
  ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDepthFirstTraversalInstanceConfigs,
  type AsyncDepthFirstTreeVisitorRegistrationsByPhase,
  type AsyncDepthFirstTreeTraversalBuilderOptions,
  type AsyncDepthFirstTreeTraversalBuilderOptionsPatch,
  type AsyncDepthFirstTreeResolvedOptions,
} from '@depth-first-traversal/lib/AsyncDepthFirstTraversalInstanceConfig';
import {
  InternalAsyncDepthFirstTreeRunner,
  type AsyncDepthFirstTreeRunner,
} from '@depth-first-traversal/lib/AsyncDepthFirstTraversalRunner';
import type { DepthFirstTreeVisitPhase } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';

export class AsyncDepthFirstTreeTraversalBuilder<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  private icfg: AsyncDepthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private visitors: AsyncDepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;

  constructor(
    icfgInput: AsyncDepthFirstTreeTraversalBuilderOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    assertPublicOptions(icfgInput, [
      ...TREE_OPTION_KEYS,
      'childBoundaryVisits',
      'maxConcurrentCallbackInvocations',
    ]);
    this.icfg = mergeAsyncDepthFirstTraversalInstanceConfigs(
      ASYNC_DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDepthFirstTreeResolvedOptions<
        InputVertexTypes,
        RewrittenVertexTypes
      >,
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
  }

  patchOptionsForFutureRunners(
    icfgInput: AsyncDepthFirstTreeTraversalBuilderOptionsPatch<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ): this {
    assertPublicOptions(icfgInput, [
      ...TREE_OPTION_KEYS,
      'childBoundaryVisits',
      'maxConcurrentCallbackInvocations',
    ]);
    this.icfg = mergeAsyncDepthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
    return this;
  }

  registerVisitorCallbackForPhase<Phase extends DepthFirstTreeVisitPhase>(
    phase: Phase,
    visitor: AsyncTreeVertexPhaseVisitorCallback<
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
          AsyncTreeVertexPhaseVisitorCallback<
            InputVertexTypes,
            RewrittenVertexTypes,
            Phase
          >
        >[]
      >
    )[phase] = appendVisitorDefinition<
      AsyncTreeVertexPhaseVisitorCallback<
        InputVertexTypes,
        RewrittenVertexTypes,
        Phase
      >
    >(
      this.visitors[phase] as VisitorRecord<
        AsyncTreeVertexPhaseVisitorCallback<
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
      AsyncTreeVertexPhaseVisitorCallback<
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
          AsyncTreeVertexPhaseVisitorCallback<
            InputVertexTypes,
            RewrittenVertexTypes,
            Phase
          >
        >[]
      >
    )[phase] = appendVisitorGroup<
      AsyncTreeVertexPhaseVisitorCallback<
        InputVertexTypes,
        RewrittenVertexTypes,
        Phase
      >
    >(
      this.visitors[phase] as VisitorRecord<
        AsyncTreeVertexPhaseVisitorCallback<
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
  ): AsyncDepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  replaceVisitorDefinitionsForPhase<Phase extends DepthFirstTreeVisitPhase>(
    phase: Phase,
    input: VisitorDefinitionsForPhase<
      AsyncTreeVertexPhaseVisitorCallback<
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
          AsyncTreeVertexPhaseVisitorCallback<
            InputVertexTypes,
            RewrittenVertexTypes,
            Phase
          >
        >[]
      >
    )[phase] =
      normalizeVisitorDefinitions<
        AsyncTreeVertexPhaseVisitorCallback<
          InputVertexTypes,
          RewrittenVertexTypes,
          Phase
        >
      >(input);
    return this;
  }

  createIndependentRunnerFromCurrentOptions(): AsyncDepthFirstTreeRunner<
    InputVertexTypes,
    RewrittenVertexTypes
  > {
    return new InternalAsyncDepthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }

  private initVisitors(
    visitors: AsyncDepthFirstTreeVisitorRegistrationsByPhase<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ): AsyncDepthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  > {
    return Object.fromEntries(
      Object.entries(visitors).map(([phase, records]) => [
        phase,
        sortVisitorRecords(records),
      ]),
    ) as AsyncDepthFirstTreeVisitorRegistrationsByPhase<
      InputVertexTypes,
      RewrittenVertexTypes
    >;
  }
}
