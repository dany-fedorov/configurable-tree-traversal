# Migrate to the uniform API

[Documentation map](index.md) · [Agent workflows](agent-workflows.md) · [API reference](reference.md)

This guide covers API changes from **0.11.0**, including changed defaults, removed forms, and migration guidance. For every renamed symbol and the restricted import surface, see [API naming migration](migration-api-clarity.md).

CTT still owns generic discovery, dependencies, callback scheduling, traversal lifecycle, and in-memory progress. The host owns agent execution, business outcomes, retries, claims, artifacts, and durable storage. Data and hints remain opaque values.

## Collection sources, prepared definitions, and sessions

These additions compose with existing DAG constructors and runners; custom adapters and low-level preparation/settlement remain available.

| Existing integration                                                    | Optional simpler surface                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hand-built synthetic catalog holder with `resolveRoot` / `resolveChild` | `materializeDagInputFromRecords(items, { id, dependsOnWork?, children?, dependsOnSubgraphCompletion? })`; use `materializeDagInputFromRoots` when children are records |
| Re-discovering the same source for each runner                          | `prepareDag(source)` / `await prepareDagAsync(source)` once, then independent `dag.createRunner()` or `await dag.createAsyncRunner()`                                    |
| External runner plus captured `{ vertexId, generation }`                | `createDagWorkSession(runner)` / `createAsyncDagWorkSession(runner)`, or prepared `createWorkSession()` / `await createAsyncWorkSession()`                               |
| `run()` → summary frontier → `settle()` → `run()`                       | `advance()` → frontier ticket → `completeWork(ticket)` → `advance()`                                                                                                     |
| Callback-local data filtering                                           | `filterDagDataVisitor(guard, (data, context) => ...)` or `filterAsyncDagDataVisitor`; the callback receives narrowed data                                                |

The former collection selector names `dependencies` and `completionDependencies` are replaced by `dependsOnWork` and `dependsOnSubgraphCompletion`. All four adapters throw `TypeError` for the retired keys before input/selector callbacks, including inherited keys and keys present with `undefined`, to prevent silently dropping dependency edges. Task-data properties remain opaque. Walking relation selections and definition-diff aspects use `subgraphCompletionDependencies`; diagnostic constraints use `DagWaitEdge` with `waiter` and `prerequisite` milestones, and `dependencyCycleComponents` reports SCC membership.

Collection adapters copy membership and edge lists while retaining shallow item/ID identity. Async DAG input helpers materialize iterable/async-iterable inputs and selectors into envelopes containing reusable synchronous discovery sources. `materializeDagInputFromRecords` children are catalog IDs; `materializeDagInputFromRoots` children are records, with shared references allowed. Missing child IDs and conflicting record identities reject.

Preparation returns `{ kind: 'valid', dag }` or `{ kind: 'invalid', issues }`, sharing `PrepareDagResult` with definition preparation, composition and revision. Engine dependency validation failures contain one `{ kind: 'milestone', diagnostics }` issue, with no top-level `diagnostics` alias. Adapter-thrown errors retain their identity, even a caller-thrown stall error. Prepared replay normalizes hints to IDs, owns topology, and invokes no original adapters; original hint/context snapshots are not preserved. Async runner and session factories return promises. Runner options permit visitors, completed-work seeds, and completion policy; session options permit only `completedWork` plus async `concurrency`. Topology/source/state overrides reject, including own fields with `undefined`.

