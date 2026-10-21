import type { ResolvedGraph } from '@core/ResolvedGraph';
import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type { Ref } from '@core/graph/types';

/** A forest view: the scheduler's root remains private structural bookkeeping. */
export function makeDagGraphView<T extends TreeTypeParameters>(
  graph: ResolvedGraph<T>,
  hiddenRoot: () => Ref<T> | null,
): ResolvedGraph<T> {
  const visible = (ref: Ref<T>) => ref !== hiddenRoot();
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
    getVertexById: (id: unknown) => {
      const ref = graph.getVertexById(id);
      return ref !== null && visible(ref) ? ref : null;
    },
    getIdOf: (ref: Ref<T>) => {
      if (!visible(ref)) throw new Error('Unknown vertex reference');
      return graph.getIdOf(ref);
    },
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
