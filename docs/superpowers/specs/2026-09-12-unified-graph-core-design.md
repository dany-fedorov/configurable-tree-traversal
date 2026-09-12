# Unified graph core, async runners, and DAG traversal design

Rebuild the traversal internals around one core that models every traversal as discovery over a directed acyclic graph with vertex identity and declared dependencies. Trees are the case where each vertex has one parent and is ready as soon as it is discovered. On this core sit three scheduling policies (depth-first, breadth-first, ready-set) and two drivers (synchronous, asynchronous), giving six runners. The existing synchronous API, adapters, visitors, resolved-tree methods, and runner state injection stay unchanged in behavior. This document supersedes `2026-09-12-async-traversal-runners-design.md`.

The observable contracts below take precedence over the internal effect protocol. Compatibility includes callback timing, lazy resolution, and state visibility, not just the final sequence of vertex values. Implementation proceeds through the acceptance gates at the end of this document.

**Finalized for the Sol handoff.** The user selected an explicit, inspectable state-machine core and welcomed asynchronous core execution. The [decisions and concrete contracts](2026-09-12-unified-graph-core-contracts.md) record the questions, answers, type interfaces, inspection API, and dispatcher algorithms. The [file-level implementation plan](../plans/2026-09-12-unified-graph-core.md) is the execution handoff. The core comprises a shared transition kernel plus sync and async execution runtimes; the public iterator APIs are retained.

## Model

A vertex is still `{ $d, $c }`: data plus an ordered list of child hints. A hint is an opaque descriptor the adapter turns into a vertex; the runner never inspects it.

`MakeVertexResult` gains two optional fields:

- `vertexId`: any value usable as a `Map` key. When absent the core generates a unique string id.
- `dependsOn`: an array of vertex ids that must be pre-visited before this vertex is ready. When absent it defaults to the discovering parent's id. The root has no dependencies.

`makeRoot` may return `vertexId`; `dependsOn` on the root is ignored. Every existing adapter returns neither field and retains its current behavior in the existing synchronous tree runners.

An explicit id is detected by own-property presence, so undefined and null remain valid ids. Generated ids use the reference's UUID string. The optional identity hook returns `{ vertexId } | undefined`, distinguishing an explicit undefined id from no identity. A hinted id supplies the result id when that field is absent; if both supply ids, they must match using Map equality.

A vertex's lifecycle:

1. **Discovered**: a hint resolved to content with a new id. The vertex is registered with an edge from the discovering parent at the parent's hint index.
2. **Ready**: every id in `dependsOn` is pre-visited or satisfied by omission.
3. **Pre-visited**: the pre-order (depth-first), level-order (breadth-first), or `ON_READY` (DAG) visitor chain has run. Hint expansion happens after this chain so hint rewrites take effect.
4. **Completing**: hint expansion has finished and every child slot is complete, where a slot is complete when its child is complete, resolved to null, was deleted, or its traversal was disabled. The post-order (depth-first) or `ON_COMPLETE` (DAG) chain is now eligible to run. Pending valid sorting, hint-id lookup, or resolution work prevents completion; an unprepared hint list is not an empty completed list.
5. **Complete**: the completion visitor chain has finished and its commands have committed. Only then does completion propagate to incoming parent slots. Breadth-first has no completion visit and makes this transition immediately when its slots are complete.

In-order visits are index-based on the parent's hint count and fire between slot completions exactly as today. They exist only in depth-first traversal.

### Discovery and dependency relationships

Discovery edges and dependency relationships are distinct. Discovery edges record parent-to-child hints, determine paths and subtree completion, and must form an acyclic graph. Dependencies determine readiness and are satisfied by the initial visitor chain, not by subtree completion. An explicit `dependsOn` replaces the default parent dependency; it does not add to it. An empty array permits readiness immediately after discovery.

The runner discovers vertices only through hints. It does not fetch an unknown dependency by id. Every prerequisite must therefore be discoverable without first visiting the vertex blocked on that prerequisite. For example, `root -> A -> B` with `A.dependsOn = ['B']` stalls even if B would have no dependencies: A's hints cannot be expanded before A is ready. Adapters must expose B through an independently expandable vertex, such as the root. Stall diagnostics report B as undiscovered rather than asserting that a dependency cycle has been found.

Before registering any edge to an existing vertex, including a `getVertexIdFromHint` shortcut, the core rejects a self-edge or an edge whose target already reaches its parent. The error identifies the proposed edge and the cycle path; the edge is not stored. Traversal and cycle checks are iterative. Edges to newly registered vertices cannot close a discovery cycle. Supported graph mutation methods must preserve the same invariant.

