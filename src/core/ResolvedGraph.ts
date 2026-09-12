import type { CTTRef } from '@core/CTTRef';
import type { GetPathToOptions } from '@core/ResolvedTree';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type {
  GraphVertex,
  GraphVertexStatus,
  VertexId,
} from '@core/graph/types';

export interface ResolvedGraph<T extends TreeTypeParameters> {
  get(ref: CTTRef<Vertex<T>>): GraphVertex<T> | null;
  has(ref: CTTRef<Vertex<T>>): boolean;
  getRoot(): CTTRef<Vertex<T>> | null;
  getVertexRefs(): CTTRef<Vertex<T>>[];
  getVertexById(id: VertexId): CTTRef<Vertex<T>> | null;
  getIdOf(ref: CTTRef<Vertex<T>>): VertexId;
  getStatusOf(ref: CTTRef<Vertex<T>>): GraphVertexStatus | null;
  getParentsOf(ref: CTTRef<Vertex<T>>): CTTRef<Vertex<T>>[] | null;
  getChildrenOf(ref: CTTRef<Vertex<T>>): CTTRef<Vertex<T>>[] | null;
  getPathsTo(
    ref: CTTRef<Vertex<T>>,
    options?: GetPathToOptions,
  ): CTTRef<Vertex<T>>[][];
}

export type ResolvedGraphSnapshot<T extends TreeTypeParameters> = Pick<
  ResolvedGraph<T>,
  | 'has'
  | 'getRoot'
  | 'getVertexRefs'
  | 'getVertexById'
  | 'getIdOf'
  | 'getParentsOf'
  | 'getChildrenOf'
  | 'getPathsTo'
>;
