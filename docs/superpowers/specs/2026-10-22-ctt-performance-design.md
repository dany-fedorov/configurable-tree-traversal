# CTT performance and lifecycle measurement design

Approved scope: the user's request to implement the remaining generic CTT roadmap. This stage improves demonstrated costs and expands evidence; graph extension and packaging contracts are separate stages. Business outcomes, priority, persistence and retry policy remain host-owned.

## Evidence and approach

Baseline 0e38f73 / published0.9.0 passes737tests. Existing 10k cases spend2.6–3.3s reaching a deferred frontier. New CPU profiles in /tmp/ctt-next-evidence confirm GraphStore.getGraphVertex slot/edge copying and GraphScheduling.isDiscoveryComplete full scans dominate discovery; 100 isolated bounded-dense summary calls spend~5.38s sampled CPU, including~1.55s SCC and~1.21s GC. Reproduction scripts/profile aggregates accompany the implementation report.

Use narrow internal graph reads instead of repeatedly materializing a public snapshot for one slot/depth/id; maintain discovery-open accounting through every register/restore/close/delete path. Public graph and summary containers remain detached, original ID identities remain unchanged. Do not expose mutable backing arrays through new public reads.

Reuse a successful topology validation only while its graph topology is unchanged. Keep topology validation separate from current unmet prerequisites; completed seeds cannot conceal cycles. Summary must not invoke callbacks/resolvers, mutate traversal state or advance queues; if no valid cached validation exists, compute diagnostics without publishing new mutable traversal state. Topology-changing acceptance/omission/deletion must invalidate evidence; data/status-only changes must not erase validation unnecessarily. Avoid a speculative whole-result summary cache and do not change error messages or legacy ordering.

Alternatives considered: replace UUID allocation first (rejected: not a demonstrated dominant cost); independent scheduler/ready-queue rewrite (rejected: changes semantics unrelated to profiles); narrow reads/accounting/validated-topology reuse (chosen: directly addresses measured work while retaining scheduler).

## Expanded measurements

Keep the published0.9.0 discovery baseline immutable. Add a separate lifecycle harness with sync and async runners, eager and lazy discovery, bounded settlement/resume ticks, and reconstructed runners from the exact same accepted completion facts. A complete synthetic catalog makes the supplied domain explicit. Lazy frontiers can be partial until discovery completes and must be labeled rather than compared as globally complete early.

Use independent Kahn facts to assert readiness after each quiescent tick, immutable prior snapshots, correct accepted completed IDs and no resolver calls from summaries. For retained execution accept a deterministic batch from the current frontier, settle each current generation, run to quiescence; for reconstruction build from the same resulting facts. Five ticks and bounded batches keep default workloads finite; stop early at completion and report actual settled count. Time setup, discovery/run, settlement, reconstruction and summaries separately with explicit overlapping regions, exclude warmups and all assertions. Async callback measurement includes deterministic awaited Promise resolution and runner concurrency; it is not external I/O throughput.

CLI must select artifact path, vertex/sample/summary/tick/batch/concurrency counts with positive safe bounds. Record exact artifact paths/hash/version, commit where available, Node/platform/CPU, V/E and seeds/facts/ticks, callbacks, raw samples, medians/ranges. Correctness fixtures include chain/diamond/independent and both sync/async, both discovery modes. Representative lifecycle runs use100and1000vertices; discovery comparisons repeat1k/10k against the unchanged published baseline harness. No timing thresholds or guessed asymptotic claims.

## Compatibility and gates

Preserve all six traversal families, arbitrary SameValueZero IDs including undefined/NaN/reference IDs, tree-source behavior, FIFO defaults, exact errors, deferral/generation replay and snapshot identity. Keep100% statements/branches/functions/lines. Add meaningful behavior regressions before changes, then focused checks and frozen full npm run check. Independent task and branch review, Node22/24 CI, push and merge. No package publication is required in this stage; report local candidate measurements truthfully.
