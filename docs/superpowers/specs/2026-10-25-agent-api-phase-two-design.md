# Agent API phase two design

Status: draft prepared after phase one was pushed to `origin/main` at `1be1a28`. This is a proposed design for roadmap items 7, 4, and 6, in delivery order. No phase-two API is implemented by these documents. The user requested preparation; implementation is a separate next step.

## Scope and rationale

Phase two makes existing work graphs easier to inspect, reuse, and revise. It retains conjunction-only work/completion dependencies. Milestone alternatives, general cyclic graph walking, and folds remain roadmap items 5, 9, and 10.

Deliver three independently reviewable changes:

1. [Dependency queries and explanations](../plans/2026-10-25-dag-dependency-queries.md).
2. [Definition values and graph fragments](../plans/2026-10-25-dag-fragments.md).
3. [Validated graph revisions](../plans/2026-10-25-dag-revisions.md).

Use free functions over explicit values and snapshots, with prepared DAGs continuing to create runners/sessions. This keeps query, transformation, and execution concerns independently usable. Methods directly editing a running session would couple topology revisions to unsettled work. A generic workflow builder with task handlers would introduce host policy. Neither is needed for this phase.

## Global constraints

- Preserve Node 22.12.0+, Bun 1.4.4, and TypeScript 4.7.4 compatibility.
- Preserve 100% statements, branches, functions, and lines; do not weaken coverage.
- Preserve arbitrary SameValueZero IDs and exact caller error values.
- ESM and CJS share implementation and declaration identity.
- No new runtime dependency, durable storage, task executor, or automatic completion-fact migration.
- All phase-one APIs remain available; published version remains 0.11.0 until a separately authorized release.
- Copy owned topology and result wrappers; retain shallow caller data and ID identity without freezing caller objects.

## Evidence from phase one

`PreparedDag.vertices` describes live vertices, retained children, and effective dependencies. The private replay closure in `makePreparedDag.ts` also retains root/forest mode, ordered discovery hints containing known omissions, and omitted prerequisite IDs. These are necessary for faithful reconstruction: moving an omitted slot can change FIFO readiness. Rebuilding a source from `.vertices` alone loses those facts.

`DagVertexProgress.unmetPrerequisiteIds` currently unions W and C waits. Subtracting the C list does not recover W when the same ID appears in both dependency lists. Explanations must obtain exact milestone state rather than infer one list by subtraction.

`summary().diagnostics` can be null for a healthy graph. Dependency queries cannot use stall diagnostics as their sole topology source. `dependencyMilestones.ts` is the existing authoritative labelled model; preserve its direction, **from waits for to**, and its four edge reasons.

## 2A Dependency queries and explanations

Proposed entry point:

```ts
const inspection = inspectDag(runner);
const prerequisites = inspection.prerequisitesOf(
  { vertexId: 'review', milestone: 'work' },
  { transitive: true },
);
const explanation = inspection.explain({
  vertexId: 'review', milestone: 'work',
});
```

`inspectDag` accepts sync and async DAG runners, including tree-source runners with their existing identity domain. It takes a synchronous, detached snapshot and performs no callbacks, source lookup, scheduling, or settlement. It does not acquire iterator ownership. Async callbacks cannot interleave during this synchronous capture. All methods on the returned inspection use the captured values, even after the runner advances. The snapshot is shallow with respect to caller IDs and data.

The snapshot contains labelled original constraints, per-vertex progress, known omission/deletion identity states, and `discoveryComplete`. Add an internal identity-state projection to the graph store so a known omitted ID is distinguishable from an unknown query target, including an omitted root. Hide the synthetic holder.

`prerequisitesOf(milestone, { transitive?: boolean })` and `dependentsOf(...)` return `{ milestones, edges, discoveryComplete }`. The default is direct traversal. Transitive traversal uses an iterative queue, deduplicates by the pair of SameValueZero identity and milestone, excludes the starting milestone from returned vertices, and retains relevant labelled edges. Preserve source/discovery and declaration order for deterministic breadth-first results. W and C for the same vertex are distinct. Cycle inspection must terminate even on a failed or partially discovered runner.

`explain(milestone)` returns either `{ kind: 'unknown', target, discoveryComplete }` or `{ kind: 'known', target, satisfied, progress, blockers, discoveryComplete }`. For known omissions, progress is null, satisfied is true, and blockers are empty. For live vertices, progress is the detached `DagVertexProgress` record. A deleted known target has a separate `{ kind: 'deleted', target, discoveryComplete }` result; deletion must not be reported as successful work.

Blockers are a flat causal graph, not recursively duplicated prose. Each unmet original edge carries its milestone endpoints and reason. Endpoint status distinguishes live unfinished work, known omission, deletion, and unresolved identity. An unresolved endpoint in partial discovery is not a proven missing source vertex. Add explicit `discoveryOpen` for incomplete expansion and `completionPending` when W and retained children are complete but C has not committed. Use a narrow internal scheduling snapshot for expansion state instead of treating global discovery completeness as a per-vertex fact.

