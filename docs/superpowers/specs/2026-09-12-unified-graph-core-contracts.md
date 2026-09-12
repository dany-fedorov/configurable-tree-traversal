# Unified graph core: decisions and execution contracts

**Status: finalized for the Sol handoff. The user confirmed the explicit, inspectable state-machine direction and welcomed asynchronous core execution.**

This companion resolves the execution questions left by the [design spec](2026-09-12-unified-graph-core-design.md). The user asked the planning agent to choose answers autonomously and expose its assumptions, then selected the explicit state-machine design and requested a finalized handoff. The answers retain their rationale and trade-offs for review. The [implementation plan](../plans/2026-09-12-unified-graph-core.md) implements these contracts.

## Review first: questions and answers

### A01. What is the product boundary?

**Answer:** a general-purpose, mutable traversal library with synchronous and asynchronous tree/DAG families. Dependency scheduling is part of traversal; retries, durable checkpoints, external-effect rollback, and fetching undiscovered prerequisites are outside 0.8.0. Keep the six classes and the existing synchronous helpers. LangGraph is context for the build/reuse decision, not a new dependency.

**Reason:** the user explicitly wants the library's wider traversal use cases. No additional runtime dependency or TypeScript upgrade is needed for this design.

### A02. What should a graph adapter receive?

**Answer:** add `TraversableGraph` and `AsyncTraversableGraph`, whose callbacks receive `resolvedGraph`, a structural original-graph snapshot when enabled, and an incoming-edge resolution context. Keep existing `TraversableTree` callback options unchanged. A DAG constructor accepts exactly one of `traversableGraph` or `traversableTree`; the property chooses the context contract for the entire runner. Supplying both or neither throws at construction.

Tree-source DAG traversal uses a real `ResolvedTree` compatibility view when invoking the adapter, so `TraversableObjectTree` can still perform its ancestor checks. Its visitors receive graph options. Graph identity/dependency fields in a tree-source result are rejected; choose `traversableGraph` to return those fields. Source mode cannot change through `configure()` once the builder has been constructed, although its adapter can be replaced within that mode before making a new runner.

**Trade-off:** explicit source selection adds one constructor distinction, but avoids pretending a multi-parent graph is a tree or switching callback types midway through discovery. This tightens the earlier phrase “ready-set accepts any adapter.”

### A03. What exactly is an id, and what does the hint-id hook return?

**Answer:** `VertexId = unknown`, with `Map`/`Set` SameValueZero equality. Explicit `undefined`, `null`, object references, symbols, and `NaN` are valid ids; detect an explicit id using an own-property check. Missing ids use the new reference's UUID string, retrying generation if that key is already known. Supplying an already known id intentionally invokes identity/omission/deletion semantics.

Change the optional hook to return `{ vertexId } | undefined`, or a promise thereof for async adapters. Bare `undefined` means “no hint identity”; `{ vertexId: undefined }` identifies a real vertex. A hint id is authoritative when the resolution result omits its id. If both provide an id, they must match. The hook is an identity promise, not a second source of vertex content. An already known id can skip resolution; in-flight unknown ids are not coalesced.

**Trade-off:** the result wrapper differs from the earlier raw-id proposal, but removes a sentinel collision before this new API ships. Graph ids do not become `CTTRef` ids and are not made generically serializable.

### A04. Can one strict graph store transparently replace today's mutable tree records?

**Answer:** use one `GraphStore` implementation with `tree` and `dag` entry modes. In tree mode, the exact supplied `VertexResolved` object remains the authoritative legacy topology record. `ResolvedTree.get()` returns that object, `set()` replaces it, and child-array identity and duplicate child entries remain observable. Tree-mode graph queries derive ancestry from the legacy resolution context and children from its child array. Do not maintain a competing copied tree topology.

In DAG mode, ordered slots and incoming edges are authoritative and cycle-checked. A separate slot ledger in tree mode represents unresolved/omitted/completed traversal work; it does not replace the publicly visible compact child array. Runner-owned commands update storage and the ledger together.

**Evidence:** `tests/resolved-tree-coverage.test.ts` permits unresolved roots and duplicate child entries; `tests/core-edge-cases.test.ts` checks saved-store identity and prevalidation. Tightening every legacy setter would break compatibility.

**Boundary:** direct editing of legacy record arrays retains its current storage behavior but is not a new reactive scheduling API. No proxies or whole-tree scans are introduced to observe arbitrary edits. Strict DAG invariants govern runner-managed DAG topology; they are not retroactively imposed on manually assembled legacy records.

### A05. How are graph queries and mutations exposed?

**Answer:** the new `ResolvedGraph` is a public read-only query interface, implemented by the store's facade object rather than a public constructor. Query collections are shallow snapshots; user vertex data and `CTTRef` handles remain live. Graph mutations during traversal use existing visitor commands, applied to the current vertex. Strict store-writing methods are internal implementation APIs, not methods on the graph facade. Existing mutable `ResolvedTree` methods remain available.

`getVertexById` returns a reference or null. `getIdOf` throws for an absent reference because null and undefined are valid ids. `getParentsOf` deduplicates parent references in incoming-edge acceptance order; `getChildrenOf` preserves slot order and duplicate live child references. `getPathsTo` returns unique reference sequences in child-slot order, deduplicating parallel edges that produce the same reference sequence. An absent path target throws. `hasSingleSink` returns false for an empty graph and counts discovery-graph sinks in the currently resolved structure.

**Trade-off:** general external graph editing would require another mutation protocol. It is not necessary to support the visitor commands in this release.

### A06. What do depth, original snapshots, and injected state mean for graphs?

**Answer:** a vertex's discovery depth is fixed by its first accepted discovering edge. A resolution context describes the particular incoming edge currently being resolved: its depth is the parent's discovery depth plus one, not a shortest-path claim. Later incoming edges do not reschedule the vertex or rewrite its discovery depth.

DAG configuration uses `saveNotMutatedResolvedGraph`, default false. Its snapshot records first accepted vertex contents and all accepted discovery edges using separate references and copied child-hint arrays; data remains shallowly shared. Snapshot queries are structural only: no live status query is exposed. Rewrites and deletion do not alter the snapshot; rejected, omitted, or discarded resolutions do not add snapshot vertices. Tree-source DAG traversal also maintains the legacy saved-tree context needed by that adapter. Existing tree classes keep `saveNotMutatedResolvedTree` and their existing snapshot semantics.

Keep all existing tree state classes, fields, methods, and shared injected objects. The actual DFS runner currently uses private local frames, not its public legacy `STACK`; preserve the legacy helpers rather than suddenly using that stack as the DFS policy's new source of truth. New kernel state is distinct from that compatibility surface. Injecting legacy state does not become a portable checkpoint feature.

