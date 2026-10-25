# Composable CTT API design

Approved scope: the ten findings from the 2026-10-25 review of main `ed9ad40`. The user requested implementation of all ten and previously authorized push and merge. No npm release or version bump is included.

## Goals and boundaries

Keep CTT generic: discovery, traversal, dependencies, lifecycle, diagnostics and in-memory progress belong here. Storage, business outcomes, dispatch, claims, retries and durable execution belong to the host. This design adds explicit capabilities around the shared state machine and corrects misleading public types/queries; it does not replace the engine.

Alternatives considered: documentation alone leaves observable type/ownership defects; a replacement runner API would impose unnecessary migration. Use additive capabilities and focused type corrections, retaining old event fields and compatibility aliases where they remain truthful.

Global constraints:
- Package version remains 0.11.0; changes are unreleased; no npm publication.
- Preserve Node 22.12.0+ and Bun 1.4.4 support, TypeScript 4.7.4 and 4.9.5 packed consumers, and canonical CJS/ESM constructor/sentinel/type identity.
- Preserve arbitrary SameValueZero IDs (including object, symbol, NaN and explicit undefined), exact thrown values, guarded settlement, single iterator ownership and captured-input validation.
- Keep 100% source statements, branches, functions and lines coverage; do not weaken checks or add test-only production paths.
- Keep unrelated local files and native managed worktrees. Implement in the isolated branch, with one implementer at a time, task reviews and one final whole-branch review.
- Compatibility is preserved except the approved corrections to unsafe output typing, ignored helper options, phase-erasing interfaces and query ownership. Document migration for each.

## 1. Truthful and resumable object rewriting (findings 1, 8, 9)

`rewriteObject` retains its six existing generic positions, but the output default becomes `unknown`, not `In`. A converter can still infer its return type. No overload may promise preservation of arbitrary input shape/prototype when reconstruction or rewriting can change it. Add `rewriteObjectAs<Out>(object, options?)` as the ergonomic explicit-output assertion, exported from the rewrite subpath/namespace and as a named root export; its options use unknown property values and normal property-key types. It is a caller assertion, not runtime schema validation. Preserve the existing namespace export.

`RewriteObjectOptions` excludes `traversableTree` and explicitly forbids it with `?: never` so pretyped objects are rejected too. Runtime JavaScript input containing this unsupported property rejects before source callbacks/rewrite/conversion run, including a present undefined. The helper owns its source and forwards only documented knobs.

Return `getOutput(): Out | null` with the runner and historical `outputObject`. The latter remains a documented initial snapshot for compatibility. `getOutput()` throws a clear error before FINISHED; after FINISHED it reads the final root and applies the original conversion. Cache the first successful final conversion so repeated reads return the same result. If the initial run finished, reuse its converted snapshot. If it halted, the initial compatibility conversion is not the final cache. Conversion throws propagate exactly and are not cached as successful values. Root deletion/null remain supported. No implicit resumption or deep immutability is promised.

## 2. Uniform execution capabilities and pause (findings 3, 6)

Introduce `TraversalExecutionState` with `getStatus`, `getStopReason`, `isHalted`, `inspect`, and `requestPause(): boolean`. Add phase/event-parameterized `SyncTraversalExecution<Phase, Event>` and `AsyncTraversalExecution<Phase, Event>` with precise run and generator types. `TraversalRunner` exposes existing inspection and closeable iteration capabilities. Keep the historical iterable class available for imports.

Preserve `AsyncCoreExecution<Event, Phase = never>` as a compatible name with a safe default: an erased family permits no explicit phase names; callers specify their phase type to select phases. Internal sessions/drivers specify their broader phase parameter explicitly. Concrete runners retain their own phase enums, and type tests must reject DAG phases through a DFS execution abstraction. Do not widen contracts to string or any to make assignments pass.

All six public runners implement `requestPause()`. It returns true only when it records a new pause request on RUNNING execution; it returns false on INITIAL, already requested, HALTED, FINISHED or FAILED. It never acquires an iterator, drives discovery, resumes or throws a retained failure. Sync callers may request it from callbacks. Async callers can request it while `run()` or an iterator owns execution. The existing draining contract applies: admitted chains reach their safe boundary, callbacks are not canceled, future source admissions stop, then the owning operation settles HALTED with reason paused. The runner can subsequently resume normally. A suspended iterator may need another next/return to drive the boundary; the method requests rather than synchronously guarantees a state transition. Reuse session wakeups and close/drain bookkeeping so buffered events and ownership are not lost. No AbortSignal cancellation is added in this scope.

## 3. Typed graph identity (finding 5)

Add trailing optional `ID = unknown` parameters to graph sources and DAG public families without changing existing data/rewrite generic positions. Canonical examples use `DagTraversal<Workflow, Workflow, TaskId>` and `TraversableGraph<Workflow, Workflow, TaskId>`.

Thread ID through graph source results, hint identity, prerequisite input/result, dependencies, completedWork, DAG constructor/configure/helper/runner types, graph visitors/views/snapshots, getVertexId/getVertexRefById aliases, summary/progress, settlement and diagnostic types. `ResolvedGraph<T, ID = unknown>`, `DagSummary<ID = unknown>` and `DagVertexProgress<ID = unknown>` retain old imports/defaults. ID stays independent of rewrite data and hints. Graph-source constructors/helpers infer ID where feasible; explicit generic use must be sound. Legacy tree-source mode keeps unknown generated identities and must not claim that caller-specified IDs describe generated reference UUIDs: exclude non-unknown explicit ID selections from tree-source inputs or otherwise expose that mode accurately.

