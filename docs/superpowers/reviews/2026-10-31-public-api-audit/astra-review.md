# Independent Astra public API review — 2026-10-31

Baseline: `8f20c2f43cbf7722025b2fb5682072f8e4952c1b`. Read-only source review; no implementation or release authorization is implied.

I recommend **20 findings: three at 3/5, thirteen at 2/5, four at 1/5**. No evidence warrants 4/5 or 5/5. Two findings concern objective contract contradictions; the remaining findings are improvements in expressiveness or usability, including explicitly optional naming changes. They are not twenty correctness bugs.

The review covered all **324 owners / 4,242 inventory items**, including all reachable declarations, nested members, overloads, literals, generics, parameters, inherited members and route bindings. [astra-owner-notes.json](astra-owner-notes.json) records every owner's disposition, specific rationale and finding links. I read the complete current declaration surface against the README, agent workflow guide, API reference, export barrels, and targeted implementation paths. The controller independently regenerated an identical census and validated all 460 recorded input hashes. I did not reproduce that census validation or run a shared build.

I formed independent candidate findings before reading the previous review, then used that review to challenge and extend the candidates. Every finding retained below has current source evidence. Two historical claims were specifically rejected: the default object root-key constant is reachable through declarations, **not an exported public binding**, and the root-mapper/default-enumerator utilities are public statics, **not also free exports**. Only the mutation binder has both routes. An initial type probe also disproved my candidate that `DagSource` is a supported named import; it is an unexported but reachable helper. These distinctions matter when reviewing the whole surface.

[Public runtime probes](astra-probes.cjs) and their [output](astra-probes.output.txt) pass. [Public type probes](astra-types.ts) pass with expected-error assertions. The initial type run failed on the unsupported `DagSource` import; I removed that mistaken hypothesis, reran successfully, and excluded it from findings. The controller separately reproduced the leaf/session behavior. Probes establish the described behavior, not the merit of a proposed rename.

## Ranked findings

<a id="a01"></a>

### A01 — 3/5 — `Vertex.clone()` violates the structural `VertexView.clone()` promise

**Evidence:** `src/core/Vertex.ts:56`, `src/core/Vertex.ts:79`, `src/core/observationFacets.ts:38`. **Owners:** D0099, D0100, D0102. **Classification:** objective substitutability defect.

`VertexView.clone()` promises an independent editable hint collection. Standalone `Vertex` satisfies that interface structurally, but its clone reuses the original hints. A function accepting `VertexView` can call `view.clone().getChildrenHints().push(...)` and mutate a standalone input. The runtime probe confirms sharing; the type probe confirms assignment. Actual runner observation facets correctly copy hints, so this is not a mutable-handle leak.

Copy the hint collection in standalone `Vertex.clone()`, keeping shallow data and individual hint identity. If sharing is desirable, give it a distinct `cloneSharingHints()` operation. Migration changes behavior for clients deliberately sharing arrays and adds O(hints) copying, but aligns the common interface contract.

<a id="a02"></a>

### A02 — 3/5 — `sortChildrenHints` is an unrestricted expansion transform

**Evidence:** `src/core/ChildHintSorter.ts:3`, `src/core/drivers/callbackBindings.ts:178`, `src/core/TraversalKernel.ts:973`. **Owners:** D0003, D0004 and family option owners. **Classification:** verified capability, design naming judgment.

The returned array replaces the expansion list. A sorter can remove, duplicate or invent hints; no permutation is enforced. The probe replaces `a` with `replacement`. A host may install an apparently harmless order callback and silently change the discovered domain. Its closest counterpart is `REWRITE_CHILD_HINTS`, which explicitly announces replacement at a visitor boundary.

Rename to `transformChildHints` / `ChildHintTransformer`, including async and inspection operation names. Alternatively expose a true comparator/permutation-only sorter, but that would restrict existing behavior and needs deliberate validation semantics. The rename preserves capability; migration touches all tree/DAG configuration keys.

<a id="a03"></a>

### A03 — 3/5 — The current reference advertises rejected callbacks and options

**Evidence:** `docs/reference.md:559`, `docs/reference.md:1162`, `src/core/drivers/normalizeSourceResult.ts:43`, `src/core/drivers/normalizeSourceResult.ts:50`, `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts:24`. **Owners:** D0052, D0053, D0059, D0061, D0118, D0128, D0138. **Classification:** objective documentation contradiction.

The prerequisite paragraph says `undefined` and `{ vertexContent: null }` still normalize, although canonical tagged results are required. The rewrite paragraph lists `isComposite` and `getKeyPath` as options, although they are observations in callback/binder contexts; configurable classifiers are `isArray` and `isObject`. A client implementing the advertised forms gets a type error or runtime rejection.

