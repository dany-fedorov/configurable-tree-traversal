import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { DagTraversal } from './DagTraversal';
import type {
  DagSource,
  DagTraversalInstanceConfigInput,
  DagTraversalConfigureInput,
} from './lib/DagTraversalInstanceConfig';
import { DagTraversalOrder } from './lib/DagTraversalOrder';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';
import type { DagVisitor } from './lib/DagTraversalVisitor';

export type DagTraversalVisitorsSimple<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  onReadyVisitor?: DagVisitor<T, R, DagTraversalOrder.ON_READY>;
  onCompleteVisitor?: DagVisitor<T, R, DagTraversalOrder.ON_COMPLETE>;
};

export type DagTraversalHelperConfig<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = Omit<
  DagTraversalConfigureInput<T, R>,
  'traversableGraph' | 'traversableTree'
>;

/** Options for a single-call Dag traversal with phase-keyed callbacks. */
export type DagTraversalHelperOptions<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = Omit<DagTraversalHelperConfig<T, R>, 'visitors'> &
  DagSource<T, R> & {
    visitors?: { [K in DagTraversalOrder]?: DagVisitor<T, R, K> };
  };

export function traverseDag<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(options: DagTraversalHelperOptions<T, R>): DagTraversalRunner<T, R>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDag<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  source: DagSource<T, R>,
  visitors: DagTraversalVisitorsSimple<T, R> | null,
  config?: DagTraversalHelperConfig<T, R>,
): DagTraversalRunner<T, R>;
export function traverseDag<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  sourceOrOptions: DagSource<T, R> | DagTraversalHelperOptions<T, R>,
  visitors?: DagTraversalVisitorsSimple<T, R> | null,
  config?: DagTraversalHelperConfig<T, R>,
): DagTraversalRunner<T, R> {
  let traversalConfig: DagTraversalInstanceConfigInput<T, R>;
  let onReadyVisitor = visitors?.onReadyVisitor;
  let onCompleteVisitor = visitors?.onCompleteVisitor;
  if (arguments.length === 1) {
    const { visitors: callbacks, ...options } =
      sourceOrOptions as DagTraversalHelperOptions<T, R>;
    traversalConfig = options;
    onReadyVisitor = callbacks?.[DagTraversalOrder.ON_READY];
    onCompleteVisitor = callbacks?.[DagTraversalOrder.ON_COMPLETE];
  } else {
    traversalConfig = { ...config, ...(sourceOrOptions as DagSource<T, R>) };
  }
  const traversal = new DagTraversal<T, R>(traversalConfig);
  if (onReadyVisitor) {
    traversal.addVisitorFor(DagTraversalOrder.ON_READY, onReadyVisitor);
  }
  if (onCompleteVisitor) {
    traversal.addVisitorFor(DagTraversalOrder.ON_COMPLETE, onCompleteVisitor);
  }
  return traversal.makeRunner().run();
}
