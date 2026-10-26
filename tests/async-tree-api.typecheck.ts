import {
  AsyncBreadthFirstTreeTraversal,
  AsyncDepthFirstTreeTraversal,
  BreadthFirstTraversalOrder,
  DepthFirstTraversalOrder,
  TraversalVisitorCommandName,
  type AsyncCoreExecution,
  type AsyncBreadthFirstTraversalInstanceConfig,
  type AsyncDepthFirstTraversalInstanceConfig,
  type AsyncTraversalVisitor,
  type AsyncTreeSource,
  type VertexTypes,
} from '../src';

type Input = VertexTypes<{ input: string }, string>;
type Output = VertexTypes<{ output: number }, number>;

const tree: AsyncTreeSource<Input, Output> = {
  resolveRoot: async () => ({
    vertexContent: { $d: { input: 'root' }, $c: ['child'] },
  }),
  resolveChild: (hint, options) => {
    const input: string = hint;
    void [input, options.resolvedTree, options.notMutatedResolvedTree];
    return Promise.resolve({ vertexContent: null });
  },
};

const config: AsyncDepthFirstTraversalInstanceConfig<Input, Output> = {
  traversableTree: tree,
  sortChildrenHints: async (hints) => hints,
  visitors: {
    [DepthFirstTraversalOrder.PRE_ORDER]: [],
    [DepthFirstTraversalOrder.IN_ORDER]: [],
    [DepthFirstTraversalOrder.POST_ORDER]: [],
  },
  inOrderTraversalConfig: {
    visitParentAfterChildren: { ranges: [[0, 1], -1] },
    visitParentAfterChildrenAllRangesOutOfBoundsFallback: -1,
    visitUpOneChildParents: true,
    considerVisitAfterNullContentVertices: true,
  },
  saveNotMutatedResolvedTree: false,
  traversalRunnerInternalObjects: {},
  concurrency: Infinity,
};

const traversal = new AsyncDepthFirstTreeTraversal<Input, Output>(config);
const visitor: AsyncTraversalVisitor<
  DepthFirstTraversalOrder,
  Input,
  Output
> = async (_vertex, options) => {
  const metadata: import('../src').VisitorRegistrationMetadata =
    options.visitorRecord;
  void metadata;
  // @ts-expect-error Callback context metadata does not expose an executable callback.
  options.visitorRecord.visitor;
  return {
    commands: [
      {
        commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
        commandArguments: { newData: { output: 1 } },
      },
    ],
  };
};
traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, visitor);
traversal.setVisitorsFor(
  DepthFirstTraversalOrder.PRE_ORDER,
  traversal.listVisitorsFor(DepthFirstTraversalOrder.PRE_ORDER),
);
const runner = traversal.createRunner();
const execution: AsyncCoreExecution<
  ReturnType<typeof runner.getIterable> extends AsyncGenerator<infer E>
    ? E
    : never
> = runner;
const iterable: AsyncGenerator = runner.getIterable();
const result: Promise<typeof runner> = runner.run();

const breadthConfig: AsyncBreadthFirstTraversalInstanceConfig<Input, Output> = {
  traversableTree: tree,
  sortChildrenHints: async (hints) => hints,
  visitors: { [BreadthFirstTraversalOrder.LEVEL_ORDER]: [] },
  saveNotMutatedResolvedTree: false,
  traversalRunnerInternalObjects: {
    resolvedTreesContainer: null,
    state: null,
  },
  concurrency: 2,
};
const breadthTraversal = new AsyncBreadthFirstTreeTraversal<Input, Output>(
  breadthConfig,
);
const breadthVisitor: AsyncTraversalVisitor<
  BreadthFirstTraversalOrder,
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
breadthTraversal.addVisitorFor(
  BreadthFirstTraversalOrder.LEVEL_ORDER,
  breadthVisitor,
);
breadthTraversal.setVisitorsFor(
  BreadthFirstTraversalOrder.LEVEL_ORDER,
  breadthTraversal.listVisitorsFor(BreadthFirstTraversalOrder.LEVEL_ORDER),
);
const breadthRunner = breadthTraversal.createRunner();
const breadthExecution: AsyncCoreExecution<
  ReturnType<typeof breadthRunner.getIterable> extends AsyncGenerator<infer E>
    ? E
    : never
> = breadthRunner;
const breadthIterable: AsyncGenerator = breadthRunner.getIterable();
const breadthResult: Promise<typeof breadthRunner> = breadthRunner.run();

breadthTraversal.addVisitorFor(
  BreadthFirstTraversalOrder.LEVEL_ORDER,
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
traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, async () => ({
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
