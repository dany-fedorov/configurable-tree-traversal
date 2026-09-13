# configurable-tree-traversal

Configurable tree and DAG traversal for TypeScript and JavaScript. Walk abstract trees or JavaScript objects in synchronous or asynchronous depth-first and breadth-first order, schedule dependency-aware DAGs, transform vertices, prune branches, and pause and resume traversal.

<img src="./Sorted_binary_tree_ALL_RGB.svg.png" alt="Binary tree with depth-first visit points: red for pre-order, green for in-order, and blue for post-order" width="460" height="393" />

Depth-first visit points: red for pre-order, green for in-order, and blue for post-order.
Source: [Wikipedia — Tree traversal](https://en.wikipedia.org/wiki/Tree_traversal).

Package: [configurable-tree-traversal on npm](https://www.npmjs.com/package/configurable-tree-traversal)

```sh
npm install configurable-tree-traversal
```

The package includes CommonJS JavaScript and TypeScript declarations. Node ESM consumers can use named imports or the default import (`import library from 'configurable-tree-traversal'`).

## Traverse an object

```ts
import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversableObjectTree,
} from 'configurable-tree-traversal';

const traversal = new DepthFirstTraversal({
  traversableTree: new TraversableObjectTree({ a: { b: 1 }, c: 2 }),
});

const runner = traversal.makeRunner();
for (const { vertex, vertexRef } of runner.getIterable({
  iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
})) {
  const path = runner
    .getResolvedTree()
    .getPathTo(vertexRef, { noRoot: true })
    .map((ref) => ref.unref().getData().key);
  console.log(path, vertex.getData().value);
}
// Paths: [], ['a'], ['a', 'b'], ['c']
```

The object adapter creates a synthetic root representing the whole input. Each vertex contains `{ key, value }`. Arrays use numeric index keys; objects include their own enumerable string and symbol keys. Sparse array holes are skipped. Non-enumerable and inherited properties are excluded. Property access may invoke getters.

Ancestor cycles throw a descriptive error before descent; shared objects in separate branches are traversed independently. The same adapter can be used by multiple runners. Use `makeVertexHook` to skip or customize properties, or `getChildrenOfProperty` to define traversal for specialized values.

## Abstract trees

A tree adapter supplies `makeRoot()` and `makeVertex(hint, options)`. Both return `{ vertexContent }`, where content is `{ $d: data, $c: childHints }`. Return `{ vertexContent: null }` for an empty tree or a skipped child.

```ts
import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  type TreeTypeParameters,
} from 'configurable-tree-traversal';

type Node = { $d: string; $c: Node[] };
type Tree = TreeTypeParameters<string, Node>;
const root: Node = {
  $d: 'A',
  $c: [
    { $d: 'B', $c: [{ $d: 'D', $c: [] }] },
    { $d: 'C', $c: [] },
  ],
};
const traversal = new DepthFirstTraversal<Tree>({
  traversableTree: {
    makeRoot: () => ({ vertexContent: root }),
    makeVertex: (hint) => ({ vertexContent: hint }),
  },
});
traversal.addVisitorFor(DepthFirstTraversalOrder.POST_ORDER, (vertex) => {
  console.log(vertex.getData());
});
traversal.makeRunner().run(); // D, B, C, A
```

Child vertices are resolved lazily. Resolution options include the parent reference, depth, hint index, and the tree resolved so far. Custom adapters are responsible for detecting cycles in their own graph representation. Both strategies use iterative scheduling and can traverse deeply nested trees without recursive call-stack growth.

## Traversal orders

| Strategy      | Order         | When a vertex is visited                        |
| ------------- | ------------- | ----------------------------------------------- |
| Depth-first   | `PRE_ORDER`   | Before its children                             |
| Depth-first   | `IN_ORDER`    | At configured child boundaries; once for a leaf |
| Depth-first   | `POST_ORDER`  | After its children                              |
| Breadth-first | `LEVEL_ORDER` | Level by level, with siblings in hint order     |

Iteration emits events even when no visitor functions are registered. By default, depth-first iteration includes all three orders. `sortChildrenHints` receives a shallow copy of each vertex's hints; return the desired child order. Resolution `hintIndex` refers to that resulting order.

In-order traversal defaults to visiting between children, and after the child of a one-child parent. Configure it with:

```ts
traversal.configure({
  inOrderTraversalConfig: {
    visitParentAfterChildren: 0,
    visitParentAfterChildrenAllRangesOutOfBoundsFallback: -2,
    visitUpOneChildParents: true,
    considerVisitAfterNullContentVertices: true,
  },
});
```

Child positions start at zero; negative positions count from the end. A pair such as `[0, -2]` is an inclusive range. Use `{ ranges: [0, 2] }` for multiple positions. The fallback is used only when all primary ranges are out of bounds. Null hints always count toward traversal completion; the last option controls whether they also trigger an in-order visit.

## Breadth-first traversal

```ts
import {
  BreadthFirstTraversal,
  TraversableObjectTree,
} from 'configurable-tree-traversal';

const traversal = new BreadthFirstTraversal({
  traversableTree: new TraversableObjectTree({ a: { b: 1 }, c: 2 }),
});
const keys = [...traversal.makeRunner().getIterable()]
  .filter((event) => !event.isTreeRoot)
  .map((event) => event.vertex.getData().key);
// ['a', 'c', 'b']
```

Register visitors using `BreadthFirstTraversalOrder.LEVEL_ORDER`. `traverseBreadthFirst(tree, visitor, config?)` creates and runs a traversal. The corresponding depth-first helper is `traverseDepthFirst(tree, { preOrderVisitor?, inOrderVisitor?, postOrderVisitor? }, config?)`. Both helpers return the runner; pass `null` in place of visitors to just resolve the tree.

## Async traversal

`AsyncDepthFirstTraversal` and `AsyncBreadthFirstTraversal` preserve their synchronous counterparts' configuration, events, commands, graph queries, and visitor metadata. Their adapter, sorter, hint-identity, and visitor callbacks may independently return either a value or a promise. `run()` returns a promise of the runner, and `getIterable()` returns an async-generator-compatible iterator.

```ts
import {
  AsyncDepthFirstTraversal,
  DepthFirstTraversalOrder,
  type TreeTypeParameters,
} from 'configurable-tree-traversal';

type Files = TreeTypeParameters<string, string>;
async function listChildren(path: string): Promise<string[]> {
  return path === 'src' ? [] : ['src'];
}
const traversal = new AsyncDepthFirstTraversal<Files>({
  concurrency: 4,
  traversableTree: {
    makeRoot: () => ({ vertexContent: { $d: '/', $c: ['src'] } }),
    makeVertex: async (path) => ({
      vertexContent: { $d: path, $c: await listChildren(path) },
    }),
  },
});

for await (const event of traversal.makeRunner().getIterable({
  iterateOver: [DepthFirstTraversalOrder.PRE_ORDER],
})) {
  console.log(event.vertex.getData());
}
```

Set `concurrency` to a positive integer to bound invoked callbacks; the default is `Infinity`. Async tree runners may prefetch child callbacks after the parent event boundary. Under timing-independent adapters and visitors, they provide qualified parity with synchronous tree runners: event values and final topology match, but callback timing and the resolved prefix visible to a callback can differ. Async DAG traversal guarantees dependency ordering and committed lifecycle ordering, not a complete event-sequence match with synchronous DAG traversal.

## DAG traversal

`DagTraversal` and `AsyncDagTraversal` traverse a discovered acyclic graph in two lifecycle orders: `ON_READY` after the vertex's initial visitor chain satisfies dependents, and `ON_COMPLETE` after its entire discovered descendant subgraph completes. A dependency waits for a task's `ON_READY`, not its subtree completion. Dependencies do not create graph edges, and an explicit `dependsOn` replaces the default parent dependency.

```ts
import {
  DagTraversal,
  DagTraversalOrder,
} from 'configurable-tree-traversal/traversals/dag-traversal';
import type { TreeTypeParameters } from 'configurable-tree-traversal';

type Workflow = TreeTypeParameters<string, string>;
function runTask(task: string): void {
  console.log(`Running ${task}`);
}
const jobs: Record<string, { children: string[]; dependsOn: string[] }> = {
  root: { children: ['compile', 'test', 'publish'], dependsOn: [] },
  compile: { children: ['publish'], dependsOn: ['root'] },
  test: { children: ['publish'], dependsOn: ['root'] },
  publish: { children: [], dependsOn: ['compile', 'test'] },
};
const traversal = new DagTraversal<Workflow>({
  traversableGraph: {
    makeRoot: () => makeJob('root'),
    makeVertex: (id) => makeJob(id),
    getVertexIdFromHint: (id) => ({ vertexId: id }),
  },
});
traversal.addVisitorFor(DagTraversalOrder.ON_READY, (vertex) => {
  runTask(vertex.getData());
});
traversal.makeRunner().run();

function makeJob(id: string) {
  const job = jobs[id];
  if (job === undefined) throw new Error(`Unknown job: ${id}`);
  return {
    vertexId: id,
    dependsOn: job.dependsOn,
    vertexContent: { $d: id, $c: job.children },
  };
}
```

A DAG constructor accepts exactly one source mode. Use `traversableGraph` for graph callback options, explicit ids and dependencies; use `traversableTree` to adapt an existing tree source while visitors receive the graph facade. The source mode is fixed at construction, although `configure()` can replace the adapter within that mode. Tree-source results cannot add graph identity or dependency fields.

Graph ids use `Map`/`Set` SameValueZero equality, so `NaN`, `null`, explicit `undefined`, symbols, and object references are valid. `getVertexIdFromHint()` returns a wrapper, not a bare id: return `{ vertexId: undefined }` for the real id `undefined`, or return `undefined` when the hint has no identity. A known hint id can reuse a vertex without resolving it; if both the hint hook and resolver supply ids, they must match.

`runner.getResolvedGraph()` provides read-only vertex, status, parent, child, path, and id queries. Query arrays are shallow snapshots: changing an array cannot edit topology, while contained references and user vertex data remain live. With `saveNotMutatedResolvedGraph: true`, DAG runners also expose a structural `notMutatedResolvedGraph` snapshot containing first-accepted content and discovery edges. Rewrites and deletions do not alter it, but user data is still shallowly shared.

## Visitors and commands

Visitors receive `(vertex, options)` and may return `{ commands: [...] }`. Commands apply to the resolved tree; they do not mutate the original input object.

| Command                             | Effect                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `NOOP`                              | No change                                                                    |
| `HALT_TRAVERSAL`                    | Pause after the current visitor's command batch                              |
| `DELETE_VERTEX`                     | Remove the vertex and its resolved descendants, and skip pending descendants |
| `REWRITE_VERTEX_DATA`               | Replace data using `{ newData }`, including `null` or `undefined`            |
| `DISABLE_SUBTREE_TRAVERSAL`         | Skip remaining descendants while retaining this vertex                       |
| `REWRITE_VERTEX_HINTS_ON_PRE_ORDER` | Replace pending child hints using `{ newHints }` before descent              |
| `SET_VERTEX_VISITORS_CHAIN_STATE`   | Pass `{ vertexVisitorsChainState }` to the next sequential visitor           |

Hint rewriting is accepted during depth-first pre-order or breadth-first level-order and throws at other orders. Deleting the root produces an empty resolved tree. Deleted vertices have no further visitor calls or yielded events.

Visitors have a numeric `priority` (default `100`; higher runs earlier). Equal priorities retain registration order. By default, each visitor's commands are applied before the next visitor runs. With `resolutionStyle: TraversalVisitorFunctionResolutionStyle.CONCURRENT`, all concurrent visitors run first, and their commands apply after that group completes. These are synchronous callbacks; `CONCURRENT` describes command timing, not parallel or asynchronous execution.

Visitor options include `resolvedTree`, `vertexRef`, `order`, root flags, and per-order indices. `vertexVisitIndex` and `curVertexVisitorVisitIndex` start at zero. `previousVisitedVertexRef` points to the preceding vertex for that order, or `null` on its first visit. Chain state starts at `null` for each visit. Each runner takes a snapshot of the configured visitor records and in-order configuration. Configuration copies include nested in-order ranges and iteration filter arrays. Exported traversal defaults are frozen; use constructor options or `configure()` to customize a traversal.

## Pause and resume

```ts
import {
  DepthFirstTraversal,
  DepthFirstTraversalOrder,
  TraversableObjectTree,
  TraversalVisitorCommandName,
} from 'configurable-tree-traversal';

const traversal = new DepthFirstTraversal({
  traversableTree: new TraversableObjectTree({ a: 1, b: 2 }),
});
traversal.addVisitorFor(DepthFirstTraversalOrder.PRE_ORDER, (vertex) => {
  if (vertex.getData().key === 'a') {
    return {
      commands: [{ commandName: TraversalVisitorCommandName.HALT_TRAVERSAL }],
    };
  }
  return undefined;
});
const runner = traversal.makeRunner().run(); // HALTED
runner.run(); // finishes the remaining visitors and traversal
```

Breaking a `for...of` iteration also pauses the runner. Resume the same runner with `run()` or a new `getIterable()` call. Completed visitors and yielded events are not repeated. A halt can occur even when its order is excluded from iteration. The halted event is yielded after its visitor chain completes on resumption.

`getIterable()` accepts `iterateOver`, `enableVisitorFunctionsFor`, and `disableVisitorFunctionsFor`. An enable list takes precedence over a disable list. Passing a new config when resuming replaces iteration options with defaults plus that config; omitting it keeps the previous options. A partially executed visitor chain completes before new filters apply to the next event. Only one iterator may be active per runner; close it with `return()` or a loop break before resuming elsewhere.

Statuses are `INITIAL`, `RUNNING`, `HALTED`, `FINISHED`, and `FAILED`. Running a finished runner has no effect; use `makeRunner()` for a fresh traversal. Errors from adapters, visitors, sorting, or traversal execution propagate and leave the runner `FAILED`. Later attempts to run or iterate it rethrow the original thrown value. Its partially resolved tree remains available for inspection; retry with a fresh runner after correcting the cause.

An error in the consumer's `for...of` body closes that iterator and leaves the runner `HALTED`, so it can be resumed. Runners are in-memory continuations, not serializable checkpoints. Advanced callers injecting `traversalRunnerInternalObjects` must provide mutually consistent state and resolved-tree storage, including the saved tree and reference map when saving original vertices.

Async iteration uses the same one-owner rule. Calling `return()` on an active async iterator requests a halt immediately, including while `next()` is waiting on an adapter, then drains only already-started visitor-chain work. Unresolved `next()` calls finish as done and buffered events remain available on resume. User callbacks are not cancelled, so a pending visitor can delay close indefinitely. A loop-body error follows JavaScript iterator-close semantics and remains the reported error; the runner is resumable unless traversal itself failed.

## Inspection and execution

Every runner has a synchronous `inspect()` method. It returns a detached, frozen snapshot with status, traversal kind, source mode, execution mode, effective concurrency, ready visits, frames, visitor chains, pending callback identities, event boundaries, physical in-flight callback count, and buffered event count. Inspection never calls user code, consumes an event, or advances traversal, and snapshots contain reference ids rather than callback functions, promises, or vertex data.

```ts
const asyncRunner = traversal.makeRunner();
const iterator = asyncRunner.getIterable();
const next = iterator.next();
const snapshot = asyncRunner.inspect();
console.log(snapshot.pendingRequests, snapshot.inFlightCallbackCount);
await next;
await iterator.return();
```

All six public runners use the same explicit transition-state model. Synchronous runners execute its callback requests inline; asynchronous runners delegate iteration and `run()` to one shared `AsyncCoreExecution` session with serialized state commits, finite callback limiting when configured, and one iterator lease. Calling `run()` while an iterator owns that session rejects rather than starting a second execution.

## Rewrite objects

The `rewriteObject` namespace is retained for compatibility:

```ts
import { rewriteObject } from 'configurable-tree-traversal';

const input = { keep: 1, remove: 2, nested: [3] };
const { outputObject } = rewriteObject.rewriteObject(input, {
  rewrite: ({ key, value }) => {
    if (key === 'remove') return { delete: true };
    if (typeof value === 'number') return { rewrite: { value: value * 10 } };
    return undefined;
  },
});
// { keep: 10, nested: [30] }; input is unchanged
```

Rewrites run in post-order. Return `{ rewrite: { key, value } }` to rename or replace a property, `{ delete: true }` to remove it, or `undefined` to retain it. Composite parents are reconstructed from their processed children. Arrays are compacted after skipped/deleted elements. Null and undefined values are retained; deleting the root returns `null`.

Set `assembleCompositesBeforeRewrite: true` to receive `assembledComposite` alongside the original property. Options include `isArray`, `isObject`, `isComposite`, and `getKeyPath({ noRoot: true })`. Custom `isArray`/`isObject` and `assembleArray`/`assembleObject` functions support specialized reconstruction. Default reconstruction is for plain objects and arrays; it does not preserve prototypes, descriptors, collection types, or identity shared between branches.

`outputObject` captures the root value when the helper returns (after the optional `getOutputObjectFromRootValue` conversion). If custom visitors halt traversal, check `traversalRunner.getStatus()` before treating that value as complete. Resume with `traversalRunner.run()` and read the final value from `traversalRunner.getResolvedTree().getRoot()?.unref().getData().value`, using `null` when the root was deleted. Resuming does not update the earlier `outputObject` or rerun the output conversion hook.

With `saveNotMutatedResolvedTree: true`, visitors can inspect a separate original resolved tree. Its vertex references, child lists, and resolution contexts are independent of command-driven changes. Vertex data is shallowly shared, so direct mutation of user data is not an immutable snapshot. The saved tree contains only vertices actually resolved during traversal. Runner configuration and visitor records are also copied when a runner is made; later builder configuration does not alter that runner.

`ResolvedTree.getPathTo(ref, { noRoot?, noSelf? })` returns the resolved ancestry in root-to-vertex order and throws if the reference is absent from that tree. Saved-tree paths use saved references from `notMutatedResolvedTreeRefsMap`. Deleting a resolved vertex removes its resolved descendants and detaches it from its parent; deleting the root clears the root pointer.

## API compatibility

Namespace exports `core`, `depthFirstTraversal`, `breadthFirstTraversal`, `dagTraversal`, `traversableObjectTree`, and `rewriteObject` remain available, alongside named exports for all six traversal classes, helpers, and types. Public subpaths include `core` and each traversal family. Historical deep imports such as `configurable-tree-traversal/core/Vertex` and `configurable-tree-traversal/traversals/dag-traversal/lib/DagTraversalRunner` also work.

Corrected behavior includes independent iteration, reliable halt/resume, terminal error handling, sorting, subtree deletion, and zero-based visitor indices. Root deletion and rewriting null now return null instead of throwing; the rewrite result type accounts for that. See [CHANGELOG.md](CHANGELOG.md) for the full list.

## Development

```sh
npm ci
npm run check         # types, lint, coverage, examples, build, packed consumers
npm test -- tests/traversal-combinations.test.ts
npm run test:coverage
npm run build-watch
npm run benchmark -- 50000
npm run tsfile -- examples/tree-from-image-example.ts
```

The tests cover deterministic generated trees and DAGs, mutations, dependencies, async races, pause/resume, failures, snapshots, original-tree isolation, object reconstruction, deep chains, and wide trees. `npm run check` requires 100% statements, branches, functions, and lines across all source files and executes every example. See [the testing guide](docs/testing.md) for the test layout and regression workflow.

The packed consumer check runs CommonJS, ESM, and strict TypeScript imports from a temporary extracted tarball, using installed runtime dependencies. It checks both classic Node and Node16 TypeScript resolution, public subpaths, and historical deep imports. It uses `tar` and runs in CI on Linux. CI checks Node 22 and 24. No package is published by the verification commands. The benchmark compares deep and wide trees with both traversal strategies; timings depend on the machine and are not performance guarantees.

Retries, durable checkpoints, callback cancellation, fetching undiscovered prerequisites by id, and dependencies on subtree completion are outside this release. User vertex data is not frozen. Discovery cycles are rejected; dependency cycles or missing dependencies fail as a scheduling stall.

MIT licensed.
