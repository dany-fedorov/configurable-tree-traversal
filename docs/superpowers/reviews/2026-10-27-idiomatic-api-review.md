# Client API idiomaticity review

Baseline: `95fd35852a296d35aaf13c2b47a38e087dd880d6` (`feat/api-clarity-migration`), reviewed in `/home/df/.codex/worktrees/04b4/configurable-tree-traversal`. Review date: 2026-10-27. Reviewer: Astra HIGH. This is a fresh review of source and freshly built declarations, not verification that an earlier naming plan was completed. Recommendations are **not implementation authorization**.

## Assessment

The main agent-coordination vocabulary is substantially coherent: work eligibility, committed W/C observations, owned work tickets, captured milestone explanations, structural children, and host responsibilities are distinguishable. General graph walking earns its generic name through public strategy, revisit, bounds, and predicate policies. The API still falls short of a consistently precise client contract in the areas below. Two object APIs have demonstrated type-contract defects, not merely unattractive names. Other findings concern misleading scope, residual phase terminology, and redundant compatibility surfaces.

I recommend addressing the high-impact contract defects and scope ambiguities before another broad rename pass. “Impossible to confuse” is an operational aim: a reader should be able to infer role, family, timing, ownership, relation, and units from the API. No finite naming scheme can eliminate every misunderstanding.

Severity means client impact, not security risk. **Objective defect** denotes a type/behavior contradiction; **strong design recommendation** denotes a consequential ambiguity supported by behavior; **optional style** is separately identified and is not a reason by itself to break callers. There are 15 findings because those are the distinct issues found, not because of a target count.

## Ranked findings

### F01 — High — Rewrite callback types promise original input while exposing rewritten values

**Classification:** objective type-contract defect. **Affected:** `RewriteFnOptions`, `RewriteFnPropInput`, `RewriteFn`, `RewriteObjectOptions.rewrite`, `rewriteObject`, `rewriteObjectAs`; callback `vertex`, `resolvedTree`, `vertexRef`, `previousPhaseVertexRef`, and `getKeyPath` types.

**Evidence:** `src/tools/rewrite-object/rewriteObject.ts:26` fixes both context vertex domains to the input types; `:39` fixes the callback property to input key/value types. `:192` reads the live current vertex; `:200` invokes the callback and `:210` asserts the mixed context back to input-only. Configurable traversal visitors are forwarded at `:229` and can rewrite before the post-order callback. Rewritten children are likewise output-bearing live tree records.

**Concrete misuse:** the strict-compiling `probe.ts` supplies numeric input and a pre-order visitor replacing its value with a string. Inside `rewrite`, `const n: number = prop.value` compiles, while runtime reports `typeof n === 'string'`. The context's `vertex` has the same false guarantee. Calling `n.toFixed()` would fail.

**Recommended shape:** model the callback's current property as an input/output union, carry both domains through its context, and type live refs/tree/key paths accordingly. Keep the retained original view input-typed. Retain configurable traversal visitors; do not silently assume they cannot rewrite. Pair this with the descriptive callback names in F14. Output `unknown` by default and the explicit `rewriteObjectAs<Out>` assertion remain appropriate.

**Migration:** callbacks must narrow current values/keys; users whose input/output types agree are unaffected. This is a type repair, not a rename-only solution. Preserve the existing timing, output caching, exact errors, and shallow identity behavior.

### F02 — High — ObjectMutationPatch advertises arbitrary fields that are silently ignored

**Classification:** objective type-contract defect. **Affected:** `ObjectMutationPatch`, `ObjectMutationCommands.makeMutationCommand`, `ObjectMutationBinder`, `ObjectMutationBinderFactory`, `createObjectMutationBinder`, and its static exposure.

**Evidence:** `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts:44` defines the patch as `Partial<OUT_TO_TTP['VertexData']>`, where clients may extend the property record. The implementation at `:170` and `:172` reads only `value` and `key`; construction at `:188` never merges other supplied patch fields.

**Concrete misuse:** the strict-compiling probe extends the data with `note`, requests `{ rewrite: { note: 'new' } }`, and observes `note === 'old'`. The public patch name and type imply that the request applies.

**Recommended shape:** use an explicit `ObjectPropertyPatch<T> = Partial<Pick<T['VertexData'], 'key' | 'value'>>` and propagate that contract through the binder. Reject unknown own patch fields at the JS boundary rather than silently accepting them. If arbitrary metadata rewriting is wanted later, expose a real full-data replacement or merge policy separately; the current configurable array/object assemblers do not implement that capability.

**Migration:** unsupported extension patches become errors. Callers can return the generic `REWRITE_VERTEX_DATA` command when they intend full payload replacement. Preserve property-presence semantics for `undefined`, falsy values, symbols, and key-only updates.

