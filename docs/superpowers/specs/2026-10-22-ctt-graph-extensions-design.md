# Generic CTT completion prerequisites and prerequisite lookup design

Approved by the user’s implement-all request. This stage adds the two generic graph capabilities using the existing scheduler and effect transport. The preceding performance stage preserves their baseline interfaces; its topology revision/read helpers must be reused. Business policy and persistence stay outside CTT.

## Public contract

```ts
// src/core/TraversableTree.ts (existing shared result type)
type MakeVertexResult<T extends TreeTypeParameters> = {
  vertexContent: VertexContent<T> | null;
  vertexId?: VertexId;
  dependsOn?: readonly VertexId[];
  dependsOnComplete?: readonly VertexId[];
};

// src/core/TraversableGraph.ts
interface TraversableGraph<T extends TreeTypeParameters, R extends TreeTypeParameters = T> {
  // existing makeRoot, makeVertex and getVertexIdFromHint unchanged
  resolvePrerequisite?(id: VertexId): MakeVertexResult<T> | undefined;
}
interface AsyncTraversableGraph<T extends TreeTypeParameters, R extends TreeTypeParameters = T> {
  resolvePrerequisite?(id: VertexId): MaybePromise<MakeVertexResult<T> | undefined>;
}
```

The resolver return union explicitly distinguishes missing results from deliberate omission. `undefined` means lookup did not find the ID; `{vertexContent: null}` means deliberate omission. This distinction is necessary because existing omission satisfies dependencies, whereas an unknown prerequisite must remain an error. Do not overload a missing lookup with omission. Do not require a fabricated `VertexResolutionContext` or hint. Keeping the argument to exactly `id` avoids suggesting that a discovery parent exists.

A missing own `vertexId` in a found result inherits the requested ID. An own `vertexId` must match the request with `sameVertexId`; explicitly supplied `undefined` remains a valid ID. Fixed mismatch error: `Error('Prerequisite result vertex id and requested vertex id mismatch')`. Avoid coercing IDs into error messages. A missing resolver result keeps the ID unknown and produces the existing `DagTraversalStallError` when traversal can no longer advance. Exceptions and rejected values from user code, including `undefined`, must survive unchanged, as existing `Outcome` transport already supports.

Semantics:

- `dependsOn: [p]` gates initial work on **W(p)**, preserving the existing successful initial chain/settlement semantics.
- `dependsOnComplete: [p]` gates initial work on **C(p)**, the existing committed `ON_COMPLETE` transition, after successful work, closed hint discovery, and completion of retained children. Admission to COMPLETING is insufficient.
- Both lists apply conjunctively; duplicate IDs within each list are normalized with Set. An ID present in both lists must remain represented in both milestone sets: W completion must not accidentally release the C gate.
- Completion dependencies do not create discovery edges or append child slots.
- Preserve `dependsOn` defaulting: a normally discovered child without an explicit list waits for its discovery parent's W; synthetic catalog entries and detached resolver vertices default to no W prerequisites. `dependsOnComplete` defaults to an empty list and does not suppress the existing implicit parent W prerequisite.
- A deliberately omitted prerequisite satisfies both W and C without retaining a vertex. A deleted prerequisite is not an omission; it deletes its dependents, including completion dependents.
- The new callback is graph-only. Do not call it for an adapter that lacks the hook, known live/omitted/deleted IDs, unrelated completedWork seeds, or unreferenced IDs.

## Compatibility decisions that need explicit implementation discipline

`GraphScheduling.acceptRoot()` currently drops root `dependsOn` unless eager discovery or a supplied completedWork set turns on `validateRootDependencies`. `tests/graph-readiness.test.ts` explicitly asserts this behavior. Honoring every root declaration unconditionally would break existing lazy adapters.

