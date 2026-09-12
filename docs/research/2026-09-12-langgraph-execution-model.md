# LangGraph JavaScript execution model

Research date: 2026-09-12. Scope: five official JavaScript documentation pages and first-party `langgraphjs` source pinned to commit `592fd0cab0fd9287fab1b7c7fcfd4abc44675700` (`@langchain/langgraph` package version `1.4.15`). This note establishes LangGraph semantics for an independent architecture comparison.

**Bottom line:** LangGraph already supplies substantial general workflow orchestration. Reimplementing stateful task routing, parallel fanout/joins, retries, and checkpoint recovery would overlap with it. Whether it replaces a particular DAG/traversal engine depends especially on scheduling, vertex identity, and traversal contracts.

## 1. General workflows, including cycles

LangGraph is agent-oriented, but not restricted to LLMs: its overview explicitly says nodes and edges can contain an LLM or ordinary code. `StateGraph` nodes are synchronous/asynchronous functions receiving state and returning partial updates. Shared state has per-key reducers; ordinary fields overwrite, while custom reducers aggregate updates. Conditional edges select one or multiple destinations; `Command` combines updates with routing. Cyclic/looping workflows are supported, so this is not exclusively a DAG executor. [1], [2]

## 2. Supersteps and joins

Compiled `StateGraph` uses Pregel's **bulk-synchronous parallel** execution: plan eligible actors, execute them concurrently, then apply channel updates. Normal downstream execution sees updates in the next superstep, not immediately upon a sibling's completion. Conditional routing can read its own originating node's updates; that does not expose concurrent sibling writes. [1], [2], [8]

**Yes: `addEdge(['A', 'B'], 'C') waits for both named predecessors.** JavaScript compilation creates a `NamedBarrierValue` join channel. It records predecessor names across steps, becomes available after all names arrive, and resets when consumed. This is a reusable join, not a lifetime “visit once” rule. If a required branch is skipped, the join does not become ready merely because other selected branches finished. [6], [7]

Separate `addEdge('A', 'C')` and `addEdge('B', 'C')` are different: when A and B occupy the same superstep, C follows both because of the step barrier; when they finish in different supersteps, individual edges can trigger C separately. [3], [6], [8]

**Architecture consequence:** if START activates A and B together, and only A leads to D, D still waits for that superstep—including B—to finish. This differs from a completion-driven ready queue that immediately starts D when A completes. It does **not** imply serial siblings or a prescribed A/B completion order. The JS guide cautions against relying on parallel-update ordering; encode ordering explicitly where required. These statements concern graph-level scheduling, not arbitrary asynchronous work implemented inside a node. [2], [3]

## 3. Dynamic work and identity

`new Send('worker', payload)` supports runtime-sized map/reduce fanout with separate worker inputs. A routing function generates a runtime-sized collection of Sends to a registered node, and reducers combine worker outputs. Declared node topology therefore does **not** mean dynamic work or dynamically discovered input structures are unsupported. [1], [3]

The JS scheduler creates separate PUSH tasks for Send positions; task identity incorporates checkpoint, step, destination, and Send index. It does not interpret a payload's application vertex ID as a canonical deduplication key. Repeated discovery of the same vertex thus needs application-level admission/dedup logic. Optional input-based node caching is a different facility, not a traversal visited-set contract. [1], [8]

## 4. Persistence, interrupts, and failures

Compile with a checkpointer and invoke with `configurable.thread_id` to save workflow state and execution metadata. Full checkpoints occur at superstep boundaries; per-task pending writes preserve completed siblings when another task fails, allowing their saved work to be reused on recovery. Persistent SQLite/Postgres implementations exist; `MemorySaver` loses checkpoints on process restart. Durability modes trade guarantees for throughput: `sync` saves before advancing, `async` overlaps saving with the next step, and `exit` saves at execution exit. [4], [5]

`interrupt()` plus a subsequent `new Command({ resume: value })` supports pause/resume using the saved thread. Resumption restarts the affected node function, supplying the recorded resume value at the interrupt. This is checkpoint-based workflow recovery, not preservation of a suspended in-memory generator's instruction pointer. Code before an interrupt can run again. Consequently, checkpointing does **not** promise exactly-once external side effects; idempotency keys or equivalent application measures remain necessary. [1], [4]

JS nodes accept `retryPolicy`, including `maxAttempts` and `retryOn`. Unhandled failures stop progress; saved sibling results support recovery. Current JS source additionally exposes node `errorHandler` callbacks after retries exhaust. [2], [3], [4], [6]

## 5. Traversal-specific boundary

The reviewed core APIs do **not document/provide traversal modes** for DFS, BFS, in-order, or post-order over arbitrary adapter-discovered structures, nor resolved input-vertex parents/paths or structural mutation/pruning operations. Supersteps are not a general BFS contract. `Command.PARENT` concerns workflow subgraphs; checkpoint `parentConfig` concerns checkpoint ancestry. Neither is an input-structure parent API. Conditional routing and state updates can implement pruning/mutation policies, but their structural meaning is custom application logic. This is an API-scope finding, not a claim of universal impossibility. [1], [2], [3], [4]

## 6. Plausible reuse paths

* **Known task graph:** map task IDs to valid, unique `StateGraph` node names; translate dependencies into edges and explicit multi-parent joins; store results in state. Custom code still supplies input adaptation, identity rules, result/parent lookup, conditional-skip semantics, and traversal ordering. [1], [6]
* **Discovered task graph:** retain a small dispatcher/worker topology; keep the discovered graph, dependency counts, canonical IDs, and statuses in state; emit Sends for admitted work. LangGraph supplies execution/recovery machinery, while the dispatcher owns readiness, deduplication, paths, pruning, and mutation consistency. Ordinary Send routing still obeys supersteps; strict completion-driven scheduling would require additional orchestration. [1], [2], [8]

**Uncertainties:** rolling docs mix API generations and contain Python references inside the JS exception-handling section; retry claims above use its explicit TypeScript examples and pinned JS source. No performance/scale conclusion or exhaustive absence claim follows from this reading.

## Sources

[1]: https://docs.langchain.com/oss/javascript/langgraph/graph-api
[2]: https://docs.langchain.com/oss/javascript/langgraph/pregel
[3]: https://docs.langchain.com/oss/javascript/langgraph/use-graph-api
[4]: https://docs.langchain.com/oss/javascript/langgraph/checkpointers
[5]: https://docs.langchain.com/oss/javascript/langgraph/persistence
[6]: https://github.com/langchain-ai/langgraphjs/blob/592fd0cab0fd9287fab1b7c7fcfd4abc44675700/libs/langgraph-core/src/graph/state.ts
[7]: https://github.com/langchain-ai/langgraphjs/blob/592fd0cab0fd9287fab1b7c7fcfd4abc44675700/libs/langgraph-core/src/channels/named_barrier_value.ts
[8]: https://github.com/langchain-ai/langgraphjs/blob/592fd0cab0fd9287fab1b7c7fcfd4abc44675700/libs/langgraph-core/src/pregel/algo.ts

1. [Graph API overview][1]
2. [LangGraph runtime][2]
3. [Use the graph API][3]
4. [Checkpointers][4]
5. [Persistence][5]
6. [JS StateGraph: joins and node policies][6] (`attachEdge`, `StateGraphAddNodeOptions`)
7. [JS named barrier channel][7]
8. [JS task scheduling and identity][8] (`_prepareNextTasks`, `_prepareSingleTask`, `_localRead`)
