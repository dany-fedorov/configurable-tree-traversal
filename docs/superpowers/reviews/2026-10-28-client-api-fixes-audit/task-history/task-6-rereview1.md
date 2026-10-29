# Spec Compliance

✅ **Approved — both prior findings addressed.** Scoped re-review of `20acd87e4075b05af3fd6ac45cfe9eb3cf6a6080` → `7450f4061b9929a6160083667b02b805b4ec4bfc`, using `review-20acd87..7450f40.diff` and the appended fix-round-1 report.

# Prior findings

- **Important 1: ADDRESSED.** `src/core/observationFacets.ts:27` now creates a fresh frozen shallow hint snapshot for each read; `$childHints` delegates to that projection and `hasNoChildHints()` queries the backing Vertex. Canonical facade/handle caching remains unchanged. The public standalone regression at `tests/observation-facets-live.test.ts:12` covers push, same-length replacement, clearing, retained arrays, clone agreement, stable handle/facade identity, and shallow hint-element identity. It uses supported mutable Vertex/store APIs without private access or readonly-field assignment.
- **Minor 1: ADDRESSED.** `src/core/observationFacets.ts:145` explicitly copies and freezes work dependencies and present completion dependencies, preserving optional absence and opaque IDs. Sync/async tests at `tests/observation-facets-live.test.ts:64` check both arrays, write rejection, object/symbol identity, shallow ownership, and absent completion arrays. `tests/dag-completion-dependencies.test.ts:367` replaces the obsolete mutable-array expectation with frozen-array rejection while retaining declaration/summary assertions.

# New Critical / Important issues

- None found in this fix diff. Recorded-event projection is unchanged: existing events continue to wrap the recorded Vertex rather than resolving the later live ref. The fix changes mutable hint reads without changing canonical identity, payload ownership, scheduler behavior, or public types.

# Validation

- Read all three changed-file hunks once; no additional source audit, subagent, scratch execution, suite rerun, build, package run, or production/index/HEAD mutation.
- Inspected existing evidence: `task-6-fix1-focused-green.log` records 4 suites / 73 tests passing; `task-6-fix1-focused-second.log` records 3 suites / 66 tests passing; `task-6-fix1-validation-green.log` records typecheck/lint and 133 suites / 3080 tests passing, with 100% global and observationFacets coverage. No final-log warning/failure found. Package/build integration remains Task 8 as assigned.

# Assessment

**Task quality: Approved.** Both fixes are narrow, preserve the observation boundary, and have direct public behavioral regression coverage.
