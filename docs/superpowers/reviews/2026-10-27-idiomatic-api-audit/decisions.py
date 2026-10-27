# Explicit declaration decisions after reading every signature and implementation where semantics matter.
# All indices refer to the immutable fresh census; every occurrence must be assigned, with no fallback.
import json,re
from pathlib import Path
P=Path('/tmp/ctt-idiomatic-review-2026-10-27')
C=json.loads((P/'public-api-census.json').read_text()); E=json.loads((P/'expected-coverage.json').read_text())
D=C['declarations']; decisions={}
def put(indices, disposition, reason, *findings):
 for i in indices if isinstance(indices,list) else [indices]:
  assert i not in decisions,i
  decisions[i]={'id':D[i]['location'],'disposition':disposition,'reason':reason,'findingIds':list(findings)}
def keep(i,reason):put(i,'retain',reason)
def support(i,reason,*f):put(i,'signature-support',reason,*f)
def change(i,reason,*f):put(i,'redesign',reason,*f)
def rename(i,reason,*f):put(i,'rename',reason,*f)
def remove(i,reason,*f):put(i,'remove',reason,*f)
remove(0,'Historical AsyncCoreExecution repeats AsyncTraversalExecution while fixing the detailed tree/DAG inspection and changing generic order; use the capability interface.','F05')
keep(1,'AsyncTreeSource is explicitly tree discovery; resolveRoot/resolveChild distinguish entry lookup from hint resolution; MaybePromise preserves synchronous implementations.')
rename(2,'AsyncTraversalVisitor always receives TreeVisitorContext; use AsyncTreeVisitor, preserving its phase-aware result and input/rewrite types.','F06')
keep([3,4],'ChildHintSorter/AsyncChildHintSorter describe ordering opaque hints, not resolving children or comparing payloads; shared across tree and DAG is real reuse. hints parameter and async boundary are precise.')
keep(5,'InspectionFilters describes effective emission/callback selection; separate Phase/EmittedKind parameters and named fields preserve their independent axes.')
support(6,'DriverInspection composes kernel facts with physical inFlightCallbackCount; implementation layering need not be separately exported. See F07 for inherited public diagnostic fields.','F07')
rename(7,'CoreInspection excludes graph walking and exposes tree/DAG engine details; name TreeDagExecutionInspection and use ExecutionInspection for generic defaults. Its member set is reviewed through KernelInspection plus explicit in-flight/buffer counts.','F05','F07')
support(8,'KernelInspection is signature support, but every nested field is client-visible. Keep owner/ref identities, counts, source/execution modes, frame stages and waits; change order/phase/position/config and pending request vocabulary, and remove legacy group.','F07','F09')
support(9,'CTTAbstractParent is only reachable through deprecated content. Remove this $d/$c support shape with legacy vertex forms.','F09')
change(10,'MutableRef truthfully names mutable indirection, and getValue/setValue/getRefId separate value from reference identity. Remove ambiguous getId forwarding alias; constructor value is caller-owned.','F09')
support(11,'VisitOrder is a private supporting union of callback phases; literals PRE/IN/POST/LEVEL_ORDER and ON_WORK_READY/ON_SUBGRAPH_READY are meaningful, but rename support vocabulary to TreeDagVisitorPhase when diagnostics stop saying order.','F07')
support(12,'OwnerToken is an observational request-owner token; kind root/frame/chain/prerequisite, numeric id and epoch are scoped to engine work ownership and not caller IDs. Retain this diagnostic support shape.')
support(13,'CallbackValues is engine payload typing, not independent API. Its keys become public through pendingRequests.kind; decouple them into descriptive public operation labels instead of leaking MAKE_ROOT/MAKE_VERTEX/HINT_ID.','F07')
keep(14,'DagDiscoveryCycleError and vertexIds identify structural discovery cycle participants; ID generic preserves arbitrary identity and inherited Error semantics remain standard.')
keep(15,'DagTraversalStallDiagnostics distinguishes unmet prerequisites, unknown IDs, SCC components, original wait edges, dependency-blocked IDs and structurally incomplete IDs. dependencies.id/unmet are scoped ID projections; edges retain W/C precision. No renaming of direction is needed.')
keep(16,'DagMilestone combines vertexId with work/subgraphCompletion; the pair is necessary because C includes W plus structural descendants. These are milestone targets, not events.')
support(17,'DiagnosticId prevents inference widening when constructing an error; the conditional tuple is signature machinery, not a caller-visible identity normalization.')
keep(18,'DagTraversalStallError carries diagnostic evidence and standard Error fields. Constructor permits omitted dependencyEdges for handwritten diagnostics; engine-produced diagnostics remain richer.')
keep(19,'DagWaitEdge waiter/prerequisite make direction explicit; reasons distinguish declared W/C waits from ownWork and structuralChild constraints. Keep this vocabulary.')
keep(20,'ExecutionInspection is the genuine cross-family minimum; status/stopReason/pauseRequested, execution and counts are passive observations and kind is extensible.')
keep(21,'VertexRef is the deliberate MutableRef<Vertex<T>> specialization; it denotes reference identity, not a host ID. Both generic and domain alias serve distinct roles.')
support(22,'VisitResult adds void/undefined to phase-gated traversal command results; the private alias avoids repeating support algebra.')
keep(23,'HintVertexId wraps an ID so undefined can mean a valid own vertexId rather than absence of an identity result; getVertexIdFromHint is not vertex resolution.')
rename(24,'ResolvedVertexStatus combines initial-visit and completion scheduling stages across DFS/BFS/DAG, so PRE_VISITING/PRE_VISITED are false family cues and not DagWorkState. Rename to ResolvedVisitStage with explicit initial/completion stage literals.','F08')
keep(25,'StructuralChildEdge parentRef/childRef/hintIndex/hint describes one structural slot, independently from dependency constraints. Index is in discovery hint order.')
keep(26,'ChildSlot is a live resolution-slot union: pending/linked/omitted/deleted/disabled distinguish undiscovered, resolved and terminal absence. Own optional vertexId on omission preserves undefined IDs. Keep the hint and linked childRef roles.')
change(27,'ResolvedGraphVertex is a detached record describing a live reference, payload, discovery depth, original dependencies, incoming structural edges and slots. Retain these names; replace status with visitStage to avoid conflating graph visit stages and DAG work state.','F08')
support(28,'VisitorRecord is the shared list/set record support type: visitor callback, addedIndex and group provenance are useful; remove LegacyVisitorOptions resolutionStyle from it.','F09')
keep(29,'VertexId = unknown intentionally makes no string/serialization assumption. It is a domain alias, not a runtime validator or brand.')
keep(30,'MaybePromise<T> is conventional value-or-PromiseLike support across async APIs; accepting sync implementations is deliberate.')
keep(31,'MutationCommandBuilder builds one mutation command from a typed rewrite request; output payload and RewriteInput are independently configurable, so the generic name is earned.')
rename([32,33],'MutationCommandBinder and BinderFactory are hard-wired to tree visitor arguments despite generic names. Use TreeMutationCommandBinder/TreeMutationCommandBinderFactory; Configuration generic only configures a factory, not callback family.','F06')
keep(34,'MutationRequest describes rewrite/delete intent for a command builder. RewriteInput is generic and object helpers specialize it; delete precedence is a request policy to document, not an immediate mutation method.')
change(35,'MutationCommand is a legitimate shared command subset for data replacement/deletion/noop; its deletion branch needs the explicit cascade policy/name in F03.','F03')
keep(36,'MutationCommands is a bound command-building capability, not an array. makeMutationCommand precisely names the function and RewriteInput permits different request shapes.')
change(37,'OriginalGraphView is a retained live structural view with shallow shared data and distinct retained refs; keep role/name and queries, but remove getVertexById/getIdOf aliases.','F09')
change(38,'ResolvedGraph get/has and ref/ID queries are idiomatic in receiver context; children/parents/paths refer to structural relations. Remove ID getter aliases and replace getStatusOf with getVisitStageOf for F08. Mutable result arrays are detached, not mutable topology.','F08','F09')
keep(39,'TreeVertexMetadata contains resolutionContext, distinct from opaque caller data. Its nullable root context is accurate.')
keep(40,'TreeVertexRecordContent has metadata and structural children, not discovery hints; both fields fit record construction.')
keep(41,'TreeVertexRecord deliberately exposes mutable metadata/children plus push/get/set helpers. getParent returns the context parent; clone copies containers shallowly. Short receiver operations are sufficiently scoped.')
keep(42,'ResolvedTreeMap names exactly a Map of reference handles to mutable tree records; retain its standard Map operations and arbitrary reference keys.')
keep(43,'GetPathToOptions noRoot/noSelf are scoped endpoint exclusions used consistently by tree, graph paths and rewrite key paths; negative booleans are understandable and do not justify a breaking rename.')
change(44,'ResolvedTreeStore is a deliberate editing capability distinct from read-only views. get/set/has/root/context/children/path and source adaptation are explicit; delete recursively removes descendants and needs deleteSubtree. Direct source results should become tagged.','F03','F09')
keep(45,'VertexResolutionContext gives discovery depth, parent vertex/ref, hint index and vertexHint. It is shared by tree/DAG discovery, so Vertex rather than Tree is correct.')
rename(46,'ResolvedTreeTypeParameters still uses the old TypeParameters vocabulary; use ResolvedTreeVertexTypes to match VertexTypes. Its VertexData and VertexHint both contain refs intentionally.','F14')
keep(47,'ResolvedTreeView is a live query capability with shallow detached arrays/contexts; getRoot/has/parent/children/path/context are unambiguous on this receiver. It does not claim deep immutability.')
keep([48,49],'DagDiscoverySource/AsyncDagDiscoverySource identify DAG discovery, not general walking. resolveRoot/resolveChild/resolvePrerequisite and getVertexIdFromHint each name a distinct lookup contract; ID trails T/R.')
keep(50,'DagChildResolutionContext distinguishes current resolvedGraph and retained originalGraphView plus per-child resolutionContext; null denotes retention disabled.')
support(51,'RequiredGraphVertexIdentity is inference support requiring own IDs for a typed domain; unknown IDs allow generated identity. Do not export it as a separate feature.')
support(52,'GraphDependencies supports dependsOnWork and dependsOnSubgraphCompletion; each names the prerequisite milestone, both gate own W. Keep as shared internal type algebra.')
support(53,'MakeVertexResult is an accepted legacy untagged decoder shape, not an independent export. Remove it from public unions/direct outputs with legacy source forms.','F09')
keep(54,'DagVertexFound uses found plus a vertex declaration containing content/ID/dependencies; found vs omitted is explicit and own ID semantics are preserved.')
keep(55,'DagVertexOmitted requires satisfiesDependencies:true, preventing accidental missing-task satisfaction; optional own vertexId preserves known vs anonymous omission.')
keep(56,'PrerequisiteMissing is a precise prerequisite-only negative lookup distinct from intentional omitted satisfaction.')
change(57,'DagVertexResolution is correctly family-specific, but its legacy untagged alternative duplicates found/omitted semantics; retain only tagged results.','F09')
change(58,'DagPrerequisiteResolution correctly adds missing to DAG resolution; remove legacy undefined missing and untagged members so missing and omitted cannot be inferred accidentally.','F09')
support(59,'TreeMetadataRestrictions uses never fields to prohibit graph IDs/dependencies/settlement metadata on tree results; these are deliberate rejection gates, not usable options.')
support(60,'MakeTreeVertexResult is legacy support and a concrete built-in direct output; replace those outputs with tagged TreeVertexResolution and remove this support arm.','F09')
keep(61,'TreeVertexFound declares tagged tree content while rejecting graph metadata at both wrapper levels. The nesting parallels DAG source results.')
keep(62,'TreeChildResolutionContext distinguishes live mutable resolvedTree from retained originalTreeView and per-child resolutionContext. The store mutability is intentional and typed.')
keep(63,'TreeVertexOmitted is intentional absence without DAG satisfaction claims. Keep its kind and explicit graph-metadata prohibition.')
change(64,'TreeVertexResolution correctly scopes the source union to trees; remove the untagged MakeTreeVertexResult compatibility alternative.','F09')
keep(65,'TreeSource is a structural protocol with root and child resolution and input/rewrite vertex types. AsyncTreeSource has a meaningful PromiseLike distinction.')
remove(66,'AbstractTreeSource adds no concrete behavior to TreeSource; remove the redundant runtime extension artifact when simplifying public abstract bases.','F05')
remove(67,'TreeTraversal is a historical abstract registration/factory base, not the common builder abstraction. Concrete builders and structural registration contracts suffice; remove this redundant public runtime base.','F05')
change([68,69,70],'These generic execution capabilities have accurate names and family-safe function properties, but default Inspection=CoreInspection excludes walking. Default to ExecutionInspection and make concrete tree/DAG interfaces explicitly select detailed inspection. EmittedKind should default consistently to EmissionKind<Phase>.','F05')
keep(71,'TraversalStopReason precisely distinguishes prepared/paused/awaitingSettlement/finished/failed. null while initial/running is coherent; it is not an outcome or a work state.')
keep(72,'TraversalRunnerStatus names broad lifecycle states. HALTED intentionally includes more than user pause; getStopReason disambiguates. Keep isHalted rather than falsely calling it isPaused.')
remove(73,'TreeTraversalIterable is an empty historical runtime base never needed to obtain the generator returned by iterateEvents; standard Iterable or runner capability suffices.','F05')
remove(74,'TreeTraversalRunner is a redundant abstract runtime base duplicating SyncTraversalExecution; retain concrete family runner interfaces and capability contracts instead.','F05')
keep(75,'TreeTraversalEvent phase and root flags describe tree visitation; mutable ref vs vertex value roles remain explicit. It is intentionally not DagEvent or walking kind.')
keep(76,'TraversalExecutionOptions correctly separates visitorPhases and emitEvents and permits an independent EmittedKind. Keep the generic public policy surface.')
keep(77,'EmissionKind maps callback phases to committed event labels and preserves tree/walking kinds. This is real configurable type support, with precise phase-to-event behavior.')
keep(78,'VisitorPhaseSelection all/include/exclude is explicit mutually exclusive selection; no extra renaming is needed.')
keep(79,'VisitorGroupMetadata identity/explicit/commandCommitMode describe grouping provenance and batching rather than execution concurrency. Symbol identity remains local.')
change(80,'VisitorRegistrationMetadata is descriptive metadata, not a callable visitor. Keep assigned addedIndex/priority/group identity; remove deprecated resolutionStyle.','F09')
rename(81,'TraversalVisitorRecord hard-wires tree callbacks. Use TreeVisitorRecord and keep a genuinely generic VisitorRecord<F> for cross-family registrations.','F06')
rename(82,'TraversalVisitor is tree-only through TreeVisitorContext despite its unqualified name. Use TreeVisitor, retaining phase-aware command restrictions.','F06')
support(83,'VisitorInputs maps phase-record types to accepted definitions; K/F/M are implementation type machinery, not independent public concepts.')
change(84,'Command argument map is a useful discriminated contract; deletion/pruning/state command branches need precise scope names and the deprecated hint alias must go. newData/newHints correctly denote replacement.','F03','F09','F12','F15')
change(85,'TraversalVisitorCommand is a genuinely shared discriminated command type. Keep commandName/commandArguments because their nesting is explicit; refine the command alternatives described in linked findings.','F03','F09','F12','F15')
support(86,'NoInferPhase prevents callback returns from widening an inferred phase; retain this inference helper without a separate export.')
support(87,'HintCommand is a private subset; keep canonical REWRITE_CHILD_HINTS and remove deprecated PRE_ORDER-specific alias.','F09')
support(88,'CommonCommand is a private type subset for phase-safe results. Its algebra is sound; referenced command vocabulary changes in F03/F12/F15.','F03','F12','F15')
change(89,'TraversalVisitorResult is shared tree/DAG command output rather than a tree callback input; retain its generic role and sole DEFER_WORK_COMPLETION gating, while updating affected command alternatives.','F03','F09','F12','F15')
keep(90,'TreeVisitorContext explicitly names the family, phase, phaseVisitIndex/previousPhaseVertexRef, registration and live/original views. visitorChainState is per visit; command producer must match it (F15).')
support(91,'TraversalVisitorCommandName is actually directly exported; this decision is corrected below.')
# Explicit enum decision replacing temporary call above.
decisions[91]={'id':D[91]['location'],'disposition':'redesign','reason':'The shared enum is appropriate for genuinely shared commands; NOOP, PAUSE_TRAVERSAL, REWRITE_CHILD_HINTS, REWRITE_VERTEX_DATA and DEFER_WORK_COMPLETION are truthful. Make deletion/pruning/state scope explicit and remove the deprecated hint alias.','findingIds':['F03','F09','F12','F15']}
support(92,'TraversalVisitorFunctionResolutionStyle is not an importable supported binding, but metadata/list records expose its enum type. Remove it with legacy resolutionStyle decoding.','F09')
keep(93,'CommandCommitMode afterEachVisitor/afterGroup correctly describes when commands apply, independently from async concurrency.')
keep(94,'TraversalVisitorFunctionOptions priority and commandCommitMode are registration policy. Although verbose, the name is domain-scoped and not a competing execution/concurrency policy.')
change(95,'VisitorDefinition callback-or-record shape is idiomatic and generic over F. Remove ignored caller addedIndex input; assignment metadata belongs only on queried records.','F09')
keep(96,'VisitorGroupMember explicitly forbids per-member batching/legacy style so the group owns that policy; priority still orders callbacks within a group. Never fields are useful rejection gates.')
keep(97,'VisitorGroupDefinition visitors plus commandCommitMode are precisely group-owned policy; explicit groups preserve declared group order.')
keep(98,'VisitorPhaseInput is the canonical callback/flat definitions/ordered groups union; naming scopes the alternatives to one phase.')
keep(99,'VertexTypes bundles opaque VertexData and VertexHint without host workflow semantics. PascalCase keys are type roles; generic Data/Hint spellings are optional readability cleanup, not a runtime redesign.')
support(100,'LegacyContentInput enforces unmixed $d/$c spelling but is obsolete compatibility support; remove with F09.','F09')
change([101,102],'VertexContentInput/VertexCloneContent are accurate complete-input versus clone-patch roles. Remove legacy content union arms; retain canonical fields and Vertex inputs.','F09')
change(103,'Vertex owns opaque $data/$childHints, getData/getChildrenHints and shallow clone; hasNoChildHints accurately avoids claiming a resolved leaf. Remove $d/$c getters and legacy constructor/clone forms.','F09')
keep(104,'VertexContent canonical $data/$childHints clearly separates payload and opaque discovery hints, including from TreeVertexRecord.children references.')
support(105,'LegacyVertexContent is reachable compatibility support only; remove $d/$c spelling instead of presenting two equal content contracts.','F09')
support(106,'CanonicalContentInput enforces canonical content and forbids mixing legacy fields; after legacy removal this can collapse to VertexContent. No independent public export.')
support(107,'LegacyVisitorOptions is reachable through list records/metadata; remove resolutionStyle and reuse canonical registration options.','F09')
rename([108,109,110,111],'These materializers return an options envelope with traversableGraph plus required syntheticRoot metadata, unlike walking materializers which return a source protocol. Rename to materializeDagInputFromRoots/Records (Async suffix retained) with MaterializedDagInput.','F10')
keep(112,'DagRootSelectors children yields nested records, unlike DagRecordSelectors child IDs; Root versus Record makes the domain distinction explicit. Shared id/W/C selectors keep identity opaque.')
keep(113,'AsyncCollection is a conventional Iterable-or-AsyncIterable utility; does not itself mean promised collection. MaybePromise is layered explicitly where accepted.')
keep(114,'AsyncDagRecordSelectors await id and collection selectors; children/dependency selectors return IDs. This is the asynchronous policy counterpart of DagRecordSelectors.')
keep(115,'AsyncDagRootSelectors changes only children to nested records and accepts async iteration/promises; Root accurately distinguishes it from Record.')
rename(116,'MaterializedDagSource is a source configuration envelope with syntheticRoot:true, not DagDiscoverySource. MaterializedDagInput honestly names its role and helps prevent dropping mandatory metadata.','F10')
keep(117,'DagRecordSelectors names id, structural children and explicit W/C prerequisites for catalog records. These policies are configurable, so concise selector field names are warranted.')
change(118,'RewriteFnOptions is actually callback context and falsely narrows all live refs to input-only types. Use ObjectRewriteContext carrying both input and output key/value domains.','F01','F14')
change(119,'RewriteFnPropInput describes a current property, which may already be rewritten by configurable visitors; include input|output domains and name ObjectRewriteInput. assembledComposite remains an optional preassembled output value.','F01','F14')
rename(120,'RewriteFn is specifically an object-property rewrite callback, not generic payload rewriting. Use ObjectRewriteCallback, with truthful current-property/context types from F01.','F01','F14')
keep(121,'RewriteObjectResult outputAtReturn versus getOutput clearly separates captured possibly partial output and final cached output; traversalRunner is the resumable execution capability.')
change(122,'RewriteObjectOptions legitimately configures discovery, assembly, traversal and output conversion while forbidding source replacement. Keep these policies; reflect prior rewrites in callback typing instead of pretending only original input can be observed.','F01')
change(123,'rewriteObject is a descriptive domain helper with unknown output by default and configurable conversion; retain the function name, but repair callback input/context generics.','F01')
change(124,'rewriteObjectAs explicitly asserts caller-selected output without validation; retain this honest escape hatch and apply the same truthful callback model.','F01')
support(125,'getChildrenOfPropertyDefault is reachable through an intentional static utility, not a direct binding. It really enumerates default child property hints, so the getter name is truthful; optional style defaultChildProperties is not required.')
support(126,'getRootPropertyFromInputObjectDefault is reachable through a public static member, but it creates a mapper from a root key rather than getting a property from an input object. Rename exposed static to createRootPropertyMapper.','F13')
change(127,'ObjectMutationPatch is Partial of extensible VertexData, but implementation only reads key/value. Use ObjectPropertyPatch = Partial<Pick<..., key|value>> or provide a real full-payload patch policy; prefer the precise two-field contract.','F02')
change(128,'ObjectMutationCommands provides classification, assembly and command construction; keep these names but constrain makeMutationCommand rewrite to the actual key/value patch.','F02')
change([129,130,131],'ObjectMutationBinder/Factory and createObjectMutationBinder accurately describe configure-bind-build stages for object properties. Retain names and independent in/out domains; fix nested rewrite patch capability.','F02')
keep(132,'ObjectMutationOptions genuinely exposes classification/array/object assembly and caller-owned assembledMap. Callback roles processedChildren/vertexData/visitorArguments/classification are distinct; isCompositeAssertions is optional spelling cleanup to classification.')
keep(133,'ObjectCompositeClassification is a group of predicates already evaluated for one property; isComposite/isArray/isObject are truthful booleans, not runtime assertion functions.')
keep(134,'TraversableObject models recursive array/object composites over caller key/leaf types; ObjectTreeSource itself also accepts scalar input, so this alias should not be generalized to all inputs.')
keep(135,'TraversableObjectProp key/value is an object-property record and its short members are conventional.')
keep(136,'TraversableObjectPropKey includes number for numeric array indices alongside string/symbol; retain rather than replacing it with a narrower string-only key alias.')
keep(137,'ObjectTreeOptions exposes real object discovery policy through children/root mapping and resolveVertexHook; the hook can useDefault/found/omitted and tree metadata restrictions remain explicit.')
keep(138,'ObjectVertexHookResult useDefault/found/omitted distinguishes fallback from omission; it correctly forbids graph metadata and does not imply prerequisite lookup.')
rename(139,'TraversableObjectTTP preserves an opaque obsolete acronym despite VertexTypes. Use ObjectTreeVertexTypes to state the adapter and type-role bundle.','F14')
change(140,'ObjectTreeSource, rootObject and static mutation binder are descriptive; emit canonical tagged resolution outputs and rename the root-mapper factory static. Constructor icfgInput is optional style cleanup to options.','F09','F13')
keep([141,142],'Breadth-first tree builder names distinguish family and async behavior. configure is fluent for future runners; add/set/list/group/createRunner are scoped receiver operations. Parameter order means phase, not strategy (optional cleanup).')
keep([143,144,147,148],'BreadthFirstTreeOptions/Patch pairs correctly require/preserve the tree source and expose sorting, visitors and original structure retention; async alone exposes concurrency. Keep shared field names because contracts agree.')
support(145,'AsyncBreadthFirstTraversalVisitors is phase-indexed normalized callback record support; LEVEL_ORDER is the correct sole phase. Legacy record metadata changes via F09.','F09')
keep([146,150],'BreadthFirstTreeRunner interfaces intentionally expose live graph/tree store/view queries and distinct traversal/source-root tests, plus shared execution. No leaf test is advertised for this family.')
keep(149,'BreadthFirstPhase.LEVEL_ORDER is the conventional visit phase, not a priority or scheduling policy.')
support(151,'BreadthFirstTraversalVisitors maps the single phase to tree visitor records; internal normalized support, not independent export. Referenced tree callback naming changes via F06.','F06','F09')
keep([152,154],'Canonical traverseTreeBreadthFirst helpers execute a single traversal and return its possibly paused runner; Async returns a promise. Name states action and family.')
remove([153,155],'Deprecated positional helper overload duplicates canonical options and creates a separate registration path; remove overload, keeping same named function with options.','F09')
keep(156,'AsyncDagTraversal explicitly supports DAG scheduling from graph/tree discovery, source inference overloads preserve sync source ID inference, registration methods distinguish phase and factory; retain genuine overloads.')
keep(157,'DagWorkBoundary awaitingSettlement/workTickets, paused and finished accurately discriminate the next host boundary; no failed arm because exact failures throw.')
keep(158,'DagSettlementReceipt accepted/alreadyAccepted is an idempotency receipt, not a host business outcome; the name makes this boundary clear.')
support(159,'DagCoordinationControl is private common session capability composition. completeWork/failTraversal distinguish W acceptance from fatal runner failure; summary/inspectMilestones/pause are receiver-scoped. Retain and inherit generic inspection correction.','F05')
keep([160,161],'DagWorkSession/AsyncDagWorkSession name host-controlled W coordination, advance reaches a boundary, and completeWork/failTraversal act on local tickets. Async describes advancement, not asynchronous ticket settlement.')
keep([162,163],'createDagWorkSession/createAsyncDagWorkSession take an existing runner explicitly, so wrapping its state is clear; prepared createWorkSession factories allocate independent runners. Do not rename all factories solely for wrapper allocation.')
support(164,'ticketBrand is inaccessible structural branding support; ownership is actually checked by a private WeakMap. The token is not a public runtime sentinel or serializable ID.')
keep(165,'DagWorkTicket is a local settlement capability with vertexId, not a durable attempt, claim or business result. Keep the opaque brand and name.')
keep(166,'composeDag combines fragment definitions with explicit structural and milestone wires and returns prepared validity. Name is generic within DAG composition because both relation choices are on the surface.')
keep(167,'defineDagFragment defines a validated closed local graph plus named live ports. It is a distinct operation from shape-only defineDag; validation error type and docs make the difference explicit.')
keep(168,'instantiateDagFragment remaps all identities via required mapId while preserving shallow payloads; fragment/mapId/MappedID/Port roles are explicit.')
keep(169,'DagTraversal names the dependency scheduler builder; configure, phase registration and createRunner are consistent with other builders. T/R/ID preserve input/rewrite and identity domains.')
keep(170,'defineDag creates copied/frozen declaration facts without execution validation; prepareDagDefinition performs that next operation. The conventional define/prepare distinction is reasonable.')
keep(171,'diffDagDefinitions clearly compares declarations, not runtime outcomes. BeforeData/AfterData/ID and before/after names support shallow identity-based comparison.')
keep([172,173,176,177],'filter[Async]DagDataVisitor explicitly receives/narrows payload data and adapts to a DAG visitor. Type-guard and boolean overloads have genuine inference roles; no callback timing rename is needed.')
support([174,175],'FilteredVisitor/AsyncFilteredVisitor are private callback support preserving data narrowing, DAG context, phase-gated command results and ID generics.')
keep(178,'hasSingleStructuralSink counts childless resolved vertices and explicitly excludes W/C relations. It is an intentionally structural predicate on a view, not a graph execution validator.')
keep(179,'inspectDagMilestones is passive snapshot capture, matching runner.inspectMilestones; free function enables generic composition and is not a second semantics.')
support(180,'AsyncDagSource is a private source-selection union, not the public source protocol. traversableGraph/tree alternatives reject ambiguous modes and preserve typed ID restrictions.')
support(181,'AsyncDagTraversalVisitors maps actual DAG phases to normalized visitor records; keep as signature support and remove legacy record metadata.','F09')
support(182,'AsyncDagTraversalOptionsInput factors optional scheduling/seed/sorter/visitor/retained-structure/concurrency policy. Not an independent normalized-state export; root policy naming changes through F04.','F04')
change([183,184],'AsyncDagOptions and Patch correctly combine asynchronous discovery and callback policy with source-selection rules; update only the root/default-parent policy fields.','F04')
change(185,'AsyncDagTraversalRunner prepare/run separation, passive milestone snapshot, summary, guarded settle, views and root tests have distinct roles. It needs explicit detailed Inspection after generic default correction; graph visit stage aliases propagate through returned views.','F05','F08','F09')
keep(186,'DagDefinitionVertex has vertexId/data/ordered slots and distinct W/C lists. Plain data here differs meaningfully from runtime Vertex.$data; no uniformity rename needed.')
change(187,'DagDefinition accurately owns ordered declarations and entry. Rename entry.kind forest to roots because shared DAG descendants and parallel slots are legal; retain root/empty and omission identity wrappers.','F11')
keep(188,'DagDefinitionIssue discriminants distinguish structural endpoints, entry/omission validity, reachability, structural cycles and milestone constraints. parent wrapper/null preserves arbitrary undefined ID. Kind milestone scopes its diagnostic payload.')
keep(189,'DagDefinitionSlot vertex versus omitted and nullable identity wrapper preserves ordered omissions and valid undefined IDs; it is deliberately distinct from a live ChildSlot.')
keep(190,'PrepareDagResult valid/invalid has a PreparedDag only after validation; name describes successful artifact and failure contract without implying exceptions are eliminated.')
support(191,'InferredDagId prevents secondary ports/wires from widening the declaration ID domain; signature support only. Name is not an independent caller operation.')
keep(192,'DagFragment combines a closed definition and named ports, sharing payloads but owning topology; Port generic is a meaningful string-name domain.')
keep(193,'DagFragmentInstance is a semantic alias for remapped DagFragment. Structural assignability intentionally allows identity mappings and composition of already-distinct definitions; no opaque runtime instance identity is implied.')
keep(194,'DagCompositionOptions separates structural children wires from dependencies whose prerequisite milestone is explicit. dependent is an ID because its W is always gated; parent/child are structural endpoints. Keep concise relation-scoped fields.')
keep(195,'DagFragmentValidationError extends TypeError for invalid local fragment construction and carries definition issues. Name and fields are distinct from runtime stall errors.')
keep(196,'DagMilestoneStatus is captured endpoint evidence. live includes work and target-specific satisfied; omitted/deleted/unresolved are distinct identity states. C may be unsatisfied after W completes.')
support([197,198],'WorkTarget/CompletionTarget specialize milestone targets for blocker discrimination; preserve exact work/subgraphCompletion literals.')
keep(199,'DagBlocker constraint, unfinishedWork, discoveryOpen and completionPending distinguish original waits from local terminal scheduler facts. waiterStatus/prerequisiteStatus are explicit direction-aware evidence.')
keep(200,'DagMilestoneQueryOptions.transitive is conventional graph reachability policy; default direct queries and captured domain are documented.')
keep(201,'DagExplanation known/unknown/deleted separates identity evidence; satisfied/progress/blockers/discoveryComplete describe captured facts. Omitted known targets can have null progress without being unknown.')
keep(202,'DagMilestoneSnapshot explain/prerequisitesOf/dependentsOf are short meaningful receiver methods over a fixed observational snapshot; target is always an explicit W/C milestone.')
keep(203,'DagMilestoneQueryResult milestones/edges/discoveryComplete distinguishes reached targets, original directional constraints and evidence completeness. No ordered cycle promise is made.')
remove(204,'DEFER_READY is an obsolete sentinel whose name confuses already-ready work with deferring W completion. Keep the sole DEFER_WORK_COMPLETION command.','F09')
keep(205,'DagWorkState pending/ready/visiting/deferred/completed is W-specific and distinct from subgraph completion. visiting counts callback activity, not host agent work.')
keep(206,'DagVertexProgress explicitly separates W work and subgraphComplete, typed exact prerequisite projections, union projection and optional deferred generation. Optional exact W list is compatibility debt but its name is truthful; make required in future typing cleanup, not a separate naming finding.')
keep(207,'DagSettlementGeneration symbol names a local generation guard, not a numeric version or durable revision; arbitrary symbol identity is intentional.')
keep(208,'DagSummary discovery/counts/vertices and named ID projections distinguish ready-or-deferred, deferred W, active visitors, completed W/C and unused seeds. awaitingSettlement records carry atomic guards; overlapping counts are not a host-work partition.')
keep(209,'DagDeferredWork is an atomic vertexId/generation record for live deferred settlement. It differs from the higher-level owned DagWorkTicket and must retain that distinction.')
change(210,'DagSettlementOutcome canonical workCompleted/traversalFailed distinguishes accepted W from fatal traversal failure; remove boolean ok aliases which hide failure scope.','F09')
keep(211,'DagRevisionResult valid dag/changes or invalid issues reports a fresh prepared artifact, not in-place mutation or migrated sessions.')
keep(212,'DagDefinitionChangeAspect data/slots/workDependencies/subgraphCompletionDependencies names the shallow declaration categories, not milestones emitted during execution.')
keep(213,'DagDefinitionVertexChange vertexId/aspects precisely identifies a changed declaration and the changed shallow categories.')
keep(214,'DagDefinitionDiff addedIds/removedIds/changedVertices plus vertexOrderChanged/entryChanged/omissionsChanged are complete shallow comparison facets. vertexOrderChanged intentionally includes additions/removals.')
rename(215,'DagRevisionOperation is an ordered declaration-edit union; rename removeVertex to removeVertexDeclaration to distinguish it from cascading runtime removal, retaining add/replace/entry/omission operations.','F03')
change(216,'DagSchedulingOptions workCompletion/discovery are public policy axes; rootDependencies suppresses only W and implicitParentDependency supplies only omitted W lists. Rename to rootWorkDependencies and omittedWorkDependencies with explicit none/discoveryParentWork policy.','F04')
support(217,'DagSource privately selects exactly one tree/graph source with typed graph IDs; source-mode algebra is not a general graph-walking protocol.')
support(218,'DagTraversalVisitors maps phases to normalized callback records; signature support with legacy resolutionStyle removal.','F09')
support(219,'DagTraversalOptionsInput factors real scheduler/seed/sorter/visitor/retention inputs; update policy field names through F04 without exposing normalized engine options.','F04')
change([220,221],'DagOptions/Patch separate required source construction and source-preserving reconfiguration; retain concise family name and update W/default-parent policy names.','F04')
keep(222,'DagVisitorPhase ON_WORK_READY/ON_SUBGRAPH_READY correctly names precommit callback eligibility. They are distinct from committed event kinds and work completion state.')
change(223,'DagTraversalRunner prepare/inspectMilestones/summary/guarded settle/live and original views are orthogonal. Keep names; explicitly preserve detailed inspection after F05 and propagate view status/alias changes.','F05','F08','F09')
change([224,225],'DagVisitor/AsyncDagVisitor explicitly name the family and use T/R/phase/ID roles; retain command phase gating and drop only the DEFER_READY return sentinel.','F09')
keep(226,'DagEvent kind workCompleted/subgraphCompleted, vertexId and root flags explicitly report committed milestones, not work dispatch requests. Keep the event/visitor distinction.')
keep(227,'DagVisitorContext resolvedGraph/originalGraphView, per-phase indices, roots, registration and visitorChainState parallel trees without pretending tree topology. Retain context name and fields.')
support(228,'OwnedOptions uses never fields to reject source/topology/execution injection into prepared factories; these are constraints, not offered settings. Rename forbidden root/default-parent keys alongside F04.','F04')
keep([229,230],'PreparedDagRunnerOptions/PreparedAsyncDagRunnerOptions expose only policy not owned by topology; async concurrency is genuinely additional. Keep names and source-prohibition typing.')
keep(231,'DagWorkSessionOptions exposes accepted completedWork facts and forbids visitors/retention/completion mode because the session owns external settlement; precise role-specific options.')
keep(232,'AsyncDagWorkSessionOptions adds concurrency consistently with async runner construction, even though prepared no-visitor sessions usually have little callback work. It does not claim host concurrency control.')
keep(233,'PreparedDag definition versus convenience vertices and createRunner/createWorkSession sync/async factories have distinct roles. Factories allocate independent state; asynchronous factories genuinely await preparation.')
keep(234,'PreparedDagVertex is a live-child convenience projection with children IDs instead of faithful omission slots. data/vertexId/W/C list names align with declarations; type remains distinct from DagDefinitionVertex.')
change([235,236],'PrepareDagInput/PrepareAsyncDagInput are source-required preparation envelopes, not runners. Preserve graph-only contracts and update root/default-parent policy names.','F04')
keep([237,238,239],'prepareDag/prepareDagAsync perform discovery and validation, yielding reusable prepared topology; async sync-source overload preserves inference and is not legacy duplication.')
change(240,'PrepareDagOptions intentionally rejects visitors/seeds/state injection/sorting; update allowed rootWorkDependencies and explicit omitted-W default policy.','F04')
keep(241,'prepareDagDefinition validates authored declarations and returns prepared validity without source I/O; distinguish it from prepareDag discovery and defineDag copying.')
support(242,'RevisionDomain prevents edits widening the prepared Data/ID domains; signature machinery with no runtime identity conversion.')
keep(243,'reviseDag applies ordered operations to a private candidate and returns new preparation plus shallow changes; prepared/operations and fixed Data/ID roles are precise.')
keep([244,247],'Canonical traverseDag/traverseDagAsync options helpers execute the scheduler once and return the resumable runner; retain names and async Promise boundary.')
remove([245,248],'Deprecated positional DAG helper overloads duplicate canonical phase-keyed registration and use misleading onReady/onComplete shorthand; remove overloads only.','F09')
remove([246,249],'DagTraversalVisitorsSimple/Async counterpart are legacy shorthand with onCompleteVisitor actually precommit ON_SUBGRAPH_READY. Remove with positional overloads.','F09')
keep([250,251],'DepthFirstTreeTraversal/Async counterparts identify strategy/family and builder role through configure/registration/createRunner. Existing method names are consistent and scoped.')
keep(252,'ChildIndexSelection is a single index or inclusive index range, used within configured in-order child positions. Number and tuple alternatives are meaningful; tuple labels are optional style.')
support(253,'AsyncDepthFirstTraversalVisitors maps three phases to normalized async records; private support and legacy metadata removal propagate.','F09')
keep([254,255,259,260],'DepthFirstTreeOptions/Patch expose tree source, hint sort, visitors, original structure and configurable in-order policy; async adds concurrency. Canonical names correctly separate strategy and configurable phase placement.')
keep([256,262],'DepthFirstTreeRunner adds isTraversalLeaf (which includes pruning) to tree store/view/graph/root/execution capabilities; it must remain distinct from Vertex.hasNoChildHints.')
support(257,'DepthFirstFrameStage labels internal diagnostic phases pre/pre-visit/sort/waits/children/in/post/done; those DFS-specific abbreviations are truthful within frame.stage, unlike generic public PRE_VISITED status.')
keep(258,'InOrderOptions afterChildIndices/fallbackChildIndices/visitSingleChildParent/visitAfterOmittedChildren expose actual traversal policy; indices are positions, not counts. ranges groups multiple selections; no invented generic algorithm promise.')
keep(261,'DepthFirstPhase PRE_ORDER/IN_ORDER/POST_ORDER are conventional tree phase names, independent of walking strategy and callback batching.')
support(263,'DepthFirstTraversalVisitors is a normalized phase-to-tree-record mapping; retain as signature support while F06/F09 update callback/metadata contracts.','F06','F09')
keep([264,267],'Canonical traverseTreeDepthFirst/Async execute a configurable DFS tree traversal and return its runner; function names and async semantics are descriptive.')
remove([265,268],'Deprecated positional depth-first overloads duplicate phase-keyed options; remove only these overloads, preserving canonical helper functions.','F09')
remove([266,269],'DepthFirstTraversalVisitorsSimple/Async counterpart are legacy helper-only registration schemas; remove with positional overloads.','F09')
keep([270,272],'GraphWalk/AsyncGraphWalk are genuinely generic graph walking builders with strategy, revisit, bounds, predicates and observation policy; configure/phase registration/createRunner are consistent receiver operations.')
keep([271,296],'GraphWalkRunner/Async expose selected-event iterator narrowing, terminal close and summary in addition to common execution. close differs deliberately from iterator.return pause; async close awaits resource disposal.')
keep(273,'GraphWalkEvent vertex/edge/path discriminate actual observation shapes. depth is always candidate-route depth (target depth for edges), via is incoming link, source is an edge endpoint and target is tagged resolution; retaining these concise contextual names is defensible.')
keep(274,'GraphWalkEdge from/to are directed walking endpoint IDs, outgoingIndex is prefilter source-local enumeration identity, and data is caller edge payload. Do not conflate with DagWaitEdge direction or authored slotIndex.')
keep(275,'GraphWalkEventFor extracts a precise event kind based on Phase; type-level For is conventional and preserves ID/data/edge inference.')
keep(276,'GraphWalkPathEvent is a useful named specialization for predicates and consumers, not a competing runtime path representation.')
keep(277,'GraphWalkOperation labels source/iterator/predicate/visitor/cleanup operations for pending-request diagnostics; labels match actual public callback names and iterator lifecycle.')
keep(278,'GraphWalkLimits maxDepth/maxAdmittedTargets/maxCandidateReadAttempts specify real units; no implicit host task/token/time budget. Candidate attempts include exhaustion/replay; admissions include omitted/returning targets.')
keep(279,'GraphWalkRevisitOptions once/simplePaths/walks plus required finite bounds expresses policy safety on the public type surface. maxAdmittedTargets alone cannot bound rejected candidates, so stronger bounds are deliberate.')
keep(280,'GraphWalkRouteContext discriminates once from repeated-route policies, exposing path only where route semantics exist. Do not force a path onto once policy.')
keep(281,'GraphWalkExpandContext depth/via describes current admitted route and incoming edge; predicate receives vertex separately. This is contextual state, not mutation options.')
keep(282,'GraphWalkFollowContext source/depth describes candidate target route before admission; same depth unit as edge events. Path from route context is already-admitted prefix. Documentation clarifies this intentional timing difference.')
keep([283,284],'GraphWalkExpansionPredicate and async counterpart name a boolean expansion decision, separate from adjacency discovery. vertex/context parameter roles are explicit.')
keep([285,286],'GraphWalkEdgePredicate and async counterpart name a boolean follow decision; edge/context and source endpoint/route depth do not perform resolution.')
support([287,288],'GraphWalkFields/AsyncGraphWalkFields factor source/strategy/follow/expand/visitors and execution selection. Null predicate clears, optional undefined preserves, and mapped phase fields keep precise visitor types.')
keep([289,290],'GraphWalkOptions/Async combine common fields with actual bounded revisit policies; generic names are justified by publicly configurable strategy/route/predicate behavior.')
keep([291,292],'GraphWalkOptionsPatch/Async describe partial builder patches; limits intentionally replaces its record while validation is atomic. No runtime-state mutation or restoration is implied.')
keep(293,'GraphWalkStrategy breadthFirst/depthFirst names route expansion order. Keeping literals separate from tree phase enums avoids conflating strategy with visit position.')
keep(294,'GraphWalkRevisitPolicy once/simplePaths/walks is conventional in graph algorithms; once is per-ID admission/vertex observation while returning edges remain observable. It is not a global edge suppression mode.')
keep(295,'GraphWalkPhase VERTEX/EDGE/PATH names callback observations; enum values match emitted kind strings, unlike DAG precommit phases. Preserve this meaningful distinction.')
keep(297,'GraphWalkTarget explicit vertexId/resolution wrapper prevents arbitrary object IDs being confused with hydration records; optional inline tagged resolution is cache input, not a new ID.')
keep(298,'GraphWalkLink target/data is lazy source adjacency input; GraphWalkEdge adds source/index identity after enumeration. Link versus Edge is a useful input/observed distinction.')
keep(299,'GraphWalkVertex vertexId/data is plain walking data without tree hints or mutable reference machinery. Keep its distinct family wrapper.')
keep([300,301],'GraphWalkSource/Async roots, optional resolveVertex and outgoing describe lazy graph discovery. Async permits iterable/async-iterable and MaybePromise; sources are not arbitrary tree/DAG adapters.')
keep(302,'GraphWalkVertexResult found(data)/omitted is hydration, not DAG milestone satisfaction. No missing alternative because resolver errors are host policy.')
keep([303,304],'GraphWalkVisitor/Async receives an event narrowed by phase, not a tree Vertex. Context and result only permit walking capabilities; ID remains last after phase.')
keep(305,'GraphWalkVisitorResult intentionally permits only pause/noop commands and void, avoiding false mutation/W-completion capabilities. Shared command envelope is justified.')
keep(306,'GraphWalkVisitorContext phase/admissionIndex/phaseObservationIndex/visitorIndex/registration distinguish route admission, observation, callback position and registration metadata.')
keep(307,'GraphWalkInspection is family-specific and passive; strategy/revisit/counts/frontier/resources/pending observations/active visitor/request operation are explicit. vertexToken is local identity, not host vertexId.')
keep(308,'GraphWalkOutcome exhausted/closed/limited/failed distinguishes finish cause from broad runner status; limit reasons reuse precise public limit keys and failed preserves unknown error.')
keep(309,'GraphWalkSummary status/counts/outcome gives current walking progress and terminal cause; null outcome while active is explicit and no host work semantics are implied.')
keep(310,'GraphWalkCounts uses accurate units: read attempts, admitted targets, unique hydration outcomes, fresh links and per-phase processed observations. Filtering emissions is independent from processing counts.')
keep([311,312],'walkGraph/walkGraphAsync execute once and return a possibly paused walker; option policy remains publicly configurable. They are action helpers, unlike builder.createRunner allocation.')
keep([313,314],'materializeWalkSourceFromRecords/Async eagerly copy finite membership/adjacency and return a synchronous lazy-source protocol; id/outgoing/roots selectors distinguish records/IDs/edge payload. Async describes materialization I/O.')
support(315,'RelationSelection is a private adapter selection union children/workDependencies/subgraphCompletionDependencies, preserving structural versus W/C relation semantics.')
keep(316,'materializeWalkSourceFromDagDefinition explicitly names input and output domain and requires selected relations; it does no execution or milestone validation, and permits selected cycles.')
keep(317,'GraphWalkDagRelation distinguishes child(slotIndex), W prerequisite and C prerequisite labels. slotIndex is authored definition position, separate from outgoingIndex. Adapter-generated data is detached.')
assert len(decisions)==len(D),(len(decisions),[i for i in range(len(D)) if i not in decisions])
(P/'declaration-decisions.json').write_text(json.dumps([decisions[i] for i in range(len(D))],indent=2)+'\n')
# Expand reviewed owning-declaration assessments to exact census member and route IDs.
# Every retained member is justified by an explicit owning assessment above; mixed
# declarations have the specific exceptions below. There is no unknown-owner fallback.
byloc={v['id']:v for v in decisions.values()}; byidx={d['location']:i for i,d in enumerate(D)}
whole_removed={0,9,53,60,66,67,73,74,92,100,105,107,153,155,204,245,246,248,249,265,266,268,269}

