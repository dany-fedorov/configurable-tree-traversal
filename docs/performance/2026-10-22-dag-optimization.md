# DAG discovery and summary optimization — 2026-10-22

The local candidate removes the measured repeated parent-snapshot copies and full discovery scans, and reuses successful topology validation for eager summaries. The unchanged published 0.9.0 baseline and its measurements remain in [the baseline report](2026-10-22-dag-baseline.md). These new measurements compare a preserved local build at `7978210bcd45c1115d625173d23f011d4e835173` with this commit's candidate, both reporting package version 0.9.0; they are not measurements of a newly published package.

## Runtime changes and compatibility

Internal graph reads now copy one slot, one declaration array, or read depth/ID directly, instead of constructing a full public vertex snapshot for each child. Public graph records, their slot/edge records, and summary arrays remain detached, while arbitrary ID objects and refs retain their identity. Traversal slot reads also detach individual slot records.

Discovery completion uses a count of enrolled vertices whose expansion is not closed. Registration increments it, closure decrements once, deletion removes only still-open work, and continuation restoration rebuilds it from the accepted work. Duplicate identities and omitted/deleted arrivals add no enrolled work.

Successful validation records the graph store's topology version. Summaries may read this evidence; summaries never publish validation, invoke callbacks, or advance queues. Insertion, omission, tombstones, linking/closing slots, expansion preparation/reset, and removal invalidate the evidence. Status changes and data rewrites preserve it. Without matching successful evidence, summaries diagnose original dependency declarations, so completed seeds cannot conceal cycles and partial lazy summaries still expose discovered cycles. Progress projection still reports current unmet work independently. Invalid graphs retain the original diagnostic ordering and errors.

There is no whole-summary cache. Summary snapshots still allocate detached progress records and unmet-ID arrays. UUID allocation is unchanged: the baseline discovery profiles identify slot-copying and discovery scans as the major costs, and isolated summary profiles identify SCC diagnostics and GC. They provide no evidence that changing UUID identity allocation would address the measured bottlenecks.

Nine new regressions cover detached narrow/public reads, unchanged prior snapshots after deletion/settlement, open/closed discovery with duplicate/omitted/deleted arrivals, both closed and unprepared continuation restoration, original lazy seeded cycles, progress-only reuse, and invalidation after declarations, links, terminal slots, omissions, tombstones and deletion. A valid topology read does not certify later reads. Mutation probes independently remove closure accounting, force topology reuse before validation, expose a backing slot, and retain validation across deletion; each makes its semantic regression fail. Final verification uses the restored source.

## Artifacts and commands

[Complete artifact provenance](2026-10-22-dag-optimization-artifacts.json) lists every built file and SHA-256. The tree hash is SHA-256 of UTF-8 records concatenated in the exact order of each artifact's `files[]` array: `file-sha256`, two spaces, relative POSIX path, LF. Records are not sorted again. Both builds have 246 files. The unchanged index.js hash is `64ebb18eaf4d8c87a159f625dbc2dd52cb21205c3abf3ea941b0e51afcb4a8dd`; that entry hash alone cannot distinguish these builds.

- Before tree: `7c096fc336e50212f93354689d7fbe1d760318787dd3799cfcfac8c0cf86f4c9`, loaded from `/tmp/ctt-next-evidence/task-1-before/dist`.
- After tree: `1e938bb8f60f98e64aa0b7b16f5d81bb4065ffaba2021a5429c84a78146bfaa4`, loaded from `/home/df/.codex/worktrees/e0c2/configurable-tree-traversal/dist`.
- Environment: Node v24.20.0 / V8 13.6.233.17-node.53, linux/x64, kernel 7.0.11-76070011-generic, 12th Gen Intel Core i7-12800HX, 24 logical CPUs. Raw JSON records exact start times, resolved entry/manifest paths, commands and machine metadata.

The before artifact was copied before editing source, with its original package.json and a symlink to the existing node_modules. To recreate it elsewhere, build commit 7978210 in an isolated checkout with the same lockfile and Node version. Build the candidate separately with `npm run build`. From the candidate checkout, the exact measurement commands were:

