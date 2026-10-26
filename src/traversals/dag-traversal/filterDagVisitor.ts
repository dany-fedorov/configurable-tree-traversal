import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DagVisitorPhase } from './lib/DagTraversalOrder';
import type {
  AsyncDagVisitor,
  DagVisitor,
  DagVisitorContext,
} from './lib/DagTraversalVisitor';

type FilteredVisitor<
  DATA,
  T extends VertexTypes,
  R extends VertexTypes,
  ORDER extends DagVisitorPhase,
  ID,
> = ReturnType<DagVisitor<T, R, ORDER, ID>> extends infer RESULT
  ? (data: DATA, options: DagVisitorContext<T, R, ORDER, ID>) => RESULT
  : never;

type AsyncFilteredVisitor<
  DATA,
  T extends VertexTypes,
  R extends VertexTypes,
  ORDER extends DagVisitorPhase,
  ID,
> = ReturnType<AsyncDagVisitor<T, R, ORDER, ID>> extends infer RESULT
  ? (data: DATA, options: DagVisitorContext<T, R, ORDER, ID>) => RESULT
  : never;

/** Filter current vertex data; a guard narrows data, never the live graph context. */
export function filterDagVisitor<
  DATA,
  NARROWED extends DATA,
  T extends VertexTypes<DATA> = VertexTypes<DATA>,
  R extends VertexTypes<DATA> = T,
  ORDER extends DagVisitorPhase = DagVisitorPhase,
  ID = unknown,
>(
  predicate: (data: DATA) => data is NARROWED,
  visitor: FilteredVisitor<NARROWED, T, R, ORDER, ID>,
): DagVisitor<T, R, ORDER, ID>;
export function filterDagVisitor<
  DATA,
  T extends VertexTypes<DATA> = VertexTypes<DATA>,
  R extends VertexTypes<DATA> = T,
  ORDER extends DagVisitorPhase = DagVisitorPhase,
  ID = unknown,
>(
  predicate: (data: DATA) => boolean,
  visitor: FilteredVisitor<DATA, T, R, ORDER, ID>,
): DagVisitor<T, R, ORDER, ID>;
export function filterDagVisitor<
  DATA,
  NARROWED extends DATA,
  T extends VertexTypes<DATA>,
  R extends VertexTypes<DATA>,
  ORDER extends DagVisitorPhase,
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
  T extends VertexTypes<DATA> = VertexTypes<DATA>,
  R extends VertexTypes<DATA> = T,
  ORDER extends DagVisitorPhase = DagVisitorPhase,
  ID = unknown,
>(
  predicate: (data: DATA) => data is NARROWED,
  visitor: AsyncFilteredVisitor<NARROWED, T, R, ORDER, ID>,
): AsyncDagVisitor<T, R, ORDER, ID>;
export function filterAsyncDagVisitor<
  DATA,
  T extends VertexTypes<DATA> = VertexTypes<DATA>,
  R extends VertexTypes<DATA> = T,
  ORDER extends DagVisitorPhase = DagVisitorPhase,
  ID = unknown,
>(
  predicate: (data: DATA) => boolean,
  visitor: AsyncFilteredVisitor<DATA, T, R, ORDER, ID>,
): AsyncDagVisitor<T, R, ORDER, ID>;
export function filterAsyncDagVisitor<
  DATA,
  NARROWED extends DATA,
  T extends VertexTypes<DATA>,
  R extends VertexTypes<DATA>,
  ORDER extends DagVisitorPhase,
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
