import type { InternalResolvedGraphView } from '@core/ResolvedGraphView';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { VertexRef } from '@core/graph/types';

/** A forest view: the scheduler's root remains private structural bookkeeping. */
export function makeDagGraphView<T extends VertexTypes, ID = unknown>(
  graph: InternalResolvedGraphView<T, ID>,
  hiddenRoot: () => VertexRef<T> | null,
): InternalResolvedGraphView<T, ID> {
  const visible = (ref: VertexRef<T>) => ref !== hiddenRoot();
  const getVertexRefById = (id: ID) => {
    const ref = graph.getVertexRefById(id);
    return ref !== null && visible(ref) ? ref : null;
  };
  const getVertexId = (ref: VertexRef<T>) => {
    if (!visible(ref)) throw new Error('Unknown vertex reference');
    return graph.getVertexId(ref);
  };
  return Object.freeze({
    get: (ref: VertexRef<T>) => {
      const vertex = visible(ref) ? graph.get(ref) : null;
      return vertex === null
        ? null
        : Object.freeze({
            ...vertex,
            discoveryDepth: vertex.discoveryDepth - 1,
            incoming: Object.freeze(
              vertex.incoming.filter((edge) => visible(edge.parentRef)),
            ),
          });
    },
    has: (ref: VertexRef<T>) => visible(ref) && graph.has(ref),
    getRoot: () => null,
    getVertexRefs: () => graph.getVertexRefs().filter(visible),
    getVertexRefById,
    getVertexId,
    getVisitStageOf: (ref: VertexRef<T>) =>
      visible(ref) ? graph.getVisitStageOf(ref) : null,
    getParentsOf: (ref: VertexRef<T>) =>
      visible(ref) ? graph.getParentsOf(ref)?.filter(visible) ?? null : null,
    getChildrenOf: (ref: VertexRef<T>) =>
      visible(ref) ? graph.getChildrenOf(ref) : null,
    getPathsTo: (
      ref: VertexRef<T>,
      options?: import('@core/ResolvedTree').GetPathToOptions,
    ) => {
      if (!visible(ref)) throw new Error('Unknown vertex reference');
      return graph
        .getPathsTo(ref)
        .map((path) => path.filter(visible))
        .filter((path) =>
          graph.getParentsOf(path[0]!)!.every((parent) => !visible(parent)),
        )
        .map((path) => (options?.noSelf === true ? path.slice(0, -1) : path));
    },
  });
}
