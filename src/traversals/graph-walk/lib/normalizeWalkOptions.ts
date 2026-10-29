import { assertOwnKeys } from '@core/assertPublicOptions';
import type { VisitorRecord } from '@core/graph/types';
import { normalizeTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import type {
  ResolvedTraversalExecutionOptions,
  TraversalIterableConfigInput,
} from '@core/TraversalRunnerIterableConfig';
import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import {
  copyVisitorRecords,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import type {
  AsyncGraphWalkEdgePredicate,
  AsyncGraphWalkExpansionPredicate,
  GraphWalkEdgePredicate,
  GraphWalkExpansionPredicate,
  GraphWalkLimits,
  GraphWalkRevisitPolicy,
  GraphWalkStrategy,
} from '../GraphWalkOptions';
import { GraphWalkPhase } from '../GraphWalkPhase';
import type { AsyncGraphWalkSource, GraphWalkSource } from '../GraphWalkSource';
import type {
  AsyncGraphWalkVisitor,
  GraphWalkVisitor,
} from '../GraphWalkVisitor';

/** Captured methods retain the caller receiver without binding or freezing it. */
export type NormalizedWalkSource<Data, Edge, ID> = {
  hydration: 'resolver' | 'inlineOrCached';
  receiver:
    | GraphWalkSource<Data, Edge, ID>
    | AsyncGraphWalkSource<Data, Edge, ID>;
  roots:
    | GraphWalkSource<Data, Edge, ID>['roots']
    | AsyncGraphWalkSource<Data, Edge, ID>['roots'];
  resolveVertex:
    | GraphWalkSource<Data, Edge, ID>['resolveVertex']
    | AsyncGraphWalkSource<Data, Edge, ID>['resolveVertex'];
  outgoing:
    | GraphWalkSource<Data, Edge, ID>['outgoing']
    | AsyncGraphWalkSource<Data, Edge, ID>['outgoing'];
};
export type WalkVisitor<Data, Edge, Phase extends GraphWalkPhase, ID> =
  | GraphWalkVisitor<Data, Edge, Phase, ID>
  | AsyncGraphWalkVisitor<Data, Edge, Phase, ID>;
export type GraphWalkResolvedOptions<Data, Edge, ID> = {
  source: NormalizedWalkSource<Data, Edge, ID>;
  strategy: GraphWalkStrategy;
  revisit: GraphWalkRevisitPolicy;
  limits: GraphWalkLimits;
  shouldFollowEdge:
    | GraphWalkEdgePredicate<Data, Edge, ID>
    | AsyncGraphWalkEdgePredicate<Data, Edge, ID>
    | undefined;
  shouldExpandVertex:
    | GraphWalkExpansionPredicate<Data, Edge, ID>
    | AsyncGraphWalkExpansionPredicate<Data, Edge, ID>
    | undefined;
  visitors: {
    [Phase in GraphWalkPhase]: VisitorRecord<
      WalkVisitor<Data, Edge, Phase, ID>
    >[];
  };
  execution: ResolvedTraversalExecutionOptions<GraphWalkPhase>;
};

const phases = [
  GraphWalkPhase.VERTEX,
  GraphWalkPhase.EDGE,
  GraphWalkPhase.PATH,
];

function object(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(message);
  }
  return value as Record<string, unknown>;
}

function captureSource<Data, Edge, ID>(
  value: unknown,
): NormalizedWalkSource<Data, Edge, ID> {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function') ||
    Array.isArray(value)
  )
    throw new TypeError('Walking source must be an object or function');
  const hydration: unknown = Reflect.get(value, 'hydration');
  const roots: unknown = Reflect.get(value, 'roots');
  const outgoing: unknown = Reflect.get(value, 'outgoing');
  const resolveVertex: unknown = Reflect.get(value, 'resolveVertex');
  if (
    typeof roots !== 'function' ||
    typeof outgoing !== 'function' ||
    (hydration !== 'resolver' && hydration !== 'inlineOrCached') ||
    (hydration === 'resolver'
      ? typeof resolveVertex !== 'function'
      : resolveVertex !== undefined)
  ) {
    throw new TypeError(
      'Walking source requires roots/outgoing and explicit hydration with a resolver only in resolver mode',
    );
  }
  // Only invocation signatures cross this unknown-input boundary. Callers are
  // invoked by the sessions, which validate their returned protocols/results.
  return {
    hydration,
    receiver: value,
    roots,
    outgoing,
    resolveVertex,
  } as NormalizedWalkSource<Data, Edge, ID>;
}