```sh
node scripts/benchmark-dag.cjs --vertices 1000 --samples 3 --summary-iterations 10 --library-path /tmp/ctt-next-evidence/task-1-before > /tmp/ctt-next-evidence/task-1-before-1000.json
node scripts/benchmark-dag.cjs --vertices 10000 --samples 3 --summary-iterations 10 --library-path /tmp/ctt-next-evidence/task-1-before > /tmp/ctt-next-evidence/task-1-before-10000.json
node scripts/benchmark-dag.cjs --vertices 1000 --samples 3 --summary-iterations 10 --library-path ./dist > /tmp/ctt-next-evidence/task-1-after-1000.json
node scripts/benchmark-dag.cjs --vertices 10000 --samples 3 --summary-iterations 10 --library-path ./dist > /tmp/ctt-next-evidence/task-1-after-10000.json
```

The unchanged harness runs chain, independent, diamond, sparse and bounded-dense (fan-in 32), each with empty completed work and the prerequisite-closed first floor(V/2) IDs completed. The topology seed is null because formulas are deterministic. Each case has one excluded warmup, three reported samples and ten timed summaries per sample. V/E, seeds, callback counts, first-ready/fixture/runner/Kahn timings, individual samples and all correctness/purity assertions are retained in the raw results:

- [Before 1,000](2026-10-22-dag-optimization-before-1000.json), [after 1,000](2026-10-22-dag-optimization-after-1000.json).
- [Before 10,000](2026-10-22-dag-optimization-before-10000.json), [after 10,000](2026-10-22-dag-optimization-after-10000.json).

## Matched timings

Milliseconds, median (min–max), three samples. Run is entry to halted deferred frontier, including setup/discovery/validation/admission. First-ready timing overlaps it and is available separately in the raw JSON. Summary/call is a batch of ten snapshots divided by ten; allocation and possible GC are included. Assertions are outside timed regions. These are CTT-to-CTT observations; Kahn remains a narrower correctness oracle, not a product speedup comparison.

|     V | Shape         | Completed seeds |                   Before run |                 After run |     Before summary/call |   After summary/call |
| ----: | :------------ | --------------: | ---------------------------: | ------------------------: | ----------------------: | -------------------: |
|  1000 | chain         |               0 |       43.418 (39.901–44.852) |      7.791 (6.320–10.579) |     1.045 (0.924–1.060) |  0.313 (0.278–0.380) |
|  1000 | chain         |             500 |       35.001 (33.270–36.568) |       6.340 (5.649–7.372) |     0.914 (0.832–0.963) |  0.267 (0.188–0.371) |
|  1000 | independent   |               0 |       37.941 (34.079–55.097) |      8.413 (5.028–10.272) |     1.030 (0.776–1.361) |  0.298 (0.170–0.308) |
|  1000 | independent   |             500 |       31.275 (31.030–31.890) |       5.608 (4.446–6.280) |     0.643 (0.617–0.769) |  0.174 (0.165–0.311) |
|  1000 | diamond       |               0 |       30.609 (30.239–32.280) |       3.689 (3.553–5.053) |     0.834 (0.825–0.932) |  0.183 (0.150–0.184) |
|  1000 | diamond       |             500 |       32.846 (32.109–33.792) |       4.058 (3.983–7.458) |     0.815 (0.813–1.023) |  0.178 (0.174–0.350) |
|  1000 | sparse        |               0 |       30.669 (30.483–31.163) |       6.189 (3.408–6.400) |     0.904 (0.878–0.962) |  0.203 (0.149–0.357) |
|  1000 | sparse        |             500 |       35.659 (34.877–40.281) |       4.669 (4.323–5.961) |     0.954 (0.871–1.048) |  0.171 (0.169–0.178) |
|  1000 | bounded-dense |               0 |       41.158 (40.895–41.352) |    12.092 (11.571–12.728) |     3.420 (3.411–3.476) |  0.427 (0.396–0.644) |
|  1000 | bounded-dense |             500 |       40.415 (40.414–42.616) |    11.648 (10.075–12.024) |     3.270 (3.224–3.359) |  0.325 (0.256–0.615) |
| 10000 | chain         |               0 | 2587.974 (2546.761–3080.944) |    85.553 (72.501–87.988) |  15.931 (14.070–16.118) |  3.473 (2.796–4.655) |
| 10000 | chain         |            5000 | 2712.691 (2685.970–2827.205) |    82.831 (70.526–90.733) |  15.172 (13.120–15.490) |  3.422 (3.414–3.452) |
| 10000 | independent   |               0 | 2865.517 (2688.505–2940.734) |    70.237 (69.693–73.445) |  11.225 (11.034–11.536) |  3.464 (3.411–3.536) |
| 10000 | independent   |            5000 | 3083.110 (2876.369–4731.455) |    67.968 (65.308–78.480) |  12.543 (11.813–18.177) |  3.193 (3.174–3.400) |
| 10000 | diamond       |               0 | 3583.880 (3270.027–4022.159) |    70.018 (57.208–83.905) |  25.954 (23.073–30.677) |  2.772 (2.670–3.719) |
| 10000 | diamond       |            5000 | 3294.820 (2874.482–3446.038) |    79.667 (67.558–81.375) |  18.809 (16.195–20.322) |  2.721 (2.658–3.086) |
| 10000 | sparse        |               0 | 3311.562 (3071.829–3546.533) |    59.479 (54.076–64.064) |  21.289 (17.946–24.109) |  2.832 (2.772–2.938) |
| 10000 | sparse        |            5000 | 2781.055 (2758.726–3052.574) | 127.323 (116.724–175.553) |  17.349 (15.451–18.532) |  5.449 (4.328–5.687) |
| 10000 | bounded-dense |               0 | 3954.341 (3006.220–3993.956) | 195.158 (176.634–262.397) | 58.762 (49.330–109.630) | 8.698 (7.447–19.022) |
| 10000 | bounded-dense |            5000 | 2824.632 (2712.519–2862.661) | 200.443 (178.291–285.242) |  45.661 (43.844–46.225) |  7.107 (6.354–7.146) |

