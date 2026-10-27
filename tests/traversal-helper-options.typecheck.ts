import {
  BreadthFirstPhase as B,
  DepthFirstPhase as F,
  DagVisitorPhase as D,
  TraversalVisitorCommandName as C,
  traverseTreeDepthFirst,
  traverseTreeDepthFirstAsync,
  traverseTreeBreadthFirst,
  traverseTreeBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  TreeSource,
  DagDiscoverySource,
  VertexTypes,
  DepthFirstTreeRunner,
  AsyncDepthFirstTreeRunner,
  BreadthFirstTreeRunner,
  AsyncBreadthFirstTreeRunner,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
  TreeVisitor,
  AsyncTreeVisitor,
  DagVisitor,
  AsyncDagVisitor,
} from '../src';

type T = VertexTypes<string, string>;
declare const tree: TreeSource<T>;
declare const graph: DagDiscoverySource<T>;
const common: TreeVisitor<string, T, T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const asyncCommon: AsyncTreeVisitor<string, T, T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
const dagCommon: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const asyncDagCommon: AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
const dfs: DepthFirstTreeRunner<T, T> = traverseTreeDepthFirst({
  traversableTree: tree,
  visitors: {
    [F.PRE_ORDER]: (_vertex, options) => {
      const phase: F.PRE_ORDER = options.phase;
      void phase;
      return {
        commands: [
          {
            commandName: C.REWRITE_CHILD_HINTS,
            commandArguments: { newHints: [] },
          },
        ],
      };
    },
    [F.IN_ORDER]: (_vertex, options) => {
      const phase: F.IN_ORDER = options.phase;
      void phase;
    },
    [F.POST_ORDER]: common,
  },
});
const adfs: Promise<AsyncDepthFirstTreeRunner<T, T>> =
  traverseTreeDepthFirstAsync({
    traversableTree: tree,
    visitors: {
      [F.PRE_ORDER]: asyncCommon,
      [F.IN_ORDER]: asyncCommon,
      [F.POST_ORDER]: asyncCommon,
    },
  });
const bfs: BreadthFirstTreeRunner<T, T> = traverseTreeBreadthFirst({
  traversableTree: tree,
  visitors: {
    [B.LEVEL_ORDER]: (_vertex, options) => {
      const phase: B.LEVEL_ORDER = options.phase;
      void phase;
    },
  },
});
const abfs: Promise<AsyncBreadthFirstTreeRunner<T, T>> =
  traverseTreeBreadthFirstAsync({
    traversableTree: tree,
    visitors: { [B.LEVEL_ORDER]: asyncCommon },
  });
