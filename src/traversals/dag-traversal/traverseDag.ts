import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { VertexTypes } from '@core/TreeTypeParameters';
import { DagTraversal } from './DagTraversal';
import type {
  DagSource,
  DagTraversalInstanceConfigInput,
  DagTraversalConfigureInput,
} from './lib/DagTraversalInstanceConfig';
import { DagVisitorPhase } from './lib/DagTraversalOrder';
import type { DagTraversalRunner } from './lib/DagTraversalRunner';
import type { DagVisitor } from './lib/DagTraversalVisitor';

export type DagTraversalVisitorsSimple<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = {
  onReadyVisitor?: DagVisitor<T, R, DagVisitorPhase.ON_WORK_READY, ID>;
  onCompleteVisitor?: DagVisitor<T, R, DagVisitorPhase.ON_SUBGRAPH_READY, ID>;
};

export type DagTraversalHelperConfig<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = Omit<
  DagTraversalConfigureInput<T, R, ID>,
  'traversableGraph' | 'traversableTree'
>;

/** Options for a single-call Dag traversal with phase-keyed callbacks. */
export type DagTraversalHelperOptions<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
> = Omit<DagTraversalHelperConfig<T, R, ID>, 'visitors'> &
  DagSource<T, R, ID> & {
    visitors?: {
      [K in DagVisitorPhase]?: VisitorPhaseInput<DagVisitor<T, R, K, ID>>;
    };
  };

export function traverseDag<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(options: DagTraversalHelperOptions<T, R, ID>): DagTraversalRunner<T, R, ID>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDag<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  source: DagSource<T, R, ID>,
  visitors: DagTraversalVisitorsSimple<T, R, ID> | null,
  config?: DagTraversalHelperConfig<T, R, ID>,
): DagTraversalRunner<T, R, ID>;
export function traverseDag<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  sourceOrOptions: DagSource<T, R, ID> | DagTraversalHelperOptions<T, R, ID>,
  visitors?: DagTraversalVisitorsSimple<T, R, ID> | null,
  config?: DagTraversalHelperConfig<T, R, ID>,
): DagTraversalRunner<T, R, ID> {
  let traversalConfig: DagTraversalInstanceConfigInput<T, R, ID>;
  const onReadyVisitor = visitors?.onReadyVisitor;
  const onCompleteVisitor = visitors?.onCompleteVisitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as DagTraversalHelperOptions<T, R, ID>;
  } else {
    traversalConfig = {
      ...config,
      ...(sourceOrOptions as DagSource<T, R, ID>),
    };
  }
  const traversal = new DagTraversal<T, R, ID>(traversalConfig);
  if (onReadyVisitor) {
    traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, onReadyVisitor);
  }
  if (onCompleteVisitor) {
    traversal.addVisitorFor(DagVisitorPhase.ON_SUBGRAPH_READY, onCompleteVisitor);
  }
  return traversal.createRunner().run();
}
