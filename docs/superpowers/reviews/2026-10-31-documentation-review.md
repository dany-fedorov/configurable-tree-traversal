# Documentation review: human opening, learning path and agent reference

Reviewed on 2026-10-31 against `/home/df/.codex/worktrees/d56c/configurable-tree-traversal`, branch `fix/public-api-findings-20261031`, including its uncommitted API corrections. The older main checkout was not used as the current API. This is a review with recommendations; no source or consumer guide was rewritten.

Codex Astra high and Claude Fable high reviewed the same 470-input snapshot independently and in parallel. The controller then checked their claims against the actual files, source/tests and public npm artifact, removed overlap, qualified overclaims, and selected exactly twenty findings. Both raw reviews and the candidate-by-candidate disposition are preserved in [the audit folder](2026-10-31-documentation-audit/index.md).

There is already substantial accurate documentation: a task map, explicit host boundaries, detailed timing/identity/ownership rules, packaged guides and executable examples. The highest-impact problems are the installed-version mismatch, contradictory current contracts, and the path through the existing material. “Missing” below refers to a local contract/example gap; buried existing material is identified separately.

Scores measure impact on the three requested reader goals, not implementation bug severity: **5/5** blocks the primary first-use path; **4/5** materially damages onboarding or a common contract; **3/5** is a meaningful learning/integration gap; **2/5** is narrower; **1/5** is polish. Editorial ratings are judgments, not usability-study results. The twenty selected items need not occupy every score on the scale.

## Ranked findings

