import { assertOwnKeys } from '@core/assertPublicOptions';
import type { VisitorRecord } from '@core/graph/types';
import { normalizeTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import type {
  ResolvedTraversalExecutionOptions,
  TraversalIterableConfigInput,
} from '@core/TraversalRunnerIterableConfig';
import type { VisitorDefinitionsForPhase } from '@core/TraversalVisitor';
import {
  copyVisitorRecords,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import type {
  AsyncGraphWalkLinkTargetAdmissionPredicate,
  AsyncGraphWalkVertexOccurrenceExpansionPredicate,
  GraphWalkLinkTargetAdmissionPredicate,
  GraphWalkVertexOccurrenceExpansionPredicate,
  GraphWalkExplorationLimits,
  GraphWalkRouteEnumerationPolicy,
  GraphWalkExpansionOrder,
} from '../GraphWalkOptions';
import { GraphWalkObservationKind } from '../GraphWalkPhase';
import type {
  AsyncGraphWalkDiscoverySource,
  GraphWalkDiscoverySource,
} from '../GraphWalkSource';
import type {
  AsyncGraphWalkVisitor,
  GraphWalkVisitor,
} from '../GraphWalkVisitor';

/** Captured methods retain the caller receiver without binding or freezing it. */
export type NormalizedWalkSource<VertexData, EdgeData, VertexId> = {
  vertexResolutionMode:
    | 'resolverWithOptionalInlineResolution'
    | 'inlineResolutionOrPreviouslyAdmittedVertex';
  receiver:
    | GraphWalkDiscoverySource<VertexData, EdgeData, VertexId>
    | AsyncGraphWalkDiscoverySource<VertexData, EdgeData, VertexId>;
  enumerateRootTargets:
    | GraphWalkDiscoverySource<
        VertexData,
        EdgeData,
        VertexId
      >['enumerateRootTargets']
    | AsyncGraphWalkDiscoverySource<
        VertexData,
        EdgeData,
        VertexId
      >['enumerateRootTargets'];
  resolveVertexDataById:
    | GraphWalkDiscoverySource<
        VertexData,
        EdgeData,
        VertexId
      >['resolveVertexDataById']
    | AsyncGraphWalkDiscoverySource<
        VertexData,
        EdgeData,
        VertexId
      >['resolveVertexDataById'];
  enumerateOutgoingLinks:
    | GraphWalkDiscoverySource<
        VertexData,
        EdgeData,
        VertexId
      >['enumerateOutgoingLinks']
    | AsyncGraphWalkDiscoverySource<
        VertexData,
        EdgeData,
        VertexId
      >['enumerateOutgoingLinks'];
};
export type WalkVisitor<
  VertexData,
  EdgeData,
  ObservationKind extends GraphWalkObservationKind,
  VertexId,
> =
  | GraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
  | AsyncGraphWalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>;
export type GraphWalkResolvedOptions<VertexData, EdgeData, VertexId> = {
  graphWalkDiscoverySource: NormalizedWalkSource<
    VertexData,
    EdgeData,
    VertexId
  >;
  expansionOrder: GraphWalkExpansionOrder;
  routeEnumerationPolicy: GraphWalkRouteEnumerationPolicy;
  limits: GraphWalkExplorationLimits;
  shouldAdmitOutgoingLinkTarget:
    | GraphWalkLinkTargetAdmissionPredicate<VertexData, EdgeData, VertexId>
    | AsyncGraphWalkLinkTargetAdmissionPredicate<VertexData, EdgeData, VertexId>
    | undefined;
  shouldExpandVertexOccurrence:
    | GraphWalkVertexOccurrenceExpansionPredicate<
        VertexData,
        EdgeData,
        VertexId
      >
    | AsyncGraphWalkVertexOccurrenceExpansionPredicate<
        VertexData,
        EdgeData,
        VertexId
      >
    | undefined;
  visitorsByObservationKind: {
    [ObservationKind in GraphWalkObservationKind]: VisitorRecord<
      WalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
    >[];
  };
  execution: ResolvedTraversalExecutionOptions<GraphWalkObservationKind>;
};

const phases = [
  GraphWalkObservationKind.VERTEX_OCCURRENCE,
  GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
  GraphWalkObservationKind.ROUTE_PREFIX,
];

function object(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(message);
  }
  return value as Record<string, unknown>;
}

function captureSource<VertexData, EdgeData, VertexId>(
  value: unknown,
): NormalizedWalkSource<VertexData, EdgeData, VertexId> {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function') ||
    Array.isArray(value)
  )
    throw new TypeError(
      'Walking discovery source must be an object or function',
    );
  const vertexResolutionMode: unknown = Reflect.get(
    value,
    'vertexResolutionMode',
  );
  const enumerateRootTargets: unknown = Reflect.get(
    value,
    'enumerateRootTargets',
  );
  const enumerateOutgoingLinks: unknown = Reflect.get(
    value,
    'enumerateOutgoingLinks',
  );
  const resolveVertexDataById: unknown = Reflect.get(
    value,
    'resolveVertexDataById',
  );
  if (
    typeof enumerateRootTargets !== 'function' ||
    typeof enumerateOutgoingLinks !== 'function' ||
    (vertexResolutionMode !== 'resolverWithOptionalInlineResolution' &&
      vertexResolutionMode !== 'inlineResolutionOrPreviouslyAdmittedVertex') ||
    (vertexResolutionMode === 'resolverWithOptionalInlineResolution'
      ? typeof resolveVertexDataById !== 'function'
      : resolveVertexDataById !== undefined)
  ) {
    throw new TypeError(
      'Walking discovery source requires enumerateRootTargets/enumerateOutgoingLinks and explicit vertexResolutionMode with resolveVertexDataById only in resolverWithOptionalInlineResolution mode',
    );
  }
  // Only invocation signatures cross this unknown-input boundary. Callers are
  // invoked by the sessions, which validate their returned protocols/results.
  return {
    vertexResolutionMode,
    receiver: value,
    enumerateRootTargets,
    enumerateOutgoingLinks,
    resolveVertexDataById,
  } as NormalizedWalkSource<VertexData, EdgeData, VertexId>;
}

