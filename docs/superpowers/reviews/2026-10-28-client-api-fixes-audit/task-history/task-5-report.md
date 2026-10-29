# Task 5 implementation report

Date: 2026-10-28. Branch: `feat/api-clarity-migration`. Base: `e6ad10b822fcfdfd96b78722f544fd04fd8f5e61`.
Scope: F06, F18 and walking callback-operation F19. No subagents, push, merge or publication. Original checkout and untracked review artifacts preserved.

## Contracts implemented

- `GraphWalkSource` and `AsyncGraphWalkSource` are hydration-discriminated unions. `resolver` requires a callable `resolveVertex` and permits mixed inline-resolution and ID targets. `inlineOrCached` requires tagged inline/cached targets and rejects non-undefined resolvers during source capture. Hydration mode and methods are captured once while retaining the original receiver, including callable sources, inherited methods and caller state.
- Parent clarified that an absent resolver, explicit undefined field and getter yielding undefined all mean no resolver. Both unions deliberately use `resolveVertex?: undefined`, preserving exact-optional type acceptance and existing getter-once runtime behavior. Positive field/getter assertions and negative actual-resolver assertions cover this. Included the parent's two tracked design/plan clarification edits; local brief/ledger remain ignored.
- `WalkSourceCache` validates/captures tagged no-resolver targets without resolving them. Cached misses reject with `TypeError('Cached walking target has no admitted resolution')` at admission, without manufacturing a resolver request. Inline roots support cached self/backedges. First admitted found/omitted resolutions remain authoritative; later inline resolution getters are skipped when cached; rejected links cannot seed cache. Source resolution, adjacency replay, filtering, counts, iterator disposal and exact error retention stay local to the existing admission/session lifecycle.
- Record and DAG-definition materializers explicitly return synchronous `resolver` sources, with resolver-specific return declarations. Async eager catalog materialization still awaits its inputs once and returns the same reusable synchronous protocol.
- Exported reusable `GraphWalkRecordSelectors`, `AsyncGraphWalkRecordSelectors`, and `GraphWalkCatalogLink` from the family entry point and root/namespace re-export. Both materializer signatures consume named selectors. Catalog relations use readonly `to`/`data`, remain distinct from lazy `target` wrappers, and retain payload identity.
- Walking pending callbacks now report `operation: 'visit'`; phases, callback names and distinct iterator operations remain unchanged. Source/runtime/type fixtures and packed consumers use the new spelling and reject the retired literal.
- Migrated walking source fixtures, type assertions, runnable examples, packed runtime/type consumers and current reference/workflow/migration guides. Malformed-source protocol tests now receive valid modes so they exercise their intended failures. No F03 facade or F09 emission-timing changes.

## RED and GREEN evidence

Logs are relative to this report's plan workspace. Scripts used for implementation/migration were dated `/tmp/task-5-*-20261028.*` files. All final commands below exited 0 except the explicitly described earlier RED/boundary runs.

| Command | Exact result | Evidence |
| --- | --- | --- |
| `npm test -- --runTestsByPath tests/graph-walk-hydration.test.ts` before implementation | After fixing a test-only union narrowing issue, **6 failed / 5 passed**: missing/invalid modes and forbidden resolvers were accepted; cached misses had the old unresolved-target failure. Existing cycle/omission preservation assertions passed | `task-5-red.log` |
| Same focused command immediately after implementation | **11 passed / 1 suite** | `task-5-green-initial.log` |
| `npm test -- --testPathPattern='graph-walk.*test.ts$'` after migration | **364 passed / 18 suites**, including promised async iterables, cached cycles, omissions, rejected links and lifecycle/resource regressions | `task-5-focused-green.log` |
| `npm run check` final boundary attempt, first components | Typecheck and lint passed. Full source coverage: **131 passed suites / 3,049 passed tests; All files 100 statements / 100 branches / 100 functions / 100 lines**. **21 examples verified**. Build and packed runtime consumers passed. The packed type stage exposed one unmigrated `visitor` literal in `supported-exports.ts` | `task-5-check-final.log` |
| `node scripts/verify-package.cjs` after migrating that fixture | Passed packed runtime/type CJS/native-ESM contracts; supported and denied node/node16 `.ts/.cts/.mts` imports; local TypeScript **4.9.5**; checkout/tarball guide links and **24 standalone snippets**; Node **v24.20.0**, **788 files** | `task-5-package-final.log` |
| `npm run test:benchmark` | **25 passed / 0 failed** | `task-5-benchmark.log` |
| `npm run test:packaging` | **7 passed / 0 failed** | `task-5-packaging.log` |
| `npm test -- --runTestsByPath tests/graph-walk-options.test.ts` after strengthening malformed-source modes | **53 passed / 1 suite** | `task-5-malformed-source-validation.log` |
| `npm test -- --runTestsByPath tests/graph-walk-hydration.test.ts tests/graph-walk-options.test.ts` after undefined-resolver clarification | **67 passed / 2 suites**, including two new sync/async undefined-field/getter cases | `task-5-undefined-green-final.log` |
| `npm run typecheck` after clarification | `tsc --noEmit`, exit 0. New reusable catalog types, readonly fields, required modes/resolvers/tags, and undefined getter/field assertions all compile as intended | `task-5-typecheck-final.log` |
| `npm run lint` after clarification | `eslint src tests examples --ext .ts`, exit 0 | `task-5-lint-final.log` |
| `npm run verify-package` after clarification | Rebuilt declarations and rechecked all packed runtime/type consumers and changed guide snippets/navigation successfully | `task-5-package-clarified.log` |
| `git diff --check` | Exit 0, no whitespace diagnostics | Self-review/commit boundary |

All constituent gates of `npm run check` passed. The full source suite was not repeated after successful coverage; later changes were type/doc alignment and focused test strengthening. Package builds/consumers remained serialized. An initial boundary attempt stopped on a formatted existing `@ts-expect-error` directive; it was moved to its actual error location before the passing typecheck/source suite. No coverage thresholds, compiler/dependency floors, source discovery eagerness or family capabilities changed.

## Files and self-review

Full scoped tracked file list: `task-5-files.txt` (includes the two new public hydration regression/type fixtures). Main code files are the walking source/operation contracts, normalizer, cache/kernel, materializers and walking export barrel. Other changes migrate their consumers, current guides, two examples and the parent's two specification/plan clarification lines.

Reviewed the complete source/admission/type/doc/consumer diff. Verified that cached existence checks occur after edge eligibility and filtering; copying a rejected link does not commit a resolution; omissions remain first-win; no user callbacks run at construction; all materializers declare resolver mode; async materializers still expose synchronous methods; callback receiver and inherited/callable protocols are retained; catalog edge payloads remain shallow; phase/iterator operation domains and F09 delivery behavior are unchanged. Existing coverage reaches all new runtime branches at 100%.

Concerns: none outstanding. The absent/undefined-resolver convention is an explicit parent-approved clarification recorded in spec, plan, types, docs and focused assertions. The baseline package version remains 0.11.0; no publication claims or compatibility aliases were added.

Local commit: `fdb957a72fb968442e26a97b907ef6f19d61d3e9` (`feat: declare walking hydration modes and catalog selectors`). Post-commit status contains only the two pre-existing untracked review artifacts. No active code changes remain.
