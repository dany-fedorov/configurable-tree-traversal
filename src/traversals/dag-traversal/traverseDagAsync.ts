import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { AsyncDagTraversal } from './AsyncDagTraversal';
import type {
  AsyncDagSource,
  AsyncDagTraversalInstanceConfigInput,
  AsyncDagTraversalConfigureInput,
} from './lib/AsyncDagTraversalInstanceConfig';
import { DagTraversalOrder } from './lib/DagTraversalOrder';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import type { AsyncDagVisitor } from './lib/DagTraversalVisitor';

export type AsyncDagTraversalVisitorsSimple<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  onReadyVisitor?: AsyncDagVisitor<T, R, DagTraversalOrder.ON_READY>;
  onCompleteVisitor?: AsyncDagVisitor<T, R, DagTraversalOrder.ON_COMPLETE>;
};

export type AsyncDagTraversalHelperConfig<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = Omit<
  AsyncDagTraversalConfigureInput<T, R>,
  'traversableGraph' | 'traversableTree'
>;

/** Options for a single-call Dag traversal with phase-keyed callbacks. */
export type AsyncDagTraversalHelperOptions<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = Omit<AsyncDagTraversalHelperConfig<T, R>, 'visitors'> &
  AsyncDagSource<T, R> & {
    visitors?: { [K in DagTraversalOrder]?: AsyncDagVisitor<T, R, K> };
  };

export function traverseDagAsync<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  options: AsyncDagTraversalHelperOptions<T, R>,
): Promise<AsyncDagTraversalRunner<T, R>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDagAsync<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  source: AsyncDagSource<T, R>,
  visitors: AsyncDagTraversalVisitorsSimple<T, R> | null,
  config?: AsyncDagTraversalHelperConfig<T, R>,
): Promise<AsyncDagTraversalRunner<T, R>>;
export function traverseDagAsync<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  sourceOrOptions: AsyncDagSource<T, R> | AsyncDagTraversalHelperOptions<T, R>,
  visitors?: AsyncDagTraversalVisitorsSimple<T, R> | null,
  config?: AsyncDagTraversalHelperConfig<T, R>,
): Promise<AsyncDagTraversalRunner<T, R>> {
  let traversalConfig: AsyncDagTraversalInstanceConfigInput<T, R>;
  let onReadyVisitor = visitors?.onReadyVisitor;
  let onCompleteVisitor = visitors?.onCompleteVisitor;
  if (arguments.length === 1) {
    const { visitors: callbacks, ...options } =
      sourceOrOptions as AsyncDagTraversalHelperOptions<T, R>;
    traversalConfig = options;
    onReadyVisitor = callbacks?.[DagTraversalOrder.ON_READY];
    onCompleteVisitor = callbacks?.[DagTraversalOrder.ON_COMPLETE];
  } else {
    traversalConfig = {
      ...config,
      ...(sourceOrOptions as AsyncDagSource<T, R>),
    };
  }
  const traversal = new AsyncDagTraversal<T, R>(traversalConfig);
  if (onReadyVisitor) {
    traversal.addVisitorFor(DagTraversalOrder.ON_READY, onReadyVisitor);
  }
  if (onCompleteVisitor) {
    traversal.addVisitorFor(DagTraversalOrder.ON_COMPLETE, onCompleteVisitor);
  }
  return traversal.makeRunner().run();
}