const dag: DagTraversalRunner<T, T> = traverseDag({
  traversableGraph: graph,
  visitors: {
    [D.ON_WORK_READY]: (_vertex, options) => {
      const phase: D.ON_WORK_READY = options.phase;
      void phase;
      return { commands: [{ commandName: C.DEFER_WORK_COMPLETION }] };
    },
    [D.ON_SUBGRAPH_READY]: dagCommon,
  },
});
const adag: Promise<AsyncDagTraversalRunner<T, T>> = traverseDagAsync({
  traversableTree: tree,
  visitors: {
    [D.ON_WORK_READY]: asyncDagCommon,
    [D.ON_SUBGRAPH_READY]: asyncDagCommon,
  },
});
traverseTreeDepthFirst({
  traversableTree: tree,
  visitors: {
    [F.PRE_ORDER]: common,
    [F.IN_ORDER]: common,
    [F.POST_ORDER]: common,
  },
});
traverseTreeBreadthFirst({
  traversableTree: tree,
  visitors: { [B.LEVEL_ORDER]: common },
});
traverseDag({
  traversableTree: tree,
  visitors: { [D.ON_WORK_READY]: dagCommon, [D.ON_SUBGRAPH_READY]: dagCommon },
});
// Async callback contexts infer the actual phase too.
traverseTreeDepthFirstAsync({
  traversableTree: tree,
  visitors: {
    [F.POST_ORDER]: async (_v, options) => {
      const phase: F.POST_ORDER = options.phase;
      void phase;
    },
  },
});
traverseTreeBreadthFirstAsync({
  traversableTree: tree,
  visitors: {
    [B.LEVEL_ORDER]: async (_v, options) => {
      const phase: B.LEVEL_ORDER = options.phase;
      void phase;
    },
  },
});
traverseDagAsync({
  traversableGraph: graph,
  visitors: {
    [D.ON_SUBGRAPH_READY]: async (_v, options) => {
      const phase: D.ON_SUBGRAPH_READY = options.phase;
      void phase;
    },
  },
});
declare const preOnly: TreeVisitor<F.PRE_ORDER, T, T>;
declare const readyOnly: DagVisitor<T, T, D.ON_WORK_READY>;
// @ts-expect-error Canonical DAG sources are exclusive.
traverseDag<T>({ traversableGraph: graph, traversableTree: tree });
// @ts-expect-error Async canonical DAG sources are exclusive.
traverseDagAsync<T>({ traversableGraph: graph, traversableTree: tree });
// @ts-expect-error A source is required.
traverseTreeDepthFirst<T>({ visitors: {} });
// @ts-expect-error A source is required.
traverseDag<T>({ visitors: {} });
traverseTreeBreadthFirst<T>({
  traversableTree: tree,
  // @ts-expect-error Canonical configuration has no second nested source/config.
  config: { traversableTree: tree },
});
traverseTreeDepthFirst<T>({
  traversableTree: tree,
  // @ts-expect-error PRE_ORDER-only callbacks cannot run in POST_ORDER.
  visitors: { [F.POST_ORDER]: preOnly },
});
traverseTreeDepthFirstAsync<T>({
  traversableTree: tree,
  // @ts-expect-error Async POST_ORDER rejects initial-phase callbacks too.
  visitors: { [F.POST_ORDER]: preOnly },
});
traverseDag<T>({
  traversableGraph: graph,
  // @ts-expect-error Completion callbacks cannot require ON_WORK_READY.
  visitors: { [D.ON_SUBGRAPH_READY]: readyOnly },
});
traverseDagAsync<T>({
  traversableGraph: graph,
  // @ts-expect-error Async completion callbacks cannot require ON_WORK_READY.
  visitors: { [D.ON_SUBGRAPH_READY]: readyOnly },
});
traverseTreeDepthFirst<T>({
  traversableTree: tree,
  visitors: {
    // @ts-expect-error POST_ORDER cannot rewrite hints.
    [F.POST_ORDER]: () => ({
      commands: [
        {
          commandName: C.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [] },
        },
      ],
    }),
  },
});
traverseTreeDepthFirstAsync<T>({
  traversableTree: tree,
  visitors: {
    // @ts-expect-error IN_ORDER cannot rewrite hints asynchronously either.
    [F.IN_ORDER]: async () => ({
      commands: [
        {
          commandName: C.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [] },
        },
      ],
    }),
  },
});
traverseDag<T>({
  traversableGraph: graph,
  visitors: {
    // @ts-expect-error ON_SUBGRAPH_READY cannot defer.
    [D.ON_SUBGRAPH_READY]: () => ({
      commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
    }),
  },
});
traverseDagAsync<T>({
  traversableGraph: graph,
  visitors: {
    // @ts-expect-error Async ON_SUBGRAPH_READY cannot defer.
    [D.ON_SUBGRAPH_READY]: async () => ({
      commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
    }),
  },
});
traverseTreeBreadthFirst<T>({
  traversableTree: tree,
  visitors: {
    // @ts-expect-error BFS cannot defer work.
    [B.LEVEL_ORDER]: () => ({
      commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
    }),
  },
});
traverseTreeBreadthFirstAsync<T>({
  traversableTree: tree,
  visitors: {
    // @ts-expect-error Async BFS cannot defer work.
    [B.LEVEL_ORDER]: async () => ({
      commands: [{ commandName: C.DEFER_WORK_COMPLETION }],
    }),
  },
});
traverseDag<T>({
  traversableGraph: graph,
  visitors: {
    [D.ON_WORK_READY]: [{ visitor: dagCommon, priority: 1 }],
  },
});
void [dfs, adfs, bfs, abfs, dag, adag];

// TS 4.7 cannot call a union of multiple generic overloaded helpers. Select
// wrappers with one shared signature when choosing between sync and async.
declare const chooseAsync: boolean;
const selectedDfs = chooseAsync
  ? (source: TreeSource<T>) =>
      traverseTreeDepthFirstAsync({ traversableTree: source })
  : (source: TreeSource<T>) =>
      traverseTreeDepthFirst({ traversableTree: source });
const selectedBfs = chooseAsync
  ? (source: TreeSource<T>) =>
      traverseTreeBreadthFirstAsync({ traversableTree: source })
  : (source: TreeSource<T>) =>
      traverseTreeBreadthFirst({ traversableTree: source });
selectedDfs(tree);
selectedBfs(tree);
