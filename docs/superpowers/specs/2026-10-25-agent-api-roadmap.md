# Agent engineering API roadmap

Status: updated on 2026-10-26. Proposals 1, 2, 3, 4, 6, 7, and 8 are implemented and phase two is integrated. Item 9 is implemented on `feat/general-graph-walking` with all ten tasks independently approved, current guides/examples and full local integration/compatibility validation verified, and whole-branch review complete with no findings; items 5 and 10 remain backlog. Published npm 0.11.0 remains distinct from these unreleased additions.

## Purpose and acceptance criteria

CTT gives TypeScript programs a small, composable vocabulary for discovering, inspecting, transforming, and coordinating interconnected work and information. Proven algorithms, correctness, and adequate performance are prerequisites. Its differentiator is a reusable API that is orthogonal, type-safe, idiomatic, and applicable to common agent engineering structures.

Evaluate each addition against several realistic examples: does it remove custom graph plumbing, preserve useful types, and make misuse harder without introducing business policy? Keep structural children separate from dependencies. The host owns agent execution, accepted business outcomes, retries, attempts, claims, artifacts, and durable storage.

Keep meaningful API conventions consistent across generic graphs, DAGs, and trees wherever possible. Preserve orthogonality, type safety, idiomatic use, and workflow coverage when deciding where family-specific contracts are necessary.

## Roadmap

| Number | Proposal | Status | Value |
| --- | --- | --- | --- |
| 1 | Collection and forest sources | Implemented in checkout | Adapt ordinary records, roots, adjacency lists, and async catalogs without synthetic-root boilerplate. |
| 2 | Precise domain types through events and visitors | Implemented in checkout | Preserve ID types, correlate event kind and phase, and compose visitors using type guards. |
| 3 | Reusable graph definitions and independent sessions | Implemented in checkout | Discover and validate once, then create independent executions without replaying source I/O. |
| 4 | Composable graph fragments | Implemented in checkout | Instantiate reusable workflow shapes and connect explicit boundaries. |
| 5 | Milestone dependency expressions | Backlog | Express conjunctions, alternatives, and eventual quorum joins over W/C. |
| 6 | Validated graph revisions | Implemented in checkout | Represent decomposition and replanning with atomic structural changes. |
| 7 | Dependency navigation and explanations | Implemented in checkout | Query prerequisites, dependents, and readiness causes during healthy execution. |
| 8 | Host coordination interface | Implemented in checkout | Advance to a boundary and settle session-bound work tickets. |
| 9 | General graph walking | [Implemented on feature branch](../plans/2026-10-25-general-graph-walking.md); whole-branch independent review complete with no findings | Walk shared and cyclic information graphs independently of DAG execution. |
| 10 | Typed folds and projections | Backlog | Build summaries, context, and transformed data without manually managed accumulator maps. |

## 1 Collection and forest sources

Provide inferred selectors for identity, dependencies, completion dependencies, and structural children. Collection membership discovers vertices independently of dependency edges. Hide bookkeeping holders from public views. Support empty inputs, disconnected components, shared descendants, arbitrary SameValueZero IDs, and copied topology with shallow caller data. Forest traversal must be iterative. Async entry points should support async collections/selectors and produce the same source contract after materialization.

## 2 Precise events and visitors

Extend DAG events with typed IDs and make committed event kind and phase a discriminated union. Carry ID through both runner families and iterator return types. Add reusable visitor filtering that narrows opaque caller data through a type guard, preserves callback context and returned commands, and supports async visitors. Preserve source/rewrite generic positions and existing phase restrictions.

## 3 Definitions and sessions

Expose a reusable validated topology value with independent execution state per session. Discovering a remote source may perform I/O; starting another session must not repeat that I/O. Freeze owned topology, never caller data or IDs. Validation must retain existing W/C and omission semantics and expose structured diagnostics for expected dependency invalidity. Exact source error values must propagate unchanged. Definitions are in-memory values, not serialized checkpoints.

## 4 Graph fragments

Fragments expose named entry/exit handles, preserve internal structural relationships, and connect through explicit milestone dependencies. Instantiation takes an explicit ID mapping and rejects collisions. Arbitrary IDs must not be stringified. Containment and dependency connection remain separate operations. Task templates and agent roles remain host concepts.

## 5 Milestone expressions

