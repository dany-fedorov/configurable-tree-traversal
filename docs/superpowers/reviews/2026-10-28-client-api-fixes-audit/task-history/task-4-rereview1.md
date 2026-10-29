# Task 4 scoped re-review

**Minor finding: ADDRESSED.**

`docs/agent-workflows.md:196` now distinguishes engine-detected structural cycles returned by `prepareDag`/`prepareDagAsync` as `invalid` / `discoveryCycle` issues from direct-runner `DagDiscoveryCycleError` exceptions. It preserves the ordered closed witness and exact caller-thrown error distinctions.

**New breakage: None found.** The correction is confined to this troubleshooting row; no code, links, examples or surrounding contracts changed.

**Task quality: Approved.** No outstanding Task 4 findings.

Reviewed only `review-791d80f..e6ad10b.diff` and the appended minor-follow-up evidence in `task-4-report.md`. The report records a clean diff check. No suites, package commands or builds rerun; no source or git state modified.
