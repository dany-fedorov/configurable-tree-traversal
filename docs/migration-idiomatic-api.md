# Idiomatic API migration

[Documentation map](index.md) · [API reference](reference.md) · [Earlier naming migration](migration-api-clarity.md) · [Uniform API migration](migration-uniform-api.md)

The canonical API has one spelling for each supported operation. Removed exports, fields, literals, static members and overloads have no compatibility aliases. This guide covers all fifteen idiomatic API findings; the earlier guides retain their section anchors and the broader historical rename tables.

## Migration checklist

| Finding | Previous surface                                                                                                               | Canonical contract                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01     | Rewrite current values/context typed only as original input                                                                    | Current keys and values independently include input and output domains; retained original views stay input-typed.                                                        |
| F02     | `ObjectMutationPatch` permitting arbitrary metadata                                                                            | `ObjectPropertyPatch<T>` permits only `key` and `value`; unknown own fields throw.                                                                                       |
| F03     | `DELETE_VERTEX`, store `delete`, revision `removeVertex`                                                                       | `DELETE_TREE_SUBTREE`, `DELETE_DAG_VERTEX_CASCADE`, `deleteSubtree`, `removeVertexDeclaration`, respectively.                                                            |
| F04     | `rootDependencies`, `implicitParentDependency`                                                                                 | `rootWorkDependencies`; `omittedWorkDependencies: 'none' \| 'discoveryParentWork'`, on graph discovery only.                                                             |
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

Materialized catalog lookup ignores the current live context. Its source can therefore be composed with a disjoint rewrite-data domain without reconfiguring the materializer: `DagTraversal<VertexTypes<Item, ID>, Output, ID>` and its async/helper counterparts accept the returned envelope directly or by spread. Ordinary construction without explicit rewrite types still infers Item and ID precisely. The source continues to resolve input items and ID hints; original views retain Item. This capability is specific to context-independent lookup. A custom source whose hooks require input-only live data must still be configured for the traversal's full live context.

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
const input = materializeDagInputFromRecords([item], { id: item => item.id });
const runner = new DagTraversal<Input, Output, string>({
  ...input,
  retainOriginalGraphStructure: true,
  visitors: {
    ON_WORK_READY: () => ({ commands: [{
      commandName: Command.REWRITE_VERTEX_DATA,
      commandArguments: { newData: 'artifact' },
    }] }),
  },
}).createRunner().run();
const current: Item | string = runner.getResolvedGraph()
  .getVertexRefById('task')!.getValue().getData();
