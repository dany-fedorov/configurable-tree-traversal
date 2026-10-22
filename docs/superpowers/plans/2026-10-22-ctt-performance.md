# CTT performance and lifecycle measurement implementation plan

> **For agentic workers:** Use subagent-driven-development task by task. Parent owns GitHub integration. Never commit ignored scratch reports or use git add -f.

**Goal:** Reduce profiled generic DAG overhead and add reproducible lifecycle measurements.

**Architecture:** Preserve existing scheduler/effects semantics; replace expensive internal snapshot reads and scans, reuse unchanged valid topology, and benchmark public APIs against independent dependency facts.

**Tech Stack:** TypeScript/Jest, Node22/24, CommonJS measurement scripts.

**Spec:** docs/superpowers/specs/2026-10-22-ctt-performance-design.md

## Global Constraints

- Preserve all six traversal families, arbitrary SameValueZero IDs, FIFO defaults, exact errors, seed/deferral/generation behavior and detached snapshots.
- Summary invokes no callbacks/resolvers and does not mutate traversal state or advance queues. Original declaration cycles must remain visible despite seeded work.
- No business policies, storage, dependency changes or speculative UUID replacement. Keep100%source coverage and existing Node22/24 packed-consumer checks.
- Existing published0.9.0 measurements remain immutable. New results identify their actual built artifact; no timing assertions or invented speedups.
- Scratch evidence stays ignored or under /tmp/ctt-next-evidence; never force-add it. Stage explicit product files only.

### Task 1: Optimize profiled discovery and summary overhead

**Files:** src/core/graph/{GraphStore.ts,ResolvedGraphsContainer.ts,types.ts}, src/core/scheduling/GraphScheduling.ts, src/core/TraversalKernel.ts; focused existing/new tests under tests; docs/performance/2026-10-22-dag-optimization.md and raw result JSON; scripts/profile-dag.cjs if a reproducible focused profiler is useful.

**Interfaces:** Existing GraphStoreContract and GraphScheduling feed the kernel. Add minimal internal read/accounting helpers as required; public GraphVertex and DagSummary remain detached. No new graph feature in this task.

- [ ] Read /tmp/ctt-next-evidence/profile-before-summary.json and profiling scripts; reproduce the named costs before changing source. Baseline raw profiles are local evidence, summarize with hashes rather than committing large raw profiles.
- [ ] Add behavior regressions before implementation: detached graph slots and summary arrays remain unchanged after later work; open/closed discovery transitions survive omitted/duplicate/deleted vertices and continuation reconstruction; early lazy diagnostics detect invalid original topology; deletion after eager validation and successful seed/settlement cannot leave stale validation or readiness. Use existing tests as patterns and cover newly introduced branches without timing thresholds.
- [ ] Implement narrow slot/depth/id reads where kernel/container currently copies entire parent snapshots per child. Maintain an open-discovery counter or equivalent indexed fact through register/restore/close/delete; avoid repeated full work scans in the admission hot path. Keep public graph copies intact. Use focused regression commands such as npm test -- --runTestsByPath tests/dag-summary.test.ts tests/dag-discovery.test.ts, choosing the actual existing file names after rg.
- [ ] Separate topology validation reuse from progress projection. Preserve original-edge diagnostics on invalid/unvalidated graphs. Successful eager validation may be reused when no topology change occurred; summary only reads this evidence. Never add mutation or callbacks to summary. Prove invalidation and mutation isolation with tests.
- [ ] Re-run discovery and isolated summary CPU profiles plus1k/10kbenchmark-dag measurements (same shapes/seeds,3samples,10summaries). Record before/after commands, artifact identity, frame evidence, medians/ranges and limits. Explain whether UUID allocation merits change from evidence; retain it if not.
- [ ] Run focused tests during iteration; frozen npm run check before commit. Preserve100%coverage. Check git diff --check and explicit changed paths. Commit and write ignored task report with RED/GREEN, full-check log path and exact before/after evidence.

**Deliverable:** Reviewed, measured runtime improvement with unchanged public behavior.

### Task 2: Extend lifecycle benchmark coverage

**Files:** scripts/benchmark-dag-lifecycle.cjs and scripts/benchmark-dag-lifecycle.test.cjs; package.json commands/check integration; README Development; CHANGELOG.md Unreleased notes; docs/performance/2026-10-22-dag-lifecycle.md and raw JSON.

**Interfaces:** Public sync/async DAG constructors, ON_READY/DEFER_READY, eager/lazy, syntheticRoot, completedWork, summary and settle. Reuse pure fixtures/Kahn helpers from benchmark-dag.cjs where appropriate; never duplicate scheduler logic as production code.

- [ ] RED node:test cases: chain a→b→c and diamond a→{b,c}→d progress one accepted batch at a time; expected initial frontier[a], after a[b,c], after b[c], after c[d]. Both runners and discovery modes must agree at complete quiescent catalog boundaries; callbacks must not run from summary. Reconstructed runners match retained runners for the same accepted facts. Reject zero/negative/fractional/unsafe CLI counts. Do not hardcode current package version in reusable tests.
- [ ] Implement bounded public-API lifecycle measurements. Default100vertices,3samples,10summaries,5ticks,batch64,async concurrency4; CLI maxima vertices10000,samples100,summary iterations10000,ticks100,batch10000,concurrency1000. Track exact settled counts and early completion; rank by deterministic fixture ID order outside timing. Use one excluded warmup. All correctness assertions outside measured regions.
- [ ] Measure sync/async and eager/lazy separately. Settlement, resumed run, reconstruction and summary metrics must state inclusions/overlap. Async visitor uses a resolved Promise and DEFER_READY; report it as callback scheduling overhead, not external I/O. Keep independent Kahn parity over equivalent facts and explicit partial-discovery labels.
- [ ] Emit JSON with artifact path/hash/version, environment, exact command, V/E,seeds/ticks/batches/concurrency, callbacks and raw per-case/tick data/statistics. Minimal positive-integer CLI; optional --library-path works with package directory or entry. Keep snapshots bounded rather than retaining all graph states.
- [ ] Record the discovery/summary optimization and lifecycle tooling in CHANGELOG.md under Unreleased; do not change the package version or claim publication.
- [ ] Wire npm run benchmark:dag:lifecycle and correctness tests into check after build. Run representative100/1000vertex measurements; record concise findings and limitations. Run frozen full npm run check and diff check; commit with full ignored report. No runtime changes in this task.

**Deliverable:** Broader reproducible performance/correctness evidence, independent of later graph/packaging stages.
