/** The event discriminant at each internal callback boundary. */
export type EmissionKind<Phase extends string> = Phase extends 'ON_WORK_READY'
  ? 'workCompleted'
  : Phase extends 'ON_SUBGRAPH_READY'
  ? 'subgraphCompleted'
  : Phase extends 'vertex' | 'edge' | 'path'
  ? `${Phase}`
  : Phase;

export type VisitorPhaseSelection<ORDER extends string> =
  | 'all'
  | { include: readonly ORDER[]; exclude?: never }
  | { exclude: readonly ORDER[]; include?: never };

export type TraversalExecutionOptions<
  VisitorPhase extends string,
  EmittedKind extends string = VisitorPhase,
> = {
  emitEvents?: readonly EmittedKind[];
  visitorPhases?: VisitorPhaseSelection<VisitorPhase>;
};

/** Effective compatibility fields. Public execution input uses TraversalIterableConfigInput. */
export type TraversalRunnerIterableConfig<ORDER extends string> = {
  /** @deprecated Use visitorPhases. A non-null enable list takes precedence. */
  enableVisitorFunctionsFor: ORDER[] | null;
  /** @deprecated Use visitorPhases. Used only when the enable list is null. */
  disableVisitorFunctionsFor: ORDER[] | null;
  /** @deprecated Use emitEvents. */
  iterateOver: ORDER[];
};

type EmissionInput<ORDER extends string, EmittedKind extends string> =
  | { emitEvents?: readonly EmittedKind[]; iterateOver?: never }
  | {
      emitEvents?: never;
      /** @deprecated Use emitEvents. */
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
export type TraversalIterableConfigInput<
  ORDER extends string,
  EmittedKind extends string = EmissionKind<ORDER>,
> = EmissionInput<ORDER, EmittedKind> & VisitorInput<ORDER>;

export type EffectiveTraversalExecutionOptions<ORDER extends string> =
  TraversalRunnerIterableConfig<ORDER> & {
    emitEvents: EmissionKind<ORDER>[];
    visitorPhases: VisitorPhaseSelection<ORDER>;
  };
