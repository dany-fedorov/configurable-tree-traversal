# Public API clarity review

The largest comprehension problems are mismatches of **purpose, timing and scope**, rather than unfamiliar spelling. A caller can currently mistake a DAG source adapter for a general graph constructor, committed work events for dispatch signals, visitor activity for host work, and retained discovery structure for a frozen snapshot.

This review recommends exactly **20 coordinated improvements**, ranked below by expected impact on agentic comprehension: **5 = most impactful; 1 = least impactful**. Scores measure avoided mistakes, not implementation effort or compatibility cost. These are proposals, not implemented API changes. Names cannot make timing contracts self-evident in every context; the target is one clear role per name with truthful types and meaningful configuration.

Reviewed baseline: `e52fab02333a044472e9aea864db26a8c33fc051`. Existing local edits removing release-status caveats were preserved. Source and package behavior were unchanged by this review.

| # | Impact | Improvement | Representative change |
| --- | --- | --- | --- |
| 1 | 5 | Restrict the supported public surface | Hide kernels, raw state injection, normalization and wildcard engine imports |
| 2 | 5 | Separate callback eligibility from committed events | `ON_READY` callback versus `workCompleted` event, with different selector types |
| 3 | 5 | Name progress collections for their actual contents | `readyIds` → `readyOrDeferredIds`; `inFlightIds` → `activeVisitorVertexIds` |
| 4 | 5 | Use explicit work/subgraph-completion terminology | `dependsOnWork`, `dependsOnSubgraphCompletion`, `completeWork` |
| 5 | 5 | Name source adapters by target, input and eager effect | `graphFrom` → `materializeDagSourceFromRecords` |
| 6 | 5 | Name discovery contracts and resolution callbacks | `TraversableTree` → `TreeSource`; `makeVertex` → `resolveChild` |
| 7 | 5 | Name original discovery structure without implying immutability | `saveNotMutatedResolvedGraph` → `retainOriginalGraphStructure` |
| 8 | 5 | Make diagnostic direction and cycle representation explicit | `DagWaitEdge { waiter, prerequisite }`; `dependencyCycleComponents` |
| 9 | 5 | Scope the object mutation factory and its stages | `makeMutationCommandFactory` → `createObjectMutationBinder` |
| 10 | 5 | Make object rewriting callable and output timing explicit | Root `rewriteObject` becomes the function; `outputObject` → `outputAtReturn` |
| 11 | 4 | Normalize factories and preparation result names | `createRunner`, `createWorkSession`, `PrepareDagResult` |
| 12 | 4 | Scope tree-only traversal APIs to trees | `DepthFirstTraversal` → `DepthFirstTreeTraversal` |
| 13 | 4 | Distinguish execution iteration from passive reads | `getIterable` → `iterateEvents`; pause terminology for pause commands |
| 14 | 4 | Name captured milestone inspection as a snapshot | `DagInspection` → `DagMilestoneSnapshot` |
| 15 | 4 | Make predicates reveal their subject and decision | `shouldExpandVertex`, `hasSingleStructuralSink`, `hasNoChildHints` |
| 16 | 4 | Give walking budgets and counters precise units | `maxSteps` → `maxCandidateReadAttempts` |
| 17 | 4 | Align callback contexts, phases and coordinate scopes | `DagVisitorOptions` → `DagVisitorContext`; `phaseObservationIndex` |
| 18 | 4 | Distinguish handles, payloads, records, stores and edges | `MutableRef`, `VertexRef`, `ResolvedGraphVertex`, `StructuralChildEdge` |
| 19 | 3 | Use one public options/patch grammar | Construction `Options`, configure `OptionsPatch`, internal resolved options |
| 20 | 3 | Make in-order positioning legible | `afterChildIndices`, `fallbackChildIndices`, `visitAfterOmittedChildren` |

## 1. Restrict the supported public surface — 5/5

The export map makes all emitted modules reachable, including effect protocols, queue policies, raw stores, state bridges and normalization functions. Public runners also expose mutable implementation state. These look like supported choices alongside the deliberately designed API.

Replace wildcard exports with intentional entry points, remove engine helpers from root barrels, and encapsulate `icfg`, `state`, `curGenerator`, raw container/visitor fields and `traversalRunnerInternalObjects`. Hide runner constructors requiring normalized engine inputs; expose public-options factories or public execution interfaces instead. Preserve diagnostic contracts that are intentionally returned to callers, such as the operation union used by `GraphWalkInspection`; give that union the public name `GraphWalkOperation`.