const original: Item = runner.originalGraphView!
  .getVertexRefById('task')!.getValue().getData();
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
if (runner.getResolvedGraph().getVertexRefs().length !== 2) {
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

Discovery hints belong to the source input domain: `REWRITE_CHILD_HINTS` accepts `T['VertexHint'][]` in tree and DAG visitors, including async visitors, registration groups and `rewriteObject` options. Rewriting vertex data to `R` does not admit `R['VertexHint']`. `resolveChild`, object `resolveVertexHook` and `getChildrenOfProperty` still resolve input records; retained original views therefore remain truthful. If discovery needs another hint kind, declare it in the source input union first. For object sources that means extending `InK`/`InV`, and original views then reflect that declared union.

A composed source must accept the traversal's full current context. Source callback properties are checked contravariantly with strict function checking: an input-only `ObjectTreeSource<In, InK, InV>` can be too narrow for a traversal that widens live keys or hints. Configure its `OutK`/`OutV` to match, and use `ObjectCurrentVertexTypes<Input, Output>` for the traversal and binder's live data. For custom sources, explicitly declare `TreeSource<T, R>` / `DagDiscoverySource<T, R, ID>` (or their async counterparts) when standalone callbacks do not provide enough inference. Matching sources and binders compose without assertions.

The shared algebra keeps its standalone default while accepting a trailing `SourceHint`: `TraversalVisitorCommandArguments<R, SourceHint = R['VertexHint']>`, `TraversalVisitorCommand<R, Name, SourceHint = R['VertexHint']>`, `TraversalVisitorResult<R, Phase, Family, SourceHint = R['VertexHint']>`. Concrete tree/DAG visitors select `T['VertexHint']` automatically. Existing generic positions, including trailing graph IDs, remain unchanged.

`ObjectPropertyPatch<OutputTypes>` is `Partial<Pick<OutputTypes['VertexData'], 'key' | 'value'>>`. Unknown own fields, including symbols and non-enumerable fields, throw `TypeError`; metadata already on a property survives supported patches. An absent field differs from an own field containing undefined. A present `rewrite` must be a non-null object. For arbitrary full payload replacement, use `REWRITE_VERTEX_DATA` with `newData`. Patch fields retain output types; assembler results are unknown; bound commands emit the wider current domain. `ObjectMutationCommands<OutputTypes, InputTypes = OutputTypes>` keeps output first and appends input.

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
if (result.getOutput() !== 'changed')
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
  resolveVertexHook(hint, context) {
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
const preserveHints = <Hint,>(hints: Hint[]) => hints.reverse();
const declaredHints = (hints: Input['VertexHint'][]) => hints.reverse();
const discoveryHints: Input['VertexHint'][] = [1, 'extra'];
const runner = traverseTreeDepthFirst({
  traversableTree: source,
  ...{ sortChildrenHints: preserveHints },
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
  ...{ sortChildrenHints: declaredHints },
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

Graph discovery defaults are `rootWorkDependencies: 'honor'` and `omittedWorkDependencies: 'none'`. Old `rootDependencies` maps to the first; graph-only `implicitParentDependency: false/true` maps to `'none'/'discoveryParentWork'`. Root ignoring affects W prerequisites only, never C. Omitted-list fallback applies only when `dependsOnWork` is absent; explicit lists including `[]` override it. Synthetic holder dependencies remain suppressed. Tree-source inputs reject these graph policies and preserve fixed tree ordering.

`emitEvents` selects events, and `visitorPhases` selects callbacks independently. DAG callbacks use `ON_WORK_READY`/`ON_SUBGRAPH_READY`; emitted kinds are committed `workCompleted`/`subgraphCompleted`. Seeds emit no synthetic work event. Trees use their phase names for events, and walkers use vertex/edge/path kinds. `commandCommitMode: 'afterEachVisitor' | 'afterGroup'` replaces `SEQUENTIAL` / `CONCURRENT`, respectively, and controls command visibility, independently of async concurrency. Flat visitors sort by priority before batching; explicit groups retain their ordered boundaries.

`SET_VISITOR_CHAIN_STATE` takes `{ state }` (including an own undefined value), while callbacks read `visitorChainState`. Each phase visit starts a new chain with null state. Visibility follows command commit policy: afterEachVisitor exposes a committed update to the next callback; afterGroup buffers it until the group commits. Keep durable task/attempt state in the host.

## Removed compatibility inventory

| Retired form                                                                                                  | Replacement                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$d` / `$c` input, getter and clone fields; `LegacyVertexContent`                                             | `$data` / `$childHints`; canonical fields are enumerable and serialized.                                                                                 |
| `MutableRef.getId`, graph/view `getIdOf` / `getVertexById`                                                    | `getRefId`, `getVertexId`, `getVertexRefById`. Reference UUID and arbitrary host ID are separate.                                                        |
| Untagged `{ vertexContent }`, null omission, undefined prerequisite absence                                   | Tagged `{ kind: 'found', vertex }`, `{ kind: 'omitted' }`, lookup-only `{ kind: 'missing' }`. Built-in sources also return tags.                         |
| `DEFER_READY` sentinel and command spelling                                                                   | Sole `DEFER_WORK_COMPLETION` command in ON_WORK_READY; deferral discards buffered group commands and ends the chain.                                     |
| `REWRITE_VERTEX_HINTS_ON_PRE_ORDER`                                                                           | `REWRITE_CHILD_HINTS`, with family phase restrictions.                                                                                                   |
| Settlement `{ ok: true }` / `{ ok: false, error }`                                                            | `{ kind: 'workCompleted' }` / `{ kind: 'traversalFailed', error }`, with the atomic local generation.                                                    |
| Positional overloads of all six traversal helpers; `*VisitorsSimple` types                                    | One source-required options object with phase-keyed `visitors`.                                                                                          |
| `resolutionStyle`, `TraversalVisitorFunctionResolutionStyle`, `CONCURRENT` / `SEQUENTIAL`, diagnostic `group` | `commandCommitMode` and its two explicit visibility modes.                                                                                               |
| Caller `addedIndex` policy                                                                                    | Assigned registration metadata; detached query records can round-trip with fresh assigned indexes.                                                       |
| `iterateOver`, `enableVisitorFunctionsFor`, `disableVisitorFunctionsFor`                                      | `emitEvents` / `visitorPhases`; retired JS keys reject. Earlier `emitPhases` is also replaced by `emitEvents`.                                           |
| `makeVertexHook`, `{ returnMe }`                                                                              | `resolveVertexHook` with `useDefault`, tagged tree `found`, or `omitted`.                                                                                |
| `AsyncCoreExecution`                                                                                          | `AsyncTraversalExecution`, preserving phase and async differences.                                                                                       |
| Runtime bases `TreeTraversal`, `TreeTraversalRunner`, `TreeTraversalIterable`, `AbstractTreeSource`           | Structural `TreeSource`, execution capabilities, concrete builders and `Iterable<TreeTraversalEvent<...>>`.                                              |
| Collection selector `dependencies` / `completionDependencies`                                                 | `dependsOnWork` / `dependsOnSubgraphCompletion`; rejected old keys remain rejected.                                                                      |
| Raw runner state/container injection and deep engine imports                                                  | Public factories and the nine explicit runtime routes; see [supported imports](migration-api-clarity.md#supported-imports-and-removed-extension-points). |

Retired JS configuration keys reject before mutation/discovery where applicable, including present undefined or inherited forms where the contract requires presence checks. Useful rejection-only `never` fields remain constraints, not accepted compatibility options. The six helpers are `traverseTreeDepthFirst`, `traverseTreeDepthFirstAsync`, `traverseTreeBreadthFirst`, `traverseTreeBreadthFirstAsync`, `traverseDag`, and `traverseDagAsync`. Removed simple-map types are `DepthFirstTraversalVisitorsSimple`, `AsyncDepthFirstTraversalVisitorsSimple`, `DagTraversalVisitorsSimple`, and `AsyncDagTraversalVisitorsSimple`. Replace them with each helper's options `visitors` map. See the earlier guides for the original pre-clarity names and their final replacements.

## Inspection, queries and output lifetime

Generic `TraversalExecutionState`, `SyncTraversalExecution` and `AsyncTraversalExecution` default to `ExecutionInspection`; execution emission defaults to `EmissionKind<Phase>`. Concrete tree/DAG runners use `TreeDagExecutionInspection<Phase>`, walkers use `GraphWalkInspection`. Family phases and genuine sync/async differences remain intact. Graph ID generics stay after input/rewrite types (after phase for visitors); arbitrary ID identity and inference are preserved.

Ready visits and chains expose callback `phase`; chains separately expose `state: 'running' | 'paused' | 'done' | 'invalid'`, `visitorIndex`, `executionOptions` and `commandCommitMode`. Pending `operation` names are `resolveRoot`, `resolveChild`, `resolvePrerequisite`, `sortChildHints`, `getVertexIdFromHint`, and `visit`; private engine effect keys are absent. DFS/BFS frame `stage` keeps its mechanical meaning.

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

`rewriteObject` owns its source and defaults output to unknown. `rewriteObjectAs<Out>` asserts an output type without validation. `outputAtReturn` captures conversion once and can be partial at pause; resuming never refreshes it. Resume the runner, then call `getOutput()` only at FINISHED. It caches the first successful final conversion; exact conversion errors propagate and remain retryable. See [rewrite output](reference.md#rewrite-objects).

## Source-required options

Tree builders/helpers require `traversableTree`; DAG builders/helpers require exactly one `traversableGraph` or `traversableTree`; walkers require `source`. Configuration patches update future runners atomically. Prepared factories and rewrite helpers own their sources and reject caller source/state overrides. Public runners are capability interfaces obtained from builders/prepared factories, without public constructors or engine state injection. No dependency, engine-version, publication or host-dispatch policy changes accompany this migration.
