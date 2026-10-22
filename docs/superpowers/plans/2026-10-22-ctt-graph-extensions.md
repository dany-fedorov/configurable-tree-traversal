# Generic CTT graph extensions implementation plan

> **For agentic workers:** Use subagent-driven-development task by task. Parent owns push/merge. Never commit ignored scratch files.

**Goal:** Add structural completion prerequisites and optional ID-based prerequisite lookup while keeping CTT domain-independent.

**Architecture:** Extend the existing W scheduler with C gates and milestone SCC validation, then integrate one coalesced resolver effect and detached vertex acceptance into existing sync/async drivers. Reuse prior performance-stage topology revision and narrow-read helpers.

**Tech Stack:** TypeScript, Jest, existing effects/kernel/drivers, Node22/24.

**Spec:** docs/superpowers/specs/2026-10-22-ctt-graph-extensions-design.md

## Global Constraints

- Preserve six traversal families, SameValueZero IDs, FIFO defaults, exact user-thrown values, current lazy semantics, deferral/settlement generations, snapshots and100%source coverage.
- One hints API; no business priority, outcome taxonomy, storage, retry or workflow registry. Adapter owns fetching; summary never calls it or mutates traversal state.
- New metadata and hook are graph-source capabilities. Preserve existing tree treatment of unknown dependsOnComplete metadata. Preserve old lazy root-only dependsOn handling for unchanged adapters; activate root declarations for new non-undefined completion metadata or resolver hook.
- Public additions are optional to retain existing constructed types/object shapes. Existing unmetPrerequisiteIds becomes a stable W/C union; optional unmetCompletePrerequisiteIds is present only when original normalized C list is nonempty.
- Original declaration and structural milestone cycles must remain invalid despite completed-work seeds. No fabricated discovery parents/roots for looked-up vertices.
- Existing priority remains rejected; its specific message becomes 'priority metadata is not supported' because completion metadata is now supported. Other error contracts stay unchanged.
- Full npm run check,100%allsourcecoverage, examples, packed consumers and independent review for each task. No new package publication required; use Unreleased changelog.

### Task 1: Structural completion prerequisites

**Files:** src/core/TraversableTree.ts; src/core/graph/{types.ts,GraphStore.ts,ResolvedGraphsContainer.ts,snapshot.ts}; src/core/scheduling/{types.ts,GraphScheduling.ts}, new src/core/scheduling/dependencyMilestones.ts for pure milestone validation if extraction keeps the scheduler focused; src/core/{kernelTypes.ts,TraversalKernel.ts}; src/traversals/dag-traversal/lib/DagProgress.ts; focused tests and new tests/dag-completion-dependencies.test.ts; examples/dag-completion-dependencies-example.ts; README.md,CHANGELOG.md,scripts/verify-package.cjs.

**Interfaces:** MakeVertexResult adds dependsOnComplete?: readonly VertexId[]. GraphVertex optional copied field. W/C reverse indexes and unmet sets gate existing ON_READY; C is committed ON_COMPLETE only. Summary optional unmetCompletePrerequisiteIds and union field. Existing diagnostics fields preserved with stable raw-ID projection of milestone SCCs.

- [ ] RED tests for a composite bundle with two compile children and a dependent requiring bundle C: bundle W alone never releases dependent; both children and bundle ON_COMPLETE commit do. Add async held completion callback, same ID in W+C, shared/duplicate children, omitted/deleted gates, seeded bundle pending child and seed-only original invalid cycle tests.
- [ ] Implement storage/result copies and scheduler C bookkeeping. Both sets must be empty to admit W; markPreVisited only releases W; markComplete releases C once. Update restore/delete/tombstone/continuation paths, topology validation cache invalidation, and kernel progress projection. Do not independently reimplement existing W scheduling or change the performance stage semantics.
- [ ] Build iterative milestone graph tokens with wait edges W(v)→W(p), W(v)→C(p), C(v)→W(v), C(v)→C(retained child). Reuse SCC with object tokens keyed by raw VertexId. Prove legal default parent/child and explicit independent-child join; reject child→ancestor-C, self-C and mixed cycles. Eager rejects before visitors; lazy retains existing admission/discovery guarantees and reports known invalid stalls.
- [ ] Preserve legacy root/tree matrix from spec. Distinguish absent/undefined metadata from explicit[]. Keep completion fields optional in public type/view shapes; normalized empty array does not alter old views. Tests include undefined/NaN/reference IDs and detached snapshot mutations.
- [ ] Add runnable generic build-join example, new packed type/runtime smoke and Unreleased docs. Run focused tests during iteration then frozen full check and diffcheck,100%coverage. Commit explicit product files and write ignored report with RED/GREEN and evidence.

