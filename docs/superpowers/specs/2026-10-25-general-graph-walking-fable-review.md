# Graph walking: Claude Fable API conformance review

Date: 2026-10-25. Reviewer: `claude-fable-5-1`, requested through Claude CLI with `--model fable --effort high`. The user explicitly approved disclosure of a fixed 29-file bundle; all reviewer tools were disabled. The invocation completed successfully. This is a design review, not implementation verification.

Reviewed artifacts: [design](2026-10-25-general-graph-walking-design.md), [implementation plan](../plans/2026-10-25-general-graph-walking.md), and selected current source/test contracts. The reviewed files were verified unchanged from the approved bundle. Bundle SHA-256: `749615d7209ab97af3161ba34b48b43a07ad2982111a137297b94ce7dfcc20f9`.

## Coordinator verification notes

The original reviewer response is preserved below. Its overall verdict is **conditionally ready**, with no re-architecture requested. Findings remain proposals; this record does not apply changes to the design or implementation plan.

- The export-path mismatch, overloaded meaning of `order`, `WalkVisitor`/`GraphWalkVisitor` naming inconsistency, hand-written command shape, and omission/content behavior difference are present in the reviewed text.
- The exact-cap outcome finding identifies a useful distinction: when the last permitted pull proves the frontier exhausted, a further pull is unnecessary. Depth handling also needs one authoritative rule. No implementation exists, so the review's coverage-gate prediction is a risk to avoid, not an observed test failure.
- Finding 11 overstates a contradiction: the plan already says **obsolete positional overloads**, not all deprecated inputs. Accepting legacy selector fields through shared capability types is deliberate and compatible with that sentence.
- Finding 7's proposed generic `InspectionFilters` is one reuse option, not a mandatory compatibility fix. A walking-specific filter shape is also possible under the already separate `GraphWalkInspection`. Renaming `sourceMode` to `walk` is not established as necessary: `kind: 'graph-walk'` already identifies the family. Naming the effective-selector field consistently remains useful.
- Finding 8 should be understood as structural contract reuse and preservation of the forbidden-arguments constraint. Type aliases do not have distinct nominal identity merely because they are separately declared.
- Uniform prefixes, catalog argument placement, and predicate-context derivation are API consistency choices to assess against ergonomics; the concrete undefined visitor type name is a straightforward plan defect.

## Original Claude review

**Verdict: conditionally ready.** The design and plan agree with each other on lifecycle, registration reuse, source caching, limits, and the inspection generic, and nothing requires re-architecture. Execution should wait for a small set of spec and plan text edits, mostly naming and packaging, plus two semantic clarifications that would otherwise produce an unreachable branch under the 100% coverage gate and a misleading outcome at an exact step cap. This is a review of bundled text only. No tests were run and no repository state was checked.

## Mismatch table

