/** Maps callback phases to event kinds accepted by TraversalExecutionOptions.
 * Explicit walking branches also preserve enum-to-literal mapping on TS 4.7. */
export type EmissionKind<Phase extends string> = Phase extends 'ON_WORK_READY'
  ? 'workCompleted'
  : Phase extends 'ON_SUBGRAPH_READY'
  ? 'subgraphCompleted'
  : Phase extends 'vertex'
  ? 'vertex'
  : Phase extends 'edge'
  ? 'edge'
  : Phase extends 'path'
  ? 'path'
  : Phase;

export type VisitorPhaseSelection<ORDER extends string> =
  | 'all'
  | { include: readonly ORDER[]; exclude?: never }
  | { exclude: readonly ORDER[]; include?: never };

export type TraversalExecutionOptions<
  VisitorPhase extends string,
  EmittedKind extends string = EmissionKind<VisitorPhase>,
> = {
  emitEvents?: readonly EmittedKind[] | undefined;
  visitorPhases?:
    | VisitorPhaseSelection<VisitorPhase>
    | { include: undefined; exclude?: never }
    | { exclude: undefined; include?: never }
    | undefined;
};

/** Internal normalized phase gates. Public input uses TraversalExecutionOptions. */
export type TraversalRunnerIterableConfig<ORDER extends string> = {
  enableVisitorFunctionsFor: ORDER[] | null;
  disableVisitorFunctionsFor: ORDER[] | null;
  iterateOver: ORDER[];
};

/** Private alias used by the shared engine; public input has no compatibility arms. */
export type TraversalIterableConfigInput<
  ORDER extends string,
  EmittedKind extends string = EmissionKind<ORDER>,
> = TraversalExecutionOptions<ORDER, EmittedKind>;

export type EffectiveTraversalExecutionOptions<ORDER extends string> = {
  emitEvents: EmissionKind<ORDER>[];
  visitorPhases: VisitorPhaseSelection<ORDER>;
};

/** Private phase gates used by the scheduling engine. */
export type ResolvedTraversalExecutionOptions<ORDER extends string> =
  EffectiveTraversalExecutionOptions<ORDER> &
    TraversalRunnerIterableConfig<ORDER>;
