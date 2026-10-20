# DAG 0.8.0 Release Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile local main with GitHub, verify and publish the completed DAG walker as 0.8.0, and prioritize the repository issue backlog.

**Architecture:** Preserve the merged shared traversal kernel and its six synchronous/asynchronous traversal families. Limit release changes to merge resolution, release metadata, and any demonstrated release blockers. Treat workflow-coordinator additions as subsequent work requiring separate designs.

**Tech Stack:** TypeScript, CommonJS with ESM consumer interoperability, npm, Jest, GitHub Actions on Node 22 and 24.

**Spec:** User request to inspect main/conflicts, release the completed DAG walker, and review GitHub issues; existing contracts in `docs/superpowers/specs/2026-09-12-unified-graph-core-contracts.md` and release scope in `CHANGELOG.md` on origin/main.

## Verified evidence (2026-10-21)

- Fetched origin and tags. Local main is `6896a6c`, one commit ahead and 46 behind `origin/main` at `e614137`. Working tree was clean before this plan.
- The local-only commit changes the package description. A non-checkout merge preview found one conflict, in `package.json`, involving version and description.
- [PR #1](https://github.com/dany-fedorov/configurable-tree-traversal/pull/1) merged the graph core, sync/async DAG traversal, async DFS/BFS, exports, tests, examples, and 0.8.0 metadata on September 13. Its description explicitly excludes publication.
- [Main CI](https://github.com/dany-fedorov/configurable-tree-traversal/actions/runs/34776041570) succeeded. PR verification reports 47 suites, 612 tests, full coverage, nine examples, and packed consumer checks. These are historical results, not a fresh local verification.
- npm reports latest 0.7.0, with no 0.8.0 publication. No Git tags or GitHub releases exist.
- There is one open issue, [#2](https://github.com/dany-fedorov/configurable-tree-traversal/issues/2), no closed issues, and no open PRs.

## Constraints

- Preserve the local package description and remote 0.8.0 implementation, exports, type mappings, and lockfile version.
- Preserve history; no hard reset or force push is needed.
- Require the existing 100% statement, branch, function, and line coverage thresholds.
- Verify both the final source revision and its packed consumer surface before publication.
- npm authentication returned E401 during execution; user action (`npm login`) is required before publication.
- Execution authorized after planning: publish the DAG walker, then pause before making changes for issue #2. Issue triage below is deferred to that next phase.

## Task 1: Reconcile main

**Files:** Resolve `package.json`; retain incoming implementation and `package-lock.json` changes; preserve this plan.

- [x] Recheck status and refresh origin before executing. Save the current local commit with a backup branch before merging.
- [x] Merge `origin/main` into local `main`, preserving both histories.
- [x] Resolve the package conflict with `version: "0.8.0"` and the existing local description: `Walk trees and DAGs your way: DFS or BFS, pre/in/post-order, prune, pause, resume. No recursion, no stack overflows.` Retain every incoming export and type mapping.
- [ ] Confirm `package-lock.json` root/package versions are 0.8.0, no conflict markers remain, and `git diff --check` succeeds. Commit the resolved merge.

## Task 2: Validate the release candidate

**Files inspected:** `src/traversals/dag-traversal/`, `src/index.ts`, `tests/dag-traversal.test.ts`, `tests/graph-readiness.test.ts`, `tests/async-dag.test.ts`, `tests/async-dag-lifecycle.test.ts`, `examples/dag-workflow-example.ts`, `scripts/verify-package.cjs`, `.github/workflows/ci.yml`.

- [x] Run `npm ci` and `npm run check` on the reconciled checkout. This covers types, lint, full coverage, examples, clean build, and packed CommonJS/ESM/TypeScript consumers.
- [x] Confirm existing tests assert shared-vertex deduplication, dependency ordering and stalls, bounded async concurrency, failure behavior, halt/resume, and public DAG imports. Add a focused regression only if inspection exposes a missing release-critical assertion or failure.
- [ ] If verification fails, diagnose the failure and fix the demonstrated blocker before continuing; rerun affected checks and the complete release gate after changes.
- [x] Review the final diff and ensure no unrelated coordinator features enter this release.

## Task 3: Prepare and publish 0.8.0

**Files:** `CHANGELOG.md`, `package.json`, `package-lock.json`; generated npm tarball. Remote artifacts: main commit, `v0.8.0` tag, npm version, GitHub release.

- [x] Correct the 0.8.0 changelog date to the actual publication date. Retain the existing feature summary and documented exclusions.
- [ ] Verify npm identity with `npm whoami` and confirm package publish access without exposing credentials. Recheck that version 0.8.0 and tag `v0.8.0` are still unused.
- [ ] Commit release metadata, push main normally, and wait for both Node 22 and 24 CI checks on that exact revision to pass.
- [ ] Build and pack that revision; inspect the tarball manifest and verify it contains DAG JavaScript, declarations, README, changelog, and existing compatibility entry points. Use `npm publish --dry-run <tarball>` to inspect publication metadata.
- [ ] Publish the reviewed tarball with `npm publish <tarball> --access public`. Complete any required authentication through the supported interactive flow; do not request credentials in chat.
- [ ] After confirming npm publication, create and push annotated tag `v0.8.0` at the verified release commit and create the matching GitHub release from the reviewed changelog notes.
- [ ] Confirm npm latest resolves to 0.8.0, install that exact version in a fresh temporary consumer, and smoke-test root/subpath imports and sync/async diamond DAG traversal. Verify the GitHub release targets the same commit.
- [ ] If publication succeeds but a subsequent step fails, resume from the missing tag/release/verification step; do not attempt to republish the immutable npm version.

## Deferred after release checkpoint: Triage issue #2 into follow-up work

**Input:** Workflow coordinator gap analysis in issue #2. **Output:** Prioritized follow-up proposal; no automatic issue closure or public comment is implied by reviewing issues.

- [ ] Mark publication as addressed in the user-facing report only after npm and GitHub verification. Keep issue #2 open because its other requested capabilities remain outstanding.
- [ ] Propose small next increments: structured stall diagnostics, then ready-vertex priority. Define per-vertex failure policies separately because they change runner semantics and affect retry/dependency behavior.
- [ ] Design durable execution as its own project: serializable identity and state, journal/replay ordering, idempotency around crash windows, external waits, cancellation, retries, timeouts, and host/store boundaries. A request-id journal alone does not establish crash-safe exactly-once external effects.
- [ ] Group subtree-completion dependencies, prerequisite resolution, and dependent outputs as later graph API work. Track native ESM, uuid removal, Bun CI, and DAG performance measurements separately from release correctness.
- [ ] Present proposed issue breakdown and priorities to the user. Creating/editing/commenting on GitHub issues is a separate action from this requested inspection.

## Completion evidence

- Updated local/remote main retaining the local description and DAG implementation.
- Fresh successful verification and CI for the released revision.
- npm 0.8.0 available and successfully consumed from a clean temporary project.
- Matching `v0.8.0` Git tag and GitHub release.
- Issue #2 triage reported with publication distinguished from future coordinator capabilities.

## Execution evidence

- Fresh `npm ci` and `npm run check` completed successfully on Node 24.20.0: 47 suites, 612 tests, 100% coverage in all four metrics, nine examples, and 244-file packed consumer verification. Log: `/tmp/ctt-release-check.log`.
- Read-only release review found no code or packaging blocker; only the package description and release date differ from origin/main.
- Release authentication, remote CI, publication, tag/release creation, and registry-installed consumer verification remain release gates. Pause after publication and verification, before issue #2 implementation.