### Worked workflow: subtasks and a join

This adapter exposes the following stable ids and child hints. Each task's actual work is awaited inside its `ON_READY` visitor chain.

| Id | Child hints | Dependencies | Initial visitor work |
| --- | --- | --- | --- |
| `root` | `build`, `test`, `publish` | None | Initialize the workflow |
| `build` | `compile-module` | `root` | Prepare the build workspace |
| `compile-module` | `publish` | `build` | Await compilation |
| `test` | `publish` | `root` | Await the test run |
| `publish` | None | `compile-module`, `test` | Await publication |

The root exposes `publish` early so it can be registered before all its prerequisites are discovered. Discovering it again from `test` and `compile-module` adds incoming edges to that same vertex. `publish` waits for compilation and testing to finish their initial chains; it does not wait for their `ON_COMPLETE` chains. There is one discovery-graph sink, `publish`.

In particular, `publish.dependsOn = ['build']` would wait only for workspace preparation, not for compilation. To join several subtasks, name those task ids as prerequisites, or expose an explicit join vertex whose initial chain depends on them. There is no implicit dependency on a vertex's subtree completion in this round. `ON_COMPLETE` represents completion of the discovered subtree, including downstream workflow vertices reached by hints, rather than completion of only the vertex's own task.

## Resolved graph

An internal `GraphStore` owns topology, identity, and lifecycle records; `ResolvedGraph` is its read-only query facade. In DAG mode it stores, per vertex reference: incoming edges, ordered child slots, adapter id, dependencies, discovery depth, and lifecycle status. Tree mode retains the exact legacy `VertexResolved` records as its authoritative visible topology, with a separate unresolved-slot ledger for scheduling. `CTTRef` remains the handle that visitors and events carry; adapter ids are an index onto references, never a replacement.

`ResolvedTree` becomes a compatibility facade over a tree-mode store. `get`, `has`, `getRoot`, `getParentOf`, `getChildrenOf`, `getPathTo`, `delete`, `set`, and `pushChildrenTo` keep their signatures, supplied-record identity, and legacy mutation semantics. This includes partially assembled records and duplicate child entries. Runner-managed tree discovery remains single-parent by construction; arbitrary legacy record edits are not made into reactive scheduling operations. The saved not-mutated tree feature keeps working. Graph queries add `getVertexRefs`, `getParentsOf`, `getVertexById`, `getIdOf`, `getStatusOf`, and `getPathsTo`.

`getPathsTo` follows discovery edges, not dependencies, and returns unique reference sequences, deduplicating equivalent paths through parallel edges. DAG paths are finite because accepted discovery edges are acyclic, but their number can be exponential in the number of vertices. Graph query collections are shallow snapshots; user data/references remain live. `getVertexById` returns a reference or null; `getIdOf` throws for an absent reference. `hasSingleSink` uses discovery edges, returns false for an empty graph, and describes the currently resolved structure rather than proving traversal has finished. New graph mutations use visitor commands; the query facade does not expose raw store mutators.

DAG traversal optionally captures a structural `ResolvedGraphSnapshot` with separate references through `saveNotMutatedResolvedGraph`. It retains first accepted contents and accepted edges despite later rewrites/deletion, excludes discarded or omitted resolutions, and exposes no lifecycle-status query. Discovery depth is fixed by the first accepted incoming edge; resolution contexts describe the currently resolved edge, not a shortest path. Existing tree snapshot names and semantics remain unchanged.

## Compatibility contract

| Observable behavior | Existing synchronous tree runners | Asynchronous tree runners | DAG runners |
| --- | --- | --- | --- |
| Resolution timing | Preserve lazy per-slot resolution and its interleaving with visitors and events | May prefetch child resolutions after the parent's initial visit/event boundary | Discover through hints; shared ids resolve to one logical vertex |
| Visit ordering | Preserve all current order and iterator-filter rules | Preserve the family's visit-order rules for equivalent accepted vertex contents and commands | Sync initial visits use discovery order; async events use committed chain-completion order |
| Adapter state visibility | Preserve the exact resolved-tree prefix at each callback | A prefetched callback may see fewer accepted siblings/subtrees, and shared external state may differ | Resolution and visitation follow dependency readiness rather than a tree prefix |
| Halt in a visitor chain | Preserve the next visitor, chain state, and pending event | Same command-boundary continuation as the synchronous family | Preserve the requesting chain; drain other started chains as defined below |
| Early iterator close | Retain continuation on the runner | Retain continuation and prefetched outcomes | Retain continuation and undelivered committed events |
| Injected state and storage | Preserve existing state objects, reference identity, and saved-tree behavior | Same construction pattern; live asynchronous work belongs to its runner | Plain policy state plus graph storage; live continuations belong to their runner |

