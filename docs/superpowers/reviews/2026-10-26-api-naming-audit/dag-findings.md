# DAG and collection-source naming review

Baseline: `e52fab02333a044472e9aea864db26a8c33fc051`, source tree `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`. Reviewed all **477 assigned symbol/member IDs**, their full declaration signatures and mapped/inherited member contexts, against the global API catalog. `dag-assessment.json` contains exactly one disposition per ID. Counts: 290 keep, 87 rename, 92 internalize, 5 compatibility-only, 2 consolidate, 1 configure.

These are recommendations, not implementation. Source references below are relative to the reviewed checkout. No files in the checkout were edited; no tests, builds, commits, or external writes were performed. Source inspection establishes the naming/behavior mismatches; this is not a runtime correctness audit. Compatibility cost is reported independently of naming merit.

## DAG-01 — Name adapters for eager DAG-source materialization and input form — impact 5/5

**Before:** `graphFrom`, `forestFrom`, their `Async` variants, `CollectionSource`, `GraphSelectors`, `ForestSelectors`.

**After:** `materializeDagSourceFromRecords`, `materializeDagSourceFromRoots`, their `Async` variants, `MaterializedDagSource`, `DagRecordSelectors`, `DagRootSelectors` (and asynchronous selector types).

`graphFrom` eagerly consumes every catalog record, copies topology and uses every record as an entry beneath a synthetic root (`src/sources/graphFrom.ts:15–34`). The asynchronous version awaits its entire input and returns an ordinary synchronous source (`:37–58`). `forestFrom` expands nested records, deduplicates repeated references and allows shared vertices (`src/sources/forestFrom.ts:14–46`); “forest” suggests a tree invariant the adapter does not establish. The returned source exposes `makeRoot`, `makeVertex`, `getVertexIdFromHint`, and `resolvePrerequisite`, with W/C declarations and mandatory synthetic holder (`src/sources/materialize.ts:23–65`).

Compare `GraphWalkSource`/`walkSourceFrom`: labeled outgoing links and explicit roots, without W/C scheduling (`src/traversals/graph-walk/walkSourceFrom.ts:39–66`). Calling both families generic graph-source builders conceals incompatible contracts. “DagSource” here identifies the scheduling-source contract; it does **not** claim materialization validates acyclicity. Validation belongs to preparation.

The longer names expose three decisions an agent otherwise guesses: eager finite consumption, DAG discovery rather than walking adjacency, and catalog records versus nested root records. A shorter `dagSourceFromRecords`/`dagSourceFromRoots` pair is acceptable only if the project decides not to encode eagerness; retaining `graphFrom` requires actual public source-mode/root/relation policies, not a documentation caveat. Do not introduce such controls merely to rescue the old name.

Compatibility cost: medium; function/type aliases can bridge migration. No algorithm change required by the recommended narrower naming.

## DAG-02 — Make the sink relation explicit — impact 4/5

**Before:** `hasSingleSink(graph)`.

**After:** `hasSingleStructuralSink(graph)`; alternatively keep `hasSingleSink` only with a required public relation selector that genuinely supports the desired relations.

The function only counts resolved vertices with no structural children; it ignores W and C dependency edges (`src/traversals/dag-traversal/hasSingleSink.ts:4–15`). A workflow can have several structural leaves and one terminal dependent task, yielding different answers to the two natural interpretations of “sink.” The existing parameter type does not tell the reader which relation is counted. `walkSourceFromDag` already demonstrates an actual relation-selection API (`src/traversals/graph-walk/walkSourceFromDag.ts:13–40`). A narrow rename is preferable to inventing configuration unless multiple sink interpretations are needed.

Compatibility cost: low; straightforward function alias. Impact concerns wrong reasoning about dependency graphs, not spelling aesthetics.

## DAG-03 — Use one explicit work/subgraph milestone vocabulary — impact 5/5

**Before → after:**

