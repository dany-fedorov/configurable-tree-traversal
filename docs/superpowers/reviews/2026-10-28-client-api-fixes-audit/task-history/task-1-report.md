# Task 1 report — F01/F02

Status: DONE.

Worktree: `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`
Branch: `feat/api-clarity-migration`
Baseline: `c736eb7bbbc2104b1605514123b132dc57573a33`
Commit: `994603af5108267e6cb9461e7df79bf79a48b0e0`

## Behavior and public contracts

- Object live/current values, rewrite input values, assembled values, assembler returns, and assembly cache values are `unknown`, even with narrow input/replacement generics or mixed containers. Current keys and retained metadata alternatives remain represented; requested replacement patch fields still use OutK/OutV. Original retained views preserve the declared input domain.
- Removed `getOutputObjectFromRootValue`. Its presence rejects before callbacks. `convertRootValue(value: unknown, context: { readonly complete: boolean })` receives the actual current/reconstructed root, including unchanged primitives, mixed arrays, null/deleted roots, and partial snapshots.
- Ordinary rewriteObject can promise a specific Out only with a converter. Conditional options and call arguments prevent generic-only, empty/spread/pretyped bag escape routes. rewriteObjectAs is still the explicitly unchecked final assertion.
- Conversion completion gating, initial snapshot behavior, successful final conversion caching, repeated-get identity, and retry after exact conversion failures remain intact. Completion context is false for the paused snapshot and true after resumption; immediately finished runs convert once with true.
- Default ObjectTreeSource and direct default child discovery expose PropertyKey/unknown. Narrow key/value domains require both root and child adapters through constructors, option aliases, rewrite helpers, and fromProperties. Constructor overloads cannot bypass that condition.
- ObjectTreeSource.fromProperties provides precise root/child discovery and checks both adapters before input callbacks. createRootPropertyMapper preserves the actual input value type and selected/default root-key type; its old arbitrary generic assertions are removed. Default child discovery cannot assert narrow generic domains.
- Exported ObjectAssemblyCache<Key> has function-valued has/get/set members. Its writer accepts unknown; ordinary Map<Key, unknown> works, while Map<Key, string> fails strictFunctionTypes. This avoids Map method bivariance allowing library writes to invalidate a caller's narrower cache reads.
- Migrated current documentation, standalone guide snippets, the runnable rewrite example, source type fixtures, packed .ts/.cts/.mts fixtures and packed runtime converter consumers. No consumer casts were introduced to fake type precision. Casts in malformed JavaScript runtime fixtures deliberately bypass types to exercise rejection.
- No hook/request shape changes and no array/collision policies were introduced. Tree/graph scheduling and lifecycle semantics are unchanged. No publication, push, or merge was performed.

## RED evidence

1. Before implementation, `npm test -- tests/object-domain-contracts.test.ts` failed on the missing fromProperties and convertRootValue APIs (TS2339/TS2345); `npm run typecheck` reported unused @ts-expect-error directives for narrow default constructors, incomplete adapters, generic-only Out, and falsely precise live/assembled values. Full outputs: `task-1-red-runtime.log`, `task-1-red-types.log`.
2. Cache variance regression: `npm run typecheck` failed with TS2578 for the unused negative directive when a Map<..., string> was accepted. After the structural function-valued protocol, the directive is consumed and typecheck succeeds. Outputs: `task-1-red-cache.log`, `task-1-green-cache.log`.
3. Additional public boundary RED: `npm test -- tests/object-domain-contracts.test.ts` produced 5 failed / 3 passed tests because incomplete precise adapter bags and the removed converter option did not throw. After validation/removal guards, both boundary suites pass (18 tests total). Outputs: `task-1-red-boundaries.log`, `task-1-green-boundaries.log`.

## GREEN verification (actual output inspected)

