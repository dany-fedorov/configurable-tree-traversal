# Whole-package Claude Fable review and disposition

Requested by the user on 2026-10-26. Reviewer: `claude-fable-5-1`, via Claude CLI 2.1.310 with `--model fable --effort high`. Reviewed head: `cc7591c96e440b97a18e1d8887c744dbbe30caea`. The fixed snapshot contained 406 tracked source/test/example/configuration/guide files (2,986,562 bytes). Only Read/Glob/Grep tools were available, confined to the snapshot; MCP, plugins, shell and editing tools were disabled. The invocation completed successfully and snapshot hashes were verified unchanged. The scope below states what the reviewer actually inspected.

## Disposition

All ten findings were checked against source and public regression tests. No critical or algorithmic defect was reported. Five findings have API/runtime corrections; five have documentation or metadata corrections, retaining the intended host/library boundary.

| Finding | Disposition |
| --- | --- |
| F01: coordinator inspection | Added shared `TraversalExecutionState` methods and `inspectDag()` to sync/async coordinators. Prepared sessions can explain blockers directly. Returning the raw runner would expose a competing mutation path and unnecessary data/hint generics. |
| F02: fatal failure name | Added canonical `failTraversal`; retained `fail` as the same deprecated function. Exact failure values and ticket settlement semantics are unchanged. |
| F03: structural errors | Added exported `DagDiscoveryCycleError` with an immutable, identity-preserving closed cycle witness. Documented eager collection errors, source discovery exceptions and authored-definition issues separately. Deliberately did not fabricate milestone diagnostics or materialize an already rejected cyclic source to force result-shape uniformity. |
| F04: parameterless commands | Walking now accepts explicit `commandArguments: undefined`, matching shared types in consumers without exact optional property checking. Non-undefined arguments still reject; sync/async pause/resume regressions and a packed loose-optional type fixture cover this. |
| F05: unknown options | Walking construction/configuration rejects unknown own keys, including symbols/non-enumerable fields, and misspelled nested limits before discovery. Invalid patches preserve prior configuration. Legacy tree/DAG option behavior remains compatible. |
| F06: vocabulary | Added a reference table mapping collection selectors, source/definition fields, milestone queries and walking/diff relations. Kept existing names rather than multiplying synonyms. |
| F07: omitted roots | Clarified that only found isolated roots produce vertex observations. Omitted roots have no incoming edge and increment omission counts and consume a root-pull step and an occurrence; host resolver instrumentation can retain IDs. No new event kind. |
| F08: revision seeds | Documented host revalidation and filtering against both current live and known omitted IDs; updated the revision example. Unknown seeds still reject, and membership does not establish artifact validity. |
| F09: exact occurrence cap | Documented why exact-cap completion is limited: proving exhaustion requires a further pull. Allow headroom beyond expected admissions, not just vertex count. Existing no-speculative-pull behavior is preserved. |
| F10: package positioning | Updated description and keywords for typed graph walking and agent workflows; release version unchanged. |

Focused regression validation: four suites, 134 tests. Full suite: 113 suites, 2,486 tests, 100% statements/branches/functions/lines. `npm run check` passed, including all 20 runnable examples, 16 documentation snippets, source/packed guide navigation, build, runtime/type consumers, benchmarks and packaging-generator tests. All six packed runtime/compiler lanes passed: Node 22.12.0, Node 24.20.0 and Bun 1.4.4, each with TypeScript 4.7.4 and 4.9.5. Packed checks include CJS/ESM error constructor identity, coordinator capabilities, fatal settlement, and ordinary optional-property command types. No TypeScript compatibility bump was needed.

The additional lazy-DAG observation-cost caveat is documented. Remote CI, push, merge and publication were not performed. CLI logs, fixed snapshots and verification logs are preserved locally under `/tmp/ctt-fable-package-review-20261026-cc7591c/`. A second Claude Fable high pass (`claude-fable-5-1`, same read-only configuration) accepted the ten dispositions and found no new correctness, type or compatibility defect. It identified one important export gap and three documentation issues, all corrected: the cycle error now shares root/core/DAG-subpath identity; omitted-root budget consumption is explicit; troubleshooting and README distinguish preparation exceptions; the changelog records all five runtime corrections. Older fatal-settlement tests now use `failTraversal`, retaining explicit alias coverage. The follow-up scope and full report follow below; final validation was rerun after these corrections.

## Original reviewer report

