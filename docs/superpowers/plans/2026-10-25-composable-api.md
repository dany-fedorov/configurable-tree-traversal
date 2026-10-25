# Composable CTT API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all ten approved 2026-10-25 API findings, validate and review them, then push and merge.

**Architecture:** Extend the existing shared state machine and public facades with explicit preparation/pause/readiness capabilities. Correct object-helper type/lifetime contracts and query ownership. Keep runtime ID semantics erased and generic while carrying caller ID types through the public graph surface.

**Tech Stack:** TypeScript, Jest, Node, Bun, packed CJS/ESM consumers.

**Spec:** `docs/superpowers/specs/2026-10-25-composable-api-design.md`

## Global Constraints

- Package version remains 0.11.0; changes are unreleased; no npm publication.
- Preserve Node 22.12.0+ and Bun 1.4.4 support, TypeScript 4.7.4 and 4.9.5 packed consumers, and canonical CJS/ESM constructor/sentinel/type identity.
- Preserve arbitrary SameValueZero IDs (including object, symbol, NaN and explicit undefined), exact thrown values, guarded settlement, single iterator ownership and captured-input validation.
- Keep 100% source statements, branches, functions and lines coverage; do not weaken checks or add test-only production paths.
- Keep unrelated local files and native managed worktrees. Implement in the isolated branch, with one implementer at a time, task reviews and one final whole-branch review.
- Compatibility is preserved except the approved corrections to unsafe output typing, ignored helper options, phase-erasing interfaces and query ownership. Document migration for each.

Every task implements its corresponding spec section in full. Workers read their extracted brief and relevant spec section, not the whole plan. Add local doc/API comments with behavior; Task 7 owns the coordinated consumer-guide migration. Work/test/commit only in the managed worktree. Capture test output under /tmp or this plan's ignored SDD workspace, never commit logs or node_modules. Run focused regressions during iteration, then typecheck, lint and full source coverage once before committing. Re-run a broad check only when a subsequent change or failure justifies it. Final full check and runtime/compiler matrices belong to Task 7.

### Task 1: Truthful object rewrite contracts and final result access

**Findings:** 1, 8, 9. **Spec:** section 1.

**Files:** modify `src/tools/rewrite-object/rewriteObject.ts`, `src/tools/rewrite-object/index.ts`, `src/index.ts`; add `tests/rewrite-result-contract.test.ts`, `tests/rewrite-output.typecheck.ts`; adapt affected positive callers in tests/examples where the newly conservative type requires an explicit assertion. Preserve negative assertions.

**Interfaces:** consumes current DFS runner getStatus/getResolvedTreeView/run; produces `RewriteObjectResult.getOutput(): Out | null`, default output unknown, `rewriteObjectAs<Out>(object, options?)`, and source-forbidding helper options. Existing six generic positions remain. Export rewriteObjectAs from root and rewrite subpath/namespace; root rewriteObject remains the compatibility namespace.

- [ ] Write RED public compile/runtime tests. At minimum the following compiler probe must reject unsafe output access and accept explicit output selection:
```ts
const changed = rewriteObject({ count: 1 }, {
  rewrite: ({ key }) => key === 'count' ? { rewrite: { key: 'renamed' } } : undefined,
});
// @ts-expect-error Arbitrary rewrites do not preserve the input shape.
changed.outputObject!.count;
const typed = rewriteObjectAs<{ renamed: number }>({ count: 1 }, {
  rewrite: ({ key }) => key === 'count' ? { rewrite: { key: 'renamed' } } : undefined,
});
const value: number = typed.getOutput()!.renamed;
void value;
```
Add actual-helper negatives for traversableTree in inline/pretyped options; JS input with present undefined rejects before callbacks. Runtime tests halt via POST_ORDER, assert getOutput rejects while incomplete, resume, check transformed final result and one successful final conversion across repeated reads. Cover initially finished reuse, root deletion/null, exact converter throw values and retry after conversion failure. Keep outputObject's initial snapshot behavior.
- [ ] Run `npm test -- tests/rewrite-result-contract.test.ts` and `npm run typecheck`; retain expected failures before production changes.
- [ ] Change the output default and add the explicit helper and result accessor. Minimal lifecycle shape:
```ts
let hasFinalOutput = runner.getStatus() === TraversalRunnerStatus.FINISHED;
let finalOutput = outputObject;
function getOutput() {
  if (runner.getStatus() !== TraversalRunnerStatus.FINISHED)
    throw new Error('Rewrite output is not complete');
  if (!hasFinalOutput) {
    finalOutput = convertCurrentRoot();
    hasFinalOutput = true;
  }
  return finalOutput;
}
```
Use the actual runner/conversion/root-reading helper without duplicating semantics. Validate unsupported options before creating the adapter. Explicit output is a documented caller assertion, not schema validation.
- [ ] Run focused object/rewrite suites, typecheck, lint, then full source coverage. Self-review and commit as `fix: make object rewrite result contracts explicit`.