Correct those paragraphs to tagged `missing` / acknowledged `omitted` returns and distinguish configuration from callback observations. Keep the current strict runtime. This needs documentation migration, not compatibility restoration. The controller reproduced the rejected forms; the normalizer and option surface independently confirm them.

<a id="a04"></a>

### A04 — 2/5 — `isTraversalLeaf()` does not answer whether a vertex has structural children

**Evidence:** `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:224`; async counterpart has the same formula. **Owners:** D0255, D0262. **Classification:** verified behavior, naming judgment.

The predicate means expansion was disabled **or** the vertex has no hints. The probe shows a root with every hint omitted has zero resolved children but returns false; skipping after the first child leaves one retained child but returns true. A post-traversal leaf collector can select internal vertices and miss actual leaves. `VertexView.hasNoChildHints()` and `ResolvedTreeView.getChildrenOf()` already expose the two relevant domains more precisely.

Remove this ambiguous convenience or replace it with separate explicit `isChildExpansionSkipped(ref)` and existing hint/child queries. If retaining the exact boolean, a descriptive name such as `hasNoChildHintsOrSkippedExpansion` is honest. A true `isResolvedLeaf` needs a documented partial-discovery policy. Migration must choose the intended predicate rather than mechanically rename all call sites.

<a id="a05"></a>

### A05 — 2/5 — The free work-session factories wrap progress; prepared factories create progress

**Evidence:** `src/traversals/dag-traversal/coordinateDag.ts:128`, `src/traversals/dag-traversal/coordinateDag.ts:151`, `src/traversals/dag-traversal/lib/makePreparedDag.ts:93`. **Owners:** D0167, D0168, D0236. **Classification:** verified behavior, naming judgment.

`createDagWorkSession(runner)` and its async counterpart wrap the same runner. Two wrappers share settlement/progress while issuing mutually foreign tickets. `prepared.createWorkSession()` instead creates an independent runner. The probe settles through one wrapper and observes completion through the other; the latter's own ticket then returns `alreadyAccepted`. A coordinator expecting independent attempts from two calls can accidentally drive one execution twice.

Prefer `wrapDagWorkSession(runner)` / `wrapAsyncDagWorkSession(runner)` or `coordinateDagRunner`, retaining `createWorkSession()` for independent creation. Do not change shared-progress semantics silently. The argument already signals a supplied runner, limiting severity; the benefit is a mechanical rename making the lifecycle distinction visible.

<a id="a06"></a>

### A06 — 2/5 — `omittedWorkDependencies` collides with deliberate vertex omission

**Evidence:** `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:22`, `src/core/scheduling/GraphScheduling.ts:908`, `src/core/TraversableTree.ts:44`. **Owners:** D0219, D0243 and their option consumers. **Classification:** verified behavior, naming judgment.

The option controls a **missing `dependsOnWork` declaration on a live vertex**. It does not control `kind: 'omitted'`, `omittedIds` or whether omitted vertices satisfy W/C. The probe changes a live child's inherited parent dependency without omitting any vertex. A user seeking to prevent an omitted prerequisite from satisfying work could choose `'none'` and get no such effect.

Rename to `defaultWorkDependencies` or `whenWorkDependenciesAbsent`, preserving `'none' | 'discoveryParentWork'`. Preserve explicit lists, including `[]`, as overrides. This is a configuration rename across sync/async/preparation APIs; do not add omission semantics or change acknowledgment behavior.

<a id="a07"></a>

### A07 — 2/5 — Readonly source hints are rejected despite an observational/copying API

**Evidence:** `src/core/Vertex.ts:3`, `src/core/TraversalVisitor.ts:27`. **Owners:** D0081, D0101, D0103. **Classification:** verified type friction, design improvement.

Source content and `REWRITE_CHILD_HINTS.newHints` demand mutable arrays. An authored `as const` hint tuple cannot be used directly, although dependencies, definitions and observations accept readonly topology. The type probe confirms source rejection. Clients must copy/assert solely to satisfy the input type.

Introduce a readonly `VertexContentInput` hint collection and accept readonly replacement hints; copy into owned mutable collections where editing is intended. Keep standalone editable `Vertex` outputs mutable. Broadening types is easy, but constructor aliasing/copy ownership must be decided explicitly; it is not already uniformly copying today.

<a id="a08"></a>

### A08 — 2/5 — Cycle payloads use `vertexIds` for incompatible evidence

**Evidence:** `src/traversals/dag-traversal/lib/DagDefinition.ts:46`, `src/core/errors/DagDiscoveryCycleError.ts:6`. **Owners:** D0014, D0192. **Classification:** verified contract, design improvement.

