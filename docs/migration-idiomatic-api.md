# Idiomatic API migration

Upgrade-only reading. Start from the [final upgrade checklist](migration-api-distinctions.md); this guide keeps the detailed tables and examples for one earlier stage and is not a step you apply in sequence. First-time readers should use the [README](../README.md) and [reference](reference.md) instead.

[Documentation map](index.md) · [Client API migration](migration-client-api.md) · [API reference](reference.md) · [Earlier naming migration](migration-api-clarity.md) · [Uniform API migration](migration-uniform-api.md)

The canonical API has one spelling for each supported operation. Removed exports, fields, literals, static members and overloads have no compatibility aliases. This guide covers all fifteen idiomatic API findings; the earlier guides retain their section anchors and the broader historical rename tables.

## Migration checklist

| Finding | Previous surface                                                                                                               | Canonical contract                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01     | Rewrite current values/context typed only as original input                                                                    | Current keys include input/output domains; current values and assembled containers are unknown; retained original views stay input-typed.                                |
| F02     | `ObjectMutationPatch` permitting arbitrary metadata                                                                            | `ObjectPropertyPatch<T>` permits only `key` and `value`; unknown own fields throw.                                                                                       |
| F03     | `DELETE_VERTEX`, store `delete`, revision `removeVertex`                                                                       | `DELETE_TREE_SUBTREE`, `DELETE_DAG_VERTEX_CASCADE`, `deleteSubtree`, `removeVertexDeclaration`, respectively.                                                            |
| F04     | `rootDependencies`, `implicitParentDependency`                                                                                 | `rootWorkDependencies`; `dependsOnWorkDefault: 'none' \| 'discoveryParentWork'`, on graph discovery only.                                                                |
| F05     | Generic detailed inspection/default phase emission; `AsyncCoreExecution` and empty runtime bases                               | `ExecutionInspection` and `EmissionKind<Phase>` defaults; `CoreInspection` becomes `TreeDagExecutionInspection`; explicit family inspection and structural capabilities. |
| F06     | `TraversalVisitor`, `AsyncTraversalVisitor`, `TraversalVisitorRecord`, `MutationCommandBinder`, `MutationCommandBinderFactory` | `TreeVisitor`, `AsyncTreeVisitor`, `TreeVisitorRecord`, `TreeMutationCommandBinder`, `TreeMutationCommandBinderFactory`.                                                 |
| F07     | Inspection ready `order`; chain `order/phase/position/config/group`; pending request `kind`                                    | Ready `phase`; chain `phase/state/visitorIndex/executionOptions/commandCommitMode`; request `operation`.                                                                 |
| F08     | `ResolvedVertexStatus`, graph vertex `status`, `getStatusOf`                                                                   | `ResolvedVisitStage`, `visitStage`, `getVisitStageOf`.                                                                                                                   |
| F09     | Legacy content, source results, identity aliases, selectors, batching, helpers, hooks and settlement forms                     | Canonical-only inputs and outputs; see the removal inventory below.                                                                                                      |
| F10     | `MaterializedDagSource`, `materializeDagSourceFromRecords/Roots` and Async counterparts                                        | `MaterializedDagInput`, `materializeDagInputFromRecords/Roots` and Async counterparts. Walking source names stay unchanged.                                              |
| F11     | Definition entry `{ kind: 'forest', slots }`                                                                                   | `{ kind: 'roots', slots }`; shared descendants, repeated roots and omissions remain supported.                                                                           |
| F12     | `DISABLE_SUBTREE_TRAVERSAL`                                                                                                    | `SKIP_REMAINING_CHILDREN`, affecting pending local expansion.                                                                                                            |
| F13     | `ObjectTreeSource.getRootPropertyFromInputObjectDefault(rootKey?)`                                                             | `ObjectTreeSource.createRootPropertyMapper(rootKey?)`, returning a callback.                                                                                             |
| F14     | `RewriteFn`, `RewriteFnOptions`, `RewriteFnPropInput`, `TraversableObjectTTP`, `ResolvedTreeTypeParameters`                    | `ObjectRewriteCallback`, `ObjectRewriteContext`, `ObjectRewriteInput`, `ObjectTreeVertexTypes`, `ResolvedTreeVertexTypes`.                                               |
| F15     | `SET_VERTEX_VISITORS_CHAIN_STATE`, `{ vertexVisitorsChainState }`                                                              | `SET_VISITOR_CHAIN_STATE`, `{ state }`; callback `visitorChainState` remains opaque per-visit state.                                                                     |