### Task 2: Uniform execution interfaces and public pause requests

**Findings:** 3, 6. **Spec:** section 2.

**Files:** create `src/core/TraversalExecution.ts`; modify `src/core/TraversalRunner.ts`, `src/core/AsyncCoreExecution.ts`, `src/core/index.ts`, `src/core/drivers/AsyncRunnerSession.ts`, `src/core/drivers/runAsync.ts`, `src/core/TraversalKernel.ts`/internal ports only as needed, and all six concrete runner files under `src/traversals/*/lib/`; add `tests/execution-capabilities.test.ts`, `tests/execution-capabilities.typecheck.ts`.

**Interfaces:** produces `TraversalExecutionState`, `SyncTraversalExecution<Phase, Event>`, `AsyncTraversalExecution<Phase, Event>`, `requestPause(): boolean` on all runners. `AsyncCoreExecution<Event, Phase = never>` is the historical name with safe erased default. New capability interfaces retain precise generator close/run return types; existing public concrete phase restrictions remain.

- [ ] Add RED compile regressions for family phases through both concrete and abstract APIs:
```ts
const common: AsyncCoreExecution<unknown> = dfs.makeRunner();
// @ts-expect-error Erased execution cannot claim a specific family phase.
common.run({ emitPhases: ['ON_READY'] });
const precise: AsyncTraversalExecution<DepthFirstTraversalOrder, unknown> = dfs.makeRunner();
precise.run({ emitPhases: [DepthFirstTraversalOrder.PRE_ORDER] });
precise.inspect();
precise.requestPause();
```
Define dfs using a normal typed tree source in the fixture. Sync TraversalRunner-typed values support inspect/isHalted and direct iterator.return. Add runtime public tests across DFS/BFS/DAG sync/async: pause from callback, pause while async run is awaiting a controlled callback, request idempotence, inactive/terminal false, resume once, exact errors, retained events and ownership. Assert no unopened iterator is needed and no new source callbacks start after a requested boundary.
- [ ] Run focused tests/typecheck to observe expected missing-method/type failures.
- [ ] Extract state/inspection capability interfaces; implement pause through the existing kernel/session/driver control and wakeup mechanism. The state gate is RUNNING and no existing halt request; do not conflate a request with acknowledgment or add cancellation. Internal sessions explicitly choose their phase type; public defaults may not expose the VisitOrder union.
- [ ] Run affected async driver/session, halt/resume and all-family tests; typecheck/lint/full coverage; self-review and commit `feat: expose uniform execution and pause capabilities`.

### Task 3: Caller-specified graph identity types

**Finding:** 5. **Spec:** section 3.

**Files:** modify `src/core/TraversableGraph.ts`, graph result types in `src/core/TraversableTree.ts`, `src/core/ResolvedGraph.ts`, `src/core/graph/types.ts`, `src/core/errors/DagTraversalStallError.ts`, public graph view/snapshot types as needed, both DAG classes/helpers/runner/config/visitor/progress files; add `tests/graph-id-types.typecheck.ts` and minimal runtime regressions where adaptations touch executable code. Internal files may change only to carry sound typing or narrowly adapt erased boundaries.