Legacy storage can already contain references outside the current traversal's work. Preserve those records without automatically enrolling them. Tree termination checks the vertices/slots enrolled in this run, rather than forcing every manually seeded legacy record through a visit. Native DAG injection requires its seed's scheduling records and graph entries to agree. A new run resets lifecycle bookkeeping only for the references it enrolls; it does not erase unrelated legacy storage.

For new DAG state injection, accept an `INITIAL` seed or a quiescent `HALTED` state containing data-only ready/expansion queues. Reject active callback requests, partially executed chains, or undelivered events belonging to a different runtime. A small runtime-ownership registry on the container identifies these cases. Resume a live or partially executed traversal through its original runner. An injected `FINISHED` state remains a no-op; a `FAILED` state requires the stored tagged failure value.

### A07. Should the core still be a set of nested generators?

**Answer, confirmed by the user:** use the explicit state-machine design. `TraversalKernel` stores chain positions, frame stages, ready work, and pending request identities as inspectable records. It returns effect requests; sync and async core runtimes execute work and return tagged outcomes. Individual state transitions remain synchronous and serialized; the core as a whole supports asynchronous execution. Public synchronous generators and asynchronous generator-compatible iterators remain the user-facing API.

**Reason:** inspectability, observability, and explicit configuration boundaries are the user's deciding priorities. Explicit records also allow deterministic transition tests and make invalidation inspectable. This is a deliberate choice over a generator-owned continuation; it is not a claim that generators cannot implement the behavior. Implement the chosen state machine rather than reopening that architecture decision during execution.

### A08. What are the precise scheduling and commit boundaries?

**Answer:** only the kernel writes engine state. `submit()` queues outcomes; `poll()` processes them and advances explicit jobs. Callback settlement handlers only append tagged outcomes and wake the driver. A kernel step never invokes a user callback.

Initial and completion chains use separate per-order counters. An initial chain commits readiness only after every enabled visitor and its commands finish. A completion chain commits `COMPLETE` only after every enabled completion visitor finishes. Filtered-out visitor execution still advances lifecycle state. A disabled iterator order suppresses the event, not the lifecycle transition.

Sync DAG work uses one FIFO of eligible visits. New initial visits are appended in discovery order; newly eligible completion visits are appended when their final slot closes. Existing queued work stays ahead of newly eligible work. After an initial visit/event boundary, sync DAG expansion consumes its sorted hints before choosing its next visit. Async DAG frames progress independently and register outcomes in processed-settlement order. Every eligible visit is queued once.

`vertexVisitIndex` is reserved at chain admission when visitors are enabled; its value survives a halt. `previousVisitedVertexRef` snapshots the most recent committed live chain at admission. `curVertexVisitorVisitIndex` is chain-local. Existing tree metadata semantics, including their counter-update boundaries, take precedence for tree families.

### A09. How do callback concurrency and prefetch admission interact?

**Answer:** retain default `concurrency: Infinity`; validate a positive integer or Infinity at construction and configuration. Sync constructors/configuration reject the presence of the field. One FIFO limiter counts only invoked callbacks until settlement. Async DAG active chains have a separate admission cap of the same value. Never hold an outer callback permit while requesting an inner permit.

An async tree frame is admitted after the parent event boundary; it may queue all child resolutions. Resolution contexts are built once at this prefetch boundary. Synchronous DFS instead builds each context at slot consumption; synchronous BFS retains the context created when that hint was queued after its parent's visit. Preserve those existing, distinct `parentVertex` snapshot boundaries. Queued callbacks can be skipped when invalidated. Paused frame work stays queued; draining-chain work may pass paused frame entries while preserving relative order among eligible entries.

**Trade-off:** Infinity remains potentially eager, and even a limit of 1 does not imply sync callback timing once prefetch is admitted. Callers needing bounded activity supply a limit; bounded total graph/event memory is not promised by that setting.

### A10. What happens to results from deleted or failed work?

**Answer:** requests carry an owner id and epoch. A deletion invalidates affected chain/frame epochs before another outcome is processed. Later successes and errors from invalid owners are observed but discarded. They cannot emit events, add edges, apply commands, or fail surviving work. Physical callback permits remain occupied until those callbacks settle; invalid work does not keep an otherwise halted/finished traversal open.

A command batch already accepted by the kernel completes in command order, even if it contains self-deletion. It cannot interleave with another batch. Preserve legacy behavior for later commands in that same batch; do not resurrect a removed graph entry. Invalidating a chain prevents its next callback and its pending event. A thrown command error retains mutations already applied before that error, as today.

Failure is tagged, including thrown null/undefined. The first live observed failure wins. Existing queued, surviving events may be delivered to the owning active iterator before it throws; subsequent iterator/run attempts rethrow immediately. Graph and lifecycle state remain fixed after failure; pending-work bookkeeping may drain without committing outcomes. Arbitrary mutations of user-owned data remain outside this guarantee.

### A11. How does closing an async iterator interrupt a pending resolution?

**Answer:** return an `AsyncGenerator`-compatible object backed by a runner-owned session rather than relying on the body of a native `async function*` for ownership. Native generator `return()` queues behind an outstanding `next()`, which can be stuck awaiting a resolver. Our `return()` signals a halt immediately, then waits only for the specified chain-draining boundary.

Creating an iterator is lazy. Its first `next()` claims the runner's single active-iterator lease. Multiple `next()` calls on the same iterator are queued in order. `return()` before first `next()` is a no-op on the runner; `throw(error)` before first `next()` rejects with that error. Closing an active iterator resolves its still-pending `next()` requests as done after draining, retains undelivered events for resumption, and releases ownership exactly once. A pending live visitor may still delay closure indefinitely: there is no cancellation/timeout guarantee for user callbacks.

### A12. What wins when close, consumer errors, and traversal failure race?

**Answer:** `return()` marks the session closing before further event delivery. Ready events remain buffered for a successful halt. In-flight resolver outcomes are retained without being consumed while halted; started chains drain or halt at their own command boundaries. A live visitor failure observed during draining makes the runner failed and rejects normal close. Buffered events are then discarded because the iterator is closing.

An explicit iterator `throw(error)` rejects with the supplied consumer error after cleanup and separately retains any traversal failure. A `for await` body exception is not passed to `return()`; normal JavaScript iterator-close semantics preserve that original body exception. Do not try to infer the exception from the loop body or replace it with a synthetic “consumer failed” error. A consumer error without traversal failure leaves the runner resumable.

### A13. How is progress driven when the consumer is not calling `next()`?