This avoids false alternatives such as `WalkLink` versus `GraphWalkLink`, `runAsync` versus a runner's `run`, and kernel settlement versus work-ticket settlement. Notably, deep `runAsync` only aliases `createAsyncDriver`; it is not a sync/async counterpart to the `runSync` generator. An `@internal` comment or an exported `internal/` directory is not a boundary.

Evidence: [export map](../../../package.json), lines 175–196; [async driver](../../../src/core/drivers/runAsync.ts), line 141; [walking runner constructor](../../../src/traversals/graph-walk/GraphWalkRunner.ts), line 20. Compatibility cost: high for raw-state/deep-import consumers. This is a deliberate contract change, not an assumption those users do not exist.

## 2. Separate callback eligibility from committed events — 5/5

`ON_READY` is a visitor phase before work commitment, but also an iterator event's `order` after commitment. The event's existing `kind: 'workCompleted'` is accurate. An agent treating that event as a dispatch request acts at the wrong lifecycle boundary.

Use `DagVisitorPhase.ON_WORK_READY` and `ON_SUBGRAPH_READY` for callbacks. Select emitted DAG observations by their actual event kinds, `workCompleted` and `subgraphCompleted`; remove the redundant callback-phase label from those events. Keep independent callback and event filters. Prefer the common selector name `emitEvents` across families, specialized to each family's event discriminants (including tree event phases; this does not imply trees already expose a `kind` field), with `visitorPhases` for callbacks. A shared execution type must carry separate visitor-phase and emitted-event parameters, rather than forcing DAG events into the callback enum.

This is a type/filter migration preserving current timing. It must not move an event earlier or silently turn committed observations into dispatch notifications. Tree and walking callbacks/events may naturally share a phase vocabulary; that does not justify conflating DAG W/C eligibility and commitment.

Evidence: [DAG event contract](../../../src/traversals/dag-traversal/lib/DagTraversalVisitor.ts), lines 68–81; [event projection](../../../src/traversals/dag-traversal/lib/DagTraversalRunner.ts), lines 405–417. Compatibility cost: high for enums, filtering and callback generics.

## 3. Name progress collections for their actual contents — 5/5

Use `readyOrDeferredIds` and `counts.readyOrDeferred`, `activeVisitorVertexIds` and `counts.activeVisitorVertices`, `awaitingSettlement` for the generation-bearing frontier records, and `deferredWorkIds` for the broader deferred set. Rename the `DagWorkState` literal `running` to `visiting` so it cannot be mistaken for host-agent execution.

The current `readyIds` includes both ready and deferred states, excluding running and completed states. Therefore even `dependencySatisfiedWorkIds` would be too broad. `inFlightIds` comes from active visitor chains, including completion chains. `deferredFrontier` excludes already accepted outcomes; `deferredIds` does not. These counts overlap rather than partition work state.

Dispatch remains based on awaiting-settlement records or session work tickets, with the existing generation checks. Attempts, host claims and external running state stay with the application.

Evidence: [summary implementation](../../../src/core/TraversalKernel.ts), lines 692–745. Compatibility cost: medium/high for progress fields and state literals; no scheduling algorithm change is needed.

## 4. Use explicit work/subgraph-completion terminology — 5/5

Use `dependsOnWork` for W and `dependsOnSubgraphCompletion` for C throughout selectors, source results, definitions, prepared vertices and graph records. Use `subgraphComplete`, `completedSubgraphIds`, `subgraphCompleted`, and `unmetSubgraphPrerequisiteIds` instead of the current complete/subtree mixture. Use milestone literals `work` and `subgraphCompletion`; align relation selectors and diff aspects with these nouns.

Rename session `complete(ticket)` to `completeWork(ticket)`. Rename the active visitor command `DEFER_READY` to `DEFER_WORK_COMPLETION`: readiness has already occurred, and the command ends that callback chain while deferring W. Keep the deprecated sentinel compatibility-only; do not promote a renamed sentinel alongside the command.

C includes structural descendant completion and declared constraints. It is neither an ordinary task outcome nor simply an `ON_COMPLETE` callback returning. Shared descendants make subgraph the appropriate DAG term. Structural child edges remain a separate relation.

