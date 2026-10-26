# Migrate to the uniform API

[Documentation map](index.md) · [Agent workflows](agent-workflows.md) · [API reference](reference.md)

This guide describes the **unreleased API in this checkout**, relative to published npm **0.11.0**. The package version remains 0.11.0 until a separately requested release. Installing the current published package does not provide these new contracts.

CTT still owns generic discovery, dependencies, callback scheduling, traversal lifecycle, and in-memory progress. The host owns agent execution, business outcomes, retries, claims, artifacts, and durable storage. Data and hints remain opaque values.

## Collection sources, prepared definitions, and sessions

These additions compose with existing DAG constructors and runners; custom adapters and low-level preparation/settlement remain available.

| Existing integration | Optional simpler surface |
| --- | --- |
| Hand-built synthetic catalog holder with `makeRoot` / `makeVertex` | `graphFrom(items, { id, dependsOn?, children?, dependsOnComplete? })`; use `forestFrom` when children are records |
| Re-discovering the same source for each runner | `prepareDag(source)` / `await prepareDagAsync(source)` once, then independent `dag.createRunner()` or `await dag.createAsyncRunner()` |
| External runner plus captured `{ vertexId, generation }` | `coordinateDag(runner)` / `coordinateDagAsync(runner)`, or prepared `createSession()` / `await createAsyncSession()` |
| `run()` → summary frontier → `settle()` → `run()` | `advance()` → frontier ticket → `complete(ticket)` → `advance()` |
| Callback-local data filtering | `filterDagVisitor(guard, (data, context) => ...)` or `filterAsyncDagVisitor`; the callback receives narrowed data |

The unreleased collection selector names `dependencies` and `completionDependencies` are replaced by `dependsOn` and `dependsOnComplete`. All four adapters throw `TypeError` for the retired keys before input/selector callbacks, including inherited keys and keys present with `undefined`, to prevent silently dropping dependency edges. Task-data properties, diagnostic fields, walking relation selections and definition-diff aspects retain their names.

Collection adapters copy membership and edge lists while retaining shallow item/ID identity. Async source helpers materialize iterable/async-iterable inputs and selectors into ordinary synchronous sources. `graphFrom` children are catalog IDs; `forestFrom` children are records, with shared references allowed. Missing child IDs and conflicting record identities reject.

Preparation returns `{ kind: 'valid', dag }` or `{ kind: 'invalid', issues }`, sharing `DagDefinitionResult` with definition preparation, composition and revision. Engine dependency validation failures contain one `{ kind: 'milestone', diagnostics }` issue, with no top-level `diagnostics` alias. Adapter-thrown errors retain their identity, even a caller-thrown stall error. Prepared replay normalizes hints to IDs, owns topology, and invokes no original adapters; original hint/context snapshots are not preserved. Async runner and session factories return promises. Runner options permit visitors, completed-work seeds, and completion policy; session options permit only `completedWork` plus async `concurrency`. Topology/source/state overrides reject, including own fields with `undefined`.