- `dependsOn` → `dependsOnWork`; `dependsOnComplete` → `dependsOnSubgraph`.
- `subtreeComplete` → `subgraphComplete`.
- `completedSubtreeIds` → `completedSubgraphIds`; `counts.subtreeCompleted` → `counts.subgraphCompleted`.
- `unmetCompletePrerequisiteIds` → `unmetSubgraphPrerequisiteIds`.
- Harmonize the C milestone literal `completion` and validation tag `milestone` with the same vocabulary in a coordinated cross-family change; a useful issue tag is `invalidMilestoneConstraints`.

Today one milestone is explicit and the other is hidden in an unqualified `dependsOn`; C is called “complete,” “subtree,” “subgraph,” and “completion” across declarations, progress and observations. `DagEvent` already uses accurate `workCompleted` and `subgraphCompleted` tags (`src/traversals/dag-traversal/lib/DagTraversalVisitor.ts:68–81`). `TraversalKernel` sets `subtreeComplete` from `completionCommitted` and separately sets W from `initialCommitted` (`src/core/TraversalKernel.ts:712–745`). Shared descendants make “subgraph” the accurate DAG noun.

Carry the declaration rename through source results, collection selectors, definitions, prepared vertices, graph queries, revision aspects, fragment wires and adapters. Structural children remain separate and are not renamed to dependencies. C also incorporates structural completion constraints; the name must not imply just a particular callback returning.

Compatibility cost: high; touches serialized declarations and object fields. That cost does not justify retaining multiple incompatible terms for the central scheduling distinction.

## DAG-04 — Separate callback readiness phases from committed milestone events — impact 5/5

**Before:** `DagTraversalOrder.ON_READY` labels both a pre-work visitor and an event emitted after work has committed; `ON_COMPLETE` has the same callback/commit ambiguity for C. `DagEvent.order` repeats the callback enum beside its correct `kind`.

**After:** `DagVisitorPhase.ON_WORK_READY` / `ON_SUBGRAPH_READY`, callback `context.phase`; emitted observations are selected by `DagEventKind.WORK_COMPLETED` / `SUBGRAPH_COMPLETED` (or their existing string kind values). Drop/deprecate the redundant callback-phase label on events rather than changing an event to appear to occur before W.

The code explicitly documents the timing split (`src/traversals/dag-traversal/lib/DagTraversalVisitor.ts:68–81`) and projects `ON_READY` to `kind: 'workCompleted'` (`src/traversals/dag-traversal/lib/DagTraversalRunner.ts:405–417`). `emitPhases` and `visitorPhases` are already independent selectors, so complete that separation in the public types: `emitEvents` versus `visitorPhases` for DAG execution. Actual behavior remains callback-before-commit and observation-after-commit.

This matters when agents dispatch work: consuming an event named ready is too late. DFS/BFS order enums genuinely describe traversal ordering; DAG callback labels describe lifecycle eligibility. `GraphWalkPhase` provides a nearby phase-naming precedent but its observations are not DAG W/C commits.

Compatibility cost: high; phase enums, filtering and visitor type parameters. The final recommendation must preserve existing timing rather than rename `workCompleted` to “ready.”

## DAG-05 — Make progress collections describe the facts they contain — impact 5/5

**Before → after:**

- `readyIds` → `readyOrDeferredIds`, `counts.ready` → `counts.readyOrDeferred`.
- `inFlightIds` → `activeVisitorVertexIds`, `counts.inFlight` → `counts.activeVisitorVertices`.
- `deferredFrontier` → `awaitingSettlement` (records retaining vertex ID and generation).
- `deferredIds` → `deferredWorkIds`, `counts.deferred` → `counts.deferredWork`.
- `DagWorkState` literal `running` → `visiting`.

This is based on source, not speculation. `readyIds` includes **both** `state === 'ready'` and `state === 'deferred'` (`src/core/TraversalKernel.ts:722`). `inFlightIds` is derived from active visitor chains (`:697–699,732`), including completion chains, and is not a host-agent execution registry. `deferredFrontier` excludes records whose outcome has already been accepted while `deferredIds` includes them (`:723–730`). Running and completed vertices are excluded from `readyIds`, even though their dependencies may also be satisfied. Consequently the exact name is `readyOrDeferredIds`, not a broader dependency-satisfied claim, and the counts overlap rather than partition `DagWorkState` values.

