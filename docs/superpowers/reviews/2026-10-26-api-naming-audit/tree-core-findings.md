# Tree, object and core naming review

Baseline: e52fab02333a044472e9aea864db26a8c33fc051. Reviewed **966 assigned IDs: 255 top-level declarations and 711 declared/nested members**, including all complete signatures, inherited/mapped member associations, overloads, source-support types and accidentally public internals. Cross-family vocabulary was read from global-catalog.md. The JSON gives one disposition per ID; owner-level rationales cover explicitly read member signatures, with exceptions for misleading names. Counts: keep 366, rename 150, consolidate 9, internalize 399, compatibility-only 42.

Source evidence below is relative to `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`. This is a naming/surface review, not a behavior validation run. No source edits, tests, builds, commits or additional agents. Rankings measure comprehension benefit independently of compatibility cost. The coordinator should combine overlapping proposals across families into the final exact 20; these 14 finding groups are not an independent quota.

## TC01 — Source protocols, resolution, and family scope — rank 5

`TraversableTree` is a discovery protocol, not a tree object; `TraversableGraph` is the identity/dependency-aware discovery protocol consumed by DAG traversal. Rename to `TreeSource` / `AsyncTreeSource` and, in the combined API, **`DagDiscoverySource` / `AsyncDagDiscoverySource`** (reserve generic graph walking source vocabulary for the separately configurable GraphWalk protocol). `AbstractTraversableTree` becomes `AbstractTreeSource`; the object adapter becomes `ObjectTreeSource`. `TreeTypeParameters` becomes `VertexTypes`, because graph/DAG APIs also consume its data/hint bundle.

Rename source `makeRoot()` / `makeVertex(hint, context)` to `resolveRoot()` / `resolveChild(hint, context)`. They resolve data and can omit it; they do not promise construction. This aligns with `resolvePrerequisite` and `resolveVertexHook` while preserving the difference between child-hint lookup and prerequisite-ID lookup. Result types should use one consistent family-scoped `*VertexResolution`, `*VertexFound`, `*VertexOmitted` vocabulary. Keep missing separate as `PrerequisiteMissing`; do not conflate omission, missing and undefined. Nullable untagged results and `makeVertexHook`/`returnMe` belong only to compatibility.

Example: `source.resolveChild(hint, context) -> {kind:'omitted'}` communicates possible absence immediately. `makeVertex` implies a produced object. Evidence: `src/core/drivers/normalizeSourceResult.ts:43` accepts undefined only for prerequisite lookup; `:51` handles found/omitted; `:80` rejects missing elsewhere; `:10` forbids graph metadata on tree results. Public knobs genuinely configure discovery; no rename to a universal `Source` is warranted across graph walking and milestone scheduling.

Compatibility cost: high, source implementers and many type signatures; coherent alias/migration can preserve runtime behavior. This overlaps the DAG/source reviewer’s discovery taxonomy.

## TC02 — Callback context and phase vocabulary — rank 4

Use `TreeVisitorContext`, `AsyncTreeVisitorContext`, `GraphChildResolutionContext` / `TreeChildResolutionContext` instead of the callback-supplied `*InputOptions` / `Make*Options`. Those values are supplied observations, not user policy. `TraversalVisitorFunctionOptions` becomes `VisitorOptions` for caller-set registration policy. Keep `VisitorDefinition`, `VisitorPhaseInput`, `VisitorGroupDefinition`, `VisitorRegistrationMetadata`: their different roles are useful.

Unify `order` with `phase`, `DepthFirstTraversalOrder` with `DepthFirstPhase`, and `BreadthFirstTraversalOrder` with `BreadthFirstPhase`, consistent with `GraphWalkPhase`, `emitPhases` and `visitorPhases`. Strategy selects DFS/BFS, phase selects PRE/IN/POST, priority orders visitors: names should keep all three axes separate.

