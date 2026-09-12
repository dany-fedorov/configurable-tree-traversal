# Task 8 Report

## Status

Implemented completion accounting, pruning, subtree disabling, and quiescent stall details in `GraphScheduling` without moving scheduling state into storage.

## Implementation

- Added `closeExpansion`, `closeSlot`, `markComplete`, and `takeCompleting` over Task 7's shared mixed-order eligible FIFO.
- Initialized each closed expansion from its slot ledger and tracked `completionAccounted` independently from the slot's linked or terminal representation.
- Gated completion admission on committed initial visitation, closed expansion, and zero remaining slot obligations.
- Propagated child completion and deletion to every distinct incoming slot exactly once.
- Added iterative deletion worklists for declared dependents and descendants that lose their last surviving parent.
- Preserved shared descendants with a live parent unless dependency cascade independently selected them for deletion.
- Returned the complete removal set from `deleteVertex` for future kernel owner invalidation, removed deleted entries from the eligible FIFO, and retained storage tombstones.
- Made root deletion select every live graph reference and leave an empty graph.
- Added subtree disabling that closes pending slots as disabled and closes expansion while retaining the vertex's current initial chain.
- Added quiescent stall details that separate vertices blocked by missing dependency ids from other incomplete vertices. The future kernel remains responsible for deciding whether active work or event boundaries make diagnosis premature.
- Preserved legacy unenrolled storage records: slot resolution still updates storage, while completion accounting is skipped when no `VertexWork` belongs to this run.

## TDD Evidence

- Initial RED: `npm test -- tests/graph-completion.test.ts tests/graph-pruning.test.ts` failed because all seven Task 8 scheduling methods were absent.
- First GREEN: the same command passed 2 suites and 12 tests after the K2 implementation.
- Regression RED: adding Task 7's readiness suite exposed that scheduling-owned slot closure incorrectly rejected a valid unenrolled legacy parent with `Vertex is not enrolled`.
- Regression GREEN: making accounting conditional on enrollment passed the completion, pruning, readiness, container, and identity suites: 5 suites and 37 tests.

## Cases Covered

- Parent/child completion propagation and closed empty expansion.
- Unprepared expansion does not complete.
- Mixed initial/completion FIFO head behavior.
- Duplicate incoming slots and complete-then-delete accounting.
- Terminal omitted-slot completion and idempotent completion commit.
- Shared descendants and dependency-driven deletion despite surviving parents.
- Late dependents of tombstoned ids.
- Root deletion and returned affected references.
- Subtree disabling during an initial visit.
- Dependency and non-dependency stall details.
- Iterative 1,500-deep and 1,500-wide deletion cascades.

## Verification

- `npm test -- tests/graph-completion.test.ts tests/graph-pruning.test.ts tests/graph-readiness.test.ts`: 3 suites, 29 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Focused Prettier check and `git diff --check`: passed.
- `npm test`: 28 suites, 320 tests passed.

## Self-Review

- Confirmed storage remains the topology/tombstone owner and contains no scheduling transitions.
- Confirmed deletion computes the complete affected set before mutating storage.
- Confirmed deleted eligible entries cannot later admit a chain.
- Confirmed surviving parent slots retain their independent accounting bits after linked slots become deleted.
- Confirmed all cascade traversal is iterative and duplicate worklist entries are suppressed by the removal set.
- Confirmed the returned affected set excludes surviving parents so a command-issuing parent chain is not invalidated; those parents receive only slot-accounting updates.
- Subagent review was intentionally not used because the task explicitly prohibited subagents; this review was performed inline against the brief and K2/A08/A10.

## Assumptions

- The finalized brief and normative contracts constitute prior design approval, and the explicit no-questions instruction precludes reopening those choices.
- `GraphScheduling.prepareSlots` is the authoritative storage-plus-scheduling preparation transition. `closeExpansion` rejects an unprepared vertex, including one whose graph facade exposes the same empty slot snapshot as a prepared-empty vertex.
- `disableSubtree` closes currently pending slots and expansion but does not delete already linked descendants. Future kernel invalidation prevents disabled pending frame work from committing late outcomes.
- `getStall` returns `null` while eligible work exists. With no eligible work, dependency-blocked vertices appear under `dependencies`, while retained vertices blocked on lifecycle/expansion/children appear under `incomplete`.
- Low-level scheduling types remain deep-importable and are not added to the public root exports before the plan's export-integration task.

## Concerns

- Task 7's inherited array-backed eligible FIFO still uses `shift`, so repeated admission on extremely wide graphs remains potentially quadratic. Task 8 does not expand that scope; the existing final-review note remains applicable.
- `npm install` reports 14 audit findings in the existing dependency tree. This task changed no dependencies or lockfile content.

## Review Fix Round 1

Addressed both review findings with a shared iterative cascade path and an explicit expansion-preparation boundary.

### RED

`npm test -- tests/graph-completion.test.ts tests/graph-pruning.test.ts` failed with two expected behavioral regressions:

- A live `D` discovered before its missing dependency `X` remained live when `X` was later tombstoned because it depended on deleted `A`.
- `closeExpansion` accepted an unprepared root and admitted completion instead of rejecting the invalid transition.

A separate wished-for API RED in `tests/graph-completion.test.ts` then failed typechecking because `GraphScheduling.prepareSlots` did not exist.

### GREEN

- Extracted `deleteRefs` so explicit vertex deletion and tombstoned-ID reverse dependents use the same iterative declared-dependent and orphan-child cascade.
- Closed the rejected parent slot before cascading tombstoned-ID dependents, allowing the cascade to safely delete that parent if it is among those dependents.
- Added `GraphScheduling.prepareSlots` to atomically prepare storage slots and move scheduling from `unprepared` to `open`.
- Made `closeExpansion` throw for `unprepared` while retaining idempotent close and prepared-empty completion.

### Verification

- `npm test -- tests/graph-completion.test.ts tests/graph-pruning.test.ts tests/graph-readiness.test.ts tests/resolved-graph.test.ts`: 4 suites, 48 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Focused Prettier check and `git diff --check`: passed.
- `npm test`: 28 suites, 322 tests passed.

### Review Fix Concerns

No new concerns. The inherited FIFO and dependency-audit notes above remain unchanged.
