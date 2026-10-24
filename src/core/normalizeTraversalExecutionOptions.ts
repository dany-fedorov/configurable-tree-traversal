import type { VisitOrder } from './effects/types';
import type {
  EffectiveTraversalExecutionOptions,
  TraversalIterableConfigInput,
  TraversalRunnerIterableConfig,
  VisitorPhaseSelection,
} from './TraversalRunnerIterableConfig';

const phasesByKind = {
  'depth-first': ['PRE_ORDER', 'IN_ORDER', 'POST_ORDER'],
  'breadth-first': ['LEVEL_ORDER'],
  dag: ['ON_READY', 'ON_COMPLETE'],
} as const;

export function getTraversalExecutionPhases(
  kind: keyof typeof phasesByKind,
): readonly VisitOrder[] {
  return phasesByKind[kind];
}

/** Capture recognized own fields once, including non-enumerable aliases. */
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
  for (const key of [
    'emitPhases',
    'iterateOver',
    'visitorPhases',
    'enableVisitorFunctionsFor',
    'disableVisitorFunctionsFor',
  ]) {
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
  previous?: EffectiveTraversalExecutionOptions<ORDER>,
): EffectiveTraversalExecutionOptions<ORDER> {
  const config = readExecutionOptions(input);
  const has = (key: string) =>
    Object.prototype.hasOwnProperty.call(config, key);
  if (has('emitPhases') && has('iterateOver')) {
    throw new TypeError('emitPhases and iterateOver cannot be combined');
  }
  if (
    has('visitorPhases') &&
    (has('enableVisitorFunctionsFor') || has('disableVisitorFunctionsFor'))
  ) {
    throw new TypeError(
      'visitorPhases and legacy visitor selectors cannot be combined',
    );
  }
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
  let emitPhases =
    previous === undefined ? phases.slice() : previous.emitPhases.slice();
  let enable = previous?.enableVisitorFunctionsFor?.slice() ?? null;
  let disable = previous?.disableVisitorFunctionsFor?.slice() ?? null;
  if (config.emitPhases !== undefined)
    emitPhases = copyPhases(config.emitPhases);
  if (config.iterateOver !== undefined)
    emitPhases = copyPhases(config.iterateOver);
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
  if (config.enableVisitorFunctionsFor !== undefined) {
    enable =
      config.enableVisitorFunctionsFor === null
        ? null
        : copyPhases(config.enableVisitorFunctionsFor);
  }
  if (config.disableVisitorFunctionsFor !== undefined) {
    disable =
      config.disableVisitorFunctionsFor === null
        ? null
        : copyPhases(config.disableVisitorFunctionsFor);
  }
  const visitorPhases: VisitorPhaseSelection<ORDER> =
    enable !== null
      ? { include: enable.slice() }
      : disable !== null
      ? { exclude: disable.slice() }
      : 'all';
  return {
    emitPhases,
    visitorPhases,
    iterateOver: emitPhases.slice(),
    enableVisitorFunctionsFor: enable,
    disableVisitorFunctionsFor: disable,
  };
}

/** A validated patch retains supplied legacy fields rather than filling defaults.
 * Later ownership checks and kernel resume only see detached data, never caller getters.
 */
export function detachTraversalExecutionOptions<ORDER extends string>(
  phases: readonly ORDER[],
  input: TraversalIterableConfigInput<ORDER>,
): TraversalIterableConfigInput<ORDER> {
  const config = readExecutionOptions(input);
  const effective = normalizeTraversalExecutionOptions(phases, config);
  const patch: {
    emitPhases?: readonly ORDER[];
    enableVisitorFunctionsFor?: readonly ORDER[] | null;
    disableVisitorFunctionsFor?: readonly ORDER[] | null;
  } = {};
  if (config.emitPhases !== undefined || config.iterateOver !== undefined) {
    patch.emitPhases = effective.emitPhases;
  }
  if (config.visitorPhases !== undefined) {
    patch.enableVisitorFunctionsFor = effective.enableVisitorFunctionsFor;
    patch.disableVisitorFunctionsFor = effective.disableVisitorFunctionsFor;
  } else {
    if (config.enableVisitorFunctionsFor !== undefined) {
      patch.enableVisitorFunctionsFor = effective.enableVisitorFunctionsFor;
    }
    if (config.disableVisitorFunctionsFor !== undefined) {
      patch.disableVisitorFunctionsFor = effective.disableVisitorFunctionsFor;
    }
  }
  return patch;
}

/** Public legacy helpers must remain directly reusable as execution inputs. */
export function toLegacyTraversalExecutionConfig<ORDER extends string>(
  config: EffectiveTraversalExecutionOptions<ORDER>,
): TraversalRunnerIterableConfig<ORDER> {
  return {
    iterateOver: config.iterateOver,
    enableVisitorFunctionsFor: config.enableVisitorFunctionsFor,
    disableVisitorFunctionsFor: config.disableVisitorFunctionsFor,
  };
}
