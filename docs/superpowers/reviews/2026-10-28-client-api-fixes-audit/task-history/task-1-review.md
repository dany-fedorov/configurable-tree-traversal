# Task 1 review — F01/F02

## Spec Compliance

- ✅ Spec compliant for F01/F02. Current properties and assembled values are unknown; output replacement patches retain their declared types. `convertRootValue` consumes unknown and completion context; specific ordinary output requires conversion, while `rewriteObjectAs` is the explicit assertion (`src/tools/rewrite-object/rewriteObject.ts:49`, `:124`, `:128`, `:142`, `:310`; `src/traversable-tree-implementations/traversable-object-tree/lib/ObjectCurrentVertexTypes.ts:13`).
- ✅ Both adapters are required for narrow source domains through constructor overloads, option aliases, rewrite helpers and `fromProperties`; default helpers expose truthful key/value types (`src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts:64`, `:96`, `:103`; `lib/TraversableObjectTreeInstanceConfig.ts:60`; `lib/createRootPropertyMapper.ts:5`; `lib/getChildrenOfPropertyDefault.ts:6`). The abbreviated `lib/` paths in this report refer to the object-tree implementation directory.
- ✅ Generic-only output, pretyped/spread options, narrow default discovery, incomplete adapters, narrow converter inputs, falsely precise assembly and cache variance receive negative type assertions (`tests/object-domain-contracts.typecheck.ts:10`, `:25`, `:33`, `:44`, `:78`, `:106`, `:117`, `:126`). Packed consumers exercise the same boundaries (`scripts/package-consumers/rewrite-output.ts:683`, `:707`, `:782`).
- ✅ The changed reference and migration section explain intentional breaking types without compatibility aliases (`docs/reference.md:1146`; `docs/migration-idiomatic-api.md:104`). Later hook/request/policy changes remain outside this task.
- ⚠️ Whole-migration validation is outside this task review. The controller must run the final standard check after integration. This diff does not alter scheduling, arbitrary graph IDs or constructor/declaration identity; packed identity evidence is available below.

## Strengths

- The function-valued `ObjectAssemblyCache` protocol closes the Map method-variance escape route while preserving ordinary `Map<Key, unknown>` and reference identity (`lib/makeMutationCommandFactory.ts:17`, `:63`, `:128`, `:172`; `tests/object-domain-contracts.typecheck.ts:106`).
- Output conversion retains completion gating and caches only successful final conversions; thrown values are neither wrapped nor marked successful (`src/tools/rewrite-object/rewriteObject.ts:278`, `:296`). Real runner regressions cover paused snapshots, completion context, repeated-get identity, exact failures and retry (`tests/rewrite-result-contract.test.ts:31`, `:66`, `:82`, `:109`).
- Runtime regressions use actual source/rewriter behavior, including mixed reconstructed arrays, precise discovery and rejection of incomplete precise adapters or the removed converter before callbacks (`tests/object-domain-contracts.test.ts:4`, `:13`, `:32`, `:47`, `:66`). Changed examples and consumer migrations use broad types, runtime narrowing or actual adapters; no new deceptive consumer casts restore precision.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

None.

### Minor (Nice to Have)

None.

## Checks and review limits

- Reviewed the supplied committed diff for `c736eb7bbbc2104b1605514123b132dc57573a33..994603af5108267e6cb9461e7df79bf79a48b0e0`, the task brief, design requirements and implementer report. Large tool output was read in bounded sections; no Git commands were used.
- Named export risk: the brief mentions `src/index.ts`, which has no change. Checked its existing star exports at lines 3 and 11; they already expose the newly exported converter/cache/adapter types. No root export edit is needed.
- Hunk completion checks: read only the middle/tail of `rewriteObject.ts` and `makeMutationCommandFactory.ts`, where diff hunks cut through functions, to trace cache injection, actual callback assembly, final conversion and cache writes. No broader source crawl was performed.
- Inspected existing RED evidence: `task-1-red-types.log:5` and `:11` show missing API and unused negative assertions; `task-1-red-cache.log:5` isolates the former cache escape; `task-1-red-boundaries.log:106` records five failed boundary cases before guards.
- Inspected existing GREEN evidence: `task-1-typecheck-green.log:2` and `task-1-lint-green.log:2` contain no diagnostics; `task-1-green-boundaries.log:29` records 18 passing tests; `task-1-final-coverage.log:3368` records 125 suites and 2,848 tests passing, with the coverage table reporting 100% in all categories. No validation warning or failure noise was found.
- Inspected `task-1-package-final-verification.log:21`: TypeScript 4.9.5 packed node/node16 `.ts/.cts/.mts` checks, CJS/ESM identity, guide navigation and 24 standalone snippets passed. The changed example output is retained in `task-1-final-example.log:36`.
- No suite, build, package check or scratch probe was rerun. No source, index, HEAD or branch mutation was made; this report is the sole artifact written.

## Assessment

**Task quality: Approved.** The public type boundaries match F01/F02 and preserve converter lifecycle and cache semantics. Focused source and packed regressions cover the identified escape routes without weakening coverage or introducing compatibility aliases.
