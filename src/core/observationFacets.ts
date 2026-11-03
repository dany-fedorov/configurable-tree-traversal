import type { MutableValueReference, VertexHandle } from './CTTRef';
import type { Vertex, VertexView } from './Vertex';
import type { VertexDataAndChildHintTypes } from './TreeTypeParameters';
import type {
  InternalChildDiscoveryContext,
  ChildDiscoveryContext,
} from './ResolvedTree';
import type {
  InternalResolvedGraphView,
  LiveResolvedGraphView,
  PreCommandDiscoveredGraphView,
} from './ResolvedGraphView';
import { normalizePathOptions } from './normalizePathOptions';

const handles = new WeakMap<object, object>();
const refs = new WeakMap<object, object>();
const vertices = new WeakMap<object, object>();
const contexts = new WeakMap<object, object>();
const graphs = new WeakMap<object, object>();

export function vertexView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(vertex: Vertex<InputVertexTypes>): VertexView<InputVertexTypes> {
  let view = vertices.get(vertex) as VertexView<InputVertexTypes> | undefined;
  if (view === undefined) {
    view = Object.freeze({
      $vertexData: vertex.getVertexData(),
      get $childDiscoveryHints() {
        return vertex.getDetachedChildDiscoveryHints();
      },
      getVertexData: () => vertex.getVertexData(),
      getDetachedChildDiscoveryHints: () =>
        vertex.getDetachedChildDiscoveryHints(),
      hasChildDiscoveryHints: () => vertex.hasChildDiscoveryHints(),
      createEditableShallowCloneWithContentOverrides: (
        content?: import('./Vertex').VertexContentOverridesForShallowClone<InputVertexTypes>,
      ) => vertex.createEditableShallowCloneWithContentOverrides(content),
    });
    vertices.set(vertex, view);
  }
  return view;
}

export function createVertexHandleFacet<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  ref: MutableValueReference<Vertex<InputVertexTypes>>,
): VertexHandle<InputVertexTypes>;
export function createVertexHandleFacet<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  ref: MutableValueReference<Vertex<InputVertexTypes>> | null,
): VertexHandle<InputVertexTypes> | null;
export function createVertexHandleFacet<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  ref: MutableValueReference<Vertex<InputVertexTypes>> | null,
): VertexHandle<InputVertexTypes> | null {
  if (ref === null) return null;
  let handle = handles.get(ref) as VertexHandle<InputVertexTypes> | undefined;
  if (handle === undefined) {
    handle = Object.freeze({
      getReferenceIdentity: () => ref.getReferenceIdentity(),
      getCurrentVertexView: () => vertexView(ref.getReferencedValue()),
    });
    handles.set(ref, handle);
    refs.set(handle, ref);
  }
  return handle;
}

/** Unknown/forged objects stay unknown to identity-based stores; never trust their methods. */
export function internalRef<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  handle: VertexHandle<InputVertexTypes>,
): MutableValueReference<Vertex<InputVertexTypes>> {
  return (refs.get(handle) ?? handle) as MutableValueReference<
    Vertex<InputVertexTypes>
  >;
}

export function resolutionContextView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
>(
  context: InternalChildDiscoveryContext<InputVertexTypes> | null,
): ChildDiscoveryContext<InputVertexTypes> | null {
  if (context === null) return null;
  let view = contexts.get(context) as
    | ChildDiscoveryContext<InputVertexTypes>
    | undefined;
  if (view === undefined) {
    view = Object.freeze({
      discoveryDepthInEdges: context.discoveryDepthInEdges,
      parentVertexAtChildResolution: vertexView(
        context.parentVertexAtChildResolution,
      ),
      parentVertexHandle: createVertexHandleFacet(context.parentVertexHandle),
      parentChildHintIndex: context.parentChildHintIndex,
      childDiscoveryHint: context.childDiscoveryHint,
    });
    contexts.set(context, view);
  }
  return view;
}

type InternalOriginalGraphView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
> = Omit<
  InternalResolvedGraphView<InputVertexTypes, VertexId>,
  'get' | 'getVertexVisitSchedulingStageOrNull'
