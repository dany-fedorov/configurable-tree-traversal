import type { NoInferPhase } from '@core/TraversalVisitor';
import { normalizeVisitorOptions } from '@core/visitors/normalizeVisitorOptions';
import { sortVisitorRecords } from '@core/executeVisitors';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { Traversal } from '@core/Traversal';
import type {
  DepthFirstTraversalInstanceConfig,
  DepthFirstTraversalInstanceConfigInput,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type { DepthFirstTraversalVisitors } from '@depth-first-traversal/lib/DepthFirstTraversalVisitors';
import {
  DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG,
  mergeInstanceConfigs,
} from '@depth-first-traversal/lib/DepthFirstTraversalInstanceConfig';
import type {
  TraversalVisitor,
  TraversalVisitorFunctionOptions,
  TraversalVisitorRecord,
} from '@core/TraversalVisitor';
import { initVisitors } from '@depth-first-traversal/init-helpers/initVisitors';
import type { DepthFirstTraversalOrder } from '@depth-first-traversal/lib/DepthFirstTraversalOrder';
import { DepthFirstTraversalRunner } from '@depth-first-traversal/lib/DepthFirstTraversalRunner';

export class DepthFirstTraversal<
  TTP extends TreeTypeParameters = TreeTypeParameters,
  RW_TTP extends TreeTypeParameters = TTP,
> extends Traversal<DepthFirstTraversalOrder, TTP, RW_TTP> {
  icfg: DepthFirstTraversalInstanceConfig<TTP, RW_TTP>;

  visitors: DepthFirstTraversalVisitors<TTP, RW_TTP>;

  constructor(icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>) {
    super();
    this.icfg = mergeInstanceConfigs(
      DEPTH_FIRST_TRAVERSAL_DEFAULT_INSTANCE_CONFIG as unknown as DepthFirstTraversalInstanceConfig<
        TTP,
        RW_TTP
      >,
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
  }

  configure(
    icfgInput: DepthFirstTraversalInstanceConfigInput<TTP, RW_TTP>,
  ): this {
    this.icfg = mergeInstanceConfigs(
      { ...this.icfg, visitors: this.visitors },
      icfgInput,
    );
    this.visitors = initVisitors(this.icfg);
    return this;
  }

  addVisitorFor<ORDER extends DepthFirstTraversalOrder>(
    order: ORDER,
    visitor: TraversalVisitor<NoInferPhase<ORDER>, TTP, RW_TTP>,
    options: Partial<TraversalVisitorFunctionOptions> = {},
  ): this {
    const effectiveOptions = normalizeVisitorOptions(options);
    (this.visitors[order] as TraversalVisitorRecord<ORDER, TTP, RW_TTP>[]).push(
      {
        visitor,
        addedIndex:
          this.visitors[order].reduce(
            (max, record) => Math.max(max, record.addedIndex),
            -1,
          ) + 1,
        ...effectiveOptions,
      },
    );
    this.visitors[order].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      } else {
        return a.addedIndex - b.addedIndex;
      }
    });
    return this;
  }

  listVisitorsFor<ORDER extends DepthFirstTraversalOrder>(
    order: ORDER,
  ): DepthFirstTraversalVisitors<TTP, RW_TTP>[ORDER] {
    return this.visitors[order];
  }

  setVisitorsFor<ORDER extends DepthFirstTraversalOrder>(
    order: ORDER,
    visitorRecords: TraversalVisitorRecord<NoInferPhase<ORDER>, TTP, RW_TTP>[],
  ): this {
    (
      this.visitors as Record<
        ORDER,
        TraversalVisitorRecord<ORDER, TTP, RW_TTP>[]
      >
    )[order] = sortVisitorRecords(visitorRecords);
    return this;
  }

  makeRunner() {
    return new DepthFirstTraversalRunner({
      ...this.icfg,
      visitors: this.visitors,
    });
  }
}
