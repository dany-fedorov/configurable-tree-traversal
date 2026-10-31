# Independent documentation review — Codex Astra high

Reviewed the current uncommitted files in `/home/df/.codex/worktrees/d56c/configurable-tree-traversal` on 2026-10-31. Every `file:line` citation below is relative to that exact worktree, not the older main checkout. This is a read-only review of the documentation and recommendations, not a request to change the implementation.

The review used the repository's AGENTS.md, README, documentation map, workflow guide, reference, all five current migration guides, changelog, package metadata, examples, verification scripts, and relevant public source contracts and behavioral tests. No other review was read. No full suite, package publication, internet lookup, or independent runtime reproduction was performed. Runtime conclusions below are supported by the current implementation and existing tests; editorial impact ratings are judgments, not usability-study results.

There is already substantial, useful documentation: host ownership is explicit; the task map exists; the reference covers identity, timing, failure, and ownership in considerable detail; executable examples are linked; packaged guide links and marked standalone snippets are verified (`scripts/verify-package.cjs:641`, `scripts/verify-package.cjs:674`, `scripts/verify-package.cjs:705`). The principal problems are conflicting statements and the path through this material. The findings distinguish genuinely incomplete local contracts from existing material that should be surfaced elsewhere.

Scores measure impact on the requested reader tasks: 5/5 would be a pervasive blocker, 4/5 a major first-use or correctness obstacle, 3/5 a meaningful integration or learning obstacle, and 2/5 a narrower improvement. No finding needs a 5/5 rating to justify action.

## 1. The install path does not identify that the demonstrated API is unreleased — 4/5

**Type:** Verified factual defect in release-context presentation. **Audience:** Humans arriving from GitHub; npm users; agents installing before following the quickstart.

**Evidence:** `README.md:23` gives an unversioned `npm install`; `README.md:44` immediately demonstrates materialization and preparation. Meanwhile, `CHANGELOG.md:3` places those additions under Unreleased, `CHANGELOG.md:29` records preparation/materialization/session APIs there, and `CHANGELOG.md:43` explicitly says this revision is unreleased and the package remains 0.11.0. `package.json:3` agrees with that version. The migration guide says its changes are *from* 0.11.0 (`docs/migration-uniform-api.md:7`).

**Consequence and rating:** A first-time reader is given no local indication that the install command and the current checkout's quickstart may describe different API generations. This can defeat the entire first-run experience, making it a major issue. This finding does not claim to have checked today's registry dist-tag.

**Recommendation:** Put a concise current-checkout/unreleased banner beside Install and link the released-version documentation or an explicit checkout/build route. State which release will carry this API when known; do not invent a version or publish anything as part of the documentation fix.

## 2. The workflow guide gives the wrong structural-cycle control flow — 4/5

**Type:** Verified factual defect. **Audience:** Humans integrating preparation; agents generating error handling.

**Evidence:** `docs/agent-workflows.md:83` says structural child cycles throw and that *only* engine dependency validation failures become invalid results. The same guide later says engine structural cycles return invalid issues (`docs/agent-workflows.md:198`). The accurate contract is at `docs/reference.md:282`. Implementation `src/traversals/dag-traversal/lib/preparationIssue.ts:13` converts the preparing engine's discovery-cycle error into a `discoveryCycle` issue; `tests/dag-precise-contracts.test.ts:22` checks this for both preparation functions.

**Consequence and rating:** A coordinator can put normal invalid-graph handling in a catch branch that is never reached, or incorrectly assume an invalid union contains only milestone diagnostics. This affects actual failure handling, not wording preference.

**Recommendation:** Correct the Discover the graph paragraph to distinguish `prepareDag`/`prepareDagAsync` invalid results, direct runner execution/`runner.prepare()` exceptions, and exact caller-thrown exceptions. Link one authoritative preparation-error section instead of maintaining divergent summaries. The separate obsolete field-name problem is finding 8.

## 3. A migration table recommends an omission shape the runtime rejects — 4/5

**Type:** Verified factual defect. **Audience:** Migrating humans and code-generating agents.

**Evidence:** The table explicitly labeled “Canonical source result” in `docs/migration-uniform-api.md:212` recommends `{ kind: 'omitted', vertexId?, satisfiesDependencies: true }` at line 215. Current graph omission requires `identity: { vertexId } | null` (`src/core/TraversableTree.ts:44`). `src/core/drivers/normalizeSourceResult.ts:76` rejects either a top-level `vertexId` or a missing identity wrapper. Both sync and async regressions cover these rejected shapes at `tests/omission-identity-validation.test.ts:11`.

