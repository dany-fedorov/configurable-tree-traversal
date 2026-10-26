import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { Ref } from '@core/graph/types';

/** A forest view: the scheduler's root remains private structural bookkeeping. */
export function makeDagGraphView<T extends VertexTypes, ID = unknown>(
  graph: ResolvedGraph<T, ID>,
  hiddenRoot: () => Ref<T> | null,
): ResolvedGraph<T, ID> {
  const visible = (ref: Ref<T>) => ref !== hiddenRoot();
  const getVertexRefById = (id: ID) => {
    const ref = graph.getVertexRefById(id);
    return ref !== null && visible(ref) ? ref : null;
  };
  const getVertexId = (ref: Ref<T>) => {
    if (!visible(ref)) throw new Error('Unknown vertex reference');
    return graph.getVertexId(ref);
  };
  return Object.freeze({
    get: (ref: Ref<T>) => {
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
    has: (ref: Ref<T>) => visible(ref) && graph.has(ref),
    getRoot: () => null,
    getVertexRefs: () => graph.getVertexRefs().filter(visible),
    getVertexRefById,
    getVertexId,
    getVertexById: getVertexRefById,
    getIdOf: getVertexId,
    getStatusOf: (ref: Ref<T>) =>
      visible(ref) ? graph.getStatusOf(ref) : null,
    getParentsOf: (ref: Ref<T>) =>
      visible(ref) ? graph.getParentsOf(ref)?.filter(visible) ?? null : null,
    getChildrenOf: (ref: Ref<T>) =>
      visible(ref) ? graph.getChildrenOf(ref) : null,
    getPathsTo: (
      ref: Ref<T>,
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
