import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { DagTraversalOrder } from './lib/DagTraversalOrder';
import type {
  AsyncDagVisitor,
  DagVisitor,
  DagVisitorOptions,
} from './lib/DagTraversalVisitor';

type FilteredVisitor<
  DATA,
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ORDER extends DagTraversalOrder,
  ID,
> = ReturnType<DagVisitor<T, R, ORDER, ID>> extends infer RESULT
  ? (data: DATA, options: DagVisitorOptions<T, R, ORDER, ID>) => RESULT
  : never;

type AsyncFilteredVisitor<
  DATA,
  T extends TreeTypeParameters,
  R extends TreeTypeParameters,
  ORDER extends DagTraversalOrder,
  ID,
> = ReturnType<AsyncDagVisitor<T, R, ORDER, ID>> extends infer RESULT
  ? (data: DATA, options: DagVisitorOptions<T, R, ORDER, ID>) => RESULT
  : never;

/** Filter current vertex data; a guard narrows data, never the live graph context. */
export function filterDagVisitor<
  DATA,
  NARROWED extends DATA,
  T extends TreeTypeParameters<DATA> = TreeTypeParameters<DATA>,
  R extends TreeTypeParameters<DATA> = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
>(
  predicate: (data: DATA) => data is NARROWED,
  visitor: FilteredVisitor<NARROWED, T, R, ORDER, ID>,
): DagVisitor<T, R, ORDER, ID>;
export function filterDagVisitor<
  DATA,
  T extends TreeTypeParameters<DATA> = TreeTypeParameters<DATA>,
  R extends TreeTypeParameters<DATA> = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
>(
  predicate: (data: DATA) => boolean,
  visitor: FilteredVisitor<DATA, T, R, ORDER, ID>,
): DagVisitor<T, R, ORDER, ID>;
export function filterDagVisitor<
  DATA,
  NARROWED extends DATA,
  T extends TreeTypeParameters<DATA>,
  R extends TreeTypeParameters<DATA>,
  ORDER extends DagTraversalOrder,
  ID,
>(
  predicate: (data: DATA) => boolean,
  visitor: FilteredVisitor<NARROWED, T, R, ORDER, ID>,
): DagVisitor<T, R, ORDER, ID> {
  return ((vertex, options) => {
    const data = vertex.getData();
    // The guard overload proves this narrowing; the boolean overload keeps DATA.
    return predicate(data) ? visitor(data as NARROWED, options) : undefined;
  }) as DagVisitor<T, R, ORDER, ID>;
}

/** Async callbacks retain their original promise and exact rejection value. */
export function filterAsyncDagVisitor<
  DATA,
  NARROWED extends DATA,
  T extends TreeTypeParameters<DATA> = TreeTypeParameters<DATA>,
  R extends TreeTypeParameters<DATA> = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
>(
  predicate: (data: DATA) => data is NARROWED,
  visitor: AsyncFilteredVisitor<NARROWED, T, R, ORDER, ID>,
): AsyncDagVisitor<T, R, ORDER, ID>;
export function filterAsyncDagVisitor<
  DATA,
  T extends TreeTypeParameters<DATA> = TreeTypeParameters<DATA>,
  R extends TreeTypeParameters<DATA> = T,
  ORDER extends DagTraversalOrder = DagTraversalOrder,
  ID = unknown,
>(
  predicate: (data: DATA) => boolean,
  visitor: AsyncFilteredVisitor<DATA, T, R, ORDER, ID>,
): AsyncDagVisitor<T, R, ORDER, ID>;
export function filterAsyncDagVisitor<
  DATA,
  NARROWED extends DATA,
  T extends TreeTypeParameters<DATA>,
  R extends TreeTypeParameters<DATA>,
  ORDER extends DagTraversalOrder,
  ID,
>(
  predicate: (data: DATA) => boolean,
  visitor: AsyncFilteredVisitor<NARROWED, T, R, ORDER, ID>,
): AsyncDagVisitor<T, R, ORDER, ID> {
  return ((vertex, options) => {
    const data = vertex.getData();
    return predicate(data) ? visitor(data as NARROWED, options) : undefined;
  }) as AsyncDagVisitor<T, R, ORDER, ID>;
}
