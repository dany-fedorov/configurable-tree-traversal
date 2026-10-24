export type VisitorPhaseSelection<ORDER extends string> =
  | 'all'
  | { include: readonly ORDER[]; exclude?: never }
  | { exclude: readonly ORDER[]; include?: never };

export type TraversalExecutionOptions<ORDER extends string> = {
  emitPhases?: readonly ORDER[];
  visitorPhases?: VisitorPhaseSelection<ORDER>;
};

/** Effective compatibility fields. Public execution input uses TraversalIterableConfigInput. */
export type TraversalRunnerIterableConfig<ORDER extends string> = {
  /** @deprecated Use visitorPhases. A non-null enable list takes precedence. */
  enableVisitorFunctionsFor: ORDER[] | null;
  /** @deprecated Use visitorPhases. Used only when the enable list is null. */
  disableVisitorFunctionsFor: ORDER[] | null;
  /** @deprecated Use emitPhases. */
  iterateOver: ORDER[];
};

type EmissionInput<ORDER extends string> =
  | { emitPhases?: readonly ORDER[]; iterateOver?: never }
  | {
      emitPhases?: never;
      /** @deprecated Use emitPhases. */
      iterateOver?: readonly ORDER[];
    };
type VisitorInput<ORDER extends string> =
  | {
      visitorPhases?: VisitorPhaseSelection<ORDER>;
      enableVisitorFunctionsFor?: never;
      disableVisitorFunctionsFor?: never;
    }
  | {
      visitorPhases?: never;
      /** @deprecated Use visitorPhases. */
      enableVisitorFunctionsFor?: readonly ORDER[] | null;
      /** @deprecated Use visitorPhases. */
      disableVisitorFunctionsFor?: readonly ORDER[] | null;
    };

/** Each supplied concern patches its previous effective value independently. */
export type TraversalIterableConfigInput<ORDER extends string> =
  EmissionInput<ORDER> & VisitorInput<ORDER>;

export type EffectiveTraversalExecutionOptions<ORDER extends string> =
  TraversalRunnerIterableConfig<ORDER> & {
    emitPhases: ORDER[];
    visitorPhases: VisitorPhaseSelection<ORDER>;
  };
