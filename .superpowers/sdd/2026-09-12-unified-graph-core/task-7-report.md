# Task 7 Report

## Status

Implemented identity admission and dependency readiness with a callback-free `GraphScheduling` state owner.

## Implementation

- Added `GraphScheduling<T, R>` with `acceptRoot`, `acceptVertex`, `markPreVisited`, `takeReady`, and `takeEligible`.
- Added data-only `VertexWork` and mixed eligible-visit FIFO records for Task 8 extension.
- Used `ResolvedGraphsContainer` for graph registration, edges, slots, lifecycle statuses, omissions, and deletion tombstones.
- Resolved identities from own result properties, authoritative own hint properties, or collision-checked reference UUIDs.
- Applied SameValueZero semantics through the existing identity helper and native `Map`/`Set` indexes.
- Preserved first-accepted content and dependency declarations while allowing duplicate identities to add incoming edges.
- Indexed undiscovered dependencies immediately and released dependents when an identity became omitted or `PRE_VISITED`.
- Treated `PRE_VISITED`, `COMPLETING`, `COMPLETE`, and omitted dependencies as satisfied.
- Added the internal `GraphStore.markDeleted` primitive required to tombstone a new identity whose dependency was already deleted without transient graph insertion.
- Kept callback outcomes and original-error propagation out of this task for Task 9.

## TDD Evidence

- Initial RED: `npm test -- tests/graph-readiness.test.ts` failed only because `GraphScheduling` did not exist.
- First GREEN: the focused readiness suite passed 16 tests after implementing admission and readiness.
- Deleted-dependency RED: after backing out the tombstone branch, the new regression test received a live reference instead of `null`.
- Deleted-dependency GREEN: restoring the minimal tombstone branch passed all 17 readiness tests.

## Edge Cases

- Early dependent discovery before both prerequisites.
- One mixed FIFO and exactly-once readiness admission.
- Default parent dependencies and ignored root dependencies.
- Duplicate dependencies under SameValueZero.
- `PRE_VISITED` and `COMPLETING` dependency satisfaction.
- Explicit null and undefined ids, anonymous null results, and repeated omission.
- Omission/content conflicts and duplicate null results for live ids.
- First-accepted content and dependencies for duplicate live identities.
- Authoritative hint ids, explicit undefined hint ids, SameValueZero matches, and mismatches.
- Own-property result and hint id detection.
- Generated UUID collision retry.
- Existing deleted identities and newly tombstoned identities with deleted dependencies.
- Tree-source graph metadata rejection, including omitted results.

## Verification

- `npm test -- tests/graph-readiness.test.ts tests/resolved-graph.test.ts`: 2 suites, 34 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Focused Prettier check and `git diff --check`: passed.
- `npm test`: 26 suites, 308 tests passed.

## Assumptions

- The supplied finalized brief and K1/A03/A08 contracts constitute prior design approval; the explicit no-questions instruction precluded reopening design choices.
- Hint wrappers are treated as identities only when `vertexId` is an own property, matching result identity detection and preserving the distinction between absent and explicit `undefined`.
- `markPreVisited` is called by the future kernel after a ready initial visit commits. It is idempotent for an already committed scheduling record but rejects unknown or unenrolled references.
- Low-level scheduling types remain deep-importable and are not added to the public root exports before the plan's export-integration task.
- Completion fields are initialized in `VertexWork` now so Task 8 can extend the same records and FIFO without replacing Task 7 state.

## Concerns

- None within Task 7 scope. Completion accounting, cascade cleanup of queued work, and kernel error-outcome propagation remain intentionally deferred to Tasks 8 and 9.
