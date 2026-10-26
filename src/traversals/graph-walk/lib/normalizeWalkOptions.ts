import { normalizeTraversalExecutionOptions } from '@core/normalizeTraversalExecutionOptions';
import {
  copyVisitorRecords,
  normalizeVisitorDefinitions,
} from '@core/visitors/normalizeVisitorDefinitions';
import type { VisitorPhaseInput } from '@core/TraversalVisitor';
import type { TraversalIterableConfigInput } from '@core/TraversalRunnerIterableConfig';
import type { EffectiveTraversalExecutionOptions } from '@core/TraversalRunnerIterableConfig';
import type { VisitorRecord } from '@core/graph/types';
import type { GraphWalkSource, AsyncGraphWalkSource } from '../GraphWalkSource';
import type {
  GraphWalkStrategy,
  GraphWalkRevisitPolicy,
  GraphWalkLimits,
  GraphWalkFollowEdge,
  AsyncGraphWalkFollowEdge,
  GraphWalkExpandVertex,
  AsyncGraphWalkExpandVertex,
} from '../GraphWalkOptions';
import type {
  GraphWalkVisitor,
  AsyncGraphWalkVisitor,
} from '../GraphWalkVisitor';
import { GraphWalkPhase } from '../GraphWalkPhase';

/** Captured methods retain the caller receiver without binding or freezing it. */
export type NormalizedWalkSource<Data, Edge, ID> = {
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
export type NormalizedWalkOptions<Data, Edge, ID> = {
  source: NormalizedWalkSource<Data, Edge, ID>;
  strategy: GraphWalkStrategy;
  revisit: GraphWalkRevisitPolicy;
  limits: GraphWalkLimits;
  followEdge:
    | GraphWalkFollowEdge<Data, Edge, ID>
    | AsyncGraphWalkFollowEdge<Data, Edge, ID>
    | undefined;
  expandVertex:
    | GraphWalkExpandVertex<Data, Edge, ID>
    | AsyncGraphWalkExpandVertex<Data, Edge, ID>
    | undefined;
  visitors: {
    [Phase in GraphWalkPhase]: VisitorRecord<
      WalkVisitor<Data, Edge, Phase, ID>
    >[];
  };
  execution: EffectiveTraversalExecutionOptions<GraphWalkPhase>;
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
  const source = object(value, 'Walking source must be an object');
  const roots = source['roots'];
  const outgoing = source['outgoing'];
  const resolveVertex = source['resolveVertex'];
  if (
    typeof roots !== 'function' ||
    typeof outgoing !== 'function' ||
    (resolveVertex !== undefined && typeof resolveVertex !== 'function')
  ) {
    throw new TypeError(
      'Walking source requires roots/outgoing and an optional resolver',
    );
  }
  // Only invocation signatures cross this unknown-input boundary. Callers are
  // invoked by the sessions, which validate their returned protocols/results.
  return {
    receiver: value,
    roots,
    outgoing,
    resolveVertex,
  } as NormalizedWalkSource<Data, Edge, ID>;
}

function assertKnownKeys(value: object, keys: readonly string[]): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key))
      throw new TypeError(`Unknown walking option: ${String(key)}`);
  }
}

function copyLimits(input: unknown): GraphWalkLimits {
  const value = object(input, 'Walking limits must be an object');
  assertKnownKeys(value, ['maxDepth', 'maxOccurrences', 'maxSteps']);
  const result: GraphWalkLimits = {};
  for (const key of ['maxDepth', 'maxOccurrences', 'maxSteps'] as const) {
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
  previous?: NormalizedWalkOptions<Data, Edge, ID>,
): NormalizedWalkOptions<Data, Edge, ID> {
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
    'followEdge',
    'expandVertex',
    'visitors',
    'emitPhases',
    'iterateOver',
    'visitorPhases',
    'enableVisitorFunctionsFor',
    'disableVisitorFunctionsFor',
  ];
  assertKnownKeys(value, keys);
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
    limits.maxSteps === undefined
  ) {
    throw new TypeError('Route enumeration requires maxDepth or maxSteps');
  }
  const followEdge =
    snapshot['followEdge'] === undefined
      ? previous?.followEdge
      : snapshot['followEdge'] === null
      ? undefined
      : snapshot['followEdge'];
  const expandVertex =
    snapshot['expandVertex'] === undefined
      ? previous?.expandVertex
      : snapshot['expandVertex'] === null
      ? undefined
      : snapshot['expandVertex'];
  if (
    (followEdge !== undefined && typeof followEdge !== 'function') ||
    (expandVertex !== undefined && typeof expandVertex !== 'function')
  ) {
    throw new TypeError('Walking predicates must be callbacks');
  }
  const visitorInput =
    snapshot['visitors'] === undefined
      ? {}
      : object(snapshot['visitors'], 'Walking visitors must be a phase map');
  if (
    Object.keys(visitorInput).some(
      (key) => !phases.includes(key as GraphWalkPhase),
    )
  ) {
    throw new TypeError('Unknown walking visitor phase');
  }
  function records<Phase extends GraphWalkPhase>(phase: Phase) {
    const entries = visitorInput[phase];
    return entries === undefined
      ? copyVisitorRecords(previous?.visitors[phase] ?? [])
      : normalizeVisitorDefinitions<WalkVisitor<Data, Edge, Phase, ID>>(
          entries as VisitorPhaseInput<WalkVisitor<Data, Edge, Phase, ID>>,
        );
  }
  const defaults = normalizeTraversalExecutionOptions(phases, {
    emitPhases: [GraphWalkPhase.VERTEX],
    visitorPhases: 'all',
  });
  const execution = normalizeTraversalExecutionOptions(
    phases,
    snapshot as TraversalIterableConfigInput<GraphWalkPhase>,
    previous?.execution ?? defaults,
  );
  return {
    source,
    strategy,
    revisit,
    limits,
    followEdge: followEdge as NormalizedWalkOptions<
      Data,
      Edge,
      ID
    >['followEdge'],
    expandVertex: expandVertex as NormalizedWalkOptions<
      Data,
      Edge,
      ID
    >['expandVertex'],
    visitors: {
      [GraphWalkPhase.VERTEX]: records(GraphWalkPhase.VERTEX),
      [GraphWalkPhase.EDGE]: records(GraphWalkPhase.EDGE),
      [GraphWalkPhase.PATH]: records(GraphWalkPhase.PATH),
    },
    execution,
  };
}
