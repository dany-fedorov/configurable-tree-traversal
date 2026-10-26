# Graph-walking naming assessment

Baseline: `e52fab02333a044472e9aea864db26a8c33fc051`; source inspected in `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`. All paths below are relative to that checkout. Read the complete global top-level/member vocabulary and all 320 assigned declarations/member signatures. The accompanying JSON contains exactly one disposition per assigned ID: 165 keep, 45 rename, 110 internalize. Inherited/mapped execution and option fields were evaluated through their effective signatures and compared with the global contracts; their declaration IDs remain with the responsible family.

These are recommendations, with no source edits or executed tests. Findings are independent candidates for the coordinator's exactly-20 consolidated list; they are not eight mandatory additions. W1, W4, W5 and W8 deliberately identify cross-family consolidation opportunities. Compatibility cost is reported separately and does not change naming merit.

## W5 — Remove the engine vocabulary from the client construction path (impact 5/5)

Keep `GraphWalkRunner` / `AsyncGraphWalkRunner` as execution capability names, but internalize their constructors and all engine-only deep exports. A client should obtain a runner through `new GraphWalk(options).makeRunner()`, or an equivalent public-options factory. The exported capability can be an interface while the implementation class remains private. If direct construction is intentionally supported, its constructor must accept `GraphWalkOptions` / `AsyncGraphWalkOptions` and normalize internally; a name change alone cannot make a normalized engine protocol suitable caller configuration.

Evidence: `src/traversals/graph-walk/GraphWalkRunner.ts:20` and `AsyncGraphWalkRunner.ts:20` expose `NormalizedWalkOptions` directly. `lib/normalizeWalkOptions.ts:27` captures a separate callback receiver and source methods; `:44` adds normalized visitor records and effective execution options. `GraphWalk.ts:90` already supplies a safe fresh-runner factory. `package.json:175` and `:186` make the deep implementation modules importable via wildcard exports.

Internalize the reviewed classes/protocols `WalkKernel`, `WalkAction`, `WalkFrontier`, `WalkFrame`, `WalkRoute`, `WalkResources`, `Resource`, `SourceIterator`, `WalkSourceCache`, `Adjacency`, `WalkCursor`, unchecked `WalkTarget` / `WalkLink`, `WalkVisitorChain`, `SyncWalkSession`, `AsyncWalkSession`, normalized source/options and validation/projection utilities. Their members are explicitly dispositioned in the JSON. This removes false choices such as `WalkLink` versus `GraphWalkLink`, runner versus `AsyncWalkSession`, and `WalkFrontier` versus the host-facing DAG deferred frontier. A public name like `readStep(unknown)` has no configurable client scope here; it belongs behind the engine boundary.

Exception: `WalkOperation` is part of `GraphWalkInspection.pendingRequests.operation`, so preserve this diagnostic contract as `GraphWalkOperation` in the public walking surface (or inline its union). Do not erase useful inspection types merely because their source happens to live in `lib`. `GraphWalkInspection`, `GraphWalkCounts`, `GraphWalkSummary`, and `GraphWalkOutcome` remain public.

Compatibility cost: high for deep imports/direct construction, low for normal facade callers. Consolidate with the broader package export-boundary proposal.

## W1 — Put eager materialization and the adapted domain in adapter names (impact 4/5)

Rename:

- `walkSourceFrom` → `materializeWalkSourceFromRecords`.
- `walkSourceFromAsync` → `materializeWalkSourceFromRecordsAsync`.
- `walkSourceFromDag` → `walkSourceFromDagDefinition`.

The first two read all catalog entries, all adjacency and all start IDs before returning. The asynchronous function then returns a synchronous `GraphWalkSource`. Meanwhile `AsyncGraphWalkSource` is a separate lazy awaitable protocol and `walkGraphAsync` actually performs async traversal. A generic `FromAsync` suffix makes agents infer the wrong stage is asynchronous or assume the adapter preserves a live source. There is no public lazy/eager knob; these helpers should name their actual eager purpose.

Evidence: `src/traversals/graph-walk/walkSourceFrom.ts:45` loops over the catalog; `:51` eagerly consumes adjacency; `:57` consumes starts; `:19` validates every target. The async variant consumes inputs at `:74`, adjacency at `:78`, and starts at `:83`, then returns the same synchronous materialized implementation at `:84`. The DAG adapter's exact input is `DagDefinition` at `walkSourceFromDag.ts:25`, it copies through `defineDag` at `:45`, and it builds a new relation catalog at `:90`. This is not an adapter over `PreparedDag`, a runner's current graph or a coordinator session.

Example: `const source = await materializeWalkSourceFromRecordsAsync(records, selectors); const runner = new GraphWalk({ source }).makeRunner();` makes both the one-time awaited operation and subsequent synchronous use unsurprising.

