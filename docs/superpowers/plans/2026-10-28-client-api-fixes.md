# Client API findings implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all twenty client API findings with consistent, type-safe public contracts.

**Architecture:** Keep the shared state-machine core, project constrained public views from internal stores, and normalize policies at public boundaries. Apply breaking migrations to every source consumer, example and packed consumer rather than retaining confusing aliases.

**Tech Stack:** TypeScript, Jest, existing ESLint/build and packed CJS/ESM consumers.

**Spec:** docs/superpowers/specs/2026-10-28-client-api-fixes-design.md

## Global Constraints

- Work in the existing isolated feat/api-clarity-migration worktree; baseline b51fa3638822186197f3b6b19e2b76cd2b259f2a.
- Implement all F01–F20; breaking API removals are authorized. No compatibility aliases for removed confusing APIs.
- Preserve host-owned dispatch/retries/outcomes/storage, opaque payload and arbitrary ID identity, and exact callback-thrown values.
- Preserve callback admission order, work/subgraph milestone distinctions, cooperative pause and ESM/CJS constructor/declaration identity.
- Retain the current TypeScript floor unless demonstrated necessary; do not weaken coverage thresholds.
- Read AGENTS.md and the task's relevant source/tests before changes. Use focused public tests/type fixtures first for meaningful behavior/type changes; retain RED/GREEN evidence in the report.
- Migrate affected source/tests/examples/packed fixtures and current docs in each task. Historical review/plan artifacts are immutable evidence, not current consumers.
- Run focused checks while iterating; run typecheck and the source test suite once at the task boundary. The final integration task owns npm run check and coverage closure.
- Commit only task-scoped files. Preserve unrelated original-checkout changes and pre-existing untracked review artifacts. Do not push, merge or publish under this goal.

### Task 1: Honest object discovery and rewrite domains (F01, F02)

**Files:** src/traversable-tree-implementations/traversable-object-tree/{TraversableObjectTree.ts,index.ts,lib/ObjectCurrentVertexTypes.ts,lib/TraversableObjectTreeInstanceConfig.ts,lib/createRootPropertyMapper.ts,lib/getChildrenOfPropertyDefault.ts,lib/makeMutationCommandFactory.ts}; src/tools/rewrite-object/{rewriteObject.ts,index.ts}; src/index.ts; affected object/type/example/packed consumers; docs/reference.md and a migration section.

**Interfaces:** Consumes existing TreeSource and mutation command protocols. Produces unknown current/assembled domains, convertRootValue and a precise ObjectTreeSource.fromProperties route. Replacement OutV remains typed. Later tasks will rename the child hook and mutation request, so keep those unchanged here.

- [ ] Add strict type regressions for unsafe narrow default sources, missing one of the required mapping callbacks, output-only converters, and mixed assembly. Assert intended failures with @ts-expect-error, including spread/pretyped option bags. Add runtime regressions for retained input and mixed reconstructed arrays using actual source/rewriter.

```ts
const result = rewriteObject([1, 2], {
  rewrite: p => p.key === 1 ? {rewrite: {value: 'two'}} : undefined,
});
expect(result.getOutput()).toEqual([1, 'two']);
// A consumer must narrow a current/assembled value before string operations.
const precise = ObjectTreeSource.fromProperties(1, {
  getRootPropertyFromInputObject: value => ({key: 'root' as const, value}),
  getChildrenOfProperty: () => [],
});
expect(precise.resolveRoot().vertex.vertexContent.$data.value).toBe(1);
```

- [ ] Run the focused object regressions and npm run typecheck; record expected missing API/unused-expect-error/type or runtime failures before implementation.
- [ ] Implement spec F01/F02 throughout public types and helpers. Use conditional required adapters or equivalent sound overloads so explicit narrow constructor generics cannot bypass fromProperties. Unknown raw/current/assembled types are mandatory even for mixed containers; default output can only be asserted via rewriteObjectAs. Preserve converter completion context and cache semantics.
- [ ] Migrate affected consumers by real narrowing or truthful adapters, not casts that hide the new contract. Run typecheck, focused object tests and source suite; self-review and commit.

### Task 2: Explicit object rewrite operations and assembly policies (F10, F11, F15, F16)

