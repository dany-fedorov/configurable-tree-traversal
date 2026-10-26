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
  EmittedKind extends string = EmissionKind<VisitorPhase>,
> = {
  emitEvents?: readonly EmittedKind[];
  visitorPhases?: VisitorPhaseSelection<VisitorPhase>;
};

/** Internal normalized phase gates. Public input uses TraversalExecutionOptions. */
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

/** @deprecated Compatibility decoding only; public execution uses TraversalExecutionOptions. */
export type TraversalIterableConfigInput<
  ORDER extends string,
  EmittedKind extends string = EmissionKind<ORDER>,
> = EmissionInput<ORDER, EmittedKind> & VisitorInput<ORDER>;

export type EffectiveTraversalExecutionOptions<ORDER extends string> = {
  emitEvents: EmissionKind<ORDER>[];
  visitorPhases: VisitorPhaseSelection<ORDER>;
};

/** Private phase gates used by the scheduling engine. */
export type ResolvedTraversalExecutionOptions<ORDER extends string> =
  EffectiveTraversalExecutionOptions<ORDER> &
    TraversalRunnerIterableConfig<ORDER>;