Coordination requires external settlement. Frontier tickets are nominal readonly local capabilities, bound to their issuing facade and generation. First acceptance returns `{ kind: 'accepted' }`, identical reports return `{ kind: 'alreadyAccepted' }`, and conflicting/foreign/stale tickets reject. `failTraversal(ticket, error)` is fatal, preserving exact errors. Reconstruct from accepted completion facts after restart; copied or serialized tickets cannot settle work. See [source and prepared contracts](reference.md#collection-and-forest-sources) and the [ticket contract](reference.md#ticket-coordination).

## Materialized definitions, fragments, inspection, and revisions

These optional APIs extend prepared DAGs in this unreleased checkout. `prepared.definition` retains entry mode, ordered discovery slots and omissions; rebuilding only from `.vertices` loses those facts. Author values with `defineDag`, validate with `prepareDagDefinition`, or reuse shapes through `defineDagFragment`, `instantiateDagFragment` and `composeDag`. Structural child links and W/C wires remain separate.

Use `inspectDag(runner)` for detached milestone navigation and explanations. Use `reviseDag(prepared, operations)` for ordered atomic edits: success returns a fresh prepared DAG plus a shallow `diffDagDefinitions` result; graph invalidity returns issues. Full replacement records explicitly declare slots and both dependency lists. Removal requires explicit repair of dangling references. Programmer errors throw.

Create a new session from the revised DAG. Old tickets, generations, callbacks and completion facts stay in the old execution. Select valid `completedWork` facts explicitly for the new definition; diffs do not infer artifact invalidation. See [definition contracts](reference.md#materialized-dag-definitions), [fragment contracts](reference.md#dag-fragments-and-composition), [inspection](reference.md#dag-dependency-queries-and-explanations), and [revisions](reference.md#validated-dag-revisions).

## General graph walking and common inspection

The unreleased walking family is additive: use `GraphWalk`, `AsyncGraphWalk`, `walkGraph` or `walkGraphAsync` with a single options object and a walking `source`. Root, `graphWalk` namespace and `traversals/graph-walk` subpath exports share identity. Existing tree/DAG source types and event timing are unchanged. Explicit target wrappers support ID-only or inline-hydrated discovery; event records carry typed vertices, edges and prefixes rather than tree `Vertex` instances. Use explicit adapters for finite catalogs or selected `DagDefinition` relations.

Defaults are BFS, unique vertices (`once`), vertex-only emission and serial execution. `simplePaths`/`walks` require depth or step bounds; always inspect `summary().outcome`. A supplied `configure` limits record replaces the old record, with merged validation before mutation. The first accepted resolution wins even after omission; this intentionally differs from DAG milestone omission. Walking explicit emission selectors narrow at delivery, including buffered records, without changing tree/DAG admission semantics. Consumer iterator return pauses; walking runner close is terminal disposal. Closing a failed walker rethrows its exact error without repeated cleanup; overlapping async closes share a promise. See the [full walking contract](reference.md#general-graph-walking).

The shared execution interfaces add a defaulted inspection parameter, preserving `CoreInspection` for existing code. `TraversalExecutionState<ExecutionInspection>` accepts all families; `SyncTraversalExecution<Phase, Event, ExecutionInspection>` and its async counterpart keep phase safety while generalizing inspection. Choose `GraphWalkInspection` for walking detail; old two-parameter wrappers still expect tree/DAG inspection. No common source interface, DAG settlement, concurrency option or durable checkpoint is added to walking.

## Typed DAG event identities

`DagEvent<T, ID = unknown>` now requires `vertexId: ID`; sync and async iterators preserve the runner's ID generic. `kind` and `order` form a correlated union: `workCompleted` means `ON_READY`, and `subgraphCompleted` means `ON_COMPLETE`. Code constructing event fixtures must supply an ID and a matching kind/order pair. Existing event timing, ordering, phase filters, and seeded/settled completion behavior remain unchanged.

## Root dependencies

Ordinary graph roots now honor both work and completion prerequisites, consistently across lazy/eager discovery, seeds, and prerequisite lookup. The old lazy-root behavior depended on unrelated options such as `completedWork`, `resolvePrerequisite`, or a non-undefined completion declaration.

```ts
const traversal = new DagTraversal({
  traversableGraph: graph,
  rootDependencies: 'honor', // New default: root dependsOn applies.
});
// To preserve ignoring the root's W declarations:
const legacyRootPolicy = new DagTraversal({
  traversableGraph: graph,
  rootDependencies: 'ignore', // Root dependsOnComplete still applies.
});
```

Synthetic catalog roots remain bookkeeping with no work dependencies. Tree traversal semantics remain unchanged.

## Structural parent dependencies

Graph sources default to `implicitParentDependency: false`. Omitting `dependsOn` means no W prerequisites. Previously, an ordinary discovered child inherited its discovery parent's W when the list was omitted.

Choose explicitly:

- Declare `dependsOn: [parentId]` for a parent W requirement, or another explicit ID list for independent workflow relationships.
- Declare `dependsOn: []` for no work prerequisites under either policy.
- Set `implicitParentDependency: true` to restore inheritance when `dependsOn` is omitted.

Explicit lists always win. `dependsOnComplete` adds C gates independently; it does not replace W declarations. Roots and detached prerequisites have no discovery parent, and synthetic catalog parents never gate work. Tree sources retain their structural execution order and parent dependencies. Structural child edges still govern paths and subtree completion, independently of work edges.

## Exclusive deferral command

Replace the deprecated exported symbol with a command result:

```ts
// Before: import { DEFER_READY } ...; return DEFER_READY;
import { TraversalVisitorCommandName as Command } from 'configurable-tree-traversal';
traversal.addVisitorFor(DagTraversalOrder.ON_READY, () => ({
  commands: [{ commandName: Command.DEFER_READY }],
}));
```

Deferral is valid only in DAG `ON_READY` and must be the **only command in its result**. Mixing it with `NOOP`, a rewrite, halt, or any other command rejects before applying that result's commands. The deprecated sentinel normalizes to the same transition.

Deferral ends the visitor chain, discards uncommitted group commands, skips remaining visitors, leaves work incomplete, and releases callback capacity. Already committed changes and external effects remain. `HALT_TRAVERSAL` instead retains its runner-wide resumable behavior. The default `workCompletion: 'visitorReturn'` completes W on normal `ON_READY` chain return. Prefer `workCompletion: 'externalSettlement'` for external work: the chain's commands commit, then W remains incomplete with a guarded deferred generation, even for zero or filtered callbacks. Explicit DEFER remains useful for ending a chain early and skipping later callbacks. Synthetic roots and `completedWork` seeds do not require new settlement. ON_COMPLETE remains automatic. Dispatch from the deferred summary frontier (or an actual enabled callback); emitted deferred ON_READY events arrive only on settlement. Generations remain runner-local symbols, not durable claims.

## Command batching

| Deprecated registration option                                        | Canonical option                                  |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL` | `commandCommitMode: 'afterEachVisitor'` (default) |
| `resolutionStyle: TraversalVisitorFunctionResolutionStyle.CONCURRENT` | `commandCommitMode: 'afterGroup'`                 |

Flat callbacks now run by descending priority, then registration order, **before** batching is applied. Adjacent `afterGroup` entries buffer until the next `afterEachVisitor` or phase end. A priority-1000 `afterEachVisitor` runs before a priority-1 `afterGroup`; changing commit mode alone cannot reorder callbacks. This intentionally corrects historical group-first ordering. Express the previous desired order with explicit ordered groups below. Async concurrency remains independent. Deprecated aliases normalize to batching; contradictory explicit old/new modes reject.

## Shared visitor definitions and ordered groups

The same phase input configures a class, `configure`, `setVisitorsFor`, or a helper: callback, `{ visitor, priority?, commandCommitMode? }`, readonly flat definitions, or `{ groups: [...] }`. No caller `addedIndex` is needed; compatibility indexes are ignored. This standalone example uses one definition in both entry points and verifies an explicit ordering boundary:

<!-- standalone -->

```ts
import {
  DepthFirstTraversal, DepthFirstTraversalOrder as Order,
  TraversableObjectTree, traverseDepthFirst,
  type VisitorPhaseInput, type TraversalVisitor,
  type TraversableObjectTTP,
} from 'configurable-tree-traversal';

type Tree = TraversableObjectTTP<string, number>;
const source = new TraversableObjectTree<number, string, number>(1);
const calls: string[] = [];
const definition: VisitorPhaseInput<TraversalVisitor<Order.POST_ORDER, Tree, Tree>> = {
  groups: [
    { commandCommitMode: 'afterGroup', visitors: [
      { visitor: () => { calls.push('first'); }, priority: 1 },
    ] },
    { visitors: [{ visitor: () => { calls.push('second'); }, priority: 1000 }] },
  ],
};
const traversal = new DepthFirstTraversal({
  traversableTree: source, visitors: { [Order.POST_ORDER]: definition },
});
traversal.setVisitorsFor(Order.POST_ORDER, traversal.listVisitorsFor(Order.POST_ORDER));
traversal.makeRunner().run();
traverseDepthFirst({ traversableTree: source, visitors: { [Order.POST_ORDER]: definition } });
if (calls.join(',') !== 'first,second,first,second') throw new Error('Unexpected group order');
```

Explicit groups run in array order, sorting priority only inside a group. Policy has one owner: a member's `commandCommitMode` or `resolutionStyle` is invalid, even if undefined. Empty groups validate then are inert, including append and list/set; they create no ordering barrier. `addVisitorGroupFor` appends a group. Individual `addVisitorFor` appends to a final implicit flat group. Full normalized list/set arrays preserve group metadata; when regrouping, map records to `{ visitor, priority }` and choose the new group policy. Callbacks see previously committed chain state; callbacks in an uncommitted batch share that prior state. HALT preserves continuation; explicit DEFER discards only its current uncommitted batch. Concrete sync/async receivers retain inference; narrow a mixed traversal receiver union before inline callback registration. Standalone mode strings need `as const` or a public input annotation on TypeScript 4.7.

## Phase-aware visitors

Registration keys, configuration visitor maps, helper maps, and `options.order` now infer the actual phase. Deferral is restricted to `ON_READY`; hint rewrites are restricted to `PRE_ORDER`, `LEVEL_ORDER`, and `ON_READY`. Runtime validation remains for JavaScript/unsafe casts, including eager-discovery topology restrictions.

General `TraversalVisitor` and `DagVisitor` aliases remain usable for callbacks returning common commands, across add/configure/set/helper entry points. Give phase-specific callbacks an appropriate phase parameter instead of widening a forbidden command to the whole traversal order union.

The callback context's `options.visitorRecord` is now a readonly, phase-neutral `VisitorRegistrationMetadata` view: `addedIndex`, `priority`, `commandCommitMode`, and deprecated `resolutionStyle`. Its supported TypeScript contract has no executable `.visitor`. If you previously invoked `options.visitorRecord.visitor`, retain your own callback reference or retrieve full typed records using `traversal.listVisitorsFor(order)`. Configuration, listing, and replacement APIs still expose full callback records. The runtime object may retain `.visitor` for existing JavaScript callers.

## Completion vocabulary

| Previous form                                  | Canonical form                                               |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Progress `work: 'succeeded'`                   | `work: 'completed'`                                          |
| `settle(id, { ok: true }, generation)`         | `settle(id, { kind: 'workCompleted' }, generation)`          |
| `settle(id, { ok: false, error }, generation)` | `settle(id, { kind: 'traversalFailed', error }, generation)` |

The boolean settlement forms remain deprecated inputs; the old progress string is replaced. `workCompleted`, `completedWorkIds`, and seed `completedWork` keep consistent completion terminology. Both settlement forms share generation checks and replay equality, including cross-form replay. Fatal errors preserve exact values, including `null` and `undefined`, and async wakeup behavior is unchanged.

`workCompleted` means the host accepted work as complete for traversal. A business rejection can still complete a review task. `traversalFailed` fails the whole runner; it does not request per-item retry. Keep retryable work deferred and implement attempts in the host. Generations are runner-local symbols; reconstruct from host-accepted `completedWork` facts after restart.

## Source resolution

The table below applies to graph sources and prerequisite lookup. Tree sources use `{ kind: 'omitted' }` without a milestone acknowledgement, including when a DAG runner consumes a tree adapter. Tree callbacks and object hooks reject `satisfiesDependencies`, even an own field set to undefined; graph/prerequisite omissions require literal `true`, never false or undefined. Published untagged `{ vertexContent: null }` inputs remain compatible.

| Deprecated source result                                       | Canonical source result                                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `{ vertexContent, vertexId?, dependsOn?, dependsOnComplete? }` | `{ kind: 'found', vertex: { vertexContent, vertexId?, dependsOn?, dependsOnComplete? } }` |
| `{ vertexContent: null, vertexId? }`                           | `{ kind: 'omitted', vertexId?, satisfiesDependencies: true }`                             |
| Lookup `undefined`                                             | `{ kind: 'missing' }`                                                                     |

`found` contains non-null content. `omitted` deliberately excludes a vertex and satisfies its W and C prerequisites. `missing` cannot satisfy prerequisites and is valid only from `resolvePrerequisite`; it is invalid from `makeRoot`/`makeVertex`. Bare `null` is invalid everywhere; bare `undefined` is invalid from root/hint callbacks. Existing untagged `MakeVertexResult` and lookup-only `undefined` remain deprecated inputs. These rules add no silent omission path.

<!-- standalone -->

```ts
import type {
  PrerequisiteResolutionResult,
  TreeTypeParameters,
} from 'configurable-tree-traversal';
type Tasks = TreeTypeParameters<string, string>;
function resolvePrerequisite(id: unknown): PrerequisiteResolutionResult<Tasks> {
  if (id !== 'build') return { kind: 'missing' };
  return {
    kind: 'found',
    vertex: {
      vertexId: id,
      dependsOn: [],
      vertexContent: { $data: id, $childHints: [] },
    },
  };
}
```

Own-property ID presence is significant: `{ vertexId: undefined }` supplies the real `undefined` ID. Omitting the field during prerequisite lookup inherits the requested ID. Explicit IDs must match using SameValueZero; symbols and object references retain identity. Graph roots/hints accept `SourceVertexResult`; prerequisite lookup accepts `PrerequisiteResolutionResult`, including `MissingVertexResult`. Tree adapters instead use `MakeTreeVertexResult<T>`, `TreeFoundVertexResult<T>`, `TreeOmittedVertexResult`, and `TreeSourceVertexResult<T>`. Remove tree annotations using graph-capable result types (or infer them). Tree callbacks reject `vertexId`, `dependsOn`, `dependsOnComplete`, and `satisfiesDependencies`, including own fields set to undefined, in DFS/BFS and DAG tree-source mode. Async adapters accept value-or-promise equivalents.

## Child hint command

Use `TraversalVisitorCommandName.REWRITE_CHILD_HINTS` with `{ newHints }`. `REWRITE_VERTEX_HINTS_ON_PRE_ORDER` remains a deprecated compatibility command with the same phase restrictions: DFS `PRE_ORDER`, BFS `LEVEL_ORDER`, or DAG `ON_READY`. Eager DAG discovery still rejects topology rewrites after validation. Resolved-tree structural child references are not hints.

## Convenience helpers

All six helpers accept a single options object, with the source exactly once and a phase-keyed map of callbacks:

```ts
// Before: traverseDepthFirst(tree, { postOrderVisitor: visit }, config);
const runner = traverseDepthFirst({
  ...config,
  traversableTree: tree,
  visitors: { [DepthFirstTraversalOrder.POST_ORDER]: visit },
});
// Before: traverseBreadthFirst(tree, visit, config);
const breadth = traverseBreadthFirst({
  ...config,
  traversableTree: tree,
  visitors: { [BreadthFirstTraversalOrder.LEVEL_ORDER]: visit },
});
// Before: traverseDag({ traversableGraph: graph }, { onReadyVisitor: work }, config);
const dag = traverseDag({
  ...config,
  traversableGraph: graph,
  visitors: { [DagTraversalOrder.ON_READY]: work },
});
```

Use the same options shapes with `traverseDepthFirstAsync`, `traverseBreadthFirstAsync`, and `traverseDagAsync`; they return promises of runners, while synchronous helpers return runners. DAG helpers accept exactly one `traversableGraph`/`traversableTree`; tree helpers use `traversableTree`. Omit `visitors` to just resolve the source. Helper and constructor/configuration maps share the visitor definitions and explicit groups described above; normalized full records remain accepted. Direct positional calls remain deprecated overloads with their established behavior; the canonical form has no second nested source/configuration location.

TypeScript may reject calling a generic union such as `const traverse = asyncMode ? traverseDagAsync : traverseDag`. Branch at the call site or select wrapper functions with concrete argument types. Direct canonical and positional calls retain phase inference and command safety.

## Vertex content and serialization

| Deprecated form               | Canonical form                                             |
| ----------------------------- | ---------------------------------------------------------- |
| `{ $d: data, $c: hints }`     | `{ $data: data, $childHints: hints }`                      |
| `vertex.$d`, `vertex.$c`      | `vertex.$data`, `vertex.$childHints` (or existing getters) |
| `vertex.clone({ $d: value })` | `vertex.clone({ $data: value })`                           |

`VertexContent<T>` now names the canonical shape. Code that annotated a legacy `{ $d, $c }` object as `VertexContent<T>` (or used `satisfies VertexContent<T>`) must rename its fields or use `LegacyVertexContent<T>`. APIs accepting either spelling should use `VertexContentInput<T>`. This is a compile-time annotation change even though legacy construction still works.

Legacy construction and property access remain accepted. Mixed shapes, including `$data` with `$c` or both `$data` and `$d`, reject instead of selecting a winner. `clone({ $data: undefined })` explicitly replaces data with `undefined`.

`Vertex` owns enumerable `$data` and `$childHints`; deprecated `$d`/`$c` are prototype getters. Consequently `Object.keys(vertex)`, `{ ...vertex }`, and JSON serialization emit canonical fields even when constructed with legacy content. Update serializers, snapshot expectations, and consumers of stored vertex-shaped JSON. Data follows ordinary JSON rules (for example, undefined data is omitted by JSON). Built-in object and resolved-tree source adapters emit canonical content. Resolved-tree structural child collections remain actual references and are not renamed to hints.

Package root, subpaths, namespaces, classes, commands, and the deprecated sentinel retain shared CJS/ESM runtime and declaration identity. Node 22.12.0+, Bun 1.4.4, and minimum TypeScript 4.7.4 remain verified compatibility targets. See [testing](testing.md) for the full checks.

## Independent execution selectors

Use `emitPhases` for event selection and `visitorPhases: 'all' | { include: [...] } | { exclude: [...] }` for callbacks. Empty include means no callbacks; empty exclude means all callbacks; empty emit means no events. Every execution request patches fields independently: omitted fields, `{}`, and no object retain previous effective settings. Caller arrays are copied on activation; already-admitted chains retain their snapshot until the boundary finishes.

Deprecated `iterateOver` aliases emission. A non-null legacy enable list wins over disable, including empty enable. Legacy fields patch against retained effective legacy fields, so an emission-only change preserves callbacks; disable-only updates cannot override a retained enable. Clearing enable with null activates the retained disable list. A canonical callback selector replaces that concern and clears dormant legacy fields. Equivalent canonical/legacy aliases for one concern in one request reject, even with undefined alias fields; unrelated concerns may mix. Invalid phases/malformed selectors reject before changing configuration. Inspection includes both views; project the desired fields when building another request.

## Stop reasons

Statuses remain compatible. `getStopReason()` and inspection `stopReason` return null for INITIAL/RUNNING, `prepared` for a successful DAG preview, `paused` for HALT/iterator close after admitted chains drain, `awaitingSettlement` for deferred quiescence, and `finished`/`failed` for terminal states. Successful settlement while halted preserves the preceding reason; resume clears it until the next stop. Exact failure values remain intact. Async execution/session surfaces expose the same contract.

## Typed mutation inputs and object hooks

Generic `MakeMutationCommandFunction<Output, RewriteInput = Output['VertexData']>` requires full replacement by default; name an explicit rewrite-input parameter for custom adapters. Object helpers use `TO_MutationPropertyPatch<Output>` (`Partial<Output['VertexData']>`), supporting typed key-only/value-only patches. Incorrect key/value types and incomplete generic replacements now fail compilation. Omit `rewrite` for no patch; present null/undefined/primitive rewrites throw TypeError. `{ rewrite: { value: undefined } }` sets undefined when allowed by the output type. Assembler errors retain exact identity.

Use `resolveVertexHook` in object adapters and `rewriteObject`: return `{ kind: 'useDefault' }`, tagged tree `found` replacement content, or `{ kind: 'omitted' }`. Null/undefined canonical results and graph metadata reject. The hook applies to child/hint resolution. Deprecated `makeVertexHook`/`returnMe` normalize to the same behavior; two active hooks reject. Undefined hooks and the old null-disabled hook do not conflict. Cycle checks and shallow identities remain unchanged.

## Safe queries and identity names

Use `runner.getResolvedTreeView()` or `ResolvedTree.asReadOnly()` for a stable live shallow `ResolvedTreeView<T>` facade. Its root/has/children/parent/path/context queries have readonly collection/context types; no mutators or raw records are exposed. Tree children arrays and context objects are now detached copies. Refs, hints and data keep shallow identity. Mutating a query result no longer edits topology. DAG tree-source mode returns its internal tree view; graph-source mode returns null. `getResolvedTree()` and raw records remain advanced editing APIs with caller-owned consistency; no durable/deep snapshot is added.

Use `CTTRef.getRefId()` for the generated reference UUID, `ResolvedGraph.getVertexId(ref)` for the arbitrary host ID, and `getVertexRefById(id)` for the reference lookup. These names also exist on graph snapshots/facades. Deprecated `getId`/`getIdOf`/`getVertexById` preserve identity as aliases. Host IDs, including explicit undefined, symbols and object references, are not coerced.

## Caller-specified graph identity types

Graph sources, DAG traversals, runners, configs and helpers now accept a trailing `ID = unknown` type parameter: `DagTraversal<Workflow, Workflow, TaskId>`. Graph views, snapshots, summary/progress and diagnostics preserve that type, as do lookup, dependency, completed-work and settlement inputs. DAG visitors append ID after their existing phase generic. Existing data and rewrite generic positions are unchanged.

When selecting a non-`unknown` ID domain, supply `vertexId` in every live tagged or legacy graph result, including prerequisite results; deliberate omissions may omit it. Tree-source DAG mode keeps `unknown` generated identities. Typed graph sources infer IDs through constructors/helpers; explicitly declare a union for mixed domains when needed. Leaving ID as `unknown` preserves the optional-ID fallback. Graph results with inherited `vertexId` fields now throw `TypeError` before fallback because TypeScript cannot enforce own-property ownership. Class adapters should return an explicit own field, for example `{ vertexId: instance.vertexId, vertexContent: instance.vertexContent }`, rather than relying on a prototype getter. Own getters and explicit own `vertexId: undefined` remain supported; absent IDs in default-`unknown` sources retain fallback. SameValueZero equality, ID values and tree-source behavior are unchanged.

Public graph views/snapshots/summaries hide the synthetic holder and expose ID. Advanced raw container `store`/`resolvedGraph` expose `ID | symbol` for internal bookkeeping; narrow that extra possibility. ID is independent of T/R data and hints. Selecting non-unknown ID excludes tree-source constructor/helper/configure inputs, because tree-generated IDs do not belong to a caller domain.

## Prepare, dispatch, and committed events

Call sync `runner.prepare()` or await async `runner.prepare()` to preview the fully discovered and validated closure exposed by roots, hints and prerequisite lookup with no visitors, execution events, new real W/C or deferred generations. Seeds remain accepted W. Fresh tree/graph runners without injected state/containers are required; even empty injected objects reject recoverably. Preparation forces effective eager discovery/topology freezing, stops `HALTED` / `prepared` even for empty/omitted roots, and is idempotent until execution starts. Run adopts discovery without replay. Concurrent/post-execution preparation rejects. Failed preparation retains the exact error. Paused async preparation waits for admitted discovery callbacks; another prepare continues, or run adopts it.

After `run()`, replace `deferredIds` plus optional generation lookups with `summary().deferredFrontier`: detached readonly `{ vertexId, generation }` records guarantee atomic live generations. Claim/dispatch in the host, retain the record with the attempt, validate and durably accept the result, then `settle(record.vertexId, outcome, record.generation)` and run again. The frontier is observational; `readyIds` continues to mean dependency eligibility.

DAG events add committed `kind: 'workCompleted'` / `'subgraphCompleted'` while retaining `order: ON_READY` / `ON_COMPLETE`, filters, order and timing. ON_READY visitors remain pre-work; deferred ON_READY events follow settlement. Seeds emit no synthetic work event. Dispatch from the frontier rather than completion events.

## Family-safe execution and cooperative pause

Use `SyncTraversalExecution<Phase, Event>` and `AsyncTraversalExecution<Phase, Event>` for reusable wrappers, preserving family enums and precise closeable generators. `TraversalExecutionState` supplies inspection/status/stop/pause without execution ownership. Historical `AsyncCoreExecution<Event, Phase = never>` now permits no explicit phase names when Phase is erased; add the intended family Phase instead of widening to string. `TraversalRunner` includes inspection and closeable iteration; historical iterable imports remain.

All six runners have `requestPause(): boolean`: true records a new request only while RUNNING. Other states and repeated requests return false, without acquiring an iterator, driving discovery, or throwing stored failures. A request is acknowledged at HALTED/paused after admitted chains drain; callbacks are not canceled. A suspended iterator may need next/return to drive the boundary. Resume preserves committed events/work and does not replay discovery.

## Truthful rewrite output and final results

`rewriteObject` retains six generic positions but defaults Out to unknown, including when no rewrite is supplied. Remove assumptions that reconstructed output preserves the input shape or prototype. Converter return types still infer. Use `rewriteObjectAs<Out>(input, options?)` as an explicit assertion through the named root, rewrite namespace or subpath export; it validates no schema and does not narrow option property values from unknown.

`outputObject` remains the initial converted compatibility snapshot. After a halt, resume `result.traversalRunner.run()` and call `result.getOutput()`: it requires FINISHED, converts the final root with the original hook, and caches the first successful result. Initially finished results reuse the snapshot. Exact conversion throws are not cached as successful results and may be retried. Null/deleted roots remain supported. `getOutput` does not resume or make output deeply immutable.

Remove `traversableTree` from helper options: the helper owns its source. Inline/pretyped options reject statically, and JavaScript presence (including undefined) rejects before all callbacks. Use a traversal directly for a custom source.

## Labelled dependency diagnostics

`dependencyEdges` contains original milestone constraints, independent of completed seeds and including missing endpoints. `from` waits for `to`; reasons are workDependency (W→W), completionDependency (W→C), ownWork (C→own W), and structuralChild (parent C→child C). Stable discovery order is followed by work dependencies, completion dependencies, own work and structural children. `dependencyCycles` is SCC membership, not an ordered witness. Detached edge/endpoint wrappers preserve opaque ID identity and do not freeze caller objects. Historical manual error constructor input may omit edges and gets []; engine output always includes them.

## Visitor query ownership

All six `listVisitorsFor` methods now return mutable detached arrays and copied records. Editing a query does not configure the builder, a future runner, or earlier snapshots. Submit updates through set/add/configure. Callback closures are shared; frozen group metadata/identity remains shared for list/set round trips. Advanced raw fields have no new ownership guarantee.
