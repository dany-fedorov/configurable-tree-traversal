# Testing

Run the complete verification from the repository root:

```sh
npm ci
npm run check
```

The check type-checks source, examples, and compile-time API assertions; lints TypeScript; runs Jest with coverage; executes every top-level `examples/*.ts` program; builds clean JavaScript and declarations; and tests an extracted npm tarball as a consumer. GitHub Actions runs the same command on Node 22 and 24. Verification does not publish a package.

## Test layout

| Tests                                                                                                       | Contract covered                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `depth-first.test.ts`, `breadth-first.test.ts`, `in-order.test.ts`                                          | Exact event ordering, lazy resolution, sorting, visitor scheduling, commands, filtering, and resumable traversal                                                 |
| `traversal-combinations.test.ts`                                                                            | Seeded generated trees compared with an independent reference walker; combined orders, pruning, deletion, halt/resume, terminal failures, and iterator ownership |
| `configuration-isolation.test.ts`, `iterable-config.test.ts`, `defaults.test.ts`                            | Caller-owned arrays, independent defaults, nested ranges, and runner configuration snapshots                                                                     |
| `core.test.ts`, `core-edge-cases.test.ts`                                                                   | Vertex references, cloning, paths, subtree deletion, saved original-tree ownership, and container updates                                                        |
| `object.test.ts`, `object-edge-cases.test.ts`                                                               | Cycles and shared identities, symbols, sparse arrays, null/undefined, custom hooks and assemblers, reconstruction, and return-time output snapshots              |
| `resolved-tree-coverage.test.ts`                                                                            | Unresolved-reference fallbacks, duplicate edges, and atomic saved-mapping errors                                                                                 |
| `object-coverage.test.ts`                                                                                   | Direct adapter hooks, custom reconstruction, cached assembly, paths, and rewrite options                                                                         |
| `runner-coverage.test.ts`, `runner-state.test.ts`                                                           | Convenience visitors, command validation, public runner-state bookkeeping, and pruning boundaries                                                                |
| `visitor-coverage.test.ts`, `utils.test.ts`                                                                 | Concurrent halt and deletion, invalid visitor styles, cyclic object graphs, and diagnostic serialization                                                         |
| `resolved-graph.test.ts`, `graph-identity.test.ts`                                                          | Strict graph topology, ids, slots, cycles, path queries, snapshots, omission, and tombstones                                                                     |
| `graph-container.test.ts`, `graph-source-binding.test.ts`, `tree-graph-view.test.ts`                        | Graph/tree source modes, saved structural ownership, wrapped hint identities, and tree query facades                                                             |
| `graph-readiness.test.ts`, `graph-completion.test.ts`, `graph-pruning.test.ts`                              | Dependency readiness, initial versus subtree completion, joins, stalls, deletion, and disabling                                                                  |
| `kernel-transitions.test.ts`, `visitor-chain-machine.test.ts`                                               | Promise-free state transitions, serialized commands, chain-local state, event boundaries, and invalidation                                                       |
| `core-inspection.test.ts`, `sync-driver.test.ts`                                                            | Detached inspection snapshots, pending requests, physical callback counts, and synchronous execution                                                             |
| `depth-first-core-parity.test.ts`, `breadth-first-core-parity.test.ts`                                      | Legacy callback/event parity while synchronous tree runners use the unified graph core                                                                           |
| `dag-traversal.test.ts`, `dag-configuration.test.ts`, `dag-helpers.test.ts`                                 | Synchronous DAG lifecycle, source/configuration isolation, graph mutations, helpers, and injected state                                                          |
| `async-callback-scheduler.test.ts`, `async-driver.test.ts`, `async-runner-session.test.ts`                  | Callback limiting, immediate rejection capture, wakeups, buffering, shared async execution, and iterator ownership                                               |
| `async-tree-prefetch.test.ts`, `async-depth-first.test.ts`, `async-breadth-first.test.ts`                   | Prefetch boundaries, value-or-promise callbacks, qualified tree parity, halt/resume, and snapshots                                                               |
| `async-dag-kernel.test.ts`, `async-dag.test.ts`, `async-dag-lifecycle.test.ts`                              | Concurrent DAG admission, dependency partial order, lifecycle races, failure, close, and inspection                                                              |
| `async-helpers.test.ts`                                                                                     | Async helper return types, visitor registration, execution, and source precedence                                                                                |
| `commands.typecheck.ts`, `public-api.typecheck.ts`, `graph-api.typecheck.ts`, `async-tree-api.typecheck.ts` | Public generic inference, six-family root/subpath APIs, source modes, callback return types, and rejected configurations                                         |

Generated cases use fixed seeds and bounded trees so failures are reproducible. Separate deep-chain and wide-tree regressions exercise iterative traversal and subtree deletion without relying on timing thresholds.

## Focused checks

```sh
npm test -- tests/traversal-combinations.test.ts
npm test -- tests/dag-traversal.test.ts tests/graph-readiness.test.ts
npm test -- tests/async-depth-first.test.ts tests/async-breadth-first.test.ts tests/async-dag.test.ts
npm test -- tests/core-inspection.test.ts tests/async-runner-session.test.ts
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

For traversal changes, cover every affected sync/async and tree/DAG family when the contract is shared. Assert exact synchronous event sequences and dependency constraints for concurrent DAG events, plus resolved topology around pauses, errors, and mutations. For error handling, distinguish exceptions raised inside traversal from exceptions in consumer code. A failed runner must retain and rethrow the original value, including `null` or `undefined`; a consumer loop error must leave traversal resumable.

For package changes, update `scripts/verify-package.cjs` as well as source-level type assertions. Imports that work only inside this checkout are insufficient evidence that the published package is usable.