def result(disposition,reason,fs=(),via=None):
 r={'disposition':disposition,'reason':reason,'findingIds':list(fs)}
 if via:r['reviewedVia']=via
 return r

def owned_member(i,name,signature):
 o=decisions[i]; owner=D[i]['name']; via=o['id']
 if i in whole_removed:
  return result('remove','Part of the explicitly removed compatibility/base declaration: '+o['reason'],o['findingIds'],via)
 # Changes to capability references do not imply renaming all unaffected member names.
 if name in ('rootDependencies','implicitParentDependency'):
  return result('rename' if name=='rootDependencies' else 'redesign','F04: W-only root policy becomes rootWorkDependencies; omitted-W fallback becomes explicit omittedWorkDependencies policy. Never-typed occurrences continue to reject these topology-owned inputs.',('F04',),via)
 if i==10 and name=='getId':return result('remove','Alias confuses reference UUID with host vertex ID; retain getRefId.',('F09',),via)
 if i in (37,38) and name in ('getVertexById','getIdOf'):return result('remove','Forwarding alias duplicates explicit getVertexRefById/getVertexId identity queries.',('F09',),via)
 if i==103 and name in ('$d','$c'):return result('remove','Deprecated payload/hint getters duplicate canonical $data/$childHints.',('F09',),via)
 if i==44 and name=='delete':return result('rename','Deletes the resolved subtree rather than one Map-like entry; use deleteSubtree.',('F03',),via)
 if i in (44,140) and name in ('resolveRoot','resolveChild'):
  return result('redesign','Keep method name, replace legacy untagged concrete result with canonical tagged tree resolution.',('F09',),via)
 if i==140 and name=='getRootPropertyFromInputObjectDefault':return result('rename','This static creates a mapper from a root key; use createRootPropertyMapper.',('F13',),via)
 if i==38 and name=='getStatusOf':return result('rename','Return visit-stage vocabulary rather than misleading W/status or PRE_ORDER cues: getVisitStageOf.',('F08',),via)
 if i==27 and name=='status':return result('rename','Expose visitStage using explicit initial/completion stages; not the independent DagWorkState.',('F08',),via)
 if i in (80,28) and name=='resolutionStyle':return result('remove','Drop legacy CONCURRENT/SEQUENTIAL metadata in favor of commandCommitMode.',('F09',),via)
 if i==95 and name=='addedIndex':return result('remove','Caller input is ignored; assigned addedIndex remains valid on queried registration metadata.',('F09',),via)
 if i==8:
  if name=='group':return result('remove','Legacy concurrent/sequential batching projection duplicates commandCommitMode.',('F09',),via)
  if name in ('order','phase','position','config'):
   return result('rename',{'order':'Visitor phase is not scheduling order; rename to phase.','phase':'This is chain execution state, not visitor phase; rename to state.','position':'This is callback position; align with visitorIndex.','config':'This contains execution selection; align with executionOptions.'}[name],('F07',),via)
  if name=='kind' and 'keyof CallbackValues' in signature:return result('rename','Expose operation labels matching public source callbacks instead of engine callback kinds.',('F07',),via)
  if name in ('readyVisits','chains','pendingRequests'):
   return result('redesign','Retain collection role; nested fields need the explicit F07 diagnostic vocabulary and chains drops legacy group.',('F07',)+(('F09',) if name=='chains' else ()),via)
 if i in (84,91):
  if 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER' in name:return result('remove','Deprecated PRE_ORDER hint command alias duplicates REWRITE_CHILD_HINTS and also accepts other initial phases.',('F09',),via)
  if 'DELETE_VERTEX' in name:return result('redesign','Replace generic deletion with explicit tree subtree/DAG cascade behavior.',('F03',),via)
  if 'DISABLE_SUBTREE_TRAVERSAL' in name:return result('rename','Only remaining structural child expansion is stopped; use SKIP_REMAINING_CHILDREN.',('F12',),via)
  if 'SET_VERTEX_VISITORS_CHAIN_STATE' in name or name=='vertexVisitorsChainState':return result('rename','Use SET_VISITOR_CHAIN_STATE with state argument, scoped to this visit chain.',('F15',),via)
 if (i==118 and name in ('vertex','resolvedTree','vertexRef','previousPhaseVertexRef','getKeyPath')) or (i==119 and name in ('key','value')):
  return result('redesign','Expose live input-or-output property/ref/key domains; current input-only typing is falsified by the compiled probe.',('F01',),via)
 if i==128 and name=='makeMutationCommand':return result('redesign','Accept only key/value property patches rather than arbitrary Partial<VertexData> fields that are silently ignored.',('F02',),via)
 if i==187 and (name=='entry' or (name=='kind' and "'forest'" in signature)):
  return result('rename' if name=='kind' else 'redesign','The multi-entry DAG need not be a forest; use roots discriminator while preserving ordered slots.',('F11',),via)
 if i==215 and name=='kind' and "'removeVertex'" in signature:
  return result('rename','Use removeVertexDeclaration: operation removes one declaration and deliberately leaves references/descendants for explicit repair.',('F03',),via)
 if i==210 and ('ok:' in signature or name=='ok'):
  return result('remove','Remove boolean settlement outcome arms; canonical discriminants state W completion versus fatal traversal failure.',('F09',),via)
 if i in (101,102) and ('$d' in signature or '$c' in signature):
  return result('remove','Remove legacy content spelling; preserve canonical payload/hint input and clone patch.',('F09',),via)
 # Deliberately retained member set per owning assessment, even where the owner
 # is renamed or a referenced type changes. Support members are not exports.
 disp='signature-support' if o['disposition']=='signature-support' else 'retain'
 return result(disp,'Reviewed in the complete member set of '+owner+': '+o['reason'],(),via)

