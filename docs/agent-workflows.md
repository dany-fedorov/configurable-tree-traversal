# Autonomous-agent workflows with CTT

[Documentation map](index.md) · [Quickstart](../README.md#quickstart-find-the-next-agent-tasks) · [API reference](reference.md)

Use CTT when agents or tools perform work with dependencies: research before implementation, independent specialist tasks in parallel, verification after several branches, or review after an entire composite completes. CTT supplies graph discovery, dependency readiness, lifecycle transitions, and inspection. Your coordinator supplies the workflow and executes it.

## On this page

- [Explore context and references](#explore-context-and-references)
- [Reuse workflow fragments](#reuse-workflow-fragments)
- [Choose an execution model](#choose-an-execution-model)
- [Discover the graph](#discover-the-graph)
- [Work dependencies and completion joins](#work-dependencies-and-completion-joins)
- [Accept results and resume](#accept-results-and-resume)
- [Persist facts and reconstruct](#persist-facts-and-reconstruct)
- [Retries, human waits, and graph revisions](#retries-human-waits-and-graph-revisions)
- [Troubleshoot a workflow](#troubleshoot-a-workflow)

## Explore context and references

Choose `GraphWalk` / `AsyncGraphWalk` to gather context, follow code references or collect provenance from cyclic/shared information graphs. Choose DAG traversal when relationships mean work/completion prerequisites. A walking edge has caller-defined meaning and supplies no dispatch readiness. A found isolated root still produces a vertex; parallel and back edges remain observable in the same walk. See the [five-vertex/six-relationship context example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts) and [exact walking contracts](reference.md#general-graph-walking).

For a finite in-memory catalog, use `materializeWalkSourceFromRecords(items, { id, outgoing, roots })`; its async counterpart materializes async inputs once and returns a synchronous source. For lazy retrieval, supply `source.roots()`, optional `source.resolveVertex(id)`, and `source.outgoing(vertex)` to the walking constructor. Use `{ vertexId }` targets when the host has IDs, `{ vertexId, resolution: { kind: 'found', data } }` when discovery already hydrated the endpoint, or mix both. Fully hydrated sources need no resolver. `materializeWalkSourceFromDagDefinition(definition, { relations })` explicitly projects selected declaration links without DAG execution validation. Do not pass a `DagDiscoverySource` / `TreeSource` directly; their source context and omission contracts differ.

Use phase-keyed vertex and edge visitors to collect typed endpoint data in one session. Use `iterateEvents({ emitEvents: [...] })` for pull integration; explicit selections narrow the delivered event union, while callbacks are independently controlled by `visitorPhases`. `walkGraph(options)` / `await walkGraphAsync(options)` are one-shot helpers returning the runner. Source callbacks and visitors execute serially, including async walking; no concurrency setting is accepted. The [reference example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts) shows callbacks, async iteration, endpoint discriminants, common inspection and wrappers that preserve each family's phase type.

Default `revisit: 'once'` collects each vertex and every followed relationship. Select `simplePaths` for prefixes without repeated vertices, or `walks` for repeated routes; both require a depth or step bound. Always carry `runner.summary().outcome` into a host result so `limited` cannot be mistaken for completeness. Paths include every prefix; parallel relationships can produce identical vertex sequences with distinct edge indices. DFS depth bounds apply to its first route; BFS finds shortest discovery depths. See the [bounded provenance example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-paths-example.ts).

The host owns authorization, retrieval policy, stable IDs, relationship meaning, retries, freshness, timeouts, persistence and any agent/model invocation. The first admitted resolution for an ID wins, including omission; a fresh runner is required to observe replacement data. Walking does not retry omissions or certify a remote transactional snapshot. A budget bounds exploration steps/occurrences/depth, not host callback duration or tokens. Consumer iterator `return()`/loop break pauses and retains resources for continuation; terminal runner `close()` disposes them after execution ownership has been released. Active terminal close rejects: first return the iterator or request and await pause. Iterator return/pause and async cleanup require pending host work to settle and do not cancel promises. A failed runner retains its exact error; closing it rethrows that same error without repeating cleanup. Retain/dispose paused runners deliberately; there is no durable walking checkpoint or built-in network/LLM integration.

## Reuse workflow fragments

Capture a discovered topology through `prepared.definition`, or author materialized source facts with `defineDag` and validate them with `prepareDagDefinition`. `defineDagFragment(definition, ports)` names live local boundary vertices. Keep each fragment closed over its live and known omitted identities; provide all cross-fragment dependencies when composing.

Instantiate a template with `instantiateDagFragment(fragment, { mapId })`, giving each local identity a host-selected global ID. Mapping runs once per live/omitted identity and supports object IDs. Then `composeDag(instances, { dependencies, children })` concatenates ordered entries and validates the entire graph. Choose `milestone: 'work'` to wait for accepted initial work or `'subgraphCompletion'` to wait for the full retained subgraph. Structural child links and execution waits are separate options.

Invalid ports, identity collisions and nonexistent wire endpoints throw `TypeError`; cycles between valid endpoints return invalid issues. Only a valid result exposes a prepared DAG. Create independent runners or sessions from that result, selecting accepted completion facts explicitly for each run. Templates, agent roles, claims and business outcomes remain host data and policy. See the [fragment contract](reference.md#dag-fragments-and-composition) and [runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts).

## Choose an execution model

| Model | How it works | Appropriate when |
| --- | --- | --- |
| Host-controlled frontier | Use a prepared DAG's `createWorkSession()`, then `advance()` and dispatch its frontier tickets; custom runners can use `createDagWorkSession` / `createAsyncDagWorkSession` | Agents run externally, work needs claims/approval, or state must survive process loss |
| Work inside visitors | Use `AsyncDagTraversal` and await work in `ON_WORK_READY` visitors; normal chain completion releases dependents | One process owns execution and immediate callback failure should fail traversal |

Start with the host-controlled model for a durable agent coordinator. For in-memory collections, use `materializeDagSourceFromRecords` → `prepareDag` → `dag.createWorkSession({ completedWork })`. Use `await prepareDagAsync(...)` for async source discovery and `await dag.createAsyncWorkSession(...)` for an async session. `DagTraversal` is sufficient when graph facts are already in memory; use `AsyncDagTraversal` for asynchronous adapters. The host can run asynchronous agents independently of which runner it uses.

With visitor execution, `concurrency` bounds invoked callbacks, including adapters and visitors. It does not bound externally dispatched agents after external deferral, enforce a token budget, or provide distributed claims. A returned/awaited callback must represent completion of its work: launching a background job and returning immediately releases its dependents too early.

A host-controlled tick follows this sequence:

```text
load graph revision + accepted facts
              ↓
materialize source → prepare reusable definition → create session → advance
              ↓
read frontier tickets → filter claims/waits → rank candidates → claim and dispatch agents
              ↓
validate result + attempt/revision → durably accept completion
              ↓
complete retained ticket + advance again, or reconstruct next tick
```

The same vertex can remain in `readyOrDeferredIds` while an external agent is running. CTT's `activeVisitorVertexIds` tracks its own visitor chains, not the host's external attempts. Always overlay host claims, capacity, and waits before dispatch.

## Discover the graph

CTT traverses the graph your adapter provides; it does not generate a plan from a goal or work-item type. A host's `planDag` can select a type-specific template or generate and validate a revision, then adapt its nodes to CTT. `planDag` is a host function, not a CTT API. Hints describe how to discover that plan.

| Concept | CTT representation | Host responsibility |
| --- | --- | --- |
| Stable work identity | `vertexId` | Choose IDs that can be reconstructed and matched to accepted facts |
| Opaque task data                 | `vertexContent.$data`                                         | Agent role, prompt/artifact references, policy and metadata        |
| Discovery and structure          | `resolveRoot()`, `resolveChild(hint)`, `vertexContent.$childHints` | Supply the complete intended catalog and structural relationships  |
| Initial-work dependency | `dependsOnWork` | Declare which work must be accepted first |
| Structural-completion dependency | `dependsOnSubgraphCompletion` | Declare which composite must finish before work begins |
| Missing prerequisite lookup | Optional `resolvePrerequisite(id)` | Fetch graph facts from a catalog/service |

For a known catalog, use `materializeDagSourceFromRecords(items, { id, children?, dependsOnWork?, dependsOnSubgraphCompletion? })`. Every catalog item is discovered, including disconnected entries; `children` returns structural child IDs. A child ID absent from the catalog rejects immediately, while missing prerequisite IDs reach dependency validation. For nested records, `materializeDagSourceFromRoots(roots, selectors)` expands `children(item)` records iteratively and shares repeated references. Different forest records with the same ID reject; `materializeDagSourceFromRecords` rejects any duplicate ID. Async variants accept iterable/async-iterable inputs and value-or-promise selectors, then return the same ordinary synchronous source options.

Both adapters copy membership and edge lists once. Item data and IDs retain shallow identity: editing an item field remains visible, but editing its original edge array does not change captured topology. The hidden synthetic holder never appears in public vertices, callbacks, or events. For custom adapters, the equivalent catalog pattern uses `syntheticRoot: true`, lists every item in its `$childHints`, and declares explicit `dependsOnWork` lists. Discovery cannot detect work omitted from the supplied domain.

Call `prepareDag(source)` or `await prepareDagAsync(source)` to discover and validate once. A valid result exposes `dag.vertices` and factories for independent runners or sessions; an invalid result exposes an `issues` array. Source errors retain their exact thrown values, including a source-thrown `DagTraversalStallError`. Structural child cycles throw `DagDiscoveryCycleError` with an identity-preserving closed `vertexIds` witness; malformed-source errors also throw. Only engine dependency validation failures become `{ kind: 'invalid', issues: [{ kind: 'milestone', diagnostics }] }`, using the same result shape as definition preparation, composition and revision.

A prepared definition owns copied topology and detached readonly vertex descriptions. Each new session gets independent progress, accepted seeds, references, and settlement generations without calling the original adapter again. Replay hints are normalized to IDs; original opaque discovery hints are not retained. Preparation can perform source I/O, so business work belongs in host execution or visitors. See the [prepared definition contract](reference.md#reusable-prepared-dags).

Discovery and execution dependencies are distinct. Graph sources default to `implicitParentDependency: false`: omitting `dependsOnWork` means no work prerequisites. Declare explicit lists (including `[]`), or set `implicitParentDependency: true` to inherit the discovery parent's W when the list is omitted. Ordinary roots honor W by default; `rootDependencies: 'ignore'` suppresses root W only, never C. Children of a synthetic root have no implicit dependency on the holder. See [discovery versus execution](reference.md#discovery-and-execution-as-separate-phases).

A prerequisite ID alone does not make a vertex discoverable. Include it through hints/catalog entries or supply `resolvePrerequisite`. That hook may find further prerequisites transitively; concurrent demand is coalesced. Return `{ kind: 'found', vertex: { vertexId, vertexContent: { $data, $childHints }, dependsOnWork } }` for content, `{ kind: 'missing' }` for not found, or `{ kind: 'omitted', satisfiesDependencies: true }` for intentional omission. Omission deliberately omits the vertex and satisfies its dependencies, so it is not a representation of a failed agent or a temporary service outage. Let adapter errors propagate as appropriate. See [lookup and identity rules](reference.md#discovery-and-completed-work).

Choose discovery and dispatch surfaces by the lifetime you need:

| Need | Surface | Execution boundary |
| --- | --- | --- |
| Reuse validated topology across independent runs | `prepareDag(source)` / `prepareDagAsync(source)` | Discover and validate once; create fresh runners or sessions afterward. |
| Preview one fresh runner before work | `runner.prepare()` / `await runner.prepare()` | Discover and validate without visitors or dispatch generations; `run()` adopts that discovery. |
| Discover fully, then execute in one operation | Runner with `discovery: 'eager'`, then `run()` | Validation precedes callbacks, but execution begins in the same call. |
| Dispatch host work | Session `advance()` frontier tickets, or runner `summary().awaitingSettlement` after `run()` | Use external settlement; apply host claims and capacity. `readyOrDeferredIds` is observational dependency eligibility, not a dispatch ticket. |

For a preview before dispatch, call `runner.prepare()` (await it on `AsyncDagTraversal`). It eagerly discovers the closure exposed by roots, hints and prerequisite lookup and validates the combined W/C graph, without visitors, execution events, new real-vertex completion, or deferred generations. Accepted `completedWork` seeds remain W facts. Inspect the graph at `HALTED` / `prepared`, then call `run()` to admit work without replaying discovery. Repeated preparation before execution is idempotent. This requires a fresh tree-source or graph-source runner without injected state/containers, even empty injected objects; invalid preparation requests reject recoverably. Once preparation begins, summaries report effective eager mode and eager topology freezing applies. After execution starts, preparation rejects.

Preparation can perform adapter I/O: keep business execution in the host or visitors. During async preparation, `requestPause()` stops future admissions but waits for admitted discovery callbacks to settle; callbacks are not canceled. The operation acknowledges `paused`; another `prepare()` continues it, or `run()` adopts discovery and executes. Failed preparation preserves the exact error. Empty and omitted-root previews still stop `prepared`.

Lazy execution remains available without preparation and may expose partial snapshots. `summary()` is observational and never fetches vertices. Use `DagTraversal<Workflow, Workflow, TaskId>` and `DagDiscoverySource<Workflow, Workflow, TaskId>` to carry host IDs through sources, summaries and settlement independently of data/hints. Every typed live result supplies an own `vertexId`; materialize class getters as own fields. See [identity migration](migration-uniform-api.md#caller-specified-graph-identity-types).

## Work dependencies and completion joins

| Declaration | Releases the dependent after… | Example |
| --- | --- | --- |
| `dependsOnWork: ['research']` | Research's initial work completes (W) | Implementation can start from accepted research |
| `dependsOnSubgraphCompletion: ['implementation']` | Implementation's committed completion transition (C), including discovery and retained children | Review waits for implementation and all its component tasks |
| Both lists | Every declared W and C prerequisite is satisfied | Review waits for a composite and a separate test-plan result |

Use work dependencies for flat agent tasks. Use completion dependencies when structural children are meaningful parts of a composite. Seeds in `completedWork` satisfy W only; children and completion visitors still have to complete before C is released.

Avoid making a child wait on its own ancestor's C when that ancestor must wait for the child to complete. CTT validates combined milestone cycles; seeding W does not make an invalid graph valid. Completion prerequisites add C gates independently of the declared W lists and the optional parent-inheritance policy. The [completion example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-completion-dependencies-example.ts) demonstrates a valid sibling join.

## Accept results and resume

Start from the [quickstart](../README.md#quickstart-find-the-next-agent-tasks). To advance its session after the host accepts `testPlan`, dispatch from the `advance()` frontier. This continuation assumes the quickstart's `session` and `accepted` values:

```ts
const pending = session.advance();
if (pending.kind === 'awaitingSettlement') {
  const ticket = pending.workTickets.find(work => work.vertexId === 'testPlan')!;
  // Retain the ticket before dispatch; validate revision/attempt on the result.
  accepted.add(ticket.vertexId); // In-memory simulation of durable acceptance.
  session.completeWork(ticket);
  const next = session.advance();
  if (next.kind === 'awaitingSettlement') {
    console.log(next.workTickets.map(work => work.vertexId)); // ['review']
  }
}
```

`advance()` drains execution and returns `awaitingSettlement` with readonly tickets, `paused`, or `finished`; async sessions return a promise. `completeWork(ticket)` and `failTraversal(ticket, error)` are synchronous. The first accepted report returns `{ kind: 'accepted' }`; the identical report returns `{ kind: 'alreadyAccepted' }`. A failure fails the whole runner and the next advance throws the exact error. Conflicting reports, copied/forged tickets, and tickets from another facade or session reject. Repeated observations of the same deferred work stay usable. Follow completion with advance to observe new work. Use `session.inspectMilestones().explain({ vertexId, milestone: 'work' })` to explain blockers without advancing, and `session.inspect()` for lifecycle state. `failTraversal` is the sole fatal settlement method.

Tickets expose only `vertexId`; their provenance and generation are private. They are local capabilities: serializing or copying a ticket does not preserve settlement authority. Filter each frontier through host claims, waits, and capacity. A ticket is not a distributed lease or persistent attempt ID. Use `summary()` for work progress/frontier, `inspectMilestones()` for dependency blockers, and `inspect()` for execution/iterator state. All three observe without advancing. `requestPause()` delegates cooperative pause to the runner.

For existing custom-source runners, set `workCompletion: 'externalSettlement'` and wrap with `createDagWorkSession(runner)` or `createAsyncDagWorkSession(runner)`. Wrapping runs no callbacks and acquires no separate execution owner; direct runner access remains available. The lower-level guarded frontier and settlement contract also remains available.

For an async runner, await `runner.run()`. `settle()` itself is synchronous. A settlement wakes an active async consumer; after idle settlement, resume explicitly. Only one iterator may own a runner at a time. All runners expose `requestPause(): boolean`: true records a new request only while RUNNING, rather than acknowledging a halt. The active owner drains admitted chains to `HALTED` / `paused` without cancellation; a suspended iterator may need `next()` or `return()` to drive that boundary. Resume the same runner without replaying committed work.

Dispatch from `summary().awaitingSettlement`: each readonly record atomically contains `{ vertexId, generation }`. It includes exactly live deferred work without an accepted outcome, in discovery order; queued-only, completed and deleted vertices are absent. Arrays and records are detached, retaining opaque ID identity. Filter this snapshot through host claims and capacity. DAG event `kind: 'workCompleted'` emits after committed W, including settlement; `kind: 'subgraphCompleted'` emits after committed C. Select these kinds with `emitEvents`; select readiness callbacks separately with `visitorPhases`. Committed events have no callback `phase` field. Seeded work emits no synthetic work event. `ON_WORK_READY` visitors remain pre-work. Completion events are not dispatch signals. Alternatively, an actual enabled `ON_WORK_READY` callback can dispatch before the external policy defers its chain. All callback commands commit before normal external deferral. `ON_SUBGRAPH_READY` remains automatic once W, discovery, children, and C prerequisites permit it.

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

Keep prepared definitions, runners, tickets, vertex references, generation symbols, pending promises, and lookup handles in memory. A serialized summary is useful for presentation, but is not a runner checkpoint. CTT allows arbitrary SameValueZero IDs; durable hosts should choose their own stable serializable ID convention, such as strings.

On startup or each reconciliation tick:

1. Load a consistent graph revision and its host-accepted facts.
2. Prepare the full graph revision (plus lookup if required); reuse its in-memory definition while that revision remains valid.
3. Create a fresh session with `completedWork` and call `advance()`.
4. Filter frontier tickets using persisted claims, waits, retries, and host capacity.
5. Claim and dispatch selected work. Validate incoming results and durably record accepted completion before completing a retained ticket.

This ordering lets a crash after acceptance but before settlement recover by reconstruction. A crash during an external side effect still needs host idempotency, reconciliation, or compensation; CTT does not provide exactly-once external execution. Transactional claim/acceptance, compare-and-set revisions, and dispatch outboxes are host design choices, not built-in CTT guarantees.

The [reconciliation example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-reconciliation-example.ts) verifies that reconstructing from accepted facts yields the same ready IDs as advancing a retained runner. It uses an in-memory set to illustrate the contract, not a durable storage implementation.

## Retries, human waits, and graph revisions

A revision returns invalid issues or a fresh `{ dag, changes }`; the original prepared value and its sessions remain usable. Removing a vertex leaves its references and descendants in place, so repair those references explicitly in the same batch. Data comparisons in `changes` are shallow and cannot determine whether a previously accepted artifact remains useful.

Keep host revision/attempt checks when results arrive. A ticket issued before revision throws in the new session and can still settle its original work. An admitted old async callback continues in its original runner; revision does not cancel it. Supply `completedWork` explicitly to the new session only for facts independently accepted for its definition. See [validated revision contracts](reference.md#validated-dag-revisions) and the [executable revision example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts).

- **Agent retry:** retain the task as incomplete; record the failed attempt and retry policy in the host. Do not send fatal `kind: 'traversalFailed'` unless you intend to fail the runner. Deferral must be the only command in its result; mixed results are rejected before any commands apply.
- **Human input or approval:** keep the task deferred and record a host wait. Exclude it from dispatch until the response is accepted; readiness alone will keep listing it.
- **New plan or graph revision:** use `reviseDag(prepared, operations)` to validate an atomic batch of full declaration edits, then start a session from the valid result. Carry completion facts forward only when the host validates their meaning for the new revision. Do not seed every historic success blindly.
- **Cancellation or timeout:** cancel host executor work separately. Halting CTT does not cancel already-started callbacks or remote agents. Async close may wait for a pending callback.
- **Completion side effects:** prefer durable result acceptance in the host. Reconstruction can invoke completion visitors again even when initial work was seeded; make any external effects idempotent.

## Troubleshoot a workflow

| Symptom | Check |
| --- | --- |
| Work completed without an agent running              | Check `workCompletion: 'externalSettlement'`; the default `visitorReturn` completes W on normal callback-chain return. Seeds also mark W complete                           |
| The same agent task dispatches again | Host claim/attempt state must filter `readyOrDeferredIds`; deferral intentionally leaves work ready |
| Ready work seems absent | Run discovery first; inspect discovery completeness, seed IDs, and unmet W/C dependencies |
| Missing prerequisite or cycle | Inspect the `milestone` issue in `invalid.issues` from source preparation or `DagTraversalStallError` from direct execution for W/C constraints. Structural child cycles throw `DagDiscoveryCycleError`; collection adapters reject absent child IDs with `TypeError`. Authored definitions report `invalid.issues`. Check catalog coverage, lookup results and structural edges |
| A seeded composite still blocks review | Seeds complete W, not C; its retained children and completion transition must finish |
| A retry aborts everything                            | `settle(..., { kind: 'traversalFailed', error }, ...)` is fatal; keep retryable work incomplete in host policy                            |
| Settlement fails after restart | Generations are runner-local; reconstruct from accepted facts rather than replaying an old handle |
| An external task still runs after halt | Callback/executor cancellation belongs to the host |
| A node fetched by lookup is missing from a root walk | Resolved prerequisites may be detached; enumerate `getVertexRefs()` instead of only walking `getRoot()` |

Use synchronous `runner.inspectMilestones()` (also on async runners), or the equivalent `inspectDagMilestones(runner)`, when a host needs to show why a milestone is blocked or which original constraints depend on it. Capture once, then call `explain({ vertexId, milestone: 'work' | 'subgraphCompletion' })`, `prerequisitesOf(...)`, or `dependentsOf(..., { transitive: true })`. Explanations distinguish unknown/deleted identities, omitted vertices, unfinished work, incomplete local discovery and pending completion transitions. A ready or externally deferred task still has unfinished W; a seeded parent's W may be satisfied while its C waits for children. Constraint endpoints include work state and milestone satisfaction, without interpreting business outcomes.

Inspect after `prepare()` for an eager validated view, or during lazy traversal for partial facts. `discoveryComplete: false` limits the captured domain, and an unresolved endpoint is not a proven missing task. Captures stay unchanged after settlement; capture again to refresh. These queries perform no callbacks, lookup, scheduling, or ownership changes, including while an iterator or pending async callback owns the runner. Static navigation keeps original constraints after milestones complete; explanations stop at satisfied milestones. See the [query contract](reference.md#dag-dependency-queries-and-explanations) and [runnable inspection example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts).

Use `summary()` for DAG work readiness and diagnostics. Use `inspect()` for callback/iterator execution state. Both are observational; neither drives traversal. See [progress contracts](reference.md#deferred-dag-progress-and-reconciliation) and [inspection](reference.md#inspection-and-execution) for exact fields and limits.

### Carrying completion facts into a revision

Unknown `completedWork` IDs reject intentionally. Before seeding a revised definition, the host must revalidate which accepted artifacts still satisfy its task policy, then retain only IDs present in `dag.vertices` or `dag.definition.omittedIds`. Membership alone does not establish that an old result is valid for changed task data or dependencies. Keep accepted facts outside CTT; revision does not migrate them automatically. See the [revision example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts).
