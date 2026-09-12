# Unified Graph Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. If the user explicitly chooses delegated execution, use superpowers:subagent-driven-development instead. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** preserve the synchronous tree library while adding a shared traversal kernel, asynchronous tree runners, and synchronous/asynchronous DAG traversal.

**Architecture:** an explicit, inspectable state machine owns discovery, dependencies, visitor chains, commands, and completion. The core has sync and async execution runtimes sharing that state model; individual transitions are promise-free and commits are serialized. A shared graph store supports strict DAG entries and legacy tree records. Runtime-owned callback invocation, concurrency, and iterator sessions return tagged outcomes to the kernel.

**Tech Stack:** existing TypeScript 4.7, Jest 28, ESLint, CommonJS build, UUID dependency, and Node 22/24 CI matrix.

**Spec:** [unified graph core design](../specs/2026-09-12-unified-graph-core-design.md), plus the normative [decisions and execution contracts](../specs/2026-09-12-unified-graph-core-contracts.md).

**Status:** finalized for Sol at medium effort. The user selected the explicit, inspectable state-machine core and welcomed async core execution. Follow A01–A16 in the contracts. Begin implementation when given this handoff as an execution task; retain the recorded assumptions for traceability and raise concrete conflicts at their task boundaries.

## Global Constraints

- The existing test suite must pass without modification throughout the refactor.
- Coverage remains at 100 percent across all source files. Do not exclude new source files or weaken assertions to obtain coverage.
- `concurrency`: a positive integer or `Infinity`, default `Infinity`, counting in-flight user callbacks of any kind. Sync configuration rejects the field.
- Existing synchronous callback timing, event ordering, reference identity, saved-tree behavior, deep imports, and injected legacy state remain compatible.
- Public asynchronous iteration is `AsyncGenerator`-compatible; a custom iterator session handles immediate close requests.
- Async core execution is first-class through `AsyncCoreExecution`; both runtimes share the same transition model. Synchronous transition commits do not make the whole core sync-only.
- Kernel/core/runners expose detached, frozen `inspect()` snapshots. Inspection never starts callbacks, consumes events, or advances traversal.
- Callback outcomes use `{ ok: true, value } | { ok: false, error }`, retaining thrown null/undefined and preventing unhandled internal rejections.
- No new runtime dependency, TypeScript upgrade, checkpoint/retry subsystem, external-effect cancellation, or `rewriteObject` async conversion.
- Dependencies on subtree completion and fetching undiscovered prerequisites by id are outside scope.
- Changes already present before execution are user work. Inspect `git status` and preserve the design/research documents. Commit, push, and publish only when separately requested.
- Run focused tests/typecheck for each task, the full existing suite at compatibility boundaries, and `npm run check` at the final release gate. Do not run publication commands.

---

## How to execute at medium effort

Read the spec, contracts, and only the current task's source context. Execute tasks in order. Each task produces a testable component; stop after its verification and record the observed result before taking the next task. If a pinned interface must change, update the contracts and affected future tasks in the same review unit rather than silently inventing a parallel interface.

Characterization tests in Task 1 should pass on the baseline. New-behavior tests in subsequent tasks should fail before the behavior exists; inspect the failure before implementation. Code blocks below supply exact test/algorithm anchors, while the contracts supply the complete transition rules and type declarations. Additional table-listed cases require assertions for their stated outcomes, not coverage-only invocation.

## File map and ownership

| Area | Files | Responsibility |
| --- | --- | --- |
| Public callback types | `src/core/TraversableTree.ts`, `TraversableGraph.ts`, `AsyncTraversableTree.ts`, `AsyncTraversalVisitor.ts` | Result metadata; source-specific options; promise-capable callback types |
| Graph queries | `src/core/ResolvedGraph.ts`, `src/core/graph/types.ts`, `snapshot.ts` | Read-only query facade, structural snapshots, graph record types |
| Storage | `src/core/graph/GraphStore.ts`, `ResolvedGraphsContainer.ts`, `identity.ts` | Canonical identities, strict edges, legacy-record backing, original-reference mapping |
| Tree compatibility | `src/core/ResolvedTree.ts`, existing resolved-tree container and runner state files | Preserve legacy record/API/injection behavior |
| Scheduling | `src/core/scheduling/GraphScheduling.ts`, `types.ts` | Readiness, reverse dependencies, slot completion, cascade deletion |
| Visitor execution | `src/core/visitors/VisitorChain.ts`, `types.ts`, existing `executeVisitors.ts` | Explicit chain state; legacy helper compatibility |
| Kernel | `src/core/TraversalKernel.ts`, `kernelTypes.ts`, `effects/types.ts` | Promise-free polling, request owners, outcome/iteration boundaries |
| Core inspection/execution contracts | `src/core/CoreInspection.ts`, `AsyncCoreExecution.ts` | Read-only inspection and the first-class asynchronous core interface |
| Drivers | `src/core/drivers/callbackBindings.ts`, `runSync.ts`, `captureOutcome.ts`, `CallbackScheduler.ts`, `Wakeup.ts`, `AsyncRunnerSession.ts`, `runAsync.ts` | Source invocation, captured outcomes, limiting, pump, iterator ownership |
| Tree policies | `src/traversals/depth-first-traversal/lib/DepthFirstPolicy.ts`, `src/traversals/breadth-first-traversal/lib/BreadthFirstPolicy.ts` | Existing frame/queue order and resolution boundaries |
| DAG family | `src/traversals/dag-traversal/` | Source/config types, state, order enum, policy, builders, runners, helpers |
| Async tree surface | Async classes/helpers beside existing DFS/BFS files; async config/runner files in each `lib/` | Promise-capable API wrappers using shared policies |
| Verification | `tests/helpers/graph-fixtures.ts`, new focused test files named below, examples/package verifier | Behavioral traces, controlled interleavings, consumer contracts |

Use relative imports inside new folders and existing `@core`/`@utils` aliases across them. New root/subpath exports may use relative imports, so no new path alias or compiler configuration is required.

## Shared test fixtures

Create `tests/helpers/graph-fixtures.ts` in Task 1. It uses only existing types, so it can be introduced before any new source API. The diamond discovers its join both early and from multiple parents.

```ts
import type { TreeTypeParameters } from '../../src/core/TreeTypeParameters';

export type TestGraph = TreeTypeParameters<string, string>;
export type GraphFixture = Record<string, {
  children: string[];
  dependencies: string[];
}>;

export const diamond: GraphFixture = {
  root: { children: ['A', 'B', 'join'], dependencies: [] },
  A: { children: ['join'], dependencies: ['root'] },
  B: { children: ['join'], dependencies: ['root'] },
  join: { children: [], dependencies: ['A', 'B'] },
};

export function graphAdapter(nodes: GraphFixture = diamond) {
  function result(id: string) {
    const entry = nodes[id];
    if (entry === undefined) throw new Error(`Unknown fixture id: ${id}`);
    return {
      vertexId: id,
      dependsOn: entry.dependencies.slice(),
      vertexContent: { $d: id, $c: entry.children.slice() },
    };
  }
  return { makeRoot: () => result('root'), makeVertex: result };
}

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function eventLoopTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
```

