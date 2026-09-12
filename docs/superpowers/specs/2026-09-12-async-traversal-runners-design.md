# Async traversal runners design

Add an asynchronous runner family alongside the existing synchronous one. The synchronous API, adapters, visitors, and runner state injection stay unchanged and fully synchronous. Both families execute the same traversal logic through an effect-yielding core so ordering, halt, resume, and failure semantics cannot drift. Directed acyclic graph support is a separate future design and is out of scope here.

## Effect core

The depth-first frame loop, the breadth-first queue loop, and the visitor chain become generators that yield effect objects and receive each effect's result through the generator's `next` call. The core never calls user code and never observes a promise. Frame, queue, and state class shapes stay as they are so `traversalRunnerInternalObjects` injection and the public stack helpers keep working.

Effects and their results:

- `MAKE_ROOT`: no payload. Result is the adapter's `MakeVertexResult`.
- `FRAME_HINTS`: parent reference plus one prepared `VertexResolutionContext` and `MakeVertexOptions` pair per child, in sorted hint order. Result is void. Emitted after the parent's pre-order visitors complete (depth-first) or after the parent's visit enqueues children (breadth-first), so hint rewrites are already applied.
- `MAKE_VERTEX`: parent reference and child index into that parent's announced list. Result is the `MakeVertexResult` for that child.
- `FRAME_END`: parent reference. Result is void. Emitted when the parent's children phase ends for any reason, including deletion, subtree disabling, or traversal completion.
- `SORT_HINTS`: shallow copy of hints. Result is the sorted array.
- `VISIT`: visitor record, vertex, and input options. Result is the visitor's return value.
- `EVENT`: iterator event to pass to the consumer. Result is void.
- `HALT`: no payload. Result is void. The driver returns control to the consumer here and re-enters the generator on resumption.

Command execution stays inside the core. `executeVisitors` keeps its concurrent and sequential grouping and chain state handling; it yields `VISIT` for each visitor and `HALT` at the same boundaries it yields today.

## Drivers

Two functions translate an effect generator into an event iterator. Each runner keeps its own status, failure, active-iterator, and iterable-config handling exactly as now and delegates only the effect loop to a driver.

The synchronous driver calls the adapter, sorter, or visitor directly for each effect and feeds the result back. It ignores `FRAME_HINTS` and `FRAME_END`. If an adapter, sorter, or visitor returns a thenable, it throws a `TypeError` naming the synchronous runner and the callback, which makes the runner `FAILED`. Today such a return would be stored as vertex content and corrupt the tree silently.

The asynchronous driver is an async generator. For `MAKE_ROOT`, `SORT_HINTS`, and `VISIT` it awaits the callback's return value, which may be a plain value or a promise. On `FRAME_HINTS` it starts `makeVertex` for every announced child through a concurrency limiter and stores the pending promises keyed by parent reference. On `MAKE_VERTEX` it awaits the stored promise for that index. On `FRAME_END` it deletes the parent's entry and attaches a no-op rejection handler to any promise that was never consumed.

## Public API

New classes `AsyncDepthFirstTraversal` and `AsyncBreadthFirstTraversal` mirror `DepthFirstTraversal` and `BreadthFirstTraversal`: constructor options, `configure`, `addVisitorFor`, and `makeRunner`. Their runners expose the same status query methods, `getIterable` returning an `AsyncGenerator` of the same event types, and `run` returning a promise of the runner. Iterable config inputs are shared with the synchronous runners.

Asynchronous adapter, sorter, and visitor types accept a value or a promise of the synchronous return type. Every existing synchronous adapter, including `TraversableObjectTree`, is therefore valid in the asynchronous family without change. Convenience helpers `traverseDepthFirstAsync` and `traverseBreadthFirstAsync` mirror the synchronous helpers and resolve to the runner.

One new instance config field, `concurrency`, limits simultaneous `makeVertex` calls per runner. It must be a positive integer or `Infinity`; the default is `Infinity`. Invalid values throw at construction. The field is accepted only by the asynchronous classes.

`rewriteObject` stays synchronous. Exports are added to the existing `depth-first-traversal` and `breadth-first-traversal` subpaths, their namespace objects, and the root index; package export maps do not change.

## Concurrency and failure rules

- Child resolution for a parent starts only after that parent's pre-order visitors (depth-first) or level-order visitors (breadth-first) have completed.
- Visits are strictly sequential and follow the same order rules as the synchronous family. For the same tree, adapter, visitors, and config, both families produce identical event sequences and resolved trees.
- The resolved tree passed to a concurrent `makeVertex` call may not yet contain earlier siblings' subtrees. This is the only documented observable difference from synchronous resolution.
- Deleting a parent, disabling its subtree, or halting during in-order visits does not cancel in-flight resolutions. Results for children the core never requests are discarded at `FRAME_END`.
- A rejected resolution fails the runner when the core requests that child, in hint order. Earlier siblings and their subtrees are still visited first. The runner becomes `FAILED` with the rejection reason and later runs rethrow it, matching synchronous terminal failure behavior. No unhandled rejection is emitted for other in-flight promises.
- A halt leaves in-flight resolutions running; their results remain available on resumption. Breaking out of a `for await` loop halts the runner exactly as breaking a `for` loop does today. Only one iterator may be active per runner.
- Errors thrown by the consumer's loop body close the iterator and leave the runner `HALTED`, as in the synchronous family.

## Layout

- `src/core/effects/`: effect and result types plus type guards.
- `src/core/executeVisitors.ts`: rewritten to yield effects; signature otherwise unchanged.
- `src/core/drivers/runSync.ts` and `src/core/drivers/runAsync.ts`: generic drivers over any effect generator, parameterized by the callbacks that resolve effects.
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalCore.ts`: the frame loop as an effect generator over the existing state and resolved-trees container.
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts`: existing synchronous runner, now a wrapper over the core and the synchronous driver.
- `src/traversals/depth-first-traversal/lib/AsyncDepthFirstTraversalRunner.ts` and `src/traversals/depth-first-traversal/AsyncDepthFirstTraversal.ts`.
- The same three files for breadth-first under its directory.
- `src/traversals/*/traverse*Async.ts` helpers.

## Validation

The existing test suite must pass without modification; this is the regression proof for the core refactor. A parity suite runs the deterministic generated trees, the mutation and pruning scenarios, and the halt and resume scenarios through both families and asserts identical event sequences and resolved trees. Concurrency tests use hand-controlled deferreds to verify the limit is honored, resolution starts only after pre-order visitors, hint rewrites change what is resolved, deletion and subtree disabling discard prefetched children, rejection surfaces in hint order after earlier siblings are visited, halting with in-flight work then resuming completes correctly, and no unhandled rejection is emitted. Synchronous-runner tests verify the thenable guard. Coverage stays at 100 percent across all source files. The packed consumer check gains an ESM consumer that runs an asynchronous traversal. Examples gain an asynchronous adapter example that the example runner executes. The README gets an "Async traversal" section and the changelog gets a 0.8.0 entry.
