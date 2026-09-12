# Unified graph core, async runners, and DAG traversal design

Rebuild the traversal internals around one core that models every traversal as discovery over a directed acyclic graph with vertex identity and declared dependencies. Trees are the case where each vertex has one parent and is ready as soon as it is discovered. On this core sit three scheduling policies (depth-first, breadth-first, ready-set) and two drivers (synchronous, asynchronous), giving six runners. The existing synchronous API, adapters, visitors, resolved-tree methods, and runner state injection stay unchanged in behavior. This document supersedes `2026-09-12-async-traversal-runners-design.md`.

## Model

A vertex is still `{ $d, $c }`: data plus an ordered list of child hints. A hint is an opaque descriptor the adapter turns into a vertex; the runner never inspects it.

`MakeVertexResult` gains two optional fields:

- `vertexId`: any value usable as a `Map` key. When absent the core generates a unique string id.
- `dependsOn`: an array of vertex ids that must be pre-visited before this vertex is ready. When absent it defaults to the discovering parent's id. The root has no dependencies.

`makeRoot` may return `vertexId`; `dependsOn` on the root is ignored. Every existing adapter returns neither field and therefore behaves exactly as today.

A vertex's lifecycle:

1. **Discovered**: a hint resolved to content with a new id. The vertex is registered with an edge from the discovering parent at the parent's hint index.
2. **Ready**: every id in `dependsOn` is pre-visited or satisfied by omission.
3. **Pre-visited**: the pre-order (depth-first), level-order (breadth-first), or `ON_READY` (DAG) visitor chain has run. Hint expansion happens after this chain so hint rewrites take effect.
4. **Complete**: every child slot is complete, where a slot is complete when its child is complete, resolved to null, or was deleted. The post-order (depth-first) or `ON_COMPLETE` (DAG) chain runs here. Breadth-first has no completion visit but still tracks completion.

In-order visits are index-based on the parent's hint count and fire between slot completions exactly as today. They exist only in depth-first traversal.

## Resolved graph

`ResolvedGraph` replaces the internals of `ResolvedTree`. It stores, per vertex reference: the vertex, a list of incoming edges (parent reference, hint index, hint), the ordered child slots, the adapter id, the dependency set, and the lifecycle status. It also keeps an id-to-reference index. `CTTRef` remains the handle that visitors and events carry; adapter ids are an index onto references, never a replacement.

`ResolvedTree` becomes a view over `ResolvedGraph` that asserts the single-parent invariant. `get`, `has`, `getRoot`, `getParentOf`, `getChildrenOf`, `getPathTo`, `delete`, `set`, and `pushChildrenTo` keep their signatures and semantics. The saved not-mutated tree feature keeps working on the same structure. `ResolvedGraph` adds `getParentsOf`, `getVertexById`, `getIdOf`, `getStatusOf`, and `getPathsTo` (every discovery path from the root, or the single path for a tree).

## Effect core

The core owns discovery, dependency bookkeeping, completion propagation, command execution, and the visitor chain. It is a generator that yields effect objects and receives each result through `next`. It never calls user code and never sees a promise. Effects:

- `MAKE_ROOT`: result is the adapter's root result.
- `FRAME_HINTS`: a parent reference plus one prepared resolution context and options per child that still needs resolution, in sorted hint order. Result is void. The asynchronous driver may start resolving all children here.
- `MAKE_VERTEX`: parent reference and child index. Result is that child's `MakeVertexResult`.
- `HINT_ID`: a hint. Result is the adapter's `getVertexIdFromHint` value, or undefined when the adapter does not implement it. Yielded once per child before `FRAME_HINTS`, so children whose id is already known record an edge and are excluded from the `FRAME_HINTS` list and never resolved.
- `FRAME_END`: parent reference. Result is void. Unconsumed prefetched results are released here.
- `SORT_HINTS`: shallow copy of hints. Result is the sorted array.
- `VISIT`: visitor record, vertex, and input options. Result is the visitor's return value.
- `SCHEDULE_CHAIN`: a vertex reference and order whose whole visitor chain should run. Result is void. The chain itself is a nested effect generator that yields `VISIT` and `HALT`.
- `AWAIT_COMPLETION`: result is the reference and order of the next chain that finished, together with whether it halted.
- `EVENT`: an iterator event to pass to the consumer. Result is void.
- `HALT`: suspension point. The driver returns control to the consumer and re-enters on resumption.

`executeVisitors` keeps its concurrent and sequential grouping and chain-state rules and becomes the chain generator that `SCHEDULE_CHAIN` refers to.

## Scheduling policies

A policy decides which ready vertex to pre-visit next and when to resolve hints. The core calls into the policy; the policy holds the runner's traversal state.