| Rank | Impact | Finding |
| --- | --- | --- |
| D01 | 5/5 | [The install command cannot run the README quickstart](#d01) |
| D02 | 4/5 | [Lead with a concrete human payoff](#d02) |
| D03 | 4/5 | [Let the first example visibly complete its promised join](#d03) |
| D04 | 4/5 | [Teach execution before walking and composition](#d04) |
| D05 | 4/5 | [Correct the workflow guide’s preparation error control flow](#d05) |
| D06 | 4/5 | [Remove the rejected omission shape from a canonical table](#d06) |
| D07 | 4/5 | [Replace scalar-null deletion claims with tagged presence](#d07) |
| D08 | 4/5 | [Make the API reference addressable by public symbol](#d08) |
| D09 | 3/5 | [Give upgrades one current migration entry point](#d09) |
| D10 | 3/5 | [Correct two stale prepared projection names](#d10) |
| D11 | 3/5 | [Correct obsolete discovery-cycle witness fields](#d11) |
| D12 | 3/5 | [Make Unreleased describe the final compatibility policy](#d12) |
| D13 | 3/5 | [Work through one structural completion join visually](#d13) |
| D14 | 3/5 | [Explain the quickstart in small conceptual steps](#d14) |
| D15 | 3/5 | [Show a narrowed validation and failure-handling recipe](#d15) |
| D16 | 3/5 | [Show the full command payload envelope](#d16) |
| D17 | 3/5 | [Document actual custom-source context access paths](#d17) |
| D18 | 3/5 | [Provide a per-surface options/defaults matrix](#d18) |
| D19 | 3/5 | [Put shared contracts under their owning reference sections](#d19) |
| D20 | 3/5 | [Complete the structured summary and progress field reference](#d20) |

<a id="d01"></a>

### D01. The install command cannot run the README quickstart — 5/5

**Verified factual defect. Audience:** First-time human users and agents installing the package.

**Evidence:** `README.md:26` installs the default npm package; `README.md:44` and `README.md:45` import `materializeDagInputFromRecords` and `prepareDag`. `CHANGELOG.md:29` and `CHANGELOG.md:43` place these APIs in an unreleased revision. Independent registry lookup on 2026-10-31 found latest=0.11.0; a runtime export probe of that exact published tarball found both names undefined. See published-package-metadata.json, published-package-provenance.json and published-package-runtime.json in the audit folder.

**Impact:** The primary first-use path fails before the reader can see the advertised benefit. This is now verified against the public artifact, rather than inferred solely from an Unreleased heading.

**Recommended change:** Put the release status and a working way to try this revision beside Install. Link version-matched released documentation or give an explicit checkout/build path. When a release is separately authorized, align its version and documentation. Publishing is outside this review.

<a id="d02"></a>

### D02. Lead with a concrete human payoff — 4/5

**Editorial judgment. Audience:** Humans skimming the first screen.

**Evidence:** `README.md:3` leads with “Dependency-aware building blocks” and a list of categories. The concrete outcome, determining what can run next, follows at `README.md:5`; the relatable research/parallel-work/review situation starts at `README.md:33`. The actual fork/join is demonstrated by `examples/agent-api-foundations-example.ts:65` and `examples/agent-api-foundations-example.ts:77`.

**Impact:** The opening asks a reader to recognize an abstraction before showing the dependency problem it solves. This is a major opportunity against the requested attention-grabbing hook; the impact is an editorial judgment, not a measured conversion result.

**Recommended change:** Open with the dependency dilemma and its result, then identify the TypeScript/JavaScript library and state the host boundary in one sentence. Keep agent dispatch and durable storage explicitly host-owned. A source-backed candidate follows the findings.

<a id="d03"></a>

### D03. Let the first example visibly complete its promised join — 4/5

**Learning/example gap. Audience:** Humans evaluating coordination.

**Evidence:** `README.md:33` promises review after two parallel branches. The example seeds research at `README.md:64`, completes only the first ticket at `README.md:75`, and stops after asserting another waiting boundary at `README.md:79`. It has no visible success output. The complete branch → review → finished trajectory already exists at `examples/agent-api-foundations-example.ts:77` through `examples/agent-api-foundations-example.ts:86`.

**Impact:** The landing-page example demonstrates a frontier but does not visibly prove its central join or show what successful execution looks like. A complete example exists elsewhere; this is a first-page demonstration gap.

**Recommended change:** Show the ready IDs, complete both branches, show review becoming ready, and finish, with short expected output. Keep durable acceptance clearly labeled as an in-memory simulation. Leave ticket provenance and independent-session tests in the linked advanced example.

<a id="d04"></a>

### D04. Teach execution before walking and composition — 4/5

**Navigation/learning gap. Audience:** Humans following the main workflow guide.

**Evidence:** `docs/agent-workflows.md:19` opens with cyclic walking and hydration; `docs/agent-workflows.md:31` introduces fragments; execution models begin at `docs/agent-workflows.md:39`, discovery at `docs/agent-workflows.md:66`, and W/C joins at `docs/agent-workflows.md:106`. The guide is a primary README destination at `README.md:91`.

**Impact:** An integrator encounters optional source policies, route limits and ports before understanding the basic work-session loop. These capabilities are useful but arrive before their prerequisites.

**Recommended change:** Use model choice → supply graph → work/completion distinction → accept results → recovery → revisions → optional fragments/walking. Keep a short family selector early so exploration readers can jump directly to walking. Preserve existing anchors.

<a id="d05"></a>

### D05. Correct the workflow guide’s preparation error control flow — 4/5

**Verified factual defect. Audience:** Integrators and agents generating validation handling.

**Evidence:** `docs/agent-workflows.md:83` says structural child cycles throw and only dependency validation becomes invalid. `docs/agent-workflows.md:198` and `docs/reference.md:282` describe the actual split. `src/traversals/dag-traversal/lib/preparationIssue.ts:13` converts engine discovery cycles into invalid discoveryCycle issues; `tests/prepared-dag.test.ts:730` covers both preparation families and direct-runner errors. The controller reproduced the invalid result.

**Impact:** A reader can put expected invalid-graph handling in a catch branch that never runs, or assume invalid results contain only milestone diagnostics. This changes actual consumer behavior.

**Recommended change:** Correct the paragraph to distinguish source preparation’s invalid result, direct runner/runner.prepare exceptions, malformed contracts, and exact caller-thrown failures. Link one authoritative error section. Keep field-name migration corrections in D11 separate from this control-flow error.

<a id="d06"></a>

### D06. Remove the rejected omission shape from a canonical table — 4/5

**Verified factual defect. Audience:** Migrating humans and code-generating agents.

**Evidence:** `docs/migration-uniform-api.md:215` labels the graph omitted result with optional top-level vertexId canonical. The runtime requires identity and rejects top-level vertexId at `src/core/drivers/normalizeSourceResult.ts:76`; the public graph omission shape is at `src/core/TraversableTree.ts:44`. `tests/omission-identity-validation.test.ts:11` covers the rejected forms; `docs/migration-api-distinctions.md:44` has the correct rule.

**Impact:** Copying the table produces a TypeError, whether the obsolete optional ID is supplied or identity is simply absent. A newer-guide banner does not make a contradictory canonical cell safe.

**Recommended change:** Show `{ kind: 'omitted', identity: null, satisfiesDependencies: true }` for an anonymous graph omission and an identity wrapper for a known ID. Retain plain tree omission separately. Put executable current examples under the existing standalone verifier.

<a id="d07"></a>

### D07. Replace scalar-null deletion claims with tagged presence — 4/5

**Verified factual defect. Audience:** Object-transform users and agents handling results.

**Evidence:** `docs/reference.md:1160` says deleting the root returns null; `docs/reference.md:1257` repeats the scalar claim. `docs/reference.md:1166` correctly describes the tagged result. The public union is at `src/tools/rewrite-object/rewriteObject.ts:81` and the absent branch at `src/tools/rewrite-object/rewriteObject.ts:305`. `tests/api-distinction-behavior.test.ts:133` distinguishes present null, present undefined and deleted roots; the controller reproduced it.

**Impact:** A null check on the result never detects deletion, and the prose erases the presence distinction introduced by the corrected API. Both contradictory claims are in the current primary reference.

**Recommended change:** Correct both sentences. Put a compact retained-null / retained-undefined / deleted-root result table next to the basic rewrite example, with discriminant narrowing. Retain the existing complete conversion, caching and return-time snapshot rules.

<a id="d08"></a>

### D08. Make the API reference addressable by public symbol — 4/5

**Agent-reference/navigation gap. Audience:** Agents retrieving one contract and humans arriving with a symbol name.

**Evidence:** `docs/reference.md:7` indexes broad topics across 1,296 lines. Individual APIs such as defineDag, diffDagDefinitions and bindDagWorkSession appear inside sections at `docs/reference.md:299`, `docs/reference.md:318` and `docs/reference.md:410`. `docs/index.md:9` provides useful task paths, but not a symbol-to-contract map. The public census workflow exists at `docs/testing.md:150`.

**Impact:** Detail exists, but an agent cannot reliably jump from a known exported name to its signature, options, results, failure behavior and example. Retrieval can land on a migration’s old name instead.

**Recommended change:** Add a current public-symbol index with stable symbol anchors, supported import route, signature, owning contract and runnable example. Use the existing census to check coverage while excluding private engine paths. Link to result schemas such as D20 rather than duplicating large prose blocks.

<a id="d09"></a>

### D09. Give upgrades one current migration entry point — 3/5

**Navigation/learning gap. Audience:** Upgrading humans and agents resolving old names.

**Evidence:** `docs/index.md:3` calls the distinctions migration current, but the explicit Migrate from 0.11.0 path at `docs/index.md:24` omits it. `README.md:7` links four older migrations; the newest appears only after the license at `README.md:142`. Earlier guides already link it in their opening banners.

**Impact:** The prescribed path and the stated canonical guide disagree. Readers must infer which sequence of renames is final, increasing exposure to stale canonical passages.

**Recommended change:** Point the README navigation and task row to one current upgrade entry. Provide a final-surface checklist linked to relevant historical sections; do not require readers to mentally apply each intermediate rename. Preserve the old section anchors.

<a id="d10"></a>

### D10. Correct two stale prepared projection names — 3/5

**Verified factual defect. Audience:** Migration readers and agents reconstructing DAGs.

**Evidence:** `docs/migration-uniform-api.md:33` and `docs/migration-api-clarity.md:94` still describe the prepared .vertices projection as current. `src/traversals/dag-traversal/lib/PreparedDag.ts:61` declares liveVertexSummaries, and `src/traversals/dag-traversal/lib/makePreparedDag.ts:86` exposes it. `docs/migration-api-distinctions.md:14` explicitly records the removal.

**Impact:** A reader reaches for a nonexistent property. This is especially confusing because definition.vertices still exists and has a different, faithful reconstruction role.

**Recommended change:** Use liveVertexSummaries for the live-child convenience projection in both passages, and retain definition.vertices for authored declarations. Show the projection/definition distinction without renaming unrelated vertices fields.

<a id="d11"></a>

### D11. Correct obsolete discovery-cycle witness fields — 3/5

**Verified factual defect. Audience:** Diagnostic consumers and migrating agents.

**Evidence:** `docs/migration-client-api.md:106` and `docs/migration-idiomatic-api.md:436` show discoveryCycle.vertexIds as current. `docs/agent-workflows.md:83` also mentions the old witness name. The source uses cycleWitnessVertexIds at `src/traversals/dag-traversal/lib/preparationIssue.ts:16`; the class field is at `src/core/errors/DagDiscoveryCycleError.ts:6`. The structural SCC field is separately componentVertexIds (`docs/reference.md:311`).

**Impact:** Correctly branching on invalid still leaves generated diagnostic code reading an absent field. This is narrower than D05’s wrong error branch, with a distinct fix and validation target.

**Recommended change:** Update current-contract passages and add one narrowed discoveryCycle access. Preserve the distinction between an ordered closed witness and structural SCC membership. Keep old spellings only in explicitly labeled Previous columns.

<a id="d12"></a>

### D12. Make Unreleased describe the final compatibility policy — 3/5

**Verified factual defect. Audience:** Humans assessing upgrade risk and agents mining release notes.

**Evidence:** `CHANGELOG.md:39` promises deprecated content aliases; `CHANGELOG.md:41` retains old sentinel/command inputs; `CHANGELOG.md:42` retains boolean settlement and positional overloads. Current migration contracts say removed (`docs/migration-idiomatic-api.md:350`). `tests/vertex-content-api.test.ts:103` verifies rejected legacy/mixed fields. The same Unreleased section also names inspectDag at `CHANGELOG.md:7`, `CHANGELOG.md:15` and `CHANGELOG.md:27`, while the public APIs are inspectMilestones / inspectDagMilestones (`src/traversals/dag-traversal/coordinateDag.ts:47`).

**Impact:** The same not-yet-released change set communicates incompatible support policies and obsolete callable names. Knowing the release is pending does not resolve the contradiction.

**Recommended change:** Rewrite Unreleased as the net final behavior, using current names, removal policy and selector vocabulary. Move intermediate development decisions to historical notes if needed. Preserve actual released history. Do not treat runtime error messages as stable machine-readable codes.

<a id="d13"></a>

### D13. Work through one structural completion join visually — 3/5

**Learning/example gap. Audience:** Humans modeling composite work.

**Evidence:** `docs/agent-workflows.md:108` gives a useful W/C declaration table; `docs/agent-workflows.md:114` explains W-only seeds, and `docs/agent-workflows.md:116` warns about ancestor-C cycles. The README diagram at `README.md:35` is a flat W-only diamond. A complete composite example is linked, and `tests/dag-completion-dependencies.test.ts:231` covers seeded parent work versus child completion.

**Impact:** Readers can learn the terms yet still confuse structural children with execution prerequisites or expect a parent’s accepted work to satisfy its entire subgraph.

**Recommended change:** Put a small composite-with-two-children diagram and a short W/C trace in the human guide. Distinguish child links from dependency arrows and show why a child waiting on its own ancestor C creates a cycle. Reuse the existing executable completion example.

<a id="d14"></a>

### D14. Explain the quickstart in small conceptual steps — 3/5

**Editorial/learning judgment. Audience:** Human beginners.

**Evidence:** `README.md:85` is a 133-word paragraph mixing envelopes, payload identity, validation, replay, independent sessions, tickets, visitors, commitment timing, host storage and fragments. `README.md:14` uses generation-bearing dispatch records before the basic loop. W/C is formally explained later at `docs/agent-workflows.md:108`.

**Impact:** The reader’s first successful code run is followed by multiple integration stages at once. Essential near-term understanding competes with provenance and composition details.

**Recommended change:** Explain materialize → prepare → advance/complete in short connected steps, followed by the host boundary and targeted links. Use plain language for the readiness/ticket concepts and define W/C at first use. Keep exact identity, errors and generation rules in the reference, not a larger README glossary of internals.

<a id="d15"></a>

### D15. Show a narrowed validation and failure-handling recipe — 3/5

**Agent-contract/example gap. Audience:** Agents generating robust previews and human integrators.

**Evidence:** Preparation results and issues are specified at `docs/reference.md:278`, `docs/reference.md:282` and `docs/reference.md:305`; the README uses a generic throw at `README.md:60`. Ticket fatality is described at `docs/agent-workflows.md:140`. The troubleshooting cell at `docs/agent-workflows.md:198` compresses multiple surfaces into one explanation. Source provenance handling is explicit at `src/traversals/dag-traversal/lib/preparationIssue.ts:11`.

**Impact:** A caller must synthesize practical branches from scattered facts: expected invalid graphs, programmer errors, arbitrary source-thrown values, duplicate reports, and retained fatal failures. The rules are present but a usable consumer recipe is missing.

**Recommended change:** Add a standalone example that narrows result.kind and issue.kind, reports useful diagnostics, and preserves unexpected thrown values. Pair it with an operation/result/error-category table for preparation, direct execution, coordination and rewriting. Link it from troubleshooting. Keep fatal failure distinct from a host-owned retry; do not invent a stable-message classification API.

<a id="d16"></a>

### D16. Show the full command payload envelope — 3/5

**Agent-contract/example gap. Audience:** Agents generating visitors and humans adding mutations.

**Evidence:** `docs/reference.md:980` introduces commands, and its table at `docs/reference.md:989` / `docs/reference.md:992` lists newData and state payloads. The adjacent pause example at `docs/reference.md:1028` has no arguments. The actual declaration at `src/core/TraversalVisitor.ts:47` requires commandName beside commandArguments; a correct payload example exists in `docs/migration-idiomatic-api.md:59`.

**Impact:** The current command section is not locally sufficient to construct a nontrivial command. A reader can plausibly place newData directly on the command object instead of under commandArguments.

**Recommended change:** Add a small executable data-rewrite/state visitor next to the table, showing `{ commandName, commandArguments }`, required/absent arguments and allowed family/phase. Keep exclusive DEFER_WORK_COMPLETION and batching restrictions nearby; do not require a migration guide for basic current syntax.

<a id="d17"></a>

### D17. Document actual custom-source context access paths — 3/5

**Agent-contract/example gap. Audience:** Agents implementing adapters and humans using discovery metadata.

**Evidence:** `docs/reference.md:822` introduces resolveChild(hint, options); `docs/reference.md:860` says options include depth, parent and hint index, but does not show their nesting. `src/core/TraversableTree.ts:10` places these under resolutionContext, alongside resolvedTreeView and originalTreeView. `src/core/TraversableGraph.ts:18` defines the graph variant and null synthetic parent fields.

**Impact:** Conceptual field descriptions do not tell generated code whether to access options.depth or options.resolutionContext.depth, nor how graph synthetic parents differ from tree parents.

**Recommended change:** Add compact callback signature/context tables and one context-using adapter example. Show nested resolutionContext metadata, family-specific view names, original-view nullability and the synthetic-parent case. Preserve own-ID versus structural outer-result getter rules.

<a id="d18"></a>

### D18. Provide a per-surface options/defaults matrix — 3/5

**Agent-contract/navigation gap. Audience:** Agents constructing strict option bags and humans choosing a family.

**Evidence:** `docs/reference.md:163` covers patch behavior, not the complete constructor/options surface. DAG defaults are in `docs/reference.md:176`; source-family constraints in `docs/reference.md:223`; prepared factory options in `docs/reference.md:286`; async concurrency in `docs/reference.md:976`. Unsupported own keys throw at `docs/reference.md:172`. Public walking patch declarations distinguish replaceLimits at `src/traversals/graph-walk/GraphWalkOptions.ts:122`.

**Impact:** A plausible option copied between a builder, prepared factory, session or execution call can reject. Precise rules exist, but a common construction task requires assembling them from several sections.

**Recommended change:** Add a matrix with field, default, accepted values, family/surface and semantic link. Separate construction from configure and per-run selection, limits from replaceLimits, graph-only dependency policies, and prepared topology ownership. Derive it from public option declarations and keep strictness tests as evidence.

<a id="d19"></a>

### D19. Put shared contracts under their owning reference sections — 3/5

**Navigation/retrieval gap. Audience:** Humans querying live graphs and agents retrieving heading-scoped contracts.

**Evidence:** Shared views, handles, identity and paths sit at `docs/reference.md:1237` through `docs/reference.md:1247`, inside Rewrite objects (`docs/reference.md:1139`), and are absent from the main contents. New hint ownership, omission identity, strict queries, session inspection and hydration typing were appended under Development after “MIT licensed” at `docs/reference.md:1283` through `docs/reference.md:1296`.

**Impact:** Current contracts are present under headings that misidentify their applicability. A graph-query agent has little reason to retrieve object assembly prose or a contributor subsection to find these rules.

**Recommended change:** Promote views/handles/identity/paths into a first-class reference section and preserve safe-tree-queries as an alias. Move each post-license paragraph into its owning source, configuration, session or walking section. Cross-link shared rules instead of appending another mixed correction block.

<a id="d20"></a>

### D20. Complete the structured summary and progress field reference — 3/5

**Agent-contract/example gap. Audience:** Agents building dashboards, dispatch views and diagnostics.

**Evidence:** `docs/reference.md:727` through `docs/reference.md:746` describe many progress fields, but their count list at `docs/reference.md:740` omits counts.discovered and counts.pending, declared at `src/traversals/dag-traversal/lib/DagProgress.ts:30`. The optional per-vertex generation at `src/traversals/dag-traversal/lib/DagProgress.ts:25` is not included in a complete progress schema. The atomic dispatch frontier is correctly documented at `docs/reference.md:714`.

**Impact:** A detailed prose explanation is not an exhaustive field schema. Agents can miss supported counters or treat overlapping counts as a partition when constructing status displays.

**Recommended change:** Add exact DagSummary and DagVertexProgress field tables, with types, optionality, meaning and overlap rules, plus a small typed snapshot example. Keep awaitingSettlement as the recommended atomic dispatch record and generations local. Link these schemas from the symbol index rather than duplicating them there.

## A possible truthful opening

> **Know which agent tasks can run next, and which must wait.**
>
> Research can unlock implementation and test planning in parallel; review can wait for both. Give CTT your task graph and accepted completion facts. It computes a dependency-ready frontier and exposes blockers, while your host chooses agents, dispatches work, accepts results and keeps durable state.

This is a candidate, not a tested headline. Its fork/join is supported by `examples/agent-api-foundations-example.ts:65` and `examples/agent-api-foundations-example.ts:77`; captured blocker inspection is documented at `docs/reference.md:622` and declared at `src/traversals/dag-traversal/coordinateDag.ts:47`. “Can run” means dependency eligibility subject to host claims, waits and capacity (`docs/agent-workflows.md:64`). The install/release issue D01 must be resolved before presenting this as the experience obtained from the current unversioned npm install command.

I did not adopt the Fable hook verbatim: “never stores anything” contradicts CTT’s in-memory progress/cache ownership; “never runs a task” obscures supported awaited visitor execution; and “each advance returns exactly the tasks” omits paused/finished boundary variants and host admission policy. The reconciled hook makes only the supported readiness/inspection claim and keeps host responsibilities explicit.

## Reconciliation and verification

The reviewers supplied 40 candidate findings. All candidates are accounted for in [reconciliation.json](2026-10-31-documentation-audit/reconciliation.json), including merges and valid lower-priority items not selected. Important decisions:

- The install mismatch was initially an inference from local release notes. The controller checked [public npm metadata](https://registry.npmjs.org/configurable-tree-traversal/latest), downloaded the pinned [0.11.0 tarball](https://registry.npmjs.org/configurable-tree-traversal/-/configurable-tree-traversal-0.11.0.tgz) without lifecycle scripts, and reproduced the missing exports. This supports D01’s 5/5 rating.
- The wrong preparation control flow (D05) and obsolete witness field (D11) remain separate: each can independently break a consumer after the other is fixed.
- Repeated stale Unreleased names and contradictory compatibility promises form one changelog finding (D12). The two misplaced general-contract blocks form one reference-placement finding (D19).
- The reference is a lookup document. A proposed objects-first reorder was not accepted as the remedy for agent-first onboarding; the human guide’s sequence and the reference’s symbol-level navigation have separate purposes.
- The absence of an error-message catalog is not a missing stable error-code API. D15 recommends operation/result categories, exact arbitrary failure preservation and executable narrowing rather than matching implementation message strings.
- Existing marked standalone guide snippets are compiled **and executed** by `scripts/verify-package.cjs:674`, `scripts/verify-package.cjs:690` and `scripts/verify-package.cjs:705`. Linked examples and current guides are already packaged/verified appropriately. This review does not claim they are untested or absent.

Fresh focused checks passed: **95 tests across four suites**, in two commands covering prepared DAGs, API distinctions, omission identity validation and vertex content. The controller also reproduced structural-cycle invalid results and tagged deletion versus retained null with the current built runtime. The public-tarball probe reused the workspace’s installed uuid runtime dependency; it verified the published package’s root exports, not a full clean-install compatibility matrix. The full repository check was not rerun for this read-only review, and the independent reviewers themselves did not execute tests.

All 470 captured production/documentation/test/example/tooling inputs remained unchanged through completion. Relative paths and exact file:line anchors were validated against the reviewed worktree. Raw Fable terminal metadata records `claude-fable-5-1`, requested high effort, and successful completion; the Astra agent was explicitly dispatched as `gpt-6-astra` at high effort. No public documentation, source or tests were edited; the only repository additions are this review and its evidence. No release, merge or publication was performed.

A practical implementation order is D01 and the factual contradictions first; then the opening and first successful flow (D02–D04, D13–D14); then the navigable agent contracts and examples (D08–D09, D15–D20). This is prioritization of the findings, not an implementation authorization.
