# Testing

[Documentation map](index.md) · [Agent workflow guide](agent-workflows.md) · [API reference](reference.md)

Run the complete verification from the repository root:

```sh
npm ci
npm run check
```

The check type-checks source, examples, and compile-time API assertions; lints TypeScript; runs Jest with coverage; executes every top-level `examples/*.ts` program; builds clean JavaScript and declarations; and tests an extracted npm tarball as a consumer. GitHub Actions runs the same command on Node 22 and 24, including facade-generator and benchmark correctness tests. Verification does not publish a package.

## Test layout

| Tests                                                                                                                                                                                               | Contract covered                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `depth-first.test.ts`, `breadth-first.test.ts`, `in-order.test.ts`                                                                                                                                  | Exact event ordering, lazy resolution, sorting, visitor scheduling, commands, filtering, and resumable traversal                                                 |
| `traversal-combinations.test.ts`                                                                                                                                                                    | Seeded generated trees compared with an independent reference walker; combined orders, pruning, deletion, halt/resume, terminal failures, and iterator ownership |
| `configuration-isolation.test.ts`, `iterable-config.test.ts`, `defaults.test.ts`                                                                                                                    | Caller-owned arrays, independent defaults, nested ranges, and runner configuration snapshots                                                                     |
| `core.test.ts`, `core-edge-cases.test.ts`                                                                                                                                                           | Vertex references, cloning, paths, subtree deletion, saved original-tree ownership, and container updates                                                        |
| `object.test.ts`, `object-edge-cases.test.ts`                                                                                                                                                       | Cycles and shared identities, symbols, sparse arrays, null/undefined, custom hooks and assemblers, reconstruction, and return-time output snapshots              |
| `resolved-tree-coverage.test.ts`                                                                                                                                                                    | Unresolved-reference fallbacks, duplicate edges, and atomic saved-mapping errors                                                                                 |
| `object-coverage.test.ts`                                                                                                                                                                           | Direct adapter hooks, custom reconstruction, cached assembly, paths, and rewrite options                                                                         |
| `runner-coverage.test.ts`, `runner-state.test.ts`                                                                                                                                                   | Convenience visitors, command validation, public runner-state bookkeeping, and pruning boundaries                                                                |
| `visitor-coverage.test.ts`, `utils.test.ts`                                                                                                                                                         | Concurrent halt and deletion, invalid visitor styles, cyclic object graphs, and diagnostic serialization                                                         |
| `resolved-graph.test.ts`, `graph-identity.test.ts`                                                                                                                                                  | Strict graph topology, ids, slots, cycles, path queries, snapshots, omission, and tombstones                                                                     |
| `graph-container.test.ts`, `graph-source-binding.test.ts`, `tree-graph-view.test.ts`                                                                                                                | Graph/tree source modes, saved structural ownership, wrapped hint identities, and tree query facades                                                             |
| `graph-readiness.test.ts`, `graph-completion.test.ts`, `graph-pruning.test.ts`                                                                                                                      | Dependency readiness, initial versus subtree completion, joins, stalls, deletion, and disabling                                                                  |
| `kernel-transitions.test.ts`, `visitor-chain-machine.test.ts`                                                                                                                                       | Promise-free state transitions, serialized commands, chain-local state, event boundaries, and invalidation                                                       |
| `core-inspection.test.ts`, `sync-driver.test.ts`                                                                                                                                                    | Detached inspection snapshots, pending requests, physical callback counts, and synchronous execution                                                             |
| `depth-first-core-parity.test.ts`, `breadth-first-core-parity.test.ts`                                                                                                                              | Legacy callback/event parity while synchronous tree runners use the unified graph core                                                                           |
| `dag-traversal.test.ts`, `dag-configuration.test.ts`, `dag-helpers.test.ts`                                                                                                                         | Synchronous DAG lifecycle, source/configuration isolation, graph mutations, helpers, and injected state                                                          |
| `async-callback-scheduler.test.ts`, `async-driver.test.ts`, `async-runner-session.test.ts`                                                                                                          | Callback limiting, immediate rejection capture, wakeups, buffering, shared async execution, and iterator ownership                                               |
| `async-tree-prefetch.test.ts`, `async-depth-first.test.ts`, `async-breadth-first.test.ts`                                                                                                           | Prefetch boundaries, value-or-promise callbacks, qualified tree parity, halt/resume, and snapshots                                                               |
| `async-dag-kernel.test.ts`, `async-dag.test.ts`, `async-dag-lifecycle.test.ts`                                                                                                                      | Concurrent DAG admission, dependency partial order, lifecycle races, failure, close, and inspection                                                              |
| `vertex-content-api.test.ts`, `uniform-source-results.test.ts`, `uniform-dependencies.test.ts`, `uniform-commands.test.ts`, `dag-completion-vocabulary.test.ts`, `traversal-helper-options.test.ts` | Uniform content/source contracts, explicit dependency policies, exclusive commands/batching/phases, completion terminology, and all six helpers                  |
| `collection-sources.test.ts`, `collection-sources.typecheck.ts`                                                                                                                                     | DAG input envelopes, collection/root identity, topology copying, shared descendants, missing children, async materialization, selector errors and inference      |
| `prepared-dag.test.ts`, `prepared-dag.typecheck.ts`, `dag-precise-contracts.test.ts`                                                                                                                | Validation results, source-error provenance, independent seeded runners/sessions, normalized replay and source/topology option ownership                         |
| `dag-coordination.test.ts`, `dag-coordination.typecheck.ts`                                                                                                                                         | Ticket provenance, stale/duplicate/conflicting settlement, exact errors, arbitrary IDs, pause draining and iterator ownership                                    |
| `dag-event-types.test.ts`, `dag-event-types.typecheck.ts`, `dag-filtered-visitors.test.ts`                                                                                                          | Typed event identity/discrimination and filtered data callbacks preserving context, commands and errors                                                          |
| `async-helpers.test.ts`                                                                                                                                                                             | Async helper return types, visitor registration, execution, and source precedence                                                                                |
| `commands.typecheck.ts`, `public-api.typecheck.ts`, `graph-api.typecheck.ts`, `async-tree-api.typecheck.ts`                                                                                         | Public generic inference, six-family root/subpath APIs, source modes, callback return types, and rejected configurations                                         |

