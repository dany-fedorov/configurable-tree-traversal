import type { MutableValueReference } from '@core/CTTRef';
import type { StructuralAncestorPathOptions } from '@core/ResolvedTree';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { Vertex } from '@core/Vertex';
import type {
  InternalResolvedGraphVertex,
  VertexVisitSchedulingStage,
} from '@core/graph/types';

export interface InternalResolvedGraphView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> {
  get(
    ref: MutableValueReference<Vertex<InputVertexTypes>>,
  ): InternalResolvedGraphVertex<InputVertexTypes, VertexId> | null;
  has(ref: MutableValueReference<Vertex<InputVertexTypes>>): boolean;
  getRoot(): MutableValueReference<Vertex<InputVertexTypes>> | null;
  getVertexRefs(): MutableValueReference<Vertex<InputVertexTypes>>[];
  getVertexRefById(
    id: VertexId,
  ): MutableValueReference<Vertex<InputVertexTypes>> | null;
  requireVertexId(
    ref: MutableValueReference<Vertex<InputVertexTypes>>,
  ): VertexId;
  getVertexVisitSchedulingStageOrNull(
    ref: MutableValueReference<Vertex<InputVertexTypes>>,
  ): VertexVisitSchedulingStage | null;
  getParentsOf(
    ref: MutableValueReference<Vertex<InputVertexTypes>>,
  ): MutableValueReference<Vertex<InputVertexTypes>>[] | null;
  getChildrenOf(
    ref: MutableValueReference<Vertex<InputVertexTypes>>,
  ): MutableValueReference<Vertex<InputVertexTypes>>[] | null;
  requirePathsTo(
    ref: MutableValueReference<Vertex<InputVertexTypes>>,
    options?: StructuralAncestorPathOptions,
  ): MutableValueReference<Vertex<InputVertexTypes>>[][];
}

import type { VertexHandle } from './CTTRef';
import type { ResolvedGraphVertexSnapshot } from './graph/types';
export interface LiveResolvedGraphView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> {
  getVertexSnapshotOrNull(
    ref: VertexHandle<InputVertexTypes>,
  ): ResolvedGraphVertexSnapshot<InputVertexTypes, VertexId> | null;
  containsVertexHandle(ref: VertexHandle<InputVertexTypes>): boolean;
  getDesignatedRootHandleOrNull(): VertexHandle<InputVertexTypes> | null;
  getVertexHandles(): readonly VertexHandle<InputVertexTypes>[];
  getVertexHandleByIdOrNull(
    id: VertexId,
  ): VertexHandle<InputVertexTypes> | null;
  requireVertexId(ref: VertexHandle<InputVertexTypes>): VertexId;
  getVertexVisitSchedulingStageOrNull(
    ref: VertexHandle<InputVertexTypes>,
  ): VertexVisitSchedulingStage | null;
  getDistinctStructuralParentHandlesOrNull(
    ref: VertexHandle<InputVertexTypes>,
  ): readonly VertexHandle<InputVertexTypes>[] | null;
  getStructuralChildHandlesInSlotOrderOrNull(
    ref: VertexHandle<InputVertexTypes>,
  ): readonly VertexHandle<InputVertexTypes>[] | null;
  requireAllStructuralAncestorPathsTo(
    ref: VertexHandle<InputVertexTypes>,
    options?: StructuralAncestorPathOptions,
  ): readonly (readonly VertexHandle<InputVertexTypes>[])[];
}

/** Live retained topology as discovery grows, with content captured before commands. */
export type LivePreCommandDiscoveredGraphView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
> = Pick<
  LiveResolvedGraphView<InputVertexTypes, VertexId>,
  | 'containsVertexHandle'
  | 'getDesignatedRootHandleOrNull'
  | 'getVertexHandles'
  | 'getVertexHandleByIdOrNull'
  | 'requireVertexId'
  | 'getDistinctStructuralParentHandlesOrNull'
  | 'getStructuralChildHandlesInSlotOrderOrNull'
  | 'requireAllStructuralAncestorPathsTo'
>;