**Deliverable:** Independently useful graph milestone semantics, with no prerequisite fetch callback yet.

### Task 2: Coalesced prerequisite resolution and detached components

**Files:** src/core/TraversableGraph.ts; src/core/drivers/callbackBindings.ts; src/core/effects/types.ts; src/core/{kernelTypes.ts,TraversalKernel.ts}; src/core/graph/{types.ts,GraphStore.ts,ResolvedGraphsContainer.ts,snapshot.ts}; src/core/scheduling/GraphScheduling.ts, new src/core/scheduling/PrerequisiteResolution.ts for lookup demand/ownership state if needed; DAG runner/config bindings and public barrel types as necessary; new tests/dag-prerequisite-resolution.test.ts and tests/async-dag-prerequisite-lifecycle.test.ts; existing snapshot/pruning/seed/inspection/driver tests; examples/dag-prerequisite-resolution-example.ts; README.md,CHANGELOG.md,scripts/verify-package.cjs.

**Interfaces:** TraversableGraph.resolvePrerequisite?(id: VertexId): MakeVertexResult<T> | undefined; async version MaybePromise of same. undefined means not found; vertexContent:null deliberately omits and satisfies W/C. Missing own vertexId inherits request; explicit mismatch throws Error('Prerequisite result vertex id and requested vertex id mismatch'). RESOLVE_PREREQUISITE effect and dedicated owner use existing callback transport. Detached accepted vertices own persistent-in-container traversal anchors, not fake parents.

- [ ] RED public tests: lazy ordinary root requires parser; parser requires lexer; both found transitively and execute before app. Two consumers and W+C references cause one lookup per ID. Undefined return causes typed missing stall; explicit omission succeeds; exact thrown/rejected values including undefined preserved; explicit undefined/NaN/reference IDs coalesce by SameValueZero. Missing unused seed is not fetched.
- [ ] Bind optional hook with adapter receiver intact, add effect/reply/owner union and flags, route through shared sync/async callback transport. No direct adapter invocation in scheduler or summary. Sync thenables keep existing misuse errors with new effect name; async callbacks obey existing concurrency and halt/drain rules.
- [ ] Implement demand from original retained W/C declarations, prefer normal discovery waves before unknown lookup; close eager discovery only at natural+lookup fixed point. Cache not-found per runner without omission tombstone; real later discovery can supersede it. Avoid infinite loops and repeat callbacks. Recheck live identity/tombstones at admission and reply; first accepted vertex wins without overwrite, omission/content conflicts remain errors.
- [ ] Add genuine detached insertion with saved snapshots and independent anchors. No setRoot or fabricated edge/context; parentless paths start at the vertex and public depth0, including synthetic mode. Later real discovery can link the same vertex without losing its anchor. Parent removal retains anchor; explicit anchor/root deletion obeys cascade rules. Completion checks include all retained detached work.
- [ ] Lifecycle regressions: delayed shared lookup survives one-consumer deletion; all-demand deletion invalidates queued/in-flight owner; root deletion prevents late resurrection; iterator halt/return stores results without hidden mutation and resume consumes once; fatal error invalidates outstanding lookups; summary/inspect never cause calls. Cover active and saved graph views, continuation boundary restrictions, original cycles hidden by seeds, and recursive C lookup closure.
- [ ] Add executable generic module-registry example with async lookup and packed consumers. Update Unreleased docs with lookup scope, negative cache lifetime, graph snapshot responsibility, partial discovery and no persistence of handles. Focused tests then frozen full npm run check,100%coverage, diffcheck and commit; report exact evidence in ignored workspace.

**Internal organization:** Keep new lookup queue/state logic in a focused helper if it would otherwise substantially grow TraversalKernel. The kernel still owns effect issuance and lifecycle transitions; no adapter callback moves into the helper. This is a targeted extraction for the new feature, not a general kernel rewrite.

**Deliverable:** Generic on-demand dependency lookup integrated with both runners, validated with milestone semantics and safe lifecycle ownership.
