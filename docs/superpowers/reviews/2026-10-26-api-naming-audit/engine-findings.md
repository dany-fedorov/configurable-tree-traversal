# Engine and public graph record review

Baseline: e52fab02333a044472e9aea864db26a8c33fc051. Reviewed all 76 engine declarations and their 309 declared members (385 assessment rows), after comparison with the full shared catalog. Private implementation members are excluded. Public and subclass-only declarations, nested shape fields, overloads, tagged literals, and inherited-member links were read in their enclosing signatures.

## E01 — Curate the supported surface (5/5)

`package.json` wildcard `./*` and `./*.js` mappings expose every emitted module. This makes `TraversalKernel`, `KernelPort`, `GraphScheduling`, mutable `GraphStore`, `ResolvedGraphsContainer`, normalization/driver functions, and snapshot staging machinery externally importable. Other reviewers cover equivalent policy/configuration/walking internals. Replace the wildcard contract with intentional entry points, remove implementation helpers from root barrels, and hide raw runner/container injection fields and constructors that require normalized engine state. Where an advanced extension is an actual requirement, give it a separately documented capability with invariants; do not assume an `internal/` path is private if exported.

Evidence: `package.json:175–196` contains wildcard mappings (check exact baseline positions in inventory); `src/core/graph/ResolvedGraphsContainer.ts` exposes synthetic holder IDs/raw store alongside the deliberately filtered public graph; `src/core/graph/types.ts:81–101` calls scheduler/identity observation shapes internal, yet they are reachable through deep imports.

Concrete naming conflicts removed by this boundary:

- `src/core/drivers/runAsync.ts:141` exports `runAsync = createAsyncDriver`; this constructs a control object. `runSync` is instead a generator. Neither should masquerade as a supported execution counterpart.
- `hasVertexId` (`src/core/graph/identity.ts:7`) checks own-property presence, not graph membership. `createVertexIdLabeler` creates display labels, not stable serialized IDs.
- `jsonStringifySafe` (`src/utils/jsonStringifySafe.ts:1–23`) drops all repeated references and still inherits JSON failures; the generic name overpromises safety. `deepFreeze` freezes own data-property object graphs, not Map/Set mutations or getter results. Hide these internal helpers rather than creating a second utility library.
- `PrerequisiteResolution.settle`, callback scheduler settlement, and kernel settlement refer to distinct internal operations; clients should see explicit host-work settlement and source-resolution contracts instead.

Cost: breaking for deep imports, direct engine construction and raw state injection. This is a deliberate API boundary change, not an assumption those imports never mattered.

## E02 — One supported execution capability vocabulary (3/5)

`AsyncCoreExecution` explicitly describes itself as historical (`src/core/AsyncCoreExecution.ts:4–8`), duplicates `AsyncTraversalExecution`, and reverses the phase/event generic order. Treat it as a migration alias only; use `SyncTraversalExecution` and `AsyncTraversalExecution` in new signatures. This is part of a cross-family capability/legacy alias cleanup, not a reason to rename familiar receiver-scoped `run` arbitrarily.

## E03 — Relation-specific resolved record names (4/5)

`GraphEdge` contains only `parentRef`, `childRef`, `hintIndex`, `hint` (`src/core/graph/types.ts:33–38`). Rename it `StructuralChildEdge`; `DagDependencyEdge` is a milestone constraint and `GraphWalkEdge` is a labeled directed occurrence. These are intentionally different relation models.

`GraphVertex` (`:58–68`) is a resolved bookkeeping record wrapping a `Vertex`, unlike `GraphWalkVertex`'s caller data. Prefer `ResolvedGraphVertex`, with `ResolvedVertexStatus` for its traversal status. Align names of milestone fields with the DAG vocabulary proposal. Do not replace all three edge models with one loose type merely to reuse a generic name.

Cost: public type rename; no change to arbitrary ID identity, hint positions, or runtime topology.

## E04 — Caller IDs versus references (4/5)

`Ref<T> = CTTRef<Vertex<T>>` (`src/core/graph/types.ts:16`) merits the specific alias `VertexRef<T>`. Coordinate any rename of the generic `CTTRef<T>` to `MutableRef<T>`; do not assign both types the name VertexRef. Keep explicit `getRefId` versus `getVertexId`/`getVertexRefById`. `VertexId = unknown` is intentional and permits opaque host identity; no string conversion is warranted.

## E05 — Match edge fields to milestone names (5/5)

`GraphVertex.dependsOn` and `.dependsOnComplete` (`src/core/graph/types.ts:63–64`) should migrate with the source/definition fields to explicit work/subgraph-completion prerequisites. This is one shared milestone vocabulary improvement, not separate independent renames.

Retain `ChildSlot` and its discriminated states, `HintVertexId`'s explicit own-ID envelope, `MaybePromise<T>`, and `VertexId`. Their receiver/type context is meaningful and matches their actual scope. Read-only here is shallow; shared caller data is not an immutable snapshot promise.
