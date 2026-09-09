# Library Completion Implementation Plan

> Execute tasks in this session, retaining changes in the user's workspace. Use failing regression tests before behavior fixes.

**Goal:** Deliver a tested, documented, consumable synchronous traversal library with breadth-first traversal.

**Architecture:** Keep adapter and vertex contracts. Replace fragile depth-first bookkeeping with explicit frames and extract reusable visitor execution for both traversal strategies. Resolved-tree ownership and object-adapter cycle detection remain independent of traversal order.

**Tech Stack:** TypeScript, Jest, npm, CommonJS.

**Spec:** `docs/superpowers/specs/2026-09-10-library-completion-design.md`

## Global constraints

- Preserve existing namespace and deep imports.
- Preserve synchronous visitor contracts and deferred concurrent commands.
- No npm publishing as part of this work; commit and push to the existing upstream as requested in the follow-up.
- Keep arbitrary vertex data shallowly shared; isolate resolved topology.

## Tasks

- [x] Establish baseline (`npm ci`, `npm run build`, `npm test -- --runInBand`); configure Jest path mapping and add real regression tests in `tests/*.test.ts`.
- [x] Fix core ownership in `src/core/Vertex.ts`, `src/core/ResolvedTree.ts`, and the resolved-tree container. Assert null/undefined rewrites, deleted roots/subtrees, and original-tree paths.
- [x] Repair depth-first execution and visitor scheduling. Assert exact order sequences, null hints, sorted hints, independent iteration, halt/resume, pruning, repeated hint rewrites, visitor indices, and a 20,000-node chain.
- [x] Finish object traversal and rewriting. Assert cycle errors, shared references, symbols, sparse arrays, primitive roots, root deletion, and nested reconstruction without modifying input.
- [x] Add `src/traversals/breadth-first-traversal/` using shared visitor execution. Assert level order, lazy resolution, sorting, filters, mutations, original-tree preservation, and resumption.
- [x] Complete public exports and package metadata, add reproducible verification scripts and CI, and refresh README and examples.
- [x] Run tests, type checking, build, all examples, and installed-tarball consumer checks. Review the final diff and resolve remaining correctness findings.

## Verification results

Initial implementation verification:

- `npm run check`: passed; 74 tests in six suites, TypeScript, ESLint, clean build, and packed CommonJS/ESM/TypeScript consumers.
- All seven `examples/*.ts` programs: passed with type checking enabled.
- Deep and wide traversal benchmark: completed for both strategies with 50,000 vertices per tree.
- Build watcher: initial compiled build and path replacement verified.
- `npm pack --dry-run`: 138 files; source/tests excluded; README, changelog, license, compiled code and declarations included.
- Independent review findings on concurrent chain state, equal-priority registration, and shared default arrays: reproduced and fixed with regression tests.
- No package was published.

## Follow-up: expanded automation and push

- [x] Compare seeded generated trees with an independent reference walker across depth-first orders, breadth-first traversal, and pruning.
- [x] Reproduce and fix terminal error handling, original thrown-value replay, iterator ownership, and configuration isolation; retain consumer-error resumption.
- [x] Cover saved-tree updates, reference identity, path options, structural isolation, custom object assembly, and rewrite output snapshots with public API regressions.
- [x] Add compile-time public API checks, automatic execution of all examples, strict packed consumers, and enforced coverage minimums to `npm run check`.
- [x] Update README, changelog, and the testing guide to describe the tested contracts.
- [x] Run the final complete check and resolve review findings.

Final follow-up verification:

- `npm run check`: passed, including 194 tests in 11 suites, all seven examples, type checking, lint, clean build, and packed CommonJS/ESM/strict TypeScript consumers.
- Coverage across all source: 94.09% statements, 87.05% branches, 95.83% functions, and 94.49% lines; enforced minimums are 90%, 85%, 90%, and 90%, respectively.
- Packed artifact: 141 files, including the testing guide linked from README; source and tests excluded.
- Independent final review confirmed failure handling, configuration isolation, and documentation consistency. Exported-default corruption findings were reproduced and repaired with regressions.

Integration: commit the verified changes and push the existing `main` branch to `origin/main`, as explicitly requested. Check the resulting GitHub Actions run on Node 22 and 24. No npm publication is included.
