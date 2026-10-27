import { defineDag } from './defineDag';
import { DagFragmentValidationError } from './lib/DagFragmentValidationError';
import type {
  DagDefinition,
  PrepareDagResult,
  DagDefinitionSlot,
} from './lib/DagDefinition';
import type {
  DagCompositionOptions,
  DagFragment,
  DagFragmentInstance,
  InferredDagId,
} from './lib/DagFragment';
import { prepareDagDefinition } from './prepareDagDefinition';

function copyPorts<ID, Port extends string>(
  ports: Readonly<Record<Port, ID>>,
  accept: (id: ID) => ID,
): Readonly<Record<Port, ID>> {
  if (ports === null || typeof ports !== 'object' || Array.isArray(ports))
    throw new TypeError('Expected a DAG fragment port record');
  return Object.freeze(
    Object.fromEntries(
      Reflect.ownKeys(ports).map((key) => {
        if (typeof key !== 'string')
          throw new TypeError('DAG fragment port names must be strings');
        return [key, accept(ports[key as Port])];
      }),
    ),
  ) as Readonly<Record<Port, ID>>;
}

/** Normalize a closed valid local DAG and copy its named live-vertex ports. */
export function defineDagFragment<Data, ID, Port extends string>(
  definition: DagDefinition<Data, ID>,
  ports: Readonly<Record<Port, InferredDagId<ID>>>,
): DagFragment<Data, ID, Port> {
  const result = prepareDagDefinition(definition);
  if (result.kind === 'invalid')
    throw new DagFragmentValidationError(result.issues);
  const live = new Set(
    result.dag.definition.vertices.map((vertex) => vertex.vertexId),
  );
  return Object.freeze({
    definition: result.dag.definition,
    ports: copyPorts(ports, (id) => {
      if (!live.has(id))
        throw new TypeError('DAG fragment ports must name live vertices');
      return id;
    }),
  });
}

/** Map every declared identity exactly once, retaining shallow data references. */
export function instantiateDagFragment<Data, ID, Port extends string, MappedID>(
  fragment: DagFragment<Data, ID, Port>,
  options: { mapId: (id: ID) => MappedID },
): DagFragmentInstance<Data, MappedID, Port> {
  const local = defineDagFragment(fragment.definition, fragment.ports);
  const mapped = new Map<ID, MappedID>();
  const used = new Set<MappedID>();
  for (const id of [
    ...local.definition.vertices.map((vertex) => vertex.vertexId),
    ...local.definition.omittedIds,
  ]) {
    const next = options.mapId(id);
    if (used.has(next))
      throw new TypeError('Mapped DAG fragment identities collide');
    used.add(next);
    mapped.set(id, next);
  }
  const remap = (id: ID): MappedID => mapped.get(id)!;
  const slot = (value: DagDefinitionSlot<ID>): DagDefinitionSlot<MappedID> =>
    value.kind === 'vertex'
      ? { kind: 'vertex', vertexId: remap(value.vertexId) }
      : {
          kind: 'omitted',
          identity:
            value.identity === null
              ? null
              : { vertexId: remap(value.identity.vertexId) },
        };
  const entry = local.definition.entry;
  const definition = defineDag({
    vertices: local.definition.vertices.map((vertex) => ({
      vertexId: remap(vertex.vertexId),
      data: vertex.data,
      slots: vertex.slots.map(slot),
      dependsOnWork: vertex.dependsOnWork.map(remap),
      dependsOnSubgraphCompletion:
        vertex.dependsOnSubgraphCompletion.map(remap),
    })),
    omittedIds: local.definition.omittedIds.map(remap),
    entry:
      entry.kind === 'root'
        ? { kind: 'root', vertexId: remap(entry.vertexId) }
        : entry.kind === 'roots'
        ? { kind: 'roots', slots: entry.slots.map(slot) }
        : { kind: 'empty' },
  });
  const ports = Object.freeze(
    Object.fromEntries(
      Object.getOwnPropertyNames(local.ports).map((key) => [
        key,
        remap(local.ports[key as Port]),
      ]),
    ),
  ) as Readonly<Record<Port, MappedID>>;
  return Object.freeze({ definition, ports });
}

function requireWireFields(value: unknown, fields: readonly string[]): void {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    fields.some((field) => !Object.prototype.hasOwnProperty.call(value, field))
  )
    throw new TypeError('DAG wires require own endpoint and milestone fields');
}

/** Combine ordered entries, append explicit links, then validate the whole DAG. */
export function composeDag<Data, ID>(
  instances: readonly DagFragmentInstance<Data, ID>[],
  options: DagCompositionOptions<InferredDagId<ID>> = {},
): PrepareDagResult<Data, ID> {
  const definitions = instances.map((instance) =>
    defineDag(instance.definition),
  );
  const vertices = definitions.flatMap((definition) =>
    definition.vertices.map((vertex) => ({
      ...vertex,
      slots: [...vertex.slots],
      dependsOnWork: [...vertex.dependsOnWork],
      dependsOnSubgraphCompletion: [...vertex.dependsOnSubgraphCompletion],
    })),
  );
  const omittedIds = definitions.flatMap((definition) => [
    ...definition.omittedIds,
  ]);
  const all = new Set<ID>();
  for (const id of [
    ...vertices.map((vertex) => vertex.vertexId),
    ...omittedIds,
  ]) {
    if (all.has(id)) throw new TypeError('Composed DAG identities collide');
    all.add(id);
  }
  const live = new Map(vertices.map((vertex) => [vertex.vertexId, vertex]));
  const requireLive = (id: ID) => {
    const vertex = live.get(id);
    if (vertex === undefined)
      throw new TypeError('DAG wire endpoint must name a live vertex');
    return vertex;
  };
  const slots: DagDefinitionSlot<ID>[] = definitions.flatMap((definition) => {
    const entry = definition.entry;
    if (entry.kind === 'root')
      return [{ kind: 'vertex', vertexId: entry.vertexId }];
    if (entry.kind === 'roots') return [...entry.slots];
    return definition.omittedIds.map((vertexId) => ({
      kind: 'omitted',
      identity: { vertexId },
    }));
  });
  for (const wire of options.children ?? []) {
    requireWireFields(wire, ['parent', 'child']);
    const { parent: parentId, child } = wire;
    const parent = requireLive(parentId);
    requireLive(child);
    parent.slots.push({ kind: 'vertex', vertexId: child });
  }
  for (const wire of options.dependencies ?? []) {
    requireWireFields(wire, ['dependent', 'prerequisite']);
    const { dependent: dependentId, prerequisite } = wire;
    requireWireFields(prerequisite, ['vertexId', 'milestone']);
    const dependent = requireLive(dependentId);
    const { vertexId, milestone } = prerequisite;
    if (!all.has(vertexId))
      throw new TypeError('Unknown DAG wire prerequisite');
    if (milestone === 'work') dependent.dependsOnWork.push(vertexId);
    else if (milestone === 'subgraphCompletion')
      dependent.dependsOnSubgraphCompletion.push(vertexId);
    else throw new TypeError('Unknown DAG wire milestone');
  }
  return prepareDagDefinition({
    vertices,
    omittedIds,
    entry: { kind: 'roots', slots },
  });
}