- `npm run typecheck` — exit 0, no diagnostics. Final log: `task-1-typecheck-green.log`.
- `npm run lint` — exit 0, no errors/warnings. Final log: `task-1-lint-green.log`.
- Focused object/source families: `npm test -- tests/object.test.ts tests/object-domain-contracts.test.ts tests/object-coverage.test.ts tests/object-edge-cases.test.ts tests/object-resolution-hook.test.ts tests/idiomatic-object-contracts.test.ts tests/rewrite-result-contract.test.ts tests/source-hint-contracts.test.ts` — 8 suites / 134 tests passed before the five added boundary cases. Log: `task-1-focused-all.log`.
- Final boundary focused check: `npm test -- tests/object-domain-contracts.test.ts tests/rewrite-result-contract.test.ts` — 2 suites / 18 tests passed. Log: `task-1-green-boundaries.log`.
- `npm run test:coverage` — exit 0; 125 suites passed, 2,848 tests passed; statements/branches/functions/lines all 100%. Log: `task-1-final-coverage.log`. This is the one full source-suite boundary run. Later corrections affected type signatures/fixtures and guide snippets only, with no runtime implementation changes.
- `npm run tsfile -- examples/rewrite-object-example.ts` — exit 0; expected rewritten JSON output. Log: `task-1-final-example.log`.
- `npm run verify-package` — final command exit 0, confirmed from its process result. Final log: `task-1-package-final-verification.log`. Exact final output: "Verified guide navigation in checkout and tarball, and 24 standalone snippets." and "Verified packed package on Node v24.20.0: shared CommonJS/native ESM, mixed TypeScript node/node16 (.ts/.cts/.mts), supported public imports and denied internal paths (776 files)." Packed TypeScript compiler: 4.9.5. This includes build, all packed runtime checks, strict node/node16 declarations, packaged links/anchors and executed guide snippets.
- `git diff --check` — exit 0.

Package verification initially exposed remaining converter consumers, an ambient declaration incorrectly placed inside a block, .cts/.mts generic-arrow syntax after formatting, and narrow guide source examples missing adapters/matching key domains. All were corrected using truthful declarations/adapters. Earlier logs with green/final in their names can contain these failed iterations; only `task-1-package-final-verification.log` is the final successful package evidence. No coverage or other validation gates were weakened.

## Self-review and concerns

Reviewed the entire task diff against the F01/F02 requirements, including callback/cache variance, raw/live/original distinctions, constructor overload escape routes, helper defaults, converter lifecycle/error behavior, supported root/subpath exports and packed consumers. No unresolved F01/F02 concern was found. Breaking narrowing/adapter/converter changes are intentional and documented. Full npm run check remains the controller's whole-migration integration gate; this task performed the required focused/type/full-source checks plus lint, changed example and full packed verification.

The original checkout and existing untracked review artifacts were left untouched. All task evidence remains in this ignored plan workspace; review artifacts were not staged. No agents or reviewers were spawned.

## Changed files

- `docs/migration-api-clarity.md`
- `docs/migration-idiomatic-api.md`
- `docs/migration-uniform-api.md`
- `docs/reference.md`
- `examples/rewrite-object-example.ts`
- `scripts/package-consumers/composable-api.mjs`
- `scripts/package-consumers/rewrite-output.ts`
- `scripts/package-consumers/source-hint-contracts.ts`
- `src/tools/rewrite-object/index.ts`
- `src/tools/rewrite-object/rewriteObject.ts`
- `src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts`
- `src/traversable-tree-implementations/traversable-object-tree/index.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/ObjectCurrentVertexTypes.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectTreeInstanceConfig.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/createRootPropertyMapper.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/getChildrenOfPropertyDefault.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts`
- `tests/idiomatic-object-contracts.test.ts`
- `tests/idiomatic-object-contracts.typecheck.ts`
- `tests/object-coverage.test.ts`
- `tests/object-edge-cases.test.ts`
- `tests/object-resolution-hook.test.ts`
- `tests/object.test.ts`
- `tests/rewrite-output.typecheck.ts`
- `tests/rewrite-result-contract.test.ts`
- `tests/source-hint-contracts.typecheck.ts`
- `tests/object-domain-contracts.test.ts`
- `tests/object-domain-contracts.typecheck.ts`
