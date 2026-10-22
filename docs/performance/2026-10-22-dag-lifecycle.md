# DAG lifecycle measurements — 2026-10-22

This harness measures the local candidate's public DAG lifecycle: retained settlement/resume, fresh reconstruction from exactly the same accepted completion facts, and summaries. It runs synchronous/asynchronous and eager/lazy cases separately. It changes no runtime behavior, business policy, persistence, ID allocation, or public API. The published 0.9.0 discovery evidence in [the baseline report](2026-10-22-dag-baseline.md) remains unchanged; this is not a newly published package or a new comparison against that registry artifact.

## Workloads and reproduction

Build the candidate with `npm run build`, then run the following commands sequentially from the repository root, without heavy tests running concurrently:

```sh
node scripts/benchmark-dag-lifecycle.cjs --vertices 100 --samples 3 --summary-iterations 10 --ticks 5 --batch 64 --concurrency 4 --library-path ./dist > /tmp/ctt-next-evidence/task-2-lifecycle-100.json
node scripts/benchmark-dag-lifecycle.cjs --vertices 1000 --samples 3 --summary-iterations 10 --ticks 5 --batch 64 --concurrency 4 --library-path ./dist > /tmp/ctt-next-evidence/task-2-lifecycle-1000.json
```

The equivalent convenience command is `npm run benchmark:dag:lifecycle -- --vertices 1000`; npm's build/status text precedes JSON, so invoke the Node script directly when redirecting a standalone JSON artifact. `--library-path` accepts a package directory or entry file. Defaults are 100 vertices, three samples, ten summary iterations, five ticks, batch size 64 and async concurrency four. Positive safe integer limits are 10,000 vertices, 100 samples, 10,000 summary iterations, 100 ticks, batch size 10,000 and concurrency 1,000.

Each run includes 40 cases: chain, independent, diamond, sparse and bounded-dense (fan-in 32), each with empty or prerequisite-closed first floor(V/2) completed seeds, then sync/async and eager/lazy. Topology formulas are deterministic; random seed is null. Each case has one excluded warmup followed by three reported samples. The initial runner reaches quiescence, then each tick selects at most 64 ready IDs in fixture order, settles their current generations, resumes to quiescence, and constructs/runs a fresh runner from the resulting accepted facts. Selection, generation lookup, accepted-fact bookkeeping and all assertions are outside timing. The tick loop stops at completion or the requested tick cap; raw results contain accepted IDs, actual settled counts, completion and early-stop flags. Snapshots remain bounded per sample rather than accumulating a graph history.

The async visitor awaits `Promise.resolve()` and returns `DEFER_READY`. Its timings measure deterministic callback scheduling overhead at the selected runner concurrency, not external I/O or business-work throughput. Graph resolvers return synchronous in-memory fixture records in both modes.

## Correctness and discovery boundaries

Every quiescent boundary checks accepted completed IDs, discovered/deferred/in-flight counts, diagnostics, prior snapshot stability, and summary purity: repeated summaries preserve callback counters and runner status. The independent Kahn helper always indexes the full fixture and removes the same accepted completion facts; its resulting readiness is projected onto actually visible IDs. Unknown prerequisite edges are never deleted to create an artificially ready induced graph. Reconstruction checks the same facts, readiness, vertex work/unmet prerequisites, subtree completion and counts; generation tokens remain local to each runner.

A flat synthetic root lists every fixture ID, so all V declarations resolve by the initial quiescent boundary in these fixtures. Lazy `discovery.complete` can nevertheless remain false while dependent expansions are waiting on deferred prerequisites. Those boundaries are labeled `partial-discovery` in JSON; complete boundaries are labeled `complete-catalog`. The hand-written chain and diamond tests agree on readiness for their common discovered declarations after each accepted fact. For the diamond, lazy discovery remains incomplete at frontiers `[a]`, `[b,c]`, `[c]`, then completes at `[d]`. Independent work closes discovery at its initial frontier. These observations do not establish complete visibility for arbitrary lazy graphs with nested child hints.

