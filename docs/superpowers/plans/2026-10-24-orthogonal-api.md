# Orthogonal CTT API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all ten findings from the approved post-PR16 API review.

**Architecture:** Normalize public configuration at shared boundaries; keep one
kernel for sync/async lifecycle. Separate event selection, callback selection,
completion ownership, callback ordering, command commit timing, and query/edit
ownership. Preserve generic host boundaries.

**Tech Stack:** TypeScript, Jest, Node, existing CJS/ESM package verifiers.

**Spec:** `docs/superpowers/specs/2026-10-24-orthogonal-api-design.md`

## Global Constraints

- Keep CTT generic. Agent dispatch, business outcomes, claims, retries, and durable storage belong to the host.
- Preserve arbitrary ID identity, explicitly supplied undefined IDs, exact thrown values, W versus C dependencies, and shared CJS/ESM runtime and declaration identity.
- Node remains >=22.12.0; verify Bun 1.4.4 and minimum TypeScript 4.7.4 consumers.
- Keep 100% source statements/branches/functions/lines coverage. Do not weaken checks.
- Package version remains 0.11.0; no npm publication or dependency changes.
- Canonical vertex fields remain `$data` and `$childHints`. Do not rename structural child refs to hints.
- Preserve unrelated local files. The worktree node_modules symlink must not be staged.
- No worker spawns agents or merges/pushes/publishes. Controller handles independent reviews and integration.

## Task 1: Independent execution selectors (finding1)

**Files:** create `src/core/normalizeTraversalExecutionOptions.ts`;
modify `src/core/TraversalRunnerIterableConfig.ts`, `CoreInspection.ts`,
`TraversalKernel.ts`, `AsyncCoreExecution.ts`, `kernelTypes.ts`,
`drivers/AsyncRunnerSession.ts`, `core/index.ts`; the sync/async runner files
and `*TraversalRunnerIterableConfig.ts` in all three traversal families.
Tests: new `tests/execution-selection.test.ts`,
`tests/execution-selection.typecheck.ts`, affected iterable/async-session suites.

**Interfaces:** Produce VisitorPhaseSelection, TraversalExecutionOptions, shared
public input normalization for canonical and deprecated fields, and canonical
effective inspection fields. Later tasks consume the normalized execution config
and must preserve patch semantics/chain snapshots.

- [ ] Write all-six-family regressions using a one-root real adapter and callbacks. Exercise canonical include/exclude/all, independent emission, empty lists, legacy enable precedence, resume field patching, caller array isolation, invalid phases, mixed alias rejection, and active-chain config snapshots.

```ts
// Real visitor must run although legacy lists contradict each other.
runner.run({ enableVisitorFunctionsFor: [phase], disableVisitorFunctionsFor: [phase] });
expect(calls).toEqual(['root']);
// An emission-only resume must retain the previous disabled callback selector.
const iterator = runner.getIterable({ visitorPhases: { include: [] } });
iterator.next(); iterator.return();
runner.run({ emitPhases: [] });
expect(calls).toEqual([]);
```

- [ ] Add public compiler cases for actual phase inference and invalid include+exclude, conflicting canonical/legacy fields, wrong family phases, and readonly input arrays. Run focused test/typecheck to observe missing API/incorrect legacy behavior before implementation.
- [ ] Implement one field-wise normalizer. Preserve old effective fields if required by internal contracts; do not duplicate the selector truth table in family runners. Validate before configuration/state mutation; copy arrays and patch only the supplied concern. Carry canonical inspection fields through paused chains.
- [ ] Run focused selectors/iterable/session/driver tests, normal typecheck and lint, then full source coverage once. Fix meaningful gaps without lowering gates.
- [ ] Commit and report red/green evidence, changed public types, and exact legacy migration semantics for Task7; obtain task review.

## Task 2: Completion ownership and stop reasons (findings2,8)

**Files:** `src/core/TraversalKernel.ts`, `kernelTypes.ts`, `CoreInspection.ts`,
`TraversalRunner.ts`, `AsyncCoreExecution.ts`, `drivers/AsyncRunnerSession.ts`,
`effects/types.ts`; DAG sync/async configs/classes/runners and all six public
runner getStopReason methods. Tests: new `tests/external-completion-policy.test.ts`,
`tests/stop-reasons.test.ts`, public type assertions; affected deferred/async suites.