**Answer:** distinguish three pump modes: `drive`, `settle`, and `drain`. `drive` may admit new visits/frames; `settle` processes already admitted work while the consumer holds an event; `drain` permits only the already started chains needed for halting. New visits/frames require demand. Already admitted resolutions may use released limiter slots in settle mode; drain pauses new frame callbacks.

Buffered events are delivered before fresh admission on resume, using the filters captured when the event was committed. A partial chain retains its old filters through its pending event boundary. The pump has one reentrancy guard and one lost-wakeup-safe notification primitive. It processes queued outcomes before declaring a stall or completion. An iterator can be closed while the kernel is waiting for an adapter because no callback promise is awaited inside the kernel or the iterator ownership gate.

### A14. What ordering guarantee is actually testable?

**Answer:** sync tree callback/event/context traces remain exact. Async tree event values and topology match under the timing-independent adapter/visitor assumptions. Async DAG guarantees the declared dependency partial order and committed chain-completion ordering; it does not claim general sequence equality with sync DAG traversal. Exactly-once lifecycle processing is per retained vertex and order within one runner, not a guarantee about external side effects.

### A15. How should medium-effort execution be bounded?

**Answer:** use the linked plan sequentially, one task per implementation/review unit. Pin interfaces here before implementing their consumers. Every task names its files, consumes/produces contracts, and has a focused test target. Run full existing tests at storage/policy boundaries and `npm run check` at release gates. A failed legacy assertion is investigated, not rewritten to match the new implementation. No implementation, commit, or publish is authorized by this planning document alone.

### A16. How can the core be inspectable, configurable, and asynchronous?

**Answer:** the core includes both the transition kernel and its execution runtime. Provide first-class `AsyncCoreExecution<E>` through `AsyncRunnerSession<E>`, with asynchronous `run()`/iteration and synchronous `inspect()`. It composes the same transition kernel with async callback execution, limiting, wakeups, and event delivery. Sync execution uses that same state model. There is no separately copied async graph/dependency algorithm.

`inspect()` on the kernel, async core session, and all six public runners returns a detached read-only snapshot. It shows effective traversal/source/execution configuration, ready visits, frame/chain positions, pending request identities and validity, outstanding event boundaries, and runtime callback/event-buffer counts. Inspection works during INITIAL, RUNNING, HALTED, FINISHED, and FAILED, including while an async callback is pending. It invokes no user callbacks and advances no work. Snapshot records contain internal reference ids, not raw vertex data, callback functions, promises, or mutable kernel collections.

Configuration is explicit through builder/core options and the existing resume filters. Lifecycle iterators provide event observation; inspection supplies current scheduler state. Consumers cannot configure behavior by editing an inspection snapshot. Future asynchronous policy or integration work can be modeled as another typed request/outcome with explicit ownership and a waiting state, following the same core execution protocol. Asynchronous core capabilities are in scope; arbitrary new hook systems are not prerequisites for 0.8.0.

**Trade-off:** the transition step is intentionally small and synchronous so reads and commits are coherent. Waiting for external work belongs to the async core runtime, where the wait is represented in inspectable state and can participate in halt/failure handling. “Promise-free kernel” is this local boundary, not a restriction that the whole core must remain synchronous.

## Public type contracts

The following declarations are normative interface shapes. Existing `CTTRef`, `Vertex`, `TreeTypeParameters`, `VertexResolutionContext`, `GetPathToOptions`, tree callback options, visitor commands, and visitor registration metadata retain their current definitions. `T` is input data/hints; `R` is rewritten data/hints, defaulting to T.

```ts
type VertexId = unknown;
type MaybePromise<T> = T | PromiseLike<T>;
type Ref<T extends TreeTypeParameters> = CTTRef<Vertex<T>>;
type VisitResult<R extends TreeTypeParameters> =
  TraversalVisitorResult<R> | undefined | void;

type MakeVertexResult<T extends TreeTypeParameters> = {
  vertexContent: VertexContent<T> | null;
  vertexId?: VertexId;
  dependsOn?: readonly VertexId[];
};
type HintVertexId = { vertexId: VertexId };

type GraphVertexStatus =
  | 'DISCOVERED' | 'READY' | 'PRE_VISITING'
  | 'PRE_VISITED' | 'COMPLETING' | 'COMPLETE';

type GraphEdge<T extends TreeTypeParameters> = Readonly<{
  parentRef: Ref<T>;
  childRef: Ref<T>;
  hintIndex: number;
  hint: T['VertexHint'];
}>;

type ChildSlot<T extends TreeTypeParameters> =
  | Readonly<{ kind: 'pending'; hint: T['VertexHint'] }>
  | Readonly<{ kind: 'linked'; hint: T['VertexHint']; childRef: Ref<T> }>
  | Readonly<{
      kind: 'omitted' | 'deleted' | 'disabled';
      hint: T['VertexHint'];
    }>;

type GraphVertex<T extends TreeTypeParameters> = Readonly<{
  vertexRef: Ref<T>;
  vertex: Vertex<T>;
  vertexId: VertexId;
  discoveryDepth: number;
  dependsOn: readonly VertexId[];
  status: GraphVertexStatus;
  incoming: readonly GraphEdge<T>[];
  slots: readonly ChildSlot<T>[];
}>;

interface ResolvedGraph<T extends TreeTypeParameters> {
  get(ref: Ref<T>): GraphVertex<T> | null;
  has(ref: Ref<T>): boolean;
  getRoot(): Ref<T> | null;
  getVertexRefs(): Ref<T>[];
  getVertexById(id: VertexId): Ref<T> | null;
  getIdOf(ref: Ref<T>): VertexId;
  getStatusOf(ref: Ref<T>): GraphVertexStatus | null;
  getParentsOf(ref: Ref<T>): Ref<T>[] | null;
  getChildrenOf(ref: Ref<T>): Ref<T>[] | null;
  getPathsTo(ref: Ref<T>, options?: GetPathToOptions): Ref<T>[][];
}

type ResolvedGraphSnapshot<T extends TreeTypeParameters> = Pick<
  ResolvedGraph<T>,
  | 'has' | 'getRoot' | 'getVertexRefs' | 'getVertexById' | 'getIdOf'
  | 'getParentsOf' | 'getChildrenOf' | 'getPathsTo'
>;

type MakeGraphVertexOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  resolutionContext: VertexResolutionContext<T | R>;
  resolvedGraph: ResolvedGraph<T | R>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
};

interface TraversableGraph<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MakeVertexResult<T>;
  makeVertex(hint: T['VertexHint'], options: MakeGraphVertexOptions<T, R>):
    MakeVertexResult<T>;
  getVertexIdFromHint?(hint: T['VertexHint']): HintVertexId | undefined;
}

interface AsyncTraversableGraph<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MaybePromise<MakeVertexResult<T>>;
  makeVertex(hint: T['VertexHint'], options: MakeGraphVertexOptions<T, R>):
    MaybePromise<MakeVertexResult<T>>;
  getVertexIdFromHint?(hint: T['VertexHint']):
    MaybePromise<HintVertexId | undefined>;
}

interface AsyncTraversableTree<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> {
  makeRoot(): MaybePromise<MakeVertexResult<T>>;
  makeVertex(hint: T['VertexHint'], options: MakeVertexOptions<T, R>):
    MaybePromise<MakeVertexResult<T>>;
}

enum DagTraversalOrder {
  ON_READY = 'ON_READY',
  ON_COMPLETE = 'ON_COMPLETE',
}

type DagVisitorOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = {
  resolvedGraph: ResolvedGraph<T | R>;
  notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
  vertexRef: Ref<T | R>;
  order: DagTraversalOrder;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: Ref<T | R> | null;
  vertexVisitorsChainState: unknown;
  visitorRecord: VisitorRecord<DagVisitor<T, R>>;
};

type VisitorRecord<F> = {
  addedIndex: number;
  priority: number;
  resolutionStyle: TraversalVisitorFunctionResolutionStyle;
  visitor: F;
};

type DagVisitor<T extends TreeTypeParameters, R extends TreeTypeParameters = T> =
  (vertex: Vertex<T | R>, options: DagVisitorOptions<T, R>) => VisitResult<R>;

type AsyncDagVisitorOptions<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = Omit<DagVisitorOptions<T, R>, 'visitorRecord'> & {
  visitorRecord: VisitorRecord<AsyncDagVisitor<T, R>>;
};

type AsyncDagVisitor<
  T extends TreeTypeParameters,
  R extends TreeTypeParameters = T,
> = (vertex: Vertex<T | R>, options: AsyncDagVisitorOptions<T, R>) =>
  MaybePromise<VisitResult<R>>;

type DagEvent<T extends TreeTypeParameters> = {
  vertex: Vertex<T>;
  vertexRef: Ref<T>;
  order: DagTraversalOrder;
  isGraphRoot: boolean;
  isTraversalRoot: boolean;
};
```

