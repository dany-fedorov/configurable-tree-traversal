# Idiomatic API Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all fifteen findings F01–F15 from the approved idiomatic client API review, including real type-contract repairs and a canonical breaking API migration.

**Architecture:** Keep the shared scheduling algorithms and family-specific source contracts. Correct public types at the consumer boundary, eliminate accepted compatibility routes, and project diagnostic terminology without leaking private engine effects. Implement six sequential, independently reviewed tasks; each migrates its current examples/fixtures/guides so no intermediate task leaves an intentionally broken package.

**Tech Stack:** TypeScript, Jest, Node CJS/native ESM, packed consumer verification.

**Spec:** [Approved fifteen-finding review](../reviews/2026-10-27-idiomatic-api-review.md). The user's subsequent instruction “fix all findings” approves the recommended API shapes. The original review/audit is immutable historical evidence; source and behavioral tests settle implementation facts.

## Global Constraints

- Work only in `/home/df/.codex/worktrees/04b4/configurable-tree-traversal` on `feat/api-clarity-migration`; preserve the original checkout's eighteen drafts and HEAD.
- Fix every F01–F15 requirement. Breaking changes and deprecated API removal are authorized. No compatibility aliases for retired public APIs; rejection-only `never` constraints are allowed.
- Preserve arbitrary SameValueZero ID identity, own undefined IDs, exact thrown values, independent visitor/event selection, W/C versus structural relations, cooperative pause/draining, and meaningful sync/async differences.
- Preserve scheduling/deletion/pruning algorithms while naming their actual effects. Host dispatch, task outcomes, claims, retries and durable persistence remain outside CTT.
- Keep Node >=22.12.0, Bun 1.4.4 and TypeScript 4.7.4/4.9.5 compatibility; no dependency/version/publication changes are needed.
- Keep 100% source statements/branches/functions/lines coverage. Never weaken checks, suppress TypeScript errors broadly, use skipLibCheck for packed consumers, or replace meaningful assertions with tautologies.
- Keep nine intentional runtime entrypoints plus package metadata; preserve CJS/ESM constructor/sentinel/namespace/declaration identity and blocked private engine imports.
- Preserve immutable historical files under docs/superpowers/reviews (including both naming audits), docs/research and prior specs/plans. Current README/guides/examples/AGENTS must describe the final API; do not reintroduce release-status caveats removed by the user.
- For each task: reproduce the relevant public regression/type gap before production changes; run focused tests while iterating, then one final full check on the task state before committing. Re-run covering checks after fixes. Final task also runs the actual packed TypeScript 4.7.4 lane.
- No push, merge or publication in this goal. Keep branch/worktree local. Workers never spawn subagents; controller owns independent task and whole-branch reviews.

## Task 1: Remove accepted compatibility API routes (F09)

**Files:** source protocols and normalization in `src/core/TraversableTree.ts`, `Vertex.ts`, `CTTRef.ts`, `ResolvedGraph.ts`, `TraversalVisitor.ts`, `TraversalRunnerIterableConfig.ts`, `drivers/normalizeSourceResult.ts`, `visitors/`; six `traverse*` helpers; DAG progress/visitor/settlement files; object source/options and rewrite compatibility decoding; barrels. Tests start at `uniform-source-results`, `vertex-content-api`, `visitor-definitions`, `visitor-query-ownership`, `traversal-helper-options`, `execution-selection`, `dag-deferred-settlement`, `dag-coordination`, plus packed consumers. Migrate affected canonical fixtures/examples/current guides; do not rewrite historical audit/spec artifacts.

**Consumes:** current tagged protocols, canonical `$data/$childHints`, `commandCommitMode`, independent selectors, generation-guarded settlement.
**Produces:** canonical-only accepted client input, tagged built-in source outputs, no obsolete exports/overloads/getters. Later tasks consume the same canonical command names until Task 4.

