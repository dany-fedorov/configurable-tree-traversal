# General graph walking: verification and final review

Implementation and all local gates are complete on `feat/general-graph-walking`. Published npm remains 0.11.0. The branch is committed and preserved for integration; no push, merge, or publication was performed. The original checkout and all 13 unrelated files were preserved.

See the [consumer reference](../../reference.md#general-graph-walking), [implementation plan and all 20 decisions/tradeoffs](2026-10-25-general-graph-walking.md#persisted-execution-ledger), and [library goals](../specs/2026-10-25-agent-api-roadmap.md#purpose-and-acceptance-criteria).

## Final independent review — 2026-10-26

Reviewed implementation head: `73873f67413ec780eef654a7630ae7990ff4666c`, against base `c1e5840bdf89372955feedde9d18e2214e0ea663`.

Verdict: ready for integration on local technical evidence. No Critical, Important, or Minor findings identified. All ten task reviews also passed; the two earlier iterator validation/cleanup findings were fixed and independently re-reviewed.

The reviewer independently inspected the complete production walking implementation, shared execution inspection and visitor batching changes, relevant behavioral/type regressions, packed consumers, current documentation, and recorded verification evidence. It found the API orthogonal, type-safe, idiomatic, and consistent with tree/DAG conventions where their semantics agree. Source discovery, route policies, observation selection, callbacks, predicates, and budgets remain independent. Sync and async execution share one transition kernel; ownership, backpressure, pause, terminal cleanup, cached discovery, and exact failure behavior agree with the approved design.

No unresolved concrete risk warranted another reproduction or routine suite rerun. Required remote CI, including current Node 22 source/coverage, remains unrun. This review establishes local readiness, not remote CI success or authorization to push, merge, or publish.

## Preflight evidence and resolved compatibility finding

1. Each required direct example command passed (exit 0), with complete output in `/tmp/ctt-walk-task10-context.log`, `...references.log`, `...paths.log`:

```sh
npm run tsfile -- examples/graph-walk-context-example.ts
npm run tsfile -- examples/graph-walk-references-example.ts
npm run tsfile -- examples/graph-walk-paths-example.ts
```

2. `npm run verify-examples` passed all 20 examples, `/tmp/ctt-walk-task10-examples-authorized.log`. The initial unprivileged attempt failed before executing an example with `spawnSync ... EPERM`; the identical authorized child-process rerun passed, without a source change. Original diagnostic is `/tmp/ctt-walk-task10-examples.log`.
3. Both new standalone snippets passed source preflight with `npm run tsfile -- --project tsconfig.json /tmp/ctt-walk-task10-snippet-0.ts` and `...snippet-1.ts`; logs `/tmp/ctt-walk-task10-snippet-0-project.log`, `...snippet-1-project.log`. Initial temporary-file launches omitted the explicit project and did not inherit repository aliases; their diagnostics remain in `...snippet-0.log` / `...snippet-1.log`. No guide change was needed. Final extracted-package checks below are the authoritative independent snippet evidence.
4. The first full `npm run check` passed, preserved at `/tmp/ctt-walk-task10-check-before-minimum-fixture.log`. Its following Node24/TS4.7 packed lane exposed TS4.7 contextual inference in the pre-existing Task 9 type fixture: nested `resolution.kind` from an async generator widened to string instead of the literal omitted tag. Runtime consumers had passed. Diagnostic: `/tmp/ctt-walk-task10-node24-ts474-red.log`.
5. Controller authorized the narrow correction. The sole verification change is `kind: 'omitted' as const` at `scripts/package-consumers/graph-walk.ts:70`; no any, production change or negative-assertion weakening. Focused strict TS4.7.4 compilation of the complete walking fixture against built public declarations passed, `/tmp/ctt-walk-task10-minimum-fixture-green.log`. The final full check and entire matrix below then passed on the corrected fixture. The first gate was not reused to claim final-tree verification.

## Final stable full gate

```sh
npm run check
```

PASS, exit 0. Complete final output: `/tmp/ctt-walk-task10-check.log`.

- Typecheck and lint passed.
- 113 source suites / 2,470 tests passed; statements, branches, functions and lines all 100%.
- All 20 executable examples passed.
- Clean final build and extracted packed runtime/type consumers passed: strict node/node16 `.ts`/`.cts`/`.mts`, root/namespace/subpath CJS/ESM and declaration identity, old consumers and all 750 packed files/deep imports.
- Checkout/tarball guide navigation and all 16 complete standalone snippets passed.
- All 25 Node benchmark and 7 facade-generator correctness tests passed.
- No consumer/example/runtime or fixture edits followed this gate. Only repository-only roadmap/design/plan status/evidence records changed afterward; a final local link/anchor/ruling/hash audit passed, `/tmp/ctt-walk-task10-final-audit.log`.

There were two full checks in total: the first passed before the minimum-compiler fixture finding; the final stable gate above passed after the literal correction. Its build was reused for all five remaining successful packed lanes sequentially, without another build or redundant Node24/locked lane.

## Exact toolchain and final 3 × 2 packed matrix

All documented binaries existed; none was installed or modified. Complete version output is `/tmp/ctt-walk-task10-versions.log`. Exact version checks (all exit 0):

```sh
node --version
/tmp/ctt-phase-two-node22/node_modules/node/bin/node --version
/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun --version
node node_modules/typescript/bin/tsc --version
node /tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc --version
/tmp/ctt-phase-two-node22/node_modules/node/bin/node node_modules/typescript/bin/tsc --version
/tmp/ctt-phase-two-node22/node_modules/node/bin/node /tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc --version
/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun node_modules/typescript/bin/tsc --version
/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun /tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc --version
```

Observed runtimes: Node v24.20.0, Node v22.12.0, Bun 1.4.4. Locked compiler Version 4.9.5 and isolated minimum Version 4.7.4 were confirmed through each runtime. `CTT_TYPESCRIPT_COMPILER` was unset for locked lanes.

| Runtime | TS4.9.5 | TS4.7.4 |
| --- | --- | --- |
| Node v24.20.0 | PASS, full check | PASS, direct packed verifier |
| Node v22.12.0 | PASS, direct packed verifier | PASS, direct packed verifier |
| Bun 1.4.4 | PASS, direct packed verifier | PASS, direct packed verifier |

Every packed lane confirmed runtime contracts/identity, strict type fixtures, sixteen standalone snippets/navigation and 750 packed files. The five remaining lanes and Bun correctness commands/results/logs are recorded exactly below (machine-readable manifest `/tmp/ctt-walk-task10-matrix.json`):

- Exit 0: `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc node scripts/verify-package.cjs`
  Complete log: `/tmp/ctt-walk-task10-node24-ts474.log`.
- Exit 0: `/tmp/ctt-phase-two-node22/node_modules/node/bin/node scripts/verify-package.cjs`
  Complete log: `/tmp/ctt-walk-task10-node22-ts495.log`.
- Exit 0: `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc /tmp/ctt-phase-two-node22/node_modules/node/bin/node scripts/verify-package.cjs`
  Complete log: `/tmp/ctt-walk-task10-node22-ts474.log`.
- Exit 0: `/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun scripts/verify-package.cjs`
  Complete log: `/tmp/ctt-walk-task10-bun-ts495.log`.
- Exit 0: `CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc /tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun scripts/verify-package.cjs`
  Complete log: `/tmp/ctt-walk-task10-bun-ts474.log`.
- Exit 0: `/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun test scripts/build-esm.test.cjs scripts/benchmark-dag.test.cjs scripts/benchmark-dag-lifecycle.test.cjs`
  Complete log: `/tmp/ctt-walk-task10-bun-script-correctness.log`.

Bun script correctness passed 32 tests / 0 failures across the three facade/benchmark files. All subprocesses used the selected runtime via the existing verifier's `process.execPath`; the compiler override changed only the isolated compiler path. No source-import shortcut or weakened compiler flags replaced packed verification.


## Evidence integrity

Log SHA-256 values:

- `/tmp/ctt-walk-task10-check.log`: `36b4e3cf0eef9879bb1ccd472aa8f408e69864bd88a8ddfc96a863f6917eaa0d`
- `/tmp/ctt-walk-task10-matrix.json`: `a3157b224067977ccdf584bb694f00821eee29f2971f86e5b8d78c3c56e20b3b`
- `/tmp/ctt-walk-task10-final-audit.log`: `c9299bf8f49025035177eb088b4c1f2ce03852e12bb722859d8639878307157c`