Context members: `curVertexVisitorVisitIndex -> visitorIndex`, `vertexVisitIndex -> phaseVisitIndex`, `previousVisitedVertexRef -> previousPhaseVertexRef`, `vertexVisitorsChainState -> visitorChainState`, and `visitorRecord -> registration` (the value is metadata rather than a callback-bearing full record). Evidence: `src/core/TraversalKernel.ts:1925` keys visitor state by phase; `:1930` creates invocation metadata with visitor index zero; `src/core/visitors/VisitorChain.ts:83` increments it.

For controls, `HALT_TRAVERSAL -> PAUSE_TRAVERSAL`, inspection `haltRequested -> pauseRequested`, and `SET_VERTEX_VISITORS_CHAIN_STATE -> SET_VISITOR_CHAIN_STATE`. Keep `isHalted`/HALTED distinct from `isPaused`: HALTED also represents preparation/awaiting settlement. `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:162` makes requestPause cooperative; `:172` checks the broad HALTED status. Do not let a cosmetic unification erase lifecycle distinctions.

Compatibility cost: medium/high for enum literals and context destructuring. Benefit is consistent meanings across every callback family.

## TC03 — Scope DFS/BFS names to their actual tree execution — rank 4

`DepthFirstTraversal` / `BreadthFirstTraversal`, their async forms, runners and helpers accept tree sources, while GraphWalk separately supports configurable DFS/BFS on graphs. Prefer `DepthFirstTreeTraversal`, `BreadthFirstTreeTraversal`, `DepthFirstTreeRunner`, `BreadthFirstTreeRunner`, `traverseTreeDepthFirst`, `traverseTreeBreadthFirst`, with matching async names. Alternative: keep broad names only if a meaningful public tree/graph execution policy is added; source typing and a generic class name alone are not such a policy.

The abstract `Traversal`, `TraversalRunner` and `TraversalRunnerIterable` are sync/tree-specific despite their generic names; scope to `TreeTraversal`, `TreeTraversalRunner`, `TreeTraversalIterable`. `TraversalRunnerIteratorResultContent -> TreeTraversalEvent` matches peer `DagEvent` / `GraphWalkEvent`. Keep the genuinely shared `SyncTraversalExecution`, `AsyncTraversalExecution` and `TraversalExecutionState` capability types generic.

Evidence: `src/core/drivers/normalizeSourceResult.ts:10` tree metadata exclusion; `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:176` tree storage/view; `src/traversals/depth-first-traversal/traverseDepthFirst.ts:102` helper creates and runs the runner. `traverse` therefore correctly denotes execution, not preparation.

Compatibility cost: high, pervasive top-level names. Scope accuracy is independent of that cost.

## TC05 — Mutable handle identity versus vertex identity — rank 3

`CTTRef<T> -> MutableRef<T>`, `unref() -> getValue()`, `setPointsTo() -> setValue()`. `unref` often denotes releasing/detaching a reference; this method only reads its current target. Keep `getRefId` because it is the holder UUID, distinct from `ResolvedGraph.getVertexId(ref)` and `getVertexRefById(id)`. Keep `getId` only as a legacy alias. If the specialized internal `Ref = CTTRef<Vertex<T>>` remains public, it should be `VertexRef`, not the same generic-holder name.

Evidence: `src/core/CTTRef.ts:7` creates UUID; `:12` reads target; `:16` retargets without changing UUID; `:20` returns holder identity. Compatibility cost: moderate. Do not imply a durable vertex ID, immutable vertex, or host claim by renaming the handle.

## TC06 — Original structure is not an immutable payload snapshot — rank 5

`saveNotMutatedResolvedTree -> retainOriginalTree`; callback `notMutatedResolvedTree -> originalTree`; graph counterparts `retainOriginalGraph` / `originalGraph`; `ResolvedGraphSnapshot -> OriginalGraphView` for this retained discovery surface. This names provenance rather than claiming absence of mutation. It grows as discovery proceeds and holds shared caller data. It is different from `inspectDag`’s captured observational milestone snapshot.

