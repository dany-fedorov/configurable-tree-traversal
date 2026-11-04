import {
  AsyncBreadthFirstTreeTraversalBuilder,
  AsyncDepthFirstTreeTraversalBuilder,
  BreadthFirstTreeVisitPhase,
  DepthFirstTreeVisitPhase,
  TraversalVisitorCommandName,
  type AsyncBreadthFirstTreeTraversalBuilderOptions,
  type AsyncTraversalExecution,
  type AsyncDepthFirstTreeTraversalBuilderOptions,
  type AsyncTreeVertexPhaseVisitorCallback,
  type AsyncTreeDiscoverySource,
  type VertexDataAndChildHintTypes,
} from '../src';
type Input = VertexDataAndChildHintTypes<
  {
    input: string;
  },
  string
>;
type Output = VertexDataAndChildHintTypes<
  {
    output: number;
  },
  number
>;
const tree: AsyncTreeDiscoverySource<Input, Output> = {
  resolveRootVertex: async () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: { input: 'root' },
        $childDiscoveryHints: ['child'],
      },
    },
  }),
  resolveChildVertexFromHint: (hint, options) => {
    const input: string = hint;
    void [
      input,
      options.liveResolvedTreeView,
      options.livePreCommandDiscoveredTreeView,
    ];
    return Promise.resolve({ kind: 'vertexIntentionallyOmitted' as const });
  },
};
const config: AsyncDepthFirstTreeTraversalBuilderOptions<Input, Output> = {
  treeDiscoverySource: tree,
  transformChildHintsBeforeResolution: async (hints) => hints,
  visitors: {
    [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: [],
    [DepthFirstTreeVisitPhase.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: [],
    [DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES]: [],
  },
  childBoundaryVisits: {
    visitAfterChildIndices: {
      ranges: [
        { fromInclusive: 0, throughInclusive: 1 },
        { fromInclusive: -1, throughInclusive: -1 },
      ],
    },
    visitAfterChildIndicesWhenPrimarySelectionIsEmpty: { indices: [-1] },
    alsoVisitAfterOnlyChild: true,
    allowBoundaryVisitsAfterOmittedChildSlots: true,
  },
  retainDiscoveredTreeBeforeVisitorCommands: false,
  maxConcurrentCallbackInvocations: Infinity,
};
const traversal = new AsyncDepthFirstTreeTraversalBuilder<Input, Output>(
  config,
);
const visitor: AsyncTreeVertexPhaseVisitorCallback<
  Input,
  Output,
  DepthFirstTreeVisitPhase
> = async (_vertex, options) => {
  const metadata: import('../src').VisitorRegistrationMetadata =
    options.visitorRegistrationMetadata;
  void metadata;
  // @ts-expect-error Callback context metadata does not expose an executable callback.
  options.visitorRegistrationMetadata.visitor;
  return {
    commands: [
      {
        commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: { output: 1 } },
      },
    ],
  };
};
traversal.registerVisitorForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  visitor,
);
traversal.replaceVisitorDefinitionsForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  traversal.getDetachedVisitorRegistrationRecordsForPhase(
    DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  ),
);
const runner = traversal.createIndependentRunnerFromCurrentOptions();
const execution: AsyncTraversalExecution<
  DepthFirstTreeVisitPhase,
  ReturnType<
    typeof runner.runAndIterateObservationEventsUntilSuspendedOrTerminal
  > extends AsyncGenerator<infer E>
    ? E
    : never
> = runner;
const iterable: AsyncGenerator =
  runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const result: Promise<typeof runner> = runner.runUntilSuspendedOrTerminal();
const breadthConfig: AsyncBreadthFirstTreeTraversalBuilderOptions<
  Input,
  Output
> = {
  treeDiscoverySource: tree,
  transformChildHintsBeforeResolution: async (hints) => hints,
  visitors: { [BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX]: [] },
  retainDiscoveredTreeBeforeVisitorCommands: false,
  maxConcurrentCallbackInvocations: 2,
};
const breadthTraversal = new AsyncBreadthFirstTreeTraversalBuilder<
  Input,
  Output
>(breadthConfig);
const breadthVisitor: AsyncTreeVertexPhaseVisitorCallback<
  Input,
  Output,
  BreadthFirstTreeVisitPhase
> = async () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      commandArguments: { replacementVertexData: { output: 2 } },
    },
  ],
});
breadthTraversal.registerVisitorForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  breadthVisitor,
);
breadthTraversal.replaceVisitorDefinitionsForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  breadthTraversal.getDetachedVisitorRegistrationRecordsForPhase(
    BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  ),
);
const breadthRunner =
  breadthTraversal.createIndependentRunnerFromCurrentOptions();
const breadthExecution: AsyncTraversalExecution<
  BreadthFirstTreeVisitPhase,
  ReturnType<
    typeof breadthRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal
  > extends AsyncGenerator<infer E>
    ? E
    : never
> = breadthRunner;
const breadthIterable: AsyncGenerator =
  breadthRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const breadthResult: Promise<typeof breadthRunner> =
  breadthRunner.runUntilSuspendedOrTerminal();
breadthTraversal.registerVisitorForPhase(
  BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
  // @ts-expect-error Async BFS visitors must rewrite to the output data type.
  async () => ({
    commands: [
      {
        commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: { input: 'wrong' } },
      },
    ],
  }),
);
traversal.registerVisitorForPhase(
  DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
  // @ts-expect-error Async DFS visitors must rewrite to the output data type.
  async () => ({
    commands: [
      {
        commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
        commandArguments: { replacementVertexData: { input: 'wrong' } },
      },
    ],
  }),
);
void [
  execution,
  iterable,
  result,
  breadthExecution,
  breadthIterable,
  breadthResult,
];
