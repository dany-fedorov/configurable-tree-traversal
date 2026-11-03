import {
  BreadthFirstTreeVisitPhase as B,
  DepthFirstTreeVisitPhase as F,
  DagVisitorPhase as D,
  TraversalVisitorCommandName as C,
  runTreeDepthFirstUntilSuspendedOrTerminal,
  runTreeDepthFirstUntilSuspendedOrTerminalAsync,
  runTreeBreadthFirstUntilSuspendedOrTerminal,
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  TreeDiscoverySource,
  DagDiscoverySource,
  VertexDataAndChildHintTypes,
  DepthFirstTreeRunner,
  AsyncDepthFirstTreeRunner,
  BreadthFirstTreeRunner,
  AsyncBreadthFirstTreeRunner,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
  TreeVertexPhaseVisitorCallback,
  AsyncTreeVertexPhaseVisitorCallback,
  DagVisitor,
  AsyncDagVisitor,
} from '../src';
type T = VertexDataAndChildHintTypes<string, string>;
declare const tree: TreeDiscoverySource<T>;
declare const graph: DagDiscoverySource<T>;
const common: TreeVertexPhaseVisitorCallback<T, T, string> = () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const asyncCommon: AsyncTreeVertexPhaseVisitorCallback<
  T,
  T,
  string
> = async () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const dagCommon: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const asyncDagCommon: AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NO_OPERATION }],
});
const dfs: DepthFirstTreeRunner<T, T> =
  runTreeDepthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: tree,
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: (_vertex, options) => {
        const phase: F.BEFORE_CHILD_EXPANSION = options.visitorPhase;
        void phase;
        return {
          commands: [
            {
              commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
              commandArguments: { replacementChildHints: [] },
            },
          ],
        };
      },
      [F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: (_vertex, options) => {
        const phase: F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES =
          options.visitorPhase;
        void phase;
      },
      [F.AFTER_CHILD_SUBTREES]: common,
    },
  });
const adfs: Promise<AsyncDepthFirstTreeRunner<T, T>> =
  runTreeDepthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree,
    visitors: {
      [F.BEFORE_CHILD_EXPANSION]: asyncCommon,
      [F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: asyncCommon,
      [F.AFTER_CHILD_SUBTREES]: asyncCommon,
    },
  });
const bfs: BreadthFirstTreeRunner<T, T> =
  runTreeBreadthFirstUntilSuspendedOrTerminal({
    treeDiscoverySource: tree,
    visitors: {
      [B.AT_LEVEL_ORDER_VERTEX]: (_vertex, options) => {
        const phase: B.AT_LEVEL_ORDER_VERTEX = options.visitorPhase;
        void phase;
      },
    },
  });
const abfs: Promise<AsyncBreadthFirstTreeRunner<T, T>> =
  runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
    treeDiscoverySource: tree,
    visitors: { [B.AT_LEVEL_ORDER_VERTEX]: asyncCommon },
  });
const dag: DagTraversalRunner<T, T> = traverseDag({
  dagDiscoverySource: graph,
  visitors: {
    [D.ON_WORK_READY]: (_vertex, options) => {
      const phase: D.ON_WORK_READY = options.visitorPhase;
      void phase;
      return {
        commands: [
          { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
        ],
      };
    },
    [D.ON_SUBGRAPH_COMPLETION_READY]: dagCommon,
  },
});
const adag: Promise<AsyncDagTraversalRunner<T, T>> = traverseDagAsync({
  treeDiscoverySource: tree,
  visitors: {
    [D.ON_WORK_READY]: asyncDagCommon,
    [D.ON_SUBGRAPH_COMPLETION_READY]: asyncDagCommon,
  },
});
runTreeDepthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: tree,
  visitors: {
    [F.BEFORE_CHILD_EXPANSION]: common,
    [F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: common,
    [F.AFTER_CHILD_SUBTREES]: common,
  },
});
runTreeBreadthFirstUntilSuspendedOrTerminal({
  treeDiscoverySource: tree,
  visitors: { [B.AT_LEVEL_ORDER_VERTEX]: common },
});
traverseDag({
  treeDiscoverySource: tree,
  visitors: {
    [D.ON_WORK_READY]: dagCommon,
    [D.ON_SUBGRAPH_COMPLETION_READY]: dagCommon,
  },
});
// Async callback contexts infer the actual phase too.
runTreeDepthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource: tree,
  visitors: {
    [F.AFTER_CHILD_SUBTREES]: async (_v, options) => {
      const phase: F.AFTER_CHILD_SUBTREES = options.visitorPhase;
      void phase;
    },
  },
});
runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
  treeDiscoverySource: tree,
  visitors: {
    [B.AT_LEVEL_ORDER_VERTEX]: async (_v, options) => {
      const phase: B.AT_LEVEL_ORDER_VERTEX = options.visitorPhase;
      void phase;
    },
  },
});
traverseDagAsync({
  dagDiscoverySource: graph,
  visitors: {
    [D.ON_SUBGRAPH_COMPLETION_READY]: async (_v, options) => {
      const phase: D.ON_SUBGRAPH_COMPLETION_READY = options.visitorPhase;
      void phase;
    },
  },
});
declare const preOnly: TreeVertexPhaseVisitorCallback<
  T,
  T,
  F.BEFORE_CHILD_EXPANSION