- [ ] Add `tests/idiomatic-compatibility.test.ts` and `.typecheck.ts`. Public negatives cover legacy `$d/$c`, ref `getId`, graph `getIdOf/getVertexById`, untagged found/omitted results, undefined prerequisite missing, DEFER_READY, old hint command, boolean settlement outcomes, positional helper overloads, resolutionStyle, old event/visitor selectors, and object makeVertexHook/returnMe. Type negatives use targeted `@ts-expect-error`; runtime JS-shaped inputs must fail clearly rather than be interpreted as canonical options. Record RED output.
- [ ] Remove legacy content/getter/clone branches, forwarding ID methods, sentinel/result arms, old command enum member, six positional overloads and `*VisitorsSimple` types, resolution-style enum/metadata/defaults, selector/hook decoding acceptance. Reject retired policy keys before invoking sources/callbacks or changing configuration. Keep tagged `found`/`omitted`/prerequisite-only `missing`; `useDefault` remains the hook-specific canonical result.
- [ ] Make `ObjectTreeSource.resolveRoot/resolveChild` and `ResolvedTreeStore` source adapters return canonical tagged resolutions directly. Internal normalized scheduling records may stay private untagged records; they must not leak through public signatures.
- [ ] Remove `addedIndex` from caller policy definitions; keep it as assigned query metadata. Preserve `setVisitorsFor(phase, listVisitorsFor(phase))` round trips, group identity, callback identity and detached wrappers. Descriptive record metadata is not caller index policy; every registration assigns fresh indexes and never reads a supplied addedIndex as policy.
- [ ] Convert all affected test/example/current-guide source fixtures to canonical tagged results and canonical policies. Replace obsolete compatibility tests with meaningful rejection tests; retain substantive scheduling, identity, error, ordering, mutation and lifecycle assertions. Update internal benchmark/package fixtures where necessary.
- [ ] Run focused tests, `npm run typecheck`, `npm run lint`, then `npm run check`; record actual exits and coverage. Ensure legacy callbacks/aliases are absent from supported runtime/type imports and retired JS policy requests reject.
- [ ] Commit only this task and report exact changes, red/green evidence, full validation logs and any concrete remaining cross-task dependencies.

```ts
// Required canonical examples; runtime negatives should use JS-shaped casts only at the boundary.
const found = { kind: 'found', vertex: { vertexContent: { $data: 1, $childHints: [] } } } as const;
const omitted = { kind: 'omitted' } as const;
const missing = { kind: 'missing' } as const;
const outcome = { kind: 'workCompleted' } as const;
```

## Task 2: Repair object contracts and name callback roles (F01, F02, F13, F14)

**Files:** `src/tools/rewrite-object/rewriteObject.ts`, object mutation factory/options/types/default root mapper/static source exposure, `src/core/ResolvedTreeTypeParameters.ts`, barrels and consuming signatures. Start tests at `rewrite-output.typecheck.ts`, `rewrite-result-contract.test.ts`, `mutation-builder.typecheck.ts`, object tests and packed `rewrite-output` consumers. Use new `tests/idiomatic-object-contracts.test.ts` and `.typecheck.ts`.

**Consumes:** Task 1 canonical tagged sources, settlement/commands and removed legacy hook inputs.
**Produces:** truthful input/output-aware object callback context, key/value-only patches, canonical object type names/static factory. Task 4 later scopes deletion commands without altering these object semantics.

- [ ] Translate the review audit's strict probe into public regressions before implementation. A numeric input rewritten to a string by a pre-order visitor must make `const n: number = prop.value` an expected compile error in the rewrite callback; inspect context vertex/ref/live tree, previous ref and key paths too. Original retained view remains input-typed. A `{note:'new'}` extension patch must fail typing and throw at the JS boundary rather than silently preserve old metadata. Record RED.
- [ ] Rename `RewriteFn` → `ObjectRewriteCallback`, `RewriteFnOptions` → `ObjectRewriteContext`, `RewriteFnPropInput` → `ObjectRewriteInput`, `TraversableObjectTTP` → `ObjectTreeVertexTypes`, `ResolvedTreeTypeParameters` → `ResolvedTreeVertexTypes`. Remove old public names, retaining private physical filenames if useful.
- [ ] Carry `InK/InV/OutK/OutV` through current property and live context fields. Current key/value domains are input-or-output; assembled child/composite values use output types; originalTreeView uses input only. Eliminate the unsound input-only context assertion; do not hide the defect behind `any` or remove configurable traversal visitors. Preserve unknown output default and assertion-only `rewriteObjectAs`.
- [ ] Replace `ObjectMutationPatch` with `ObjectPropertyPatch<T> = Partial<Pick<T['VertexData'], 'key' | 'value'>>`. Validate unknown own string/symbol patch keys before returning a command. Keep undefined/falsy/key-only/symbol-value semantics, custom classifiers/assemblers and reference-keyed assembledMap. Full arbitrary payload replacement remains `REWRITE_VERTEX_DATA`.
- [ ] Rename static `ObjectTreeSource.getRootPropertyFromInputObjectDefault` → `createRootPropertyMapper(rootKey?)`; keep direct child getter and mapper option roles. Preserve default root key behavior.
- [ ] Improve misleading public callback/constructor parameter spelling in touched signatures (`context`, `options`, `InputTypes`/`OutputTypes`, `Phase`); preserve generic ordering/inference. F14's optional spelling suggestions are not a demand to rewrite unrelated private implementation variables.
- [ ] Run the new focused regressions and related object/type tests, typecheck/lint/full check. Confirm stale outputAtReturn, FINISHED-only getOutput, successful cache identity and exact conversion errors remain covered.
- [ ] Commit and write the complete report with concrete output/type evidence.

