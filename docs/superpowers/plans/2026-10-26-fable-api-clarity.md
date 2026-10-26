# Fable API Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the valid Fable clarity findings and merge the verified feature branch into main.
**Architecture:** Keep existing kernels and phase timing. Refine unreleased public result/selector/omission contracts, reject removed dangerous inputs, and teach one canonical workflow path.
**Tech Stack:** TypeScript, Jest, CJS/ESM facades, Node and Bun packed consumers.
**Spec:** `docs/superpowers/specs/2026-10-26-fable-api-clarity-design.md`

## Global Constraints

- TypeScript 4.7.4 compatibility, Node >=22.12.0, and Bun 1.4.4 remain supported; package version stays 0.11.0 and changes remain Unreleased.
- Preserve arbitrary SameValueZero ID identity, exact thrown values, shared CJS/ESM constructors/sentinels/declarations, and published phase timing.
- No host business policy, retries, durable storage, catalog hydration semantics, or recursive limit merging.
- Run npm run check with 100% statements/branches/functions/lines; never weaken coverage.
- Work in the existing feat/general-graph-walking worktree. Preserve unrelated files. No publication.
- Change current source/tests/examples/guides; preserve historical reports/specs/plans verbatim except the new review disposition and this plan.

### Task 1: Common validation issues and canonical fatal settlement

**Files:** `src/traversals/dag-traversal/lib/{PreparedDag,prepareDagSource}.ts`, `src/traversals/dag-traversal/{prepareDag,prepareDagDefinition,coordinateDag}.ts`; `tests/{prepared-dag,dag-definition,dag-coordination}.*`; affected current examples/guides and `scripts/package-consumers/agent-api-foundations.{ts,mjs}`.
**Interfaces:** Produces `PrepareDagResult<Data, ID> = DagDefinitionResult<Data, ID>`; source invalidity has `issues: [{kind:'milestone', diagnostics}]`; coordinator has `failTraversal` only. No top-level diagnostics compatibility field.

- [ ] Write public regression/type assertions before production changes, covering sync/async unknown prerequisites and cycles through the shared invalid shape, alias absence, and exact caller failures.
```ts
const result = prepareDag(graphFrom([{ id: 'b', deps: ['missing'] }], {
  id: item => item.id, dependencies: item => item.deps,
}));
expect(result).toMatchObject({ kind: 'invalid', issues: [
  { kind: 'milestone', diagnostics: { unknownPrerequisiteIds: ['missing'] } },
] });
// The selector spelling above is migrated by Task 2.
expect('fail' in session).toBe(false);
```
- [ ] Run `npm test -- tests/prepared-dag.test.ts tests/dag-coordination.test.ts` and capture expected RED. Type checks should reject `.fail` and top-level invalid `.diagnostics` after implementation.
- [ ] Replace the preparation result declaration with the alias, wrap dependency diagnostics at sync/async source boundaries, and make prepareDagDefinition return prepareDagSource's result directly after its structural validation.
```ts
return { kind: 'invalid', issues: [{ kind: 'milestone', diagnostics }] };
```
- [ ] Remove fail from interface/object, keeping failTraversal unchanged. Update public consumers, tests and current documentation to the new shape/name; retain meaningful tests of fatal repeat/error semantics under failTraversal. Preserve source-thrown DagTraversalStallError and DagDiscoveryCycleError behavior.
- [ ] Run `npm run typecheck`, focused preparation/definition/revision/coordination suites, `npm run verify-examples` and `npm run verify-package`. Record commands/results, commit scoped changes, and write report. Later tasks run whole-suite coverage.

### Task 2: Clear collection dependency selectors

**Files:** `src/sources/{types,graphFrom,forestFrom,materialize}.ts` (a small shared validator file is allowed if cleaner), `tests/collection-sources.{test,typecheck}.ts`; source-adapter callsites in tests, examples, current guides, packed fixtures; AGENTS if current contracts need adjustment.
**Interfaces:** All four collection/forest adapters accept `dependsOn?(item)` and `dependsOnComplete?(item)` and return the same source fragment. Existing task data may still be named dependencies. No legacy selector aliases.