### F03 — High — Similar deletion names hide three materially different scopes

**Classification:** strong design recommendation grounded in behavior. **Affected:** `TraversalVisitorCommandName.DELETE_VERTEX`, its argument/result/`MutationCommand` branches, `ResolvedTreeStore.delete`, object deletion requests, and `DagRevisionOperation`'s `removeVertex` literal.

**Evidence:** `src/core/ResolvedTree.ts:159` recursively deletes the resolved subtree. `src/core/scheduling/GraphScheduling.ts:667` and `:691` delete a DAG vertex, transitively dependent work through both W/C relations, and orphaned descendants, preserving shared/detached structural anchors; removing the graph root removes the whole graph. Conversely, `src/traversals/dag-traversal/lib/DagRevision.ts:18` denotes a single declaration removal, and `reviseDag` deliberately leaves dangling references for repair in the same batch. `src/core/TraversalVisitor.ts:14` gives the runtime operation the unqualified name `DELETE_VERTEX`.

**Concrete misuse:** an agent uses runtime `DELETE_VERTEX` to remove one task and unexpectedly loses dependent work, or uses revision `removeVertex` expecting equivalent pruning and gets an invalid definition.

**Recommended shape:** `ResolvedTreeStore.deleteSubtree`; revision `{ kind: 'removeVertexDeclaration', vertexId }`; family-specific runtime commands `DELETE_TREE_SUBTREE` and `DELETE_DAG_VERTEX_CASCADE`. Document the exact DAG cascade, shared-descendant preservation, and root-wide case beside that command. If a generic `deleteVertex` is preferred instead, it must acquire a real public deletion policy; merely renaming an internal switch is insufficient.

**Migration:** update command results and object helper production as a family-consistent change. Do not change revision atomics, W/C relations, or shared-node retention accidentally while changing names.

### F04 — Medium — DAG dependency policy names omit milestone and fallback scope

**Classification:** strong design recommendation; actual scope is unambiguous in source. **Affected:** `DagSchedulingOptions`, sync/async `DagOptions`/patches, `PrepareDagOptions` and input types, and prepared-factory forbidden-field contracts.

**Evidence:** `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:17`; `src/core/scheduling/GraphScheduling.ts:326` applies `rootDependencies` only to root **W** prerequisites, while `:330` still honors root C prerequisites. At `:887`, `getDependencies` uses the parent's W only when `dependsOnWork` was omitted; explicit lists, including `[]`, override the fallback. Tree source ordering has separate fixed rules.

**Concrete misuse:** `{ rootDependencies: 'ignore' }` is expected to ignore both dependency lists but still waits on C. `{ implicitParentDependency: true }` is expected to add the parent to a declared list but does not.

**Recommended shape:** `rootWorkDependencies: 'honor' | 'ignore'`; replace the boolean with `omittedWorkDependencies: 'none' | 'discoveryParentWork'`, explicitly applicable to DAG discovery sources. Keep fixed tree ordering distinct rather than advertising a tree policy that has no effect. Keep `workCompletion`, `discovery`, and `syntheticRoot` as separate axes.

**Migration:** mechanical root-key rename; boolean maps to the corresponding fallback literal for graph sources. Preserve source-specific defaults and suppression of a synthetic holder dependency.

### F05 — Medium — Generic execution defaults and historical bases preserve the wrong abstraction boundary

**Classification:** strong design recommendation, including observable assignability/default mismatches. **Affected:** `TraversalExecutionState`, `SyncTraversalExecution`, `AsyncTraversalExecution`, `CoreInspection`, `AsyncCoreExecution`, and historical runtime abstract bases `TreeTraversal`, `TreeTraversalRunner`, `TreeTraversalIterable`, `AbstractTreeSource`.

**Evidence:** `src/core/TraversalExecution.ts:10`, `:21`, and `:35` default to detailed `CoreInspection`, which excludes graph walking. The two execution interfaces default `EmittedKind = Phase`, whereas `TraversalExecutionOptions` maps DAG readiness phases to completion event kinds (`src/core/TraversalRunnerIterableConfig.ts:20`). Concrete DAG interfaces work around this explicitly. `src/core/AsyncCoreExecution.ts:5` repeats the async capability with different generic order. The abstract bases in `src/core/Traversal.ts:13`, `src/core/TraversalRunner.ts:35`, `:47`, and `src/core/TraversableTree.ts:104` add no runtime implementation behavior.

**Concrete misuse:** a wrapper accepting `TraversalExecutionState` appears family-independent but rejects a walker; a generic `SyncTraversalExecution<DagVisitorPhase, DagEvent<...>>` defaults to readiness names for emitted events. Users must know historical exceptions to use apparently generic types.