**Consequence and rating:** Following the migration table produces an immediate `TypeError`, including when the optional top-level ID is omitted. A link to a newer guide at the page top does not make a contradictory “canonical” table safe for retrieval or copying.

**Recommendation:** Replace the canonical cell with the explicit identity wrapper, show anonymous and identified examples, and cross-link to `docs/migration-api-distinctions.md:44`. Keep the old shape only in a clearly marked Previous column. Add the current example to marked standalone snippet verification.

## 4. The rewrite reference still says root deletion returns null — 4/5

**Type:** Verified factual defect. **Audience:** Object-transform users and agents handling output.

**Evidence:** `docs/reference.md:1160` ends with “deleting the root returns `null`”; `docs/reference.md:1257` repeats that root deletion and rewriting null return null. Just six lines after the first statement, `docs/reference.md:1166` correctly specifies tagged presence. The public union is `{ kind: 'present', value } | { kind: 'absent' }` at `src/tools/rewrite-object/rewriteObject.ts:81`. `tests/api-distinction-behavior.test.ts:133` explicitly distinguishes present null, present undefined, and absent deletion.

**Consequence and rating:** This defeats a central purpose of the latest API correction: code can conflate deletion with a legitimate null document, or test for a scalar null that is never the output result. The contradiction is inside the primary current reference, not merely historical notes.

**Recommendation:** Correct both sentences and put a small three-row result table beside the introductory rewrite example: retained null, retained undefined, deleted root. Preserve the current detailed lifetime/conversion discussion at line 1166.

## 5. The opening names a category before demonstrating the human payoff — 4/5

**Type:** Editorial judgment. **Audience:** Human first-time readers.

**Evidence:** `README.md:3` opens with “Dependency-aware building blocks” and three breadth claims; `README.md:5` supplies the more concrete benefit, determining what can run next. The immediately relatable research → parallel tasks → review scenario appears only at `README.md:33`. The host boundary is already correctly stated at `README.md:5` and `README.md:21`; this is not a request to remove it or to claim CTT runs agents.

**Consequence and rating:** The first sentence asks readers to recognize library categories before they recognize the recurring problem it solves. Because the user's first priority is a strong, truthful opening, improving this first-screen decision has high impact despite being a judgment rather than a factual bug.

**Recommendation:** Lead with a concrete dependency dilemma and its outcome, then identify CTT as the TypeScript/JavaScript engine and retain the host-owned execution sentence. A source-backed candidate appears after the twenty findings. The scenario is implemented: `examples/agent-api-foundations-example.ts:65` and `:77` demonstrate the ready branches and subsequent review.

## 6. The README's example stops before demonstrating its promised join — 4/5

**Type:** Navigation/learning gap. **Audience:** Humans evaluating the main agent-coordination use case.

**Evidence:** `README.md:33` promises that review waits for both parallel branches. The code instead starts with research already seeded (`README.md:64`), settles only the first ticket (`README.md:75`), then merely asserts another awaiting-settlement boundary (`README.md:79`). The continuation in `docs/agent-workflows.md:124` reaches review but does not finish it. A complete trajectory already exists at `examples/agent-api-foundations-example.ts:77` through `:86`.

**Consequence and rating:** The first run proves the initial frontier but leaves the central “both branches before review” benefit mostly in prose. The visible assertions are more prominent than the result a human came to see. The material is available elsewhere; the problem is the proof presented on the main entry page.

**Recommendation:** Make the short README example visibly show ready IDs before and after accepting both branches, then review and finished. Keep host acceptance as a labeled in-memory simulation. Move duplicate-report, provenance, and independent-session demonstrations to the already-linked executable example. `tests/dag-coordination.test.ts:57` supports advance/completion separation.

## 7. The workflow tutorial begins with two optional advanced topics — 4/5

**Type:** Navigation/learning gap. **Audience:** Humans following the README's primary guide link.

**Evidence:** The workflow page starts with cyclic graph walking (`docs/agent-workflows.md:19`), then fragment composition (`:31`), and only afterward explains execution models (`:39`), discovery (`:66`), and W/C joins (`:106`). Its first technical paragraphs introduce hydration modes, cache semantics, route limits, resource disposal, typed ports, mapping, and validation before explaining a basic work session (`:23`, `:29`, `:35`).