Generated cases use fixed seeds and bounded trees so failures are reproducible. Separate deep-chain and wide-tree regressions exercise iterative traversal and subtree deletion without relying on timing thresholds.

Materialized definitions and composition are covered by `dag-definition.test.ts`, `dag-definition-validation.test.ts`, `dag-fragments.test.ts` and their type assertions: faithful entry/omission order, detached prerequisites, structural/milestone validation, exact mapped identity, collision rejection, explicit child versus W/C links, precise port keys and foreign-wire rejection. Packed `dag-fragments.mjs` and `.ts` fixtures check definition/fragment APIs across root, DAG subpath and namespace CJS/ESM identity, sync/async execution and explicit heterogeneous unions. `dag-fragments-example.ts` executes ticket-based sessions from two object-ID instances.

`dag-revisions.test.ts` and `.typecheck.ts` cover ordered atomic edits, final-candidate validation, strict data/ID domains, arbitrary identity, ownership and shallow diffs. Integration checks reject old tickets in new sync/async sessions while preserving original settlement, require explicit host-selected seeds, and leave admitted old completion callbacks unaffected. `dag-inspection.test.ts` also verifies omitted/deleted synthetic identities stay hidden without filtering caller symbols. Packed `dag-revisions.mjs` and `.ts` fixtures exercise diff/revision functions and operation/result/diff types across root, DAG subpath and namespace CJS/ESM consumers; the verifier also compiles `.cts`/`.mts` copies. `dag-revision-example.ts` executes isolated tickets and host-selected facts.