function copyLimits(input: unknown): GraphWalkLimits {
  const value = object(input, 'Walking limits must be an object');
  assertOwnKeys(value, [
    'maxDepth',
    'maxAdmittedTargets',
    'maxCandidateReadAttempts',
  ]);
  const result: GraphWalkLimits = {};
  for (const key of [
    'maxDepth',
    'maxAdmittedTargets',
    'maxCandidateReadAttempts',
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
export function normalizeWalkOptions<Data, Edge, ID>(
  input: unknown,
  previous?: GraphWalkResolvedOptions<Data, Edge, ID>,
): GraphWalkResolvedOptions<Data, Edge, ID> {
  const value = object(input, 'Walking options must be an object');
  if (Object.prototype.hasOwnProperty.call(value, 'concurrency')) {
    throw new TypeError('Walking does not support a concurrency option');
  }
  const snapshot: Record<string, unknown> = {};
  const keys = [
    'source',
    'strategy',
    'revisit',
    'limits',
    'shouldFollowEdge',
    'shouldExpandVertex',
    'visitors',
    'emitEvents',
    'visitorPhases',
  ];
  assertOwnKeys(value, keys);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key))
      snapshot[key] = value[key];
  }
  const source =
    snapshot['source'] === undefined && previous !== undefined
      ? { ...previous.source }
      : captureSource<Data, Edge, ID>(snapshot['source']);
  const strategy =
    snapshot['strategy'] === undefined
      ? previous?.strategy ?? 'breadthFirst'
      : snapshot['strategy'];
  if (strategy !== 'breadthFirst' && strategy !== 'depthFirst') {
    throw new TypeError('Unknown walking strategy');
  }
  const revisit =
    snapshot['revisit'] === undefined
      ? previous?.revisit ?? 'once'
      : snapshot['revisit'];
  if (revisit !== 'once' && revisit !== 'simplePaths' && revisit !== 'walks') {
    throw new TypeError('Unknown walking revisit policy');
  }
  const limits = copyLimits(
    snapshot['limits'] === undefined
      ? previous?.limits ?? {}
      : snapshot['limits'],
  );
  if (
    revisit !== 'once' &&
    limits.maxDepth === undefined &&
    limits.maxCandidateReadAttempts === undefined
  ) {
    throw new TypeError(
      'Route enumeration requires maxDepth or maxCandidateReadAttempts',
    );
  }
  const shouldFollowEdge =
    snapshot['shouldFollowEdge'] === undefined
      ? previous?.shouldFollowEdge
      : snapshot['shouldFollowEdge'] === null
      ? undefined
      : snapshot['shouldFollowEdge'];
  const shouldExpandVertex =
    snapshot['shouldExpandVertex'] === undefined
      ? previous?.shouldExpandVertex
      : snapshot['shouldExpandVertex'] === null
      ? undefined
      : snapshot['shouldExpandVertex'];
  if (
    (shouldFollowEdge !== undefined &&
      typeof shouldFollowEdge !== 'function') ||
    (shouldExpandVertex !== undefined &&
      typeof shouldExpandVertex !== 'function')
  ) {
    throw new TypeError('Walking predicates must be callbacks');
  }
  const visitorInput =
    snapshot['visitors'] === undefined
      ? {}
      : object(snapshot['visitors'], 'Walking visitors must be a phase map');
  assertOwnKeys(visitorInput, phases);
  function records<Phase extends GraphWalkPhase>(phase: Phase) {
    const entries = visitorInput[phase];
    return entries === undefined
      ? copyVisitorRecords(previous?.visitors[phase] ?? [])
      : normalizeVisitorDefinitions<WalkVisitor<Data, Edge, Phase, ID>>(
          entries as VisitorPhaseInput<WalkVisitor<Data, Edge, Phase, ID>>,
        );
  }
  const defaults = normalizeTraversalExecutionOptions(phases, {
    emitEvents: [GraphWalkPhase.VERTEX],
    visitorPhases: 'all',
  });
  const execution = normalizeTraversalExecutionOptions(
    phases,
    Object.fromEntries(
      Object.entries(snapshot).filter(([key]) =>
        ['emitEvents', 'visitorPhases'].includes(key),
      ),
    ) as TraversalIterableConfigInput<GraphWalkPhase>,
    previous?.execution ?? defaults,
  );
  return {
    source,
    strategy,
    revisit,
    limits,
    shouldFollowEdge: shouldFollowEdge as GraphWalkResolvedOptions<
      Data,
      Edge,
      ID
    >['shouldFollowEdge'],
    shouldExpandVertex: shouldExpandVertex as GraphWalkResolvedOptions<
      Data,
      Edge,
      ID
    >['shouldExpandVertex'],
    visitors: {
      [GraphWalkPhase.VERTEX]: records(GraphWalkPhase.VERTEX),
      [GraphWalkPhase.EDGE]: records(GraphWalkPhase.EDGE),
      [GraphWalkPhase.PATH]: records(GraphWalkPhase.PATH),
    },
    execution,
  };
}