**Recommended shape:** default generic inspection to `ExecutionInspection` and emitted kinds consistently to `EmissionKind<Phase>`. Concrete tree/DAG interfaces explicitly select the renamed `TreeDagExecutionInspection`; walkers keep `GraphWalkInspection`. Remove `AsyncCoreExecution` and the redundant public abstract bases, retaining structural source/execution contracts and concrete builders. Abstract source/registration extension can use `implements` or a host-owned base.

**Migration:** consumers relying on detailed defaults request that inspection type explicitly; subclasses move to structural interfaces. Do not widen phase acceptance or flatten meaningful sync/async return differences. Removing the empty bases is a simplification recommendation, not a claim that existing subclassing is broken.

### F06 — Medium — Generic visitor and binder names are actually tree-only

**Classification:** strong design recommendation. **Affected:** `TraversalVisitor`, `AsyncTraversalVisitor`, `TraversalVisitorRecord`, `MutationCommandBinder`, `MutationCommandBinderFactory`, tree registration signatures and object binder support.

**Evidence:** `src/core/TraversalVisitor.ts:181` and `src/core/AsyncTraversalVisitor.ts:9` hard-wire `TreeVisitorContext`; DAG and walking have genuinely different callback shapes. `src/core/MakeMutationCommandFunctionFactory.ts:33` binds `Parameters<TraversalVisitor<...>>`, so its configuration generic does not make it family-neutral.

**Concrete misuse:** a consumer chooses `TraversalVisitor` as the reusable “any traversal” callback type and discovers that it requires a mutable tree store, cannot accept a `DagVisitorContext`, and cannot process a walking event.

**Recommended shape:** `TreeVisitor`, `AsyncTreeVisitor`, `TreeVisitorRecord`, `TreeMutationCommandBinder`, and `TreeMutationCommandBinderFactory`. Keep truly generic `VisitorDefinition<F>`, group/registration contracts, `MutationCommandBuilder<..., RewriteInput>`, and the shared command result algebra generic. No need to add “Tree” to contracts that genuinely serve DAG/walking too.

**Migration:** type-only names and consuming declaration references change. Preserve phase inference, contravariant execution capabilities, arbitrary IDs and genuinely shared commands.

### F07 — Medium — Public inspection fields still use “phase” for two different concepts

**Classification:** strong design recommendation. **Affected:** `CoreInspection`/reachable `KernelInspection`, `readyVisits`, `chains`, `pendingRequests`, supporting `VisitOrder`/`CallbackValues`; inherited `inspect()` results.

**Evidence:** `src/core/CoreInspection.ts:37` calls the visitor phase `order`; `:54` simultaneously uses `phase` for chain state (`running/paused/done/invalid`), `position` for callback position, and `config` for execution selectors. `:64` exposes engine `MAKE_ROOT`, `MAKE_VERTEX`, and `HINT_ID` through `keyof CallbackValues`, despite public source methods being `resolveRoot`, `resolveChild`, and `getVertexIdFromHint`. `src/core/TraversalKernel.ts:610` constructs these records. Walking already exposes `activeVisitor.phase`, `visitorIndex`, and `pendingRequests.operation`.

**Concrete misuse:** generic diagnostics reads `chains[i].phase` expecting `ON_WORK_READY` like callback `context.phase`, or searches pending operations for the public source callback that is blocked and encounters `MAKE_VERTEX`.

**Recommended shape:** `readyVisits[].phase`; `chains[].phase` for callback phase, `chains[].state` for chain lifecycle, `visitorIndex` and `executionOptions`; `pendingRequests[].operation` with `resolveRoot`, `resolveChild`, `resolvePrerequisite`, `sortChildHints`, `getVertexIdFromHint`, `visit`. Map engine effects at the observation boundary rather than exposing their private keys. Use `TreeDagExecutionInspection` per F05. Remove legacy `group` separately under F09.

**Migration:** diagnostic payload/schema changes; preserve values, ownership tokens, counts and timing. `frame.stage` remains valid DFS/BFS diagnostic vocabulary and need not match visitor phases.

### F08 — Medium — ResolvedVertexStatus exposes pre-order names in BFS and DAG APIs

**Classification:** strong design recommendation. **Affected:** `ResolvedVertexStatus`, `ResolvedGraphVertex.status`, `ResolvedGraph.getStatusOf`, returned graph views from tree/DAG runners and source contexts.

**Evidence:** `src/core/graph/types.ts:25` includes `PRE_VISITING` and `PRE_VISITED` across all families. `src/core/scheduling/GraphScheduling.ts:546` marks the initial visit committed as `PRE_VISITED`, while `:559` sets `PRE_VISITING` when initial visitation starts. Deferred DAG W can remain at that started stage without an active callback. `COMPLETING` is also a queued/active completion stage, not committed C.

