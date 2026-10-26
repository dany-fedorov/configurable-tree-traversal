# API clarity and idiomatic usage: Claude Fable high review

Reviewed commit: `61c91ebd0e7c86a0c925d06afbbdb5a54c5a1d21`. Requested by the user on 2026-10-26. Claude CLI 2.1.310 ran with `--model fable --effort high`; the actual model was `claude-fable-5-1`. Review tools were restricted to Read/Glob/Grep in a fixed snapshot of 452 tracked files (9,867,880 bytes). The run completed successfully, and snapshot hashes were unchanged afterward. The full reviewer report below states its actual reading scope and limitations.

This is a review and cleanup proposal, not an implemented redesign. Runtime source and public contracts remain unchanged. Eight findings were rated Important and twelve Minor by Claude; it found no blocking implementation defects. Those ratings are the reviewer's, not automatic approval of each proposed fix.

## Maintainer assessment

The strongest cleanup candidates are inconsistent validation-result shapes (2), the ambiguous work-only `dependencies` selector (3), the visitor/event meaning of `ON_READY` (5), and a deprecated alias on an unreleased coordinator (6). Omission syntax (1) deserves a focused design decision. Keep useful family differences and do not make materialized catalog APIs carry lazy-source machinery merely to use identical records.

| Finding | Assessment and proposed action |
| --- | --- |
| 1: omission acknowledgement | Confirmed. Tree results require dependency terminology even where it has no useful meaning. Prefer plain tagged tree omission. For DAGs, the literal field is an explicit acknowledgement that omission satisfies W/C, not a configurable boolean; removing it is a semantic-clarity decision, not just redundant-field deletion. Never imply a supported false/blocked-omission mode. |
| 2: validation results | Confirmed. A common `invalid.issues` shape can honestly wrap existing dependency diagnostics as a milestone issue. This need not convert exact caller failures or structural discovery exceptions into validation results. Agree this is worth unifying before publication. |
| 3: dependency vocabulary | Confirmed, but milestone tags are not competing field names. First align collection selectors with established `dependsOn` / `dependsOnComplete`, or explicitly name work dependencies. Keep `work` / `completion` query tags and meaningful relation/diff labels; do not mechanically rename every layer. |
| 4: walking link shapes | Different shapes are real; severity is overstated. A catalog owns all payloads and validates membership, while lazy targets may carry inline resolutions/omissions. Accepting full `GraphWalkLink` in a catalog introduces unused or conflicting hydration authority. Prefer explaining the adapter mapping and consider destination naming separately. |
| 5: readiness versus emitted completion | Confirmed and high priority for learnability. Lead dispatch examples with tickets; explain next to phase selection that ON_READY visitors run before work while emitted events report committed work. A canonical emission vocabulary could be designed separately while preserving published selectors/timing. Never change event timing as a naming fix. |
| 6: deprecated fail alias | Confirmed absent from the v0.11.0 tag. The prior correction unnecessarily preserved an unreleased alias. Prefer only `failTraversal` for the new published coordinator. Unreleased source consumers would still need a migration note; 'unreleased' does not mean literally zero migration cost. |
| 7: walking ID defaults | Optional convenience, not an inference fix. Verified with TypeScript 4.9.5: supplying `<Data, Edge>` chooses `ID = unknown`; TypeScript does not then infer the ID from the source. Current `new GraphWalk({ source })` already infers all three accurately. Add defaults only if unknown is the intended contract for partially annotated usage. |
| 8: two vertex descriptions | Confirmed `.vertices` is a projection that omits omission slots. Keep the useful convenience projection if its purpose is explicit; make `.definition` the clearly documented round-trip/revision representation. Removal is not required to eliminate ambiguity. |
| 9: enum/string vocabulary | Subjective, consistent with existing families. Document enum use; no independent API redesign needed. |
| 10: three inspections | Lead with `summary()` for progress and `inspectDag()` for dependencies; `inspect()` remains valuable for shared lifecycle tooling. Preserve the newly consistent execution-state capability. |
| 11: session visitors | Existing composition through runner plus coordinator works and keeps host-only sessions simple. Allowing logging visitors is a possible convenience feature, not a correctness or idiomatic-use requirement. Defer pending concrete workflow demand. |
| 12: limits replacement | Intentional atomic record replacement permits clearing old bounds. Other fields also replace arrays/selections; 'everything else patches' is too broad. Do not introduce recursive merge and explicit-undefined clearing without a full configuration/reset design. |
| 13: id/vertexId | Confirmed published vocabulary cost. Do not add duplicate identity fields merely for visual uniformity. |
| 14: subtree/subgraph/completion | Confirmed legacy vocabulary. Use completion terminology consistently in explanations while preserving meaningful event names and published fields. |
| 15: hasSingleSink | Confirmed structural-child query and absent from the current reference. Document the traversed relation; dependency edge orientation makes an unqualified sink ambiguous. |
| 16: slots/omission identity | The encodings preserve known undefined IDs versus anonymous omissions at different layers. Explain the representation boundary; they need not become interchangeable. |
| 17: edge source/depth | Context distinguishes a source vertex from a source adapter. Keep explicit target-depth documentation; renaming alone has limited value. |
| 18: mutable low-level fields | Confirmed legacy surface. Prefer safe facade APIs; defer breaking encapsulation changes to a versioned redesign. |
| 19: trailing ID parameter | Accepted compatibility cost. Prefer inferred sources; do not reorder established generics. |
| 20: IDs versus nested records | Justified adapter distinction, already described in the collection/forest guide. No change required. |