For a synchronous breadth-first runner, a root with children A and B must still produce `visit root; resolve A; visit A; resolve B; visit B`. Yielding A must not resolve B. The existing test `resolves the root and children lazily` in `tests/breadth-first.test.ts` is an acceptance criterion for this timing, not merely an example.

Output parity between synchronous and asynchronous tree runners requires adapters and sorters whose results do not depend on resolution timing, the partially resolved tree, or shared side effects from other callbacks. Visitor commands must likewise be equivalent. Synchronous adapters remain valid callback implementations for asynchronous tree runners, but accepting their return types does not promise identical output for timing-sensitive adapters. In DAG traversal, sequence equality is only asserted under a deliberately matched serial schedule; concurrent tests assert the dependency partial order and exactly-once lifecycle processing.

## Effect core

`TraversalKernel` is an explicit, synchronous state machine owning discovery, dependencies, completion propagation, command execution, and visitor-chain positions. It never calls user code or sees a promise. `poll(mode)` returns one action; `submit(reply)` queues a tagged callback outcome. Frame stages and chain positions are records rather than suspended nested generators. See the companion contracts for exact types and algorithms.

The core is async-capable: `AsyncRunnerSession` implements `AsyncCoreExecution`, with async `run()` and iteration over that shared state model. The synchronous restriction applies to individual transition commits, not to the execution core as a whole. Asynchronous work is represented by owned pending requests and tagged outcomes. Future async policy/integration work follows that protocol so its waiting state stays inspectable.

- `CALL`: a request id, owner/epoch token, and one of `MAKE_ROOT`, `SORT_HINTS`, `HINT_ID`, `MAKE_VERTEX`, or `VISIT`. The driver selects the correctly typed callback/context and returns a tagged outcome.
- `EVENT`: a committed iterator event plus an iteration-boundary id. The runner owns delivery and acknowledges the boundary when the consumer advances beyond it.
- `WAIT`: progress requires a callback outcome, consumer demand, or a control request. It is not a completion verdict.
- `HALTED`, `FINISHED`, or `FAILED`: suspension or terminal state, with the original error in the failure case.

The driver selects `drive`, `settle`, or `drain` mode. These distinguish new policy admission, progress by already admitted work while the consumer is idle, and completion of started chains during a halt. Identity lookup and frame preparation occur only after the appropriate initial visit/event boundary. Known ids skip resolution; valid child slots are consumed at each policy's required boundary. Frame cleanup drops unneeded queued work and captured outcomes; it never installs the first rejection handler.

The visitor-chain machine preserves concurrent/sequential grouping and chain state. Within a chain, callbacks are invoked and awaited in existing group/priority order. `CONCURRENT` continues to mean deferred command application for the group, not parallel callbacks within that chain. Keep the existing deep-importable `executeVisitors` function as a synchronous compatibility wrapper over this machine, including its current signature and halt behavior.

Driver tasks enqueue plain tagged outcomes. A single, non-reentrant pump submits them and polls the kernel. A slow resolution cannot block another chain's committed event or observed failure. Completion order is recorded as outcomes are processed, not reconstructed by racing already settled promises.

### Inspection and configuration

`inspect()` is a synchronous, read-only operation on the kernel, async core runtime, and all six public runners. Snapshots expose effective execution/source/traversal options, ready visits, frame/chain positions, pending request identities and validity, event boundaries, and runtime callback/buffer counts. They return immediately while callbacks are pending and work in every runner status. Copied/frozen inspection records contain internal reference ids and control metadata rather than user data, promises, callbacks, or mutable state collections. Existing lifecycle iterators provide event observation.

Configuration remains explicit through builder/core options and supported resume filters. Inspection never advances traversal or changes configuration. Consumers can observe state to choose those inputs; editing an inspection snapshot cannot mutate the scheduler. Detailed snapshot and async execution interfaces are pinned in the companion contracts.

## Scheduling policies

A policy decides which ready vertex to pre-visit next and when to resolve hints. The core calls into the policy; the policy holds the runner's traversal state.