- **Depth-first** keeps its frame stack and its state class. It resolves one child slot at a time, descends immediately, and runs in-order and post-order visits from the frame. Its `SCHEDULE_CHAIN` is always followed by `AWAIT_COMPLETION` for that vertex, so chains never overlap.
- **Breadth-first** keeps its queue and its state class. It resolves children after a vertex's visit and enqueues them. Chains never overlap.
- **Ready-set** holds a set of ready vertices in discovery order and an in-flight count. It schedules chains while ready vertices exist and the in-flight count is below the limit, then awaits a completion. On completion it expands the vertex's hints, registers discoveries, updates dependency counters, and moves newly ready vertices into the set. Completion visits are scheduled the same way.

Depth-first and breadth-first policies accept tree adapters only in this round: a resolution result carrying `vertexId` or `dependsOn` makes those runners fail with a `TypeError` naming the runner. The ready-set policy accepts any adapter.

## Drivers

The synchronous driver executes each effect directly. For `SCHEDULE_CHAIN` it runs the chain generator to completion or to its first `HALT`, then answers the following `AWAIT_COMPLETION` immediately. It ignores `FRAME_HINTS` and `FRAME_END`. If an adapter, sorter, or visitor returns a thenable, it throws a `TypeError` naming the runner and the callback, which makes the runner `FAILED`. Today such a return would be stored as vertex content and corrupt the tree silently.

The asynchronous driver is an async generator. It awaits the return value of every user callback, which may be a plain value or a promise. On `FRAME_HINTS` it starts `makeVertex` for every child through the concurrency limiter and stores the pending promises keyed by parent reference; on `MAKE_VERTEX` it awaits the stored promise; on `FRAME_END` it drops the parent's entry and attaches a no-op rejection handler to every promise that was never consumed. On `SCHEDULE_CHAIN` it starts a task that drives the chain generator, counting one slot against the limit while it runs. On `AWAIT_COMPLETION` it returns the first task to settle. A task whose callback rejects settles with that error; the driver marks the runner `FAILED`, rethrows, and attaches no-op handlers to the other in-flight tasks.

## Runners and public API

Six runner classes behind six traversal classes:

| Traversal | Sync class | Async class | Orders |
| --- | --- | --- | --- |
| Depth-first | `DepthFirstTraversal` | `AsyncDepthFirstTraversal` | `PRE_ORDER`, `IN_ORDER`, `POST_ORDER` |
| Breadth-first | `BreadthFirstTraversal` | `AsyncBreadthFirstTraversal` | `LEVEL_ORDER` |
| DAG | `DagTraversal` | `AsyncDagTraversal` | `ON_READY`, `ON_COMPLETE` |

Every traversal class has the same constructor options shape, `configure`, `addVisitorFor`, and `makeRunner`. Every runner exposes `getStatus`, `isHalted`, `getResolvedTree` (tree runners) or `getResolvedGraph` (DAG runners; tree runners expose it too), and the vertex predicates it has today. Synchronous runners keep `getIterable` returning a `Generator` and `run` returning the runner. Asynchronous runners return an `AsyncGenerator` and a promise of the runner. Iterable config inputs are shared per traversal kind. Statuses, terminal failure behavior, consumer-error behavior, and the one-active-iterator rule are the same across all six.

Asynchronous adapter, sorter, and visitor types accept a value or a promise of the synchronous return type, so every synchronous adapter including `TraversableObjectTree` works in every runner. Adapters may optionally implement `getVertexIdFromHint(hint)`.

Asynchronous traversal classes accept one extra config field, `concurrency`: a positive integer or `Infinity`, default `Infinity`, counting in-flight user callbacks of any kind. Invalid values throw at construction. Synchronous classes reject the field.

Helpers `traverseDepthFirstAsync`, `traverseBreadthFirstAsync`, `traverseDag`, and `traverseDagAsync` mirror the existing helpers. A helper `hasSingleSink(resolvedGraph)` supports the single-end modelling convention; the core does not enforce it. `rewriteObject` stays synchronous.

DAG runners accept `traversalRunnerInternalObjects` with a state and a resolved-graph container, matching the tree runners. Their state holds only plain data and string or user ids, no closures, so it can be serialized in a later round.

## DAG semantics