>;
declare const readyOnly: DagVisitor<T, T, D.ON_WORK_READY>;
// @ts-expect-error Canonical DAG sources are exclusive.
traverseDag<T>({ dagDiscoverySource: graph, treeDiscoverySource: tree });
// @ts-expect-error Async canonical DAG sources are exclusive.
traverseDagAsync<T>({ dagDiscoverySource: graph, treeDiscoverySource: tree });
// @ts-expect-error A source is required.
runTreeDepthFirstUntilSuspendedOrTerminal<T>({ visitors: {} });
// @ts-expect-error A source is required.
traverseDag<T>({ visitors: {} });
runTreeBreadthFirstUntilSuspendedOrTerminal<T>({
  treeDiscoverySource: tree,
  // @ts-expect-error Canonical configuration has no second nested source/config.
  config: { treeDiscoverySource: tree },
});
runTreeDepthFirstUntilSuspendedOrTerminal<T>({
  treeDiscoverySource: tree,
  // @ts-expect-error PRE_ORDER-only callbacks cannot run in POST_ORDER.
  visitors: { [F.AFTER_CHILD_SUBTREES]: preOnly },
});
runTreeDepthFirstUntilSuspendedOrTerminalAsync<T>({
  treeDiscoverySource: tree,
  // @ts-expect-error Async POST_ORDER rejects initial-phase callbacks too.
  visitors: { [F.AFTER_CHILD_SUBTREES]: preOnly },
});
traverseDag<T>({
  dagDiscoverySource: graph,
  // @ts-expect-error Completion callbacks cannot require ON_WORK_READY.
  visitors: { [D.ON_SUBGRAPH_COMPLETION_READY]: readyOnly },
});
traverseDagAsync<T>({
  dagDiscoverySource: graph,
  // @ts-expect-error Async completion callbacks cannot require ON_WORK_READY.
  visitors: { [D.ON_SUBGRAPH_COMPLETION_READY]: readyOnly },
});
runTreeDepthFirstUntilSuspendedOrTerminal<T>({
  treeDiscoverySource: tree,
  visitors: {
    // @ts-expect-error POST_ORDER cannot rewrite hints.
    [F.AFTER_CHILD_SUBTREES]: () => ({
      commands: [
        {
          commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
          commandArguments: { replacementChildHints: [] },
        },
      ],
    }),
  },
});
runTreeDepthFirstUntilSuspendedOrTerminalAsync<T>({
  treeDiscoverySource: tree,
  visitors: {
    // @ts-expect-error IN_ORDER cannot rewrite hints asynchronously either.
    [F.AT_CONFIGURED_CHILD_SUBTREE_BOUNDARIES]: async () => ({
      commands: [
        {
          commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
          commandArguments: { replacementChildHints: [] },
        },
      ],
    }),
  },
});
traverseDag<T>({
  dagDiscoverySource: graph,
  visitors: {
    // @ts-expect-error ON_SUBGRAPH_READY cannot defer.
    [D.ON_SUBGRAPH_COMPLETION_READY]: () => ({
      commands: [
        { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
      ],
    }),
  },
});
traverseDagAsync<T>({
  dagDiscoverySource: graph,
  visitors: {
    // @ts-expect-error Async ON_SUBGRAPH_READY cannot defer.
    [D.ON_SUBGRAPH_COMPLETION_READY]: async () => ({
      commands: [
        { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
      ],
    }),
  },
});
runTreeBreadthFirstUntilSuspendedOrTerminal<T>({
  treeDiscoverySource: tree,
  visitors: {
    // @ts-expect-error BFS cannot defer work.
    [B.AT_LEVEL_ORDER_VERTEX]: () => ({
      commands: [
        { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
      ],
    }),
  },
});
runTreeBreadthFirstUntilSuspendedOrTerminalAsync<T>({
  treeDiscoverySource: tree,
  visitors: {
    // @ts-expect-error Async BFS cannot defer work.
    [B.AT_LEVEL_ORDER_VERTEX]: async () => ({
      commands: [
        { commandName: C.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION },
      ],
    }),
  },
});
traverseDag<T>({
  dagDiscoverySource: graph,
  visitors: {
    [D.ON_WORK_READY]: [
      { visitor: dagCommon, descendingExecutionPriorityWithinGroup: 1 },
    ],
  },
});
void [dfs, adfs, bfs, abfs, dag, adag];
// TS 4.7 cannot call a union of multiple generic overloaded helpers. Select
// wrappers with one shared signature when choosing between sync and async.
declare const chooseAsync: boolean;
const selectedDfs = chooseAsync
  ? (source: TreeDiscoverySource<T>) =>
      runTreeDepthFirstUntilSuspendedOrTerminalAsync({
        treeDiscoverySource: source,
      })
  : (source: TreeDiscoverySource<T>) =>
      runTreeDepthFirstUntilSuspendedOrTerminal({
        treeDiscoverySource: source,
      });
const selectedBfs = chooseAsync
  ? (source: TreeDiscoverySource<T>) =>
      runTreeBreadthFirstUntilSuspendedOrTerminalAsync({
        treeDiscoverySource: source,
      })
  : (source: TreeDiscoverySource<T>) =>
      runTreeBreadthFirstUntilSuspendedOrTerminal({
        treeDiscoverySource: source,
      });
selectedDfs(tree);
selectedBfs(tree);
