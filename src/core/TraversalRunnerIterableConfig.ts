/** Maps callback phases to event kinds accepted by TraversalExecutionOptions.
 * Explicit walking branches also preserve enum-to-literal mapping on TS 4.7. */
export type TraversalEventKindForVisitorPhase<Phase extends string> =
  Phase extends 'ON_WORK_READY'
    ? 'workCompletionCommitted'
    : Phase extends 'ON_SUBGRAPH_COMPLETION_READY'
    ? 'subgraphCompletionCommitted'
    : Phase extends 'vertexOccurrence'
    ? 'vertexOccurrence'
    : Phase extends 'admittedEdgeOccurrence'
    ? 'admittedEdgeOccurrence'
    : Phase extends 'routePrefix'
    ? 'routePrefix'
    : Phase;

export type VisitorCallbackPhaseSelection<VisitorPhase extends string> =
  | 'all'
  | { include: readonly VisitorPhase[]; exclude?: never }
  | { exclude: readonly VisitorPhase[]; include?: never };

export type TraversalExecutionSelectionPatch<
  VisitorPhase extends string,
  EmittedKind extends string = TraversalEventKindForVisitorPhase<VisitorPhase>,
> = {
  deliveredEventKinds?: readonly EmittedKind[] | undefined;
  admittedVisitorCallbackPhases?:
    | VisitorCallbackPhaseSelection<VisitorPhase>
    | { include: undefined; exclude?: never }
    | { exclude: undefined; include?: never }
    | undefined;
};

/** Internal normalized phase gates. Public input uses TraversalExecutionOptions. */
export type TraversalRunnerIterableConfig<VisitorPhase extends string> = {
  enableVisitorFunctionsFor: VisitorPhase[] | null;
  disableVisitorFunctionsFor: VisitorPhase[] | null;
  iterateOver: VisitorPhase[];
};

/** Private alias used by the shared engine; public input has no compatibility arms. */
export type TraversalIterableConfigInput<
  VisitorPhase extends string,
  EmittedKind extends string = TraversalEventKindForVisitorPhase<VisitorPhase>,
> = TraversalExecutionSelectionPatch<VisitorPhase, EmittedKind>;

export type EffectiveTraversalExecutionOptions<VisitorPhase extends string> = {
  deliveredEventKinds: TraversalEventKindForVisitorPhase<VisitorPhase>[];
  admittedVisitorCallbackPhases: VisitorCallbackPhaseSelection<VisitorPhase>;
};

/** Private phase gates used by the scheduling engine. */
export type ResolvedTraversalExecutionOptions<VisitorPhase extends string> =
  EffectiveTraversalExecutionOptions<VisitorPhase> &
    TraversalRunnerIterableConfig<VisitorPhase>;
