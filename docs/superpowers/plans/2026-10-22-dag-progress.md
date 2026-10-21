# DAG progress and reconciliation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement approved S2 on the existing sync/async DAG runners, push and merge after verification.
**Architecture:** Keep one hint adapter and GraphScheduling dependency model. Add copied completed-work facts, eager discovery/validation, explicit deferred work with runner-local settlement tokens, and callback-free summaries. Host persistence remains outside the kernel.
**Tech Stack:** TypeScript 4.7+, Jest28, existing CJS exports and Node22/24 CI.
**Spec:** `docs/superpowers/specs/2026-10-22-dag-progress-design.md`.

## Global Constraints

- Preserve all six existing traversal families, tree-source behavior, historical imports, arbitrary SameValueZero vertex IDs, and default FIFO event order.
- Keep default failure behavior: the first live thrown value fails the runner and is rethrown exactly, including undefined and null.
- No database, wall clock, process supervision, WBS API, or agent SDK in the graph kernel.
- Retain 100% statement, branch, function, and line coverage; verify examples and packed CJS/ESM/TypeScript consumers.
- One public hints API and shared dependency semantics; no planDag or second public graph model.
- Work success, subtree completion, dependency readiness, host admission and physical callback settlement are distinct states.
- summary() does not invoke user callbacks or mutate state; detached collections retain ID identity.
- User authorized push and merge. Do not stop for redundant implementation/merge approval; never bypass failed required checks.

### Task 1: Completed-work seeds in both DAG runners

**Files:** Modify sync/async DagTraversalInstanceConfig and runners, core/kernelTypes.ts, core/TraversalKernel.ts, core/scheduling/GraphScheduling.ts and types.ts; create tests/dag-progress-seed.test.ts. Add a small internal progress helper only if it reduces duplicated seed handling. Update README for the delivered option.

**Interfaces:** Both graph-source configuration inputs accept `completedWork?: ReadonlySet<VertexId>`. Copy on runner creation. KernelOptions accepts optional completedWork; GraphScheduling consumes it and supplies copied unused IDs and a queue of newly seeded vertices needing expansion. Concrete internal names are `getUnusedCompletedWorkIds(): VertexId[]` and `takeSeededExpansion(): Ref<T | R> | null`. Seeded acceptance commits initial work without initial visitor/event and still expands normally. Initial success must not become COMPLETE until descendants complete. Graph vertex metadata retains declared dependencies for later full validation.

- [ ] Add red behavioral fixtures in both runners: seed root skips initial work/event but resolves pending child; diamond with completed A/B admits C once and D afterward; copied seed is unaffected by caller mutation; object/undefined/null/NaN IDs preserve identity; omitted seeded ID is recognized; unknown seed rejects at completed discovery; tree sources and injected continuation with seeds reject before callbacks. Minimal expected behavior:
```ts
const traversal = new DagTraversal({ traversableGraph: graphAdapter(graph), completedWork: new Set(['root']) });
const seen: string[] = [];
traversal.addVisitorFor(DagTraversalOrder.ON_READY, vertex => { seen.push(vertex.getData()); });
traversal.makeRunner().run();
expect(seen).toEqual(['child']);
```
- [ ] Run `npm test -- tests/dag-progress-seed.test.ts`, observe real RED.
- [ ] Implement copied input, graph-only/injected-state validation, seed acceptance and expansion queue. Preserve normal scheduling when option absent. Do not use restored ref-based seeds as completed-work input. Unknown seed reporting may use TypeError plus the scheduler's copied unused IDs; do not stringify hostile IDs. Required shape:
```ts
type CompletedWorkOptions = { completedWork?: ReadonlySet<VertexId> };
// At runner construction, retain a snapshot, never caller-owned mutable Set.
const completedWork = input.completedWork === undefined ? undefined : new Set(input.completedWork);
```
- [ ] Run focused DAG/configuration tests, then `npm run check` on stable sources. Commit scoped implementation and report actual internal interfaces for next task.

### Task 2: Eager hint discovery, catalog validation and synthetic roots

**Files:** Modify both DAG config/runner files, kernelTypes.ts, TraversalKernel.ts, GraphScheduling.ts, ResolvedGraphsContainer.ts as needed. Create `src/traversals/dag-traversal/lib/DagGraphView.ts`, `tests/dag-discovery.test.ts`, `tests/dag-synthetic-root.test.ts`. Use existing SCC helper.

**Interfaces:** Add graph-only `discovery?: 'lazy' | 'eager'` and `syntheticRoot?: boolean`. Public getResolvedGraph()/visitor graph/saved snapshot views omit synthetic vertex, its parents/path entries and root identity; internal container may retain it for scheduling. Eager discovery drains all declared hints before any user visitor. Kernel tracks queued/started expansions to avoid repeated expansion when seeded/initial work later commits. Share existing graph acceptance rather than building another adapter model. Return unused seed IDs via Task1 helper. Add scheduler validation/query helpers for Task3 summary with explicit discovered-state meaning.

