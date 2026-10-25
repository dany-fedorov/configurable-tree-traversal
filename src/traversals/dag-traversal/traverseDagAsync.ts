import type { VisitorPhaseInput } from '@core/TraversalVisitor';
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
  ID = unknown,
> = {
  onReadyVisitor?: AsyncDagVisitor<T, R, DagTraversalOrder.ON_READY, ID>;
  onCompleteVisitor?: AsyncDagVisitor<T, R, DagTraversalOrder.ON_COMPLETE, ID>;
};

export type AsyncDagTraversalHelperConfig<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ID = unknown,
> = Omit<
  AsyncDagTraversalConfigureInput<T, R, ID>,
  'traversableGraph' | 'traversableTree'
>;

/** Options for a single-call Dag traversal with phase-keyed callbacks. */
export type AsyncDagTraversalHelperOptions<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
> = Omit<AsyncDagTraversalHelperConfig<T, R, ID>, 'visitors'> &
  AsyncDagSource<T, R, ID> & {
    visitors?: {
      [K in DagTraversalOrder]?: VisitorPhaseInput<
        AsyncDagVisitor<T, R, K, ID>
      >;
    };
  };

export function traverseDagAsync<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
>(
  options: AsyncDagTraversalHelperOptions<T, R, ID>,
): Promise<AsyncDagTraversalRunner<T, R, ID>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDagAsync<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
>(
  source: AsyncDagSource<T, R, ID>,
  visitors: AsyncDagTraversalVisitorsSimple<T, R, ID> | null,
  config?: AsyncDagTraversalHelperConfig<T, R, ID>,
): Promise<AsyncDagTraversalRunner<T, R, ID>>;
export function traverseDagAsync<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
  ID = unknown,
>(
  sourceOrOptions:
    | AsyncDagSource<T, R, ID>
    | AsyncDagTraversalHelperOptions<T, R, ID>,
  visitors?: AsyncDagTraversalVisitorsSimple<T, R, ID> | null,
  config?: AsyncDagTraversalHelperConfig<T, R, ID>,
): Promise<AsyncDagTraversalRunner<T, R, ID>> {
  let traversalConfig: AsyncDagTraversalInstanceConfigInput<T, R, ID>;
  const onReadyVisitor = visitors?.onReadyVisitor;
  const onCompleteVisitor = visitors?.onCompleteVisitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as AsyncDagTraversalHelperOptions<
      T,
      R,
      ID
    >;
  } else {
    traversalConfig = {
      ...config,
      ...(sourceOrOptions as AsyncDagSource<T, R, ID>),
    };
  }
  const traversal = new AsyncDagTraversal<T, R, ID>(traversalConfig);
  if (onReadyVisitor) {
    traversal.addVisitorFor(DagTraversalOrder.ON_READY, onReadyVisitor);
  }
  if (onCompleteVisitor) {
    traversal.addVisitorFor(DagTraversalOrder.ON_COMPLETE, onCompleteVisitor);
  }
  return traversal.makeRunner().run();
}