## Proposed next scope

1. Unify expected validation failures under `issues`, preserving exact exception boundaries; remove the unreleased `fail` alias.
2. Decide tree/DAG omission syntax and align work/completion selector vocabulary. These deserve explicit design treatment because omission controls dependency satisfaction.
3. Improve the canonical learning path: tickets for dispatch, completion events for observations, `.definition` for faithful reconstruction, and relation-qualified queries. Document the structural meaning of `hasSingleSink`.
4. Consider ID defaults and destination-field names only after checking their type/semantic tradeoffs. Keep convenient catalog inputs, vertex projections, and the consistent execution-state interface.

## Verification of this review

Checked findings against current source and local `v0.10.0` / `v0.11.0` tags. The tagged release contains established dependency fields, event order, progress and `hasSingleSink`; it does not contain coordination/preparation/walking helpers. A standalone compiler probe verified full-source inference versus partial explicit generic defaults; no runtime tests were rerun because no implementation changed. Existing integration results for the reviewed commit are recorded in [the previous review](2026-10-26-package-fable-review.md). CLI prompt, output, model metadata, snapshot manifest and compiler probe are retained under `/tmp/ctt-api-clarity-fable-20261026-61c91eb/`.

## Original reviewer report

## 1. Ranked findings

No blocking defects. I found no case where the implementation contradicts its documented contract. The findings below are clarity, naming, and shape problems. Eight are Important; the rest are Minor. Compatibility notes distinguish the published 0.11.0 surface from unreleased additions.

**Important 1. Omitted source results require a literal `satisfiesDependencies: true`, even for trees.**
Evidence: `src/core/TraversableTree.ts:44-48` and `src/core/TraversableTree.ts:81-84` type the field as the literal `true`; `src/core/drivers/normalizeSourceResult.ts:64-67` throws on anything else. The field carries zero information, since `false` is not a legal value. For DFS/BFS tree adapters there are no dependencies at all, yet every omitted child must say it satisfies them (see `examples/graph-walk-references-example.ts:70`). A user reading `{ kind: 'omitted', satisfiesDependencies: true }` reasonably infers a `false` variant exists and tries to express "skip this child but keep dependents blocked", which is impossible. The walking family already uses the honest shape `{ kind: 'omitted' }` (`src/traversals/graph-walk/GraphWalkSource.ts:8-10`). Smallest fix: make the field optional on graph results and drop it from tree results, keeping the DAG semantics in the type's doc comment. Compatibility: tagged results are listed under Unreleased in `CHANGELOG.md:29`, so this is free. Code/API change.

