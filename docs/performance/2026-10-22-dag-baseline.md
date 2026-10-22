# DAG discovery and summary baseline — 2026-10-22

This benchmark inspects synchronous DAG readiness using the public `DagTraversal`, `DagTraversalOrder.ON_READY`, `DEFER_READY`, eager discovery, a synthetic catalog root, `completedWork`, and `summary()`. It runs no business work or settlements. The catalog root discovers all vertices, including disconnected components. V excludes that synthetic root; E counts only prerequisite edges. Every real vertex has an explicit string ID `v0` through `v(V-1)` and no structural children. Prerequisite edges always point from earlier to later IDs.

## Reproduce

```sh
npm ci
npm run build
npm run test:benchmark
npm run benchmark:dag -- --vertices 1000 --samples 3 --summary-iterations 10

# Select a freshly installed registry package explicitly; stdout is JSON.
mkdir -p /tmp/ctt-dag-registry
npm install --prefix /tmp/ctt-dag-registry --ignore-scripts --no-audit --no-fund configurable-tree-traversal@0.9.0
node scripts/benchmark-dag.cjs --vertices 1000 --samples 3 --summary-iterations 10 --library-path /tmp/ctt-dag-registry/node_modules/configurable-tree-traversal > /tmp/dag-1000.json
node scripts/benchmark-dag.cjs --vertices 10000 --samples 3 --summary-iterations 10 --library-path /tmp/ctt-dag-registry/node_modules/configurable-tree-traversal > /tmp/dag-10000.json
```

The default artifact is built `dist`. `--library-path` accepts a package directory or CommonJS entry file. Output records the resolved and real entry paths, manifest path/name/version, SHA-256 of the entry file, exact argv, working directory, Node/V8, platform, architecture, OS release, CPU, V/E, seeds, callbacks, raw samples and statistics. The entry hash identifies that file; it is not a hash of every dependency or a substitute for npm tarball integrity verification.

All numeric controls must be positive safe integers: vertices 1–10,000, samples 1–100, summary iterations 1–10,000. Bounds prevent accidentally unbounded catalog/sample allocation. Summaries replace the previous snapshot rather than accumulating history. High repetition counts can still take substantial time. The harness records no heap deltas and does not force GC.

## Fixtures and policy

| Shape         | Prerequisites of vertex i (zero-based)                                                                                      | E at V=1,000 / 10,000 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------: |
| chain         | i−1, except vertex 0                                                                                                        |           999 / 9,999 |
| independent   | none                                                                                                                        |                 0 / 0 |
| diamond       | repeat a fork into two branches and a join: i mod 3 = 1/2 depends on its preceding join; i mod 3 = 0 depends on i−2 and i−1 |        1,332 / 13,332 |
| sparse        | floor((i−1)/2), plus i−2 when i is a multiple of 3 and at least 3; duplicate edges removed                                  |        1,331 / 13,331 |
| bounded-dense | previous min(i,32) vertices; fan-in capped at 32                                                                            |      31,472 / 319,472 |

Vertex 0 has no prerequisites in every shape. Topologies use fixed formulas and no pseudorandom generator, so the topology random seed is `null`. Each shape runs with empty completed work and with the first floor(V/2) IDs completed. Both supplied seed sets are prerequisite-closed. The prefix seed is recorded by kind/count, allowing exact reconstruction without storing thousands of IDs.

Each case runs one full warmup followed by three reported samples, sequentially in shape order and then empty/prefix order. Each sample reconstructs the fixture and runner and performs ten timed summaries. Warmups are excluded from every reported sample, median and range. The summary batch includes the loop and reading each snapshot's `vertices.size`; assertions run outside every timed region. Every run asserts CTT/Kahn readiness parity, resolver/inspector counts, completed IDs, complete discovery and no diagnostics, then asserts that repeated summaries preserve the full snapshot, runner status and callback counts. Small fixture checks also assert hand-derived edge counts and frontiers, including a disconnected handwritten Kahn example and one-vertex CLI behavior. There are no timing thresholds.

## Timing boundaries

- **Fixture construction:** allocate IDs and prerequisite arrays; excludes completed-work seed creation.
- **Runner construction:** build the adapter's ID lookup, construct the traversal, register the inspector callback and call `makeRunner()`.
- **Eager to first ready:** enter `run()` through the first `ON_READY` callback. This includes traversal setup, eager catalog discovery and validation. It overlaps the run measurement and is not an isolated discovery timer.
- **Run to quiescence:** enter `run()` through return. This includes discovery, validation and deferral admission. The callback returns `DEFER_READY`; the runner stops at its halted frontier.
- **Kahn index/frontier:** independently build indegrees and reverse prerequisite edges, remove supplied seeds, then select zero-indegree unfinished vertices. It measures dependency indexing/frontier only and omits CTT resolver, lifecycle, identity and validation features. These numbers are not a speedup claim.
- **Summary:** repeated `summary()` snapshots after quiescence, including allocation and possible GC; divide batch time by repetitions for per-call values. Full diagnostics and progress projection remain part of the public method.

