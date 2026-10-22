# Native ESM entries and Bun compatibility design

Approved scope: native ESM alongside CJS and pinned Bun CI, preserving CTT identity and historical imports. Primary-source evidence is docs/research/2026-10-22-ctt-esm-bun.md. This follows the performance and graph-extension stages and must cover their final public exports.

## Architecture decision

Generate native .mjs entry facades over the existing single CommonJS implementation. Do this for every emitted .js module so root, named subpaths and historical deep paths all have a valid import target. CommonJS require targets stay at existing dist/*.js paths. The facade imports that module's CJS default object, exports its actual named runtime values as static references and preserves the default module object. It creates no replacement classes, symbols, namespace objects or module-global state. This is native ESM entry output backed by CJS, not a separate ESM implementation, a fully ESM dependency graph, or a tree-shaking/browser support promise.

A second independently compiled implementation was rejected because it duplicates constructors, DEFER_READY and singleton state. Changing the canonical implementation to ESM and rebuilding old CJS paths was rejected for this compatibility stage because it would make historical synchronous require depend on newer loader behavior. Node's documented shared-implementation wrapper approach fits this existing package.

## Build and exports

Add scripts/build-esm.cjs after tsc and alias replacement. Walk emitted .js files deterministically, inspect each module's actual export names, omit internal __esModule, retain the default object and generate named exports for all remaining names except default. Validate supported identifier names and fail explicitly rather than dropping exports. Each .mjs imports its sibling .js. Each companion .d.mts uses `export * from './name.js'; import cjs = require('./name.js'); export default cjs;` so CJS and ESM share canonical class/private-member/unique-symbol declaration identity. Do not copy declarations into a second nominal type graph.

For every existing root/named/wildcard exports mapping use an import branch with types first (.d.mts) then default (.mjs), a require branch with types first (.d.ts) then default (.js), and final legacy default(.js). Keep package.json export unchanged, top-level main/types and typesVersions for legacy resolution. Historical paths with and without explicit .js must continue working. Existing package file allowlist includes dist, so generated facades must be included and validated. No dependencies or lockfiles change for this design.

## Runtime/type consumers

Existing packed CJS/ESM/node/node16 consumers remain. Add same-process imports/requires from root, named DAG/core subpaths and historical Vertex/runner deep paths with and without .js. Assert import.meta.resolve selects .mjs and require.resolve selects .js, default-object identity and named export parity, class/function equality, instanceof, and exact DEFER_READY identity. Return an ESM-loaded sentinel through a CJS-created runner and vice versa; include completion prerequisites and prerequisite lookup once merged. Type-only exports must remain consumable from .mts/.cts and old .ts resolution modes.

Add real .mts consumers compiled with module/moduleResolution Node16 and mixed `import cjs = require('configurable-tree-traversal')`. Assign symbols/classes/instance types across declaration branches to catch nominal splits. Retain TS4.7 syntax compatibility and test an isolated4.7.4 compiler explicitly in addition to the installed lock compiler before promising the minimum. Compiler installation belongs in /tmp and must not mutate repo dependencies.

## Bun

Pin oven-sh/setup-bun@v2 with bun-version:'1.4.4', verified from the official release on2026-10-22. Keep Node22/24 full-check jobs. The Bun job installs locked dependencies with npm ci using Node24, builds through the existing build command, then explicitly runs `bun scripts/verify-package.cjs` so consumer subprocesses use Bun process.execPath. Also execute script correctness/lifecycle checks under Bun where supported; distinguish Node gate checks from actual Bun consumer execution. Do not replace Jest or claim that bun run check's nested npm/node scripts prove Bun execution. No Bun lockfile migration.

For local validation use the isolated checksum-verified binary /tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun. Existing global Bun remains unchanged. Record exact Node/Bun/compiler versions and commands in docs/testing.md and the task report. If a runtime incompatibility is found, diagnose and fix the minimal compatibility issue, not silently skip the Bun job or lower source coverage.

## Gates

Meaningful failing packed-resolution/mixed-identity/type cases before build changes; after implementation all existing/full checks and100%source coverage, actual Bun1.4.4 packed consumers, mixed compiler consumers and Node22/24+Bun CI must pass. Independent review and merge. README/package docs describe exactly the shared CJS-backed ESM architecture. Update Unreleased changelog, no new npm publication in this stage.