Evidence: [progress types](../../../src/traversals/dag-traversal/lib/DagProgress.ts); [work settlement](../../../src/traversals/dag-traversal/coordinateDag.ts), lines 93–97; [resolved graph records](../../../src/core/graph/types.ts), lines 58–68. Compatibility cost: high, including serialized declaration fields. Preserve arbitrary ID identity and exact error values.

## 5. Name adapters by target, input and eager effect — 5/5

| Current | Proposed |
| --- | --- |
| `graphFrom` | `materializeDagSourceFromRecords` |
| `forestFrom` | `materializeDagSourceFromRoots` |
| `walkSourceFrom` | `materializeWalkSourceFromRecords` |
| `walkSourceFromDag` | `materializeWalkSourceFromDagDefinition` |

Apply the same names plus `Async` to asynchronous materialization variants. Name the DAG result `MaterializedDagSource`, with `DagRecordSelectors` and `DagRootSelectors`.

**The purpose of `graphFrom` is convenience adaptation:** take the application's finite records and selectors, copy membership/edge lists, retain original data and ID identity, and supply the DAG discovery callbacks plus synthetic-root options. It saves implementing the lower-level source protocol. It does not execute work or validate the complete DAG semantics; preparation does that later. All catalog records are included, including disconnected ones.

The asynchronous materializers return synchronous sources after awaiting input. Lazy discovery instead belongs to the source protocols. `forestFrom` also permits shared records, so its present name does not establish a strict tree forest. The DAG-definition walking adapter materializes selected relations; it does not adapt a running coordinator or enforce milestone execution.

A shorter `dagSourceFromRecords` is understandable, but the recommended name encodes the eager effect explicitly. Do not add unnecessary knobs merely to preserve a generic `graphFrom` name.

Evidence: [graph adapter](../../../src/sources/graphFrom.ts), lines 15–58; [forest adapter](../../../src/sources/forestFrom.ts), lines 14–46; [walking materializer](../../../src/traversals/graph-walk/walkSourceFrom.ts), lines 39–84; [DAG walking adapter](../../../src/traversals/graph-walk/walkSourceFromDag.ts), lines 25–90. Compatibility cost: medium, largely mechanical function/type renames.

## 6. Name discovery contracts and resolution callbacks — 5/5

Use `TreeSource` / `AsyncTreeSource`, `DagDiscoverySource` / `AsyncDagDiscoverySource`, and the existing `GraphWalkSource` / `AsyncGraphWalkSource`. `TreeTypeParameters` can become `VertexTypes`, since DAG APIs also consume its data/hint bundle. Name the object adapter `ObjectTreeSource`.

For tree and DAG discovery, use `resolveRoot` and `resolveChild` instead of `makeRoot` and `makeVertex`. They resolve or omit caller data; they do not necessarily construct an object. This agrees with `resolvePrerequisite`, walking `resolveVertex`, and `resolveVertexHook` while retaining the important hint-versus-ID distinction.

Use family-specific resolution result types, such as `TreeVertexResolution`, `DagVertexResolution` and `DagPrerequisiteResolution`. Only prerequisite lookup permits missing; omission is different. Keep those distinctions in the discriminated types. A DAG discovery source denotes its consumer contract, not a claim that arbitrary source data has already passed acyclicity validation.

Evidence: [tree source protocol](../../../src/core/TraversableTree.ts); [DAG discovery protocol](../../../src/core/TraversableGraph.ts); [source normalization](../../../src/core/drivers/normalizeSourceResult.ts), lines 43–80. Compatibility cost: high for source implementers and exported types.

## 7. Name original discovery structure without implying immutability — 5/5

Use `retainOriginalTreeStructure` / `retainOriginalGraphStructure`, `originalTreeView` / `originalGraphView`, and `OriginalGraphView` for the current original-structure graph type. Apply the same provenance vocabulary to corresponding context fields and accessors.

The retained structure grows during discovery, copies topology/hints, and shares caller data. It is not a complete point-in-time snapshot, deep immutable object, rollback image or durable checkpoint. Naming the retained structure is more truthful than `notMutatedResolvedGraph` or an unrestricted `Snapshot` label. A frozen payload snapshot would require an explicit cloning policy and a different contract.