- [ ] Add red tests for deferred-ready topology preparation (without implementing sentinel yet, verify all resolvers run before first visitor); blocked parent grandchildren discovered; seeded/disconnected dependency cycles rejected before visitors; missing prerequisites, catalog duplicate IDs, unknown seeds; legitimate shared children; synthetic root absent from callbacks/events, graph views/counts/paths, original snapshots and implicit dependencies. Include unsupported priority/dependsOnComplete and graph-only/injected-state input negatives.
```ts
const runner = new DagTraversal({ traversableGraph: adapter, discovery: 'eager', syntheticRoot: true }).makeRunner();
runner.run();
expect(runner.getResolvedGraph().getRoot()).toBeNull();
expect(runner.getResolvedGraph().getVertexRefs().map(ref => runner.getResolvedGraph().getIdOf(ref))).toEqual(['a', 'b']);
```
- [ ] Run new tests and observe RED. Implement queue-based eager discovery independent of W readiness; validate all declared dependency edges (including seeds) before admission. Reject duplicate root catalog IDs without rejecting shared descendant references. Catalog entries require explicit IDs. Synthetic root success/completion remains internal and never creates an implicit prerequisite for real roots. Reject eager child-hint rewrites and subtree-disabling commands after topology discovery to prevent stale validation; retain existing data rewrite/deletion behavior. Ensure synthetic root identity cannot collide with a real catalog ID. Validate original edges for seeded lazy graphs when discovery completes as well, so successful seeds cannot hide cycles.
```ts
type DagDiscoveryOptions = { discovery?: 'lazy' | 'eager'; syntheticRoot?: boolean };
// SCC validation uses original graph vertex.dependsOn, not only unmet sets.
```
- [ ] Default lazy behavior and existing tree paths remain unchanged. Explicit ordinary root dependencies in eager mode must be honored/validated, not silently dropped. Empty catalog must finish without fake events.
- [ ] Run focused discovery/seed/DAG/graph suites and full `npm run check`; commit with documented exact helpers and validation semantics for Task3.

### Task 3: Deferred work, guarded settlement and detached summaries

**Files:** Create `src/traversals/dag-traversal/lib/DagProgress.ts`, optional focused `src/core/scheduling/DagProgressState.ts`; modify DAG exports, visitor return types, core graph/effect/visitor types as required, TraversalKernel.ts, GraphScheduling.ts, both runners and runAsync.ts. Add `tests/dag-summary.test.ts`, `tests/dag-deferred-settlement.test.ts`, `examples/dag-reconciliation-example.ts`, package consumer checks and README.

**Interfaces:**
```ts
export const DEFER_READY: unique symbol = Symbol('DEFER_READY');
export type DagSettlementGeneration = symbol;
export type DagSettlementOutcome = { ok: true } | { ok: false; error: unknown };
export type DagWorkState = 'pending' | 'ready' | 'running' | 'deferred' | 'succeeded';
export type DagVertexProgress = Readonly<{
  id: VertexId; work: DagWorkState; subtreeComplete: boolean;
  unmetPrerequisiteIds: readonly VertexId[]; generation?: DagSettlementGeneration;
}>;
export type DagSummary = Readonly<{
  discovery: Readonly<{ mode: 'lazy' | 'eager'; complete: boolean }>;
  counts: Readonly<{ discovered: number; pending: number; ready: number; deferred: number; inFlight: number; workCompleted: number; subtreeCompleted: number }>;
  vertices: ReadonlyMap<VertexId, DagVertexProgress>;
  readyIds: readonly VertexId[]; deferredIds: readonly VertexId[]; inFlightIds: readonly VertexId[];
  completedWorkIds: readonly VertexId[]; completedSubtreeIds: readonly VertexId[];
  unusedCompletedWorkIds: readonly VertexId[];
  diagnostics: DagTraversalStallDiagnostics | null;
}>;
// Both runner classes:
// summary(): DagSummary
// settle(id: VertexId, outcome: DagSettlementOutcome, expectedGeneration: DagSettlementGeneration): boolean
```

- [ ] Write RED sync/async tests for diamond progress frontiers with seed subsets, deferral never releasing dependent work, eager parent deferral never hiding descendants, run/iteration returning HALTED at host-wait quiescence, repeated summary causing no callback/resolver/input mutation, and lazy incomplete discovery.
```ts
traversal.addVisitorFor(DagTraversalOrder.ON_READY, () => DEFER_READY);
const runner = traversal.makeRunner();
runner.run();
expect(runner.summary().readyIds).toEqual(['backend', 'frontend']);
const token = runner.summary().vertices.get('backend')!.generation!;
expect(runner.settle('backend', { ok: true }, token)).toBe(true);
expect(runner.settle('backend', { ok: true }, token)).toBe(false);
runner.run();
expect(runner.summary().readyIds).toEqual(['frontend']);
```
- [ ] Implement sentinel interception at existing visitor outcome boundary, only DAG ON_READY. End deferring chain without success or event; discard uncommitted buffered commands/remaining callbacks, free physical permit and expand as specified. Document sole deterministic inspection visitor. Reject sentinel for tree/completion callbacks. Keep prior thrown-value semantics.
- [ ] Implement runner-local per-vertex symbol generations and identity-safe idempotent settlement; unknown/stale/cross-runner/deleted/conflicting outcomes refuse. Success commits W once; failure retains exact error, including undefined/null. Notify async driver so an active consumer can progress when a different callback remains pending. Add async active-settlement and delete/halt/reconstruction races.
- [ ] Implement summary from copied scheduler state without callback invocation, lazy map/array collection values detached; never deep-freeze IDs. Count deferred also as dependency-ready, not physical in-flight. Host external states are deliberately absent. Do not expose synthetic root. Invalid graph diagnostics remain distinct from legitimate deferred blockers.
- [ ] Add independent reference-frontier comparisons for generated small DAGs and prerequisite-closed completed subsets; assert reconstruction versus settlement order parity. Include unknown IDs, identity edge cases and generation replay conflicts. Test summary before discovery, during callbacks, after quiescence, halt/resume, failure and completion.
- [ ] Add runnable reconciliation example and CJS/ESM/TypeScript public consumer checks. Run focused tests while iterating; then complete `npm run check` once stable. Commit. Independent task and broad branch reviews, address findings, push PR, wait Node22/24 CI, merge and update WBS with exact implementation/release status.
