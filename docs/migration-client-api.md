# Client API migration

[Documentation map](index.md) · [API reference](reference.md) · [Idiomatic API migration](migration-idiomatic-api.md)

This guide covers the twenty client API corrections. Removed forms have no compatibility aliases. Use the [earlier migration checklist](migration-idiomatic-api.md#migration-checklist) for the preceding naming changes.

## Old and new contracts

| Finding | Previous usage or assumption                                            | Current contract                                                                                                                               |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| F01     | Narrow current/assembled rewrite values; `getOutputObjectFromRootValue` | Current values, assembly results and cache values are `unknown`; use `convertRootValue(value, { complete })` to establish output type.         |
| F02     | Narrow default object discovery through generics alone                  | Defaults expose `PropertyKey`/`unknown`; precise discovery requires both root and child mappers, preferably `ObjectTreeSource.fromProperties`. |
| F03     | Mutable refs/vertices/stores through ordinary observations              | `VertexHandle`/`VertexView` facets and tree/graph query views; send validated commands to edit a runner.                                       |
| F04     | Undefined configuration fields reset defaults                           | Missing and undefined patch fields retain settings, including nested fields; malformed defined values reject atomically.                       |
| F05     | Extra option keys silently ignored                                      | Unsupported own string/symbol keys throw `TypeError`, including public path-query options. Project combined option bags explicitly.            |
| F06     | Optional walking resolver inferred from source shape                    | Declare `hydration: 'resolver'` or `'inlineOrCached'` and use that mode's target wrappers.                                                     |
| F07     | Source preparation throws on an engine discovery cycle                  | `prepareDag`/`prepareDagAsync` return an invalid `discoveryCycle` issue with the ordered closed witness.                                       |
| F08     | `workCompletion: 'visitorReturn'`                                       | `workCompletion: 'afterWorkReadyChain'` (default); empty or filtered work-ready chains also complete work.                                     |
| F09     | Different family emission timing                                        | `emitEvents` filters at delivery across tree, DAG and walking; visitor admission is independent.                                               |
| F10     | Arrays always compact rewritten positions                               | Default `arrayIndexPolicy: 'compactInTraversalOrder'`; choose `'preserveNumericKeys'` to retain positions and holes.                           |
| F11     | Rewritten duplicate keys silently overwrite                             | Default `propertyCollision: 'error'`; explicitly choose `'firstWins'` or `'lastWins'`.                                                         |
| F12     | Copying a ticket preserves settlement authority                         | `DagWorkTicket` is a nominal type with no runtime constructor; retain the actual issued object.                                                |
| F13     | Ambiguous scalar/tuple child positions                                  | `ChildIndexSelection` is `{ indices: [...] }` or `{ ranges: [{ from, through }] }` for primary and fallback selection.                         |
| F14     | Optional or inferred work-prerequisite arrays                           | Progress always contains readonly `unmetWorkPrerequisiteIds` and `unmetSubgraphPrerequisiteIds`, including empty arrays.                       |
| F15     | `{ rewrite: ... }` / `{ delete: true }` mutation requests               | Generic `{ kind: 'rewrite', value }`; object `{ kind: 'rewrite', patch }`; both accept `{ kind: 'delete' }` / `{ kind: 'keep' }`.              |
| F16     | `resolveVertexHook` / `ObjectVertexHookResult`                          | `resolveChildHook` / `ObjectChildHookResult`; map the root separately.                                                                         |
| F17     | `ResolvedGraph` / `getResolvedGraph()` / `resolvedGraph`                | `ResolvedGraphView` / `getResolvedGraphView()` / `resolvedGraphView`.                                                                          |
| F18     | Anonymous/private walking catalog selector types                        | `GraphWalkRecordSelectors`, `AsyncGraphWalkRecordSelectors`, and readonly `GraphWalkCatalogLink<Edge, ID>`.                                    |
| F19     | Tree/DAG `sort` or walking phase-specific visit operation labels        | Diagnostics use `sortChildrenHints` and uniform callback `visit`; iterator operations remain distinct.                                         |
| F20     | `isTraversalRoot` / `isTraversalRootVertex`                             | Use family `isTreeRoot` / `isGraphRoot`; walking entry occurrences have `via: null`. There is no subtree-start option.                         |

## Truthful object discovery and output

A rewrite can retain old children and replace others with different values. Narrow current values with runtime checks; output patch payloads retain their declared types. Neither an explicit generic nor a narrow assembly cache proves reconstructed shape. Use `Map<Key, unknown>` or `ObjectAssemblyCache<Key>` for assembly. `createRootPropertyMapper(rootKey?)` preserves the actual root input and key types; default child discovery stays broad. Narrow discovery requires both `getRootPropertyFromInputObject` and `getChildrenOfProperty`, including through rewrite helper options.

<!-- standalone -->

```ts
import { rewriteObject } from 'configurable-tree-traversal';

const result = rewriteObject([1, 2], {
  rewrite: (property) =>
    property.key === 1
      ? { kind: 'rewrite', patch: { value: 'two' } }
      : undefined,
  convertRootValue(value, context) {
    if (!context.complete || !Array.isArray(value))
      throw new Error('Expected a completed array');
    return value.join(',');
  },
});
const output: string | null = result.getOutput();
if (output !== '1,two') throw new Error('Unexpected converted output');
```

Ordinary `rewriteObject` returns unknown output unless a converter establishes its type. `rewriteObjectAs<Out>` is the explicit unchecked final assertion and performs no schema validation. `outputAtReturn` is a one-time converted snapshot and may be partial at pause. Resume `traversalRunner`, then call `getOutput()` at FINISHED. Final output caches the first successful conversion; exact conversion failures propagate and remain retryable. A completed initial conversion is reused. Neither output API promises prototype preservation or deep immutability.

Object requests use `patch` containing only `key`/`value`; generic mutation requests use a complete replacement `value`. Omission and `keep` retain default behavior, including composite assembly. Conflicting/malformed operations reject. `resolveChildHook` never maps the root; the old hook name rejects even when its value is undefined.

Built-in assembly normalizes JavaScript keys before collision checks: number/string equivalents collide, symbols compare by identity. The selected collision policy also covers named array properties and preserved numeric positions. Preserved numeric keys must be integers from 0 through 2^32-2. Preserved arrays have length max(original intrinsic array length, highest assigned index + 1), retaining original and deletion-created trailing holes. Non-arrays classified as arrays have no original intrinsic length. Named array properties remain supported. Custom `assembleArray`/`assembleObject` own reconstruction and collision behavior for their respective composites.

## Observations, configuration and identity

Ordinary events, visitors, source contexts and query views expose canonical frozen `VertexHandle`/`VertexView` facets. Handles have `getRefId()`/`getValue()`, with no `setValue`; hint and topology collections are detached and readonly. Caller data, IDs and hint payloads remain shallow shared identities and are not deep frozen. A handle's value is live; an event's vertex records its captured value. Use commands to change runner state. Standalone mutable `Vertex`, `MutableRef` and offline stores remain advanced editing capabilities; ordinary runners have no `getResolvedTreeStore()`.

Tree contexts expose `resolvedTreeView`; graph contexts expose `resolvedGraphView`. For hidden synthetic DAG entry parents, `parentVertex` and `parentVertexRef` are both null; visible graph parents and tree parents remain non-null. Entry-slot depth, hint index and hint retain their discovery meanings. `OriginalGraphView`, `PreparedDag`, and `DagMilestoneSnapshot` remain distinct contracts.

Configuration validates the complete candidate before replacing settings. Missing/undefined fields retain prior values under `exactOptionalPropertyTypes`, including phase and in-order fields. Null clears only explicitly nullable fields, such as sorters and walking predicates. Walking `limits` records replace the previous record. Existing runners retain their configuration snapshots. Builders, helpers, registration, execution, materializer and path-query option bags reject unsupported own keys before callbacks or mutation. Sources still accept inherited protocol methods and caller-owned state; task data and authored DAG declarations remain opaque/declaration inputs.

<!-- standalone -->

```ts
import {
  DepthFirstTreeTraversal,
  ObjectTreeSource,
} from 'configurable-tree-traversal';

const traversal = new DepthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource([1, 2, 3]),
  inOrder: {
    afterChildIndices: { indices: [0, 2] },
    fallbackChildIndices: { ranges: [{ from: -2, through: -1 }] },
  },
});
traversal.configure({ inOrder: { afterChildIndices: undefined } });
traversal.createRunner().run();
```

Indices select separate boundaries; ranges include both endpoints. Negative positions count from the end, ranges clip, and fallback applies when no primary position is in bounds. Old scalar/tuple shorthands reject.

Tickets are local capabilities with private nominal type identity and runtime WeakMap ownership. Spreads, clones and reconstructed objects cannot settle work; no public constructor exists. Persist host-accepted completion facts and reconstruct a fresh session instead of persisting tickets or generations. W/C progress arrays are independent: the same ID can occur in both, so subtracting C from their union does not recover W.

## Walking hydration and cache lifetime

Resolver sources require `resolveVertex(id)` and permit mixed `{ vertexId }` / `{ vertexId, resolution }` targets. Inline-or-cached sources forbid every defined resolver value; absent fields or captured getters returning undefined are allowed (`resolveVertex?: undefined`). Their targets are `{ kind: 'inline', vertexId, resolution }` or `{ kind: 'cached', vertexId }`. A cached target requires an earlier admitted resolution in the same runner, permitting self/backedges after inline admission. Async sources keep the same mode distinction and accept promises/async iterables.

The first admitted resolution wins, including omission; later inline contents do not refresh it. Rejected links do not seed the cache. Each runner owns its cache: start a fresh runner to refresh source contents or omissions. Walking materializers/adapters declare resolver mode. Catalog selectors return `GraphWalkCatalogLink<Edge, ID>` with readonly `to`/`data`, distinct from lazy links with target wrappers; use the exported sync/async record selector types with materializers.

## Completion, preparation and delivery time

`afterWorkReadyChain` completes W after a normal work-ready chain, including empty/filtered chains. `externalSettlement` and explicit `DEFER_WORK_COMPLETION` retain host-controlled completion; `PAUSE_TRAVERSAL` pauses. Dispatch with work tickets or pre-work visitors. `workCompleted`/`subgraphCompleted` observations report committed W/C; callback completion and runner lifecycle are separate domains.

`prepareDag`/`prepareDagAsync` convert only their own engine discovery cycles into `{ kind: 'discoveryCycle', vertexIds }`, preserving the ordered closed witness (for `a → b → a`, `['b', 'a', 'b']`). Authored-definition `structuralCycle` issues contain SCC membership instead. Direct runners and runner `prepare()` still throw. Source callback/getter/iterator exceptions keep their exact values, even caller-thrown instances of engine error classes.

`emitEvents` selects records when delivered, including already buffered observations and deferred settlement events after resumption. Changing it never replays committed work or reruns callbacks. `visitorPhases` snapshots independently when a chain is admitted. Top-level inspection `executionOptions.emitEvents` controls current delivery; a chain's retained `emitEvents` is historical configuration. Explicit delivery selections narrow iterator kinds where supported. There is no emission-timing policy option.

Pending-request `operation: 'visit'` describes callback work in every family; tree/DAG sorting is `sortChildrenHints`. Source/iterator operations keep distinct labels. Callback phase, chain state/index, graph visit stage, W/C milestones, callback counts and runner lifecycle describe different facts. Root flags identify tree/graph container roots; walking `via: null` identifies an entry occurrence, not an independent traversal-start feature.
