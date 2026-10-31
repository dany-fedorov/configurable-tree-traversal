import type { InternalResolvedGraphView } from '@core/ResolvedGraphView';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { InternalVertexRef } from '@core/graph/types';

/** A forest view: the scheduler's root remains private structural bookkeeping. */
export function makeDagGraphView<T extends VertexTypes, ID = unknown>(
  graph: InternalResolvedGraphView<T, ID>,
  hiddenRoot: () => InternalVertexRef<T> | null,
): InternalResolvedGraphView<T, ID> {
  const visible = (ref: InternalVertexRef<T>) => ref !== hiddenRoot();
  const getVertexRefById = (id: ID) => {
    const ref = graph.getVertexRefById(id);
    return ref !== null && visible(ref) ? ref : null;
  };
  const requireVertexId = (ref: InternalVertexRef<T>) => {
    if (!visible(ref)) throw new Error('Unknown vertex reference');
    return graph.requireVertexId(ref);
  };
  return Object.freeze({
    get: (ref: InternalVertexRef<T>) => {
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
    has: (ref: InternalVertexRef<T>) => visible(ref) && graph.has(ref),
    getRoot: () => null,
    getVertexRefs: () => graph.getVertexRefs().filter(visible),
    getVertexRefById,
    requireVertexId,
    getVisitStageOf: (ref: InternalVertexRef<T>) =>
      visible(ref) ? graph.getVisitStageOf(ref) : null,
    getParentsOf: (ref: InternalVertexRef<T>) =>
      visible(ref) ? graph.getParentsOf(ref)?.filter(visible) ?? null : null,
    getChildrenOf: (ref: InternalVertexRef<T>) =>
      visible(ref) ? graph.getChildrenOf(ref) : null,
    requirePathsTo: (
      ref: InternalVertexRef<T>,
      options?: import('@core/ResolvedTree').GetPathToOptions,
    ) => {
      if (!visible(ref)) throw new Error('Unknown vertex reference');
      return graph
        .requirePathsTo(ref)
        .map((path) => path.filter(visible))
        .filter((path) =>
          graph.getParentsOf(path[0]!)!.every((parent) => !visible(parent)),
        )
        .map((path) => (options?.noSelf === true ? path.slice(0, -1) : path));
    },
  });
}