DAG dependency inspection is covered by `dag-inspection.test.ts`, `dag-inspection-explanations.test.ts`, `dag-inspection-terminal.test.ts`, `dag-inspection-inputs.test.ts`, and `dag-inspection.typecheck.ts`: exact W/C facts, original constraints, SameValueZero IDs, known omissions/deletions, unresolved endpoints, local discovery, callback commit boundaries, iterator ownership, detached captures, cycles and deep iterative walks. Terminal reconstruction tests cover original/copied state, committed W/C versus partial failure, tree-source identities, detached diagnostic wrappers, invalidated late async callbacks, and sealed/nonextensible caller state with exact success/failure preservation. Structural target tests cover class and non-enumerable getters, one read per field, exact failures, and detached results. Packed `dag-inspection.mjs` and `.ts` fixtures cover root/DAG/namespace loader identity, sync/async behavior and exact public ID types through the extracted package.

General graph walking is covered by `graph-walk-*.test.ts`, `async-graph-walk*.test.ts`, and their type assertions: source laziness/hydration/first-accepted omissions, arbitrary identity and parallel links, exact BFS/DFS sequences, independent emission/callback selection, predicate pruning, zero/exact budgets, bounded simple paths/repeated walks, visitor commit boundaries, pause/ownership and pending-return races, reverse cleanup with exact primary failures, passive inspection, catalog/DAG relation adapters and one-shot helpers. Resource tests distinguish consumer iterator pause from terminal runner close and verify active-owner rejection, retained failed-close errors, shared async close promises and acquired iterators with throwing protocol getters. Cross-family capability assertions check common `ExecutionInspection` defaults and preserve phase variance.

Packed `graph-walk.mjs` / `.ts` consumers check actual root/namespace/subpath CJS/ESM constructor and declaration identity, typed hydrated endpoints, mixed/omitted records, arbitrary IDs, async continuation, helpers and adapters. The three `graph-walk-*-example.ts` programs assert the five-vertex/six-edge context, typed code references/common inspection wrappers, and bounded provenance outcomes. Complete walking and cross-family guide snippets run against the extracted package; partial snippets are not substitutes for those consumers.

## Focused checks

```sh
npm test -- tests/collection-sources.test.ts tests/prepared-dag.test.ts tests/dag-coordination.test.ts
npm run tsfile -- examples/agent-api-foundations-example.ts
npm run tsfile -- examples/graph-walk-context-example.ts
npm run tsfile -- examples/graph-walk-references-example.ts
npm run tsfile -- examples/graph-walk-paths-example.ts
npm test -- tests/graph-walk-resources.test.ts tests/async-graph-walk.test.ts
npm test -- tests/traversal-combinations.test.ts
npm test -- tests/dag-traversal.test.ts tests/graph-readiness.test.ts
npm test -- tests/async-depth-first.test.ts tests/async-breadth-first.test.ts tests/async-dag.test.ts
npm test -- tests/core-inspection.test.ts tests/async-runner-session.test.ts
npm test -- --testNamePattern='halt'
npm run test:coverage
npm run verify-examples
npm run verify-package
```

Jest writes the HTML coverage report to `coverage/lcov-report/index.html`. The full check requires 100% statements, branches, functions, and lines across `src/**/*.ts`, including public exports and helpers. Source files and branches are not excluded to meet the threshold. New behavior must include tests that exercise its outcomes and error paths; reaching the coverage threshold does not replace reviewing the assertions.

The package check extracts a fresh tarball into a temporary directory outside the source checkout and supplies only installed runtime dependencies. It exercises root and subpath imports and all nine supported runtime entry points and actual denial of 26 private paths, including `.js` and extensionless forms. Import resolution must select native `.mjs` facades while require resolution selects `.js`.

The separate `scripts/package-consumers/uniform-api.mjs` and `.ts` fixtures check canonical content and retired-input rejection, source results, dependency policies, command batching, deferral, completion feedback, and all six helper forms. Strict fixture checks include independent selectors, external settlement/stop reasons, shared definitions/groups, tree-only source types, typed mutations, canonical hooks, safe views and identity APIs. They retain invalid-phase, exclusive-deferral and readonly metadata assertions. They execute against the extracted package alongside the historical consumers.

In a single process it checks named/default export parity, exact class/symbol/function/namespace identity, cross-loader `instanceof`, and sync/async DAG deferral, seeds, settlement, completion prerequisites and prerequisite lookup.