**Consequence and rating:** A coordinator reader is diverted into a different traversal family and reusable-template machinery before acquiring the concepts needed for their first integration. This is a sequencing defect rather than missing coverage; both advanced topics deserve documentation.

**Recommendation:** Order the main human path as model choice → supply graph → work/completion distinction → accept results → recovery → revisions → optional fragments and walking. Retain existing section anchors and task-map links. Keep a brief early family selector so users whose actual goal is graph exploration can jump directly to it.

## 8. Two current migration guides still name the removed cycle field — 3/5

**Type:** Verified factual defect. **Audience:** Agents and humans implementing diagnostic renderers.

**Evidence:** `docs/migration-client-api.md:106` and `docs/migration-idiomatic-api.md:436` correctly describe an invalid discovery-cycle result but show its witness as `vertexIds`. The latest migration explicitly replaces that spelling (`docs/migration-api-distinctions.md:18`). The discriminated union defines `cycleWitnessVertexIds` for discovery cycles and `componentVertexIds` for structural SCCs (`src/traversals/dag-traversal/lib/DagDefinition.ts:46`). The witness assertion is at `tests/dag-precise-contracts.test.ts:33`.

**Consequence and rating:** Even after a reader handles the correct invalid branch, copied diagnostic access reads a nonexistent field. This is narrower than finding 2's wrong control flow but independently breaks migration output and error displays.

**Recommendation:** Update both current-contract passages and show one narrowed `issue.kind === 'discoveryCycle'` access. If earlier spellings must be preserved for history, label them Previous rather than presenting them as the current result. Keep SCC membership distinct from the ordered closed witness.

## 9. The Unreleased changelog contradicts the final compatibility policy — 3/5

**Type:** Verified factual defect. **Audience:** Humans assessing upgrade risk; agents using release notes as evidence.

**Evidence:** `CHANGELOG.md:39` says deprecated content aliases are preserved; `:41` says deprecated sentinel/command inputs are retained; `:42` says boolean settlement and positional helpers remain deprecated. Current guides explicitly say these forms are removed (`docs/migration-api-clarity.md:264`, `docs/migration-idiomatic-api.md:350`). For example, legacy content is rejected in `tests/vertex-content-api.test.ts:104`, and the current command enum includes `DEFER_WORK_COMPLETION`, not `DEFER_READY` (`src/core/TraversalVisitor.ts:8`). All the conflicting entries sit under the same Unreleased heading.

**Consequence and rating:** Release notes communicate incompatible answers about whether upgrading requires code changes. This is separate from finding 1's install/version routing: even a reader who knows they are on the unreleased branch can infer the wrong compatibility guarantees.

**Recommendation:** Rewrite Unreleased as the net final change, using current canonical names and removal policy. Move intermediate development decisions to historical research if they matter; preserve the actual released-version history unchanged.

## 10. The W/C distinction needs one worked composite diagram on the human path — 3/5

**Type:** Navigation/learning gap. **Audience:** Humans modeling nested agent tasks.

**Evidence:** `docs/agent-workflows.md:108` gives a useful declaration table and `:114` explains seeds; `:116` warns about child-to-ancestor completion cycles. However, the in-guide example is not a concrete composite graph with both structural and prerequisite relations. The README diagram is a flat W-only diamond (`README.md:35`). A valid composite example already exists and is linked at `docs/agent-workflows.md:116`; the precise contract is at `docs/reference.md:176`.

**Consequence and rating:** Readers can understand the names without seeing why structural children are different from dependency arrows, or why a seeded parent's work does not release a completion join. This is a central modeling concept, but the required information is not absent.

**Recommendation:** Add a small bundle-with-two-children diagram and a three-step W/C trace directly in Work dependencies and completion joins, including the invalid ancestor-C variant as a short counterexample. Ground it in `tests/dag-completion-dependencies.test.ts:231` and the existing executable completion example, rather than inventing new scheduling behavior.

## 11. The paragraph after the quickstart collapses too many learning stages — 3/5

**Type:** Editorial judgment. **Audience:** Human beginners.

