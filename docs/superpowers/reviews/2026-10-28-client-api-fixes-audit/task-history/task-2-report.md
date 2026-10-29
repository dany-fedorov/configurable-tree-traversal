# Task 2 implementation report — F10, F11, F15, F16

Base: `994603af5108267e6cb9461e7df79bf79a48b0e0` (approved Task 1).
Branch: `feat/api-clarity-migration`.
The coordinator added clarification commit `967d2eb` during this task; its two
specification/plan documentation files are separate from the implementation.

## Implemented behavior

- Generic `MutationRequest<Value>` is a tagged union of rewrite with `value`, delete,
  and keep. Generic binder stages retain their existing replacement-data contract.
  These generic builder exports are type contracts; there is no separate generic
  runtime builder in this checkout.
- Exported `ObjectMutationRequest<OutputTypes>` specializes rewrite to `patch`.
  Object helper callbacks and bound builders consume this tagged union. Runtime
  operations require an own valid `kind` and exactly their allowed own fields;
  retired optional rewrite/delete requests, missing payloads, conflicting fields,
  symbol/unknown fields, primitives, null, and array requests reject. Rewrite patches
  must be non-null non-array objects with only key/value own fields. Omitted/keep
  requests preserve default object reconstruction and cache semantics.
- Operation discriminants and patches are captured once. Malformed operations
  reject before assembly/cache writes or mutation; callback/accessor/assembler
  errors retain exact identity. Existing opaque values and metadata remain shared.
- `arrayIndexPolicy` defaults to `compactInTraversalOrder`. `preserveNumericKeys`
  assigns integer numeric keys in 0..2^32-2, rejects invalid numeric positions, and
  retains named properties. Its output length is max(original intrinsic array
  length, highest assigned index + 1), retaining sparse trailing holes and holes
  left by deletion. Non-arrays classified as arrays derive length from indices.
- `propertyCollision` defaults to `error`; `firstWins` and `lastWins` are explicit
  alternatives. One normalization path compares number/string equivalents while
  preserving distinct symbol identities. Built-in objects, array named properties,
  and preserved numeric positions use it. Custom array/object assemblers own their
  respective reconstruction and supersede built-in placement/collision behavior.
- Child-only `resolveChildHook` / `ObjectChildHookResult` replace the former names.
  The old hook option rejects by presence, including undefined. Root mapping stays
  separate. All affected source, active tests/type fixtures, examples, packed
  consumers, AGENTS guidance and current consumer guides were migrated. No aliases.
- Preserved Task 1 unknown current/assembled/cache domains, strict cache writer,
  both-adapter narrowing requirement, converter context and output-gating contracts.

## Public TDD evidence

1. `npm test -- tests/object-mutation-policies.test.ts` initially failed with
   **26 failed, 2 passed** (`task-2-red.log`). The failures expose missing tagged
   request behavior, policies, and renamed child hook. A first fixture run exposed
   unsupported Object.hasOwn library syntax; it was corrected before this runtime
   RED capture. Initial type RED in `task-2-red-types.log` contains expected missing
   exported hook, old generic request union and absent policies, alongside fixture
   generic arguments corrected during implementation.
2. First implementation: **28 passed** (`task-2-green-focused.log`).
3. Follow-up accessor/null-policy RED: **3 failed, 34 passed**
   (`task-2-red-followup.log`): repeated `kind` reads changed rewrite to deletion;
   null policies were incorrectly defaulted. Fixed by one discriminant capture and
   defaulting only undefined policies. GREEN plus result contracts: **47 passed**
   across two suites (`task-2-green-followup.log`).
4. Coordinator clarified trailing holes. Public sync/async RED: **3 failed,
   38 passed** (`task-2-red-trailing-holes.log`), observing lengths 2 vs expected 4
   for sparse input, and 1 vs expected 2 after deleting the last element. GREEN:
   **41 passed** (`task-2-green-trailing-holes.log`). Coverage includes maximum
   index, invalid numbers, normalized collisions, symbols, custom assembler
   precedence, child-only hooks and malformed operations/options.
5. Seven existing object/source-hint regression suites passed before the final
   length clarification (`task-2-focused-existing.log`). Final full coverage
   rerun below includes those suites and the clarified behavior.

## Final checks and exact summaries

- `npm run typecheck` — exit 0 (`task-2-types.log`).
- `npm run lint` — exit 0 (`task-2-lint.log`).
- `npm run test:coverage` — exit 0; **126 passed suites, 2889 passed tests**;
  All files **100% statements, branches, functions and lines**
  (`task-2-source-coverage.log`). The initial boundary run before the coordinator's
  length clarification also passed 126 suites / 2885 tests at 100%. Rerunning was
  justified by the clarified source behavior and added sync/async regressions.