Strict `.ts` consumers use `node` and `node16` resolution; real `.cts` and mixed `.mts` consumers use Node16, assign classes and command enums across import/require branches, and reject promise-returning sync callbacks and invalid tree deferral. Every generated `.mjs` and `.d.mts` companion must be packed for internal relative loading; their physical presence does not make deep imports public. ESM declaration facades re-export canonical `.d.ts` types rather than duplicating nominal declarations.

Runtime facades use Node-compatible `createRequire(import.meta.url)` to preserve the entire CommonJS module object, including modules with an own default export. This is a shared CJS core, without a standalone browser ESM or tree-shaking promise. It requires the `tar` command. Temporary consumer directories are cleaned up afterward.

The package verifier resolves relative guide links/fragments and images in both the checkout and extracted tarball, preserving public anchors. It compiles and executes all complete standalone TypeScript snippets (marked with an invisible `<!-- standalone -->` comment) against the built package. Partial snippets depend on their nearby setup. Every top-level example also executes during the full check.

## Adding a regression

1. Express the failure through the public API with a small deterministic tree or object.
2. Run that test and confirm it fails for the behavior being repaired.
3. Fix the behavior and rerun the focused test.
4. Run `npm run check` before committing or pushing.

For traversal changes, cover every affected sync/async and tree/DAG family when the contract is shared. Assert exact synchronous event sequences and dependency constraints for concurrent DAG events, plus resolved topology around pauses, errors, and mutations. For error handling, distinguish exceptions raised inside traversal from exceptions in consumer code. A failed runner must retain and rethrow the original value, including `null` or `undefined`; a consumer loop error must leave traversal resumable.

For package changes, update `scripts/verify-package.cjs` as well as source-level type assertions. Imports that work only inside this checkout are insufficient evidence that the published package is usable.

## Bun and compiler checks

CI pins `oven-sh/setup-bun@v2` to Bun **1.4.4**, installs locked dependencies with `npm ci` on Node 24, and builds with npm. It then runs actual Bun consumers and script correctness tests:

```sh
bun --version
npm run build
bun scripts/verify-package.cjs
bun test scripts/build-esm.test.cjs scripts/benchmark-dag.test.cjs scripts/benchmark-dag-lifecycle.test.cjs
```

The verifier launches runtime and compiler subprocesses with `process.execPath`, so invoking it with Bun executes the packed consumers under Bun. `bun test` runs these focused `node:test` scripts; Jest and the 100% source coverage gate remain on Node 22/24. `bun run check` alone is not evidence of Bun execution because nested npm scripts explicitly call Node. No Bun lockfile is used.

Local implementation validation used Node **v24.20.0**, Bun **1.4.4**, locked TypeScript **4.9.5**, and isolated minimum TypeScript **4.7.4**. Run the verifier with the locked compiler by default, or supply an isolated compiler path to test the same packed `.ts`/`.cts`/`.mts` consumers without changing dependencies:

```sh
node node_modules/typescript/bin/tsc --version
node /tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc --version
CTT_TYPESCRIPT_COMPILER=/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc node scripts/verify-package.cjs
```

For final composable and graph-walking API compatibility, run the built-package verifier across exact Node 22.12.0, current Node 24 and Bun 1.4.4, each with locked TS4.9.5 and minimum TS4.7.4. Build once on the final tree, then invoke `scripts/verify-package.cjs` directly for the remaining matrix cases; a successful `npm run check` covers its current-runtime/locked-compiler case. Record actual runtime/compiler versions, complete logs and exit codes. The uniform consumer fixtures exercise real calls and meaningful negative assertions through packed `.ts`/`.cts`/`.mts` declarations, with both CJS/ESM runtime identities; source imports alone do not prove compatibility.

Re-check every available runtime and both compiler versions before the final matrix; local `/tmp` paths are examples of evidence tooling, not guaranteed installations. After the full check builds the final tree, use verified local paths (represented here by shell variables) for the five remaining pairs, sequentially:

```sh
node "$ctt_minimum_compiler" --version
"$ctt_node22" --version
"$ctt_bun" --version
CTT_TYPESCRIPT_COMPILER="$ctt_minimum_compiler" node scripts/verify-package.cjs
"$ctt_node22" scripts/verify-package.cjs
CTT_TYPESCRIPT_COMPILER="$ctt_minimum_compiler" "$ctt_node22" scripts/verify-package.cjs
"$ctt_bun" scripts/verify-package.cjs
CTT_TYPESCRIPT_COMPILER="$ctt_minimum_compiler" "$ctt_bun" scripts/verify-package.cjs
"$ctt_bun" test scripts/build-esm.test.cjs scripts/benchmark-dag.test.cjs scripts/benchmark-dag-lifecycle.test.cjs
```

The current Node/locked compiler pair is already covered by `npm run check`; avoid rebuilding for each remaining verifier call. Each verifier uses its own temporary consumer directory and `process.execPath` for runtime/compiler subprocesses. Record the complete command, actual versions, exit code and log per pair. Exact minimum Node packed compatibility does not replace the full current Node 22/24 CI source/coverage lanes; any unavailable lane must remain explicitly pending remote CI.

The `/tmp` compiler and checksum-verified Bun binary are local evidence tooling, not repository dependencies. The full Node 22/24 CI checks and the pinned Bun lane are separate required gates.

## UUID dependency compatibility

CTT 0.11.0 uses UUID 14.0.3, an ESM-only dependency, while CTT keeps its canonical CommonJS implementation and synchronous reference creation. Node **22.12.0+** can synchronously require that dependency; Bun **1.4.4** also passes packed consumers. CI tests the exact minimum Node version in addition to current Node 22/24 and Bun. The minimum Node job runs `npm run verify-package` with the real dependency. Node 22.12 may emit its built-in experimental ESM-loading warning; newer Node 22 releases have removed that warning.

Jest 28 has its own module loader. For source tests, ts-jest transforms only UUID's JavaScript dependency files in addition to the existing TypeScript inputs. This uses the real UUID implementation; it is not mocked. Native loader behavior is checked separately through packed CJS/ESM consumers.

UUID types do not appear in CTT's emitted public declarations. Strict packed TypeScript 4.7.4/4.9.5 consumers remain supported without `skipLibCheck`; UUID's newer source declarations are internal to building CTT. The source build retains its existing `skipLibCheck` configuration. Obsolete `@types/uuid` is removed because UUID provides its own declarations.

## Canonical API census

After building the final tree, run `node scripts/api-clarity-census.cjs /tmp/ctt-api-census` with an explicit output directory. The recursive declaration census follows every supported binding through nested signatures, members, inheritance and static members. It inventories literals and callback/generic parameters, guards canonical names, rejects retired aliases and deprecated declarations, and keeps runner constructors and private engine declarations inaccessible. Rejection-only `never` fields and physical internal filenames are not accepted compatibility APIs. Preserve historical audit bundles by writing fresh evidence elsewhere.

Packed `idiomatic-api`, `idiomatic-execution`, `idiomatic-diagnostics`, `rewrite-output`, and `uniform-api` fixtures cover canonical and removed contracts under node and node16 (`.ts`/`.cts`/`.mts`). Their runtime fixtures assert actual CJS/ESM behavior and all nine supported routes; supported-export fixtures retain the 26 denied private-path checks. `idiomatic-materialized-input.test.ts` also checks the root and sources namespace rename directly.

`delivery-selection.test.ts` and `.typecheck.ts` cover uniform delivery selection, previously unselected buffered observations, paused callback snapshots, deferred settlement, no work replay, walking limit parity and narrowed concrete/capability types. Packed `delivery-selection.mjs` / `.ts` consumers verify the same delivery and type contracts through both module loaders.

The packaged [client API migration](migration-client-api.md) is included in tarball navigation, anchor and standalone-snippet checks. To verify packed consumers with a separate compiler, build first, then run `CTT_TYPESCRIPT_COMPILER=/path/to/typescript/bin/tsc node scripts/verify-package.cjs`; the override is a compiler script path executed by Node. Keep dist-mutating builds and packed checks serial.