The smallest compatible extension is to retain that rule for old adapters and honor root declarations when **either** new feature is explicitly used: the graph source has `resolvePrerequisite`, or the root result supplies a non-undefined `dependsOnComplete` value (including `[]`). Existing eager/completedWork behavior remains. Always honor an explicitly declared root completion list. This permits a lazy ordinary root with an external prerequisite to work without silently ignoring its dependency, while unchanged adapters retain their legacy root behavior. Document the legacy exception and use `dependsOnComplete: []` as an explicit opt-in if a caller needs ordinary root dependencies without a hook. Avoid a third public configuration option just to correct this historical inconsistency; a future major version can remove the exception.

`rejectTreeMetadata()` currently rejects graph-source `priority` and `dependsOnComplete`. Change the graph rejection to priority only, with `TypeError('priority metadata is not supported')`; update that specific unsupported-feature assertion because the old message incorrectly claims the newly supported completion field is forbidden. All user-thrown values and unrelated errors remain exact. Tree sources currently **ignore** dependsOnComplete as unknown extra metadata: `tests/dag-discovery.test.ts` has an explicit preservation test. Do not add dependsOnComplete to the tree metadata rejection in `callbackBindings.assertTreeResult` or `GraphScheduling.rejectTreeMetadata` as an accidental consequence of adding the field to the shared result type. The new behavior remains graph-source only.

Root metadata is irrelevant to syntheticRoot bookkeeping; continue excluding the synthetic root from public progress and lookup demand. Catalog entries retain explicit-ID and duplicate-ID validation.

## Runtime changes by responsibility

### Graph data and scheduler

`src/core/graph/types.ts`: add optional copied `dependsOnComplete?: readonly VertexId[]` to GraphVertex (omit this property when the normalized list is empty to preserve existing view shapes) and an optional empty-default input on GraphStoreContract.insertVertex. `GraphStore.Entry` stores a copied array, with all tree construction paths defaulting it to empty. The public vertex projection must copy it as it copies dependsOn today. Both `src/core/scheduling/types.ts` and the duplicate VertexWork declaration in `src/core/kernelTypes.ts` need an additional `unmetComplete: Set<VertexId>` (or consolidate the duplicate definition rather than allowing divergence).

`GraphScheduling` should keep its existing W reverse index and add a C reverse index. `register`, `restoreDagSeed`, `getStall`, `inspectWork`, `enqueueReady`, `deleteRefs`, and seed validation must inspect both. `markPreVisited` only releases W; `markComplete` releases C exactly once, then performs existing per-slot parent accounting. `enqueueReady` requires both sets empty. Leave the existing completion preconditions intact. Store original declarations separately from residual unmet sets so successful seeds never hide an invalid graph.

`ResolvedGraphsContainer` needs a real `acceptDetachedVertex(ref, id, dependsOn, dependsOnComplete)` path. It stages/commits an original snapshot vertex and inserts it without setRoot, parent edge, child slot or resolution context. `GraphScheduling.acceptPrerequisite(id, result)` validates the requested ID, omission/content conflicts and tombstones, inserts using that path, and registers the same lifecycle work used for ordinary nodes. It must not call acceptRoot or acceptVertex with a fake parent. Share validation/identity logic to avoid a third inconsistent acceptance path.

A resolver vertex owns an independent traversal anchor. Record that ownership in graph/container state (not solely a local resolver map), so a later real discovery edge does not silently change its lifetime and quiescent continuation can preserve the ownership fact. Its normal children still follow existing structural orphan pruning. A detached anchor that later becomes a discovered child survives deletion of that discovery parent. Explicit deletion of the anchor still removes it and cascades dependencies. Deleting the ordinary traversal root continues to delete the entire traversal, including anchors; that is the current root-delete contract.

No new public fake root is needed. Ordinary graph.getRoot remains the original root; detached roots have no incoming discovery edges, parents [], and path [self] until real discovery connects them. They are visible in getVertexRefs, ID lookup, progress, and the original structural snapshot. The runner completes only after all retained work, including detached work, is complete; ordinary root C alone is insufficient.

Depth needs attention: `DagGraphView` subtracts one from every vertex for synthetic-root views. Assign detached roots internal depth 0 in ordinary graphs and 1 in synthetic mode, yielding public depth 0 consistently. Their descendants use the existing parent depth + 1 rule. Do not give synthetic detached roots depth -1 in the public view.

