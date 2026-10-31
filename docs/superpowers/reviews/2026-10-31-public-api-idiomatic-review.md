# Complete client API review — 2026-10-31

Reviewed baseline `8f20c2f43cbf7722025b2fb5682072f8e4952c1b` with **Claude Fable xhigh and Astra xhigh in parallel**. Fable’s successful CLI result identifies `claude-fable-5-1`; Astra was explicitly dispatched as `gpt-6-astra` with `xhigh`. Both reviewers completed their own surface review before consolidation.

The final selection contains **20 independent findings: five 3/5, twelve 2/5, three 1/5**. No finding warranted 4/5 or 5/5. Two are contract contradictions; the remainder are API design, typing or optional vocabulary improvements. These ratings describe practical impact, not reviewer vote counts. Recommendations are proposals, not implemented API. No source behavior was changed.

Coverage includes **all 324 owner groups / 4,242 inventory records**: nine runtime entry points plus package metadata, 538 exported binding occurrences, 323 reachable declarations, 1,071 inherited/mapped members, 924 declared/nested member occurrences, four statics and 1,354 literal/generic/parameter occurrences. Both authored owner ledgers were checked against the full inventory; controller expansion assigns every item to exactly one owner. This proves coverage accounting; semantic evidence comes from the specific notes, complete-surface reads, current source/tests and focused probes.

See [Fable review](2026-10-31-public-api-audit/fable-review.md), [Astra review](2026-10-31-public-api-audit/astra-review.md), [Fable owner notes](2026-10-31-public-api-audit/fable-owner-notes.json), [Astra owner notes](2026-10-31-public-api-audit/astra-owner-notes.json), and [selected finding data](2026-10-31-public-api-audit/selected-findings.json). Their local F/A finding IDs differ from the consolidated R IDs below. Some retained candidates have lower controller ratings; some stylistic candidates were excluded in favor of more consequential distinctions.

Source, current guides and public contracts remain unchanged across all 460 recorded input hashes. A fresh build and regenerated census succeeded and matched the earlier inventory. Public runtime/type probes passed, including independent reruns of Astra’s probes and new checks of Fable-only findings. One new probe initially forgot to enable walking edge emission; its corrected rerun passed, and the failure is retained. The first network-restricted Fable process was stopped after connection retries before any model response; the network-enabled process completed successfully. Neither issue is a package defect. The full test suite was not rerun for this read-only review.

## R01 — 3/5 — Standalone Vertex.clone() breaks the observation clone contract