A host should dispatch from the awaiting-settlement records/tickets, not redispatch every dependency-satisfied ID or interpret visitor activity as external work in progress. Renaming to the actual tracked fact is better than adding a comment to “ready.” Retain explicit generation guards and host ownership of attempts/claims.

Compatibility cost: medium/high due to object fields and state literal. High agentic value because these fields feed dispatch decisions.

## DAG-06 — Unify external-work control as work sessions, and name W completion — impact 4/5

**Before → after:**

- `DagCoordinator` / `AsyncDagCoordinator` → `DagWorkSession` / `AsyncDagWorkSession`.
- `coordinateDag` → `createDagWorkSession`; `coordinateDagAsync` → `createAsyncDagWorkSession`.
- `PreparedDag.createSession` → `createWorkSession`; `createAsyncSession` → `createAsyncWorkSession`.
- `DagCoordinationBoundary` → `DagWorkBoundary`, its `frontier` → `workTickets`.
- `DagCoordinationResult` → `DagSettlementReceipt`.
- `complete(ticket)` → `completeWork(ticket)`.
- `DEFER_READY` → `DEFER_WORK_COMPLETION` (including the corresponding command spelling in the core family).

`coordinateDag` is a wrapper factory; it does not run until `advance()` (`src/traversals/dag-traversal/coordinateDag.ts:125–140`). The async wrapper is also created synchronously; its **advance** operation returns a promise (`:143–158`). The wrapper rejects all policies except external settlement (`:69–77`). Prepared “sessions” are precisely these wrappers, force `workCompletion: 'externalSettlement'`, and reject visitors (`src/traversals/dag-traversal/lib/makePreparedDag.ts:90–103`; `PreparedDag.ts:55–65`). There is one concept under two nouns, and “coordinator” overpromises dispatch/attempt/retry policy that remains with the host.

`complete` only settles W (`coordinateDag.ts:93–97`). `DEFER_READY` does not postpone discovery/readiness: its ready callback chain has already started and the command terminates that chain into external W deferral (`src/core/TraversalKernel.ts:1126–1129,1156–1160,1193–1194`). Keep `DagWorkTicket`, `generation`, `failTraversal`, `advance`, and `requestPause`: those names accurately communicate capability, scope and lifecycle. Keep the deprecated `ok` settlement shape compatibility-only; canonical tags already distinguish work success from traversal-wide failure.

Compatibility cost: medium; aliases/wrappers can migrate the vocabulary. No host-business coordination should be added merely to make “Coordinator” generic enough.

## DAG-07 — Distinguish input, normalized config, patch, preparation result and execution options — impact 3/5

Use a coherent type grammar:

| Current | Proposed |
| --- | --- |
| `DagTraversalInstanceConfigInput` | `DagTraversalOptions` |
| `DagTraversalInstanceConfig` | `ResolvedDagTraversalOptions` |
| `DagTraversalConfigureInput` | `DagTraversalPatch` |
| `DagTraversalHelperOptions` | `TraverseDagOptions` |
| `DagTraversalRunnerIterableConfigInput` | `DagExecutionOptions` |
| `DagDiscoveryOptions` | `DagSchedulingOptions` |
| `DagDefinitionResult` | canonical `PrepareDagResult` |

Apply the same roles to asynchronous types. Free `DagTraversalOptions` from its current private normalized-field helper. `DagDiscoveryOptions` contains W completion policy and dependency policy, not just discovery (`src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:13–19`). Configure input is an optional source-preserving patch, whereas constructor input requires a source (`:86–108`). The “iterable” options also control whether visitors run when `run()` drains events. `DagDefinitionResult` succeeds with **PreparedDag**, while `defineDag()` returns an unvalidated declaration (`src/traversals/dag-traversal/lib/DagDefinition.ts`; `src/traversals/dag-traversal/defineDag.ts:50–53`); the existing reverse alias `PrepareDagResult` should become canonical.

