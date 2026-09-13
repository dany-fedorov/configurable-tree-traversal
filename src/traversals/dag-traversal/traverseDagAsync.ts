import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { AsyncDagTraversal } from './AsyncDagTraversal';
import type {
  AsyncDagSource,
  AsyncDagTraversalConfigureInput,
} from './lib/AsyncDagTraversalInstanceConfig';
import { DagTraversalOrder } from './lib/DagTraversalOrder';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import type { AsyncDagVisitor } from './lib/DagTraversalVisitor';

export type AsyncDagTraversalVisitorsSimple<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  onReadyVisitor?: AsyncDagVisitor<T, R>;
  onCompleteVisitor?: AsyncDagVisitor<T, R>;
};

export type AsyncDagTraversalHelperConfig<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = Omit<
  AsyncDagTraversalConfigureInput<T, R>,
  'traversableGraph' | 'traversableTree'
>;

export function traverseDagAsync<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  source: AsyncDagSource<T, R>,
  visitors: AsyncDagTraversalVisitorsSimple<T, R> | null,
  config?: AsyncDagTraversalHelperConfig<T, R>,
): Promise<AsyncDagTraversalRunner<T, R>> {
  const traversal = new AsyncDagTraversal<T, R>({ ...config, ...source });
  if (visitors?.onReadyVisitor) {
    traversal.addVisitorFor(
      DagTraversalOrder.ON_READY,
      visitors.onReadyVisitor,
    );
  }
  if (visitors?.onCompleteVisitor) {
    traversal.addVisitorFor(
      DagTraversalOrder.ON_COMPLETE,
      visitors.onCompleteVisitor,
    );
  }
  return traversal.makeRunner().run();
}