`structuralCycle.vertexIds` contains SCC members; `discoveryCycle.vertexIds` and discovery errors contain an ordered closed witness. A renderer joining consecutive IDs into edges invents relationships for SCC membership. `dependencyCycleComponents` already has accurate vocabulary.

Use `componentVertexIds` for SCC evidence and `cycleVertexIds` for witnesses, or a discriminated evidence object. Preserve ordering and opaque identity. This breaks diagnostic consumers but requires no algorithm change; generic formatters must still branch on evidence kind.

<a id="a09"></a>

### A09 — 2/5 — Sessions erase the known inspection subtype

**Evidence:** `src/traversals/dag-traversal/coordinateDag.ts:36`, `src/traversals/dag-traversal/coordinateDag.ts:112`. **Owners:** D0164, D0165, D0166. **Classification:** verified type-surface limitation.

The session extends unspecialized `TraversalExecutionState`, yet delegates to a DAG runner's detailed inspection. `session.inspect().chains` fails typechecking while the same runner exposes it. A diagnostic wrapper must retain a second runner reference or assert a type despite the known family.

Specialize session control to `TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>>`. Keep the family-neutral default on general execution capabilities because walkers also use those. Runtime capture remains unchanged; structural session mocks may need fuller inspection records.

<a id="a10"></a>

### A10 — 2/5 — Export target/link types that retain walking hydration mode

**Evidence:** `src/traversals/graph-walk/GraphWalkSource.ts:12`, `src/traversals/graph-walk/GraphWalkSource.ts:26`, `src/traversals/graph-walk/GraphWalkSource.ts:41`. **Owners:** D0294, D0295, D0297–D0301, D0304. **Classification:** verified type friction.

Source unions correctly constrain each hydration mode, but the exported `GraphWalkTarget`/`GraphWalkLink` union erases that distinction. A reusable inline-link helper annotated with the public broad alias cannot be plugged into an inline-or-cached source. The type probe reproduces this; the implementation need not be invalid.

Export mode-specific aliases or parameterize target/link types by hydration mode. This adds vocabulary but lets clients describe existing supported policy without manual `Extract` plumbing. Preserve runtime source-mode checks and first-admitted-resolution semantics.

<a id="a11"></a>

### A11 — 2/5 — Rewrite output collapses absence and legitimate null

**Evidence:** `src/tools/rewrite-object/rewriteObject.ts:297`. **Owners:** D0117, D0119, D0120, D0121. **Classification:** verified information loss, design improvement.

Deleted root and retained null-valued root both become `null` before conversion. The probe confirms identical `getOutput()` values. A document host interpreting null as deletion cannot distinguish them without inspecting the runner. `outputAtReturn` versus `getOutput()` distinguishes time, not presence.

Add a tagged `getOutputResult(): { kind: 'present'; value: Out } | { kind: 'absent' }` and corresponding captured result, or expose root presence in converter context. Preserve FINISHED gating and conversion caching. An additive route minimizes migration; define whether absence invokes conversion rather than silently changing current behavior.

<a id="a12"></a>

### A12 — 2/5 — Fragment “instances” have no instance invariant

**Evidence:** `src/traversals/dag-traversal/lib/DagFragment.ts:14`, `src/traversals/dag-traversal/dagFragments.ts:56`, `src/traversals/dag-traversal/dagFragments.ts:134`. **Owners:** D0170, D0172, D0196, D0197. **Classification:** verified structural equality, naming judgment.

`DagFragmentInstance` is exactly `DagFragment`; composition accepts an unmapped fragment directly. The type probe confirms this. `instantiateDagFragment` specifically remaps IDs, so its general instance name can suggest fresh identity/provenance that its result does not establish. Reusing a fragment with identity mapping can still collide at composition.

Prefer `mapDagFragmentIds` returning `DagFragment`, removing the redundant instance type. If instantiated-only composition is actually desired, enforce a nominal capability, but current policy does not justify that restriction. Renaming preserves current behavior and makes caller-owned ID mapping explicit.

<a id="a13"></a>

### A13 — 2/5 — `defineDag` normalizes, while `defineDagFragment` validates

**Evidence:** `src/traversals/dag-traversal/defineDag.ts:50`, `src/traversals/dag-traversal/dagFragments.ts:34`, `src/traversals/dag-traversal/prepareDagDefinition.ts:8`. **Owners:** D0174, D0171, D0244. **Classification:** verified distinction, optional naming improvement.