### Effect transport and kernel ownership

Add `RESOLVE_PREREQUISITE` with `{vertexId}` to CallSpec and `MakeVertexResult<T> | undefined` to CallbackValues in `src/core/effects/types.ts`. Add a dedicated `prerequisite` owner kind to OwnerToken. Add optional resolvePrerequisite to BoundSource, bind it with the adapter receiver preserved in bindGraphSource, and dispatch it in createCallbackBindings. Runners pass `hasPrerequisiteResolver` through KernelOptions. Direct kernel unit tests can leave it false by default.

All user calls must pass through `issue`, `CallbackBindings`, and the existing sync/async drivers. The new union member automatically shares the callback concurrency ceiling, promise assimilation, exact rejection handling, and inspection request listing. No promise invocation belongs in GraphScheduling or summary(). `runSync` then retains its exact misuse diagnostic shape: `Synchronous ${runnerName ?? 'runner'} callback RESOLVE_PREREQUISITE returned a thenable`, including cause for throwing then access/call. Test the actual DAG runner name used at the call site.

Use a Map keyed by VertexId for one lookup state per ID: queued, in-flight, found/omitted, or not-found. Store current interested live refs separately or derive demand from the two reverse indexes. Recheck store identity and demand before invocation and again before acceptance. Map/Set use SameValueZero: NaN coalesces, +0/-0 coalesce, undefined/null are distinct, and object/function IDs retain reference identity. No string-key cache or serialized ID keys.

A lookup belongs to the traversal's shared prerequisite demand, not the first requesting node's frame or chain. Deleting one consumer must not invalidate a request still needed by another. If all requesting retained declarations disappear, invalidate/drop a queued lookup and ignore an already-started result; observe its rejection through normal transport. Once a found detached vertex has been accepted, its traversal anchor owns its remaining lifecycle until explicit deletion or whole traversal deletion. Do not garbage-collect it merely because a consumer finished/deleted.

Halt/drain must not start new lookup callbacks. Treat lookup outcomes like current non-chain source outcomes: retain successful/error replies while halted, commit when resumed, and do not materialize graph mutations behind a closed iterator. Failure invalidates lookup owners and pending queued effects. Every path through invalidateRefs, fail, isRequestEligible/isRequestValid, stored outcomes, pending inspection and finish detection needs coverage. Root deletion should invalidate demand before the root-null completion shortcut can leave live source mutations behind it.

### Demand, lazy/eager discovery and coalescing

Queue unresolved IDs from **original retained declarations** in both lists, not only residual unmet work: completedWork seeds skip W execution but still require declaration validation. Do not resolve arbitrary unused completedWork IDs to make seeds valid; unknown unused seed IDs retain their current TypeError.

Prefer ordinary already-available discovery before lookup. In eager mode, drain the current natural discovery wave, then lookup still-unknown prerequisite IDs; each lookup may add vertices, dependencies and a new discovery wave. Eager visitor admission/graph validation waits for this fixed point, all outstanding lookups, and all discovery frames. `isDiscoveryComplete` must include lookup closure, not merely every currently enrolled vertex's closed slots.

In lazy mode, expand/consume already-available frames first, then perform lookup for still-unknown IDs before reporting a stall. Known blocked vertices retain lazy expansion semantics. Resolver results enroll normally: their initial work precedes child expansion unless seeded or eager. A root gated on an external ID is now resolvable without first running root work. A known ancestor/descendant dependency may still need eager discovery if the target can only be discovered beneath blocked work; the hook is not permission to silently convert lazy traversal to eager.

Two requesters, W plus C references, or an ID declared again by a found prerequisite share one outstanding lookup. Cache not-found for the traversal so repeated demand does not cause an infinite callback loop; later ordinary discovery of that ID overrides the negative cache by providing a real store state. Never convert the negative cache to an omitted/deleted tombstone.

