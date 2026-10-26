import type { VertexTypes } from '@core/TreeTypeParameters';
import { AsyncDagTraversal } from './AsyncDagTraversal';
import type {
  AsyncDagOptions,
  AsyncDagOptionsPatch,
  AsyncDagSource,
} from './lib/AsyncDagTraversalInstanceConfig';
import type { AsyncDagTraversalRunner } from './lib/AsyncDagTraversalRunner';
import { DagVisitorPhase } from './lib/DagTraversalOrder';
import type { AsyncDagVisitor } from './lib/DagTraversalVisitor';

export type AsyncDagTraversalVisitorsSimple<
  T extends VertexTypes,
  R extends VertexTypes,
  ID = unknown,
> = {
  onReadyVisitor?: AsyncDagVisitor<T, R, DagVisitorPhase.ON_WORK_READY, ID>;
  onCompleteVisitor?: AsyncDagVisitor<
    T,
    R,
    DagVisitorPhase.ON_SUBGRAPH_READY,
    ID
  >;
};

export function traverseDagAsync<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  options: AsyncDagOptions<T, R, ID>,
): Promise<AsyncDagTraversalRunner<T, R, ID>>;
/** @deprecated Pass a single options object with a phase-keyed visitors map. */
export function traverseDagAsync<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  source: AsyncDagSource<T, R, ID>,
  visitors: AsyncDagTraversalVisitorsSimple<T, R, ID> | null,
  config?: Omit<
    AsyncDagOptionsPatch<T, R, ID>,
    'traversableGraph' | 'traversableTree'
  >,
): Promise<AsyncDagTraversalRunner<T, R, ID>>;
export function traverseDagAsync<
  T extends VertexTypes = VertexTypes,
  R extends VertexTypes = T,
  ID = unknown,
>(
  sourceOrOptions: AsyncDagSource<T, R, ID> | AsyncDagOptions<T, R, ID>,
  visitors?: AsyncDagTraversalVisitorsSimple<T, R, ID> | null,
  config?: Omit<
    AsyncDagOptionsPatch<T, R, ID>,
    'traversableGraph' | 'traversableTree'
  >,
): Promise<AsyncDagTraversalRunner<T, R, ID>> {
  let traversalConfig: AsyncDagOptions<T, R, ID>;
  const onReadyVisitor = visitors?.onReadyVisitor;
  const onCompleteVisitor = visitors?.onCompleteVisitor;
  if (arguments.length === 1) {
    traversalConfig = sourceOrOptions as AsyncDagOptions<T, R, ID>;
  } else {
    traversalConfig = {
      ...config,
      ...(sourceOrOptions as AsyncDagSource<T, R, ID>),
    };
  }
  const traversal = new AsyncDagTraversal<T, R, ID>(traversalConfig);
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
