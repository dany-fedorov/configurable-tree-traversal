import type { AsyncTreeVertexPhaseVisitorCallback } from '../src/core/AsyncTraversalVisitor';
import { MutableValueReference } from '../src/core/CTTRef';
import type {
  AsyncDagDiscoverySource,
  DagDiscoverySource,
} from '../src/core/TraversableGraph';
import type { AsyncTreeDiscoverySource } from '../src/core/AsyncTraversableTree';
import type { TreeVisitorContext } from '../src/core/TraversalVisitor';
import type { LiveResolvedGraphView } from '../src/core/ResolvedGraphView';
import type { TreeDiscoverySource } from '../src/core/TraversableTree';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { TraversalVisitorCommandName } from '../src/core/TraversalVisitor';
import { Vertex } from '../src/core/Vertex';
import type { ChildHintVertexIdentity } from '../src/core/graph/types';
import type { DagVisitorPhase } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type {
  AsyncDagVisitor,
  DagVisitor,
} from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import { AsyncDagTraversalBuilder } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import type { AsyncDagTraversalRunner } from '../src/traversals/dag-traversal/lib/AsyncDagTraversalRunner';
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
const graph: DagDiscoverySource<Input, Output> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: { input: 'root' },
        $childDiscoveryHints: ['child'],
      },
      vertexId: undefined,
      workWaitsForWorkOf: [null, NaN],
    },
  }),
  resolveChildVertexFromHint: (hint, options) => {
    const resolved: LiveResolvedGraphView<Input | Output> =
      options.liveResolvedGraphView;
    const input: string = hint;
    void [resolved, input, options.livePreCommandDiscoveredGraphView];
    // @ts-expect-error Graph callbacks do not receive the tree facade.
    options.liveResolvedTreeView;
    return {
      kind: 'vertexIntentionallyOmitted' as const,
      satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
      omittedVertexIdentity: { vertexId: hint },
    };
  },
  tryGetVertexIdentityFromHint: (hint): ChildHintVertexIdentity => ({
    vertexId: hint,
  }),
  resolvePrerequisiteByVertexId: (id) =>
    typeof id === 'string'
      ? {
          kind: 'vertexResolved' as const,
          resolvedVertexInput: {
            vertexId: id,
            workWaitsForSubgraphCompletionOf: [null],
            vertexContentInput: {
              $vertexData: { input: id },
              $childDiscoveryHints: [],
            },
          },
        }
      : { kind: 'missing' },
};
const asyncGraph: AsyncDagDiscoverySource<Input, Output> = {
  ...graph,
  resolvePrerequisiteByVertexId: (id) =>
    Promise.resolve(graph.resolvePrerequisiteByVertexId!(id)),
};
const tree: TreeDiscoverySource<Input, Output> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: {
        $vertexData: { input: 'root' },
        $childDiscoveryHints: [],
      },
    },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexIntentionallyOmitted' as const,
  }),
};
const asyncTree: AsyncTreeDiscoverySource<Input, Output> = tree;
const plainTreeVisitor: AsyncTreeVertexPhaseVisitorCallback<
  Input,
  Output,
  'ORDER'
> = () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      commandArguments: { replacementVertexData: { output: 1 } },
    },
  ],
});
const promisedTreeVisitor: AsyncTreeVertexPhaseVisitorCallback<
  Input,
  Output,
  'ORDER'
> = async () => undefined;
const dagVisitor: DagVisitor<Input, Output, DagVisitorPhase.ON_WORK_READY> = (
  vertex,
  options,
) => {
  const data:
    | {
        input: string;
      }
    | {
        output: number;
      } = vertex.getVertexData();
  const order: DagVisitorPhase = options.visitorPhase;
  void [
    data,
    order,
    options.liveResolvedGraphView,
    options.visitorRegistrationMetadata.descendingExecutionPriorityWithinGroup,
  ];
  return {
    commands: [
      {
        commandName:
          TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
        commandArguments: { replacementChildHints: ['one', 'two'] },
      },
    ],
  };
};
const plainAsyncDagVisitor: AsyncDagVisitor<Input, Output> = () => undefined;
const promisedAsyncDagVisitor: AsyncDagVisitor<Input, Output> = async () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      commandArguments: { replacementVertexData: { output: 2 } },
    },
  ],
});
const invalidRewriteVisitor: DagVisitor<Input, Output> = () => ({
  commands: [
    {
      commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
      // @ts-expect-error Rewrites use the output data type.
      commandArguments: { replacementVertexData: { input: 'wrong' } },
    },
  ],
});
declare const asyncOptions: TreeVisitorContext<'ORDER', Input, Output>;
const asyncVisitorMetadata: import('../src').VisitorRegistrationMetadata =
  asyncOptions.visitorRegistrationMetadata;
const asyncGraphTraversal = new AsyncDagTraversalBuilder<Input, Output>({
  dagDiscoverySource: asyncGraph,
  maxConcurrentCallbackInvocations: 2,
  transformChildHintsBeforeResolution: async (hints) => hints.reverse(),
});
asyncGraphTraversal.registerVisitorForPhase(
  'ON_WORK_READY' as DagVisitorPhase,
  async (vertex, options) => {
    const data:
      | {
          input: string;
        }
      | {
          output: number;
        } = vertex.getVertexData();
    const metadata: import('../src').VisitorRegistrationMetadata =
      options.visitorRegistrationMetadata;
    void [
      data,
      metadata,
      options.liveResolvedGraphView,
      options.livePreCommandDiscoveredGraphView,
    ];
    return {
      commands: [
        {
          commandName: TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
          commandArguments: { replacementVertexData: { output: 3 } },
        },
      ],
    };
  },
);
const asyncTreeTraversal = new AsyncDagTraversalBuilder<Input, Output>({
  treeDiscoverySource: asyncTree,
});
const asyncDagRunner: AsyncDagTraversalRunner<Input, Output> =
  asyncGraphTraversal.createIndependentRunnerFromCurrentOptions();
const asyncDagEvents: AsyncGenerator<
  {
    eventKind: 'workCompletionCommitted' | 'subgraphCompletionCommitted';
    isVisibleSourceRoot: boolean;
  },
  void,
  unknown
> = asyncDagRunner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
const asyncDagRun: Promise<AsyncDagTraversalRunner<Input, Output>> =
  asyncDagRunner.runUntilSuspendedOrTerminal();
void asyncDagRunner.captureExecutionSnapshot();
void asyncTreeTraversal;
// @ts-expect-error An asynchronous DAG traversal requires a source.
new AsyncDagTraversalBuilder<Input, Output>({});
// @ts-expect-error An asynchronous DAG source is exclusive.
new AsyncDagTraversalBuilder<Input, Output>({
  dagDiscoverySource: asyncGraph,
  treeDiscoverySource: asyncTree,
});
const ref = new MutableValueReference(
  new Vertex<Input>({
    $vertexData: { input: 'vertex' },
    $childDiscoveryHints: [],
  }),
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
