# Agent API foundations implementation plan

> **For agentic workers:** Use test-driven development and verification-before-completion. Independent source and event work may be delegated using dispatching-parallel-agents; dependent preparation and coordination integration follows their stable contracts. Preserve unrelated untracked files.

**Goal:** Implement roadmap proposals 1, 2, 3, and 8 as additive, composable APIs.

**Architecture:** Materialized source adapters feed existing DAG runners. Prepared definitions capture validated topology for independent replay runners. A ticket facade wraps external settlement, while event and visitor improvements remain independently usable.

**Tech Stack:** TypeScript 4.7.4+, Jest, existing sync/async traversal kernel, packed CJS/ESM consumers.

**Spec:** [Agent API foundations](../specs/2026-10-25-agent-api-foundations-design.md)

## Global constraints

- Preserve Node 22.12.0+, Bun 1.4.4, and TypeScript 4.7.4 compatibility.
- Preserve 100% statements, branches, functions, and lines; do not weaken coverage.
- Preserve arbitrary SameValueZero IDs and exact thrown values.
- ESM and CJS share implementation, constructor, and declaration identity.
- No new runtime dependency, storage port, agent executor, or durable checkpoint.
- All existing APIs remain available; published version remains 0.11.0.
- Owned topology is copied; caller data and opaque IDs retain shallow identity and are never frozen.

## Task 1 Collection and forest sources

Files: create `src/sources/graphFrom.ts`, `src/sources/forestFrom.ts`, shared source types/materialization helpers as needed, and `src/sources/index.ts`; add `tests/collection-sources.test.ts` and `tests/collection-sources.typecheck.ts`. Integrator owns root exports.

Produces `graphFrom`, `forestFrom`, `graphFromAsync`, `forestFromAsync` returning ordinary synthetic-forest source options with `TreeTypeParameters<Item, ID>`. No dependency on later tasks.

- [x] Write public regressions before implementation. The first acceptance case is a flat diamond with source selectors and an external-settlement runner:

```ts
const source = graphFrom([
  { id: 'a', requires: [] },
  { id: 'b', requires: ['a'] },
], { id: task => task.id, dependencies: task => task.requires });
const runner = new DagTraversal({ ...source, workCompletion: 'externalSettlement' }).makeRunner();
runner.run();
expect(runner.summary().deferredFrontier.map(work => work.vertexId)).toEqual(['a']);
```

- [x] Run `npm test -- tests/collection-sources.test.ts` and confirm missing API failure.
- [x] Materialize records once into private ID maps and copied edge arrays, rejecting duplicate IDs; emit tagged found/missing results through a hidden synthetic holder. Implement iterative forest expansion and async materialization according to the spec.
- [x] Add empty, disconnected, shared descendant, arbitrary identity, missing child, duplicate identity, mutation isolation, async iterable, and error-identity cases. Add inference and invalid-selector type assertions.
- [x] Run focused Jest, typecheck, and source-file coverage. Record results below.

## Task 2 Precise events and reusable filtered visitors

Files: modify `src/traversals/dag-traversal/lib/DagTraversalVisitor.ts`, both DAG runners; create `src/traversals/dag-traversal/filterDagVisitor.ts`; add `tests/dag-event-types.test.ts`, `tests/dag-event-types.typecheck.ts`, and filtered-visitor tests. Integrator owns barrel exports.

Produces `DagEvent<T, ID>`, `filterDagVisitor`, and `filterAsyncDagVisitor`. Existing source interfaces are unchanged.

- [x] Write a discriminated-event type assertion and a runtime ID-identity test before implementation:

```ts
for (const event of runner.getIterable()) {
  const id: TaskId = event.vertexId;
  if (event.kind === 'workCompleted') {
    const phase: DagTraversalOrder.ON_READY = event.order;
    void [id, phase];
  }
}
```

- [x] Run the focused tests/typecheck and confirm the missing contract fails.
- [x] Add the trailing event ID generic, correlated union, and typed identity to sync/async event mapping; preserve timing/filter semantics.
- [x] Implement predicate/type-guard visitor wrappers preserving output commands/context. Test true/false branches, narrowed data, exact sync/async errors, deferral restrictions, and async results.
- [x] Run focused tests and typecheck; record results below.

## Task 3 Host coordination facade

Files: create `src/traversals/dag-traversal/coordinateDag.ts`; add `tests/dag-coordination.test.ts` and `tests/dag-coordination.typecheck.ts`.

Consumes existing typed runners; produces `coordinateDag`, `coordinateDagAsync`, opaque `DagWorkTicket<ID>`, boundary/result types. Prepared definitions consume these factories later.

- [x] Test external runner coordination before implementation:

```ts
const coordinator = coordinateDag(runner);
const boundary = coordinator.advance();
if (boundary.kind !== 'awaitingSettlement') throw new Error('Expected work');
expect(coordinator.complete(boundary.frontier[0]!)).toEqual({ kind: 'accepted' });
expect(coordinator.complete(boundary.frontier[0]!)).toEqual({ kind: 'alreadyAccepted' });
expect(coordinator.advance()).toEqual({ kind: 'finished' });
```

- [x] Confirm the missing API fails, then wrap existing run/settle methods. Use private ticket provenance state and generation guards; never add a second scheduler.
- [x] Test cross-facade, forged, stale and duplicate tickets, conflict semantics, empty/finished boundaries, wrong work policy, exact fatal errors, summary ownership, and sync/async pause. Test compile-time ticket construction rejection.
- [x] Run focused tests/typecheck and record results.

## Task 4 Reusable prepared DAGs

Files: create `src/traversals/dag-traversal/prepareDag.ts` and internal capture/replay helpers; add `tests/prepared-dag.test.ts` and `tests/prepared-dag.typecheck.ts`.

Consumes ordinary graph source options and coordination factories; produces `prepareDag`, `prepareDagAsync`, `PreparedDag<Data, ID>`, typed validation results, runner/session options, and readonly vertex descriptions.

- [x] Write a public regression with a counting source, two independent runners and different completed-work sets. Source call counts must remain unchanged after both runners execute.
- [x] Confirm missing preparation APIs fail.
- [x] Prepare using existing eager runners, capture copied topology and omission identities, and construct private replay adapters. Preserve source error provenance when converting engine stall errors into invalid results.
- [x] Add runner/session creation with owned-source option validation and fresh references/generations. Integrate `createSession` and `createAsyncSession` through Task 3 factories.
- [x] Test root policies, implicit W, completion dependencies, omitted prerequisites/seeds, arbitrary IDs, immutable owned topology, caller data identity, no source replay, invalid graphs, exact adapter errors including thrown stall errors, async failures, and forbidden source options.
- [x] Run focused tests and typecheck; record results.

## Task 5 Integration, examples, documentation, packaging and review

Files: update `src/index.ts`, DAG barrel, README, `docs/agent-workflows.md`, `docs/reference.md`, `docs/migration-uniform-api.md`, `docs/index.md`, `docs/testing.md`; add `examples/agent-api-foundations-example.ts`; extend package consumer fixtures and verifier as necessary.

- [x] Export additions through root and appropriate subpaths without runtime identity duplication.
- [x] Write an executable collection → prepared definition → independent sessions example with ticket completion. Document source copying, normalized prepared hints, local ticket ownership, and structured validation limits.
- [x] Add packed runtime/type coverage for new factories and discriminated events. Verify root/subpath CJS/ESM identity.
- [x] Run `npm run check`; fix every failure without weakening checks.
- [x] Request independent code review of the complete diff, resolve material findings, and rerun affected checks.
- [x] Update this plan's progress and report implemented APIs and verification evidence.

## Progress and decisions

- Roadmap recorded with all ten proposals and the selected first phase.
- Decision: use additive prepare factories with tagged validation results, reusing the existing validator; separate unvalidated graph values remain future work. Cost if revisited: adding a distinct discovery/validation surface, without changing existing runners.
- Decision: prepared sessions normalize hints to stable ID links. Original arbitrary hints remain source-adapter concerns. Cost if revisited: an optional metadata channel for consumers needing original discovery provenance.
- Decision: work on local branch `feat/agent-api-foundations` in the existing checkout, preserving all unrelated untracked documents.

- Tasks 1–5 complete in the checkout. Source adapters, typed events/filter helpers, prepared definitions, and coordination facades are exported and documented.
- Decision: add a synchronous-source overload to async APIs to prevent TypeScript 4.7 inference from introducing undefined into an explicit ID domain. Existing async-source and tree signatures remain available; the cost is additional declaration overloads.
- Review fix: capture supported source fields explicitly rather than spreading objects, preserving non-enumerable own identities and inherited content/dependencies. Preserve hint-ID own-property semantics and unsupported metadata rejection.
- Review fix: retain known omitted identities on discovery slots and replay them in their original positions. This preserves readiness ordering without assigning omitted vertices structural children. Unknown omissions remain unidentified.
- Final verification: `npm run check` exited 0 on Node v24.20.0, with 88 Jest suites / 1,901 tests and 100% statements, branches, functions, and lines. All 14 examples, 13 standalone guide snippets, packed runtime/type consumers (578 packaged files), 25 benchmark/generator checks, and 7 ESM facade checks passed. Typecheck and lint passed.
- Independent review and scoped re-review found no remaining Important/Critical issues. The final check includes the resulting regression tests and fixes.
- Integration target: local `main`, from `feat/agent-api-foundations`, as requested after implementation. No publication or push is requested. Unrelated preexisting untracked documents remain outside the phase-one commit.