Evidence: [graph snapshot assembly](../../../src/core/graph/snapshot.ts), lines 65–83; [tree retention](../../../src/traversals/depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer.ts), lines 72–100 and 194. Compatibility cost: medium across options and query/context types. A view's read-only topology does not make its shared payloads or handles deeply immutable.

## 8. Make diagnostic direction and cycle representation explicit — 5/5

Use `DagWaitEdge`, `DagMilestone`, endpoints `waiter` and `prerequisite`, and `dependencyCycleComponents`.

These diagnostic edges point from a milestone that waits to the milestone it requires, opposite the flow many workflow diagrams show. They include own-work and structural-child constraints as well as explicit dependencies. Cycle arrays report strongly connected component membership, not ordered cycle paths. A caller should not have to find a documentation exception to avoid drawing a false cycle witness.

Keep the actual edge direction and exact identities. `GraphWalkEdge.from/to` remains appropriate for conventional walking links; different relation models should not be forced into one generic edge type.

Evidence: [diagnostic types](../../../src/core/errors/DagTraversalStallError.ts), lines 9–23; [milestone SCC projection](../../../src/core/scheduling/dependencyMilestones.ts), around line 90. Compatibility cost: medium for diagnostic fields/type names.

## 9. Scope object mutation and its stages — 5/5

Rename the object helper `createObjectMutationBinder`. The configured result is an `ObjectMutationBinder`; binding a vertex/context produces `ObjectMutationCommands`; its command builder consumes an `ObjectMutationPatch`. Replace `TO_...`, repeated `Make...FunctionFactory` names and `_2` stage suffixes with these roles. Keep genuinely generic type scaffolding distinct as `MutationCommandBinder`, `MutationCommandBuilder`, and `MutationRequest`.

The helper understands property key/value patches, array/object classification and composite assembly. It is not a configurable arbitrary-vertex mutation engine. Existing classifier/assembler options are useful object-domain configuration and should remain. The names make the currying stages intelligible without changing their behavior.

Evidence: [object mutation factory](../../../src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts), lines 77, 99, 160–178 and 207. Compatibility cost: medium/high for imports and inferred callback types.

## 10. Make object rewriting callable and output timing explicit — 5/5

Export the callable `rewriteObject` at root, and move its module namespace to `objectRewrite`. Today the same spelling is a namespace at root and a function at its subpath, while `rewriteObjectAs` is callable at root.

Rename the result's `outputObject` to `outputAtReturn`, or remove it from the primary result surface. It is computed once and may be partial when the runner pauses; it does not refresh after resumption. Retain `getOutput()` as the checked final-output operation requiring FINISHED. Keep `rewriteObjectAs` as an explicitly asserted output type, without implying runtime validation.

Evidence: [root exports](../../../src/index.ts), lines 2–3; [rewrite result construction](../../../src/tools/rewrite-object/rewriteObject.ts), lines 255–275. Compatibility cost: high for the root namespace import shape, moderate for the result field. The implementation's configurable object rewriting scope justifies the generic action name once its import and lifecycle are clear.

## 11. Normalize factories and preparation results — 4/5

Use `createRunner` consistently across traversal builders and prepared DAGs. Use `DagWorkSession` / `AsyncDagWorkSession`, `createDagWorkSession` / `createAsyncDagWorkSession`, and prepared `.createWorkSession()` / `.createAsyncWorkSession()` for host-settled work control. Use `DagWorkBoundary.workTickets` and `DagSettlementReceipt` for their results. `advance` and `failTraversal` are already clear within that receiver.

This aligns the object type with its factory and avoids implying that `coordinateDag` immediately performs orchestration. The async factory currently creates its wrapper synchronously; its execution methods are asynchronous. Prepared async factories do await preparation. Document those return-type differences rather than flattening them through a cosmetic rename.

Make `PrepareDagResult` the canonical result type instead of aliasing it to `DagDefinitionResult`: the success value is a `PreparedDag`. Retain `defineDag` for copying/normalizing an authored definition and `prepareDagDefinition` for validating/preparing one; their distinct types and effects are meaningful. Retain `prepareDag`, `composeDag`, `reviseDag` and `diffDagDefinitions` rather than inventing synonyms without a demonstrated ambiguity.

