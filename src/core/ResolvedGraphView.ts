import type { MutableRef } from '@core/CTTRef';
import type { GetPathToOptions } from '@core/ResolvedTree';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type {
  InternalResolvedGraphVertex,
  ResolvedVisitStage,
} from '@core/graph/types';

export interface InternalResolvedGraphView<
  T extends VertexTypes,
  ID = unknown,
> {
  get(ref: MutableRef<Vertex<T>>): InternalResolvedGraphVertex<T, ID> | null;
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

import type { VertexHandle } from './CTTRef';
import type { ResolvedGraphVertex } from './graph/types';
export interface ResolvedGraphView<T extends VertexTypes, ID = unknown> {
  get(ref: VertexHandle<T>): ResolvedGraphVertex<T, ID> | null;
  has(ref: VertexHandle<T>): boolean;
  getRoot(): VertexHandle<T> | null;
  getVertexRefs(): readonly VertexHandle<T>[];
  getVertexRefById(id: ID): VertexHandle<T> | null;
  getVertexId(ref: VertexHandle<T>): ID;
  getVisitStageOf(ref: VertexHandle<T>): ResolvedVisitStage | null;
  getParentsOf(ref: VertexHandle<T>): readonly VertexHandle<T>[] | null;
  getChildrenOf(ref: VertexHandle<T>): readonly VertexHandle<T>[] | null;
  getPathsTo(
    ref: VertexHandle<T>,
    options?: GetPathToOptions,
  ): readonly (readonly VertexHandle<T>[])[];
}

export type OriginalGraphView<T extends VertexTypes, ID = unknown> = Pick<
  ResolvedGraphView<T, ID>,
  | 'has'
  | 'getRoot'
  | 'getVertexRefs'
  | 'getVertexRefById'
  | 'getVertexId'
  | 'getParentsOf'
  | 'getChildrenOf'
  | 'getPathsTo'
>;