Use `createRunner` consistently instead of `makeRunner` on traversal factories to match PreparedDag, while retaining ordinary `configure`, `run`, and receiver-scoped `prepare`. Do not rename `defineDag`, `composeDag`, `reviseDag`, or `diffDagDefinitions`: their operation shapes and distinct return types support their scopes. Keep positional `*HelperConfig`/`*VisitorsSimple` vocabulary compatibility-only rather than promoting another parallel constructor idiom.

Compatibility cost: mostly type-level and low/medium, plus the factory method alias.

## DAG-08 — Remove engine state and normalization machinery from the public vocabulary — impact 5/5

Internalize deep-exported implementation helpers and raw state instead of giving them reassuring generic API names. Assigned examples include `DagPolicy`, `DagTraversalRunnerState`, `DagTraversalRunnerInternalObjects`, `capturePreparedSource`, `definitionSource`, `makePreparedDag`, source materialization helpers, terminal-observation helpers, default resolved-config constants, validators and config merge helpers. `InferredDagId` is inference-control machinery, not a runtime identity model.

Also internalize public runner `icfg`, `state`, `resolvedGraphsContainer`, `inspectDagState`, configuration `traversalRunnerInternalObjects`, and raw mutable traversal `visitors` fields. The runner exposes them directly (`src/traversals/dag-traversal/lib/DagTraversalRunner.ts:65–68,93–95,259–265`). `inspectDagState` is explicitly marked internal but remains emitted and public. Export wildcards start at `package.json:175`; an `@internal` comment does not constrain imports.

Provide client needs through the existing typed `configure`, registration methods, `inspect`, milestone snapshot, `summary`, resolved views and prepared factories. Remove unsupported wildcard reachability and root re-exports; if raw injection is intentionally supported, put it in an explicitly unstable engine subpath rather than suggesting a durable checkpoint or generic storage extension point. This is public boundary design, not a request to make generic internals configurable.

Compatibility cost: high for deep-import/raw-state users; low for documented host workflows. The inventory dispositions include these accidental surfaces rather than excluding them from review.

## DAG-09 — Name the data projection in the visitor filter — impact 3/5

`filterDagVisitor` → `filterDagDataVisitor`; `filterAsyncDagVisitor` → `filterAsyncDagDataVisitor`. Supporting callback names should include `Data` too.

An ordinary `DagVisitor` receives `Vertex`; this wrapper instead passes `vertex.getData()` to both the predicate and wrapped callback (`src/traversals/dag-traversal/filterDagVisitor.ts:59–66,99–105`). The predicate cannot inspect traversal context or the live vertex, and the async form still has a synchronous predicate. Either expose real vertex/context predicate controls under a generic filter name, or keep the current narrower helper and name its data scope. A type guard narrows data only; it must not promise to narrow the entire live graph.

Compatibility cost: low; aliases. Retaining `Async` adjacent to the async callback concept avoids claiming the wrapper factory itself awaits materialization.

## DAG-10 — Replace “not mutated” with the precise original-structure concept — impact 4/5

`saveNotMutatedResolvedGraph` → `retainOriginalStructure`; `notMutatedResolvedGraph` → `originalGraphView`. Coordinate with the tree/core family's analogous names and the overly broad `ResolvedGraphSnapshot` type.

This stores original accepted structure progressively (`src/core/graph/ResolvedGraphsContainer.ts:81–87,102`) and clones hints but shares data (`src/core/graph/snapshot.ts:65–80`). It does not freeze caller payloads or capture the entire graph at construction time. “Not mutated” can be read as an immutability guarantee; “snapshot” can imply point-in-time completeness. The proposed names communicate what retention actually covers. This view is distinct from the milestone snapshot in DAG-12, which captures an observation at one moment.

Compatibility cost: medium; option and callback/runner member aliases. Do not propose `immutableGraph` or deep-copy semantics as a cosmetic fix.

## DAG-11 — Name callback context and registration metadata consistently across families — impact 3/5

