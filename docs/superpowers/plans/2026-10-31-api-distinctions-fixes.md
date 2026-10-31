# Client API distinctions implementation plan

> Execute inline with the executing-plans skill. Shared cross-family contracts make concurrent source edits inappropriate; request the user-specified Claude Fable high review after integration.

**Goal:** Fix all R01–R20 findings and obtain a completed Fable high review.
**Architecture:** Apply canonical breaking renames across public contracts and their implementations. Isolate changes in presence/ownership and preserve scheduling and lifecycle semantics.
**Tech stack:** TypeScript 4.7-compatible public declarations, Jest, CJS/ESM packed consumers.
**Spec:** [Implementation design](../specs/2026-10-31-api-distinctions-design.md).

## Constraints

Preserve arbitrary ID and caller payload identity, exact thrown values, W/C versus structural boundaries, current event/callback timing and nominal local tickets. Do not weaken 100% coverage or add compatibility aliases. Current guides must describe the final API; historical reports remain evidence of the old baseline.

## Tasks

- [x] Inspect current source/review and provision managed isolated workspace; baseline public tests: 4 suites, 115 tests passed.
- [x] Write failing public regressions for copied readonly hints, explicit limit replacement, omission identity/diagnostics, expansion policy, detailed session inspection and tagged rewrite outputs. Migrate existing tests for canonical renames before production edits. Record red runs in the new audit folder.
- [x] Apply mechanical contract renames (R03/R05/R08/R17/R19/R20) in src/tests/examples/scripts/current guides. Remove aliases; use tsc diagnostics to resolve specific public-versus-internal reference roles. Run npm run typecheck and affected behavioral suites.
- [x] Implement hint input ownership/clone copy (R01/R15) in src/core/Vertex.ts, commands and facets. Tests must prove editable copies do not affect inputs while data/hint object identities remain shared.
- [x] Implement walking patches/types/endpoint vocabulary (R02/R14/R16) in GraphWalkOptions, normalizeWalkOptions, GraphWalkSource/Event/visitor/kernel. Verify original bounds survive failed atomic patches, replaceLimits deliberately removes old bounds, serial callbacks and selectors remain independent.
- [x] Implement prepared projection, cycle evidence, explicit omission identity, canonical diagnostic records and explanation kinds (R06/R10/R11/R12/R18) in DAG definition/progress/inspection/source normalization/graph store. Test known undefined versus anonymous omissions, tree metadata rejection and preserved W/C facts.
- [x] Replace leaf convenience and enrich session inspection (R07/R13). Verify skipped expansion with retained children, all-omitted/no-hint roots, sync/async controls and known chain inspection.
- [x] Implement tagged rewrite presence (R09). Test present null/undefined versus absent root, converters invoked only for present values, paused partial capture, FINISHED gate and final caching. Update public type assertions and consumers.
- [x] Update README/current guides/AGENTS and new packaged migration guide (R04 and all renames). Add packed runtime/type regression consumers. Preserve section anchors and verify relative links.
- [x] Run npm run check; repair all type/lint/coverage/example/packed/benchmark failures without lowering gates. Save final evidence and fresh API census/removal checks.
- [x] Run Claude CLI --model fable --effort high with read-only review tools against the final diff/spec/all twenty findings. Address valid findings, rerun affected checks, obtain re-review as needed.
- [x] Audit all twenty requirements against code/tests/docs and Fable terminal result. Report exact verification, workspace and remaining integration status; complete goal only when all requirements pass.
