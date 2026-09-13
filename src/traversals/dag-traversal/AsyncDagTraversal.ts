import { sortVisitorRecords } from '@core/executeVisitors';
import type { VisitorRecord } from '@core/graph/types';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  DEFAULT_VISITOR_FN_OPTIONS,
  type TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';
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
> {
  icfg: AsyncDagTraversalInstanceConfig<T, R>;
  visitors: AsyncDagTraversalVisitors<T, R>;
  private readonly sourceMode: 'tree' | 'graph';

  constructor(input: AsyncDagTraversalInstanceConfigInput<T, R>) {
    this.sourceMode = assertExactlyOneSource(input);
    this.icfg = mergeAsyncDagTraversalInstanceConfigs(
      {
        ...(ASYNC_DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as AsyncDagTraversalInstanceConfig<
          T,
          R
        >),
        ...(this.sourceMode === 'graph'
          ? { traversableGraph: input.traversableGraph }
          : { traversableTree: input.traversableTree }),
      } as AsyncDagTraversalInstanceConfig<T, R>,
      input,
    );
    this.visitors = initVisitors(this.icfg.visitors);
  }

  configure(input: AsyncDagTraversalConfigureInput<T, R>): this {
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

  addVisitorFor(
    order: DagTraversalOrder,
    visitor: AsyncDagVisitor<T, R>,
    options: Partial<TraversalVisitorFunctionOptions> = DEFAULT_VISITOR_FN_OPTIONS,
  ): this {
    const effective = { ...DEFAULT_VISITOR_FN_OPTIONS, ...options };
    const records = this.visitors[order];
    records.push({
      addedIndex:
        records.reduce((max, record) => Math.max(max, record.addedIndex), -1) +
        1,
      priority: effective.priority,
      resolutionStyle: effective.resolutionStyle,
      visitor,
    });
    this.visitors[order] = sortVisitorRecords(records);
    return this;
  }

  listVisitorsFor(
    order: DagTraversalOrder,
  ): VisitorRecord<AsyncDagVisitor<T, R>>[] {
    return this.visitors[order];
  }

  setVisitorsFor(
    order: DagTraversalOrder,
    records: VisitorRecord<AsyncDagVisitor<T, R>>[],
  ): this {
    this.visitors[order] = sortVisitorRecords(records);
    return this;
  }

  makeRunner(): AsyncDagTraversalRunner<T, R> {
    return new AsyncDagTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}

function initVisitors<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
>(visitors: AsyncDagTraversalVisitors<T, R>): AsyncDagTraversalVisitors<T, R> {
  return Object.fromEntries(
    Object.entries(visitors).map(([order, records]) => [
      order,
      sortVisitorRecords(records),
    ]),
  ) as AsyncDagTraversalVisitors<T, R>;
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