- `npm run verify-examples` — exit 0; **Verified 20 TypeScript examples.**
  (`task-2-examples.log`). The later preserve-only change leaves their default
  compact behavior unchanged.
- `npm run verify-package` — exit 0 (`task-2-package.log`): build, packed CJS/ESM
  behavior and shared identity; all nine idiomatic routes; 26 denied internal paths;
  strict TypeScript 4.9.5 node/node16 .ts/.cts/.mts consumers; packaged/current guide
  links, anchors and standalone examples. New packed runtime checks cover policies,
  trailing-hole deletion, legacy operation rejection and old hook rejection.
  An earlier package run found formatter removal of a required `<Hint,>` generic
  comma in a .cts/.mts fixture; restoring it fixed the failure, and the successful
  final run follows the array-length source change.
- `git diff --check` — clean before commit.

No coverage thresholds were changed. No dependency, publication, push, merge or
external write actions were performed. The coordinator owns whole-branch standard
check/review across the remaining findings; unchanged benchmark/packaging-script
unit checks were not separately repeated for this task.

## Self-review and concerns

Reviewed final implementation diff and migrated generic-vs-object payload sites,
normalized collision assignment, arbitrary symbols, opaque value identity,
prototype-safe property definition, sparse intrinsic lengths, custom assembler
ownership, once-only accessor reads, old-option presence rejection, and Task 1
contracts. No known implementation concerns remain. Strict unrelated option
allowlists are intentionally left to their later task; these new policy keys and
`resolveChildHook` must be included there.

Unrelated untracked audit artifacts under docs/superpowers/reviews were untouched
and are excluded from the implementation commit. Task scripts/logs and this report
remain in the ignored task-2-prefixed local evidence area.

## Implementation files

- `AGENTS.md`
- `docs/migration-idiomatic-api.md`
- `docs/migration-uniform-api.md`
- `docs/reference.md`
- `examples/rewrite-object-example.ts`
- `examples/traversable-object-example-disable-subtree-traversal.ts`
- `examples/traversable-object-example-rewrite-vertex-hints.ts`
- `examples/traversable-object-example.ts`
- `examples/traversable-object-iterable-example.ts`
- `scripts/package-consumers/composable-api.mjs`
- `scripts/package-consumers/idiomatic-api.mjs`
- `scripts/package-consumers/rewrite-output.ts`
- `scripts/package-consumers/source-hint-contracts.ts`
- `scripts/package-consumers/uniform-api.mjs`
- `scripts/package-consumers/uniform-api.ts`
- `src/core/MakeMutationCommandFunctionFactory.ts`
- `src/tools/rewrite-object/rewriteObject.ts`
- `src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts`
- `src/traversable-tree-implementations/traversable-object-tree/index.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectTreeInstanceConfig.ts`
- `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts`
- `tests/_main.ts`
- `tests/idiomatic-compatibility.test.ts`
- `tests/idiomatic-object-contracts.test.ts`
- `tests/idiomatic-object-contracts.typecheck.ts`
- `tests/mutation-builder.typecheck.ts`
- `tests/object-coverage.test.ts`
- `tests/object-domain-contracts.test.ts`
- `tests/object-domain-contracts.typecheck.ts`
- `tests/object-edge-cases.test.ts`
- `tests/object-resolution-hook.test.ts`
- `tests/object.test.ts`
- `tests/rewrite-output.typecheck.ts`
- `tests/rewrite-result-contract.test.ts`
- `tests/source-hint-contracts.test.ts`
- `tests/source-hint-contracts.typecheck.ts`
- `tests/test1.ts`
- `tests/tree-source-capabilities.typecheck.ts`
- `tests/vertex-content-api.test.ts`
- `tests/object-mutation-policies.test.ts`
- `tests/object-mutation-policies.typecheck.ts`

## Commit and final workspace

Implementation commit: `3c00835` — `fix: make object mutation operations and assembly policies explicit`.
Coordinator clarification commit: `967d2eb` — `docs: clarify preserved array hole semantics`.
After commit, `git status --short` contains only the two pre-existing unrelated
untracked audit artifact paths; no tracked task changes remain.

## Approved review follow-up

Commit `e7092bd` corrects the single stale sentence at
`docs/migration-idiomatic-api.md:116`: object `kind: 'rewrite'` operations require a
non-null object `patch`; generic rewrites carry their full replacement in `value`.
No production code, links or runnable examples changed.
`git diff --check` completed with exit 0 and no output before commit.
No tests were rerun for this sentence-only correction, as directed by the
coordinator's approved review follow-up.