Do not use timer-duration assertions. Deferreds choose settlement order; `eventLoopTurn()` lets Node report an otherwise unhandled rejection.

## Task 1: Lock down current callback and storage behavior

**Files:** create `tests/traversal-callback-contract.test.ts`, `tests/helpers/graph-fixtures.ts`; read `tests/breadth-first.test.ts`, `tests/core-edge-cases.test.ts`, `tests/runner-state.test.ts`.

**Interfaces:** consumes current `BreadthFirstTraversal`, `DepthFirstTraversal`, `ResolvedTree`, and `VertexResolved`; produces baseline trace tests and `TestGraph`, `GraphFixture`, `diamond`, `graphAdapter`, `deferred`, `eventLoopTurn` fixtures.

- [ ] Add this passing characterization test, importing the current BFS class:

```ts
test('BFS resolves one queued child at the next visit boundary', () => {
  const calls: string[] = [];
  const traversal = new BreadthFirstTraversal<TestGraph>({
    traversableTree: {
      makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
      makeVertex: (hint) => {
        calls.push(hint);
        return { vertexContent: { $d: hint, $c: [] } };
      },
    },
  });
  const iterator = traversal.makeRunner().getIterable();
  expect(iterator.next().value?.vertex.getData()).toBe('root');
  expect(calls).toEqual([]);
  expect(iterator.next().value?.vertex.getData()).toBe('A');
  expect(calls).toEqual(['A']);
  iterator.return(undefined);
});
```

- [ ] Add an exact DFS trace recording adapter calls, visitor calls, iterator events, parent data in each resolution context, and resolved-tree contents. Rewrite the parent data in an in-order visitor and assert the next child's context observes that version. Add `get(ref) === suppliedRecord`, child-array identity, and existing injected-container identity assertions.
- [ ] Run `npm test -- tests/traversal-callback-contract.test.ts tests/runner-state.test.ts tests/resolved-tree-coverage.test.ts tests/core-edge-cases.test.ts`, then `npm run typecheck`. All should pass on the baseline; investigate any failure before refactoring.

**Stop condition:** new characterization assertions agree with current code, and the fixtures introduce no dependency on future APIs.

## Task 2: Define adapter, visitor, identity, and query contracts

**Files:** modify `src/core/TraversableTree.ts`; create `src/core/TraversableGraph.ts`, `src/core/AsyncTraversableTree.ts`, `src/core/AsyncTraversalVisitor.ts`, `src/core/ResolvedGraph.ts`, `src/core/graph/types.ts`, `src/core/graph/identity.ts`, `src/traversals/dag-traversal/lib/DagTraversalOrder.ts`, `src/traversals/dag-traversal/lib/DagTraversalVisitor.ts`; create `tests/graph-api.typecheck.ts`, `tests/graph-identity.test.ts`.

**Interfaces:** consumes existing tree/options/visitor types; produces the public types under “Public type contracts,” including `HintVertexId`, `DagVisitor`, `AsyncDagVisitor`, `GraphVertexStatus`, `GraphVertex`, and `ResolvedGraphSnapshot`. The public query interface belongs to `ResolvedGraph.ts`; storage exposes an object implementing it in Task 3. No public `new ResolvedGraph()` constructor is introduced.

- [ ] Add compile-time positive cases for graph callbacks, tree adapters assigned to `AsyncTraversableTree`, plain-valued async visitors, promise-valued async visitors, input/output rewrite generics, and explicit undefined ids. Add `@ts-expect-error` cases for a graph callback accessing `options.resolvedTree` and invalid rewrite command payloads. Run `npm run typecheck` and confirm the missing APIs are the failure.
- [ ] Copy the normative declarations from the contracts, retaining original synchronous tree option names and original abstract classes. Implement these identity primitives completely:

```ts
export function sameVertexId(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

export function hasVertexId(value: object): boolean {
  return Object.prototype.hasOwnProperty.call(value, 'vertexId');
}
```

- [ ] Assert `sameVertexId(NaN, NaN)`, `sameVertexId(0, -0)`, object identity versus equal-shaped objects, absent property versus `{ vertexId: undefined }`, and independent UUID generation. Diagnostic id labels must not invoke arbitrary object `toString`/`toJSON`: use literal primitive labels and stable per-run labels for reference-valued ids.
- [ ] Run `npm test -- tests/graph-identity.test.ts` and `npm run typecheck`.

**Stop condition:** public declaration shapes and the wrapped hint-id contract are pinned before storage or builders consume them. These declarations add no root exports yet.

## Task 3: Implement strict DAG storage and read-only graph queries

**Files:** create `src/core/graph/GraphStore.ts`; extend `src/core/graph/types.ts`; create `tests/resolved-graph.test.ts`.

**Interfaces:** produces `GraphStore<T>` implementing `GraphStoreContract<T>` and its read-only `graph: ResolvedGraph<T>` facade. Tree-mode record methods are implemented here as record-preserving storage primitives; the old `ResolvedTree` starts delegating only in Task 4.

- [ ] Write the cycle/dedup test before implementation:

```ts
test('rejects a back-edge without damaging accepted topology', () => {
  const store = new GraphStore<TestGraph>('dag');
  const a = new CTTRef(new Vertex<TestGraph>({ $d: 'A', $c: ['B'] }));
  const b = new CTTRef(new Vertex<TestGraph>({ $d: 'B', $c: ['A'] }));
  store.insertVertex({ ref: a, id: 'A', dependsOn: [], depth: 0 });
  store.insertVertex({ ref: b, id: 'B', dependsOn: ['A'], depth: 1 });
  store.setRoot(a);
  store.prepareSlots(a, ['B']);
  store.prepareSlots(b, ['A']);
  store.linkSlot(a, 0, b);
  expect(() => store.linkSlot(b, 0, a)).toThrow(/cycle/i);
  expect(store.graph.getChildrenOf(b)).toEqual([]);
  expect(store.graph.getPathsTo(b)).toEqual([[a, b]]);
});
```

- [ ] Run `npm test -- tests/resolved-graph.test.ts` and inspect the expected missing-store failure.
- [ ] Implement iterative reachability before edge insertion. Use parent reference plus hint index as the slot identity. Preserve an incoming edge for each distinct slot; deduplicate only `getParentsOf` results and identical reference-sequence paths. Compute the removal set before detaching edges. Collection-returning graph methods create shallow copies; the facade exposes no write methods.

```ts
// Inside linkSlot, before mutating either endpoint:
const pending = [child];
const seen = new Set<Ref<T>>();
while (pending.length > 0) {
  const current = pending.pop()!;
  if (current === parent) throw new Error('Discovery cycle detected');
  if (seen.has(current)) continue;
  seen.add(current);
  pending.push(...(this.graph.getChildrenOf(current) ?? []));
}
```

- [ ] Extend the error with the reconstructed cycle path, without stringifying user-owned ids. Cover self-edges, duplicate slots, repeated same-slot acknowledgment, conflicting same-slot links, unknown ids, omitted/deleted identity states, snapshots of query collections, empty-root queries, unique parallel-edge paths, and a deep chain.
- [ ] Run `npm test -- tests/resolved-graph.test.ts tests/graph-identity.test.ts` and `npm run typecheck`.