Evidence: [work controller factories](../../../src/traversals/dag-traversal/coordinateDag.ts), lines 125–158; [prepared sessions](../../../src/traversals/dag-traversal/lib/makePreparedDag.ts), lines 90–103; [prepared contracts](../../../src/traversals/dag-traversal/lib/PreparedDag.ts). Compatibility cost: medium. Host dispatch, claims, retries and persistence remain outside this library.

## 12. Scope tree-only traversal APIs to trees — 4/5

Use `DepthFirstTreeTraversal`, `BreadthFirstTreeTraversal`, their async counterparts, `DepthFirstTreeRunner` / `BreadthFirstTreeRunner`, and `traverseTreeDepthFirst` / `traverseTreeBreadthFirst`. Scope the abstract tree classes to `TreeTraversal` / `TreeTraversalRunner`; call the emitted record `TreeTraversalEvent`.

Current DFS/BFS facades accept tree discovery contracts and reject graph metadata. General graphs can also be walked depth-first or breadth-first through `GraphWalk.strategy`. Unqualified traversal names obscure that choice. Keep genuinely shared `SyncTraversalExecution`, `AsyncTraversalExecution`, and `TraversalExecutionState` generic. Keep `GraphWalk`: its strategy, revisitation, limits and predicates genuinely configure that broad operation.

Evidence: [tree metadata boundary](../../../src/core/drivers/normalizeSourceResult.ts), line 10; [tree helper](../../../src/traversals/depth-first-traversal/traverseDepthFirst.ts), around line 102; [walking options](../../../src/traversals/graph-walk/GraphWalkOptions.ts). Compatibility cost: high for import renames; no new graph acceptance is implied.

## 13. Distinguish execution iteration from passive reads — 4/5

Use `iterateEvents` instead of `getIterable` across runners and shared execution capabilities. Advancing the iterator resumes execution, reads sources, invokes visitors and applies commands. It is not a passive collection accessor or event replay. Keep `run`: its receiver and options give it a clear execution role.

Use `PAUSE_TRAVERSAL` for the current visitor pause command and `pauseRequested` for its inspection flag. Do **not** mechanically rename `isHalted` to `isPaused`: HALTED also covers preparation and awaiting settlement. The stop reason must remain available to distinguish those states. `close` on walking runners is terminal cleanup, separate from resumable pause.

Evidence: [walking execution iterator](../../../src/traversals/graph-walk/lib/SyncWalkSession.ts), lines 28–64; [async iterator](../../../src/traversals/graph-walk/lib/AsyncWalkSession.ts), lines 77–89; [runner status and pause](../../../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts), lines 162–172. Compatibility cost: medium across all families. Iterator laziness, command commit boundaries and `requestPause` draining behavior remain unchanged.

## 14. Name captured milestone inspection as a snapshot — 4/5

Use `DagMilestoneSnapshot`, standalone `inspectDagMilestones`, and receiver `.inspectMilestones()`. Keep `explain`, `prerequisitesOf`, `dependentsOf`, and the actual `transitive` option.

This object captures scheduler/progress/constraint facts once. Reusing it after settlement does not observe new state. The same runner also exposes execution `inspect()`, progress `summary()`, and a live resolved graph view. A purpose-specific snapshot name makes the right observation and refresh policy easier to choose. The existing internal `DagInspectionSnapshot` assembly record should be hidden, not compete with this public concept.

Evidence: [snapshot capture](../../../src/traversals/dag-traversal/inspectDag.ts), lines 18–43; [query closures](../../../src/traversals/dag-traversal/lib/DagInspection.ts), lines 61–102. Compatibility cost: low/medium, primarily names and wrappers.

## 15. Make predicates reveal their subject and decision — 4/5

Use `shouldFollowEdge` / `shouldExpandVertex` for walking boolean gates, with `GraphWalkEdgePredicate` / `GraphWalkExpansionPredicate` types. Actual adjacency discovery remains `source.outgoing`. Use `filterDagDataVisitor` for the wrapper whose predicate and callback receive payload data rather than a vertex/context.

Use `hasNoChildHints` for `Vertex.isLeafVertex`, `isTraversalLeaf` for the runner predicate that also considers disabled subtrees, and `hasSingleStructuralSink` for the helper that counts childless resolved vertices while ignoring W/C edges. These names expose the relation or criterion instead of suggesting interchangeable notions of a graph leaf/sink. A generic sink API would require a real relation selector; a rename is sufficient for the current scope.