- **Identity.** The first resolution of an id wins. A later resolution of the same id records an edge from the new parent at its hint index and discards the returned content, dependencies included. With `getVertexIdFromHint` the core skips `makeVertex` for a known id.
- **Omission.** Null content with a `vertexId` marks that id satisfied by omission: dependents may proceed, nothing is visited, no vertex is stored, and the parent's slot is complete. A later resolution with content for an omitted id fails the runner with an error naming the id.
- **Readiness.** A vertex becomes ready when every dependency id is pre-visited or omitted. Ids that are not yet discovered are simply unmet.
- **Ordering.** The synchronous DAG runner pre-visits ready vertices one at a time in discovery order, so a plain tree yields level order. The asynchronous DAG runner's event order is completion order.
- **Delete.** Removes the vertex and its outgoing edges, then cascades to every vertex that declared the deleted id as a dependency, including any discovered later that names it, and to descendants left with no surviving parent. Deleted vertices receive no further visits or events. Deleting the root empties the graph.
- **Disable subtree.** Stops hint expansion for that vertex. Its slots count as complete.
- **Hint rewrite.** Accepted in `ON_READY` only; other orders throw, as with the tree runners.
- **Stall.** When no vertex is ready and no chain is in flight while discovered vertices still have unmet dependencies, the runner fails with an error listing each stalled id and its missing ids. Cycles introduced through `dependsOn` surface as stalls.
- **Halt.** A halt command from one chain stops new scheduling. In-flight chains finish their current visitor chain and their events are yielded; then the runner is `HALTED`. Resume continues scheduling from the ready set. Breaking a `for await` loop halts the same way.
- **Failure.** A rejected or throwing callback fails the runner when its chain or resolution settles. Earlier completions are still yielded.

## Async concurrency in tree runners

- Child resolution for a parent starts only after that parent's pre-order (depth-first) or level-order (breadth-first) visitors complete.
- Visits are strictly sequential and follow the same order rules as the synchronous family. For the same adapter, visitors, and config, both families produce identical event sequences and resolved trees.
- The resolved tree passed to a concurrent `makeVertex` call may not yet contain earlier siblings' subtrees. This is the one documented observable difference from synchronous resolution.
- Delete, disable-subtree, and halt do not cancel in-flight resolutions. Results the core never requests are released at `FRAME_END`.
- A rejected resolution fails the runner when the core requests that child, in hint order. Earlier siblings and their subtrees are visited first. No unhandled rejection is emitted for other in-flight promises.
- A halt leaves in-flight resolutions running; their results remain available on resumption.

## Layout

- `src/core/ResolvedGraph.ts`, with `ResolvedTree.ts` rewritten as the single-parent view.
- `src/core/effects/`: effect and result types.
- `src/core/executeVisitors.ts`: the chain generator.
- `src/core/drivers/runSync.ts` and `runAsync.ts`.
- `src/core/scheduling/`: the shared discovery, dependency, and completion bookkeeping used by every policy.
- `src/traversals/depth-first-traversal/lib/`: policy file, existing synchronous runner as a wrapper, new `AsyncDepthFirstTraversalRunner.ts`; `AsyncDepthFirstTraversal.ts` and `traverseDepthFirstAsync.ts` beside the existing class and helper. The same for breadth-first.
- `src/traversals/dag-traversal/`: order enum, visitors and state types, policy, both runners, both traversal classes, both helpers, `hasSingleSink.ts`, and an index.
- Exports added to the root index, the namespace objects, and a new `./traversals/dag-traversal` subpath in `package.json` exports and `typesVersions`.

## Validation

The existing test suite must pass without modification; this is the regression proof for the core refactor. Parity suites run the deterministic generated trees, the mutation and pruning scenarios, and the halt and resume scenarios through synchronous and asynchronous runners for all three families and assert identical event sequences and resolved structures; the synchronous DAG runner over a tree is compared with breadth-first. Tree-runner concurrency tests use hand-controlled deferreds to verify the limit is honored, resolution starts only after pre-order visitors, hint rewrites change what is resolved, deletion and subtree disabling release prefetched children, rejection surfaces in hint order, halting with in-flight work then resuming completes correctly, and no unhandled rejection is emitted. DAG tests cover shared vertices reached from several parents, joins with two and three dependencies, dependencies discovered after their dependents, omission, cascade delete including late-discovered dependents, stalls and `dependsOn` cycles, duplicate resolution with and without `getVertexIdFromHint`, tree adapters rejected by tree runners when they return ids, concurrent halt and resume, completion-order events, failure of one chain while others are in flight, and `hasSingleSink`. Synchronous-runner tests verify the thenable guard. Coverage stays at 100 percent across all source files. The packed consumer check gains an ESM consumer that runs an asynchronous DAG traversal and imports the new subpath. Examples gain an asynchronous adapter example and a DAG workflow example with a join and a sub-task vertex, both executed by the example runner. The README gets "Async traversal" and "DAG traversal" sections and the changelog gets a 0.8.0 entry.

## Out of scope

Serializable checkpoints. Depth-first and breadth-first traversal over graph adapters. Cycle support; cycles are reported as stalls or errors. In-order visits for DAG traversal. One-to-many hint expansion. Renaming hints to edges.
