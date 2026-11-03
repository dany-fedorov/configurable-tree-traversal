import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import {
  assertPublicOptions,
  DAG_OPTION_KEYS,
} from '@core/assertPublicOptions';
import type { AsyncTreeDiscoverySource } from '@core/AsyncTraversableTree';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type { DagDiscoverySource } from '@core/TraversableGraph';
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
  ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDagTraversalInstanceConfigs,
  type AsyncDagTraversalBuilderOptions,
  type AsyncDagTraversalBuilderOptionsPatch,
  type AsyncDagResolvedOptions,
  type AsyncDagTraversalVisitors,
} from './lib/AsyncDagTraversalInstanceConfig';
import {
  InternalAsyncDagTraversalRunner,
  type AsyncDagTraversalRunner,
} from './lib/AsyncDagTraversalRunner';
import {
  assertExactlyOneDagSource,
  captureDagSourcePatch,
} from './lib/dagSourcePatch';
import type { DagVisitorPhase } from './lib/DagTraversalOrder';
import type { AsyncDagVisitor } from './lib/DagTraversalVisitor';

export class AsyncDagTraversalBuilder<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> {
  private icfg: AsyncDagResolvedOptions<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  private visitors: AsyncDagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  private readonly sourceMode: 'tree' | 'graph';

  // Infer sync graph identities directly instead of through MaybePromise results.
  constructor(
    input: Omit<
      AsyncDagTraversalBuilderOptions<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >,
      'dagDiscoverySource' | 'treeDiscoverySource'
    > &
      (
        | {
            dagDiscoverySource: DagDiscoverySource<
              SourceVertexTypes,
              RewrittenVertexTypes,
              VertexId
            >;
            treeDiscoverySource?: undefined;
          }
        | {
            rootWorkPrerequisitePolicy?: never;
            undeclaredWorkPrerequisitePolicy?: never;
            treeDiscoverySource: unknown extends VertexId
              ? AsyncTreeDiscoverySource<
                  SourceVertexTypes,
                  RewrittenVertexTypes
                >
              : never;
            dagDiscoverySource?: undefined;
          }
      ),
  );
  constructor(
    input: AsyncDagTraversalBuilderOptions<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  );
  constructor(
    input: AsyncDagTraversalBuilderOptions<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ) {
    assertPublicOptions(input, [
      ...DAG_OPTION_KEYS,
      'maxConcurrentCallbackInvocations',
    ]);
    const sources = captureDagSourcePatch(input);
    this.sourceMode = assertExactlyOneDagSource(sources);
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(
      {
        ...(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDagResolvedOptions<
          SourceVertexTypes,
          RewrittenVertexTypes,
          VertexId
        >),
        ...sources,
      } as AsyncDagResolvedOptions<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >,
      input,
      sources,
    );
    this.visitors = initVisitors(this.icfg.visitors);
  }

  /**
   * Configure future runners. Own defined same-family sources replace; inherited
   * and own undefined sources retain the active source. Mode changes reject atomically.
   */
  patchOptionsForFutureRunners(
    input: AsyncDagTraversalBuilderOptionsPatch<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ): this {
    assertPublicOptions(input, [
      ...DAG_OPTION_KEYS,
      'maxConcurrentCallbackInvocations',
    ]);
    const sources = captureDagSourcePatch(input);
    if (
      (this.sourceMode === 'graph' &&
        sources.treeDiscoverySource !== undefined) ||
      (this.sourceMode === 'tree' && sources.dagDiscoverySource !== undefined)
    ) {
      throw new TypeError('DAG source mode cannot change after construction');
    }
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      input,
      sources,
    );
    this.visitors = initVisitors(this.icfg.visitors);
    return this;
  }

  registerVisitorCallbackForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
    visitor: AsyncDagVisitor<
      SourceVertexTypes,
      RewrittenVertexTypes,
      PreventVisitorReturnFromWideningPhase<Phase>,
      VertexId
    >,
    options: Partial<VisitorRegistrationOptions> = {},
  ): this {
    assertOwnKeys(options, ['descendingExecutionPriorityWithinGroup', 'visitorCommandCommitTiming']);
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<
          AsyncDagVisitor<
            SourceVertexTypes,
            RewrittenVertexTypes,
            Phase,
            VertexId
          >
        >[]
      >
    )[order] = appendVisitorDefinition<
      AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
    >(
      this.visitors[order] as VisitorRecord<
        AsyncDagVisitor<
          SourceVertexTypes,
          RewrittenVertexTypes,
          Phase,
          VertexId
        >
      >[],
      { visitor, ...definedOptions(options) },
    );
    return this;
  }

  appendVisitorGroupForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
    group: VisitorGroupDefinition<
      AsyncDagVisitor<
        SourceVertexTypes,
        RewrittenVertexTypes,
        PreventVisitorReturnFromWideningPhase<Phase>,
        VertexId
      >
    >,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<
          AsyncDagVisitor<
            SourceVertexTypes,
            RewrittenVertexTypes,
            Phase,
            VertexId
          >
        >[]
      >
    )[order] = appendVisitorGroup<
      AsyncDagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
    >(
      this.visitors[order] as VisitorRecord<
        AsyncDagVisitor<
          SourceVertexTypes,
          RewrittenVertexTypes,
          Phase,
          VertexId
        >
      >[],
      group,
    );
    return this;
  }

  getDetachedVisitorRegistrationRecordsForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
  ): AsyncDagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >[Phase] {
    return copyVisitorRecords(this.visitors[order]);
  }

  replaceVisitorDefinitionsForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
    input: VisitorDefinitionsForPhase<
      AsyncDagVisitor<
        SourceVertexTypes,
        RewrittenVertexTypes,
        PreventVisitorReturnFromWideningPhase<Phase>,
        VertexId
      >
    >,
  ): this {
    (
      this.visitors as Record<
        Phase,
        VisitorRecord<
          AsyncDagVisitor<
            SourceVertexTypes,
            RewrittenVertexTypes,
            Phase,
            VertexId
          >
        >[]
      >
    )[order] =
      normalizeVisitorDefinitions<
        AsyncDagVisitor<
          SourceVertexTypes,
          RewrittenVertexTypes,
          Phase,
          VertexId
        >
      >(input);
    return this;
  }

  createIndependentRunnerFromCurrentOptions(): AsyncDagTraversalRunner<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  > {
    return new InternalAsyncDagTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}

function initVisitors<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  visitors: AsyncDagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >,
): AsyncDagTraversalVisitors<
  SourceVertexTypes,
  RewrittenVertexTypes,
  VertexId
> {
  return Object.fromEntries(
    Object.entries(visitors).map(([order, records]) => [
      order,
      sortVisitorRecords(records),
    ]),
  ) as AsyncDagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
}