**Important 2. The prepare family returns two different `invalid` shapes.**
Evidence: `prepareDag` returns `{ kind: 'invalid', diagnostics }` (`src/traversals/dag-traversal/lib/PreparedDag.ts:94-96`), while `prepareDagDefinition`, `composeDag`, and `reviseDag` return `{ kind: 'invalid', issues }` (`src/traversals/dag-traversal/lib/DagDefinition.ts:52-54`, `lib/DagRevision.ts:25-31`). All four produce the same `PreparedDag`. A host cannot write one `reportInvalid(result)` helper, and `prepareDagDefinition` already wraps the same diagnostics as `{ kind: 'milestone', diagnostics }` (`prepareDagDefinition.ts:24-27`). Smallest fix: have `prepareDag` return `issues: [{ kind: 'milestone', diagnostics }]` so `PrepareDagResult` equals `DagDefinitionResult`. Compatibility: all four functions are unreleased. Code/API change.

**Important 3. The two dependency relations have four spellings across layers.**
Evidence: `dependencies`/`completionDependencies` in selectors (`src/sources/types.ts:15-20`), `dependsOn`/`dependsOnComplete` in definitions (`lib/DagDefinition.ts:12-18`), `workDependencies`/`completionDependencies` in diff aspects and walking relation selection (`lib/DagRevision.ts:34-38`, `walkSourceFromDag.ts:18-21`), and `milestone: 'work' | 'completion'` in queries (`src/core/errors/DagTraversalStallError.ts:4-7`). The reference even needs a translation table (`docs/reference.md:220-227`). The asymmetric selector pair is the real trap: `dependencies` reads as "all dependencies" but means work only. Smallest fix: adopt `work`/`completion` as the only adjective pair for new surfaces: selectors `dependsOn`/`dependsOnComplete` (matching definitions) or `workDependencies`/`completionDependencies` everywhere unreleased. Compatibility: `dependsOn`/`dependsOnComplete` shipped in 0.10.0 and stay; the other three spellings are unreleased. Code/API change.

**Important 4. Walking spells "edge destination" three ways and "found payload" two ways.**
Evidence: catalog links use `{ to, data }` (`walkSourceFrom.ts:39-43`), source links use `{ target: { vertexId }, data }` (`GraphWalkSource.ts:17-20`), and edge records use `from`/`to` (`GraphWalkEvent.ts:4-9`). A found resolution is `{ kind: 'found', data }` (`GraphWalkSource.ts:8-10`) but a found edge target is `{ kind: 'found', vertex }` (`GraphWalkEvent.ts:23-25`). A user who writes a custom source after using `walkSourceFrom` will type `{ to, data }` and get a confusing structural error. Smallest fix: let `walkSourceFrom` accept the same `GraphWalkLink` shape, or rename the source link field to `to: GraphWalkTarget`. Compatibility: unreleased. Code/API change. The found/vertex split is defensible, since one is a resolution and the other a resolved vertex, but a one-line doc note would help.

**Important 5. The `ON_READY` iteration event is a post-work event.**
Evidence: `DagEvent` pairs `order: ON_READY` with `kind: 'workCompleted'` (`lib/DagTraversalVisitor.ts:68-77`); `docs/reference.md:643` confirms deferred ON_READY events emit only on settlement. A user who writes `for (const e of runner.getIterable({ emitPhases: [ON_READY] })) dispatch(e)` dispatches after the work is already accepted. The visitor named ON_READY runs pre-work, the event named ON_READY fires post-work. The added `kind` discriminant and the reference wording mitigate this well. Compatibility: event timing shipped in 0.8.0, so a rename is a major-version decision. Docs suffice now; record the rename (`WORK_COMPLETED`/`SUBGRAPH_COMPLETED` emission phases) as a future-major item.

**Important 6. A deprecated alias exists for a method that was never published.**
Evidence: `fail` is marked deprecated in favour of `failTraversal` (`coordinateDag.ts:40-41`, `:101`); `CHANGELOG.md:5` places both under Unreleased. Shipping a brand-new surface with a deprecated member is pure noise. Smallest fix: delete `fail`. Compatibility: none. Code change.