Async tree visitors use the existing `TraversalVisitorInputOptions` fields with `visitorRecord` replaced by an async visitor record, exactly as the async DAG options above. Avoid the unsound shortcut of claiming an async record contains a synchronous visitor. New async/DAG builders are standalone classes with the existing registration/configuration methods; they do not extend the synchronous, tree-context `Traversal` abstract class with an incompatible return type.

### Constructor and helper contracts

`DagSource<T, R>` is the exclusive union `{ traversableGraph: TraversableGraph<T, R>; traversableTree?: never } | { traversableTree: TraversableTree<T, R>; traversableGraph?: never }`. `AsyncDagSource` uses the corresponding async adapter interfaces, which also accept sync implementations structurally. A required source belongs to constructor input; `configure()` takes a partial configuration within that existing source mode.

Both DAG builders accept `sortChildrenHints`, per-order `visitors`, `saveNotMutatedResolvedGraph`, and `traversalRunnerInternalObjects: { state?, resolvedGraphsContainer? }`. Sync sorters return a hint array; async sorters return `MaybePromise` of that array. Defaults are no sorter, empty visitor arrays, snapshot disabled, and null injected objects. Async adds `concurrency`, default Infinity. The existing array-copy, nested-configuration-copy, default-freezing, priority, `listVisitorsFor`, and `setVisitorsFor` behavior applies.

`DagTraversalRunner` exposes `getStatus`, `isHalted`, `getResolvedGraph`, `isGraphRootVertex`, `isTraversalRootVertex`, `getIterable(config?)`, and `run(config?)`. `AsyncDagTraversalRunner` exposes the same methods with async iteration and `Promise<this>` for run. Tree runners add `getResolvedGraph` alongside their existing methods. `DagTraversalRunnerIterableConfig` uses the existing `TraversalRunnerIterableConfig<DagTraversalOrder>` shape, with both orders in `iterateOver` by default. The input type is its partial form.

All six runners also expose `inspect(): CoreInspection`. New core types `CoreInspection`, `KernelInspection`, and `AsyncCoreExecution` are exported from the core/root type surface. Low-level kernel/store mutators remain implementation APIs. Async runner `run()` delegates to its async core session and returns the public runner, preserving `Promise<this>` at both levels.

`traverseDag(source, visitors, config?)` and `traverseDagAsync(source, visitors, config?)` take an explicit source object from the union above, plus `{ onReadyVisitor?, onCompleteVisitor? } | null`. Their return values are the runner and a promise of the runner respectively. The helper's source argument is authoritative; its config type omits both source fields. Async tree helpers retain the corresponding existing tree-helper argument order and visitor names. `hasSingleSink(graph)` accepts a `ResolvedGraph` or `ResolvedGraphSnapshot` structural query view and returns boolean.

## Internal ownership and interface contracts

### Storage

`src/core/graph/GraphStore.ts` is the only owner of topology entries and the identity index. Its constructor is `new GraphStore<T>(mode: 'tree' | 'dag')`. It exposes the following internal methods; public query facades delegate to it:

```ts
type IdState<T extends TreeTypeParameters> =
  | { kind: 'live'; ref: Ref<T> }
  | { kind: 'omitted' }
  | { kind: 'deleted' };

interface GraphStoreContract<T extends TreeTypeParameters> {
  readonly mode: 'tree' | 'dag';
  readonly graph: ResolvedGraph<T>;
  getIdState(id: VertexId): IdState<T> | undefined;
  insertVertex(input: {
    ref: Ref<T>; id: VertexId; dependsOn: readonly VertexId[]; depth: number;
  }): void;
  setRoot(ref: Ref<T> | null): void;
  setStatus(ref: Ref<T>, status: GraphVertexStatus): void;
  prepareSlots(ref: Ref<T>, hints: readonly T['VertexHint'][]): void;
  linkSlot(parent: Ref<T>, index: number, child: Ref<T>): void;
  closeSlot(parent: Ref<T>, index: number,
    reason: 'omitted' | 'deleted' | 'disabled'): void;
  markOmitted(id: VertexId): void;
  removeVertices(refs: ReadonlySet<Ref<T>>): void;
  getTreeRecord(ref: Ref<T>): VertexResolved<T> | null;
  setTreeRecord(ref: Ref<T>, record: VertexResolved<T>): void;
}
```

`insertVertex` rejects an already indexed id; duplicate/omission policy is decided before calling it. `prepareSlots` is once per expansion, after sorting; no placeholder zero-slot expansion is considered closed. `linkSlot` validates both endpoints, slot membership, and acyclicity before adding an edge. Re-linking an already linked slot to the same child is an idempotent internal acknowledgment; linking it to a different child is an invariant error. Different indices may link the same child. `removeVertices` detaches incident edges, marks those parent slots deleted, and tombstones ids; the kernel computes the cascade set first. Storage does not schedule visitors.