At 10,000 vertices, matched median runs fell from 2,587.974–3,954.341 ms to 59.479–200.443 ms; summaries fell from 11.225–58.762 ms/call to 2.721–8.698 ms/call. At 1,000 vertices runs fell from 30.609–43.418 ms to 3.689–12.092 ms and summaries from 0.643–3.420 ms/call to 0.171–0.427 ms/call. All per-sample frontier, seed, count and purity assertions passed.

## CPU evidence

[Profile aggregates](2026-10-22-dag-optimization-profiles.json) record SHA-256 of all six local raw profiles, sampled totals and the top twenty self-time frames with file/line locations. Large `.cpuprofile` files remain in `/tmp/ctt-next-evidence`. The initial before profiles were supplied with the task; reproduction confirmed their named hot paths before source changes.

| Profile                                               | Original before sampled ms | Reproduced before sampled ms | After sampled ms |
| :---------------------------------------------------- | -------------------------: | ---------------------------: | ---------------: |
| 10k independent discovery, empty seeds                |                   3515.423 |                     4279.393 |          195.990 |
| 100 isolated 10k bounded-dense summaries, empty seeds |                   5376.141 |                     7465.570 |          726.673 |

Discovery reproduction spent 1812.570 ms in the anonymous slot-copy frame (`GraphStore.js:208`), 933.934 ms in getGraphVertex, 380.829 ms in isDiscoveryComplete, and 331.652 ms in the public get closure. In the after profile none of these are among the top twenty self-time frames; GC is the largest frame at 31.084 ms. The profiled run wall time was 4209.287 ms before and 142.829 ms after. Discovery sampling includes module/fixture setup because Node's CPU profiler starts at process entry.

The isolated summary reproduction spent 1995.479 ms in stronglyConnectedComponents, 1856.193 ms in GC, and 785.120 ms in diagnoseStall. In the after profile SCC/diagnoseStall are absent; detached progress projection and allocation dominate, with GC at 153.158 ms. The inspector session starts only after the runner reaches quiescence, so discovery does not contaminate this summary profile. Inspector setup/stop sampling and sample granularity still add overhead; sampled totals are not independent wall-clock benchmark results.