**Concrete misuse:** a coordinator treats `PRE_VISITED` as DFS-specific or `PRE_VISITING` as proof an agent/callback is currently running, contradicting `summary().work`/`activeVisitorVertexIds`.

**Recommended shape:** `ResolvedVisitStage`, property `visitStage`, query `getVisitStageOf`, with `DISCOVERED`, `INITIAL_VISIT_ELIGIBLE`, `INITIAL_VISIT_STARTED`, `INITIAL_VISIT_COMMITTED`, `COMPLETION_VISIT_ELIGIBLE`, `COMPLETE`. These name monotonic scheduling boundaries rather than pretending to measure host activity. Keep `DagWorkState` and W/C progress separate; do not replace them with this stage enum.

**Migration:** update status branches and diagnostics. Keep tree/BFS/DAG semantics and deferred work behavior; names must not imply a phase callback necessarily ran when filtered or seeded.

### F09 — Medium — Compatibility surfaces continue to offer competing semantics and names

**Classification:** strong design recommendation. **Affected:** the complete compatibility inventory below, including public typed unions, direct built-in outputs, and accepted JavaScript-only inputs. Exact binding/member/overload coverage is in `coverage.json`.

**Evidence:** `src/core/Vertex.ts:9`, `:69`; `src/core/CTTRef.ts:24`; `src/core/ResolvedGraph.ts:17`; `src/core/TraversableTree.ts:54`, `:60`, `:87`; `src/core/TraversalVisitor.ts:18`, `:124`, `:158`; `src/core/TraversalRunnerIterableConfig.ts:30`; `src/traversals/dag-traversal/lib/DagProgress.ts:3`; all six deprecated positional traversal helper overloads. Concrete `ObjectTreeSource` and `ResolvedTreeStore` still produce untagged results (`src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts:95`, `src/core/ResolvedTree.ts:247`).

**Concrete misuse:** `onCompleteVisitor` in the old DAG helper is actually a precommit subgraph-ready callback; `getVertexById` returns a reference rather than a vertex value; `resolutionStyle: CONCURRENT` selects command batching rather than host execution concurrency. Merely calling these names deprecated leaves the competing contracts callable.

**Recommended shape:** one canonical route for each operation: tagged source results, `$data/$childHints`, explicit ref/vertex identity queries, `emitEvents`/`visitorPhases`, `commandCommitMode`, phase-keyed helper options, tagged settlement outcomes and sole `DEFER_WORK_COMPLETION`. Remove accepted aliases as well as export aliases; reject retired JS fields clearly. Preserve standard rejection-only `never` fields as useful type guardrails.

**Migration:** breaking release/codemod, no compatibility aliases carried into the redesigned surface solely for history. Convert built-in direct source outputs too. Keep local generation guards, own-ID presence, exact errors and omitted-versus-missing semantics unchanged.

### F10 — Medium — Materialized DAG “sources” are configuration envelopes

**Classification:** strong design recommendation. **Affected:** `MaterializedDagSource`, `materializeDagSourceFromRecords`, `materializeDagSourceFromRoots`, async counterparts, and their documentation.

**Evidence:** `src/sources/types.ts:6` declares `{ traversableGraph: DagDiscoverySource<...>, syntheticRoot: true }`; `src/sources/materialize.ts:42` constructs that envelope. Walking's similarly named materializers return the actual `GraphWalkSource` protocol. The synthetic holder is only hidden when the companion option is retained.

**Concrete misuse:** a consumer writes `{ traversableGraph: materializeDagSourceFromRecords(...) }`, following the walking helper pattern, or extracts `.traversableGraph` and loses required synthetic-root treatment.

**Recommended shape:** for the existing envelope contract, use `MaterializedDagInput` and `materializeDagInputFromRecords`/`materializeDagInputFromRoots` (with `Async` suffixes). They then read consistently with `PrepareDagInput` and spreading into `DagOptions`. Keep `DagDiscoverySource` for the actual protocol. A future true source-returning factory would need to carry multi-entry/root metadata intrinsically; renaming alone cannot make the current envelope a source.

**Migration:** mechanical names; keep result shape, eager materialization, shared item identity and synchronous returned adapter after async materialization. Root namespaces are not a substitute for clarifying the returned role.

### F11 — Medium — The `forest` definition entry does not require a forest

**Classification:** strong design recommendation. **Affected:** `DagDefinition.entry.kind`, round-trip prepared definitions, fragment composition and definition-to-walking adapters.

**Evidence:** `src/traversals/dag-traversal/lib/DagDefinition.ts:27` says `forest`; `src/traversals/dag-traversal/dagFragments.ts:155` concatenates entries and later returns `entry: { kind: 'forest', slots }`. Shared descendants and repeated ordered structural slots are permitted; the adapter similarly interprets the entry simply as multiple starting targets (`src/traversals/graph-walk/walkSourceFromDag.ts:84`).

