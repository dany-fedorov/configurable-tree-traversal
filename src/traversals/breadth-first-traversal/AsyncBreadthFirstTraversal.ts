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
  ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncBreadthFirstTraversalInstanceConfigs,
  type AsyncBreadthFirstTreeVisitorRegistrationsByPhase,
  type AsyncBreadthFirstTreeTraversalBuilderOptions,
  type AsyncBreadthFirstTreeTraversalBuilderOptionsPatch,
  type AsyncBreadthFirstTreeResolvedOptions,
} from './lib/AsyncBreadthFirstTraversalInstanceConfig';
import {
  InternalAsyncBreadthFirstTreeRunner,
  type AsyncBreadthFirstTreeRunner,
} from './lib/AsyncBreadthFirstTraversalRunner';
import type { BreadthFirstTreeVisitPhase } from './lib/BreadthFirstTraversalOrder';

export class AsyncBreadthFirstTreeTraversalBuilder<
  InputVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = InputVertexTypes,
> {
  private icfg: AsyncBreadthFirstTreeResolvedOptions<
    InputVertexTypes,
    RewrittenVertexTypes
  >;
  private visitors: AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >;

  constructor(
    icfgInput: AsyncBreadthFirstTreeTraversalBuilderOptions<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ) {
    assertPublicOptions(icfgInput, [
      ...TREE_OPTION_KEYS,
      'maxConcurrentCallbackInvocations',
    ]);
    this.icfg = mergeAsyncBreadthFirstTraversalInstanceConfigs(
      ASYNC_BREADTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncBreadthFirstTreeResolvedOptions<
        InputVertexTypes,
        RewrittenVertexTypes
      >,
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
  }

  patchOptionsForFutureRunners(
    icfgInput: AsyncBreadthFirstTreeTraversalBuilderOptionsPatch<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ): this {
    assertPublicOptions(icfgInput, [
      ...TREE_OPTION_KEYS,
      'maxConcurrentCallbackInvocations',
    ]);
    this.icfg = mergeAsyncBreadthFirstTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = this.initVisitors(this.icfg.visitors);
    return this;
  }

  registerVisitorForPhase<Phase extends BreadthFirstTreeVisitPhase>(
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

  appendVisitorGroupForPhase<Phase extends BreadthFirstTreeVisitPhase>(
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
    Phase extends BreadthFirstTreeVisitPhase,
  >(
    phase: Phase,
  ): AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  >[Phase] {
    return copyVisitorRecords(this.visitors[phase]);
  }

  replaceVisitorDefinitionsForPhase<Phase extends BreadthFirstTreeVisitPhase>(
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

  createIndependentRunnerFromCurrentOptions(): AsyncBreadthFirstTreeRunner<
    InputVertexTypes,
    RewrittenVertexTypes
  > {
    return new InternalAsyncBreadthFirstTreeRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }

  private initVisitors(
    visitors: AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
      InputVertexTypes,
      RewrittenVertexTypes
    >,
  ): AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
    InputVertexTypes,
    RewrittenVertexTypes
  > {
    return Object.fromEntries(
      Object.entries(visitors).map(([phase, records]) => [
        phase,
        sortVisitorRecords(records),
      ]),
    ) as AsyncBreadthFirstTreeVisitorRegistrationsByPhase<
      InputVertexTypes,
      RewrittenVertexTypes
    >;
  }
}
