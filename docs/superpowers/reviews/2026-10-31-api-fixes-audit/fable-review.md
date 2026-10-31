**Result: no source-level blockers. All twenty requirements are implemented in the working tree with regression evidence. One packaged-guide sentence still advertises the retired `configure({ limits })` form and should be corrected before merge.**

## Findings

**Important (verified defect, documentation contract)**

1. **Reference guide still advertises the rejected limits patch.** `docs/reference.md:127` says a supplied `configure({ limits: ... })` record replaces the previous limits record. The runtime rejects that key: `src/traversals/graph-walk/lib/normalizeWalkOptions.ts:156-167` switches the accepted key to `replaceLimits` whenever a previous configuration exists, and `assertOwnKeys` throws `TypeError: Unknown option: limits`. The same file contradicts itself three paragraphs later at line 170. Trigger: a reader copies the line-127 form into a builder patch and gets a TypeError, which is exactly the R04 class of defect. Fix: change line 127 to `configure({ replaceLimits: ... })` and drop the bold "replaces" claim about `limits`.

**Minor (verified, documentation wording)**

2. **Older packaged migration guides present retired names as current.** `docs/migration-uniform-api.md:370` states that `VertexRef<T>` is the exported handle alias, and line 382 plus `docs/migration-api-clarity.md:211,220` name `isTraversalLeaf` as canonical. Both guides carry a banner at line 3 pointing to the new migration, so impact is low. Fix: mark those sentences as superseded or substitute `VertexHandle` and `isChildExpansionSkipped`.
3. **Workflow guide uses the retired explanation literal.** `docs/agent-workflows.md:205` says explanations distinguish "unknown/deleted identities". The public literal is now `unresolved` (`src/traversals/dag-traversal/lib/DagInspection.ts:48`). Fix: say "unresolved/deleted".
4. **Audit record overstates walking wrapper freezing.** `requirements.json` R16 says "frozen detached wrappers". Edge events and follow contexts are detached plain copies, not frozen (`src/traversals/graph-walk/lib/WalkKernel.ts:242-248, 298-303`), and `tests/graph-walk-observations.test.ts:196-197` deliberately mutates them. The design spec and reference only promise detachment, so this is a record-wording issue, not a code defect. Fix: reword the requirement to "detached".
5. **No changelog entry.** `CHANGELOG.md` Unreleased has no line for this breaking migration. The design did not require one, so this is a preference.

**Preferences (not defects)**

- Private engine names `sortHints` and `SORT_HINTS` remain in `src/core/drivers/callbackBindings.ts:158` and `src/core/TraversalKernel.ts:666`. They are mapped to the public `transformChildHints` operation and never surface. Optional cleanup.

## Verdict table