loc_members={}
coverage={'bindings':[],'declarations':[decisions[i] for i in range(len(D))],'declaredMembers':[],'instanceMembers':[],'staticMembers':[]}
def member_name(s):
 s=re.sub(r'/\*.*?\*/','',s,flags=re.S).strip()
 s=re.sub(r'^(?:(?:export|declare|abstract|readonly|static|public|protected|get|set)\s+)+','',s)
 if s.startswith('constructor'):return 'constructor'
 if s.startswith('['):return s[:s.find(']')+1]
 m=re.match(r'([^\s?:<(=;]+)',s)
 return m.group(1) if m else '<call>'
for m in E['declaredMembers']:
 parent=m['id'].split('#')[0]; i=byidx[parent]
 r={'id':m['id'],**owned_member(i,member_name(m['signature']),m['signature'])}
 coverage['declaredMembers'].append(r);loc_members.setdefault(m['location'],[]).append(r)
for kind in ('instanceMembers','staticMembers'):
 for m in E[kind]:
  parent=m['id'].split('#')[0];i=byidx[parent]
  # Contextual override matters for instantiated rewrite context and removed bases.
  if i in whole_removed or i in (118,119) or (kind=='staticMembers' and m['name']=='getRootPropertyFromInputObjectDefault'):
   r=owned_member(i,m['name'],m['type'])
  else:
   owners=[r for l in m['declarations'] for r in loc_members[l]]
   assert owners,(kind,m)
   rank={'remove':5,'redesign':4,'rename':3,'retain':2,'signature-support':1}
   chosen=max(owners,key=lambda r:rank[r['disposition']])
   r=result(chosen['disposition'],'Reviewed through the originating member in this inherited/mapped relationship. Receiver '+m['owner']+' supplies the shown type arguments; names retain the originating role. '+chosen['reason'],chosen['findingIds'],[x['id'] for x in owners])
  coverage[kind].append({'id':m['id'],**r})
