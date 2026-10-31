from pathlib import Path
import json
p=Path(__file__).resolve().parent
rows=[]
def add(score,title,kind,source,line,counterpart,behavior,misuse,proposal,tradeoff,astra,fable):
 rows.append(dict(id=f'R{len(rows)+1:02}',score=score,title=title,classification=kind,source=source,line=line,counterpart=counterpart,behavior=behavior,misuse=misuse,proposal=proposal,tradeoff=tradeoff,astra=astra,fable=fable))
add(3,'Standalone Vertex.clone() breaks the observation clone contract','contract defect','src/core/Vertex.ts',56,
 'VertexView.clone() and actual runner observation facets',
 'Vertex is structurally assignable to VertexView, whose clone promises an independent editable hint collection. Standalone Vertex.clone() reuses the original hint array; runner facets correctly copy it.',
 'A function receiving VertexView pushes into view.clone().getChildrenHints() and unexpectedly changes a standalone input.',
 'Make clone() copy the hint collection. If sharing is needed, expose cloneSharingHints() explicitly; keep data and individual hint payload identities shallow.',
 'O(number of hints) copying; intentional shared-array clients change behavior. This finding concerns standalone substitution, not a mutable runner-handle leak.','A01','considered in owner appendix; not ranked')
add(3,'Walking limits patches silently replace existing budgets','design improvement','src/traversals/graph-walk/lib/normalizeWalkOptions.ts',190,
 'GraphWalkOptionsPatch versus field-wise inOrder and execution-selector patches',
 'configure({ limits }) replaces the entire prior limits record. Adding maxDepth can discard maxAdmittedTargets and maxCandidateReadAttempts; once mode accepts that configuration.',
 'A host tunes depth and unintentionally removes its remote-source read/admission budgets. The public probe observes one admitted vertex before tuning and three afterward.',
 'Preserve the documented replacement policy but make it explicit through replaceLimits or a replaceLimits() operation. If choosing field-wise merging instead, specify explicit per-bound clearing and keep atomic validation.',
 'The explicit replacement name is a mechanical API migration. Field-wise merging would be an additional behavior change and requires migrating callers that intentionally clear bounds.','retain current documented behavior','F01')
add(3,'sortChildrenHints actually transforms expansion membership','design improvement','src/core/ChildHintSorter.ts',3,
 'ChildHintSorter versus REWRITE_CHILD_HINTS',
 'The callback result becomes the new expansion list without a permutation check. It can remove, duplicate or invent hints, not only sort them.',
 'An apparently ordering-only customization silently substitutes a different discovered child; the probe replaces a with replacement.',
 'Use transformChildHints / ChildHintTransformer and the async counterpart, including inspection operation vocabulary. Standardize childHints in related accessor names during this migration.',
 'Breaking option/type renames preserve current capability. A comparator-only sorter is a separate possible restriction and must not be imposed silently.','A02','F13 discusses naming stem; transformer behavior considered separately')
add(3,'Current reference confuses rejected forms with supported policy','documentation contract defect','docs/reference.md',559,
 'Source result tags and configurable object options versus callback observations',
 'The prerequisite paragraph advertises undefined and { vertexContent: null } normalization, which runtime rejects. The rewrite paragraph at line 1162 advertises isComposite/getKeyPath as options, although they are bound context observations.',
 'A client copies an advertised adapter return or sets isComposite and receives TypeError; TypeScript also contradicts the guide.',
 'Document tagged missing/omitted results and supported isArray/isObject options. Identify isComposite and getKeyPath as callback/binder observations. Keep the existing strict runtime.',
 'Repair the guide and migrate integrations written against the stale prose; no compatibility restoration or runtime change is needed.','A03','considered in owner appendix; not ranked')
