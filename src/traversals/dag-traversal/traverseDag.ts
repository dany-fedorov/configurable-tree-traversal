import type { VertexTypes } from '@core/TreeTypeParameters';
import { DagTraversal } from './DagTraversal';
import type {
  DagOptions,
  DagOptionsPatch,
  DagSource,
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

export function traverseDag<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(options: DagOptions<T, R, ID>): DagTraversalRunner<T, R, ID>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDag<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  source: DagSource<T, R, ID>,
  visitors: DagTraversalVisitorsSimple<T, R, ID> | null,
  config?: Omit<
    DagOptionsPatch<T, R, ID>,
    'traversableGraph' | 'traversableTree'
  >,
): DagTraversalRunner<T, R, ID>;
export function traverseDag<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  sourceOrOptions: DagSource<T, R, ID> | DagOptions<T, R, ID>,
  visitors?: DagTraversalVisitorsSimple<T, R, ID> | null,
  config?: Omit<
    DagOptionsPatch<T, R, ID>,
    'traversableGraph' | 'traversableTree'
  >,
): DagTraversalRunner<T, R, ID> {
  let traversalConfig: DagOptions<T, R, ID>;
  const onReadyVisitor = visitors?.onReadyVisitor;
  const onCompleteVisitor = visitors?.onCompleteVisitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as DagOptions<T, R, ID>;
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
    traversal.addVisitorFor(
      DagVisitorPhase.ON_SUBGRAPH_READY,
      onCompleteVisitor,
    );
  }
  return traversal.createRunner().run();
}
