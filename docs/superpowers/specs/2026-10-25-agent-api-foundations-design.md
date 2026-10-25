# Agent API foundations design

Implements the selected first phase, proposals 1, 2, 3, and 8 of the [roadmap](2026-10-25-agent-api-roadmap.md). The APIs are additive over the existing scheduling kernel. Implementation progress belongs in the [plan](../plans/2026-10-25-agent-api-foundations.md); this document defines the intended contract.

## Constraints

- Preserve Node 22.12.0+, Bun 1.4.4, and TypeScript 4.7.4 compatibility.
- Preserve 100% statements, branches, functions, and lines; do not weaken coverage.
- Preserve arbitrary SameValueZero IDs and exact thrown values.
- ESM and CJS share implementation, constructor, and declaration identity.
- No new runtime dependency, storage port, agent executor, or durable checkpoint.
- All existing APIs remain available; published version remains 0.11.0.
- Owned topology is copied; caller data and opaque IDs retain shallow identity and are never frozen.

## Architecture

Source adapters produce existing DAG source options. Prepared definitions materialize validated source topology and create fresh runners from private replay adapters. A coordination facade wraps runners using external settlement. Events and filtered visitors remain ordinary traversal APIs, usable without prepared definitions or the coordination facade.

Separate discovery and validation were considered. The first delivery uses `prepareDag` / `prepareDagAsync`, returning a tagged validation result and reusable `PreparedDag`. This reuses the existing eager discovery and W/C validator rather than creating a second discovery engine. Independently inspectable invalid definitions and general graph editing remain roadmap work.

## Collection and forest adapters

`graphFrom(items, selectors)` returns `{ traversableGraph, syntheticRoot: true }` suitable for spreading into `new DagTraversal(...)`. Items are a synchronous iterable. Selectors are `id(item)`, optional `children(item): Iterable<ID>`, `dependencies(item): Iterable<ID>`, and `completionDependencies(item): Iterable<ID>`. Data is the item itself. Missing selectors mean empty edges; collection membership discovers every record. Duplicate IDs reject even when the same record appears twice. A structural child absent from the catalog rejects; missing prerequisite IDs remain the engine's validation concern.

`forestFrom(roots, selectors)` accepts `children(item): Iterable<Item>` and otherwise the same selectors. It expands iteratively and permits repeated discovery of the same record under multiple parents. Different records with the same ID reject. Every discovered record is indexed; public structural parent queries exclude the internal holder. Structural cycles retain the engine's rejection contract.

`graphFromAsync` and `forestFromAsync` accept iterable/async-iterable catalogs and value-or-promise selectors. They materialize to the same synchronous source options. Source lookup callbacks can still use the existing `AsyncTraversableGraph` interface directly with `prepareDagAsync`.

Adapters materialize membership and selector-produced arrays once. Subsequent caller mutation of arrays or input collections does not change topology; changing an item field is ordinary shared-data mutation. IDs including undefined, null, NaN, objects, and symbols must work. Private holder data/identity never appear in public vertices, callbacks, or events.

## Precise events and filtered visitors

`DagEvent<T, ID = unknown>` has a required `vertexId: ID` and is a union correlating `workCompleted` with `DagTraversalOrder.ON_READY` and `subgraphCompleted` with `ON_COMPLETE`. Sync and async iterators preserve the runner's ID generic. Existing event fields and emission timing remain unchanged. Seeds synthesize no event and deferral still emits committed W only after settlement.

Provide `filterDagVisitor` and `filterAsyncDagVisitor` helpers. A predicate on vertex data can be a type guard; the wrapped callback receives a narrowed data type while retaining the original graph/context and output command types. A plain boolean predicate filters without narrowing. False predicates return no commands and invoke no callback. Preserve exact errors, async return values, phase restrictions, and callback ordering. Helpers must not inspect domain-specific discriminant names or introduce task classes.

## Prepared definitions

`prepareDag(input)` and `prepareDagAsync(input)` accept graph sources and discovery policies (`syntheticRoot`, `rootDependencies`, `implicitParentDependency`; async also concurrency). They accept no visitors, completed-work seeds, or injected state. They eagerly prepare with existing runner machinery.