For a selected non-unknown ID domain, found graph-source results must supply an explicit typed vertexId rather than silently falling back to a generated UUID. Require that in both tagged and legacy found-content types; default unknown sources retain optional IDs. Intentional omitted results may still omit an ID because they do not create a live vertex. Test missing IDs as well as wrong-domain IDs.

Runtime identity rules remain unchanged; generics do not coerce/validate arbitrary IDs. Internal erased boundaries may use a narrow documented type adaptation where IDs originate only from the typed source; do not mask public fixtures with casts or weaken public type checking. Wrong-domain IDs fail at actual API call sites, while object/symbol/undefined IDs remain valid when included in ID.

## 4. Preparation and guarded readiness (findings 2, 4)

Both DAG runners add `prepare(): this` / `Promise<this>`. This performs complete root/hint/prerequisite discovery and combined W/C validation without invoking visitors, emitting execution events, newly committing real-vertex W/C, or creating deferred generations. Accepted completedWork seeds still represent accepted W facts. Synthetic root bookkeeping remains hidden.

Preparation uses full eager discovery, even if the input chose lazy, and establishes the same topology-freeze rule as eager execution. Expose effective eager mode in summaries after preparation begins. Success stops HALTED with a new `getStopReason() === 'prepared'`; empty/omitted-root graphs also prepare successfully without becoming execution-finished. Subsequent run/iteration uses the same discovered graph without repeating source callbacks. Repeated prepare before execution is idempotent. Prepare after execution starts or while another consumer owns the runner rejects without poisoning it; failure rethrows the exact stored error. Invalid caller requests do not mark execution started. Pause during async prepare drains safely and returns paused; another prepare continues it, while run may adopt its eager discovery and continue into execution. There is one ownership mechanism, not a second independent driver/session. Kernel/driver internal additions must remain generic and tested across affected tree families.

Add `DagDeferredWork<ID = unknown> = Readonly<{ vertexId: ID; generation: DagSettlementGeneration }>` and `DagSummary<ID>.deferredFrontier: readonly DagDeferredWork<ID>[]`. This is an observational, detached snapshot of the exact live deferred vertices with no accepted outcome, in existing discovery order. It carries guaranteed generations atomically; it is not a host claim. Completed/deleted/queued-only vertices never appear. Preserve readyIds as dependency eligibility and all old fields. No polling callbacks, event subscriptions or host scheduling policy are added.

Add canonical `kind: 'workCompleted' | 'subgraphCompleted'` to DAG iterator events, retaining `order` for compatibility and visitor/emit phase selection. ON_READY visitor callbacks remain pre-work; their committed iterator events have kind workCompleted. ON_COMPLETE events have kind subgraphCompleted. The kind must reflect an already-committed milestone. Guarded pre-work readiness comes from deferredFrontier after run; docs must not dispatch from completion events. This solves the naming ambiguity without changing existing event timing.

## 5. Milestone-aware diagnostics (finding 7)

Add public `DagDependencyMilestone<ID = unknown> = { vertexId: ID; milestone: 'work' | 'completion' }` and `DagDependencyEdge<ID = unknown> = { from: DagDependencyMilestone<ID>; to: DagDependencyMilestone<ID>; reason: 'workDependency' | 'completionDependency' | 'ownWork' | 'structuralChild' }`. Direction means from waits for to.

Add `dependencyEdges` to `DagTraversalStallDiagnostics<ID>` and snapshots/errors. Edges represent the original declared milestone constraints, independent of seeds: W(v)->W(p), W(v)->C(p), C(v)->W(v), C(parent)->C(child). Include missing prerequisite endpoints too. Preserve arbitrary identity and stable deterministic discovery/declaration ordering; detach edge/milestone records without freezing caller ID objects. Reuse the same edge model to derive cycle analysis so diagnostics cannot drift from validation. Keep existing ID-array fields and document that dependencyCycles are strongly connected component membership, not ordered cycle witnesses. Existing manually constructed diagnostics may omit the new field and receive an empty list, while engine diagnostics always populate it. No new scheduler policy is implied.

## 6. Detached visitor registration queries (finding 10)

All six listVisitorsFor methods return copied arrays of copied registration records. Preserve callback references and immutable group metadata/identity for list/set round trips. Keep mutable result types for compatibility, but mutations never affect builder registrations, future runners or earlier query results. Normalized updates still go through set/add/configure. Public raw advanced fields are not being redesigned.

## Verification and documentation

Behavioral regressions cover both DAG modes and all affected sync/async/tree families. Compile fixtures use real constructors/helpers/interfaces and meaningful negative assertions, including TS4.7.4 packed declarations. Runtime package consumers verify CJS/ESM identity and new capabilities. Docs put autonomous-agent usage first, with readiness, preparation, pause/drain, typed IDs and rewrite results explained in current guides, not merely historical plans. Update migration, reference, README, AGENTS, examples and changelog. Full npm run check, exact minimum/runtime compiler matrices, independent reviews, GitHub CI, merge and local main synchronization are final gates.