Normal async MAKE_VERTEX and lookup can race if the hint has no identity or a callback was already issued. Preserve the existing first-accepted identity semantics: one registered ref and one lifecycle. Recheck known ID on settlement, reuse a live vertex, keep tombstones, and reject an omission/content conflict using the existing error. This preserves the existing asymmetric precedence: live-first then null reuses the original live vertex/content; omitted-first then content rejects with `Error('Vertex omission conflicts with supplied content')`. Apply the same rule to actual lookup results and ordinary discovery; do not introduce a symmetric rejection or change the known-hint linking sentinel. Do not overwrite accepted content/dependencies with a later duplicate. For hint identities known before invocation, defer to an already pending lookup or finish ordinary discovery first so duplicate source work is avoided where possible. Do not promise cancellation of a callback already executing. Distinct lookup completions can follow current callback settlement order; same-ID coalescing must be deterministic.

## W/C validation: why a vertex-only DAG check is insufficient

Construct two canonical milestone tokens for each retained ID: W(id) and C(id). Tokens are objects cached under a Map<VertexId, {work, complete}> so SameValueZero ID semantics are preserved. Reuse the iterative SCC implementation with these object tokens; do not concatenate ID strings.

Use wait-for edges:

1. W(v) -> W(p) for each original dependsOn p.
2. W(v) -> C(p) for each original dependsOnComplete p.
3. C(v) -> W(v) for successful own work.
4. C(v) -> C(child) for each retained linked discovery child.

Closed discovery is a runtime precondition for C, not another public milestone; unresolved/pending slots mean the topology is still partial. Omitted targets do not create wait vertices. Unknown targets stay unknown diagnostics until lookup/discovery closure. Deleted vertices/edges no longer belong to retained-graph validation. Discovery cycles continue to receive GraphStore's existing immediate error.

Analyze **original** edges, even if seeds or earlier successful work have satisfied runtime waits. With eager mode, validate full closure before any visitors. With lazy mode, use milestone-aware diagnostics at a stall and validate known original topology at the existing closure/seed-validation boundary; do not claim pre-admission global validation of undiscovered topology or silently introduce an eager visitor barrier. Existing default-lazy W-only behavior remains unchanged.

Required discriminating examples:

- Legal: parent P discovers C; C defaults to W(P). Edges C(P)->C(C)->W(C)->W(P) are not a cycle. A naive untyped structural-plus-dependency graph wrongly rejects this universal case.
- Legal eager join: P declares W dependency on descendant C, and C explicitly has dependsOn []. The fact P discovers C does not add W(P)->W(C) in both directions.
- Invalid: child C waits for C(P): C(P)->C(C)->W(C)->C(P).
- Invalid: P waits for C(C), while C defaults to W(P): W(P)->C(C)->W(C)->W(P).
- Invalid: self completion dependency W(A)->C(A)->W(A), and mixed longer W/C cycles.
- Legal: A and B each have dependsOn [] and no linked child relationship; a join J has dependsOnComplete [A,B]. Work-order dependencies into either branch do not create extra ownership edges.

Preserve existing DagTraversalStallDiagnostics fields and raw IDs. Project milestone SCCs back to stable, discovery-ordered unique ID arrays for dependencyCycles, deduplicating equivalent projections. Keep dependencies.unmet as the stable union of both unsatisfied sets for backwards compatibility. Add `DagVertexProgress.unmetCompletePrerequisiteIds?: readonly VertexId[]`, present only for vertices whose normalized original completion list is nonempty; its array becomes empty once those gates are satisfied. `unmetPrerequisiteIds` remains the stable union. Existing W-only summary shapes stay unchanged. Avoid changing existing exact diagnostics-object tests with mandatory unrelated empty fields. `structurallyIncompleteIds` still describes structural waits. A known lookup in flight is WAIT, not a missing-ID error; unknown diagnostics are finalized only at the discovery/lookup fixed point.

## Seeds, continuation, pruning and observability

completedWork marks only W; it must not satisfy a completion prerequisite until actual C commits. A seeded composite still expands children and executes ON_COMPLETE; its consumers wait for retained children. Seeded dependents can have prior success independent of prerequisites, but their declarations still undergo lookup/validation. Preserve original cycle/unknown diagnostics even if every W in a cycle is seeded. Omitted seeded IDs are consumed as today. Unknown unused seeds still throw `TypeError('completedWork contains undiscovered vertex IDs')`.

