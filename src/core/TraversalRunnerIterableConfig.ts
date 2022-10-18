export type TraversalRunnerIterableConfig<ORDER extends string> = {
  enableVisitorFunctionsFor: ORDER[] | null;
  disableVisitorFunctionsFor: ORDER[] | null;
  iterateOver: ORDER[];
};

export type TraversalIterableConfigInput<ORDER extends string> = Partial<
  TraversalRunnerIterableConfig<ORDER>
>;