| Area | Existing families | Walking proposal | Classification |
| --- | --- | --- | --- |
| Subpath export | `./traversals/dag-traversal` at `package.json:127` | `./graph-walk` at `docs/superpowers/specs/2026-10-25-general-graph-walking-design.md:251`, `docs/superpowers/plans/2026-10-25-general-graph-walking.md:483` | Avoidable |
| Strategy option name | `order` means visit phase, `src/core/TraversalVisitor.ts:104`, `src/traversals/dag-traversal/lib/DagTraversalVisitor.ts:19` | `order: 'breadthFirst' \| 'depthFirst'` at spec:85, 97 | Avoidable |
| Type prefix | One family prefix, `Dag*` | `GraphWalk*` and `Walk*` mixed; `WalkVisitor` at plan:101 vs `GraphWalkVisitor` at plan:131 | Avoidable, plan self-contradiction |
| Phase enum | `XxxTraversalOrder`, values equal member names | `GraphWalkPhase`, lowercase values equal event kinds, spec:160, plan:80 | Justified, document |
| Source property | `traversableGraph` / `traversableTree` | `source`, spec:21 | Justified |
| Found payload | `vertex.vertexContent`, `src/core/TraversableTree.ts:34-41` | `data`, spec:42 | Justified |
| Omission | `satisfiesDependencies: true` required, `src/core/TraversableTree.ts:44-48` | bare `{ kind: 'omitted' }`, spec:44 | Justified |
| Found after accepted omission | DAG rejects, `docs/reference.md:371-372` | Silently ignored, spec:69 | Avoidable or document |
| Visitor signature | `(vertex, options)` | `(event, context)`, plan:101 | Justified |
| Visitor context fields | `vertexVisitIndex`, `curVertexVisitorVisitIndex`, chain state, `src/core/TraversalVisitor.ts:96-103` | `occurrenceIndex`, `observationIndex`, `visitorIndex`, no chain state, plan:93-99 | Partly avoidable |
| Command result type | Shared `TraversalVisitorCommand`, `src/core/TraversalVisitor.ts:43-52` | Ad hoc literal union, plan:86-91 | Avoidable |
| Commands accepted | Full set including subtree disable and chain state | HALT and NOOP only, spec:17, plan:43 | Justified |
| Emission default | All phases, `docs/reference.md:672` | Vertex only, spec:85 | Accepted, user approved |
| Pending record selection | Admitted event still yields on resume, `docs/reference.md:828` | New lease filters pending records, spec:19, 168 | Justified, documented |
| Legacy selector aliases | Deprecated | Accepted via shared input type, plan:123, 174, 282, against "no obsolete inputs" at plan:475 | Plan principle contradiction |
| Mandatory route bounds | n/a | Type-level at spec:99, runtime-only through configure at plan:127 | Spec overclaims |
| Inspection filters | `InspectionFilters` fixed to `VisitOrder`, `src/core/CoreInspection.ts:13-19` | "effective selectors" unnamed; `VisitOrder` must not grow, plan:51 | Plan omission |
| Inspection source mode | `'graph'` means a `TraversableGraph`, `src/core/CoreInspection.ts:27` | `sourceMode: 'graph'`, spec:233 | Avoidable |
| Catalog adapter shape | `forestFrom(roots, selectors)`, `src/sources/forestFrom.ts:11-14`; returns spreadable options, `src/sources/types.ts:6-13` | Roots inside selectors, bare source returned, plan:423-430 | Partly avoidable |
| Depth limit rule | n/a | Per-link eligibility at spec:181, 185 vs boundary suppression at spec:201 | Spec inconsistency |
| Exact step cap | n/a | Reports limited with empty frontier, spec:189-190 | Semantic |
| Async concurrency | Option accepted on async families | Fixed at one; option handling unspecified, spec:233, 237 | Gap |
| Terminal `close()` | Absent | Added, spec:235 | Justified |
| Strategy selection | Class per strategy | Option value, spec:97 | Justified |
| Helpers, namespace, capability generics | `traverseDag`, `dagTraversal`, two-parameter interfaces | `walkGraph`, `graphWalk`, defaulted third parameter, spec:241, 211-229, plan:49 | Consistent |

## Prioritized findings

**1. Subpath breaks the per-family export convention.** Every family subpath lives under `./traversals/<family>` while the plan adds a top-level `./graph-walk` even though the code lives at `src/traversals/graph-walk/` and builds to `dist/traversals/graph-walk/` (`docs/superpowers/plans/2026-10-25-general-graph-walking.md:55`, `:483`, `:490`). Remedy: export `./traversals/graph-walk` with the matching `typesVersions` key, update the spec sentence at `docs/superpowers/specs/2026-10-25-general-graph-walking-design.md:251` and the packed consumer imports at plan:490. Add a short alias only if the project wants one for every family.

**2. The `order` option collides with the library's meaning of order.** Across CTT, order names a visit phase, and the plan's own visitor context keeps `order: Phase` at plan:94 while the options object uses the same word for breadth versus depth (spec:85, 97, 115, plan:127). Remedy: rename the option to `strategy` in spec, plan, normalized options, and inspection.

**3. Two type prefixes, and the plan contradicts itself on the visitor type name.** Public contracts split between `GraphWalkSource`, `GraphWalkPhase`, `GraphWalkOptions`, `GraphWalkInspection` and `WalkVertex`, `WalkEdge`, `WalkEvent`, `WalkTarget`, `WalkLimits`, `WalkVisitor`; plan:101 defines the visitor type as one name and plan:131 refers to another. Remedy: pick one prefix for all exported walking types and reconcile the two plan lines. The DAG family uses one short prefix for types and the long form only for the class and enum, so `GraphWalk` class plus `Walk*` types, or `GraphWalk*` throughout, both work. Mixing does not.

**4. The per-link depth check is unreachable and will break the coverage gate.** Spec:201 says a found occurrence at the boundary never opens its adjacency, so no link candidate can ever have depth greater than the bound, yet spec:181 and spec:185 describe depth eligibility evaluated per link before the follow predicate, and plan:253 orders expansion before a depth cutoff. Remedy: state one rule. A found occurrence whose depth equals the bound evaluates `expandVertex`, then records the cutoff without opening adjacency; delete the per-link depth eligibility sentence.

