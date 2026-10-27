import type { MutableRef } from '@core/CTTRef';
import type { GetPathToOptions } from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type {
  ResolvedGraphVertex,
  ResolvedVisitStage,
} from '@core/graph/types';

export interface ResolvedGraph<T extends VertexTypes, ID = unknown> {
  get(ref: MutableRef<Vertex<T>>): ResolvedGraphVertex<T, ID> | null;
  has(ref: MutableRef<Vertex<T>>): boolean;
  getRoot(): MutableRef<Vertex<T>> | null;
  getVertexRefs(): MutableRef<Vertex<T>>[];
  getVertexRefById(id: ID): MutableRef<Vertex<T>> | null;
  getVertexId(ref: MutableRef<Vertex<T>>): ID;
  getVisitStageOf(ref: MutableRef<Vertex<T>>): ResolvedVisitStage | null;
  getParentsOf(ref: MutableRef<Vertex<T>>): MutableRef<Vertex<T>>[] | null;
  getChildrenOf(ref: MutableRef<Vertex<T>>): MutableRef<Vertex<T>>[] | null;
  getPathsTo(
    ref: MutableRef<Vertex<T>>,
    options?: GetPathToOptions,
  ): MutableRef<Vertex<T>>[][];
}

export type OriginalGraphView<T extends VertexTypes, ID = unknown> = Pick<
  ResolvedGraph<T, ID>,
  | 'has'
  | 'getRoot'
  | 'getVertexRefs'
  | 'getVertexRefById'
  | 'getVertexId'
  | 'getParentsOf'
  | 'getChildrenOf'
  | 'getPathsTo'
>;