- **Depth-first** keeps its frame stack and its state class. It consumes one child slot at a time, descends immediately, and runs in-order and post-order visits from the frame. It waits for each scheduled chain before advancing the policy, so chains never overlap.
- **Breadth-first** keeps its queue of unresolved resolution contexts and its state class. After the parent's visit/event boundary it prepares and enqueues child contexts; it resolves each child only when that context is dequeued. Async prefetch may start earlier, but child registration and visitation still happen at dequeue time. Chains never overlap.
- **Ready-set** holds ready vertices in discovery order and tracks active chains and outstanding discovery work separately. The synchronous policy expands hints in sorted order after each initial chain; initial visits over a tree therefore follow level order. The asynchronous policy admits independent chains and resolution continuations, processes their queued progress, updates dependency counters on committed initial-chain completion, and expands hints only afterward. Completion visits become eligible only after all child slots are complete and are scheduled through the same mechanism. Outstanding sorting, hint identification, resolution, or buffered progress prevents a premature stall verdict.

Depth-first and breadth-first policies accept tree adapters only in this round: a resolution result carrying `vertexId` or `dependsOn` makes those runners fail with a `TypeError` naming the runner. DAG constructors accept exactly one of `traversableTree` or `traversableGraph`. The former preserves tree callback contexts and rejects graph metadata; the latter enables graph contexts and identity/dependencies. Source mode is fixed at construction. The ready-set policy works with either explicitly selected source mode.

## Drivers

The synchronous driver polls the kernel, invokes each requested callback directly, and submits its result immediately. It does not prefetch. If an adapter, sorter, or visitor returns a thenable, it throws a `TypeError` naming the runner and the callback, which makes the runner `FAILED`; it also observes that thenable's rejection. Its public generator preserves the existing event, halt, and consumer-close boundaries.

The asynchronous driver exposes an `AsyncGenerator`-compatible iterator backed by a runner-owned session and explicit continuations/queues. Its `return()` can request a halt immediately even when a `next()` call is awaiting resolution; ownership is not trapped inside a native async-generator body. Every user callback may return a plain value or a promise. Immediately at invocation, synchronous throws and promise rejections are captured as tagged success/error outcomes. Every returned promise has both settlement handlers attached in that invocation turn; stored outcome promises do not reject. Error handling must not wait for slot consumption, frame cleanup, halt draining, or another task's failure.

Tree prefetch stores outcomes by parent reference and hint index. `MAKE_VERTEX` consumes the stored outcome only at the policy's next slot, surfacing an error there in hint order. DAG resolution outcomes are consumed through the progress queue, subject to the commit rules. Removing unused outcomes does not cancel already invoked callbacks. Queued callbacks that have not started can be dropped when their work is invalidated, retained while halted, or discarded on failure.

One shared limiter counts actual in-flight user callbacks of every kind, including adapters, sorters, hint-id lookups, and visitors, from invocation through settlement. A chain does not reserve an additional callback slot around a visitor request; this avoids double counting and deadlock at `concurrency: 1`. The DAG policy separately caps active chains at `concurrency`, with no cap when it is `Infinity`. An active chain waiting in the callback queue does not consume a callback slot. Eligible callbacks use a FIFO queue.

While an iterator is suspended at a yielded event, already admitted work may settle and started chains may advance, but no new vertex chain or hint frame is scheduled until the consumer requests more progress. Their undelivered events belong to the runner. Iterator closure requests a halt rather than destroying those continuations.

## Runners and public API

Six runner classes behind six traversal classes:

| Traversal | Sync class | Async class | Orders |
| --- | --- | --- | --- |
| Depth-first | `DepthFirstTraversal` | `AsyncDepthFirstTraversal` | `PRE_ORDER`, `IN_ORDER`, `POST_ORDER` |
| Breadth-first | `BreadthFirstTraversal` | `AsyncBreadthFirstTraversal` | `LEVEL_ORDER` |
| DAG | `DagTraversal` | `AsyncDagTraversal` | `ON_READY`, `ON_COMPLETE` |

Every traversal class follows the same constructor/configuration pattern, `configure`, `addVisitorFor`, `listVisitorsFor`, `setVisitorsFor`, and `makeRunner`. Every runner exposes `getStatus`, `isHalted`, `getResolvedTree` (tree runners) or `getResolvedGraph` (DAG runners; tree runners expose it too), and the applicable vertex predicates. DAG events/options use `isGraphRoot`; existing tree events/options retain `isTreeRoot`. Synchronous runners keep `getIterable` returning a `Generator` and `run` returning the runner. Asynchronous runners return an `AsyncGenerator`-compatible iterator and a promise of the runner. New async/DAG builders do not inherit the incompatible synchronous tree-context `Traversal` abstract class. Iterable config inputs are shared per traversal kind. Existing statuses and the one-active-iterator rule are retained.