## DAG inputs and actual sources

`MaterializedDagInput<Item, ID>` is `{ traversableGraph: DagDiscoverySource<...>, syntheticRoot: true }`. Pass or spread the entire envelope into DAG construction or preparation. Nesting that envelope under `traversableGraph` is invalid; extracting only its source drops the required synthetic-holder policy. Records materialization captures every record, including disconnected records; roots materialization expands child records. Membership and structural/W/C edge lists are copied, while IDs and item payloads retain caller identity. Arbitrary SameValueZero IDs, including an own undefined ID, stay intact.

The four names are `materializeDagInputFromRecords`, `materializeDagInputFromRoots`, `materializeDagInputFromRecordsAsync`, and `materializeDagInputFromRootsAsync`. Async materialization awaits input/selector I/O once and returns the same envelope containing a synchronous reusable discovery source. Standalone protocols remain `DagDiscoverySource` / `AsyncDagDiscoverySource`.

The current recipe lives in the reference under [typed source composition](reference.md#typed-source-composition). Materialized catalog lookup ignores the current live context. Its source can therefore be composed with a disjoint rewrite-data domain without reconfiguring the materializer: `DagTraversal<VertexTypes<Item, ID>, Output, ID>` and its async/helper counterparts accept the returned envelope directly or by spread. Ordinary construction without explicit rewrite types still infers Item and ID precisely. The source continues to resolve input items and ID hints; original views retain Item. This capability is specific to context-independent lookup. A custom source whose hooks require input-only live data must still be configured for the traversal's full live context.

<!-- standalone -->

```ts
import {
  DagTraversal,
  materializeDagInputFromRecords,
  TraversalVisitorCommandName as Command,
  type VertexTypes,
} from 'configurable-tree-traversal';

type Item = { id: string };
type Input = VertexTypes<Item, string>;
type Output = VertexTypes<string, string>;
const item: Item = { id: 'task' };
const input = materializeDagInputFromRecords([item], { id: (item) => item.id });
const runner = new DagTraversal<Input, Output, string>({
  ...input,
  retainOriginalGraphStructure: true,
  visitors: {
    ON_WORK_READY: () => ({
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: { newData: 'artifact' },
        },
      ],
    }),
  },
})
  .createRunner()
  .run();
const current: Item | string = runner
  .getResolvedGraphView()
  .getVertexRefById('task')!
  .getValue()
  .getData();
const original: Item = runner
  .originalGraphView!.getVertexRefById('task')!
  .getValue()
  .getData();
if (current !== 'artifact' || original !== item) {
  throw new Error('Expected rewritten data with the original input identity');
}
```

Walking factories `materializeWalkSourceFromRecords`, `materializeWalkSourceFromRecordsAsync` and `materializeWalkSourceFromDagDefinition` return actual `GraphWalkSource` protocols. Keep those names and pass their result under walking `source`.

<!-- standalone -->

```ts
import {
  materializeDagInputFromRecords,
  prepareDag,
  GraphWalk,
  materializeWalkSourceFromRecords,
} from 'configurable-tree-traversal';

const records = [{ id: 'draft' }, { id: 'review' }];
const input = materializeDagInputFromRecords(records, {
  id: (item) => item.id,
});
const prepared = prepareDag(input);
if (prepared.kind === 'invalid') throw new Error('Expected valid input');
const runner = prepared.dag.createRunner().run();
if (runner.getResolvedGraphView().getVertexRefs().length !== 2) {
  throw new Error('Synthetic holder must stay hidden');
}
new GraphWalk({
  source: materializeWalkSourceFromRecords(records, {
    id: (item) => item.id,
    roots: ['draft'],
    outgoing: () => [],
  }),
})
  .createRunner()
  .run();
```

## Corrected object contracts

An earlier visitor can rewrite the current property before `rewrite` runs; children can remain unchanged or become mixed reconstructed containers. `ObjectCurrentVertexTypes<InputTypes, OutputTypes>` retains input/output keys and metadata alternatives, while current values are `unknown`. This applies to callback properties, `vertex`, live refs/tree, previous-phase refs, classifiers, assemblers and object-source parent contexts. Assembler results and `assembledComposite` are `unknown` too. Narrow current values with runtime checks; neither key nor metadata narrowing proves a value domain. `originalTreeView` stays input-typed. Generic tree APIs retain their configured domains; explicitly use the current-domain helper when composing an object binder with a generic traversal.

Replace `getOutputObjectFromRootValue` with `convertRootValue(value: unknown, context: { readonly complete: boolean })`. The old option rejects. Ordinary `rewriteObject` requires this converter before promising a specific `Out`; explicit output generics alone no longer work. Keep `rewriteObjectAs<Out>` for a deliberate unchecked final output assertion. Completion gating, successful conversion caching, and retry after exact conversion failures remain unchanged.

Default object discovery now exposes `PropertyKey`/`unknown`. Narrow constructor generics and rewrite helpers require **both** the root and child property adapters, including with pretyped or spread options. Prefer `ObjectTreeSource.fromProperties(input, { getRootPropertyFromInputObject, getChildrenOfProperty })` for precise discovery. `createRootPropertyMapper(rootKey?)` preserves the actual root input and root-key type; `getChildrenOfPropertyDefault` cannot promise narrow descendant keys or values. Assembly caches use `ObjectAssemblyCache<Key>` with function-valued `has`, `get`, and `set`; use `Map<Key, unknown>` so arbitrary mixed values can be stored safely.

Discovery hints belong to the source input domain: `REWRITE_CHILD_HINTS` accepts `T['VertexHint'][]` in tree and DAG visitors, including async visitors, registration groups and `rewriteObject` options. Rewriting vertex data to `R` does not admit `R['VertexHint']`. `resolveChild`, object `resolveChildHook` and `getChildrenOfProperty` still resolve input records; retained original views therefore remain truthful. If discovery needs another hint kind, declare it in the source input union first. For object sources that means extending `InK`/`InV`, and original views then reflect that declared union.

A composed source must accept the traversal's full current context. Source callback properties are checked contravariantly with strict function checking: an input-only `ObjectTreeSource<In, InK, InV>` can be too narrow for a traversal that widens live keys or hints. Configure its `OutK`/`OutV` to match, and use `ObjectCurrentVertexTypes<Input, Output>` for the traversal and binder's live data. For custom sources, explicitly declare `TreeSource<T, R>` / `DagDiscoverySource<T, R, ID>` (or their async counterparts) when standalone callbacks do not provide enough inference. Matching sources and binders compose without assertions.

The shared algebra keeps its standalone default while accepting a trailing `SourceHint`: `TraversalVisitorCommandArguments<R, SourceHint = R['VertexHint']>`, `TraversalVisitorCommand<R, Name, SourceHint = R['VertexHint']>`, `TraversalVisitorResult<R, Phase, Family, SourceHint = R['VertexHint']>`. Concrete tree/DAG visitors select `T['VertexHint']` automatically. Existing generic positions, including trailing graph IDs, remain unchanged.

`ObjectPropertyPatch<OutputTypes>` is `Partial<Pick<OutputTypes['VertexData'], 'key' | 'value'>>`. Unknown own fields, including symbols and non-enumerable fields, throw `TypeError`; metadata already on a property survives supported patches. An absent field differs from an own field containing undefined. An object operation with `kind: 'rewrite'` requires a non-null object `patch`; generic rewrite operations instead carry the complete replacement in `value`. For arbitrary full payload replacement, use `REWRITE_VERTEX_DATA` with `newData`. Patch fields retain output types; assembler results are unknown; bound commands emit the wider current domain. `ObjectMutationCommands<OutputTypes, InputTypes = OutputTypes>` keeps output first and appends input.

<!-- standalone -->

```ts
import {
  rewriteObject,
  DepthFirstPhase,
  TraversalVisitorCommandName as Command,
} from 'configurable-tree-traversal';

const result = rewriteObject<
  number,
  'input',
  number,
  unknown,
  'output',
  string
>(1, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
  getChildrenOfProperty: () => [],
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: () => ({
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: { newData: { key: 'input', value: 'changed' } },
        },
      ],
    }),
  },
  rewrite(property, context) {
    const current: unknown = property.value;
    const live: unknown = context.vertex.getData().value;
    if (typeof current === 'number') current.toFixed();
    if (live !== 'changed') throw new Error('Expected rewritten live data');
    return undefined;
  },
});
const output = result.getOutputResult();
if (output.kind !== 'present' || output.value !== 'changed')
  throw new Error('Expected rewritten output');
```

The renamed `ObjectRewriteCallback`, `ObjectRewriteContext`, and `ObjectRewriteInput` carry both domains. `ObjectTreeSource.createRootPropertyMapper(rootKey?)` returns the callback accepted by `getRootPropertyFromInputObject`; `getChildrenOfPropertyDefault` remains a direct getter. The intentional static `createObjectMutationBinder` alias remains.

A declared union allows both hint kinds to be discovered, independently of output-only value patches:

<!-- standalone -->

```ts
import {
  rewriteObject,
  DepthFirstPhase,
  TraversalVisitorCommandName as Command,
} from 'configurable-tree-traversal';

const extra = { key: 'output' as const, value: 'discovered' };
let observedHint: unknown;
const result = rewriteObject<
  number,
  'input' | 'output',
  number | string,
  unknown,
  'output',
  string
>(0, {
  getRootPropertyFromInputObject: (value) => ({ key: 'input', value }),
  getChildrenOfProperty: () => [],
  retainOriginalTreeStructure: true,
  resolveChildHook(hint, context) {
    const inputValue: number | string = hint.value;
    const originalValue: number | string = context
      .originalTreeView!.getRoot()!
      .getValue()
      .getData().value;
    if (inputValue !== 'discovered' || originalValue !== 0) {
      throw new Error('Expected declared input hint and original root');
    }
    observedHint = hint;
    return { kind: 'useDefault' };
  },
  visitors: {
    [DepthFirstPhase.PRE_ORDER]: (_vertex, context) =>
      context.isTreeRoot
        ? {
            commands: [
              {
                commandName: Command.REWRITE_CHILD_HINTS,
                commandArguments: { newHints: [extra] },
              },
            ],
          }
        : undefined,
  },
});
if (observedHint !== extra) throw new Error('Expected shared hint identity');
const tree = result.traversalRunner.getResolvedTreeView();
const child = tree.getChildrenOf(tree.getRoot()!)![0]!;
if (child.getValue().getData().value !== 'discovered') {
  throw new Error('Expected the declared union hint to resolve');
}
```

With TypeScript 4.7/4.9, an unannotated sorter inside an object spread can be contextualized as `unknown[]` before source inference. Previously this could silently widen visitor data to `unknown`; strict source composition now rejects it. Keep a sorter directly on the options object for contextual inference, or use a generic hint-preserving sorter or an explicit source hint domain when spreading it:

<!-- standalone -->

```ts
import {
  traverseTreeDepthFirst,
  TraversalVisitorCommandName as Command,
  type TreeSource,
  type VertexTypes,
} from 'configurable-tree-traversal';

type Input = VertexTypes<number, number | 'extra'>;
type Output = VertexTypes<string, boolean>;
const source: TreeSource<Input, Output> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: { vertexContent: { $data: 0, $childHints: [] } },
  }),
  resolveChild: (hint) => ({
    kind: 'found',
    vertex: {
      vertexContent: { $data: hint === 'extra' ? 2 : hint, $childHints: [] },
    },
  }),
};
const preserveHints = <Hint>(hints: Hint[]) => hints.reverse();
const declaredHints = (hints: Input['VertexHint'][]) => hints.reverse();
const discoveryHints: Input['VertexHint'][] = [1, 'extra'];
const runner = traverseTreeDepthFirst({
  traversableTree: source,
  ...{ transformChildHints: preserveHints },
  visitors: {
    PRE_ORDER: (_vertex, context) =>
      context.isTreeRoot
        ? {
            commands: [
              {
                commandName: Command.REWRITE_VERTEX_DATA,
                commandArguments: { newData: 'changed' },
              },
              {
                commandName: Command.REWRITE_CHILD_HINTS,
                commandArguments: { newHints: discoveryHints },
              },
            ],
          }
        : undefined,
  },
});
const value: number | string = runner
  .getResolvedTreeView()
  .getRoot()!
  .getValue()
  .getData();
if (value !== 'changed') throw new Error('Expected rewritten data');
traverseTreeDepthFirst({
  traversableTree: source,
  ...{ transformChildHints: declaredHints },
});
```

## Deletion, local expansion and declarations

Tree deletion recursively removes the resolved subtree. DAG deletion removes the vertex, transitive work dependents through W and C relations, and orphaned structural descendants; shared children and detached structural anchors survive unless independently affected. Deleting the traversal root clears its graph. The **runner family** selects the deletion command even when a DAG runner consumes a tree source. Object mutation helpers produce tree deletion. Shared command types accept a trailing deletion-command parameter; tree binders narrow it to `DELETE_TREE_SUBTREE`.

<!-- standalone -->

```ts
import {
  type TreeVisitor,
  type DagVisitor,
  type VertexTypes,
  DepthFirstPhase,
  DagVisitorPhase,
  TraversalVisitorCommandName as Command,
  ObjectTreeSource,
  traverseTreeDepthFirst,
  traverseDag,
} from 'configurable-tree-traversal';

type Data = VertexTypes<
  { key: string | number | symbol; value: unknown },
  { key: string | number | symbol; value: unknown }
>;
const deleteTree: TreeVisitor<DepthFirstPhase.PRE_ORDER, Data> = () => ({
  commands: [{ commandName: Command.DELETE_TREE_SUBTREE }],
});
const deleteDag: DagVisitor<
  Data,
  Data,
  DagVisitorPhase.ON_WORK_READY
> = () => ({
  commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }],
});
traverseTreeDepthFirst<Data>({
  traversableTree: new ObjectTreeSource(1),
  visitors: { [DepthFirstPhase.PRE_ORDER]: deleteTree },
});
traverseDag<Data>({
  traversableTree: new ObjectTreeSource(1),
  visitors: { [DagVisitorPhase.ON_WORK_READY]: deleteDag },
});
```

Direct stored-tree deletion is `ResolvedTreeStore.deleteSubtree(ref)`. Revision `{ kind: 'removeVertexDeclaration', vertexId }` removes only an authored declaration. Repair dangling references explicitly in the same ordered revision batch; validation is atomic and produces a fresh prepared DAG without migrating sessions, tickets or completion facts. Definition entry `roots` preserves ordered live/omitted slots and shared topology.

`SKIP_REMAINING_CHILDREN` closes the current vertex's pending structural child slots. Already-admitted work and children shared through other parents survive. It is separate from dependency cancellation and deletion. Eager/prepared topology rejects it. Existing phase restrictions on hint rewriting stay in force.

## Policies, selectors and state

Graph discovery defaults are `rootWorkDependencies: 'honor'` and `dependsOnWorkDefault: 'none'`. Old `rootDependencies` maps to the first; graph-only `implicitParentDependency: false/true` maps to `'none'/'discoveryParentWork'`. Root ignoring affects W prerequisites only, never C. Omitted-list fallback applies only when `dependsOnWork` is absent; explicit lists including `[]` override it. Synthetic holder dependencies remain suppressed. Tree-source inputs reject these graph policies and preserve fixed tree ordering.

`emitEvents` selects events, and `visitorPhases` selects callbacks independently. DAG callbacks use `ON_WORK_READY`/`ON_SUBGRAPH_READY`; emitted kinds are committed `workCompleted`/`subgraphCompleted`. Seeds emit no synthetic work event. Trees use their phase names for events, and walkers use vertex/edge/path kinds. `commandCommitMode: 'afterEachVisitor' | 'afterGroup'` replaces `SEQUENTIAL` / `CONCURRENT`, respectively, and controls command visibility, independently of async concurrency. Flat visitors sort by priority before batching; explicit groups retain their ordered boundaries.

`SET_VISITOR_CHAIN_STATE` takes `{ state }` (including an own undefined value), while callbacks read `visitorChainState`. Each phase visit starts a new chain with null state. Visibility follows command commit policy: afterEachVisitor exposes a committed update to the next callback; afterGroup buffers it until the group commits. Keep durable task/attempt state in the host.

## Removed compatibility inventory

| Retired form                                                                                                  | Replacement                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$d` / `$c` input, getter and clone fields; `LegacyVertexContent`                                             | `$data` / `$childHints`; canonical fields are enumerable and serialized.                                                                                 |
| `MutableRef.getId`, graph/view `getIdOf` / `getVertexById`                                                    | `getRefId`, `requireVertexId`, `getVertexRefById`. Reference UUID and arbitrary host ID are separate.                                                    |
| Untagged `{ vertexContent }`, null omission, undefined prerequisite absence                                   | Tagged `{ kind: 'found', vertex }`, `{ kind: 'omitted' }`, lookup-only `{ kind: 'missing' }`. Built-in sources also return tags.                         |
| `DEFER_READY` sentinel and command spelling                                                                   | Sole `DEFER_WORK_COMPLETION` command in ON_WORK_READY; deferral discards buffered group commands and ends the chain.                                     |
| `REWRITE_VERTEX_HINTS_ON_PRE_ORDER`                                                                           | `REWRITE_CHILD_HINTS`, with family phase restrictions.                                                                                                   |
| Settlement `{ ok: true }` / `{ ok: false, error }`                                                            | `{ kind: 'workCompleted' }` / `{ kind: 'traversalFailed', error }`, with the atomic local generation.                                                    |
| Positional overloads of all six traversal helpers; `*VisitorsSimple` types                                    | One source-required options object with phase-keyed `visitors`.                                                                                          |
| `resolutionStyle`, `TraversalVisitorFunctionResolutionStyle`, `CONCURRENT` / `SEQUENTIAL`, diagnostic `group` | `commandCommitMode` and its two explicit visibility modes.                                                                                               |
| Caller `addedIndex` policy                                                                                    | Assigned registration metadata; detached query records can round-trip with fresh assigned indexes.                                                       |
| `iterateOver`, `enableVisitorFunctionsFor`, `disableVisitorFunctionsFor`                                      | `emitEvents` / `visitorPhases`; retired JS keys reject. Earlier `emitPhases` is also replaced by `emitEvents`.                                           |
| `makeVertexHook`, `{ returnMe }`                                                                              | `resolveChildHook` with `useDefault`, tagged tree `found`, or `omitted`.                                                                                 |
| `AsyncCoreExecution`                                                                                          | `AsyncTraversalExecution`, preserving phase and async differences.                                                                                       |
| Runtime bases `TreeTraversal`, `TreeTraversalRunner`, `TreeTraversalIterable`, `AbstractTreeSource`           | Structural `TreeSource`, execution capabilities, concrete builders and `Iterable<TreeTraversalEvent<...>>`.                                              |
| Collection selector `dependencies` / `completionDependencies`                                                 | `dependsOnWork` / `dependsOnSubgraphCompletion`; rejected old keys remain rejected.                                                                      |
| Raw runner state/container injection and deep engine imports                                                  | Public factories and the nine explicit runtime routes; see [supported imports](migration-api-clarity.md#supported-imports-and-removed-extension-points). |

Retired JS configuration keys reject before mutation/discovery where applicable, including present undefined or inherited forms where the contract requires presence checks. Useful rejection-only `never` fields remain constraints, not accepted compatibility options. The six helpers are `traverseTreeDepthFirst`, `traverseTreeDepthFirstAsync`, `traverseTreeBreadthFirst`, `traverseTreeBreadthFirstAsync`, `traverseDag`, and `traverseDagAsync`. Removed simple-map types are `DepthFirstTraversalVisitorsSimple`, `AsyncDepthFirstTraversalVisitorsSimple`, `DagTraversalVisitorsSimple`, and `AsyncDagTraversalVisitorsSimple`. Replace them with each helper's options `visitors` map. See the earlier guides for the original pre-clarity names and their final replacements.

## Inspection, queries and output lifetime

Generic `TraversalExecutionState`, `SyncTraversalExecution` and `AsyncTraversalExecution` default to `ExecutionInspection`; execution emission defaults to `EmissionKind<Phase>`. Concrete tree/DAG runners use `TreeDagExecutionInspection<Phase>`, walkers use `GraphWalkInspection`. Family phases and genuine sync/async differences remain intact. Graph ID generics stay after input/rewrite types (after phase for visitors); arbitrary ID identity and inference are preserved.

Ready visits and chains expose callback `phase`; chains separately expose `state: 'running' | 'paused' | 'done' | 'invalid'`, `visitorIndex`, `executionOptions` and `commandCommitMode`. Pending `operation` names are `resolveRoot`, `resolveChild`, `resolvePrerequisite`, `transformChildHints`, `getVertexIdFromHint`, and `visit`; private engine effect keys are absent. DFS/BFS frame `stage` keeps its mechanical meaning.

| Old visit status | `ResolvedVisitStage`        |
| ---------------- | --------------------------- |
| `DISCOVERED`     | `DISCOVERED`                |
| `READY`          | `INITIAL_VISIT_ELIGIBLE`    |
| `PRE_VISITING`   | `INITIAL_VISIT_STARTED`     |
| `PRE_VISITED`    | `INITIAL_VISIT_COMMITTED`   |
| `COMPLETING`     | `COMPLETION_VISIT_ELIGIBLE` |
| `COMPLETE`       | `COMPLETE`                  |

Read graph `visitStage` or `getVisitStageOf(ref)`. Tree initial callbacks can remain `INITIAL_VISIT_ELIGIBLE`; DAG initial callbacks use `INITIAL_VISIT_STARTED`. Stages do not prove a callback is active, that a filtered/skipped phase ran, or that deferred W committed. Inspect admitted callbacks/chains for activity and DAG summaries/milestone snapshots for W/C facts. Original graph views remain structural and expose no visit stages. Runner `getStatus()` remains lifecycle state.

`getResolvedTreeView()` and graph views are live shallow queries; returned arrays/records are detached while refs/data retain identity. Retained original structure grows during discovery and keeps input data types; it is neither deep immutable storage nor rollback. `summary()` reads current progress, `inspect()` captures execution state, and `inspectDagMilestones()` captures fixed observational W/C facts. Refresh captured facts after settlement. Tickets/generations stay local; reconstruct from host-accepted `completedWork` facts.

`rewriteObject` owns its source and defaults output to unknown. `rewriteObjectAs<Out>` asserts an output type without validation. `outputResultAtReturn` captures a present/absent result once and can be partial at pause; resuming never refreshes it. Resume the runner, then call `getOutputResult()` only at FINISHED. It caches the first successful final conversion; exact conversion errors propagate and remain retryable. See [rewrite output](reference.md#rewrite-objects).

## Source-required options

Tree builders/helpers require `traversableTree`; DAG builders/helpers require exactly one `traversableGraph` or `traversableTree`; walkers require `source`. Configuration patches update future runners atomically. Prepared factories and rewrite helpers own their sources and reject caller source/state overrides. Public runners are capability interfaces obtained from builders/prepared factories, without public constructors or engine state injection. No dependency, engine-version, publication or host-dispatch policy changes accompany this migration.

## Explicit object operations and reconstruction

Replace optional `{ rewrite: patch }` / `{ delete: true }` requests with
`{ kind: 'rewrite', patch }` / `{ kind: 'delete' }`. Generic mutation builders
use `{ kind: 'rewrite', value }` for a complete replacement. Omission and
`{ kind: 'keep' }` preserve each helper's default behavior, including object
composite reconstruction. Conflicting operations and unknown request fields reject.

Rename `resolveVertexHook` / `ObjectVertexHookResult` to `resolveChildHook` /
`ObjectChildHookResult`; the hook runs only for children. Use the root mapper
for the root. The old hook option rejects even when present with undefined.

Built-in assembly now rejects property collisions by default after normalizing
JavaScript property keys (number/string equivalents collide; symbols preserve
identity). Select `propertyCollision: 'firstWins'` or `'lastWins'` explicitly
when desired. Arrays default to `arrayIndexPolicy: 'compactInTraversalOrder'`;
`'preserveNumericKeys'` retains holes and assigns numeric indices 0..2^32-2.
Output length is max(original array length, highest assigned index + 1), so
trailing holes and deletion-created trailing holes survive. Non-arrays classified
as arrays derive length from assigned indices.
Invalid numeric positions reject. Custom assemblers own their reconstruction
and supersede these built-in placement/collision policies.

## Strict configuration and child positions

All public option bags reject unknown own string and symbol keys with `TypeError`; remove unsupported policies instead of relying on ignored fields. Source protocol objects keep caller-owned state and inherited methods. Combined helpers validate their own options, then pass only supported fields to lower-level components.

`configure` retains every missing or undefined field, including nested visitor phases and in-order options. This works with pretyped optional patches under `exactOptionalPropertyTypes`. Defined malformed fields reject atomically. Only explicitly nullable fields accept null; walking limits still replace their entire record.

Replace `afterChildIndices: 0` with `{ indices: [0] }`, a former tuple interval `[0, 2]` with `{ ranges: [{ from: 0, through: 2 }] }`, and a former distinct-position list `{ ranges: [0, 2] }` with `{ indices: [0, 2] }`. The same syntax applies to fallback positions. Negative indexing, inclusive ranges and all-out-of-bounds fallback behavior remain.

## Precise DAG preparation, completion and tickets

Replace `workCompletion: 'visitorReturn'` with `workCompletion: 'afterWorkReadyChain'`.
The old literal rejects. The default completes W after a normal `ON_WORK_READY`
chain, including an empty or filtered chain. `externalSettlement` still requires
host settlement, and explicit `DEFER_WORK_COMPLETION` still ends the chain early.

`prepareDag` and `prepareDagAsync` return engine-discovered structural cycles as
`{ kind: 'invalid', issues: [{ kind: 'discoveryCycle', cycleWitnessVertexIds }] }`. Preserve
that ordered closed witness; authored `structuralCycle` issues describe SCC
membership. Direct runner execution/preparation still throws `DagDiscoveryCycleError`.
Exact source-thrown values, including same-class errors from callbacks, getters
and iterables, escape unchanged.

`DagWorkTicket` is a type-only nominal capability with no runtime constructor.
Pass the original ticket to settlement methods; spreading it fails typechecking
and runtime provenance validation. `DagVertexProgress` always supplies readonly
`unmetWorkPrerequisiteIds` and `unmetSubgraphPrerequisiteIds`, even when empty.
Update manual fixtures with both arrays. Overlapping IDs remain in both arrays;
W cannot be recovered by subtracting C from `unmetPrerequisiteIds`.

Tree/DAG pending-request diagnostics use `operation: 'transformChildHints'`, matching
the sorter option. Replace the old diagnostic spelling in inspection consumers.

## Explicit walking hydration and reusable catalogs

Every walking source now declares a hydration mode. Use `hydration: 'resolver'`
with a required `resolveVertex(id)`; this mode keeps mixed `{ vertexId }` and
`{ vertexId, resolution }` targets. For a source without a resolver, declare
`hydration: 'inlineOrCached'` (`resolveVertex` absent or yielding `undefined`,
including getters) and replace targets with
`{ kind: 'inline', vertexId, resolution }` or `{ kind: 'cached', vertexId }`.
A cached target requires an already admitted found/omitted resolution in this
runner. Inline roots can therefore expose cached self/backedges. Rejected links
never seed the cache, and the first admitted resolution, including omission,
remains authoritative. Missing hydration declarations reject; there is no legacy
source-shape fallback.

Walking materializers and the DAG definition adapter declare resolver mode.
The async catalog materializer still returns a reusable synchronous source.
Use `GraphWalkRecordSelectors` and `AsyncGraphWalkRecordSelectors` to name reusable
selector contracts and `GraphWalkCatalogLink` for readonly `to`/`data` catalog
relations. Catalog relations remain separate from lazy links with target wrappers.
These types are exported from the root and walking entry point.

Walking callback diagnostics now use `operation: 'visit'` in place of `visitor`.
Callback names, walking phases and iterator operations retain their names.
See [walking sources](reference.md#walking-sources-and-identity).

## Restricted observation and graph views

Replace `ResolvedGraph`, `getResolvedGraph()` and `resolvedGraph` with
`ResolvedGraphView`, `getResolvedGraphView()` and `resolvedGraphView`.
Tree callbacks and source contexts use `resolvedTreeView` in place of
`resolvedTree`. The old names have no compatibility aliases.

All ordinary tree/DAG query, callback, source-context and event routes now expose
canonical `VertexHandle<T>` and `VertexView<T>` facets. Handles retain `getRefId()`
and live `getValue()` queries; `setValue` and writable vertex fields are absent.
Hints and structural arrays are detached and frozen, while opaque data, IDs and
individual hint payloads retain shallow identity. Event `vertex` values remain
captured observations even when the corresponding live handle changes later.
`clone()` creates an independent editable vertex and hint collection.

Use visitor commands to rewrite or delete active traversal state. Ordinary
runners no longer expose `getResolvedTreeStore()`. Explicit standalone
`MutableRef`, `Vertex` and `ResolvedTreeStore` editing remains available.
Original views remain typed to the input domain. Synthetic DAG entry source
contexts have both `parentVertex` and `parentVertexRef` set to null; depth,
hint index and hint values still describe that entry slot. Other graph parents
and all tree parents remain non-null.

Remove `isTraversalRoot` and `isTraversalRootVertex` uses. Keep `isTreeRoot` /
`isTreeRootVertex` and `isGraphRoot` / `isGraphRootVertex` for family roots.
Walking entries still use `via: null`. There is no subtree-start option.

## Delivery-time observation selection

**Breaking change:** tree and DAG `emitEvents` now filters at delivery, matching walking. Resuming with only `subgraphCompleted` suppresses a buffered `workCompleted` observation, even if it was selected when the work chain began. Conversely, committed observations buffered while emission was disabled can be selected on the next lease. Deferred settlement follows the same rule. Already delivered or suppressed observations never replay; callbacks and committed W/C transitions never repeat to satisfy a new selector.

`visitorPhases` still snapshots callback admission independently. Changing it on resume affects newly admitted chains, while previously admitted callbacks drain under their retained policy. Inspection `chains[].executionOptions.emitEvents` records the historical admission configuration; it does not control delivery. The top-level `executionOptions.emitEvents` is the current delivery policy.

Explicit required `emitEvents` arrays narrow concrete runner and capability iterator results. An empty array produces an iterator of `never`; omitted, undefined or statically optional selectors keep broad event types. Mixed runner unions may keep broad inference; retain a family-specific capability in reusable wrappers. Field-wise undefined patch behavior, pause/drain ownership and terminal lifecycle behavior remain unchanged. No `eventSelection` timing switch is provided.

See the [runnable settlement and selection example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts) and [iteration contract](reference.md#pause-and-resume).