# Independent review: `configurable-tree-traversal` at `cc7591c96e440b97a18e1d8887c744dbbe30caea`

## 1. Scope actually inspected and limitations

**Read in full (source):**
- Graph walking: `src/traversals/graph-walk/*` (all 26 files: kernel, sync/async sessions, frontier, source cache, resources, visitor chain, option normalization, runners, facades, adapters, helpers, summary/inspection types).
- DAG: `DagTraversal`, `AsyncDagTraversal`, both runners, instance configs, `coordinateDag`, `prepareDag`, `prepareDagDefinition`, `defineDag`, `lib/{PreparedDag,makePreparedDag,definitionSource,capturePreparedSource,prepareDagSource,DagDefinition,DagRevision,DagFragment,DagInspection,DagProgress,DagPolicy,DagGraphView,DagTerminalObservation,DagTraversalVisitor,DagTraversalRunnerState,DagTraversalRunnerIterableConfig}`, `dagFragments`, `reviseDag`, `diffDagDefinitions`, `filterDagVisitor`, `inspectDag`, `traverseDag(Async)`, `hasSingleSink`.
- Core: `TraversalKernel`, `scheduling/*`, `graph/*`, `drivers/*`, `visitors/*`, `TraversalVisitor`, `TraversalExecution`, `CoreInspection`, `ExecutionInspection`, `TraversalRunner`, `TraversalRunnerIterableConfig`, `normalizeTraversalExecutionOptions`, `executeVisitors`, `Vertex`, `CTTRef`, `ResolvedTree`, `ResolvedTreeView`, `ResolvedGraph`, `TraversableGraph`, `TraversableTree`, `AsyncTraversableTree`, `AsyncTraversalVisitor`, `MakeMutationCommandFunctionFactory`, `errors/DagTraversalStallError`, `index.ts`.
- Sources: `graphFrom`, `forestFrom`, `materialize`, `types`.
- Trees/tools: sync/async DFS runners, DFS/BFS policies, `DepthFirstTraversal`, `traverseDepthFirst`, `DepthFirstTraversalInstanceConfig`, sync BFS runner, `TraversableObjectTree`, `makeMutationCommandFactory`, `rewriteObject`.
- Packaging/CI: `package.json`, `.github/workflows/ci.yml`, `scripts/build-esm.cjs`, `jest.config.ts`, `CHANGELOG.md`.

**Docs read:** `README.md`, `docs/index.md`, `docs/reference.md` (full), `docs/agent-workflows.md` (full), roadmap spec, the walking section of `docs/migration-uniform-api.md`.

**Tests/examples read:** `graph-walk-{limits,lifecycle,sources,types.typecheck}`, `async-graph-walk-lifecycle`, `dag-coordination`, `prepared-dag`, `collection-sources`, graph-walk fixtures, parts of `graph-walk-discovery` and `graph-walk-visitors`; examples `agent-api-foundations`, `graph-walk-{references,paths,context}`, `dag-revision`, `dag-inspection`.

**Not inspected:** the remaining ~120 test files beyond grep spot-checks, `scripts/verify-package.cjs` beyond a grep, benchmark scripts, `docs/testing.md`, the design/plan records, BFS async runner and BFS/async-DFS instance configs, DFS in-order helpers, object-tree `lib/` helpers, `DepthFirstTraversalResolvedTreesContainer`, `utils/`. Nothing was executed. Every finding below is grounded in code I read, and I say explicitly where a test pins the behavior. Reproducers are unexecuted.

## 2. Overall assessment

**Correctness.** I traced the walking kernel's state machine (admission, caching, route modes, limits, teardown), both walking sessions, the DAG kernel's settlement/deferral/stall logic, `GraphScheduling`, preparation and replay, fragments, revisions, diffs, and milestone queries. I found no Critical defects and no algorithmic error in the traced paths. Iterative SCC, cycle detection, SameValueZero identity (including NaN in `routeContains`), first-accepted-wins caching, and ownership rules all match the documented contracts and the tests I read.