Evidence: [walking boolean validation](../../../src/traversals/graph-walk/lib/WalkKernel.ts), lines 265–308; [data visitor filter](../../../src/traversals/dag-traversal/filterDagVisitor.ts), lines 59–66; [leaf predicate](../../../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts), line 204; [sink implementation](../../../src/traversals/dag-traversal/hasSingleSink.ts), lines 4–15. Compatibility cost: low/medium.

## 16. Give walking budgets and counters precise units — 4/5

Use `candidateReadAttempts` / `maxCandidateReadAttempts`, `admittedTargets` / `maxAdmittedTargets`, `uniqueFoundVertices`, `uniqueOmittedVertices`, `discoveredLinks`, and `processedObservations`. Align limit-reason literals with the bound names.

Steps currently count root/adjacency next attempts, including exhausted reads and cached replay. Occurrences count target admissions, including repeated or omitted identities. Links are counted when freshly discovered, before follow predicates. Observation counts include acknowledged observations whose emission was filtered. None of these is a general number of visited vertices or emitted events.

A hard exploration budget must make its unit explicit. Preserve the existing accounting rules; do not change them silently while renaming.

Evidence: [walking kernel](../../../src/traversals/graph-walk/lib/WalkKernel.ts), lines 161, 189, 221, 473, 509 and 538. Compatibility cost: moderate field/literal migration. `maxDepth` already has an understandable unit.

## 17. Align callback contexts, phases and coordinates — 4/5

Use `TreeVisitorContext`, `DagVisitorContext`, and the existing `GraphWalkVisitorContext` for engine-supplied callback facts; reserve `Options` for caller policy. Consolidate identical sync/async context shapes where promises do not change the supplied facts.

Use `phase` instead of `order` in callback contexts, matching `DepthFirstPhase`, `BreadthFirstPhase`, `DagVisitorPhase` and `GraphWalkPhase`. Strategy, callback phase and visitor priority are separate axes. Use `visitorIndex`, `visitorChainState`, and `registration` consistently. Tree/DAG `vertexVisitIndex` is phase-scoped, so prefer `phaseVisitIndex` and `previousPhaseVertexRef` for its associated predecessor.

Walking should expose `admissionIndex` and `phaseObservationIndex`; its observation count is per phase, not a global event ID. Use `GraphWalkEdge.outgoingIndex` for the source-local ordinal, distinct from the DAG adapter's original child `slotIndex`. Do not pretend tree-chain indices and walking admissions measure the same thing merely to standardize spelling.

Evidence: [tree/DAG phase state](../../../src/core/TraversalKernel.ts), lines 1925–1930; [walking callback context](../../../src/traversals/graph-walk/lib/WalkVisitorChain.ts), around line 43; [walking phase counter](../../../src/traversals/graph-walk/lib/WalkKernel.ts), line 447. Compatibility cost: medium across context destructuring and enum types.

## 18. Distinguish handles, payloads, records, stores and edges — 4/5

Use `MutableRef<T>` for the generic `CTTRef<T>` holder, `getValue` / `setValue` instead of `unref` / `setPointsTo`, and `VertexRef<T>` for the specialized vertex handle. Keep `getRefId` distinct from logical `getVertexId` / `getVertexRefById`. Align `DagVertexProgress.id` to `vertexId`. No identity is converted to a string or assumed durable.

Use `ResolvedGraphVertex` for the wrapper currently called `GraphVertex`, `StructuralChildEdge` for the parent/child/hint relation, `TreeVertexRecord` for `VertexResolved`, and `ResolvedTreeStore` / `getResolvedTreeStore` for the mutable tree storage surface. Retain `ResolvedTreeView` / `getResolvedTreeView` as the safe query entry point. Record fields should say `metadata` and `children`, rather than reusing the `$d/$c` vocabulary for data/hints.

Keep `Vertex` as the data/hint value. A raw mutable store, a shallow query view and a source payload are different API roles. If raw storage access is not an intended supported capability, internalize it under improvement 1 instead of polishing an accidental public extension.