In tree mode, `setTreeRecord` preserves the supplied object and supports today's dangling/partially assembled records. The graph facade derives its structural queries from those records. The runner's `linkSlot` also appends to the legacy parent's compact child list exactly once. Legacy `pushChildrenTo` remains a direct record append and is not a second call to `linkSlot`. `ResolvedTree.delete` computes the existing iterative descendant deletion, then delegates removal and detaches its parent's child entries with the current clone/replace behavior. Constructor injection reuses the existing facade/store instead of reconstructing it.

`src/core/graph/ResolvedGraphsContainer.ts` owns `store`, `resolvedGraph`, optional snapshot storage, the input-to-snapshot reference map, and an optional legacy tree container. Its `sourceMode` is fixed to tree or graph. It provides `acceptRoot`, `acceptVertex`, `acceptEdge`, and `deleteVertices`, with these signatures:

```ts
interface ResolvedGraphsContainerContract<
  T extends TreeTypeParameters, R extends TreeTypeParameters = T,
> {
  readonly store: GraphStoreContract<T | R>;
  readonly resolvedGraph: ResolvedGraph<T | R>;
  readonly notMutatedResolvedGraph: ResolvedGraphSnapshot<T> | null;
  readonly notMutatedResolvedGraphRefsMap: Map<Ref<T | R>, Ref<T>> | null;
  readonly treeContainer: DepthFirstTraversalResolvedTreesContainer<T, R> | null;
  acceptRoot(ref: Ref<T | R>, id: VertexId): void;
  acceptVertex(ref: Ref<T | R>, id: VertexId,
    dependsOn: readonly VertexId[], context: VertexResolutionContext<T | R>): void;
  acceptEdge(parent: Ref<T | R>, index: number, child: Ref<T | R>): void;
  deleteVertices(refs: ReadonlySet<Ref<T | R>>): void;
}
```

Validate active and snapshot mappings before a compound topology update. Snapshot facade methods omit lifecycle fields; they are not an alternative runner. The existing `DepthFirstTraversalResolvedTreesContainer` remains exported and usable by the existing tree classes and deep imports.

### Kernel records and driver messages

Place the following shared contracts in `src/core/effects/types.ts`. Wire values are tagged rather than using null as an error sentinel. Concrete exported tree/DAG events remain separate; drivers translate the internal root flag at their boundary.

```ts
type VisitOrder =
  | 'PRE_ORDER' | 'IN_ORDER' | 'POST_ORDER' | 'LEVEL_ORDER'
  | 'ON_READY' | 'ON_COMPLETE';
type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };
type PumpMode = 'drive' | 'settle' | 'drain';
type OwnerToken = { kind: 'root' | 'frame' | 'chain'; id: number; epoch: number };

type VisitMetadata<T extends TreeTypeParameters> = {
  vertexVisitIndex: number;
  curVertexVisitorVisitIndex: number;
  previousVisitedVertexRef: Ref<T> | null;
  vertexVisitorsChainState: unknown;
};

type CallSpec<T extends TreeTypeParameters, R extends TreeTypeParameters = T> =
  { requestId: number; owner: OwnerToken } & (
    | { kind: 'MAKE_ROOT' }
    | { kind: 'SORT_HINTS'; hints: (T | R)['VertexHint'][] }
    | { kind: 'HINT_ID'; hint: (T | R)['VertexHint'] }
    | { kind: 'MAKE_VERTEX'; context: VertexResolutionContext<T | R> }
    | { kind: 'VISIT'; ref: Ref<T | R>; order: VisitOrder;
        recordIndex: number; metadata: VisitMetadata<T | R> }
  );

type CallbackValues<T extends TreeTypeParameters, R extends TreeTypeParameters = T> = {
  MAKE_ROOT: MakeVertexResult<T>;
  MAKE_VERTEX: MakeVertexResult<T>;
  SORT_HINTS: (T | R)['VertexHint'][];
  HINT_ID: HintVertexId | undefined;
  VISIT: VisitResult<R>;
};

type CallbackReply<T extends TreeTypeParameters, R extends TreeTypeParameters = T> = {
  [K in keyof CallbackValues<T, R>]: {
    requestId: number; kind: K; outcome: Outcome<CallbackValues<T, R>[K]>;
  }
}[keyof CallbackValues<T, R>];

type RawCallbackResult<T extends TreeTypeParameters, R extends TreeTypeParameters = T> = {
  [K in keyof CallbackValues<T, R>]: {
    kind: K; value: MaybePromise<CallbackValues<T, R>[K]>;
  }
}[keyof CallbackValues<T, R>];

interface CallbackBindings<T extends TreeTypeParameters, R extends TreeTypeParameters = T> {
  invoke(call: CallSpec<T, R>): RawCallbackResult<T, R>;
}

type KernelEvent<T extends TreeTypeParameters> = {
  vertex: Vertex<T>; vertexRef: Ref<T>; order: VisitOrder;
  isRoot: boolean; isTraversalRoot: boolean;
};

type KernelAction<T extends TreeTypeParameters, R extends TreeTypeParameters = T> =
  | { kind: 'CALL'; call: CallSpec<T, R> }
  | { kind: 'EVENT'; event: KernelEvent<T | R>; boundaryId: number }
  | { kind: 'WAIT' }
  | { kind: 'HALTED' }
  | { kind: 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };

interface KernelPort<T extends TreeTypeParameters, R extends TreeTypeParameters = T> {
  poll(mode: PumpMode): KernelAction<T, R>;
  submit(reply: CallbackReply<T, R>): void;
  acknowledgeEvent(boundaryId: number): void;
  requestHalt(): void;
  resume(config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>): void;
  isRequestEligible(requestId: number, mode: PumpMode): boolean;
  isHaltRequested(): boolean;
  getFailure(): { error: unknown } | null;
  getStatus(): TraversalRunnerStatus;
  inspect(): KernelInspection;
}
```

### Inspection and asynchronous core execution

Place inspection declarations in `src/core/CoreInspection.ts` and the async execution interface in `src/core/AsyncCoreExecution.ts`. Snapshot collections preserve scheduler order where relevant. Every object/array is freshly copied and frozen on inspection; only primitive fields and copied owner tokens are included. Completed frame/chain records may be retired, while pending invalidated requests remain visible until their captured outcome is discarded.