function copyLimits(input: unknown): GraphWalkExplorationLimits {
  const value = object(input, 'Walking limits must be an object');
  assertOwnKeys(value, [
    'maxRouteHopDepth',
    'maxAdmittedRootOrLinkTargetOccurrences',
    'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay',
  ]);
  const result: GraphWalkExplorationLimits = {};
  for (const key of [
    'maxRouteHopDepth',
    'maxAdmittedRootOrLinkTargetOccurrences',
    'maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay',
  ] as const) {
    const bound = value[key];
    if (bound !== undefined) {
      if (
        typeof bound !== 'number' ||
        !Number.isSafeInteger(bound) ||
        bound < 0
      ) {
        throw new TypeError('Walking limits must be nonnegative safe integers');
      }
      result[key] = bound;
    }
  }
  return result;
}

/** Validate a detached candidate before a facade commits any configuration. */
export function normalizeWalkOptions<VertexData, EdgeData, VertexId>(
  input: unknown,
  previous?: GraphWalkResolvedOptions<VertexData, EdgeData, VertexId>,
): GraphWalkResolvedOptions<VertexData, EdgeData, VertexId> {
  const value = object(input, 'Walking options must be an object');
  if (Object.prototype.hasOwnProperty.call(value, 'concurrency')) {
    throw new TypeError('Walking does not support a concurrency option');
  }
  const snapshot: Record<string, unknown> = {};
  const keys = [
    'graphWalkDiscoverySource',
    'expansionOrder',
    'routeEnumerationPolicy',
    previous === undefined ? 'limits' : 'replaceLimits',
    'shouldAdmitOutgoingLinkTarget',
    'shouldExpandVertexOccurrence',
    'visitorsByObservationKind',
    'deliveredEventKinds',
    'admittedVisitorCallbackPhases',
  ];
  assertOwnKeys(value, keys);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key))
      snapshot[key] = value[key];
  }
  const graphWalkDiscoverySource =
    snapshot['graphWalkDiscoverySource'] === undefined && previous !== undefined
      ? { ...previous.graphWalkDiscoverySource }
      : captureSource<VertexData, EdgeData, VertexId>(
          snapshot['graphWalkDiscoverySource'],
        );
  const expansionOrder =
    snapshot['expansionOrder'] === undefined
      ? previous?.expansionOrder ?? 'breadthFirst'
      : snapshot['expansionOrder'];
  if (expansionOrder !== 'breadthFirst' && expansionOrder !== 'depthFirst') {
    throw new TypeError('Unknown walking expansion order');
  }
  const routeEnumerationPolicy =
    snapshot['routeEnumerationPolicy'] === undefined
      ? previous?.routeEnumerationPolicy ?? 'firstAdmittedFoundRoutePerVertex'
      : snapshot['routeEnumerationPolicy'];
  if (
    routeEnumerationPolicy !== 'firstAdmittedFoundRoutePerVertex' &&
    routeEnumerationPolicy !== 'allVertexSimpleRoutePrefixes' &&
    routeEnumerationPolicy !== 'allRoutePrefixesAllowingRepeatedVertices'
  ) {
    throw new TypeError('Unknown walking route enumeration policy');
  }
  const limitsInput =
    snapshot[previous === undefined ? 'limits' : 'replaceLimits'];
  const limits = copyLimits(
    limitsInput === undefined ? previous?.limits ?? {} : limitsInput,
  );
  if (
    routeEnumerationPolicy !== 'firstAdmittedFoundRoutePerVertex' &&
    limits.maxRouteHopDepth === undefined &&
    limits.maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay === undefined
  ) {
    throw new TypeError(
      'Route enumeration requires maxRouteHopDepth or maxRootOrLinkReadAttemptsIncludingDoneAndCacheReplay',
    );
  }
  const shouldAdmitOutgoingLinkTarget =
    snapshot['shouldAdmitOutgoingLinkTarget'] === undefined
      ? previous?.shouldAdmitOutgoingLinkTarget
      : snapshot['shouldAdmitOutgoingLinkTarget'] === null
      ? undefined
      : snapshot['shouldAdmitOutgoingLinkTarget'];
  const shouldExpandVertexOccurrence =
    snapshot['shouldExpandVertexOccurrence'] === undefined
      ? previous?.shouldExpandVertexOccurrence
      : snapshot['shouldExpandVertexOccurrence'] === null
      ? undefined
      : snapshot['shouldExpandVertexOccurrence'];
  if (
    (shouldAdmitOutgoingLinkTarget !== undefined &&
      typeof shouldAdmitOutgoingLinkTarget !== 'function') ||
    (shouldExpandVertexOccurrence !== undefined &&
      typeof shouldExpandVertexOccurrence !== 'function')
  ) {
    throw new TypeError('Walking predicates must be callbacks');
  }
  const visitorInput =
    snapshot['visitorsByObservationKind'] === undefined
      ? {}
      : object(
          snapshot['visitorsByObservationKind'],
          'Walking visitorsByObservationKind must be a phase map',
        );
  assertOwnKeys(visitorInput, phases);
  function records<ObservationKind extends GraphWalkObservationKind>(
    phase: ObservationKind,
  ) {
    const entries = visitorInput[phase];
    return entries === undefined
      ? copyVisitorRecords(previous?.visitorsByObservationKind[phase] ?? [])
      : normalizeVisitorDefinitions<
          WalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
        >(
          entries as VisitorDefinitionsForPhase<
            WalkVisitor<VertexData, EdgeData, ObservationKind, VertexId>
          >,
        );
  }
  const defaults = normalizeTraversalExecutionOptions(phases, {
    deliveredEventKinds: [GraphWalkObservationKind.VERTEX_OCCURRENCE],
    admittedVisitorCallbackPhases: 'all',
  });
  const execution = normalizeTraversalExecutionOptions(
    phases,
    Object.fromEntries(
      Object.entries(snapshot).filter(([key]) =>
        ['deliveredEventKinds', 'admittedVisitorCallbackPhases'].includes(key),
      ),
    ) as TraversalIterableConfigInput<GraphWalkObservationKind>,
    previous?.execution ?? defaults,
  );
  return {
    graphWalkDiscoverySource,
    expansionOrder,
    routeEnumerationPolicy,
    limits,
    shouldAdmitOutgoingLinkTarget:
      shouldAdmitOutgoingLinkTarget as GraphWalkResolvedOptions<
        VertexData,
        EdgeData,
        VertexId
      >['shouldAdmitOutgoingLinkTarget'],
    shouldExpandVertexOccurrence:
      shouldExpandVertexOccurrence as GraphWalkResolvedOptions<
        VertexData,
        EdgeData,
        VertexId
      >['shouldExpandVertexOccurrence'],
    visitorsByObservationKind: {
      [GraphWalkObservationKind.VERTEX_OCCURRENCE]: records(
        GraphWalkObservationKind.VERTEX_OCCURRENCE,
      ),
      [GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE]: records(
        GraphWalkObservationKind.ADMITTED_EDGE_OCCURRENCE,
      ),
      [GraphWalkObservationKind.ROUTE_PREFIX]: records(
        GraphWalkObservationKind.ROUTE_PREFIX,
      ),
    },
    execution,
  };
}