**Concrete misuse:** a consumer chooses a forest-specific representation assuming one parent per vertex, then loses a shared child or deduplicates meaningful parallel slots.

**Recommended shape:** `{ kind: 'roots', slots }` for the ordered multi-entry/catalog form; retain `root` and `empty`. Keep `slots` instead of an IDs-only list because omission identities and order matter. Document that entry slots are traversal/discovery entries, not necessarily graph-theoretic zero-indegree vertices.

**Migration:** discriminator/schema rename across definitions, revisions, fragments and walking adapters. Preserve order, omissions, arbitrary ID identity and shared structure. No topology restriction should be introduced merely to make the old name true.

### F12 — Medium — DISABLE_SUBTREE_TRAVERSAL overstates pruning reach in a shared DAG

**Classification:** strong design recommendation. **Affected:** command enum/arguments/results, tree/DAG visitor APIs and command documentation.

**Evidence:** `src/core/TraversalVisitor.ts:17`; `src/core/TraversalKernel.ts:1206`; `src/core/scheduling/GraphScheduling.ts:766` closes **pending** child slots and the current vertex's expansion. It does not globally disable a shared descendant reached elsewhere or retract already-admitted work. Eager discovery rejects the command because topology is frozen.

**Concrete misuse:** a DAG visitor uses the command to disable all work “under” an aggregate and assumes that its shared child or already-resolved child will not run.

**Recommended shape:** `SKIP_REMAINING_CHILDREN`, documented as the current vertex's remaining structural expansion, not dependency cancellation or recursive global disabling. Keep deletion/cascade operations separate under F03. This descriptive name fits the existing behavior across trees and DAGs without pretending a DAG is a tree.

**Migration:** command rename and clearer phase/topology restrictions. Preserve already-admitted work, shared identity, eager topology freezing and current cooperative pause semantics.

### F13 — Medium — A public static “get” helper is actually a callback factory

**Classification:** objective role/name mismatch. **Affected:** `ObjectTreeSource.getRootPropertyFromInputObjectDefault` and its reachable function signature.

**Evidence:** `src/traversable-tree-implementations/traversable-object-tree/lib/getRootPropertyFromInputObjectDefault.ts:5` takes an optional **root key**, then `:16` returns a mapper that later consumes the input object. Beside it, `getChildrenOfPropertyDefault` really consumes a property immediately.

**Concrete misuse:** `ObjectTreeSource.getRootPropertyFromInputObjectDefault(inputObject)` appears to return the root property, but treats the argument as a key and returns a function (and may fail typechecking for an object input).

**Recommended shape:** `ObjectTreeSource.createRootPropertyMapper(rootKey?)`; keep the `getRootPropertyFromInputObject` option as the mapper callback. Leave `getChildrenOfPropertyDefault` alone because it is already a direct operation. Keep one intentional static mutation binder alias if users discover it through the object source class; its `create` role is accurate.

**Migration:** static name change; preserve generated root key, callback identity and behavior. The private physical filename is not part of the recommendation.

### F14 — Low — Remaining object callback/type names obscure their domain and role

**Classification:** strong naming recommendation; parameter spelling suggestions are optional style. **Affected:** `RewriteFn`, `RewriteFnOptions`, `RewriteFnPropInput`, `TraversableObjectTTP`, `ResolvedTreeTypeParameters`; associated signatures.

**Evidence:** `src/tools/rewrite-object/rewriteObject.ts:26`, `:39`, `:45`; `src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectTTP.ts:5`; `src/core/ResolvedTreeTypeParameters.ts:5`. `RewriteFnOptions` is runtime callback context, while `RewriteObjectOptions` is configuration; `TTP` is an obsolete acronym after introducing `VertexTypes`.

**Concrete misuse:** root-level `RewriteFn` is chosen for arbitrary vertex-data transformation, or a consumer attempts to construct `RewriteFnOptions` as rewrite helper configuration rather than recognizing callback-provided state.

**Recommended shape:** `ObjectRewriteCallback`, `ObjectRewriteContext`, `ObjectRewriteInput`, `ObjectTreeVertexTypes`, `ResolvedTreeVertexTypes`. Apply the actual type fixes in F01, not just these labels. Keep `TraversableObjectProp`, its key/value fields, `VertexTypes`, and the configurable mutation binder vocabulary; they already state their roles.

**Migration:** type-only renames. Optionally rename declaration parameter `icfgInput` to `options`/`patch`, callback `options` to `context`, `order`/`ORDER` to `phase`/`Phase`, and `IN_TO_TTP`/`OUT_TO_TTP` to `InputTypes`/`OutputTypes`. These parameter spellings do not justify API restructuring or generic reordering; keep ID trailing and preserve inference.