**Against the four API goals:**
- **Orthogonal:** strong. Revisit policy, observation phase, emission, and visitor selection are independent; W/C milestones are separate from structure; sessions are isolated from definitions. The main non-orthogonality is that `createSession()` returns a coordinator with no path back to the runner, so inspection and graph queries require a different construction route (F01).
- **Type-safe:** strong. Phase inference, ID threading, branded tickets, discriminated results, and the walking `getIterable` narrowing overload are sound. One type/runtime mismatch on shared command objects (F04).
- **Idiomatic:** good, with vocabulary drift inside the DAG family (F06) and a misuse-prone method name on the coordination surface (F02).
- **Workflow coverage:** broad for scheduling, coordination, recovery, revision, inspection and walking. Structural invalidity is reported two different ways depending on entry point (F03), and seed filtering after revision needs host plumbing (F08).

### Cross-family mismatch table

| Operation | Tree | DAG | Walk | Verdict |
| --- | --- | --- | --- | --- |
| Source option key | `traversableTree` | `traversableGraph` / `traversableTree` | `source` (`GraphWalkOptions.ts:72`) | Justified: walking sources have a different contract. Naming is still inconsistent. |
| Source result vocabulary | tagged `found`/`omitted` with `vertexContent` | same plus `vertexId`/`dependsOn`, `omitted` needs `satisfiesDependencies` | `found.data` / bare `omitted` (`GraphWalkSource.ts:8-10`) | Justified: walking has no milestones. Tags agree. |
| Catalog adapters | n/a | `graphFrom` returns option fragment with `syntheticRoot` | `walkSourceFrom` returns a source; `roots` required (`walkSourceFrom.ts:37-44`) | Justified, but `graphFrom` makes every item a root while `walkSourceFrom` has no "all items" shorthand. |
| One-shot helper | `traverseDepthFirst(options)` | `traverseDag(options)` | `walkGraph(options)` | Consistent. |
| Visitor signature | `(vertex, options)` | `(vertex, options)` | `(event, context)` | Justified: no `Vertex` class in walking. |
| Commands | full enum | full enum plus `DEFER_READY` | `HALT`/`NOOP` only; rejects `commandArguments: undefined` (`WalkVisitorChain.ts:61-68`) | Problematic: stricter than the shared type and than tree/DAG (F04). |
| Default emission | all phases (`normalizeTraversalExecutionOptions.ts:81-82`) | both phases | `VERTEX` only (`normalizeWalkOptions.ts:213-216`) | Intentional and documented. Learnability cost only. |
| Emission narrowing | admission-time, no typed overload | admission-time, no typed overload | delivery-time, typed overload (`GraphWalkRunner.ts:24-42`) | Justified: admitted DAG chains keep their config, so DAG narrowing would be unsound. |
| `configure` nested records | `inOrderTraversalConfig` merges (`DepthFirstTraversalInstanceConfig.ts:82-85`) | n/a | `limits` replaces (`GraphWalkOptions.ts:102-109`) | Inconsistent patch semantics. Documented. Minor. |
| Unknown option keys | spread into config | spread into config, `concurrency` rejected (`DagTraversal.ts:129-135`) | ignored except `concurrency` (`normalizeWalkOptions.ts:128-149`); prepared factories reject everything unknown (`makePreparedDag.ts:14-25`) | Problematic: three policies (F05). |
| Async concurrency | accepted | accepted | rejected | Justified: serial first-accepted-wins semantics. |
| Pause / stop reasons | shared | shared | shared | Consistent. |
| Terminal disposal | none | none | `close()` | Justified: only walking owns source iterators. |
| Structural invalidity | n/a | `prepareDag` throws plain `Error`; `prepareDagDefinition`/`composeDag`/`reviseDag` return `invalid` issues | n/a | Problematic (F03). |
| Dependency vocabulary | n/a | `dependencies`/`dependsOn`/`milestone: 'work'`/`workDependencies` | `workDependencies` relation | Problematic drift (F06). |
| Omitted root | omitted root finishes empty | same | no observation at all (`WalkKernel.ts:231-262`) | Contract gap (F07). |
| Inspection type default | `CoreInspection` | `CoreInspection` | `GraphWalkInspection`; wrappers need explicit `ExecutionInspection` (`TraversalExecution.ts:10-12`) | Justified for compatibility. |

## 3. Findings

Severity legend: Critical (data loss/corruption or wrong scheduling), Important (contract or design defect likely to cause host bugs), Minor (friction, docs, hygiene).

---

### F01 · Important · API design · `createSession()` hides the runner, so the recommended coordination path cannot use `inspectDag`, `getResolvedGraph`, `inspect`, or `getStatus`