`DagVisitorOptions` → `DagVisitorContext`; consolidate `AsyncDagVisitorOptions` into it. `DagTraversalVisitors` → `DagVisitorRegistrations` (and async counterpart). `curVertexVisitorVisitIndex` → `visitorIndex`; `vertexVisitorsChainState` → `visitorChainState`.

The second callback argument is supplied by the engine and contains graph/phase/index/current-registration facts (`src/traversals/dag-traversal/lib/DagTraversalVisitor.ts:10–26`), not caller choices. The async options type is an exact alias (`:45–50`). `GraphWalkVisitorContext` already uses the clearer noun and `visitorIndex`. Registration collections contain metadata-bearing `VisitorRecord`s rather than bare callbacks (`src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:35–41`).

The index is reset for each vertex chain and incremented between callback invocations (`src/core/executeVisitors.ts:74,79–91`), while `vertexVisitIndex` advances after a vertex chain finishes (`:115–117`). Keep the latter and `previousVisitedVertexRef` unless a coordinated all-family metadata redesign supplies equally precise replacements. This is not an invitation to collapse the two counters.

Compatibility cost: medium because callback property names change; type aliases are easy to bridge. Merge this with the core/tree metadata proposal in the final review.

## DAG-12 — Name dependency inspection as a captured milestone query — impact 4/5

`DagInspection` → `DagMilestoneSnapshot`; standalone `inspectDag` → `inspectDagMilestones`; receiver method `inspectDag()` → `inspectMilestones()`.

`inspectDag` captures state, progress and original dependency constraints once (`src/traversals/dag-traversal/inspectDag.ts:18–43`). Query methods close over that captured observation (`src/traversals/dag-traversal/lib/DagInspection.ts:61–84,91–102`). It neither advances discovery nor observes subsequent settlement automatically. The same runner also has `inspect()` for engine execution diagnostics and `getResolvedGraph()` for live topology, so the undifferentiated “DagInspection” noun makes choosing and caching the right object harder.

Keep `explain`, `prerequisitesOf`, `dependentsOf` and `transitive`: the proposed receiver and actual public transitivity switch give them sufficient scope. Do not prepend every method with DAG/dependency text. Internalize the current raw `DagInspectionSnapshot` implementation record so it does not collide with the public observation concept.

Compatibility cost: low/medium; aliases plus method wrappers. High value in coordination loops where a cached inspector otherwise appears live.

## DAG-13 — Standardize the remaining public progress identity field — impact 2/5

`DagVertexProgress.id` → `vertexId`.

The summary writes the same graph logical ID into `id` (`src/core/TraversalKernel.ts:709,735–738`) that definitions, prepared vertices, events and tickets call `vertexId`. This is not a reference ID, generation or business task ID. The receiver supplies enough context that `id` is not intrinsically invalid, but consistent field spelling removes needless translation in generic host tooling. Keep nested omission `identity: {vertexId} | null` because arbitrary ID values make that wrapper meaningful.

Compatibility cost: low/medium, one public object field. Suitable to fold into the larger cross-family identity consistency improvement rather than reserve a whole final top-20 slot.

## Deliberate keeps and limits

The 290 keeps are not exemptions for historical compatibility. They cover reviewed operation/data shapes whose receivers or actual configuration establish adequate scope: authored definitions, slots and omissions; fragment ports and explicit ID mapping; revision operations and shallow diffs; prepared topology and distinct source/runner factories; independent structural versus prerequisite endpoints; generation/ticket identity; genuine direct/transitive milestone querying; tagged work success versus traversal failure; and conventional lifecycle/registration methods. Repeated class/interface members inherit the same reviewed semantic rationale with explicit exceptions in the JSON.

The exact final grouping belongs to the full-API review: engine visibility, milestone vocabulary, callback context, original-structure naming and identity spelling overlap other families. This family report intentionally supplies more candidate groups than a fixed per-family quota, with relative ranks and source evidence, so the coordinator can select exactly twenty coherent improvements across the whole package.
