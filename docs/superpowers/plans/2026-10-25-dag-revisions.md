# Validated DAG revisions implementation plan

> **For agentic workers:** Use test-driven development and verification-before-completion. This draft prepares phase 2C and depends on the definition-value delivery in the fragment plan.

**Goal:** Implement roadmap item 6 with atomic definition edits, meaningful structural diffs, and isolated new sessions.

**Architecture:** Apply explicit operations to a private copied candidate, validate through `prepareDagDefinition`, and return a new prepared DAG plus a pure diff. Existing definitions and sessions are never edited.

**Tech Stack:** TypeScript, phase-two definition values and validation, existing coordinators, Jest, packed consumers.

**Spec:** [Phase two design, section 2C](../specs/2026-10-25-agent-api-phase-two-design.md#2c-validated-graph-revisions)

## Global constraints

- Preserve Node 22.12.0+, Bun 1.4.4, and TypeScript 4.7.4 compatibility.
- Preserve 100% statements, branches, functions, and lines; do not weaken coverage.
- Preserve arbitrary SameValueZero IDs and exact caller error values.
- ESM and CJS share implementation and declaration identity.
- No new runtime dependency, durable storage, task executor, or automatic completion-fact migration.
- All phase-one APIs remain available; published version remains 0.11.0 until a separately authorized release.
- Copy owned topology and result wrappers; retain shallow caller data and ID identity without freezing caller objects.

## Task 1 Define revision operations and atomic validation

**Files:** create `src/traversals/dag-traversal/lib/DagRevision.ts` and `src/traversals/dag-traversal/reviseDag.ts`; add `tests/dag-revisions.test.ts` and `.typecheck.ts`.

**Interfaces:** operations are `addVertex { vertex }`, `replaceVertex { vertex }`, `removeVertex { vertexId }`, `replaceEntry { entry }`, and `replaceOmissions { omittedIds }`. Records use `DagDefinitionVertex`; entries/omissions use `DagDefinition`. `reviseDag` accepts a prepared DAG and readonly ordered operations. Its result is invalid issues or valid `{ dag, changes }`.

- [ ] Write a regression that removes a prerequisite without replacing its dependent declaration. It must return invalid while the original definition and session remain usable:

```ts
const before = original.createSession();
const result = reviseDag(original, [{ kind: 'removeVertex', vertexId: 'research' }]);
expect(result.kind).toBe('invalid');
expect(before.advance()).toMatchObject({
  kind: 'awaitingSettlement', frontier: [{ vertexId: 'research' }],
});
```

- [ ] Observe the missing API fail. Implement an isolated candidate map/order list, applying operations sequentially and validating only the final shape. Replacement keeps position; addition appends. Unknown replace/remove and duplicate add are programmer errors. Never mutate shared opaque data.
- [ ] Test a batch that temporarily leaves a dangling reference then repairs it, root replacement/removal, omission/live collisions, cycles, unreachable additions, empty revisions, and preservation of the original after every rejection.
- [ ] Run focused tests and typecheck; compare new sources against phase-one source/replay ownership tests.

## Task 2 Diff definitions explicitly

**Files:** create `src/traversals/dag-traversal/diffDagDefinitions.ts`; extend `DagRevision.ts` and revision tests.

**Interfaces:** `diffDagDefinitions(before, after)` returns `addedIds`, `removedIds`, `changedVertices` with per-ID aspects (`data`, `slots`, `workDependencies`, `completionDependencies`), and booleans `vertexOrderChanged`, `entryChanged`, `omissionsChanged`. `reviseDag` includes this result on success. Both arguments are immutable `DagDefinition` values.

- [ ] Add tests for changes in ordering, W versus C declaration changes, object identity, NaN/undefined IDs, and shallow data replacement:

```ts
expect(diffDagDefinitions(before, after)).toMatchObject({
  addedIds: [], removedIds: [],
  changedVertices: [{ vertexId: 'task', aspects: ['data'] }],
});
```

- [ ] Implement identity-based comparison without serialization, user comparators, or deep traversal of caller data. Define deterministic result order from old vertex order followed by new additions; preserve a fixed aspect order.
- [ ] Assert that same-reference deep mutation cannot be reported as an inferred business change. Document that limitation at the diff API, along with the host's responsibility for artifact validity.
- [ ] Run focused tests and typecheck.

## Task 3 Verify session isolation and integrate

**Files:** extend revision tests; add `examples/dag-revision-example.ts` and `scripts/package-consumers/dag-revisions.mjs` / `.ts`; update the DAG barrel, package verifier, agent guide, reference, migration guide, index, testing guide, and changelog.

**Interfaces:** consume the existing `PreparedDag.createSession`, `createAsyncSession`, and ticket APIs unchanged. No migration of generations, in-flight callbacks, accepted facts, or host revision identifiers is introduced.

- [ ] Create an old deferred session, accept a valid revision, and start a fresh session. Verify the old ticket is rejected by the new session and remains usable in its original session. Verify the host must explicitly provide completed-work seeds to the revised session.

```ts
expect(() => newSession.complete(oldTicket)).toThrow();
expect(oldSession.complete(oldTicket)).toEqual({ kind: 'accepted' });
expect(newSession.summary().completedWorkIds).toEqual([]);
```

- [ ] Cover the same contract with async sessions and an old completion callback still admitted. Revision must neither cancel nor transfer that callback. Test a host-selected seed set whose meaning is independently accepted for the new definition.
- [ ] Execute the new example and packed consumers, verify current-guide links/anchors, run `npm run check`, obtain independent review, and resolve material findings before integration.

## Prepared handoff

Implement after definition values and validation exist. Follow the exact types exported by that delivery; reconcile any intentional signature changes against the phase-two spec before coding. Item 5's alternative dependency semantics remain outside this revision API.