```ts
// Required public negative after the repair:
rewriteObject<number, PropertyKey, number, unknown, PropertyKey, string>(1, {
  rewrite(prop) {
    // @ts-expect-error Current values can already have been rewritten to output strings.
    const originalOnly: number = prop.value;
    void originalOnly;
    return undefined;
  },
});
```

## Task 3: Make generic execution genuinely generic and tree callbacks explicit (F05, F06)

**Files:** `src/core/TraversalExecution.ts`, `CoreInspection.ts`, `AsyncCoreExecution.ts`, `Traversal.ts`, `TraversalRunner.ts`, tree source abstract class; tree visitors and generic mutation binder scaffolding; eight concrete runner interfaces/builders and barrels. Tests: `execution-capabilities`, `visitor-reuse`, `public-api`, `options-declaration-compat`, `async-tree-api`, and packed execution capabilities/supported exports. New `tests/idiomatic-execution.typecheck.ts`.

**Consumes:** canonical Task 1 input/metadata and Task 2 renamed object types.
**Produces:** generic capability defaults, explicit tree callback/binder names, no redundant public runtime abstract bases.

- [ ] Add failing public type assertions that both a tree/DAG runner and a graph walker satisfy default `TraversalExecutionState`; a default `SyncTraversalExecution<DagVisitorPhase, DagEvent<...>>` accepts committed emitted event names and rejects callback readiness names in emitEvents. Preserve family variance negatives. Assert removed names have no public imports/runtime values.
- [ ] Default Inspection to `ExecutionInspection`; default EmittedKind to `EmissionKind<Phase>` consistently in sync/async capabilities. Rename detailed `CoreInspection` to `TreeDagExecutionInspection`; concrete tree/DAG runners explicitly select it, walkers select GraphWalkInspection.
- [ ] Remove public `AsyncCoreExecution`, `TreeTraversal`, `TreeTraversalRunner`, `TreeTraversalIterable`, `AbstractTreeSource` and their empty runtime classes. Concrete builders implement structural contracts directly; keep `TreeSource`, execution interfaces and `TreeTraversalEvent`. Remove stale super calls/constructor identities and update packed negative exports.
- [ ] Rename tree-only `TraversalVisitor` → `TreeVisitor`, `AsyncTraversalVisitor` → `AsyncTreeVisitor`, `TraversalVisitorRecord` → `TreeVisitorRecord`, `MutationCommandBinder` → `TreeMutationCommandBinder`, `MutationCommandBinderFactory` → `TreeMutationCommandBinderFactory`. Shared command/result algebra, VisitorDefinition/registration contracts and MutationCommandBuilder remain genuinely generic. Update all public/consuming signatures and phase/parameter spelling without widening phase contracts.
- [ ] Run focused runtime/type/packed capability checks, typecheck/lint/full check; verify wrappers retain sync/async return types, requestPause draining and iteration laziness.
- [ ] Commit and report.

## Task 4: Scope deletion, dependency policy, entry, pruning and chain commands (F03, F04, F11, F12, F15)

**Files:** shared command types and `TraversalKernel`, scheduling adapters, `ResolvedTree`, DAG scheduling/preparation/definitions/revision/fragment/walking adapters, source materialization internals that construct multi-entry definitions, object mutation/rewrite command generation. Tests: `uniform-commands`, `dag-revisions`, `dag-definition`, `dag-fragments`, source/scheduling/deletion tests, traversal-combinations and packed relevant consumers. New `tests/idiomatic-scoped-operations.test.ts` and `.typecheck.ts`.

**Consumes:** canonical-only commands, Task 2 object patch/binder types and Task 3 TreeVisitor/generic execution names.
**Produces:** scoped deletion commands/policies and renamed declaration vocabulary. Scheduling algorithms stay intact.

