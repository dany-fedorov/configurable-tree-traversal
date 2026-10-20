import { CTTRef } from '../src/core/CTTRef';
import type {
  AsyncTraversableGraph,
  TraversableGraph,
} from '../src/core/TraversableGraph';
import type { AsyncTraversableTree } from '../src/core/AsyncTraversableTree';
import type {
  AsyncTraversalVisitor,
  AsyncTraversalVisitorInputOptions,
} from '../src/core/AsyncTraversalVisitor';
import type { ResolvedGraph } from '../src/core/ResolvedGraph';
import type { TraversableTree } from '../src/core/TraversableTree';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';
import type { HintVertexId } from '../src/core/graph/types';
import type { DagTraversalOrder } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type {
  AsyncDagVisitor,
  DagVisitor,
} from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';

type Input = TreeTypeParameters<{ input: string }, string>;
type Output = TreeTypeParameters<{ output: number }, number>;

const graph: TraversableGraph<Input, Output> = {
  makeRoot: () => ({
    vertexContent: { $d: { input: 'root' }, $c: ['child'] },
    vertexId: undefined,
    dependsOn: [null, NaN],
  }),
  makeVertex: (hint, options) => {
    const resolved: ResolvedGraph<Input | Output> = options.resolvedGraph;
    const input: string = hint;
    void [resolved, input, options.notMutatedResolvedGraph];
    // @ts-expect-error Graph callbacks do not receive the tree facade.
    options.resolvedTree;
    return { vertexContent: null, vertexId: hint };
  },
  getVertexIdFromHint: (hint): HintVertexId => ({ vertexId: hint }),
};

const asyncGraph: AsyncTraversableGraph<Input, Output> = graph;
const tree: TraversableTree<Input, Output> = {
  makeRoot: () => ({ vertexContent: { $d: { input: 'root' }, $c: [] } }),
  makeVertex: () => ({ vertexContent: null }),
};
const asyncTree: AsyncTraversableTree<Input, Output> = tree;

const plainTreeVisitor: AsyncTraversalVisitor<'ORDER', Input, Output> = () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: { output: 1 } },
    },
  ],
});
const promisedTreeVisitor: AsyncTraversalVisitor<
  'ORDER',
  Input,
  Output
> = async () => undefined;

const dagVisitor: DagVisitor<Input, Output> = (vertex, options) => {
  const data: { input: string } | { output: number } = vertex.getData();
  const order: DagTraversalOrder = options.order;
  void [data, order, options.resolvedGraph, options.visitorRecord.visitor];
  return {
    commands: [
      {
        commandName:
          TraversalVisitorCommandName.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
        commandArguments: { newHints: [1, 2] },
      },
    ],
  };
};
const plainAsyncDagVisitor: AsyncDagVisitor<Input, Output> = () => undefined;
const promisedAsyncDagVisitor: AsyncDagVisitor<Input, Output> = async () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      commandArguments: { newData: { output: 2 } },
    },
  ],
});

const invalidRewriteVisitor: DagVisitor<Input, Output> = () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
      // @ts-expect-error Rewrites use the output data type.
      commandArguments: { newData: { input: 'wrong' } },
    },
  ],
});

declare const asyncOptions: AsyncTraversalVisitorInputOptions<
  'ORDER',
  Input,
  Output
>;
const recursiveAsyncVisitor: AsyncTraversalVisitor<'ORDER', Input, Output> =
  asyncOptions.visitorRecord.visitor;

const asyncGraphTraversal = new AsyncDagTraversal<Input, Output>({
  traversableGraph: asyncGraph,
  concurrency: 2,
  sortChildrenHints: async (hints) => hints.reverse(),
});
asyncGraphTraversal.addVisitorFor(
  'ON_READY' as DagTraversalOrder,
  async (vertex, options) => {
    const data: { input: string } | { output: number } = vertex.getData();
    const recursive: AsyncDagVisitor<Input, Output> =
      options.visitorRecord.visitor;
    void [
      data,
      recursive,
      options.resolvedGraph,
      options.notMutatedResolvedGraph,
    ];
    return {
      commands: [
        {
          commandName: TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
          commandArguments: { newData: { output: 3 } },
        },
      ],
    };
  },
);
const asyncTreeTraversal = new AsyncDagTraversal<Input, Output>({
  traversableTree: asyncTree,
});
const asyncDagRunner: AsyncDagTraversalRunner<Input, Output> =
  asyncGraphTraversal.makeRunner();
const asyncDagEvents: AsyncGenerator<
  {
    order: DagTraversalOrder;
    isGraphRoot: boolean;
    isTraversalRoot: boolean;
  },
  void,
  unknown
> = asyncDagRunner.getIterable();
const asyncDagRun: Promise<AsyncDagTraversalRunner<Input, Output>> =
  asyncDagRunner.run();
void asyncDagRunner.inspect();
void asyncTreeTraversal;

// @ts-expect-error An asynchronous DAG traversal requires a source.
new AsyncDagTraversal<Input, Output>({});
// @ts-expect-error An asynchronous DAG source is exclusive.
new AsyncDagTraversal<Input, Output>({
  traversableGraph: asyncGraph,
  traversableTree: asyncTree,
});

const ref = new CTTRef(new Vertex<Input>({ $d: { input: 'vertex' }, $c: [] }));
void [
  asyncGraph,
  asyncTree,
  plainTreeVisitor,
  promisedTreeVisitor,
  dagVisitor,
  plainAsyncDagVisitor,
  promisedAsyncDagVisitor,
  invalidRewriteVisitor,
  recursiveAsyncVisitor,
  asyncDagEvents,
  asyncDagRun,
  ref,
];
