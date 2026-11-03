import { assertOwnKeys, captureOptionFields } from '@core/assertPublicOptions';
import { copyAndNormalizeDagDefinition } from './defineDag';
import { DagFragmentValidationError } from './lib/DagFragmentValidationError';
import type {
  DagDefinition,
  DagTopologyValidationResult,
  DagStructuralDiscoverySlot,
} from './lib/DagDefinition';
import type {
  DagCompositionOptions,
  DagFragment,
  InferredDagId,
} from './lib/DagFragment';
import { validateAndPrepareDagDefinition } from './prepareDagDefinition';

function copyPorts<VertexId, PortName extends string>(
  vertexIdsByPortName: Readonly<Record<PortName, VertexId>>,
  accept: (vertexId: VertexId) => VertexId,
): Readonly<Record<PortName, VertexId>> {
  if (
    vertexIdsByPortName === null ||
    typeof vertexIdsByPortName !== 'object' ||
    Array.isArray(vertexIdsByPortName)
  )
    throw new TypeError('Expected a DAG fragment port record');
  return Object.freeze(
    Object.fromEntries(
      Reflect.ownKeys(vertexIdsByPortName).map((key) => {
        if (typeof key !== 'string')
          throw new TypeError('DAG fragment port names must be strings');
        return [key, accept(vertexIdsByPortName[key as PortName])];
      }),
    ),
  ) as Readonly<Record<PortName, VertexId>>;
}

/** Normalize a closed valid local DAG and copy its named live-vertex ports. */
export function validateAndCreateDagFragment<
  Data,
  VertexId,
  PortName extends string,
>(
  definition: DagDefinition<Data, VertexId>,
  vertexIdsByPortName: Readonly<Record<PortName, InferredDagId<VertexId>>>,
): DagFragment<Data, VertexId, PortName> {
  const result = validateAndPrepareDagDefinition(definition);
  if (result.kind === 'invalid')
    throw new DagFragmentValidationError(result.issues);
  const live = new Set(
    result.validatedTopology.definition.vertexDeclarations.map(
      (vertex) => vertex.vertexId,
    ),
  );
  return Object.freeze({
    definition: result.validatedTopology.definition,
    vertexIdsByPortName: copyPorts(vertexIdsByPortName, (vertexId) => {
      if (!live.has(vertexId))
        throw new TypeError('DAG fragment ports must name live vertices');
      return vertexId;
    }),
  });
}

/** Map every declared identity exactly once, retaining shallow data references. */
export function mapDagFragmentIds<
  Data,
  VertexId,
  PortName extends string,
  MappedVertexId,
>(
  fragment: DagFragment<Data, VertexId, PortName>,
  options: { mapId: (vertexId: VertexId) => MappedVertexId },
): DagFragment<Data, MappedVertexId, PortName> {
  assertOwnKeys(options, ['mapId']);
  const { mapId } = captureOptionFields(options, ['mapId']);
  if (typeof mapId !== 'function')
    throw new TypeError('mapId must be a function');
  const local = validateAndCreateDagFragment(
    fragment.definition,
    fragment.vertexIdsByPortName,
  );
  const mapped = new Map<VertexId, MappedVertexId>();
  const used = new Set<MappedVertexId>();
  for (const vertexId of [
    ...local.definition.vertexDeclarations.map((vertex) => vertex.vertexId),
    ...local.definition.omittedVertexIds,
  ]) {
    const next = mapId.call(options, vertexId);
    if (used.has(next))
      throw new TypeError('Mapped DAG fragment identities collide');
    used.add(next);
    mapped.set(vertexId, next);
  }
  const remap = (vertexId: VertexId): MappedVertexId => mapped.get(vertexId)!;
  const slot = (
    value: DagStructuralDiscoverySlot<VertexId>,
  ): DagStructuralDiscoverySlot<MappedVertexId> =>
    value.kind === 'vertex'
      ? { kind: 'vertex', vertexId: remap(value.vertexId) }
      : {
          kind: 'omitted',
          omittedVertexIdentity:
            value.omittedVertexIdentity === null
              ? null
              : { vertexId: remap(value.omittedVertexIdentity.vertexId) },
        };
  const entry = local.definition.entry;
  const definition = copyAndNormalizeDagDefinition({
    vertexDeclarations: local.definition.vertexDeclarations.map((vertex) => ({
      vertexId: remap(vertex.vertexId),
      data: vertex.data,
      childDiscoverySlots: vertex.childDiscoverySlots.map(slot),
      workWaitsForWorkOf: vertex.workWaitsForWorkOf.map(remap),
      workWaitsForSubgraphCompletionOf:
        vertex.workWaitsForSubgraphCompletionOf.map(remap),
    })),
    omittedVertexIds: local.definition.omittedVertexIds.map(remap),
    entry:
      entry.kind === 'root'
        ? { kind: 'root', vertexId: remap(entry.vertexId) }
        : entry.kind === 'roots'
        ? {
            kind: 'roots',
            entryDiscoverySlots: entry.entryDiscoverySlots.map(slot),
          }
        : { kind: 'empty' },
  });
  const vertexIdsByPortName = Object.freeze(
    Object.fromEntries(
      Object.getOwnPropertyNames(local.vertexIdsByPortName).map((key) => [
        key,
        remap(local.vertexIdsByPortName[key as PortName]),
      ]),
    ),
  ) as Readonly<Record<PortName, MappedVertexId>>;
  return Object.freeze({ definition, vertexIdsByPortName });
}