Keep `relations`: the DAG adapter actually exposes `children`, `workDependencies`, and `completionDependencies`, preserving the distinction between structure and W/C constraints. Relationship selection warrants the generic relationship terminology. Naming the declaration input also prevents an implied guarantee of prepared DAG scheduling or acyclicity.

Compatibility cost: low mechanical function rename. Reconcile with `graphFrom` / `forestFrom` materialization terminology; avoid creating a different convention only for walking.

## W2 — Mark boolean traversal gates as predicates (impact 4/5)

Rename `followEdge` → `shouldFollowEdge`, `expandVertex` → `shouldExpandVertex`. Rename callback types `GraphWalkFollowEdge` → `GraphWalkEdgePredicate`, `GraphWalkExpandVertex` → `GraphWalkExpansionPredicate`, with corresponding `Async` types.

`expandVertex` currently sounds like a resolver or adjacency producer alongside `resolveVertex`, `outgoing`, and the other traversal family's `makeVertex`. Its actual result is a boolean permission. `followEdge` similarly gates admission before resolution. These are configurable predicates, not extension points that replace the traversal operations.

Evidence: `src/traversals/graph-walk/lib/WalkKernel.ts:265` validates strict booleans; `:286` calls the edge predicate and `:301` conditionally admits; `:308` gates enqueuing expansion, with actual source adjacency called separately at `:497`. Configuration preserves omitted predicates and clears explicit null at `lib/normalizeWalkOptions.ts:190`.

Example: `{ shouldFollowEdge: edge => edge.data.enabled, shouldExpandVertex: vertex => !vertex.data.archived }` accurately expresses both decisions. Keep `GraphWalkFollowContext` / `GraphWalkExpandContext`: the subject of each context remains clear even after the predicate type rename.

Compatibility cost: low mechanical property/type rename. No behavioral redesign or invented new knobs are needed.

## W3 — Give budget and summary counters explicit units (impact 4/5)

| Current | Proposed | Actual unit |
| --- | --- | --- |
| `steps` / `maxSteps` | `candidateReadAttempts` / `maxCandidateReadAttempts` | Root-next and adjacency-next attempts, including cached replay and exhausted reads |
| `occurrences` / `maxOccurrences` | `admittedTargets` / `maxAdmittedTargets` | Admitted target occurrences, including repeated or omitted identities |
| `foundVertices` | `uniqueFoundVertices` | Fresh identities whose resolution is found |
| `omittedVertices` | `uniqueOmittedVertices` | Fresh identities whose resolution is omitted |
| `observedLinks` | `discoveredLinks` | Fresh source adjacency entries, counted before admission filtering |
| `observations` | `processedObservations` | Acknowledged observations by phase, including filtered emission |

These distinctions matter when an agent chooses a hard exploration budget or interprets progress. A maximum number of “steps” is easy to mistake for edges traversed, vertices visited or callbacks executed. Likewise, `observedLinks` invites comparison with emitted edge events, but false predicates can increase this count without any edge observation.

Evidence: `src/traversals/graph-walk/lib/WalkKernel.ts:473` increments before root-next, including done. `:508` determines cached replay and `:509` still increments before edge-next. `:189` counts an admission before checking the resolution cache. Fresh found/omitted identity counts are only updated at `:221`. Fresh adjacency increments `observedLinks` at `:538`, before `follow` at `:540`. Observation counts increment on acknowledgement at `:161`; the sync session acknowledges even when emission is filtered at `lib/SyncWalkSession.ts:53`–`:58`. Bounds gate these same units at `WalkKernel.ts:337`.

Example: `maxCandidateReadAttempts: 100` honestly budgets 100 scan attempts even if all candidates are rejected. `uniqueFoundVertices` can remain constant while `admittedTargets` increases in a cyclic walk. Update `GraphWalkOutcome` limit-reason literals to match renamed bound keys.

Compatibility cost: moderate property/literal migration, with unchanged execution semantics. This should remain one coherent counter-and-budget vocabulary change.

## W8 — Use an action name for execution iteration (impact 4/5)

Rename public runner `getIterable` → `iterateEvents`, consistently across execution families. It returns a lazy execution iterator: advancing it acquires an execution lease, resumes the runner, performs source I/O, invokes visitors, and applies commands. It is not a passive collection getter or a replay of existing observations.

Evidence: `src/traversals/graph-walk/lib/SyncWalkSession.ts:28` returns the lazy iterator; its first advance resumes and acquires ownership at `:33`–`:39`, invokes source/visitor effects at `:42`–`:52`, and pauses when iteration closes at `:64`. The async implementation resumes and starts pumping on the first `next` at `lib/AsyncWalkSession.ts:77`–`:89`. Both public `run` methods consume this same execution iterator (`GraphWalkRunner.ts:43`, `AsyncGraphWalkRunner.ts:43`).

