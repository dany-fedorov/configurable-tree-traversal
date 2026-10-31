# Fable 5.1 independent review: configurable-tree-traversal public API naming and distinctions

Baseline reviewed: HEAD `8f20c2f43cbf7722025b2fb5682072f8e4952c1b` (controller validated 460 input hashes; `docs/superpowers/reviews/2026-10-31-public-api-audit/baseline-validation.json`). Read-only review; no edits, builds, or executions by me. Behavioral facts come from `src/`, current tests, the four named guides, and the controller probe outputs already in the 2026-10-31 audit folder.

**Result: 20 findings, three at 3/5, ten at 2/5, seven at 1/5. None at 4/5 or 5/5.** None is a runtime correctness bug. The strongest three are API shapes that invite silent misuse: a walking patch field that replaces instead of patching, a lossy projection that shares the name of the faithful one, and a scheduling policy key that reuses the word `omitted`, which already means a source result kind. Everything below 2/5 is marked optional and is a naming judgment, not a defect. A rename reduces a specific confusion; it cannot prevent every misreading.

Prior review consulted only after my list was formed (`docs/superpowers/reviews/2026-10-29-public-api-idiomatic-review.md`). Overlaps are marked "overlaps prior Fxx" and were independently re-verified; my severities are my own. Items the prior review covered that I judged weaker than my twenty are not re-reported but are referenced in the appendix.

Within each finding, "Verified" lists facts checked in source or tests with `path:line`; "Judgment" is my assessment.

## Findings

**F01 · 3/5 · design improvement · `configure({ limits })` replaces the whole limits record while every sibling nested option patches field-wise**
- Where: `src/traversals/graph-walk/GraphWalkOptions.ts:120-127` (patch type), `src/traversals/graph-walk/lib/normalizeWalkOptions.ts:190-194` (merge).
- Closest confusable: `TraversalExecutionOptions` on the same patch (`src/core/TraversalRunnerIterableConfig.ts:20-30`, field-wise per `docs/reference.md:163-170`), `InOrderOptionsPatch` (field-wise, `docs/reference.md:170`), walking predicates where `null` clears and `undefined` retains (`GraphWalkOptions.ts:79-85`).
- Verified: a supplied `limits` object becomes the entire record; bounds absent from it are dropped. `tests/async-graph-walk-paths.test.ts:301-304` shows `configure({ limits: { maxDepth: 1 } })` followed by `configure({ limits: { maxAdmittedTargets: 5 } })` throwing only because route mode requires a depth or read bound. Under the default `revisit: 'once'` no validation fires.
- Plausible misuse: a host builds a walker with `limits: { maxAdmittedTargets: 500, maxCandidateReadAttempts: 2000 }`, later tunes depth with `configure({ limits: { maxDepth: 3 } })`, and silently loses both read budgets against a remote source. The type `GraphWalkOptionsPatch` offers no signal; `limits?: GraphWalkLimits | undefined` looks exactly like the field-wise siblings.
- Proposal: patch `limits` field-wise, with `null` on an individual bound to clear it, matching the predicate convention. If replacement must stay, name the key for it: `replaceLimits`.
- Migration/tradeoff: behavior change for callers who rely on replacement to clear bounds; they would write `{ maxAdmittedTargets: null }`. Merged validation stays atomic.
- Owners: D0277, D0278, D0290, D0291, D0288, D0289, D0266, D0268, D0274.

**F02 · 3/5 · design improvement · `PreparedDag.vertices` is a lossy projection but carries the shorter, more inviting name next to the faithful `definition.vertices`**
- Where: `src/traversals/dag-traversal/lib/PreparedDag.ts:9-15, 59-63`; projection built at `src/traversals/dag-traversal/lib/makePreparedDag.ts:43-57`.
- Closest confusable: `DagDefinition.vertices[].slots` (`src/traversals/dag-traversal/lib/DagDefinition.ts:12-31`), `DagSummary.vertices` (a `ReadonlyMap`, `src/traversals/dag-traversal/lib/DagProgress.ts:38`). Three `vertices` members with three record shapes in one family.
- Verified: `children` keeps only `slot.kind === 'vertex'`, omission slots vanish, and the projection has no `omittedIds` or `entry`. A doc comment warns; the name does not.
- Plausible misuse: a host persists `dag.vertices` as its graph revision, rebuilds with `defineDag` by mapping `children` to vertex slots, and loses known omitted IDs. Previously accepted `completedWork` seeds naming an omitted prerequisite then reject as unknown IDs (`docs/agent-workflows.md:213`), and prerequisites once satisfied by omission become unresolved.
- Proposal: rename to `liveVertexSummaries` (or `vertexSummaries`) so the faithful `definition` reads as the primary member, or remove the projection and offer a helper `summarizeDagVertices(definition)`.
- Migration/tradeoff: mechanical property rename; convenience consumers lose a short name.
- Owners: D0236, D0237, D0190, D0191, D0193, D0211.

**F03 · 3/5 · design improvement · `omittedWorkDependencies` reuses `omitted`, the family's source-result and slot vocabulary, for an unrelated absent-list policy**
- Where: `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:18-24`; semantics at `src/core/scheduling/GraphScheduling.ts:908-919`; key registry `src/core/assertPublicOptions.ts:35`.
- Closest confusable: `DagVertexOmitted` (`src/core/TraversableTree.ts:44-48`), `DagDefinition.omittedIds` (`DagDefinition.ts:23`), `replaceOmissions` (`DagRevision.ts:23`), `invalidOmission` (`DagDefinition.ts:44`), `ChildSlot.kind: 'omitted'` (`src/core/graph/types.ts:49-54`). In every one of those, "omitted" means a deliberately omitted vertex.
- Verified: the policy applies only when a found vertex supplies no `dependsOnWork` list at all; a declared list, including `[]`, wins; synthetic-root children get `[]`. Materializers always supply lists, so the policy only matters for custom sources.
- Plausible misuse: a host with a custom source reads the key as "how omitted vertices' work dependencies are treated" and leaves the default, expecting omitted prerequisites to behave differently, while vertices that simply forgot a list become immediately ready. The error is silent: no validation can detect an absent list that was meant to inherit.
- Proposal: `dependsOnWorkDefault: 'none' | 'discoveryParentWork'`, read as "the default for `dependsOnWork` when a result declares none". `rootWorkDependencies` can stay.
- Migration/tradeoff: key rename across options, patches, prepare inputs, never-guards, and docs; one-line find/replace for hosts.
- Owners: D0219, D0222, D0223, D0224, D0186, D0187, D0188, D0238, D0239, D0243, D0231, D0232, D0233, D0234, D0235, D0160, D0173, D0058.