**Evidence:** The single paragraph at `README.md:85` combines the materialized envelope, shallow data identity, eager validation and thrown errors, source replay, session boundaries, visitor dispatch, event commitment, ticket provenance, host claims/recovery, and fragment composition. It also introduces W/C in the fragment link before the README has explicitly defined those abbreviations. These details are largely correct and already have homes in the workflow guide and reference.

**Consequence and rating:** A reader who just ran the example must parse multiple unrelated contracts to learn what the example did. Important immediate guidance—dispatch tickets and accept completion in the host—competes with advanced ownership and composition rules. This is about comprehension, not simply paragraph length.

**Recommendation:** Replace it with three short explanations keyed to materialize → prepare → advance/complete, then one host-boundary sentence and targeted links. Keep source errors, event timing, ownership, and fragments in their existing detailed sections. This is distinct from finding 6, which concerns the example's missing visible end-to-end payoff.

## 12. Validation failures are specified but not taught with a consumer example — 3/5

**Type:** Contract/example gap. **Audience:** Agents generating robust integrations; humans building previews.

**Evidence:** `docs/reference.md:278` and `:282` define invalid preparation issues; `:305` enumerates authored-definition issues; `:341` and `:349` describe revision and fragment error behavior. The main quickstart discards diagnostics with a generic throw (`README.md:60`), while the composition example simply executes the valid branch (`docs/reference.md:403`). `docs/agent-workflows.md:198` explains categories in prose but supplies no narrowed handling recipe.

**Consequence and rating:** An agent can find individual facts yet still needs to invent the practical branch structure for returning useful invalid-graph feedback while preserving source failures. The defect is the lack of a primary-guide usage example, not absence of the union or error policy.

**Recommendation:** Add a marked standalone diagnostic example under Reusable prepared DAGs: branch on result.kind, narrow issue.kind, report milestone diagnostics versus a cycle witness, and let unexpected caller failures propagate unchanged. Link it from troubleshooting and revision/composition sections. Use the public union at `src/traversals/dag-traversal/lib/DagDefinition.ts:33` and provenance behavior at `src/traversals/dag-traversal/lib/preparationIssue.ts:11`.

## 13. The command table omits the payload envelope needed to write a command — 3/5

**Type:** Contract/example gap. **Audience:** Agents implementing visitors; humans adding mutations.

**Evidence:** `docs/reference.md:980` introduces `{ commands: [...] }`; its table lists payloads such as `{ newData }` and `{ state }` at `:989` and `:992`. The section does not show that these live under `commandArguments`, beside `commandName`. The nearby pause example has no payload (`docs/reference.md:1028`), so it cannot resolve the ambiguity. Correct payload examples exist in migrations, for example `docs/migration-idiomatic-api.md:59`.

**Consequence and rating:** A locally retrieved command section is insufficient to construct a nontrivial command correctly; a reader can plausibly place `newData` directly on the command object. The complete declaration is unambiguous at `src/core/TraversalVisitor.ts:42`.

**Recommendation:** Add a minimal executable rewrite/state visitor beside the command table and a generic envelope illustration `{ commandName, commandArguments }`. Keep family/phase restrictions and exclusive deferral in the same neighborhood. Cross-link advanced batching examples rather than requiring a migration guide to learn basic current syntax.

## 14. Custom-source context prose does not expose its nested field shape — 3/5

**Type:** Contract/example gap. **Audience:** Agents implementing adapters; humans using discovery context.

**Evidence:** `docs/reference.md:822` introduces `resolveChild(hint, options)`; `:860` says options include parent, depth, hint index, and the resolved tree. `:1243` discusses parent fields and safe contexts. But the current reference never shows the essential `options.resolutionContext.depth`/`.parentVertexRef` nesting. The source declares `TreeChildResolutionContext` with `resolutionContext`, `resolvedTreeView`, and `originalTreeView` (`src/core/TraversableTree.ts:6`), while graph context differs at `src/core/TraversableGraph.ts:13`.

**Consequence and rating:** The documented values are present conceptually but their access paths remain underspecified for code generation. Synthetic graph parents add a nullability distinction that is easy to lose when adapting a tree example.

**Recommendation:** Add compact tree/graph callback-signature tables and one context-using adapter beside Abstract trees / DAG sources. Show the nested metadata fields, live versus original view, and synthetic-parent null case. Reference `src/core/ResolvedTree.ts:296` for the metadata shape and `tests/observation-facets.test.ts:332` for synthetic-parent behavior.

## 15. Builder options lack a consolidated applicability/default lookup — 3/5