Evidence: `src/traversals/depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer.ts:72` creates saved refs with copied hint arrays; `:100` remaps context; `:194` appends discovered children to the saved tree. `src/core/Vertex.ts:98` shares data in clone; `src/core/graph/snapshot.ts:73` explicitly copies hints while preserving data reference, and `:83` incrementally commits vertices. A deep immutable snapshot would require an actual public data-copy policy; the current name cannot promise it.

Compatibility cost: medium across options/context types. Benefit: avoids using this as rollback, frozen input, or durable checkpoint data.

## TC07 — Distinguish tree storage, records, vertex values, and views — rank 4

`ResolvedTree -> ResolvedTreeStore`, runner `getResolvedTree -> getResolvedTreeStore`; retain `ResolvedTreeView` and `getResolvedTreeView`. `VertexResolved -> TreeVertexRecord`, `VertexResolvedContent -> TreeVertexRecordInput`, `VertexResolvedData -> TreeVertexMetadata`, `ResolvedTreeMap -> TreeRecordMap`. In records, `$d -> metadata` and `$c -> children` (resolved references). These are not deprecated aliases like Vertex.$d/$c: they are the record’s actual fields and deserve concrete names.

Evidence: `src/core/ResolvedTree.ts:23` data is only resolutionContext; `:30` class stores that plus resolved child refs; `:91` owns mutable storage; `:112` returns a stable live query facade; `:129` exposes raw GraphStore. `Vertex` instead stores caller payload and unresolved child hints (`src/core/Vertex.ts:56`). The record/query distinction aligns with the other reviewer’s proposed `ResolvedGraphVertex` for GraphVertex.

Compatibility cost: medium/high for raw-tree consumers. `getGraphStore` should be internal, not merely renamed. Do not claim deep safety for a view returning mutable reference handles and shared payloads.

## TC08 — Hide engine implementation and state injection — rank 5

The assigned deep/root exposed symbols include normalization functions, generic Outcome aliases, visitor chain execution, kernel state bridges, DFS/BFS scheduling policies, synthetic-root constants, mutable config/visitor registries, raw containers and runner state classes. These are not a configurable public engine or checkpoint protocol. Remove them from supported export paths (including wildcard deep imports), and encapsulate `icfg`, `state`, `curGenerator`, `resolvedTreesContainer`, `visitors`, `traversalRunnerInternalObjects`, and `ResolvedTree.getGraphStore`. Keep deliberate public inspection/capability types and supported policy options.

Every such assigned owner/member has an explicit internalize row; no attempt to improve accidental internals by inventing polished public synonyms. Example evidence: `src/traversals/depth-first-traversal/DepthFirstTraversal.ts:36` exposes mutable config/registry, while `:102` already supplies detached registration queries; `src/traversals/depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer.ts:42` adopts injected containers; `src/core/ResolvedTree.ts:129` marks GraphStore access internal but emits it publicly. Other engine files contain owner epochs, queue indexes and callbacks invalidation rather than durable reconstruction contracts.

Compatibility cost: high for deep-import/internal-injection users. Benefit: dramatically smaller, coherent supported vocabulary. Merge this with the engine reviewer’s export-boundary proposal.

## TC09 — Consolidate execution filters around the existing real knobs — rank 4

`TraversalExecutionOptions` already correctly exposes independent `emitPhases` and `visitorPhases`. Make it the canonical accepted input everywhere; specialize by phase rather than multiply `*RunnerIterableConfigInput` aliases. `InspectionFilters -> EffectiveTraversalPhaseSelection`. Resolve/default options privately instead of exposing effective legacy `enableVisitorFunctionsFor`, `disableVisitorFunctionsFor`, `iterateOver` alongside canonical fields. Legacy resolutionStyle SEQUENTIAL/CONCURRENT likewise stays compatibility-only, with `commandCommitMode` canonical.

Signatures in `src/core/TraversalRunnerIterableConfig.ts` and `src/core/TraversalVisitor.ts` show both axes and the alias unions. The names `run`, `getIterable`, `configure` can stay: receivers/options supply enough scope, and these are real public policy knobs. Compatibility cost: medium; alias removal should not change field-wise patch behavior.

