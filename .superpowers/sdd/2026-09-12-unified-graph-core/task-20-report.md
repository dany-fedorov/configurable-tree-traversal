# Task 20 Report: Helpers and Public Exports

## Status

Implemented and verified Task 20. No publication command was run, and the ledger was not modified.

## Changes

- Added asynchronous depth-first and breadth-first convenience helpers with the existing tree-helper argument order and source/config precedence.
- Added synchronous and asynchronous DAG convenience helpers with named ready/complete visitor registration, exact runner return types, and source-bearing config fields omitted from their public config types.
- Made the explicit DAG helper source authoritative at runtime, including when a caller bypasses the config type.
- Added `hasSingleSink` against the read-only resolved-graph query interface.
- Added the DAG traversal index, root named exports, the `dagTraversal` namespace, and async helper exports on the existing depth-first and breadth-first namespaces.
- Exported `CoreInspection`, `KernelInspection`, `AsyncCoreExecution`, `ResolvedGraph`, and `TraversableGraph` through the core/root surface.
- Added the `./traversals/dag-traversal` package export and `typesVersions` mapping while retaining wildcard historical deep imports.
- Added runtime and compile-time coverage for root/subpath imports, helper returns, graph queries, invalid DAG helper config, nullable visitors, halt/finish states, source precedence, and sink counts.

## TDD Evidence

### RED

`npm test -- tests/async-helpers.test.ts tests/dag-helpers.test.ts`

- Failed because the async helpers, DAG helpers, DAG subpath index, `hasSingleSink`, and root DAG exports did not exist.

`npm run typecheck`

- Failed on the same missing root/subpath exports and helper signatures.

### GREEN

`npm test -- tests/async-helpers.test.ts tests/dag-helpers.test.ts`

- 2 suites passed.
- 8 tests passed.

## Verification

- `npm test`: 47 suites passed, 604 tests passed.
- `npm run check`: passed.
- `npm run typecheck`: passed through `npm run check`.
- `npm run lint`: passed through `npm run check`.
- `npm run test:coverage`: 100% statements, branches, functions, and lines.
- `npm run verify-examples`: 7 TypeScript examples verified.
- `npm run verify-package`: package build and packed CommonJS, ESM, TypeScript Node/Node16, and historical deep-import checks passed; 244 files packed.
- Built runtime import assertions confirmed root/subpath identity, namespace helper exposure, and a historical deep import.
- Prettier passed for every Task 20 file.
- `git diff --check`: passed.

## Concerns

- A repository-wide Prettier check still reports 46 pre-existing files outside Task 20. Task 20 files are formatted; unrelated files were intentionally not rewritten.