**Interfaces:** Consumes Task1 normalized options. Produces workCompletion
configuration and TraversalStopReason/getStopReason plus inspection.stopReason.
No additional deferral token protocol: reuse existing symbol generations/settle.

- [ ] Write empty-visitor frontier regressions for sync/async DAG, graph and tree source modes, lazy/eager where supported. Use a flat synthetic catalog with A -> B dependencies and prove A is deferred, B gated, and no work completed until guarded settle.

```ts
const traversal = new DagTraversal({ traversableGraph: source,
  discovery: 'eager', syntheticRoot: true, workCompletion: 'externalSettlement' });
const runner = traversal.makeRunner().run();
expect(runner.summary().completedWorkIds).toEqual([]);
expect(runner.summary().deferredIds).toEqual(['A']);
expect(runner.getStopReason()).toBe('awaitingSettlement');
const generation = runner.summary().vertices.get('A')!.generation!;
runner.settle('A', {kind:'workCompleted'}, generation);
runner.run();
expect(runner.summary().deferredIds).toEqual(['B']);
```

- [ ] Test callbacks/commands still execute in external mode; filtered callbacks cannot auto-complete; explicit DEFER remains early/exclusive and does not mint two generations. Cover seeded work, synthetic root, W/C joins, halt/resume, deletion, failure, exact errors, and async capacity/draining.
- [ ] Test stop reasons INITIAL/RUNNING null, requested pause, iterator close, awaitingSettlement, finished, failed, resumed clearing, and retained reason after settlement before resume. Include sync/async tree/DAG shared APIs and inspection parity. Add invalid policy type/runtime tests; observe focused red runs.
- [ ] Implement a shared normal-chain external deferral transition after committed commands, reuse explicit deferral state/generation machinery, and store stop causes at actual boundaries. Do not change return shape of run or existing status enum.
- [ ] Run focused lifecycle/selectors tests, typecheck/lint, and full coverage once; commit/report and obtain task review.

## Task 3: Uniform visitor definitions and ordered groups (findings4,7)

**Files:** `src/core/TraversalVisitor.ts`, `Traversal.ts`, `graph/types.ts`,
`executeVisitors.ts`, `CoreInspection.ts`, `TraversalKernel.ts`, `kernelTypes.ts`,
`visitors/VisitorChain.ts`, `visitors/types.ts`; create focused
`src/core/visitors/normalizeVisitorDefinitions.ts`; all six traversal classes,
family visitor/config/init-helper/helper modules and runner bindings.
Tests: new `tests/visitor-definitions.test.ts`, `tests/visitor-groups.test.ts`,
`tests/visitor-definitions.typecheck.ts`; existing phase/reuse/chain/commands tests.

**Interfaces:** Produce phase-specific VisitorDefinition, VisitorGroupDefinition,
VisitorPhaseInput and addVisitorGroupFor. Existing list APIs retain normalized
typed records, including stable group metadata necessary for list/set round trips.
Consumers use the same input shape in classes/helpers/replacement. Task2 external
completion must still occur only after the full normally completed chain.

- [ ] Write positive runtime/type tests for a callback, one definition, arrays, and explicit groups in constructor/configure/set/helper maps across all six families; addVisitorFor shorthand and addVisitorGroupFor must agree. Require no manual addedIndex/priority. Preserve broad callbacks and negative phase restrictions, including union keys and list/set producer safety.

```ts
const visitors = { [Order.ON_READY]: {
  groups: [
    {commandCommitMode:'afterGroup', visitors:[{visitor:a, priority:1}, b]},
    {commandCommitMode:'afterEachVisitor', visitors:[{visitor:c, priority:999}]},
  ],
}};
// Constructor and canonical helper accept the same map.
new DagTraversal({traversableGraph: source, visitors});
traverseDag({traversableGraph: source, visitors});
```