add(3,'omittedWorkDependencies means an absent list, not an omitted vertex','design improvement','src/core/scheduling/GraphScheduling.ts',908,
 'DagVertexOmitted, omittedIds, omission slots and replaceOmissions',
 'This policy applies when a found vertex omits its dependsOnWork declaration. Explicit lists, including [], override it. It does not change deliberate vertex omission or W/C satisfaction.',
 'A host mistakes none for a policy about omitted prerequisites and leaves live vertices with unintentionally independent work.',
 'Rename the key to dependsOnWorkDefault: none | discoveryParentWork across configuration, patches and preparation inputs.',
 'Mechanical breaking key rename; preserve explicit-list precedence, synthetic-entry behavior and acknowledged omission semantics. Severity reflects potential scheduling mistakes, not a current scheduler defect.','A06','F03')
add(2,'PreparedDag.vertices hides its lossy projection','design improvement','src/traversals/dag-traversal/lib/PreparedDag.ts',59,
 'PreparedDag.definition.vertices and DagSummary.vertices',
 'PreparedDag.vertices contains live-vertex descriptions with live children only. Omission slots, omittedIds and ordered entry information belong to definition.',
 'A host persists the convenient vertices projection as revision topology and loses omitted prerequisite identities or root-slot order.',
 'Rename the projection to liveVertexSummaries, or remove it in favor of a named summarization helper. Keep definition as the faithful reconstruction contract.',
 'Mechanical property rename. Existing documentation already warns against round trips, so this is rated 2/5 rather than Fable’s 3/5.','retain distinct projection semantics','F02')
add(2,'isTraversalLeaf measures expansion policy, not resolved children','design improvement','src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts',224,
 'VertexView.hasNoChildHints() and ResolvedTreeView.getChildrenOf()',
 'The predicate is skipped expansion OR no hints. A root with all hints omitted has no resolved children yet returns false; a root skipped after its first child retains that child yet returns true. Async uses the same rule.',
 'A post-traversal leaf collector misses structural leaves and includes retained internal vertices.',
 'Remove the convenience or split it into isChildExpansionSkipped and the existing hint/structural queries. If retaining the exact boolean, name it hasNoChildHintsOrSkippedExpansion.',
 'Callers must choose which predicate they intended. A new isResolvedLeaf would additionally need an explicit policy for incomplete discovery.','A04','related surface asymmetry in F17; behavior not ranked')
add(2,'Work-session creation and wrapping share the same verb','design improvement','src/traversals/dag-traversal/coordinateDag.ts',128,
 'createDagWorkSession(runner) versus preparedDag.createWorkSession()',
 'Free factories wrap an existing runner. Two wrappers share progress but issue mutually foreign tickets. Prepared-DAG factories allocate independent runner progress.',
 'A coordinator creates two wrappers expecting isolated executions; one wrapper’s settlement changes the other’s progress.',
 'Use bindDagWorkSession / bindAsyncDagWorkSession for existing-runner wrappers; retain createWorkSession for independent creation.',
 'Rename only; preserve shared progress, session-local tickets, single-owner execution and duplicate-settlement behavior.','A05','not ranked')
add(2,'Rewrite output collapses deleted roots and null documents','design improvement','src/tools/rewrite-object/rewriteObject.ts',297,
 'outputAtReturn versus FINISHED-only getOutput(), and root presence',
 'A deleted root and a retained root whose value is null both become null before conversion. The existing time distinction between the two output APIs does not recover presence.',
 'A document host treats null as deletion and cannot distinguish an intentionally null document without inspecting runner topology.',
 'Expose getOutputResult(): { kind: present; value: Out } | { kind: absent }, plus a corresponding captured result or explicit presence in converter context.',
 'An additive route can preserve current getters. Specify whether absence invokes conversion, and retain completion gating and existing conversion behavior.','A11','considered in owner appendix; not ranked')
add(2,'Cycle payload vertexIds names two different kinds of evidence','design improvement','src/traversals/dag-traversal/lib/DagDefinition.ts',46,
 'discoveryCycle/DagDiscoveryCycleError witnesses versus structuralCycle SCC membership',
 'Discovery cycles expose an ordered closed witness; structural cycles expose component membership. The shared vertexIds field does not identify that difference.',
 'A formatter joins consecutive IDs with arrows for every issue and invents edges for an SCC.',
 'Use cycleWitnessVertexIds for ordered witnesses and componentVertexIds for SCC evidence. Keep dependencyCycleComponents, whose name is already accurate.',
 'Breaking diagnostic-field migration; preserve actual ordering, repeated closing identity and arbitrary ID identity.','A08','F05')
