# Fable API clarity re-review — 2026-10-26

Reviewed revision: `337d990b400aa00cdc59a7c762aca518dae46c49` (`feat/general-graph-walking`), reviewed independently of the checkout where this report is read.

Reviewer: Claude CLI 2.1.310, requested `--model fable --effort high`; session metadata confirmed `claude-fable-5-1`. Review used a tracked snapshot with only Read/Glob/Grep tools. Raw session evidence is in `/tmp/ctt-api-clarity-rereview-337d990/`. No implementation changes were made for this review.

Read the [maintainer assessment](2026-10-26-api-clarity-fable-rereview-assessment.md) before implementing recommendations: finding 2's proposed types-only fix is unsound under existing buffered-event semantics, and several compatibility/type claims need qualification.

The following report is preserved verbatim.

---

No blocking defects. The prior cleanup is verifiably in place: tree omission is plain `{ kind: 'omitted' }`, every prepare/compose/revise path returns `invalid.issues`, selectors are `dependsOn`/`dependsOnComplete`, the coordinator `fail` alias is gone, and the docs now explain event timing and the `vertices` projection. What remains is a small set of consistency gaps, almost all on unreleased surface and cheap to close. No tests were executed for this review.

## Ranked findings

Labels: **[new]** not in the prior 20 findings; **[known]** previously dispositioned; **objective** means the API or docs contradict each other or another family; **subjective** means naming preference.

**1. Important, new, objective. `defineDagFragment` is the one validating entry point that throws instead of returning `invalid.issues`.**
Evidence: `src/traversals/dag-traversal/dagFragments.ts:37-39` runs `prepareDagDefinition` and, on `invalid`, throws `new TypeError('DAG fragments require a closed valid definition')`, discarding the issues array. `instantiateDagFragment` repeats the whole validation at `dagFragments.ts:58`. The design record `docs/superpowers/specs/2026-10-26-fable-api-clarity-design.md:7` says all preparation/composition/revision validation failures use `issues`; `composeDag` at `dagFragments.ts:184` does. Misunderstanding: a host writes one `report(result.issues)` helper for `prepareDag`, `prepareDagDefinition`, `composeDag`, `reviseDag`, then calls `defineDagFragment` on a definition with a W/C cycle and gets an opaque TypeError with no diagnostics. Smallest fix: throw an error subclass that carries `issues`, or return the same `{ kind: 'valid' | 'invalid' }` union as `composeDag`. API/types change. Compatibility: fragments are unreleased, so free.

**2. Important, new, objective. Only walking narrows the event type from an explicit `emitPhases` selection.**
Evidence: `src/traversals/graph-walk/GraphWalkRunner.ts:24-42` overloads `getIterable` so `{ emitPhases: [GraphWalkPhase.EDGE] }` yields `GraphWalkEventFor<..., EDGE, ...>`; `tests/graph-walk-types.typecheck.ts:221-236` asserts this. `src/traversals/dag-traversal/lib/DagTraversalRunner.ts:333-335` and `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:230-232` always return the full union. The reference presents `emitPhases` as one shared selector at `docs/reference.md:956`. Example of the trap:

```ts
for (const e of dagRunner.getIterable({ emitPhases: [DagTraversalOrder.ON_READY] })) {
  e.kind; // still 'workCompleted' | 'subgraphCompleted'; walking would have narrowed
}
```

Actual behavior: runtime filtering is correct; only the static type differs. Smallest fix: add the same explicit-selector overload to the six tree/DAG runners, keyed on `order`. Types-only, additive. Compatibility: runner classes are published, but an added overload breaks no caller.

**3. Minor, new, objective. The shipped object adapter returns the deprecated untagged result shape.**
Evidence: `src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts:103,111-116,125,152,160-165` declare and return `MakeTreeVertexResult`, which `src/core/TraversableTree.ts:72` marks `@deprecated`. Misunderstanding: a user modeling a custom adapter on the built-in one copies `{ vertexContent }` and `{ vertexContent: null }`, which the migration guide at `docs/migration-uniform-api.md:164-170` lists as the deprecated form; subclassers see deprecation strikethrough on an overridden public method. Smallest fix: return `TreeFoundVertexResult`/`TreeOmittedVertexResult` and annotate with `TreeSourceVertexResult`. API/types, behavior unchanged. Compatibility: tagged results are unreleased; the deprecated return type remains assignable to the union, so subclasses keep compiling.