- [ ] Reproduce old batching reordering with flat priority1000 afterEach and priority1 afterGroup; intended callback order is high then low. Test explicit group order wins across groups; priority/stable registration sorts within groups; legacy flat afterGroup entries form contiguous post-sort batches. Test replacing/configuring/appending and full list/set round trips preserve group boundaries.
- [ ] Test command visibility/buffering, committed chain state, halt/resume, deletion, explicit deferral rollback of only current uncommitted batch, and external completion after all groups. Reject invalid mixed group policy before mutating configuration. Observe focused red evidence.
- [ ] Implement central definition normalization and explicit ordered batch execution. Remove partition-by-mode scheduling; do not use any/bivariance to accept phase-unsafe callbacks. Keep records distinct from caller definitions and avoid repeating normalization in six classes. Report architectural ambiguity to controller before implementing an exception.
- [ ] Run affected registration/chain/commands/lifecycle tests, strict source typecheck/lint/full coverage. Build and run packed minimum-TS consumers plus direct new phase/definition fixtures against generated declarations on TS4.7.4. Commit/report and obtain independent review.

## Task 4: Source capabilities and object resolution hooks (findings3,9)

**Files:** `src/core/TraversableTree.ts`, `AsyncTraversableTree.ts`,
`TraversableGraph.ts`, `ResolvedTree.ts`, `drivers/normalizeSourceResult.ts`,
`drivers/callbackBindings.ts`, `scheduling/GraphScheduling.ts`, core exports;
object adapter/config and `src/tools/rewrite-object/rewriteObject.ts`.
Tests: new `tests/tree-source-capabilities.test.ts`,
`tests/tree-source-capabilities.typecheck.ts`, `tests/object-resolution-hook.test.ts`,
plus source/identity/thenable/object suites and affected fixtures.

**Interfaces:** Tree result types and ObjectVertexHookResult/resolveVertexHook
exactly as spec. Graph result names stay valid, internal normalized results
stay graph-capable, and Task7 consumes the canonical hook for docs/examples.

- [ ] Add strict type tests rejecting tree vertexId/dependsOn/dependsOnComplete in tagged/untagged/omitted results, including pretyped functions. Graph results retain all fields and explicit undefined identity. Runtime unsafe-source cases must reject all three metadata fields across six families/tree mode, rather than silently ignoring completion prerequisites.

```ts
const tree: TraversableTree<T> = {
  // @ts-expect-error Graph identity is not a tree source capability.
  makeRoot: () => ({kind:'found', vertex:{vertexId:'A', vertexContent: content}}),
  makeVertex: () => ({kind:'omitted', satisfiesDependencies:true}),
};
expect(() => unsafeTreeRunnerWithCompleteDependency.run()).toThrow(/graph metadata/);
```

- [ ] Write object-hook behavior tests for useDefault/found/omitted, malformed results, cycle detection, exact data/hint identity, hook conflicts, legacy returnMe equivalence, and rewriteObject forwarding. Test real reconstructed output, not only hook invocation.
- [ ] Observe focused red runtime/compiler evidence; introduce capability-specific tree types, shared validation, and canonical hook normalization. Update built-in annotations and legitimate fixtures. Do not weaken graph identity or thenable diagnostics.
- [ ] Run focused source/object/prerequisite tests, typecheck/lint, full source coverage; commit/report migration annotations and obtain review.

## Task 5: Typed mutation input boundaries (finding5)

**Files:** `src/core/MakeMutationCommandFunctionFactory.ts`, object adapter
`lib/makeMutationCommandFactory.ts`, `src/tools/rewrite-object/rewriteObject.ts`
only where helper types need adjustment; public exports/type fixtures.
Tests: new `tests/mutation-builder.typecheck.ts`, affected object coverage/regressions.

**Interfaces:** Generic replacement input uses output VertexData; object helper
uses named partial property patch input. Preserve command output discrimination
and existing supported rewrite callback shape.

- [ ] Add strict tests against the actual factory-returned helper: wrong key type, wrong value type, null/primitive patch, and incorrect generic full replacement fail; key-only/value-only/full object patches and explicit undefined where permitted pass.

```ts
// For an object helper whose output data is {key:string,value:number}:
makeMutationCommand({rewrite:{value:3}});
// @ts-expect-error Output data value must be numeric.
makeMutationCommand({rewrite:{value:'wrong'}});
// @ts-expect-error A null patch is not a property update.
makeMutationCommand({rewrite:null});
```

- [ ] Runtime malformed patch cases throw clear TypeError before mutation; preserve exact user assembler errors, deletion/NOOP semantics, primitive values, and legitimate output assembly. Observe red tests before implementation.
- [ ] Replace any-erased public builder input with meaningful generics/object patch aliases; remove factory type erasure without unsafe callback variance escape. Do not add runtime generic-type guesses.
- [ ] Run focused object/rewrite/typing checks, lint, full coverage; commit/report and obtain review.