add(2,'Omission identity has two incompatible presence encodings','design improvement','src/core/graph/types.ts',160,
 'Source/resolved omission vertexId versus DagDefinitionSlot.identity',
 'Source and resolved omissions distinguish anonymous versus known identity by own-property presence; definitions use identity: { vertexId } | null. A real ID may be undefined.',
 'A converter testing slot.vertexId !== undefined turns a known-undefined omission into an anonymous one and changes prerequisite identity.',
 'Use the explicit identity wrapper consistently for omission-bearing records. Keep satisfiesDependencies: true as the separate discovery acknowledgment.',
 'Breaking record migration with an extra wrapper; convert existing records using own-property checks, not truthiness. Do not promise arbitrary IDs survive JSON serialization.','A14','F04')
add(2,'Stall dependency records use id/unmet instead of canonical DAG names','design improvement','src/core/errors/DagTraversalStallError.ts',20,
 'DagMilestone.vertexId, DagVertexProgress and DagDeferredWork',
 'Stall diagnostics expose dependencies: { id, unmet }[] while neighboring DAG records use vertexId and explicit prerequisite names. Diagnostic arrays are detached copies and are currently mutable.',
 'A formatter reuses canonical vertexId access and silently omits the stalled vertex from these records.',
 'Use vertexId and unmetPrerequisiteIds in dependency records. Consider readonly owned diagnostic collections as a separate type-design choice; detached mutation is not a current engine-state leak.',
 'Breaking formatter-field migration. Preserve waiter/prerequisite direction and the distinction between W/C constraint edges and summary ID lists.','retain legacy diagnostic shape','F08')
add(2,'Work-session inspection erases its known DAG type','type-surface improvement','src/traversals/dag-traversal/coordinateDag.ts',36,
 'DagTraversalRunner.inspect() and TreeDagExecutionInspection',
 'The session base extends unspecialized TraversalExecutionState although inspect delegates to a DAG runner. session.inspect().chains fails typechecking despite being present.',
 'A coordinator retains a second runner reference or casts inspection just to read pending chains or requests.',
 'Specialize session control to TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>>. An exported DagWorkSessionControl capability could also name the shared sync/async control surface.',
 'Runtime behavior is unchanged; structural mocks need richer records. Keep general execution defaults family-neutral for walkers.','A09','F11')
add(2,'Public walking link types discard hydration policy','type-surface improvement','src/traversals/graph-walk/GraphWalkSource.ts',26,
 'GraphWalkTarget/GraphWalkLink versus resolver and inlineOrCached source branches',
 'The broad exported target/link unions cannot express a particular hydration mode, although source unions enforce it. A helper returning GraphWalkLink[] cannot plug into an inlineOrCached source merely because its implementation emits inline targets.',
 'An adapter author widens a helper to the public alias and then needs manual Extract/indexed-access types or assertions to reuse it.',
 'Parameterize public target/link types by hydration mode with the broad union as default, or export explicit ResolverGraphWalkTarget and InlineOrCachedGraphWalkTarget/link aliases.',
 'Additive typing improves composition without weakening invalid-mode rejection or first-admitted-resolution rules; additional aliases cost surface area.','A10','considered in owner appendix; not ranked')
add(2,'Readonly discovery hints are rejected at input boundaries','type-surface improvement','src/core/Vertex.ts',3,
 'Readonly dependency/definition inputs and observation collections',
 'VertexContentInput.$childHints and REWRITE_CHILD_HINTS.newHints require mutable arrays. Reusable as-const descriptions fail assignment.',
 'A source author copies or asserts an immutable hint tuple solely to satisfy the API’s input type.',
 'Accept readonly hints in source/command inputs; copy into owned mutable storage at the relevant boundary and keep editable standalone outputs mutable.',
 'Input types broaden, but constructor aliasing must be specified explicitly. Existing standalone construction currently retains the supplied array; this proposal does not claim otherwise.','A07','considered in owner appendix; not ranked')