**F04 · 2/5 · design improvement · `ChildSlot` encodes a known omitted identity by own-property presence, while `DagDefinitionSlot` uses an explicit wrapper** (overlaps prior F12)
- Where: `src/core/graph/types.ts:42-58` (internal, comment "own presence retains a known omitted identity, including undefined"), public `types.ts:160-166`, facet copy `src/core/observationFacets.ts:164-171`; definition wrapper `DagDefinition.ts:5-10`.
- Closest confusable: `DagDefinitionSlot` `{ kind: 'omitted', identity: { vertexId } | null }`, `HintVertexId` wrapper (`types.ts:25`). `docs/reference.md:299` states the two encodings are not interchangeable.
- Verified: a known `undefined` identity and an anonymous omission differ only by `hasOwnProperty('vertexId')`; `kind: 'linked'` here corresponds to `kind: 'vertex'` in definitions.
- Plausible misuse: `if (slot.vertexId !== undefined)` or a JSON round trip collapses known-undefined into anonymous, so a replayed definition loses a prerequisite that was satisfied by omission.
- Proposal: `{ kind: 'omitted', hint, identity: { vertexId } | null }` on `ChildSlot`, and consider `'vertex'` for the live slot literal in both places.
- Migration/tradeoff: consumers of resolved-graph slots switch to `slot.identity`; one extra object per known omission.
- Owners: D0024, D0029, D0026, D0030, D0193, D0025, D0058.

**F05 · 2/5 · design improvement · `vertexIds` names an ordered cycle witness in one union arm and SCC membership in the next** (overlaps prior F05)
- Where: `src/traversals/dag-traversal/lib/DagDefinition.ts:46-47`; `DagDiscoveryCycleError.vertexIds` (witness, `src/core/errors/DagDiscoveryCycleError.ts`, surface D0014); `dependencyCycleComponents` (SCC, `src/core/errors/DagTraversalStallError.ts:23-24`).
- Verified: `docs/reference.md:282, 311` document that `discoveryCycle.vertexIds` is a closed ordered witness such as `['b','a','b']` and `structuralCycle.vertexIds` is declaration-ordered SCC membership.
- Plausible misuse: an issue formatter joins consecutive `vertexIds` with arrows for both kinds, inventing a path for a component.
- Proposal: `discoveryCycle.cycleWitness` and `structuralCycle.componentVertexIds`; same rename on the error class. `dependencyCycleComponents` already says what it is.
- Migration/tradeoff: field rename in formatters and tests; the union stays.
- Owners: D0192, D0014, D0015, D0199.

**F06 · 2/5 · design improvement · One graph view answers unknown handles with `null` from some queries and a thrown `Error` from others**
- Where: `src/core/graph/GraphStore.ts:43` (`getVertexId` via `getEntry`), `:297-301` (`getEntry` throws `'Unknown vertex reference'`), `:413-418` (`getPaths` calls `getEntry`), versus `:51-52, 357-358, 374-375` (`getVisitStageOf`, `getParents`, `getChildren` return `null`). Public interface `src/core/ResolvedGraphView.ts:31-45`. Tree view: `src/core/ResolvedTree.ts:236-239` throws `'Could not find ref - …'` from `getPathTo` while `getChildrenOf`/`getResolutionContextOf` return `null` (`:112-117, 126-129`).
- Verified: tests assert both the thrown messages (`tests/explicit-identity.test.ts:80-97`, `tests/tree-query-ownership.test.ts:141`) and null returns. `docs/reference.md:1247` documents the tree throw; the graph `getPathsTo` and `getVertexId` throw on unknown handles are not called out there.
- Plausible misuse: a host holding handles across a `DELETE_DAG_VERTEX_CASCADE` guards with `view.getChildrenOf(ref) ?? []` and then calls `view.getPathsTo(ref)` on the same handle, which throws a plain `Error` rather than returning an empty array.
- Proposal: one convention per view. Prefer `null`/empty for absent handles on all queries and reserve throwing for malformed arguments, or throw a dedicated `UnknownVertexHandleError` from every query and say so in the reference.
- Migration/tradeoff: changing the throwing queries to return values is a behavior change for callers relying on the exception; the alternative is documentation plus an error class.
- Owners: D0040, D0041, D0051, D0047, D0046.

**F07 · 2/5 · design improvement · Milestone explanations say `unknown` where endpoint status says `unresolved`, and collapse omission into `known`**
- Where: `src/traversals/dag-traversal/lib/DagInspection.ts:22-24` (status kinds), `:46-59` (explanation kinds), `:91-93` (`kind ?? 'unresolved'`), `:125-131` (`'unknown'` when identity absent), `:182` (omitted becomes `known` with `progress: null`).
- Closest confusable: `DagBlocker.prerequisiteStatus.kind` (`'unresolved'`) sits inside the same `explain()` result as `DagExplanation.kind` (`'unknown'`), both meaning "identity absent from this capture" (`docs/reference.md:635, 650`).
- Verified: tests assert `kind: 'unknown'` on explanations and `kind: 'unresolved'` on statuses (`tests/dag-inspection-explanations.test.ts:217, 326`).
- Plausible misuse: a host that classifies by a shared string set treats `unresolved` and `unknown` as two conditions, or checks `explanation.kind === 'known'` to mean "live vertex" and then reads `progress.work` on an omission, which is `null`.
- Proposal: use one literal for absent identity in both types, and add `kind: 'omitted'` to `DagExplanation` (or an explicit `status: DagMilestoneStatus` field) so omission is not a `known` with a null progress.
- Migration/tradeoff: literal rename plus one new union arm; consumers narrowing on `known` must handle `omitted`.
- Owners: D0205, D0200, D0206, D0203, D0207.

**F08 · 2/5 · design improvement · Stall diagnostics use `id` and mutable arrays where every other DAG record uses `vertexId` and `readonly`**
- Where: `src/core/errors/DagTraversalStallError.ts:20-28`.
- Closest confusable: `DagMilestone.vertexId` in the same file (`:4-7`), `DagVertexProgress.vertexId` (`DagProgress.ts:17-18`), `DagDeferredWork.vertexId`, `DagEvent.vertexId`. The migration guide already moved `DagVertexProgress.id` to `vertexId` (`docs/migration-api-clarity.md:139`); this record was left behind. Tests pin the shape (`tests/dag-diagnostics.test.ts:23-26`).
- Verified: `dependencies: Array<{ id: ID; unmet: ID[] }>`, `unknownPrerequisiteIds: ID[]` and siblings are mutable while `DagDiscoveryCycleError.vertexIds` is `readonly ID[]`.
- Plausible misuse: a generic "collect vertexIds from any DAG record" helper silently skips stall entries, so stall reports omit the waiting vertex.
- Proposal: `dependencies: readonly { vertexId: ID; unmetPrerequisiteIds: readonly ID[] }[]` and `readonly` on the other arrays; keep the constructor copying.
- Migration/tradeoff: field renames in formatters; readonly widening is source-compatible for readers and breaking only for writers that mutate diagnostics.
- Owners: D0015, D0018, D0016, D0019, D0209, D0211.