`restoreDagSeed` needs to rebuild W residuals from PRE_VISITED/COMPLETING/COMPLETE and C residuals only from COMPLETE (plus omission). Existing DISCOVERED/READY/PRE_VISITED/COMPLETING/COMPLETE consistency guards must consider both residual sets. Preserve anchor ownership in the injected container. Do not serialize in-flight lookup continuations into the existing data-only DAG seed; either require no active lookup at transfer as existing active work validation does, or explicitly extend its quiescent boundary. Retaining/resuming the same runner should keep negative cache and pending ownership. Rebuilding a fresh runner may repeat lookups, just as callbacks may run again in a fresh traversal.

Deletion traverses both reverse prerequisite indexes. If a prerequisite is already deleted when a new dependent is accepted, immediately tombstone/prune that dependent before scheduling it. Keep shared-child pruning per existing discovery parents, except independent anchors survive loss of those parents. A dependent's completion does not immunize it from existing cascade semantics. Disable-subtree closes pending slots, enabling C based on retained children; it must not pretend an independently retained prerequisite is complete. Eager topology mutation bans remain.

summary()/inspect() remain snapshots: no dequeue, callback, ownership reservation, negative cache creation, validation mutation or pending-reply consumption. Return copied sets/arrays/maps as current methods do. Summary pending/ready classification checks both residual sets. Include detached vertices in discovered/work/subtree counts; hide the synthetic root. A completed ordinary root with outstanding detached work must not produce FINISHED. Existing public graph snapshots preserve structural data without inventing prerequisite edges.

## Generic examples to add

Composite build join (ordinary graph root or catalog; eager for fixed complete topology):

```ts
const definitions = new Map([
  ['pipeline', { vertexId: 'pipeline', dependsOn: [], vertexContent: { $d: 'pipeline', $c: ['bundle', 'publish'] } }],
  ['bundle', { vertexId: 'bundle', dependsOn: [], vertexContent: { $d: 'bundle', $c: ['compile-a', 'compile-b'] } }],
  ['compile-a', { vertexId: 'compile-a', vertexContent: { $d: 'compile-a', $c: [] } }],
  ['compile-b', { vertexId: 'compile-b', vertexContent: { $d: 'compile-b', $c: [] } }],
  ['publish', { vertexId: 'publish', dependsOn: [], dependsOnComplete: ['bundle'], vertexContent: { $d: 'publish', $c: [] } }],
]);
// makeRoot returns pipeline; makeVertex returns definitions.get(hint).
// ON_READY(bundle) may finish before compilation; ON_READY(publish) cannot.
```

Module lookup (lazy, ordinary root), with a reusable local result builder:

```ts
const source = {
  makeRoot: () => ({
    vertexId: 'app', dependsOn: ['module:parser'],
    vertexContent: { $d: 'app', $c: [] },
  }),
  makeVertex: (hint: string) => makeModuleResult(hint),
  resolvePrerequisite: async (id: unknown) => {
    if (typeof id !== 'string') return undefined;
    const definition = await moduleRegistry.find(id);
    return definition === undefined ? undefined : {
      vertexId: id,
      dependsOn: definition.imports,
      vertexContent: { $d: definition, $c: definition.generatedSteps },
    };
  },
};
// Imports are looked up transitively; parser has no fabricated app parent.
// Use dependsOnComplete on app instead when generated child steps must finish.
```

No work-breakdown policy, phase inference, priority, state rollups or domain-specific parsing is required by either example.

## Alternatives and recommendation

