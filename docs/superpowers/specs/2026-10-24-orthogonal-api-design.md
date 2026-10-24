# Orthogonal CTT public API design

The user approved fixing all ten findings in the API review of main `fe4ab25`.
This is the implementation contract for that review, not a release request.

## Boundaries

- Keep CTT generic. Agent dispatch, business outcomes, claims, retries, and durable storage belong to the host.
- Preserve arbitrary ID identity, explicitly supplied undefined IDs, exact thrown values, W versus C dependencies, and shared CJS/ESM runtime and declaration identity.
- Node remains >=22.12.0; verify Bun 1.4.4 and minimum TypeScript 4.7.4 consumers.
- Keep 100% source statements/branches/functions/lines coverage. Do not weaken checks.
- Package version remains 0.11.0; no npm publication or dependency changes.
- Canonical vertex fields remain `$data` and `$childHints`. Do not rename structural child refs to hints.
- Use compatibility aliases where they preserve a meaningful contract. Correct unsafe or coupled behavior rather than hiding it behind the new vocabulary. Document intentional changes.

## 1. Independent visitor and event selection

Canonical execution options on every runner:

```ts
type VisitorPhaseSelection<O extends string> =
  | 'all'
  | { include: readonly O[]; exclude?: never }
  | { exclude: readonly O[]; include?: never };
type TraversalExecutionOptions<O extends string> = {
  emitPhases?: readonly O[];
  visitorPhases?: VisitorPhaseSelection<O>;
};
```

Empty include means no callbacks; empty exclude means all callbacks. Emission
selection never changes callback selection. A supplied execution options object
patches the previous options by independent field; omitted fields retain their
effective value. Initial defaults emit all family phases and run all callbacks.
Passing no object also retains settings. Copy caller arrays before use and
preserve the already-admitted chain's configuration until its boundary completes.

Keep `iterateOver`, `enableVisitorFunctionsFor`, and `disableVisitorFunctionsFor`
as deprecated input aliases. For legacy lists, a non-null enable list wins over
disable, matching the documented contract; otherwise disable excludes phases.
Patch legacy selector fields against previous effective legacy fields before
normalization, so an emission-only update does not reset callbacks. Canonical
and legacy spellings for the same concern in one request are invalid, even when
they appear equivalent; unrelated concern aliases may coexist. Reject malformed
selectors and invalid phases before changing runner configuration. The canonical
input types reject simultaneous include/exclude and conflicting aliases.

Centralize normalization and reuse it in six runner families, async sessions,
and family config helpers. Internal compatibility fields may remain, but public
inspection exposes canonical effective `emitPhases` and `visitorPhases` as well
as deprecated fields. Do not fork scheduling semantics between families.

## 2. Explicit external completion

DAG configuration adds:

```ts
workCompletion?: 'visitorReturn' | 'externalSettlement';
```

Default `visitorReturn` preserves existing completion on a normally finished
ON_READY chain. In `externalSettlement`, finishing the ON_READY chain commits
its commands but leaves W incomplete and creates the existing guarded deferred
generation. This works with zero callbacks and with callbacks filtered out.
ON_COMPLETE remains automatic after W, discovery, children, and completion
prerequisites are satisfied. Existing DEFER_READY still performs its explicit
early-chain deferral in either policy; do not create a second generation.

Reuse the existing deferral/settlement transition and event semantics. Normal
external deferral must not discard commands that already committed on normal
chain completion. Synthetic bookkeeping roots do not require settlement;
completedWork seeds remain completed and do not get deferred again. Support
the DAG source modes supported by existing explicit deferral, lazy/eager
discovery where valid, sync/async, deletion, failure, and callback capacity.
Invalid policies fail before execution. This option does not dispatch work or
represent a claim, retry, business result, or durable token.

## 3. Source capability contracts

Tree adapter results must statically forbid `vertexId`, `dependsOn`, and
`dependsOnComplete` (including an explicit undefined field at runtime).
Introduce exported `MakeTreeVertexResult<T>`, `TreeFoundVertexResult<T>`,
`TreeOmittedVertexResult`, and `TreeSourceVertexResult<T>`. The legacy untagged
tree result accepts content/null but no graph metadata. Tree tagged found and
omitted share the established vocabulary; tree omission has no vertexId.
`TraversableTree`, `AbstractTraversableTree`, and async tree interfaces consume
the tree union. Existing graph-capable result types and prerequisite unions
remain graph contracts; keep their names and compatibility forms.