**Interfaces:** trailing ID generic defaults unknown. `TraversableGraph<T, R = T, ID = unknown>`, `AsyncTraversableGraph<T, R = T, ID = unknown>`, `DagTraversal<T, R = T, ID = unknown>`, AsyncDagTraversal and their runners/config/helpers match. `ResolvedGraph<T, ID = unknown>`, `DagSummary<ID = unknown>`, `DagVertexProgress<ID = unknown>`, `DagTraversalStallDiagnostics<ID = unknown>`. Parameterize graph visitor options/results, source results/omission/hint-ID types and snapshots consistently. Data/hint and output-rewrite type parameters remain independent of ID.

- [ ] Add RED tests at real API boundaries: string IDs accept strings but reject number/object dependencies, lookup inputs, completedWork, settle and getVertexRefById. Summary IDs and graph.getVertexId infer strings without assertions. Branded, object, symbol, explicit undefined and union IDs remain supported. Include sync/async helpers and source inference, two data types under rewriting, aliases and default unknown compatibility. Tree sources with generated identities must not masquerade as a caller-selected ID domain. Found graph-source results with a selected non-unknown ID require an explicit typed vertexId; include missing-ID negatives for tagged and legacy shapes so generated UUID fallback cannot violate the advertised domain.
```ts
type W = TreeTypeParameters<string, string>;
const source: TraversableGraph<W, W, string> = {
  makeRoot: () => ({ kind: 'found', vertex: {
    vertexId: 'a', vertexContent: { $data: 'a', $childHints: [] },
  } }),
  makeVertex: id => ({ kind: 'found', vertex: {
    vertexId: id, vertexContent: { $data: id, $childHints: [] },
  } }),
};
const runner = new DagTraversal<W, W, string>({ traversableGraph: source }).makeRunner();
const ids: readonly string[] = runner.summary().readyIds;
// @ts-expect-error ID domain is string.
runner.settle(42, { kind: 'workCompleted' }, Symbol());
void ids;
```
- [ ] Run typecheck and confirm missing generic/unused-negative failures; retain RED output.
- [ ] Thread ID through public signatures and narrow internal adaptations. Do not introduce stringification, runtime schema checks or unsafe public any to satisfy fixtures. Reject typed-ID tree sources when their generated identity domain is unknown. Explain any erased adapter in a short comment/report.
- [ ] Run typecheck, graph identity/source/progress tests, lint/full coverage if runtime changed; build and compile real packed .cts/.mts consumers with minimum TS4.7.4. Self-review and commit `feat: preserve caller vertex ID types across graph APIs`.

### Task 4: Independent preparation and explicit guarded readiness

**Findings:** 2, 4. **Spec:** section 4.

**Files:** modify `src/core/TraversalKernel.ts`, `src/core/kernelTypes.ts`, `src/core/effects/types.ts`, `src/core/drivers/AsyncRunnerSession.ts`/drivers as needed; both DAG runner files, `DagProgress.ts`, `DagTraversalVisitor.ts`, `src/core/TraversalRunner.ts`; create `tests/dag-preparation.test.ts`, `tests/dag-guarded-frontier.test.ts`, and compile fixtures. Reuse Task2 capability/ownership and Task3 ID generics.

**Interfaces:** `prepare(): this` sync / `Promise<this>` async; stop reason `prepared`; `DagDeferredWork<ID>` records `{vertexId, generation}`; `DagSummary<ID>.deferredFrontier`; DAG event `kind: 'workCompleted' | 'subgraphCompleted'` while retaining `order`.

