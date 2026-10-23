# Uniform CTT API design

The user approved all ten findings from the 0.11.0 API review, specifying
`$data` and `$childHints` for canonical vertex content. This document records
implementation decisions within that approval. It is not a publication request.

## Boundaries and compatibility

CTT remains a generic traversal and scheduling library. Business outcomes,
agent dispatch, durable storage, claims, and retries remain host responsibilities.
Preserve arbitrary ID identity, exact thrown values, sync/async behavior, tree
traversal ordering, and CJS/ESM identity. Node remains >=22.12.0; declarations
remain compatible with the existing minimum TypeScript verification.

Use deprecated aliases/overloads for existing spelling and construction forms
where practical. The independent graph-dependency defaults and completed work
state are intentional behavior changes, documented in a consumer migration
guide. Do not silently preserve the old graph behavior through heuristics.
Do not change the package version or publish as part of this implementation.

## 1. Root dependencies

Ordinary graph roots honor declared work and completion prerequisites, whether
or not seeds, a resolver, or eager discovery are configured. Add
`rootDependencies?: 'honor' | 'ignore'` (default `honor`); `ignore` explicitly
restores ignoring root work prerequisites, independent of unrelated options.
It does not ignore completion prerequisites. Synthetic catalog roots remain
bookkeeping and have no work dependencies. Tree traversal semantics remain.

## 2. One visitor command protocol

Add `TraversalVisitorCommandName.DEFER_READY`. Canonical result:

```ts
return { commands: [{ commandName: Command.DEFER_READY }] };
```

Keep the exported symbol as a deprecated compatibility input, normalized into
the same transition. Deferral is valid only at DAG ON_READY. It ends that
visitor chain, discards uncommitted group commands, skips remaining visitors,
leaves work incomplete, releases callback capacity, and preserves committed
effects. Deferral must be the sole command in its result. Reject mixed command
results before applying any commands; this avoids ambiguous rollback/order
semantics. HALT keeps its existing resumable runner-wide behavior. Command
types must express the exclusive deferral result.

## 3. Explicit structural dependency inheritance

Add `implicitParentDependency?: boolean`. Graph sources default to `false`:
omitted `dependsOn` means no work prerequisites. `true` restores implicit work
dependency on a discovery parent only when `dependsOn` is omitted. Explicit
lists, including `[]`, always win. Synthetic catalog parent never gates work.
Tree sources keep their structural execution order and parent dependencies.
Roots and detached prerequisite vertices have no discovery parent.

## 4. Name command batching accurately

Canonical visitor registration option:
`commandCommitMode: 'afterEachVisitor' | 'afterGroup'`. Default afterEachVisitor.
The afterGroup visitors execute in priority/registration order before the
afterEachVisitor visitors, with their commands committed after that group.
This changes vocabulary, not execution concurrency or group ordering.
Keep deprecated `resolutionStyle` values as aliases. Normalize registration
options/records centrally. Reject contradictory explicit old/new values.
The async `concurrency` option remains independent.

## 5. Phase-aware visitor contracts

Infer the actual phase in `addVisitorFor`, configuration visitor maps, simple
helper maps, and visitor input `order` for DFS, BFS, DAG and async counterparts.
Permit deferral only in ON_READY. Permit child-hint rewriting only in PRE_ORDER,
LEVEL_ORDER, and ON_READY. Keep runtime checks for JavaScript and unsafe casts.
General visitor type aliases remain usable with default phase parameters.
Eager-discovery topology restrictions remain runtime-validated; do not invent
a large static configuration state machine to encode them.

## 6. Completion vocabulary

Canonical progress state is `work: 'completed'`, rather than `succeeded`.
Keep `workCompleted`, `completedWorkIds`, and `completedWork` naming consistent.
Canonical settlement outcome is `{ kind: 'workCompleted' }` or
`{ kind: 'traversalFailed', error }`. Keep deprecated `{ ok: true/false }`
inputs through normalization. Both forms share generation checks, replay
equality, runner failure, exact errors, and async wakeup behavior. This models
traversal feedback only, without per-work-item business failure or retry policy.

## 7. Explicit source resolution

Provide exported discriminated source results:

```ts
{ kind: 'found', vertex: { vertexContent, vertexId?, dependsOn?, dependsOnComplete? } }
{ kind: 'omitted', vertexId?, satisfiesDependencies: true }
{ kind: 'missing' } // prerequisite lookup only
```

Found content is non-null. Explicit omission means deliberately omitting the
vertex and satisfying its work/completion prerequisites. Missing means lookup
did not find the ID and cannot satisfy dependencies. Tree and graph root/hint
sources accept found/omitted; prerequisite resolution additionally accepts
missing. Keep old MakeVertexResult (including `vertexContent: null`) and
lookup-only `undefined` forms as deprecated inputs. Bare `null` results are
invalid; bare `undefined` is invalid for root/hint resolution. Do not add new
silent omission paths.
Normalize at a shared source boundary, preserving own-property ID presence,
including an explicitly supplied undefined ID, and preserving arbitrary IDs.
Do not permit missing to silently act as omission for root/hint resolution.

## 8. Phase-neutral hint command

Add `REWRITE_CHILD_HINTS` with existing `{ newHints }` payload, usable in the
allowed phases above. Keep `REWRITE_VERTEX_HINTS_ON_PRE_ORDER` as a deprecated
alias with equivalent behavior and phase restrictions. Use the canonical name
in current docs, examples, and new tests.

## 9. Uniform convenience helpers

All six helpers support canonical single options objects, containing the
source in exactly one location, a phase-keyed simple visitor map, and traversal
options. Tree source key is `traversableTree`; DAG uses its existing exclusive
`traversableGraph`/`traversableTree` choice. `visitors` maps phases to callbacks
instead of internal registration records. Legacy positional overloads remain
deprecated and preserve their established behavior. Canonical configuration
does not accept a second nested source. Sync returns runner; async returns its
promise. Share option normalization only where it reduces genuine duplication.

## 10. Descriptive vertex content

Canonical input and Vertex properties are `$data` and `$childHints`. Preserve
deprecated `$d` and `$c` construction/property access through explicit aliases
or normalization. Canonical clone fields work, including explicitly undefined
data. Reject ambiguous mixed canonical/legacy input shapes rather than silently
choosing a winner. Hints remain opaque values, data remains opaque caller data.
Resolved-tree structural children are actual refs, not hints: avoid incorrectly
renaming unrelated resolved-tree child collections into hint terminology.

## Verification and documentation

Behavior regressions precede implementation. Add positive and negative public
type cases. Preserve 100% source coverage; do not weaken thresholds. Test shared
behavior across sync/async and tree/graph families. Run `npm run check`, packed
consumer checks including CJS/ESM identity, and the existing compatibility
runtime/type checks. Update README (agent use cases first), reference,
agent-workflows, docs index, AGENTS guidance, runnable examples, and package
files for a packaged migration guide. Historical docs remain historical.

## Acceptance mapping

The ten numbered sections correspond exactly to the ten approved findings.
Completion requires each canonical API to work, old forms promised above to
work, invalid combinations to fail clearly, migration docs to name changed
defaults, and the full repository checks to pass.