1. Reinterpret dependsOn as structural completion: smallest patch but breaks its existing W contract and common parent defaults. Reject.
2. Add only completion dependencies and require callers to synthesize all lookup prerequisites into discovery children/catalog hints: workable for known catalogs, but loses on-demand lookup and creates misleading topology/parent completion. Reject for this request.
3. Implement lookup by invoking adapter code directly in GraphScheduling or summary: avoids one effect but bypasses concurrency, halt, rejection identity and inspection. Reject.
4. Add a generic public milestone DSL, prerequisite descriptors, dependency graph ports and custom ownership policies: flexible but much larger than the two approved features. Defer.
5. Recommended: one additive completion list, one optional ID resolver, W/C scheduler indexes and SCC validation, one new effect/owner, and a real detached insertion/anchor path. Reuse every existing lifecycle and transport mechanism.

## Concrete test and verification map

- `tests/graph-readiness.test.ts`: conjunctive W/C gates, same ID in both, W alone unchanged, explicit empty lists, root compatibility matrix, inherited default parent W, detached no-parent default, omission/mismatch/deleted acceptance.
- `tests/graph-completion.test.ts`: C only on commit, async completion callback held, duplicate child slots counted once each, shared children, seeded own W with incomplete child, disabled slots.
- New `tests/dag-completion-dependencies.test.ts`: legal composite join, forbidden self/ancestor/mixed milestone cycles, legal parent/child defaults, original cycles despite completedWork, stable diagnostics with opaque IDs.
- New `tests/dag-prerequisite-resolution.test.ts`: sync/async source typechecks, lazy root lookup, eager fixed point before visitors, missing versus omitted, transitive lookup, W/C shared lookup, ordinary discovery winning a race, content conflict, returned ID fallback/mismatch, negative-cache superseded by real discovery, no-hook exact baseline.
- New `tests/async-dag-prerequisite-lifecycle.test.ts`: finite concurrency, delayed success/error, exact arbitrary rejection values, coalesced requests from several dependents, one/all consumer deletion, queued versus started invalidation, halt/drain/resume, stored reply, iterator return, global failure, no work after root deletion.
- `tests/graph-pruning.test.ts`: C dependents cascade, newly accepted references to deleted IDs, anchor surviving discovery-parent removal, anchor's ordinary child pruning, root deletion clears anchors, no resurrection by late lookup.
- `tests/graph-container.test.ts`, `tests/resolved-graph.test.ts`, `tests/dag-synthetic-root.test.ts`: detached snapshot stage/commit, no fake root/edge, parent/path/depth projection, synthetic root remains hidden, true catalog duplicate contract.
- `tests/dag-progress-seed.test.ts`, `tests/dag-configuration.test.ts`: W seed never C seed; unknown unused seeds not resolved; restore all milestone combinations and invalid seed branches; detached-anchor ownership retained.
- `tests/dag-summary.test.ts`, `tests/core-inspection.test.ts`: summary before drive and during delayed lookup makes zero calls/changes; detached and completion gates visible; repeated summary cannot consume queues or outcome; discovery.complete false while lookup pending.
- `tests/graph-api.typecheck.ts`, `tests/public-api.typecheck.ts`: optional sync hook and async promise-like hook, new result metadata, existing adapters still typecheck, exported types reachable through existing package surfaces.
- Preserve tree metadata-ignorance compatibility test; change only the graph unsupported-metadata test for dependsOnComplete, leaving priority coverage.
- Add focused kernel/driver tests for every new CallSpec/owner branch, malformed/duplicate reply handling, not-found state, tombstones, empty dependents and throwing thenable accessor/call.

The repo's `jest.config.ts` requires 100% statements, branches, functions and lines across `src/**/*.ts`. Retain the thresholds; do not add coverage ignores or tests that merely mirror implementation. Use externally observable lifecycle/callback/status assertions, with direct kernel tests for transport-only cases. After implementation run targeted tests, then `npm run check` (typecheck, lint, full coverage, examples, package export smoke checks and benchmark tests). Inspect actual coverage for all added branches before claiming 100%.

## Validation and integration gates

Implement completion prerequisites first, then lookup against that reviewed contract. Both get behavioral RED/GREEN tests,100%source coverage, full npm run check, independent review and Node22/24 CI before merge. Keep docs/CHANGELOG Unreleased accurate. Extend packed type/runtime consumers for the new contracts; do not publish a new npm version as part of this stage. Stage explicit product files only, never ignored reports.
