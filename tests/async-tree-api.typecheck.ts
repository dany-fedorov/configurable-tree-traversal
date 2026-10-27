import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstPhase,
  DepthFirstPhase,
  TraversalVisitorCommandName,
  type AsyncBreadthFirstTreeOptions,
  type AsyncTraversalExecution,
  type AsyncDepthFirstTreeOptions,
  type AsyncTreeVisitor,
  type AsyncTreeSource,
  type VertexTypes,
} from '../src';

type Input = VertexTypes<{ input: string }, string>;
type Output = VertexTypes<{ output: number }, number>;

const tree: AsyncTreeSource<Input, Output> = {
  resolveRoot: async () => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: { $data: { input: 'root' }, $childHints: ['child'] },
    },
  }),
  resolveChild: (hint, options) => {
    const input: string = hint;
    void [input, options.resolvedTree, options.originalTreeView];
    return Promise.resolve({ kind: 'omitted' as const });
  },
};

const config: AsyncDepthFirstTreeOptions<Input, Output> = {
  traversableTree: tree,
  sortChildrenHints: async (hints) => hints,
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: [],
    [DepthFirstPhase.IN_ORDER]: [],
    [DepthFirstPhase.POST_ORDER]: [],
  },
  inOrder: {
    afterChildIndices: { ranges: [[0, 1], -1] },
    fallbackChildIndices: -1,
    visitSingleChildParent: true,
    visitAfterOmittedChildren: true,
  },
  retainOriginalTreeStructure: false,
  concurrency: Infinity,
};

const traversal = new AsyncDepthFirstTreeTraversal<Input, Output>(config);
const visitor: AsyncTreeVisitor<DepthFirstPhase, Input, Output> = async (
  _vertex,
  options,
) => {
  const metadata: import('../src').VisitorRegistrationMetadata =
    options.registration;
  void metadata;
  // @ts-expect-error Callback context metadata does not expose an executable callback.
  options.registration.visitor;
  return {
    commands: [
      {
        commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
        commandArguments: { newData: { output: 1 } },
      },
    ],
  };
};
traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, visitor);
traversal.setVisitorsFor(
  DepthFirstPhase.PRE_ORDER,
  traversal.listVisitorsFor(DepthFirstPhase.PRE_ORDER),
);
const runner = traversal.createRunner();
const execution: AsyncTraversalExecution<
  DepthFirstPhase,
  ReturnType<typeof runner.iterateEvents> extends AsyncGenerator<infer E>
    ? E
    : never
> = runner;
const iterable: AsyncGenerator = runner.iterateEvents();
const result: Promise<typeof runner> = runner.run();

const breadthConfig: AsyncBreadthFirstTreeOptions<Input, Output> = {
  traversableTree: tree,
  sortChildrenHints: async (hints) => hints,
  visitors: { [BreadthFirstPhase.LEVEL_ORDER]: [] },
  retainOriginalTreeStructure: false,
  concurrency: 2,
};
const breadthTraversal = new AsyncBreadthFirstTreeTraversal<Input, Output>(
  breadthConfig,
);
const breadthVisitor: AsyncTreeVisitor<
  BreadthFirstPhase,
  Input,
  Output
> = async () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: { output: 2 } },
    },
  ],
});
breadthTraversal.addVisitorFor(BreadthFirstPhase.LEVEL_ORDER, breadthVisitor);
breadthTraversal.setVisitorsFor(
  BreadthFirstPhase.LEVEL_ORDER,
  breadthTraversal.listVisitorsFor(BreadthFirstPhase.LEVEL_ORDER),
);
const breadthRunner = breadthTraversal.createRunner();
const breadthExecution: AsyncTraversalExecution<
  BreadthFirstPhase,
  ReturnType<typeof breadthRunner.iterateEvents> extends AsyncGenerator<infer E>
    ? E
    : never
> = breadthRunner;
const breadthIterable: AsyncGenerator = breadthRunner.iterateEvents();
const breadthResult: Promise<typeof breadthRunner> = breadthRunner.run();

breadthTraversal.addVisitorFor(
  BreadthFirstPhase.LEVEL_ORDER,
  // @ts-expect-error Async BFS visitors must rewrite to the output data type.
  async () => ({
    commands: [
      {
        commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
        commandArguments: { newData: { input: 'wrong' } },
      },
    ],
  }),
);

// @ts-expect-error Async DFS visitors must rewrite to the output data type.
traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, async () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: { input: 'wrong' } },
    },
  ],
}));

void [
  execution,
  iterable,
  result,
  breadthExecution,
  breadthIterable,
  breadthResult,
];