| ID | Verdict | Implementation evidence | Test evidence |
| --- | --- | --- | --- |
| R01 | Pass | `Vertex.ts:29-34` copies membership; `clone()` at 58-71 routes every path through the copying constructor; `observationFacets.ts:27` freezes observed slices | `vertex-hint-ownership.test.ts:5-39`, `vertex-content-api.test.ts:61-90`, `api-distinctions.mjs:16-21` |
| R02 | Pass, doc fix needed | `GraphWalkOptions.ts:120-134`; `normalizeWalkOptions.ts:156-203` validates a detached candidate; `GraphWalk.ts:33-36` commits only after success | `graph-walk-limits.test.ts:263-285` (atomic rejection, replacement), `api-distinction-behavior.test.ts:60-90`, `api-distinctions.mjs:43`; defect in `reference.md:127` |
| R03 | Pass | `ChildHintTransformer.ts`; `CoreInspection.ts:24,36,48`; `assertPublicOptions.ts:22-35,102-104`; transformer receives a copy at `callbackBindings.ts:181`; `Vertex.getChildHints` | `core-inspection.test.ts:37,58,172`; migration guide documents non-permutation semantics |
| R04 | Pass | `reference.md:559` documents tagged `missing`/`identity`; `reference.md:1162` classifies `isComposite`/`getKeyPath` as observations | `uniform-source-results.test.ts`, `idiomatic-object-contracts.test.ts` (grep-level read only); residual contradiction is finding 1 |
| R05 | Pass | `kernelTypes.ts:58`; `GraphScheduling.ts:59-61,922-933`; tree `never` guards at `DagTraversalInstanceConfig.ts:89-105` and runtime check at 190-207; `PreparedDag.ts:23`; no `omittedWorkDependencies` in `src` | `uniform-dependencies.test.ts:48-81,258-259`, `idiomatic-scoped-operations.test.ts:189-286` |
| R06 | Pass | `PreparedDag.ts:9-15,60-63`; `makePreparedDag.ts:40-54` projects live children only, `definition` untouched | `api-distinction-behavior.test.ts:92-131`, `api-distinctions.ts:85-87`, `api-distinctions.mjs:68-69` |
| R07 | Pass | `DepthFirstTraversalRunner.ts:224-226`, async `212-214`; the set is populated only by `SKIP_REMAINING_CHILDREN` at `TraversalKernel.ts:1222` | `api-distinction-behavior.test.ts:25-58` (skipped root with retained child true; all-omitted root false) |
| R08 | Pass | `coordinateDag.ts:132-165` bind wrappers; `makePreparedDag.ts:90-104` creates a fresh runner per session | `dag-coordination.test.ts:159-168` (shared progress, foreign ticket rejected, alreadyAccepted), `api-distinctions.mjs:11` |
| R09 | Pass | `rewriteObject.ts:82-84,93-96,302-333`: absent/present tags, converter only on present roots, FINISHED gate, first-success caching | `api-distinction-behavior.test.ts:133-156` (null/undefined present, zero conversions when absent), `tests/helpers/rewriteOutput.ts` explicit projection, `api-distinctions.mjs:22-33` |
| R10 | Pass | `DagDiscoveryCycleError.ts:6-15` frozen witness; `DagDefinition.ts:46-47`; `validateDefinition.ts:124`; `preparationIssue.ts:15-17` | `prepared-dag.test.ts:750-774`, `dag-definition-validation.test.ts:48,220`, `dag-fragments.test.ts:828-829` |
| R11 | Pass | `TraversableTree.ts:44-48,62-78`; `normalizeSourceResult.ts:10-26,69-93` rejects `vertexId`, requires own wrapper; own-property identity via `identity.ts:7-9`; `GraphStore.ts:212-231`; `types.ts:49-54,173-177`; `observationFacets.ts:163-172` | `omission-identity-validation.test.ts` (malformed, inherited, getter-once, tree rejection), `api-distinction-behavior.test.ts:92-131` (known `undefined` ID) |
| R12 | Pass | `DagTraversalStallError.ts:20-28,47-65`; `GraphScheduling.ts:827-877` maps internal records to `vertexId`/`unmetPrerequisiteIds`; `DagTerminalObservation.ts:137-142` | `dag-diagnostics.test.ts:22-26`, `api-distinctions.mjs:101-110` |
| R13 | Pass | `coordinateDag.ts:38-50` extends `TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>>`; both runners' `inspect()` return that type (`DagTraversalRunner.ts:351`, async `316`); exported at `index.ts:14` | `api-distinction-contracts.typecheck.ts:47-50`, `api-distinctions.ts:88-92`, `api-distinctions.mjs:76` |
| R14 | Pass | `GraphWalkSource.ts:24-41` trailing `Hydration` with broad default; existing positions unchanged (diff lines 5996-6019); exported at `index.ts:7` | `api-distinction-contracts.typecheck.ts:25-46` including negative resolver/cached case, `api-distinctions.ts:36-51` |
| R15 | Pass | `Vertex.ts:9-14` readonly input; `TraversalVisitor.ts:27-29` readonly `newHints`; kernel copies at `TraversalKernel.ts:1288`; `types.ts:137-140` readonly `prepareSlots` | `api-distinction-contracts.typecheck.ts:17-24`, `vertex-hint-ownership.test.ts` |
| R16 | Pass | `GraphWalkEvent.ts:22`, `GraphWalkOptions.ts:56`, `WalkKernel.ts:243,301`; `reference.md:102-105` distinguishes endpoint from adapter; found/omitted target wrapper unchanged | `graph-walk-controls.test.ts:146-177`, `graph-walk-observations.test.ts:178-204`; wrappers are detached, not frozen (finding 4) |
| R17 | Pass | `ResolvedGraphView.ts:19-26,37-44`; `ResolvedTreeView.ts:14`; `ResolvedTree.ts:232-239`; `GraphStore.ts:46-47`; `DagGraphView.ts:15-18,43-55` hides synthetic holder; nullable siblings unchanged | `explicit-identity.test.ts:46-84` (`undefined`, `{}`, symbol IDs; unknown handle throws), `tree-query-ownership.test.ts:139-143`, `api-distinctions.mjs:89-95` |
| R18 | Pass | `DagInspection.ts:22-24,46-67,130-148`: `unresolved`/`deleted`/`live`/`omitted`, live progress non-null, omitted progress null and satisfied | `dag-inspection-explanations.test.ts:187-190,218,288-342`, `api-distinction-behavior.test.ts:116-125`; wording residue in finding 3 |
| R19 | Pass | `dagFragments.ts:55-114` returns `DagFragment`; `DagFragment.ts` has no instance alias; `index.ts:18-22,44` | `api-distinctions.ts:79-82`, `api-distinctions.mjs:12,98-100`, `dag-fragments.test.ts` (grep-level) |
| R20 | Pass | `core/index.ts:13` exports only `VertexHandle`; `graph/types.ts:16` `InternalVertexRef`, `180-194` direct `ResolvedGraphVertex`; `CTTRef.ts:25-31` | `observation-facets.test.ts:40-84`, `api-distinctions.ts:132-135` negative import |

**Overall readiness:** ready apart from finding 1. The source, type surface, package consumers and migration guide are consistent with the design for all twenty requirements, and the recorded full check passed (137 suites, 3133 tests, 100% coverage, TypeScript 4.7.4 consumers). Fix the one stale sentence in the reference guide, optionally the minor wording items, and no re-review of code is needed.

## Verification limitations

- Read-only review. I did not run tests, typecheck, build or package verification. Pass evidence for executed behavior comes from reading test source plus the saved `check-final.log` and `package-typescript-4.7.4-final.log`.
- I read the 660 KB implementation diff only in targeted hunks and reviewed the current working tree directly instead.
- Built declaration files were not inspected. CJS/ESM identity relies on `api-distinctions.mjs` assertions and the recorded package pass.
- Several listed verification files (`uniform-source-results`, `idiomatic-object-contracts`, `prepared-source-contracts`, `dag-fragments`) were checked by grep for the relevant assertions rather than read end to end.