Keep `run`, `summary`, `inspect` and `makeRunner` receiver-scoped. Rename only the getter-shaped action. `iterateEvents({ emitPhases: [...] })` remains lazy; the recommendation does not imply work starts at method invocation. Constructor-only generation or passive observation would need separate APIs, not misleading aliases.

Compatibility cost: moderate because shared `SyncTraversalExecution` / `AsyncTraversalExecution` and all runners should change together. Consolidate with the broader execution-capability recommendation.

## W4 — Align phase, index and execution-option vocabulary (impact 3/5)

Rename `GraphWalkVisitorContext.order` → `phase`, `observationIndex` → `phaseObservationIndex`, `occurrenceIndex` → `admissionIndex`. Rename inspection `activeVisitor.position` → `visitorIndex` and `iterableConfig` → `executionOptions`.

The value named `order` is `GraphWalkPhase`, while traversal order is independently selected by `strategy`. The observation index is not globally increasing across vertex/edge/path kinds: it is read from the counter for this phase. Naming its scope avoids false stable IDs in logging or host bookkeeping. The occurrence index is the target admission number shared by the edge/vertex/path observations it generated. The inspection position is already named visitorIndex in callback context.

Evidence: `src/traversals/graph-walk/lib/WalkVisitorChain.ts:43` maps `order` from `this.phase`, occurrence and observation indexes from the admitted record, and `visitorIndex` from `this.position`. The kernel supplies `this.counts.observations[observation.phase]` at `lib/WalkKernel.ts:447`; `:182` derives occurrenceIndex from admissions. Inspection reads the same chain position at `:623`. `:608` exposes emission and visitor selection together as iterableConfig, although they govern run as well as iterator consumption.

Example: `{ phase, admissionIndex, phaseObservationIndex, visitorIndex }` makes all four coordinates distinguishable. Keep the existing phase selector vocabulary `emitPhases`, `visitorPhases`, and `GraphWalkPhase`; no second “event category” system is necessary.

Compatibility cost: low to moderate field renames. Fold phase and execution-option terms into any corresponding cross-family change rather than inventing a walking-only convention.

## W6 — Call arbitrary graph entry points starts (impact 2/5)

Rename source `roots()` → `starts()` and materializer `roots` option → `startIds`. Walking permits cycles and multiple starts; these identities need not be zero-in-degree vertices, structural roots, or the root of a resolved CTT graph.

Evidence: `src/traversals/graph-walk/lib/WalkKernel.ts:483` accepts each distinct target as a parentless traversal occurrence, without checking incoming edges. `walkSourceFrom.ts:19` only checks identity presence. The DAG adapter does derive starts from explicit `definition.entry` at `walkSourceFromDag.ts:80`, but this is one adapter's policy, not a general GraphWalkSource graph-theoretic root contract.

Example: `{ starts: () => [{ vertexId: selectedNode }], outgoing, resolveVertex }` reads naturally for an exploration beginning halfway around a cycle. The lower impact reflects that “traversal root” is also conventional; this rename chiefly separates graph structure from user-selected exploration entry.

Compatibility cost: moderate for custom sources, low mechanical change. Prefer this only if it fits the project's broader entry/start/root vocabulary.

## W7 — Name an edge's index by its local scope (impact 2/5)

Rename `GraphWalkEdge.index` → `outgoingIndex`. The ordinal belongs to the source vertex's outgoing sequence and is reused on cache replay, rather than identifying global observation order. It also differs from a DAG definition's original child `slotIndex` because selected relationship types share a new adjacency list.

Evidence: `src/traversals/graph-walk/lib/WalkKernel.ts:535` increments the current frame's index, then emits it alongside from/to at `:543`. `walkSourceFromDag.ts:92` builds child links first and dependency links afterwards while retaining original child slot positions in edge data.

Keep `from` / `to`: conventional directed-edge endpoint names are adequate in an explicitly ID-typed edge. Do not mechanically expand every contextual noun to vertexId variants. Keep `GraphWalkDagRelation.slotIndex`, whose source scope is already explicit.

Compatibility cost: low property rename.

## Names retained after substantive scope checks

`GraphWalk` / `walkGraph` warrant their general scope because they expose strategy, revisitation, budgets, edge admission and vertex expansion decisions. `GraphWalkSource` has an independent lazy source protocol. `GraphWalkLink`, `GraphWalkTarget`, `GraphWalkVertex`, and `GraphWalkEdge` describe distinct stages of adjacency/resolution rather than interchangeable records. `Async` correctly denotes awaitable behavior; no parallelism is implied, so fixed inspection concurrency 1 is truthful and does not require renaming every async symbol. `GraphWalkOutcome` is explicitly a traversal outcome and does not usurp host-owned business outcomes. `close` is terminal resource cleanup; `requestPause` is cooperative resumable control.

No claim is made that names alone can teach every timing guarantee. The review checks names against actual public controls and source behavior; it does not substitute documentation tweaks for needed renames, configuration surfaces, or export-boundary changes.