- [ ] Add RED tests around a fully defined two-node dependency source:
```ts
const source = {
  makeRoot: () => ({ kind: 'found' as const, vertex: {
    vertexId: 'a', vertexContent: { $data: 'a', $childHints: ['b'] },
  } }),
  makeVertex: (id: string) => ({ kind: 'found' as const, vertex: {
    vertexId: id, dependsOn: ['a'], vertexContent: { $data: id, $childHints: [] },
  } }),
};
const runner = new DagTraversal({ traversableGraph: source, workCompletion: 'externalSettlement' }).makeRunner();
runner.prepare();
expect(runner.getStopReason()).toBe('prepared');
expect(runner.summary().completedWorkIds).toEqual([]);
expect(runner.summary().deferredFrontier).toEqual([]);
runner.run();
const [work] = runner.summary().deferredFrontier;
runner.settle(work!.vertexId, { kind: 'workCompleted' }, work!.generation);
expect(Array.from(runner.getIterable()).map(event => event.kind)).toContain('workCompleted');
```
Cover both source modes, both runtimes, lazy/eager inputs, empty/omitted/synthetic roots, accepted W seeds, C joins, missing lookups/cycles and exact adapter errors. Assert preparation emits no execution events/visitors/new W/C, repeats idempotently without rediscovery, rejects after execution/while owned without poisoning, and pause/resume during prepare follows the spec. Reject post-prepare topology rewrites under the eager rule. Assert frontier excludes queued/running/settled/deleted vertices, contains exact stable generations and opaque IDs, is detached, and exists independently of event filters. Verify event kinds for normal/seeded/external paths and retain old order/filter behavior.
- [ ] Run focused tests/typecheck for RED evidence.
- [ ] Add a preparation lifecycle mode within the same kernel/session ownership. Fully discover and validate before any visit admission; stop prepared even for empty graphs. Persist effective eager topology behavior. Add frontier projection from live unsettled deferred records and canonical event kinds at DAG facades. Do not implement a second scheduler or replay callbacks to synthesize readiness.
- [ ] Run focused preparation/frontier/lifecycle/seed/lookup/W-C suites, typecheck/lint/full coverage; self-review and commit `feat: separate DAG preparation readiness and completion`.

### Task 5: Explain dependency milestones in diagnostics

**Finding:** 7. **Spec:** section 5.

**Files:** modify `src/core/scheduling/dependencyMilestones.ts`, `src/core/scheduling/GraphScheduling.ts`, `src/core/errors/DagTraversalStallError.ts`, and exports/snapshot copying as needed; create `tests/dag-milestone-diagnostics.test.ts` and type fixtures.

**Interfaces:** public generic `DagDependencyMilestone<ID>`, `DagDependencyEdge<ID>`, and `DagTraversalStallDiagnostics<ID>.dependencyEdges`. Edge reasons exactly `workDependency`, `completionDependency`, `ownWork`, `structuralChild`; milestone names `work`, `completion`; from waits for to. Retain all old diagnostic fields and constructor support for manual old-shaped input with an empty edge list.

- [ ] Add RED public diagnostics tests for two graphs with the same root/child ID SCC but distinct W vs C/structural dependencies; assert exact labelled edges, not only array size. Include missing endpoints, seeds, self-loops, disconnected components, stable order, and SameValueZero IDs without stringification/freezing. Error and summary projections detach edges/milestone objects. A 10k-node chain must stay stack-safe.
```ts
expect(diagnostics.dependencyEdges).toContainEqual({
  from: { vertexId: 'child', milestone: 'work' },
  to: { vertexId: 'root', milestone: 'completion' },
  reason: 'completionDependency',
});
expect(diagnostics.dependencyEdges).toContainEqual({
  from: { vertexId: 'root', milestone: 'completion' },
  to: { vertexId: 'child', milestone: 'completion' },
  reason: 'structuralChild',
});
```
Build diagnostics through a public runner cycle failure or summary in the test, using root child source declarations as in existing completion-dependency tests.
- [ ] Run focused diagnostics tests/typecheck to establish RED.
- [ ] Share one labelled edge construction for validation/cycle analysis and diagnostic projection; preserve existing ID-SCC summary order. Detach wrappers while preserving ID identity. Avoid enumerating every cycle or adding recursive graph algorithms.
- [ ] Run completion/discovery/identity diagnostics suites, typecheck/lint/full coverage; self-review and commit `feat: expose milestone dependency diagnostics`.

### Task 6: Detached visitor-list inspection across every traversal

