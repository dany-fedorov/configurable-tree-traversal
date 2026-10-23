import type { NoInferPhase } from '@core/TraversalVisitor';
import { normalizeVisitorOptions } from '@core/visitors/normalizeVisitorOptions';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalVisitorFunctionOptions } from '@core/TraversalVisitor';
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

  addVisitorFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
    visitor: DagVisitor<T, R, NoInferPhase<ORDER>>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    const effective = normalizeVisitorOptions(options);
    const records = this.visitors[order] as VisitorRecord<
      DagVisitor<T, R, ORDER>
    >[];
    records.push({
      addedIndex:
        records.reduce((max, record) => Math.max(max, record.addedIndex), -1) +
        1,
      ...effective,
      visitor,
    });
    (this.visitors as Record<ORDER, VisitorRecord<DagVisitor<T, R, ORDER>>[]>)[
      order
    ] = sortVisitorRecords(records);
    return this;
  }

  listVisitorsFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
  ): DagTraversalVisitors<T, R>[ORDER] {
    return this.visitors[order];
  }

  setVisitorsFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
    records: VisitorRecord<DagVisitor<T, R, NoInferPhase<ORDER>>>[],
  ): this {
    (this.visitors as Record<ORDER, VisitorRecord<DagVisitor<T, R, ORDER>>[]>)[
      order
    ] = sortVisitorRecords(records);
    return this;
  }

  makeRunner(): DagTraversalRunner<T, R> {
    return new DagTraversalRunner({ ...this.icfg, visitors: this.visitors });
  }
}

function assertNoConcurrency(input: object): void {
  if (Object.prototype.hasOwnProperty.call(input, 'concurrency')) {
    throw new TypeError(
      'Synchronous DAG traversal does not accept concurrency',
    );
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
    throw new TypeError(
      'DAG traversal requires exactly one tree or graph source',
    );
  }
  return graph ? 'graph' : 'tree';
}