**Stop condition:** graph queries and storage invariants are independently verified; no scheduler logic is hidden inside storage.

## Task 4: Move ResolvedTree onto the compatibility store

**Files:** modify `src/core/ResolvedTree.ts`, `src/core/graph/GraphStore.ts`, `src/traversals/depth-first-traversal/lib/DepthFirstTraversalResolvedTreesContainer.ts`; create `tests/tree-graph-view.test.ts`.

**Interfaces:** retains every existing `ResolvedTree`/`VertexResolved` signature; adds `ResolvedTree.getResolvedGraph(): ResolvedGraph<T>` for wrappers and an `@internal getGraphStore(): GraphStore<T>` bridge for the core's containers. The latter is not documented as a supported mutation API. The existing container still owns and exposes the same three stores.

- [ ] Add this identity assertion alongside existing fallbacks:

```ts
test('the tree facade retains supplied records and live child arrays', () => {
  const tree = new ResolvedTree<TestGraph>();
  const ref = new CTTRef(new Vertex<TestGraph>({ $d: 'root', $c: [] }));
  const record = new VertexResolved<TestGraph>({
    $d: { resolutionContext: null }, $c: [],
  });
  tree.set(ref, record);
  expect(tree.get(ref)).toBe(record);
  expect(tree.getChildrenOf(ref)).toBe(record.getChildren());
  expect(tree.getResolvedGraph().getVertexById(ref.getId())).toBe(ref);
});
```

- [ ] Run `npm test -- tests/tree-graph-view.test.ts` to observe the missing graph-view behavior.
- [ ] Replace the tree's private map with the store's tree-record methods. Preserve `setRoot` before registration, `makeVertex` on an unresolved ref, compact/duplicate child arrays, the original clone-on-parent-detach behavior, and re-setting a manually deleted legacy ref. Tree raw setters can reinstall their legacy auto-id record; DAG tombstones remain non-resurrectable through resolution.

```ts
get(ref: CTTRef<Vertex<TTP>>): VertexResolved<TTP> | null {
  return this.store.getTreeRecord(ref);
}

set(ref: CTTRef<Vertex<TTP>>, record: VertexResolved<TTP>): void {
  this.store.setTreeRecord(ref, record);
}
```

- [ ] Reuse the exact facade when a resolved-tree container is injected. Validate saved mappings before updating active storage, retaining the existing atomic-error behavior. Run `npm test`, `npm run typecheck`, and `npm run lint`.

**Review gate:** all original tests pass unmodified; this is the first substantial compatibility review.

## Task 5: Add graph containers, snapshots, and source bindings

**Files:** create `src/core/graph/ResolvedGraphsContainer.ts`, `src/core/graph/snapshot.ts`, `src/core/drivers/callbackBindings.ts`; create `tests/graph-container.test.ts`, `tests/graph-source-binding.test.ts`.

**Interfaces:** produces `ResolvedGraphsContainer<T, R>` implementing the companion contract, and `bindTreeSource(adapter, container)` / `bindGraphSource(adapter, container)`. Each returns a `BoundSource<T, R>` with `makeRoot()`, `makeVertex(context)`, and optional `getVertexIdFromHint(hint)` using the matching `MaybePromise` result types. Tree-source binding supplies actual legacy tree options; graph-source binding supplies actual graph options.

- [ ] Write tests constructing the container with `{ sourceMode: 'graph', saveOriginal: true }`. Accept a root and shared child, add two incoming edges, rewrite the active reference, delete it, and assert its saved reference/content and both saved incoming paths remain. Assert snapshot objects have no lifecycle-status method.
- [ ] Write a tree-source binding test whose adapter asserts:

```ts
makeVertex: (hint, options) => {
  expect(options.resolvedTree).toBe(container.treeContainer!.resolvedTree);
  expect(options.resolvedTree.getParentOf(options.resolutionContext.parentVertexRef))
    .toBeNull();
  return { vertexContent: { $d: hint, $c: [] } };
}
```

- [ ] Run `npm test -- tests/graph-container.test.ts tests/graph-source-binding.test.ts` and inspect the initial failures.
- [ ] Implement first-acceptance shallow vertex capture and ref translation. Store original topology only after active/snapshot validation succeeds. For a tree source, wrap the existing container's graph store; do not build another independent active tree. Centralize the existing rewrite-hint-to-input-hint assertion in this binding boundary, retaining the original `T`/`R` adapter contract.
- [ ] Run those focused tests, `npm run typecheck`, and `npm test -- tests/object.test.ts tests/object-edge-cases.test.ts tests/core-edge-cases.test.ts`.

**Stop condition:** context selection and snapshot ownership are tested without a traversal scheduler.

## Task 6: Implement the pure visitor-chain machine

**Files:** create `src/core/visitors/types.ts`, `src/core/visitors/VisitorChain.ts`; modify `src/core/executeVisitors.ts`; create `tests/visitor-chain-machine.test.ts`, `tests/execute-visitors-compat.test.ts`.

**Interfaces:** produces `VisitorChain<T, R>` with `poll()`, `submit(Outcome<VisitResult<R>>)`, `commitBatch(result)`, `resume()`, and `invalidate()`. `poll` returns `VISIT` with record index/metadata, `COMMANDS` with a batch, `WAIT`, `PAUSED`, or `DONE`. `commitBatch` receives `{ halt: boolean; deleted: boolean; vertexVisitorsChainState?: unknown }`. Retains existing `executeVisitors` and `sortVisitorRecords` signatures. Chain constructor input is `{ ref, records: registrationMetadata[], metadata, family: 'tree' | 'dag' }`.

- [ ] Test a two-sequential-visitor chain directly:

```ts
expect(chain.poll()).toMatchObject({ kind: 'VISIT', recordIndex: 0 });
chain.submit({ ok: true, value: {
  commands: [{ commandName: TraversalVisitorCommandName.HALT_TRAVERSAL }],
} });
expect(chain.poll()).toMatchObject({ kind: 'COMMANDS' });
chain.commitBatch({ halt: true, deleted: false });
expect(chain.poll()).toEqual({ kind: 'PAUSED' });
chain.resume();
expect(chain.poll()).toMatchObject({ kind: 'VISIT', recordIndex: 1 });
```

- [ ] Run `npm test -- tests/visitor-chain-machine.test.ts` before implementing the machine.
- [ ] Implement algorithm K3 with explicit group and record positions. Separate “callback outcome received” from “commands committed” so the next callback cannot start early. Preserve group priority/order, null concurrent chain state, explicit undefined state replacement, unknown-style rejection before callbacks, deletion, and metadata rules. Adapt the old generator helper by synchronously executing the machine's VISIT/COMMANDS actions and yielding at PAUSED.
- [ ] Run `npm test -- tests/visitor-chain-machine.test.ts tests/execute-visitors-compat.test.ts tests/visitor-coverage.test.ts tests/depth-first.test.ts tests/breadth-first.test.ts`, then `npm run typecheck`.

**Stop condition:** all six families can share one chain algorithm, and legacy consumers retain the old generator helper contract.

## Task 7: Implement identity admission and dependency readiness