- **Where:** `src/traversals/dag-traversal/coordinateDag.ts:30-45` (`DagCoordinator` exposes only `advance/complete/fail/summary/requestPause`); `src/traversals/dag-traversal/lib/makePreparedDag.ts:90-104` (`createSession` wraps the runner and discards it); `src/traversals/dag-traversal/inspectDag.ts:9-15` (requires a runner).
- **Trigger:** README quickstart (`README.md:59-68`) builds `prepared.dag.createSession(...)`. The troubleshooting guide (`docs/agent-workflows.md:194`) says to call `inspectDag(runner)` to explain a blocked milestone. A host following both has no runner.
- **Observed behavior (reasoned):** the only way to get explanations is to abandon `createSession` and use `dag.createRunner({ workCompletion: 'externalSettlement' })` plus `coordinateDag(runner)`, which the reference only mentions for the visitor case (`docs/reference.md:238`).
- **Consequence:** the most common agent workflow (advance, dispatch, explain why `review` is blocked) needs a second construction path or a parallel runner just for inspection. This is exactly the "unnecessary plumbing" the roadmap wants to avoid.
- **Smallest fix:** expose `readonly runner` on `DagCoordinator`/`AsyncDagCoordinator` (set in `makeCoordination`), or add `inspect(): DagInspection<ID>` that calls `inspectDag(runner)`. Either keeps ticket provenance private.
- **Verification (unexecuted):** typecheck test asserting `inspectDag(dag.createSession().runner)` compiles and explains a blocker; runtime test that `session.runner.getStopReason()` is `'awaitingSettlement'` after `advance()`.

### F02 · Important · API design, misuse-prone · `DagCoordinator.fail(ticket, error)` reads as a per-task failure but aborts the whole traversal

- **Where:** `src/traversals/dag-traversal/coordinateDag.ts:31-32,78-79` (maps to `{ kind: 'traversalFailed' }`); docs warn repeatedly against this exact mistake (`docs/agent-workflows.md:174,189`).
- **Trigger:** host code for an agent attempt that failed and should be retried:
  ```ts
  const result = await runAgent(ticket.vertexId);
  if (!result.ok) session.fail(ticket, result.error); // intended: mark this task failed
  await session.advance(); // throws result.error; runner is permanently FAILED
  ```
- **Observed behavior:** `fail` settles `traversalFailed`; the next `advance()` rethrows (pinned by `tests/dag-coordination.test.ts:83-97`). There is no recovery except a new session.
- **Consequence:** the ticket API names the one operation hosts must almost never call with the verb they most want to call. The settlement outcome type itself is well named (`traversalFailed`), so the coordinator facade loses that clarity.
- **Smallest fix:** rename to `abort(ticket, error)` (or `failTraversal`), keeping `fail` as a deprecated alias only if compatibility matters (it is unreleased, so a clean rename is cheap). Add a one-line JSDoc: "fatal for the whole session; keep retryable work deferred".
- **Verification:** typecheck test that `fail` is absent or deprecated; existing coordination tests renamed.

### F03 · Important · Contract mismatch · Structural cycles and missing children surface as thrown untyped errors from `prepareDag(graphFrom(...))` but as `invalid` issues from `prepareDagDefinition`/`composeDag`/`reviseDag`

- **Where:** `src/core/graph/GraphStore.ts:170-177` throws `Error('Discovery cycle detected: ...')`; `src/traversals/dag-traversal/lib/prepareDagSource.ts:33-43` maps only `DagTraversalStallError` to `invalid`; `src/sources/materialize.ts:67-76` throws `TypeError` for absent children; versus `src/core/graph/validateDefinition.ts:62-69,109-128` returning `missingStructuralEndpoint` / `structuralCycle`.
- **Trigger (unexecuted):**
  ```ts
  const prepared = prepareDag(graphFrom(
    [{ id: 'a', children: ['a'] }],
    { id: t => t.id, children: t => t.children }));
  // throws Error('Discovery cycle detected: "a" -> "a"'); never reaches kind === 'invalid'
  ```