function requireWireFields(value: unknown, fields: readonly string[]): void {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    fields.some((field) => !Object.prototype.hasOwnProperty.call(value, field))
  )
    throw new TypeError('DAG wires require own endpoint and milestone fields');
  assertOwnKeys(value, fields);
}

/** Combine ordered entries, append explicit links, then validate the whole DAG. */
export function composeAndValidateDagFragments<Data, VertexId>(
  instances: readonly DagFragment<Data, VertexId>[],
  options: DagCompositionOptions<InferredDagId<VertexId>> = {},
): DagTopologyValidationResult<Data, VertexId> {
  assertOwnKeys(options, [
    'additionalStructuralChildLinks',
    'additionalWorkPrerequisites',
  ]);
  const definitions = instances.map((instance) =>
    copyAndNormalizeDagDefinition(instance.definition),
  );
  const vertexDeclarations = definitions.flatMap((definition) =>
    definition.vertexDeclarations.map((vertex) => ({
      ...vertex,
      childDiscoverySlots: [...vertex.childDiscoverySlots],
      workWaitsForWorkOf: [...vertex.workWaitsForWorkOf],
      workWaitsForSubgraphCompletionOf: [
        ...vertex.workWaitsForSubgraphCompletionOf,
      ],
    })),
  );
  const omittedVertexIds = definitions.flatMap((definition) => [
    ...definition.omittedVertexIds,
  ]);
  const all = new Set<VertexId>();
  for (const vertexId of [
    ...vertexDeclarations.map((vertex) => vertex.vertexId),
    ...omittedVertexIds,
  ]) {
    if (all.has(vertexId))
      throw new TypeError('Composed DAG identities collide');
    all.add(vertexId);
  }
  const live = new Map(
    vertexDeclarations.map((vertex) => [vertex.vertexId, vertex]),
  );
  const requireLive = (vertexId: VertexId) => {
    const vertex = live.get(vertexId);
    if (vertex === undefined)
      throw new TypeError('DAG wire endpoint must name a live vertex');
    return vertex;
  };
  const slots: DagStructuralDiscoverySlot<VertexId>[] = definitions.flatMap(
    (definition) => {
      const entry = definition.entry;
      if (entry.kind === 'root')
        return [{ kind: 'vertex', vertexId: entry.vertexId }];
      if (entry.kind === 'roots') return [...entry.entryDiscoverySlots];
      return definition.omittedVertexIds.map((vertexId) => ({
        kind: 'omitted',
        omittedVertexIdentity: { vertexId },
      }));
    },
  );
  for (const wire of options.additionalStructuralChildLinks ?? []) {
    requireWireFields(wire, ['parentVertexId', 'childVertexId']);
    const { parentVertexId: parentId, childVertexId: child } = wire;
    const parent = requireLive(parentId);
    requireLive(child);
    parent.childDiscoverySlots.push({ kind: 'vertex', vertexId: child });
  }
  for (const wire of options.additionalWorkPrerequisites ?? []) {
    requireWireFields(wire, ['dependentWorkVertexId', 'prerequisite']);
    const { dependentWorkVertexId: dependentId, prerequisite } = wire;
    requireWireFields(prerequisite, ['vertexId', 'milestone']);
    const dependent = requireLive(dependentId);
    const { vertexId, milestone } = prerequisite;
    if (!all.has(vertexId))
      throw new TypeError('Unknown DAG wire prerequisite');
    if (milestone === 'workCompletion')
      dependent.workWaitsForWorkOf.push(vertexId);
    else if (milestone === 'subgraphCompletion')
      dependent.workWaitsForSubgraphCompletionOf.push(vertexId);
    else throw new TypeError('Unknown DAG wire milestone');
  }
  return validateAndPrepareDagDefinition({
    vertexDeclarations,
    omittedVertexIds,
    entry: { kind: 'roots', entryDiscoverySlots: slots },
  });
}
