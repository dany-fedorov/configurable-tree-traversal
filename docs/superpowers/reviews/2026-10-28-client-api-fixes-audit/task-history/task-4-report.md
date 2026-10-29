# Task 4 implementation report

Date: 2026-10-28. Branch: `feat/api-clarity-migration`. Base: `9bcecd1a916392ce10eda0a8fa82d909c0149715`.
Scope: F07, F08, F12, F14 and the tree/DAG sorter operation part of F19. Task 1–3 contracts remain intact. No subagents/reviewers, push, merge or publication.

## Implementation

- **F07:** Added private `engineDagValidationErrors`, keyed by the exact graph-store object. Only engine construction sites in `GraphStore`, `GraphScheduling` and `TraversalKernel` register their discovery-cycle/stall error. `preparationIssue` requires both owner identity and exact error identity before converting. Sync `prepareDagSource` and async `prepareDagAsync` use this shared classifier. Source-thrown lookalike errors and genuine engine errors reused from another runner are therefore preserved unchanged, including errors from source callbacks, getters and later iterable reads. The old callback-only capture set was removed. `DagDefinitionIssue` adds `{ kind: 'discoveryCycle', vertexIds: readonly ID[] }`. Existing authored `structuralCycle` SCC issues stay distinct. Direct runner execution retains the exact typed exception/witness behavior.
- **Witness order:** Parent confirmed that the engine's existing order is normative. The closing edge in `a -> b -> a` yields `['b', 'a', 'b']`, retained without rotation. Existing object-ID/self-cycle cases now verify both structured preparation invalidity and direct runner exceptions, preserving ID identity and frozen engine witnesses.
- **F08:** Renamed accepted/default completion policy to `afterWorkReadyChain` in public/internal types, validators, normalized runner inputs, active docs, type fixtures and packed consumers. The old literal rejects at runtime and in types. Empty and filtered readiness chains still complete W automatically; external settlement, seeds, pause and explicit deferral retain their existing behavior.
- **F12:** Replaced the copyable unique-symbol ticket brand with a private declared nominal class plus exported type alias. The declaration has a private constructor/private member, and produces no runtime class or value binding. Spreads fail settlement typechecking; existing WeakMap provenance and original ticket objects are unchanged. Source and packed fixtures assert root/DAG-subpath/namespace constructor absence and CJS/ESM declaration identity.
- **F14:** `DagVertexProgress` requires readonly exact W/C wait arrays. Kernel summaries always emit both arrays, including empties, using the scheduler's independent sets. Inspection and terminal-observation copies retain detached required arrays. Removed the now-unused private `hasCompleteDependencies` predicate and its private contract member. Updated manual source/packed fixtures and assertions formerly expecting an absent C field. Overlapping IDs stay in both arrays and are not reconstructed by subtracting C from their union.
- **F19:** Tree/DAG inspection type and runtime operation use `sortChildrenHints`; `visit` stays `visit`. Source tests observe this from all six sync/async tree/DAG runners. Public docs and packed diagnostic fixtures migrated.
- **Documentation:** Updated README, reference, workflow/default descriptions, migration guides, AGENTS and testing map. Added a packaged migration section covering the breaking literal, preparation result, ticket and progress contracts. Existing anchors stay present. No runnable example contained an affected old completion literal, so examples required no edits.
- Included the parent's Task 4 plan file-map correction: both preparation entry points live in existing `prepareDag.ts`; no separate async module was created. Also included the parent's witness-example clarification in that same Task 4 plan section.

## RED evidence

1. Added `tests/dag-precise-contracts.test.ts`, updated the public sorter diagnostic assertion, and ran:

   `npm test -- tests/dag-precise-contracts.test.ts tests/idiomatic-diagnostics.test.ts`

   Corrected one test-fixture array typing error first. The valid RED run then reported **17 failed, 69 passed / 2 failed suites**: cycles threw instead of returning invalid; source-thrown same-class stall errors from dependency iterables were reclassified; `afterWorkReadyChain` rejected; old `visitorReturn` accepted; empty C wait arrays were absent; sorter operation was `sortChildHints`. Evidence: `task-4-red.log`.

2. Added spread rejection assertions in `tests/dag-coordination.typecheck.ts` and compiled that focused root through the repository tsconfig using the TypeScript API:

```js
const ts = require('typescript');
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const program = ts.createProgram(['tests/dag-coordination.typecheck.ts'], {...parsed.options, noEmit: true});
const diagnostics = ts.getPreEmitDiagnostics(program);
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
process.exit(diagnostics.length ? 1 : 0);
```

   RED exit 1: **two TS2578 unused `@ts-expect-error` diagnostics**, proving copied tickets were previously accepted. Evidence: `task-4-types-red.log`. Both assertions are consumed by actual private-member errors after implementation, as proved by the final typecheck and packed consumers.

## GREEN and final verification

All logs below are in this report's plan workspace. Dist builds were serialized with their package consumers; source tests/lint/typecheck did not mutate dist. Every command listed completed with exit 0 unless the row explicitly describes the earlier failed boundary attempt.

| Command | Exact covering result | Evidence |
| --- | --- | --- |
| `npm test -- tests/dag-precise-contracts.test.ts tests/idiomatic-diagnostics.test.ts` | 2 suites / 86 tests passed immediately after implementation | `task-4-green.log` |
| `npm test -- tests/dag-precise-contracts.test.ts tests/prepared-dag.test.ts tests/prepared-source-contracts.test.ts tests/dag-definition-validation.test.ts tests/dag-coordination.test.ts tests/dag-completion-dependencies.test.ts tests/external-completion-policy.test.ts tests/completion-policy-capture.test.ts tests/idiomatic-diagnostics.test.ts` | **9 suites / 312 tests passed** after migrating old fixtures and adding owner-isolation/six-family regressions | `task-4-focused.log` |
| `npm run typecheck` | `tsc --noEmit`, exit 0 | `task-4-typecheck-final.log` |
| `npm run lint` | `eslint src tests examples --ext .ts`, exit 0 | `task-4-lint-final.log` |
| `npm run test:coverage` (first boundary attempt) | All 130 suites / 3,037 tests passed; gate rejected 99.98% statements/lines and 99.91% functions because F14 made the private `hasCompleteDependencies` helper unused | `task-4-coverage.log` |
| `npm run test:coverage` (after removal of that unused helper) | **130 suites / 3,037 tests passed; All files 100 statements / 100 branches / 100 functions / 100 lines** | `task-4-coverage-final.log` |
| `npm run verify-examples` | **Verified 21 TypeScript examples** | `task-4-examples.log` |
| `npm run verify-package` (first boundary attempt) | Build and earlier consumers passed; legacy foundations fixture still expected helper preparation to throw a cycle error. Migrated it to assert direct-runner throw and added structured helper-invalid assertions | `task-4-package.log` |
| `npm run verify-package` (after fixture migration) | **Passed:** shared CJS/native ESM; supported/denied root/subpath/namespace imports; strict mixed node/node16 `.ts/.cts/.mts`; nominal tickets and no constructor binding; runtime copied-ticket rejection; cycle invalid results; required progress arrays; local **TypeScript 4.9.5**; guide navigation in checkout/tarball and **24 standalone snippets**; Node **v24.20.0**, 788 tarball files | `task-4-package-final.log` |
| `npm run test:benchmark` | **25 passed / 0 failed** | `task-4-benchmark.log` |
| `npm run test:packaging` | **7 passed / 0 failed** | `task-4-packaging.log` |
| `git diff --check` | Exit 0, no whitespace diagnostics | Run at self-review/commit boundary |

These are all constituent gates of `npm run check`, executed as individual commands to honor the instruction not to repeat a successful full source suite unnecessarily. The full source run was repeated only because its first coverage gate failed, and the package build/consumers only because the earlier packed fixture failed. No coverage thresholds or compiler/dependency floors changed.

## Self-review

Reviewed the complete source/type/runtime/documentation diff and rechecked every scoped contract against the design and brief. Confirmed:

- Provenance cannot be forged using an error class, name, copied public tag or prior-runner error; the private owner/error identities must match.
- Callback receiver semantics and first-read capture remain intact; the pre-existing non-enumerable/inherited source contract tests pass.
- Discovery issue ordering and arbitrary object-ID identity are retained; authored SCC issues are unaffected.
- The nominal class is declaration-only and private; no public runtime constructor/value binding was introduced. WeakMap settlement validation still accepts original tickets and rejects foreign/copied/forged/stale tickets.
- Both progress arrays remain independently owned and detached across summaries, explanations and terminal reads. No subtraction of C from W/C union.
- Completion admission, callback/command order, explicit deferral, pause and emission timing are unchanged. No F03 graph-view/facade, F06 hydration or F09 delivery-selection changes.
- Full coverage exposed one obsolete private helper, removed instead of adding an implementation-mirroring test or relaxing the gate. Packed consumer failure was an intentionally superseded expectation, not a runtime defect.
- All active old literal occurrences now occur only in explicit rejection/migration examples; historical research/plans were left alone except the parent-requested Task 4 plan corrections.
- Preserved original checkout and pre-existing untracked review artifacts. New logs/report/file list are only `task-4-*` in the designated plan workspace. No external writes or release actions.

