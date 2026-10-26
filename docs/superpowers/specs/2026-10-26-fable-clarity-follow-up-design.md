# Fable clarity follow-up design

Authorization: the active user goal delegates implementation and merge of Fable improvements we deem valid. This follow-up addresses the [re-review](../reviews/2026-10-26-api-clarity-fable-rereview.md) using its [maintainer assessment](../reviews/2026-10-26-api-clarity-fable-rereview-assessment.md). Baseline is `337d990` on the existing graph-walking feature branch. All earlier scope and integration obligations remain.

## Decisions

1. Preserve fragment validation issues without changing the constructor-like successful return value. Export `DagFragmentValidationError<ID = unknown> extends TypeError` from the DAG subpath and root. Its `issues: readonly DagDefinitionIssue<ID>[]` contains the original validation details (shallow caller IDs retain identity). It replaces only the generic error for an invalid prepared definition in `defineDagFragment`; instantiation's existing validation naturally uses it too. Malformed inputs, invalid port records/targets and mapping collisions remain TypeError, and caller exceptions retain exact values. A result-union redesign would need a broader fragment port/mapping error algebra; this typed error delivers diagnostics without multiplying construction entry points.
2. Add `ID = unknown` to `DagTraversalStallError` and type its constructor/diagnostics accordingly. Keep default compatibility and constructor identity across all exports. This supports explicit annotations/construction; it does not infer an ID type through arbitrary catch values.
3. Add synchronous `inspectDag(): DagInspection<ID>` methods to both sync/async DAG runners, delegating to the existing pure inspection function. Keep that function and coordinator API. Inspection must not acquire ownership, advance discovery, or execute callbacks, including on async runners.
4. Walking optional `followEdge` / `expandVertex` predicates accept `null` as explicit reset to absent, in initial options and configure patches, for sync and async variants. Omitted/undefined retains prior predicates when patching. Internally normalize null to undefined; no kernel semantic change. Limits still replace and visitor/phase records keep existing patch semantics. Invalid mixed patches remain atomic.
5. DAG source presence is consistently own-and-defined. Constructor still requires exactly one source. Configure ignores inherited source keys and own undefined source keys, retaining the active source. An own defined opposite-family source still rejects atomically before state mutation/callbacks; own defined same-family source replaces it. Capture source values once per patch to avoid validation/use getter discrepancies. Apply to both sync/async DAG builders, without broadly changing other option semantics.
6. Update current docs/JSDoc for the error taxonomy, inspection method, reset semantics, tree-only bases, preparation/frontier choices, and intentionally legacy object-adapter direct returns. Add a clear tagged custom-tree example or link existing canonical example at that point. Preserve published object adapter return shapes and root-flag meanings. Explain the existing tree/DAG admitted-chain and buffered-event rule so no narrower type is promised.

## Rejected or deferred

Do not add selector-only narrowing to tree/DAG runners: an actual async probe resumed with POST_ORDER and delivered a buffered PRE_ORDER event. Do not close the structural ExecutionInspection capability's kind string, add root aliases, rename accepted settlement results or conflate children with omission-preserving slots. Tagged built-in object results require a versioned compatibility decision because direct callers read vertexContent. Keep the already recorded ON_READY timing major-version deferral.

## Acceptance and integration

- Reproduce new behavior/type needs before production edits; use public regressions for errors, source patches, resets and observational methods, including sync/async where shared.
- Preserve arbitrary ID identity and exact caller-thrown values. ESM/CJS exports share constructor and declaration identity.
- Node >=22.12.0, Bun 1.4.4, TypeScript 4.7.4 and 4.9.5 remain supported; package version 0.11.0 stays unchanged; no npm publication.
- Full npm run check with 100% coverage; six packed runtime/compiler lanes and independent implementation/final reviews. Final-head remote CI must pass before merge of PR19 to main; verify actual remote integration.
- Preserve the original dirty main checkout and its 18-file draft manifest. Integrate remotely; do not overwrite or stash user drafts. Retain externally managed worktrees.
