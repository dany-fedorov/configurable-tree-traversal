import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import { DagTraversal } from './DagTraversal';
import type {
  DagSource,
  DagTraversalConfigureInput,
} from './lib/DagTraversalInstanceConfig';
import { DagTraversalOrder } from './lib/DagTraversalOrder';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';
import type { DagVisitor } from './lib/DagTraversalVisitor';

export type DagTraversalVisitorsSimple<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = {
  onReadyVisitor?: DagVisitor<T, R>;
  onCompleteVisitor?: DagVisitor<T, R>;
};

export type DagTraversalHelperConfig<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
> = Omit<
  DagTraversalConfigureInput<T, R>,
  'traversableGraph' | 'traversableTree'
>;

export function traverseDag<
  T extends TreeTypeParameters = TreeTypeParameters,
  R extends TreeTypeParameters = T,
>(
  source: DagSource<T, R>,
  visitors: DagTraversalVisitorsSimple<T, R> | null,
  config?: DagTraversalHelperConfig<T, R>,
): DagTraversalRunner<T, R> {
  const traversal = new DagTraversal<T, R>({ ...config, ...source });
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