Normalize both families to the existing internal graph-capable result shape.
Reject all three unsupported tree metadata properties in shared runtime
validation, including dependsOnComplete, consistently across DFS/BFS and DAG
tree-source mode. Preserve own-property identity for graph results and first
thenable-accessor errors. Update built-in adapters' return annotations rather
than weakening the new tree contract or casting graph types into it.

## 4 and 7. Visitor definitions, ordered groups, and batching

All public registration entry points use a shared visitor-definition model:

```ts
type VisitorDefinition<F> = F | ({ visitor: F } & Partial<TraversalVisitorFunctionOptions>);
type VisitorGroupDefinition<F> = {
  visitors: readonly VisitorDefinition<F>[];
  commandCommitMode?: 'afterEachVisitor' | 'afterGroup';
};
type VisitorPhaseInput<F> =
  | VisitorDefinition<F>
  | readonly VisitorDefinition<F>[]
  | { groups: readonly VisitorGroupDefinition<F>[] };
```

These are the public input concepts; phase-specific callbacks must stay mapped
and inferred at each map key. Constructor/configure maps, canonical helper
maps, and setVisitorsFor accept VisitorPhaseInput. addVisitorFor keeps its
callback/options shorthand and appends without requiring bookkeeping. Add
`addVisitorGroupFor(order, group)` consistently across all six traversal classes.
Legacy full records remain acceptable inputs; caller-supplied addedIndex is
deprecated bookkeeping and must not be required by canonical definitions.
Assign fresh stable registration indexes internally. listVisitorsFor retains
full normalized typed records; its literal-phase list/set round trip must
preserve execution and group semantics. Retain broad common-command callback
reuse and reject wrong-phase/union-phase callbacks without any or bivariance.

Explicit groups execute in their array/registration order. Within a group,
priority is descending and equal priority preserves registration order.
Commit mode belongs to the explicit group; per-visitor explicit batching options
inside an explicit group are rejected to avoid conflicting policy ownership.
Default group mode is afterEachVisitor. A grouped afterGroup batch commits at
the end of that group. A later group's priority never crosses a group boundary.

Flat definitions and addVisitorFor remain convenient: sort them by priority and
registration index FIRST. Legacy per-visitor batching options then define
contiguous batches within that order: adjacent afterGroup entries buffer and
commit before the next afterEachVisitor entry or at the phase end. They must
never partition/reorder callbacks by commit mode. Deprecated resolutionStyle
maps to batching only. This intentionally corrects the old group-first ordering;
consumers needing that order express two explicit ordered groups.

Appending an individual visitor to an explicitly grouped phase appends it to a
final implicit flat group (create that group if needed); append an explicit
group after all existing groups. Normalize shared definitions at public
boundaries into flat records with enough immutable group metadata for the
kernel and list/set round trips. Reject invalid group/definition inputs before
mutating a traversal. The same definition object can configure a class or helper.

Retain meaningful legacy command behavior: halt preserves its uncommitted
continuation; deletion ends a chain; explicit DEFER_READY discards only the
current uncommitted batch and preserves earlier committed groups. State passed
to callbacks follows committed commands. Tests must prove changing commit mode
alone does not change callback order. Shared visitor normalization and group
execution belong in focused core/visitors modules, not duplicated class logic.

## 5. Typed mutation builders

MakeMutationCommandFunction must accept a meaningful rewrite-input type, default
to the output vertex-data type, and never erase it to any. Object mutation
helpers explicitly use a partial output property patch (`Partial<...['VertexData']>`)
so key-only/value-only patches remain supported. Keep generic full replacement
and object patch semantics distinct through named types or an explicit generic
parameter. Remove unsafe public factory any plumbing where it bypasses those
contracts; preserve legitimate unknown generic data.

