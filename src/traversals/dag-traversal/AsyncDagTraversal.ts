import { assertPublicOptions } from '@core/assertPublicOptions';
import type { AsyncTreeSource } from '@core/AsyncTraversableTree';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type { DagDiscoverySource } from '@core/TraversableGraph';
import type {
  NoInferPhase,
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
import {
  ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDagTraversalInstanceConfigs,
  type AsyncDagOptions,
  type AsyncDagOptionsPatch,
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

export class AsyncDagTraversal<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> {
  private icfg: AsyncDagResolvedOptions<T, R, ID>;
  private visitors: AsyncDagTraversalVisitors<T, R, ID>;
  private readonly sourceMode: 'tree' | 'graph';

  // Infer sync graph identities directly instead of through MaybePromise results.
  constructor(
    input: Omit<
      AsyncDagOptions<T, R, ID>,
      'traversableGraph' | 'traversableTree'
    > &
      (
        | {
            traversableGraph: DagDiscoverySource<T, R, ID>;
            traversableTree?: undefined;
          }
        | {
            traversableTree: unknown extends ID ? AsyncTreeSource<T, R> : never;
            traversableGraph?: undefined;
          }
      ),
  );
  constructor(input: AsyncDagOptions<T, R, ID>);
  constructor(input: AsyncDagOptions<T, R, ID>) {
    assertPublicOptions(input);
    const sources = captureDagSourcePatch(input);
    this.sourceMode = assertExactlyOneDagSource(sources);
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(
      {
        ...(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDagResolvedOptions<
          T,
          R,
          ID
        >),
        ...sources,
      } as AsyncDagResolvedOptions<T, R, ID>,
      input,
      sources,
    );
    this.visitors = initVisitors(this.icfg.visitors);
  }

  /**
   * Configure future runners. Own defined same-family sources replace; inherited
   * and own undefined sources retain the active source. Mode changes reject atomically.
   */
  configure(input: AsyncDagOptionsPatch<T, R, ID>): this {
    assertPublicOptions(input);
    const sources = captureDagSourcePatch(input);
    if (
      (this.sourceMode === 'graph' && sources.traversableTree !== undefined) ||
      (this.sourceMode === 'tree' && sources.traversableGraph !== undefined)
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

  addVisitorFor<ORDER extends DagVisitorPhase>(
    order: ORDER,
    visitor: AsyncDagVisitor<T, R, NoInferPhase<ORDER>, ID>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncDagVisitor<T, R, ORDER, ID>>[]
      >
    )[order] = appendVisitorDefinition<AsyncDagVisitor<T, R, ORDER, ID>>(
      this.visitors[order] as VisitorRecord<AsyncDagVisitor<T, R, ORDER, ID>>[],
      { visitor, ...options },
    );
    return this;
  }

  addVisitorGroupFor<ORDER extends DagVisitorPhase>(
    order: ORDER,
    group: VisitorGroupDefinition<
      AsyncDagVisitor<T, R, NoInferPhase<ORDER>, ID>
    >,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncDagVisitor<T, R, ORDER, ID>>[]
      >
    )[order] = appendVisitorGroup<AsyncDagVisitor<T, R, ORDER, ID>>(
      this.visitors[order] as VisitorRecord<AsyncDagVisitor<T, R, ORDER, ID>>[],
      group,
    );
    return this;
  }

  listVisitorsFor<ORDER extends DagVisitorPhase>(
    order: ORDER,
  ): AsyncDagTraversalVisitors<T, R, ID>[ORDER] {
    return copyVisitorRecords(this.visitors[order]);
  }

  setVisitorsFor<ORDER extends DagVisitorPhase>(
    order: ORDER,
    input: VisitorPhaseInput<AsyncDagVisitor<T, R, NoInferPhase<ORDER>, ID>>,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<AsyncDagVisitor<T, R, ORDER, ID>>[]
      >
    )[order] =
      normalizeVisitorDefinitions<AsyncDagVisitor<T, R, ORDER, ID>>(input);
    return this;
  }

  createRunner(): AsyncDagTraversalRunner<T, R, ID> {
    return new InternalAsyncDagTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}

function initVisitors<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
>(
  visitors: AsyncDagTraversalVisitors<T, R, ID>,
): AsyncDagTraversalVisitors<T, R, ID> {
  return Object.fromEntries(
    Object.entries(visitors).map(([order, records]) => [
      order,
      sortVisitorRecords(records),
    ]),
  ) as AsyncDagTraversalVisitors<T, R, ID>;
}