The exact discovery helper was `/tmp/ctt-next-evidence/profile-existing.cjs`; its reproducible workload is:

```js
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const root = process.argv[2];
const { buildFixture, createInspection } = require(path.join(
  root,
  'scripts/benchmark-dag.cjs',
));
const lib = require(path.join(root, 'dist'));
const fixture = buildFixture(process.argv[4] || 'independent', 10000);
const { runner } = createInspection(lib, fixture, new Set());
const start = performance.now();
runner.run();
const runMs = performance.now() - start;
const s = performance.now();
if (process.argv[3] === 'summary')
  for (let i = 0; i < 100; i++) runner.summary();
console.log(
  JSON.stringify({
    phase: process.argv[3],
    shape: process.argv[4] || 'independent',
    runMs,
    summaryMs: performance.now() - s,
  }),
);
```

Run it before changing source and again after the candidate build (`CHECKOUT` is the checkout containing both the unchanged benchmark helper and the selected build):

```sh
node --cpu-prof --cpu-prof-dir=/tmp/ctt-next-evidence --cpu-prof-name=discovery-reproduced.cpuprofile /tmp/ctt-next-evidence/profile-existing.cjs "$CHECKOUT" discovery independent
node --cpu-prof --cpu-prof-dir=/tmp/ctt-next-evidence --cpu-prof-name=discovery-after.cpuprofile /tmp/ctt-next-evidence/profile-existing.cjs "$CHECKOUT" discovery independent
```

The isolated summary helper `/tmp/ctt-next-evidence/profile-summary.cjs` was:

```js
const inspector = require('node:inspector');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
const { buildFixture, createInspection } = require(path.join(
  root,
  'scripts/benchmark-dag.cjs',
));
const { runner } = createInspection(
  require(path.join(root, 'dist')),
  buildFixture('bounded-dense', 10000),
  new Set(),
);
runner.run();
const session = new inspector.Session();
session.connect();
const post = (method) =>
  new Promise((resolve, reject) =>
    session.post(method, (err, r) => (err ? reject(err) : resolve(r))),
  );
(async () => {
  await post('Profiler.enable');
  await post('Profiler.start');
  for (let i = 0; i < 100; i++) runner.summary();
  const { profile } = await post('Profiler.stop');
  fs.writeFileSync(
    '/tmp/ctt-next-evidence/summary-only-before.cpuprofile',
    JSON.stringify(profile),
  );
  session.disconnect();
  console.log('Isolated 100 summary calls profiled.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

For reproduction and candidate capture, copies named `profile-summary-reproduce.cjs` and `profile-summary-after.cjs` replace only the output basename with `summary-only-reproduced.cpuprofile` and `summary-only-after.cpuprofile`. The exact invocations were `node /tmp/ctt-next-evidence/profile-summary-reproduce.cjs "$CHECKOUT"` and `node /tmp/ctt-next-evidence/profile-summary-after.cjs "$CHECKOUT"`. Aggregate self time sums each sampled node's `timeDeltas` by call frame function/file/line, then divides microseconds by 1000.

## Limits and verification

One shared machine, one Node version and three wall-clock samples per case do not establish asymptotic behavior or production throughput. Before measurements ran while some development tests and tooling were active; the short after profiling pass overlapped the tail of the before benchmark. The matched candidate benchmark followed baseline completion. Host scheduling, JIT and GC variability remain visible in the ranges, especially the before 10k independent-prefix, diamond and dense samples. No timings are acceptance thresholds. Independent Node 22/24 CI and branch review remain separate gates.

The benchmark covers synchronous eager discovery and repeated summary at a deferred frontier. It does not measure settlement/resume throughput, async callback concurrency, lazy reconstruction, persistence or business work; lifecycle evidence is a separate task. Semantic tests cover both synchronous and asynchronous runners and continuation reconstruction. Full verification is `npm run check` (types, lint, 100% Jest coverage, examples, package consumers and benchmark tests), plus `git diff --check`. No version/exports/package files change and no package is published.