Explain only unsatisfied constraints reachable from the target, stopping expansion at satisfied milestones. Static prerequisite/dependent queries continue to describe original constraints irrespective of progress. Unknown query targets return empty navigation results; `explain` distinguishes them from known leaves. Stable iterative traversal bounds explanations even when the inspected graph contains a cycle.

Add optional `unmetWorkPrerequisiteIds` to the public progress type for compatibility with manually constructed records; engine-produced summaries always populate it. Keep the existing union field unchanged. Readiness remains dependency eligibility; inspection never claims externally dispatched work or applies host capacity. A ready/deferred W milestone is still unsatisfied until committed.

## 2B Definition values and graph fragments

Introduce a copied immutable `DagDefinition<Data, ID>` representing the normalized in-memory source facts needed to prepare a new DAG. This is a source definition, not a runner checkpoint or a serialization format. Proposed structure:

```ts
type DagDefinitionSlot<ID> =
  | { readonly kind: 'vertex'; readonly vertexId: ID }
  | { readonly kind: 'omitted'; readonly identity: { readonly vertexId: ID } | null };

type DagDefinitionVertex<Data, ID> = {
  readonly vertexId: ID;
  readonly data: Data;
  readonly slots: readonly DagDefinitionSlot<ID>[];
  readonly dependsOn: readonly ID[];
  readonly dependsOnComplete: readonly ID[];
};

type DagDefinition<Data, ID> = {
  readonly vertices: readonly DagDefinitionVertex<Data, ID>[];
  readonly omittedIds: readonly ID[];
  readonly entry:
    | { readonly kind: 'root'; readonly vertexId: ID }
    | { readonly kind: 'forest'; readonly slots: readonly DagDefinitionSlot<ID>[] }
    | { readonly kind: 'empty' };
};
```

Identity wrappers distinguish an anonymous omission from a known undefined identity. Preserve live vertex order, every ordered discovery slot, detached prerequisites, known omissions, and root/forest mode. Dependencies are effective captured constraints: implicit-parent inheritance and ignored root W have already been applied. Anonymous omissions may be retained in the definition without exposing invented ID hints during replay. Forest entry slots must have identities; reject anonymous catalog entries consistently with the existing source contract. Empty entry with omittedIds preserves an omitted root; unexplained live records under an empty entry are invalid.

Add `PreparedDag.definition` while retaining `.vertices`. Extract a shared private capture/replay representation from `makePreparedDag.ts`; both existing factories and the new definition functions use it. Existing phase-one behavior and event-order regressions must remain unchanged.

`defineDag(input)` copies/freezes owned arrays/records, preserves data/ID references, and rejects malformed shapes or duplicate identity declarations. It does not execute callbacks or assert that a well-shaped graph is acyclic. `prepareDagDefinition(definition)` returns a `DagDefinitionResult<Data, ID>`:

```ts
type DagDefinitionResult<Data, ID> =
  | { kind: 'valid'; dag: PreparedDag<Data, ID> }
  | { kind: 'invalid'; issues: readonly DagDefinitionIssue<ID>[] };
```

Issue variants cover missing structural endpoints, invalid entry/omission references, unreachable live or omitted records, structural cycles, and milestone validation diagnostics. Validate membership over both structural and declared prerequisite closure; detached prerequisites are legitimate. Reuse the existing SCC implementation for structural validation and the existing DAG validator for W/C constraints. Do not classify errors by message text. Programmer errors and caller-thrown values propagate; expected graph invalidity returns issues. Existing `prepareDag` result/throw behavior remains unchanged.

Pin the issue vocabulary for implementation:

```ts
type DagDefinitionIssue<ID> =
  | { kind: 'missingStructuralEndpoint'; parent: { vertexId: ID } | null; vertexId: ID }
  | { kind: 'invalidEntry'; reason: 'unknownRoot' | 'anonymousCatalogEntry' | 'emptyWithVertices'; vertexIds: readonly ID[] }
  | { kind: 'invalidOmission'; vertexIds: readonly ID[] }
  | { kind: 'unreachable'; vertexIds: readonly ID[] }
  | { kind: 'structuralCycle'; vertexIds: readonly ID[] }
  | { kind: 'milestone'; diagnostics: DagTraversalStallDiagnostics<ID> };
```

The null parent denotes an entry slot, never the caller's null ID. Structural cycle IDs are SCC membership, not an ordered witness. List structural issues deterministically before milestone diagnostics. Shape-invalid input and duplicate identity declarations throw `TypeError` during normalization.

`defineDagFragment(definition, ports)` associates typed named local IDs with a definition; ports may point to live vertices only. Port names are inferred string literals; IDs remain arbitrary. Fragments are closed over their local definitions. External dependencies are added explicitly when composing instances, avoiding implicit name-based binding.