### F15 — Low — Chain-state command vocabulary disagrees with callback context and lifetime

**Classification:** strong naming recommendation. **Affected:** `SET_VERTEX_VISITORS_CHAIN_STATE`, `vertexVisitorsChainState` argument, shared command contracts, tree/DAG visitor documentation.

**Evidence:** `src/core/TraversalVisitor.ts:15`, `:30` versus callback `visitorChainState` at `:101`; `src/core/TraversalKernel.ts:1232` commits this value into the current chain. Each phase visit initializes its own chain; this is not durable per-vertex state shared across phases.

**Concrete misuse:** a caller sets “vertex visitors chain state” in pre-order and expects the same vertex's post-order visitor to see it, or returns `{ visitorChainState }` by analogy with the context and supplies the wrong argument field.

**Recommended shape:** `SET_VISITOR_CHAIN_STATE` with `{ state }`; retain callback `visitorChainState` and document per-visit lifetime and command batching visibility. Keep arbitrary state opaque; do not move host task/attempt state into CTT.

**Migration:** enum/argument spelling changes only. Preserve `afterEachVisitor` versus `afterGroup` visibility and initialization at each phase visit.

## Cross-API vocabulary decisions

| Concept | Retain / recommend | Distinction that must survive |
| --- | --- | --- |
| Source lookup | `resolveRoot`, `resolveChild`, `resolvePrerequisite`, walking `resolveVertex` | Root entry, opaque hint, prerequisite ID, and walking hydration are different protocols. |
| Materialized input | Recommend `MaterializedDagInput`; keep walking `GraphWalkSource` | Configuration envelope versus actual source protocol. |
| Builder / execution | `configure`, `createRunner`, `run`, `iterateEvents`, session `advance` | Configure future runners; allocate; execute; actively drive events; reach host work boundary. |
| Generic inspection | `ExecutionInspection`; recommend `TreeDagExecutionInspection` | Common observation versus detailed engine diagnostics. |
| Visitor phase / event | `ON_WORK_READY` / `ON_SUBGRAPH_READY`; `workCompleted` / `subgraphCompleted` | Precommit eligibility versus committed observation. |
| Tree phase / walking strategy | `PRE_ORDER`, `IN_ORDER`, `POST_ORDER`, `LEVEL_ORDER`; `breadthFirst`, `depthFirst` | Visit position versus traversal expansion strategy. |
| W / C prerequisites | `dependsOnWork`, `dependsOnSubgraphCompletion` | Both gate own W; C includes own W and retained structural descendants. |
| Structural relations / waits | `StructuralChildEdge`, `DagWaitEdge` | Parent → child versus waiter → prerequisite; do not force both into `from/to`. |
| Identity | `vertexId`, `getVertexId`, `getVertexRefById`, `getRefId`, `vertexToken` | Host arbitrary ID, mutable reference UUID, local diagnostic token. |
| Live structure / captured facts | `ResolvedTreeView`, `OriginalGraphView`, `DagMilestoneSnapshot` | Live query, retained original structure, fixed observational snapshot. None is durable host storage. |
| Progress / ownership | `DagWorkState`, `awaitingSettlement`, `DagDeferredWork`, `DagWorkTicket` | W state; guarded dispatch eligibility; generation record; session-owned capability. |
| Registration / callbacks | `priority`, `commandCommitMode`, `concurrency` | Ordering within groups; command application boundary; admitted asynchronous callback capacity. |
| Walking units | `candidateReadAttempts`, `admittedTargets`, `uniqueFoundVertices`, `outgoingIndex`, `slotIndex` | Reads, admissions, unique hydration, source enumeration, authored structural slot. |
| Rewriting | `outputAtReturn`, `getOutput`, recommend `ObjectRewriteContext` | Captured possibly partial conversion, final cached conversion, live callback state. |
| Declaration changes / execution changes | `reviseDag`, `diffDagDefinitions`; F03's scoped removal names | Fresh validated topology and shallow diff, versus local running-session mutation. |

## APIs deliberately retained

The declaration ledger contains an individual rationale for every retained declaration and its complete listed member set; this section states the main cross-family judgments rather than repeating 318 rows.