**F09 · 2/5 · optional clarity · Inspection `kind` literals are kebab-case while the same words are camelCase elsewhere, and neighboring state vocabularies mix casing**
- Where: `src/core/CoreInspection.ts:32` (`'depth-first' | 'breadth-first' | 'dag'`), `src/traversals/graph-walk/lib/GraphWalkInspection.ts:12` (`'graph-walk'`), `src/traversals/graph-walk/GraphWalkOptions.ts:17` (`'breadthFirst' | 'depthFirst'`), `src/core/graph/types.ts:27-33` (`ResolvedVisitStage` SCREAMING_CASE), `DagProgress.ts:11-16` (`DagWorkState` lowercase), `src/traversals/depth-first-traversal/lib/DepthFirstPolicy.ts:6` (kebab frame stages).
- Verified: tests assert the kebab literals (`tests/defaults.test.ts:105-115`). Every option-policy literal in the package is camelCase (`afterWorkReadyChain`, `externalSettlement`, `simplePaths`, `inlineOrCached`, `discoveryParentWork`).
- Plausible misuse: a dashboard filter keyed on `'depthFirst'` from a `GraphWalkStrategy` value never matches `inspect().kind`; with literal types TypeScript flags the comparison, with `string` config it is silent.
- Proposal: `kind: 'depthFirst' | 'breadthFirst' | 'dag' | 'graphWalk'`; leave `GraphWalkPhase` lowercase because its values double as event kinds, and leave `ResolvedVisitStage` as is unless the team wants one casing for state unions.
- Migration/tradeoff: literal rename on an observational field; low churn.
- Owners: D0005, D0007, D0008, D0020, D0310, D0275, D0027, D0208, D0292, D0256.

**F10 · 2/5 · design improvement · The walking edge record's `source` is a vertex, while the option named `source` is the adapter**
- Where: `src/traversals/graph-walk/GraphWalkEvent.ts:19-27` (`source: GraphWalkVertex`), `src/traversals/graph-walk/GraphWalkOptions.ts:77` (`source: GraphWalkSource`), `:56` (`GraphWalkFollowContext.source`, a vertex), `GraphWalkInspection.ts:13` (`sourceMode`).
- Verified: `docs/reference.md:105` has to warn "`source` is the found source **vertex**, not the source adapter". Examples and tests use `event.source.data` throughout.
- Plausible misuse: a reader of an edge visitor assumes `event.source.outgoing(...)` is available, or names a local `source` for the adapter and shadows it inside the callback.
- Proposal: `fromVertex` on the edge event and the follow context, matching the edge's own `from`/`to` IDs; keep `target` as the tagged found/omitted wrapper or rename it `toVertex` for symmetry.
- Migration/tradeoff: field rename in walking consumers; the adapter option keeps `source`.
- Owners: D0269, D0281, D0286, D0287, D0288, D0289, D0271, D0272, D0306, D0307.

**F11 · 2/5 · design improvement · Sessions share an unexported base and type `inspect()` as the generic `ExecutionInspection` although they return the full tree/DAG snapshot** (extends prior F06)
- Where: `src/traversals/dag-traversal/coordinateDag.ts:36-47` (interface `DagCoordinationControl` extends unparameterized `TraversalExecutionState`), `:105` (`inspect: () => runner.inspect()`), `src/traversals/dag-traversal/index.ts:13-19` (base not exported), runner declaration `src/traversals/dag-traversal/lib/DagTraversalRunner.ts:70-75`.
- Verified: at runtime `session.inspect()` is the runner's `TreeDagExecutionInspection<DagVisitorPhase>`; the type hides `chains`, `pendingRequests`, `readyVisits`. A host cannot name "a sync or async session" without writing the union.
- Plausible misuse: a coordinator keeps only the session and casts `session.inspect() as TreeDagExecutionInspection<DagVisitorPhase>` to read pending callbacks, defeating the typed surface.
- Proposal: `export interface DagWorkSessionBase<ID> extends TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>>` and derive both sessions from it.
- Migration/tradeoff: additive narrowing; structural mocks of sessions must return the richer snapshot.
- Owners: D0164, D0165, D0166, D0167, D0168, D0068, D0008.

**F12 · 2/5 · design improvement · `VertexRef` means the read-only handle at the root and the mutable ref inside reachable declarations, and the docs present both names as one** (overlaps prior F19, rated higher here)
- Where: `src/core/index.ts:106` (`export type { VertexHandle as VertexRef }`), `src/core/graph/types.ts:16` (`VertexRef<T> = MutableRef<Vertex<T>>`), `:167-177` (`ResolvedGraphVertex` is `Omit<InternalResolvedGraphVertex, …>` so expansions show `vertexRef: VertexRef<T>` with `setValue` before the override; the census D0040 `get` member prints exactly that), `docs/reference.md:1241` ("`VertexHandle<T>` (also named `VertexRef<T>`)"), `docs/migration-api-clarity.md:173` ("deliberately exported `VertexRef<T>`").
- Verified: consumers importing `VertexRef` get the safe handle; no mutable leak. The same identifier has different authority in hover text and in the two modules.
- Plausible misuse: a reader of the hover for `ResolvedGraphView.get()` concludes that `vertexRef` supports `setValue` and files a bug, or a contributor imports the internal `VertexRef` believing it is the public one.
- Proposal: remove the public alias (breaking changes are allowed), rename the internal alias `MutableVertexRef`, and declare `ResolvedGraphVertex` directly instead of via `Omit` so hovers show only handle types.
- Migration/tradeoff: type import rename for alias users; no runtime change.
- Owners: D0010, D0011, D0021, D0026, D0028, D0030, D0040, D0023, ROUTES.

**F13 · 2/5 · optional clarity · The hint collection is `$childHints` but its accessors and options alternate between `Child` and `Children`**
- Where: `src/core/Vertex.ts:36` (`$childHints`), `:48` (`getChildrenHints`), `:52` (`hasNoChildHints`), `:75-78` (`VertexView` repeats both), `src/core/ChildHintSorter.ts:3-4` (`ChildHintSorter`) versus option key `sortChildrenHints` (`src/core/assertPublicOptions.ts:22, 29`) and operation literal `'sortChildrenHints'` (`src/core/CoreInspection.ts:24`), `REWRITE_CHILD_HINTS` with `newHints` (`src/core/TraversalVisitor.ts:11, 27-29`).
- Verified: `getChildrenHints()` returns `$childHints`; `hasNoChildHints()` calls `getChildrenHints()`. The type is `ChildHintSorter`, the option is `sortChildrenHints`.
- Plausible misuse: completion-driven authoring of `vertex.getChildHints()` or `sortChildHints:` fails to compile; no silent harm, but it is the most-used class and every family's option bag.
- Proposal: standardize on `childHints`: `getChildHints()`, `hasChildHints()` (positive), `sortChildHints`, operation literal `'sortChildHints'`; keep `REWRITE_CHILD_HINTS`. The prior review's separate point that the sorter is actually a transformer stands on its own and is not re-ranked here.
- Migration/tradeoff: broad but mechanical rename across all option bags and the object adapter's `getChildrenOfProperty` could stay since it enumerates properties, not hints.
- Owners: D0100, D0102, D0101, D0103, D0099, D0003, D0004, D0009, D0089, D0081, D0126, D0142, D0143, D0144, D0149, D0150, D0153, D0154, D0253, D0254, D0259, D0260, D0186, D0187, D0188, D0222, D0223, D0224, D0231, D0243.