**contract defect.** Evidence: [src/core/Vertex.ts:56](../../../src/core/Vertex.ts#L56). Closest counterpart: VertexView.clone() and actual runner observation facets.

Vertex is structurally assignable to VertexView, whose clone promises an independent editable hint collection. Standalone Vertex.clone() reuses the original hint array; runner facets correctly copy it. A function receiving VertexView pushes into view.clone().getChildrenHints() and unexpectedly changes a standalone input.

**Recommendation:** Make clone() copy the hint collection. If sharing is needed, expose cloneSharingHints() explicitly; keep data and individual hint payload identities shallow. O(number of hints) copying; intentional shared-array clients change behavior. This finding concerns standalone substitution, not a mutable runner-handle leak.

Reviewer mapping: Astra A01; Fable considered in owner appendix; not ranked.

## R02 — 3/5 — Walking limits patches silently replace existing budgets

**design improvement.** Evidence: [src/traversals/graph-walk/lib/normalizeWalkOptions.ts:190](../../../src/traversals/graph-walk/lib/normalizeWalkOptions.ts#L190). Closest counterpart: GraphWalkOptionsPatch versus field-wise inOrder and execution-selector patches.

configure({ limits }) replaces the entire prior limits record. Adding maxDepth can discard maxAdmittedTargets and maxCandidateReadAttempts; once mode accepts that configuration. A host tunes depth and unintentionally removes its remote-source read/admission budgets. The public probe observes one admitted vertex before tuning and three afterward.

**Recommendation:** Preserve the documented replacement policy but make it explicit through replaceLimits or a replaceLimits() operation. If choosing field-wise merging instead, specify explicit per-bound clearing and keep atomic validation. The explicit replacement name is a mechanical API migration. Field-wise merging would be an additional behavior change and requires migrating callers that intentionally clear bounds.

Reviewer mapping: Astra retain current documented behavior; Fable F01.

## R03 — 3/5 — sortChildrenHints actually transforms expansion membership

**design improvement.** Evidence: [src/core/ChildHintSorter.ts:3](../../../src/core/ChildHintSorter.ts#L3). Closest counterpart: ChildHintSorter versus REWRITE_CHILD_HINTS.

The callback result becomes the new expansion list without a permutation check. It can remove, duplicate or invent hints, not only sort them. An apparently ordering-only customization silently substitutes a different discovered child; the probe replaces a with replacement.

**Recommendation:** Use transformChildHints / ChildHintTransformer and the async counterpart, including inspection operation vocabulary. Standardize childHints in related accessor names during this migration. Breaking option/type renames preserve current capability. A comparator-only sorter is a separate possible restriction and must not be imposed silently.

Reviewer mapping: Astra A02; Fable F13 discusses naming stem; transformer behavior considered separately.

## R04 — 3/5 — Current reference confuses rejected forms with supported policy

**documentation contract defect.** Evidence: [docs/reference.md:559](../../../docs/reference.md#L559). Closest counterpart: Source result tags and configurable object options versus callback observations.

The prerequisite paragraph advertises undefined and { vertexContent: null } normalization, which runtime rejects. The rewrite paragraph at line 1162 advertises isComposite/getKeyPath as options, although they are bound context observations. A client copies an advertised adapter return or sets isComposite and receives TypeError; TypeScript also contradicts the guide.

**Recommendation:** Document tagged missing/omitted results and supported isArray/isObject options. Identify isComposite and getKeyPath as callback/binder observations. Keep the existing strict runtime. Repair the guide and migrate integrations written against the stale prose; no compatibility restoration or runtime change is needed.

Reviewer mapping: Astra A03; Fable considered in owner appendix; not ranked.

## R05 — 3/5 — omittedWorkDependencies means an absent list, not an omitted vertex

**design improvement.** Evidence: [src/core/scheduling/GraphScheduling.ts:908](../../../src/core/scheduling/GraphScheduling.ts#L908). Closest counterpart: DagVertexOmitted, omittedIds, omission slots and replaceOmissions.

This policy applies when a found vertex omits its dependsOnWork declaration. Explicit lists, including [], override it. It does not change deliberate vertex omission or W/C satisfaction. A host mistakes none for a policy about omitted prerequisites and leaves live vertices with unintentionally independent work.

**Recommendation:** Rename the key to dependsOnWorkDefault: none | discoveryParentWork across configuration, patches and preparation inputs. Mechanical breaking key rename; preserve explicit-list precedence, synthetic-entry behavior and acknowledged omission semantics. Severity reflects potential scheduling mistakes, not a current scheduler defect.

Reviewer mapping: Astra A06; Fable F03.

## R06 — 2/5 — PreparedDag.vertices hides its lossy projection

**design improvement.** Evidence: [src/traversals/dag-traversal/lib/PreparedDag.ts:59](../../../src/traversals/dag-traversal/lib/PreparedDag.ts#L59). Closest counterpart: PreparedDag.definition.vertices and DagSummary.vertices.

PreparedDag.vertices contains live-vertex descriptions with live children only. Omission slots, omittedIds and ordered entry information belong to definition. A host persists the convenient vertices projection as revision topology and loses omitted prerequisite identities or root-slot order.

**Recommendation:** Rename the projection to liveVertexSummaries, or remove it in favor of a named summarization helper. Keep definition as the faithful reconstruction contract. Mechanical property rename. Existing documentation already warns against round trips, so this is rated 2/5 rather than Fable’s 3/5.

Reviewer mapping: Astra retain distinct projection semantics; Fable F02.

## R07 — 2/5 — isTraversalLeaf measures expansion policy, not resolved children

**design improvement.** Evidence: [src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:224](../../../src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts#L224). Closest counterpart: VertexView.hasNoChildHints() and ResolvedTreeView.getChildrenOf().

The predicate is skipped expansion OR no hints. A root with all hints omitted has no resolved children yet returns false; a root skipped after its first child retains that child yet returns true. Async uses the same rule. A post-traversal leaf collector misses structural leaves and includes retained internal vertices.

**Recommendation:** Remove the convenience or split it into isChildExpansionSkipped and the existing hint/structural queries. If retaining the exact boolean, name it hasNoChildHintsOrSkippedExpansion. Callers must choose which predicate they intended. A new isResolvedLeaf would additionally need an explicit policy for incomplete discovery.

Reviewer mapping: Astra A04; Fable related surface asymmetry in F17; behavior not ranked.

## R08 — 2/5 — Work-session creation and wrapping share the same verb

**design improvement.** Evidence: [src/traversals/dag-traversal/coordinateDag.ts:128](../../../src/traversals/dag-traversal/coordinateDag.ts#L128). Closest counterpart: createDagWorkSession(runner) versus preparedDag.createWorkSession().

Free factories wrap an existing runner. Two wrappers share progress but issue mutually foreign tickets. Prepared-DAG factories allocate independent runner progress. A coordinator creates two wrappers expecting isolated executions; one wrapper’s settlement changes the other’s progress.

**Recommendation:** Use bindDagWorkSession / bindAsyncDagWorkSession for existing-runner wrappers; retain createWorkSession for independent creation. Rename only; preserve shared progress, session-local tickets, single-owner execution and duplicate-settlement behavior.

Reviewer mapping: Astra A05; Fable not ranked.

## R09 — 2/5 — Rewrite output collapses deleted roots and null documents

**design improvement.** Evidence: [src/tools/rewrite-object/rewriteObject.ts:297](../../../src/tools/rewrite-object/rewriteObject.ts#L297). Closest counterpart: outputAtReturn versus FINISHED-only getOutput(), and root presence.

A deleted root and a retained root whose value is null both become null before conversion. The existing time distinction between the two output APIs does not recover presence. A document host treats null as deletion and cannot distinguish an intentionally null document without inspecting runner topology.

**Recommendation:** Expose getOutputResult(): { kind: present; value: Out } | { kind: absent }, plus a corresponding captured result or explicit presence in converter context. An additive route can preserve current getters. Specify whether absence invokes conversion, and retain completion gating and existing conversion behavior.

Reviewer mapping: Astra A11; Fable considered in owner appendix; not ranked.

## R10 — 2/5 — Cycle payload vertexIds names two different kinds of evidence

**design improvement.** Evidence: [src/traversals/dag-traversal/lib/DagDefinition.ts:46](../../../src/traversals/dag-traversal/lib/DagDefinition.ts#L46). Closest counterpart: discoveryCycle/DagDiscoveryCycleError witnesses versus structuralCycle SCC membership.

Discovery cycles expose an ordered closed witness; structural cycles expose component membership. The shared vertexIds field does not identify that difference. A formatter joins consecutive IDs with arrows for every issue and invents edges for an SCC.

**Recommendation:** Use cycleWitnessVertexIds for ordered witnesses and componentVertexIds for SCC evidence. Keep dependencyCycleComponents, whose name is already accurate. Breaking diagnostic-field migration; preserve actual ordering, repeated closing identity and arbitrary ID identity.

Reviewer mapping: Astra A08; Fable F05.

## R11 — 2/5 — Omission identity has two incompatible presence encodings

**design improvement.** Evidence: [src/core/graph/types.ts:160](../../../src/core/graph/types.ts#L160). Closest counterpart: Source/resolved omission vertexId versus DagDefinitionSlot.identity.

Source and resolved omissions distinguish anonymous versus known identity by own-property presence; definitions use identity: { vertexId } | null. A real ID may be undefined. A converter testing slot.vertexId !== undefined turns a known-undefined omission into an anonymous one and changes prerequisite identity.

**Recommendation:** Use the explicit identity wrapper consistently for omission-bearing records. Keep satisfiesDependencies: true as the separate discovery acknowledgment. Breaking record migration with an extra wrapper; convert existing records using own-property checks, not truthiness. Do not promise arbitrary IDs survive JSON serialization.

Reviewer mapping: Astra A14; Fable F04.

## R12 — 2/5 — Stall dependency records use id/unmet instead of canonical DAG names

**design improvement.** Evidence: [src/core/errors/DagTraversalStallError.ts:20](../../../src/core/errors/DagTraversalStallError.ts#L20). Closest counterpart: DagMilestone.vertexId, DagVertexProgress and DagDeferredWork.

Stall diagnostics expose dependencies: { id, unmet }[] while neighboring DAG records use vertexId and explicit prerequisite names. Diagnostic arrays are detached copies and are currently mutable. A formatter reuses canonical vertexId access and silently omits the stalled vertex from these records.

**Recommendation:** Use vertexId and unmetPrerequisiteIds in dependency records. Consider readonly owned diagnostic collections as a separate type-design choice; detached mutation is not a current engine-state leak. Breaking formatter-field migration. Preserve waiter/prerequisite direction and the distinction between W/C constraint edges and summary ID lists.

Reviewer mapping: Astra retain legacy diagnostic shape; Fable F08.

## R13 — 2/5 — Work-session inspection erases its known DAG type

**type-surface improvement.** Evidence: [src/traversals/dag-traversal/coordinateDag.ts:36](../../../src/traversals/dag-traversal/coordinateDag.ts#L36). Closest counterpart: DagTraversalRunner.inspect() and TreeDagExecutionInspection.

The session base extends unspecialized TraversalExecutionState although inspect delegates to a DAG runner. session.inspect().chains fails typechecking despite being present. A coordinator retains a second runner reference or casts inspection just to read pending chains or requests.

**Recommendation:** Specialize session control to TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>>. An exported DagWorkSessionControl capability could also name the shared sync/async control surface. Runtime behavior is unchanged; structural mocks need richer records. Keep general execution defaults family-neutral for walkers.

Reviewer mapping: Astra A09; Fable F11.

## R14 — 2/5 — Public walking link types discard hydration policy

**type-surface improvement.** Evidence: [src/traversals/graph-walk/GraphWalkSource.ts:26](../../../src/traversals/graph-walk/GraphWalkSource.ts#L26). Closest counterpart: GraphWalkTarget/GraphWalkLink versus resolver and inlineOrCached source branches.

The broad exported target/link unions cannot express a particular hydration mode, although source unions enforce it. A helper returning GraphWalkLink[] cannot plug into an inlineOrCached source merely because its implementation emits inline targets. An adapter author widens a helper to the public alias and then needs manual Extract/indexed-access types or assertions to reuse it.

**Recommendation:** Parameterize public target/link types by hydration mode with the broad union as default, or export explicit ResolverGraphWalkTarget and InlineOrCachedGraphWalkTarget/link aliases. Additive typing improves composition without weakening invalid-mode rejection or first-admitted-resolution rules; additional aliases cost surface area.

Reviewer mapping: Astra A10; Fable considered in owner appendix; not ranked.

## R15 — 2/5 — Readonly discovery hints are rejected at input boundaries

**type-surface improvement.** Evidence: [src/core/Vertex.ts:3](../../../src/core/Vertex.ts#L3). Closest counterpart: Readonly dependency/definition inputs and observation collections.

VertexContentInput.$childHints and REWRITE_CHILD_HINTS.newHints require mutable arrays. Reusable as-const descriptions fail assignment. A source author copies or asserts an immutable hint tuple solely to satisfy the API’s input type.

**Recommendation:** Accept readonly hints in source/command inputs; copy into owned mutable storage at the relevant boundary and keep editable standalone outputs mutable. Input types broaden, but constructor aliasing must be specified explicitly. Existing standalone construction currently retains the supplied array; this proposal does not claim otherwise.

Reviewer mapping: Astra A07; Fable considered in owner appendix; not ranked.

## R16 — 2/5 — Walking source names both the adapter and an edge endpoint

**design improvement.** Evidence: [src/traversals/graph-walk/GraphWalkEvent.ts:24](../../../src/traversals/graph-walk/GraphWalkEvent.ts#L24). Closest counterpart: GraphWalkOptions.source versus edge-event and follow-context source.

The option is a GraphWalkSource adapter; edge event/context source is a GraphWalkVertex. Current reference explicitly warns about the distinction. An adapter integration shadows its source variable in a callback or looks for outgoing on event.source.

**Recommendation:** Use fromVertex on edge events and follow context, matching edge.from. Keep source for the adapter and retain the tagged target resolution wrapper. Mechanical callback-field migration. A symmetric name must not erase the target’s found/omitted distinction.

Reviewer mapping: Astra retain current endpoint vocabulary; Fable F10.

## R17 — 2/5 — Throwing graph/tree queries look like nullable sibling queries

**design improvement.** Evidence: [src/core/ResolvedGraphView.ts:31](../../../src/core/ResolvedGraphView.ts#L31). Closest counterpart: getChildrenOf/getParentsOf/getVisitStageOf versus getVertexId/getPathsTo and tree getPathTo.

Unknown handles yield null from several queries but throw Error from identity/path queries. A public probe verifies both behaviors on the same foreign handle. After a cascade deletion, a host tolerates absent children then calls getPathsTo on the stale handle and unexpectedly throws.

**Recommendation:** Make strict lookups explicit, for example requireVertexId and requirePathsTo/requirePathTo, or offer clearly named nonthrowing variants with tagged identity presence. Rename-only strict methods preserve behavior. Never use null/undefined as an absent-ID sentinel: both are valid IDs. A new tagged tryGetVertexId avoids that collision.

Reviewer mapping: Astra retain existing query conventions; Fable F06.

## R18 — 1/5 — Milestone explanations use unknown where endpoint status uses unresolved

**optional clarity.** Evidence: [src/traversals/dag-traversal/lib/DagInspection.ts:22](../../../src/traversals/dag-traversal/lib/DagInspection.ts#L22). Closest counterpart: DagExplanation.kind versus DagMilestoneStatus.kind within explanation/blocker results.

An absent captured identity is unknown in a top-level explanation and unresolved in an endpoint status. A known explanation may correctly represent an omitted identity with null progress. A diagnostic UI maintains two labels for the same absent-identity fact or mistakenly treats known as synonymous with live.

**Recommendation:** Choose one absent-identity literal across those layers; optionally expose explicit live/omitted identity status in known results. Preserve the valid distinction between known and live. Literal/union migration for a modest clarity gain. Current nullable progress is typed correctly; this is not a correctness defect and is rated below Fable’s 2/5.

Reviewer mapping: Astra retain current diagnostic vocabulary; Fable F07.

## R19 — 1/5 — Fragment instantiation suggests an invariant its result does not enforce

**optional clarity.** Evidence: [src/traversals/dag-traversal/lib/DagFragment.ts:14](../../../src/traversals/dag-traversal/lib/DagFragment.ts#L14). Closest counterpart: DagFragmentInstance versus DagFragment and nominal DagWorkTicket.

DagFragmentInstance is exactly DagFragment. instantiateDagFragment maps IDs, and composition accepts a fragment without that mapping step; it establishes no distinct instance capability. A caller assumes an instance is automatically namespaced or provenance-checked, then composes colliding IDs.

**Recommendation:** Use mapDagFragmentIds returning DagFragment and remove the redundant instance alias. Keep mapping explicit; do not add nominal restrictions unless composition actually needs them. Mechanical renames preserve existing behavior. mapId already exposes the real policy, limiting the practical impact.

Reviewer mapping: Astra A12; Fable F15.

## R20 — 1/5 — VertexRef has different editing authority in public and internal declarations

**optional clarity.** Evidence: [src/core/index.ts:106](../../../src/core/index.ts#L106). Closest counterpart: Public VertexHandle-as-VertexRef alias versus internal MutableRef<Vertex> alias.

Supported VertexRef imports are safe handles. A reachable internal alias with the same short name is mutable, so declaration navigation shows identical names with different authority. A reader assumes setValue is available on an observed ref after following a mutable internal declaration.

**Recommendation:** Use VertexHandle as the sole public name and InternalVertexRef or MutableVertexRef internally. Simplify public mapped declarations where doing so improves hovers. Type import migration only. There is no mutable runner-handle leak, so compatibility value may outweigh this optional cleanup.

Reviewer mapping: Astra A20; Fable F12.

## Distinctions to retain

- Tree discovery, DAG discovery and general walking have different source protocols. A generic walking adapter must remain explicit about hydration and link targets.
- Structural edges, W dependencies and C dependencies differ. Callback phases, committed observations, graph visit stages and runner lifecycle status describe different boundaries.
- Generic policy names are justified where actual surface choices exist: workCompletion, discovery, rootWorkDependencies, revisit, strategy, selectors and commandCommitMode. Family-typed inspect/summary/configure operations do not need cosmetic prefixes.
- Eager preparation freezes topology intentionally; object keep reconstructs processed children intentionally. Neither warrants adding a new implicit behavior.
- Safe observed handles/facets, editable standalone state, live views, original structure views, and detached milestone snapshots retain distinct authority and timing.
- Ticket provenance remains local and nominal; copied deferred-work records are not claims, leases or durable capabilities. Business priority, retries, outcomes and persistence remain host-owned.
- Keep family-specific deletion commands, ordered entry slots, shallow caller data/ID identity, non-cascading revision declaration removal and original milestone constraint direction.
- Iterator return pauses; walker close disposes. Those are distinct operations.

## Consolidation decisions and limits

The final list combines independently supported concerns from both reviews. Deliberately excluded: casing-only changes, broad family renaming, blanket builder suffixes, generic-parameter cosmetic cleanup, static utility route cleanup, and output-prefix word order. The full reviewer reports preserve those lower-impact candidates. Readonly diagnostic collections, alternative composite classification, atomic-record settlement, object adapter names and defineDag naming remain possible follow-ups rather than extra ranked findings.

The historical root-key "public export" finding and blanket mapper/enumerator static/free duplication finding were rejected: those names are reachable declaration support or static-only routes, not the claimed supported free exports. The mutation binder alone has static and free routes. Reachable internal helper types and never-field rejection guards were reviewed without promoting them to supported extension points.

For unknown-handle queries, the consolidated recommendation preserves strict behavior through explicit names; it does not adopt null/undefined identity sentinels, which would be unsound for valid arbitrary IDs. For walking limits, explicit replacement naming preserves the documented replacement invariant rather than silently changing merge semantics. For omission encoding, no arbitrary-ID JSON serialization guarantee is implied.

No name can rule out every misunderstanding. This review identifies concrete nearby contracts and plausible mistakes; it does not claim every proposed rename is worth a breaking release, exhaustive runtime-combination execution, or the absence of further defects. No implementation, commit, publication or external write was performed.