>;
export function preCommandDiscoveredGraphView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  graph: InternalOriginalGraphView<InputVertexTypes, VertexId>,
): PreCommandDiscoveredGraphView<InputVertexTypes, VertexId> {
  const list = (values: MutableValueReference<Vertex<InputVertexTypes>>[]) =>
    Object.freeze(values.map((ref) => createVertexHandleFacet(ref)));
  return Object.freeze({
    containsVertexHandle: (ref: VertexHandle<InputVertexTypes>) =>
      graph.has(internalRef(ref)),
    getDesignatedRootHandleOrNull: () =>
      createVertexHandleFacet(graph.getRoot()),
    getVertexHandles: () => list(graph.getVertexRefs()),
    getVertexHandleByIdOrNull: (id: VertexId) =>
      createVertexHandleFacet(graph.getVertexRefById(id)),
    requireVertexId: (ref: VertexHandle<InputVertexTypes>) =>
      graph.requireVertexId(internalRef(ref)),
    getDistinctStructuralParentHandlesOrNull: (
      ref: VertexHandle<InputVertexTypes>,
    ) => {
      const values = graph.getParentsOf(internalRef(ref));
      return values === null ? null : list(values);
    },
    getStructuralChildHandlesInSlotOrderOrNull: (
      ref: VertexHandle<InputVertexTypes>,
    ) => {
      const values = graph.getChildrenOf(internalRef(ref));
      return values === null ? null : list(values);
    },
    requireAllStructuralAncestorPathsTo: (
      ref: VertexHandle<InputVertexTypes>,
      options?: import('./ResolvedTree').StructuralAncestorPathOptions,
    ) =>
      Object.freeze(
        graph
          .requirePathsTo(internalRef(ref), normalizePathOptions(options))
          .map(list),
      ),
  });
}

export function liveResolvedGraphView<
  InputVertexTypes extends VertexDataAndChildHintTypes,
  VertexId,
>(
  graph: InternalResolvedGraphView<InputVertexTypes, VertexId>,
): LiveResolvedGraphView<InputVertexTypes, VertexId> {
  let view = graphs.get(graph) as
    | LiveResolvedGraphView<InputVertexTypes, VertexId>
    | undefined;
  if (view === undefined) {
    view = Object.freeze({
      ...preCommandDiscoveredGraphView(graph),
      getVertexVisitSchedulingStageOrNull: (
        ref: VertexHandle<InputVertexTypes>,
      ) => graph.getVertexVisitSchedulingStageOrNull(internalRef(ref)),
      getVertexSnapshotOrNull: (ref: VertexHandle<InputVertexTypes>) => {
        const record = graph.get(internalRef(ref));
        return record === null
          ? null
          : Object.freeze({
              vertexHandle: createVertexHandleFacet(record.vertexHandle),
              vertex: vertexView(record.vertex),
              vertexId: record.vertexId,
              firstDiscoveryDepthInEdges: record.discoveryDepth,
              schedulingVisitStage: record.visitStage,
              workWaitsForWorkOf: Object.freeze(
                record.workWaitsForWorkOf.slice(),
              ),
              ...(record.workWaitsForSubgraphCompletionOf === undefined
                ? {}
                : {
                    workWaitsForSubgraphCompletionOf: Object.freeze(
                      record.workWaitsForSubgraphCompletionOf.slice(),
                    ),
                  }),
              incomingStructuralChildEdges: Object.freeze(
                record.incoming.map((edge) =>
                  Object.freeze({
                    parentVertexHandle: createVertexHandleFacet(edge.parentRef),
                    childVertexHandle: createVertexHandleFacet(edge.childRef),
                    parentChildHintIndex: edge.hintIndex,
                    childDiscoveryHint: edge.hint,
                  }),
                ),
              ),
              orderedChildDiscoverySlots: Object.freeze(
                record.slots.map(
                  (
                    slot,
                  ): import('./graph/types').ChildDiscoverySlot<
                    InputVertexTypes,
                    VertexId
                  > => {
                    const common = { childDiscoveryHint: slot.hint };
                    switch (slot.kind) {
                      case 'pending':
                        return Object.freeze({
                          ...common,
                          kind: 'awaitingResolution',
                        });
                      case 'linked':
                        return Object.freeze({
                          ...common,
                          kind: 'linkedToVertex',
                          childVertexHandle: createVertexHandleFacet(
                            slot.childRef,
                          ),
                        });
                      case 'omitted':
                        return Object.freeze({
                          ...common,
                          kind: 'omitted',
                          omittedVertexIdentity:
                            slot.identity === null
                              ? null
                              : Object.freeze({
                                  vertexId: slot.identity.vertexId,
                                }),
                        });
                      case 'deleted':
                        return Object.freeze({
                          ...common,
                          kind: 'targetDeleted',
                        });
                      case 'disabled':
                        return Object.freeze({
                          ...common,
                          kind: 'discoverySkipped',
                        });
                    }
                  },
                ),
              ),
            });
      },
    });
    graphs.set(graph, view);
  }
  return view;
}
