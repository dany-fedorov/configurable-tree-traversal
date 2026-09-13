import {
  AsyncDepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversalVisitorCommandName,
  type AsyncCoreExecution,
  type AsyncDepthFirstTraversalInstanceConfig,
  type AsyncTraversalVisitor,
  type AsyncTraversableTree,
  type TreeTypeParameters,
} from '../src';

type Input = TreeTypeParameters<{ input: string }, string>;
type Output = TreeTypeParameters<{ output: number }, number>;

const tree: AsyncTraversableTree<Input, Output> = {
  makeRoot: async () => ({
    vertexContent: { $d: { input: 'root' }, $c: ['child'] },
  }),
  makeVertex: (hint, options) => {
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

const traversal = new AsyncDepthFirstTraversal<Input, Output>(config);
const visitor: AsyncTraversalVisitor<
  DepthFirstTraversalOrder,
  Input,
  Output
> = async (_vertex, options) => {
  const recursive: typeof visitor = options.visitorRecord.visitor;
  void recursive;
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
const runner = traversal.makeRunner();
const execution: AsyncCoreExecution<
  ReturnType<typeof runner.getIterable> extends AsyncGenerator<infer E>
    ? E
    : never
> = runner;
const iterable: AsyncGenerator = runner.getIterable();
const result: Promise<typeof runner> = runner.run();

// @ts-expect-error Async DFS visitors must rewrite to the output data type.
traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, async () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: { input: 'wrong' } },
    },
  ],
}));

void [execution, iterable, result];