## Recorded measurements

Both recorded runs loaded the freshly installed **npm registry `configurable-tree-traversal@0.9.0`**, after the release controller verified the published tarball integrity against the reviewed release and ran sync/async consumer smoke checks. These are published-artifact measurements, not candidate measurements.

- Raw [1,000-vertex results](2026-10-22-dag-1000.json) and [10,000-vertex results](2026-10-22-dag-10000.json) contain all 60 reported samples, timing medians/ranges, exact commands and artifact/machine metadata.
- [Registry provenance](2026-10-22-dag-registry-provenance.json) preserves npm metadata and installed dependency lock entries. Registry tarball integrity: `sha512-rdG9ZN5b5bZGM2kbSsVLulQ51FY/U3br7Jmk3YFSSJSpAA448pLHCCWFF8OTMHsbBx7NiwjpxeEPgz9f0D9G/w==`.
- Loaded entry: `/tmp/ctt-090-evidence/registry-consumer/node_modules/configurable-tree-traversal/dist/index.js`; entry SHA-256: `64ebb18eaf4d8c87a159f625dbc2dd52cb21205c3abf3ea941b0e51afcb4a8dd`.
- Machine: Node v24.20.0, V8 13.6.233.17-node.53, linux/x64, kernel 7.0.11-76070011-generic, 12th Gen Intel(R) Core(TM) i7-12800HX (24 logical CPUs).
- Run starts (UTC): 2026-10-22T20:26:05.733Z and 2026-10-22T20:26:22.654Z. Each run completed with all per-sample frontier, count and purity assertions passing.

Exact recording commands (after the controller installed and verified the registry package):

```sh
node scripts/benchmark-dag.cjs --vertices 1000 --samples 3 --summary-iterations 10 --library-path /tmp/ctt-090-evidence/registry-consumer/node_modules/configurable-tree-traversal > docs/performance/2026-10-22-dag-1000.json
node scripts/benchmark-dag.cjs --vertices 10000 --samples 3 --summary-iterations 10 --library-path /tmp/ctt-090-evidence/registry-consumer/node_modules/configurable-tree-traversal > docs/performance/2026-10-22-dag-10000.json
```

Timings below are milliseconds: **median (min–max)** over three samples, with warmups excluded. Summary is per call (ten calls per sample). E appears in the fixture table above. Root resolver calls were always 1, vertex resolver calls always V, and inspector callbacks always the reported frontier count.

