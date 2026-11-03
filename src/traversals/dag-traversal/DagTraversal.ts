import { assertOwnKeys, definedOptions } from '@core/assertPublicOptions';
import {
  assertPublicOptions,
  DAG_OPTION_KEYS,
} from '@core/assertPublicOptions';
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
import { initDagVisitors } from './init-helpers/initVisitors';
import {
  assertExactlyOneDagSource,
  captureDagSourcePatch,
} from './lib/dagSourcePatch';
import {
  DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeDagTraversalInstanceConfigs,
  type DagTraversalBuilderOptions,
  type DagTraversalBuilderOptionsPatch,
  type DagResolvedOptions,
  type DagTraversalVisitors,
} from './lib/DagTraversalInstanceConfig';
import type { DagVisitorPhase } from './lib/DagTraversalOrder';
import {
  InternalDagTraversalRunner,
  type DagTraversalRunner,
} from './lib/DagTraversalRunner';
import type { DagVisitor } from './lib/DagTraversalVisitor';

export class DagTraversalBuilder<
  SourceVertexTypes extends VertexDataAndChildHintTypes = VertexDataAndChildHintTypes,
  RewrittenVertexTypes extends VertexDataAndChildHintTypes = SourceVertexTypes,
  VertexId = unknown,
> {
  private icfg: DagResolvedOptions<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  private visitors: DagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >;
  private readonly sourceMode: 'tree' | 'graph';

  constructor(
    input: DagTraversalBuilderOptions<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ) {
    assertNoConcurrency(input);
    assertPublicOptions(input, [...DAG_OPTION_KEYS]);
    const sources = captureDagSourcePatch(input);
    this.sourceMode = assertExactlyOneDagSource(sources);
    this.icfg = mergeDagTraversalInstanceConfigs(
      {
        ...(DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DagResolvedOptions<
          SourceVertexTypes,
          RewrittenVertexTypes,
          VertexId
        >),
        ...sources,
      } as DagResolvedOptions<
        SourceVertexTypes,
        RewrittenVertexTypes,
        VertexId
      >,
      input,
      sources,
    );
    this.visitors = initDagVisitors(this.icfg);
  }

  /**
   * Configure future runners. Own defined same-family sources replace; inherited
   * and own undefined sources retain the active source. Mode changes reject atomically.
   */
  patchOptionsForFutureRunners(
    input: DagTraversalBuilderOptionsPatch<
      SourceVertexTypes,
      RewrittenVertexTypes,
      VertexId
    >,
  ): this {
    assertNoConcurrency(input);
    assertPublicOptions(input, [...DAG_OPTION_KEYS]);
    const sources = captureDagSourcePatch(input);
    if (
      (this.sourceMode === 'graph' &&
        sources.treeDiscoverySource !== undefined) ||
      (this.sourceMode === 'tree' && sources.dagDiscoverySource !== undefined)
    ) {
      throw new TypeError('DAG source mode cannot change after construction');
    }
    this.icfg = mergeDagTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      input,
      sources,
    );
    this.visitors = initDagVisitors(this.icfg);
    return this;
  }

  registerVisitorCallbackForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
    visitor: DagVisitor<
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
          DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
        >[]
      >
    )[order] = appendVisitorDefinition<
      DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
    >(
      this.visitors[order] as VisitorRecord<
        DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
      >[],
      { visitor, ...definedOptions(options) },
    );
    return this;
  }

  appendVisitorGroupForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
    group: VisitorGroupDefinition<
      DagVisitor<
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
          DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
        >[]
      >
    )[order] = appendVisitorGroup<
      DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
    >(
      this.visitors[order] as VisitorRecord<
        DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
      >[],
      group,
    );
    return this;
  }

  getDetachedVisitorRegistrationRecordsForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
  ): DagTraversalVisitors<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  >[Phase] {
    return copyVisitorRecords(this.visitors[order]);
  }

  replaceVisitorDefinitionsForPhase<Phase extends DagVisitorPhase>(
    order: Phase,
    input: VisitorDefinitionsForPhase<
      DagVisitor<
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
          DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
        >[]
      >
    )[order] =
      normalizeVisitorDefinitions<
        DagVisitor<SourceVertexTypes, RewrittenVertexTypes, Phase, VertexId>
      >(input);
    return this;
  }

  createIndependentRunnerFromCurrentOptions(): DagTraversalRunner<
    SourceVertexTypes,
    RewrittenVertexTypes,
    VertexId
  > {
    return new InternalDagTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}

function assertNoConcurrency(input: object): void {
  if (
    Object.prototype.hasOwnProperty.call(
      input,
      'maxConcurrentCallbackInvocations',
    )
  ) {
    throw new TypeError(
      'Synchronous DAG traversal does not accept concurrency',
    );
  }
}
