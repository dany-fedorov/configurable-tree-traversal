import type { CTTRef } from '@core/CTTRef';
import type { GetPathToOptions } from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type { GraphVertex, GraphVertexStatus } from '@core/graph/types';

export interface ResolvedGraph<T extends VertexTypes, ID = unknown> {
  get(ref: CTTRef<Vertex<T>>): GraphVertex<T, ID> | null;
  has(ref: CTTRef<Vertex<T>>): boolean;
  getRoot(): CTTRef<Vertex<T>> | null;
  getVertexRefs(): CTTRef<Vertex<T>>[];
  getVertexRefById(id: ID): CTTRef<Vertex<T>> | null;
  getVertexId(ref: CTTRef<Vertex<T>>): ID;
  /** @deprecated Use getVertexRefById. */
  getVertexById(id: ID): CTTRef<Vertex<T>> | null;
  /** @deprecated Use getVertexId. */
  getIdOf(ref: CTTRef<Vertex<T>>): ID;
  getStatusOf(ref: CTTRef<Vertex<T>>): GraphVertexStatus | null;
  getParentsOf(ref: CTTRef<Vertex<T>>): CTTRef<Vertex<T>>[] | null;
  getChildrenOf(ref: CTTRef<Vertex<T>>): CTTRef<Vertex<T>>[] | null;
  getPathsTo(
    ref: CTTRef<Vertex<T>>,
    options?: GetPathToOptions,
  ): CTTRef<Vertex<T>>[][];
}

export type ResolvedGraphSnapshot<
  T extends VertexTypes,
  ID = unknown,
> = Pick<
  ResolvedGraph<T, ID>,
  | 'has'
  | 'getRoot'
  | 'getVertexRefs'
  | 'getVertexRefById'
  | 'getVertexId'
  | 'getVertexById'
  | 'getIdOf'
  | 'getParentsOf'
  | 'getChildrenOf'
  | 'getPathsTo'
>;