```ts
type InspectionFilters = Readonly<{
  iterateOver: readonly VisitOrder[];
  enableVisitorFunctionsFor: readonly VisitOrder[] | null;
  disableVisitorFunctionsFor: readonly VisitOrder[] | null;
}>;

type KernelInspection = Readonly<{
  status: TraversalRunnerStatus;
  haltRequested: boolean;
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  concurrency: number;
  hasSorter: boolean;
  hasHintIds: boolean;
  iterableConfig: InspectionFilters;
  readyVisits: readonly Readonly<{ vertexRefId: string; order: VisitOrder }>[];
  frames: readonly Readonly<{
    owner: Readonly<OwnerToken>;
    vertexRefId: string;
    stage: 'sort' | 'identify' | 'resolve' | 'closed';
    pendingIndices: readonly number[];
  }>[];
  chains: readonly Readonly<{
    owner: Readonly<OwnerToken>;
    vertexRefId: string;
    order: VisitOrder;
    phase: 'running' | 'paused' | 'done' | 'invalid';
    group: 'concurrent' | 'sequential';
    position: number;
    waitingFor: 'none' | 'callback' | 'batch';
    config: InspectionFilters;
  }>[];
  pendingRequests: readonly Readonly<{
    requestId: number;
    kind: keyof CallbackValues<TreeTypeParameters>;
    owner: Readonly<OwnerToken>;
    valid: boolean;
  }>[];
  pendingEventBoundaryCount: number;
}>;

type DriverInspection = KernelInspection & Readonly<{
  inFlightCallbackCount: number;
}>;

type CoreInspection = DriverInspection & Readonly<{
  bufferedEventCount: number;
}>;

interface AsyncCoreExecution<E> {
  getStatus(): TraversalRunnerStatus;
  isHalted(): boolean;
  inspect(): CoreInspection;
  getIterable(config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>):
    AsyncGenerator<E, void, unknown>;
  run(config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>): Promise<this>;
}
```

The kernel produces `KernelInspection`. The async driver appends its actual physical in-flight callback count, including invalidated callbacks still running. The session appends its undelivered event-buffer count to produce `CoreInspection`. Sync runners expose the same snapshot shape: their adapter records whether a synchronous callback is currently executing (0 or 1), and their buffered-event count is zero. Inspection within a callback is supported without re-entering the kernel. Snapshot construction happens only on request and never waits for callback settlement.

For sync transport, pass a runner-owned `SyncDriverState = { inFlightCallbackCount: number }` to `runSync(kernel, bindings, runtimeState)`. The transport increments/decrements it around callback invocation with `try/finally`; inspection reads it without advancing the generator. A pending kernel request means its outcome has not been consumed, which is distinct from a physically executing callback. Captured outcomes retained during a halt can therefore coexist with a zero in-flight count.

The normalized constructor and the principal continuation records have these exact shapes in `src/core/kernelTypes.ts`. The scheduler's graph indexes and the driver's physical callback queue remain separate; neither belongs in these callback-free configuration values.

```ts
type RegistrationMetadata = Omit<VisitorRecord<never>, 'visitor'>;

type KernelStateBridge<T extends TreeTypeParameters> = {
  status: TraversalRunnerStatus;
  traversalRootVertexRef: Ref<T> | null;
  subtreeTraversalDisabledRefs: Set<Ref<T>>;
  visitorsState: Partial<Record<VisitOrder, VisitorExecutionState<T>>>;
};

type KernelOptions<T extends TreeTypeParameters, R extends TreeTypeParameters = T> = {
  kind: 'depth-first' | 'breadth-first' | 'dag';
  execution: 'sync' | 'async';
  sourceMode: 'tree' | 'graph';
  container: ResolvedGraphsContainerContract<T, R>;
  stateBridge: KernelStateBridge<T | R>;
  visitorMetadata: Partial<Record<VisitOrder, readonly RegistrationMetadata[]>>;
  iterableConfig: TraversalRunnerIterableConfig<VisitOrder>;
  inOrderConfig: DepthFirstTraversalInOrderTraversalConfig | null;
  hasSorter: boolean;
  hasHintIds: boolean;
  concurrency: number;
};

type FrameState<T extends TreeTypeParameters, R extends TreeTypeParameters = T> = {
  owner: OwnerToken;
  ref: Ref<T | R>;
  depth: number;
  stage: 'sort' | 'identify' | 'resolve' | 'closed';
  hints: (T | R)['VertexHint'][];
  nextIdentityIndex: number;
  nextConsumeIndex: number;
  hintIds: Map<number, HintVertexId>;
  contexts: Map<number, VertexResolutionContext<T | R>>;
  pendingIndices: Set<number>;
  outcomes: Map<number, Outcome<MakeVertexResult<T>>>;
};

type ChainState<T extends TreeTypeParameters, R extends TreeTypeParameters = T> = {
  owner: OwnerToken;
  ref: Ref<T | R>;
  order: VisitOrder;
  phase: 'running' | 'paused' | 'done' | 'invalid';
  group: 'concurrent' | 'sequential';
  concurrentIndices: number[];
  sequentialIndices: number[];
  position: number;
  waitingFor: 'none' | 'callback' | 'batch';
  commands: TraversalVisitorCommand<R>[];
  metadata: VisitMetadata<T | R>;
  config: TraversalRunnerIterableConfig<VisitOrder>;
};

type VertexWork<T extends TreeTypeParameters> = {
  ref: Ref<T>;
  unmet: Set<VertexId>;
  expansion: 'unprepared' | 'open' | 'closed';
  initialAdmitted: boolean;
  initialCommitted: boolean;
  completionAdmitted: boolean;
  completionCommitted: boolean;
  completionAccounted: boolean[];
  remainingChildren: number;
};

type SessionProgress<E> =
  | { kind: 'EVENT'; event: E; boundaryId: number }
  | { kind: 'WAIT' | 'HALTED' | 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };

interface AsyncSessionControl<E> {
  advance(mode: PumpMode): SessionProgress<E>;
  acknowledgeEvent(boundaryId: number): void;
  requestHalt(): void;
  isHaltRequested(): boolean;
  resume(config?: Partial<TraversalRunnerIterableConfig<VisitOrder>>): void;
  getStatus(): TraversalRunnerStatus;
  getFailure(): { error: unknown } | null;
  inspect(): DriverInspection;
  waitForProgress(): Promise<void>;
}
```

`createAsyncDriver` implements `AsyncSessionControl`: its synchronous `advance` consumes internal CALL actions and starts eligible callbacks, returning only an event, wait, or terminal action to the session. Callback settlement and `requestHalt` notify its remembered wakeup. The session owns the one pump loop, mode selection, demand, and event delivery; the driver owns callback queues and kernel transport. `waitForProgress` never holds an iterator-ownership lock that would prevent `return` from signaling a halt. Public wrappers map internal event fields through a synchronous control-port adapter before constructing the session; they must not wrap the session in a native async generator and accidentally reintroduce queued-close blocking.