**Important 7. Walking generics have no `ID` default; every DAG type does.**
Evidence: `class GraphWalk<Data, Edge, ID>` (`GraphWalk.ts:24`), `GraphWalkOptions<Data, Edge, ID>` (`GraphWalkOptions.ts:94`), versus `PreparedDag<Data, ID = unknown>`, `DagDefinition<Data, ID = unknown>`, `DagTraversal<T, R = T, ID = unknown>`. Writing `new GraphWalk<Note, Link>(...)` fails with "expected 3 type arguments". Smallest fix: `ID = unknown` on all walking types. Compatibility: unreleased. Type-only change.

**Important 8. `PreparedDag.vertices` duplicates `definition.vertices` with a lossy shape.**
Evidence: `vertices[i].children: readonly ID[]` (`lib/PreparedDag.ts:10-16`) is derived from `definition.vertices[i].slots` by dropping omissions (`lib/makePreparedDag.ts:40-54`). The migration guide warns that rebuilding from `.vertices` loses facts (`docs/migration-uniform-api.md:29`). Two parallel vertex descriptions on one object invite the wrong one. Smallest fix: remove `vertices` or document it as a convenience projection and point `addVertex`/`replaceVertex` examples at `definition.vertices`. Compatibility: unreleased. Code/API change, or docs if kept.

**Minor 9. Mixed enum and string-literal vocabulary inside one options object.**
`strategy`, `revisit`, and event `kind` are string literals (`GraphWalkOptions.ts:16-17`), but phases are a string enum (`GraphWalkPhase.ts:1-5`), so `emitPhases: ['edge']` is a type error and the enum must be imported. The visitor context calls the phase `order` (`GraphWalkVisitor.ts:19-25`) while options call it `emitPhases`. Consistent with tree/DAG enums, so a justified cost; a doc line explaining why the enum is required would help. Subjective.

**Minor 10. Sessions expose `inspect()`, `inspectDag()`, and `summary()`.**
`inspect()` returns engine frames and chains (`src/core/CoreInspection.ts`), which a host-controlled session never needs. `inspectDag()` is the one hosts want (`coordinateDag.ts:42-44`). Docs suffice: lead with `inspectDag()` in the ticket section and mention `inspect()` last.

**Minor 11. `createSession` forbids `visitors`.**
`lib/PreparedDag.ts:56-61` types `visitors?: never`; adding a logging `ON_COMPLETE` visitor forces the two-step `createRunner` plus `coordinateDag` path. Allowing `visitors` in session options is a small, unreleased addition. Subjective.

**Minor 12. `configure({ limits })` replaces while every other field patches.**
`GraphWalkOptions.ts:102-109` documents replacement. It diverges from the field-wise patch rule stated for `emitPhases`/`visitorPhases`. Documented; a `limits: { maxDepth: undefined }` clearing form would unify it, but that is subjective.

**Minor 13. Progress and diagnostics use `id` where everything else uses `vertexId`.**
`DagVertexProgress.id` (`lib/DagProgress.ts:23-32`) and `dependencies[].id` (`DagTraversalStallError.ts:21`) versus `vertexId` on tickets, definitions, milestones, and events. Published in 0.9.0; add `vertexId` as a non-breaking sibling field later or leave as is.

**Minor 14. "subtree", "subgraph", and "completion" name the same milestone.**
`completedSubtreeIds`, `subtreeComplete`, `counts.subtreeCompleted` (`lib/DagProgress.ts`) versus event `kind: 'subgraphCompleted'` and query `milestone: 'completion'`. Published fields constrain this; prefer "completion" in new text and the unreleased event kind could become `completionCommitted`. Subjective.

**Minor 15. `hasSingleSink` is an undocumented root export with an ambiguous name.**
`hasSingleSink.ts:4-13` counts vertices with no structural children. In a dependency DAG "sink" usually means no dependents. No mention in README or reference. Document or deprecate. Published, so docs suffice.