**4. Minor, new, objective. `DagTraversalStallError` is not generic over ID while `DagDiscoveryCycleError<ID>` is.**
Evidence: `src/core/errors/DagTraversalStallError.ts:30-31` fixes `diagnostics: DagTraversalStallDiagnostics` with `unknown` IDs; `DagDiscoveryCycleError.ts:4` carries `ID`. The library itself must cast at `prepareDag.ts:89` and `lib/prepareDagSource.ts:44`. A typed `DagTraversal<W, W, TaskId>` user catching a stall gets `unknown` IDs in `dependencies[].id`. Smallest fix: `class DagTraversalStallError<ID = unknown>` with typed `diagnostics`. Types-only. Compatibility: published since 0.9.0, but a defaulted type parameter is source-compatible.

**5. Minor, new, objective. Dependency inspection is a method on sessions and a free function on runners.**
Evidence: `coordinateDag.ts:40-41` exposes `inspectDag()` on coordinators; runners only offer `summary()`/`inspect()` methods, and dependency explanations require importing `inspectDag` from `inspectDag.ts:9`. Workflow docs tell users to pair `summary()`, `inspectDag()`, `inspect()` as three views at `docs/agent-workflows.md:131`. Smallest fix: add `inspectDag()` to both DAG runners delegating to the function; keep the function. API, additive. Compatibility: unreleased.

**6. Minor, new, objective. Root flags are named per family: `isTreeRoot` for trees, `isGraphRoot` for DAGs, nothing for walking.**
Evidence: `src/core/TraversalRunner.ts:16`, `src/core/TraversalVisitor.ts:99` vs `lib/DagTraversalVisitor.ts:20,77`. A cross-family event consumer must branch on family to ask one question. This also means no DAG runner satisfies the generically named `TraversalRunner` base. Fix: docs now, a shared alias in a future major. Compatibility: both names shipped in 0.8.0, so a rename is major-version work.

**7. Minor, new, docs. `Traversal` and `TraversalRunner` are named as universal bases but are tree-only.**
Evidence: only `DepthFirstTraversal.ts:35` and `BreadthFirstTraversal.ts:33` extend `Traversal`; `DagTraversal.ts:28`, `AsyncDagTraversal.ts:30`, `GraphWalk.ts:24` do not, and `DagEvent` lacks `isTreeRoot`, so DAG runners cannot be typed as `TraversalRunner`. The reference says "`TraversalRunner` exposes the same sync capabilities" at `docs/reference.md:984` without saying it is tree-only. Fix: one sentence pointing cross-family code to `SyncTraversalExecution`/`AsyncTraversalExecution`. Docs only. Published names.

**8. Minor, new, objective; extends known 12. Walking `configure()` has three patch semantics, and predicates can never be cleared.**
Evidence: `lib/normalizeWalkOptions.ts:178-182` replaces `limits`; `215-221` patches `visitors` per phase; `190-197` keeps the previous `followEdge`/`expandVertex` whenever the patch value is `undefined`. Misunderstanding: `walk.configure({ followEdge: undefined })` looks like removal and silently retains the predicate; limits can be cleared by replacement but predicates cannot. Smallest fix: document the retention, or accept `null` to clear a predicate. Docs or small API. Compatibility: unreleased. The recorded rationale for 12 covers limits replacement; it does not address un-clearable predicates.

**9. Minor, new, types. `ExecutionInspection.kind` is `string` although every implementation is a closed literal.**
Evidence: `src/core/ExecutionInspection.ts:11` vs `CoreInspection.ts:25` and `lib/GraphWalkInspection.ts:12`. A family-agnostic wrapper cannot exhaustively switch on `kind`. Fix: `'depth-first' | 'breadth-first' | 'dag' | 'graph-walk'`. Types-only. Compatibility: `ExecutionInspection` is unreleased.

