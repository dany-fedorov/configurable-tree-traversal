import type { MutableRef, VertexHandle } from './CTTRef';
import type { Vertex, VertexView, VertexCloneContent } from './Vertex';
import type { VertexTypes } from './TreeTypeParameters';
import type {
  InternalVertexResolutionContext,
  VertexResolutionContext,
} from './ResolvedTree';
import type {
  InternalResolvedGraphView,
  ResolvedGraphView,
  OriginalGraphView,
} from './ResolvedGraphView';
import { normalizePathOptions } from './normalizePathOptions';

const handles = new WeakMap<object, object>();
const refs = new WeakMap<object, object>();
const vertices = new WeakMap<object, object>();
const contexts = new WeakMap<object, object>();
const graphs = new WeakMap<object, object>();

export function vertexView<T extends VertexTypes>(
  vertex: Vertex<T>,
): VertexView<T> {
  let view = vertices.get(vertex) as VertexView<T> | undefined;
  if (view === undefined) {
    // Cache the facet identity, not mutable standalone Vertex hint contents.
    const getChildHints = () => Object.freeze(vertex.getChildHints().slice());
    view = Object.freeze({
      $data: vertex.getData(),
      get $childHints() {
        return getChildHints();
      },
      getData: () => vertex.getData(),
      getChildHints,
      hasNoChildHints: () => vertex.hasNoChildHints(),
      clone: (content?: VertexCloneContent<T>) => vertex.clone(content),
    });
    vertices.set(vertex, view);
  }
  return view;
}

export function vertexHandle<T extends VertexTypes>(
  ref: MutableRef<Vertex<T>>,
): VertexHandle<T>;
export function vertexHandle<T extends VertexTypes>(
  ref: MutableRef<Vertex<T>> | null,
): VertexHandle<T> | null;
export function vertexHandle<T extends VertexTypes>(
  ref: MutableRef<Vertex<T>> | null,
): VertexHandle<T> | null {
  if (ref === null) return null;
  let handle = handles.get(ref) as VertexHandle<T> | undefined;
  if (handle === undefined) {
    handle = Object.freeze({
      getRefId: () => ref.getRefId(),
      getValue: () => vertexView(ref.getValue()),
    });
    handles.set(ref, handle);
    refs.set(handle, ref);
  }
  return handle;
}

/** Unknown/forged objects stay unknown to identity-based stores; never trust their methods. */
export function internalRef<T extends VertexTypes>(
  handle: VertexHandle<T>,
): MutableRef<Vertex<T>> {
  return (refs.get(handle) ?? handle) as MutableRef<Vertex<T>>;
}

export function resolutionContextView<T extends VertexTypes>(
  context: InternalVertexResolutionContext<T> | null,
): VertexResolutionContext<T> | null {
  if (context === null) return null;
  let view = contexts.get(context) as VertexResolutionContext<T> | undefined;
  if (view === undefined) {
    view = Object.freeze({
      ...context,
      parentVertex: vertexView(context.parentVertex),
      parentVertexRef: vertexHandle(context.parentVertexRef),
    });
    contexts.set(context, view);
  }
  return view;
}

type InternalOriginalGraphView<T extends VertexTypes, ID> = Omit<
  InternalResolvedGraphView<T, ID>,
  'get' | 'getVisitStageOf'
>;
export function originalGraphView<T extends VertexTypes, ID>(
  graph: InternalOriginalGraphView<T, ID>,
): OriginalGraphView<T, ID> {
  const list = (values: MutableRef<Vertex<T>>[]) =>
    Object.freeze(values.map((ref) => vertexHandle(ref)));
  return Object.freeze({
    has: (ref: VertexHandle<T>) => graph.has(internalRef(ref)),
    getRoot: () => vertexHandle(graph.getRoot()),
    getVertexRefs: () => list(graph.getVertexRefs()),
    getVertexRefById: (id: ID) => vertexHandle(graph.getVertexRefById(id)),
    requireVertexId: (ref: VertexHandle<T>) =>
      graph.requireVertexId(internalRef(ref)),
    getParentsOf: (ref: VertexHandle<T>) => {
      const values = graph.getParentsOf(internalRef(ref));
      return values === null ? null : list(values);
    },
    getChildrenOf: (ref: VertexHandle<T>) => {
      const values = graph.getChildrenOf(internalRef(ref));
      return values === null ? null : list(values);
    },
    requirePathsTo: (
      ref: VertexHandle<T>,
      options?: import('./ResolvedTree').GetPathToOptions,
    ) =>
      Object.freeze(
        graph
          .requirePathsTo(internalRef(ref), normalizePathOptions(options))
          .map(list),
      ),
  });
}

export function resolvedGraphView<T extends VertexTypes, ID>(
  graph: InternalResolvedGraphView<T, ID>,
): ResolvedGraphView<T, ID> {
  let view = graphs.get(graph) as ResolvedGraphView<T, ID> | undefined;
  if (view === undefined) {
    view = Object.freeze({
      ...originalGraphView(graph),
      getVisitStageOf: (ref: VertexHandle<T>) =>
        graph.getVisitStageOf(internalRef(ref)),
      get: (ref: VertexHandle<T>) => {
        const record = graph.get(internalRef(ref));
        return record === null
          ? null
          : Object.freeze({
              ...record,
              dependsOnWork: Object.freeze(record.dependsOnWork.slice()),
              ...(record.dependsOnSubgraphCompletion === undefined
                ? {}
                : {
                    dependsOnSubgraphCompletion: Object.freeze(
                      record.dependsOnSubgraphCompletion.slice(),
                    ),
                  }),
              vertexRef: vertexHandle(record.vertexRef),
              vertex: vertexView(record.vertex),
              incoming: Object.freeze(
                record.incoming.map((edge) =>
                  Object.freeze({
                    ...edge,
                    parentRef: vertexHandle(edge.parentRef),
                    childRef: vertexHandle(edge.childRef),
                  }),
                ),
              ),
              slots: Object.freeze(
                record.slots.map((slot) =>
                  Object.freeze(
                    slot.kind === 'linked'
                      ? { ...slot, childRef: vertexHandle(slot.childRef) }
                      : slot.kind === 'omitted'
                      ? {
                          ...slot,
                          identity:
                            slot.identity === null
                              ? null
                              : Object.freeze({
                                  vertexId: slot.identity.vertexId,
                                }),
                        }
                      : { ...slot },
                  ),
                ),
              ),
            });
      },
    });
    graphs.set(graph, view);
  }
  return view;
}
