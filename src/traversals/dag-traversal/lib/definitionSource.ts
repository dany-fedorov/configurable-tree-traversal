import type { DagDiscoverySource } from '@core/TraversableGraph';
import type { VertexTypes } from '@core/TreeTypeParameters';
import type { DagVertexResolution } from '@core/TraversableTree';
import type { VertexHandle } from '@core/CTTRef';
import { internalRef } from '@core/observationFacets';
import type { ResolvedGraphsContainer } from '@core/graph/ResolvedGraphsContainer';
import { defineDag } from '../defineDag';
import type { DagDefinition, DagDefinitionSlot } from './DagDefinition';

/** Capture every discovery slot, including anonymous omissions omitted by replay. */
export function captureDagDefinition<T extends VertexTypes, ID>(
  container: ResolvedGraphsContainer<T, T, ID>,
  candidates: ReadonlySet<ID>,
): DagDefinition<T['VertexData'], ID> {
  const graph = container.publicResolvedGraph;
  const captureSlots = (ref: VertexHandle<T>): DagDefinitionSlot<ID>[] => {
    const slots: DagDefinitionSlot<ID>[] = [];
    for (const slot of container.resolvedGraphView.get(internalRef(ref))!
      .slots) {
      if (slot.kind === 'linked')
        slots.push({
          kind: 'vertex',
          vertexId: graph.getVertexId(slot.childRef),
        });
      else if (slot.kind === 'omitted')
        slots.push({
          kind: 'omitted',
          identity: Object.prototype.hasOwnProperty.call(slot, 'vertexId')
            ? { vertexId: slot.vertexId as ID }
            : null,
        });
    }
    return slots;
  };
  const root = graph.getRoot();
  const holder = container.syntheticRootRef;
  const omittedIds = [...candidates].filter(
    (id) => container.store.getIdState(id)?.kind === 'omitted',
  );
  return defineDag({
    vertices: graph.getVertexRefs().map((ref) => {
      const vertex = graph.get(ref)!;
      return {
        vertexId: vertex.vertexId,
        data: vertex.vertex.getData(),
        slots: captureSlots(ref),
        dependsOnWork: vertex.dependsOnWork,
        dependsOnSubgraphCompletion: vertex.dependsOnSubgraphCompletion ?? [],
      };
    }),
    omittedIds,
    entry: container.syntheticRoot
      ? { kind: 'roots', slots: holder === null ? [] : captureSlots(holder) }
      : root === null
      ? { kind: 'empty' }
      : { kind: 'root', vertexId: graph.getVertexId(root) },
  });
}

/** Replays accepted definitions with ID hints; never invents anonymous identities. */
export function definitionSource<Data, ID>(
  definition: DagDefinition<Data, ID>,
): {
  traversableGraph: DagDiscoverySource<
    VertexTypes<Data, ID>,
    VertexTypes<Data, ID>,
    ID
  >;
  syntheticRoot: boolean;
} {
  type Replay = VertexTypes<Data, ID>;
  const byId = new Map(
    definition.vertices.map((vertex) => [vertex.vertexId, vertex]),
  );
  const omitted = new Set(definition.omittedIds);
  const hints = (slots: readonly DagDefinitionSlot<ID>[]): ID[] => {
    const result: ID[] = [];
    for (const slot of slots) {
      if (slot.kind === 'vertex') result.push(slot.vertexId);
      else if (slot.identity !== null) result.push(slot.identity.vertexId);
      // Phase-one replay drops anonymous omissions: they carry no identity and
      // cannot affect readiness. Retain them in the definition without fake hints.
    }
    return result;
  };
  const resolve = (id: ID): DagVertexResolution<Replay, ID> => {
    if (omitted.has(id))
      return { kind: 'omitted', vertexId: id, satisfiesDependencies: true };
    const vertex = byId.get(id)!;
    return {
      kind: 'found',
      vertex: {
        vertexId: vertex.vertexId,
        dependsOnWork: vertex.dependsOnWork.slice(),
        dependsOnSubgraphCompletion: vertex.dependsOnSubgraphCompletion.slice(),
        vertexContent: { $data: vertex.data, $childHints: hints(vertex.slots) },
      },
    };
  };
  const rootHints = (slots: readonly DagDefinitionSlot<ID>[]): ID[] => {
    const seen = new Set<ID>();
    return hints(
      slots.filter((slot) => {
        if (slot.kind === 'omitted') return true;
        if (seen.has(slot.vertexId)) return false;
        seen.add(slot.vertexId);
        return true;
      }),
    );
  };
  const syntheticRoot =
    definition.entry.kind === 'roots' ||
    (definition.entry.kind === 'empty' && omitted.size > 0);
  return {
    syntheticRoot,
    traversableGraph: {
      resolveRoot: () => {
        const entry = definition.entry;
        // The private holder discovers repeated live identities once; the authored entry
        // retains repeated ordered slots for round trips and walking adapters.
        if (syntheticRoot)
          return {
            kind: 'found',
            vertex: {
              vertexId: undefined as ID,
              vertexContent: {
                $data: undefined as Data,
                $childHints:
                  entry.kind === 'roots'
                    ? rootHints(entry.slots)
                    : definition.omittedIds.slice(),
              },
            },
          };
        return entry.kind === 'root'
          ? resolve(entry.vertexId)
          : { kind: 'omitted', satisfiesDependencies: true };
      },
      resolveChild: resolve,
      resolvePrerequisite: (id) =>
        byId.has(id) || omitted.has(id) ? resolve(id) : { kind: 'missing' },
      getVertexIdFromHint: (vertexId) => ({ vertexId }),
    },
  };
}