**10. Minor, new, objective. `DagTraversal.configure` tests source presence differently from the constructor.**
Evidence: `DagTraversal.ts:58-63` uses `'traversableTree' in input`, while `DagTraversal.ts:137-150` treats an own `undefined` as absent. `configure({ traversableTree: undefined })` on a graph-mode traversal throws "source mode cannot change". Fix: use the same own-and-defined test in both places. Runtime, tiny. Compatibility: the configure guard appears alongside unreleased tagged-source work; verify against the 0.11.0 tag before relying on that.

**11. Minor, new, subjective. `failTraversal` returns `{ kind: 'accepted' }`.**
Evidence: `coordinateDag.ts:29-31,93-94`. A fatal report reading as "accepted" is odd; `'recorded'` or a separate union would read better. Documented as the same acceptance union at `docs/reference.md:347`. Unreleased.

**12. Minor, new, subjective. The structural relation is `children` in walking selections and `slots` in diff aspects.**
Evidence: `walkSourceFromDag.ts:18-21` vs `lib/DagRevision.ts:34-38`. Both unreleased; both meanings are documented, and they differ slightly because diff compares slot arrays including omissions. Leave or align; low value.

**13. Minor, new, docs. Three routes to eager validation and overlapping readiness lists lack one decision table.**
`discovery: 'eager'` plus `run()`, `runner.prepare()`, and `prepareDag()` all validate before visitors (`docs/reference.md:417-426,233-238`), and `readyIds` is a superset of `deferredIds` while `deferredFrontier` adds generations (`docs/reference.md:664-666`). Each is documented; a short "use this when" table next to the execution-model table at `docs/agent-workflows.md:43-46` would remove the guesswork. Docs only.

**Known items, re-checked.** Finding 5 from the prior review remains the largest residual learnability risk: an `ON_READY` visitor is pre-work while an `ON_READY` event is post-commit (`lib/DagTraversalVisitor.ts:68-82`). The mitigation is thorough and I do not challenge the deferral to a major version. Findings 1, 2, 3, 6, 8, 15, 17, 20 are implemented as recorded, verified at `src/core/TraversableTree.ts:64-89`, `src/core/drivers/normalizeSourceResult.ts:68-79`, `prepareDag.ts:84-92`, `src/sources/materialize.ts:79-84`, `coordinateDag.ts`, `lib/PreparedDag.ts:69-72`, `hasSingleSink.ts:4-6`, `docs/reference.md:82,126,211-212`. Findings 7, 9, 11, 12, 13, 14, 16, 18, 19 are justified or deferred; I challenge none of them.

**Verified non-issues.** `rootDependencies: 'ignore'` looked lost across `reviseDag`, since `prepareDagDefinition.ts:17` hardcodes `'honor'` and `DagDefinition` has no policy field. It is not lost: `src/core/scheduling/GraphScheduling.ts:321-326` stores an empty root `dependsOn` under `ignore`, and `captureDagDefinition` reads the stored list, so the definition encodes the effective policy. The wording "original root W policy" at `docs/reference.md:242` is true only via that effective list; one clause would make that explicit. Also, `advance()` cannot return `awaitingSettlement` with an empty frontier, because `TraversalKernel.ts:464-465` requires deferred work before choosing that stop reason.

## Cross-family consistency