`AsyncRunnerSession<E>` implements `AsyncCoreExecution<E>` and is the shared async core runtime. Its `run()` drains its own iterator, so direct async-core execution and public-runner execution share ownership, backpressure, halt, failure, and inspection behavior. Event-projection adapters forward the inspection/control methods unchanged. The core execution interfaces can accommodate additional typed async effects without moving promises or unobservable suspension positions into the transition records.

`CALL` creates a pending request before returning it. The driver invokes it at most once. `submit` checks the request kind, queues its outcome, and never invokes or awaits callbacks. A reply for an invalidated pending request is discarded; duplicate replies and kind mismatches are internal invariant errors. `acknowledgeEvent` releases an iteration boundary for future policy admission; it is called when advancing past an event, not merely when appending the event to a buffer.

The kernel owns data records for:

- **Run:** status, tagged failure, halt-request flag, a single eligible-visit FIFO tagged by order, pending request map, input outcome FIFO, next request/owner ids, per-order visitor metadata, and current/retained iterable configurations.
- **Vertex scheduling:** reference, unmet dependency set, reverse-dependency membership, expansion stage, pending child-slot count, and whether its initial/completion chain has already been admitted.
- **Frame:** owner token, reference, depth, stage (`sort`, `identify`, `resolve`, `closed`), sorted hints, next identification index, next consumption index, pending resolutions, and stored outcomes by hint index.
- **Chain:** owner token, reference/order, captured config, concurrent/sequential record-index lists, current group/position, deferred group commands, local metadata/state, and phase (`running`, `paused`, `done`, `invalid`).
- **DFS policy:** the current private frame fields from `DepthFirstTraversalRunner.ts`, with explicit event/visitor continuation stages. **BFS policy:** the existing queue and cursor. **DAG policy:** ordered eligible visits and frame continuations. Existing legacy runner state objects are retained through a small state bridge rather than structurally replaced.

No run/frame/chain record stores a callback closure or promise. The driver owns actual callback functions and pending promises. `CallbackBindings<T, R>.invoke(call)` lives in `src/core/drivers/callbackBindings.ts` and returns the discriminated `RawCallbackResult<T, R>` above. It selects the correctly typed source/options/visitor record without casting a graph view into a tree. Sync drivers reject thenables and observe their rejections; async drivers capture their outcomes immediately.

`TraversalKernel` implements `KernelPort` and receives a normalized config, graph container, scheduling policy, and state bridge. Normalized config contains traversal kind, sync/async mode, source mode, numeric concurrency, optional-sorter/hint-id-hook flags, visitor metadata by order, and the existing in-order/iterable configuration. It contains no user functions. Normalization is a driver/builder concern.

## Algorithms the executor must follow

### K0. Kernel polling priority

Process submitted outcomes in FIFO order, checking owner validity before each one; stop applying live outcomes after the first failure. Advance the affected existing frame/chain records, committing command batches synchronously. Emit surviving committed events before reporting that failure to the owning iterator. Otherwise, advance eligible existing jobs before admitting new policy work. A halt request overrides drive mode. New frame/chain admission is permitted only in drive mode, and iteration boundaries can block that admission even when callbacks have already settled.

Only after queued outcomes and eligible work have been considered may `poll` return WAIT or a terminal action. Pending valid callbacks, paused chains, buffered/unacknowledged iteration boundaries, and closed-iterator halt state are not dependency stalls. FINISHED requires all retained vertices enrolled in this run complete and all required event boundaries acknowledged; HALTED requires chain quiescence but may retain resolution outcomes and event boundaries. Native DAG state covers its retained graph; unrelated legacy tree records are not implicitly enrolled.

### K1. Identity, readiness, and edge admission

```text
on a consumed resolution outcome:
  discard it first if its owner is invalid
  if it is an error: fail with the original error
  determine id from own result.vertexId, otherwise hint identity, otherwise new UUID
  if explicit result id and hint id both exist: require SameValueZero equality
  if id is tombstoned: close this parent slot as deleted; stop
  if id is omitted:
    null content -> close this slot as omitted
    non-null content -> fail with omission/content conflict; stop
  if id is live:
    cycle-check and link the existing reference at this slot
    ignore duplicate content and dependencies; stop
  if content is null:
    with a supplied/hint id -> record omission and release reverse dependents
    close this slot as omitted; stop
  compute dependencies (root: empty; explicit: unique ids; default: parent id)
  if a dependency is tombstoned: tombstone this new id and close its slot as deleted
  otherwise register the reference and incoming edge, then its reverse dependencies
  unmet = dependencies whose id is neither pre-visited/complete nor omitted
  empty unmet -> enqueue initial visit once
```

Dependencies on vertices in `COMPLETING` are already satisfied because their initial chains committed earlier. Explicit root dependencies are ignored. A null root creates no live root; traversal finishes after consuming that outcome. A tree-source result carrying either metadata field is rejected before this algorithm, even when its content is null.

### K2. Completion and cascade deletion

```text
on initial-chain commit:
  mark PRE_VISITED; satisfy this id in reverse dependents
  enqueue its enabled event
  schedule hint expansion only when its event boundary permits it

on a slot becoming terminal or its linked child becoming COMPLETE:
  decrement this parent's remaining count at most once for this slot
  if expansion is closed, count is zero, and completion was not admitted:
    mark COMPLETING and enqueue completion visit (or complete immediately for BFS)

on completion-chain commit:
  mark COMPLETE; enqueue its enabled event
  close every incoming parent's linked-slot completion obligation

on deletion:
  build a worklist containing the requested vertex
  add declared dependents and children that lose their last surviving parent
  repeat until the removal set stops growing (skip already included refs)
  invalidate all affected chain/frame/request owners and buffered events
  remove all affected vertices/incident edges; retain id tombstones
  close deleted parent slots once; propagate surviving-parent completion
```

Do not decrement a slot twice when its child completes and is later deleted. A slot's linked reference and its completion-accounted bit are separate internal facts. Future arrivals depending on a tombstoned id are deleted without visits. Disabling a subtree invalidates its frame work and closes its expansion slots, but keeps its own current chain. Completion is queued only after the initial chain commits, even if a command disabled all hints earlier in that chain.

### K3. Visitor chain advancement

```text
admit chain:
  snapshot configuration and metadata; split records into current CONCURRENT/SEQUENTIAL groups
  reject unknown resolution styles before invoking any callback
  set chain position to the first concurrent record

advance a valid chain:
  if its next callback has not run: emit one VISIT request and wait for its outcome
  on VISIT success: increment this chain's local visitor index
  concurrent group -> collect commands; advance to its next callback
  at concurrent-group end -> apply its entire command batch in order
  sequential group -> apply each callback's command batch before advancing
  honor own HALT command after the whole batch, preserving the next position
  before another callback: recheck deletion/failure/invalidation
  after the final enabled callback/batch: commit the lifecycle visit once
```