All runners add `inspect(): CoreInspection`. Async runners delegate execution to the shared `AsyncCoreExecution` session, then return their own public runner from `run()`. Inspection and async-core interface types are exported through the core/root type surface.

Asynchronous adapter, sorter, and visitor types accept a value or a promise of the corresponding synchronous return type. Existing tree adapters, including `TraversableObjectTree`, can therefore be used by the asynchronous tree runners, subject to the timing guarantees in the compatibility contract. Graph adapters can be used by the DAG runners; tree-runner identity/dependency restrictions still apply. Adapters may optionally implement `getVertexIdFromHint(hint)`.

Asynchronous traversal classes accept one extra config field, `concurrency`: a positive integer or `Infinity`, default `Infinity`, counting in-flight user callbacks of any kind. Invalid values throw at construction. Synchronous classes reject the field.

Helpers `traverseDepthFirstAsync` and `traverseBreadthFirstAsync` mirror the existing tree helpers. `traverseDag(source, visitors, config?)` and `traverseDagAsync(source, visitors, config?)` take the explicit tree-or-graph source object, plus `{ onReadyVisitor?, onCompleteVisitor? } | null`. Their config excludes the source properties. A helper `hasSingleSink(resolvedGraph)` supports the single-end modelling convention; the core does not enforce it. `rewriteObject` stays synchronous.

DAG runners accept `traversalRunnerInternalObjects` with data state and a resolved-graph container. Injection accepts initial or quiescent state, not active requests, partial chains, or undelivered runtime-owned events from another runner. Existing tree state classes and injection semantics remain unchanged, including legacy DFS stack helpers. The kernel's actual policy state is bridged to that compatibility surface; unrelated pre-existing legacy records are not implicitly enrolled in the new run. Resuming a live traversal uses the same runner; arbitrary ids are not made serializable.

## DAG semantics

- **Identity.** The first resolution outcome accepted by the core for an id wins, rather than the first callback invoked. A later resolution of the same live id records an edge from the new parent at its hint index and discards the returned content, dependencies included. With `getVertexIdFromHint` the core skips `makeVertex` for an already registered id. Concurrent resolutions for an id that is not registered yet may both run; their results still pass through this single acceptance rule.
- **Omission.** Null content with a previously unknown `vertexId` marks that id satisfied by omission: dependents may proceed, nothing is visited, no vertex is stored, and the parent's slot is complete. Repeated null outcomes for that omitted id complete their slots the same way. A later resolution with content for an omitted id fails the runner with an error naming the id. For an already live id, the first-resolution identity rule wins even if a duplicate result is null; for a tombstoned id, deletion wins.
- **Readiness.** A vertex becomes ready when every dependency id is pre-visited or omitted. Ids that are not yet discovered are simply unmet.
- **Ordering.** The synchronous DAG runner pre-visits ready vertices one at a time in discovery order, so its `ON_READY` events over a plain tree yield level order. The asynchronous DAG runner's events follow committed chain-completion order, for both visit kinds, not callback-start order. An `ON_READY` event means the initial chain finished; only an `ON_COMPLETE` event represents the vertex's subtree completion.
- **Delete.** Removes the vertex and its incident edges, then cascades to every vertex that declared the deleted id as a dependency, including any discovered later that names it, and to descendants left with no surviving parent. Deleted ids remain tombstoned for the run; later resolutions cannot resurrect them. Deleted vertices receive no further callback invocations or delivered events; already invoked callbacks are handled by the commit rules below. Deleting the root empties the graph.
- **Disable subtree.** Stops hint expansion for that vertex. Its slots count as complete.
- **Hint rewrite.** Accepted in `ON_READY` only; other orders throw, as with the tree runners.
- **Stall.** While running, after all queued progress has been processed, the absence of ready work, active chains, and outstanding discovery work is terminal only if every retained vertex is complete. Otherwise the runner fails, listing unmet dependency ids and whether they are undiscovered, or listing child slots/chain phases blocking completion. Dependency cycles surface as dependency stalls; discovery cycles fail at edge registration. A halted run is not diagnosed as stalled.
- **Halt and failure.** Apply the lifecycle rules below. A live DAG callback error becomes terminal when its outcome is processed; a callback invalidated before that point cannot change the run's status. Tree prefetch errors retain their hint-order observation rule.

## Concurrent commits and visitor state