Add a small monotone algebra such as `all(work(a), any(work(b), completion(c)))`, with possible later `atLeast` joins. Existing lists remain shorthand. Acceptance of additional facts cannot withdraw eligibility. Alternatives release their dependent; they do not cancel other work, classify outputs, or complete remaining branches. Validation and explanation need alternative-aware semantics; the existing conjunction-only SCC interpretation cannot be adopted blindly.

## 6 Graph revisions

Produce new definitions through atomic edits and expose structural diffs. Validate before execution and explicitly account for dependencies crossing removed vertices. The host selects conditional branches and determines which accepted completion facts retain meaning. Existing sessions and generation tokens must never silently migrate to the new revision. Report potential structural impact without claiming business invalidation.

## 7 Queries and explanations

`inspectDag(runner)` captures direct/transitive prerequisite and dependent queries separately from structural navigation, plus flat explanations of unmet W/C constraints, unfinished work, omissions/deletions, unresolved endpoints, local open discovery and pending completion commits. Queries are observational and report captured discovery completeness; accepted seeds satisfy W without implying C. See the [current query contract](../../reference.md#dag-dependency-queries-and-explanations). Hypothetical impact and observed readiness are distinct.

## 8 Host coordination

Expose an advance operation returning a discriminated boundary and a frontier of opaque session-bound tickets. Completing a ticket preserves guarded settlement and idempotence. Distinguish waiting, pause, and finish. Tickets are local handles, not claims, durable attempts, or authentication. The host accepts and persists results before reporting them to CTT.

## 9 Graph walking

Add explicit vertex/edge/path occurrence semantics for general graph traversal, including shared nodes and cycles. Path occurrence walks require bounds. Keep these discovery operations independent of acyclic milestone execution. Reuse identity and source concepts where their contracts agree.

The [reviewed design](2026-10-25-general-graph-walking-design.md) separates revisit policy from vertex/edge/path observation and supports hydrated lazy sources. Its [implementation plan](../plans/2026-10-25-general-graph-walking.md) includes a cross-family consistency matrix, dependency-ordered tasks, and public/packed validation. Walking APIs now exist in the implementation checkout; the [current reference](../../reference.md#general-graph-walking) documents them. Task 10 full local integration and all six runtime/compiler packed checks passed; whole-branch independent review is complete with no findings.

## 10 Folds and projections

Provide typed result-producing operations above visitors, specifying the traversed relation and synchronous/asynchronous combination. Distinguish computing a vertex once from counting its contribution once: shared descendants can otherwise be counted through multiple parents. Keep result types independent of source data and avoid asserting preservation of an arbitrary input shape.

## Delivery

The first phase is specified in [Agent API foundations](2026-10-25-agent-api-foundations-design.md) and tracked by its [implementation plan](../plans/2026-10-25-agent-api-foundations.md). The phase-two design specifies the delivered APIs for proposals 4, 6 and 7. Item 9 is implemented on its feature branch with whole-branch independent review complete with no findings; items 5 and 10 remain separate design work.

The first-phase full `npm run check` passed on Node v24.20.0: 88 suites, 1,901 tests, 100% source coverage, 14 runnable examples, 13 guide snippets, packed CJS/ESM runtime and TypeScript consumers, and benchmark/facade-generator checks. Independent review findings were fixed and re-reviewed.

Phase one was merged and pushed to `origin/main` as `1be1a28`. [Phase two design](2026-10-25-agent-api-phase-two-design.md) records delivery order **7 → 4 → 6**, with separate linked plans for inspection, fragment composition, and revisions. Dependency inspection (7) is delivered in the checkout. Fragment composition (4) is delivered in the checkout; validated revisions (6) are delivered in the checkout. Independent phase-two review is complete; all material findings were fixed and re-reviewed. Phase two was merged and pushed as `c1e5840`. Items 5 and 10 remain backlog proposals; item 9 is implemented on its feature branch, with full local integration/compatibility gates passed and whole-branch independent review complete with no findings.

The phase-two full `npm run check` passed on Node v24.20.0: 96 suites, 2,135 tests, 100% source coverage, 17 runnable examples, 14 standalone guide snippets, 638 packed files, and benchmark/facade-generator checks. Packed consumers also passed on Node 22.12.0, Bun 1.4.4, and TypeScript 4.7.4.