- **All seven root namespace groups and all nine runtime routes:** `core`, `objectRewrite`, `depthFirstTraversal`, `breadthFirstTraversal`, `dagTraversal`, `traversableObjectTree`, `graphWalk`. Module namespaces, named imports and subpaths are normal discoverability choices, not different semantics. `objectRewrite` is distinguishable from callable `rewriteObject`; uppercase constructors differ from lowercase namespaces. Removing them merely to reduce the binding count is cosmetic. The metadata route is not a runtime API family.
- **Concise receiver methods:** `get`, `has`, `configure`, `createRunner`, `summary`, `inspect`, `prepare`, `settle`, `explain`, `prerequisitesOf`, `dependentsOf`, `close`. Their receivers and argument/return contracts provide scope. `settle` takes a typed W-or-fatal outcome and an atomic generation, so it is not a host business-result acceptance API.
- **Pause/lifecycle names:** `isHalted` remains accurate because HALTED includes prepared/awaiting-settlement states; `getStopReason` supplies the distinction. Walking `close` is terminal; iterator `return` pauses. No blanket rename to `isPaused` or `cancel`.
- **Source family distinctions:** walking has explicit target wrappers, optional hydration and lazy adjacency; tree/DAG sources have root/child resolution and DAG prerequisite lookup. A single fake universal source would conceal real semantics. `MaybePromise` and async source/visitor names accurately expose asynchronous work; async materialization still returns a synchronous source.
- **Definition/prepared/session layers:** `defineDag`, `prepareDagDefinition`, `prepareDag`, `PreparedDag.definition`, live-child convenience `vertices`, fragments, remapping, composition, revisions, and shallow diffs. Their return types and receiver contexts distinguish copying, validation, discovery, factories and new revisions. `DagFragmentInstance` is a useful semantic alias, not a promise of a nominal identity brand.
- **Canonical command names:** `REWRITE_CHILD_HINTS`, `REWRITE_VERTEX_DATA`, `DEFER_WORK_COMPLETION`, `PAUSE_TRAVERSAL`, `NOOP`. Data versus hints, W deferral versus pause, and replacement versus observation are explicit. Command `commandName`/`commandArguments` is verbose but unambiguous; changing the envelope alone adds no clarity.
- **Value/view contracts:** `MutableRef`, `VertexRef`, `VertexContent.$data/$childHints`, `TreeVertexRecord.metadata/children`, `ResolvedTreeStore`, `ResolvedTreeView`, `OriginalGraphView`. TypeScript read-only collections do not mean deeply immutable caller data. Shallow clone/view behavior is intentional. `Vertex.hasNoChildHints`, DFS `isTraversalLeaf`, and `hasSingleStructuralSink` measure different facts and should not collapse into `isLeaf`.
- **Walking vocabulary:** `GraphWalkLink` source input versus observed `GraphWalkEdge`; `from/to`; vertex/edge/path kinds; once/simplePaths/walks; shouldFollowEdge/shouldExpandVertex; counts, limits and outcomes. `depth` consistently measures the current candidate route (target route on edge observations); retaining it is defensible despite needing that definition. `source` on an edge event is an endpoint, not the adapter; receiver context makes this conventional. No separate breaking rename is warranted.
- **Identity/error/type behavior:** arbitrary SameValueZero IDs, own `undefined` identity wrappers, exact thrown values, no synthetic holder leakage, phase inference, ID generics trailing input/rewrite types, genuine overloads for sync-source inference, and shared CJS/ESM identities. Do not “simplify” these into string IDs, normalized errors or widened phase strings.

## Complete compatibility and vocabulary audit

The supplementary ledger records every extracted occurrence, not just the examples here. Literal extraction includes implementation import strings and indexed type keys; those are classified as signature support, not invented public options.

| Accepted or exposed compatibility form | Reachability | Decision |
| --- | --- | --- |
| `$d` / `$c` content, clone fields and getters | Typed unions and runtime getters | Remove; canonical `$data` / `$childHints`. |
| `MutableRef.getId`, graph `getIdOf` / `getVertexById` | Typed methods, including retained graph view | Remove; explicit reference/host-ID APIs. |
| Untagged `{ vertexContent: ... }` and null omission | Typed resolution unions; direct built-in outputs | Remove; built-ins also return tagged results. |
| `undefined` prerequisite missing | Typed union and decoder | Remove; explicit `{ kind: 'missing' }`. |
| `DEFER_READY` | Exported runtime sentinel and DAG visitor result | Remove; sole `DEFER_WORK_COMPLETION` command. |
| `REWRITE_VERTEX_HINTS_ON_PRE_ORDER` | Exported enum member | Remove; `REWRITE_CHILD_HINTS`. |
| `{ ok: true }` / `{ ok: false, error }` | Typed settlement union | Remove; workCompleted/traversalFailed tags. |
| Positional traversal helper overloads and `*VisitorsSimple` | Public overloads/types | Remove; single options object and phase-keyed map. |
| `resolutionStyle`, enum CONCURRENT/SEQUENTIAL, inspection `group` | Signature-reachable metadata and records; JS registration decoder | Remove; commandCommitMode. Enum itself is no longer a supported import binding. |
| Caller `addedIndex` input | Typed VisitorDefinition; ignored at runtime | Remove input only; keep assigned registration metadata. |
| `iterateOver`, `enableVisitorFunctionsFor`, `disableVisitorFunctionsFor` | Private decoder types, still accepted at public JS execution/configuration boundaries | Remove acceptance; canonical event/phase selectors. Do not call private decoder types exported APIs. |
| `makeVertexHook` / `returnMe` | Private compatibility type, still consumed by ObjectTreeSource/rewriteObject at runtime | Remove acceptance; resolveVertexHook tagged outcomes. |
| Retired selector `dependencies` / `completionDependencies` | Rejected before callbacks by public materializers | Keep rejection; not accepted API alternatives. |
| Raw state/container injection, deep engine paths, old renamed exports | Rejected/blocked, not accepted supported surface | Keep blocked; do not count physical private files as exports. |
| `never` fields on tree results/prepared options/group members | Public rejection constraints | Retain useful restrictions; do not describe them as configurable options. |

