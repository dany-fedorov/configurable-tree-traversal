import { assertOwnKeys, definedOptions } from './assertPublicOptions';
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
  assertOwnKeys(input, keys);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value: unknown = Reflect.get(input, key);
      if (
        key === 'visitorPhases' &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        assertOwnKeys(value, ['include', 'exclude']);
        result[key] = Object.fromEntries(
          Reflect.ownKeys(value).map((field) => [
            field,
            Reflect.get(value, field),
          ]),
        );
      } else {
        result[key] = value;
      }
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
    const selectionInput = config.visitorPhases;
    enable = null;
    disable = null;
    if (selectionInput !== 'all') {
      if (
        selectionInput === null ||
        typeof selectionInput !== 'object' ||
        Array.isArray(selectionInput)
      ) {
        throw new TypeError('visitorPhases must be all, include, or exclude');
      }
      assertOwnKeys(selectionInput, ['include', 'exclude']);
      const selection = definedOptions(selectionInput);
      const include = selection.include !== undefined;
      const exclude = selection.exclude !== undefined;
      if (!include && !exclude && Reflect.ownKeys(selectionInput).length > 0) {
        return normalizeTraversalExecutionOptions(
          phases,
          { emitEvents },
          previous,
        );
      }
      if (include === exclude) {
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
  const selection = config.visitorPhases;
  const retainSelection =
    selection !== undefined &&
    selection !== 'all' &&
    Object.values(selection).every((value) => value === undefined);
  return {
    ...(config.emitEvents === undefined
      ? {}
      : { emitEvents: effective.emitEvents }),
    ...(config.visitorPhases === undefined || retainSelection
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