## Timing boundaries

All values are milliseconds, with raw samples and median/min/max in JSON. Initial sample statistics and per-tick statistics are separate; each tick records its contributing sample count.

- Fixture construction measures only IDs and prerequisite arrays once per shape, shared by its cases; seed creation is excluded.
- Runner construction includes the adapter index, seed copy, traversal constructor, visitor registration and `makeRunner`.
- Initial run includes discovery, validation and deferred callback admission through quiescence. Resume measures only the later `run` call after settlement. Async run timing includes awaiting completion; sync timing contains no artificial Promise await.
- Settlement measures the selected `settle` calls and boolean-result collection. Per-accepted time divides by the actual accepted count and overlaps the batch metric.
- Reconstruction setup and run have the same boundaries as fresh construction and initial run, using accepted facts after that tick. Reconstruction total is their sum, excludes the timer gap and summaries, and overlaps both component metrics.
- Retained and reconstructed summary batches separately time repeated `summary()` calls plus consuming `vertices.size`, including allocation and possible GC. Per-call values divide by the iteration count and overlap their batch metric. These regions do not overlap run, settlement or reconstruction component timers. Correctness checks and snapshot comparison/copies are excluded.

The benchmark does not time Kahn: it is an independent correctness oracle with fewer responsibilities than CTT, not a throughput competitor.

## Candidate identity and raw evidence

Raw JSON: [100 vertices](2026-10-22-dag-lifecycle-100.json), [1,000 vertices](2026-10-22-dag-lifecycle-1000.json). Each file records the exact Node command, resolved artifact/manifest paths, version, environment, seeds, callbacks, raw cases/ticks and statistics. The candidate reports package version 0.9.0, loaded from `/home/df/.codex/worktrees/e0c2/configurable-tree-traversal/dist/index.js`, with enclosing checkout commit `262b228b280f049d113c545d4d5f440f809ed244`. That commit identifies the checkout at measurement time; the artifact files/hashes identify what was actually loaded.

The entry SHA-256 is `64ebb18eaf4d8c87a159f625dbc2dd52cb21205c3abf3ea941b0e51afcb4a8dd`. It alone cannot distinguish the optimized runtime. Full dist tree SHA-256 is `11a07eae51653c92e30946e9166199f13415d2163f47b6d32f5a67c97b703396`, covering 246 files. Reproduce it by concatenating records from `artifact.files[]` in their exact listed order: file SHA-256, two spaces, relative POSIX path, LF; then SHA-256 that UTF-8 string. The walker visits directories recursively with each directory's entries sorted using `name.localeCompare(otherName, 'en')`. The listed order is authoritative. All path/hash pairs match [Task 1's candidate artifact](2026-10-22-dag-optimization-artifacts.json); the tree hashes differ solely because that older manifest lists files in a different order. No runtime bytes changed in this task.

## Results and limits

Node v24.20.0 / V8 13.6.233.17-node.53, Linux x64, kernel 7.0.11-76070011-generic, Intel Core i7-12800HX, 24 logical CPUs. The 100-vertex command started at 2026-10-22T21:18:30.193Z; the 1,000-vertex command started at 21:18:40.384Z. Both commands ran sequentially with no heavy tests or other benchmark jobs from this work running concurrently.

Selected empty-seed medians, milliseconds, three samples. Settlement/resume/reconstruction/summary columns refer to tick one. Independent tick-one batches contain 64 accepted IDs; dense batches contain one, so settlement costs are not normalized across shapes. Dense lazy boundaries here remain partial; independent boundaries are complete. Full per-case/tick ranges, prefix seeds and chain/diamond/sparse results remain in JSON.

