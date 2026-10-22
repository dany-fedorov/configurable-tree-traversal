# CTT native ESM and Bun implementation plan

> **For agentic workers:** Use subagent-driven-development with a task review and final branch review. Parent owns push/merge. Stage only explicit product files, never ignored scratch reports.

**Goal:** Supply native ESM entries with preserved CJS identity and validate the published package shape under Bun1.4.4.

**Architecture:** Generate .mjs/.d.mts facades sharing the existing CommonJS runtime and canonical declarations; extend conditional exports and mixed consumers, then add a pinned runtime CI lane.

**Tech Stack:** Existing TypeScript4.7-compatible declarations, CommonJS build, Node22/24, Bun1.4.4, GitHub Actions.

**Spec:** docs/superpowers/specs/2026-10-22-ctt-esm-bun-design.md

## Global Constraints

- Preserve all runtime exports, class/symbol identity, six traversal families and historical deep imports; no duplicated independently compiled implementation.
- No dependency/lockfile changes or package-version bump. ESM facades share existing CJS implementation, documented honestly.
- Preserve100%source coverage, Node22/24 gate and TypeScript node/node16 consumers; add actual .mts/mixed-format typing.
- Pin Bun1.4.4 and execute consumers with Bun process.execPath; no claim based solely on bun run check.
- Never force-add ignored evidence, profiles or local tooling. Keep local compiler/Bun installs under/tmp.

### Task 1: Native ESM facades, mixed consumers and Bun CI

**Files:** scripts/build-esm.cjs; package.json; scripts/verify-package.cjs; optional focused generator tests/scripts if packed tests do not cover a concrete risk; .github/workflows/ci.yml; README.md,docs/testing.md,CHANGELOG.md.

**Interfaces:** Every emitted dist/name.js gains dist/name.mjs and dist/name.d.mts. Conditional import targets native facades, require targets unchanged CJS. Types re-export canonical declarations. Runtime identity remains exact across import/require and all public entry points.

- [ ] RED: extend packed consumer checks so import.meta.resolve(root/DAG/core/deep Vertex paths) ends.mjs while require.resolve ends.js. Load both formats in one process, assert named/default export parity and cross-loader class/sentinel equality. Existing build must fail the native-resolution assertion. Add a real .mts type consumer assigning DEFER_READY and class instances across import/require; retain .ts/legacy node resolution cases.
- [ ] Implement deterministic facade generation after alias replacement. Example module content: `import { createRequire } from 'node:module'; const cjs = createRequire(import.meta.url)('./index.js'); export default cjs; const value0 = cjs.DagTraversal; export { value0 as DagTraversal };` for every actual runtime export; skip __esModule/default named slot. Obtain the canonical module object through Node-compatible createRequire: Bun unwraps an own default export on a normal CJS default import. Validate names rather than silently omit. Companion declarations re-export './index.js' and default canonical import-equals namespace. Generated files remain in ignored dist.
- [ ] Update every existing export branch including wildcard extension variants. Example: `{ import: { types:'./dist/index.d.mts', default:'./dist/index.mjs' }, require: { types:'./dist/index.d.ts', default:'./dist/index.js' }, default:'./dist/index.js' }`. Preserve package.json export, main/types/typesVersions and dependencies. Verify all referenced facades are packed.
- [ ] Exercise cross-loader behavior: ESM DEFER_READY used in CJS runner and reverse, instanceof and namespace-reference equality, sync/async seed+settlement, completion prerequisites and resolver hook. Negative typing should reject promise-returning sync callbacks and preserve existing sentinel restrictions. Add no new runtime feature here.
- [ ] Add Bun CI with setup-node24, setup-bun@v2/bun-version1.4.4, npm ci, npm run build, explicit `bun scripts/verify-package.cjs` and appropriate script correctness checks. Preserve Node22/24 full npm run check jobs. Use local checksum-verified Bun path provided by parent; verify process runtime and packed consumers.
- [ ] Check TypeScript4.7.4 explicitly using isolated /tmp installation, plus current locked compiler; do not change dependency locks. If existing minimum-version constraints expose unrelated incompatibility, report concrete evidence before adjusting promises or scope.
- [ ] Update docs with exact ESM shared-core model, mixed identity guarantee and Bun support/test scope; Unreleased changelog. Focused packed tests during iteration, then frozen full npm run check and pinned Bun checks, git diff --check. Commit explicit files and write ignored report with RED/GREEN commands/results and versions. Parent performs independent review, pushes and merges after Node22/24+Bun CI.

**Deliverable:** Compatible dual entry packaging and a real pinned Bun compatibility lane, without duplicated library identity.
