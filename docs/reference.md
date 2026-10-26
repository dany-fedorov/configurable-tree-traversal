# CTT API and behavior reference

[Documentation index](index.md) · [Agent workflow guide](agent-workflows.md) · [Quickstart](../README.md#quickstart-find-the-next-agent-tasks)

Start with the workflow guide for integration; use this page for exact lifecycle, identity, error, and compatibility contracts.

## On this page

- [General graph walking](#general-graph-walking)
- [Configuration patches](#configuration-patches)
- [DAG traversal](#dag-traversal)
- [Collection and forest sources](#collection-and-forest-sources)
- [Reusable prepared DAGs](#reusable-prepared-dags)
- [DAG fragments and composition](#dag-fragments-and-composition)
- [Validated DAG revisions](#validated-dag-revisions)
- [Ticket coordination](#ticket-coordination)
- [Filtered DAG visitors](#filtered-dag-visitors)
- [Discovery and execution as separate phases](#discovery-and-execution-as-separate-phases)
- [Discovery and completed work](#discovery-and-completed-work)
- [DAG dependency queries and explanations](#dag-dependency-queries-and-explanations)
- [Deferred DAG progress and reconciliation](#deferred-dag-progress-and-reconciliation)
- [Host policy and traversal feedback](#host-policy-and-traversal-feedback)
- [Traverse an object](#traverse-an-object)
- [Abstract trees](#abstract-trees)
- [Traversal orders](#traversal-orders)
- [Breadth-first traversal](#breadth-first-traversal)
- [Async traversal](#async-traversal)
- [Visitors and commands](#visitors-and-commands)
- [Pause and resume](#pause-and-resume)
- [Inspection and execution](#inspection-and-execution)
- [Rewrite objects](#rewrite-objects)
- [API compatibility](#api-compatibility)
- [Development](#development)

## General graph walking

The `GraphWalk` / `AsyncGraphWalk` family explores shared, cyclic information graphs independently of DAG work scheduling. Import from the package root, the `graphWalk` namespace, or `configurable-tree-traversal/traversals/graph-walk`; constructors, helpers, commands and types share CJS/ESM identity. `walkGraph({ source, ...options })` and `await walkGraphAsync({ source, ...options })` run once and return the runner, including a resumable runner when a visitor halts. These helpers accept one canonical options object. For incremental iteration, start with `new GraphWalk({ source }).createRunner()`.

Defaults are `strategy: 'breadthFirst'`, `revisit: 'once'`, vertex-only emission, all registered visitor phases enabled, and serial callbacks. Async walking permits value-or-promise callbacks and iterable/async-iterable sources; sync sources also feed async walkers. There is no concurrency option: supplying an own `concurrency` field rejects on either family. Sync types reject async sources, predicates and visitors; runtime also rejects thenables. No walking relationship means W/C readiness or settlement.

<!-- standalone -->

```ts
import { GraphWalk, GraphWalkPhase, materializeWalkSourceFromRecords } from 'configurable-tree-traversal';

const source = materializeWalkSourceFromRecords([
  { id: 'note', links: ['symbol', 'symbol'] },
  { id: 'symbol', links: ['note'] },
], {
  id: item => item.id,
  outgoing: item => item.links.map(to => ({ to, data: { kind: 'references' } })),
  roots: ['note'],
});
const runner = new GraphWalk({ source }).createRunner();
for (const event of runner.iterateEvents({ emitEvents: [GraphWalkPhase.EDGE] })) {
  console.log(event.source.data.id, event.edge.outgoingIndex, event.edge.to, event.target.kind);
}
console.log(runner.summary().outcome); // { kind: 'exhausted' }
```

### Walking sources and identity

`GraphWalkSource<Data, Edge, ID>` has `roots(): Iterable<GraphWalkTarget<Data, ID>>`, optional `resolveVertex(id)`, and `outgoing(vertex): Iterable<GraphWalkLink<Data, Edge, ID>>`. The async counterpart accepts promises and async iterables. A vertex is `{ vertexId: ID, data: Data }`; a target is `{ vertexId: ID, resolution?: GraphWalkVertexResult<Data> }`; a link is `{ target, data: Edge }`. Resolution is `{ kind: 'found', data }` or `{ kind: 'omitted' }`. Inline resolutions are already resolved tagged values; await hydration inside async callbacks/enumerators. Even object IDs use an explicit target wrapper to avoid confusing ID fields with resolution metadata.

Source calls begin only during execution, not construction, configuration, runner creation or inspection. Each runner owns independent caches and source callback/receiver snapshots. `roots()` must create independent iteration; roots and each adjacency enumeration must be finite. BFS consumes roots before descent; laziness does not guarantee fairness for infinitely branching sources. Empty/multiple roots need no synthetic holder. Repeated root declarations are deduplicated in declaration order under every policy.

For each admitted target, consult the per-ID cache, then inline resolution, then `resolveVertex`. The **first accepted result is authoritative, including omission**. Later inline results for that ID are neither revalidated nor substituted. A pulled but rejected link cannot seed resolution: inline result contents are inspected only on eligible admission with a cache miss. Unlike DAG omission, a walking omission asserts no milestone satisfaction. Start a fresh walker to refresh an ID after omission or content replacement. Requested ID is authoritative; results cannot remap it. `found` accepts `null`/`undefined` data; unknown IDs are host errors unless deliberately omitted. An uncached admitted target with neither inline resolution nor resolver throws `TypeError`. No `missing` result exists.

`resolveVertex` runs at most once per ID, and zero times when inline hydration wins. `outgoing` runs at most once per expanded found ID; adjacency is pulled incrementally and cached for other route occurrences. Pause retains partial enumeration; route replay uses cached links without repeating source I/O. Topology wrappers and traversal records are copied; caller data and IDs retain identity and are never frozen. A destination and optional inline-result reference are captured when its link is pulled. This is an observation over time, not a transactional snapshot of a changing host source.

IDs use SameValueZero, including object/symbol identity and valid `undefined`, `null`, `NaN` and zero IDs. An edge is `{ from, outgoingIndex, to, data }`; its runner-local identity is source ID plus zero-based outgoing enumeration `outgoingIndex` **before filtering**; `from` and `to` express the ordinary walking direction. DAG child edge data retains its authored `slotIndex` independently of the outgoing enumeration coordinate. Parallel endpoint pairs, even repeated input wrappers, remain distinct. Compare identity fields rather than wrapper reference. Put a durable host relationship ID in edge data if needed; enumeration indices are not stable across runs.

### Walking records and ordering

Use `emitEvents: ['vertex', 'edge', 'path']` to select walking event kinds. Equivalent `GraphWalkPhase` enum values are also accepted for emission; `visitorPhases` uses `GraphWalkPhase.VERTEX`, `.EDGE`, and `.PATH`. Each phase invokes callbacks for its corresponding event kind:

| Kind | Fields |
| --- | --- |
| `vertex` | `vertex`, route `depth`, incoming `via` edge or `null` for a root |
| `edge` | `edge`, found `source`, `depth` of the target route (source depth + 1), `target: { kind: 'found', vertex } \| { kind: 'omitted' }` |
| `path` | Ordered `vertices`, ordered `edges`, route `depth` |

In an edge record, `source` is the found source **vertex**, not the source adapter passed to the constructor. Its `depth` describes the candidate target route even when that target is omitted. `GraphWalkEvent<Data, Edge, ID>` is that union. `GraphWalkEventFor<Data, Edge, Phase, ID>` and `GraphWalkPathEvent<Data, Edge, ID>` select precise records. Endpoint data stays typed; narrow `event.source.data.kind` and, after `event.target.kind === 'found'`, `event.target.vertex.data.kind` directly. No ID registry or fabricated tree `Vertex` is required. See the [typed reference example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts).

A found root observes vertex then path. A followed link resolves/reuses its target, observes edge first, then vertex and path if a found occurrence is newly admitted under the policy. An omitted target of a followed link produces edge only. An omitted root has no incoming edge and produces no observation; it increments the `uniqueOmittedVertices` count and consumes a root-pull step and an admitted occurrence. Record resolver outcomes in the host if omitted root IDs are needed. Under `once`, returning/self/parallel links still observe edges without repeated vertex/path observations. Visitor chains commit before their selected record emits. Expansion follows the occurrence's observations: a pause after yielding a vertex does not eagerly fetch adjacency. BFS preserves root/level source order; DFS exhausts each root's descendants before requesting the next root and follows outgoing order. Both are iterative. Pausing between edge and vertex retains pending observations and expansion without replaying resolution, completed callbacks or delivered records.

`emitEvents` selects delivery; `visitorPhases` selects callbacks independently. Both use canonical field-wise selector patches, including empty selections and include/exclude filters; legacy aliases remain exclusive with canonical fields. Hiding records/disabling callbacks changes neither discovery, budgets, nor revisit policy. An explicit call-level `emitEvents: [GraphWalkPhase.EDGE]` narrows every yield to edge records, including buffered records from an earlier lease. An omitted selector or legacy alias returns the broad union because persisted selectors can differ from defaults. Close the previous iterator before changing lease options. An admitted chain retains its callback configuration, while delivery uses the new lease's emission selection. Suppressed/delivered observations never replay; only pending observations before their delivery boundary can be newly selected. This delivery-time behavior is specific to walking; tree/DAG emission semantics are unchanged.

### Revisit policies, predicates, and bounds

| `revisit` | Vertex/path occurrences | Followed edges |
| --- | --- | --- |
| `once` (default) | One per found ID; path is its first-discovery prefix | Every followed link once, including back/self/parallel links |
| `simplePaths` | Each prefix without a repeated ID | Excludes a link closing a repeated vertex before `shouldFollowEdge` |
| `walks` | Each prefix, including repeated IDs | Every eligible occurrence within bounds |

Paths include zero-edge roots and every admitted prefix, not only leaves. Parallel links distinguish routes with identical vertex sequences. In route modes, a root reached from another root still contributes its own root path when declared; duplicate declarations of the same root do not. Source results/adjacency remain cached even when occurrences repeat. Use `once` for collecting reachable vertices and relationships; route enumeration can grow exponentially.

`strategy: 'breadthFirst' | 'depthFirst'` chooses scheduling independently of revisit/emission. Depth counts route edges from zero. Under DFS/`once`, the first route fixes depth: finding a later shorter route does not re-expand a vertex. Use BFS for shortest discovery depth; DFS depth limits are not radius queries.

`shouldFollowEdge(edge, context)` runs before target lookup; false prevents lookup through that occurrence. Context has found `source`, candidate target `depth`, and `revisit`; route policies add the current source-prefix `path`. The edge already identifies the relationship; context has no required `via`. `shouldExpandVertex(vertex, context)` runs after observations and before adjacency enumeration; context has occurrence `depth`, incoming `via`, `revisit`, and route `path` where applicable. False preserves observations while pruning expansion. Under `once`, the first expansion decision stands; route modes evaluate policy per prefix. The callback types are `GraphWalkEdgePredicate` and `GraphWalkExpansionPredicate`, with `Async` counterparts. Predicates must return booleans (promises allowed only for async). Commands do not control pruning.

Limits are nonnegative safe integers, including zero. `simplePaths`/`walks` require `maxDepth` or `maxCandidateReadAttempts` at construction; `maxAdmittedTargets` alone is insufficient. Configuration patches validate merged options atomically and reject invalid transitions without mutation. A supplied `configure({ limits: ... })` record **replaces** the previous limits record; include each bound you want to retain. Runners snapshot options, selector arrays, visitor records and source callbacks/receiver; limits/topology policies are fixed for that runner. Larger bounds require a fresh runner. Unknown own option keys and unknown own limit keys reject with `TypeError` at construction or `configure()`, before discovery; invalid patches leave the previous configuration intact. This strict boundary does not change legacy tree/DAG configuration behavior.

| Limit | Accounting and boundary |
| --- | --- |
| `maxDepth` | Gate expansion at the occurrence boundary after `shouldExpandVertex`. Do not open outgoing at the boundary. A rejected expansion predicate contributes no depth cutoff. Otherwise conservatively report a cutoff even for an unqueried leaf. A returning edge under `once` alone does not trigger a cutoff. |
| `maxAdmittedTargets` | One candidate for each distinct root and eligible followed link, including omissions and returning/parallel links. Edge+vertex+path still count as one. Check allowance before another pull; zero performs no source calls. |
| `maxCandidateReadAttempts` | One attempted root/link `next()`, including end-of-stream, duplicates, filtered/cycle-closing candidates and cached replay. No next pull after exhaustion; zero performs no source calls. Does not bound time inside host callbacks. |

Global limits drain the final admitted candidate's finite observation chain (unless paused), then finish. Depth pruning permits other branches to continue. At an exact cap, do not pull extra data merely to prove exhaustion; report exhausted only if the final allowed pull already proves all work drained. Otherwise report limited. Limits do not cancel callbacks.

`summary()` returns detached `{ status, counts, outcome }`. Counts are `candidateReadAttempts`, `admittedTargets`, unique cached `uniqueFoundVertices`/`uniqueOmittedVertices`, `discoveredLinks` (distinct source links pulled before filtering, without counting cached route replay again), and processed `processedObservations: { vertex, edge, path }` independently of filters. Each phase counter advances at its observation acknowledgement, including suppressed records and disabled callbacks. `outcome` is `null` before terminal completion; `{ kind: 'exhausted' }`; `{ kind: 'limited', reasons }`; `{ kind: 'closed' }`; or `{ kind: 'failed', error }`. Reasons are unique and ordered `maxDepth`, `maxAdmittedTargets`, `maxCandidateReadAttempts`. Exhaustion means the configured source/policy drained, not completeness of a remote graph. Reaching `maxAdmittedTargets` reports `limited` even if the last admitted occurrence happened to be the final one: checking the next iterator result would violate the no-speculative-pull bound. To prove exhaustion, leave allowance beyond the expected admissions (distinct roots plus eligible followed links, not just distinct vertices). Always report outcome when presenting bounded provenance; see the [path example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-paths-example.ts).

### Walking visitors, pause, close, and errors

Use phase-keyed constructor visitors or `addVisitorFor`, `addVisitorGroupFor`, `setVisitorsFor`, `listVisitorsFor`. Flat registrations sort by priority before batching; explicit ordered groups retain group order/batching. Query wrappers are detached with shared callbacks/group metadata. Context supplies exact `phase`, zero-based `admissionIndex`, phase-local logical `phaseObservationIndex`, `visitorIndex`, and readonly descriptive `registration`. Callbacks receive walking event records, not tree vertices. Only existing `TraversalVisitorCommandName.PAUSE_TRAVERSAL` and `NOOP` commands are accepted, with absent or explicitly `undefined` `commandArguments`; non-undefined arguments reject. Settlement, mutation, subtree, deletion and chain-state commands reject. `commandCommitMode` controls `afterGroup` / `afterEachVisitor` boundaries independently of serial async execution. HALT retains callback progress and resumes without replay.

`run()` returns `this` synchronously or `Promise<this>` asynchronously; `iterateEvents()` returns a closeable generator/async generator. One execution owner is allowed. Competing/reentrant execution rejects without poisoning the owner; async calls on the owning iterator queue in order. Closing a never-started consumer iterator performs no source I/O. Active iterator `return()`, loop `break` or consumer-body error releases ownership and pauses while retaining caches/source iterators. `requestPause()` records a request only while RUNNING; the owner drains admitted callback work to a safe boundary. `isHalted()` and `getStopReason()` expose pause; walking has no awaiting-settlement state. Source/predicate/visitor failures retain exact thrown values, including `null` and `undefined`; subsequent execution rethrows that value. FINISHED runners never restart.

Runner `close()` is terminal resource disposal, distinct from consumer iterator `return()`. Exhaustion, limits, explicit close, and failure dispose still-open source iterators by calling `return` in reverse acquisition order. Attempt all cleanup even when one fails; exhausted iterators need no return. An existing source/predicate/visitor failure wins over cleanup errors; otherwise the first cleanup failure wins and leaves FAILED. **Closing an already failed runner rethrows/rejects its exact retained error without repeating cleanup. Overlapping async closes share the same promise.** Repeated close is idempotent for state/resource effects. Successful close reports FINISHED/closed; closing an already successfully finished runner preserves its outcome.

Terminal close requires no active execution owner; close during an active run/iterator rejects without changing its owner. First close the public iterator or request and await pause. Async iterator return immediately requests pause during an in-flight request, drains that admitted work, resolves pending next calls as done on successful return, and retains undelivered observations. A rejecting pending request remains the exact primary traversal failure. Consumer iterator throw retains its own consumer error for that throw call. Terminal close then prevents resumption and awaits resource cleanup without synthesizing further results. Neither pause nor close cancels promises or interrupts host work. Pending host work must eventually settle for pause acknowledgement/cleanup to finish. Consumer-body errors remain consumer errors and leave traversal resumable rather than becoming retained traversal failures. Use explicit terminal close when abandoning a paused runner, and handle its retained failure when applicable.

### Walking adapters and inspection

`materializeWalkSourceFromRecords(items, { id, outgoing, roots })` eagerly copies a finite catalog. `outgoing(item)` returns `{ to, data }` links; roots are explicit IDs. The adapter maps each catalog `{ to, data }` to a lazy-source `{ target: { vertexId: to }, data }` link and resolves targets from its validated catalog. Custom lazy sources use the target wrapper and may supply an inline `resolution`; catalog links use only `to` and `data`. Any extra inline hydration fields are ignored, and target data comes from the catalog. It rejects duplicate vertex IDs, unknown roots and unknown targets, preserves order/parallel links, and shares caller IDs/data. `await materializeWalkSourceFromRecordsAsync(...)` awaits finite inputs, roots and selectors once, then returns the same reusable **synchronous** source. These eager adapters differ from lazy custom source callbacks.

`materializeWalkSourceFromDagDefinition(definition, { relations })` requires a nonempty duplicate-free selection of `children`, `workDependencies`, `subgraphCompletionDependencies`. Roots follow entry order. Links point parent-to-child or dependent-to-prerequisite, in canonical children/work/completion order and declaration order within each. `GraphWalkDagRelation` is `{ kind: 'child', slotIndex } | { kind: 'workDependency' } | { kind: 'subgraphCompletionDependency' }`; the former name `DagWalkRelation` is not an alias. Preserve parallel child slots; anonymous omissions produce no target, known omitted IDs resolve as omissions. This adapter performs shape normalization and selected-topology membership checks, permits cycles, invokes no source I/O, and does not prepare/validate execution dependencies or assert W/C facts.

Declared live/omitted IDs must always be unique and disjoint. Selected child slots and forest-entry slots must agree with their declared live/omitted kind; root and selected W/C IDs may name either. Unselected child endpoint consistency is ignored after shape normalization, and unselected dependencies do not impose membership constraints. Selected unresolved endpoints reject. Owned topology and **adapter-generated relationship labels** are detached, including across outgoing calls/runners; ordinary caller-supplied edge data remains shared by identity. Walking sources are explicit adapters, not a common interface retrofitted onto `TreeSource` / `DagDiscoverySource`.

`inspect(): GraphWalkInspection` is synchronous, detached, frozen and passive on both runner families. It exposes common execution fields plus `kind: 'graph-walk'`, `sourceMode: 'graph'`, `concurrency: 1`, strategy, revisit, effective `executionOptions`, counters, frontier size, open source iterator count, pending observation phases, active visitor phase/`visitorIndex`, and pending request IDs/operations with optional runner-local `vertexToken` symbols. Tokens are not caller IDs. No callbacks, data, promises or kernel closures leak into inspection. It neither advances sources nor acquires ownership. For common cross-family wrappers and detailed-type defaults, see [inspection and execution](#inspection-and-execution).

## Configuration patches

Builders configure future runners; an existing runner retains its configuration snapshot. Sync and async variants use the same rules.

| Field | Omitted or `undefined` patch | Defined patch |
| --- | --- | --- |
| Walking `shouldFollowEdge`, `shouldExpandVertex` | Retain the previous predicate | Callback replaces it; `null` clears it. Initial `null` also means absent. |
| Walking `limits` | Retain previous limits | Replace the entire limits record; include every bound to retain. |
| `visitors` and `emitEvents` / `visitorPhases` | Retain unspecified fields | Patch visitor phases and selector fields independently, under their existing validation rules. |
| DAG `traversableTree` / `traversableGraph` | Inherited keys and own `undefined` keys retain the active source | An own defined same-family source replaces it; an opposite-family source rejects. |

Nullable walking predicates and optional DAG source placeholders explicitly accept `undefined` with `exactOptionalPropertyTypes`. DAG construction still requires exactly one own defined source; the active source cannot be omitted or undefined. Source getters are captured once per request, without calling source callbacks. Invalid walking mixed patches and DAG source-mode changes reject before configuration or registrations change. A rejected patch does not affect later runners. DAG source presence now consistently uses own-and-defined checks: this is a bug-fix relaxation of the configure guard already shipped in 0.11.0.

## DAG traversal

`DagTraversal` and `AsyncDagTraversal` traverse a discovered acyclic graph in two lifecycle orders: `ON_WORK_READY` visits eligible initial work, and `ON_SUBGRAPH_READY` visits structural completion after the vertex’s work, discovery, and retained children complete. Under default `visitorReturn`, normal initial visitor-chain completion satisfies work dependents; `externalSettlement` requires guarded host settlement; committed completion satisfies completion dependents. `dependsOnWork: [p]` waits for p's completed initial work (W); `dependsOnSubgraphCompletion: [p]` waits for p's committed `ON_SUBGRAPH_READY` transition (C), including closed discovery and completion of every retained child. Both lists gate `ON_WORK_READY` conjunctively. Completion admission or an unfinished async completion callback does not satisfy C. Dependencies do not create structural parent/child edges; graph sources have no implicit parent W by default. Set `implicitParentDependency: true` to inherit parent W when `dependsOnWork` is omitted; explicit lists, including `[]`, always win. Tree sources retain structural order and parent dependencies.

<!-- standalone -->

```ts
import {
  DagTraversal,
  DagVisitorPhase,
} from 'configurable-tree-traversal/traversals/dag-traversal';
import type { VertexTypes } from 'configurable-tree-traversal';

type Workflow = VertexTypes<string, string>;
function runTask(task: string): void {
  console.log(`Running ${task}`);
}
const jobs: Record<string, { children: string[]; dependsOnWork: string[] }> = {
  root: { children: ['compile', 'test', 'publish'], dependsOnWork: [] },
  compile: { children: ['publish'], dependsOnWork: ['root'] },
  test: { children: ['publish'], dependsOnWork: ['root'] },
  publish: { children: [], dependsOnWork: ['compile', 'test'] },
};
const traversal = new DagTraversal<Workflow>({
  traversableGraph: {
    resolveRoot: () => makeJob('root'),
    resolveChild: (id) => makeJob(id),
    getVertexIdFromHint: (id) => ({ vertexId: id }),
  },
});
traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, (vertex) => {
  runTask(vertex.getData());
});
traversal.createRunner().run();

function makeJob(id: string) {
  const job = jobs[id];
  if (job === undefined) throw new Error(`Unknown job: ${id}`);
  return {
    kind: 'found' as const,
    vertex: {
      vertexId: id,
      dependsOnWork: job.dependsOnWork,
      vertexContent: { $data: id, $childHints: job.children },
    },
  };
}
```

A DAG constructor accepts exactly one source mode. Use `traversableGraph` for graph callback options, explicit ids and dependencies; use `traversableTree` to adapt an existing tree source while visitors receive the graph facade. The source mode is fixed at construction, although `configure()` can replace the adapter within that mode. Tree-source results reject graph identity, `dependsOnWork`, and `dependsOnSubgraphCompletion`, including fields explicitly set to undefined.

Graph sources and DAG APIs accept a trailing identity type, for example `DagDiscoverySource<Workflow, Workflow, TaskId>` and `DagTraversal<Workflow, Workflow, TaskId>`. It flows through dependencies, prerequisite lookup, completed-work seeds, settlement, visitors, graph views/snapshots, summaries and diagnostics. Data, rewrite data, and child hints keep their existing generic positions. Constructors and helpers infer identity from typed graph sources; use an explicit union for heterogeneous identities when inference cannot combine them. `ResolvedGraph<T, ID>`, `DagSummary<ID>`, `DagVertexProgress<ID>` and `DagTraversalStallDiagnostics<ID>` default to `unknown` for compatibility. Visitor types append ID after their phase parameter, for example `DagVisitor<T, R, DagVisitorPhase.ON_WORK_READY, ID>`.

Selecting an ID domain other than `unknown` requires an explicit `vertexId` on every live graph-source result, both tagged and legacy, including prerequisite results. Omitted results can still omit it. Default `unknown` sources retain generated-ID fallback and prerequisite-ID inheritance. Tree-source DAG mode generates reference identities and therefore accepts only the default `unknown` ID domain. TypeScript cannot express property ownership, so graph result normalization rejects an inherited `vertexId` with `TypeError` before generated-ID or prerequisite-ID fallback. Class adapters must materialize an own field, for example `{ vertexId: instance.vertexId, vertexContent: instance.vertexContent }`; an own getter is also supported. Legitimately absent IDs retain default-`unknown` fallback, and explicit own `vertexId: undefined` retains the real undefined identity. ID values are never coerced or schema-validated. The advanced raw `runner.resolvedGraphsContainer.resolvedGraph` and `.store` use `ID | symbol` because they may include private synthetic-root bookkeeping; public graph views and snapshots exclude that root and retain `ID`.

Graph ids use `Map`/`Set` SameValueZero equality, so `NaN`, `null`, explicit `undefined`, symbols, and object references are valid. `getVertexIdFromHint()` returns a wrapper, not a bare id: return `{ vertexId: undefined }` for the real id `undefined`, or return `undefined` when the hint has no identity. A known hint id can reuse a vertex without resolving it; if both the hint hook and resolver supply ids, they must match.

Stalled DAG runners throw `DagTraversalStallError<ID = unknown>` (available from the root, `core`, and DAG traversal exports). Explicit type arguments type constructed errors and diagnostic annotations; an arbitrary catch value narrowed with `instanceof DagTraversalStallError` still has unknown IDs. The runner's ID type is not inferred through exceptions. Its `diagnostics` contains detached arrays while retaining original ID identity:

- `dependencies`: `{ id, unmet }` entries for vertices waiting on prerequisites.
- `unknownPrerequisiteIds`: unmet IDs absent from the discovered graph; lazy discovery may still hide those vertices in the source.
- `dependencyCycleComponents`: stable raw-ID projections of W/C milestone cycles, including structural completion waits. A child waiting for ancestor C is invalid; ordinary child waits for parent W remain valid.
- `dependencyBlockedIds`: vertices with unmet prerequisites outside those cycles, including direct missing-prerequisite dependents and downstream blocked work.
- `structurallyIncompleteIds`: unfinished vertices without unmet prerequisites, typically ancestors waiting for children.

The familiar `DAG traversal stalled:` message safely labels arbitrary IDs without coercing user objects. These diagnostics describe the terminal discovered graph; they do not fetch prerequisites or change scheduling.

`runner.getResolvedGraph()` provides read-only vertex, status, parent, child, path, and id queries. Query arrays are shallow snapshots: changing an array cannot edit topology, while contained references and user vertex data remain live. With `saveNotMutatedResolvedGraph: true`, DAG runners also expose a structural `notMutatedResolvedGraph` snapshot containing first-accepted content and discovery edges. Rewrites and deletions do not alter it, but user data is still shallowly shared.

Known omitted discovery slots retain an own `vertexId` in `ChildSlot<T, ID>`; presence distinguishes a known `undefined` identity from an unidentified omission. These slots remain omitted rather than structural children. Prepared definitions preserve their discovery positions when replaying the source.

### Collection and forest sources

All four source helpers return ordinary `{ traversableGraph, syntheticRoot: true }` options for DAG constructors and preparation. Their data is the caller's item and their hints are IDs (`VertexTypes<Item, ID>`).

| Helper | Input and selectors | Membership and identity |
| --- | --- | --- |
| `materializeDagSourceFromRecords(items, selectors)` | Iterable items; required `id(item)`; optional `children(item)`, `dependsOnWork(item)`, `dependsOnSubgraphCompletion(item)` return iterable IDs | Every item is catalogued, including disconnected entries. Any duplicate ID rejects, even the same record twice. Structural child IDs must exist in the catalog; `children` returns IDs, not records. |
| `materializeDagSourceFromRoots(roots, selectors)` | Iterable root items; same selectors, but `children(item)` returns iterable items | Expands iteratively. `children` returns records, not IDs. The same record can appear under multiple parents; different records with the same ID reject. |
| `materializeDagSourceFromRecordsAsync(items, selectors)` | Iterable/async-iterable items; value-or-promise selectors, with iterable/async-iterable edge results | Awaits materialization, then returns a synchronous source with the same graph rules. |
| `materializeDagSourceFromRootsAsync(roots, selectors)` | Iterable/async-iterable roots; value-or-promise selectors; children yield records | Awaits materialization with the same forest sharing rules. |

Absent edge selectors mean empty lists. All four adapters reject the retired selector keys `dependencies` and `completionDependencies` with `TypeError`, even when inherited or present with `undefined`, before reading the input or invoking selectors. Use `dependsOnWork` and `dependsOnSubgraphCompletion` so a stale selector cannot silently drop dependency edges. Caller task-data properties may still use any names, including `dependencies`. Structural child edges and work/completion dependency edges remain distinct. Missing prerequisite IDs are left to the existing validator; structural cycles throw `DagDiscoveryCycleError` during DAG discovery. The synthetic holder is hidden from public vertices, events, callbacks, and parent queries.

Materialization copies collection membership and edge arrays once. Later edits to caller arrays do not change topology; item data and opaque IDs remain shared shallow values and are never frozen. SameValueZero IDs, including `undefined`, `null`, `NaN`, symbols, and objects, retain their identity. Selector errors and async rejections propagate unchanged. See the [quickstart](../README.md#quickstart-find-the-next-agent-tasks) for a complete flat catalog.

Dependency vocabulary describes the same two milestone relations across layers:

| Layer | Wait for work (W) | Wait for completion (C) |
| --- | --- | --- |
| Collection selectors | `dependsOnWork` | `dependsOnSubgraphCompletion` |
| Sources and definitions | `dependsOnWork` | `dependsOnSubgraphCompletion` |
| Milestone queries | `milestone: 'work'` | `milestone: 'subgraphCompletion'` |
| Walking relation selections and definition diffs | `workDependencies` | `subgraphCompletionDependencies` |

Structural `children` remain a separate relation. Walking those declarations observes links; it does not execute or satisfy milestones.

### Reusable prepared DAGs

`prepareDag(input)` returns `PrepareDagResult<Data, ID>`; `prepareDagAsync(input)` returns a promise of the same union:

- `{ kind: 'valid', dag: PreparedDag<Data, ID> }` contains a reusable validated definition.
- `{ kind: 'invalid', issues: readonly DagDefinitionIssue<ID>[] }` represents validation failure and provides no executable definition. Source dependency failures contain one `{ kind: 'milestone', diagnostics: DagTraversalStallDiagnostics<ID> }` issue. `PrepareDagResult<Data, ID>` aliases `PrepareDagResult<Data, ID>`; there is no top-level `diagnostics` alias.

Inputs accept `traversableGraph`, `syntheticRoot`, `rootDependencies`, and `implicitParentDependency`; async preparation also accepts `concurrency`. Preparation eagerly discovers and validates without visitors or execution events. Visitors, completed-work seeds, injected continuation state, and source replacements belong outside this input. Source errors retain exact identity, even when the caller throws a `DagTraversalStallError`; malformed source contracts and structural-store errors also throw rather than becoming invalid results.

Structural child cycles throw `DagDiscoveryCycleError<ID = unknown>`, exported from the root, core and DAG traversal subpaths. Its readonly, frozen `vertexIds` is an ordered closed cycle witness (first ID repeated at the end), retaining arbitrary caller ID identity; it is not SCC membership. Catch values remain `unknown`, so narrow with `instanceof` before inspection. Collection adapters reject missing child IDs eagerly with `TypeError`, before preparation starts. For fully authored topology, `prepareDagDefinition` instead reports structural invalidity through `invalid.issues`; source discovery cannot finish materializing a cyclic DAG before reporting its error. Dependency invalidity appears in the `milestone` issue within `invalid.issues`, and caller-thrown values are never reclassified.

`dag.vertices` is a convenience projection of live vertices, not a round-trip source; its `children` omits omission slots. Use `dag.definition` for faithful reconstruction, composition and revision. The projection is a detached readonly array of descriptions: `{ vertexId, data, children, dependsOnWork, dependsOnSubgraphCompletion }`. Owned records and edge arrays are immutable, while data and IDs retain shallow caller identity. The definition preserves structural order, real-root versus synthetic-forest semantics, omissions satisfying prerequisites, effective implicit dependencies, and the original root W policy. Replay normalizes discovery hints to ID links; original opaque hints and callback contexts are not captured.

| Factory | Result | Options |
| --- | --- | --- |
| `dag.createRunner(options?)` | Prepared sync `DagTraversalRunner` | `visitors`, `completedWork`, `workCompletion`, `saveNotMutatedResolvedGraph` |
| `dag.createAsyncRunner(options?)` | Promise of a prepared async runner | Same options, plus `concurrency` |
| `dag.createWorkSession(options?)` | `DagWorkSession<ID>` using external settlement | `completedWork` |
| `dag.createAsyncWorkSession(options?)` | Promise of `AsyncDagWorkSession<ID>` using external settlement | `completedWork`, `concurrency` |

Each factory creates independent references, progress, visitors, seed copies, and settlement generations. New runners prepare replay topology before visitors execute and never call original source adapters. Replay may repeat in-memory validation. Runner data/hint types are `VertexTypes<Data, ID>`; event/visitor phase selection remains available through ordinary runner execution methods. The definition owns topology: attempts to replace sources, discovery/root/implicit-parent policies, sorting, or continuation state reject, including JavaScript own fields explicitly set to `undefined`. Session factories accept only the options listed above; use a custom configured runner plus coordination when visitors are needed.

A prepared definition is an in-memory value, not a durable checkpoint or editable graph. Reconstruct from source facts after process loss and create a new definition for a new graph revision. The [foundations example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts) verifies independent sessions and no original-source replay.

#### Materialized DAG definitions

`dag.definition` is a `DagDefinition<Data, ID>` containing ordered `vertices` (`vertexId`, `data`, `slots`, `dependsOnWork`, `dependsOnSubgraphCompletion`), `omittedIds`, and an `entry` tagged as `root`, `forest`, or `empty`. Dependencies are the captured effective W/C constraints. A definition slot is `{ kind: 'vertex', vertexId }` or `{ kind: 'omitted', identity: { vertexId } | null }`; the wrapper preserves a known `undefined` identity separately from an anonymous omission. Lower-level resolved-graph `ChildSlot` uses *own-property presence* of `vertexId` for the same distinction; the two public encodings are not interchangeable. Anonymous omission slots in vertex records remain stored, while replay filters them without inventing ID hints. Forest catalog slots require identities.

`defineDag(input)` copies and freezes owned arrays and records, retaining shallow caller data and ID references. Malformed required fields and duplicate live/omitted identity declarations throw `TypeError`. SameValueZero identity applies throughout, including dependency deduplication. Shape normalization does not validate graph semantics.

`prepareDagDefinition(definition)` normalizes and validates those source facts without callbacks or execution events. It returns `PrepareDagResult<Data, ID>`: `{ kind: 'valid', dag }` or `{ kind: 'invalid', issues }`. Invalid results have no executable DAG. Valid results retain authored declaration order, ordered slots, and entry mode, and support all prepared factories above. Programmer errors and exact accessor-thrown values propagate.

| Issue kind | Meaning |
| --- | --- |
| `missingStructuralEndpoint` | A vertex slot targets a non-live ID; `parent: { vertexId }` identifies the owner, and `parent: null` denotes a forest entry slot. |
| `invalidEntry` | `reason` is `unknownRoot`, `anonymousCatalogEntry`, or `emptyWithVertices`; `vertexIds` names the offending root/live records, or is empty for an anonymous entry. Root entries require a live ID. |
| `invalidOmission` | `vertexIds` lists identified omission slots absent from the declared omitted domain, including references to live IDs. |
| `unreachable` | `vertexIds` lists declared live or omitted identities outside the entry closure through structural slots and both W/C dependency lists. Detached prerequisites are valid. |
| `structuralCycle` | `vertexIds` is structural SCC membership in declaration order, rather than an ordered cycle witness. |
| `milestone` | `diagnostics` contains the existing `DagTraversalStallDiagnostics<ID>` for unknown W/C endpoints or combined milestone cycles. |

Structural issues are deterministic and prevent replay; structurally valid definitions use the existing DAG milestone validator. Empty entries may retain known omitted IDs, including an omitted root, and those IDs remain recognized for completed-work seeds. An empty entry with live records is invalid. This API represents in-memory source topology; it carries no runner progress or automatic completion-fact migration.

#### Definition diffs

`diffDagDefinitions(before, after)` compares immutable `DagDefinition` values and returns a `DagDefinitionDiff<ID>` with frozen owned arrays and records. It performs no preparation, execution, serialization or deep traversal. The definitions may have different data types; IDs retain their caller identity.

- `addedIds` follows new vertex order; `removedIds` follows old vertex order.
- `changedVertices` contains retained IDs in old vertex order, each with `aspects` in the fixed order `data`, `slots`, `workDependencies`, `subgraphCompletionDependencies`.
- `vertexOrderChanged` compares the full ordered live-ID sequence, so additions and removals also set it. Reordering alone does not add a changed vertex record.
- `entryChanged` compares entry mode and its ordered contents. `omissionsChanged` compares the ordered omitted-ID declarations.

IDs use SameValueZero throughout, including slots and dependencies. Slot kind and omission identity wrappers remain significant: anonymous omission differs from known `undefined`. Slot, dependency and omission ordering changes count. Data uses `Object.is`: replacing a data object counts even if its fields are equal; same-reference deep mutation cannot be detected. The host decides whether artifacts and accepted completion facts remain valid; the diff does not infer business invalidation.

### Validated DAG revisions

`reviseDag<Data, ID>(prepared, operations)` returns `DagRevisionResult<Data, ID>`: `{ kind: 'valid', dag, changes }` or `{ kind: 'invalid', issues }`. Only a valid result exposes a fresh prepared DAG. The prepared value fixes the data/ID domain; operations cannot widen it. All revision functions and types are exported from the root, DAG subpath and `dagTraversal` namespace.

`DagRevisionOperation<Data, ID>` is a readonly tagged union:

| Kind | Required payload | Effect |
| --- | --- | --- |
| `addVertex` | `vertex: DagDefinitionVertex<Data, ID>` | Append a full live declaration; an existing live ID throws `TypeError`. |
| `replaceVertex` | `vertex: DagDefinitionVertex<Data, ID>` | Replace a full declaration in place; an unknown live ID throws `TypeError`. |
| `removeVertex` | `vertexId: ID` | Remove only that declaration; an unknown live ID throws `TypeError`. |
| `replaceEntry` | `entry: DagDefinition<Data, ID>['entry']` | Replace the root/forest/empty entry. |
| `replaceOmissions` | `omittedIds: readonly ID[]` | Replace the ordered known-omission declarations. |

Operations apply in order to a private candidate. Removal does not prune references, delete descendants or satisfy work. A batch may leave intermediate dangling references and repair them before final validation through `prepareDagDefinition`. Expected graph invalidity returns the same [definition issues](#materialized-dag-definitions); malformed shapes, duplicate final identity declarations and programmer errors throw `TypeError`. Exact caller-thrown values propagate. Rejected and successful batches leave the original definition and sessions unchanged. Empty batches also return a fresh prepared value. Owned topology is copied/frozen; data and IDs remain shallow caller values.

`changes` is the [definition diff](#definition-diffs) between the original and final definitions, including vertex order. The diff reports declarations, not artifact validity. Old tickets remain governed by their original session and throw in new sessions. Revision neither cancels nor transfers admitted async callbacks, generations, progress, accepted facts or host revision IDs. New sessions start without completed work unless the host explicitly supplies an independently accepted `completedWork` set. Session factories still own their visitors; for callback execution use `createAsyncRunner({ visitors, workCompletion: 'externalSettlement' })` with `createAsyncDagWorkSession`.

See the [revision example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts) for an isolated old ticket and host-selected completion facts.

### DAG fragments and composition

`defineDagFragment(definition, ports)` creates a `DagFragment<Data, ID, Port>` from a closed valid definition and a record of string-named live vertex IDs. It copies/freezes owned topology and port wrappers; caller data and IDs stay shallow and unfrozen. Port names retain literal keys. A closed-definition validation failure throws `DagFragmentValidationError<ID = unknown> extends TypeError`, exported from the root and DAG subpath, with `issues: readonly DagDefinitionIssue<ID>[]`. The issue array is copied shallowly; issue records and caller IDs retain identity. Successful construction still returns the fragment directly. Malformed definitions, unknown or omitted ports, and symbol port names remain ordinary `TypeError`s. Local W/C endpoints must resolve within the live/omitted domain; add external edges during composition.

`instantiateDagFragment(fragment, { mapId })` returns a `DagFragmentInstance<Data, MappedID, Port>` with `{ definition, ports }`. It calls `mapId` once per declared live identity in vertex order, then once per omitted identity in declaration order, caching results across entry, slots, W/C lists, omissions and ports. Arbitrary identities, including objects, symbols, `undefined` and `NaN`, retain SameValueZero semantics. Mapped live/live, live/omitted and omitted/omitted collisions throw ordinary `TypeError`. Instantiation revalidates the definition before mapping and uses `DagFragmentValidationError` for that validation branch. Caller-thrown mapping/accessor values propagate unchanged. As with stall errors, `instanceof` alone does not recover the caller's ID type from an arbitrary catch. No ID scheme or name binding is implicit.

`composeDag(instances, options?)` returns `PrepareDagResult<Data, ID>`. Entries concatenate in instance order beneath a hidden forest holder. Root entries contribute a vertex slot, forest entries retain ordered slots, and empty entries contribute ordered known omitted slots. An entirely empty instance contributes no slot. Vertex/omission declaration order, internal slots, and structurally detached prerequisite components are preserved.

`DagCompositionOptions<ID>` has two independent ordered lists:

- `children: { parent: ID, child: ID }[]` appends structural slots without adding parent-work dependencies.
- `dependencies: { dependent: ID, prerequisite: { vertexId: ID, milestone: 'work' | 'subgraphCompletion' } }[]` appends explicit W/C waits without adding structural links. SameValueZero duplicates normalize within each dependency list.

Cross-instance identity collisions and nonexistent wire endpoints throw `TypeError`. Structural parents/children and dependency dependents must be live; W/C prerequisites may also name known omitted identities. Wire endpoint fields and prerequisite `vertexId`/`milestone` must be own properties; an explicitly owned `undefined` ID remains valid. Invalid milestone names throw `TypeError`. For connections between existing endpoints, structural or combined W/C cycles return `{ kind: 'invalid', issues }` through the same validator as `prepareDagDefinition`, with no executable DAG. Inputs remain unchanged. Composition creates topology without carrying progress, tickets or accepted completion facts into a new session.

<!-- standalone -->
```ts
import { defineDag, defineDagFragment, instantiateDagFragment, composeDag } from 'configurable-tree-traversal';

const local = defineDag<string, 'task'>({
  vertices: [{ vertexId: 'task', data: 'build', slots: [], dependsOnWork: [], dependsOnSubgraphCompletion: [] }],
  omittedIds: [], entry: { kind: 'root', vertexId: 'task' },
});
const fragment = defineDagFragment(local, { start: 'task' });
const first = instantiateDagFragment(fragment, { mapId: local => ({ project: 'first', local }) });
const second = instantiateDagFragment(fragment, { mapId: local => ({ project: 'second', local }) });
const result = composeDag([first, second], {
  dependencies: [{ dependent: second.ports.start, prerequisite: { vertexId: first.ports.start, milestone: 'subgraphCompletion' } }],
});
if (result.kind === 'valid') result.dag.createRunner().run();
```

For heterogeneous fragments, declare the data and ID unions explicitly with `composeDag<DataA | DataB, IdA | IdB>(instances, options)`. Options cannot widen an inferred identity domain to admit foreign wire IDs. All functions and public types are exported from the root and DAG subpath. See the [runnable fragment example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts) for independent ticket-based sync/async execution.

### Ticket coordination

`createDagWorkSession(runner)` and `createAsyncDagWorkSession(runner)` require runners configured with `workCompletion: 'externalSettlement'`. Wrapping executes nothing and creates no additional execution owner. Callers retain direct runner access; existing single-owner rules apply.

| Operation | Result and contract |
| --- | --- |
| `advance()` | Drains the runner, then returns `{ kind: 'awaitingSettlement', workTickets }`, `{ kind: 'paused' }`, or `{ kind: 'finished' }`. Async advance returns a promise; failures throw the exact original value. |
| `completeWork(ticket)` | Reports accepted work completion; returns `{ kind: 'accepted' }` initially and `{ kind: 'alreadyAccepted' }` for identical replay. |
| `failTraversal(ticket, error)` | Reports fatal traversal failure; same acceptance result union. Identical failure replay compares errors with `Object.is`; conflicting reports reject. |
| `summary()` | Returns the runner's detached `DagSummary<ID>` without execution or source I/O. |
| `getStatus()`, `getStopReason()`, `isHalted()`, `inspect()` | Shared `TraversalExecutionState` observations of the coordinated runner. |
| `inspectMilestones()` | Captures a detached `DagMilestoneSnapshot<ID>` for dependency explanations and queries without advancing execution. |
| `requestPause()` | Returns the runner's boolean cooperative pause request result; admitted callbacks drain before pause acknowledgement. |

Dispatch external work from `advance()`'s `awaitingSettlement.workTickets`, after host claim/capacity checks. `workCompleted` iterator events report committed W and cannot request dispatch; an enabled `ON_WORK_READY` visitor runs before work and can dispatch directly. Use `summary()` for progress, `inspectMilestones()` for dependency explanations, and `inspect()` for shared execution/iterator state.

`DagWorkBoundary<ID>` discriminates the three advance results; its `workTickets` contains readonly `DagWorkTicket<ID>` objects exposing only `vertexId`. Hidden provenance binds each ticket to its issuing facade and deferred generation. Foreign, copied, forged, and stale tickets reject before settlement mutation. Repeated observations of the same deferred work remain usable. Tickets do not transfer between two facades wrapping the same runner. The existing settlement implementation owns duplicate and conflict behavior.

`failTraversal(ticket, error)` is the sole fatal settlement method. Sessions expose inspection directly, including `session.inspectMilestones().explain({ vertexId, milestone: 'work' })`; snapshots do not change after later settlements.

Observation does not advance execution, but it is not constant-cost: `inspectMilestones()` captures the current dependency graph, and summaries on lazy DAGs diagnose topology in O(V + E) while it differs from successfully validated topology. Prepared/eager runners reuse successful topology validation.

Tickets are local capabilities with no durable serialized representation. Persist host-accepted completion facts, then call `completeWork(ticket)` and advance to observe newly eligible work. Tickets provide neither external claims nor retry/attempt policy. Fatal failure applies to the whole traversal; keep retryable work deferred under host policy.

### Filtered DAG visitors

`filterDagVisitor(predicate, callback)` and `filterAsyncDagVisitor(predicate, callback)` wrap ordinary DAG visitors. The synchronous predicate sees vertex **data**. A type guard narrows the callback's first argument; a boolean predicate filters without narrowing. The callback receives `(data, context)`, retaining the ordinary graph, reference, phase, group metadata, and command-result types. A false predicate invokes no callback and returns no commands. The async helper supports value-or-promise callbacks; predicate and callback errors preserve exact identity.

```ts
traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY,
  filterDagVisitor(
    (data: Task | Group): data is Task => data.kind === 'task',
    (task, context) => {
      console.log(task.prompt, context.phase);
    },
  ),
);
```

The host defines `Task`, `Group`, and their discriminants. The helper preserves callback ordering, command handling, and phase restrictions, including exclusive `DEFER_WORK_COMPLETION` only in `ON_WORK_READY`. Filtering alone does not defer work under `visitorReturn`; use external settlement when the host owns completion.

### Discovery and execution as separate phases

A DAG can be used in a **discover first, execute later** mode. Hints describe
how to find vertices and their structural children; dependencies describe when
their work is eligible. These relationships need not have the same shape.

| Concern | Declared through | Meaning |
| --- | --- | --- |
| Discovery and structure  | `resolveRoot()`, `resolveChild(hint)`, and `$childHints` child hints                            | Find vertices and establish structural parent/child relationships.                       |
| Work prerequisites | `dependsOnWork` vertex IDs | Hold a vertex's initial work until its prerequisites have completed their work. |
| Completion prerequisites | `dependsOnSubgraphCompletion` vertex IDs | Hold initial work until the prerequisite vertices and their retained subgraphs complete. |
| Work completion | Normal initial visitor-chain completion, `completedWork`, or successful guarded `settle()` | Supply the completion facts that release dependents. |
| Subtree completion | Structural children and the `ON_SUBGRAPH_READY` lifecycle | Wait for a vertex's own work and its discovered descendant subgraph to complete. |

For example, a synthetic root can list a flat catalog of `a`, `b`, `c`, and `d`.
Every real vertex can have `$childHints: []`, while `dependsOnWork` declares a diamond:

| Vertex | Child hints (`$childHints`) | Prerequisites (`dependsOnWork`) |
| ------ | --------------------------- | --------------------------- |
| `a` | `[]` | `[]` |
| `b` | `[]` | `['a']` |
| `c` | `[]` | `['a']` |
| `d` | `[]` | `['b', 'c']` |

All four vertices are discoverable through the catalog. Initially only `a` is
ready; completing it releases `b` and `c`, and `d` waits for both. No child hint
from `a` to `b` or from `b` to `d` is needed to express these prerequisites.
Discovery order does not satisfy a dependency or override its readiness rule.
It can still influence FIFO order among equally ready vertices.

Graph sources default to `implicitParentDependency: false`: omitting `dependsOnWork`
means no work prerequisites. Set it to `true` to inherit discovery-parent W
only for omitted lists. Explicit `dependsOnWork: []` or an ID list always wins. Children of
a synthetic catalog root have no implicit dependency on the catalog holder.
Real child hints still define structure, paths, and subtree-completion
obligations even when work dependencies are supplied separately.

With `discovery: 'eager'`, the runner resolves all reachable hints and validates
the declared dependencies before invoking any visitor. Discovery adapters should
describe or fetch graph facts; put the work being scheduled in visitors or in
the host executor. Resolving a vertex does not itself complete its work. Internal
dependency bookkeeping and supplied completion seeds may be processed during
discovery. Default lazy mode interleaves discovery and execution instead. For a separate preview boundary, use `prepare()` as described below.

Both DAG runners expose `prepare(): this` / `Promise<this>`. On fresh tree-source or graph-source runners without injected traversal state/containers, preparation fully discovers the closure exposed by roots, hints and prerequisite lookup and validates combined W/C constraints. It invokes no visitors, emits no execution events, commits no new real-vertex W/C and creates no deferred generations; `completedWork` seeds still supply accepted W. Empty/omitted-root previews succeed at `HALTED` / `prepared`, not FINISHED. Inspect `getResolvedGraph()` and `summary()` before calling `run()` or iterating.

Preparation adopts effective eager discovery even for lazy inputs, exposes that mode in summaries, and establishes eager topology freezing (hint rewrites/subtree disabling reject). Repeated preparation before execution is idempotent. Run adopts the discovered graph without repeating adapters. Preparation after execution starts, during another ownership operation, or with injected state/container objects (even empty ones) rejects recoverably. Failed preparation rethrows the exact stored error. Async preparation shares the existing owner/session: pause waits for already-admitted discovery callbacks without canceling them, then reports `paused`; another prepare continues or run adopts discovery and executes.

For a host-controlled execution phase, combine eager discovery with a complete
synthetic-root catalog and `workCompletion: 'externalSettlement'`.
After `run()` reaches quiescence, read `summary().awaitingSettlement`; the host can execute
selected work and report accepted completion through guarded `settle()`, or
rebuild from `completedWork` on its next tick. Under the default `visitorReturn` policy, normal chain return completes W; under `externalSettlement`, even an empty or filtered chain defers. The
[deferred progress example below](#deferred-dag-progress-and-reconciliation)
implements this flat-catalog mode.

Without `resolvePrerequisite`, a prerequisite ID does not itself discover or
fetch its vertex: every required vertex must be reachable through hints or
listed in the catalog. With that hook, the runner can request prerequisites
transitively before declaring them missing. Eager mode rejects unresolved
prerequisite IDs before visitors run. The adapter owns catalog completeness,
including disconnected components and cycles with no dependency-free source.

### Discovery and completed work

DAG graph sources accept `completedWork?: ReadonlySet<VertexId>` in both synchronous
and asynchronous traversal configuration. Each runner copies the set when created.
A listed vertex skips its initial `ON_WORK_READY` visitors and event, but its children
are still discovered and its `ON_SUBGRAPH_READY` visit waits for their completion.
Omitted vertices count as recognized IDs; an ID never discovered causes a
`TypeError`. This option requires a fresh graph runner and cannot be combined
with a tree source or injected continuation state/container.

Set `discovery: 'eager'` to resolve every reachable hint before the first visitor,
including descendants of vertices whose work dependencies are still blocked.
The runner then validates the original declared dependencies for missing IDs and
cycles, even when `completedWork` has already satisfied those dependencies.
Unknown seed IDs also fail before visitors in eager mode. Seeded lazy runners
validate original dependencies when discovery closes; ordinary lazy traversal
remains the default. Eager discovery honors explicit root `dependsOnWork` entries.
`priority` result metadata rejects with `TypeError('priority metadata is not supported')`.

Ordinary roots honor declared W and C prerequisites in lazy/eager mode, with or
without seeds or lookup. `rootDependencies: 'honor'` is the default. Explicit
`rootDependencies: 'ignore'` restores ignoring root W only; root C still applies.
Synthetic catalog roots are bookkeeping and have no work dependencies.

Without `resolvePrerequisite`, a prerequisite must be discovered or deliberately
omitted. Omission satisfies W and C; deletion cascades through both
kinds of dependent. Completed-work seeds satisfy only W, so a seeded composite
still completes its children and completion callback before releasing C gates.
Original W/C declarations are validated even when W was seeded. Lazy discovery
retains its existing admission order and reports known invalid stalls; eager
discovery validates the full reachable topology before visitors.

Progress `unmetPrerequisiteIds` is the stable union of unsatisfied W and C gates.
Vertices with a nonempty completion declaration also expose
`unmetSubgraphPrerequisiteIds`, which becomes `[]` when satisfied. Graph vertices
expose a copied `dependsOnSubgraphCompletion` only when its normalized list is nonempty.
See the runnable [build-join example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-completion-dependencies-example.ts).

Graph sources may define `resolvePrerequisite(id)` to find an unknown ID declared
in either prerequisite list. It returns a tagged `found`, `omitted`, or `missing` result (or a promise-like result
for `AsyncDagTraversal`), with exactly the ID as its argument and no fabricated
parent context. A default-unknown result with no `vertexId` field inherits the requested ID; typed live results must supply an own ID, and inherited fields reject.
An explicit ID must match using SameValueZero identity. `{ kind: 'missing' }` means not found and eventually produces the typed
missing-prerequisite stall. `{ kind: 'omitted', satisfiesDependencies: true }`
deliberately omits the requested ID and satisfies both W and C. A `found`
result wraps the non-null content and optional declarations under `vertex`.
Deprecated lookup `undefined` and `{ vertexContent: null }` inputs still normalize
to missing and omission respectively.
Thrown/rejected values pass through unchanged. First-accepted identity wins when
lookup and ordinary discovery race: a live vertex retains its original content
and declarations, including when a later result deliberately omits it. If omission was
accepted first, later content rejects with the existing omission/content error.

Lookup prefers available ordinary discovery. Eager traversal alternates natural
discovery and lookup until both reach closure, then validates before visitors.
Lazy traversal looks up unknown declarations when available work/discovery has
been consumed; it preserves lazy expansion for known blocked vertices. Found
vertices can declare further prerequisites. Shared W/C demand coalesces to one
outstanding callback per ID. Not-found answers are cached for that runner;
later ordinary discovery can still supply the vertex. Unused `completedWork`
IDs are never fetched. All callbacks share the configured concurrency limit.

A found prerequisite is a real detached component: no invented discovery edge,
parent, or child slot, and public depth zero even with a synthetic root. It has
an independent anchor that survives removal of a later discovery parent. Its
normal children follow ordinary pruning; explicitly deleting the anchor or the
ordinary traversal root still deletes it. The runner finishes only after all
retained components finish. Structural graph snapshots include these components
without adding dependency edges, so callers displaying a graph should enumerate
`getVertexRefs()` instead of assuming everything is reachable from `getRoot()`.

Deleting all consumers invalidates a queued lookup and ignores an already-started
outcome. Accepted anchors remain retained even when their consumers finish or
are deleted. Halting starts no new lookups; outcomes received while halted are
stored and applied on resume. Summaries and inspection do not invoke callbacks
or consume outcomes, and discovery remains partial while lookup is pending.
A live runner owns pending lookup handles; they cannot be transferred through
the data-only continuation seed. A new runner may repeat lookups. Lookup handles
remain runner-local and nonpersistent. Durable caching and persistence of graph
and accepted completion facts belong to the host.
See the executable [module-registry lookup example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts).

Set `syntheticRoot: true` when `resolveRoot()` returns a catalog holder whose child
hints describe multiple graph sources. Its supplied ID is ignored in favor of a
private identity, and its children have no implicit dependency on it. Every
catalog entry needs an explicit ID from the hint identity callback or the vertex
result. Repeating an ID within the catalog is an error; shared descendants under
real vertices remain valid. Combine this option with eager discovery to validate
a complete catalog, including disconnected components, before work begins. The
adapter is responsible for listing its entire domain.

Synthetic roots produce no visitor calls or events. `getResolvedGraph()`, visitor
and resolver graph views, and saved snapshots omit the synthetic vertex and its
edges. Their `getRoot()` returns `null`; paths follow only real parent edges.
Explicit catalog membership retains a listed vertex even after its sole real parent is deleted.
`noRoot` is therefore a no-op, while `noSelf` still removes the target vertex.
An empty catalog finishes without events. The runner's internal graph container
retains the synthetic vertex for scheduling.

Enabled eager/synthetic options require a fresh graph-source runner. Explicit
`discovery: 'lazy'` and `syntheticRoot: false` remain compatible with tree sources.
Eager mode rejects child-hint rewrites and subtree-disabling commands after
validation; data rewrites and vertex deletion retain their existing behavior.

### Structural sinks

`hasSingleSink(graph)` counts vertices with no **structural children** in a resolved graph snapshot. It returns true only when exactly one such vertex exists: an empty graph returns false, and a single isolated leaf returns true. Work and completion dependency arrows do not affect this count; use `inspectMilestones()` for milestone dependency questions.

### DAG dependency queries and explanations

`runner.inspectMilestones()` and the equivalent free function `inspectDagMilestones(runner)` capture a synchronous detached `DagMilestoneSnapshot<ID>` from either sync or async DAG runner (no `await` needed), including tree-source runners with their existing unknown ID domain. Import it and `DagExplanation`, `DagBlocker`, `DagMilestoneStatus`, `DagMilestoneQueryOptions`, and `DagMilestoneQueryResult` from the package root or DAG subpath. Capture performs no callbacks, source lookup, scheduling, settlement, or iterator ownership changes. Methods reuse that capture after the runner advances; take another inspection for current facts. Owned arrays and result records are copied on every query. IDs and caller data retain shallow identity and are never frozen.

Terminal runners reconstructed with their original in-memory `state` and `resolvedGraphsContainer` retain the original committed W/C, partial discovery, and progress observations. `new DagTraversalRunnerState(original.state)`, object spread, and `Object.assign` also retain this internal observation metadata. It does not resume execution or turn failure into successful work; original failure values remain unchanged. State class instances reserve the metadata slot before sealing, so sealed instances retain the same copying behavior. For manually assembled nonextensible state without that slot, observations remain available through the original state or `new DagTraversalRunnerState(original.state)`; plain spread cannot carry its side-table-only metadata. These facts are not serialized checkpoint fields: manually assembled or deserialized terminal state cannot recreate historical scheduler facts. A nonempty injected terminal graph without that metadata remains constructible, but `inspectDagMilestones` and `summary()` throw an explicit unavailable-observation error instead of inventing success.

Milestone targets are structural inputs: class getters and non-enumerable `vertexId`/`milestone` fields are supported. Each field is read once into an owned target record; getter-thrown values propagate unchanged.

Call `prerequisitesOf({ vertexId, milestone: 'work' | 'subgraphCompletion' }, { transitive?: boolean })` or `dependentsOf(...)`. Both return `{ milestones, edges, discoveryComplete }`, defaulting to direct constraints. Transitive queries use deterministic breadth-first order, preserve discovery/declaration order, deduplicate by SameValueZero ID and milestone, and exclude the starting milestone from the milestone list. Original edges retain **waiter waits for prerequisite** direction even for dependent queries, with reasons `workDependency`, `subgraphCompletionDependency`, `ownWork`, and `structuralChild`. They remain visible after satisfaction. Cycles terminate and retain returning edges. Unknown targets return empty navigation, including unresolved IDs appearing only as edge destinations. Hidden forest holders never appear.

`explain(target)` distinguishes three results:

| `kind` | Fields and meaning |
| --- | --- |
| `unknown` | `target`, `discoveryComplete`; identity is not known in this capture |
| `deleted` | `target`, `discoveryComplete`; a known tombstone, never successful work |
| `known` | `target`, `satisfied`, `progress`, `blockers`, `discoveryComplete`; live progress is a detached `DagVertexProgress<ID>`, while known omissions have null progress, satisfied true and no blockers |

Live W is satisfied only after work commits (including accepted seeds); live C requires its own committed completion transition. A seed for a parent therefore does not satisfy C while retained children remain incomplete. Ready/deferred W remains unsatisfied. Readiness describes dependency eligibility and never proves a host claim, dispatch, or business outcome.

`blockers` is a flat causal graph. Constraint records come first in breadth-first order; terminal facts then follow visited-milestone order. Only unmet original constraints reachable from the target appear, and traversal stops at satisfied milestones. The `DagBlocker<ID>` tagged union is:

| `kind` | Fields and meaning |
| --- | --- |
| `constraint` | Original `waiter`, `prerequisite`, `reason`, plus `waiterStatus` and `prerequisiteStatus` |
| `unfinishedWork` | Work `target` and `work: 'pending' | 'ready' | 'visiting' | 'deferred'`; a reachable unfinished W with no unmet outgoing constraint |
| `discoveryOpen` | Completion `target`; this vertex's expansion is unprepared/open, so retained children are not yet fully known |
| `completionPending` | Completion `target`; W and retained children are complete and expansion is closed, but C has not committed |

Endpoint status is `{ kind: 'live', work: DagWorkState, satisfied: boolean }` or `{ kind: 'omitted' | 'deleted' | 'unresolved' }`. Thus an unsatisfied C endpoint can explicitly have `work: 'completed', satisfied: false`. Omitted endpoints satisfy their milestones and do not appear as blockers. Unresolved endpoints are unknown identities, even when global discovery is complete; during partial discovery they are not proof of a missing source vertex. `discoveryOpen` uses local expansion state, independently of global `discoveryComplete`. A closed leaf does not acquire that blocker because another lookup is pending.

Engine-produced `DagVertexProgress` includes exact `unmetWorkPrerequisiteIds`, independent of `unmetSubgraphPrerequisiteIds`; the existing `unmetPrerequisiteIds` remains their union. The W field is optional in the public type for compatibility with manually constructed records. Do not recover W by subtracting C from the union when the same ID participates in both.

See the runnable [DAG inspection example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts).

### Deferred DAG progress and reconciliation

Set `workCompletion: 'externalSettlement'` to inspect
candidates without completing their work. Enabled callbacks and their commands finish before normal deferral, including when there are no callbacks. Both DAG runners expose `summary()` and
`settle(id, outcome, expectedGeneration)`. Import `DagSummary`,
`DagVertexProgress`, `DagDeferredWork`, `DagWorkState`, `DagSettlementGeneration`, and
`DagSettlementOutcome` from the package root or DAG subpath.

<!-- standalone -->

```ts
import {
  DagTraversal,
  type VertexTypes,
} from 'configurable-tree-traversal';

type Graph = VertexTypes<string, string>;
const prerequisites: Record<string, string[]> = {
  a: [],
  b: ['a'],
  c: ['a'],
  d: ['b', 'c'],
};
// In-memory stand-in for accepted completion facts loaded from host storage.
const acceptedCompletedWork = new Set(['a']);
const traversal = new DagTraversal<Graph>({
  workCompletion: 'externalSettlement',
  completedWork: acceptedCompletedWork,
  discovery: 'eager',
  syntheticRoot: true,
  traversableGraph: {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: '', $childHints: Object.keys(prerequisites) },
      },
    }),
    resolveChild: (id) => ({
      kind: 'found' as const,
      vertex: {
        vertexId: id,
        dependsOnWork: prerequisites[id]!,
        vertexContent: { $data: id, $childHints: [] },
      },
    }),
  },
});
const runner = traversal.createRunner().run(); // HALTED, waiting for the host
const snapshot = runner.summary();
console.log(snapshot.readyOrDeferredIds); // ['b', 'c']
const work = snapshot.awaitingSettlement.find(
  ({ vertexId }) => vertexId === 'b',
)!;

// A real host validates and durably accepts its result before settlement.
acceptedCompletedWork.add('b');
runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation);
runner.run();
console.log(runner.summary().readyOrDeferredIds); // ['c']; d still waits for c
```

Dispatch external work from `summary().awaitingSettlement`, whose `DagDeferredWork<ID>` records atomically contain readonly `{ vertexId, generation }`. Each snapshot lists exactly live deferred vertices without an accepted outcome, in discovery order, excluding queued-only, settled and deleted work. Arrays/records are detached and opaque ID objects retain identity; the snapshot does not claim host work. `readyOrDeferredIds` includes ready and deferred work, excluding visiting and completed work.

DAG iterator events use `DagEvent<T, ID = unknown>` with required `vertexId: ID`, preserving sync/async runner identity inference. Its discriminants are `kind: 'workCompleted'` for committed W and `kind: 'subgraphCompleted'` for committed C. These events have no callback `phase` or legacy `order` field. `emitEvents` selects committed kinds, while `visitorPhases` selects `DagVisitorPhase.ON_WORK_READY` and `ON_SUBGRAPH_READY` callbacks. Commit timing and event ordering are unchanged. ON_WORK_READY visitor callbacks remain pre-work. Seeded W emits no synthetic work event. Deferred `ON_WORK_READY` events emit only on settlement, not when dispatch becomes possible. A real `ON_WORK_READY` callback can instead dispatch before its chain defers. Synthetic roots and `completedWork` seeds do not need new settlement. `ON_SUBGRAPH_READY` remains automatic after W, discovery, children, and completion prerequisites are satisfied.

The explicit `DEFER_WORK_COMPLETION` command ends the initial visitor chain early, discards its uncommitted buffered
commands, and skips remaining visitors. It emits no event or dependency success
and holds no physical callback permit. Already committed changes and external
visitor effects cannot be undone. Deferral is rejected in completion and tree callbacks. It must be the only
command in its result: mixed batches reject before any commands apply. The
deprecated exported symbol remains a compatibility input with the same behavior. Deferred vertices may expand their own hints in lazy
mode; use eager discovery and a complete synthetic-root catalog for a global
frontier, including descendants of deferred parents.

`summary()` invokes no callbacks or resolvers and does not advance scheduling. It reports progress; `inspectMilestones()` captures dependency constraints/blockers, while `inspect()` reports execution and iterator state.
Its detached map, entries and arrays have readonly TypeScript types and retain
original ID identity without freezing caller objects. It reports discovery mode/completeness, per-vertex work
state and unmet prerequisites. `DagVertexProgress.vertexId` preserves caller identity;
`work: 'visiting'` means a visitor chain is active. `subgraphComplete` reports C,
and `unmetSubgraphPrerequisiteIds` reports unsatisfied C prerequisites.
`completedWorkIds` and `completedSubgraphIds` report committed W and C.
`readyOrDeferredIds` includes ready and deferred work, excluding visiting and completed
work. `deferredWorkIds` includes all deferred work, retaining accepted outcomes while W is uncommitted;
`awaitingSettlement` contains only deferred work still awaiting an outcome, as detached
`{ vertexId, generation }` records. Successful settlement commits W immediately;
accepted traversal failure removes dispatch eligibility while leaving W uncommitted.
`activeVisitorVertexIds` includes active visitor chains, including completion chains
whose W is already committed. Counts `readyOrDeferred`, `deferredWork`,
`activeVisitorVertices`, `workCompleted` and `subgraphCompleted` match those collections
and overlap rather than partition vertices. These are runner callbacks,
not external host attempts. `unusedCompletedWorkIds` exposes unrecognized seeds;
`diagnostics` describes known invalid graph structure, never deferred blockers
alone. Before root discovery, completeness is false. Lazy partial snapshots do
not promise a complete global frontier. Synthetic bookkeeping is absent.

A generation is local to a deferred vertex in one retained runner. Accepted
work completion commits work and publishes its configured initial event once without
replaying visitors. Identical reports return `false`, including after completion;
unknown, deleted, wrong-generation, cross-runner and conflicting reports throw.
Accepted failure (`{ kind: 'traversalFailed', error }`) fails the runner; execution rethrows the
exact error, including `null` or `undefined`. Failure replay equality uses
`Object.is`. Halting is resumable and retains generation validity. Settlement
wakes an active async consumer; after an idle settlement, call `run()` again.

`DagTraversalStallDiagnostics<ID>.dependencyEdges` explains original declared constraints: direction is **waiter waits for prerequisite**. `DagMilestone<ID>` is `{ vertexId, milestone: 'work' | 'subgraphCompletion' }`; `DagWaitEdge<ID>` adds `waiter`, `prerequisite` and `reason`. Edges are W(v)→W(p) (`workDependency`), W(v)→C(p) (`subgraphCompletionDependency`), C(v)→W(v) (`ownWork`), and C(parent)→C(child) (`structuralChild`). Seeds do not remove original constraints, and missing prerequisite endpoints are included. Ordering follows stable discovery, then each vertex's work dependencies, completion dependencies, own work and structural children. Cycle analysis uses the same constraints; `dependencyCycleComponents` gives strongly connected component membership, not an ordered cycle witness. Summary/error wrappers and endpoint records are detached, preserving opaque ID identity without freezing IDs. Historical manually constructed `DagTraversalStallError` input may omit edges and receives `[]`; engine diagnostics populate them.

### Host policy and traversal feedback

`{ kind: 'workCompleted' }` means the host accepts this vertex's work as complete for traversal
and allows its dependents to proceed. It does not classify the business result as
positive. A rejected proposal, negative decision, or other accepted business
outcome can still complete a vertex when the host's policy says its work is done.
`{ kind: 'traversalFailed', error }` instead aborts traversal with a fatal error; it is not a
per-vertex business failure state or a request to retry. A host retaining work
for another attempt keeps it incomplete and manages that attempt itself.
The progress state named `completed` records traversal work completion only.

CTT treats `$data` as opaque caller data. The host can associate accepted outcomes,
artifact references, or other facts with IDs or vertex data; CTT does not infer
business dependencies or ranking from those facts. The host ranks a copy of
`summary().readyOrDeferredIds` and applies its own capacity, claims, and admission policy.
CTT keeps its default FIFO scheduling; visitor `priority` orders callbacks within
a visit and does not prioritize graph work. Resolver-result `priority` metadata
is unsupported, as described above.

On a new reconciliation tick or restart, build a fresh runner from the host's
accepted `completedWork` facts. Never persist generation symbols. Discard a
runner when its graph revision changes. The host owns business outcomes,
artifacts, attempts, retries, claims, capacity, and all persistence, including
durable running/failure state. It overlays those facts on graph readiness before
admitting work. Runners remain in-memory continuations. See the runnable
[reconciliation example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-reconciliation-example.ts).

## Traverse an object

<!-- standalone -->

```ts
import {
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  ObjectTreeSource,
} from 'configurable-tree-traversal';

const traversal = new DepthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource({ a: { b: 1 }, c: 2 }),
});

const runner = traversal.createRunner();
for (const { vertex, vertexRef } of runner.iterateEvents({
  emitEvents: [DepthFirstPhase.PRE_ORDER],
})) {
  const path = runner
    .getResolvedTreeView()
    .getPathTo(vertexRef, { noRoot: true })
    .map((ref) => ref.unref().getData().key);
  console.log(path, vertex.getData().value);
}
// Paths: [], ['a'], ['a', 'b'], ['c']
```

The object adapter creates a synthetic root representing the whole input. Each vertex contains `{ key, value }`. Arrays use numeric index keys; objects include their own enumerable string and symbol keys. Sparse array holes are skipped. Non-enumerable and inherited properties are excluded. Property access may invoke getters.

Ancestor cycles throw a descriptive error before descent; shared objects in separate branches are traversed independently. The same adapter can be used by multiple runners. Use `resolveVertexHook` to skip or customize properties, or `getChildrenOfProperty` to define traversal for specialized values.

`ObjectTreeSource.resolveRoot()` / `.resolveChild()` intentionally retain their published direct `{ vertexContent, ... }` results, including `{ vertexContent: null }` omission, for callers that read those methods directly. New custom tree sources and `resolveVertexHook` use tagged results. See the [tagged custom-tree example](#abstract-trees) below; changing the built-in adapter's direct return shape requires a separate compatibility decision.

## Abstract trees

A tree adapter supplies `resolveRoot()` and `resolveChild(hint, options)`. Return `{ kind: 'found', vertex: { vertexContent: { $data: data, $childHints: childHints } } }` for a vertex, or `{ kind: 'omitted' }` for an empty tree or skipped child. Annotate tree adapters with `TreeVertexResolution<T>` (`TreeVertexFound<T>` / `TreeVertexOmitted`), or deprecated untagged `MakeTreeVertexResult<T>` (including null content). Tree results forbid `vertexId`, `dependsOnWork`, `dependsOnSubgraphCompletion`, and `satisfiesDependencies`, including own fields set to undefined, in DFS/BFS and DAG tree-source mode. This distinction follows the source: DAG runners consuming a tree adapter also use plain tree omission. Graph omission requires `{ kind: 'omitted', satisfiesDependencies: true }`, acknowledging that omission satisfies both W and C; false or undefined acknowledgements reject. Graph adapters retain `DagVertexResolution<T>`, `DagVertexFound<T>`, `DagVertexOmitted`, and legacy `MakeVertexResult<T>`; only graph prerequisite lookup accepts `DagPrerequisiteResolution<T>` / `PrerequisiteMissing`. Bare `null` is invalid everywhere; bare `undefined` is invalid for root/hint resolution. Graph own `vertexId` presence preserves an explicitly supplied undefined ID.

<!-- standalone -->

```ts
import {
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  type VertexTypes,
} from 'configurable-tree-traversal';

type Node = { $data: string; $childHints: Node[] };
type Tree = VertexTypes<string, Node>;
const root: Node = {
  $data: 'A',
  $childHints: [
    { $data: 'B', $childHints: [{ $data: 'D', $childHints: [] }] },
    { $data: 'C', $childHints: [] },
  ],
};
const traversal = new DepthFirstTreeTraversal<Tree>({
  traversableTree: {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: { vertexContent: root },
    }),
    resolveChild: (hint) => ({
      kind: 'found' as const,
      vertex: { vertexContent: hint },
    }),
  },
});
traversal.addVisitorFor(DepthFirstPhase.POST_ORDER, (vertex) => {
  console.log(vertex.getData());
});
traversal.createRunner().run(); // D, B, C, A
```

Child vertices are resolved lazily. Resolution options include the parent reference, depth, hint index, and the tree resolved so far. Custom adapters are responsible for detecting cycles in their own graph representation. Both strategies use iterative scheduling and can traverse deeply nested trees without recursive call-stack growth.

## Traversal orders

<img src="../Sorted_binary_tree_ALL_RGB.svg.png" alt="Binary tree with depth-first visit points: red for pre-order, green for in-order, and blue for post-order" width="460" height="393" />

Depth-first visit points: red for pre-order, green for in-order, and blue for post-order.
Source: [Wikipedia — Tree traversal](https://en.wikipedia.org/wiki/Tree_traversal).

| Strategy      | Order         | When a vertex is visited                        |
| ------------- | ------------- | ----------------------------------------------- |
| Depth-first   | `PRE_ORDER`   | Before its children                             |
| Depth-first   | `IN_ORDER`    | At configured child boundaries; once for a leaf |
| Depth-first   | `POST_ORDER`  | After its children                              |
| Breadth-first | `LEVEL_ORDER` | Level by level, with siblings in hint order     |

Iteration emits events even when no visitor functions are registered. By default, depth-first iteration includes all three orders. `sortChildrenHints` receives a shallow copy of each vertex's hints; return the desired child order. Resolution `hintIndex` refers to that resulting order.

In-order traversal defaults to visiting between children, and after the child of a one-child parent. Configure it with:

```ts
traversal.configure({
  inOrderTraversalConfig: {
    visitParentAfterChildren: 0,
    visitParentAfterChildrenAllRangesOutOfBoundsFallback: -2,
    visitUpOneChildParents: true,
    considerVisitAfterNullContentVertices: true,
  },
});
```

Child positions start at zero; negative positions count from the end. A pair such as `[0, -2]` is an inclusive range. Use `{ ranges: [0, 2] }` for multiple positions. The fallback is used only when all primary ranges are out of bounds. Null hints always count toward traversal completion; the last option controls whether they also trigger an in-order visit.

## Breadth-first traversal

<!-- standalone -->

```ts
import {
  BreadthFirstTreeTraversal,
  ObjectTreeSource,
} from 'configurable-tree-traversal';

const traversal = new BreadthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource({ a: { b: 1 }, c: 2 }),
});
const keys = [...traversal.createRunner().iterateEvents()]
  .filter((event) => !event.isTreeRoot)
  .map((event) => event.vertex.getData().key);
// ['a', 'c', 'b']
```

Register visitors using `BreadthFirstPhase.LEVEL_ORDER`. All six convenience helpers accept one options object with the source exactly once, an optional phase-keyed callback map, and traversal options:

<!-- standalone -->

```ts
import {
  traverseTreeBreadthFirst,
  BreadthFirstPhase as Order,
  ObjectTreeSource,
} from 'configurable-tree-traversal';
const runner = traverseTreeBreadthFirst({
  traversableTree: new ObjectTreeSource({ a: 1 }),
  visitors: {
    [Order.LEVEL_ORDER]: (vertex) => {
      console.log(vertex.getData());
    },
  },
});
```

`traverseTreeDepthFirst` uses `PRE_ORDER`/`IN_ORDER`/`POST_ORDER`; `traverseDag` uses `ON_WORK_READY`/`ON_SUBGRAPH_READY` with exactly one `traversableGraph` or `traversableTree`. `traverseTreeDepthFirstAsync`, `traverseTreeBreadthFirstAsync`, and `traverseDagAsync` use the same shapes and return promises of runners; sync helpers return runners. Omit `visitors` to just resolve the source. Helper and constructor/configuration maps share callbacks, definitions, flat arrays, and explicit ordered groups. Deprecated positional overloads remain; see the [migration guide](migration-uniform-api.md#convenience-helpers) for conversions and the generic sync/async union limitation.

## Async traversal

`AsyncDepthFirstTreeTraversal` and `AsyncBreadthFirstTreeTraversal` preserve their synchronous counterparts' configuration, events, commands, graph queries, and visitor metadata. Their adapter, sorter, hint-identity, and visitor callbacks may independently return either a value or a promise. `run()` returns a promise of the runner, and `iterateEvents()` returns an async-generator-compatible iterator.

<!-- standalone -->

```ts
import {
  AsyncDepthFirstTreeTraversal,
  DepthFirstPhase,
  type VertexTypes,
} from 'configurable-tree-traversal';

type Files = VertexTypes<string, string>;
async function listChildren(path: string): Promise<string[]> {
  return path === 'src' ? [] : ['src'];
}
const traversal = new AsyncDepthFirstTreeTraversal<Files>({
  concurrency: 4,
  traversableTree: {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: { vertexContent: { $data: '/', $childHints: ['src'] } },
    }),
    resolveChild: async (path) => ({
      kind: 'found' as const,
      vertex: {
        vertexContent: { $data: path, $childHints: await listChildren(path) },
      },
    }),
  },
});

for await (const event of traversal.createRunner().iterateEvents({
  emitEvents: [DepthFirstPhase.PRE_ORDER],
})) {
  console.log(event.vertex.getData());
}
```

Set `concurrency` to a positive integer to bound invoked callbacks; the default is `Infinity`. Async tree runners may prefetch child callbacks after the parent event boundary. Under timing-independent adapters and visitors, they provide qualified parity with synchronous tree runners: event values and final topology match, but callback timing and the resolved prefix visible to a callback can differ. Async DAG traversal guarantees dependency ordering and committed lifecycle ordering, not a complete event-sequence match with synchronous DAG traversal.

## Visitors and commands

Visitors receive `(vertex, options)` and may return `{ commands: [...] }`. Commands apply to the resolved tree; they do not mutate the original input object.

| Command                             | Effect                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `DEFER_WORK_COMPLETION`                     | Defer DAG initial work; must be the sole command in its result               |
| `NOOP`                              | No change                                                                    |
| `PAUSE_TRAVERSAL`                    | Pause after the current visitor's command batch                              |
| `DELETE_VERTEX`                     | Remove the vertex and its resolved descendants, and skip pending descendants |
| `REWRITE_VERTEX_DATA`               | Replace data using `{ newData }`, including `null` or `undefined`            |
| `DISABLE_SUBTREE_TRAVERSAL`         | Skip remaining descendants while retaining this vertex                       |
| `REWRITE_CHILD_HINTS`             | Replace pending child hints using `{ newHints }` before descent              |
| `SET_VERTEX_VISITORS_CHAIN_STATE`   | Pass `{ vertexVisitorsChainState }` to the next sequential visitor           |

Hint rewriting is accepted during depth-first `PRE_ORDER`, breadth-first `LEVEL_ORDER`, and DAG `ON_WORK_READY`; other phases reject it. Eager DAG validation rejects topology rewrites at runtime. `REWRITE_VERTEX_HINTS_ON_PRE_ORDER` remains a deprecated alias with the same phase restrictions. Deleting the root produces an empty resolved tree. Deleted vertices have no further visitor calls or yielded events.

Visitors have a numeric `priority` (default `100`; higher runs earlier); ties retain registration order. Flat definitions sort by priority/index **before** batching. Adjacent `afterGroup` visitors buffer commands until the next `afterEachVisitor` or phase end. Changing batching alone never changes callback order. This intentionally corrects the historical group-first order.

For an ordering boundary, use `{ groups: [{ visitors: [...], commandCommitMode: 'afterGroup' }, { visitors: [...] }] }`. Groups run in array order; priorities sort only within each group. Policy belongs to the group: member `commandCommitMode`/`resolutionStyle` fields reject. Empty groups validate then are inert, creating no boundary. Group default is `afterEachVisitor`. Async `concurrency` is independent of command batching. Deprecated `resolutionStyle: CONCURRENT`/`SEQUENTIAL` maps to `afterGroup`/`afterEachVisitor`; contradictory explicit aliases throw.

Constructor/configure maps, helper maps, and `setVisitorsFor(order, input)` share `VisitorPhaseInput<F>`: a callback, `{ visitor, priority?, commandCommitMode? }`, a readonly flat array of definitions, or explicit groups. `addVisitorFor` remains callback/options shorthand; `addVisitorGroupFor(order, group)` appends a group. An individual append after explicit groups joins a final implicit flat group. `listVisitorsFor` returns normalized typed records accepted by `setVisitorsFor`, preserving groups. All six builders return mutable detached arrays containing copied records: editing a query never changes registrations, future runners, or prior snapshots. Callback closures remain shared references; frozen group metadata/identity is retained for list/set round trips. Apply changes through `setVisitorsFor`, `addVisitorFor`/`addVisitorGroupFor`, or `configure`. This shallow query guarantee does not redesign advanced raw fields. To regroup records, project `{ visitor, priority }` and set the new group policy. Canonical definitions never need `addedIndex`; supplied compatibility indexes are ignored. See the [complete shared-definition example](migration-uniform-api.md#shared-visitor-definitions-and-ordered-groups). Concrete sync/async receivers retain phase inference; narrow mixed receiver unions before inline registration.

The actual phase is inferred in registration, configuration records, and helper maps, including `options.phase`. Reusable callbacks typed with general `TraversalVisitor`/`DagVisitor` aliases can return common commands across entry points. `options.registration` exposes readonly, phase-neutral `VisitorRegistrationMetadata` (`addedIndex`, `priority`, `commandCommitMode`, and deprecated `resolutionStyle`). It has no callable `visitor` in the supported TypeScript context; retain your callback reference or retrieve full typed records with `listVisitorsFor()`. Full records remain in configuration/list/set APIs; see the [migration guide](migration-uniform-api.md#phase-aware-visitors).

Visitor options include `resolvedTree`, `vertexRef`, `phase`, root flags, and per-phase indices. `phaseVisitIndex` and `visitorIndex` start at zero. `previousPhaseVertexRef` points to the preceding vertex for that phase, or `null` on its first visit. Chain state starts at `null` for each visit. Each runner takes a snapshot of the configured visitor records and in-order configuration. Configuration copies include nested in-order ranges and iteration filter arrays. Exported traversal defaults are frozen; use constructor options or `configure()` to customize a traversal.

## Pause and resume

<!-- standalone -->

```ts
import {
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  ObjectTreeSource,
  TraversalVisitorCommandName,
} from 'configurable-tree-traversal';

const traversal = new DepthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource({ a: 1, b: 2 }),
});
traversal.addVisitorFor(DepthFirstPhase.PRE_ORDER, (vertex) => {
  if (vertex.getData().key === 'a') {
    return {
      commands: [{ commandName: TraversalVisitorCommandName.PAUSE_TRAVERSAL }],
    };
  }
  return undefined;
});
const runner = traversal.createRunner().run(); // HALTED
runner.run(); // finishes the remaining visitors and traversal
```

All six runners expose `requestPause(): boolean`. It returns true only for a new request while RUNNING; INITIAL, already-requested, HALTED, FINISHED and FAILED return false without driving execution or rethrowing a retained error. The method records a request; the active owner acknowledges it at a safe boundary after admitted chains drain. Callbacks are not canceled and future source admissions stop. A suspended iterator may require another `next()` or `return()` to reach that boundary. Resume with run/iteration without replaying committed work. During async preparation, admitted source callbacks can delay acknowledgement too.

Breaking a `for...of` iteration also pauses the runner. Resume the same runner with `run()` or a new `iterateEvents()` call. Completed visitors and yielded events are not repeated. A halt can occur even when its order is excluded from iteration. The halted event is yielded after its visitor chain completes on resumption.

`iterateEvents()` and `run()` accept independent selectors: `emitEvents` selects event kinds (tree phases, DAG `'workCompleted' | 'subgraphCompleted'`, or walking `'vertex' | 'edge' | 'path'`); `visitorPhases: 'all' | { include: readonly Order[] } | { exclude: readonly Order[] }` selects callbacks. Empty include disables callbacks, empty exclude runs all, and empty emission suppresses events without disabling callbacks. Each supplied field patches the previous effective value; omitted fields, `{}`, and no argument retain it. Caller arrays are copied on activation. An admitted chain keeps its configuration through its boundary.

Deprecated `iterateOver` selects emission. A non-null legacy `enableVisitorFunctionsFor` wins over `disableVisitorFunctionsFor`, even when empty; clearing enable with null activates a retained disable list. Legacy fields also patch independently. A canonical visitor selector replaces that concern and clears dormant legacy lists. Canonical and legacy names for the same concern cannot coexist in one request, even with undefined alias values; unrelated concerns may mix. Malformed selectors, invalid family kinds/phases, removed `emitPhases`, and unknown execution keys reject before configuration changes. Inspection exposes both views: project the desired canonical fields instead of passing the entire mixed inspection filter object back. Only one iterator may own a runner; close it before resuming elsewhere.

`getStopReason(): TraversalStopReason | null` and inspection `stopReason` distinguish `prepared`, `paused`, `awaitingSettlement`, `finished`, and `failed`. Successful DAG preview reports prepared. INITIAL/RUNNING return null. HALT/iterator close reports paused only after admitted chains drain; deferred quiescence reports awaitingSettlement. Successful settlement while halted preserves the preceding stop reason until resume clears it. Failed settlement reports failed with the exact error. The same contract applies to async execution/session surfaces.

Statuses are `INITIAL`, `RUNNING`, `HALTED`, `FINISHED`, and `FAILED`. Running a finished runner has no effect; use `createRunner()` for a fresh traversal. Errors from adapters, visitors, sorting, or traversal execution propagate and leave the runner `FAILED`. Later attempts to run or iterate it rethrow the original thrown value. Its partially resolved tree remains available for inspection; retry with a fresh runner after correcting the cause.

An error in the consumer's `for...of` body closes that iterator and leaves the runner `HALTED`, so it can be resumed. Runners are in-memory continuations, not serializable checkpoints. Advanced callers injecting `traversalRunnerInternalObjects` must provide mutually consistent state and resolved-tree storage, including the saved tree and reference map when saving original vertices.

Async iteration uses the same one-owner rule. Calling `return()` on an active async iterator requests a halt immediately, including while `next()` is waiting on an adapter, then drains only already-started visitor-chain work. Unresolved `next()` calls finish as done and buffered events remain available on resume. User callbacks are not cancelled, so a pending visitor can delay close indefinitely. A loop-body error follows JavaScript iterator-close semantics and remains the reported error; the runner is resumable unless traversal itself failed.

## Inspection and execution

`getStopReason()` reports the stop cause; every runner also has synchronous `inspect()`. For tree/DAG runners, inspection returns a detached, frozen snapshot with status, traversal kind, source mode, execution mode, effective concurrency, ready visits, frames, visitor chains, pending callback identities, event boundaries, physical in-flight callback count, and buffered event count. Inspection never calls user code, consumes an event, or advances traversal, and snapshots contain reference ids rather than callback functions, promises, or vertex data.

```ts
const asyncRunner = traversal.createRunner();
const iterator = asyncRunner.iterateEvents();
const next = iterator.next();
const snapshot = asyncRunner.inspect();
console.log(snapshot.pendingRequests, snapshot.inFlightCallbackCount);
await next;
await iterator.return();
```

Tree and DAG emission uses the selector retained by each admitted visitor chain. Already buffered events survive pause and are delivered on resume without re-filtering against the new call's selector. For example, resuming an async DFS iterator with only POST_ORDER selected can first yield a retained PRE_ORDER event. Their iterator result types therefore remain the family event union; a call-level selector does not promise narrowing. Walking applies its selector at delivery, including buffered records, and supports that narrower promise.

Root flags describe family-specific boundaries. Tree `isTreeRoot` and DAG `isGraphRoot` identify the resolved container root; `isTraversalRoot` identifies the chosen traversal start, which can differ when traversing a subtree. Synthetic graph holders are bookkeeping and hidden from public events. Walking uses `via: null` for an entry occurrence; under route policies, the same ID reached through a link has a non-null `via`. These meanings do not imply a shared root flag.

The six tree/DAG runners use the same explicit transition-state model. Synchronous runners execute its callback requests inline; asynchronous runners delegate iteration and `run()` to one shared `AsyncCoreExecution` session with serialized state commits, finite callback limiting when configured, and one iterator lease. Calling `run()` while an iterator owns that session rejects rather than starting a second execution.

For tree/DAG wrappers, use `TraversalExecutionState` (`getStatus`, `getStopReason`, `isHalted`, `inspect`, `requestPause`), `SyncTraversalExecution<Phase, Event>`, or `AsyncTraversalExecution<Phase, Event>`. Run returns this / Promise of this; iterators are closeable `Generator<Event, void, unknown>` / `AsyncGenerator<Event, void, unknown>`. Preserve the family's phase enum: a DFS abstraction rejects DAG phases and cannot widen to accept them. Historical `AsyncCoreExecution<Event, Phase = never>` remains available; its erased default permits no explicit phase names. Specify Phase when selecting phases. `TreeTraversal` and `TreeTraversalRunner` are historical tree-only abstract bases, not common bases for DAG or walking builders/runners. Use the execution capability interfaces for generic wrappers. `TreeTraversalRunner` exposes the same sync capabilities; historical `TreeTraversalIterable` imports remain supported.

Walking runners share the public execution capabilities with a default-preserving inspection parameter: `TraversalExecutionState<Inspection = CoreInspection>`, `SyncTraversalExecution<Phase, Event, Inspection = CoreInspection>`, and the async counterpart. Existing two-parameter code retains detailed `CoreInspection`. Walkers use `GraphWalkInspection`; choose `ExecutionInspection` explicitly for a wrapper accepting every family. Its common fields are status, stop reason, halt request, kind, execution mode, in-flight callback count and buffered event count. Generalizing inspection never widens supported phases or gives walking a tree/DAG frame shape.

<!-- standalone -->

```ts
import {
  GraphWalk, GraphWalkPhase, DepthFirstTreeTraversal, DepthFirstPhase,
  type ExecutionInspection, type TraversalExecutionState,
  type SyncTraversalExecution, type TreeSource, type VertexTypes,
} from 'configurable-tree-traversal';

function observe(state: TraversalExecutionState<ExecutionInspection>) {
  return state.inspect().status;
}
function drive<Phase extends string, Event>(
  runner: SyncTraversalExecution<Phase, Event, ExecutionInspection>, phase: Phase,
) {
  return runner.run({ emitEvents: [phase] });
}
const tree: TreeSource<VertexTypes<string, string>> = {
  resolveRoot: () => ({ kind: 'found', vertex: {
    vertexContent: { $data: 'root', $childHints: [] },
  } }),
  resolveChild: () => ({ kind: 'omitted' }),
};
const dfs = new DepthFirstTreeTraversal({ traversableTree: tree }).createRunner();
const walk = new GraphWalk({ source: {
  roots: () => [{ vertexId: 'root', resolution: { kind: 'found' as const, data: 'root' } }],
  outgoing: () => [],
} }).createRunner();
console.log(observe(dfs), observe(walk));
drive(dfs, DepthFirstPhase.PRE_ORDER);
drive(walk, GraphWalkPhase.VERTEX);
```

The [typed reference example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts) also demonstrates an async phase-preserving wrapper. Walking deliberately has event records, target wrappers, delivery-time selector narrowing and terminal source-resource disposal. Existing tree/DAG sources and emission rules retain their original contracts.

## Rewrite objects

The `rewriteObject` namespace is retained for compatibility:

<!-- standalone -->

```ts
import { rewriteObject } from 'configurable-tree-traversal';

const input = { keep: 1, remove: 2, nested: [3] };
const result = rewriteObject.rewriteObject(input, {
  rewrite: ({ key, value }) => {
    if (key === 'remove') return { delete: true };
    if (typeof value === 'number') return { rewrite: { value: value * 10 } };
    return undefined;
  },
});
console.log(result.getOutput()); // { keep: 10, nested: [30] }; input is unchanged
```

Rewrites run in post-order. Return `{ rewrite: { key, value } }` to rename or replace a property, `{ delete: true }` to remove it, or `undefined` to retain it. Composite parents are reconstructed from their processed children. Arrays are compacted after skipped/deleted elements. Null and undefined values are retained; deleting the root returns `null`.

Set `assembleCompositesBeforeRewrite: true` to receive `assembledComposite` alongside the original property. Options include `isArray`, `isObject`, `isComposite`, and `getKeyPath({ noRoot: true })`. Custom `isArray`/`isObject` and `assembleArray`/`assembleObject` functions support specialized reconstruction. Default reconstruction is for plain objects and arrays; it does not preserve prototypes, descriptors, collection types, or identity shared between branches.

`rewriteObject` retains its six generic positions, but default `Out` is now `unknown`: reconstruction and arbitrary rewrites cannot promise input shape/prototype preservation. A `getOutputObjectFromRootValue` converter can infer its return type. Use named root `rewriteObjectAs<Out>(input, options?)`, namespace `rewriteObject.rewriteObjectAs`, or the rewrite subpath helper for an explicit caller assertion; it performs no schema validation, and property values in its options remain unknown.

`outputObject` is the historical initial converted snapshot, possibly captured while halted. It never updates on resume. Call `result.traversalRunner.run()` to resume, then `result.getOutput()` to read the final converted root. The getter throws before FINISHED, applies the original conversion after completion and caches its first successful result, reusing the initial snapshot if the first run already finished. Exact conversion failures propagate and are not cached as successes, so a later call can retry. Deleted/null roots remain supported; the getter neither resumes nor promises deep immutability.

The helper owns its source. `traversableTree` is forbidden in inline and pretyped options; JavaScript presence, including present `undefined`, rejects before source, rewrite or conversion callbacks. Remove that field, or use a traversal directly for a custom source.

Generic `MakeMutationCommandFunction<Output, RewriteInput = Output['VertexData']>` requires complete replacement data by default. Object helpers explicitly accept `TO_MutationPropertyPatch<Output>` (`Partial<Output['VertexData']>`), so key-only and value-only patches remain typed. Omit `rewrite` for no patch; a present `rewrite: undefined`, null, or primitive throws TypeError before mutation. `{ rewrite: { value: undefined } }` sets an undefined value when the output type permits it. User assembler errors propagate exactly.

`resolveVertexHook(hint, context)` returns `ObjectVertexHookResult<T>`: `{ kind: 'useDefault' }`, tagged tree `found` with replacement content, or `{ kind: 'omitted' }`. It applies to child/hint resolution, not the synthetic root. Null/undefined returns and graph metadata reject. Deprecated `makeVertexHook`/`returnMe` remain compatible; two active hooks reject. An undefined canonical/legacy hook or the legacy null-disabled hook does not conflict. Cycle checks and shallow identities remain.

With `saveNotMutatedResolvedTree: true`, visitors can inspect a separate original resolved tree. Its vertex references, child lists, and resolution contexts are independent of command-driven changes. Vertex data is shallowly shared, so direct mutation of user data is not an immutable snapshot. The saved tree contains only vertices actually resolved during traversal. Runner configuration and visitor records are also copied when a runner is made; later builder configuration does not alter that runner.

Prefer `runner.getResolvedTreeView()` or `tree.asReadOnly()` for queries. `ResolvedTreeView<T>` has `getRoot`, `has`, `getChildrenOf`, `getParentOf`, `getPathTo`, and `getResolutionContextOf`, with readonly collection/context types and no mutators/raw records. The stable facade is live and shallow. Query arrays and context objects are detached copies, while refs, hints, and data retain identity. Mutating returned arrays/contexts cannot edit topology. DAG runners return this tree facade in tree-source mode and null in graph-source mode. `getResolvedTree()` and raw container/record getters remain advanced editing APIs; their owners must preserve structural consistency. No durable or deeply immutable snapshot is implied.

`CTTRef.getRefId()` is the generated reference UUID. `ResolvedGraph.getVertexId(ref)` returns the host's arbitrary vertex ID and `getVertexRefById(id)` returns its reference. Graph facades and snapshots use the same names. Deprecated `getId`, `getIdOf`, and `getVertexById` delegate to these methods. Do not substitute the reference UUID for a host ID or stringify object/symbol/undefined IDs.

`ResolvedTree.getPathTo(ref, { noRoot?, noSelf? })` returns the resolved ancestry in root-to-vertex order and throws if the reference is absent from that tree. Saved-tree paths use saved references from `notMutatedResolvedTreeRefsMap`. Deleting a resolved vertex removes its resolved descendants and detaches it from its parent; deleting the root clears the root pointer.

## API compatibility

The [uniform API migration guide](migration-uniform-api.md) lists all deprecated spellings and intentional behavior/type changes. `Vertex` owns enumerable `$data`/`$childHints`; legacy `$d`/`$c` property access uses prototype getters. Object spread, `Object.keys`, and JSON output therefore use canonical names, even for legacy inputs. `clone({ $data: undefined })` explicitly replaces data. Mixed canonical/legacy content fields reject. Built-in object and resolved-tree source adapters emit canonical content; resolved-tree structural child references remain structural refs.

CTT 0.11.0 uses UUID 14 and requires Node 22.12.0+ for synchronous ESM dependency loading, or Bun 1.4.4. Public CJS/ESM entry points and TypeScript 4.7.4/4.9.5 consumer compatibility remain covered by packed checks.

Namespace exports `core`, `depthFirstTraversal`, `breadthFirstTraversal`, `dagTraversal`, `traversableObjectTree`, and `rewriteObject` remain available, alongside named exports for all six traversal classes, helpers, and types. Public subpaths include `core` and each traversal family. Historical deep imports such as `configurable-tree-traversal/core/Vertex` and `configurable-tree-traversal/traversals/dag-traversal/lib/DagTraversalRunner` also work.

Corrected behavior includes independent iteration, reliable halt/resume, terminal error handling, sorting, subtree deletion, and zero-based visitor indices. Root deletion and rewriting null now return null instead of throwing; the rewrite result type accounts for that. See [CHANGELOG.md](../CHANGELOG.md) for the full list.

## Development

```sh
npm ci
npm run check         # types, lint, coverage, examples, build, packed consumers, benchmark checks
npm test -- tests/traversal-combinations.test.ts
npm run test:coverage
npm run build-watch
npm run benchmark -- 50000
npm run benchmark:dag -- --vertices 1000 --samples 3 --summary-iterations 10
npm run benchmark:dag:lifecycle -- --vertices 100 --samples 3 --summary-iterations 10 --ticks 5 --batch 64 --concurrency 4
npm run tsfile -- examples/tree-from-image-example.ts
```

The tests cover deterministic generated trees and DAGs, mutations, dependencies, async races, pause/resume, failures, snapshots, original-tree isolation, object reconstruction, deep chains, and wide trees. `npm run check` requires 100% statements, branches, functions, and lines across all source files and executes every example. See [the testing guide](testing.md) for the test layout and regression workflow.

The packed consumer check runs CommonJS, native ESM, and strict TypeScript imports from a temporary extracted tarball, using installed runtime dependencies. It checks classic Node and Node16 TypeScript resolution, mixed `.mts`/`.cts` consumers, every emitted deep-import path, native ESM resolution, and cross-loader identity and DAG lifecycle behavior. It uses `tar` and runs in CI on Linux. Node 22 and 24 run the full check; a separate Bun 1.4.4 lane runs the packed consumers and facade/benchmark correctness tests after an npm build. Jest and source coverage remain Node checks. No package is published by the verification commands. The benchmark compares deep and wide trees with both traversal strategies; timings depend on the machine and are not performance guarantees.

The DAG inspector benchmark emits JSON with the loaded artifact/version, machine details, raw samples, and warmup-excluded medians/ranges. It covers five dependency shapes with empty and prerequisite-closed prefix seeds, full eager discovery, deferral admission, and repeated summaries. For registry-package reproduction, exact timing boundaries, and the limited independent Kahn baseline, see [the DAG baseline](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/docs/performance/2026-10-22-dag-baseline.md). Run `npm run build && npm run test:benchmark` for focused fixture, frontier, purity, and CLI checks.

The lifecycle benchmark measures sync/async and eager/lazy runners separately, including bounded settlement batches, resumed runs, reconstruction from the same accepted completion facts, and summaries. Its async visitor awaits a resolved Promise, measuring callback scheduling overhead. JSON records exact settlement counts, partial lazy discovery, artifact tree hashes, raw ticks, and timing boundaries. Counts are bounded positive integers; `--library-path` selects a package directory or entry. See [the lifecycle measurements](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/docs/performance/2026-10-22-dag-lifecycle.md) for results and limitations. Both benchmark correctness suites run after the build in `npm run check`.

Retries, durable checkpoints, and callback cancellation are outside this release. User vertex data is not frozen. Discovery cycles are rejected; dependency cycles or missing dependencies fail as a scheduling stall.

MIT licensed.