- **Observed behavior:** the runner `FAILED` path rethrows a plain `Error` with no class or diagnostics. Only the direct-runner variant is pinned (`tests/collection-sources.test.ts:322-337`); nothing pins `prepareDag` here. Meanwhile `prepareDagDefinition` with the same shape returns `{ kind: 'invalid', issues: [{ kind: 'structuralCycle', ... }] }` (`tests/dag-definition-validation.test.ts:48`).
- **Consequence:** the quickstart `if (prepared.kind === 'invalid')` branch does not cover structural problems in host catalogs; hosts must catch by message string. Two preparation entry points for the same graph family have different invalidity vocabularies. Reference documents this (`docs/reference.md:227`) but the README quickstart does not.
- **Smallest fix:** throw a typed error (`DagDiscoveryCycleError` with `vertexIds`) from `GraphStore.linkSlot`, and in `prepareDagSource` either map it into the invalid result (would require widening `PrepareDagResult.invalid`) or at least document the typed error in README. A cheaper but complete option: `prepareDag` runs `validateDefinition` on the captured definition after discovery and returns `issues`, aligning the two paths.
- **Verification:** test `prepareDag(graphFrom(selfChild))` and `prepareDag(graphFrom(twoNodeChildCycle))` asserting either a typed error or `invalid`.

### F04 · Minor · Type/runtime mismatch · Walking rejects `{ commandName: NOOP, commandArguments: undefined }` that the shared type and other families accept

- **Where:** `src/traversals/graph-walk/lib/WalkVisitorChain.ts:61-68` uses `'commandArguments' in command`; tree/DAG `TraversalKernel.ts:1195-1196` ignore the field for `NOOP`; type `TraversalVisitor.ts:43-52` declares `commandArguments?: never`.
- **Trigger:** a host without `exactOptionalPropertyTypes` (the default for most consumers) defines one reusable `const NOOP = { commandName: C.NOOP, commandArguments: undefined }` for all families. It compiles everywhere, works in DFS/DAG, and fails walking with `TypeError('Walking commands do not accept arguments')`. Pinned as intended by `tests/graph-walk-visitors.test.ts:290`.
- **Consequence:** cross-family visitor reuse (a stated goal) breaks only in walking.
- **Smallest fix:** reject only when `command.commandArguments !== undefined`.
- **Verification:** adjust the test at line 290 to expect acceptance of `undefined` and continued rejection of `{}`.

### F05 · Minor · API consistency · Unknown walking options are silently ignored except `concurrency`

- **Where:** `src/traversals/graph-walk/lib/normalizeWalkOptions.ts:128-149` copies only recognized keys; `makePreparedDag.ts:14-25` rejects any unknown key for prepared factories.
- **Trigger (JS or non-literal TS object):** `new GraphWalk({ source, maxDepth: 2 })` (bound placed at top level instead of `limits`). Under `revisit: 'once'` this walks unbounded with no error.
- **Consequence:** inconsistent guardrails: prepared DAG factories are strict, walking is lax, DAG constructors spread unknown keys into `icfg`.
- **Smallest fix:** in `normalizeWalkOptions`, throw `TypeError` for any own key outside the recognized list, matching `assertPreparedOptions`.
- **Verification:** test that `{ source, maxDepth: 1 }` throws before any source call.

### F06 · Minor · Idiom · Four spellings for the same two milestones across DAG surfaces

- **Where:** selectors `dependencies`/`completionDependencies` (`src/sources/types.ts:15-20`); results and definitions `dependsOn`/`dependsOnComplete` (`src/core/TraversableTree.ts:20-23`, `lib/DagDefinition.ts:12-18`); wires, queries and diagnostics `milestone: 'work' | 'completion'` (`lib/DagFragment.ts:20-26`, `errors/DagTraversalStallError.ts:4-7`); relation selections and diff aspects `workDependencies`/`completionDependencies` (`walkSourceFromDag.ts:18-21`, `lib/DagRevision.ts:34-38`).
- **Consequence:** hosts mapping between catalog records, definitions, wires and diffs write translation code; `'completionDependencies'` means a selector in one place and a relation label in another.
- **Smallest fix:** no runtime change needed now; add a vocabulary table to the reference, and consider accepting `work`/`completion` keyed selectors as aliases before release.

### F07 · Minor · Contract gap · An omitted walking root produces no observation

- **Where:** `src/traversals/graph-walk/lib/WalkKernel.ts:231-262`: an edge record is produced only when `via !== null`, and vertex/path only for found vertices, so an omitted root is invisible except in `counts.omittedVertices`. Pinned by `tests/graph-walk-discovery.test.ts:160-181`.
- **Trigger:** `roots: hostIds` with a resolver that returns `omitted` for IDs the host no longer has. The walk yields nothing for that root and the host cannot tell which root was omitted.
- **Consequence:** `docs/agent-workflows.md:23` ("An isolated root still produces a vertex") is true only for found roots; the reference (`docs/reference.md:84`) says "omission produces edge only", which for roots means nothing.
- **Smallest fix:** document the root case explicitly now. Optional follow-up: include `omittedRootIds` in `summary()` or emit an edge-less `omitted` record.