**Files:** create `src/core/scheduling/types.ts`, `src/core/scheduling/GraphScheduling.ts`; create `tests/graph-readiness.test.ts`.

**Interfaces:** produces `GraphScheduling<T, R>(container)` with `acceptRoot(result)`, `acceptVertex(context, result, hintIdentity?)`, `markPreVisited(ref)`, `takeReady()`, and `takeEligible()`. Acceptance returns `Ref<T | R> | null`; `markPreVisited` returns void. `takeEligible()` consumes the head of one FIFO and returns `{ ref, order: 'ON_READY' | 'ON_COMPLETE' } | null`; this task initially enqueues only ON_READY entries. `takeReady()` consumes the head only if it is ON_READY, otherwise returns null. It owns data-only unmet/reverse-dependency tables. It uses container storage and identity helpers, not callbacks.

- [ ] Test early discovery of a dependent before its prerequisites, using container-registered parents and prepared slots:

```ts
expect(scheduling.takeReady()).toBe(rootRef);
scheduling.markPreVisited(rootRef);
const joinRef = scheduling.acceptVertex(joinContext, adapter.makeVertex('join'));
expect(scheduling.takeReady()).toBeNull();
const aRef = scheduling.acceptVertex(aContext, adapter.makeVertex('A'))!;
const bRef = scheduling.acceptVertex(bContext, adapter.makeVertex('B'))!;
expect(scheduling.takeReady()).toBe(aRef);
expect(scheduling.takeReady()).toBe(bRef);
scheduling.markPreVisited(aRef);
expect(scheduling.takeReady()).toBeNull();
scheduling.markPreVisited(bRef);
expect(scheduling.takeReady()).toBe(joinRef);
```

- [ ] Run `npm test -- tests/graph-readiness.test.ts`, then implement K1 with own-property id detection and Map equality. Record dependencies on undiscovered ids in reverse indexes immediately. Mark readiness once; duplicate results can add edges but never replace dependencies or rerun readiness.
- [ ] Add null/omitted ids, repeated omission, omission/content conflicts, duplicate null for a live id, authoritative hint ids, id mismatches, explicit undefined ids, duplicate dependencies, ignored root dependencies, and already-satisfied COMPLETING dependencies. Assert original-error propagation for consumed error outcomes at the kernel boundary in Task 9.
- [ ] Run `npm test -- tests/graph-readiness.test.ts tests/resolved-graph.test.ts` and `npm run typecheck`.

**Stop condition:** joins and omission can be tested synchronously without async orchestration.

## Task 8: Implement completion accounting and pruning

**Files:** extend `src/core/scheduling/GraphScheduling.ts`, `types.ts`; create `tests/graph-completion.test.ts`, `tests/graph-pruning.test.ts`.

**Interfaces:** adds `closeExpansion(ref)`, `closeSlot(parent, index, reason)`, `markComplete(ref)`, `takeCompleting()`, `deleteVertex(ref): Set<Ref<T | R>>`, `disableSubtree(ref): void`, and `getStall(): { dependencies: Array<{ id: unknown; missing: unknown[] }>; incomplete: Ref<T | R>[] } | null`. Completion entries append to Task 7's same eligible FIFO. `takeCompleting()` consumes its head only if it is ON_COMPLETE, otherwise returns null; DAG policy uses `takeEligible()` to preserve mixed-order admission. Completion eligibility is separate from marking COMPLETE. Expose affected references to the kernel so it invalidates runtime owners before advancing other work.

- [ ] Build a parent/child with linked slots and both initial visits committed. Assert:

```ts
scheduling.closeExpansion(childRef);
expect(scheduling.takeCompleting()).toBe(childRef);
expect(scheduling.takeCompleting()).toBeNull();
scheduling.markComplete(childRef);
expect(scheduling.takeCompleting()).toBe(parentRef);
```

- [ ] Add a duplicate incoming-slot case: completing one child closes both distinct parent obligations, but deleting that child afterward cannot decrement them again. Assert mixed-order FIFO behavior: an already queued B initial visit precedes a newly eligible A completion visit. Test a shared descendant with a surviving parent, dependency-driven deletion despite another parent, late-discovered tombstoned dependents, root deletion, and subtree disabling during an initial visit.
- [ ] Run `npm test -- tests/graph-completion.test.ts tests/graph-pruning.test.ts` before implementing K2. Track `completionAccounted` per slot, independently of its linked/terminal representation. A closed empty expansion may complete; an unprepared expansion may not.
- [ ] Implement iterative cascade worklists and quiescent-stall reporting. `getStall` supplies model details; the kernel decides whether active work or event boundaries make diagnosis premature.
- [ ] Run the focused tests and `npm run typecheck`.

**Stop condition:** all storage/dependency/completion transitions are available before drivers and policies are composed.

## Task 9: Build the kernel, callback protocol, and synchronous transport

**Files:** create `src/core/effects/types.ts`, `src/core/kernelTypes.ts`, `src/core/TraversalKernel.ts`, `src/core/CoreInspection.ts`, `src/core/AsyncCoreExecution.ts`, `src/core/drivers/runSync.ts`; extend `callbackBindings.ts`; create `tests/kernel-transitions.test.ts`, `tests/core-inspection.test.ts`, `tests/sync-driver.test.ts`.

**Interfaces:** implements `KernelPort`, `CallSpec`, `CallbackReply`, `KernelAction`, inspection/async-core interfaces, and explicit records from the contracts. `TraversalKernel` constructor input is `{ kind, execution, sourceMode, container, stateBridge, visitorMetadata, iterableConfig, inOrderConfig, hasSorter, hasHintIds, concurrency }`. `stateBridge` references the retained public status/root/visitor-state/disabled-ref objects. `kernel.inspect()` returns `KernelInspection`. `CallbackBindings.invoke(call)` returns the contract's `RawCallbackResult`. `runSync(kernel, bindings, runtimeState)` returns `Generator<KernelEvent<T | R> | null>`; null is the retained halt boundary. Its `SyncDriverState` contains the physical `inFlightCallbackCount`, updated with try/finally around invocation.

- [ ] Drive a kernel with manually submitted outcomes. Assert root CALL, accepted root, initial VISIT, event boundary, and no frame admission until acknowledgment. Test invalid owner outcomes, reply-kind mismatches, exactly-once command commit, thrown undefined, queued events before failure, and WAIT versus terminal state.

```ts
const action = kernel.poll('drive');
expect(action.kind).toBe('CALL');
if (action.kind !== 'CALL') throw new Error('Expected root request');
kernel.submit({
  requestId: action.call.requestId,
  kind: 'MAKE_ROOT',
  outcome: { ok: false, error: undefined },
});
expect(kernel.poll('drive')).toEqual({ kind: 'FAILED', error: undefined });
```

- [ ] Run `npm test -- tests/kernel-transitions.test.ts tests/core-inspection.test.ts tests/sync-driver.test.ts` before implementing K0–K3 composition. Put policy selection behind the `kind` discriminant; upcoming tasks install each policy's work-selection logic without moving callbacks into policies.
- [ ] Implement copied/frozen inspection snapshots with the exact A16 shapes. Hold a pending request, inspect twice, and assert no callback calls or event-boundary changes. Assert nested owner/array snapshots are detached, contain no callbacks/promises/user data, and are readable in every status. Within a sync callback, the runtime's physical in-flight count is 1; after success or throw it returns to 0.
- [ ] Implement the transport loop with these exact external boundaries:

```text
CALL -> invoke synchronously, convert success/throw into a matching CallbackReply, submit
EVENT -> yield event; on next generator advance acknowledge its boundary
HALTED -> yield null; retain the loop for resume
FINISHED -> return
FAILED -> throw the original error
WAIT -> invariant error if no synchronous reply or retained boundary can make progress
```

- [ ] Add a thenable guard before success submission. Observe the thenable's rejection while failing with a TypeError containing runner/callback names. Test rejected promises, custom thenables, and a throwing `then` getter without replacing original thrown callback errors.
- [ ] Run the focused tests, `npm run typecheck`, and `npm run lint`.

**Stop condition:** a promise-free core can be manually stepped and a sync transport can be tested through its port. Policy-specific traversal is completed in Tasks 10–12; unsupported kind selection is not exposed through existing builders during this task.

## Task 10: Migrate the depth-first policy and synchronous runner

**Files:** create `src/traversals/depth-first-traversal/lib/DepthFirstPolicy.ts`; modify its existing runner and kernel policy selection; create `tests/depth-first-core-parity.test.ts`.

**Interfaces:** `DepthFirstPolicy` operates on explicit frame records corresponding to current `Frame` fields and yields kernel work choices. The existing runner class, `icfg`, `state`, `resolvedTreesContainer`, `curGenerator`, and public method signatures remain. Add `getResolvedGraph()` delegating to its tree facade and `inspect(): CoreInspection` combining kernel/SyncDriverState with a zero buffered-event count.

- [ ] Add graph-view/status/inspection assertions to a DFS traversal while retaining the Task 1 trace as the primary oracle. Inspection before first iteration must not resolve the root; inspection during a halt must preserve the next visitor position. Run `npm test -- tests/depth-first-core-parity.test.ts tests/traversal-callback-contract.test.ts` before migration.
- [ ] Transfer the current frame transitions without changing their order:

```text
pre -> initial visitor/event boundary -> copy/sort current hints
children -> consume exactly one slot with a freshly constructed sync context
resolved child -> push its frame immediately
child frame done/null slot -> evaluate the existing in-order helper at that hint index
no hints -> the existing leaf in-order visit
post -> completion chain/event -> pop frame
```

- [ ] Reuse `shouldVisitParentOnInOrder`, existing configuration cloning, and iterator filters. Keep legacy `STACK` and count/range helpers in `DepthFirstTraversalRunnerState` unchanged. The runner wraps `runSync`, retaining an internal generator across public iterator closure.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run lint`.

**Review gate:** exact DFS callback/context/event traces, all original visitor halts, saved trees, rewriting, deep chains, and injection assertions pass.

## Task 11: Migrate the breadth-first policy and synchronous runner

**Files:** create `src/traversals/breadth-first-traversal/lib/BreadthFirstPolicy.ts`; modify its runner and kernel policy selection; create `tests/breadth-first-core-parity.test.ts`.

**Interfaces:** uses the existing BFS queue of unresolved `VertexResolutionContext` values and queue cursor; retains existing public runner/state signatures and adds `getResolvedGraph()` and `inspect(): CoreInspection` through the same sync inspection contract as DFS.

- [ ] Add a test that consumes root and first-child events and checks both the adapter invocation log and graph-view membership. Its central assertion is:

```ts
expect(calls).toEqual(['root', 'resolve:A', 'visit:A']);
expect(runner.getResolvedGraph().getVertexRefs().map((ref) => ref.unref().getData()))
  .toEqual(['root', 'A']);
```

- [ ] Run the new focused test, then implement dequeue-time resolution: parent visit/event, sorted child-context enqueue, next queued context consumption, child registration, child visit/event. Do not enqueue resolved vertices as a shortcut. Preserve injected queue/cursor behavior and clearing of a finished queue. Inspect between child events and verify it does not consume the next queued context.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run lint`.

**Review gate:** both synchronous families now use shared storage/kernel/chain machinery, and all original tests still pass unchanged.

## Task 12: Expose synchronous DAG traversal

**Files:** create `src/traversals/dag-traversal/DagTraversal.ts`, `lib/DagTraversalRunner.ts`, `lib/DagTraversalRunnerState.ts`, `lib/DagTraversalInstanceConfig.ts`, `lib/DagTraversalRunnerIterableConfig.ts`, `lib/DagTraversalRunnerInternalObjects.ts`, `lib/DagPolicy.ts`, `init-helpers/initVisitors.ts`; create `tests/dag-traversal.test.ts`, `tests/dag-configuration.test.ts`.

**Interfaces:** implements the constructor/source/config/visitor/runner contracts from the companion, including `inspect(): CoreInspection`. DAG visitors/events use `isGraphRoot`; root and traversal-root predicates remain distinct. New builders include `configure`, `addVisitorFor`, `listVisitorsFor`, and `setVisitorsFor`. Driver bindings assemble actual graph options and snapshot references.

- [ ] Add the primary public test:

```ts
test('visits a shared join once after both prerequisites', () => {
  const runner = new DagTraversal<TestGraph>({
    traversableGraph: graphAdapter(),
  }).makeRunner();
  const values = [...runner.getIterable({
    iterateOver: [DagTraversalOrder.ON_READY],
  })].map(({ vertex }) => vertex.getData());
  expect(values).toEqual(['root', 'A', 'B', 'join']);
  const graph = runner.getResolvedGraph();
  const join = graph.getVertexById('join')!;
  expect(graph.getParentsOf(join)).toHaveLength(3);
});
```

- [ ] Run the focused tests before implementing the public family. Use the FIFO initial/completion scheduling rules in A08 and the model from Tasks 7–8. Add type/runtime source-exclusivity checks and construction/configuration rejection of `concurrency`.
- [ ] Cover default two-order iteration, filtered visitors, duplicate priority stability, clone isolation, empty root, missing dependencies, discovery cycles through hint shortcuts, quiescent state injection, graph snapshots, delete/disable/rewrite commands, and synchronous halt/resume. Run a tree-source DAG with `TraversableObjectTree` and assert its adapter receives valid tree contexts.
- [ ] Run `npm test -- tests/dag-traversal.test.ts tests/dag-configuration.test.ts tests/graph-readiness.test.ts tests/graph-pruning.test.ts`, then `npm run check`.

**Review gate:** the entire synchronous product works before introducing async scheduling.

## Task 13: Implement immediate outcome capture, callback limiting, and wakeups

**Files:** create `src/core/drivers/captureOutcome.ts`, `CallbackScheduler.ts`, `Wakeup.ts`; create `tests/async-callback-scheduler.test.ts`.

**Interfaces:** `captureOutcome<T>(invoke: () => MaybePromise<T>): Promise<Outcome<T>>`; `CallbackScheduler(limit)` provides `enqueue(requestId, invoke)`, `startEligible(predicate)`, `takeSettled()`, `discardQueued(predicate)`, and `inFlight`; `Wakeup` provides `notify()` and `wait(): Promise<void>` with a remembered notification so notify-before-wait is not lost. `takeSettled` returns FIFO `{ requestId, outcome }` entries, retaining discriminated raw callback results for mapping into replies.