## TC10 — Object-specific mutation binder and callback types — rank 5

The runtime `makeMutationCommandFactory` handles object property key/value patches and composite assembly. Its generic name is unearned: it has no public arbitrary vertex-mutation policy, hint-rewrite policy or arbitrary command factory registration. Rename to `createObjectMutationBinder`. Configuration creates a binder, binder captures vertex/context and returns `ObjectMutationCommands`, whose `makeMutationCommand` builds the actual command. Replace `TO_MakeMutationCommandFunctionFactory_2` with `ObjectMutationBinder`, other factory/config/result names with `ObjectMutationBinderFactory`, `ObjectMutationOptions`, `ObjectMutationCommands`; `TO_MutationPropertyPatch -> ObjectMutationPatch`; boolean `TO_IsCompositeAssertionsMixin -> ObjectValueKind`.

For generic type scaffolding use `MutationCommandBinderFactory`, `MutationCommandBinder`, `MutationCommands`, `MutationCommandBuilder`, `MutationRequest`, `MutationCommand` rather than repeated Make/Function/Factory and numeric stages. Rewrite callback types become `ObjectPropertyRewriter`, `ObjectRewriteContext`, `ObjectRewriteProperty`. Helpers become `enumerateOwnProperties` and `createRootPropertySelector` (the latter is a factory).

Evidence: `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts:77` outer config; `:99` visitor binding; `:160` actual command generation; `:173` requires non-null object patch; `:178` independently checks key/value presence; `:207` reassembles composite values. `getChildrenOfPropertyDefault.ts:17` enumerates own enumerable symbol/string keys; arrays normalize numeric indexes at `:23`. Public isArray/isObject/assembleArray/assembleObject selectors are meaningful object-model knobs, so preserve them.

Example: `const bind = createObjectMutationBinder(options); const commands = bind(vertex, context); commands.makeMutationCommand({rewrite:{key:'renamed'}});` The API could further flatten stages, but the naming proposal does not require behavioral redesign.

Compatibility cost: medium/high. Primary benefit: prevents choosing an object helper for arbitrary vertex payload commands and makes currying readable.

## TC11 — Rewrite callable namespace and partial-output lifecycle — rank 5

At root, `rewriteObject` is a namespace; at its subpath it is callable; `rewriteObjectAs` is callable at root. Make root `rewriteObject` the callable and move module namespace to `objectRewrite`, matching action semantics. Evidence: `src/index.ts:2` namespace export and `:3` named assertion helper.

Rename result `outputObject -> outputAtReturn` (or remove it as a primary API), retaining `getOutput()` as checked final output. `outputObject` is computed once even when paused and never refreshed; it can differ from final output after runner resumption. Evidence: `src/tools/rewrite-object/rewriteObject.ts:255` computes return-time value; `:263` rejects getOutput until FINISHED; `:266` recomputes final value. The weak name should not force agents to infer partial/final semantics from a comment.

Keep callable `rewriteObject` and `rewriteObjectAs`: public selectors/classifiers/assemblers justify object rewriting’s scope, and As accurately signals an assertion rather than runtime schema validation (`:275`). Compatibility cost: medium/high for root import shape, low/medium for result field.

## TC12 — Hint leaf, traversal leaf, and shallow value copying — rank 4

`Vertex.isLeafVertex -> hasNoChildHints`, runner `isLeafVertexRef -> isTraversalLeaf`. The latter returns true for disabled subtrees even if children/hints exist. These are different predicates and neither should silently claim resolved structural leaf status. Evidence: `src/core/Vertex.ts:83` only checks hint-array length; `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:204` ORs that with subtree-disabled membership. A separate `hasResolvedChildren` query could be added only with explicit semantics; no such new API is necessary for this review.

Align `getChildrenHints -> getChildHints` with `$childHints`; `Vertex.clone -> copy` (or `shallowCopy`) to avoid implying recursive payload/hint cloning. `src/core/Vertex.ts:98` reuses both data and hints unless replaced. These lower-impact member changes can be folded into the vertex/record vocabulary group if exact-20 space is needed.