`instantiateDagFragment(fragment, { mapId })` returns `{ definition, ports }`. Call `mapId` once per local live or omitted identity, cache the result, and remap entry, slots, dependencies, and ports consistently. Reject collisions with SameValueZero semantics, including mapped live/omitted collisions. Mapping errors preserve exact identity. No string concatenation, delimiter conventions, or task-specific fields are implicit.

`composeDag(instances, options?)` returns `DagDefinitionResult`. Options are ordered `dependencies: { dependent: ID; prerequisite: DagDependencyMilestone<ID> }[]` and `children: { parent: ID; child: ID }[]`. These operations remain separate. Concatenate instance entries in argument order under one hidden forest holder; retain each instance's internal structural order and detached prerequisites. Reject cross-instance identity collisions even if the data is equal. New child links append in supplied order; dependency duplication follows existing SameValueZero normalization. Validate the entire composition, including combined W/C cycles, before exposing an executable DAG.

An instance with an empty entry contributes its known omitted identities as omitted entry slots when composed, so completion seeds for those identities remain recognized. An entirely empty instance contributes no slot. These holders remain hidden and do not add parent-work dependencies. A typed port names a live local vertex; local dependency endpoints must resolve within the fragment's live/omitted domain before instantiation.

Data and ID unions can be declared explicitly when composing heterogeneous fragments. Type tests must ensure port keys remain precise and invalid wire IDs are rejected. A milestone-valued port is unnecessary: the caller chooses work or completion in each connection.

## 2C Validated graph revisions

Proposed API:

```ts
const result = reviseDag(prepared, [
  { kind: 'replaceVertex', vertex: replacement },
  { kind: 'addVertex', vertex: newTask },
  { kind: 'replaceEntry', entry: nextEntry },
]);
```

`DagRevisionOperation<Data, ID>` is a tagged union of `addVertex`, `replaceVertex`, `removeVertex { vertexId }`, `replaceEntry`, and `replaceOmissions { omittedIds }`. Full records make edge changes explicit; a separate dependency-edit DSL is unnecessary. Operations apply in order to a private candidate. Replacement retains list position; additions append. Adding an existing ID or replacing/removing an unknown live ID throws `TypeError` before returning a result. Removing a vertex does not silently prune references, satisfy its work, or delete descendants. The batch may remove those references explicitly; validate the final candidate rather than rejecting temporarily dangling intermediate operations.

On graph invalidity, return `{ kind: 'invalid', issues }` and keep the original definition and sessions untouched. On success, return `{ kind: 'valid', dag, changes }`, with a fresh prepared definition. `diffDagDefinitions(before, after)` is a pure helper returning added/removed IDs, per-vertex changed aspects (`data`, `slots`, `workDependencies`, `completionDependencies`), and entry/omission changes. Order changes count. Compare data by `Object.is`; deep mutation of shared data cannot be detected or interpreted as business invalidation.

The diff's fields are `addedIds`, `removedIds`, `changedVertices: { vertexId, aspects }[]`, `vertexOrderChanged`, `entryChanged`, and `omissionsChanged`. Vertex reordering must be visible even if each record is unchanged. Use old vertex order for removals/changes and new order for additions; use the aspect order listed above. Compare IDs with SameValueZero, including within slots and edge arrays; compare data references with `Object.is`.

Old sessions and tickets remain valid within their old definition. They do not settle work in a new session. No accepted completion facts are copied automatically. The host selects valid facts and starts the new session explicitly. Dependency queries on old/new snapshots can support impact analysis, but structural reachability does not prove that an accepted artifact must be invalidated.

## Acceptance scenarios

| Scenario | Required observation |
| --- | --- |
| Same prerequisite ID used for W and C | W may be satisfied while C remains an explicit blocker; no subtraction-based inference. |
| Lazy lookup still pending | Inspection performs no lookup and marks its domain partial. |
| Completed parent work with unfinished child | Work milestone satisfied; completion explanation includes the child C constraint. |
| Two instantiated fragments use object IDs | Exact mapped identity is reused across every reference and port; no stringification. |
| Omission precedes a dependent sibling | Definition round-trip and composition retain phase-one readiness ordering. |
| Detached prerequisite component | Still discoverable through explicit dependencies and stays structurally detached. |
| Removal leaves a dangling dependency | Revision invalid; original source/session remains usable. |
| Revision changes only caller data reference | Diff records data replacement without declaring business work invalid. |
| Old result arrives after a revised session starts | Ticket rejects in the new session, and remains governed by the old session. |

## Integration and review

Each delivery needs focused public regressions, compile-time assertions, runnable examples, packed CJS/ESM consumers, and the full standard check before integration. Keep new drafts under `docs/superpowers`; update current guides only with implemented contracts. Reuse the source/test map in each linked plan. The roadmap continues to track items 5, 9, and 10 independently.
