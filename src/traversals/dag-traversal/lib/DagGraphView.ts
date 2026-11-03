import type { InternalResolvedGraphView } from '@core/ResolvedGraphView';
import type { VertexDataAndChildHintTypes } from '@core/TreeTypeParameters';
import type { InternalVertexRef } from '@core/graph/types';

/** A forest view: the scheduler's root remains private structural bookkeeping. */
export function makeDagGraphView<
  SourceVertexTypes extends VertexDataAndChildHintTypes,
  VertexId = unknown,
>(
  graph: InternalResolvedGraphView<SourceVertexTypes, VertexId>,
  hiddenRoot: () => InternalVertexRef<SourceVertexTypes> | null,
): InternalResolvedGraphView<SourceVertexTypes, VertexId> {
  const visible = (ref: InternalVertexRef<SourceVertexTypes>) =>
    ref !== hiddenRoot();
  const getVertexRefById = (id: VertexId) => {
    const ref = graph.getVertexRefById(id);
    return ref !== null && visible(ref) ? ref : null;
  };
  const requireVertexId = (ref: InternalVertexRef<SourceVertexTypes>) => {
    if (!visible(ref)) throw new Error('Unknown vertex reference');
    return graph.requireVertexId(ref);
  };
  return Object.freeze({
    get: (ref: InternalVertexRef<SourceVertexTypes>) => {
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
    has: (ref: InternalVertexRef<SourceVertexTypes>) =>
      visible(ref) && graph.has(ref),
    getRoot: () => null,
    getVertexRefs: () => graph.getVertexRefs().filter(visible),
    getVertexRefById,
    requireVertexId,
    getVertexVisitSchedulingStageOrNull: (
      ref: InternalVertexRef<SourceVertexTypes>,
    ) => (visible(ref) ? graph.getVertexVisitSchedulingStageOrNull(ref) : null),
    getParentsOf: (ref: InternalVertexRef<SourceVertexTypes>) =>
      visible(ref) ? graph.getParentsOf(ref)?.filter(visible) ?? null : null,
    getChildrenOf: (ref: InternalVertexRef<SourceVertexTypes>) =>
      visible(ref) ? graph.getChildrenOf(ref) : null,
    requirePathsTo: (
      ref: InternalVertexRef<SourceVertexTypes>,
      options?: import('@core/ResolvedTree').StructuralAncestorPathOptions,
    ) => {
      if (!visible(ref)) throw new Error('Unknown vertex reference');
      return graph
        .requirePathsTo(ref)
        .map((path) => path.filter(visible))
        .filter((path) =>
          graph.getParentsOf(path[0]!)!.every((parent) => !visible(parent)),
        )
        .map((path) =>
          options?.includeTargetVertex === false ? path.slice(0, -1) : path,
        );
    },
  });
}