**Type:** Contract/example gap. **Audience:** Agents constructing option bags; humans comparing execution families.

**Evidence:** The Configuration patches table (`docs/reference.md:163`) covers selected patch behaviors, not a complete per-family constructor/configure index. DAG defaults are embedded at `:176` and `:480`; source constraints at `:223`; async concurrency at `:976`; prepared-factory options at `:286`. Unknown option keys reject (`:172`), so transferring a plausible option between surfaces is not harmless.

**Consequence and rating:** Readers must assemble an option bag from scattered prose while remembering which settings belong to builders, prepared factories, sessions, or execution calls. Existing precise rules help, but do not provide a reliable local lookup for this common agent task.

**Recommendation:** Add a compact options matrix under Configuration patches with field, default, accepted values, applicable family/surface, and link to semantics. Explicitly separate constructor `limits` from patch `replaceLimits`, graph-only dependency policies, prepared-factory ownership, and execution selectors. Derive it from public option types such as `src/traversals/dag-traversal/lib/DagTraversalInstanceConfig.ts:18` and `:82`; verify strictness against `tests/configuration-contract.test.ts:106`.

## 16. The detailed reference needs a symbol-to-contract index for retrieval — 3/5

**Type:** Navigation/learning gap. **Audience:** Agents retrieving one API; humans arriving with an exported symbol name.

**Evidence:** The 1,296-line reference's contents (`docs/reference.md:7`) link broad topics. Functions such as `defineDag`, `diffDagDefinitions`, `bindDagWorkSession`, and query operations are described within long sections (`:299`, `:318`, `:410`, `:1239`). The task map is useful (`docs/index.md:9`), but it is not an index mapping current symbols/types to signatures, owning sections, and runnable examples. Even the complete import-path map is in a migration guide (`docs/reference.md:1255` → `docs/migration-api-clarity.md:13`).

**Consequence and rating:** The reference is detailed but not consistently addressable at the granularity an agent needs. Searching an exported name can land on historical migration text before the current contract, increasing both retrieval cost and stale-name risk.

**Recommendation:** Add a maintained current API index, grouped by sources, preparation, sessions, inspection, traversal, and rewriting, with symbol-level anchors and links to examples. Reuse existing prose; do not duplicate the entire reference or expose private engine paths. Keep the task map as the human entry route.

## 17. General tree/graph query contracts are buried inside object rewriting — 3/5

**Type:** Navigation/learning gap. **Audience:** Humans inspecting graphs; agents generating view queries.

**Evidence:** The `safe-tree-queries` anchor and query capability explanation are at `docs/reference.md:1237`, beneath Rewrite objects (`:1139`), after extensive object generic/assembler discussion. They cover ordinary runner views, canonical handles, captured event vertices, identity, and paths (`:1239`–`:1247`), not just rewriting. The top-level contents does not expose this anchor (`:7`–`:33`). A workflow link reaches it (`docs/agent-workflows.md:224`), so it is not wholly undiscoverable.

**Consequence and rating:** A reader looking for graph lookup or live-versus-historical semantics has little reason to inspect the rewrite section. These are important current contracts whose location obscures their general applicability.

**Recommendation:** Promote “Views, handles, identity, and paths” to its own reference section and task-map route; preserve `safe-tree-queries` as an alias. Add a small getVertexRefById → has/require → path example. The independent public graph-view surface is defined at `src/core/ResolvedGraphView.ts:31`; event/handle lifetime is tested at `tests/observation-facets.test.ts:272`.

## 18. New public contracts were appended after Development and the license — 3/5

**Type:** Navigation/learning gap. **Audience:** Humans skimming sections; agents retrieving heading-scoped chunks.

**Evidence:** `docs/reference.md:1259` begins Development; `:1283` says MIT licensed; then `:1286` adds “Explicit input ownership and query names” as a subsection. It contains current Vertex hint ownership and transformation semantics (`:1288`), omission identities (`:1290`), query failure semantics (`:1292`), session inspection/binding (`:1294`), and walking hydration type parameters (`:1296`). None is contributor-only material, and the contents omits this subsection.

**Consequence and rating:** The latest corrections are attached to a contributor section after an apparent end-of-document boundary. An agent retrieving constructor, source, or query documentation can miss the very contract that resolves an ambiguity.