**F14 · 1/5 · optional clarity · Three spellings of the same W/C relation across adjacent DAG APIs, and composition reuses the key the materializers reject**
- Where: `src/traversals/dag-traversal/lib/DagFragment.ts:20-26` (`dependencies` with `prerequisite: DagMilestone`), `src/traversals/dag-traversal/lib/DagRevision.ts:34-38` (`workDependencies`/`subgraphCompletionDependencies` aspects), `src/traversals/graph-walk/walkSourceFromDag.ts:3-11` (relation literals), `DagDefinition.ts:16-17` (`dependsOnWork`/`dependsOnSubgraphCompletion`), `src/sources/types.ts:26-31`.
- Verified: `docs/reference.md:258` says the retired selector key `dependencies` rejects with `TypeError`; `docs/reference.md:262-269` tabulates the layers. `DagWaitEdge.reason` uses `structuralChild` where the walk relation uses `child` and the selection uses `children`.
- Plausible misuse: a host mapping diff aspects back to vertex fields needs a translation table; a developer who learned that `dependencies` is retired hesitates at `DagCompositionOptions.dependencies`.
- Proposal: aspects named after the fields they describe (`'dependsOnWork'`, `'dependsOnSubgraphCompletion'`), and `milestoneDependencies` for the composition list since each entry carries a `milestone`. Keep walk relation names; they are adapter labels.
- Migration/tradeoff: literal and key renames; the documented table shrinks to two vocabularies.
- Owners: D0198, D0215, D0216, D0217, D0321, D0322, D0323, D0019, D0016, D0108, D0109, D0111, D0112, D0056, D0190.

**F15 · 1/5 · optional clarity · `DagFragmentInstance` is a bare alias of `DagFragment`, so the name promises an instantiation step the types do not enforce** (overlaps prior F10)
- Where: `src/traversals/dag-traversal/lib/DagFragment.ts:14-18`; `composeDag` re-normalizes any definition (`src/traversals/dag-traversal/dagFragments.ts:129-134`).
- Verified: composing an un-instantiated fragment compiles and runs; composing it twice throws on identity collision at runtime.
- Proposal: either drop the alias and name the mapping `mapDagFragmentIds`, or make instances nominal if composition is meant to require mapping. Prefer the former; current behavior does not justify a new restriction.
- Migration/tradeoff: type import rename only.
- Owners: D0196, D0197, D0170, D0171, D0172, D0195.

**F16 · 1/5 · optional clarity · Residual legacy identifiers and generic conventions differ by family in public signatures**
- Where: `src/traversals/dag-traversal/DagTraversal.ts:92-96, 110-113, 126-128, 132-135` and `AsyncDagTraversal.ts:112-114, 130-131, 148-149` (`order: ORDER`) versus `phase: Phase` on tree and walk builders; `src/traversals/depth-first-traversal/DepthFirstTraversal.ts:46, 58` and the three sibling builders (`icfgInput`); `src/core/TraversableTree.ts:84-94` (`TTP`, `RW_TTP`, `vertexHint`) versus `src/core/AsyncTraversableTree.ts:5` (`T`, `R`, `hint`); `TreeVisitor<Phase, TTP, RW_TTP>` (`src/core/TraversalVisitor.ts:186-200`) versus `DagVisitor<T, R, ORDER, ID>` (`lib/DagTraversalVisitor.ts:30-40`) versus `GraphWalkVisitor<Data, Edge, Phase, ID>` (`GraphWalkVisitor.ts:27-30`); four identical NoInfer helpers `NoInferPhase`, `InferredDagId`, `RevisionDomain`, `DiagnosticId` (`TraversalVisitor.ts:60`, `DagFragment.ts:29`, `reviseDag.ts:3`, `DagTraversalStallError.ts:32`).
- Verified: `docs/migration-api-clarity.md:108` retired `order` in favor of `phase` for contexts; the DAG builders still spell the parameter `order`. Parameter and type-parameter names appear in signature help only.
- Proposal: `phase`/`Phase` on DAG builders, `options`/`patch` instead of `icfgInput`, `T`/`R` instead of `TTP`/`RW_TTP`, one internal `NoInfer<T>` helper, and a documented generic order (data, rewrite data, phase, ID) applied to `TreeVisitor` too.
- Migration/tradeoff: positional generic changes on `TreeVisitor` are breaking for explicit type arguments; parameter renames are free.
- Owners: D0160, D0173, D0147, D0148, D0249, D0250, D0067, D0001, D0002, D0079, D0227, D0228, D0306, D0307, D0088, D0063, D0074, D0078, D0081, D0082, D0087, D0098, D0083, D0195, D0245, D0017, D0176, D0177, D0178, D0179, D0180, D0181, D0022.

**F17 · 1/5 · optional clarity · The family naming scheme is irregular across builders, runners, phases, events and option keys**
- Where: `DagTraversalRunner` (`lib/DagTraversalRunner.ts:66`) versus `DepthFirstTreeRunner`/`GraphWalkRunner`; `DagVisitorPhase` versus `DepthFirstPhase`/`BreadthFirstPhase`/`GraphWalkPhase`; `TreeTraversalEvent` (`src/core/TraversalRunner.ts:5`) versus `DagEvent`/`GraphWalkEvent`; `DepthFirstTraversalVisitors` without the `Tree` infix its options carry; `isTraversalLeaf` on DFS runners only (surface D0255/D0262 versus D0152/D0156); `ResolvedTreeStore.asReadOnly()` returning a `View` (`src/core/ResolvedTree.ts:134`); option keys `traversableTree`/`traversableGraph` (`src/core/assertPublicOptions.ts:21, 27-28`) for values typed `TreeSource`/`DagDiscoverySource` while walking uses `source`.
- Verified: all from declarations; no behavior involved.
- Proposal: pick one pattern per role: `{Family}Runner`, `{Family}Phase`, `{Family}Event`, `{Family}Visitors`; `treeSource`/`graphSource` keys; `asView()`; add `isTraversalLeaf` to BFS runners or document why only DFS has it.
- Migration/tradeoff: wide breaking renames for modest discoverability gain; defer unless bundled with other breaks.
- Owners: D0226, D0189, D0262, D0255, D0156, D0152, D0293, D0267, D0225, D0261, D0155, D0292, D0074, D0229, D0269, D0263, D0252, D0157, D0151, D0221, D0185, D0047, D0158, D0159, D0264, D0265, D0247, D0248, D0314, D0315, D0149, D0150, D0153, D0154, D0253, D0254, D0259, D0260, D0184, D0220, D0113, D0286.