**Files:** src/core/MakeMutationCommandFunctionFactory.ts; src/traversable-tree-implementations/traversable-object-tree/{TraversableObjectTree.ts,index.ts,lib/makeMutationCommandFactory.ts,lib/TraversableObjectTreeInstanceConfig.ts}; src/tools/rewrite-object/rewriteObject.ts; generic binder consumers; tests/object*.test.ts and relevant type assertions; docs/reference.md, examples and packed consumers.

**Interfaces:** Consumes Task 1 unknown current/assembled values and truthful mapping routes. Produces tagged mutation requests, resolveChildHook, arrayIndexPolicy and propertyCollision. Later option-boundary validation must accept these policy keys.

- [ ] Write public behavior/type tests before implementation: default collision rejection, normalized number/string collision, distinct symbols, explicit first/last wins, array compaction versus preserved holes/indices (including original/deletion-created trailing holes and length max(original intrinsic length, highest assigned index+1)), invalid preserved indices, custom assembler precedence, malformed/conflicting requests and child-only hook behavior.

```ts
expect(() => rewriteObject({a: 1, b: 2}, {
  rewrite: p => p.key === 'b' ? {kind: 'rewrite', patch: {key: 'a'}} : undefined,
})).toThrow(TypeError);
expect(rewriteObject([10, 20], {
  arrayIndexPolicy: 'preserveNumericKeys',
  rewrite: p => typeof p.key === 'number'
    ? {kind: 'rewrite', patch: {key: p.key + 2}} : undefined,
}).getOutput()).toEqual([, , 10, 20]);
```

- [ ] Run focused regressions and typecheck, record expected RED output.
- [ ] Implement generic {kind:'rewrite',value}|{kind:'delete'}|{kind:'keep'} and object patch specialization. Validate operation shape before effects; omission preserves default assembly. Rename child hook/result, rejecting old names. Add built-in placement/collision policies with a shared property-key normalization path and custom-assembler precedence; preserve opaque data.
- [ ] Migrate all affected source/tests/examples/packed consumers/docs; run focused tests, typecheck and source suite, self-review and commit.

### Task 3: Consistent configuration validation and tagged in-order positions (F04, F05, F13)

