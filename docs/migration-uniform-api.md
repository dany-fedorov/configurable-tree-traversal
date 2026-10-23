# Migrate to the uniform API

[Documentation map](index.md) · [Agent workflows](agent-workflows.md) · [API reference](reference.md)

This guide describes the **unreleased API in this checkout**, relative to published npm **0.11.0**. The package version remains 0.11.0 until a separately requested release. Installing the current published package does not provide these new contracts.

CTT still owns generic discovery, dependencies, callback scheduling, traversal lifecycle, and in-memory progress. The host owns agent execution, business outcomes, retries, claims, artifacts, and durable storage. Data and hints remain opaque values.

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

Deferral ends the visitor chain, discards uncommitted group commands, skips remaining visitors, leaves work incomplete, and releases callback capacity. Already committed changes and external effects remain. `HALT_TRAVERSAL` instead retains its runner-wide resumable behavior. A normally returning no-op `ON_READY` visitor completes work and releases dependents; use deferral for externally executed work.

## Command batching

| Deprecated registration option                                        | Canonical option                                  |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `resolutionStyle: TraversalVisitorFunctionResolutionStyle.SEQUENTIAL` | `commandCommitMode: 'afterEachVisitor'` (default) |
| `resolutionStyle: TraversalVisitorFunctionResolutionStyle.CONCURRENT` | `commandCommitMode: 'afterGroup'`                 |

The `afterGroup` group runs **before** the `afterEachVisitor` group, even when an individual priority in the second group is higher. Each group uses descending priority and then registration order. Group commands commit after that group; remaining commands commit after each visitor. This preserves execution order and names command timing accurately. Async `concurrency` is independent. Aliases remain accepted and records normalize both views; contradictory explicit old/new settings throw.

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

| Deprecated source result                                       | Canonical source result                                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `{ vertexContent, vertexId?, dependsOn?, dependsOnComplete? }` | `{ kind: 'found', vertex: { vertexContent, vertexId?, dependsOn?, dependsOnComplete? } }` |
| `{ vertexContent: null, vertexId? }`                           | `{ kind: 'omitted', vertexId?, satisfiesDependencies: true }`                             |
| Lookup `undefined`                                             | `{ kind: 'missing' }`                                                                     |

`found` contains non-null content. `omitted` deliberately excludes a vertex and satisfies its W and C prerequisites. `missing` cannot satisfy prerequisites and is valid only from `resolvePrerequisite`; it is invalid from `makeRoot`/`makeVertex`. Bare `null` is invalid everywhere; bare `undefined` is invalid from root/hint callbacks. Existing untagged `MakeVertexResult` and lookup-only `undefined` remain deprecated inputs. These rules add no silent omission path.

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

Own-property ID presence is significant: `{ vertexId: undefined }` supplies the real `undefined` ID. Omitting the field during prerequisite lookup inherits the requested ID. Explicit IDs must match using SameValueZero; symbols and object references retain identity. Roots/hints accept `SourceVertexResult`; prerequisite lookup accepts `PrerequisiteResolutionResult`, including `MissingVertexResult`. Async adapters accept value-or-promise equivalents.

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

Use the same options shapes with `traverseDepthFirstAsync`, `traverseBreadthFirstAsync`, and `traverseDagAsync`; they return promises of runners, while synchronous helpers return runners. DAG helpers accept exactly one `traversableGraph`/`traversableTree`; tree helpers use `traversableTree`. Omit `visitors` to just resolve the source. Helper maps contain callbacks, while constructor/configuration maps contain full registration records. Direct positional calls remain deprecated overloads with their established behavior; the canonical form has no second nested source/configuration location.

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
