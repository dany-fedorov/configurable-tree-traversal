# CTT native ESM entries and pinned Bun CI

Research date: 2026-10-22. Scope: packaging and verification recommendations only; no implementation changes or runtime-support claims.

## Recommendation

Keep the existing CommonJS implementation and historical paths. Add native `.mjs` entry facades that explicitly export references from those same CommonJS modules, plus `.d.mts` declaration facades that re-export the existing declaration identities. Add a dedicated Bun CI job pinned to **1.4.4**, while retaining the Node 22/24 jobs. The sections below distinguish official behavior, repository observations, and proposed changes.

## Repository observations

Sources inspected: [package.json](../../package.json), [tsconfig.json](../../tsconfig.json), [tsconfig.build.json](../../tsconfig.build.json), [tsconfig.paths.json](../../tsconfig.paths.json), [verify-package.cjs](../../scripts/verify-package.cjs), and the existing CI workflow.

- `type` is `commonjs`; `main` and `types` point to `dist/index.js` and `dist/index.d.ts`. The inherited build config emits CommonJS with declarations, then `tsconfig-replace-paths` rewrites aliases.
- Exports include the root, six named subpath entries, `package.json`, and `./*.js` / `./*` deep-import patterns. Every runtime branch currently targets CommonJS.
- The packed consumer verifier already extracts an npm tarball into an isolated consumer directory, runs `.cjs` and `.mjs` consumers, checks many public/deep-path identities, and compiles a `.ts` consumer in `node` and `node16` modes. Its consumer package has `type: commonjs`, so both TypeScript cases currently exercise a CommonJS consumer. Successful `.mjs` execution currently proves CJS interoperability, not a native ESM entry.
- `DEFER_READY` is a module-created `Symbol('DEFER_READY')` declared as `unique symbol` in [DagProgress.ts](../../src/traversals/dag-traversal/lib/DagProgress.ts). Traversal classes have private members. Duplicate runtime and declaration identities therefore matter.
- Existing CI uses `npm ci` and `npm run check` on Node 22 and 24. On this research worker, Node reports `v24.20.0`, Bun `1.4.2`, and the installed compiler `4.9.5`. The manifest's `^4.7.4` range is not evidence that TypeScript 4.7.4 itself was tested.

## Runtime packaging

