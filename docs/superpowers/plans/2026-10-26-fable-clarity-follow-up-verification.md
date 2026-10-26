# Fable clarity follow-up local verification

Scope: unreleased follow-up on `feat/general-graph-walking`, package version **0.11.0** unchanged. All commands below ran from `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`, with `login:false`. No npm publication, push or merge was performed by Task 3. [PR 19](https://github.com/dany-fedorov/configurable-tree-traversal/pull/19) is the external authority for final-head remote CI and integration.

## Exact tested content

Validation ran with HEAD `c86ca539f03d75d7a5898fe9eb787c3d3675ab75` plus Task 3's documentation, JSDoc and inspection-example diff. The complete tracked worktree snapshot before this evidence-only ledger was added is Git tree **`d6889128e50686edadd3da0913b560cadaa98876`**, captured through a temporary index (`git read-tree HEAD`, `git add -u`, `git write-tree`). It includes all Task 1/2 source changes and final current-guide wording. The temporary index did not alter the real index. This ledger is the only tracked file added after that tested snapshot; the ignored SDD report is not package input. The committed result will therefore have a different tree solely because it includes this evidence ledger. Controller review and CI must use the submitted commit head.

Runtime/compiler versions confirmed locally: Node **24.20.0** (default), Node **22.12.0**, Bun **1.4.4**, locked TypeScript **4.9.5**, alternate TypeScript **4.7.4**. The full check built once; the remaining five package lanes invoked `scripts/verify-package.cjs` directly and sequentially against that same build. No source, type, example or current consumer-guide edits followed validation. Coverage thresholds were not changed, and no coverage regressions required additional tests.

## Checks and retained logs

| Gate | Exact command | Result / local retained evidence |
| --- | --- | --- |
| Full check; Node 24 / TS 4.9.5 packed lane | `npm run check` | Exit 0; 114/114 suites, 2,699/2,699 tests, 100% statements/branches/functions/lines; 20 examples; build and packed CJS/ESM/runtime/type identity, 16 standalone snippets and 762 files; 25 benchmark and 7 packaging correctness tests. `/tmp/ctt-followup3-check.log` / `/tmp/ctt-followup3-check.exit` |
| Changed inspection example | `npm run tsfile -- examples/dag-inspection-example.ts` | Exit 0; method/free-function equivalence, retained snapshots and post-settlement query assertions passed. `/tmp/ctt-followup3-example.log` |
| node24-ts47 | `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc node scripts/verify-package.cjs` | Exit 0; packed runtime/type consumers, guide navigation and 16 snippets; 762 files. `/tmp/ctt-followup3-node24-ts47.log` / `/tmp/ctt-followup3-node24-ts47.exit` |
| node22-ts49 | `/tmp/ctt-phase-two-node22/node_modules/node/bin/node scripts/verify-package.cjs` | Exit 0; packed runtime/type consumers, guide navigation and 16 snippets; 762 files. `/tmp/ctt-followup3-node22-ts49.log` / `/tmp/ctt-followup3-node22-ts49.exit` |
| node22-ts47 | `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc /tmp/ctt-phase-two-node22/node_modules/node/bin/node scripts/verify-package.cjs` | Exit 0; packed runtime/type consumers, guide navigation and 16 snippets; 762 files. `/tmp/ctt-followup3-node22-ts47.log` / `/tmp/ctt-followup3-node22-ts47.exit` |
| bun-ts49 | `/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun scripts/verify-package.cjs` | Exit 0; packed runtime/type consumers, guide navigation and 16 snippets; 762 files. `/tmp/ctt-followup3-bun-ts49.log` / `/tmp/ctt-followup3-bun-ts49.exit` |
| bun-ts47 | `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc /tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun scripts/verify-package.cjs` | Exit 0; packed runtime/type consumers, guide navigation and 16 snippets; 762 files. `/tmp/ctt-followup3-bun-ts47.log` / `/tmp/ctt-followup3-bun-ts47.exit` |
| Supplemental documentation links | `node /tmp/ctt-followup3-links.cjs` | Exit 0; 96 relative links/anchors across 6 changed documentation files. `/tmp/ctt-followup3-links.log` / `/tmp/ctt-followup3-links.exit` |
| bun-scripts | `/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun test scripts/build-esm.test.cjs scripts/benchmark-dag.test.cjs scripts/benchmark-dag-lifecycle.test.cjs` | Exit 0; 32/32 tests across 3 files. `/tmp/ctt-followup3-bun-scripts.log` / `/tmp/ctt-followup3-bun-scripts.exit` |

Each packed lane checks the actual tarball, shared root/subpath CJS/native ESM constructors, strict node/node16 `.ts`/`.cts`/`.mts` consumers, historical deep imports, checkout/tarball guide navigation, and all 16 snippets. Machine-readable lane commands, compiler override paths and exit codes are retained in `/tmp/ctt-followup3-matrix.json`. The changed example's exit 0 was observed directly in its shell invocation; unlike the full check and matrix, that invocation did not write a separate exit-code file. Supplemental relative-link/anchor validation includes the assessment and this ledger; `git diff --check` also passed.

The supplemental checker uses the same heading-anchor normalization as the package verifier and checks changed guides, changelog, assessment and this ledger.

Log SHA-256 fingerprints (local logs remain at the paths above):

```text
4e9c507f6f01338848d7b361ec7df2c20e66cd32e7f765ce85348c04642a4822  /tmp/ctt-followup3-links.log
a1167f203cfc0a4a85220d36474f20e49867c033a64138f35934b665285e2490  /tmp/ctt-followup3-check.log
474bddfa44d69b6a3942ce418ff771885ba80503cff18c66183c0197e619ead6  /tmp/ctt-followup3-example.log
2c94f39ce862b9a4adb35fd78231c3086f7acc37cec8bc5a5d56cdb2894c7eac  /tmp/ctt-followup3-node24-ts47.log
f72214eab646aee0ec7b29e9376ee02dd31dfaf5bfef2d0e1d3805b4fb953ff0  /tmp/ctt-followup3-node22-ts49.log
f72214eab646aee0ec7b29e9376ee02dd31dfaf5bfef2d0e1d3805b4fb953ff0  /tmp/ctt-followup3-node22-ts47.log
164014004e0bc2d14df7f23ff8cdfb2c5483069d32c85637c63050086aafb864  /tmp/ctt-followup3-bun-ts49.log
164014004e0bc2d14df7f23ff8cdfb2c5483069d32c85637c63050086aafb864  /tmp/ctt-followup3-bun-ts47.log
362cce4abf3dfdf4c9a3a4a822587beab0811c9fcbe7aeca89266bea177f7eef  /tmp/ctt-followup3-bun-scripts.log
```

## Review and integration status at evidence capture

- Follow-up Task 1 (`ec76142`): independent spec/quality review **Approved**, no findings (`/tmp/ctt-clarity-followup-1-review.md`). Focused implementation evidence is in the ignored SDD Task 1 report; this full check and matrix cover the resulting integration.
- Follow-up Task 2 (`2413771`): initial review found one Important ordinary-property copy-order issue. Fix `c86ca53` restored descriptor/read sequencing and received scoped re-review **Approved**, no introduced breakage found (`/tmp/ctt-clarity-followup-2-rereview.md`). Its report records 6 red regressions, 68 green source-patch cases, then 559 focused tests with 100% changed-module coverage.
- Follow-up Task 3: self-reviewed; independent task review and whole-branch review are still pending/controller-owned at this capture. Local validation is complete, but this record does not assert future review approval, required remote CI or merge.
- The [13 finding dispositions](../reviews/2026-10-26-api-clarity-fable-rereview-assessment.md) record implemented contracts and deliberate deferrals. The original raw Fable review/re-review reports remain unchanged. The source configure guard was verified at tag v0.11.0, so its relaxation is documented as a bug fix to published behavior.
- Controller owns final independent reviews, PR description/push, passing CI on the submitted head, guarded merge, remote-main ancestry/tree proof, and the original main draft-manifest preservation audit. The original dirty main and externally managed worktrees were not modified by this task.