| V | Shape | Runner | Discovery | Initial run | Settle batch | Resume | Reconstruct total | Summary/call |
| ---: | :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| 100 | independent | sync | eager | 0.844 | 0.061 | 0.224 | 0.598 | 0.020 |
| 100 | independent | sync | lazy | 0.487 | 0.059 | 0.157 | 0.581 | 0.020 |
| 100 | independent | async | eager | 1.945 | 0.065 | 0.318 | 1.826 | 0.016 |
| 100 | independent | async | lazy | 1.610 | 0.062 | 0.272 | 1.802 | 0.018 |
| 100 | bounded-dense | sync | eager | 1.165 | 0.012 | 0.097 | 1.151 | 0.036 |
| 100 | bounded-dense | sync | lazy | 1.079 | 0.018 | 0.483 | 1.241 | 0.378 |
| 100 | bounded-dense | async | eager | 2.127 | 0.015 | 0.160 | 2.154 | 0.037 |
| 100 | bounded-dense | async | lazy | 2.631 | 0.013 | 0.442 | 2.264 | 0.320 |
| 1000 | independent | sync | eager | 5.887 | 0.083 | 0.683 | 5.911 | 0.253 |
| 1000 | independent | sync | lazy | 5.283 | 0.070 | 0.672 | 6.207 | 0.264 |
| 1000 | independent | async | eager | 63.727 | 0.072 | 0.879 | 122.110 | 0.280 |
| 1000 | independent | async | lazy | 116.321 | 0.075 | 0.970 | 92.422 | 0.225 |
| 1000 | bounded-dense | sync | eager | 11.199 | 0.018 | 0.981 | 13.007 | 0.492 |
| 1000 | bounded-dense | sync | lazy | 13.625 | 0.022 | 4.525 | 11.256 | 4.045 |
| 1000 | bounded-dense | async | eager | 91.673 | 0.023 | 1.087 | 88.064 | 0.523 |
| 1000 | bounded-dense | async | lazy | 88.262 | 0.024 | 3.889 | 92.305 | 3.595 |

At 100 vertices, independent empty seeds finish in two ticks (64 + 36 accepted IDs), while prefix seeds finish in one (50 IDs), across both runners and modes. At 1,000 vertices those cases settle exactly 320 IDs in five ticks and remain incomplete, including prefix cases with 500 original seeds. Chain and bounded-dense samples settle exactly one ID per tick, five total, at both sizes. The harness reports these exact counts rather than treating `ticks × batch` as accepted work or the bounded run as full completion.

At 1,000 vertices, empty-seed chain tick-one resume medians are 0.429/1.417 ms (sync eager/lazy) and 0.789/1.816 ms (async eager/lazy), while reconstruction totals are 6.474/7.174 ms and 92.854/140.609 ms respectively. Reconstruction includes fresh discovery and callback scheduling, so its metric describes more work than a retained resume. Dense partial lazy summary medians are 3.595–4.045 ms/call, versus 0.492–0.523 ms/call at eager validated boundaries. These are observations of the measured states, not general speedup claims or acceptance thresholds. All parity, reconstruction, count, callback-purity and snapshot assertions passed in all 80 measured cases (240 reported samples plus 80 excluded warmups).

One shared machine, one Node version and three sequential wall-clock samples per case do not establish asymptotic costs or production throughput. JIT, allocation, GC and host scheduling remain visible in the raw ranges; tiny settlement timings are especially noisy. Warmup excludes one full sample per case, but cases still share a process and fixture. Assertions are excluded from measured regions yet can influence later GC/JIT state. A bounded prefix of a lifecycle is not whole-graph completion throughput, and reconstruction deliberately repeats discovery/callback admission that a retained runner has already done. Lazy summary costs include uncached diagnostics while discovery is incomplete, so eager/lazy measurements describe different lifecycle states and are not directly interchangeable. No timing thresholds, heap deltas, forced GC, storage, networking or business policies are included.

Verification: `npm run check` builds the package before running both node:test benchmark suites, alongside type checking, lint, full source coverage, examples and packed consumers. The lifecycle tests use hand-derived chain/diamond/independent expectations for both runners and modes, one-batch-at-a-time settlement, reconstruction, snapshot/summary purity, early completion and CLI bounds. Independent review and Node 22/24 CI remain separate gates; no package is published.