`SET_VERTEX_VISITORS_CHAIN_STATE` detects property presence, so an explicit undefined value replaces the chain state. Concurrent callbacks receive null chain state as today. The old exported/deep-importable `executeVisitors` function remains a synchronous compatibility wrapper over this chain machine with its current signature; retain `sortVisitorRecords` as well.

### D1. Asynchronous callback capture and pump

```text
on callback invocation:
  reserve one limiter slot
  invoke through bindings inside try/catch
  attach success/error handlers immediately to the returned value/thenable
  settlement handler appends a tagged outcome and releases its limiter slot
  settlement handler wakes the pump; it does not call kernel mutation methods

pump (single reentrancy guard):
  choose mode = closing/halt-requested ? drain : has next demand ? drive : settle
  submit queued outcomes to the kernel in captured order
  repeatedly poll kernel(mode):
    CALL -> enqueue its request in the limiter queue
    EVENT -> append event/boundary; satisfy an available next waiter immediately unless closing
    WAIT -> stop polling until demand, a settlement, or closure changes progress
    HALTED/FINISHED/FAILED -> record terminal/suspension result and stop polling
  recalculate mode after event delivery or a kernel halt request
  start queued callbacks eligible in this mode while physical permits remain
  if callbacks completed synchronously, loop to process their queued outcomes
  if closing: complete closure when kernel is HALTED or FAILED
  otherwise satisfy pending next requests from surviving buffered events first
  schedule another pump only if work/demand changed while pumping
```

Starting an already admitted callback is not admitting a new frame/chain. Queued outcomes are captured even when the consumer is idle. A pending tree sibling error stays in its frame until that slot is consumed; it must not become a run failure merely because it was submitted. After halt, adapter/sorter/hint outcomes stay stored and cannot register discoveries until resume. Other started chains continue through their current chain under drain mode. The request-eligibility check prevents paused frame work from consuming a permit needed by a draining chain.

The synchronous driver runs the same kernel with concurrency 1, supplies callback results immediately, and yields at each event boundary. It never creates asynchronous jobs or prefetches. Its generator wrapper retains the current status/error/consumer-close behavior. Thenable misuse fails immediately with a named TypeError; attach an observer to the rejected thenable so the misuse does not also leak an unhandled rejection.

### D2. Async iterator ownership and event acknowledgment

```text
getIterable(config): create an unopened iterator facade; do not start the runner

next():
  if unopened: claim the active iterator, check stored failure, apply resume config
  if closed: return done
  acknowledge this iterator's previously delivered event boundary, if any
  enqueue a next waiter and request a pump

delivering an event:
  pop the next surviving runner-owned event
  resolve the oldest next waiter with { done: false, value: event }
  retain boundaryId as the iterator's delivered-but-not-advanced boundary
  if another next waiter already exists, acknowledge that boundary before advancing

return():
  if unopened/closed: resolve done without touching the runner
  mark closing before any further event delivery
  signal requestHalt immediately, even if a next waiter is unresolved
  pump in drain mode
  successful halt -> resolve pending next waiters as done; retain undelivered events
  failure -> reject pending next/close promises with the stored traversal failure
  release active ownership once

throw(consumerError):
  perform the same closure; reject this throw call with consumerError
  retain any traversal failure separately on the runner
```

Retain the delivered event's boundary on the runner when closing. On the next iterator's first advancement, acknowledge that already delivered boundary once; it must not be yielded again. Buffered undelivered events retain their original filters. A zero-event traversal driven through `run()` still processes visitors/halts/failures correctly. Do not use “no event available” as a synonym for finished.

## Deterministic acceptance traces

| Id | Scenario | Required observation |
| --- | --- | --- |
| T01 | Sync BFS root has A and B; consume root then A | B's adapter has not been invoked |
| T02 | Sync DFS parent data changes at an in-order visit | Next child's resolution context contains the parent snapshot at that consumption boundary |
| T03 | Known-id hint links B back to ancestor A | Reject before adding the edge; graph remains acyclic |
| T04 | `A.dependsOn = [B]`, B only discoverable from A | Report B as undiscovered; do not hang or claim a proven dependency cycle |
| T05 | A child completion visitor is pending | Its parent cannot become COMPLETE or run its completion chain |
| T06 | Async tree A pending; sibling B rejects | No unhandled rejection; visit A first, surface B only on its slot |
| T07 | One DAG resolver pending; unrelated chain completes | Its event is deliverable without settling the resolver |
| T08 | Limit 1; resolver and visitor work compete | At most one invoked callback; no nested-permit deadlock |
| T09 | Delete B while B's visitor awaits; B later returns rewrite commands or rejects | No B commands/events/resurrection or new failure |
| T10 | Chain A halts after its first sequential visitor; B completes | Retain A's next visitor; drain/deliver or buffer B; resume A once |
| T11 | Close while only an adapter is pending | Close reaches HALTED without awaiting that adapter; consume its stored result after resume |
| T12 | Close while a visitor is pending | Wait for its chain to drain; buffer its completed event for the next iterator |
| T13 | Visitor fails while another chain's outcome arrives late | First failure retained, late mutation discarded, graph remains inspectable |
| T14 | Throw undefined; rerun the failed runner | Rethrow undefined, not a replacement error or a resumed traversal |
| T15 | Consumer error plus failure during iterator cleanup | Consumer sees its own error; later run sees the stored traversal error |
| T16 | Explicit id undefined and an absent hint identity | Distinguish `{ vertexId: undefined }` from no identity |
| T17 | Snapshot enabled; shared vertex rewritten/deleted | Snapshot retains one original reference and accepted incoming edges |
| T18 | Inject legacy stores/state | Existing identity assertions and helper behavior pass unchanged |
| T19 | Inspect while a callback is pending, halted, or failed | Snapshot returns synchronously, identifies pending work, cannot mutate the core, and starts no callbacks |

## Confirmed direction and execution gates

The user selected **A07** (explicit, inspectable state-machine core) and welcomed **A16** (asynchronous core execution). Preserve that direction. **A02–A06** retain the explicit API/storage choices, and **A11–A13** specify runtime ownership and closure. The linked plan provides the implementation/review gates for Sol at medium effort. Surface a concrete contract conflict with its assumption/task ids; avoid reopening the chosen architecture merely because another implementation style is possible. Implementation begins when the handoff is given to an executor; commits and publication remain separate user actions.