### F08 · Minor · Workflow plumbing · Seeds that name IDs absent from a revised definition make `createSession` throw

- **Where:** `src/core/scheduling/GraphScheduling.ts:128-130` throws `TypeError('completedWork contains undiscovered vertex IDs')` during preparation (`TraversalKernel.ts:1884-1886`), so `makePreparedDag.createRunner().prepare()` throws before a session exists.
- **Trigger:** after `reviseDag` removes `review`, the host passes its persisted accepted-fact set (still containing `review`) to `revised.dag.createSession({ completedWork })`.
- **Consequence:** hosts must intersect facts with `dag.vertices`/`definition.omittedIds` on every tick. The example does this by hand (`examples/dag-revision-example.ts:71-73`). `summary().unusedCompletedWorkIds` cannot help because preparation fails first.
- **Smallest fix:** this is defensible as policy, but a documented helper or option (`createSession({ completedWork, unknownSeeds: 'ignore' })`) would remove the most common plumbing. At minimum, state the filtering requirement in the revision section of `agent-workflows.md`.

### F09 · Minor · Documentation · `maxOccurrences` can never report `exhausted` once reached

- **Where:** `WalkKernel.ts:337-345,494-497`: the gate runs before `outgoing()` and before the roots-done pull, so reaching the cap always yields `limited` even for a fully drained graph. Pinned by `tests/graph-walk-limits.test.ts:70-93` and described at `docs/reference.md:107,110`.
- **Consequence:** a host that sets `maxOccurrences` to the expected catalog size will always see `limited` and may wrongly escalate. `maxSteps` does not have this property (`tests/graph-walk-limits.test.ts:95-113`).
- **Smallest fix:** one sentence in the limits table: "set `maxOccurrences` above the expected count; reaching it is always reported as limited".

### F10 · Minor · Packaging hygiene · Stale package description and keywords

- **Where:** `package.json:4` ("Walk trees and DAGs your way...") and `package.json:35-41` (no `dag`, `agent`, `workflow`, `graph walk` keywords) versus README positioning.
- **Fix:** update before release. No runtime impact.

### Categories inspected with no findings

- **Walking kernel lifecycle:** request/submit protocol, observation acknowledgement, HALT retention, teardown ordering (reverse acquisition), failed-wins-over-cleanup, idempotent close, consumer-error pausing. All match `docs/reference.md:114-122` and the lifecycle tests.
- **Async walking session:** single owner, queued demand, closing drains the admitted chain, no delivery without demand (I could not construct a path where an emitted observation is produced with an empty demand queue).
- **Route modes and limits:** shared adjacency cursor with per-frame index is correct for repeated occurrences; `simplePaths` cycle check precedes `followEdge`; depth gating after `expandVertex` as documented.
- **DAG settlement:** generation checks, identical-replay `false`, conflict `TypeError`, failed-runner guard, deferred re-expansion idempotence (`startedExpansions`), stall versus `awaitingSettlement` decision.
- **Preparation/replay:** exact source-error propagation via the error set; definition capture of effective W/C; anonymous omissions retained but not replayed; `rootDependencies` preserved through replay.
- **Fragments/revisions/diffs:** mapping once per identity, collision detection with SameValueZero, wire validation, `replaceVertex` keeps declaration order, diff aspect ordering.
- **Milestone queries:** BFS order, dedup by (ID, milestone), satisfied-stop in `explain`, correct `unfinishedWork` versus constraint classification.
- **Visitors:** priority-then-index ordering within group boundaries, explicit group policy ownership, batch-end computation, `DEFER_READY` exclusivity.
- **Object tree and rewrite:** ancestor-cycle detection via original identities, post-order assembly, `getOutput()` FINISHED-only caching.
- **Packaging:** `exports` and `typesVersions` include `./traversals/graph-walk`; ESM facades share the CJS runtime; CI covers Node 22/24, minimum 22.12.0, and Bun 1.4.4.

## 4. Integration readiness and remaining design risks

**Readiness:** the checkout is integrable. I found no correctness defect in the walking kernel, sessions, scheduling, settlement, preparation, fragments, revisions or inspection code I traced, and the documented contracts match the tests I read. The Important items are API-shape and contract issues, cheapest to fix before the first release that exposes them: F01 (runner access from sessions), F02 (`fail` naming), F03 (one invalidity vocabulary for structural problems).