Callbacks may perform external side effects, but engine-owned graph, dependency, slot, and visitor bookkeeping changes are serialized through the core. Every continuation carries its vertex/frame identity and a validity token. A command batch is applied synchronously, in command order, before another continuation's batch can interleave. Sequential visitors commit their batches before the next visitor in that chain; the `CONCURRENT` group commits its collected batch only after that group's callbacks finish.

Before advancing a continuation or applying its outcome, the core checks that the runner has not failed and that the continuation is still valid. Deleting a vertex invalidates its chains, pending discoveries, and undelivered events. Their later success or error outcomes are observed for promise handling but discarded: no commands, new vertices, readiness/completion transitions, events, or runner failure result from them. External effects of an already invoked callback cannot be undone. Subtree disabling invalidates the affected expansion work while allowing the retained vertex's own visitor chain to finish. An earlier delivered event remains history; it is never retracted.

Invalidated continuations do not keep a halt or an otherwise completed traversal open. Already invoked callbacks still occupy their callback-limiter slots until they settle, but their outcomes no longer count as valid work for readiness or termination.

For DAG chains, `curVertexVisitorVisitIndex` and visitor chain state are local to the chain and survive suspension. When visitor execution for an order is enabled, `vertexVisitIndex` is reserved from that order's counter when its chain is admitted. `previousVisitedVertexRef` is a snapshot of the most recently committed live visitor chain for that order at admission, or null. Concurrent chains may therefore see the same previous reference, and indices need not increase in event-delivery order. Deleted/failed chains may leave reserved-index gaps. Tree runners preserve their existing metadata behavior. Disabling visitor execution still advances the vertex lifecycle and permits iterator events, without invoking callbacks.

Direct mutation of user data or exposed references is not transactional. The async output-parity guarantee excludes callbacks that rely on such shared mutations or on scheduling-sensitive graph reads. Engine mutation guarantees apply to supported commands and graph operations, not arbitrary external side effects.

## Halt, failure, and event delivery

A halt request stops admission of new vertex chains and new discovery work. The requesting visitor chain pauses after its current command batch, preserving its next visitor, group state, and pending event. A started chain is one whose explicit chain record has been admitted, including a chain whose next callback is waiting for a limiter slot. Other started DAG chains finish their current chain unless deleted, failed, or independently halted; if one also requests a halt, it pauses at its own command boundary. Their successful commands and lifecycle transitions may commit while draining, but resulting hint expansion and new ready chains wait for resumption.

In-flight adapter, sorter, and hint-id callbacks are not cancelled or awaited solely to become halted. Their outcomes are retained without registering discoveries during the halt. Callbacks queued for work that has not started remain paused, except callbacks needed to drain an already started visitor chain. The status remains `RUNNING` during draining and becomes `HALTED` when all started visitor chains have finished or reached their halt boundaries. Thus `HALTED` is stable for engine-owned graph mutations even if resolution promises are still settling.

| Trigger | Started visitor chains | Resolution work | Events and resulting state |
| --- | --- | --- | --- |
| Visitor halt command | Requester pauses at its batch boundary; other started chains drain or independently halt | Stop new discovery; retain queued work and in-flight outcomes | Deliver eligible completed-chain events to the active iterator, then end that iterator as `HALTED`; no event for a partial chain |
| Iterator `return()`, loop break, or consumer error | Request halt and drain started chains; preserve existing partial chains | Same retention rule | Keep undelivered events on the runner; iterator closure awaits chain draining and releases its active-iterator ownership |
| Vertex deletion during a callback | Invalidate affected chains; invoke no remaining visitors for them | Invalidate affected frames/slots and discard their later outcomes | Remove affected undelivered events; surviving work continues |
| Live callback failure | Stop all advancement and invalidate other continuations | Drop queued work; observe and discard late outcomes | Mark `FAILED` immediately; active iteration delivers already committed surviving events before throwing the original error |
| Resume after halt | Continue retained chains without repeating completed visitors | Re-enable valid retained work and consume stored outcomes | Deliver buffered events first, then continue traversal; acquire the one active iterator |

Buffered events are retained across successful halt/close operations and delivered once, in commit order. They represent already completed visits: new iterable filters on resumption do not retroactively rerun or refilter them. A partial chain retains its previous visitor and iteration configuration until its pending event boundary has passed, matching the existing tree continuation rule.

Failure takes precedence over a pending halt. After failure, no late callback may mutate engine-owned graph state. If an iterator is already closing, there is no consumer to deliver buffered events to: they are discarded, the failure is retained, and a normal `return()`/break reports the failure from draining. An existing consumer-thrown error remains the consumer's error; the runner separately retains any traversal failure encountered during cleanup. Subsequent `run` or `getIterable` attempts on a failed runner rethrow the original traversal error without restarting work. The partially resolved graph remains available for inspection. A consumer error alone leaves a successfully drained runner halted and resumable.