namespace_reasons={
 'core':'Shared value/source/execution/command/diagnostic module namespace. It is an import grouping, not a runner or policy; retain alongside named exports.',
 'objectRewrite':'Object rewrite module namespace is distinct from callable rewriteObject. Case and suffix make grouping versus action clear; retain.',
 'depthFirstTraversal':'Namespace groups the explicitly named depth-first tree API. No construct/call signature or graph policy is implied by module grouping; retain.',
 'breadthFirstTraversal':'Namespace groups breadth-first tree API, separate from class instances and walking strategy. Familiar namespace imports are not a competing algorithm.',
 'dagTraversal':'Namespace groups DAG builder/preparation/composition/revision/inspection APIs. Lowercase module grouping and uppercase constructor are idiomatic distinct roles.',
 'traversableObjectTree':'Historical module grouping is verbose but correctly identifies object-tree utilities. Renaming the namespace alone provides no substantive clarity gain.',
 'graphWalk':'Graph walking module namespace groups configurable walker types/helpers; distinct from GraphWalk constructor and walkGraph action helper.',
}
for b in E['bindings']:
 if b['name'] in namespace_reasons and b['entry']=='.':
  r=result('retain',namespace_reasons[b['name']])
 else:
  ds=[byloc[l] for l in b['declarations']];assert ds,b
  fs=sorted(set(f for d in ds for f in d['findingIds']))
  vals={d['disposition'] for d in ds}
  if vals=={'remove'}:disp='remove'
  elif 'rename' in vals:disp='rename'
  elif 'redesign' in vals or ('remove' in vals and len(vals)>1):disp='redesign'
  else:disp='retain'
  r=result(disp,'Supported '+b['entry']+' binding routes to reviewed declaration'+(' overloads' if len(ds)>1 else '')+'. '+ ' '.join(d['reason'] for d in ds),fs,[d['id'] for d in ds])
 coverage['bindings'].append({'id':b['id'],**r})