add(2,'Walking source names both the adapter and an edge endpoint','design improvement','src/traversals/graph-walk/GraphWalkEvent.ts',24,
 'GraphWalkOptions.source versus edge-event and follow-context source',
 'The option is a GraphWalkSource adapter; edge event/context source is a GraphWalkVertex. Current reference explicitly warns about the distinction.',
 'An adapter integration shadows its source variable in a callback or looks for outgoing on event.source.',
 'Use fromVertex on edge events and follow context, matching edge.from. Keep source for the adapter and retain the tagged target resolution wrapper.',
 'Mechanical callback-field migration. A symmetric name must not erase the target’s found/omitted distinction.','retain current endpoint vocabulary','F10')
add(2,'Throwing graph/tree queries look like nullable sibling queries','design improvement','src/core/ResolvedGraphView.ts',31,
 'getChildrenOf/getParentsOf/getVisitStageOf versus getVertexId/getPathsTo and tree getPathTo',
 'Unknown handles yield null from several queries but throw Error from identity/path queries. A public probe verifies both behaviors on the same foreign handle.',
 'After a cascade deletion, a host tolerates absent children then calls getPathsTo on the stale handle and unexpectedly throws.',
 'Make strict lookups explicit, for example requireVertexId and requirePathsTo/requirePathTo, or offer clearly named nonthrowing variants with tagged identity presence.',
 'Rename-only strict methods preserve behavior. Never use null/undefined as an absent-ID sentinel: both are valid IDs. A new tagged tryGetVertexId avoids that collision.','retain existing query conventions','F06')
add(1,'Milestone explanations use unknown where endpoint status uses unresolved','optional clarity','src/traversals/dag-traversal/lib/DagInspection.ts',22,
 'DagExplanation.kind versus DagMilestoneStatus.kind within explanation/blocker results',
 'An absent captured identity is unknown in a top-level explanation and unresolved in an endpoint status. A known explanation may correctly represent an omitted identity with null progress.',
 'A diagnostic UI maintains two labels for the same absent-identity fact or mistakenly treats known as synonymous with live.',
 'Choose one absent-identity literal across those layers; optionally expose explicit live/omitted identity status in known results. Preserve the valid distinction between known and live.',
 'Literal/union migration for a modest clarity gain. Current nullable progress is typed correctly; this is not a correctness defect and is rated below Fable’s 2/5.','retain current diagnostic vocabulary','F07')
add(1,'Fragment instantiation suggests an invariant its result does not enforce','optional clarity','src/traversals/dag-traversal/lib/DagFragment.ts',14,
 'DagFragmentInstance versus DagFragment and nominal DagWorkTicket',
 'DagFragmentInstance is exactly DagFragment. instantiateDagFragment maps IDs, and composition accepts a fragment without that mapping step; it establishes no distinct instance capability.',
 'A caller assumes an instance is automatically namespaced or provenance-checked, then composes colliding IDs.',
 'Use mapDagFragmentIds returning DagFragment and remove the redundant instance alias. Keep mapping explicit; do not add nominal restrictions unless composition actually needs them.',
 'Mechanical renames preserve existing behavior. mapId already exposes the real policy, limiting the practical impact.','A12','F15')
add(1,'VertexRef has different editing authority in public and internal declarations','optional clarity','src/core/index.ts',106,
 'Public VertexHandle-as-VertexRef alias versus internal MutableRef<Vertex> alias',
 'Supported VertexRef imports are safe handles. A reachable internal alias with the same short name is mutable, so declaration navigation shows identical names with different authority.',
 'A reader assumes setValue is available on an observed ref after following a mutable internal declaration.',
 'Use VertexHandle as the sole public name and InternalVertexRef or MutableVertexRef internally. Simplify public mapped declarations where doing so improves hovers.',
 'Type import migration only. There is no mutable runner-handle leak, so compatibility value may outweigh this optional cleanup.','A20','F12')