`defineDag` copies/freezes shape and deduplicates dependency lists without semantic graph validation. `defineDagFragment` validates a closed graph and throws on invalidity. A caller generalizing from one `define…` helper can treat a cyclic or unreachable definition as valid after the other.

Rename `defineDag` to `normalizeDagDefinition`; keep `prepareDagDefinition` as executable validation. Do not introduce hidden source I/O or execution. This mechanical breaking change trades concise authoring vocabulary for a clearer guarantee; current documentation already explains the distinction, limiting impact.

<a id="a14"></a>

### A14 — 2/5 — Omission identity has two public encodings

**Evidence:** `src/core/graph/types.ts:42`, `src/core/TraversableTree.ts:45`, `src/traversals/dag-traversal/lib/DagDefinition.ts:4`. **Owners:** D0024, D0029, D0058, D0193. **Classification:** verified representation mismatch, design improvement.

Source/resolved omissions use own-property presence of optional `vertexId`; definitions use `identity: { vertexId } | null`. Both preserve the real ID `undefined`, but `slot.vertexId === undefined` loses that distinction during conversion. This is an integration trap across two representations of the same fact, not evidence that current normalization is wrong.

Use explicit omission-identity wrappers consistently. Keep DAG `satisfiesDependencies: true` acknowledgment separate. Migration must test own presence rather than truthiness and preserve anonymous/known-undefined cases; wrappers add syntax and allocation.

<a id="a15"></a>

### A15 — 2/5 — Composite classification permits contradictory flags with implicit precedence

**Evidence:** `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts:216`, `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts:230`. **Owners:** D0114, D0128, D0138. **Classification:** verified policy, optional simplification.

`isArray` and `isObject` run independently; both may be true, while array assembly wins. A broad object classifier plus a specialized array classifier creates ambiguous context flags for later policy. The flags classify supplied properties, not necessarily native JS object categories.

Consider `classifyComposite(property): 'array' | 'object' | 'scalar'` and a corresponding `compositeKind`, retaining custom assemblers. This makes the actual choice explicit without pretending `isComposite` is configurable. Existing overlap may be intentional; migration must preserve array precedence or retain the existing API if that expressiveness matters more.

<a id="a16"></a>

### A16 — 2/5 — Low-level settlement should consume the atomic work record it emits

**Evidence:** `src/traversals/dag-traversal/lib/DagProgress.ts:4`, `src/traversals/dag-traversal/lib/DagTraversalRunner.ts:80`, `src/traversals/dag-traversal/coordinateDag.ts:99`. **Owners:** D0189, D0212, D0226. **Classification:** optional ergonomic improvement, guards already correct.

`summary().awaitingSettlement` gives `{ vertexId, generation }`, but `settle(id, outcome, expectedGeneration)` requires splitting it into positional arguments. A host keeping IDs and generations separately can combine unrelated values. Runtime rejection is correct; the call shape makes the mistake easier than necessary.

Prefer `settleDeferredWork(work, outcome)` or an overload taking `DagDeferredWork`. Preserve duplicate/conflict checks and exact error identity. Tickets remain the preferred higher-level route; a copyable work record is not a nominal ticket, durable lease or claim. The overload can be additive.

<a id="a17"></a>

### A17 — 1/5 — Reusable visitor aliases put phase in inconsistent generic positions

**Evidence:** `src/core/TraversalVisitor.ts:186`, `src/core/AsyncTraversalVisitor.ts:9`, `src/traversals/dag-traversal/lib/DagTraversalVisitor.ts:30`, `src/traversals/graph-walk/GraphWalkVisitor.ts:27`. **Owners:** D0002, D0079, D0227, D0228, D0306, D0307. **Classification:** optional consistency improvement.

Tree visitors use `<Phase, T, R>`; DAG visitors use `<T, R, Phase, ID>`; walking uses `<Data, Edge, Phase, ID>`. Copying a phase-specific callback alias across families requires remembering a different tree ordering. Types catch most mistakes, so this is low impact, not unsoundness.

In a breaking cleanup, consider `<T, R, Phase>` for tree aliases to align the domain/domain/phase pattern, preserving trailing graph IDs. Do not unify incompatible callback payloads. Existing explicit type arguments require migration, and established usage may justify retaining the asymmetry.

<a id="a18"></a>

### A18 — 1/5 — Property adapter names obscure their distinct operations

**Evidence:** `src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectTreeInstanceConfig.ts:30`, `src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts:67`. **Owners:** D0123–D0126, D0142–D0146. **Classification:** optional naming improvement.

`getRootPropertyFromInputObject` maps one input to a root property; `getChildrenOfProperty` enumerates properties; `resolveChildHook` resolves/delegates an individual hint. A caller searching for the root counterpart of the child hook can overlook the long mapper name or confuse enumeration with resolution.