|     V | Shape         | Seed count | Frontier |         Eager to first ready |            Run to quiescence |           Summary/call |    Kahn index/frontier |
| ----: | ------------- | ---------: | -------: | ---------------------------: | ---------------------------: | ---------------------: | ---------------------: |
|  1000 | chain         |          0 |        1 |       43.850 (41.276–47.111) |       45.013 (42.722–49.221) |    1.133 (0.897–1.138) |    0.332 (0.305–0.367) |
|  1000 | chain         |        500 |        1 |       35.351 (33.441–36.449) |       38.232 (37.536–38.872) |    0.916 (0.884–1.042) |    0.413 (0.408–0.414) |
|  1000 | independent   |          0 |     1000 |       38.734 (33.951–50.150) |       42.046 (37.423–56.029) |    0.675 (0.634–0.784) |    0.264 (0.223–0.279) |
|  1000 | independent   |        500 |      500 |       30.459 (29.929–38.187) |       34.088 (32.309–40.447) |    0.641 (0.636–0.708) |    0.180 (0.172–0.188) |
|  1000 | diamond       |          0 |        1 |       32.362 (31.108–40.079) |       33.405 (32.288–41.244) |    0.961 (0.928–1.108) |    0.199 (0.187–0.251) |
|  1000 | diamond       |        500 |        1 |       31.844 (31.477–31.951) |       33.760 (33.154–35.686) |    0.946 (0.915–1.056) |    0.278 (0.237–0.319) |
|  1000 | sparse        |          0 |        1 |       34.892 (31.033–44.405) |       35.932 (32.145–45.762) |    1.181 (0.896–1.411) |    0.198 (0.188–0.523) |
|  1000 | sparse        |        500 |      334 |       34.100 (33.560–42.769) |       36.467 (36.356–44.678) |    1.146 (0.962–1.216) |    0.255 (0.251–0.270) |
|  1000 | bounded-dense |          0 |        1 |       46.274 (39.664–47.790) |       50.900 (43.679–52.509) |    4.490 (4.096–4.516) |    0.722 (0.667–0.791) |
|  1000 | bounded-dense |        500 |        1 |       42.146 (38.196–45.124) |       46.932 (42.573–49.712) |    3.813 (3.545–4.010) |    1.240 (1.106–1.308) |
| 10000 | chain         |          0 |        1 | 2997.591 (2847.763–3337.518) | 3018.084 (2875.780–3357.359) | 15.940 (15.287–17.455) |    3.599 (3.423–8.177) |
| 10000 | chain         |       5000 |        1 | 2772.901 (2672.631–3226.083) | 2804.832 (2694.957–3247.476) | 14.338 (14.147–15.689) |    3.128 (3.064–4.531) |
| 10000 | independent   |          0 |    10000 | 2762.870 (2719.442–2830.960) | 2795.510 (2746.268–2858.852) | 11.560 (11.047–11.781) |    2.694 (2.526–3.147) |
| 10000 | independent   |       5000 |     5000 | 2623.062 (2591.488–2654.214) | 2664.374 (2618.348–2679.963) |  10.135 (9.990–10.639) |    3.252 (2.648–5.216) |
| 10000 | diamond       |          0 |        1 | 2570.598 (2483.727–2755.578) | 2586.271 (2495.960–2772.929) | 13.111 (12.675–13.986) |    3.054 (2.832–4.059) |
| 10000 | diamond       |       5000 |        1 | 2629.554 (2579.790–2797.321) | 2649.943 (2596.788–2821.325) | 14.439 (13.519–17.317) |    5.189 (4.446–6.448) |
| 10000 | sparse        |          0 |        1 | 2705.566 (2537.109–2936.060) | 2719.717 (2554.400–2952.099) | 16.778 (15.767–16.799) |    3.036 (2.839–4.286) |
| 10000 | sparse        |       5000 |     3334 | 2654.424 (2578.895–2682.708) | 2678.635 (2605.764–2710.082) | 14.852 (12.519–15.532) |    5.424 (4.770–5.912) |
| 10000 | bounded-dense |          0 |        1 | 2875.797 (2818.632–2944.377) | 2926.629 (2873.369–3002.805) | 52.614 (52.568–53.287) |    9.073 (8.363–9.962) |
| 10000 | bounded-dense |       5000 |        1 | 3220.743 (2831.312–3455.205) | 3269.847 (2881.184–3570.427) | 47.688 (46.939–60.159) | 15.942 (11.530–22.216) |

Fixture construction and runner construction remain separate raw metrics. At 10,000 vertices, their medians were respectively 0.948–17.326 ms and 0.812–1.219 ms across cases. The dense fixture is more expensive to construct because it stores 319,472 prerequisite edges.

Increasing V tenfold increased median run time 57.5–78.5 times across matching cases, while median summary cost increased 11.7–17.1 times. Even the independent graph with E=0 grew from 42.046 to 2,795.510 ms for the empty seed. These observations show a scaling concern in this workload; they do not establish an asymptotic bound or identify a causal hotspot.

At 10,000 vertices, the combined interval before the first ready callback represented 98.3–99.5% of the median run time. That interval includes traversal setup, eager discovery and validation, so it is the first region to investigate with a profiler. It is not a separately measured discovery cost. The slowest median run here was the bounded-dense prefix case at 3,269.847 ms. Dense summary medians were 47.688–52.614 ms per call, compared with 10.135–16.778 ms for the other shapes at the same V. This makes repeated full snapshots another follow-up candidate, with both vertex and prerequisite volume relevant to future investigation.

The Kahn numbers provide an independent correctness/readiness reference and a deliberately narrower indexing/frontier measurement. The omitted CTT semantics and different allocation/lifecycle work prevent interpreting their timing ratio as a product speedup.

## Interpretation limits and follow-ups

These are wall-clock measurements on one shared machine and one Node version, with three reported samples per case. JIT compilation, GC, thermal/CPU scheduling and unrelated host activity can affect them. Fixed case order and per-case warmups do not remove those effects. Every sample creates a fresh graph/runner, but the process/module/JIT and allocator are shared. The pure Kahn pass runs before CTT, potentially warming equivalent prerequisite facts. Callback counters, the first-callback clock read and snapshot consumption add instrumentation overhead.

This workload discovers the entire catalog, defers the current frontier and repeatedly snapshots it. It measures no settlement, resumed frontier advancement, business visitors, async concurrency, cancellation, serialization, persistence, or optimal scheduling. Bounded dense graphs have at most 32 prerequisites per vertex; their E grows approximately linearly with V. They do not model a fully connected DAG's quadratic edge count.

Two sizes and aggregate timers describe observed scaling, not an asymptotic complexity proof or causal profile. Before changing runtime code, profile representative discovery/validation and summary calls separately, distinguish snapshot allocation from dependency diagnostics, and repeat in isolated processes with additional Node versions and a controlled host. Consider different fan-in, frontier widths and seed proportions only as follow-up measurements. No runtime optimization or graph/workflow feature is included here.