**F18 · 1/5 · optional clarity · The object-rewrite module inverts its own prefix**
- Where: `src/tools/rewrite-object/rewriteObject.ts:33, 56, 68` (`ObjectRewriteContext`, `ObjectRewriteInput`, `ObjectRewriteCallback`) versus `RewriteObjectResult`, `RewriteObjectOptions` (surface D0117/D0118 at `rewriteObject.d.ts:23, 30`), function `rewriteObject`, namespace `objectRewrite` (`src/index.ts:2-3`), subpath `./tools/rewrite-object`.
- Verified: declarations only.
- Proposal: `ObjectRewriteOptions`, `ObjectRewriteResult`, namespace `objectRewrite`, function `rewriteObject` unchanged; routes stay.
- Migration/tradeoff: two type renames.
- Owners: D0114, D0115, D0116, D0117, D0118, D0119, D0120, D0121, ROUTES.

**F19 · 1/5 · optional clarity · Internal names surface through exported declarations' expansions and return types**
- Where: `InternalVertexResolutionContext` is unexported (`src/core/index.ts:37-44`) yet returned by exported `TreeVertexRecord.getResolutionContext()` and `ResolvedTreeStore.getResolutionContextOf()` and referenced by exported `TreeVertexMetadata` (`src/core/ResolvedTree.ts:20-30, 54-61, 214-219`); `KernelInspection`/`DriverInspection` appear in `TreeDagExecutionInspection` expansions (`src/core/CoreInspection.ts:28, 75, 78`); `DagSource` appears inside `DagOptions` and is one word from `DagDiscoverySource` (`lib/DagTraversalInstanceConfig.ts:26-38, 82-86`); `VisitResult` appears in `DagVisitor` expansions (`src/core/graph/types.ts:18-23`, `lib/DagTraversalVisitor.ts:35`).
- Verified: consumers cannot annotate a variable holding the store's resolution context without `ReturnType<…>`.
- Proposal: export `MutableVertexResolutionContext` for the advanced store, declare `TreeDagExecutionInspection` as one flat type, rename `DagSource` to `DagSourceSelection`, and let `DagVisitor` spell its result union like `TreeVisitor` does.
- Migration/tradeoff: additive exports and internal renames; no consumer break.
- Owners: D0049, D0042, D0043, D0044, D0045, D0047, D0005, D0007, D0184, D0220, D0022, D0028, D0029, D0030, D0012, D0013, D0055, D0056, D0062, D0084, D0086, D0135, D0169, D0178, D0179, D0186, D0222, D0231, D0245, D0274, D0294, D0295, D0298, D0300, D0302, D0303, D0321, D0017, D0083, D0195.

**F20 · 1/5 · optional clarity · Tree events discriminate on `phase` while DAG and walking events discriminate on `kind`**
- Where: `src/core/TraversalRunner.ts:5-14` (`phase`), `lib/DagTraversalVisitor.ts:59-64` (`kind`), `GraphWalkEvent.ts:12-33` (`kind`), `src/core/TraversalExecution.ts:12-20` (`SelectedTraversalEvent` tries `kind` then `phase`), `src/core/TraversalRunnerIterableConfig.ts:3-13` (`EmissionKind` is identity for tree phases).
- Verified: for trees the emitted kind and the callback phase are the same value, so `kind` would carry the same literals. The semantic distinction between pre-work callbacks and post-commit DAG observations lives in the literal values and docs, not in the field name.
- Plausible misuse: a generic consumer over `SyncTraversalExecution<Phase, Event>` branches on `'kind' in event`; not harmful, just awkward.
- Proposal: `kind` on tree events too, keeping the phase literals as values. Tradeoff: this touches every tree consumer and the family vocabulary table deliberately lists `phase` for trees; reasonable to decline.
- Owners: D0074, D0229, D0269, D0071, D0076, D0069, D0070, D0075.

## Deliberate retains, vocabulary, and scope limits

Cross-family distinctions I checked and recommend keeping as they are: separate source protocols (`TreeSource`, `DagDiscoverySource`, `GraphWalkSource`) with family-specific found/omitted/missing results; callback phases versus committed `workCompleted`/`subgraphCompleted` observation kinds; `DELETE_TREE_SUBTREE` versus `DELETE_DAG_VERTEX_CASCADE`; exclusive `DEFER_WORK_COMPLETION`; `workCompletion`, `discovery`, `rootWorkDependencies`, `revisit`, `strategy`, `commandCommitMode` as real configurable policies behind generic names; nominal tickets versus copyable `DagDeferredWork` records; `summary()`/`inspect()`/`inspectMilestones()` as three observational layers; iterator `return()` pause versus walker `close()`; `removeVertexDeclaration` versus cascade deletion; `getRefId()` versus `getVertexId()`; walking `from`/`to`/`outgoingIndex` versus DAG `slotIndex`; `MaterializedDagInput` envelope versus walking sources that are real protocols.

Items covered by the prior review that I judged weaker than my twenty and did not re-report: standalone `Vertex.clone()` sharing hints, sorter-as-transformer, doc paragraphs the API rejects, readonly hint inputs, hydration-specific target exports, null rewrite output ambiguity, dual composite classifiers, `defineDag` naming, `settle` call shape, `assembleComposite(saveToMap)`, `noRoot`/`noSelf`, builder suffixes, object adapter names, the root-key constant, static utility aliases.

Scope limits: I executed nothing; runtime facts rely on source reading, existing tests, and the controller's probe outputs in the 2026-10-31 audit folder. Line numbers refer to `src/`, with dist locations taken from the census when the source file was not opened (D0014, D0147 through D0159, D0249 through D0265, D0122 through D0146 were reviewed from the census declarations plus the implementation files listed in the findings). I did not re-verify ESM/CJS identity, packaging routes beyond the census ROUTES block, examples beyond grep, or docs beyond the four named guides plus `migration-api-clarity.md`. Severity is impact-based judgment; no finding was probed for frequency in real hosts.

## Owner coverage appendix

Disposition key: retain (name and distinction justified), change (linked finding proposes a rename or redesign), support (internal reachable type, not a supported import), guard (never-field rejection record).

