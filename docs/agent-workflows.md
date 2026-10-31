# Autonomous-agent workflows with CTT

[Documentation map](index.md) · [Quickstart](../README.md#quickstart-find-the-next-agent-tasks) · [API reference](reference.md)

Use CTT when agents or tools perform work with dependencies: research before implementation, independent specialist tasks in parallel, verification after several branches, or review after an entire composite completes. CTT supplies graph discovery, dependency readiness, lifecycle transitions, and inspection. Your coordinator supplies the workflow and executes it.

For prerequisite-driven work, follow this page in order. For cyclic information graphs, jump to [context and references](#explore-context-and-references). For an object or abstract tree, start with [tree traversal](reference.md#traverse-an-object). These source families have different contracts.

## On this page

- [Choose an execution model](#choose-an-execution-model)
- [Discover the graph](#discover-the-graph)
- [Work dependencies and completion joins](#work-dependencies-and-completion-joins)
- [Accept results and resume](#accept-results-and-resume)
- [Persist facts and reconstruct](#persist-facts-and-reconstruct)
- [Retries, human waits, and graph revisions](#retries-human-waits-and-graph-revisions)
- [Troubleshoot a workflow](#troubleshoot-a-workflow)
- [Reuse workflow fragments](#reuse-workflow-fragments)
- [Explore context and references](#explore-context-and-references)

## Choose an execution model

| Model                    | How it works                                                                                                                                                            | Appropriate when                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Host-controlled frontier | Use a prepared DAG's `createWorkSession()`, then `advance()` and dispatch its frontier tickets; custom runners can use `bindDagWorkSession` / `bindAsyncDagWorkSession` | Agents run externally, work needs claims/approval, or state must survive process loss |
| Work inside visitors     | Use `AsyncDagTraversal` and await work in `ON_WORK_READY` visitors; normal chain completion releases dependents                                                         | One process owns execution and immediate callback failure should fail traversal       |

Start with the host-controlled model for a durable agent coordinator. For in-memory collections, use `materializeDagInputFromRecords` → `prepareDag` → `dag.createWorkSession({ completedWork })`. Use `await prepareDagAsync(...)` for async source discovery and `await dag.createAsyncWorkSession(...)` for an async session. `DagTraversal` is sufficient when graph facts are already in memory; use `AsyncDagTraversal` for asynchronous adapters. The host can run asynchronous agents independently of which runner it uses.

With visitor execution, `concurrency` bounds invoked callbacks, including adapters and visitors. It does not bound externally dispatched agents after external deferral, enforce a token budget, or provide distributed claims. A returned/awaited callback must represent completion of its work: launching a background job and returning immediately releases its dependents too early. The [filtered visitor recipe](reference.md#filtered-visitor-example) demonstrates both sync and awaited async callbacks.

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

Your host supplies the task graph; CTT discovers the domain exposed by its source. It does not generate a plan from a goal or decide what a business task means.

| Concept                          | CTT representation                                                 | Host responsibility                                                |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Stable work identity             | `vertexId`                                                         | Choose IDs that can be reconstructed and matched to accepted facts |
| Opaque task data                 | `vertexContent.$data`                                              | Agent role, prompt/artifact references, policy and metadata        |
| Discovery and structure          | `resolveRoot()`, `resolveChild(hint)`, `vertexContent.$childHints` | Supply the complete intended catalog and structural relationships  |
| Initial-work dependency          | `dependsOnWork`                                                    | Declare which work must be accepted first                          |
| Structural-completion dependency | `dependsOnSubgraphCompletion`                                      | Declare which composite must finish before work begins             |
| Missing prerequisite lookup      | Optional `resolvePrerequisite(id)`                                 | Fetch graph facts from a catalog/service                           |

### Start with the simplest source

For a finite catalog, use `materializeDagInputFromRecords(items, { id, ...selectors })`: every item is discovered, including disconnected tasks, and `children(item)` returns child IDs. For nested records, use `materializeDagInputFromRoots(roots, selectors)`, whose children are records. The [collection contract](reference.md#collection-and-forest-sources) covers sharing, duplicate IDs, missing endpoints and async variants.

Pass the whole returned `MaterializedDagInput`: it contains `traversableGraph` and `syntheticRoot: true`. The private entry holder stays out of public callbacks and queries. Materialization copies collection/edge membership while retaining shallow data and ID identity.

### Prepare once, then create independent sessions

Call `prepareDag(input)` or `await prepareDagAsync(input)`. A valid result exposes a reusable `dag`; an invalid result exposes issues and no executable graph. Engine discovery cycles use `discoveryCycle` with `cycleWitnessVertexIds`; dependency invalidity uses `milestone`. Direct runners and `runner.prepare()` throw their engine errors instead. Malformed source contracts and caller-thrown values propagate exactly. Use the [validation recipes](reference.md#validation-results-and-failures) to branch correctly.

The prepared value owns copied topology. Each `dag.createWorkSession()` starts independent progress without original adapter I/O; keep business execution in the host or visitors. Graph work declarations are explicit: omitted `dependsOnWork` defaults to none, and ordinary roots honor prerequisites. Structural child edges do not add W dependencies by default. The [prepared contract](reference.md#reusable-prepared-dags) covers replay and ownership.

### Choose the discovery lifetime you need

| Need                                             | Surface                                                                                      | Execution boundary                                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse validated topology across independent runs | `prepareDag(source)` / `prepareDagAsync(source)`                                             | Discover and validate once; create fresh runners or sessions afterward.                                                                       |
| Preview one fresh runner before work             | `runner.prepare()` / `await runner.prepare()`                                                | Discover and validate without visitors or dispatch generations; `run()` adopts that discovery.                                                |
| Discover fully, then execute in one operation    | Runner with `discovery: 'eager'`, then `run()`                                               | Validation precedes callbacks, but execution begins in the same call.                                                                         |
| Dispatch host work                               | Session `advance()` frontier tickets, or runner `summary().awaitingSettlement` after `run()` | Use external settlement; apply host claims and capacity. `readyOrDeferredIds` is observational dependency eligibility, not a dispatch ticket. |

For a preview of one fresh runner, call `runner.prepare()` (await it on an async runner), inspect at `HALTED` / `prepared`, then call `run()` to adopt discovery without replay. This also supports a fresh tree-source DAG runner; the constructor options `discovery: 'eager'` and `syntheticRoot: true` require graph-source mode. Preparation can perform I/O and cooperative pause waits for admitted discovery callbacks. See [preview lifecycle](reference.md#discovery-and-execution-as-separate-phases).

A custom lazy source may implement `resolvePrerequisite(id)` for identities absent from ordinary discovery. Lookup can find transitive prerequisites; an ID alone does not make content discoverable. Deliberate omission satisfies traversal dependencies and does not mean an agent failed or a service is temporarily unavailable. Use the exact [source/context contracts](reference.md#source-callback-contexts) and [lookup/identity rules](reference.md#discovery-and-completed-work), including required own IDs for typed live results. Lazy summaries remain observational and can be partial.

## Work dependencies and completion joins

| Declaration                                       | Releases the dependent after…                                                                   | Example                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `dependsOnWork: ['research']`                     | Research's initial work completes (W)                                                           | Implementation can start from accepted research              |
| `dependsOnSubgraphCompletion: ['implementation']` | Implementation's committed completion transition (C), including discovery and retained children | Review waits for implementation and all its component tasks  |
| Both lists                                        | Every declared W and C prerequisite is satisfied                                                | Review waits for a composite and a separate test-plan result |

Use work dependencies for flat agent tasks. Use completion dependencies when structural children are meaningful parts of a composite. Seeds in `completedWork` satisfy W only; children and completion visitors still have to complete before C is released.

Avoid making a child wait on its own ancestor's C when that ancestor must wait for the child to complete. CTT validates combined milestone cycles; seeding W does not make an invalid graph valid. Completion prerequisites add C gates independently of the declared W lists and the optional parent-inheritance policy. The [completion example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-completion-dependencies-example.ts) demonstrates a valid sibling join.

### A composite can finish work before its children finish

Suppose `bundle` contains `api` and `tests`, and `review` waits for the entire bundle. Solid arrows below are **structural parent-to-child links**; the dashed arrow means **the waiter requires its prerequisite's completion**.

```mermaid
flowchart LR
  B["bundle: W accepted"] -->|child| A[api]
  B -->|child| T[tests]
  R[review] -. "waits for C(bundle)" .-> B
```

Declare `bundle.children = ['api', 'tests']` and `review.dependsOnSubgraphCompletion = ['bundle']`. Structural links alone do not add work prerequisites. **W** is accepted initial work; **C** is the committed completion transition after W, closed discovery and all retained children complete.

| After advancing…                          | W(bundle) | C(bundle)                                | Work available after advance |
| ----------------------------------------- | --------- | ---------------------------------------- | ---------------------------- |
| Seed `completedWork: new Set(['bundle'])` | Satisfied | Waiting for children                     | `api`, `tests`               |
| Accept `api`                              | Satisfied | Still waiting                            | `tests`                      |
| Accept `tests`                            | Satisfied | Commits when its completion chain drains | `review`                     |

If `api` instead waits for `C(bundle)`, bundle completion waits for api completion while api waits for bundle completion. That is an invalid milestone cycle, even with bundle's W seeded. Wait for `W(bundle)` when the child's work needs only its parent's initial work.

The [build-join example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-completion-dependencies-example.ts) executes the same structural-versus-completion distinction. [Milestone inspection](reference.md#dag-dependency-queries-and-explanations) shows why seeded W can coexist with blocked C.

## Accept results and resume

Event streams filter at delivery across tree, DAG and walking runners. A new iterator lease applies its `emitEvents` selection to buffered observations and deferred settlement events. Selection never replays work or callbacks; `visitorPhases` retains independent admission snapshots. For example, resume with `emitEvents: ['subgraphCompleted']` to consume completion observations while suppressing pending work observations. See the [delivery example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/event-delivery-selection-example.ts).

The [quickstart](../README.md#quickstart-find-the-next-agent-tasks) completes the whole fork/join using simulated acceptance. In a coordinator, retain each actual ticket with its host attempt; dispatch only after a host claim succeeds, and complete the ticket only after validating and durably accepting that attempt's result. The [validation and failure recipes](reference.md#validation-results-and-failures) show duplicate acceptance and fatal failure separately.

`advance()` drains execution and returns `awaitingSettlement` with readonly tickets, `paused`, or `finished`; async sessions return a promise. `completeWork(ticket)` and `failTraversal(ticket, error)` are synchronous. The first accepted report returns `{ kind: 'accepted' }`; the identical report returns `{ kind: 'alreadyAccepted' }`. A failure fails the whole runner and the next advance throws the exact error. Conflicting reports, copied/forged tickets, and tickets from another facade or session reject. Repeated observations of the same deferred work stay usable. Follow completion with advance to observe new work. Use `session.inspectMilestones().explain({ vertexId, milestone: 'work' })` to explain blockers without advancing, and `session.inspect()` for lifecycle state. `failTraversal` is the sole fatal settlement method.

Tickets expose only `vertexId`; their provenance and generation are private. They are local capabilities: serializing or copying a ticket does not preserve settlement authority. Filter each frontier through host claims, waits, and capacity. A ticket is not a distributed lease or persistent attempt ID. Use `summary()` for work progress/frontier, `inspectMilestones()` for dependency blockers, and `inspect()` for execution/iterator state. All three observe without advancing. `requestPause()` delegates cooperative pause to the runner.

For existing custom-source runners, set `workCompletion: 'externalSettlement'` and wrap with `bindDagWorkSession(runner)` or `bindAsyncDagWorkSession(runner)`. Wrapping runs no callbacks and acquires no separate execution owner; direct runner access remains available. The lower-level guarded frontier and settlement contract also remains available.

For an async runner, await `runner.run()`. `settle()` itself is synchronous. A settlement wakes an active async consumer; after idle settlement, resume explicitly. Only one iterator may own a runner at a time. All runners expose `requestPause(): boolean`: true records a new request only while RUNNING, rather than acknowledging a halt. The active owner drains admitted chains to `HALTED` / `paused` without cancellation; a suspended iterator may need `next()` or `return()` to drive that boundary. Resume the same runner without replaying committed work.

Dispatch from `summary().awaitingSettlement`: each readonly record atomically contains `{ vertexId, generation }`. It includes exactly live deferred work without an accepted outcome, in discovery order; queued-only, completed and deleted vertices are absent. Arrays and records are detached, retaining opaque ID identity. Filter this snapshot through host claims and capacity. DAG event `kind: 'workCompleted'` emits after committed W, including settlement; `kind: 'subgraphCompleted'` emits after committed C. Select these kinds with `emitEvents`; select readiness callbacks separately with `visitorPhases`. Committed events have no callback `phase` field. Seeded work emits no synthetic work event. `ON_WORK_READY` visitors remain pre-work. Completion events are not dispatch signals. Alternatively, an actual enabled `ON_WORK_READY` callback can dispatch before the external policy defers its chain. All callback commands commit before normal external deferral. `ON_SUBGRAPH_READY` remains automatic once W, discovery, children, and C prerequisites permit it.

Capture the generation belonging to the deferred work you dispatched. It is a local guard, not a durable attempt ID, distributed lease, or authentication token. The host must separately reject stale revisions, stale attempts, duplicate result delivery, and lost claims before accepting a result. An identical accepted settlement returns `false`; invalid, conflicting, or cross-runner settlement throws.

`{ kind: 'workCompleted' }` means the work is complete for dependency traversal. An accepted review rejection can still complete a review vertex if host policy says the review work is done. `{ kind: 'traversalFailed', error }` fails the whole runner and preserves the exact thrown value; it is not a retry request or a business outcome field. The progress state `completed` means traversal work completion.

## Persist facts and reconstruct

CTT does not prescribe a storage engine or ship a persistence adapter. Define storage interfaces in your host and implement them with SQLite, PostgreSQL, a service, or another provider. Provider interchangeability must preserve the host's claim and result-acceptance guarantees, not just CRUD method names.

| Persist in the host                                                          | Purpose                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Graph revision, stable IDs, task definitions, W/C declarations and structure | Reconstruct the intended graph and associate results with the correct revision |
| Accepted outcomes and artifact references                                    | Decide which work is complete for traversal and supply downstream inputs       |
| Attempts, claims/leases, wait state, retry decisions and deduplication keys  | Prevent readiness from dispatching duplicate or ineligible work                |
| Accepted completion facts for the revision                                   | Supply `completedWork` to a new runner                                         |

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

Use the [validation and failure recipes](reference.md#validation-results-and-failures) for operation-specific result narrowing, duplicate reports and exact fatal failures.

| Symptom                                              | Check                                                                                                                                                                                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work completed without an agent running              | Check `workCompletion: 'externalSettlement'`; the default `afterWorkReadyChain` completes W on normal callback-chain return. Seeds also mark W complete                                                                       |
| The same agent task dispatches again                 | Host claim/attempt state must filter `readyOrDeferredIds`; deferral intentionally leaves work ready                                                                                                                           |
| Ready work seems absent                              | Run discovery first; inspect discovery completeness, seed IDs, and unmet W/C dependencies                                                                                                                                     |
| Missing prerequisite or cycle                        | Check catalog coverage, declared W/C prerequisites and structural links. Handle invalid issues versus direct-runner exceptions using the [surface-specific validation recipes](reference.md#validation-results-and-failures). |
| A seeded composite still blocks review               | Seeds complete W, not C; its retained children and completion transition must finish                                                                                                                                          |
| A retry aborts everything                            | `settle(..., { kind: 'traversalFailed', error }, ...)` is fatal; keep retryable work incomplete in host policy                                                                                                                |
| Settlement fails after restart                       | Generations are runner-local; reconstruct from accepted facts rather than replaying an old handle                                                                                                                             |
| An external task still runs after halt               | Callback/executor cancellation belongs to the host                                                                                                                                                                            |
| A node fetched by lookup is missing from a root walk | Resolved prerequisites may be detached; enumerate `getVertexRefs()` instead of only walking `getRoot()`                                                                                                                       |

Use synchronous `runner.inspectMilestones()` (also on async runners), or the equivalent `inspectDagMilestones(runner)`, when a host needs to show why a milestone is blocked or which original constraints depend on it. Capture once, then call `explain({ vertexId, milestone: 'work' | 'subgraphCompletion' })`, `prerequisitesOf(...)`, or `dependentsOf(..., { transitive: true })`. Explanations distinguish `unresolved`/`deleted` identities, `omitted` vertices, unfinished work, incomplete local discovery and pending completion transitions. A ready or externally deferred task still has unfinished W; a seeded parent's W may be satisfied while its C waits for children. Constraint endpoints include work state and milestone satisfaction, without interpreting business outcomes.

Inspect after `prepare()` for an eager validated view, or during lazy traversal for partial facts. `discoveryComplete: false` limits the captured domain, and an unresolved endpoint is not a proven missing task. Captures stay unchanged after settlement; capture again to refresh. These queries perform no callbacks, lookup, scheduling, or ownership changes, including while an iterator or pending async callback owns the runner. Static navigation keeps original constraints after milestones complete; explanations stop at satisfied milestones. See the [query contract](reference.md#dag-dependency-queries-and-explanations) and [runnable inspection example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts).

Use `summary()` for DAG work readiness and diagnostics. Use `inspect()` for callback/iterator execution state. Inspection reports callback `phase` separately from chain `state`, `visitorIndex`, and admitted `executionOptions`; pending requests name their public callback `operation`. Graph `visitStage` records scheduling boundaries and cannot establish active callbacks or host-agent progress; deferred work may remain `INITIAL_VISIT_STARTED` after callbacks drain. Both are observational; neither drives traversal. See [progress contracts](reference.md#deferred-dag-progress-and-reconciliation) and [inspection](reference.md#inspection-and-execution) for exact fields and limits.

### Carrying completion facts into a revision

Unknown `completedWork` IDs reject intentionally. Before seeding a revised definition, the host must revalidate which accepted artifacts still satisfy its task policy, then retain only IDs present in `dag.liveVertexSummaries` or `dag.definition.omittedIds`. Membership alone does not establish that an old result is valid for changed task data or dependencies. Keep accepted facts outside CTT; revision does not migrate them automatically. See the [revision example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-revision-example.ts).

### Observing traversal state

Use `getResolvedTreeView()` or `getResolvedGraphView()` for live queries.
Callbacks and sources receive `resolvedTreeView` or `resolvedGraphView` and
canonical `VertexHandle` / `VertexView` facets. They cannot replace CTT state or
edit its hint collections; use visitor commands for active rewrites and deletion.
Caller data, IDs, and individual hints retain shallow identity. Captured event
vertices remain historical even when their live handles change. Synthetic DAG
entry source contexts have null parent vertex/ref fields; ordinary graph and tree
parents remain visible. See [query contracts](reference.md#safe-tree-queries).

## Reuse workflow fragments

Capture a discovered topology through `prepared.definition`, or author materialized source facts with `defineDag` and validate them with `prepareDagDefinition`. `defineDagFragment(definition, ports)` names live local boundary vertices. Keep each fragment closed over its live and known omitted identities; provide all cross-fragment dependencies when composing.

Instantiate a template with `mapDagFragmentIds(fragment, { mapId })`, giving each local identity a host-selected global ID. Mapping runs once per live/omitted identity and supports object IDs. Then `composeDag(instances, { dependencies, children })` concatenates ordered entries and validates the entire graph. Choose `milestone: 'work'` to wait for accepted initial work or `'subgraphCompletion'` to wait for the full retained subgraph. Structural child links and execution waits are separate options.

Invalid ports, identity collisions and nonexistent wire endpoints throw `TypeError`; cycles between valid endpoints return invalid issues. Only a valid result exposes a prepared DAG. Create independent runners or sessions from that result, selecting accepted completion facts explicitly for each run. Templates, agent roles, claims and business outcomes remain host data and policy. See the [fragment contract](reference.md#dag-fragments-and-composition) and [runnable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-fragments-example.ts).

## Explore context and references

Choose `GraphWalk` / `AsyncGraphWalk` to gather context, follow code references or collect provenance from cyclic/shared information graphs. Choose DAG traversal when relationships mean work/completion prerequisites. A walking edge has caller-defined meaning and supplies no dispatch readiness. A found isolated root still produces a vertex; parallel and back edges remain observable in the same walk. See the [five-vertex/six-relationship context example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-context-example.ts) and [exact walking contracts](reference.md#general-graph-walking).

For a finite in-memory catalog, use `materializeWalkSourceFromRecords(items, { id, outgoing, roots })`; its async counterpart materializes async inputs once and returns a synchronous source. For lazy retrieval, supply `source.roots()` and `source.outgoing(vertex)` with an explicit hydration mode. Use `hydration: 'resolver'` with required `resolveVertex(id)` and mixed `{ vertexId }` / `{ vertexId, resolution }` targets. Use `hydration: 'inlineOrCached'` without a resolver and tagged `{ kind: 'inline', vertexId, resolution }` / `{ kind: 'cached', vertexId }` targets; cached targets require a prior admitted resolution, including for self/backedges. Walking materializers declare resolver mode. Reuse `GraphWalkRecordSelectors` / `AsyncGraphWalkRecordSelectors` for catalogs; `GraphWalkCatalogLink` has readonly `to`/`data` fields, separate from lazy target wrappers. `materializeWalkSourceFromDagDefinition(definition, { relations })` explicitly projects selected declaration links without DAG execution validation. Do not pass a `DagDiscoverySource` / `TreeSource` directly; their source context and omission contracts differ.

Use phase-keyed vertex and edge visitors to collect typed endpoint data in one session. Use `iterateEvents({ emitEvents: [...] })` for pull integration; explicit selections narrow the delivered event union, while callbacks are independently controlled by `visitorPhases`. `walkGraph(options)` / `await walkGraphAsync(options)` are one-shot helpers returning the runner. Source callbacks and visitors execute serially, including async walking; no concurrency setting is accepted. The [reference example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-references-example.ts) shows callbacks, async iteration, endpoint discriminants, common inspection and wrappers that preserve each family's phase type.

Default `revisit: 'once'` collects each vertex and every followed relationship. Select `simplePaths` for prefixes without repeated vertices, or `walks` for repeated routes; both require a depth or candidate-read-attempt bound. Always carry `runner.summary().outcome` into a host result so `limited` cannot be mistaken for completeness. Paths include every prefix; parallel relationships can produce identical vertex sequences with distinct edge indices. DFS depth bounds apply to its first route; BFS finds shortest discovery depths. See the [bounded provenance example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/graph-walk-paths-example.ts).

The host owns authorization, retrieval policy, stable IDs, relationship meaning, retries, freshness, timeouts, persistence and any agent/model invocation. The first admitted resolution for an ID wins, including omission; a fresh runner is required to observe replacement data. Walking does not retry omissions or certify a remote transactional snapshot. A budget bounds candidate read attempts, admitted targets and depth, not host callback duration or tokens. Consumer iterator `return()`/loop break pauses and retains resources for continuation; terminal runner `close()` disposes them after execution ownership has been released. Active terminal close rejects: first return the iterator or request and await pause. Iterator return/pause and async cleanup require pending host work to settle and do not cancel promises. A failed runner retains its exact error; closing it rethrows that same error without repeating cleanup. Retain/dispose paused runners deliberately; there is no durable walking checkpoint or built-in network/LLM integration.