**Remaining design risks:**
- **Two preparation paths with divergent failure models** (F03) will harden into compatibility debt once published; align them now.
- **Coordinator surface is narrower than the workflow needs** (F01); hosts will reach for raw runners and `summary().deferredFrontier` generations, bypassing tickets.
- **Walking summaries are count-only.** Hosts collecting reachable IDs must use visitors or iteration; fine today, but the backlog "folds and projections" item (roadmap 10) is the natural fix and should reuse walking observations rather than add a parallel API.
- **Observational cost on lazy DAG runners:** `summary()` recomputes `diagnoseTopology` (SCC over the full graph) whenever the validated topology version differs (`GraphScheduling.ts:135-151`), so per-tick summaries on large lazy graphs are O(V+E). Prepared/eager runners avoid this. Worth a sentence in the reference.
- **Remote CI not run** for this checkout; the local gate evidence covers the six packed lanes, but the Bun lane's `verify-package` for the new `graph-walk` subpath was only confirmed by grep (`scripts/verify-package.cjs:479,496,663-664`), not by reading the assertions.


## Follow-up reviewer report

No blocking findings. All ten dispositions are implemented proportionately, and I found no new correctness, type, or compatibility defect in the changed code. The remaining issues are one export-consistency gap and three documentation inaccuracies.

**Scope.** I read the review document, the diff, the two new untracked files (the error class and the walking fixture), and the changed source plus adjacent contracts: coordinator, prepared DAG factories, source preparation, inspection, walking option normalization and its public option type, visitor chain, walk kernel accounting, graph store linking, scheduling seed validation, collection adapters, execution-state interface, index files, and the verify-package script. I checked the new tests and the docs they pin. Nothing was executed, and I did not re-read the examples beyond the diff.

**Ranked findings**

1. **Important, API consistency.** `DagDiscoveryCycleError` is not re-exported from the DAG traversal subpath. `src/traversals/dag-traversal/index.ts:15` re-exports only the stall error, while `prepareDag` and `coordinateDag` live on that subpath and the reference at `docs/reference.md:191` promises the sibling stall error from root, core, and DAG traversal exports. A subpath consumer, which the type fixture explicitly models with `require('configurable-tree-traversal/traversals/dag-traversal')`, cannot narrow the thrown cycle error with `instanceof`. The consumer script only asserts root ESM/CJS identity. Fix is one export line plus a subpath identity assertion.

2. **Minor, documentation inaccuracy (F07).** `docs/reference.md:84` says an omitted root "contributes only to the unique `omittedVertices` count". It also consumes a step and an occurrence: `WalkKernel.ts:189` increments occurrences before resolution and `WalkKernel.ts:473` counts the root pull. The limits table at line 107 and the pinned test at `tests/graph-walk-discovery.test.ts:175-180` both say so. This matters because the new F09 guidance tells hosts to budget `maxOccurrences` by admissions.

3. **Minor, documentation gap (F03).** The troubleshooting row at `docs/agent-workflows.md:187` still names only invalid results and the stall error for "missing prerequisite or cycle". It should name the typed cycle error and the adapter `TypeError` for absent children. The README quickstart at line 55 still implies the `invalid` branch covers all preparation failures.

4. **Minor, changelog.** The Unreleased section lists unreleased features in detail but omits all five runtime changes: canonical `failTraversal` with deprecated alias, coordinator inspection methods, the typed cycle error, strict walking option keys, and acceptance of explicit undefined command arguments.

5. **Note, not a defect (F02).** Keeping `fail` as a deprecated alias on a never-published surface adds permanent API weight. The older coordination tests at `tests/dag-coordination.test.ts:75-94` still use the alias as the primary path. Acceptable, but consider switching those tests to the canonical name.

**Verified with no issue.** The walking key allowlist matches every field of the public option types, so no typed option is newly rejected. The concurrency message still takes precedence. Invalid patches do not mutate. The cycle witness is closed and identity-preserving, pinned for self and two-node cycles. Omitted IDs are accepted seeds, so the F08 advice to retain `omittedIds` is correct. Both DAG runners return `CoreInspection`, so the coordinator typing is sound for sync and async. ESM facades are generated by directory scan, so the new error module gets a facade. The vocabulary table matches the source names.