Coordination requires external settlement. Frontier tickets are nominal readonly local capabilities, bound to their issuing facade and generation. First acceptance returns `{ kind: 'accepted' }`, identical reports return `{ kind: 'alreadyAccepted' }`, and conflicting/foreign/stale tickets reject. `failTraversal(ticket, error)` is fatal, preserving exact errors. Reconstruct from accepted completion facts after restart; copied or serialized tickets cannot settle work. See [source and prepared contracts](reference.md#collection-and-forest-sources) and the [ticket contract](reference.md#ticket-coordination).

## Materialized definitions, fragments, inspection, and revisions

These optional APIs extend prepared DAGs. `prepared.definition` retains entry mode, ordered discovery slots and omissions; `.vertices` is a live-child convenience projection and rebuilding from it loses those facts. Use `definition.vertices` when authoring revisions. Author values with `defineDag`, validate with `prepareDagDefinition`, or reuse shapes through `defineDagFragment`, `instantiateDagFragment` and `composeDag`. Structural child links and W/C wires remain separate.

Use `inspectDagMilestones(runner)` for detached milestone navigation and explanations. Use `reviseDag(prepared, operations)` for ordered atomic edits: success returns a fresh prepared DAG plus a shallow `diffDagDefinitions` result; graph invalidity returns issues. Full replacement records explicitly declare slots and both dependency lists. Removal requires explicit repair of dangling references. Programmer errors throw.

Create a new session from the revised DAG. Old tickets, generations, callbacks and completion facts stay in the old execution. Select valid `completedWork` facts explicitly for the new definition; diffs do not infer artifact invalidation. See [definition contracts](reference.md#materialized-dag-definitions), [fragment contracts](reference.md#dag-fragments-and-composition), [inspection](reference.md#dag-dependency-queries-and-explanations), and [revisions](reference.md#validated-dag-revisions).

## General graph walking and common inspection

The walking family is additive: use `GraphWalk`, `AsyncGraphWalk`, `walkGraph` or `walkGraphAsync` with a single options object and a walking `source`. Root, `graphWalk` namespace and `traversals/graph-walk` subpath exports share identity. Existing tree/DAG source types and event timing are unchanged. Explicit target wrappers support ID-only or inline-hydrated discovery; event records carry typed vertices, edges and prefixes rather than tree `Vertex` instances. Use explicit adapters for finite catalogs or selected `DagDefinition` relations.

Defaults are BFS, unique vertices (`once`), vertex-only emission and serial execution. `simplePaths`/`walks` require depth or candidate-read-attempt bounds; always inspect `summary().outcome`. A supplied `configure` limits record replaces the old record, with merged validation before mutation. The first accepted resolution wins even after omission; this intentionally differs from DAG milestone omission. Walking explicit emission selectors narrow at delivery, including buffered records, without changing tree/DAG admission semantics. Consumer iterator return pauses; walking runner close is terminal disposal. Closing a failed walker rethrows its exact error without repeated cleanup; overlapping async closes share a promise. See the [full walking contract](reference.md#general-graph-walking).

The shared execution interfaces default inspection to `ExecutionInspection`. `TraversalExecutionState` accepts all families; `SyncTraversalExecution<Phase, Event>` and its async counterpart preserve each family's phase and event contracts. Choose `TreeDagExecutionInspection` for tree/DAG detail or `GraphWalkInspection` for walking detail. The emitted-kind default is `EmissionKind<Phase>`, so DAG emission selects `workCompleted`/`subgraphCompleted` while callbacks select readiness phases. No common source interface, DAG settlement, concurrency option or durable checkpoint is added to walking.

## Configuration and diagnostic follow-up

Walking predicates `shouldFollowEdge` and `shouldExpandVertex` now accept `null` to restore the absent predicate, initially or in `configure()`. Omitted/undefined patches retain an existing predicate. Limits still replace; visitor/phase records still patch field-wise. These optional predicates and DAG optional source placeholders explicitly accept `undefined` under `exactOptionalPropertyTypes`.

DAG configure source checks now match construction: ignore inherited keys and own undefined keys, replace an own defined same-family source, and reject an own defined opposite-family source atomically. This relaxes a configure guard present in published 0.11.0, fixing placeholder/inheritance handling. Exactly one own defined source remains required at construction; typed-ID tree restrictions remain. Builders affect future runners only. See the [configuration table](reference.md#configuration-patches).

`defineDagFragment` and definition validation during instantiation now throw `DagFragmentValidationError<ID = unknown> extends TypeError` with structured `issues`; successful values remain direct fragments/instances. Malformed shapes, port errors and mapping collisions remain ordinary `TypeError`s, and caller exceptions propagate exactly. `DagTraversalStallError<ID = unknown>` supports explicit typed diagnostic annotations and construction. Neither error infers ID types from arbitrary catches. Both DAG runner families now expose synchronous `inspectMilestones()` alongside the existing free function and session method.

Empty tree builder, runner, iterable and source bases are removed; use concrete builders, execution capabilities, standard `Iterable` and structural `TreeSource` implementations. The common `ExecutionInspection.kind` remains an open string for structural implementations. Tree/DAG iterators may deliver previously buffered events on resume even when the new selector excludes their phase, so their return types remain broad. Walking selects at delivery and narrows accordingly.

Built-in object and resolved-tree adapter methods return tagged `found`/`omitted` results directly. Custom sources and object hooks use tagged results; see [abstract trees](reference.md#abstract-trees). Family-specific root flags and omission-preserving definition slots keep their distinct meanings. For choosing preparation versus execution and dispatch, see the [workflow decision table](agent-workflows.md#discover-the-graph).

## Typed DAG event identities

`DagEvent<T, ID = unknown>` now requires `vertexId: ID`; sync and async iterators preserve the runner's ID generic. `kind: 'workCompleted'` reports committed W and `kind: 'subgraphCompleted'` reports committed C; events have no `order` or callback `phase` field. Code constructing event fixtures must supply an ID and event kind. Callbacks use `DagVisitorPhase` independently. Existing event timing, ordering, and seeded/settled completion behavior remain unchanged. Dispatch from `advance().workTickets` tickets or an enabled pre-work `ON_WORK_READY` visitor; emitted `workCompleted` events are committed observations, including when deferred work settles.

## Root dependencies

Ordinary graph roots now honor both work and completion prerequisites, consistently across lazy/eager discovery, seeds, and prerequisite lookup. The old lazy-root behavior depended on unrelated options such as `completedWork`, `resolvePrerequisite`, or a non-undefined completion declaration.

```ts
const traversal = new DagTraversal({
  traversableGraph: graph,
  rootWorkDependencies: 'honor', // New default: root dependsOnWork applies.
});
// To preserve ignoring the root's W declarations:
const legacyRootPolicy = new DagTraversal({
  traversableGraph: graph,
  rootWorkDependencies: 'ignore', // Root dependsOnSubgraphCompletion still applies.
});
```

Synthetic catalog roots remain bookkeeping with no work dependencies. Tree traversal semantics remain unchanged.

## Structural parent dependencies

Graph sources default to `omittedWorkDependencies: 'none'`. Omitting `dependsOnWork` means no W prerequisites. Previously, an ordinary discovered child inherited its discovery parent's W when the list was omitted.

Choose explicitly:

- Declare `dependsOnWork: [parentId]` for a parent W requirement, or another explicit ID list for independent workflow relationships.
- Declare `dependsOnWork: []` for no work prerequisites under either policy.
- Set `omittedWorkDependencies: 'discoveryParentWork'` to restore inheritance when `dependsOnWork` is omitted.

Explicit lists always win. `dependsOnSubgraphCompletion` adds C gates independently; it does not replace W declarations. Roots and detached prerequisites have no discovery parent, and synthetic catalog parents never gate work. Tree sources retain their structural execution order and parent dependencies. Structural child edges still govern paths and subtree completion, independently of work edges.

## Exclusive deferral command

Replace the removed exported symbol with a command result:

```ts
// Before: import { DEFER_READY } ...; return DEFER_READY;
import { TraversalVisitorCommandName as Command } from 'configurable-tree-traversal';
traversal.addVisitorFor(DagVisitorPhase.ON_WORK_READY, () => ({
  commands: [{ commandName: Command.DEFER_WORK_COMPLETION }],
}));
```

Deferral is valid only in DAG `ON_WORK_READY` and must be the **only command in its result**. Mixing it with `NOOP`, a rewrite, halt, or any other command rejects before applying that result's commands. The retired `DEFER_READY` sentinel is removed.

Deferral ends the visitor chain, discards uncommitted group commands, skips remaining visitors, leaves work incomplete, and releases callback capacity. Already committed changes and external effects remain. `PAUSE_TRAVERSAL` instead retains its runner-wide resumable behavior. The default `workCompletion: 'visitorReturn'` completes W on normal `ON_WORK_READY` chain return. Prefer `workCompletion: 'externalSettlement'` for external work: the chain's commands commit, then W remains incomplete with a guarded deferred generation, even for zero or filtered callbacks. Explicit DEFER remains useful for ending a chain early and skipping later callbacks. Synthetic roots and `completedWork` seeds do not require new settlement. ON_SUBGRAPH_READY remains automatic. Dispatch from the deferred summary frontier (or an actual enabled callback); deferred `workCompleted` events arrive only on settlement. Generations remain runner-local symbols, not durable claims.

## Command batching

| Removed registration option                                           | Canonical option                                  |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL` | `commandCommitMode: 'afterEachVisitor'` (default) |
| `resolutionStyle: TraversalVisitorFunctionResolutionStyle.CONCURRENT` | `commandCommitMode: 'afterGroup'`                 |

Flat callbacks now run by descending priority, then registration order, **before** batching is applied. Adjacent `afterGroup` entries buffer until the next `afterEachVisitor` or phase end. A priority-1000 `afterEachVisitor` runs before a priority-1 `afterGroup`; changing commit mode alone cannot reorder callbacks. This intentionally corrects historical group-first ordering. Express the previous desired order with explicit ordered groups below. Async concurrency remains independent. The `resolutionStyle` key rejects, including a present undefined value.

## Shared visitor definitions and ordered groups

The same phase input configures a class, `configure`, `setVisitorsFor`, or a helper: callback, `{ visitor, priority?, commandCommitMode? }`, readonly flat definitions, or `{ groups: [...] }`. Caller definitions have no `addedIndex` policy. Query records describe assigned indexes; list/set round trips retain callbacks and group metadata while assigning fresh indexes. This standalone example uses one definition in both entry points and verifies an explicit ordering boundary:

<!-- standalone -->

```ts
import {
  DepthFirstTreeTraversal,
  DepthFirstPhase as Order,
  ObjectTreeSource,
  traverseTreeDepthFirst,
  type VisitorPhaseInput,
  type TreeVisitor,
  type ObjectTreeVertexTypes,
} from 'configurable-tree-traversal';

type Tree = ObjectTreeVertexTypes<string, number>;
const source = new ObjectTreeSource<number, string, number>(1);
const calls: string[] = [];
const definition: VisitorPhaseInput<TreeVisitor<Order.POST_ORDER, Tree, Tree>> =
  {
    groups: [
      {
        commandCommitMode: 'afterGroup',
        visitors: [
          {
            visitor: () => {
              calls.push('first');
            },
            priority: 1,
          },
        ],
      },
      {
        visitors: [
          {
            visitor: () => {
              calls.push('second');
            },
            priority: 1000,
          },
        ],
      },
    ],
  };
const traversal = new DepthFirstTreeTraversal({
  traversableTree: source,
  visitors: { [Order.POST_ORDER]: definition },
});
traversal.setVisitorsFor(
  Order.POST_ORDER,
  traversal.listVisitorsFor(Order.POST_ORDER),
);
traversal.createRunner().run();
traverseTreeDepthFirst({
  traversableTree: source,
  visitors: { [Order.POST_ORDER]: definition },
});
if (calls.join(',') !== 'first,second,first,second')
  throw new Error('Unexpected group order');
```

Explicit groups run in array order, sorting priority only inside a group. Policy has one owner: a member's `commandCommitMode` or `resolutionStyle` is invalid, even if undefined. Empty groups validate then are inert, including append and list/set; they create no ordering barrier. `addVisitorGroupFor` appends a group. Individual `addVisitorFor` appends to a final implicit flat group. Full normalized list/set arrays preserve group metadata; when regrouping, map records to `{ visitor, priority }` and choose the new group policy. Callbacks see previously committed chain state; callbacks in an uncommitted batch share that prior state. `PAUSE_TRAVERSAL` preserves continuation; explicit DEFER discards only its current uncommitted batch. Concrete sync/async receivers retain inference; narrow a mixed traversal receiver union before inline callback registration. Standalone mode strings need `as const` or a public input annotation on TypeScript 4.7.

## Phase-aware visitors

Registration keys, configuration visitor maps, helper maps, and `options.phase` now infer the actual phase. Deferral is restricted to `ON_WORK_READY`; hint rewrites are restricted to `PRE_ORDER`, `LEVEL_ORDER`, and `ON_WORK_READY`. Runtime validation remains for JavaScript/unsafe casts, including eager-discovery topology restrictions.

General `TreeVisitor` and `DagVisitor` aliases remain usable for callbacks returning common commands, across add/configure/set/helper entry points. Give phase-specific callbacks an appropriate phase parameter instead of widening a forbidden command to the whole traversal order union.

The callback context's `options.registration` is now a readonly, phase-neutral `VisitorRegistrationMetadata` view: `addedIndex`, `priority`, `commandCommitMode`, and optional `visitorGroup`. Its supported TypeScript contract has no executable `.visitor`. If you previously invoked `options.registration.visitor`, retain your own callback reference or retrieve full typed records using `traversal.listVisitorsFor(order)`. Configuration, listing, and replacement APIs still expose full callback records. The runtime object may retain `.visitor` for existing JavaScript callers.

## Completion vocabulary

| Previous form                                  | Canonical form                                               |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Progress `work: 'succeeded'`                   | `work: 'completed'`                                          |
| `settle(id, { ok: true }, generation)`         | `settle(id, { kind: 'workCompleted' }, generation)`          |
| `settle(id, { ok: false, error }, generation)` | `settle(id, { kind: 'traversalFailed', error }, generation)` |

Boolean settlement forms are removed; the old progress string is replaced. `workCompleted`, `completedWorkIds`, and seed `completedWork` keep consistent completion terminology. Tagged settlement outcomes retain generation checks and replay equality. Fatal errors preserve exact values, including `null` and `undefined`, and async wakeup behavior is unchanged.

`workCompleted` means the host accepted work as complete for traversal. A business rejection can still complete a review task. `traversalFailed` fails the whole runner; it does not request per-item retry. Keep retryable work deferred and implement attempts in the host. Generations are runner-local symbols; reconstruct from host-accepted `completedWork` facts after restart.

## Source resolution

The table below applies to graph sources and prerequisite lookup. Tree sources use `{ kind: 'omitted' }` without a milestone acknowledgement, including when a DAG runner consumes a tree adapter. Tree callbacks and object hooks reject `satisfiesDependencies`, even an own field set to undefined; graph/prerequisite omissions require literal `true`, never false or undefined. Untagged `{ vertexContent: null }` inputs reject.

| Removed source result                                                        | Canonical source result                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `{ vertexContent, vertexId?, dependsOnWork?, dependsOnSubgraphCompletion? }` | `{ kind: 'found', vertex: { vertexContent, vertexId?, dependsOnWork?, dependsOnSubgraphCompletion? } }` |
| `{ vertexContent: null, vertexId? }`                                         | `{ kind: 'omitted', vertexId?, satisfiesDependencies: true }`                                           |
| Lookup `undefined`                                                           | `{ kind: 'missing' }`                                                                                   |

`found` contains non-null content. `omitted` deliberately excludes a vertex and satisfies its W and C prerequisites. `missing` cannot satisfy prerequisites and is valid only from `resolvePrerequisite`; it is invalid from `resolveRoot`/`resolveChild`. Bare `null` and `undefined` are invalid everywhere. Untagged results and bare lookup `undefined` reject. These rules add no silent omission path.

<!-- standalone -->

```ts
import type {
  DagPrerequisiteResolution,
  VertexTypes,
} from 'configurable-tree-traversal';
type Tasks = VertexTypes<string, string>;
function resolvePrerequisite(id: unknown): DagPrerequisiteResolution<Tasks> {
  if (id !== 'build') return { kind: 'missing' };
  return {
    kind: 'found',
    vertex: {
      vertexId: id,
      dependsOnWork: [],
      vertexContent: { $data: id, $childHints: [] },
    },
  };
}
```

Own-property ID presence is significant: `{ vertexId: undefined }` supplies the real `undefined` ID. Omitting the field during prerequisite lookup inherits the requested ID. Explicit IDs must match using SameValueZero; symbols and object references retain identity. Graph roots/hints accept `DagVertexResolution`; prerequisite lookup accepts `DagPrerequisiteResolution`, including `PrerequisiteMissing`. Tree adapters use `TreeVertexFound<T>`, `TreeVertexOmitted`, and `TreeVertexResolution<T>`. Remove tree annotations using graph-capable result types (or infer them). Tree callbacks reject `vertexId`, `dependsOnWork`, `dependsOnSubgraphCompletion`, and `satisfiesDependencies`, including own fields set to undefined, in DFS/BFS and DAG tree-source mode. Async adapters accept value-or-promise equivalents.

## Child hint command

Use `TraversalVisitorCommandName.REWRITE_CHILD_HINTS` with `{ newHints }`. `REWRITE_VERTEX_HINTS_ON_PRE_ORDER` is removed. The canonical command supports DFS `PRE_ORDER`, BFS `LEVEL_ORDER`, or DAG `ON_WORK_READY`. Eager DAG discovery still rejects topology rewrites after validation. Resolved-tree structural child references are not hints.

## Convenience helpers

All six helpers accept a single options object, with the source exactly once and a phase-keyed map of callbacks:

```ts
// Before: traverseTreeDepthFirst(tree, { postOrderVisitor: visit }, config);
const runner = traverseTreeDepthFirst({
  ...config,
  traversableTree: tree,
  visitors: { [DepthFirstPhase.POST_ORDER]: visit },
});
// Before: traverseTreeBreadthFirst(tree, visit, config);
const breadth = traverseTreeBreadthFirst({
  ...config,
  traversableTree: tree,
  visitors: { [BreadthFirstPhase.LEVEL_ORDER]: visit },
});
// Before: traverseDag({ traversableGraph: graph }, { onReadyVisitor: work }, config);
const dag = traverseDag({
  ...config,
  traversableGraph: graph,
  visitors: { [DagVisitorPhase.ON_WORK_READY]: work },
});
```

Use the same options shapes with `traverseTreeDepthFirstAsync`, `traverseTreeBreadthFirstAsync`, and `traverseDagAsync`; they return promises of runners, while synchronous helpers return runners. DAG helpers accept exactly one `traversableGraph`/`traversableTree`; tree helpers use `traversableTree`. Omit `visitors` to just resolve the source. Helper and constructor/configuration maps share the visitor definitions and explicit groups described above; normalized full records remain accepted. Positional calls reject; each helper accepts one options object.

TypeScript may reject calling a generic union such as `const traverse = asyncMode ? traverseDagAsync : traverseDag`. Branch at the call site or select wrapper functions with concrete argument types. Options-object calls retain phase inference and command safety.

## Vertex content and serialization

| Removed form                  | Canonical form                                             |
| ----------------------------- | ---------------------------------------------------------- |
| `{ $d: data, $c: hints }`     | `{ $data: data, $childHints: hints }`                      |
| `vertex.$d`, `vertex.$c`      | `vertex.$data`, `vertex.$childHints` (or existing getters) |
| `vertex.clone({ $d: value })` | `vertex.clone({ $data: value })`                           |

`VertexContent<T>` now names the canonical shape. Rename legacy `{ $d, $c }` inputs to `$data` / `$childHints`. `VertexContentInput<T>` and `VertexCloneContent<T>` accept only canonical fields; `LegacyVertexContent<T>` is removed.

Legacy construction and property access are removed. Mixed shapes, including `$data` with `$c` or both `$data` and `$d`, reject instead of selecting a winner. `clone({ $data: undefined })` explicitly replaces data with `undefined`.

`Vertex` owns enumerable `$data` and `$childHints`; `$d`/`$c` accessors are removed. Consequently `Object.keys(vertex)`, `{ ...vertex }`, and JSON serialization emit canonical fields. Update serializers, snapshot expectations, and consumers of stored vertex-shaped JSON. Data follows ordinary JSON rules (for example, undefined data is omitted by JSON). Built-in object and resolved-tree source adapters emit canonical content. Resolved-tree structural child collections remain actual references and are not renamed to hints.

Package root, subpaths, namespaces, classes and commands retain shared CJS/ESM runtime and declaration identity. Node 22.12.0+, Bun 1.4.4, and minimum TypeScript 4.7.4 remain verified compatibility targets. See [testing](testing.md) for the full checks.

## Independent execution selectors

Use `emitEvents` for event selection and `visitorPhases: 'all' | { include: [...] } | { exclude: [...] }` for callbacks. Empty include means no callbacks; empty exclude means all callbacks; empty emit means no events. Every execution request patches fields independently: omitted fields, `{}`, and no object retain previous effective settings. Caller arrays are copied on activation; already-admitted chains retain their snapshot until the boundary finishes.

Retired `iterateOver`, `enableVisitorFunctionsFor`, and `disableVisitorFunctionsFor` keys reject before configuration changes. Canonical emission-only patches retain callback selection, and callback-only patches retain emission selection. A supplied visitor selector replaces the prior selection. Inspection exposes canonical `emitEvents` and `visitorPhases` under `executionOptions`.

## Stop reasons

Statuses remain compatible. `getStopReason()` and inspection `stopReason` return null for INITIAL/RUNNING, `prepared` for a successful DAG preview, `paused` for `PAUSE_TRAVERSAL`/iterator return after admitted chains drain, `awaitingSettlement` for deferred quiescence, and `finished`/`failed` for terminal states. Successful settlement while halted preserves the preceding reason; resume clears it until the next stop. Exact failure values remain intact. Async execution/session surfaces expose the same contract.

## Typed mutation inputs and object hooks

Generic `MutationCommandBuilder<Output, RewriteInput = Output['VertexData']>` requires full replacement by default; name an explicit rewrite-input parameter for custom adapters. Object helpers use `ObjectPropertyPatch<Output>` (`Partial<Pick<Output['VertexData'], 'key' | 'value'>>`), supporting typed key-only/value-only patches. Incorrect key/value types and incomplete generic replacements now fail compilation. Omit `rewrite` for no patch; present null/undefined/primitive rewrites throw TypeError. `{ rewrite: { value: undefined } }` sets undefined when allowed by the output type. Unknown own string/symbol patch fields throw TypeError; arbitrary metadata is retained. Use `REWRITE_VERTEX_DATA` for complete payload replacement. Assembler errors retain exact identity.

Use `resolveVertexHook` in object adapters and `rewriteObject`: return `{ kind: 'useDefault' }`, tagged tree `found` replacement content, or `{ kind: 'omitted' }`. Null/undefined canonical results and graph metadata reject. The hook applies to child/hint resolution. `makeVertexHook` rejects by presence, including undefined/null; `returnMe` hook results reject. Cycle checks and shallow identities remain unchanged.

## Safe queries and identity names

Use `runner.getResolvedTreeView()` or `ResolvedTreeStore.asReadOnly()` for a stable live shallow `ResolvedTreeView<T>` facade. Its root/has/children/parent/path/context queries have readonly collection/context types; no mutators or raw records are exposed. Tree children arrays and context objects are now detached copies. Refs, hints and data keep shallow identity. Mutating a query result no longer edits topology. DAG tree-source mode returns its internal tree view; graph-source mode returns null. `getResolvedTreeStore()` and raw records remain advanced editing APIs with caller-owned consistency; no durable/deep snapshot is added.

Use `MutableRef.getRefId()` for the generated reference UUID, `ResolvedGraph.getVertexId(ref)` for the arbitrary host ID, and `getVertexRefById(id)` for the reference lookup. These names also exist on live and original graph views. Retired `getId`/`getIdOf`/`getVertexById` aliases are removed. Host IDs, including explicit undefined, symbols and object references, are not coerced.

## Caller-specified graph identity types

Graph sources, DAG traversals, runners, configs and helpers now accept a trailing `ID = unknown` type parameter: `DagTraversal<Workflow, Workflow, TaskId>`. Graph views, milestone snapshots, summary/progress and diagnostics preserve that type, as do lookup, dependency, completed-work and settlement inputs. DAG visitors append ID after their existing phase generic. Existing data and rewrite generic positions are unchanged.

When selecting a non-`unknown` ID domain, supply `vertexId` in every live tagged graph result, including prerequisite results; deliberate omissions may omit it. Tree-source DAG mode keeps `unknown` generated identities. Typed graph sources infer IDs through constructors/helpers; explicitly declare a union for mixed domains when needed. Leaving ID as `unknown` preserves the optional-ID fallback. Graph results with inherited `vertexId` fields now throw `TypeError` before fallback because TypeScript cannot enforce own-property ownership. Class adapters should return an explicit own field, for example `{ kind: 'found', vertex: { vertexId: instance.vertexId, vertexContent: instance.vertexContent } }`, rather than relying on a prototype getter. Own getters and explicit own `vertexId: undefined` remain supported; absent IDs in default-`unknown` sources retain fallback. SameValueZero equality, ID values and tree-source behavior are unchanged.

Public graph views, milestone snapshots and summaries hide the synthetic holder and expose ID. Raw runner containers and their `ID | symbol` bookkeeping are private. ID is independent of T/R data and hints. Selecting non-unknown ID excludes tree-source constructor/helper/configure inputs, because tree-generated IDs do not belong to a caller domain.

## Prepare, dispatch, and committed events

Call sync `runner.prepare()` or await async `runner.prepare()` to preview the fully discovered and validated closure exposed by roots, hints and prerequisite lookup with no visitors, execution events, new real W/C or deferred generations. Seeds remain accepted W. Fresh tree/graph runners are required; raw state/container injection is not a public constructor capability. Preparation forces effective eager discovery/topology freezing, stops `HALTED` / `prepared` even for empty/omitted roots, and is idempotent until execution starts. Run adopts discovery without replay. Concurrent/post-execution preparation rejects. Failed preparation retains the exact error. Paused async preparation waits for admitted discovery callbacks; another prepare continues, or run adopts it.

After `run()`, replace `deferredWorkIds` plus optional generation lookups with `summary().awaitingSettlement`: detached readonly `{ vertexId, generation }` records guarantee atomic live generations. Claim/dispatch in the host, retain the record with the attempt, validate and durably accept the result, then `settle(record.vertexId, outcome, record.generation)` and run again. The frontier is observational; `readyOrDeferredIds` includes ready and deferred work, excluding visiting and completed work. `deferredWorkIds` retains accepted outcomes only while W remains uncommitted; `awaitingSettlement` excludes every accepted outcome. Counts overlap. `activeVisitorVertexIds` tracks visitor chains, including completion chains, and the work state is `visiting`.

DAG events add committed `kind: 'workCompleted'` / `'subgraphCompleted'` with no callback phase metadata. Select emitted kinds with `emitEvents` and readiness callbacks with `visitorPhases`; event ordering and commit timing are unchanged. ON_WORK_READY visitors remain pre-work; deferred `workCompleted` events follow successful settlement. Seeds emit no synthetic work event. Dispatch from the frontier rather than completion events.

## Family-safe execution and cooperative pause

Use `SyncTraversalExecution<Phase, Event>` and `AsyncTraversalExecution<Phase, Event>` for reusable wrappers, preserving family enums and precise closeable generators. `TraversalExecutionState` supplies inspection/status/stop/pause without execution ownership. The redundant `AsyncCoreExecution`, `TreeTraversal`, `TreeTraversalRunner`, `TreeTraversalIterable` and `AbstractTreeSource` exports are removed. Keep `TreeTraversalEvent` for tree events. Use `TreeVisitor`, `AsyncTreeVisitor` and `TreeVisitorRecord` for tree-only callbacks and records.

All eight runner interfaces have `requestPause(): boolean`: true records a new request only while RUNNING. Other states and repeated requests return false, without acquiring an iterator, driving discovery, or throwing stored failures. A request is acknowledged at HALTED/paused after admitted chains drain; callbacks are not canceled. A suspended iterator may need next/return to drive the boundary. Resume preserves committed events/work and does not replay discovery.

## Truthful rewrite output and final results

`rewriteObject` retains six generic positions but defaults Out to unknown, including when no rewrite is supplied. Remove assumptions that reconstructed output preserves the input shape or prototype. Converter return types still infer. Use `rewriteObjectAs<Out>(input, options?)` as an explicit assertion through the named root, `objectRewrite` namespace or subpath export; it validates no schema and does not narrow option property values from unknown.

Rename result `outputObject` to `outputAtReturn`, the converted output captured at helper return; it can be partial and does not update after resumption. After a halt, resume `result.traversalRunner.run()` and call `result.getOutput()`: it requires FINISHED, converts the final root with the original hook, and caches the first successful result. Initially finished results reuse the snapshot. Exact conversion throws are not cached as successful results and may be retried. Null/deleted roots remain supported. `getOutput` does not resume or make output deeply immutable.

Remove `traversableTree` from helper options: the helper owns its source. Inline/pretyped options reject statically, and JavaScript presence (including undefined) rejects before all callbacks. Use a traversal directly for a custom source.

## Labelled dependency diagnostics

`dependencyEdges` contains original milestone constraints, independent of completed seeds and including missing endpoints. `waiter` waits for `prerequisite`; reasons are workDependency (W→W), subgraphCompletionDependency (W→C), ownWork (C→own W), and structuralChild (parent C→child C). Stable discovery order is followed by work dependencies, completion dependencies, own work and structural children. `dependencyCycleComponents` is SCC membership, not an ordered witness. Detached edge/endpoint wrappers preserve opaque ID identity and do not freeze caller objects. Historical manual error constructor input may omit edges and gets []; engine output always includes them.

## Visitor query ownership

All eight builders’ `listVisitorsFor` methods now return mutable detached arrays and copied records. Editing a query does not configure the builder, a future runner, or earlier snapshots. Submit updates through set/add/configure. Callback closures are shared; frozen group metadata/identity remains shared for list/set round trips. Runner registration/state fields are private; use registration methods and supported inspection.

## Execution and callback vocabulary

Use `runner.iterateEvents()` for event iteration and `TraversalVisitorCommandName.PAUSE_TRAVERSAL` for a command-boundary pause. `requestPause()` still drains admitted callbacks cooperatively; inspection exposes `pauseRequested`. `HALTED`, `isHalted()`, `run()` and explicit stop reasons retain their meanings.

`TraversalExecutionOptions<VisitorPhase, EmittedKind = EmissionKind<VisitorPhase>>` separates callback eligibility from emitted observations. DAG emission accepts `emitEvents: ['workCompleted', 'subgraphCompleted']`; DAG visitors use `DagVisitorPhase.ON_WORK_READY` and `ON_SUBGRAPH_READY`. Tree enums are `DepthFirstPhase` and `BreadthFirstPhase`. Walking emission accepts literal `'vertex'`, `'edge'` and `'path'` strings and narrows event unions. Retired `iterateOver` rejects; use `emitEvents`. `emitPhases` is removed and rejects at runtime.

Callbacks receive `phase`, `visitorIndex`, `visitorChainState`, `registration`, `phaseVisitIndex`, and `previousPhaseVertexRef` where applicable. Tree event records expose `phase`; committed DAG records expose `kind` without callback phase metadata. Shared sync/async context types are `TreeVisitorContext`, `DagVisitorContext`, `TreeChildResolutionContext`, and `DagChildResolutionContext`.

### Walking predicates, budgets, and coordinates

Walking options use `shouldFollowEdge` / `shouldExpandVertex`, typed as `GraphWalkEdgePredicate` / `GraphWalkExpansionPredicate` (and `Async` counterparts). The previous predicate option and type names are removed.

Walking limits now use `maxCandidateReadAttempts` and `maxAdmittedTargets`; limited outcomes use the same reason literals. Route enumeration requires `maxDepth` or `maxCandidateReadAttempts`. Summary counts are `candidateReadAttempts`, `admittedTargets`, `uniqueFoundVertices`, `uniqueOmittedVertices`, `discoveredLinks`, and the per-phase record `processedObservations`. Charging is unchanged: attempted reads include exhaustion and cached replay, admissions include omitted and returning targets, and fresh links count before filtering. Observation acknowledgements count independently of delivery/callback filters.

Visitor context uses `admissionIndex` and `phaseObservationIndex`. Walking edges use `outgoingIndex`, including cached replay; their `from`/`to` direction is unchanged. DAG child relation data still uses its separate original `slotIndex`. Walking inspection exposes `executionOptions` and `activeVisitor.visitorIndex`.

## Values, original structure, object mutation, and tree positions

Use `MutableRef<T>.getValue()` / `.setValue(value)` in place of `CTTRef.unref()` / `.setPointsTo(value)`. `VertexRef<T>` is the exported vertex handle alias. `getRefId()` remains a reference UUID, distinct from arbitrary caller vertex IDs; retired `getId()` is removed. `GraphVertex`, `GraphVertexStatus`, and `GraphEdge` become `ResolvedGraphVertex`, `ResolvedVisitStage`, and `StructuralChildEdge`.

`VertexResolved` becomes `TreeVertexRecord` with `metadata` and `children`. These fields describe records and structural references; Vertex's canonical `$data` / `$childHints` remain distinct from structural references; retired aliases are removed. `ResolvedTree` / `getResolvedTree()` become `ResolvedTreeStore` / `getResolvedTreeStore()`. Continue using `getResolvedTreeView()` for shallow detached queries.

Replace `saveNotMutatedResolvedTree` / `saveNotMutatedResolvedGraph` with `retainOriginalTreeStructure` / `retainOriginalGraphStructure`, and context fields `notMutatedResolvedTree` / `notMutatedResolvedGraph` with `originalTreeView` / `originalGraphView`. The graph type is `OriginalGraphView`. Original-tree contexts expose `ResolvedTreeView` without storage mutators. Retention grows during discovery and shares payloads; it does not capture frozen deep data or a complete snapshot before discovery.

Replace `makeMutationCommandFactory` with `createObjectMutationBinder`. Its configured stage is `ObjectMutationBinder`, its bound stage `ObjectMutationCommands`, its patch `ObjectPropertyPatch`, and configuration `ObjectMutationOptions`. Classifier flags use `ObjectCompositeClassification`. Generic stages use `TreeMutationCommandBinderFactory`, `TreeMutationCommandBinder`, `MutationCommands`, `MutationCommandBuilder`, `MutationRequest`, and `MutationCommand`. Classifiers, custom assemblers, reference-keyed `assembledMap`, falsy values, symbol property keys, and patch-presence semantics are preserved.

The root `rewriteObject` export is now directly callable; use `objectRewrite` for the module namespace. Root/subpath callables retain identity under both CJS and ESM. `rewriteObjectAs` remains an assertion, and default output remains unknown.

Replace `DepthFirstTraversalInOrderTraversalConfig` / `inOrderTraversalConfig` with `InOrderOptions` / `inOrder`, and `IndexRange` with `ChildIndexSelection`. Fields become `afterChildIndices`, `fallbackChildIndices`, `visitSingleChildParent`, and `visitAfterOmittedChildren`. Index zero means after child slot zero; negative indices, range normalization, all-out-of-bounds fallback, and omitted-slot handling retain their behavior.

Use `Vertex.hasNoChildHints()`, runner `isTraversalLeaf(ref)`, and `hasSingleStructuralSink(graph)` for their separate hint, traversal, and structural-edge criteria. `filterDagDataVisitor` and `filterAsyncDagDataVisitor` predicate and visit payload data, retaining type-guard narrowing and async results.

### Supported package imports

Use the root, `core`, `sources`, traversal family barrels, the object-tree barrel, or `tools/rewrite-object`. `package.json` remains available. Engine files, normalization/default helpers, raw runner constructors, state/injection types, and arbitrary `dist` imports are no longer supported package imports, with or without `.js`. Runtime exports and classic/Node16 TypeScript resolution enforce this boundary. Physical implementation files remain in the package for relative implementation references.

`GraphWalkOperation` names the complete pending-invocation diagnostic union. Predicate operations now use `shouldFollowEdge` and `shouldExpandVertex`, matching the public callbacks; invocation, accounting, pending-request identity, and exact error propagation are unchanged.