Compatibility cost: low/medium. This fixes an actual predicate mismatch, not an aesthetic preference.

## TC13 — Wait-edge direction and SCC membership — rank 5

`DagDependencyEdge -> DagWaitEdge`, `DagDependencyMilestone -> DagMilestone`, `from -> waiter`, `to -> prerequisite`, `dependencyCycles -> dependencyCycleComponents`. A directed edge means the first milestone waits for the second, not prerequisite-to-dependent execution flow; structuralChild and ownWork constraints are included, so ordinary dependency-edge vocabulary is incomplete. SCC member arrays are not ordered cycle witnesses, unlike DagDiscoveryCycleError.vertexIds.

Evidence: `src/core/errors/DagTraversalStallError.ts:9` direction; `:13` reasons; `:23` SCC qualification; `src/core/scheduling/dependencyMilestones.ts:90` projects components to ordered IDs and returns membership arrays. Names should make invalid path rendering less likely without requiring callers to find the special documentation sentence.

Compatibility cost: medium. Coordinate with DAG inspection reviewer; do not reverse the actual direction merely to match an expected name.

## TC14 — Options, patches, normalized configuration and shared callback types — rank 3

Use `<Family>Options` for construction, `<Family>OptionsPatch` for `configure` updates (or consistently `<Family>ConfigureInput`), and private `<Family>ResolvedOptions` for defaulted state. Current `InstanceConfigInput` is reused for construction and field-wise updating; it is a partial patch shape and does not mean immutable factory output. Add a required source to the construction shape, while `configure` accepts partial source/config updates. Keep `configure` itself: it mutates and returns this as expected.

Evidence: `src/traversals/depth-first-traversal/DepthFirstTraversal.ts:40` construction normalizes defaults; `:52` configure merges into existing state and returns this; `src/traversals/depth-first-traversal/lib/DepthFirstTraversalInstanceConfig.ts:82` merges nested inOrder/visitor fields rather than replacing the whole object. Do not rename it `withOptions` unless making it immutable.

Shorten `TraversableObjectTTP -> ObjectTreeTypes`; share `ChildHintSorter` / `AsyncChildHintSorter` across identical DFS/BFS/DAG callback signatures; helpers can use `TraverseTreeDepthFirstOptions` rather than vague `HelperOptions`. Keep Async names for promise-aware source callbacks/execution, without claiming every operation is concurrent.

Compatibility cost: medium for type imports; construction/patch split can add useful compile-time checks. JSON proposes names for existing IDs; the separate OptionsPatch would be a new public type and thus has no existing ID row.

## TC15 — Make in-order indexing and omission policy legible — rank 4

`DepthFirstTraversalInOrderTraversalConfig -> InOrderOptions`, nested `inOrderTraversalConfig -> inOrder`, `IndexRange -> ChildIndexSelection`. Fields: `visitParentAfterChildren -> afterChildIndices`; `visitParentAfterChildrenAllRangesOutOfBoundsFallback -> fallbackChildIndices`; `visitUpOneChildParents -> visitSingleChildParent`; `considerVisitAfterNullContentVertices -> visitAfterOmittedChildren`.

These are real public knobs and should stay public, unlike scheduler policy objects. Example: `{inOrder:{afterChildIndices:0,visitAfterOmittedChildren:true}}` reveals zero-based positioning and omitted slots. Do not rename the numeric field to a child count: `0` means after child index zero, not before all children. Evidence: `src/traversals/depth-first-traversal/in-order-helpers/shouldVisitParentOnInOrder.ts:11` normalizes ranges; `:27` single-child override; `:31` only uses fallback when all normalized ranges vanish. `src/traversals/depth-first-traversal/lib/DepthFirstPolicy.ts:111` controls consideration after an unresolved/omitted child with the old null-content field.

Compatibility cost: low/medium. Benefit: substantially easier correct configuration without inferring meaning from awkward English.
