### Spec Compliance

- ❌ Issues found: F05/getter-once handling is incomplete in materializers, fragment instantiation and visitor-group inputs (`src/sources/materialize.ts:90`, `src/traversals/graph-walk/walkSourceFrom.ts:50`, `src/traversals/dag-traversal/dagFragments.ts:61`, `src/core/visitors/normalizeVisitorDefinitions.ts:110`); callable structural walking sources still reject (`src/traversals/graph-walk/lib/normalizeWalkOptions.ts:84`).
- ✅ F04 candidate merging retains defined/undefined distinctions and normalizes visitor/in-order state before replacement (`src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig.ts:86`, `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:138`). Nested execution-selector retention is tested through sync/async tree, DAG and walking resumption (`tests/execution-selection.test.ts:260`, `tests/graph-walk-selection.test.ts:74`).
- ✅ F13 uses exclusive tagged selections and detached arrays/ranges while retaining the existing normalization algorithm (`src/traversals/depth-first-traversal/lib/DepthFirstTraversalInOrderTraversalConfig.ts:17`, `src/traversals/depth-first-traversal/in-order-helpers/shouldVisitParentOnInOrder.ts:11`, `tests/in-order.test.ts:78`).
- ⚠️ The review is task-scoped. Existing full validation evidence covers unchanged family behavior and packaging; this review did not independently rerun that evidence or audit the unchanged Task 1/2 implementation. F03/F06/F09 follow-up behavior is not required here; callable source acceptance is the explicit Task 3 structural-protocol requirement, not F06 hydration.

### Strengths

- `src/core/assertPublicOptions.ts:2` validates all own keys, including nonenumerable and symbol keys, before field capture. `definedOptions` at line 55 handles nonenumerable supported fields without reevaluating their getters during merge.
- `src/core/normalizePathOptions.ts:5` centralizes path-query validation and capture. The shared live/original/store routes and multiple graph paths have public regression coverage (`tests/path-options-contract.test.ts:15`, `tests/path-options-contract.test.ts:118`).
- `src/core/assertPublicOptions.ts:100` accepts structural/cross-realm set protocols rather than using `instanceof Set`; focused source probes confirmed both forms preserve completed-work IDs. The public `ReadonlySet<ID>` contract in `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:69` remains intact.
- The rewrite helper projects its combined options and preserves explicitly supplied cache values for validation (`src/tools/rewrite-object/rewriteObject.ts:150`, `src/tools/rewrite-object/rewriteObject.ts:219`). New tests exercise rejected options before root mapping (`tests/configuration-contract.test.ts:179`).
- The fixture migrations for undefined work-completion retention, tagged positions, strict symbol/__proto__ rejection, family-specific phase maps and nonenumerable option capture reflect intentional contracts. Replacing array completed-work seeds with Sets matches the public `ReadonlySet` input; it does not justify a nominal Set-only validator, and the actual validator correctly remains structural.

### Issues

#### Critical (Must Fix)

- None found.

#### Important (Should Fix)

1. **Capture helper/group fields once before validating and using them.** `src/sources/materialize.ts:90` reads `id` in `assertOptionalCallbacks`, reads it again at line 96, and leaves callers such as `src/sources/graphFrom.ts:23` reading the original accessor again for each item. `src/traversals/graph-walk/walkSourceFrom.ts:50` / `:85` have the same validate-then-reread pattern. `src/traversals/dag-traversal/dagFragments.ts:61` checks `options.mapId` and rereads it at line 70. `src/core/visitors/normalizeVisitorDefinitions.ts:110` / `:113` read `groups` twice, and `:153` / `:164` read group `visitors` twice. A valid getter-backed input that supplies a callback/array once is rejected on its second read; a changing getter can also make execution use a different value from validation. The source probe reproduces `Error: id reread 2` for both DAG/walking materializers and `Error: visitors reread 2` for `addVisitorGroupFor`. Capture supported own fields once, validate that snapshot, and use the captured values throughout the call, including async loops and nested groups. Add focused tests for these boundaries, not only priority and position accessors.

2. **Walking still treats a source receiver as an option bag.** `src/traversals/graph-walk/lib/normalizeWalkOptions.ts:84` passes its source through `object()`, whose line 75 rejects every function. A function object with valid `roots` and `outgoing` methods satisfies `GraphWalkSource` / `AsyncGraphWalkSource` (`src/traversals/graph-walk/GraphWalkSource.ts:24`, `:32`) but both builders reject it with `TypeError: Walking source must be an object`. The explicit Task 3 source-protocol clarification applies across families; fixing tree/DAG callable sources in `src/core/assertPublicOptions.ts:113` leaves walking incomplete. Give source capture its own object-or-function receiver check, retaining arbitrary state, inherited methods and the receiver for invocation. Keep option-bag validation strict. Add sync/async public callable-source regressions. This is a pre-existing restriction left unfixed by the task, not a newly introduced regression.

#### Minor (Nice to Have)

- **Retain the removed malformed opposite-source cases.** The diff removes the `[null, 0, {}]` table from `tests/dag-source-patches.test.ts` immediately before the current line 187. Unlike the removed enumerable-only-option and undefined-reset expectations, those cases do not conflict with F04/F05. The surviving opposite-source test at line 86 covers a real replacement source, and `tests/configuration-contract.test.ts:200` covers some malformed patches, but the old sync/async × tree/graph malformed-opposite matrix and its no-callback/unchanged-source assertions are no longer present. Restore or migrate that small matrix; the removed checks are useful regression coverage even though the implementation still rejects those inputs.

### Checks and Evidence

- Reviewed supplied package `review-e7092bd..551edce.diff` for base `e7092bd2404bf2d8797ba68aa96292cbc093b977` and head `551edce916be911786c4f67723647edd1f3efea0`. The initial large output was truncated, so missing spans were read in smaller chunks; no second independent diff pass or git command was run.
- Named focused checks beyond supplied hunk context: materializer call sites for selector rereads (`src/sources/graphFrom.ts`, targeted references in `src/sources/forestFrom.ts`); source-capture function omitted from hunk context and structural source declarations for callable receiver acceptance; complete visitor normalization functions omitted between hunks and the public list/set contract for accepted metadata. `docs/reference.md:995` explicitly promises normalized list/set round trips, so accepting `addedIndex`/`visitorGroup` is intentional and is not reported as a strict-key defect.
- Read the final source/type/package log tails: 128 suites / 2913 tests pass, source coverage is 100%, typecheck completes, and packed CJS/native ESM plus node/node16 consumers pass. Targeted warning/error scans of those final logs and the lint log found no warning output. No suites, build, package verification or benchmark were rerun.
- Focused probe command, run from `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`: `node -r ts-node/register/transpile-only -r tsconfig-paths/register /tmp/ctt-task3-review-551edce/probe.cjs > /tmp/ctt-task3-review-551edce/output.log 2>&1` (exit 0; the probe catches and prints each individual outcome).
- Exact probe source: `/tmp/ctt-task3-review-551edce/probe.cjs`. Exact output: `/tmp/ctt-task3-review-551edce/output.log`. Output confirms the three accessor failures, both callable walking failures, and successful cross-realm/structural completed-work seeds. Metadata acceptance was also observed and reconciled with the documented round-trip contract.

### Assessment

**Task quality:** Needs fixes.

**Reasoning:** Core patch merging, strict own-key validation, path controls and tagged positions are sound and well covered. The incomplete helper/group capture and walking source-receiver handling still violate explicit Task 3 requirements despite the passing broad validation.
