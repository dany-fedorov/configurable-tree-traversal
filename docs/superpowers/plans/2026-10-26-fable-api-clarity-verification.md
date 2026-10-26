# Fable API clarity local verification

Scope: unreleased checkout on `feat/general-graph-walking`, through Task 4. Package version remains **0.11.0**. These are local gates from reviewed implementation head `5843577e584e94fb4ae3ee6f2bfdd7d971cdce17`. Task 4 review is **Approved** with one Minor catalog-hydration wording finding, and whole-branch review found no Critical or Important issues. Both whole-branch Minor reference wording findings were corrected afterward. [PR 19](https://github.com/dany-fedorov/configurable-tree-traversal/pull/19) is the authority for remote CI and merge status. No npm publication occurred as of this record.

## Reviewed implementation checks

| Gate | Command / selection | Result and log |
| --- | --- | --- |
| Full repository check | `npm run check` with Node 24.20.0 and locked TypeScript 4.9.5 | Exit 0; 113/113 suites, 2,616/2,616 tests, 100% statements/branches/functions/lines, 20 examples, 16 standalone packed guide snippets, 754 packed files, 25 benchmark and 7 packaging correctness tests. `/tmp/ctt-task4-check-exact-final.log` |
| Packed Node 24 / TS 4.7.4 | `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc node scripts/verify-package.cjs` | Exit 0; `/tmp/ctt-task4-node24-ts47-exact-final.log` |
| Packed Node 22.12.0 / TS 4.9.5 | `/tmp/ctt-phase-two-node22/node_modules/node/bin/node scripts/verify-package.cjs` | Exit 0; `/tmp/ctt-task4-node22-ts49-exact-final.log` |
| Packed Node 22.12.0 / TS 4.7.4 | `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc /tmp/ctt-phase-two-node22/node_modules/node/bin/node scripts/verify-package.cjs` | Exit 0; `/tmp/ctt-task4-node22-ts47-exact-final.log` |
| Packed Bun 1.4.4 / TS 4.9.5 | `/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun scripts/verify-package.cjs` | Exit 0; `/tmp/ctt-task4-bun-ts49-exact-final.log` |
| Packed Bun 1.4.4 / TS 4.7.4 | `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc /tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun scripts/verify-package.cjs` | Exit 0; `/tmp/ctt-task4-bun-ts47-exact-final.log` |
| Bun script correctness | `/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun test scripts/build-esm.test.cjs scripts/benchmark-dag.test.cjs scripts/benchmark-dag-lifecycle.test.cjs` | Exit 0; 32/32 tests across 3 files; `/tmp/ctt-task4-bun-scripts-exact-final.log` |

The full check built once for the reviewed implementation head. The remaining five package lanes invoked `scripts/verify-package.cjs` directly against that build. Each packed lane verified shared CJS/native ESM runtime identity, strict node/node16 TypeScript `.ts`/`.cts`/`.mts` consumers, guide navigation and all 16 snippets. The first Task 4 full-check attempt failed at a standalone README snippet because `node:assert/strict` types were unavailable in the packed guide fixture (`/tmp/ctt-task4-check.log`); local checks replaced that import, and the exact-final full check and matrix passed. The original Fable review reports remain unchanged; [all 20 dispositions](../reviews/2026-10-26-fable-api-clarity-disposition.md) are recorded separately.

## Review and integration status

- Task 1 (`5fc5f99721acb4c286afe6ae4bb18aebd2036424`): independent task review found spec compliance, quality **Approved**, no findings.
- Task 2 (`b1d81735f7235880fdcc17534ecc49c73ab0ec9b`): independent task review found spec compliance, quality **Approved**, no findings.
- Task 3 (`8a7466acef3a05eba10e86d5dc57edf8d139c8f8`): independent task review found spec compliance, quality **Approved**, no findings.
- Task 4 independent review: spec compliant, quality **Approved**, with one Minor catalog-hydration wording finding corrected in the follow-up. Whole-branch review at `/tmp/ctt-fable-clarity-final-review.md`: no Critical or Important findings; its two Minor reference wording findings were corrected in the same follow-up. Its readiness verdict is conditional on required remote CI.
- The source, types, runtime and built package are unchanged by the wording follow-up; the six-lane matrix above remains implementation evidence. The corrected packed guides are checked separately below. [PR 19](https://github.com/dany-fedorov/configurable-tree-traversal/pull/19) is the external status record for required remote CI on the submitted head, merge and verified remote-main integration. The original main checkout contains unrelated local drafts and must be preserved.

## Wording follow-up

At `docs/reference.md:116`, the walking commit mode now names `afterEachVisitor`. At the catalog adapter paragraph, the text now states that only `to` and `data` are copied; extra inline hydration fields are ignored and target data comes from the catalog. This follow-up changes documentation only. `node scripts/verify-package.cjs` exited 0 against the unchanged build, checking checkout/tarball guide navigation, 16 standalone snippets and 754 packed files (`/tmp/ctt-task4-review-wording-package.log`). `git diff --check` exited 0, and the diff touched no source, type, runtime, test, example or package files. The earlier full check and six-lane matrix remain evidence for the unchanged implementation; the full check on the submitted head is a required remote gate tracked in PR 19.