- [ ] Add RED public runtime/type regressions: wrong-family delete command rejected; tree deletion removes subtree; DAG deletion cascades W/C dependents and orphaned descendants but preserves shared/detached anchors; revision declaration removal requires explicit reference repair; ignored root W still honors root C; omitted-W fallback is overridden by explicit []/lists; roots entries permit shared children/repeated slots; pruning skips only pending local expansion; state is local to one phase chain and commit mode controls visibility.
- [ ] Rename store `delete` → `deleteSubtree`; revision discriminator `removeVertex` → `removeVertexDeclaration`; runtime DELETE_VERTEX → `DELETE_TREE_SUBTREE` and `DELETE_DAG_VERTEX_CASCADE`. Tree callbacks permit only tree deletion, DAG callbacks permit only DAG deletion (including a DAG runner consuming a TreeSource); choose by runner family, not sourceMode. Reject cross-family commands in JS at the public execution boundary. Route both valid commands into the existing family deletion algorithms.
- [ ] Keep generic MutationCommand/MutationCommandBuilder/MutationCommands configurable with a trailing deletion-command generic constrained to the two scoped command names, defaulting to their union. Tree binders/object helpers explicitly select DELETE_TREE_SUBTREE. Preserve the existing first generic arguments; no unsafe union returned from object helpers to tree visitors. Shared result algebra may gain an explicit trailing family parameter so tree/DAG callbacks remain phase- and family-safe; internal kernel command union can cover both. Do not introduce deletion algorithms/policies beyond the two existing behaviors.
- [ ] Rename `rootDependencies` → `rootWorkDependencies`; replace `implicitParentDependency` with `omittedWorkDependencies: 'none' | 'discoveryParentWork'`, default none for graph discovery. Preserve tree fixed ordering, explicit-list override, synthetic-root suppression, existing workCompletion/discovery defaults and root C honoring. Update prepared-owned forbidden fields and reject retired JS keys rather than ignore them.
- [ ] Rename definition entry `forest` → `roots` across definitions, validation, prepared round trips, fragments/composition, revisions/diffs and definition-to-walking adapters; preserve ordered slots/omissions/catalog/disconnected records, not just IDs.
- [ ] Rename DISABLE_SUBTREE_TRAVERSAL → SKIP_REMAINING_CHILDREN. Rename SET_VERTEX_VISITORS_CHAIN_STATE → SET_VISITOR_CHAIN_STATE with `{state}`. Keep callback visitorChainState. Preserve eager-topology prohibitions, pending-only/local structural pruning, already-admitted callbacks and per-visit state reset. Old command literals/argument policy names no longer accepted.
- [ ] Update current guides/examples/fixtures and packed declarations for these exact names. Run focused sync/async tree/DAG behavior and walking-definition adapter tests, typecheck/lint/full check.
- [ ] Commit and report exact family/type gates and invariants proved.

```ts
const command = { commandName: TraversalVisitorCommandName.SET_VISITOR_CHAIN_STATE,
  commandArguments: { state: { seen: true } } };
const edit = { kind: 'removeVertexDeclaration', vertexId: opaqueId } as const;
const entry = { kind: 'roots', slots: [{ kind: 'vertex', vertexId: opaqueId }] } as const;
```

## Task 5: Align public diagnostics with phase, operation and visit-stage roles (F07, F08)

**Files:** `src/core/CoreInspection.ts`, `TraversalKernel.ts` inspection projection, `graph/types.ts`, `ResolvedGraph.ts`, graph stores/snapshots/tree bridge/scheduling and explicit runner inspection generics. Tests: `core-inspection`, graph views/container, async inspection lifecycle, `dag-summary`, graph-walk inspection, packed inspection/identity fixtures. New `tests/idiomatic-diagnostics.test.ts` and `.typecheck.ts`.

**Consumes:** TreeDagExecutionInspection and canonical commands/policies from earlier tasks.
**Produces:** consistent passive diagnostic payloads with unchanged scheduling milestones/IDs/timing.

