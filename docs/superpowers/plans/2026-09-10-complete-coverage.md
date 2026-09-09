# Complete Coverage Implementation Plan

> Execute the independent coverage tasks in this session using the dispatching-parallel-agents skill. Preserve public APIs and test real behavior before fixing defects.

**Goal:** Reach and enforce 100% statements, branches, functions, and lines across `src/**/*.ts`.

**Architecture:** Keep the existing traversal engines and coverage instrumentation. Add deterministic public API cases for missing behavior. Simplify a redundant guard only when its invariant is established and behavior remains tested; retain compatibility helpers and runtime validation.

**Tech Stack:** TypeScript, Jest, Istanbul coverage, npm, GitHub Actions.

**Spec:** The user's request for 100% coverage, extending the synchronous API described in `docs/superpowers/specs/2026-09-10-library-completion-design.md`.

## Constraints

- Keep coverage enabled for every source file; add no ignore directives or exclusions.
- Derive expected values independently and exercise actual components.
- Reproduce any discovered bug with a failing test before fixing it.
- Preserve supported public APIs, including the older runner-state helpers.
- Continue the requested documentation, commit, push, and CI verification workflow; do not publish to npm.

## Tasks

- [x] Run the baseline coverage suite and map uncovered statements and branches to their contracts.
- [x] Cover unresolved-tree lookups, saved-reference mapping errors, and deletion boundaries in `tests/resolved-tree-coverage.test.ts`.
- [x] Cover object hooks, custom assembly, paths, and output options in `tests/object-coverage.test.ts`.
- [x] Cover traversal convenience APIs, visitor registration, commands, and runner-state bookkeeping in `tests/runner-coverage.test.ts` and `tests/runner-state.test.ts`.
- [x] Cover concurrent visitor halt/deletion/validation and recursive configuration freezing and diagnostic serialization in `tests/visitor-coverage.test.ts` and `tests/utils.test.ts`.
- [x] Inspect remaining aggregate gaps and resolve them without narrowing the coverage scope.
- [x] Set all four global thresholds in `jest.config.ts` to 100, update the testing guide and changelog, and run `npm run check`.
- [x] Review changes and record final verification.

Focused tests use separate temporary coverage directories while tasks run in parallel. Final verification uses the repository's unmodified `collectCoverageFrom: ['src/**/*.ts']` scope.

## Findings

- Added 45 tests, bringing the suite to 239 tests in 17 suites. The aggregate coverage run reports 100% in all four metrics.
- A public-method regression reproduced lost stack ranges and pruning references after DFS state injection. The constructor now preserves both supplied stores along with the existing stack and count map.
- Removed one redundant private DFS visit-entry check: the frame loop already checks membership immediately before every dispatch. Tests retain deletion, pruning, and unresolved-root behavior.
- Preserved adapter identity and path fallbacks: pre-populated resolution contexts and detached roots exercise them through public APIs. Preserved the historical JavaScript yield-helper fallback too.
- No coverage exclusions, ignore directives, instrumentation changes, or private mocks were added.
- Final `npm run check` passed: type checking, lint, all 239 tests with the 100% coverage gate, all seven examples, clean build, and packed CommonJS/ESM/strict TypeScript consumers.
- Review strengthened option-forwarding assertions to distinguish custom classification, in-order configuration, and injected state from defaults. Five deliberate regressions in an isolated temporary copy were each detected: dropping those three forwarded options, dropping stack ranges, and dropping pruning state. The unmodified isolated tests passed.

Integration: commit and push the verified changes to `origin/main`, continuing the user's requested workflow, then verify the GitHub Actions checks on Node 22 and 24. Do not publish to npm.
