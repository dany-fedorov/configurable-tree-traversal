import type { NoInferPhase } from '@core/TraversalVisitor';
import {
  appendVisitorDefinition,
  appendVisitorGroup,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import type {
  VisitorPhaseInput,
  VisitorGroupDefinition,
} from '@core/TraversalVisitor';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalVisitorFunctionOptions } from '@core/TraversalVisitor';
import {
  ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeAsyncDagTraversalInstanceConfigs,
  type AsyncDagTraversalConfigureInput,
  type AsyncDagTraversalInstanceConfig,
  type AsyncDagTraversalInstanceConfigInput,
  type AsyncDagTraversalVisitors,
} from './lib/AsyncDagTraversalInstanceConfig';
import { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import type { DagTraversalOrder } from './lib/DagTraversalOrder';
import type { AsyncDagVisitor } from './lib/DagTraversalVisitor';

export class AsyncDagTraversal<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> {
  icfg: AsyncDagTraversalInstanceConfig<T, R, ID>;
  visitors: AsyncDagTraversalVisitors<T, R, ID>;
  private readonly sourceMode: 'tree' | 'graph';

  constructor(input: AsyncDagTraversalInstanceConfigInput<T, R, ID>) {
    this.sourceMode = assertExactlyOneSource(input);
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(
      {
        ...(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDagTraversalInstanceConfig<
          T,
          R,
          ID
        >),
        ...(this.sourceMode === 'graph'
          ? { traversableGraph: input.traversableGraph }
          : { traversableTree: input.traversableTree }),
      } as AsyncDagTraversalInstanceConfig<T, R, ID>,
      input,
    );
    this.visitors = initVisitors(this.icfg.visitors);
  }

  configure(input: AsyncDagTraversalConfigureInput<T, R, ID>): this {
    if (
      (this.sourceMode === 'graph' && 'traversableTree' in input) ||
      (this.sourceMode === 'tree' && 'traversableGraph' in input)
    ) {
      throw new TypeError('DAG source mode cannot change after construction');
    }
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      input,
    );
    this.visitors = initVisitors(this.icfg.visitors);
    return this;
  }

  addVisitorFor<ORDER extends DagTraversalOrder>(
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

  addVisitorGroupFor<ORDER extends DagTraversalOrder>(
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

  listVisitorsFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
  ): AsyncDagTraversalVisitors<T, R, ID>[ORDER] {
    return this.visitors[order];
  }

  setVisitorsFor<ORDER extends DagTraversalOrder>(
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

  makeRunner(): AsyncDagTraversalRunner<T, R, ID> {
    return new AsyncDagTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}

function initVisitors<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
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

function assertExactlyOneSource(input: object): 'tree' | 'graph' {
  const graph =
    Object.prototype.hasOwnProperty.call(input, 'traversableGraph') &&
    (input as { traversableGraph?: unknown }).traversableGraph !== undefined;
  const tree =
    Object.prototype.hasOwnProperty.call(input, 'traversableTree') &&
    (input as { traversableTree?: unknown }).traversableTree !== undefined;
  if (graph === tree) {
    throw new TypeError(
      'DAG traversal requires exactly one tree or graph source',
    );
  }
  return graph ? 'graph' : 'tree';
}