The result is `{ kind: 'valid', dag: PreparedDag<Data, ID> }` or `{ kind: 'invalid', diagnostics: DagTraversalStallDiagnostics<ID> }` for engine dependency validation failures. Adapter-thrown errors, even a caller-thrown `DagTraversalStallError`, propagate with exact identity. Malformed source contracts and structural-store errors retain their existing thrown contract. Invalid results execute no visitor and are not executable definitions.

`PreparedDag` exposes detached readonly vertex descriptions with `vertexId`, `data`, `children`, `dependsOn`, and `dependsOnComplete`, plus `createRunner(options?)` and `createAsyncRunner(options?)`. Sessions normalize discovery hints to ID links: runner data is `TreeTypeParameters<Data, ID>`. Preserve real-root versus synthetic-forest semantics, original structural order, omissions that satisfy dependencies, effective implicit dependencies, and honored/ignored root W. Retain sufficient omission identities to validate accepted seeds and dependencies on omitted vertices.

Runner options allow visitors, completedWork, workCompletion, event/visitor configuration through ordinary execution methods, and async concurrency. They forbid replacing source/topology policies or injecting continuation state, including JavaScript own fields with undefined values. Preparation of each new runner freezes replay topology before visitors; replay invokes no original adapters. Every runner owns new references, progress, visitors, seeds, and settlement generations. The definition contains no shared mutable runner state. Definition data and IDs are shallow caller values.

Capture materializes supported source fields explicitly, including non-enumerable own IDs and accessible inherited content/dependencies. Known omitted discovery slots retain their ID and original position; replay must not relocate them to the root because that can reorder dependency readiness. Public retained-child descriptions still exclude omissions. `createAsyncRunner` and `createAsyncSession` return promises that resolve after replay preparation.

Definitions do not promise saved callback contexts, original opaque discovery hints, durable serialization, or graph editing. New sessions may repeat in-memory engine validation; avoiding repeated source I/O and sharing a clear contract matter more than optimizing that step.

## Host coordination facade

`coordinateDag(runner)` and `coordinateDagAsync(runner)` wrap runners explicitly configured for `externalSettlement`; other completion modes reject. No execution occurs merely by wrapping. The facade provides `advance()`, `complete(ticket)`, `fail(ticket, error)`, `summary()`, and `requestPause()`; async advance returns a promise. Existing runner access remains caller-owned and the facade adds no independent execution owner.

`advance()` drains the runner and returns `{ kind: 'awaitingSettlement', frontier }`, `{ kind: 'paused' }`, or `{ kind: 'finished' }`. Failures throw exactly. Frontier elements are opaque `DagWorkTicket<ID>` objects exposing readonly `vertexId`; hidden state binds runner identity and generation. Tickets from another facade/session or forged objects reject before mutation. Repeated observations of the same deferred work remain usable, and identical accepted completion reports return `{ kind: 'alreadyAccepted' }`; first acceptance returns `{ kind: 'accepted' }`. Conflicting completion/failure follows existing settlement behavior.

`PreparedDag.createSession({ completedWork? })` and `createAsyncSession({ completedWork?, concurrency? })` compose fresh external-settlement runners with these facades. The core facade is independently usable with custom-source runners and their visitors. Tickets are nonserializable local capabilities, never persistent attempts or distributed claims. Completion after host durable acceptance must still be followed by advance to observe newly eligible work.

## Validation scenarios

Public tests must cover flat diamond work, empty/disconnected catalogs, shared forest descendants, arbitrary IDs, copied topology, async materialization, selector errors, typed event discrimination, narrowed visitors, original-source I/O only once, independent seeded sessions, W/C and omission preservation, structured invalidity, exact adapter errors, cross-session/forged/stale tickets, idempotence, fatal failure identity, and pause/drain behavior. Add strict compile-time misuse assertions and packed ESM/CJS consumers. Update the quickstart and current guides with runnable examples. Run the complete standard check before claiming completion.