| Concern | Tree | DAG | Walking | Assessment |
| --- | --- | --- | --- | --- |
| Builder, `makeRunner()`, `run()`/`getIterable()`, one-shot `traverseX`/`walkGraph` options object | yes | yes | yes | Useful consistency |
| `SyncTraversalExecution`/`AsyncTraversalExecution` with `ExecutionInspection` default | yes | yes | yes | Useful consistency |
| `kind: 'valid' \| 'invalid', issues` results | n/a | prepare, definition, compose, revise | n/a | Useful consistency; fragments are the exception (finding 1) |
| `emitPhases`/`visitorPhases` field-wise patching | yes | yes | yes | Useful consistency |
| Static narrowing from explicit `emitPhases` | no | no | yes | Avoidable mismatch (finding 2) |
| Phase vocabulary | `*Order` enum | `*Order` enum | `GraphWalkPhase` enum, context `order` | Justified, known 9 |
| Source vocabulary | `makeRoot`/`makeVertex` | plus `resolvePrerequisite`, `getVertexIdFromHint` | `roots`/`resolveVertex`/`outgoing` | Justified difference; documented as non-interchangeable |
| Omission shape | `{ kind: 'omitted' }` | plus `satisfiesDependencies: true` | `{ kind: 'omitted' }` | Justified; omission is a milestone decision only in DAGs |
| Root flag on events | `isTreeRoot` | `isGraphRoot` | none | Avoidable mismatch, published (finding 6) |
| Allowed commands | full set | full set plus `DEFER_READY` | `HALT`/`NOOP` | Justified difference |
| `configure()` semantics | nested merge | shallow merge | field-wise, limits replace, predicates sticky | Mostly consistent; finding 8 |
| Async concurrency option | async only | async only | rejected | Justified, documented |
| Terminal `close()` | none | none | yes | Justified; walking owns source iterators |
| Observational queries | methods | methods plus free `inspectDag` | methods | Avoidable mismatch (finding 5) |
| Error classes typed by ID | n/a | cycle yes, stall no | n/a | Avoidable mismatch (finding 4) |
| ID generic default | n/a | `ID = unknown` | none | Justified, known 7 |
| Built-in adapter result shape | deprecated untagged | n/a | tagged | Avoidable mismatch (finding 3) |

## Recommendations, assessment, and scope

Prioritized, all compatible with the published 0.11.0 surface:

1. **Fragments return or carry issues** (finding 1).
   ```ts
   // before: issues are lost
   try { defineDagFragment(def, ports); } catch (e) { /* TypeError, no diagnostics */ }
   // after: same union as composeDag
   const f = defineDagFragment(def, ports);
   if (f.kind === 'invalid') report(f.issues);
   ```
2. **Narrowing overload on tree/DAG `getIterable`/`run`** (finding 2), so `getIterable({ emitPhases: [ON_READY] })` yields only `workCompleted` events at the type level.
3. **`runner.inspectDag()` method** on both DAG runners (finding 5).
4. **Tagged results from `TraversableObjectTree`** (finding 3).
5. **Generic `DagTraversalStallError<ID>`** and a closed `ExecutionInspection.kind` union (findings 4, 9).
6. **Walking configure: document sticky predicates or accept `null`** (finding 8); align the constructor/configure presence test in `DagTraversal` (finding 10).
7. **Docs:** state that `Traversal`/`TraversalRunner` are tree bases, add the eager-validation decision table, and reword the root-policy sentence (findings 7, 13, non-issue note).

**Overall assessment.** The surface reads as one library rather than three. Vocabulary is now stable across layers for the two milestone relations, result unions, identity, and execution state, and the typecheck suites back the inference claims I spot-checked. The remaining findings are edge inconsistencies a user meets only when crossing families or hitting an invalid fragment, and most are unreleased and types-only. The one design-level tension still present is the `ON_READY` event name, which is deferred on record and mitigated in every guide.

**Scope and limitations.** Read in full: README, AGENTS.md, `docs/index.md`, `docs/agent-workflows.md`, `docs/reference.md`, `docs/migration-uniform-api.md`, CHANGELOG, the clarity review, disposition, and design spec; all public index files; walking classes, options, source, event, visitor, summary, inspection, helpers, adapters, and option normalization; DAG traversal classes, both runners, instance configs, prepared/definition/fragment/revision/inspection/progress/coordination/filter/helper modules, stall and cycle errors, definition source and capture; collection sources; tree builders and helpers for DFS/BFS, DFS instance config, object tree and its config, rewrite helper; core visitor, execution, inspection, iterable-config, runner, graph types, resolved graph/tree view, vertex, ref, source-result normalization; twelve typecheck suites; eight examples. Spot-checked by grep: scheduler root acceptance, kernel stop reasons, tree runner iterables, fragment runtime tests, package exports. Not read: `WalkKernel`, `TraversalKernel`, drivers, scheduling internals beyond root acceptance, BFS class bodies, most runtime tests. Nothing was executed, and published-versus-unreleased classification relies on the changelog and the prior review's tag verification rather than on inspecting git tags.
