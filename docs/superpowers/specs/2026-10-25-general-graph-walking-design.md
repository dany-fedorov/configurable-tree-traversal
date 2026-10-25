# General graph walking: roadmap item 9

Status (2026-10-26): independently reviewed and approved design, implemented on `feat/general-graph-walking`. Tasks 1–9 are independently approved; Task 10 current guides/examples, full local integration and all six runtime/compiler packed checks are verified. Whole-branch independent review remains pending. The design below retains approved planning rationale; use the [current reference](../../reference.md#general-graph-walking) for consumer contracts and the [implementation plan](../plans/2026-10-25-general-graph-walking.md#final-local-implementation-verification-2026-10-26) for execution evidence/rulings. Published npm remains 0.11.0.

Related: [library goals and acceptance criteria](2026-10-25-agent-api-roadmap.md#purpose-and-acceptance-criteria), [current API](../../reference.md), [exploration vocabulary](../../../CONTEXT.md).

## Purpose and boundary

Explore linked documents, code references, provenance, and other directed information graphs with shared vertices and cycles. Preserve useful vertex, relationship, and ID types through source callbacks, filters, visitors, and iteration. Support ordinary in-memory records and incrementally discovered remote relationships through the same walking semantics.

CTT owns discovery, traversal strategy, revisit policy, observation, and in-memory continuation. The host owns retrieval policy, authorization, business meaning, retries, persistence, and agent dispatch. Walking edges carry no work/completion milestone semantics. Item 10's folds and item 5's dependency expressions remain separate work.

## Cross-family consistency

User direction for implementation planning: keep generic graph, DAG, and tree APIs consistent as much as possible without sacrificing orthogonality, type safety, idiomatic use, or workflow coverage. Share conventions and meaningful capabilities, not source semantics that would misrepresent a different family.

Use the existing constructor/configure/makeRunner pattern, phase-keyed visitors, `addVisitorFor`, `addVisitorGroupFor`, `setVisitorsFor`, `listVisitorsFor`, registration snapshots, canonical execution selectors and their field-wise patch rules, `run`/`getIterable`, statuses, one-owner execution, cooperative pause, exact failures, and shared execution capabilities. Reuse the existing generic registration and selector normalization functions. The walking visitor result supports the existing `HALT_TRAVERSAL` and `NOOP` command identities; use predicates for pruning and keep topology mutation and DAG settlement outside this family.

Keep intentional differences explicit: graph observations are typed vertex/edge/path records; lazy targets have IDs and optional resolved data without work/completion fields; limits and resource disposal have walking-specific outcomes; and inspection exposes walking state through the shared capability contract. Walking iterator calls with explicit emission selectors enforce selection at delivery, including pending records, to support sound result narrowing. Preserve existing tree/DAG admitted-event semantics; do not silently retrofit that behavior into their iterators. This narrow difference is covered by pause/selection tests and documented with the new family.

The source property remains `source`: the walking contract is not interchangeable with existing `traversableTree` or `traversableGraph` callbacks. Adapters bridge explicit meanings. Root, namespace, and subpath exports retain shared constructor and declaration identity.

## Architecture decision

Add a dedicated `GraphWalk` / `AsyncGraphWalk` family. Reuse source-result conventions, SameValueZero identity, visitor registration conventions, and compatible lifecycle behavior. Do not interpret cyclic relationships as DAG completion dependencies or squeeze shared routes into tree parent positions.

Alternatives considered:

1. Add deduplication to tree traversal: familiar surface, but shared-node parents and occurrence depth become ambiguous.
2. Add a walking mode to DAG traversal: reuses graph storage, but couples information exploration to work/completion state.
3. Dedicated walking family: selected for an explicit contract and independently testable semantics.

Internally, keep identity/resolution caching, adjacency caching, frontier scheduling, revisit policy, and event selection separate. Sync and async execution must drive the same walking state transitions. Reuse existing driver machinery only where contracts agree; a new family must not change existing tree/DAG behavior.

## Source contract

Proposed source shape, with ID trailing the caller-data generics:

```ts
type GraphWalkVertex<Data, ID> = Readonly<{ vertexId: ID; data: Data }>;

type GraphWalkVertexResult<Data> =
  | { kind: 'found'; data: Data }
  | { kind: 'omitted' };

type GraphWalkTarget<Data, ID> = Readonly<{
  vertexId: ID;
  resolution?: GraphWalkVertexResult<Data>;
}>;

type GraphWalkLink<Data, Edge, ID> = Readonly<{
  target: GraphWalkTarget<Data, ID>;
  data: Edge;
}>;

interface GraphWalkSource<Data, Edge, ID> {
  roots(): Iterable<GraphWalkTarget<Data, ID>>;
  resolveVertex?(vertexId: ID): GraphWalkVertexResult<Data>;
  outgoing(vertex: GraphWalkVertex<Data, ID>): Iterable<GraphWalkLink<Data, Edge, ID>>;
}
```

The async counterpart accepts value-or-promise callback results and iterable or async-iterable roots/links. A synchronous source is usable by the async family. Async callbacks are rejected by the synchronous types and defensively rejected at runtime. Supplied target resolutions are already resolved tagged values; asynchronous hydration happens inside source callbacks/enumerators.

`roots()` is a factory so each runner gets independent iteration. Each source enumeration must be finite; lazy does not promise fair traversal of infinitely branching graphs. Large finite enumerations can be consumed incrementally. Multiple and empty roots need no public synthetic holder. Repeated root IDs are deduplicated in declaration order under every revisit policy.

Use explicit target wrappers even for ID-only sources (`{ vertexId }`), avoiding ambiguity when an arbitrary object ID happens to have a `resolution` or `vertexId` property. `resolution` is optional pre-resolved caller data, useful when discovery already returns hydrated objects. It is not a new identity or a topology replacement.

For an admitted target, consult the runner's resolution cache first, then its supplied `resolution`, then `resolveVertex`. Cache the first accepted result for the ID. Later inline resolutions do not replace or revalidate it, including when it is an omission. This intentionally differs from DAG execution, which rejects found content after an accepted omission: walking captures the first accepted observation of an ID across a changing remote graph, while DAG omission commits milestone satisfaction. A fresh walker is required to observe a later replacement. First means first target admission in traversal order, not merely first link pulled from the source. A rejected link cannot seed a target's resolution. Source authors should use stable IDs for the intended observation; the runner does not reconcile conflicting snapshots or retry omitted IDs.

The requested ID is authoritative; a result cannot silently remap it. `found` can carry any data, including null or undefined. `omitted` records an intentional absence and is cached, never expanded, and produces no vertex/path event. There is no milestone-satisfaction flag on walking omissions. Unknown required IDs are a host error unless the host deliberately returns `omitted`; thrown values propagate unchanged. An admitted uncached target without an inline resolution or a resolver fails with `TypeError` rather than becoming an omission. Optional `resolveVertex` makes entirely hydrated sources concise; mixed sources supply it for ID-only targets.

`resolveVertex` is invoked at most once per ID per runner and not at all for an ID first admitted with inline resolution. `outgoing` is called at most once per found vertex that actually expands. Its iterator is read on demand, with observed links cached for other route occurrences. Replaying a path reuses cached links and does not repeat source I/O. Partial adjacency remains partial during pause; no silent restart on resume. Cached link wrappers include their target ID and optional tagged resolution; caller data remains shallow.

Copy link wrappers and own traversal records, retaining caller data and IDs by identity. Capture a link's destination when consumed. Do not freeze caller objects. A runner observes a graph over time; it does not assert a remote transactional snapshot. Independent runners have independent caches and may observe newer source data.

## Edge identity

Each outgoing link has a session-local identity `{ from: ID, index: number }`, where index is its zero-based position in that vertex's outgoing enumeration before filtering. Identity comparison uses SameValueZero on `from` plus the integer index, not wrapper reference equality. An edge record contains that identity, `to`, and typed `data`.

Two equal endpoint pairs remain distinct links, including repeated copies of the same input object. No required caller edge ID or stringification. A host's durable relationship ID can live in edge data. These identities are not stable identifiers across independent walks.

## Independent options

Use one options object with `source`, `strategy`, `revisit`, `limits`, predicates, visitors, and independent `emitPhases` / `visitorPhases`. Defaults are `strategy: 'breadthFirst'`, `revisit: 'once'`, vertex-only emission, and all registered visitor phases enabled.

```ts
type GraphWalkRevisitPolicy = 'once' | 'simplePaths' | 'walks';

type GraphWalkLimits = {
  maxDepth?: number;
  maxOccurrences?: number;
  maxSteps?: number;
};
```

`strategy` is `'breadthFirst' | 'depthFirst'`. `once` admits at most one found vertex occurrence per ID for expansion. `simplePaths` permits a vertex on multiple routes but not twice within one route. `walks` permits repeated vertices within a route. Both route-enumeration policies require a finite `maxDepth` or `maxSteps`; `maxOccurrences` alone is not a sufficient exploration bound. Merely observing a first-discovery path under `once` does not enumerate alternative paths and needs no mandatory bound.

The construction options type is a discriminated union keyed by `revisit`, expressing those mandatory bounds. `GraphWalkConfigureInput` and `AsyncGraphWalkConfigureInput` are partial patches; they cannot prove which bounds a prior configuration contains. Validate the merged configuration atomically at runtime, and throw TypeError without changing it when a route-enumeration policy has no bound. There is no separate `pathPolicy` or vertex/edge result mode. Validate nonnegative safe integers; zero is meaningful. Reject unknown policies, negative/fractional bounds, and invalid option combinations before source callbacks.

All policies support vertex, edge, and path phases, independently selected for iteration and callbacks. Phase-keyed visitors receive their exact event shape. Explicit literal `emitPhases` on an iterator call narrows that call's yielded event union; dynamic selectors remain a union. A no-argument iterator call has the full event union because previously patched selections can differ from constructor defaults. Graph data, edge data, and IDs infer from the source without explicit generics in ordinary use. Keep TypeScript 4.7 consumer compatibility unless implementation establishes a concrete need to change it.

## Revisit policy and observations

| Revisit policy | Expansion | Vertex/path observations | Edge observations |
| --- | --- | --- | --- |
| `once` | Expand each found vertex at most once | Once per found ID; paths describe first-discovery routes | Every followed link once, including parallel, returning, and self links |
| `simplePaths` | Expand separately for each prefix without a repeated vertex | Per admitted prefix | Per followed link occurrence whose target does not repeat a vertex in that prefix |
| `walks` | Expand separately for each prefix, allowing revisits within bounds | Per admitted prefix | Per followed link occurrence, including revisits |

Source observations are cached under every policy. Choosing an edge-only emission does not change deduplication, source calls, expansion, or registered vertex callbacks. Mixed vertex and edge observation is a first-class operation in one session. An isolated root still has vertex/path observations even though it contributes no edge.

Under `once`, first discovery chooses a vertex's depth and incoming edge. A repeated root declaration does not produce a second occurrence. Under the route-enumeration policies, a root declared after it was reached from another root still contributes its own zero-edge path; duplicate declarations of that same root do not.

Depth is the number of edges in the selected route, with roots at zero. Breadth-first walking processes all distinct root candidates before descendants and preserves source order within each level. Depth-first walking exhausts a root's selected descendants before requesting the next root and follows outgoing order. Neither strategy recurses on the JavaScript call stack. Finite root enumeration is required for breadth-first descent.

With DFS and `revisit: 'once'`, `maxDepth` applies to the first-discovery route, not shortest-path distance. A vertex first found at the boundary is not re-expanded if a shorter route is later found. BFS is the option for shortest discovery depth; do not advertise DFS depth limiting as a radius query.

Path observations are prefixes, not only routes to leaves. Include zero-edge root paths. Parallel links distinguish paths with identical vertex sequences. Under `simplePaths`, exclude a closing link before its follow predicate and produce no edge/path observation for that rejected occurrence. Use `once` to collect all reachable relationships without enumerating routes, or `walks` for bounded routes that include cycles.

## Records and callbacks

Proposed result records:

```ts
type GraphWalkEdge<Edge, ID> = Readonly<{
  from: ID;
  index: number;
  to: ID;
  data: Edge;
}>;

type GraphWalkEvent<Data, Edge, ID> =
  | {
      kind: 'vertex';
      vertex: GraphWalkVertex<Data, ID>;
      depth: number;
      via: GraphWalkEdge<Edge, ID> | null;
    }
  | {
      kind: 'edge';
      edge: GraphWalkEdge<Edge, ID>;
      source: GraphWalkVertex<Data, ID>;
      depth: number;
      target: { kind: 'found'; vertex: GraphWalkVertex<Data, ID> }
        | { kind: 'omitted' };
    }
  | {
      kind: 'path';
      vertices: readonly GraphWalkVertex<Data, ID>[];
      edges: readonly GraphWalkEdge<Edge, ID>[];
      depth: number;
    };
```

Edge depth is the source occurrence depth plus one, even for a link back to a previously visited vertex. Edge events include the found source vertex and either a found target vertex or an explicit omission. Their IDs agree with `edge.from` / `edge.to`. Relationship visitors can use both endpoints' typed caller data without building lookup maps. Vertex/path observations do not invent data for omissions.

Public arrays and record wrappers are detached and readonly; vertex and edge data remain shallow caller values. A `Data` union narrows through its own discriminant independently at each endpoint. No relation-to-endpoint correlation is claimed unless the caller encodes and checks it; avoid unsound inference from edge tags. Only requested path observations or path-sensitive predicates require materialized path arrays. Internally use parent-linked frames and per-route membership, materializing arrays for observation rather than copying an entire route for every scheduling operation.

Use `GraphWalkPhase.VERTEX`, `.EDGE`, and `.PATH`, with string values matching record kinds. Match existing phase-keyed visitor maps, priorities, ordered groups, and detached registration queries. Derive the halt/no-op command subset from the existing `TraversalVisitorCommand` type, preserving its forbidden-arguments constraint, with family-safe typing; reject DAG settlement, chain-state mutation, and topology-rewrite commands. V1 executes callback chains serially in deterministic order, including async walking.

### Event ordering and selection

An admitted root produces vertex then path observations when found. An admitted followed link resolves or reuses its target, then produces its edge observation first; if it admits a found vertex occurrence under the revisit policy, produce vertex then path observations. Omitted targets produce only an edge observation. Returning/parallel links under `once` still produce edge observations without another vertex/path observation. Each observation's visitor chain commits before its selected record is emitted. Expansion is scheduled after that occurrence's observations; DFS descends immediately, BFS enqueues it.

`emitPhases` and `visitorPhases` independently control observation and patch field-wise using the existing public selector syntax. A walk can register vertex and edge visitors and emit only paths, or emit a mixed stream without any visitors. Hiding records or disabling callbacks never changes discovery, budgets, or revisit policy. No fake work/completion events or post-order milestone for cyclic regions.

An admitted visitor chain retains its visitor selection/configuration through its boundary. A new iterator lease applies its effective emission selection to records as they are delivered, including pending records from a paused occurrence. Explicit call-level `emitPhases` therefore narrows every yielded record safely. Already delivered or suppressed observations never replay; changing a selector cannot resurrect them. Pending observations that have not passed their emission boundary can be selected by the new lease. With no explicit selector, the call returns the full event union to account for previously patched state. Close the old iterator before changing lease options; malformed selectors are rejected before mutation. The broad signature remains assignable to the shared execution capability.

Pausing between the edge and vertex observations preserves the rest of the admitted occurrence and its pending expansion. Resuming never repeats its source resolution, completed visitor callbacks, or delivered records. Budget exhaustion after admission drains that occurrence's observation sequence unless paused, then terminates before another candidate. Emission filters cannot turn one candidate into multiple budget admissions.

## Filtering and expansion

Two typed predicates cover the first version:

- `followEdge(edge, context): boolean` decides whether to follow a link before resolving its destination. Context contains the found source vertex and candidate depth; under route-enumeration policies it also exposes the current prefix. False prevents target lookup through that occurrence.
- `expandVertex(vertex, context): boolean` decides whether to enumerate outgoing links after admitting a found occurrence. False still allows the occurrence's result and callbacks but prunes its descendants. Context exposes occurrence depth and incoming edge, plus the prefix under route-enumeration policies.

Async walking permits promises from either predicate. `once` evaluates expansion at the first occurrence only; later routes do not override a pruning decision. Route-enumeration policies evaluate predicates per route while sharing source resolution/adjacency. Excluding one edge does not globally exclude its destination. Predicates are traversal policy, not visitors, so disabling visitors does not disable pruning.

Evaluate simple-path eligibility before `followEdge`; apply user predicates only to eligible candidates. Resolve a followed target, run its ordered observations, then evaluate expansion when execution resumes. A pause after a yielded vertex must not eagerly fetch its outgoing links. Under `once`, an already discovered target still has an edge observation but is not re-expanded. Pruning a vertex does not hide its incoming edge. Graph topology and expansion policy are immutable for the runner; visitors cannot rewrite the source graph.

## Limits, progress, and resource lifetime

`maxDepth` gates vertex expansion after `expandVertex` as specified below. Do not open adjacency at the boundary; an over-depth link candidate is therefore never generated and needs no duplicate per-link depth rejection branch. `maxOccurrences` caps admitted exploration candidates, independently of observations: one per distinct root declaration and one per eligible followed link occurrence, including omitted targets and returning/parallel links. Duplicate root declarations and links rejected by policy/predicates consume steps but no occurrence allowance. A root or link that produces edge, vertex, and path observations still consumes exactly one occurrence. Check the remaining allowance before pulling another candidate; admit no candidate when it is zero. A source resolution failure counts the already admitted candidate but fails the runner.

`maxSteps` bounds candidate pulling: one step for each attempted root `next()` or outgoing-link `next()`, including end-of-stream observations and replayed cached links. Rejected, duplicate, omitted, and cycle-closing candidates still consume steps. Checking or resolving the candidate returned by a pull belongs to that admitted step. No next candidate pull begins after the allowance is exhausted. The counter is logical and independent of whether a link is read from the source or cache. This bounds exploration even when almost every candidate is filtered out; it does not bound elapsed time inside a host callback.

Zero `maxSteps` or `maxOccurrences` completes with a limited result without calling the source. Zero depth allows root occurrences but no outgoing enumeration. At an exact global cap, perform no extra source pull to prove exhaustion. Report exhausted if the admitted final step already proves all enumerations and frontier work exhausted; otherwise report limited when the cap prevents the next required pull/admission. Once a candidate step has begun, allow its finite source/predicate/visitor chain to settle; pause and limit handling do not cancel user code.

Global occurrence/step limits end the runner after draining observations belonging to the last admitted candidate. If the final allowed step detects end-of-stream and the frontier and root enumeration are already exhausted, report exhausted without making another pull. If further exploration would require a pull, report limited. Earlier depth cutoffs remain visible even if the remaining frontier drains. Depth boundaries prune those branches and allow other eligible branches to continue. Limits are fixed for a runner; continuing with larger bounds requires a fresh walk. `requestPause()` and iterator close retain resumable state and do not count as a limit.

Expose a detached `summary()` with status, counts (`steps`, admitted occurrences, found/omitted identities, observed links, and committed observations by phase), and an outcome:

- `null` while initial/running/paused;
- `{ kind: 'exhausted' }` when all exploration permitted by the source, predicates, and occurrence policy has drained without a reached limit;
- `{ kind: 'limited', reasons: readonly ('maxDepth' | 'maxOccurrences' | 'maxSteps')[] }` when a configured bound cut exploration;
- `{ kind: 'closed' }` after explicit resource disposal;
- `{ kind: 'failed', error: unknown }` after a source/predicate/visitor/cleanup failure.

Record `maxDepth` only when it suppresses expansion of an admitted found vertex occurrence. Evaluate `expandVertex` first; if it rejects expansion, the user predicate already pruned the route and no depth cutoff is recorded for it. Otherwise, an occurrence at the boundary conservatively records the depth cutoff without opening its outgoing enumeration, since unqueried links may exist. A returning link to a cached vertex under `once` does not admit another vertex occurrence or require expansion, so its edge depth alone cannot mark the walk limited. `exhausted` describes the configured exploration, never completeness of a remote graph or of relations excluded by predicates. Summary reasons are unique and ordered depth, occurrences, steps. Observation methods never call the source or advance iterators.

Use existing INITIAL/RUNNING/HALTED/FINISHED/FAILED lifecycle meanings, with FINISHED indicating a terminal walk and `summary().outcome` distinguishing exhausted/limited/closed. `getStopReason()` remains paused/finished/failed/null, without inventing DAG awaiting-settlement states. `run()` and `getIterable()` enforce one execution owner and retain exact failures. Finished runners do not restart; factories create fresh ones.

### Execution capabilities and inspection

Walkers implement `isHalted()` with the existing status meaning and share cooperative `requestPause()` semantics. Inspection is synchronous, detached, frozen, and observational; it never polls a source iterator, invokes a predicate, consumes a record, or acquires execution ownership.

The current `TraversalExecutionState.inspect()` returns `CoreInspection`, whose `kind`, frame stages, phases, and pending request types are specific to the tree/DAG kernel. Do not cast walking state to that shape or widen the existing `CoreInspection` union with fabricated fields. Introduce an `ExecutionInspection` common structural contract containing `status`, `stopReason`, `haltRequested`, `kind: string`, `execution`, `inFlightCallbackCount`, and `bufferedEventCount`. Existing `CoreInspection` already satisfies it. Make `InspectionFilters<Phase extends string = VisitOrder>` generic with the existing phase domain as its default, so walking can reuse the same `iterableConfig` shape without widening old inspection types.

Add a defaulted inspection parameter to the shared interfaces:

```ts
interface TraversalExecutionState<
  Inspection extends ExecutionInspection = CoreInspection
> { /* existing methods; inspect(): Inspection */ }

interface SyncTraversalExecution<
  Phase extends string,
  Event,
  Inspection extends ExecutionInspection = CoreInspection
> extends TraversalExecutionState<Inspection> { /* existing run/iteration */ }

interface AsyncTraversalExecution<
  Phase extends string,
  Event,
  Inspection extends ExecutionInspection = CoreInspection
> extends TraversalExecutionState<Inspection> { /* existing run/iteration */ }
```

These are signatures illustrating the additive generic change; existing methods and variance guarantees remain intact. Defaults preserve existing source and declaration behavior, including tree/DAG callers' detailed inspection types. Walking runners satisfy the interfaces with `GraphWalkInspection` as the third parameter and the full walking phase/event union. Cross-family wrappers that only need common observation opt into `ExecutionInspection`; wrappers depending on tree/DAG frame internals remain intentionally specific. Add packed compile-time assertions for both old consumers and generalized wrappers.

`GraphWalkInspection` extends the common contract with `kind: 'graph-walk'`, `sourceMode: 'graph'`, `concurrency: 1`, strategy, revisit policy, `iterableConfig: InspectionFilters<GraphWalkPhase>`, counters, frontier size, open source-iterator count, pending observation kinds, active visitor phase/position, and pending source/predicate/visitor/cleanup requests. Pending requests use walk-local request IDs, operation kinds, and opaque runner-local vertex tokens where applicable; never stringify caller IDs or expose data, callbacks, promises, or mutable cache containers. No DAG readiness or milestone diagnostics. `summary()` remains the caller-facing coverage/outcome report; `inspect()` describes execution mechanics.

Add explicit terminal `close()` / async `close()` to release retained source iterators when the host abandons a paused walk. It is allowed with no active execution owner; while active, the host first closes the public iterator or requests and awaits pause. Close is idempotent, does not synthesize further results, and prevents resumption. Iterator `return()` alone pauses, preserving existing CTT continuation semantics.

On terminal limit, failure, or explicit close, invoke `return()` once on every still-open source iterator that provides it. Dispose in reverse opening order and attempt all cleanups. Preserve an existing traversal failure over cleanup errors; otherwise retain the first cleanup failure unchanged and mark FAILED. Natural exhaustion already closes enumerations that reported done. Async cleanup is awaited and may depend on host cooperation. Source callbacks are serialized in v1; concurrent retrieval is a later, separately designed option. Reject an own `concurrency` option on both walking factories at construction/configuration, even if its value is one or undefined, instead of silently ignoring a familiar but unsupported option.

## Entry points and interoperability

`new GraphWalk(options).makeRunner()` and `new AsyncGraphWalk(options).makeRunner()` create independent runners without source I/O. `walkGraph(options)` / `walkGraphAsync(options)` run to a terminal or paused boundary and return the runner, matching existing one-shot helpers. Iteration begins from `makeRunner().getIterable()`.

Provide `walkSourceFrom(items, options)` for finite record catalogs: the options object contains required `id(item)` and `outgoing(item)` returning typed `{ to: ID, data: Edge }` catalog links, plus explicit root IDs. The adapter converts catalog IDs into the source target wrappers, so collection callers do not have to hydrate them manually. Materialize owned membership/topology once; preserve edge multiplicity and caller identity. Reject duplicate vertex IDs and unknown roots/targets. Provide its async materialization counterpart for async collections/selectors; the result is an ordinary synchronous walking source. These adapters are explicitly eager while custom sources remain lazy.

Provide `walkSourceFromDag(definition, { relations })` over the existing detached `DagDefinition`. Require an explicit nonempty selection of `children`, `workDependencies`, and/or `completionDependencies`. Roots follow the definition's entry. Emit tagged relationship data; child links point parent-to-child, dependencies point dependent-to-prerequisite, in canonical relation order children/work/completion and declaration order within each. Preserve parallel child slots. Ignore anonymous omitted slots; known omitted IDs resolve to walking omissions. No scheduling or milestone facts are asserted by walking those relations.

The adapter copies the selected topology and validates root/selected-target membership against live and known omitted identities. A shape-valid `DagDefinition` is not necessarily a validated DAG: reject unresolved selected endpoints, but allow cycles because this is exploration. Do not invoke preparation or source I/O. Unselected dependency relations do not affect walking validity.

Walkers do not directly consume arbitrary `TraversableTree` / `TraversableGraph` objects: their callbacks depend on resolved-tree/graph contexts and their result types carry different semantics. Do not force those interfaces to acquire mandatory walking members. Existing graph/tree APIs remain unchanged. Explicit source adapters are the compatibility boundary; add further adapters only for demonstrated use cases.

Export the family and types through the package root and a `traversals/graph-walk` subpath with shared CJS/ESM identity. Preserve existing namespace exports. No TypeScript upgrade is currently required by this design.

## Behavioral examples

Proposed consumer syntax, given an application-supplied typed `source`:

```ts
const runner = new AsyncGraphWalk({
  source,
  strategy: 'breadthFirst',
  revisit: 'simplePaths',
  limits: { maxDepth: 4, maxSteps: 2_000 },
}).makeRunner();

for await (const path of runner.getIterable({
  emitPhases: [GraphWalkPhase.PATH],
})) {
  // path.kind is 'path'; vertex and relationship data retain source types.
  console.log(path.vertices.map(vertex => vertex.vertexId));
}

console.log(runner.summary().outcome);
```

Changing `revisit` to `once` selects first-discovery routes; changing `emitPhases` to `[GraphWalkPhase.VERTEX]` selects vertex records. These are independent changes and the source stays the same. These are proposed APIs, so this snippet is design notation rather than a runnable checkout example.

For outgoing order `A -> B`, `A -> C`, `B -> D`, `C -> D`, `D -> A`, rooted at A:

- BFS vertices: A, B, C, D.
- DFS vertices: A, B, D, C.
- BFS edges: A-B, A-C, B-D, C-D, D-A.
- Simple BFS prefixes: A; A-B; A-C; A-B-D; A-C-D. Closing routes back to A are excluded.
- Repeated-vertex BFS prefixes with depth 3 additionally include A-B-D-A and A-C-D-A. The depth limit is visible in the final outcome.

Every route-enumeration example supplies an explicit depth/step bound. D resolves at most once per runner under every policy. Adding a parallel A-B relationship adds an edge occurrence and distinct path prefixes, but no extra unique-vertex result. Rejecting B-D does not prevent reaching D through C-D. Omitting D retains the two followed incoming edges when edge observations are selected and yields no D vertex/path observations.

For root A with only A-to-A, `revisit: 'once'`, and `maxDepth: 1`, the vertex is at depth zero and the returning edge is at depth one. The returning edge does not admit a second vertex occurrence; exhausting A's adjacency yields `exhausted`, not `limited`. Conversely, a new vertex B reached at depth one is a depth cutoff if its expansion predicate permits expansion, even if B would have been a leaf: the walker does not open its adjacency to find out. A boundary occurrence explicitly pruned by `expandVertex` is not a depth cutoff.

### One-pass heterogeneous context collection

Use document vertices A/C/D and symbol vertices B/E, with roots A and isolated E. Let A have two distinct links to B (`imports`, `references`) and one to C (`cites`); B links to D (`definedIn`), C links to D (`cites`), and D links back to A (`cites`). Vertex data is a `Document | Symbol` discriminated union and relationship data retains its own union.

With BFS, `revisit: 'once'`, and vertex plus edge observations, expected results are:

- Vertex callbacks: A, E, B, C, D, exactly once each, including isolated E.
- Edge callbacks: A-B/imports, A-B/references, A-C/cites, B-D/definedIn, C-D/cites, D-A/cites, exactly once each.
- Combined emitted order: vertex A, vertex E, edge A-B/imports, vertex B, edge A-B/references, edge A-C/cites, vertex C, edge B-D/definedIn, vertex D, edge C-D/cites, edge D-A/cites.
- At most one resolver call and one outgoing-enumerator opening per found ID; a target supplied hydrated may require no resolver call.
- Eight admitted occurrences (two roots plus six followed links), regardless of selecting vertices, edges, paths, or a mixture. Selecting every phase produces five vertex, six edge, and five first-discovery path records without changing those eight admissions.

This fixture is an acceptance criterion, not merely a demonstration. It must also work with vertex/edge visitors enabled and emission disabled. A standalone edge visitor can inspect the source document/symbol, relationship, and found/omitted target without a host lookup map. Endpoint discriminants are checked independently; relationship data does not magically narrow an unrelated vertex union.

### Lazy discovery with hydrated targets

The following proposed source adapts a host API that returns typed target objects as it discovers relationships. `rootItems` and `discoverLinks` are host inputs; the example requires no ID-to-object registry and does not materialize the reachable graph. This is design notation using the future source/runner types.

```ts
type ContextItem =
  | { kind: 'document'; id: string; title: string }
  | { kind: 'symbol'; id: string; name: string };
type Relation = { kind: 'cites' | 'imports' | 'references' | 'definedIn' };

function contextSource(
  rootItems: readonly ContextItem[],
  discoverLinks: (item: ContextItem) => AsyncIterable<{
    target: ContextItem;
    relation: Relation;
  }>,
): AsyncGraphWalkSource<ContextItem, Relation, string> {
  return {
    roots: () => rootItems.map(data => ({
      vertexId: data.id,
      resolution: { kind: 'found', data },
    })),
    async *outgoing({ data }) {
      for await (const link of discoverLinks(data)) {
        yield {
          target: {
            vertexId: link.target.id,
            resolution: { kind: 'found', data: link.target },
          },
          data: link.relation,
        };
      }
    },
  };
}

const runner = new AsyncGraphWalk({
  source: contextSource(rootItems, discoverLinks),
  revisit: 'once',
}).makeRunner();

for await (const event of runner.getIterable({
  emitPhases: [GraphWalkPhase.VERTEX, GraphWalkPhase.EDGE],
})) {
  if (event.kind === 'vertex') {
    console.log(event.vertex.data.kind, event.vertex.vertexId);
  } else {
    // Typed source data is available without observing or caching vertex events.
    console.log(event.source.data.kind, event.edge.data.kind, event.target.kind);
  }
}
```

An ID-only source uses `{ vertexId }` targets and supplies `resolveVertex`; a mixed source can supply hydrated results only where already available. Roots and outgoing links use the same target representation. The concrete hydrated example justifies the optional inline result instead of adding an unconstrained hint generic or requiring every caller to maintain a discovery cache.

## Independent review disposition

The library goals are the acceptance criteria for these revisions:

| Review finding | Design response | Required evidence |
| --- | --- | --- |
| Observation coupled to expansion/deduplication | Independent `revisit` policy and phase selectors; mixed observations in one session | Heterogeneous shared/cyclic fixture above, identical discovery and budgets under selector changes |
| Edge observation lacks source data | Typed found `source` plus found/omitted `target` | Standalone relationship visitor using both endpoints without a registry |
| Hydrated lazy sources need a host cache | Shared target wrapper with optional tagged resolution and optional ID resolver | Async hydrated source above, mixed targets, rejection before seeding, and first-accepted-result behavior |
| Execution capability compatibility unspecified | Defaulted inspection generic, common inspection contract, walk-specific detailed inspection | Old consumer type checks plus common wrappers across all families; inspection performs no work |

The revised design keeps algorithms and speed subordinate to reusable contracts. No feature in these revisions requires task policy, a durable store, automatic retries, graph execution, or a new TypeScript baseline. This table records how feedback is addressed; implementation and verification remain future work.

## Validation and delivery

Implement public regressions before behavior, then run the repository's complete check without weakening coverage. Test sync/async parity, deterministic BFS/DFS, shared descendants, self-loops, cycles, parallel links, empty/multiple/duplicate roots, object/symbol/undefined/NaN IDs, and deep graphs without recursion.

Exercise all revisit policies and limit boundaries, including hidden events, disabled visitors, rejected candidates, exact-cap outcomes, DFS first-discovery depth, roots reached from other roots, and omitted targets. Record callback counts to prove at-most-once resolution/adjacency opening and no lookup after pruning/bounds. Verify that resuming never repeats source pulls, committed callbacks, or emitted records. Test pauses between edge/vertex/path observations and new explicit selectors against buffered records; prove their narrowed result types match actual delivery. Verify all event selections produce the same candidate counts and source access sequence when callbacks do not request control changes.

Use controlled async generators to test backpressure, partially cached adjacency reuse, pending callback pauses, iterator ownership, retained source iterators, explicit close, cleanup order/errors, and preservation of arbitrary thrown values. Test that inspection never advances work and that concurrent runners do not share progress. Cover hydrated roots/targets with no resolver, mixed ID/inline targets, conflicting later inline results, omissions, filtered links that must not seed the cache, and missing resolver failures.

Type assertions must verify data/ID/edge inference, discriminated results, literal-selector narrowing and broad persisted-selector results, mandatory route-enumeration bounds, family-safe phases/commands, and rejection of async callbacks by sync APIs. Compile both pre-existing execution-interface consumers and new wrappers parameterized by common inspection; reject walking inspectors passed to wrappers requiring tree/DAG kernel internals. Packed consumers must exercise root/subpath exports, CJS/ESM identity, and the supported TypeScript baseline.

Add runnable examples for lazy async context exploration, typed code-reference edges, and bounded path explanation. Update current reference, agent-workflow guide, documentation map, package files, and migration notes only when the corresponding APIs exist. This draft is repository design history and is not evidence of a shipped feature.

Recommended implementation slices: source/identity and unique-vertex walking; edge results and predicates; bounded path occurrences; lifecycle/resource parity and adapters; documentation and packed-consumer verification. Keep each slice tested, with the full family integrated before advertising item 9 as implemented.

## Implementation plan

The [dependency-ordered implementation plan](../plans/2026-10-25-general-graph-walking.md) maps this contract to concrete files, public regression tests, compatibility checks, and ten reviewable tasks. Its consistency matrix identifies reused tree/DAG conventions and the semantic reasons for walking-specific behavior. The plan is ready for execution; no implementation task has been completed.

## Implementation reconciliation of the Fable review

The implementation uses `strategy` for BFS/DFS while visitor `order` remains its phase; the package subpath is `traversals/graph-walk`; all exported walking types use `GraphWalk*` (or `AsyncGraphWalk*`), with private engine types free to use `Walk*`. Constructor bounds are static, configure bounds are validated against prior state. Command results reuse the shared halt/no-op subset. Inspection reuses generic defaulted filters and retains `sourceMode: 'graph'`, with `kind: 'graph-walk'` identifying the distinct family. Catalog factories accept an options object containing selectors and roots; the bare source return is intentional. Exact step caps report exhaustion when it is already proven, and depth has one vertex-expansion enforcement point. The rejection of concurrency and first-observation omission semantics are explicit. Existing legacy selector aliases remain for execution-capability compatibility; no obsolete positional overloads are added.