Prefer `mapRootProperty` and `enumerateChildProperties`, with a matching default utility name. Keep tagged `resolveChildHook` distinct. Preserve required adapters for narrow domains and the useful `fromProperties` constructor. This is a mechanical rename; the current names are correct enough that churn may outweigh benefit. Mapper/enumerator utilities are statics, not free exports.

<a id="a19"></a>

### A19 — 1/5 — Name assembly cache policy explicitly

**Evidence:** `src/traversable-tree-implementations/traversable-object-tree/lib/makeMutationCommandFactory.ts:18`, `:66`, `:96`, `:230`. **Owners:** D0127, D0128, D0131. **Classification:** optional naming improvement.

`assembledMap` accepts a structural cache, not necessarily a Map, and `assembleComposite(false)` means assemble without saving. A boolean call obscures whether false disables assembly or storage; the exact generic type correctly permits unknown mixed values.

Use `assemblyCache` and `assembleComposite({ cacheResult: false })`. Preserve handle identity, unknown writes and true default. This changes advanced option/call syntax with no semantic improvement; retain current spelling if compatibility is worth more than the readability gain.

<a id="a20"></a>

### A20 — 1/5 — Prefer one public name for safe vertex handles

**Evidence:** `src/core/index.ts:106`, `src/core/graph/types.ts:16`. **Owners:** D0011, D0021, ROUTES. **Classification:** optional alias cleanup.

The public `VertexRef` alias means safe `VertexHandle`; a reachable internal `VertexRef` means mutable reference. A declaration reader sees identical short names with different editing authority. Ordinary imports remain safe: this is not a runtime mutability leak.

Prefer only `VertexHandle` publicly and `InternalVertexRef` internally if those internals are touched. Keep `MutableRef` for explicitly editable standalone state. Migration is a type import rename; compatibility and users' familiarity can reasonably justify retaining the alias.

## Retains and rejected candidates

- Generic `configure`, `inspect`, `summary`, source protocols, execution capabilities and selected-event helpers have justified scope through family types and real policy inputs. Do not prefix every generic operation merely because it has defaults.
- Keep W/C dependencies distinct from structural child edges, visitor phases distinct from committed event kinds, and runner status distinct from graph visit stage. Keep host claims, attempts, outcomes and durability outside CTT.
- Keep eager preparation's topology freeze. It is an intentional validation invariant, explicitly documented, not an undisclosed generic traversal policy needing a new mutable mode. Keep `workCompletion` modes, root policies, revisit modes, bounds and command commitment independently configurable as currently supported.
- Keep object `kind: 'keep'` as retaining the property while reconstructing processed children. In this scoped object transformation, treating it as a generic `NOOP` would discard child rewrites; the distinction is useful, not a ranked defect.
- Keep original views as progressively retained first-discovery structure with shallow payload identity; they are query views, not immutable copies of the entire host source. Keep live views distinct from captured milestone snapshots.
- Keep ordered roots/slots/omissions, prepared definition versus lossy live-child projection, shallow declaration diffs, non-cascading revision removal, and explicit fragment W/C wires. Keep arbitrary SameValueZero IDs and known-undefined identity.
- Keep walker source modes, first-admitted resolution cache, bounded route prefixes, per-occurrence predicates, edge direction/index and terminal outcomes. Iterator return pauses; runner close disposes; that lifecycle distinction is deliberate.
- Keep public safe handles/facets and explicit standalone mutable stores separate. Reachable `Internal*`, generic helper types, and `never` rejection fields are not advertised extension points or configurable policy knobs. `DagSource`, the root-key constant, and several helper declarations are not named public bindings.
- Keep package export boundaries and canonical CJS/ESM/type identity. Do not manufacture separate findings from namespace access, inherited members, overload declarations or identical sync/async implementations.

## Verification and limits

The final runtime probe and final type probe both exited 0. Runtime assertions cover clone sharing, sorter replacement, both leaf mismatches, shared-wrapper progress/foreign tickets, undeclared-work dependency defaults, and null-versus-absent output. Type assertions cover structural clone substitution, readonly hint rejection, session inspection erasure, walking hydration alias friction, and fragment/instance equivalence. Existing source/type tests and controller probes corroborate remaining contracts; I did not rerun all coverage, examples, package consumers or benchmarks. No performance claims or unimplemented API guarantees are made.

All 324 owners are recorded with all 4,242 item IDs assigned exactly once in the owner ledger. This is complete surface consideration, not an assertion that every possible runtime combination was executed. Proposed alternatives require design and migration review; optional findings should not be mechanically accumulated into a breaking release.
