# Working on configurable-tree-traversal

## Read the right entry point

- **Using CTT in an agent coordinator:** start at [README](README.md), then [agent workflows](docs/agent-workflows.md).
- **Finding a public contract:** [API reference](docs/reference.md). [Documentation map](docs/index.md) links runnable examples.
- **Changing this repository:** use the source/test map below and [testing guide](docs/testing.md).

Current published API: **0.11.0**; this checkout implements the unreleased uniform, composable, and graph-walking APIs documented in the [migration guide](docs/migration-uniform-api.md). Keep published release facts distinct from checkout behavior. `docs/research/` and `docs/superpowers/` contain historical research, plans, and downstream proposals. They are not a substitute for current documentation or evidence that a proposed feature exists. Reconcile discrepancies against source and behavioral tests; update the current guide when changing behavior.

## Scope and boundaries

CTT owns generic tree/graph discovery, work/completion dependencies, callback scheduling, traversal lifecycle, diagnostics, and in-memory progress. Keep task types, agent dispatch, business priority/outcomes, attempts/retries, claims, artifact policy, and durable storage in the host. `$data` is opaque caller data; `$childHints` contains opaque discovery hints. `$d`/`$c` remain deprecated input/access aliases; Vertex own fields and serialization use canonical names. There is no public `planDag`, storage-provider port, durable runner checkpoint, or built-in LLM integration.

Dependency edges and structural child edges are different. Under default `visitorReturn`, normal `ON_READY` completion satisfies W; committed `ON_COMPLETE` satisfies C. Use `workCompletion: 'externalSettlement'` for host-controlled work, including zero/filtered callbacks; prepare a fresh runner for an eager validated preview, then run and dispatch from `summary().deferredFrontier` records with atomic generation guards. Preparation freezes topology; run adopts discovery without replay. DAG event kinds `workCompleted`/`subgraphCompleted` are committed W/C; old order/filter/timing remain. Deferred `ON_READY` events emit on settlement; seeds synthesize no work event. Explicit sole `DEFER_READY` ends a chain early; HALT pauses it. `getStopReason()` distinguishes pause from awaiting settlement. Graph sources default to `rootDependencies: 'honor'` and `implicitParentDependency: false`; express execution dependencies explicitly. Tree order is preserved. Source callbacks use tagged `found`/`omitted` results; only prerequisite lookup accepts `missing`. `emitPhases` and `visitorPhases` select events/callbacks independently and patch field-wise. Flat visitors sort by priority before batching; explicit ordered groups own their batching policy. `commandCommitMode` is independent of async concurrency. Tree sources forbid graph metadata. Prefer `resolveVertexHook`, typed object patches, `getResolvedTreeView()`, `getRefId()` and graph `getVertexId`/`getVertexRefById`; safe tree queries are detached and shallow. Use family-safe execution capabilities and cooperative `requestPause`; requests drain admitted callbacks without cancellation before acknowledgement. Rewrite output defaults to unknown; `rewriteObjectAs` asserts output and `getOutput()` requires FINISHED. The rewrite helper owns its source. Visitor registration queries return detached records with shared callbacks/group metadata. Graph ID generics trail T/R (visitor ID follows ORDER); typed live results require own IDs, public views hide synthetic holders while raw containers expose ID | symbol. Diagnostic edges are original milestone constraints, from waits for to; cycle arrays are SCC membership. Settlement generations are local symbols; reconstruction uses host-accepted `completedWork` facts. `inspectDag` captures observational milestone snapshots. `PreparedDag.definition` preserves ordered slots/omissions; fragments map IDs explicitly and compose structural links separately from W/C wires. `reviseDag` validates an ordered batch against a private candidate and returns a fresh prepared DAG plus a shallow diff; old sessions, tickets and admitted callbacks remain local and no completion facts migrate.

Walking uses `GraphWalk`/`AsyncGraphWalk` sources with explicit target wrappers; it does not consume arbitrary tree/DAG sources directly. Revisit, callbacks and emission are independent. First admitted resolution (including omission) wins; rejected links do not seed cache. Default once preserves parallel/back edges; bounded route modes report summary outcomes. Walking selectors narrow at delivery, including buffered records; old tree/DAG emission rules remain. Callbacks are serial; own concurrency options reject. Consumer iterator return pauses; terminal runner close disposes open source iterators in reverse acquisition order. Closing FAILED rethrows the exact retained error without repeated cleanup; overlapping async closes share a promise. Configure limits records replace prior records and merged validation is atomic. `GraphWalkDagRelation` labels are adapter-owned/detached; caller edge data retains identity. General wrappers explicitly use `ExecutionInspection`, preserving family phases and old `CoreInspection` defaults.