**Files:** src/core/assertPublicOptions.ts, src/core/ResolvedTree.ts and tree/graph/original path-query implementations; src/traversals/depth-first-traversal/{DepthFirstTraversal.ts,AsyncDepthFirstTraversal.ts,lib/*Config.ts,in-order-helpers/*}; src/traversals/breadth-first-traversal builders/configs; DAG/walking public normalizers/helpers as needed; object constructor/rewrite boundary; relevant option/type/regression tests; docs/reference.md and examples.

**Interfaces:** Consumes supported policy keys from Tasks 1–2. Produces schema-specific own-key validation and missing/undefined-retains patch semantics. ChildIndexSelection becomes {indices}|{ranges}. Future tasks add walking hydration; validate source wrappers at their source normalizer rather than treating source methods as options keys.

- [ ] Add focused public regressions for optional/pretyped patches, nested undefined, rejected unknown string/symbol keys, no callback before rejection, atomic failed configure and all three families. Add selection tests for indices [0,2] versus inclusive range 0..2, negatives and all-out-of-bounds fallback.

```ts
const traversal = new DepthFirstTreeTraversal({traversableTree: new ObjectTreeSource(1)});
traversal.configure({traversableTree: undefined, inOrder: {afterChildIndices: undefined}});
expect(traversal.createRunner().run().getStatus()).toBe(TraversalRunnerStatus.FINISHED);
expect(() => traversal.configure({unknownPolicy: true} as never)).toThrow(TypeError);
// Accepted new syntax: {afterChildIndices: {indices: [0, 2]}};
// Inclusive interval: {afterChildIndices: {ranges: [{from: 0, through: 2}]}}.
```

- [ ] Run focused regressions/typecheck to establish RED.
- [ ] Replace blacklist-only validation with reusable own-key validation plus per-boundary accepted schemas. Keep constructor execution-default placement as currently supported, reject unsupported policy requests. Helpers project supported subsets. Merge only defined values, validate candidate atomically, and implement tagged positions with existing ordering/fallback semantics.
- [ ] Update consumers and docs; run typecheck, focused families and source suite; self-review and commit.

### Task 4: Precise DAG preparation, completion, tickets and progress (F07, F08, F12, F14; tree/DAG part of F19)

**Files:** src/traversals/dag-traversal/{prepareDag.ts,coordinateDag.ts,lib/DagDefinition.ts,lib/DagProgress.ts,lib/DagInspection.ts,lib/DagTraversalInstanceConfig.ts}; src/core/TraversalKernel.ts and engine cycle-origin tracking; src/core/CoreInspection.ts; relevant DAG tests/type assertions, examples, packed consumers and docs.

**Interfaces:** Produces discoveryCycle preparation issue, afterWorkReadyChain literal, type-only nominal DagWorkTicket, required W/C progress arrays and sortChildrenHints diagnostic operation. F09 later changes buffered event delivery, not completion/admission semantics.

- [ ] Write regressions for sync/async engine cycles returning invalid with ordered closed IDs, exact source-thrown same-class errors escaping unchanged, zero/filtered visitor automatic completion, required progress arrays for overlapping W/C IDs, and ticket-spread compiler rejection plus retained runtime provenance validation.

```ts
// For a source with a -> b -> a structural discovery:
expect(prepared.kind).toBe('invalid');
// Preserve the engine's closed witness exactly; existing a -> b -> a discovery emits ['b','a','b'].
// @ts-expect-error copying drops the private nominal ticket identity
session.completeWork({...ticket});
```

- [ ] Establish focused RED evidence. Implement provenance tracking without class-name/instanceof-only conversion of arbitrary source errors. Rename/reject completion literal consistently; make engine output arrays mandatory/empty; use opaque declared tickets without runtime constructors. Align sorter operation labels.
- [ ] Migrate all affected consumers, type fixtures and current docs; run typecheck, focused DAG sync/async tests and source suite; self-review and commit.

### Task 5: Explicit walking hydration and reusable catalog contracts (F06, F18; walking part of F19)

**Files:** src/traversals/graph-walk/{GraphWalkSource.ts,walkSourceFrom.ts,index.ts,lib/normalizeWalkOptions.ts,lib/WalkKernel.ts,GraphWalkOperation.ts} and all walking adapters; src/index.ts; tests/graph-walk-*.test.ts and type fixtures; examples, packed consumers and current guides.

**Interfaces:** Produces GraphWalkSource/AsyncGraphWalkSource hydration union and named GraphWalkRecordSelectors/AsyncGraphWalkRecordSelectors/GraphWalkCatalogLink. Preserve family-safe execution capabilities and admission cache semantics.

- [ ] Add strict source contract assertions: resolver mode requires resolveVertex; inlineOrCached mode requires tagged inline/cached targets and forbids non-undefined resolver values while explicitly permitting undefined field/getter values in runtime and exact-optional types. Add sync/async runtime cases for omitted inline resolutions, first-use cached rejection, inline root with ID-only cached self/backedge, rejected links not seeding cache and first-resolution wins.

```ts
const source = {
  hydration: 'inlineOrCached' as const,
  roots: () => [{kind: 'inline' as const, vertexId: 'a', resolution: {kind: 'found' as const, data: 'a'}}],
  outgoing: () => [{target: {kind: 'cached' as const, vertexId: 'a'}, data: 'back'}],
};
expect(new GraphWalk({source}).createRunner().run().summary().counts.uniqueFoundVertices).toBe(1);
```

- [ ] Record focused RED evidence. Implement union/normalization/admission validation, retaining cache-first behavior and exact source failures. Materializers/adapters explicitly use resolver mode. Export named readonly selector/link contracts, preserving async materialization returning reusable synchronous sources. Rename walking visitor operation to visit.
- [ ] Migrate all walking consumers/current docs; run typecheck, focused walking tests and source suite; self-review and commit.

### Task 6: Restricted observation capabilities and view vocabulary (F03, F17, F20)

**Files:** src/core/{CTTRef.ts,Vertex.ts,ResolvedTreeView.ts,ResolvedGraph.ts,ResolvedTree.ts,TraversalVisitor.ts,TraversableTree.ts,TraversableGraph.ts,TraversalKernel.ts,graph/types.ts,index.ts}; tree/DAG runner capabilities, view factories and callback/source adapters; object helpers; public event/context records and all affected consumers.

**Interfaces:** Consumes existing stable internal refs. Produces exported VertexHandle<T>/VertexView<T>, runtime restricted facades with stable canonical identity and readonly detached hint collections; ResolvedGraphView/getResolvedGraphView/resolvedGraphView; tree callback/source resolvedTreeView. Commands accept public handles and resolve authority privately. Explicit mutable stores remain separately named capabilities. Remove independent traversal-root predicates from supported surface.

- [ ] Add public sync/async tree/DAG regressions proving query, callback, event and source contexts cannot edit through setValue, vertex setters, hint arrays or store methods; assert runtime absence/frozen detached collections and compile-time rejection. Preserve getRefId, SameValueZero/object/symbol/undefined ID behavior, stable handle identity across views/events/commands, command rewriting/deletion and shallow data identity. Test original views and detached resolution contexts too.

```ts
const handle = runner.getResolvedTreeView().getRoot()!;
expect('setValue' in handle).toBe(false);
expect('setData' in handle.getValue()).toBe(false);
expect(Object.isFrozen(handle.getValue().getChildrenHints())).toBe(true);
// @ts-expect-error observation handles do not edit the store
handle.setValue(new Vertex({$data: 1, $childHints: []}));
```

- [ ] Record focused RED evidence. Introduce canonical facade/wrapper identity mappings and private unwrap logic; update context projection instead of exposing internal stores, and preserve original identity tracking for object cycle errors without mutable context access. Restrict every public record/callback/source route, not just main getters. Rename graph view APIs and remove traversal-start flags while preserving family root semantics.
- [ ] Migrate callers to commands or explicit stores; update guides/type/packed fixtures. Run typecheck, focused tree/DAG source/view/mutation tests and source suite; self-review and commit.

### Task 7: Uniform delivery-time event selection (F09)

**Files:** src/core/{TraversalKernel.ts,TraversalRunner.ts,drivers/*}; tree/DAG sync/async iterator sessions/capabilities; tests/async-runner-session.test.ts, tests/async-driver.test.ts, event-selection type assertions and DAG settlement tests; docs/reference.md and workflow examples.

**Interfaces:** Consumes Task 6 public handles and all family emission kinds. Produces delivery-time filtering for buffered and new events, sound selected iterator result types; callback admission policy remains independently snapshotted.

- [ ] Add a cross-family sync/async public regression that buffers an observation, pauses, resumes with another emitEvents selection and sees only newly selected kinds. Assert callbacks occur once, committed DAG work is not replayed, settlement-generated events obey selection and independent visitorPhases do not change. Include empty/default selection and terminal/paused behavior.

```ts
// Resume an iterator with emitEvents selecting only the desired kind.
// Even events buffered under the previous lease must be tested at delivery.
expect(delivered.map(event => event.kind)).toEqual(['subgraphCompleted']);
expect(workCallbackCount).toBe(1);
```

- [ ] Run affected regression/type tests to establish RED. Filter at iterator delivery, consistently for sync/async buffered queues and deferred settlement events; do not alter callback admission snapshots or generate events by rerunning work. Narrow explicit selections in capability/runner types where sound.
- [ ] Migrate old admission-timing expectations and docs with a clear breaking note; run typecheck, affected family/iterator tests and source suite; self-review and commit.

### Task 8: Complete migration, packaging, coverage and evidence

**Files:** README.md, docs/{reference.md,agent-workflows.md,index.md,migration-client-api.md,testing.md}, AGENTS.md where stale, package.json files list, examples/*.ts, scripts/verify-package.cjs, all affected consumer/type/behavior fixtures; docs/superpowers/reviews/2026-10-28-client-api-fixes-completion.md.

**Interfaces:** Consumes all seven implementation tasks. Produces a packaged migration guide, reconciled current documentation, green npm run check and a twenty-row requirement/evidence matrix. No release-status noise, historical rewrites, API aliases or waived requirements.

- [ ] Inspect every F01–F20 requirement against source/current consumers. Fill concrete gaps; add meaningful regression cases for uncovered validation/behavior branches, never test-only production APIs or weaker gates. Remove stale symbols in current guides and package fixtures; historical plans/reviews retain their original vocabulary.
- [ ] Add migration guide showing old/new equivalents, policy defaults and temporal/cache/output limitations, link it from docs/index.md, include it in package files and preserve existing section anchors.
- [ ] Run npm run check; resolve failures, coverage gaps and packed runtime/type identity issues. The required result is all stages exit 0 with 100% source coverage. Confirm packed guides' relative links and examples.
- [ ] Record each finding's implemented contract, concrete source/test and command evidence in the completion matrix. Self-review, commit and report exact check results plus any unresolved issue; do not mark a finding complete using a naming search alone.
