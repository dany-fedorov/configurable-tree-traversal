# Final benchmark version assertion fix

- Changed `scripts/benchmark-dag.test.cjs`: the default artifact version assertion now reads `require('../package.json').version` instead of hardcoding `0.9.0`.
- Historical baseline/provenance version was left unchanged.
- Verification: `npm run test:benchmark` — 9 checks passed, 0 failed.
- Verification: `git diff --check` — passed with no output.
- Commit: `Use package version in benchmark assertion` (recorded in the final commit).