## Source and regression map

| Change area | Start in | Relevant tests |
| --- | --- | --- |
| General graph walking | `src/traversals/graph-walk/`, `lib/WalkKernel.ts`, sync/async sessions and resources | `tests/graph-walk-*.test.ts`, walking type assertions, packed `graph-walk` consumers |
| Public exports and graph types | `src/index.ts`, `src/core/TraversableGraph.ts`, `src/core/TraversableTree.ts` | `tests/public-api.typecheck.ts`, `tests/graph-api.typecheck.ts`, `scripts/verify-package.cjs` |
| DAG dependency queries and explanations | `src/traversals/dag-traversal/inspectDag.ts`, `src/core/TraversalKernel.ts` | `tests/dag-inspection.test.ts`, `tests/dag-inspection.typecheck.ts` |
| DAG definitions and fragments | `src/traversals/dag-traversal/defineDag.ts`, `prepareDagDefinition.ts`, `dagFragments.ts`, `src/traversals/dag-traversal/lib/definitionSource.ts` | `tests/dag-definition.test.ts`, `tests/dag-definition-validation.test.ts`, `tests/dag-fragments.test.ts`, definition/fragment type assertions |
| DAG revisions and declaration diffs | `src/traversals/dag-traversal/reviseDag.ts`, `diffDagDefinitions.ts`, `lib/DagRevision.ts` | `tests/dag-revisions.test.ts`, `tests/dag-revisions.typecheck.ts`, packed `dag-revisions` consumers |
| DAG readiness, progress and milestones | `src/core/scheduling/GraphScheduling.ts`, `src/core/scheduling/dependencyMilestones.ts` | `tests/dag-progress-seed.test.ts`, `tests/dag-completion-dependencies.test.ts`, `tests/graph-completion-dependencies.test.ts` |
| Prerequisite lookup and lifecycle | `src/core/scheduling/PrerequisiteResolution.ts`, `src/core/TraversalKernel.ts` | `tests/dag-prerequisite-resolution.test.ts`, `tests/async-dag-prerequisite-lifecycle.test.ts`, `tests/prerequisite-kernel.test.ts` |
| Graph identity and structure | `src/core/graph/`, `src/core/ResolvedGraph.ts` | `tests/graph-identity.test.ts`, `tests/graph-container.test.ts`, `tests/resolved-graph.test.ts` |
| Async callback/iterator behavior | `src/core/drivers/`, `src/core/TraversalKernel.ts` | `tests/async-driver.test.ts`, `tests/async-runner-session.test.ts`, `tests/async-dag-lifecycle.test.ts` |
| Tree traversal and objects | `src/traversals/`, `src/traversable-tree-implementations/`, `src/tools/` | `tests/depth-first.test.ts`, `tests/breadth-first.test.ts`, `tests/object.test.ts` |
| CJS/ESM packaging | `package.json`, `scripts/build-esm.cjs`, `scripts/verify-package.cjs` | `scripts/build-esm.test.cjs`, packed consumers |

## Commands and validation

```sh
npm ci
npm run check
npm test -- tests/dag-prerequisite-resolution.test.ts
npm run tsfile -- examples/agent-orchestration-example.ts
npm run verify-examples
npm run verify-package
```

`npm run check` covers typechecking, lint, all source tests with 100% coverage, examples, build, packed runtime/type consumers, and benchmark/generator checks. For behavior changes, reproduce the issue with a focused public regression, then run the full check. For documentation changes, execute new/changed examples, verify relative links/anchors and packaged guides, and use the standard check before integration. Do not weaken coverage to pass.

The async runtime shares a state-machine core with sync runners; test affected sync/async and tree/graph families when changing shared behavior; include walking when changing common capabilities/selectors/registration. Preserve arbitrary ID identity and exact error values. ESM and CJS must share constructors, sentinels, namespaces, and declaration identity; verify packed consumers, not just source imports.

## Documentation upkeep

Keep README concise and autonomous-agent use cases first. Put integration decisions in `docs/agent-workflows.md`, detailed contracts in `docs/reference.md`, and navigation in `docs/index.md`. Keep runnable examples under `examples/`; the example verifier discovers every top-level `.ts` file. Update package `files` entries when adding a consumer guide so npm readers can follow relative links. Link repository-only examples/history through GitHub from packaged docs. Preserve existing public section anchors when moving content.

Do not infer publication authorization from test/build commands. Release and external-write actions follow the user's current instructions. Preserve unrelated local changes and never include credentials in examples or logs.
