# Testing

Run the complete verification from the repository root:

```sh
npm ci
npm run check
```

The check type-checks source, examples, and compile-time API assertions; lints TypeScript; runs Jest with coverage; executes every top-level `examples/*.ts` program; builds clean JavaScript and declarations; and tests an extracted npm tarball as a consumer. GitHub Actions runs the same command on Node 22 and 24. Verification does not publish a package.

## Test layout

| Tests                                                                            | Contract covered                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `depth-first.test.ts`, `breadth-first.test.ts`, `in-order.test.ts`               | Exact event ordering, lazy resolution, sorting, visitor scheduling, commands, filtering, and resumable traversal                                                 |
| `traversal-combinations.test.ts`                                                 | Seeded generated trees compared with an independent reference walker; combined orders, pruning, deletion, halt/resume, terminal failures, and iterator ownership |
| `configuration-isolation.test.ts`, `iterable-config.test.ts`, `defaults.test.ts` | Caller-owned arrays, independent defaults, nested ranges, and runner configuration snapshots                                                                     |
| `core.test.ts`, `core-edge-cases.test.ts`                                        | Vertex references, cloning, paths, subtree deletion, saved original-tree ownership, and container updates                                                        |
| `object.test.ts`, `object-edge-cases.test.ts`                                    | Cycles and shared identities, symbols, sparse arrays, null/undefined, custom hooks and assemblers, reconstruction, and return-time output snapshots              |
| `resolved-tree-coverage.test.ts`                                                 | Unresolved-reference fallbacks, duplicate edges, and atomic saved-mapping errors                                                                                 |
| `object-coverage.test.ts`                                                        | Direct adapter hooks, custom reconstruction, cached assembly, paths, and rewrite options                                                                         |
| `runner-coverage.test.ts`, `runner-state.test.ts`                                | Convenience visitors, command validation, public runner-state bookkeeping, and pruning boundaries                                                                |
| `visitor-coverage.test.ts`, `utils.test.ts`                                      | Concurrent halt and deletion, invalid visitor styles, cyclic object graphs, and diagnostic serialization                                                         |
| `*.typecheck.ts`                                                                 | Public generic inference, abstract runner signatures, command payload compatibility, and intentionally rejected invalid commands                                 |

Generated cases use fixed seeds and bounded trees so failures are reproducible. Separate deep-chain and wide-tree regressions exercise iterative traversal and subtree deletion without relying on timing thresholds.

## Focused checks

```sh
npm test -- tests/traversal-combinations.test.ts
npm test -- --testNamePattern='halt'
npm run test:coverage
npm run verify-examples
npm run verify-package
```

Jest writes the HTML coverage report to `coverage/lcov-report/index.html`. The full check requires 100% statements, branches, functions, and lines across `src/**/*.ts`, including compatibility exports and helpers. Source files and branches are not excluded to meet the threshold. New behavior must include tests that exercise its outcomes and error paths; reaching the coverage threshold does not replace reviewing the assertions.

The package check extracts a fresh tarball into a temporary directory outside the source checkout and supplies only installed runtime dependencies. It exercises root and subpath imports, historical `.js` and extensionless deep imports, CommonJS and ESM execution, and strict TypeScript consumers with `node` and `node16` module resolution. It requires the `tar` command. Temporary consumer directories are cleaned up afterward.

## Adding a regression

1. Express the failure through the public API with a small deterministic tree or object.
2. Run that test and confirm it fails for the behavior being repaired.
3. Fix the behavior and rerun the focused test.
4. Run `npm run check` before committing or pushing.

For traversal changes, cover both strategies when the contract is shared. Assert exact event sequences and resolved-tree state around pauses, errors, and mutations. For error handling, distinguish exceptions raised inside traversal from exceptions in consumer code. A failed runner must retain and rethrow the original value, including `null` or `undefined`; a consumer loop error must leave traversal resumable.

For package changes, update `scripts/verify-package.cjs` as well as source-level type assertions. Imports that work only inside this checkout are insufficient evidence that the published package is usable.
