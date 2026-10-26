import type { NoInferPhase } from '@core/TraversalVisitor';
import {
  appendVisitorDefinition,
  appendVisitorGroup,
  copyVisitorRecords,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import type {
  VisitorPhaseInput,
  VisitorGroupDefinition,
} from '@core/TraversalVisitor';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { TraversalVisitorFunctionOptions } from '@core/TraversalVisitor';
import type { VisitorRecord } from '@core/graph/types';
import {
  captureDagSourcePatch,
  assertExactlyOneDagSource,
} from './lib/dagSourcePatch';
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
  ID = unknown,
> {
  icfg: DagTraversalInstanceConfig<T, R, ID>;
  visitors: DagTraversalVisitors<T, R, ID>;
  private readonly sourceMode: 'tree' | 'graph';

  constructor(input: DagTraversalInstanceConfigInput<T, R, ID>) {
    assertNoConcurrency(input);
    const sources = captureDagSourcePatch(input);
    this.sourceMode = assertExactlyOneDagSource(sources);
    this.icfg = mergeDagTraversalInstanceConfigs(
      {
        ...(DAG_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DagTraversalInstanceConfig<
          T,
          R,
          ID
        >),
        ...sources,
      } as DagTraversalInstanceConfig<T, R, ID>,
      input,
      sources,
    );
    this.visitors = initDagVisitors(this.icfg);
  }

  configure(input: DagTraversalConfigureInput<T, R, ID>): this {
    assertNoConcurrency(input);
    const sources = captureDagSourcePatch(input);
    if (
      (this.sourceMode === 'graph' && sources.traversableTree !== undefined) ||
      (this.sourceMode === 'tree' && sources.traversableGraph !== undefined)
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

  addVisitorFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
    visitor: DagVisitor<T, R, NoInferPhase<ORDER>, ID>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<DagVisitor<T, R, ORDER, ID>>[]
      >
    )[order] = appendVisitorDefinition<DagVisitor<T, R, ORDER, ID>>(
      this.visitors[order] as VisitorRecord<DagVisitor<T, R, ORDER, ID>>[],
      { visitor, ...options },
    );
    return this;
  }

  addVisitorGroupFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
    group: VisitorGroupDefinition<DagVisitor<T, R, NoInferPhase<ORDER>, ID>>,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<DagVisitor<T, R, ORDER, ID>>[]
      >
    )[order] = appendVisitorGroup<DagVisitor<T, R, ORDER, ID>>(
      this.visitors[order] as VisitorRecord<DagVisitor<T, R, ORDER, ID>>[],
      group,
    );
    return this;
  }

  listVisitorsFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
  ): DagTraversalVisitors<T, R, ID>[ORDER] {
    return copyVisitorRecords(this.visitors[order]);
  }

  setVisitorsFor<ORDER extends DagTraversalOrder>(
    order: ORDER,
    input: VisitorPhaseInput<DagVisitor<T, R, NoInferPhase<ORDER>, ID>>,
  ): this {
    (
      this.visitors as Record<
        ORDER,
        VisitorRecord<DagVisitor<T, R, ORDER, ID>>[]
      >
    )[order] = normalizeVisitorDefinitions<DagVisitor<T, R, ORDER, ID>>(input);
    return this;
  }

  makeRunner(): DagTraversalRunner<T, R, ID> {
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
