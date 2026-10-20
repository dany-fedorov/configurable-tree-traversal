import { sortVisitorRecords } from '@core/executeVisitors';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import {
  DEFAULT_VISITOR_FN_OPTIONS,
  type TraversalVisitorFunctionOptions,
} from '@core/TraversalVisitor';
import type { VisitorRecord } from '@core/graph/types';
import { initDagVisitors } from './init-helpers/initVisitors';
import {
  DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeDagTraversalInstanceConfigs,
  type DagTraversalConfigureInput,
  type DagTraversalInstanceConfig,
  type DagTraversalInstanceConfigInput,
  type DagTraversalVisitors,
} from './lib/DagTraversalInstanceConfig';
import type { DagVisitor } from './lib/DagTraversalVisitor';
import type { DagTraversalOrder } from './lib/DagTraversalOrder';
import { DagTraversalRunner } from './lib/DagTraversalRunner';

export class DagTraversal<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  icfg: DagTraversalInstanceConfig<T, R>;
  visitors: DagTraversalVisitors<T, R>;
  private readonly sourceMode: 'tree' | 'graph';

  constructor(input: DagTraversalInstanceConfigInput<T, R>) {
    assertNoConcurrency(input);
    this.sourceMode = assertExactlyOneSource(input);
    this.icfg = mergeDagTraversalInstanceConfigs(
      {
        ...(DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DagTraversalInstanceConfig<
          T,
          R
        >),
        ...(this.sourceMode === 'graph'
          ? { traversableGraph: input.traversableGraph }
          : { traversableTree: input.traversableTree }),
      } as DagTraversalInstanceConfig<T, R>,
      input,
    );
    this.visitors = initDagVisitors(this.icfg);
  }

  configure(input: DagTraversalConfigureInput<T, R>): this {
    assertNoConcurrency(input);
    if (
      (this.sourceMode === 'graph' && 'traversableTree' in input) ||
      (this.sourceMode === 'tree' && 'traversableGraph' in input)
    ) {
      throw new TypeError('DAG source mode cannot change after construction');
    }
    this.icfg = mergeDagTraversalInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      input,
    );
    this.visitors = initDagVisitors(this.icfg);
    return this;
  }

  addVisitorFor(
    order: DagTraversalOrder,
    visitor: DagVisitor<T, R>,
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

  listVisitorsFor(order: DagTraversalOrder): VisitorRecord<DagVisitor<T, R>>[] {
    return this.visitors[order];
  }

  setVisitorsFor(
    order: DagTraversalOrder,
    records: VisitorRecord<DagVisitor<T, R>>[],
  ): this {
    this.visitors[order] = sortVisitorRecords(records);
    return this;
  }

  makeRunner(): DagTraversalRunner<T, R> {
    return new DagTraversalRunner({ ...this.icfg, visitors: this.visitors });
  }
}

function assertNoConcurrency(input: object): void {
  if (Object.prototype.hasOwnProperty.call(input, 'concurrency')) {
    throw new TypeError('Synchronous DAG traversal does not accept concurrency');
  }
}

function assertExactlyOneSource(input: object): 'tree' | 'graph' {
  const graph =
    Object.prototype.hasOwnProperty.call(input, 'traversableGraph') &&
    (input as { traversableGraph?: unknown }).traversableGraph !== undefined;
  const tree =
    Object.prototype.hasOwnProperty.call(input, 'traversableTree') &&
    (input as { traversableTree?: unknown }).traversableTree !== undefined;
  if (graph === tree) {
    throw new TypeError('DAG traversal requires exactly one tree or graph source');
  }
  return graph ? 'graph' : 'tree';
}