**5. An exact step cap can report limited when exhaustion is already proven.** Spec:189-190 says the final permitted step that only observes end-of-stream records the step limit conservatively, but if no root iterator or frame remains open after that step, no further pull is needed to prove exhaustion. Remedy: report limited only when a pull or admission was actually prevented; report exhausted when the final step closes the last open enumeration and the frontier is empty. Update plan:270.

**6. Mandatory bounds are not type-enforced through configure.** Spec:99 says the options type expresses the bound requirement, but plan:127 makes configure a partial patch validated at runtime, and plan:127 asks for type tests without stating their expected outcome. Remedy: qualify the spec claim to construction, define a `GraphWalkConfigureInput` partial type in the plan, and state that the bound test is a runtime TypeError test.

**7. Inspection reuse needs a change the plan's file list omits.** Plan:51 forbids growing `VisitOrder`, but `InspectionFilters` is fixed to that union, so the walking "effective selectors" cannot reuse the existing filter shape. Remedy: make the filter type generic with a `VisitOrder` default in `src/core/CoreInspection.ts:13`, add that file to Task 1, name the walking field `iterableConfig` for parity, and use `sourceMode: 'walk'` so cross-family wrappers do not mistake a walker for a graph-source DAG runner.

**8. Walking command results should derive from the shared command type.** Plan:86-91 declares a fresh literal union rather than the existing `TraversalVisitorCommand` with its optional never-typed arguments, so declaration identity differs and the runtime rejection rule at plan:316 has no type counterpart. Remedy: define the result as the shared command type narrowed to HALT and NOOP.

**9. Found-after-omitted conflicts diverge silently from the DAG rule.** Spec:69 ignores a later inline result for a cached omission; the DAG rejects content after an accepted omission. Remedy: either adopt the DAG rejection or add a sentence to spec:69 and Task 10 documentation stating the difference and why a remote graph observed over time justifies it.

**10. Async walking should reject an explicit concurrency field.** Concurrency is fixed at one (spec:233, 237), but the async options never say what happens when a caller passes the familiar option. Remedy: reject an own `concurrency` field with a TypeError, mirroring the sync DAG constructor at `src/traversals/dag-traversal/DagTraversal.ts:129-135`, and add it to Task 5 assertions.

**11. The legacy-alias principle is stated inconsistently.** Plan:475 forbids obsolete inputs on a new API, while plan:123, 174, and 282 accept deprecated selector aliases because the shared capability input type includes them. Remedy: reword plan:475 to forbid deprecated positional overloads only, and note that deprecated alias fields are accepted for capability compatibility and documented as deprecated.

**12. Catalog adapter puts a value among selector functions.** Plan:423-430 places root IDs inside the selectors record, unlike the existing forest adapter where roots are a positional argument. Remedy: separate roots from selector callbacks, for example a first argument carrying items and roots. Returning the bare source rather than a spreadable options fragment is acceptable because walking has no extra flags.

**13. Predicate contexts repeat event vocabulary.** The follow and expand contexts at plan:120-121 restate fields of the edge and vertex events. Remedy: define them as the corresponding event records minus the unresolved field, so one vocabulary serves iteration, visitors, and predicates. Low priority.

## Accepted differences

- **Dedicated `source` contract** with target wrappers, inline hydration, and no milestone flag. The spec justifies this at spec:21 and spec:71, and adapters bridge the gap.
- **Record-first visitor callbacks.** Walking has no vertex reference or resolved tree, and the same record feeds iteration and visitors, which is tighter than the tree families' two shapes.
- **Renamed context indices and no chain state.** Occurrence and observation indices describe different units than vertex visits. Document that `commandCommitMode: 'afterGroup'` therefore affects only when HALT takes effect in this family.
- **HALT and NOOP only.** Pruning through predicates keeps traversal policy out of callbacks; `expandVertex` sees the same vertex data a visitor would.
- **Vertex-only emission default** and delivery-time selector narrowing. Both are user-approved and spec-documented; note that a no-argument iterator call is typed as the full union while delivering vertices by default.
- **Lowercase enum values** matching event kinds, which the phase narrowing type relies on.
- **Strategy as an option** rather than a class per strategy, avoiding four more runner families.
- **Terminal `close()`, fixed per-runner limits, and the summary outcome.** Retained source iterators justify a disposal method the tree families never needed. Extending a budget requires a fresh walk with repeated source I/O; that is a workflow limitation worth a sentence in the agent guide, not a blocker.
- **Edge event endpoints named `source` and `target`** while the edge record uses `from` and `to`. The family already uses `target` in link and target wrappers; the only cost is that `source` also names the options field.