- D0001 AsyncTreeSource: retain; async twin of D0067 with identical verbs and tagged results; `hint` vs `vertexHint` spelling (F16).
- D0002 AsyncTreeVisitor: retain; promise-tolerant twin of D0079; phase-first generics (F16).
- D0003 ChildHintSorter: retain type; stem differs from option key (F13).
- D0004 AsyncChildHintSorter: retain; same as D0003 (F13).
- D0005 KernelInspection: support; layering name in D0008 expansions, kebab `kind` (F09, F19).
- D0006 InspectionFilters: retain; members mirror `emitEvents`/`visitorPhases`; field named `executionOptions` is tolerable.
- D0007 DriverInspection: support; intermediate layer alias (F19).
- D0008 TreeDagExecutionInspection: retain as the documented concrete inspection; F09, F11.
- D0009 TreeDagInspectionOperation: retain; public callback names; `sortChildrenHints` literal (F13).
- D0010 MutableRef: retain explicit editing capability; alias collision (F12).
- D0011 VertexHandle: retain canonical handle; drop alias (F12).
- D0012 OwnerToken: support; runner-local diagnostic identity, `kind: 'root'` is an owner kind.
- D0013 VisitPhase: support; tree/DAG union default for inspection, excludes walking by design.
- D0014 DagDiscoveryCycleError: retain class; payload name (F05).
- D0015 DagTraversalStallDiagnostics: change `id`/mutability (F08); `dependencyCycleComponents` correct (F05).
- D0016 DagMilestone: retain; vocabulary anchor (F08, F14).
- D0017 DiagnosticId: support; NoInfer helper (F16).
- D0018 DagTraversalStallError: retain; diagnostics shape (F08).
- D0019 DagWaitEdge: retain direction and reasons; `structuralChild` vs `child` (F14).
- D0020 ExecutionInspection: retain family-neutral base; concrete kinds casing (F09).
- D0021 VertexRef (internal): change (F12).
- D0022 VisitResult: support; visible in DagVisitor expansion (F16, F19).
- D0023 StructuralChildEdge: retain; handle-typed edge.
- D0024 ChildSlot: change omission encoding (F04).
- D0025 HintVertexId: retain; wrapper model for F04.
- D0026 ResolvedGraphVertex: retain record; Omit-based hover leak (F12), slots (F04).
- D0027 ResolvedVisitStage: retain stages; casing contrast (F09).
- D0028 InternalStructuralChildEdge: support; internal twin of D0023.
- D0029 InternalChildSlot: support; source of F04 encoding.
- D0030 InternalResolvedGraphVertex: support; behind D0026 (F12).
- D0031 VisitorRecord: retain normalized record.
- D0032 VertexId: retain `unknown` alias.
- D0033 MaybePromise: retain.
- D0034 MutationCommand: retain; deletion parameter selects family.
- D0035 MutationCommands: retain.
- D0036 MutationCommandBuilder: retain; `value` request distinct from object `patch`.
- D0037 TreeMutationCommandBinder: retain tree-only binder.
- D0038 TreeMutationCommandBinderFactory: retain.
- D0039 MutationRequest: retain; `patch?: never` guards.
- D0040 ResolvedGraphView: change unknown-handle behavior (F06); hover leak (F12).
- D0041 OriginalGraphView: retain Pick; inherits F06.
- D0042 TreeVertexMetadata: support; references unexported context (F19).
- D0043 TreeVertexRecordContent: support; `children` are structural refs.
- D0044 TreeVertexRecord: retain advanced class; return type (F19).
- D0045 ResolvedTreeMap: support.
- D0046 GetPathToOptions: retain shared options; negative flags covered by prior review.
- D0047 ResolvedTreeStore: retain advanced store; `asReadOnly` (F17), throw (F06), context (F19).
- D0048 VertexResolutionContext: retain frozen facet.
- D0049 InternalVertexResolutionContext: support; exported members return it (F19).
- D0050 ResolvedTreeVertexTypes: retain.
- D0051 ResolvedTreeView: retain; `getPathTo` throw vs null siblings (F06).
- D0052 DagDiscoverySource: retain protocol; confusable internal `DagSource` (F19).
- D0053 AsyncDagDiscoverySource: retain.
- D0054 DagChildResolutionContext: retain; parallels D0063.
- D0055 RequiredGraphVertexIdentity: support.
- D0056 GraphDependencies: support; `dependsOn*` anchor (F14).
- D0057 DagVertexFound: retain.
- D0058 DagVertexOmitted: retain result; its vocabulary is overloaded by the policy key (F03).
- D0059 PrerequisiteMissing: retain lookup-only tag.
- D0060 DagVertexResolution: retain.
- D0061 DagPrerequisiteResolution: retain.
- D0062 TreeMetadataRestrictions: guard.
- D0063 TreeChildResolutionContext: retain; generic names (F16).
- D0064 TreeVertexFound: retain with guards.
- D0065 TreeVertexOmitted: retain with guards.
- D0066 TreeVertexResolution: retain.
- D0067 TreeSource: retain; alias vs interface and parameter spelling (F16).
- D0068 TraversalExecutionState: retain; default inspection parameter that sessions fail to specialize (F11).
- D0069 SyncTraversalExecution: retain; discriminant note (F20).
- D0070 AsyncTraversalExecution: retain (F20).
- D0071 SelectedTraversalEvent: retain; special-cases `kind`/`phase` (F20).
- D0072 TraversalStopReason: retain.
- D0073 TraversalRunnerStatus: retain; `isHalted` umbrella documented.
- D0074 TreeTraversalEvent: retain record; `phase` (F20), infix (F17).
- D0075 TraversalExecutionOptions: retain field-wise patch; contrast for F01.
- D0076 EmissionKind: retain mapping; identity for trees (F20).
- D0077 VisitorPhaseSelection: retain.
- D0078 TreeVisitorRecord: retain; sync-only alias use (F17 minor).
- D0079 TreeVisitor: retain; generic order (F16).
- D0080 VisitorInputs: retain.
- D0081 TraversalVisitorCommandArguments: retain; `newHints` stem (F13).
- D0082 TraversalVisitorCommand: retain.
- D0083 NoInferPhase: support (F16).
- D0084 HintCommand: support.
- D0085 DeletionCommandName: retain.
- D0086 CommonCommand: support.
- D0087 TraversalVisitorResult: retain.
- D0088 TreeVisitorContext: retain; names (F16).
- D0089 TraversalVisitorCommandName: retain enum; stem (F13).
- D0090 CommandCommitMode: retain.
- D0091 TraversalVisitorFunctionOptions: retain; "Function" wording is legacy but unambiguous.
- D0092 VisitorDefinition: retain.
- D0093 VisitorGroupMember: retain; `resolutionStyle?: never` guard.
- D0094 VisitorGroupDefinition: retain.
- D0095 VisitorPhaseInput: retain.
- D0096 VisitorGroupMetadata: retain.
- D0097 VisitorRegistrationMetadata: retain.
- D0098 VertexTypes: retain; `VD`/`VH` names (F16).
- D0099 VertexCloneContent: retain; `$d`/`$c` guards.
- D0100 Vertex: change method stems (F13); clone aliasing covered by prior review.
- D0101 VertexContent: retain.
- D0102 VertexView: change stems (F13).
- D0103 VertexContentInput: retain with guards.
- D0104 materializeDagInputFromRoots: retain; records-returning `children` documented.
- D0105 materializeDagInputFromRootsAsync: retain.
- D0106 materializeDagInputFromRecords: retain.
- D0107 materializeDagInputFromRecordsAsync: retain.
- D0108 DagRecordSelectors: retain; rejected `dependencies` key relates to F14.
- D0109 DagRootSelectors: retain.
- D0110 AsyncCollection: retain alias.
- D0111 AsyncDagRecordSelectors: retain.
- D0112 AsyncDagRootSelectors: retain.
- D0113 MaterializedDagInput: retain envelope; key naming (F17).
- D0114 ObjectRewriteContext: retain (F18).
- D0115 ObjectRewriteInput: retain (F18).
- D0116 ObjectRewriteCallback: retain (F18).
- D0117 RewriteObjectResult: change prefix (F18).
- D0118 RewriteObjectOptions: change prefix (F18); `traversableTree?: never` guard.
- D0119 RootValueConverter: retain.
- D0120 rewriteObject: retain (F18).
- D0121 rewriteObjectAs: retain.
- D0122 __TRAVERSABLE_OBJECT_TREE_DEFAULT_ROOT_KEY__: retain; constant name covered by prior review.
- D0123 createRootPropertyMapper (no key): retain.
- D0124 createRootPropertyMapper (typed key): retain.
- D0125 createRootPropertyMapper (optional key): retain.
- D0126 getChildrenOfPropertyDefault: retain; enumerates properties (F13 note).
- D0127 ObjectAssemblyCache: retain protocol.
- D0128 ObjectMutationOptions: retain; predicate vs flag names differ by role.
- D0129 ObjectMutationRequest: retain; `patch` vs `value` guards.
- D0130 ObjectPropertyPatch: retain.
- D0131 ObjectMutationCommands: retain; boolean argument covered by prior review.
- D0132 ObjectMutationBinder: retain.
- D0133 ObjectMutationBinderFactory: retain.
- D0134 createObjectMutationBinder: retain.
- D0135 PropertyMetadata: support.
- D0136 ObjectCurrentVertexTypes: retain.
- D0137 ObjectTreeVertexTypes: retain.
- D0138 ObjectCompositeClassification: retain.
- D0139 TraversableObject: retain.
- D0140 TraversableObjectProp: retain.
- D0141 TraversableObjectPropKey: retain.
- D0142 ObjectTreeBaseOptions: retain; adapter names covered by prior review.
- D0143 ObjectTreePropertyAdapters: retain.
- D0144 ObjectTreeOptions: retain.
- D0145 ObjectChildHookResult: retain; `useDefault` plus tree results.
- D0146 ObjectTreeSource: retain; statics covered by prior review.
- D0147 AsyncBreadthFirstTreeTraversal: retain; `icfgInput` (F16).
- D0148 BreadthFirstTreeTraversal: retain (F16).
- D0149 AsyncBreadthFirstTreeOptionsPatch: retain; key stem (F13).
- D0150 AsyncBreadthFirstTreeOptions: retain.
- D0151 AsyncBreadthFirstTraversalVisitors: retain; infix (F17).
- D0152 AsyncBreadthFirstTreeRunner: retain; no `isTraversalLeaf` (F17).
- D0153 BreadthFirstTreeOptionsPatch: retain (F13).
- D0154 BreadthFirstTreeOptions: retain.
- D0155 BreadthFirstPhase: retain.
- D0156 BreadthFirstTreeRunner: retain (F17).
- D0157 BreadthFirstTraversalVisitors: retain (F17).
- D0158 traverseTreeBreadthFirst: retain.
- D0159 traverseTreeBreadthFirstAsync: retain.
- D0160 AsyncDagTraversal: retain; `order` params (F16), policy key (F03).
- D0161 DagWorkTicket: retain nominal ticket.
- D0162 DagWorkBoundary: retain.
- D0163 DagSettlementReceipt: retain.
- D0164 DagCoordinationControl: change: export and specialize (F11).
- D0165 DagWorkSession: change inspect typing (F11).
- D0166 AsyncDagWorkSession: change (F11).
- D0167 createDagWorkSession: retain.
- D0168 createAsyncDagWorkSession: retain.
- D0169 NominalDagWorkTicket: support.
- D0170 composeDag: retain; accepts any fragment (F15).
- D0171 defineDagFragment: retain; validating define covered by prior review.
- D0172 instantiateDagFragment: retain (F15).
- D0173 DagTraversal: retain; `order` (F16), policy key (F03).
- D0174 defineDag: retain; naming covered by prior review.
- D0175 diffDagDefinitions: retain.
- D0176 filterAsyncDagDataVisitor (guard): retain.
- D0177 filterAsyncDagDataVisitor (boolean): retain.
- D0178 FilteredVisitor: support.
- D0179 AsyncFilteredVisitor: support.
- D0180 filterDagDataVisitor (guard): retain.
- D0181 filterDagDataVisitor (boolean): retain.
- D0182 hasSingleStructuralSink: retain; scope in name.
- D0183 inspectDagMilestones: retain; free-function route of the runner method.
- D0184 AsyncDagSource: support (F19).
- D0185 AsyncDagTraversalVisitors: retain.
- D0186 AsyncDagTraversalOptionsInput: support; carries F03 and F13 keys.
- D0187 AsyncDagOptions: retain (F03).
- D0188 AsyncDagOptionsPatch: retain (F03).
- D0189 AsyncDagTraversalRunner: retain; scheme (F17); `settle` shape covered by prior review.
- D0190 DagDefinitionVertex: retain faithful record (F02 counterpart).
- D0191 DagDefinition: retain (F02 counterpart).
- D0192 DagDefinitionIssue: change payload names (F05).
- D0193 DagDefinitionSlot: retain; wrapper is the model for F04.
- D0194 PrepareDagResult: retain.
- D0195 InferredDagId: support (F16).
- D0196 DagFragment: retain (F15).
- D0197 DagFragmentInstance: change alias (F15).
- D0198 DagCompositionOptions: change key naming (F14).
- D0199 DagFragmentValidationError: retain.
- D0200 DagMilestoneStatus: change literal alignment (F07).
- D0201 WorkTarget: support.
- D0202 CompletionTarget: support.
- D0203 DagBlocker: retain (F07 related).
- D0204 DagMilestoneQueryOptions: retain.
- D0205 DagExplanation: change kinds (F07).
- D0206 DagMilestoneSnapshot: retain.
- D0207 DagMilestoneQueryResult: retain.
- D0208 DagWorkState: retain; casing contrast (F09).
- D0209 DagVertexProgress: retain; `vertexId` anchor (F08).
- D0210 DagSettlementGeneration: retain.
- D0211 DagSummary: retain; `vertices` Map (F02 note).
- D0212 DagDeferredWork: retain.
- D0213 DagSettlementOutcome: retain; guards.
- D0214 DagRevisionResult: retain.
- D0215 DagDefinitionChangeAspect: change literals (F14).
- D0216 DagDefinitionVertexChange: retain (F14).
- D0217 DagDefinitionDiff: retain.
- D0218 DagRevisionOperation: retain; `removeVertexDeclaration` asymmetry is deliberate.
- D0219 DagSchedulingOptions: change `omittedWorkDependencies` (F03).
- D0220 DagSource: support (F19).
- D0221 DagTraversalVisitors: retain.
- D0222 DagTraversalOptionsInput: support (F03, F13).
- D0223 DagOptions: retain (F03, F17 keys).
- D0224 DagOptionsPatch: retain (F03).
- D0225 DagVisitorPhase: retain enum; infix (F17).
- D0226 DagTraversalRunner: retain; scheme (F17); model for F11.
- D0227 DagVisitor: retain; generic order (F16).
- D0228 AsyncDagVisitor: retain (F16).
- D0229 DagEvent: retain; `kind` (F20).
- D0230 DagVisitorContext: retain.
- D0231 OwnedOptions: guard (F03 key as guard).
- D0232 PreparedDagRunnerOptions: retain.
- D0233 PreparedAsyncDagRunnerOptions: retain.
- D0234 DagWorkSessionOptions: retain.
- D0235 AsyncDagWorkSessionOptions: retain.
- D0236 PreparedDag: change `vertices` naming (F02).
- D0237 PreparedDagVertex: change (F02).
- D0238 PrepareDagInput: retain (F03 key).
- D0239 PrepareAsyncDagInput: retain (F03 key).
- D0240 prepareDag: retain.
- D0241 prepareDagAsync (sync-source overload): retain.
- D0242 prepareDagAsync (async-source overload): retain.
- D0243 PrepareDagOptions: retain; guards (F03 key).
- D0244 prepareDagDefinition: retain.
- D0245 RevisionDomain: support (F16).
- D0246 reviseDag: retain.
- D0247 traverseDag: retain.
- D0248 traverseDagAsync: retain.
- D0249 AsyncDepthFirstTreeTraversal: retain; `icfgInput` (F16).
- D0250 DepthFirstTreeTraversal: retain (F16).
- D0251 ChildIndexSelection: retain; inclusive `through`.
- D0252 AsyncDepthFirstTraversalVisitors: retain (F17).
- D0253 AsyncDepthFirstTreeOptionsPatch: retain (F13 key).
- D0254 AsyncDepthFirstTreeOptions: retain.
- D0255 AsyncDepthFirstTreeRunner: retain; DFS-only `isTraversalLeaf` (F17).
- D0256 DepthFirstFrameStage: support; kebab diagnostics (F09).
- D0257 InOrderOptions: retain.
- D0258 InOrderOptionsPatch: retain; field-wise contrast for F01.
- D0259 DepthFirstTreeOptionsPatch: retain (F13 key).
- D0260 DepthFirstTreeOptions: retain.
- D0261 DepthFirstPhase: retain.
- D0262 DepthFirstTreeRunner: retain (F17).
- D0263 DepthFirstTraversalVisitors: retain (F17).
- D0264 traverseTreeDepthFirst: retain.
- D0265 traverseTreeDepthFirstAsync: retain.
- D0266 AsyncGraphWalk: retain; limits patch (F01).
- D0267 AsyncGraphWalkRunner: retain.
- D0268 GraphWalk: retain (F01).
- D0269 GraphWalkEvent: change edge `source` (F10); `kind` (F20).
- D0270 GraphWalkEdge: retain.
- D0271 GraphWalkEventFor: retain.
- D0272 GraphWalkPathEvent: retain.
- D0273 GraphWalkOperation: retain.
- D0274 UndefinedPatch: support (F01 context).
- D0275 GraphWalkStrategy: retain; casing contrast (F09).
- D0276 GraphWalkRevisitPolicy: retain.
- D0277 GraphWalkLimits: change patch semantics (F01).
- D0278 GraphWalkRevisitOptions: retain (F01).
- D0279 GraphWalkRouteContext: retain.
- D0280 GraphWalkExpandContext: retain.
- D0281 GraphWalkFollowContext: retain; `source` vertex (F10).
- D0282 GraphWalkExpansionPredicate: retain.
- D0283 AsyncGraphWalkExpansionPredicate: retain.
- D0284 GraphWalkEdgePredicate: retain.
- D0285 AsyncGraphWalkEdgePredicate: retain.
- D0286 GraphWalkFields: support; `source` option (F10, F17).
- D0287 AsyncGraphWalkFields: support (F10).
- D0288 GraphWalkOptions: retain (F01, F10).
- D0289 AsyncGraphWalkOptions: retain.
- D0290 GraphWalkOptionsPatch: change (F01).
- D0291 AsyncGraphWalkOptionsPatch: change (F01).
- D0292 GraphWalkPhase: retain; lowercase values double as event kinds (F09 note).
- D0293 GraphWalkRunner: retain.
- D0294 ResolverTarget: support; export suggested by prior review.
- D0295 InlineOrCachedTarget: support.
- D0296 GraphWalkVertex: retain.
- D0297 GraphWalkTarget: retain.
- D0298 LinkTo: support.
- D0299 GraphWalkLink: retain.
- D0300 SourceProtocol: support.
- D0301 GraphWalkSource: retain.
- D0302 AsyncIterableResult: support.
- D0303 AsyncSourceProtocol: support.
- D0304 AsyncGraphWalkSource: retain.
- D0305 GraphWalkVertexResult: retain; `Result` vs tree/DAG `Resolution` is minor.
- D0306 GraphWalkVisitor: retain (F16).
- D0307 AsyncGraphWalkVisitor: retain.
- D0308 GraphWalkVisitorResult: retain.
- D0309 GraphWalkVisitorContext: retain.
- D0310 GraphWalkInspection: retain; `'graph-walk'` (F09).
- D0311 GraphWalkOutcome: retain.
- D0312 GraphWalkSummary: retain.
- D0313 GraphWalkCounts: retain.
- D0314 walkGraph: retain.
- D0315 walkGraphAsync: retain.
- D0316 AsyncGraphWalkRecordSelectors: retain; `roots` as data property is minor.
- D0317 materializeWalkSourceFromRecords: retain.
- D0318 materializeWalkSourceFromRecordsAsync: retain.
- D0319 GraphWalkCatalogLink: retain.
- D0320 GraphWalkRecordSelectors: retain.
- D0321 RelationSelection: support (F14).
- D0322 materializeWalkSourceFromDagDefinition: retain (F14).
- D0323 GraphWalkDagRelation: retain (F14).
- ROUTES: retain nine entry points, namespaces, and denied deep paths; route-level items are the `VertexRef` alias at the core route (F12) and the `objectRewrite`/`rewrite-object` naming (F18).