**Recommendation:** Integrate each paragraph into its owning current section, with links from the latest migration. In particular, move hint-transform semantics beside traversal configuration and hydration generics beside walking sources. Preserve any useful anchor. `tests/vertex-hint-ownership.test.ts:17` and `tests/api-distinction-behavior.test.ts:92` substantiate the ownership/projection distinctions; this finding concerns placement, not missing implementation.

## 19. The prescribed migration path omits the newest migration — 3/5

**Type:** Navigation/learning gap. **Audience:** Upgrading humans and agents following the documentation map.

**Evidence:** `docs/index.md:3` correctly announces the latest distinctions migration, but the explicit “Migrate from 0.11.0” reading-order row at `:24` lists four older guides and then the reference, omitting it. The README's primary navigation similarly lists the older guides (`README.md:7`), while the newest appears only after the license (`README.md:142`). Older migration pages do link it at their tops, so this is inconsistent prioritization rather than a missing document or broken link.

**Consequence and rating:** A task-directed reader can follow the stated upgrade path while treating the latest canonical corrections as an optional addendum. That is particularly risky while the earlier guides still contain stale canonical cells and fields.

**Recommendation:** Make the task row and README navigation agree on one current migration entry point. Give that entry point a short ordered checklist linking the relevant historical sections, with the final current contract clearly identified. Keep earlier anchors and explain that intermediate rename stages need not be applied one by one.

## 20. The second advertised execution model has no small awaited-work recipe on its route — 2/5

**Type:** Contract/example gap. **Audience:** Humans choosing in-process execution; agents wiring async DAG visitors.

**Evidence:** `docs/agent-workflows.md:44` recommends awaiting work in `ON_WORK_READY`, and `:48` correctly warns that detached background work releases dependencies too soon. The task map's async route goes to the general Async traversal section (`docs/index.md:23`), whose example demonstrates async *tree discovery* (`docs/reference.md:949`–`:973`), while the DAG example executes a synchronous logger (`:188`, `:204`). The linked prerequisite example uses async lookup but a synchronous visitor (`examples/dag-prerequisite-resolution-example.ts:45`, `:64`).

**Consequence and rating:** The preferred durable-session path is much better demonstrated than the alternative model. The prose is accurate, so this is a narrower gap, but readers still have to combine examples to get the crucial await boundary right.

**Recommendation:** Add a short, standalone AsyncDagTraversal example under Choose an execution model, with an awaited host stub, bounded callback concurrency, and an assertion that the join starts only after both work promises settle. Link failure/pause semantics rather than adding them all to the first example. `tests/async-dag.test.ts:38`–`:74` already proves the required ordering; no LLM SDK or built-in agent dispatch should be implied.

## A possible strong, truthful opening hook — not a twenty-first finding

> **Know which agent tasks can run next—and which must wait.**
>
> Research can unlock implementation and test planning in parallel; review can wait for both, or for every child of a larger task. Give CTT your graph and accepted completion facts. It computes readiness and exposes progress; your host runs the agents and keeps durable state.

This hook describes supported dependency readiness, not automatic planning or agent execution. The flat fork/join and accepted-fact session are demonstrated in `examples/agent-api-foundations-example.ts:54`, `:65`, and `:77`; structural completion joins and seeded W versus C are covered by `tests/dag-completion-dependencies.test.ts:231`; local tickets and advance boundaries are declared in `src/traversals/dag-traversal/coordinateDag.ts:23` and `:26`. The recovery caveat should remain explicit: reconstruction uses host-accepted facts, not serialized CTT tickets or a durable runner checkpoint (`docs/agent-workflows.md:165`, `:175`). “Can run” means dependency eligibility subject to host claims, waits, and capacity; it does not promise that CTT dispatches those agents. Pair this hook with the release-context clarification in finding 1.

## Scope limits and verification notes

The package already includes the consumer guides (`package.json:79`–`:86`). The verifier checks relative links/anchors in checkout and tarball and compiles **and executes** marked standalone snippets (`scripts/verify-package.cjs:641`, `:690`, `:705`); the example verifier runs every top-level `.ts` example (`scripts/verify-examples.cjs:7`, `:17`). Therefore this review does not allege that guides are unpackaged, snippets are never executed, or a complete coordination example is missing from the repository. Existing checks cannot by themselves establish the truth of contradictory prose or the effectiveness of the human learning sequence. No source, tests, or repository documentation was edited by this review.