for kind in E:
 assert {r['id'] for r in coverage[kind]}=={r['id'] for r in E[kind]},kind
(P/'coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
print('Coverage:',{k:len(v) for k,v in coverage.items()})
S=json.loads((P/'supplemental-vocabulary.json').read_text())
supp={'summary':S['summary'],'method':'Every occurrence was read in its complete owning signature; IDs add category and occurrence index, preserving duplicate AST observations. Indexed type keys/import paths and conditional algebra are signature support. Runtime-only legacy decoding is separately inventoried in review.md.','literals':[],'parameters':[],'typeParameters':[],'deprecated':[]}
for owner in S['declarations']:
 i=byidx[owner['declaration']];o=decisions[i]
 for cat in ('literals','parameters','typeParameters','deprecated'):
  for n,v in enumerate(owner[cat]):
   value=v.get('text',v.get('signature',v.get('name',''))); fs=[]
   disp='retain'; reason=''
   if cat=='deprecated':
    disp='remove';fs=['F09'];reason='Reviewed accepted/reachable compatibility occurrence: '+v['name']+'. Canonical replacement: '+str(v.get('comment',''))+' Removal is deliberate, including signature-only metadata; duplicate AST tag observations are retained as separate occurrences.'
   elif i in whole_removed:
    disp='remove';fs=o['findingIds'];reason='This occurrence belongs to the specifically removed declaration/overload. '+o['reason']
   elif cat=='literals':
    text=value.strip("'\"")
    if text.startswith('.') or text in ('VertexData','VertexHint','value','entry','dependencyEdges','children','visitors','completedWork','workCompletion','retainOriginalGraphStructure','concurrency','traversableTree','traversableGraph','getRootPropertyFromInputObject') and not (i==315):
     disp='signature-support';reason='Import-specifier or indexed/mapped/Pick/Omit field-key occurrence, not a separately selectable runtime literal; assessed with the referenced field/owner contract.'
    elif i==24:
     disp='retain' if text in ('DISCOVERED','COMPLETE') else 'rename';fs=['F08'];reason='Retain DISCOVERED/COMPLETE boundary names; replace READY/PRE_VISITING/PRE_VISITED/COMPLETING with explicit initial/completion visit-stage names. See full F08 mapping.'
    elif i==187 and text=='forest':
     disp='rename';fs=['F11'];reason='Multi-entry DAG may share descendants; roots states entry role without asserting forest topology.'
    elif i==215 and text=='removeVertex':
     disp='rename';fs=['F03'];reason='Single declaration edit becomes removeVertexDeclaration; no runtime cascade semantics.'
    elif i==91 and 'REWRITE_VERTEX_HINTS_ON_PRE_ORDER' in text:
     disp='remove';fs=['F09'];reason='Deprecated phase-specific alias duplicates canonical hint rewrite.'
    elif i==91 and text.startswith('DELETE_VERTEX'):
     disp='redesign';fs=['F03'];reason='Split runtime deletion by truthful tree-subtree/DAG-cascade scope.'
    elif i==91 and text.startswith('DISABLE_SUBTREE_TRAVERSAL'):
     disp='rename';fs=['F12'];reason='SKIP_REMAINING_CHILDREN names remaining structural expansion rather than global subtree disabling.'
    elif i==91 and text.startswith('SET_VERTEX_VISITORS_CHAIN_STATE'):
     disp='rename';fs=['F15'];reason='SET_VISITOR_CHAIN_STATE states per-visit chain ownership and aligns with context.'
    elif i==8 and text in ('concurrent','sequential'):
     disp='remove';fs=['F09'];reason='Legacy batching projection duplicates commandCommitMode and suggests concurrency.'
    elif i==210 and text in ('true','false'):
     disp='remove';fs=['F09'];reason='Boolean ok settlement forms hide work-completion versus fatal-traversal scope.'
    elif i==37 and text in ('getVertexById','getIdOf'):
     disp='remove';fs=['F09'];reason='Picked getter alias is removed from OriginalGraphView along with ResolvedGraph.'
    elif text in ('0','null'):
     disp='signature-support';reason='Conditional tuple index or explicit absence marker, not a named runtime policy. Null is retained where it distinguishes absence from arbitrary valid undefined IDs/data.'
    else:
     reason='Literal/enum meaning deliberately retained within '+owner['owner']+'. '+o['reason']
   elif cat=='parameters':
    reason='Parameter role reviewed in '+owner['owner']+': '+value+' has type '+str(v.get('type'))+'. '+o['reason']
    if value in ('icfgInput','order','isCompositeAssertions') or (value=='options' and ('Context' in str(v.get('type')))):
     fs=['F14'];reason+=' Optional declaration-only spelling: options/patch, phase, classification, or context as appropriate; no runtime contract change from spelling alone.'
    if i in (118,119,120,122,123,124):fs=list(set(fs+['F01']))
   else:
    reason='Generic role/constraint/default reviewed in '+owner['owner']+': '+value+'. '+o['reason']
    if i in (68,69,70) and (value.startswith('Inspection ') or value.startswith('EmittedKind ')):
     disp='redesign';fs=['F05'];reason='Generic capability defaults should select common ExecutionInspection and mapped EmissionKind<Phase>, not historical detailed/default-phase contracts.'
    elif i in (118,119,120,122,123,124):
     disp='redesign';fs=['F01'];reason='Thread both input and output domains through callback current values/live context; do not assert original-input-only types.'
    elif i==127:
     disp='redesign';fs=['F02'];reason='Constrain exposed patch to key/value while preserving the extended caller data type as opaque existing data.'
    elif re.match(r'^(?:[A-Z_]*(?:TTP|ORDER)|RW_V|VD|VH|DATA|NARROWED)\b',value):
     fs=['F14'];reason+=' Optional type-parameter spelling cleanup only; preserve ordering, defaults and inference.'
    elif ' in ' in value or value in ('RESULT','F','Name in T') or i in (17,86,191,242):
     disp='signature-support';reason='Mapped/inferred/NoInfer conditional type machinery; retain inference behavior rather than promoting a new exported concept. '+o['reason']
   assert reason
   supp[cat].append({'id':owner['declaration']+'#'+cat+':'+str(n),'owner':owner['owner'],**v,'disposition':disp,'reason':reason,'findingIds':sorted(set(fs)),'reviewedVia':owner['declaration']})
assert [len(supp[k]) for k in ('literals','parameters','typeParameters','deprecated')]==[393,338,631,21]
(P/'supplemental-coverage.json').write_text(json.dumps(supp,indent=2)+'\n')
