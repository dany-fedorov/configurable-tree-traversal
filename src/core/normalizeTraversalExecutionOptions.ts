import { assertOwnKeys, definedOptions } from './assertPublicOptions';
import type { TreeOrDagVisitorPhase } from './effects/types';
import type {
  TraversalEventKindForVisitorPhase,
  ResolvedTraversalExecutionOptions,
  TraversalIterableConfigInput,
  TraversalRunnerIterableConfig,
  VisitorCallbackPhaseSelection,
} from './TraversalRunnerIterableConfig';

const phasesByKind = {
  'depth-first': [
    'BEFORE_CHILD_EXPANSION',
    'AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES',
    'AFTER_CHILD_SUBTREES',
  ],
  'breadth-first': ['AT_LEVEL_ORDER_VERTEX'],
  dag: ['ON_WORK_READY', 'ON_SUBGRAPH_COMPLETION_READY'],
} as const;

export function getTraversalExecutionPhases(
  kind: keyof typeof phasesByKind,
): readonly TreeOrDagVisitorPhase[] {
  return phasesByKind[kind];
}

/** Capture recognized own fields once, including non-enumerable fields. */
function readExecutionOptions<VisitorPhase extends string>(
  input?: TraversalIterableConfigInput<VisitorPhase>,
): TraversalIterableConfigInput<VisitorPhase> {
  if (
    input !== undefined &&
    (input === null || typeof input !== 'object' || Array.isArray(input))
  ) {
    throw new TypeError('Execution options must be an object');
  }
  if (input === undefined) return {};
  const result: Record<string, unknown> = {};
  const keys = ['deliveredEventKinds', 'admittedVisitorCallbackPhases'];
  assertOwnKeys(input, keys);
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value: unknown = Reflect.get(input, key);
      if (
        key === 'admittedVisitorCallbackPhases' &&
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
  return result as TraversalIterableConfigInput<VisitorPhase>;
}

/** Validate and detach input before any runner state changes. */
export function normalizeTraversalExecutionOptions<VisitorPhase extends string>(
  phases: readonly VisitorPhase[],
  input?: TraversalIterableConfigInput<VisitorPhase>,
  previous?: ResolvedTraversalExecutionOptions<VisitorPhase>,
): ResolvedTraversalExecutionOptions<VisitorPhase> {
  const config = readExecutionOptions(input);
  function copyPhases(value: unknown): VisitorPhase[] {
    if (!Array.isArray(value)) {
      throw new TypeError(
        'Execution phase lists must contain valid family phases',
      );
    }
    const copy: unknown[] = Array.from(value as unknown[]);
    if (copy.some((phase) => !phases.includes(phase as VisitorPhase))) {
      throw new TypeError(
        'Execution phase lists must contain valid family phases',
      );
    }
    return copy as VisitorPhase[];
  }
  const kinds = phases.map(emissionKind);
  let deliveredEventKinds =
    previous === undefined
      ? kinds.slice()
      : previous.deliveredEventKinds.slice();
  let enable = previous?.enableVisitorFunctionsFor?.slice() ?? null;
  let disable = previous?.disableVisitorFunctionsFor?.slice() ?? null;
  if (config.deliveredEventKinds !== undefined)
    deliveredEventKinds = copyPhasesForEvents(config.deliveredEventKinds);
  function copyPhasesForEvents(
    value: unknown,
  ): TraversalEventKindForVisitorPhase<VisitorPhase>[] {
    if (!Array.isArray(value)) {
      throw new TypeError(
        'Execution event lists must contain valid family event kinds',
      );
    }
    const copy: unknown[] = Array.from(value as unknown[]);
    if (
      copy.some(
        (kind) =>
          !kinds.includes(
            kind as TraversalEventKindForVisitorPhase<VisitorPhase>,
          ),
      )
    ) {
      throw new TypeError(
        'Execution event lists must contain valid family event kinds',
      );
    }
    return copy as TraversalEventKindForVisitorPhase<VisitorPhase>[];
  }
  if (config.admittedVisitorCallbackPhases !== undefined) {
    const selectionInput = config.admittedVisitorCallbackPhases;
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
          { deliveredEventKinds },
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
  const admittedVisitorCallbackPhases: VisitorCallbackPhaseSelection<VisitorPhase> =
    enable !== null
      ? { include: enable.slice() }
      : disable !== null
      ? { exclude: disable.slice() }
      : 'all';
  return {
    deliveredEventKinds,
    admittedVisitorCallbackPhases,
    iterateOver: deliveredEventKinds.map(
      (kind) => phases.find((phase) => emissionKind(phase) === kind)!,
    ),
    enableVisitorFunctionsFor: enable,
    disableVisitorFunctionsFor: disable,
  };
}

/** Detach supplied canonical fields before changing runner state. */
export function detachTraversalExecutionOptions<VisitorPhase extends string>(
  phases: readonly VisitorPhase[],
  input: TraversalIterableConfigInput<VisitorPhase>,
): TraversalIterableConfigInput<VisitorPhase> {
  const config = readExecutionOptions(input);
  const effective = normalizeTraversalExecutionOptions(phases, config);
  const selection = config.admittedVisitorCallbackPhases;
  const retainSelection =
    selection !== undefined &&
    selection !== 'all' &&
    Object.values(selection).every((value) => value === undefined);
  return {
    ...(config.deliveredEventKinds === undefined
      ? {}
      : { deliveredEventKinds: effective.deliveredEventKinds }),
    ...(config.admittedVisitorCallbackPhases === undefined || retainSelection
      ? {}
      : {
          admittedVisitorCallbackPhases:
            effective.admittedVisitorCallbackPhases,
        }),
  };
}

/** Convert private scheduler gates back to canonical selection input. */
export function executionOptionsFromPhaseGates<VisitorPhase extends string>(
  config: TraversalRunnerIterableConfig<VisitorPhase>,
): TraversalIterableConfigInput<VisitorPhase> {
  return {
    deliveredEventKinds: config.iterateOver.map(emissionKind),
    admittedVisitorCallbackPhases:
      config.enableVisitorFunctionsFor !== null
        ? { include: config.enableVisitorFunctionsFor }
        : config.disableVisitorFunctionsFor !== null
        ? { exclude: config.disableVisitorFunctionsFor }
        : 'all',
  };
}

/** Translate resolved selections for internal visitorPhase-gate consumers. */
export function toLegacyTraversalExecutionConfig<VisitorPhase extends string>(
  config: ResolvedTraversalExecutionOptions<VisitorPhase>,
): TraversalRunnerIterableConfig<VisitorPhase> {
  return {
    iterateOver: config.iterateOver,
    enableVisitorFunctionsFor: config.enableVisitorFunctionsFor,
    disableVisitorFunctionsFor: config.disableVisitorFunctionsFor,
  };
}

/** Translate a callback boundary to its committed public event discriminant. */
export function emissionKind<Phase extends string>(
  phase: Phase,
): TraversalEventKindForVisitorPhase<Phase> {
  return (
    phase === 'ON_WORK_READY'
      ? 'workCompletionCommitted'
      : phase === 'ON_SUBGRAPH_COMPLETION_READY'
      ? 'subgraphCompletionCommitted'
      : phase
  ) as TraversalEventKindForVisitorPhase<Phase>;
}