## Task 6: Read-only tree views and identity names (findings6,10)

**Files:** `src/core/ResolvedTree.ts`, new `src/core/ResolvedTreeView.ts`,
`src/core/CTTRef.ts`, `ResolvedGraph.ts`, `graph/GraphStore.ts`,
`graph/snapshot.ts`, core exports, all six runners where tree queries are exposed.
Tests: new `tests/tree-query-ownership.test.ts`, new public view/identity type cases;
existing tree/container/graph/snapshot/identity tests.

**Interfaces:** ResolvedTreeView/asReadOnly/getResolvedTreeView and canonical
getRefId/getVertexId/getVertexRefById aliases. Graph-mode DAG tree view returns
null wherever the corresponding mutable tree getter returns null; tree runners
return a live stable query facade. Task7 uses canonical read/identity names.

- [ ] Reproduce child-array topology corruption and context mutation. Test detached arrays/contexts through old query methods and the new facade; assert child/parent/path invariants stay unchanged. Test live view updates after explicit supported edits and saved-tree isolation, keeping shallow refs/data identity.

```ts
const children = tree.getChildrenOf(root)!;
children.length = 0;
expect(tree.getChildrenOf(root)).toEqual([child]);
expect(tree.getParentOf(child)).toBe(root);
const view = tree.asReadOnly();
// @ts-expect-error Query facade exposes no delete operation.
view.delete(child);
```

- [ ] Add identity tests for explicit string/undefined/object/symbol IDs, tree-generated identities, unknown IDs, and snapshot/facade aliases; canonical and old methods return identical refs/IDs. Check CTTRef constructor/alias identity across public declarations.
- [ ] Implement detached public query results and readonly live facade; preserve explicit mutable records/edit methods. Add canonical identity names using shared implementations, deprecate aliases, and avoid allocating inconsistent facade identities.
- [ ] Run focused core/tree/graph/identity tests, typecheck/lint, full coverage; commit/report and obtain review.

## Task 7: Agent-first migration and full integration (all findings)

**Files:** README.md, AGENTS.md, CHANGELOG.md Unreleased, docs/reference.md,
docs/agent-workflows.md, docs/index.md, docs/testing.md,
docs/migration-uniform-api.md, applicable examples/*.ts,
scripts/package-consumers/uniform-api.mjs and .ts, scripts/verify-package.cjs.

**Interfaces:** Current docs use canonical selectors, externalSettlement,
stop reasons, visitor definitions/groups, capability-specific sources, typed
mutation helpers, safe tree views, canonical hooks and identity names.

- [ ] Change external-agent examples to explicit workCompletion instead of mandatory sole-DEFER boilerplate; retain one explanatory explicit-deferral example. Show visitor/class/helper common definitions and explicit group boundaries. Explain remaining DEFER/HALT distinctions and CTT/host ownership.
- [ ] Extend the packaged migration guide for all ten corrections, including field-wise execution updates/enable precedence, corrected flat callback order, group policy ownership, source annotation changes, query detachment, typed patches, hook aliases, stop reasons, and ID spaces. Preserve old anchors and historical release facts; mark this as unreleased without changing package version.
- [ ] Extend packed runtime and strict compiler fixtures to cover canonical and compatibility forms in both loaders. Execute all top-level examples and complete standalone guide snippets; audit repository/packed links and anchors. No tests that merely assert new code text.
- [ ] Run npm run check, then exact Node22.12/Bun1.4.4/minTS4.7.4 packed consumers and Bun script suites. Existing paths may be reused after --version validation: `/home/df/.npm/_npx/f6c81a5e22bed22a/node_modules/node/bin/node`, `/tmp/ctt-next-evidence/bun-1.4.4/bun-linux-x64/bun`, `/tmp/ctt-next-evidence/typescript-4.7.4/node_modules/typescript/bin/tsc`. Preserve100% source coverage.
- [ ] Commit/report an evidence-backed ten-finding acceptance table. Controller obtains final whole-branch review, resolves findings, pushes/merges under standing authorization, and verifies local/remote main. No npm publication.