Node 22 and 24 distinguish `.mjs` as ESM even inside a CommonJS package. Their conditional exports select `import` versus `require`, process conditions in object order, and expect `default` last. Patterns perform literal replacement, including nested path separators. Keep every existing subpath and extension variant when adding branches. [Node 22 package documentation](https://nodejs.org/download/release/latest-v22.x/docs/api/packages.html#conditional-exports), [Node 24.20 package documentation](https://nodejs.org/download/release/v24.20.0/docs/api/packages.html#conditional-exports).

The Node-owned dual-package guide describes how separately evaluated CJS and ESM implementations produce distinct constructors and singleton state, including failed cross-copy `instanceof` checks. Its wrapper example imports the CJS module and exports the same references, preserving identity. The guide explicitly warns that parts of its migration advice predate `require(esm)` and should not guide new packages wholesale. Applying its wrapper mechanism here is a compatibility recommendation for this existing CJS package, not a claim that CJS-first is universally preferred. [Node dual-package guide](https://github.com/nodejs/package-examples/blob/main/guide/07-dual-packages/README.md).

Proposed illustrative root facade:

```js
// dist/index.mjs
import cjs from './index.js';
export default cjs;
export const DagTraversal = cjs.DagTraversal;
export const DEFER_READY = cjs.DEFER_READY;
// Explicitly export every existing public runtime name.
```

This is a **native ESM entry facade backed by one CommonJS implementation**. It is not an independently compiled ESM implementation or a promise of a fully ESM/browser-native dependency graph. Preserve the default object, namespace objects such as `core` and `rewriteObject`, and all named values. Do not create new classes, symbols, or namespace objects in facades. Generate static exports from the build's actual runtime export surface and validate them against the CJS surface.

For minimum scope, add facades to root and named public entries while leaving historical deep imports on the canonical CJS files. This preserves deep-import usability and identity, but those deep entries remain CJS interop. If the release promises native ESM for every exported deep path, generate sibling `.mjs` and `.d.mts` facades for every emitted `.js` module and add equivalent wildcard import branches; never redirect a wildcard to facades that were not generated.

Do not compile a second independent implementation graph: each `Symbol()` call creates a distinct value even with the same description, so two `DEFER_READY` implementations would be incompatible. [TypeScript symbol documentation](https://www.typescriptlang.org/docs/handbook/symbols.html#unique-symbol).

## TypeScript declarations

TypeScript 4.7 introduced Node16 resolution, recognizes `.d.mts` / `.d.cts`, and follows the consumer's import/require condition. Each ESM and CJS entry needs a declaration file with matching module kind; put `types` first within each branch. Keep top-level `types` for older resolution. [TypeScript 4.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html#packagejson-exports-imports-and-self-referencing).

Proposed root mapping:

```json
{
  ".": {
    "import": {
      "types": "./dist/index.d.mts",
      "default": "./dist/index.mjs"
    },
    "require": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "default": "./dist/index.js"
  }
}
```

Proposed ESM declaration facade:

```ts
// dist/index.d.mts
export * from './index.js';
import cjs = require('./index.js');
export default cjs;
```

Use re-exports rather than copying class and symbol declarations. Private/protected members require the same declaration origin for class compatibility; `unique symbol` identity is also tied to its declaration. Keeping a canonical declaration graph is the inferred solution, and mixed-format compilation must verify it. [TypeScript class compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#private-and-protected-members-in-classes), [TypeScript unique symbols](https://www.typescriptlang.org/docs/handbook/symbols.html#unique-symbol).

Retain `typesVersions` mappings for legacy `moduleResolution: node`; they are not read when exports-based resolution applies. Do not leave an unconditional CJS `types` condition ahead of the ESM branch. [TypeScript module-resolution reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-typesversions).

## Bun version and CI execution

Pin **`bun-version: '1.4.4'`**. The official `bun-v1.4.4` release exists, is marked Latest, and reports publication on October 22 at 10:11. This is release verification, not a completed CTT test run on that version. [Official Bun 1.4.4 release](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.4).

The first-party setup action documents `oven-sh/setup-bun@v2` and explicit `bun-version` selection. An exact runtime version avoids the default floating `latest`; no package-manager migration is needed for the extra runtime job. [setup-bun documentation](https://github.com/oven-sh/setup-bun).

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 24
    cache: npm
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: '1.4.4'
- run: npm ci
- run: bun --version
- run: npm run check
- run: bun scripts/verify-package.cjs
```

This proposed additive job keeps the locked npm installation and existing checks, then explicitly runs the tarball verifier under Bun. The verifier uses `process.execPath` for consumer and compiler subprocesses; launched with Bun, those calls exercise Bun. It still needs Node/npm for `npm pack` and existing script commands, and `tar` for extraction.

Do not claim `bun run check` alone runs the library tests under Bun. Bun normally respects Node shebangs, and CTT's script contains nested `npm run` and explicit `node` invocations. `--bun` can force CLI runtime selection, but a forced full-toolchain lane must itself pass before becoming a support claim. Use `bun run check`, not the distinct built-in `bun check`, if invoking the package script by Bun. [Bun runtime command documentation](https://bun.com/docs/runtime).

Bun supports CJS, ESM, conditional/subpath exports, and importing CJS from ESM. Its Node compatibility documentation records remaining differences, so documentation alone cannot prove this exact Jest/ts-jest/TypeScript toolchain works. Keep Jest and the established coverage checks; replacing them with `bun test` is separate migration work. [Bun module resolution](https://bun.com/docs/runtime/module-resolution), [Bun Node compatibility](https://bun.com/docs/runtime/nodejs-compat).

## Required acceptance evidence

1. Retain the Node 22/24 full checks and existing packed consumers. Run the packed consumers explicitly on pinned Bun 1.4.4.
2. Assert import resolution selects an actual `.mjs` facade and require resolution selects existing `.js` CJS. Compare runtime export names and default/namespace behavior against the existing surface.
3. In one process, load root, named subpaths, and historical deep variants with both loaders. Assert class/function reference equality, `instanceof` across loaders, and exact `DEFER_READY` identity. Return the ESM-imported symbol from a CJS-created DAG visitor and vice versa to test behavior as well as equality.
4. Add an actual `.mts` consumer under Node16 resolution, retain `.ts`/`.cts` CommonJS consumers and legacy `node` resolution, and compile mixed imports with `import cjs = require(...)`. Assign classes and the unique symbol across branches so duplicate declarations fail visibly.
5. Test the minimum supported compiler explicitly if promising TS 4.7.4. Existing installed TS 4.9.5 does not cover that minimum. Avoid newer type-resolution syntax in published facades.
6. Verify every newly referenced `.mjs` / `.d.mts` file is packed, and keep historical file paths, README assets, and declaration contents compatible.

These are proposed checks. Research inspected configuration and official sources and read local tool versions; it did not run the full suite, install Bun 1.4.4, or modify packaging.