- [ ] Start with rejection capture:

```ts
test('captures a rejection before the consumer awaits its outcome', async () => {
  const errors: unknown[] = [];
  const listener = (error: unknown) => errors.push(error);
  process.on('unhandledRejection', listener);
  try {
    const error = new Error('late sibling');
    const outcome = captureOutcome(() => Promise.reject(error));
    await eventLoopTurn();
    expect(errors).toEqual([]);
    await expect(outcome).resolves.toEqual({ ok: false, error });
  } finally {
    process.off('unhandledRejection', listener);
  }
});
```

- [ ] Run the focused test, then implement immediate capture:

```ts
export function captureOutcome<T>(invoke: () => MaybePromise<T>): Promise<Outcome<T>> {
  try {
    return Promise.resolve(invoke()).then(
      (value): Outcome<T> => ({ ok: true, value }),
      (error: unknown): Outcome<T> => ({ ok: false, error }),
    );
  } catch (error) {
    return Promise.resolve({ ok: false, error });
  }
}
```

- [ ] Add scheduler tests measuring physical callbacks at limits 1, 2, and Infinity; synchronous throw; undefined rejection; paused queued frame work bypassed by an eligible draining chain; discarded queued work; already invoked invalidated work retaining its physical permit; and multiple wake notifications coalescing without loss.
- [ ] Run `npm test -- tests/async-callback-scheduler.test.ts`, `npm run typecheck`, and `npm run lint`.

**Stop condition:** no callback promise can escape unobserved while waiting in a frame or during halt cleanup.

## Task 14: Implement async iterator ownership and session control

**Files:** create `src/core/drivers/AsyncRunnerSession.ts`; create `tests/async-runner-session.test.ts`.

**Interfaces:** `AsyncRunnerSession<E>` implements `AsyncCoreExecution<E>` and accepts the exact `AsyncSessionControl<E>` interface in the contracts, including synchronous `advance(mode)`, inspection, event acknowledgment, halt/configuration control, and `waitForProgress()`. It owns the single pump loop, one iterator lease, queued next/close waiters, buffered `{ event, boundaryId }` entries, and delivered-boundary acknowledgment. `getIterable(config?)` returns `AsyncGenerator<E, void, unknown>`; `run(config?)` drains it and returns `Promise<this>`. `inspect()` combines the driver snapshot with the session's undelivered event count. The production driver implements that control port in Task 15; this task uses a deterministic fake control port rather than an unfinished real runner.

- [ ] Script the fake control port with a pending resolver and no active chain. Assert:

```ts
const iterator = session.getIterable();
const next = iterator.next();
const close = iterator.return(undefined);
expect(control.haltRequested).toBe(true);
control.reachHalted();
await expect(close).resolves.toEqual({ done: true, value: undefined });
await expect(next).resolves.toEqual({ done: true, value: undefined });
```

- [ ] Run `npm test -- tests/async-runner-session.test.ts` before implementation. Implement D2 with a custom iterator object: first-next ownership, same-iterator next queue, immediate close signaling, before-start no-ops, original consumer throws, and exactly-once lease release. `getFailure()` returns `{ error: unknown } | null` to distinguish absent failure from an undefined thrown value.
- [ ] Cover idle consumers, buffered events across close/resume, already-delivered boundary acknowledgment, a second iterator while closing, repeated return, next-after-close, and an explicit throw while close also observes traversal failure. The fake's `advance(mode)` returns scripted event/WAIT/terminal actions; `reachHalted()` and `fail(error)` notify its Wakeup.
- [ ] Exercise `AsyncCoreExecution` directly: `session.run()` uses the same iterator lease and halt/failure path, returns the session, and rejects when another iterator owns execution. While a callback is pending, `session.inspect()` returns synchronously with accurate buffer/count fields and does not call `advance()`.
- [ ] Run focused tests, `npm run typecheck`, and `npm run lint`.

**Stop condition:** ownership/close semantics are proved independently of real graph scheduling, including closing an unresolved `next()`.

## Task 15: Implement the async pump and tree prefetch transport

**Files:** create `src/core/drivers/runAsync.ts`; extend kernel frame/request handling and callback bindings; create `tests/async-driver.test.ts`, `tests/async-tree-prefetch.test.ts`.

**Interfaces:** `createAsyncDriver(kernel, bindings, concurrency)` returns `AsyncSessionControl<KernelEvent<T | R>>`, used in Task 14's async core runtime. Its synchronous `advance` composes the callback scheduler, Wakeup, and kernel transport; the session owns the D1 loop and mode selection. Its `inspect()` combines the kernel snapshot and scheduler's actual in-flight count. `runAsync` exports that factory and its control-port type. Frame state stores tagged outcomes by hint index; source callbacks are never awaited in the transition kernel.

- [ ] Drive the real kernel with an adapter whose first child is deferred and second child rejects immediately. Capture `unhandledRejection`, advance an event-loop turn, resolve the first child, and assert the required visit/error trace. Add a sorter and hint-id hook that return promises to ensure the limiter covers those callback kinds.

```text
root initial event acknowledged -> A and B resolution admitted
B error captured -> status stays RUNNING while A is pending
A success consumed -> A's required visits/events run
B slot consumed -> original B error surfaces and status becomes FAILED
```

- [ ] Run `npm test -- tests/async-driver.test.ts tests/async-tree-prefetch.test.ts` before transport implementation.
- [ ] Implement D1 and recalculate mode immediately after satisfying a next waiter. Never keep drive admission enabled just because the pump started with demand. Process already captured outcomes before declaring no progress. During halt, store valid resolution/sorter/hint outcomes without consuming them; allow only started chains to drain. Store owner validity independently of physical permit ownership.
- [ ] Test closing while root/child resolution is pending, ignored late errors after deletion, stored errors on resume, hint rewrite before prefetch admission, cancellation of queued-but-uninvoked slots, and limit-1 interleaving. Inspect a physically running invalidated callback and then its settlement: the in-flight count drains without changing failed/deleted graph state. Run the focused tests and `npm run typecheck`.

**Stop condition:** the async transport works with shared tree policies and the independent iterator session; no public async class is needed to test the transport.

## Task 16: Expose asynchronous depth-first traversal

**Files:** create `src/traversals/depth-first-traversal/AsyncDepthFirstTraversal.ts`, `lib/AsyncDepthFirstTraversalRunner.ts`, `lib/AsyncDepthFirstTraversalInstanceConfig.ts`; create `tests/async-depth-first.test.ts`, `tests/async-tree-api.typecheck.ts`.

**Interfaces:** public methods match the existing DFS builder/runner pattern with async callback types, `AsyncGenerator` iteration, `Promise<this>` run, `inspect(): CoreInspection`, and `concurrency`. Reuse `DepthFirstPolicy`, the existing in-order configuration/filters/state class, graph view, and saved-tree container. Async builder methods are standalone rather than overriding the synchronous abstract base. Delegate run/inspection to `AsyncCoreExecution`; public run returns the public runner after awaiting the session.

- [ ] Add the public happy-path/parity assertion:

```ts
const traversal = new AsyncDepthFirstTraversal<TestGraph>({
  traversableTree: {
    makeRoot: () => ({ vertexContent: { $d: 'root', $c: ['A', 'B'] } }),
    makeVertex: async (hint) => ({ vertexContent: { $d: hint, $c: [] } }),
  },
  concurrency: 2,
});
const values: string[] = [];
for await (const event of traversal.makeRunner().getIterable({
  iterateOver: [DepthFirstTraversalOrder.POST_ORDER],
})) values.push(event.vertex.getData());
expect(values).toEqual(['A', 'B', 'root']);
```

- [ ] Run the focused tests, then bind the async builder to the shared driver/session. Map internal events to public DFS events through a synchronous `AsyncSessionControl` adapter; do not introduce a wrapping native async generator. Copy and type-adapt all existing public registration/configuration methods rather than omitting `listVisitorsFor` or `setVisitorsFor`. Preserve nested in-order ranges and runner snapshot isolation.
- [ ] Cover all in-order/null-slot options, repeated mid-chain halts, new resume filters, saved-tree paths, object adapter compatibility, own-record async visitor typing, failed reruns with null/undefined, and original consumer exceptions. Compare timing-independent generated trees with the existing DFS oracle.
- [ ] Run `npm test -- tests/async-depth-first.test.ts tests/async-tree-prefetch.test.ts`, `npm run typecheck`, and `npm run lint`.

**Stop condition:** async DFS is a thin typed wrapper over shared behavior, not a second copied traversal algorithm.

## Task 17: Expose asynchronous breadth-first traversal

**Files:** create `src/traversals/breadth-first-traversal/AsyncBreadthFirstTraversal.ts`, `lib/AsyncBreadthFirstTraversalRunner.ts`, `lib/AsyncBreadthFirstTraversalInstanceConfig.ts`; create `tests/async-breadth-first.test.ts`; extend `tests/async-tree-api.typecheck.ts`.

**Interfaces:** asynchronous BFS mirrors the existing BFS methods and order/configuration types, using `BreadthFirstPolicy`, `createAsyncDriver`, and `AsyncRunnerSession` as its async core runtime. Delegate run/inspection to that session and expose `inspect(): CoreInspection`.

- [ ] Create a root with A/B, where A resolves last. Assert level-order events still read root/A/B even though B resolved first:

```ts
const result = iterator.next(); // after root has been consumed
await eventLoopTurn();
second.resolve({ vertexContent: { $d: 'B', $c: [] } });
first.resolve({ vertexContent: { $d: 'A', $c: [] } });
expect((await result).value?.vertex.getData()).toBe('A');
expect((await iterator.next()).value?.vertex.getData()).toBe('B');
```

- [ ] Run focused tests, then implement the async BFS wrapper with callback prefetch but dequeue-time acceptance. Map public event fields in the synchronous control-port adapter, preserving direct session closure. Test tree-source metadata rejection, defaults/configuration validation, snapshot isolation, root deletion, paused frame outcomes, and consumer-break resumption.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run lint`.

**Review gate:** both async tree families satisfy qualified parity and the original synchronous suite remains unchanged.

## Task 18: Enable concurrent DAG progress in the kernel and driver

**Files:** extend `src/traversals/dag-traversal/lib/DagPolicy.ts`, `src/core/TraversalKernel.ts`, `src/core/drivers/runAsync.ts`; create `tests/async-dag-kernel.test.ts`.

**Interfaces:** reuses the same `KernelPort`, callback protocol, graph scheduling model, and session-control port. Adds no public callback type. DAG frames are independent explicit jobs; admission is bounded by active-chain count and the driver's callback limiter separately.

- [ ] Test the core scheduling distinction with one unrelated slow resolver:

```text
root exposes A and B; both initial chains are admitted
A initial chain commits and admits a slow child resolution
B initial chain commits while that resolution is pending
B's event is deliverable now, with the slow resolution still pending
```

- [ ] Add independent joins, first-accepted duplicate identity races, pending sorting/hint-id jobs, initial versus completion visit interleaving, and metadata reservations that differ from event order. Run `npm test -- tests/async-dag-kernel.test.ts` before enabling async DAG admission.
- [ ] Implement separate ready visits/frame jobs and the D1/K0 progress loop. A pending frame cannot own the only awaited promise in the driver. Allow newly ready dependency work on subsequent demand without waiting for unrelated frame completion. Initial/completion admission flags prevent duplicate chains.
- [ ] Test deletion/failure outcomes against owner epochs before commands commit; show a physically running invalidated callback does not keep an otherwise completed graph open. Run focused kernel/driver tests and `npm run typecheck`.

**Stop condition:** concurrent DAG behavior is verified through the real kernel/driver before adding its public wrapper.

## Task 19: Expose async DAG traversal and verify lifecycle races

**Files:** create `src/traversals/dag-traversal/AsyncDagTraversal.ts`, `lib/AsyncDagTraversalRunner.ts`, `lib/AsyncDagTraversalInstanceConfig.ts`; create `tests/async-dag.test.ts`, `tests/async-dag-lifecycle.test.ts`; extend `tests/graph-api.typecheck.ts`.

**Interfaces:** implements the async DAG constructor/source/visitor/runner contract, including graph snapshots, both source modes, custom AsyncGenerator-compatible iteration, `inspect(): CoreInspection`, shared `AsyncCoreExecution` delegation, and quiescent-state injection checks.

- [ ] Start with a diamond public test using deferred A/B visitors. Assert `join` is not visited after only A resolves, is visited after B resolves, and is visited once despite three discovering parents. Confirm events follow the chosen controlled chain-completion order.
- [ ] Implement the wrapper over Task 18, translating `isRoot` to `isGraphRoot` in the synchronous control-port adapter before constructing the session. Add these independent public acceptance cases, each with explicit deferred checkpoints:

| Case | Required assertion |
| --- | --- |
| Requester halts between two visitors | First visitor is not repeated; second runs on resume |
| Another started chain drains | Its event is delivered or buffered once |
| Loop break with pending visitor | Close waits for chain completion, then next iterator receives its buffered event |
| Close with pending resolver only | Close completes before resolver settlement; result remains available on resume |
| Cascade-delete running dependent | Late commands/errors produce no mutation, event, or new failure |
| Live chain fails while siblings run | First failure retained; graph does not change after later settlements |
| Consumer error plus draining failure | Consumer error escapes; rerun throws the traversal failure |
| Buffered event with changed filters | Committed event retains its original eligibility |
| Repeated halts and second iterator | No duplicate visitors/events; ownership retained until close finishes |
| Inspection during pending/halting/failed work | Detached state snapshot returns immediately and never schedules or commits work |

- [ ] Use original error identity assertions, including this failure sentinel case:

```ts
let caught = false;
try { await runner.run(); } catch (error) {
  caught = true;
  expect(error).toBeUndefined();
}
expect(caught).toBe(true);
expect(runner.getStatus()).toBe(TraversalRunnerStatus.FAILED);
```

- [ ] Run `npm test -- tests/async-dag.test.ts tests/async-dag-lifecycle.test.ts tests/async-dag-kernel.test.ts`, then `npm run check`.

**Review gate:** inspect the concurrency/lifecycle traces before release-surface work. Do not replace failed race assertions with looser sequence or state checks.

## Task 20: Add helpers and public exports

**Files:** create `src/traversals/depth-first-traversal/traverseDepthFirstAsync.ts`, `src/traversals/breadth-first-traversal/traverseBreadthFirstAsync.ts`, `src/traversals/dag-traversal/traverseDag.ts`, `traverseDagAsync.ts`, `hasSingleSink.ts`, `index.ts`; modify existing traversal/core/root indexes and `package.json`; create `tests/async-helpers.test.ts`, `tests/dag-helpers.test.ts`.

**Interfaces:** helper signatures are pinned under “Constructor and helper contracts.” Root namespace `dagTraversal` accompanies named exports. Existing namespace objects gain their corresponding async classes/helpers. Export `KernelInspection`, `CoreInspection`, and `AsyncCoreExecution` types through core/root indexes. Add `./traversals/dag-traversal` to package exports and `typesVersions`; preserve historical deep imports.

- [ ] Add tests importing helpers from their intended subpaths. Assert returned runners are finished or halted as appropriate, nullable visitor arguments resolve without callbacks, and `hasSingleSink` handles empty/multiple/single-sink partial and finished graphs.
- [ ] Implement sink counting against the read-only interface:

```ts
export function hasSingleSink<T extends TreeTypeParameters>(
  graph: ResolvedGraphSnapshot<T>,
): boolean {
  let count = 0;
  for (const ref of graph.getVertexRefs()) {
    if ((graph.getChildrenOf(ref)?.length ?? 0) === 0) count++;
    if (count > 1) return false;
  }
  return count === 1;
}
```

- [ ] Implement each helper's registration and `run` call with the exact sync/async return type. New DAG helpers cannot have their source overridden through config; existing tree-helper precedence stays compatible. Add compile-time root/subpath imports, async return types, graph query results, and invalid configuration cases.
- [ ] Run `npm test -- tests/async-helpers.test.ts tests/dag-helpers.test.ts`, `npm run typecheck`, and `npm run verify-package`.

**Stop condition:** source-level and built-package import surfaces agree.

## Task 21: Complete examples, package consumers, documentation, and release checks

**Files:** create `examples/async-adapter-example.ts`, `examples/dag-workflow-example.ts`; modify `scripts/verify-package.cjs`, `README.md`, `CHANGELOG.md`, `docs/testing.md`, `package.json`, and `package-lock.json`. Inspect `pnpm-lock.yaml` and update it only if it contains corresponding root-package version metadata.

**Interfaces:** uses the published/root/subpath APIs, not source aliases in packed consumers. The examples are executed by the existing example runner. Preserve the current CommonJS package format and ESM default-import support.

- [ ] Add an ESM packed-consumer assertion using the new subpath and an async DAG run:

```js
import { AsyncDagTraversal, DagTraversalOrder }
  from 'configurable-tree-traversal/traversals/dag-traversal';