- [ ] Add failing snapshot/type assertions comparing tree/DAG inspection vocabulary to walking: readyVisits[].phase; chains[].phase plus state, visitorIndex, executionOptions; pendingRequests[].operation matches public callbacks. Assert pause/awaiting settlement observations retain active/pending counts and exact owner identities, and inspection does no source IO.
- [ ] Project internal effect keys at the observation boundary to `resolveRoot`, `resolveChild`, `resolvePrerequisite`, `sortChildHints`, `getVertexIdFromHint`, `visit`. Remove engine CallbackValues keys from the public signature dependency; do not rename engine effect protocols just to change public labels. Rename private VisitOrder support vocabulary if it remains public signature support. Keep frame.stage, owner tokens and wait facts as intentional diagnostics.
- [ ] Replace public ResolvedVertexStatus → ResolvedVisitStage; graph vertex status → visitStage; getStatusOf → getVisitStageOf. Map old stages in order to DISCOVERED, INITIAL_VISIT_ELIGIBLE, INITIAL_VISIT_STARTED, INITIAL_VISIT_COMMITTED, COMPLETION_VISIT_ELIGIBLE, COMPLETE. Preserve queue/commit timing; deferred W can remain INITIAL_VISIT_STARTED without an active callback. Do not change DagWorkState or W/C progress projections.
- [ ] Use the same new shape in all current/original graph view projections and detached wrappers. Keep generic runner lifecycle `getStatus` and its status enum distinct. Verify no old diagnostic aliases remain in public signatures or runtime view methods.
- [ ] Run affected sync/async/tree/DAG inspection/view tests, walking controls as the shared comparison, typecheck/lint/full check; preserve terminal/error observation and no-discovery guarantees.
- [ ] Commit and report.

## Task 6: Name DAG materialized inputs and close the complete package/documentation migration (F10; all F01–F15)

**Files:** sources/types/materializers/barrels, current README/AGENTS/guides/docs map, examples, packed fixtures/verifier, `scripts/api-clarity-census.cjs`. Add `docs/migration-idiomatic-api.md` and include it in package files/navigation. Add a current fifteen-row implementation audit under reviews, preserving the immutable original review/bundle. Tests: collection sources, graph-walk sources/types, public API negatives; final full gate and actual minimum compiler packed lane.

**Consumes:** complete preceding canonical contracts.
**Produces:** MaterializedDagInput/functions, packaged migration guide and complete closure evidence for all fifteen findings.

- [ ] Add failing public type/runtime namespace assertions for MaterializedDagInput, materializeDagInputFromRecords/materializeDagInputFromRoots and Async counterparts; old source-named DAG envelope factories/types absent. Walking factories still return actual GraphWalkSource and retain their names. Test copied membership/edges, shared payload/ID identity, disconnected records, async-to-sync result and synthetic-root preservation.
- [ ] Rename only DAG envelope APIs as specified, update all consumers/current guides, and retain the `traversableGraph` plus `syntheticRoot:true` result shape. Standalone discovery source protocols remain DagDiscoverySource/AsyncDagDiscoverySource.
- [ ] Write a consumer migration guide covering every removed/renamed symbol/field/literal/overload from all fifteen findings, the two corrected object contracts, typed family deletion examples, output/query lifetime, selector/command policies, source/input distinction, and source-required options. Link it in README/docs map and package files. Keep useful existing section anchors and preserve prior caveat removals; no public stale compatibility claims. Run all changed runnable examples/snippets.
- [ ] Update the declaration census for final canonical names while preserving full signature/member traversal and private-engine/constructor checks. Enumerate the final supported surface, no unexpected deprecated declarations/bindings, and no retained old command/getter/static/type aliases. Rejection-only constraints and historical audit files may contain retired spellings; internal filenames are not public API. Add real packed runtime/type negatives for the removed surface under node/node16 .ts/.cts/.mts; preserve all nine public routes and 26 denied private routes.
- [ ] Produce an implementation audit with one row per F01–F15, source/type/runtime/packed evidence and any narrowly optional spelling disposition. Resolve every explicit requirement against current source/tests, not grep-only absence or optimistic manifests. Include docs anchors/links and guide packaging evidence.
- [ ] Run uninterrupted `npm run check`, fresh census, and `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc node scripts/verify-package.cjs` (verify actual compiler version first; an equivalent isolated 4.7.4 compiler path is acceptable). Inspect complete exits, all source coverage, all examples/snippets, packed runtime/declaration identity and forbidden imports. Do not bump TypeScript compatibility if both lanes pass.
- [ ] Commit and report with exact validation evidence. Controller then commissions one Astra-high whole-range review against all fifteen findings and performs independent completion/preservation audit.

## Completion gates

Six task spec/quality approvals; final whole-range Astra-high review and any scoped correction review; all fifteen requirement rows verified; final full check/100% coverage/packed 4.7.4 and4.9.5 proof; current guides and package links valid; original review, original checkout and drafts preserved. No required fix is complete merely because a new name exists.
