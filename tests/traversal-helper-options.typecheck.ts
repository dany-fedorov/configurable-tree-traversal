import {
  BreadthFirstTraversalOrder as B,
  DepthFirstTraversalOrder as F,
  DagTraversalOrder as D,
  TraversalVisitorCommandName as C,
  traverseDepthFirst,
  traverseDepthFirstAsync,
  traverseBreadthFirst,
  traverseBreadthFirstAsync,
  traverseDag,
  traverseDagAsync,
} from '../src';
import type {
  TraversableTree,
  TraversableGraph,
  TreeTypeParameters,
  DepthFirstTraversalRunner,
  AsyncDepthFirstTraversalRunner,
  BreadthFirstTraversalRunner,
  AsyncBreadthFirstTraversalRunner,
  DagTraversalRunner,
  AsyncDagTraversalRunner,
  TraversalVisitor,
  AsyncTraversalVisitor,
  DagVisitor,
  AsyncDagVisitor,
} from '../src';

type T = TreeTypeParameters<string, string>;
declare const tree: TraversableTree<T>;
declare const graph: TraversableGraph<T>;
const common: TraversalVisitor<string, T, T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const asyncCommon: AsyncTraversalVisitor<string, T, T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
const dagCommon: DagVisitor<T> = () => ({
  commands: [{ commandName: C.NOOP }],
});
const asyncDagCommon: AsyncDagVisitor<T> = async () => ({
  commands: [{ commandName: C.NOOP }],
});
const dfs: DepthFirstTraversalRunner<T, T> = traverseDepthFirst({
  traversableTree: tree,
  visitors: {
    [F.PRE_ORDER]: (_vertex, options) => {
      const phase: F.PRE_ORDER = options.order;
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
      const phase: F.IN_ORDER = options.order;
      void phase;
    },
    [F.POST_ORDER]: common,
  },
});
const adfs: Promise<AsyncDepthFirstTraversalRunner<T, T>> =
  traverseDepthFirstAsync({
    traversableTree: tree,
    visitors: {
      [F.PRE_ORDER]: asyncCommon,
      [F.IN_ORDER]: asyncCommon,
      [F.POST_ORDER]: asyncCommon,
    },
  });
const bfs: BreadthFirstTraversalRunner<T, T> = traverseBreadthFirst({
  traversableTree: tree,
  visitors: {
    [B.LEVEL_ORDER]: (_vertex, options) => {
      const phase: B.LEVEL_ORDER = options.order;
      void phase;
    },
  },
});
const abfs: Promise<AsyncBreadthFirstTraversalRunner<T, T>> =
  traverseBreadthFirstAsync({
    traversableTree: tree,
    visitors: { [B.LEVEL_ORDER]: asyncCommon },
  });