Reject malformed object patches such as null/primitive rewrite values with a
clear TypeError before partial mutation. A patch may set value to undefined
when the output type permits it, using own-property detection. Preserve existing
delete/NOOP/assembly behavior and exact user assembler errors. Runtime validation
cannot infer a TypeScript data type; compile-time negative tests prove incorrect
key/value types are rejected by the real factory return type.

## 6. Safe tree queries and explicit editing

ResolvedTree.getChildrenOf returns detached arrays, matching graph queries.
ResolvedTree.getResolutionContextOf returns a detached context object; refs,
hints, and user data remain shallow identities. Introduce an exported
`ResolvedTreeView<T>` interface containing safe query methods (`getRoot`, `has`,
`getChildrenOf`, `getParentOf`, `getPathTo`, `getResolutionContextOf`) with readonly
collection/context types and no mutators/raw records. `ResolvedTree.asReadOnly()`
returns a stable live facade, and each tree runner exposes
`getResolvedTreeView()` for canonical querying. Existing getResolvedTree and
explicit mutable container/record methods remain advanced compatibility APIs;
document those mutation ownership boundaries. Do not change raw record getters
used by internal assembly or pretend refs/data are deeply immutable.

Keep structural consistency under normal validated container/runner edits. Test
that editing returned query arrays/contexts cannot change forward/reverse
topology, path results, or saved original-tree state; explicit supported edits
still appear in the live read-only view. Cover sync/async DFS/BFS and DAG tree
compatibility where they expose a tree. No durable snapshot feature is added.

## 8. Explicit stop reasons

Export `TraversalStopReason = 'paused' | 'awaitingSettlement' | 'finished' | 'failed'`.
Every runner and async execution/session surface exposes
`getStopReason(): TraversalStopReason | null`; inspection includes the same value.
INITIAL/RUNNING return null. HALT/iterator close produce paused after execution
actually halts; deferred quiescence produces awaitingSettlement. FINISHED/FAILED
produce the corresponding reason, preserving exact errors. Store the cause at
the stop boundary: settling work while halted does not rewrite the reason for
the preceding stop. Resume clears it until a new stop; async draining must not
report a completed pause prematurely. Keep existing statuses and chainable run.

## 9. Descriptive object resolution hooks

Add `resolveVertexHook` to the object adapter and rewriteObject option surface.
It takes the existing hint/context and returns `ObjectVertexHookResult<T>`:
`{kind:'useDefault'}` or a tagged tree found/omitted result from section3.
Found replaces the content; omitted skips; useDefault invokes existing default
resolution. There is no implicit null/undefined result in this canonical hook.
Preserve cycle checks and shallow identity. Reject invalid or graph-metadata
results before silently discarding fields.

Retain makeVertexHook/returnMe as deprecated compatibility inputs normalized into
the same behavior. Reject simultaneously configured canonical and legacy hooks
when both are active; omitted/undefined or the old null-disabled hook does not
conflict. Current examples use the canonical hook; legacy tests retain coverage.

## 10. Explicit identity names

Add `CTTRef.getRefId()`, `ResolvedGraph.getVertexId(ref)`, and
`ResolvedGraph.getVertexRefById(id)`. Include the new graph methods on snapshots
and every graph facade. Old getId/getIdOf/getVertexById remain deprecated aliases
using the same implementation and return identities. Make current docs/examples
prefer the new names; do not coerce arbitrary IDs or change CJS/ESM identity.

## Validation, migration, and integration

Each behavior change starts with a failing focused regression; positive/negative
public type cases cover every new input family. Validate all six traversal
families where shared code changes, including async pause/drain/deferred capacity,
exact failures, and arbitrary IDs. Keep source coverage100%. Final npm run check,
packed CJS/ESM and strict node/node16 consumers, exact Node22.12, Bun1.4.4, and
TS4.7.4 checks must pass. Current docs remain agent-first and distinguish the
unreleased checkout from published0.11.0. Extend the existing packaged migration
guide with these ten changes, preserve public anchors, verify links/snippets and
examples, and retain historical research. Do not add a duplicate storage layer.

After independent task and whole-branch review, push and merge under the user's
standing authorization, update local main, and verify remote CI. No publication.