**Minor 16. `slots` is novel vocabulary, and omission identity has two encodings.**
`DagDefinitionSlot` omitted uses `identity: { vertexId } | null` (`lib/DagDefinition.ts:5-10`); `ChildSlot` omitted uses own-property presence of `vertexId?` (`src/core/graph/types.ts:47-52`). Both are public. Docs explain each, but a reader meeting both will assume they are interchangeable. Docs suffice.

**Minor 17. Edge record field `source` collides with the `source` option; edge `depth` is the target's depth.**
`GraphWalkEvent.ts:18-26`; `lib/WalkKernel.ts:230-239`. Destructuring `({ source })` in a visitor yields a vertex, not the walking source. Docs suffice, or rename to `from`/`to` vertices to mirror `edge.from`/`edge.to`. Subjective.

**Minor 18. `DagTraversal.icfg` and `visitors` are public mutable fields.**
`DagTraversal.ts:33-34`; `coordinateDag.ts:68-79` reads `runner.icfg.workCompletion`. Leaky but published. No change now.

**Minor 19. Selecting an ID type forces restating the rewrite parameter.**
`DagTraversal<Workflow, Workflow, TaskId>` (`examples/agent-orchestration-example.ts:17`). Trailing-parameter placement is the only compatible option, so this is a documented cost. Docs already recommend inference through typed sources.

**Minor 20. `children` returns IDs in `GraphSelectors` and items in `ForestSelectors`.**
`src/sources/types.ts:15-27`. Same name, different type, caught by the compiler. Justified; a one-line note in the selector table suffices.

## 2. Cross-family mismatch table

| Concern | Tree (DFS/BFS) | DAG | Walking | Assessment | Evidence |
| --- | --- | --- | --- | --- | --- |
| Builder → `makeRunner()` → `run()`/`getIterable()` | yes | yes | yes | Useful consistency | `GraphWalk.ts:90`, `DagTraversal.ts:124` |
| Shared `TraversalExecutionState` / `SyncTraversalExecution` with inspection default | yes | yes | yes | Useful consistency | `src/core/TraversalExecution.ts` |
| `emitPhases` / `visitorPhases` patch semantics | yes | yes | yes | Useful consistency | `TraversalRunnerIterableConfig.ts` |
| Phase vocabulary | `*Order` enum | `*Order` enum | `GraphWalkPhase` enum; context field still `order` | Avoidable mismatch (naming only) | `GraphWalkVisitor.ts:20` |
| Omitted result shape | `{kind:'omitted', satisfiesDependencies:true}` | same | `{kind:'omitted'}` | Avoidable mismatch | Finding 1 |
| Found result shape | `{kind:'found', vertex:{vertexContent}}` | same | `{kind:'found', data}` | Justified difference (no hints in walking) | `GraphWalkSource.ts:8` |
| Visitor payload | `Vertex` + options | `Vertex` + options | event record + context | Justified difference | `docs/reference.md:116` |
| Allowed commands | full set | full set + `DEFER_READY` | `HALT`/`NOOP` only | Justified difference | `GraphWalkVisitor.ts:11-17` |
| `ID` generic default | n/a | `ID = unknown` | none | Avoidable mismatch | Finding 7 |
| Invalid-result field | n/a | `diagnostics` vs `issues` | n/a | Avoidable mismatch | Finding 2 |
| Omission with known identity | n/a | `identity: {vertexId}\|null` vs own `vertexId?` | n/a | Avoidable mismatch (two encodings) | Finding 16 |
| `summary()` | none | work/readiness | counts/outcome | Justified difference | `GraphWalkSummary.ts`, `DagProgress.ts` |
| Terminal `close()` | none | none | runner-level | Justified difference (source iterators) | `AsyncGraphWalkRunner.ts:51` |
| Concurrency option | async only | async only | rejected | Justified difference, well documented | `normalizeWalkOptions.ts:137` |
| W/C spelling | n/a | `dependsOn`/`dependsOnComplete`, `dependencies`/`completionDependencies`, `work`/`completion` | `workDependencies`/`completionDependencies` | Avoidable mismatch | Finding 3 |