No unresolved Task 4 concerns. Intentional consumer breaks are described in the migration guide. Published-floor TypeScript 4.7.4 execution belongs to the separately assigned final audit; this task's packed run used the installed 4.9.5 compiler and did not change the floor.

## Changed files

- `AGENTS.md`
- `README.md`
- `docs/agent-workflows.md`
- `docs/migration-api-clarity.md`
- `docs/migration-idiomatic-api.md`
- `docs/migration-uniform-api.md`
- `docs/reference.md`
- `docs/superpowers/plans/2026-10-28-client-api-fixes.md`
- `docs/testing.md`
- `scripts/package-consumers/agent-api-foundations.mjs`
- `scripts/package-consumers/agent-api-foundations.ts`
- `scripts/package-consumers/idiomatic-diagnostics.ts`
- `scripts/package-consumers/uniform-api.mjs`
- `scripts/verify-package.cjs`
- `src/core/CoreInspection.ts`
- `src/core/TraversalKernel.ts`
- `src/core/errors/engineDagValidationErrors.ts`
- `src/core/graph/GraphStore.ts`
- `src/core/graph/types.ts`
- `src/core/kernelTypes.ts`
- `src/core/scheduling/GraphScheduling.ts`
- `src/traversals/dag-traversal/coordinateDag.ts`
- `src/traversals/dag-traversal/lib/AsyncDagTraversalRunner.ts`
- `src/traversals/dag-traversal/lib/DagDefinition.ts`
- `src/traversals/dag-traversal/lib/DagInspection.ts`
- `src/traversals/dag-traversal/lib/DagProgress.ts`
- `src/traversals/dag-traversal/lib/DagTerminalObservation.ts`
- `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts`
- `src/traversals/dag-traversal/lib/DagTraversalRunner.ts`
- `src/traversals/dag-traversal/lib/capturePreparedSource.ts`
- `src/traversals/dag-traversal/lib/dagRunnerCapabilities.ts`
- `src/traversals/dag-traversal/lib/preparationIssue.ts`
- `src/traversals/dag-traversal/lib/prepareDagSource.ts`
- `src/traversals/dag-traversal/prepareDag.ts`
- `tests/completion-policy-capture.test.ts`
- `tests/dag-completion-dependencies.test.ts`
- `tests/dag-coordination.test.ts`
- `tests/dag-coordination.typecheck.ts`
- `tests/dag-inspection.typecheck.ts`
- `tests/dag-precise-contracts.test.ts`
- `tests/external-completion-policy.test.ts`
- `tests/idiomatic-diagnostics.test.ts`
- `tests/idiomatic-diagnostics.typecheck.ts`
- `tests/prepared-dag.test.ts`
- `tests/public-api.typecheck.ts`

## Commit

`791d80f418cbb86d443b20e40af0021133adf18d` — `fix(dag): make preparation and completion contracts precise`.

Post-commit `git status --short` contains only the two pre-existing untracked review artifacts; no tracked changes remain.

## Minor review follow-up: troubleshooting cycle handling

Read `task-4-review.md` and verified its sole finding against the implemented helper/direct-runner contracts. Corrected only the existing “Missing prerequisite or cycle” troubleshooting row in `docs/agent-workflows.md`: engine-detected structural cycles return helper `invalid` / `discoveryCycle` issues retaining the ordered closed witness, while direct runners throw `DagDiscoveryCycleError`. Kept W/C milestone handling, adapter `TypeError`, authored invalid issues and exact source/caller-thrown error distinctions explicit. No production code, links or examples changed.

Self-read the complete edited row and inspected `git diff -- docs/agent-workflows.md`; only its prose changed. Ran `git diff --check`: exit **0**, output **empty** (evidence `task-4-doc-review-fix-check.log`). No suites or package commands repeated, as instructed for this prose-only correction.

Follow-up commit: `e6ad10b822fcfdfd96b78722f544fd04fd8f5e61` — `docs: clarify workflow preparation cycle results`.
