import type { VisitPhase } from './effects/types';
import type {
  EmissionKind,
  ResolvedTraversalExecutionOptions,
  TraversalIterableConfigInput,
  TraversalRunnerIterableConfig,
  VisitorPhaseSelection,
} from './TraversalRunnerIterableConfig';

const phasesByKind = {
  'depth-first': ['PRE_ORDER', 'IN_ORDER', 'POST_ORDER'],
  'breadth-first': ['LEVEL_ORDER'],
  dag: ['ON_WORK_READY', 'ON_SUBGRAPH_READY'],
} as const;

export function getTraversalExecutionPhases(
  kind: keyof typeof phasesByKind,
): readonly VisitPhase[] {
  return phasesByKind[kind];
}

/** Capture recognized own fields once, including non-enumerable fields. */
function readExecutionOptions<ORDER extends string>(
  input?: TraversalIterableConfigInput<ORDER>,
): TraversalIterableConfigInput<ORDER> {
  if (
    input !== undefined &&
    (input === null || typeof input !== 'object' || Array.isArray(input))
  ) {
    throw new TypeError('Execution options must be an object');
  }
  if (input === undefined) return {};
  const result: Record<string, unknown> = {};
  const keys = ['emitEvents', 'visitorPhases'];
  if (Object.getOwnPropertyNames(input).some((key) => !keys.includes(key))) {
    throw new TypeError('Unknown execution option');
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      result[key] = (input as Record<string, unknown>)[key];
    }
  }
  return result as TraversalIterableConfigInput<ORDER>;
}

/** Validate and detach input before any runner state changes. */
export function normalizeTraversalExecutionOptions<ORDER extends string>(
  phases: readonly ORDER[],
  input?: TraversalIterableConfigInput<ORDER>,
  previous?: ResolvedTraversalExecutionOptions<ORDER>,
): ResolvedTraversalExecutionOptions<ORDER> {
  const config = readExecutionOptions(input);
  function copyPhases(value: unknown): ORDER[] {
    if (!Array.isArray(value)) {
      throw new TypeError(
        'Execution phase lists must contain valid family phases',
      );
    }
    const copy: unknown[] = Array.from(value as unknown[]);
    if (copy.some((phase) => !phases.includes(phase as ORDER))) {
      throw new TypeError(
        'Execution phase lists must contain valid family phases',
      );
    }
    return copy as ORDER[];
  }
  const kinds = phases.map(emissionKind);
  let emitEvents =
    previous === undefined ? kinds.slice() : previous.emitEvents.slice();
  let enable = previous?.enableVisitorFunctionsFor?.slice() ?? null;
  let disable = previous?.disableVisitorFunctionsFor?.slice() ?? null;
  if (config.emitEvents !== undefined)
    emitEvents = copyPhasesForEvents(config.emitEvents);
  function copyPhasesForEvents(value: unknown): EmissionKind<ORDER>[] {
    if (!Array.isArray(value)) {
      throw new TypeError(
        'Execution event lists must contain valid family event kinds',
      );
    }
    const copy: unknown[] = Array.from(value as unknown[]);
    if (copy.some((kind) => !kinds.includes(kind as EmissionKind<ORDER>))) {
      throw new TypeError(
        'Execution event lists must contain valid family event kinds',
      );
    }
    return copy as EmissionKind<ORDER>[];
  }
  if (config.visitorPhases !== undefined) {
    const selection = config.visitorPhases;
    enable = null;
    disable = null;
    if (selection !== 'all') {
      if (
        selection === null ||
        typeof selection !== 'object' ||
        Array.isArray(selection)
      ) {
        throw new TypeError('visitorPhases must be all, include, or exclude');
      }
      const include = Object.prototype.hasOwnProperty.call(
        selection,
        'include',
      );
      const exclude = Object.prototype.hasOwnProperty.call(
        selection,
        'exclude',
      );
      if (
        include === exclude ||
        Object.keys(selection).some(
          (key) => key !== 'include' && key !== 'exclude',
        )
      ) {
        throw new TypeError(
          'visitorPhases requires exactly one of include or exclude',
        );
      }
      if (include) enable = copyPhases(selection.include);
      else disable = copyPhases(selection.exclude);
    }
  }
  const visitorPhases: VisitorPhaseSelection<ORDER> =
    enable !== null
      ? { include: enable.slice() }
      : disable !== null
      ? { exclude: disable.slice() }
      : 'all';
  return {
    emitEvents,
    visitorPhases,
    iterateOver: emitEvents.map(
      (kind) => phases.find((phase) => emissionKind(phase) === kind)!,
    ),
    enableVisitorFunctionsFor: enable,
    disableVisitorFunctionsFor: disable,
  };
}

/** Detach supplied canonical fields before changing runner state. */
export function detachTraversalExecutionOptions<ORDER extends string>(
  phases: readonly ORDER[],
  input: TraversalIterableConfigInput<ORDER>,
): TraversalIterableConfigInput<ORDER> {
  const config = readExecutionOptions(input);
  const effective = normalizeTraversalExecutionOptions(phases, config);
  return {
    ...(config.emitEvents === undefined
      ? {}
      : { emitEvents: effective.emitEvents }),
    ...(config.visitorPhases === undefined
      ? {}
      : { visitorPhases: effective.visitorPhases }),
  };
}

/** Convert private scheduler gates back to canonical selection input. */
export function executionOptionsFromPhaseGates<ORDER extends string>(
  config: TraversalRunnerIterableConfig<ORDER>,
): TraversalIterableConfigInput<ORDER> {
  return {
    emitEvents: config.iterateOver.map(emissionKind),
    visitorPhases:
      config.enableVisitorFunctionsFor !== null
        ? { include: config.enableVisitorFunctionsFor }
        : config.disableVisitorFunctionsFor !== null
        ? { exclude: config.disableVisitorFunctionsFor }
        : 'all',
  };
}

/** Translate resolved selections for internal phase-gate consumers. */
export function toLegacyTraversalExecutionConfig<ORDER extends string>(
  config: ResolvedTraversalExecutionOptions<ORDER>,
): TraversalRunnerIterableConfig<ORDER> {
  return {
    iterateOver: config.iterateOver,
    enableVisitorFunctionsFor: config.enableVisitorFunctionsFor,
    disableVisitorFunctionsFor: config.disableVisitorFunctionsFor,
  };
}

/** Translate a callback boundary to its committed public event discriminant. */
export function emissionKind<Phase extends string>(
  phase: Phase,
): EmissionKind<Phase> {
  return (
    phase === 'ON_WORK_READY'
      ? 'workCompleted'
      : phase === 'ON_SUBGRAPH_READY'
      ? 'subgraphCompleted'
      : phase
  ) as EmissionKind<Phase>;
}