## 3. Minimal cleanup proposal

Straightforward corrections, all on unreleased surface, no design debate:

1. Delete the `fail` alias (Finding 6).
2. Add `ID = unknown` defaults to all walking types (Finding 7).
3. Make `satisfiesDependencies` optional on graph omissions and remove it from tree omissions (Finding 1).
4. Unify `PrepareDagResult` with `DagDefinitionResult` by returning `issues` (Finding 2).
5. Accept `GraphWalkLink` in `walkSourceFrom`, or rename the source link field so one spelling covers both (Finding 4).
6. Document `hasSingleSink`, lead the ticket section with `inspectDag()`, and note the `ON_READY` event timing beside `emitPhases` in the DAG section (Findings 5, 10, 15).

Decisions that need a design call:

7. Pick one adjective pair for W/C across unreleased selectors, diff aspects, and walking relations (Finding 3). My recommendation is `dependsOn`/`dependsOnComplete` for selectors, since they mirror definitions, and `work`/`completion` nouns elsewhere.
8. Drop `PreparedDag.vertices` or label it a projection (Finding 8).
9. Allow `visitors` on `createSession` (Finding 11).
10. Reserve the ON_READY event-phase rename for a future major (Finding 5).

Before/after for the most valuable changes:

```ts
// Finding 1: tree adapter omission
// before
makeVertex: () => ({ kind: 'omitted', satisfiesDependencies: true })
// after
makeVertex: () => ({ kind: 'omitted' })

// Finding 2: one invalid handler for every prepare-like call
// before
const a = prepareDag(src);           if (a.kind === 'invalid') show(a.diagnostics);
const b = prepareDagDefinition(def); if (b.kind === 'invalid') show(b.issues);
// after
for (const r of [prepareDag(src), prepareDagDefinition(def), composeDag(parts)])
  if (r.kind === 'invalid') show(r.issues);

// Finding 4: same link shape in catalog and custom sources
// before
walkSourceFrom(items, { id, roots, outgoing: i => i.links.map(to => ({ to, data })) });
const custom: GraphWalkSource<N, E, string> = { roots, outgoing: v => [{ target: { vertexId }, data }] };
// after
walkSourceFrom(items, { id, roots, outgoing: i => i.links.map(vertexId => ({ target: { vertexId }, data })) });

// Finding 7
// before
new GraphWalk<Note, Link, string>({ source });
// after
new GraphWalk<Note, Link>({ source });   // ID defaults to unknown, or infers from source
```

**Scope inspected and limitations.** I read README, the four shipped docs, the roadmap spec, and every public index file. I read the full public type and helper sources for walking (`GraphWalk*`, options, source, event, visitor, summary, inspection, `walkGraph*`, `walkSourceFrom*`, `normalizeWalkOptions`), for DAG (`PreparedDag`, `prepareDag`, `prepareDagDefinition`, `coordinateDag`, `DagTraversal`, instance config, progress, inspection, definition, fragments, revision, diff, filtered visitors, `hasSingleSink`, `traverseDag`, `makePreparedDag`), for sources (`graphFrom`, `forestFrom`, `materialize`, types), and for core (`TraversableTree`, `TraversableGraph`, `TraversalVisitor`, iterable config, execution interfaces, inspection, `Vertex`, `TreeTypeParameters`, `TraversalRunner`, graph types, stall error). I read `TraversableObjectTree`, its config, `traverseDepthFirst`, DFS config, and the `rewriteObject` signatures. I grep-verified `DagTraversalRunner` public methods, `ResolvedGraph` method names, `WalkKernel` event ordering and depth, and `normalizeSourceResult` omission handling. I read four examples and three type-check suites. I did not read the kernels, drivers, or scheduling internals in full, the BFS or async tree classes, the remaining examples, or any runtime test, and I ran nothing. Behavioral claims above rest on the documented contract plus the code paths cited; no claim depends on an unexecuted test.