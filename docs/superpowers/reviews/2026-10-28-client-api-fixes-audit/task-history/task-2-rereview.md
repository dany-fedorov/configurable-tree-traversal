### Scoped re-review: e7092bd2404bf2d8797ba68aa96292cbc093b977

- **ADDRESSED** — `docs/migration-idiomatic-api.md:116` now correctly requires a non-null object `patch` for object `kind: 'rewrite'` operations and distinguishes generic replacement `value`.
- **New breakage:** None found in the supplied one-sentence diff. No links, examples or production code changed.
- **Evidence:** Read `review-3c00835..e7092bd.diff` and the appended “Approved review follow-up” in `task-2-report.md`; the latter records a clean `git diff --check`. No suite/build/package checks rerun.
- **Assessment:** Approved; the sole original Minor finding is resolved.