assert len(rows)==20
assert [r['score'] for r in rows]==sorted([r['score'] for r in rows],reverse=True)
astra_notes=json.loads((p/'astra-owner-notes.json').read_text())
fable_notes=json.loads((p/'fable-owner-notes.json').read_text())
import re
for r in rows:
 a=set(re.findall(r'\bA\d{2}\b',r['astra'])); f=set(re.findall(r'\bF\d{2}\b',r['fable']))
 r['ownerIds']=sorted(o for o in astra_notes if a.intersection(astra_notes[o]['findings']) or f.intersection(fable_notes[o]['findings']))
 assert r['ownerIds'],r['id']
(p/'selected-findings.json').write_text(json.dumps(rows,indent=2)+'\n')
header='''# Complete client API review — 2026-10-31

Reviewed baseline `8f20c2f43cbf7722025b2fb5682072f8e4952c1b` with **Claude Fable xhigh and Astra xhigh in parallel**. Fable’s successful CLI result identifies `claude-fable-5-1`; Astra was explicitly dispatched as `gpt-6-astra` with `xhigh`. Both reviewers completed their own surface review before consolidation.

The final selection contains **20 independent findings: five 3/5, twelve 2/5, three 1/5**. No finding warranted 4/5 or 5/5. Two are contract contradictions; the remainder are API design, typing or optional vocabulary improvements. These ratings describe practical impact, not reviewer vote counts. Recommendations are proposals, not implemented API. No source behavior was changed.

Coverage includes **all 324 owner groups / 4,242 inventory records**: nine runtime entry points plus package metadata, 538 exported binding occurrences, 323 reachable declarations, 1,071 inherited/mapped members, 924 declared/nested member occurrences, four statics and 1,354 literal/generic/parameter occurrences. Both authored owner ledgers were checked against the full inventory; controller expansion assigns every item to exactly one owner. This proves coverage accounting; semantic evidence comes from the specific notes, complete-surface reads, current source/tests and focused probes.

See [Fable review](2026-10-31-public-api-audit/fable-review.md), [Astra review](2026-10-31-public-api-audit/astra-review.md), [Fable owner notes](2026-10-31-public-api-audit/fable-owner-notes.json), [Astra owner notes](2026-10-31-public-api-audit/astra-owner-notes.json), and [selected finding data](2026-10-31-public-api-audit/selected-findings.json). Their local F/A finding IDs differ from the consolidated R IDs below. Some retained candidates have lower controller ratings; some stylistic candidates were excluded in favor of more consequential distinctions.

Source, current guides and public contracts remain unchanged across all 460 recorded input hashes. A fresh build and regenerated census succeeded and matched the earlier inventory. Public runtime/type probes passed, including independent reruns of Astra’s probes and new checks of Fable-only findings. One new probe initially forgot to enable walking edge emission; its corrected rerun passed, and the failure is retained. The first network-restricted Fable process was stopped after connection retries before any model response; the network-enabled process completed successfully. Neither issue is a package defect. The full test suite was not rerun for this read-only review.

'''
parts=[header]
for r in rows:
 parts.append(f"## {r['id']} — {r['score']}/5 — {r['title']}\n\n")
 parts.append(f"**{r['classification']}.** Evidence: [{r['source']}:{r['line']}](../../../{r['source']}#L{r['line']}). Closest counterpart: {r['counterpart']}.\n\n")
 parts.append(r['behavior']+' '+r['misuse']+'\n\n')
 parts.append('**Recommendation:** '+r['proposal']+' '+r['tradeoff']+'\n\n')
 parts.append(f"Reviewer mapping: Astra {r['astra']}; Fable {r['fable']}.\n\n")
parts.append('''## Distinctions to retain

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
''')
(p.parent/'2026-10-31-public-api-idiomatic-review.md').write_text(''.join(parts))
print('Wrote 20-finding consolidated review and structured selection.')