## Async concurrency in tree runners

- Child resolution for a parent starts only after that parent's pre-order (depth-first) or level-order (breadth-first) visitor chain and its iterator event boundary, when enabled. Hint rewrites therefore determine the prepared frame.
- Visits are strictly sequential and follow the same order rules as the synchronous family. Event-value and resolved-tree parity hold under the adapter/visitor assumptions in the compatibility contract.
- The resolved tree passed to a prefetched `makeVertex` call may not yet contain earlier siblings or their subtrees. Callback invocation timing, external side effects, and invocation of work later discarded are observable differences from synchronous resolution, even with `concurrency: 1` if prefetch work has already been admitted.
- Delete and disable-subtree remove queued resolutions that have not started and invalidate unneeded slots. They do not cancel invoked callbacks. Outcomes the core never requests are released when the frame closes or is invalidated.
- A rejected resolution fails the runner when the core requests that child, in hint order. Earlier siblings and, in depth-first traversal, their subtrees are visited first. Immediate outcome capture prevents unhandled rejections while an earlier child remains pending, including during a halt.
- A halt leaves invoked resolutions running and retains their outcomes for resumption; queued resolutions do not start while halted. A stored error is raised only if its still-valid slot is subsequently requested.

## Layout

- `src/core/ResolvedGraph.ts`, with `ResolvedTree.ts` retained as the tree-mode compatibility facade; `src/core/graph/` owns strict/legacy storage, snapshots, and graph containers.
- `src/core/TraversableGraph.ts`, `AsyncTraversableTree.ts`, and `AsyncTraversalVisitor.ts`: source and callback contracts.
- `src/core/effects/`: tagged request, outcome, and action types.
- `src/core/visitors/`: explicit chain machine; `executeVisitors.ts` retains its compatibility wrapper and record sorting.
- `src/core/drivers/`: callback bindings, sync/async transports, callback limiter, wakeup primitive, and runner-owned iterator session.
- `src/core/TraversalKernel.ts`: promise-free step machine and its state/configuration types.
- `src/core/CoreInspection.ts` and `AsyncCoreExecution.ts`: public read-only inspection and asynchronous core execution interfaces.
- `src/core/scheduling/`: the shared discovery, dependency, and completion bookkeeping used by every policy.
- `src/traversals/depth-first-traversal/lib/`: policy file, existing synchronous runner as a wrapper, new `AsyncDepthFirstTraversalRunner.ts`; `AsyncDepthFirstTraversal.ts` and `traverseDepthFirstAsync.ts` beside the existing class and helper. The same for breadth-first.
- `src/traversals/dag-traversal/`: order enum, visitors and state types, policy, both runners, both traversal classes, both helpers, `hasSingleSink.ts`, and an index.
- Exports added to the root index, the namespace objects, and a new `./traversals/dag-traversal` subpath in `package.json` exports and `typesVersions`.

## Validation

The existing test suite must pass without modification throughout the refactor. Coverage remains at 100 percent across all source files, but coverage alone is not evidence for callback-order or concurrency guarantees. Tests assert observable traces, state transitions, and progress under controlled interleavings.

### Compatibility and ordering

- Preserve the breadth-first laziness test, and add callback/event traces and adapter-visible resolved-tree-prefix assertions for both synchronous families. Include iterator close immediately after a parent or first-child event, saved-tree isolation, and injected continuation/storage identity.
- Run deterministic generated trees, mutation/pruning, and halt/resume cases through corresponding sync/async tree families using timing-independent adapters. Assert equal event values/orders and resolved structures. Separately demonstrate the documented differences with a context-sensitive adapter and prefetched side effects.
- Compare synchronous DAG `ON_READY` events over a tree with breadth-first visits, without asserting equal resolution timing or comparing DAG `ON_COMPLETE` events to breadth-first events. Concurrent DAG tests check readiness constraints, one event per completed enabled lifecycle visit, and explicitly controlled committed-completion order rather than general sync/async sequence equality.

### Model and progress