**Finding:** 10. **Spec:** section 6.

**Files:** add shared copy helper in `src/core/visitors/normalizeVisitorDefinitions.ts`; modify `DepthFirstTraversal.ts`, `AsyncDepthFirstTraversal.ts`, `BreadthFirstTraversal.ts`, `AsyncBreadthFirstTraversal.ts`, `DagTraversal.ts`, `AsyncDagTraversal.ts`; add `tests/visitor-query-ownership.test.ts`.

**Interfaces:** listVisitorsFor keeps compatible mutable result types but returns detached arrays and records. Preserve executable callback references and frozen group metadata identity, registration order and list/set normalization behavior.

- [ ] Add RED all-six behavior tests: splice/reverse a listed array, edit record priority/visitor/mode, and prove future runners retain their original callbacks/order/policy. Repeated snapshots are independent; explicit groups survive list/set round trips. A useful sync assertion:
```ts
const records = traversal.listVisitorsFor(DepthFirstTraversalOrder.PRE_ORDER);
records.splice(0, records.length);
traversal.makeRunner().run();
expect(visited).toEqual(['root']);
```
Construct concrete family fixtures with real callbacks to retain phase inference; do not weaken them with any.
- [ ] Run focused tests for RED.
- [ ] Implement a shared `copyVisitorRecords` helper using `records.map(record => ({ ...record }))`, retaining callback/group identity, and use it at all six query boundaries. Updates stay on existing validated setters.
- [ ] Run visitor definition/group/query and affected family suites, typecheck/lint/full coverage; self-review and commit `fix: detach visitor registration queries`.

### Task 7: Agent-first migration and packed compatibility gates

**Findings:** documentation/verification of all ten. **Spec:** Verification and documentation plus all public contracts above.

**Files:** README.md, AGENTS.md, CHANGELOG.md, docs/reference.md, docs/agent-workflows.md, docs/migration-uniform-api.md, docs/index.md, docs/testing.md as needed; examples/*.ts affected/new example; scripts/package-consumers/uniform-api.mjs, uniform-api.ts, scripts/verify-package.cjs. Update package files only if a new consumer guide is actually needed; no version/dependency bump.

**Interfaces consumed:** every preceding task's finalized public API. Read their report interfaces and targeted source declarations rather than assuming signatures. If implementation and this plan differ, ask controller to resolve before writing examples.

- [ ] Add actual packed runtime and strict compiler regressions for truthful output/explicit helper/final getter/ignored source, common family-safe interfaces/pause, typed IDs, prepare without effects, frontier generations/event kinds, labelled diagnostic identity, and detached registrations. Runtime tests exercise both loaders with constructor/sentinel identity; compiler fixtures include meaningful @ts-expect-error negatives.
- [ ] Rewrite the quickstart/workflow guidance around typed IDs and deferredFrontier records, with prepared graph preview distinct from run/settlement. Explain workCompleted/subgraphCompleted event kinds and legacy order, request vs acknowledgment of pause, no callback cancellation, and host storage/claims. Document unknown rewrite output migration, rewriteObjectAs assertions, getOutput completion/caching, rejected helper options, family type parameters and copied registration records. Preserve anchors and published/unreleased distinction.
- [ ] Add a runnable example checking prepare->run->frontier->settle->run and final stop reason; convert existing examples to canonical safe APIs. Execute new/changed snippets/examples and verify repository/tarball links.
- [ ] Run `npm run check` on final code and inspect its output. Run packed consumers on Node22.12.0/Node24 and Bun1.4.4 with locked TS4.9.5 and minimum TS4.7.4; Bun script tests must pass. Use cached exact runtimes if present, otherwise obtain the specified versions. Preserve evidence logs and report exact versions/results. No broad reruns without changes/failures.
- [ ] Self-review and commit `docs: explain composable traversal capabilities and migration`. Controller conducts Task7 spec/quality and final whole-branch review together with separate verdicts, addresses findings, then pushes/creates PR, waits CI, merges, syncs local main, verifies main CI and completes the goal. No release.