Evidence: [reference holder](../../../src/core/CTTRef.ts), lines 7–20; [resolved records and storage](../../../src/core/ResolvedTree.ts), lines 23–30 and 91–129; [graph record types](../../../src/core/graph/types.ts), lines 33–68. Compatibility cost: medium/high for low-level consumers.

## 19. Use one public options/patch grammar — 3/5

Use `<Family>Options` for construction, `<Family>OptionsPatch` for `configure`, and private `<Family>ResolvedOptions` for defaults/normalized state. Construction must require its source; configuration patches may preserve it. Keep `configure` as a mutating fluent method, rather than calling it `withOptions` and implying immutability.

Make `TraversalExecutionOptions` the canonical generic execution-input concept, parameterized as needed for separate callback/event selections from improvement 2. Consolidate legacy `*RunnerIterableConfigInput` aliases, `iterateOver`, visitor enable/disable aliases and `resolutionStyle` into the existing canonical policy axes. Make `commandCommitMode` the sole preferred batching/commit vocabulary. Use `DagSchedulingOptions` for the shape currently named `DagDiscoveryOptions`, which also includes work/dependency policies. Share identical `ChildHintSorter` and `AsyncChildHintSorter` callback types.

This is not a reason to merge input and effective options: normalization must stay internal, and output inspection should describe effective selection explicitly. Preserve field-wise patch semantics.

Evidence: [tree configuration merge](../../../src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig.ts), lines 82 onward; [DAG input versus patch](../../../src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts), lines 86–108; [execution options](../../../src/core/TraversalRunnerIterableConfig.ts). Compatibility cost: moderate, mostly type imports and legacy aliases.

## 20. Make in-order positioning legible — 3/5

Use `InOrderOptions`, option `inOrder`, and `ChildIndexSelection`. Rename fields to `afterChildIndices`, `fallbackChildIndices`, `visitSingleChildParent`, and `visitAfterOmittedChildren`.

These controls select positions in child slots, not counts of children. In particular, `0` means after child index zero. Preserve existing negative-index and range normalization rules; a clearer name must not imply a new indexing scheme. The fallback applies when all configured ranges are out of bounds, and omission handling is independent of whether a child produced content.

Evidence: [in-order selection](../../../src/traversals/depth-first-traversal/in-order-helpers/shouldVisitParentOnInOrder.ts), lines 11–31; [omission behavior](../../../src/traversals/depth-first-traversal/lib/DepthFirstPolicy.ts), around line 111. Compatibility cost: low/medium. Its rank reflects a narrower agentic use case, not weaker evidence.

## Coverage, consolidation and verification

The [audit bundle](2026-10-26-api-naming-audit/README.md) records every disposition, complete signatures, alias/module relationships, source evidence and reproducible inventory/coverage tooling. Inventory totals: **188 declaration modules; 1,189 export bindings; 556 canonical declarations (509 exported, 47 signature-support); 1,592 declared public/protected/nested members**. All **2,148** declaration/member IDs have one assessment. Overloads and repeated union-field spellings share IDs; their signatures remain recorded. Another **2,300** inherited/mapped member relationships are linked to their declarations. Package metadata and standard-library inherited members are not CTT naming decisions.

The verification script independently reparses all declarations, accounts for 559 top-level syntax declarations and 1,714 public/protected member syntax occurrences, checks every binding resolves to a reviewed declaration, and finds no uncovered entries. A fresh package build succeeded before extraction. This was a naming/contract review using source evidence, not a new runtime correctness or benchmark run.

The consolidated assessment resolves family-review differences: explicit subgraph-completion terminology; one original-structure vocabulary; separate generic and vertex-specialized reference names; normalized engine types hidden rather than promoted; canonical execution input distinct from resolved output; and one precise name per sync/async sorter. `GraphWalkSource.roots` is retained as conventional traversal-root terminology rather than spending a top-level change on `starts`; its contract must continue to allow arbitrary starting vertices. `defineDag` remains distinct from preparation. The phase/event filter design is a real type-surface change, not only a find-and-replace rename.

Keep ordinary receiver-scoped methods where they already communicate the same operation (`run`, `configure`, `advance`, `explain`, `summary`, registration methods). Keep graph-walking strategy/revisit configuration, independent callback/event selection, arbitrary identity, tagged source resolution, host-owned outcomes, and family-safe capabilities. Existing compatibility aliases may bridge a migration but should not be presented as equally preferred vocabulary.