- Execute the worked workflow, including early discovery of `publish`, later discovery of `compile-module`, two- and three-prerequisite joins, and the distinction between task completion in `ON_READY` and subtree completion in `ON_COMPLETE`.
- Cover shared vertices, duplicate resolutions with and without `getVertexIdFromHint`, omission, tombstoned ids, cascade deletion including late-discovered dependents, and `hasSingleSink`.
- Reject self-edges and ancestor back-edges through both ordinary resolution and the known-id shortcut before storing them. Check finite path queries and preservation of the graph after rejection. Cover dependency cycles, missing ids, and the acyclic-but-undiscoverable `root -> A -> B` prerequisite example. Outstanding resolver/sorter/hint-id work must not cause a false stall.
- Hold a child's `ON_COMPLETE` callback pending and assert its parents cannot complete early. Hold one DAG resolution pending while an unrelated chain completes or fails and assert that progress is observed without waiting for that resolution.

### Concurrency and lifecycle

- Use hand-controlled deferreds to measure the shared callback limit across every callback kind, including mixed visitor/resolver work at limits 1 and 2. Verify no chain-level double counting, no limit-1 deadlock, and chain-local indices/state under interleaving.
- Reject a later prefetched sibling while an earlier sibling remains pending across event-loop turns; assert no unhandled rejection before frame cleanup, and that the original rejection is raised only at the required hint-order boundary. Repeat while halted and when the later slot is invalidated before consumption.
- Verify parent visitors/events precede frame admission, hint rewrites change the admitted work, and deletion/subtree disabling release unused work and prevent queued callbacks from starting.
- Delete a vertex while its visitor or resolution is pending. Test late successes, rewrite commands, and rejections; they must neither resurrect graph state nor deliver events nor fail surviving work. Fail a different live chain and assert the graph remains unchanged by every subsequent settlement.
- Halt the requesting chain between sequential visitors; drain another chain; then resume without repeating visitors or events. Close a `for await` iterator while chains are in flight and verify runner-owned events survive until resumption. Cover repeated halts, filtered orders, changed resume filters, delayed resolutions, failures while draining, consumer errors, and one-active-iterator enforcement through closure.
- Synchronous-runner tests verify the thenable guard. Tree runners reject resolution results carrying graph identity/dependencies as specified.
- Inspection tests cover every status and pending async callbacks, copied/frozen snapshot ownership, accurate callback/buffer counts, and absence of callback invocation or traversal advancement caused by inspection. Direct async-core `run()` and iterator execution share the same halt/failure contract as the public runners.

### Release checks

The packed consumer check gains an ESM consumer that runs an asynchronous DAG traversal and imports the new subpath. Examples gain an asynchronous adapter example and the worked DAG workflow with a join and a subtask vertex, both executed by the example runner. The README gets "Async traversal" and "DAG traversal" sections explaining the compatibility matrix and readiness semantics; the changelog gets a 0.8.0 entry.

## Implementation milestones

Each milestone is independently reviewable and must meet its gate before the next begins. These are sequencing and acceptance boundaries, not a substitute for the subsequent file-level implementation plan.

1. **Lock down the observable contract.** Add synchronous callback/state-visibility traces around the current runners, preserving existing tests. Encode the workflow and graph fixtures with expected readiness/completion constraints. Gate: baseline checks pass and fixtures distinguish all ordering assumptions above.
2. **Introduce graph storage and refactor synchronous trees.** Implement the acyclic graph container, the compatible tree view, and shared core/sync policies. Gate: the full original suite and new trace tests pass without altering legacy expectations; saved-tree and injected-state identity remain intact.
3. **Add synchronous DAG traversal.** Implement identity, dependencies, completion propagation, mutation/tombstones, cycle rejection, stalls, and the worked workflow. Gate: synchronous model/progress tests pass, including known-id cycle rejection and undiscoverable prerequisites.
4. **Add asynchronous tree execution.** Implement immediate outcome capture, callback limiting, prefetch storage, and retained continuations. Gate: qualified parity tests, early-rejection tests, limit-1 tests, and tree halt/resume checks pass.
5. **Add concurrent DAG execution.** Implement progress dispatch, isolated chain state, serialized commits, event buffering, and halt/failure draining. Gate: controlled race, slow-resolution progress, late-outcome invalidation, and iterator-close tests pass.
6. **Integrate the public release surface.** Complete exports, helpers, documentation, examples, and consumer verification. Gate: `npm run check` passes with 100 percent coverage and all packed-consumer/example checks, and documented guarantees match the implemented traces.

## Out of scope

Serializable checkpoints. Depth-first and breadth-first traversal over graph adapters. Executing cyclic graphs; discovery cycles are rejected and dependency cycles stall. Dependencies on subtree completion. Fetching otherwise undiscoverable prerequisites by id. Cancellation or rollback of external callback side effects. In-order visits for DAG traversal. One-to-many hint expansion. Renaming hints to edges.