const dag: DagTraversalRunner<T, T> = traverseDag({
  traversableGraph: graph,
  visitors: {
    [D.ON_READY]: (_vertex, options) => {
      const phase: D.ON_READY = options.order;
      void phase;
      return { commands: [{ commandName: C.DEFER_READY }] };
    },
    [D.ON_COMPLETE]: dagCommon,
  },
});
const adag: Promise<AsyncDagTraversalRunner<T, T>> = traverseDagAsync({
  traversableTree: tree,
  visitors: { [D.ON_READY]: asyncDagCommon, [D.ON_COMPLETE]: asyncDagCommon },
});
traverseDepthFirst({
  traversableTree: tree,
  visitors: {
    [F.PRE_ORDER]: common,
    [F.IN_ORDER]: common,
    [F.POST_ORDER]: common,
  },
});
traverseBreadthFirst({
  traversableTree: tree,
  visitors: { [B.LEVEL_ORDER]: common },
});
traverseDag({
  traversableTree: tree,
  visitors: { [D.ON_READY]: dagCommon, [D.ON_COMPLETE]: dagCommon },
});
// Async callback contexts infer the actual phase too.
traverseDepthFirstAsync({
  traversableTree: tree,
  visitors: {
    [F.POST_ORDER]: async (_v, options) => {
      const phase: F.POST_ORDER = options.order;
      void phase;
    },
  },
});
traverseBreadthFirstAsync({
  traversableTree: tree,
  visitors: {
    [B.LEVEL_ORDER]: async (_v, options) => {
      const phase: B.LEVEL_ORDER = options.order;
      void phase;
    },
  },
});
traverseDagAsync({
  traversableGraph: graph,
  visitors: {
    [D.ON_COMPLETE]: async (_v, options) => {
      const phase: D.ON_COMPLETE = options.order;
      void phase;
    },
  },
});
declare const preOnly: TraversalVisitor<F.PRE_ORDER, T, T>;
declare const readyOnly: DagVisitor<T, T, D.ON_READY>;
// @ts-expect-error Canonical DAG sources are exclusive.
traverseDag<T>({ traversableGraph: graph, traversableTree: tree });
// @ts-expect-error Async canonical DAG sources are exclusive.
traverseDagAsync<T>({ traversableGraph: graph, traversableTree: tree });
// @ts-expect-error A source is required.
traverseDepthFirst<T>({ visitors: {} });
// @ts-expect-error A source is required.
traverseDag<T>({ visitors: {} });
traverseBreadthFirst<T>({
  traversableTree: tree,
  // @ts-expect-error Canonical configuration has no second nested source/config.
  config: { traversableTree: tree },
});
traverseDepthFirst<T>({
  traversableTree: tree,
  // @ts-expect-error PRE_ORDER-only callbacks cannot run in POST_ORDER.
  visitors: { [F.POST_ORDER]: preOnly },
});
traverseDepthFirstAsync<T>({
  traversableTree: tree,
  // @ts-expect-error Async POST_ORDER rejects initial-phase callbacks too.
  visitors: { [F.POST_ORDER]: preOnly },
});
traverseDag<T>({
  traversableGraph: graph,
  // @ts-expect-error Completion callbacks cannot require ON_READY.
  visitors: { [D.ON_COMPLETE]: readyOnly },
});
traverseDagAsync<T>({
  traversableGraph: graph,
  // @ts-expect-error Async completion callbacks cannot require ON_READY.
  visitors: { [D.ON_COMPLETE]: readyOnly },
});
traverseDepthFirst<T>({
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
traverseDepthFirstAsync<T>({
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
    // @ts-expect-error ON_COMPLETE cannot defer.
    [D.ON_COMPLETE]: () => ({ commands: [{ commandName: C.DEFER_READY }] }),
  },
});
traverseDagAsync<T>({
  traversableGraph: graph,
  visitors: {
    // @ts-expect-error Async ON_COMPLETE cannot defer.
    [D.ON_COMPLETE]: async () => ({
      commands: [{ commandName: C.DEFER_READY }],
    }),
  },
});
traverseBreadthFirst<T>({
  traversableTree: tree,
  visitors: {
    // @ts-expect-error BFS cannot defer work.
    [B.LEVEL_ORDER]: () => ({ commands: [{ commandName: C.DEFER_READY }] }),
  },
});
traverseBreadthFirstAsync<T>({
  traversableTree: tree,
  visitors: {
    // @ts-expect-error Async BFS cannot defer work.
    [B.LEVEL_ORDER]: async () => ({
      commands: [{ commandName: C.DEFER_READY }],
    }),
  },
});
traverseDag<T>({
  traversableGraph: graph,
  visitors: {
    [D.ON_READY]: [{ visitor: dagCommon, priority: 1, addedIndex: 0 }],
  },
});
void [dfs, adfs, bfs, abfs, dag, adag];

// TS 4.7 cannot call a union of multiple generic overloaded helpers. Select
// wrappers with one shared signature when choosing between sync and async.
declare const chooseAsync: boolean;
const selectedDfs = chooseAsync
  ? (source: TraversableTree<T>) => traverseDepthFirstAsync(source, null)
  : (source: TraversableTree<T>) => traverseDepthFirst(source, null);
const selectedBfs = chooseAsync
  ? (source: TraversableTree<T>) => traverseBreadthFirstAsync(source, null)
  : (source: TraversableTree<T>) => traverseBreadthFirst(source, null);
selectedDfs(tree);
selectedBfs(tree);
