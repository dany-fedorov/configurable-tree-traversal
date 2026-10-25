# Autonomous-agent workflows with CTT

[Documentation map](index.md) · [Quickstart](../README.md#quickstart-find-the-next-agent-tasks) · [API reference](reference.md)

This guide describes the unreleased checkout API; published npm 0.11.0 users should read the [migration guide](migration-uniform-api.md).

Use CTT when agents or tools perform work with dependencies: research before implementation, independent specialist tasks in parallel, verification after several branches, or review after an entire composite completes. CTT supplies graph discovery, dependency readiness, lifecycle transitions, and inspection. Your coordinator supplies the workflow and executes it.

## On this page

- [Choose an execution model](#choose-an-execution-model)
- [Discover the graph](#discover-the-graph)
- [Work dependencies and completion joins](#work-dependencies-and-completion-joins)
- [Accept results and resume](#accept-results-and-resume)
- [Persist facts and reconstruct](#persist-facts-and-reconstruct)
- [Retries, human waits, and graph revisions](#retries-human-waits-and-graph-revisions)
- [Troubleshoot a workflow](#troubleshoot-a-workflow)

## Choose an execution model

| Model | How it works | Appropriate when |
| --- | --- | --- |
| Host-controlled frontier | Set `workCompletion: 'externalSettlement'`; run to quiescence, then dispatch from the deferred frontier in `summary()` with its generations | Agents run externally, work needs claims/approval, or state must survive process loss |
| Work inside visitors | Use `AsyncDagTraversal` and await work in `ON_READY` visitors; normal chain completion releases dependents | One process owns execution and immediate callback failure should fail traversal |

Start with the host-controlled model for a durable agent coordinator. `DagTraversal` is sufficient when graph facts are already in memory; use `AsyncDagTraversal` for asynchronous adapters. The host can run asynchronous agents independently of which runner it uses.

With visitor execution, `concurrency` bounds invoked callbacks, including adapters and visitors. It does not bound externally dispatched agents after external deferral, enforce a token budget, or provide distributed claims. A returned/awaited callback must represent completion of its work: launching a background job and returning immediately releases its dependents too early.

A host-controlled tick follows this sequence:

```text
load graph revision + accepted facts
              ↓
construct runner → prepare preview → run → defer eligible work
              ↓
read deferredFrontier records → filter claims/waits → rank candidates → claim and dispatch agents
              ↓
validate result + attempt/revision → durably accept completion
              ↓
settle retained runner + run again, or reconstruct next tick
```

The same vertex can remain in `readyIds` while an external agent is running. CTT's `inFlightIds` tracks its own visitor chains, not the host's external attempts. Always overlay host claims, capacity, and waits before dispatch.

## Discover the graph

CTT traverses the graph your adapter provides; it does not generate a plan from a goal or work-item type. A host's `planDag` can select a type-specific template or generate and validate a revision, then adapt its nodes to CTT. `planDag` is a host function, not a CTT API. Hints describe how to discover that plan.

| Concept | CTT representation | Host responsibility |
| --- | --- | --- |
| Stable work identity | `vertexId` | Choose IDs that can be reconstructed and matched to accepted facts |
| Opaque task data                 | `vertexContent.$data`                                         | Agent role, prompt/artifact references, policy and metadata        |
| Discovery and structure          | `makeRoot()`, `makeVertex(hint)`, `vertexContent.$childHints` | Supply the complete intended catalog and structural relationships  |
| Initial-work dependency | `dependsOn` | Declare which work must be accepted first |
| Structural-completion dependency | `dependsOnComplete` | Declare which composite must finish before work begins |
| Missing prerequisite lookup | Optional `resolvePrerequisite(id)` | Fetch graph facts from a catalog/service |

For a known set of independent work items, use `syntheticRoot: true`, list every item in its `$childHints`, use `$childHints: []` on real vertices, and declare explicit `dependsOn` lists. `discovery: 'eager'` discovers and validates the reachable graph before visitors execute. This includes disconnected catalog entries; it cannot detect work omitted from the supplied domain.

Discovery and execution dependencies are distinct. Graph sources default to `implicitParentDependency: false`: omitting `dependsOn` means no work prerequisites. Declare explicit lists (including `[]`), or set `implicitParentDependency: true` to inherit the discovery parent's W when the list is omitted. Ordinary roots honor W by default; `rootDependencies: 'ignore'` suppresses root W only, never C. Children of a synthetic root have no implicit dependency on the holder. See [discovery versus execution](reference.md#discovery-and-execution-as-separate-phases).

A prerequisite ID alone does not make a vertex discoverable. Include it through hints/catalog entries or supply `resolvePrerequisite`. That hook may find further prerequisites transitively; concurrent demand is coalesced. Return `{ kind: 'found', vertex: { vertexId, vertexContent: { $data, $childHints }, dependsOn } }` for content, `{ kind: 'missing' }` for not found, or `{ kind: 'omitted', satisfiesDependencies: true }` for intentional omission. Omission deliberately omits the vertex and satisfies its dependencies, so it is not a representation of a failed agent or a temporary service outage. Let adapter errors propagate as appropriate. See [lookup and identity rules](reference.md#discovery-and-completed-work).

For a preview before dispatch, call `runner.prepare()` (await it on `AsyncDagTraversal`). It eagerly discovers the closure exposed by roots, hints and prerequisite lookup and validates the combined W/C graph, without visitors, execution events, new real-vertex completion, or deferred generations. Accepted `completedWork` seeds remain W facts. Inspect the graph at `HALTED` / `prepared`, then call `run()` to admit work without replaying discovery. Repeated preparation before execution is idempotent. This requires a fresh tree-source or graph-source runner without injected state/containers, even empty injected objects; invalid preparation requests reject recoverably. Once preparation begins, summaries report effective eager mode and eager topology freezing applies. After execution starts, preparation rejects.

Preparation can perform adapter I/O: keep business execution in the host or visitors. During async preparation, `requestPause()` stops future admissions but waits for admitted discovery callbacks to settle; callbacks are not canceled. The operation acknowledges `paused`; another `prepare()` continues it, or `run()` adopts discovery and executes. Failed preparation preserves the exact error. Empty and omitted-root previews still stop `prepared`.

Lazy execution remains available without preparation and may expose partial snapshots. `summary()` is observational and never fetches vertices. Use `DagTraversal<Workflow, Workflow, TaskId>` and `TraversableGraph<Workflow, Workflow, TaskId>` to carry host IDs through sources, summaries and settlement independently of data/hints. Every typed live result supplies an own `vertexId`; materialize class getters as own fields. See [identity migration](migration-uniform-api.md#caller-specified-graph-identity-types).

## Work dependencies and completion joins

| Declaration | Releases the dependent after… | Example |
| --- | --- | --- |
| `dependsOn: ['research']` | Research's initial work completes (W) | Implementation can start from accepted research |
| `dependsOnComplete: ['implementation']` | Implementation's committed completion transition (C), including discovery and retained children | Review waits for implementation and all its component tasks |
| Both lists | Every declared W and C prerequisite is satisfied | Review waits for a composite and a separate test-plan result |

Use work dependencies for flat agent tasks. Use completion dependencies when structural children are meaningful parts of a composite. Seeds in `completedWork` satisfy W only; children and completion visitors still have to complete before C is released.

Avoid making a child wait on its own ancestor's C when that ancestor must wait for the child to complete. CTT validates combined milestone cycles; seeding W does not make an invalid graph valid. Completion prerequisites add C gates independently of the declared W lists and the optional parent-inheritance policy. The [completion example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-completion-dependencies-example.ts) demonstrates a valid sibling join.

## Accept results and resume

Start from the [quickstart](../README.md#quickstart-find-the-next-agent-tasks). To advance its retained runner after the host has accepted `testPlan`:

```ts
const work = runner
  .summary()
  .deferredFrontier.find(({ vertexId }) => vertexId === 'testPlan')!; // Capture before dispatch, retain with the host attempt.
// First validate the host's revision/attempt and durably accept the result.
accepted.add('testPlan'); // In-memory simulation only.
runner.settle(work.vertexId, { kind: 'workCompleted' }, work.generation);
runner.run();
console.log(runner.summary().readyIds); // ['review']
```

For an async runner, await `runner.run()`. `settle()` itself is synchronous. A settlement wakes an active async consumer; after idle settlement, resume explicitly. Only one iterator may own a runner at a time. All runners expose `requestPause(): boolean`: true records a new request only while RUNNING, rather than acknowledging a halt. The active owner drains admitted chains to `HALTED` / `paused` without cancellation; a suspended iterator may need `next()` or `return()` to drive that boundary. Resume the same runner without replaying committed work.

Dispatch from `summary().deferredFrontier`: each readonly record atomically contains `{ vertexId, generation }`. It includes exactly live deferred work without an accepted outcome, in discovery order; queued-only, completed and deleted vertices are absent. Arrays and records are detached, retaining opaque ID identity. Filter this snapshot through host claims and capacity. DAG event `kind: 'workCompleted'` retains `order: ON_READY` and emits after committed W, including settlement; `kind: 'subgraphCompleted'` retains `order: ON_COMPLETE` after committed C. Event order, timing and phase filtering are preserved. Seeded work emits no synthetic work event. `ON_READY` visitors remain pre-work. Completion events are not dispatch signals. Alternatively, an actual enabled `ON_READY` callback can dispatch before the external policy defers its chain. All callback commands commit before normal external deferral. `ON_COMPLETE` remains automatic once W, discovery, children, and C prerequisites permit it.

Capture the generation belonging to the deferred work you dispatched. It is a local guard, not a durable attempt ID, distributed lease, or authentication token. The host must separately reject stale revisions, stale attempts, duplicate result delivery, and lost claims before accepting a result. An identical accepted settlement returns `false`; invalid, conflicting, or cross-runner settlement throws.

`{ kind: 'workCompleted' }` means the work is complete for dependency traversal. An accepted review rejection can still complete a review vertex if host policy says the review work is done. `{ kind: 'traversalFailed', error }` fails the whole runner and preserves the exact thrown value; it is not a retry request or a business outcome field. The progress state `completed` means traversal work completion.

## Persist facts and reconstruct

CTT does not prescribe a storage engine or ship a persistence adapter. Define storage interfaces in your host and implement them with SQLite, PostgreSQL, a service, or another provider. Provider interchangeability must preserve the host's claim and result-acceptance guarantees, not just CRUD method names.

| Persist in the host | Purpose |
| --- | --- |
| Graph revision, stable IDs, task definitions, W/C declarations and structure | Reconstruct the intended graph and associate results with the correct revision |
| Accepted outcomes and artifact references | Decide which work is complete for traversal and supply downstream inputs |
| Attempts, claims/leases, wait state, retry decisions and deduplication keys | Prevent readiness from dispatching duplicate or ineligible work |
| Accepted completion facts for the revision | Supply `completedWork` to a new runner |

Keep runners, vertex references, generation symbols, pending promises, and lookup handles in memory. A serialized summary is useful for presentation, but is not a runner checkpoint. CTT allows arbitrary SameValueZero IDs; durable hosts should choose their own stable serializable ID convention, such as strings.

On startup or each reconciliation tick:

1. Load a consistent graph revision and its host-accepted facts.
2. Construct a fresh graph-source runner with `completedWork`, eager discovery, and the full catalog (plus lookup if required).
3. Set `workCompletion: 'externalSettlement'` and run to quiescence.
4. Read `summary()` and filter readiness using persisted claims, waits, retries, and host capacity.
5. Claim and dispatch selected work. Validate incoming results and durably record accepted completion before settling a retained runner.

This ordering lets a crash after acceptance but before settlement recover by reconstruction. A crash during an external side effect still needs host idempotency, reconciliation, or compensation; CTT does not provide exactly-once external execution. Transactional claim/acceptance, compare-and-set revisions, and dispatch outboxes are host design choices, not built-in CTT guarantees.

The [reconciliation example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-reconciliation-example.ts) verifies that reconstructing from accepted facts yields the same ready IDs as advancing a retained runner. It uses an in-memory set to illustrate the contract, not a durable storage implementation.

## Retries, human waits, and graph revisions

- **Agent retry:** retain the task as incomplete; record the failed attempt and retry policy in the host. Do not send fatal `kind: 'traversalFailed'` unless you intend to fail the runner. Deferral must be the only command in its result; mixed results are rejected before any commands apply.
- **Human input or approval:** keep the task deferred and record a host wait. Exclude it from dispatch until the response is accepted; readiness alone will keep listing it.
- **New plan or graph revision:** construct a new runner and discard the previous runner's generations. Carry completion facts forward only when the host validates their meaning for the new revision. Do not seed every historic success blindly.
- **Cancellation or timeout:** cancel host executor work separately. Halting CTT does not cancel already-started callbacks or remote agents. Async close may wait for a pending callback.
- **Completion side effects:** prefer durable result acceptance in the host. Reconstruction can invoke completion visitors again even when initial work was seeded; make any external effects idempotent.

## Troubleshoot a workflow

| Symptom | Check |
| --- | --- |
| Work completed without an agent running              | Check `workCompletion: 'externalSettlement'`; the default `visitorReturn` completes W on normal callback-chain return. Seeds also mark W complete                           |
| The same agent task dispatches again | Host claim/attempt state must filter `readyIds`; deferral intentionally leaves work ready |
| Ready work seems absent | Run discovery first; inspect discovery completeness, seed IDs, and unmet W/C dependencies |
| Missing prerequisite or cycle | Catch `DagTraversalStallError`; inspect typed diagnostics. Check catalog coverage, lookup results, W/C declarations, and structural edges |
| A seeded composite still blocks review | Seeds complete W, not C; its retained children and completion transition must finish |
| A retry aborts everything                            | `settle(..., { kind: 'traversalFailed', error }, ...)` is fatal; keep retryable work incomplete in host policy                            |
| Settlement fails after restart | Generations are runner-local; reconstruct from accepted facts rather than replaying an old handle |
| An external task still runs after halt | Callback/executor cancellation belongs to the host |
| A node fetched by lookup is missing from a root walk | Resolved prerequisites may be detached; enumerate `getVertexRefs()` instead of only walking `getRoot()` |

Use `summary()` for DAG work readiness and diagnostics. Use `inspect()` for callback/iterator execution state. Both are observational; neither drives traversal. See [progress contracts](reference.md#deferred-dag-progress-and-reconciliation) and [inspection](reference.md#inspection-and-execution) for exact fields and limits.