const runner = new AsyncDagTraversal({
  traversableGraph: {
    makeRoot: async () => ({
      vertexId: 'root', vertexContent: { $d: 'root', $c: [] },
    }),
    makeVertex: async () => ({ vertexContent: null }),
  },
}).makeRunner();
const orders = [];
for await (const event of runner.getIterable()) orders.push(event.order);
assert.deepEqual(orders, [DagTraversalOrder.ON_READY, DagTraversalOrder.ON_COMPLETE]);
const inspection = runner.inspect();
assert.equal(inspection.execution, 'async');
assert.equal(inspection.inFlightCallbackCount, 0);
assert.equal(inspection.bufferedEventCount, 0);
assert.equal(Object.isFrozen(inspection), true);
```

- [ ] Extend packed file assertions and strict TypeScript node/node16 consumers. Run `npm run verify-package` to verify the new consumer fails before the new checks/surface are complete, then fix the package integration.
- [ ] Implement the spec's root/build/compile-module/test/publish workflow as a self-checking example with publication depending on compilation and testing. The async adapter example demonstrates value-or-promise callbacks, a finite concurrency limit, and `inspect()` during pending work. Document source modes, task versus subtree completion, qualified parity, wrapped hint identity, snapshot behavior, inspection, shared async core execution, and iterator-close semantics with working snippets.
- [ ] Add a 0.8.0 changelog entry and set the package/root lockfile version metadata to 0.8.0 consistently; do not run publish commands. Record expanded test locations in `docs/testing.md`.
- [ ] Run `npm run check` and inspect all type, lint, 100-percent coverage, example, build, and packed-consumer results. Run `git diff --check` and inspect the entire release diff.

**Final gate:** all six public families, helpers, deep/subpath consumers, examples, and the unchanged legacy suite pass. A commit or publication still requires the user's explicit request.

## Requirement-to-task coverage

| Spec/contract requirement | Tasks |
| --- | --- |
| Existing sync callback/context/event compatibility | 1, 4, 6, 10, 11 |
| Id equality, wrapped hint identity, source-mode types | 2, 5, 7, 12, 19 |
| Graph topology, paths, cycles, and read-only queries | 3, 4, 8 |
| Saved tree/graph ownership and injected state | 4, 5, 9, 12, 16, 17, 19 |
| Discovery, joins, omission, tombstones, stalls | 7, 8, 9, 12, 18 |
| Initial/completion lifecycle, in-order and pruning | 6, 8, 9, 10, 11, 18 |
| Thenable guard and original thrown values | 9, 13, 15, 19 |
| Immediate rejection capture and callback limits | 13, 15, 18 |
| Async tree prefetch and qualified parity | 15, 16, 17 |
| Chain-local state and serialized commits | 6, 9, 18, 19 |
| Demand, wakeups, pending-next close, buffering | 9, 13, 14, 15, 19 |
| Inspectable core/runners and first-class async core execution | 9–12, 14–17, 19–21 |
| Failure/consumer-error/halt races | 14, 15, 18, 19 |
| Six builders/runners and configuration isolation | 10, 11, 12, 16, 17, 19 |
| Helpers, namespaces, public exports, sink helper | 20 |
| Workflow examples, packed consumers, docs, release checks | 21 |

## Handoff record

When execution starts, record the baseline commit and initial `git status`. For each task record its identifier, changed files, exact checks run, and pass/fail result. The next executor starts at the first unchecked task. Review gates follow Tasks 4, 10–12, 17, 19, and 21. Failures block progression until explained and corrected; a proposal to change a contract is surfaced for review with its affected task numbers.

## Prompt for Sol

```text
Execute docs/superpowers/plans/2026-09-12-unified-graph-core.md task by task.
Read the linked design spec and execution contracts first.
The chosen architecture is an explicit, inspectable state-machine core with
shared synchronous and asynchronous execution runtimes. Keep async work visible
as owned pending requests; follow the pinned inspection and iterator contracts.
Start with Task 1, preserve pre-existing workspace changes, and verify each task
before advancing. Record task progress and the exact verification results.
At the listed review gates, inspect the integrated diff against the contracts.
Raise concrete contradictions with their assumption/task ids; keep the chosen
architecture unless the user approves a change. Do not commit or publish unless asked.
```
