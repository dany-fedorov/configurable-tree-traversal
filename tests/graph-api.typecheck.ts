import type { AsyncTraversalVisitor } from '../src/core/AsyncTraversalVisitor';
import { MutableRef } from '../src/core/CTTRef';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
} from '../src/core/TraversableGraph';
import type { AsyncTreeSource } from '../src/core/AsyncTraversableTree';
import type { TreeVisitorContext } from '../src/core/TraversalVisitor';
import type { ResolvedGraph } from '../src/core/ResolvedGraph';
import type { TreeSource } from '../src/core/TraversableTree';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';
import type { HintVertexId } from '../src/core/graph/types';
import type { DagVisitorPhase } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type {
  AsyncDagVisitor,
  DagVisitor,
} from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';

type Input = VertexTypes<{ input: string }, string>;
type Output = VertexTypes<{ output: number }, number>;

const graph: DagDiscoverySource<Input, Output> = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexContent: { $data: { input: 'root' }, $childHints: ['child'] },
      vertexId: { kind: 'missing' },
      dependsOnWork: [null, NaN],
    },
  }),
  resolveChild: (hint, options) => {
    const resolved: ResolvedGraph<Input | Output> = options.resolvedGraph;
    const input: string = hint;
    void [resolved, input, options.originalGraphView];
    // @ts-expect-error Graph callbacks do not receive the tree facade.
    options.resolvedTree;
    return {
      kind: 'omitted' as const,
      satisfiesDependencies: true as const,
      vertexId: hint,
    };
  },
  getVertexIdFromHint: (hint): HintVertexId => ({ vertexId: hint }),
  resolvePrerequisite: (id) =>
    typeof id === 'string'
      ? {
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnSubgraphCompletion: [null],
            vertexContent: { $data: { input: id }, $childHints: [] },
          },
        }
      : { kind: 'missing' },
};

const asyncGraph: AsyncDagDiscoverySource<Input, Output> = {
  ...graph,
  resolvePrerequisite: (id) => Promise.resolve(graph.resolvePrerequisite!(id)),
};
const tree: TreeSource<Input, Output> = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: { input: 'root' }, $childHints: [] } },
  }),
  resolveChild: () => ({ kind: 'omitted' as const }),
};
const asyncTree: AsyncTreeSource<Input, Output> = tree;

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

const dagVisitor: DagVisitor<Input, Output, DagVisitorPhase.ON_WORK_READY> = (
  vertex,
  options,
) => {
  const data: { input: string } | { output: number } = vertex.getData();
  const order: DagVisitorPhase = options.phase;
  void [data, order, options.resolvedGraph, options.registration.priority];
  return {
    commands: [
      {
        commandName: TraversalVisitorCommandName.REWRITE_CHILD_HINTS,
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

declare const asyncOptions: TreeVisitorContext<'ORDER', Input, Output>;
const asyncVisitorMetadata: import('../src').VisitorRegistrationMetadata =
  asyncOptions.registration;

const asyncGraphTraversal = new AsyncDagTraversal<Input, Output>({
  traversableGraph: asyncGraph,
  concurrency: 2,
  sortChildrenHints: async (hints) => hints.reverse(),
});
asyncGraphTraversal.addVisitorFor(
  'ON_WORK_READY' as DagVisitorPhase,
  async (vertex, options) => {
    const data: { input: string } | { output: number } = vertex.getData();
    const metadata: import('../src').VisitorRegistrationMetadata =
      options.registration;
    void [data, metadata, options.resolvedGraph, options.originalGraphView];
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
  asyncGraphTraversal.createRunner();
const asyncDagEvents: AsyncGenerator<
  {
    kind: 'workCompleted' | 'subgraphCompleted';
    isGraphRoot: boolean;
    isTraversalRoot: boolean;
  },
  void,
  unknown
> = asyncDagRunner.iterateEvents();
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

const ref = new MutableRef(
  new Vertex<Input>({ $data: { input: 'vertex' }, $childHints: [] }),
);
void [
  asyncGraph,
  asyncTree,
  plainTreeVisitor,
  promisedTreeVisitor,
  dagVisitor,
  plainAsyncDagVisitor,
  promisedAsyncDagVisitor,
  invalidRewriteVisitor,
  asyncVisitorMetadata,
  asyncDagEvents,
  asyncDagRun,
  ref,
];