Canonical literals were examined by family: source found/omitted/missing/useDefault; W/C milestones, reasons, progress, settlement and boundaries; lifecycle states/stop reasons; definition entries/slots/issues/edits/diffs; callback phases/command names/batching; walking strategy/revisit, events, limits/outcomes/operations; diagnostic stages/owner kinds/waits. F03/F07/F08/F09/F11/F12/F15 identify the changes; other literal decisions are retained in context.

Callback and generic roles were checked, including inference helpers, mapped keys and conditional inferred variables. Preserve real input/output/Data/Edge/ID/Phase distinctions and generic ordering. Optional spelling improvements in F14 apply to names only, not generic behavior or arbitrary limits on supported policies.

## Coverage, method and limits

- **Exact census accounting:** 534 supported binding occurrences; 318 reachable declaration occurrences; 897 declared/nested member occurrences; 1,085 inherited/mapped instance relationships; 3 static relationships — **2,837 exact IDs** in `coverage.json`. These are occurrences, not 2,837 independent API concepts. Signature-support declarations are explicitly identified and not misreported as independent imports.
- **Supplemental accounting:** all 393 literal/enum occurrences, 338 callback/method parameter occurrences, 631 generic-parameter occurrences, and 21 reachable deprecation occurrences are classified in `supplemental-coverage.json`. Import strings, indexed keys, inferred/mapped parameters and rejection constraints are separated from public runtime vocabulary. Runtime-only accepted compatibility forms are additionally listed above.
- Every declaration signature and its nested member set was read. `declaration-decisions.json` records explicit decisions, and `decisions.py` contains the hand-authored decision ledger plus deterministic expansion to member relationships/routes. Repeated or inherited members point to the fully reviewed origin through `reviewedVia`; rewrite-context instantiation is assessed separately because substituting input/output types changes the judgment. This is not a default-to-retain sweep.
- Read source/barrels/package exports and current README/reference/workflow/migration documentation. Checked implementation where names depend on deletion scope, deferred state, W/C policy, source wrappers, mutation merging, rewrite context, fragment/definition semantics, adapter relation direction, inspection and async/factory ownership. Read relevant behavioral tests as supporting evidence. No historical review was used as the finding checklist.
- Build and census evidence was supplied fresh at this baseline. The controller independently checked all nine CJS/ESM runtime entries for matching names/value identity. The review itself made no source/git changes and did not rerun the full suite. The minimal probe compiled strictly and executed; `probe-output.txt` contains the two demonstrated contradictions. The controller additionally compiled without `skipLibCheck` and confirmed them.
- Census limitation: it filters out standard-library inherited members (`Error.name/message/stack`, Map/ReadonlyMap/array/iterator methods, Object/Function built-ins). These standard names/roles were deliberately retained; they are not library-designed aliases and are not included in the exact custom-ID count. No public/protected library declaration member was found omitted by the declaration pass; no protected declaration members were present. Root namespace members resolve to the same reviewed modules, so namespace expansion does not create unreviewed alternate semantics.
- `package.json` fields are packaging metadata, not callable traversal symbols. Physical `dist` implementation files remain necessary for relative declarations but are not supported deep imports. No claim is made that unsupported JS reflection or deliberately bypassing package export maps is part of the contract.
- This is exhaustive **surface accounting and contextual review**, not formal proof of every implementation path or performance claim. The naming findings do not imply authorization to alter scheduling semantics, expand into host task policy, publish a release or make durable-storage promises.

Artifacts: [complete audit bundle](2026-10-27-idiomatic-api-audit/README.md), including the unmodified reviewer report, complete symbol/member dispositions, supplementary vocabulary judgments, reproducible probes, and controller verification records.