- [ ] Add public RED tests for actual W/C ordering using canonical selectors and early rejection of each retired selector key in sync/async graph/forest adapters, including inherited and present undefined keys before callback invocation.
```ts
const selectors = { id: (item: { id: string }) => item.id,
  dependsOn: () => ['a'], dependsOnComplete: () => ['group'] };
// Explicit raw JS misuse must fail instead of silently omitting dependencies.
expect(() => graphFrom([], { id: () => 'a', dependencies: undefined } as never))
  .toThrow(TypeError);
```
- [ ] Run collection tests/type checks to capture RED; add negative TypeScript fixtures for retired selectors without globally renaming diagnostic fields or arbitrary task data.
- [ ] Rename selector declarations and accesses, and share one early guard for retired keys.
```ts
for (const key of ['dependencies', 'completionDependencies']) {
  if (key in selectors) throw new TypeError('Use dependsOn and dependsOnComplete selectors');
}
```
- [ ] Migrate every current adapter callsite and current guide/snippet. Keep historical documents and diff/walking relation names unchanged. Explain why old names throw.
- [ ] Run `npm run typecheck`, collection/prepared/inspection/revision tests, `npm run verify-examples`, `npm run verify-package`. Commit and report RED/GREEN evidence.

### Task 3: Plain tree omissions with explicit graph semantics

**Files:** `src/core/TraversableTree.ts`, `src/core/drivers/normalizeSourceResult.ts`, affected tree/object/callback types, `tests/{uniform-source-results,tree-source-capabilities,object-resolution-hook,public-api}.*`, tree-source examples and packed consumers, current docs.
**Interfaces:** `TreeOmittedVertexResult` is `{kind:'omitted'}` with graph metadata forbidden. Graph `OmittedVertexResult` still requires `satisfiesDependencies: true`. Normalization accepts both legitimate result families based on its tree-source discriminator.

- [ ] Add public RED tests for root/child omission on sync/async DFS/BFS and DAG tree sources, object hooks, metadata rejection and exact callback errors. Add type tests distinguishing plain tree omission from required graph acknowledgement.
```ts
const omitted = { kind: 'omitted' as const };
// Tree callbacks may return omitted; graph callbacks must explicitly acknowledge W/C.
// Tree callbacks must reject satisfiesDependencies, including present undefined.
```
- [ ] Run focused suites to capture expected RED.
- [ ] Remove the required tree-only field and forbid it as graph metadata. Extend normalizer input union to tree results; apply acknowledgement validation only for graph/prerequisite normalization. Do not silently accept unsupported false/undefined graph acknowledgements. Preserve published untagged null results.
```ts
if (treeSourceName === undefined && result.satisfiesDependencies !== true) {
  throw new TypeError('Omitted source result requires satisfiesDependencies: true');
}
```
- [ ] Update current tree-source callers only; retain graph acknowledgements. Document tree/DAG-source distinction including DAG traversal over a tree adapter.
- [ ] Run typecheck and all affected source/driver/tree/DAG/object suites, examples and packed verification. Commit and report RED/GREEN evidence.

### Task 4: Canonical learning path and full integration

**Files:** README.md, CHANGELOG.md, docs/{reference,agent-workflows,migration-uniform-api,index}.md as needed, AGENTS.md, examples/{agent-api-foundations,dag-inspection,graph-walk-references}-example.ts as needed, new review disposition and verification record, package consumer fixtures if needed.
**Interfaces:** Uses Tasks 1-3 without introducing runtime policies. Clarifies existing published contracts.

- [ ] Add point-of-use guidance with executable examples: dispatch from session.advance frontier; workCompleted events are observations, not dispatch requests; ON_READY visitor and event timing are distinct.
```ts
const boundary = session.advance();
if (boundary.kind === 'awaitingSettlement') {
  for (const ticket of boundary.frontier) hostDispatch(ticket);
}
// In runnable examples use local assertions instead of undefined hostDispatch.
```
- [ ] Label PreparedDag.vertices a convenience projection and definition a faithful representation; explain progress/dependency/execution observations, enum phase selection, slots with known undefined IDs, edge target depth and catalog/lazy link mapping. Document hasSingleSink with structural relation, empty and single-leaf semantics. Avoid redundant explanatory sprawl; preserve existing anchors.
- [ ] Record migrations and disposition of every Fable observation, distinguishing implemented changes, justified existing differences and deferred major-version work. No broad generics/phase renaming or added aliases.
- [ ] Run `npm run check` and six packed lanes Node22.12.0/Node24.20.0/Bun1.4.4 × TS4.7.4/4.9.5. Also run Bun packaging/benchmark correctness tests. Resolve genuine failures using evidence, retaining full coverage. Add a durable concise verification record with commands/counts/log paths. Commit and report.

## Controller integration after all task gates

- [ ] Independent whole-branch review from main merge-base through final HEAD; resolve findings.
- [ ] Fetch origin and verify main relationship; preserve unrelated main-checkout changes.
- [ ] Push feature branch, create/update PR with final scope, and wait for required remote CI on exact head.
- [ ] Merge once checks pass, verify remote main contains the reviewed head (or squash equivalent with verified tree), synchronize local main safely, and record outcome.
- [ ] Audit accepted findings, tests, review, CI and merge evidence before completing the active goal.
