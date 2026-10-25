# General Graph Walking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement roadmap item 9 as a reusable, typed, lazy graph-walking family supporting mixed observations, cyclic information graphs, bounded route enumeration, and independent sync/async runners.

**Architecture:** A walking-specific, promise-free transition machine owns source observations, frontier policy, visitor progress, and lifecycle. Thin synchronous and asynchronous sessions execute its requests; both reuse existing registration/selector utilities and shared execution capabilities without inserting walking edges into DAG milestone scheduling. Source adapters and observation selection remain independent of revisit policy.

**Tech Stack:** Existing TypeScript/Jest toolchain, ES iterators/async iterators, Map/Set identity, canonical CommonJS implementation with generated ESM facades, existing packed-consumer verifier.

**Spec:** [General graph walking design](../specs/2026-10-25-general-graph-walking-design.md). Read the complete revised design, including cross-family consistency, independent review disposition, and the self-link depth-bound example, before executing this plan.

**Status:** Implementation in progress. Task 1 is implemented and independently reviewed; unchecked tasks remain. The design and plan do not establish that the APIs exist. Current base is `c1e5840bdf89372955feedde9d18e2214e0ea663`; re-check source and workspace state at execution time.

## Global Constraints

- User direction: keep APIs consistent across generic graph, DAG, and tree as much as possible without sacrificing the library goals.
- “CTT owns discovery, traversal strategy, revisit policy, observation, and in-memory continuation.”
- “The host owns retrieval policy, authorization, business meaning, retries, persistence, and agent dispatch.”
- “Walking edges carry no work/completion milestone semantics.”
- “Copy link wrappers and own traversal records, retaining caller data and IDs by identity.”
- “Do not freeze caller objects.”
- “Keep TypeScript 4.7 consumer compatibility unless implementation establishes a concrete need to change it.” Repository validation pins minimum consumers to 4.7.4; the locked development compiler is 4.9.5.
- “V1 executes callback chains serially in deterministic order, including async walking.” No concurrent-retrieval option in this scope.
- Preserve Node 22.12.0+, current Node 22/24 CI lanes, and Bun 1.4.4 packed-consumer support from the repository testing guide.
- Preserve arbitrary SameValueZero IDs, exact thrown values including `null`/`undefined`, existing public aliases, and all old tree/DAG behavior.
- Maintain 100% statements, branches, functions, and lines without exclusions or weaker thresholds. No new runtime dependency is needed.
- CJS/ESM root, namespace, and subpath imports share constructor, command, and declaration identity.
- No release, version bump, implementation of roadmap items 5/10, or push/merge is authorized by this planning task.

## Execution preparation and integration rule

Use the worktree skill when execution begins. Preserve all existing local documents; do not stage the whole repository. Carry this spec, this plan, the glossary, and the roadmap change into the isolated implementation checkout deliberately. The original checkout contains unrelated untracked research/plans dated 2026-10-21; they are not part of this scope.

Run `npm ci` if dependencies are absent and `npm run check` once on the execution baseline. Record runtime/compiler versions and the result. Each task follows a focused failing-test → implementation → passing-test cycle. The tasks are incremental branch commits, not independently advertised releases: keep unfinished behavior out of current consumer documentation until Task 10. Before integration, run the complete check and compatibility matrix on the final tree, review the whole change, and resolve material findings. Publication remains a separate authorization.

## Consistency and reuse map

| Concern | Reuse or preserve | Walking-specific choice |
| --- | --- | --- |
| Construction | Constructor options, `configure`, `makeRunner`; runner snapshots; one-shot helper returns runner | `GraphWalk`, `AsyncGraphWalk`, `source` input rather than pretending it is a `TraversableGraph` |
| Registration | `addVisitorFor`, `addVisitorGroupFor`, `setVisitorsFor`, `listVisitorsFor`; generic normalization, priority/group ordering | Phase-specific event callbacks instead of fabricated `Vertex` objects |
| Commands | Existing `HALT_TRAVERSAL` and `NOOP` identities; `commandCommitMode` batching | Reject settlement, rewrite, delete, subtree, and chain-state commands; predicates own pruning |
| Execution selectors | `TraversalIterableConfigInput`, canonical/legacy exclusivity, detached field-wise patches | Explicit walking emission selectors narrow delivery, including pending records; old families' admission rules stay unchanged |
| Lifecycle | Status enum, `run`, `getIterable`, `requestPause`, `isHalted`, one owner, exact retained failure | Terminal `close` releases source iterators; summary distinguishes limited/exhausted/closed |
| Capabilities | Defaulted inspection parameter preserves old two-parameter execution interfaces | Common `ExecutionInspection`, detailed `GraphWalkInspection` |
| Sources | Tagged found/omitted, lazy callbacks, copied topology and opaque caller data | Target wrapper permits inline hydration; no W/C satisfaction claim |
| Identity | SameValueZero, arbitrary ID identity, no JSON/string keys | Edge identity is source ID plus enumeration index |
| Packaging | Existing facade generator and canonical declarations | Root namespace `graphWalk`, `traversals/graph-walk` subpath |

Reuse `src/core/normalizeTraversalExecutionOptions.ts` with explicit walking phases; do not add walking phases to the existing `VisitOrder` union or `getTraversalExecutionPhases` table. Reuse `normalizeVisitorDefinitions`, `appendVisitorDefinition`, `appendVisitorGroup`, `copyVisitorRecords`, and `orderVisitorRecords`. The existing `VisitorChain`, `KernelPort`, `runSync`, and `AsyncRunnerSession` require tree references, old phase unions, or DAG deferral; do not cast walking values into them. Reuse `captureOutcome` and `Wakeup`, which are independent of that representation. Extract only the small pure visitor-batch boundary rule for reuse by the two chain implementations.

## File map and responsibilities

New family code lives under `src/traversals/graph-walk/`; imports are relative within the family and existing `@core` aliases elsewhere. No new path alias is required.

| Files | Responsibility |
| --- | --- |
| `src/core/ExecutionInspection.ts`, existing `TraversalExecution.ts` / `CoreInspection.ts` / `index.ts` | Common inspection structure and backward-compatible execution generics |
| `GraphWalkPhase.ts`, `GraphWalkSource.ts`, `GraphWalkEvent.ts`, `GraphWalkOptions.ts`, `GraphWalkVisitor.ts` | Public source/result/policy/callback contracts and discriminants |
| `GraphWalk.ts`, `AsyncGraphWalk.ts`, `GraphWalkRunner.ts`, `AsyncGraphWalkRunner.ts` | Familiar construction, configuration, registration, and execution facades |
| `walkGraph.ts`, `walkGraphAsync.ts`, `index.ts` | One-shot entry points and family exports |
| `lib/normalizeWalkOptions.ts` | Pure atomic configuration normalization and snapshots |
| `lib/WalkSourceCache.ts` | Per-runner identity results, copied link cache, one opened outgoing iterator per ID |
| `lib/WalkFrontier.ts` | Iterative FIFO/stack scheduling and parent-linked route frames |
| `lib/WalkKernel.ts`, `lib/WalkEffects.ts` | Promise-free transitions, typed operation tags, admission, observation boundaries |
| `lib/WalkVisitorChain.ts` | Walking command validation, callback position, group commit, resumable HALT |
| `lib/SyncWalkSession.ts`, `lib/AsyncWalkSession.ts` | Request execution, iterator ownership, demand, delivery, pause and close |
| `lib/WalkResources.ts` | Opened iterator tracking, reverse-order terminal disposal, error precedence |
| `lib/GraphWalkSummary.ts`, `lib/GraphWalkInspection.ts` | Detached user outcome and mechanical execution observations |
| `walkSourceFrom.ts`, `walkSourceFromDag.ts` | Finite catalog materializers and explicit definition-relation adapter |
| `tests/helpers/graph-walk-fixtures.ts` | Deterministic public source fixtures and source-call trace |
| `tests/graph-walk-*.test.ts`, `.typecheck.ts` | Behavioral regressions and public type contracts mapped below |
| `scripts/package-consumers/graph-walk.mjs`, `.ts` | Extracted-package runtime identity, inference and capability compatibility |

Names in this table are new files relative to the family unless a full path is given. Existing files to modify are enumerated in each task. Do not grow `TraversalKernel.ts` with walking-specific state.

## Public interfaces shared by the tasks

Use the source, target, vertex, link, edge and event definitions from the spec unchanged. ID trails the two caller-data generics. `GraphWalkPhase` has values `VERTEX = 'vertex'`, `EDGE = 'edge'`, `PATH = 'path'`; event kinds remain the corresponding string literals. Keep the enum/string relationship explicit when narrowing:

```ts
export type GraphWalkEventFor<Data, Edge, Phase extends GraphWalkPhase, ID> =
  Extract<GraphWalkEvent<Data, Edge, ID>, { kind: `${Phase}` }>;

export type GraphWalkVisitorResult = void | {
  commands?: readonly TraversalVisitorCommand<
    TreeTypeParameters,
    TraversalVisitorCommandName.HALT_TRAVERSAL | TraversalVisitorCommandName.NOOP
  >[];
};

export type GraphWalkVisitorContext<Phase extends GraphWalkPhase> = Readonly<{
  order: Phase;
  occurrenceIndex: number;
  observationIndex: number;
  visitorIndex: number;
  visitorRecord: VisitorRegistrationMetadata;
}>;

export type GraphWalkVisitor<Data, Edge, Phase extends GraphWalkPhase, ID> = (
  event: GraphWalkEventFor<Data, Edge, Phase, ID>,
  options: GraphWalkVisitorContext<Phase>,
) => GraphWalkVisitorResult;

export type AsyncGraphWalkVisitor<Data, Edge, Phase extends GraphWalkPhase, ID> = (
  event: GraphWalkEventFor<Data, Edge, Phase, ID>,
  options: GraphWalkVisitorContext<Phase>,
) => MaybePromise<GraphWalkVisitorResult>;

export type GraphWalkRevisitOptions =
  | { revisit?: 'once'; limits?: GraphWalkLimits }
  | {
      revisit: 'simplePaths' | 'walks';
      limits: GraphWalkLimits & ({ maxDepth: number } | { maxSteps: number });
    };
```

`GraphWalkLimits` is the spec's optional `maxDepth`, `maxOccurrences`, `maxSteps` record. Indices are zero-based: occurrence index is the candidate admission index; observation index counts that phase's logical observations independently of filters; visitor index is position in the ordered chain. Metadata is descriptive and readonly, with no executable visitor hidden inside it. Phase-keyed `visitors` use `VisitorPhaseInput` with exact `GraphWalkVisitor` / `AsyncGraphWalkVisitor` types. `.configure` accepts an atomic patch of construction fields; changing revisit/limits validates the merged candidate before mutation. `.makeRunner()` snapshots options, selector arrays, normalized records, and source callback identities/receiver, while retaining caller data by reference.

`expandVertex(vertex, context)` receives `depth`, `via`, and a discriminated context `{ revisit: 'once' } | { revisit: 'simplePaths' | 'walks'; path: GraphWalkPathEvent<Data, Edge, ID> }`. `followEdge(edge, context)` additionally receives `source`, with `depth` meaning candidate target depth and `path` meaning the current source prefix. Define `GraphWalkPathEvent<Data, Edge, ID> = GraphWalkEventFor<Data, Edge, GraphWalkPhase.PATH, ID>`. Async predicates return `MaybePromise<boolean>`; runtime rejects nonbooleans, and sync execution rejects thenables. No predicate return command vocabulary.

All runner `getIterable` signatures include a broad function-property overload satisfying the shared capability; an explicit nonoptional `emitPhases` overload narrows to `GraphWalkEventFor`. Omitted selectors and legacy aliases return the full event union. `run` returns `this` / `Promise<this>`; `close` returns `void` / `Promise<void>`. `summary`, `inspect`, status and pause methods are synchronous on both families. Registration methods preserve exact phase inference, return `this` for mutation, and return detached records for list queries.

### Option and facade boundaries

`GraphWalkOptions<Data, Edge, ID>` is `GraphWalkRevisitOptions` intersected with required sync `source`, optional BFS/DFS `strategy`, optional sync `followEdge`/`expandVertex`, phase-keyed sync visitors, and `TraversalIterableConfigInput<GraphWalkPhase>`. `AsyncGraphWalkOptions` substitutes the async source/callback forms. The public constructor accepts the appropriate complete options. Export `GraphWalkConfigureInput` / `AsyncGraphWalkConfigureInput` as partial patches of the respective non-policy fields plus optional `revisit` and `limits`; their merged complete configuration is validated atomically at runtime. A `configure({ revisit: 'walks' })` patch compiles and succeeds only when the merged prior state has a bound; otherwise it throws TypeError without mutation. Include runtime tests for both prior-bound cases and a type test showing that the partial patch itself is accepted; construction without a route bound remains a compile error.

`normalizeWalkOptions<Data, Edge, ID>(input: unknown, previous?: NormalizedWalkOptions<Data, Edge, ID>): NormalizedWalkOptions<Data, Edge, ID>` is private. Its normalized value contains required source callbacks/receiver, strategy, revisit, copied limits, normalized predicates, normalized phase-keyed visitor records, and `execution: EffectiveTraversalExecutionOptions<GraphWalkPhase>`. Source and callback values are the sync/async union internally; the public facade enforces the family's return contracts and the sync session additionally rejects runtime thenables. Validate before committing a new snapshot; do not add a public normalization factory.

Public factories have the same method names and behavior as the existing traversal classes. Registration generic phase inference must be protected from callback-return widening with the existing `NoInferPhase` technique. `addVisitorFor`/`addVisitorGroupFor`/`setVisitorsFor` return the factory. `listVisitorsFor` returns copied `VisitorRecord` wrappers. `GraphWalkVisitor` results use only the existing halt/no-op command identities; no new sentinel is added.

### Internal transition boundary

Use tagged requests rather than making the kernel async:

```ts
type WalkOperation = 'roots' | 'rootNext' | 'resolveVertex' | 'outgoing'
  | 'edgeNext' | 'followEdge' | 'expandVertex' | 'visitor' | 'iteratorReturn';

type WalkAction<Data, Edge, ID> =
  | { kind: 'CALL'; requestId: number; operation: WalkOperation;
      invoke: () => unknown }
  | { kind: 'OBSERVATION'; boundaryId: number; phase: GraphWalkPhase;
      event: () => GraphWalkEvent<Data, Edge, ID> }
  | { kind: 'WAIT' | 'HALTED' | 'FINISHED' }
  | { kind: 'FAILED'; error: unknown };
```

`WalkKernel<Data, Edge, ID>` exposes `poll()`, `submit(requestId, outcome)`, `acknowledgeObservation(boundaryId)`, `resume(config?)`, `requestPause()`, `beginClose()`, `getStatus()`, `getStopReason()`, `isHalted()`, `summary()`, and `inspect()`. `outcome` is the existing tagged `Outcome<unknown>`; the pending operation validates/narrows its value before committing. A tagged failure object, never a truthiness/null sentinel for the error itself, retains arbitrary thrown values. A request ID may settle once. `poll` and inspection never invoke caller code; sessions alone invoke request closures. `OBSERVATION.event()` is a pure internal lazy projection and is called only when a callback or delivery needs the record.

Kernel state carries an admitted candidate, its pending edge/vertex/path boundaries, per-boundary visitor progress, pending expansion, and the frontier. Session acknowledgement advances exactly one observation; it never resolves another candidate as a side effect of `return()`. Permit at most one physical callback request in flight, although source iterators and route frames can remain open.

## Task 1: Shared execution capabilities and public walking contracts

**Files:** create `src/core/ExecutionInspection.ts`; modify `src/core/TraversalExecution.ts`, `src/core/CoreInspection.ts`, `src/core/index.ts`; create the five public contract files and `lib/normalizeWalkOptions.ts`; add `tests/graph-walk-types.typecheck.ts`, `tests/graph-walk-options.test.ts`; extend `tests/execution-capabilities.typecheck.ts` and `scripts/package-consumers/execution-capabilities.ts`.

**Interfaces:** consume existing `CoreInspection`, execution selectors, visitor definitions, status/stop enums, and `MaybePromise`. Produce `ExecutionInspection`, defaulted inspection generics, `GraphWalkSource`, `AsyncGraphWalkSource`, `GraphWalkTarget`, `GraphWalkVertexResult`, `GraphWalkLink`, `GraphWalkVertex`, `GraphWalkEdge`, `GraphWalkEvent`, phase narrowing, visitor/predicate/options types, and a pure `normalizeWalkOptions(input, previous?)` snapshot function. No public walking runner is claimed complete in this task.

- [x] Add a compile-time regression demonstrating generalized inspection without weakening existing detailed callers:

```ts
function paused(state: TraversalExecutionState<ExecutionInspection>): boolean {
  const inspection = state.inspect();
  return state.isHalted() && inspection.status === TraversalRunnerStatus.HALTED;
}
const oldShape: CoreInspection = syncConcrete.inspect();
paused(syncConcrete);
// syncConcrete is constructed in execution-capabilities.typecheck.ts.
void oldShape;
```

- [x] Run `npm run typecheck`; confirm the missing common contract/defaulted parameter is the failure. Add `ExecutionInspection` with the seven fields specified in the design; add `Inspection extends ExecutionInspection = CoreInspection` to `TraversalExecutionState` and as the third parameter of sync/async capabilities. Preserve function-property variance and default legacy interfaces. Generalize `InspectionFilters<Phase extends string = VisitOrder>` in `CoreInspection.ts` and use it as walking `iterableConfig`; old defaults remain unchanged.
- [x] Define the source/event/options types from the spec and the public interfaces above. Until Task 2 adds the family barrel, import these types by their new module paths in type assertions; Task 2 switches the public assertions to the root exports. Add negative assertions for async callbacks in sync sources, absent bounds with `simplePaths`/`walks`, another family's phases, mixed `emitPhases`/`iterateOver`, and invalid commands. Test `undefined`, object and symbol ID types without widening them to `unknown`.
- [x] Add runtime tests for atomic normalization and copied selectors; use the exact shared normalizer with explicit walking phases:

```ts
expect(() => normalizeWalkOptions({ source, revisit: 'walks' })).toThrow(TypeError);
expect(() => normalizeWalkOptions({ source, limits: { maxDepth: -1 } }))
  .toThrow(TypeError);
const emitPhases = [GraphWalkPhase.VERTEX];
const config = normalizeWalkOptions({ source, emitPhases });
emitPhases.length = 0;
expect(config.execution.emitPhases).toEqual([GraphWalkPhase.VERTEX]);
```

Seed the walking defaults through the existing normalizer, then apply the caller patch separately so a legacy alias does not conflict with an injected canonical field:

```ts
const phases = [GraphWalkPhase.VERTEX, GraphWalkPhase.EDGE, GraphWalkPhase.PATH];
const defaults = normalizeTraversalExecutionOptions(phases, {
  emitPhases: [GraphWalkPhase.VERTEX], visitorPhases: 'all',
});
const execution = normalizeTraversalExecutionOptions(
  phases, input, previous?.execution ?? defaults,
);
```

Here `input` is the validated options object (the shared normalizer reads only recognized selector fields), and `source` in the regression is a typed zero-root synchronous source defined in the test. Default policy/order are once/BFS, emissions vertex-only, visitors all. Reject malformed source methods/options and any own `concurrency` field before invoking them; don't freeze callback receivers or caller data. Read recognized option getters once; propagate getter errors unchanged. `.configure` later calls this function on a copied candidate.

- [x] Run `npm test -- tests/graph-walk-options.test.ts` and `npm run typecheck`. Verify existing execution capability negative assertions still reject widening a DFS/BFS/DAG family. Commit only the files listed here with message `feat(core): generalize execution inspection for graph walking`.

## Task 2: Synchronous unique-vertex discovery and mixed observations

**Files:** create `lib/WalkEffects.ts`, `lib/WalkSourceCache.ts`, `lib/WalkFrontier.ts`, `lib/WalkKernel.ts`, `lib/SyncWalkSession.ts`, `lib/GraphWalkSummary.ts`, `lib/GraphWalkInspection.ts`, `GraphWalk.ts`, `GraphWalkRunner.ts`, and the family `index.ts`; modify `src/index.ts`; add `tests/helpers/graph-walk-fixtures.ts`, `tests/graph-walk-discovery.test.ts`, `tests/graph-walk-observations.test.ts`. Add public exports for the implemented sync entry point through the family and root barrels; do not document the family as delivered yet.

**Interfaces:** consume Task 1 normalized options and events. Produce a working `new GraphWalk({ source }).makeRunner()` with `run`/`getIterable`, status, identity caches, FIFO/stack frontier, mixed observations, summary, passive inspection shape, and retained failures. Initialize real counters in this task; Task 3 adds bound enforcement and Task 6 verifies the complete resource/lifecycle inspection contract. The transition boundary is the one defined above; predicate, visitor and route policies are completed in later tasks without replacing the boundary.

- [x] Create a reusable catalog fixture with an actual source-call trace. It returns `{ source, calls }`; `calls` is an array of strings tagged `roots`, `resolve:A`, `outgoing:A`, `link:A:0`, etc. `source.roots` yields wrapped IDs; `resolveVertex` consults a fixture-owned Map; `outgoing` yields copied links in declaration order and records each pull. The shared fixture graph is A/E roots and links A-B/imports, A-B/references, A-C/cites, B-D/definedIn, C-D/cites, D-A/cites. Use document/symbol discriminated data and no host business logic.
- [x] Add the decisive one-pass public regression before implementing the scheduler:

```ts
const { source } = contextFixture();
const runner = new GraphWalk({ source }).makeRunner();
const events = [...runner.getIterable({
  emitPhases: [GraphWalkPhase.VERTEX, GraphWalkPhase.EDGE],
})];
expect(events.map(event => event.kind === 'vertex'
  ? `v:${event.vertex.vertexId}`
  : `e:${event.edge.from}:${event.edge.to}:${event.edge.data.kind}`))
  .toEqual([
    'v:A', 'v:E', 'e:A:B:imports', 'v:B', 'e:A:B:references',
    'e:A:C:cites', 'v:C', 'e:B:D:definedIn', 'v:D',
    'e:C:D:cites', 'e:D:A:cites',
  ]);
expect(runner.summary().counts.occurrences).toBe(8);
```

- [x] Run `npm test -- tests/graph-walk-observations.test.ts` and confirm missing walking execution fails. Implement iterative BFS/DFS frame scheduling. BFS exhausts root candidates before dequeueing expansion; DFS retains the root iterator while descending. Each expansion frame has its own logical adjacency index; the source cache owns the single physical iterator and copied entries. `Map.has` distinguishes unresolved IDs from cached `found(undefined)` or omissions.
- [x] Commit an admitted target in cache→inline result→resolver order. Do not admit or hydrate from a rejected link. Missing fallback resolver fails only when an admitted uncached ID needs it. Resolve roots once; skip duplicate declarations; include isolated roots. Copy target/link/result wrappers before exposing them and preserve data/ID references. Getter and source errors are exact, not relabeled as invalid graph conditions.
- [x] Produce edge observation before a newly admitted target vertex/path; returning and parallel links produce only the edge under once. Include typed `source` and found/omitted `target`, source enumeration index before filtering, and traversal depth. Keep path projection lazy. Implement sync source request handling and defensive thenable rejection without leaving rejected promises unobserved. Treat malformed iterator protocol results as TypeErrors; retain caller-thrown values exactly.
- [x] Add discovery regressions for object/symbol/undefined/NaN IDs, equal endpoint pairs, same object yielded twice, omitted roots and targets, later conflicting inline results, repeated roots, empty graph, self-links, a 20,000-vertex chain, source receiver binding, and independent runners. Use count assertions to prove construction/makeRunner are lazy and resolution/outgoing opening happen at most once.
- [x] Run `npm test -- tests/graph-walk-discovery.test.ts tests/graph-walk-observations.test.ts` and `npm run typecheck`. Commit as `feat(graph-walk): discover cyclic graphs with mixed typed observations`.

## Task 3: Predicates, bounds, and sound emission selection

**Files:** extend `WalkKernel.ts`, `WalkFrontier.ts`, `SyncWalkSession.ts`, `GraphWalkSummary.ts`, `GraphWalkRunner.ts`; add `tests/graph-walk-controls.test.ts`, `tests/graph-walk-limits.test.ts`, `tests/graph-walk-selection.test.ts`; extend `tests/graph-walk-types.typecheck.ts`.

**Interfaces:** consume found occurrences and observation boundaries. Produce `followEdge`, `expandVertex`, all three limits, occurrence/step counters, outcome reasons, explicit-selector narrowing, and broad persisted-selector fallback. Summary uses `{ status, counts: { steps, occurrences, foundVertices, omittedVertices, observedLinks, observations: { vertex, edge, path } }, outcome }`; outcome variants are those in the design.

- [x] Add public regressions proving filtered links don't hydrate/resolve, pruned vertices still emit, and observer selection doesn't affect exploration:

```ts
const first = new GraphWalk({ source: contextFixture().source }).makeRunner();
const second = new GraphWalk({ source: contextFixture().source }).makeRunner();
first.run({ emitPhases: [], visitorPhases: { include: [] } });
second.run({ emitPhases: [GraphWalkPhase.VERTEX, GraphWalkPhase.EDGE] });
expect(first.summary().counts).toEqual(second.summary().counts);
expect(first.summary().counts.occurrences).toBe(8);
```

- [x] Run the three new focused suites to observe failure. Implement candidate admission independently of event counts: root/link pull increments steps (including cached replay/done); distinct root or eligible followed link increments occurrences; rejected/duplicate candidates consume only steps. Increment logical observation counters even if no callback/delivery requests payload materialization. Never perform a speculative next pull or open a new enumeration after a global allowance reaches zero. If the final admitted pull proves all work exhausted, report exhausted rather than limited; test an empty root stream with maxSteps one and a leaf whose final permitted adjacency-done pull drains the frontier.
- [x] Invoke `followEdge` after simple-path candidate eligibility but before target cache hydration/resolution. Invoke `expandVertex` after occurrence observations and before depth cutoff. Both must return booleans. A false expansion predicate counts as host pruning, not a depth limit. `once` retains its first-discovery depth/prune choice; never silently re-expand after a later shorter route.
- [x] Pin exact depth and zero/global-cap behavior:

```ts
const self = new GraphWalk({
  source: idGraph(['A'], [['A', ['A']]]), limits: { maxDepth: 1 },
}).makeRunner().run();
expect(self.summary().outcome).toEqual({ kind: 'exhausted' });
const boundary = new GraphWalk({
  source: idGraph(['A'], [['A', ['B']], ['B', []]]),
  limits: { maxDepth: 1 },
}).makeRunner().run();
expect(boundary.summary().outcome).toEqual({
  kind: 'limited', reasons: ['maxDepth'],
});
```

`idGraph(roots, adjacency)` is a test helper in `graph-walk-fixtures.ts`: data is the ID itself; every listed ID is found, unknown lookup throws, links carry `undefined`. Also cover zero steps/occurrences causing no source calls, zero depth allowing roots, exact caps without exhaustion probing, including exhaustion already proven by the final allowed pull, omitted/returning candidates, false predicates at a boundary, and DFS first-route depth versus BFS shortest depth.
- [x] Implement emission filtering at delivery with a broad capability signature plus a narrowing overload:

```ts
type GraphWalkIterable<Data, Edge, ID> = {
  <P extends GraphWalkPhase>(config: TraversalIterableConfigInput<GraphWalkPhase>
    & { emitPhases: readonly P[] }): Generator<GraphWalkEventFor<Data, Edge, P, ID>, void, unknown>;
  (config?: TraversalIterableConfigInput<GraphWalkPhase>):
    Generator<GraphWalkEvent<Data, Edge, ID>, void, unknown>;
};
```

Validate/detach before mutation. No-argument, empty patch, and legacy-alias calls retain full result unions. Assert `emitPhases: []` yields `never`, mixed literal selectors exclude paths, and another family's enum is rejected. Copy selectors on activation; preserve explicit canonical/legacy conflict behavior through the shared normalizer.
- [x] Run the focused control/limit/selection suites and `npm run typecheck`; commit as `feat(graph-walk): separate exploration controls from observation`.

## Task 4: Familiar visitor registration and synchronous continuation

**Files:** extend `GraphWalk.ts`, `GraphWalkRunner.ts`, `WalkKernel.ts`, `SyncWalkSession.ts`; create `lib/WalkVisitorChain.ts`; extract the shared pure batch-boundary helper as `src/core/visitors/getVisitorBatchEnds.ts` and update `src/core/visitors/VisitorChain.ts` to call it without changing behavior; add `tests/graph-walk-visitors.test.ts`, `tests/graph-walk-lifecycle.test.ts`.

**Interfaces:** consume generic registration normalizers and existing command identities. Produce `configure`, `addVisitorFor`, `addVisitorGroupFor`, `setVisitorsFor`, `listVisitorsFor`, runner configuration snapshots, phase-specific callback context, `requestPause`/`isHalted`, single-owner synchronous iteration, and exact continuation across observations/chains.

- [x] Add a public regression registering vertex and edge visitors, then suppressing all emitted records. Both callback kinds still run in the same traversal; the source trace equals Task 2's. Mutating a returned registration list must not change subsequent runs, while callback/group metadata identities remain shared. `.configure` with an invalid phase/group/merged bound must leave the prior configuration usable.
- [x] Add a HALT-after-group regression with an independently observable trace:

```ts
const seen: string[] = [];
const traversal = new GraphWalk({ source: idGraph(['A'], [['A', []]]) });
traversal.addVisitorGroupFor(GraphWalkPhase.VERTEX, {
  commandCommitMode: 'afterGroup',
  visitors: [
    () => {
      seen.push('first');
      return { commands: [{ commandName: TraversalVisitorCommandName.HALT_TRAVERSAL }] };
    },
    () => { seen.push('second'); },
  ],
});
traversal.addVisitorFor(GraphWalkPhase.VERTEX, () => { seen.push('third'); });
const runner = traversal.makeRunner().run();
expect(seen).toEqual(['first', 'second']);
expect(runner.getStopReason()).toBe('paused');
runner.run();
expect(seen).toEqual(['first', 'second', 'third']);
```

- [x] Run the new suites to see failure. Normalize/append/order registration records with the existing helpers, not a new sorting algorithm. Extract the shared pure batch boundary calculation without changing its rule: end after `afterEachVisitor`, end of records, a following non-afterGroup record, or a different `visitorGroup`. Run existing `tests/visitor-chain-machine.test.ts`, `tests/visitor-definitions.test.ts`, `tests/visitor-groups.test.ts`, and `tests/visitor-query-ownership.test.ts`.
- [x] Implement a walking chain that keeps record position, buffered command names, and HALT state. Validate every command before applying a batch; accept only NOOP/HALT and reject command arguments. HALT pauses at the configured commit boundary; resume at the next uncommitted callback, not at the first callback. `requestPause` instead stops new source admissions and drains the admitted chain according to existing cooperative semantics. Callbacks receive exact per-phase events and detached registration metadata.
- [x] Implement an explicit iterator lease so reentrant `run`/a competing iterator fails without corrupting the owner. Closing a never-started iterator does not call sources. Closing an active iterator pauses; consumer-body errors leave a resumable runner. Failed execution retains/rethrows the same value, including falsy errors. Primitive-error tests must assert that a catch occurred and that status is FAILED, not just compare an initially undefined variable to an undefined expected error. Finished execution is a no-op.
- [x] Test pause between edge and target-vertex observations, between vertex and path, after emission but before expansion, during a callback, and with emission disabled. Resume with a new explicit selector and prove every delivered kind satisfies its narrow type; suppressed/delivered observations never reappear. Call `configure` or append visitors on the traversal after making a runner and prove old/new runners have independent snapshots.
- [x] Run the visitor/lifecycle/selection suites, relevant old registration/chain suites, and `npm run typecheck`. Commit as `feat(graph-walk): preserve visitor and runner lifecycle conventions`.

## Task 5: Async source discovery and serialized session ownership

**Files:** create `AsyncGraphWalk.ts`, `AsyncGraphWalkRunner.ts`, `lib/AsyncWalkSession.ts`; extend effects/cache/kernel only for protocol parity; add `tests/async-graph-walk.test.ts`, `tests/async-graph-walk-lifecycle.test.ts`; extend type assertions and family/root exports for the async facade.

**Interfaces:** consume the same kernel/frontier and normalized async source/options. Produce `AsyncTraversalExecution<GraphWalkPhase, GraphWalkEvent<Data, Edge, ID>, GraphWalkInspection>` with value-or-promise source/predicates/visitors and async source streams. Reuse `captureOutcome`/`Wakeup`; do not add another graph algorithm in the async session.

- [x] Add sync/async parity tests on the mixed fixture, comparing event trace, counts, and outcome. Add an entirely hydrated async source with no resolver and assert shared targets open `outgoing` only once. Test a mixed source where only some targets need fallback resolution.
- [x] Add a controlled-promise test showing iterator close can request pause while a source callback is pending:

```ts
let release!: (value: GraphWalkVertexResult<string>) => void;
let admitted!: () => void;
const started = new Promise<void>(resolve => { admitted = resolve; });
const source: AsyncGraphWalkSource<string, undefined, string> = {
  roots: () => [{ vertexId: 'A' }],
  resolveVertex: () => {
    admitted();
    return new Promise(resolve => { release = resolve; });
  },
  outgoing: () => [],
};
const runner = new AsyncGraphWalk({ source }).makeRunner();
const iterator = runner.getIterable();
const pending = iterator.next();
await started;
const closing = iterator.return(undefined);
release({ kind: 'found', data: 'A' });
expect(await pending).toEqual({ done: true, value: undefined });
await closing;
expect(runner.isHalted()).toBe(true);
const resumed = runner.getIterable({ emitPhases: [GraphWalkPhase.VERTEX] });
expect((await resumed.next()).value).toMatchObject({ kind: 'vertex' });
await resumed.return(undefined);
```

- [x] Run focused async suites and observe missing behavior. Implement a manual async iterator/session with queued next waiters, a single owner, an immediate close/pause request, and a demand-driven pump. A raw async generator alone is insufficient because its `return()` queues behind a suspended `next()` rather than notifying the runner immediately.
- [x] Invoke at most one callback request at a time through `captureOutcome`; submit only the matching current request, then poll the same kernel. Attach rejection handlers at admission. Closing iteration drains already-admitted work, resolves pending next calls as done, retains pending observations, and does not pull another source item. A callback that never settles can delay pause; no cancellation promise is added.
- [x] Preserve strict backpressure: after delivering a vertex, do not call its expansion predicate or open its outgoing iterator before new demand. Test pending root enumeration, edge pulls, predicates and visitors; multiple queued next calls; concurrent run/iterator conflicts; exact rejected values; resolved thenables; throw/return on unopened and closed iterators; and independent async runners.
- [x] Run the async suites, sync walking suites, `tests/async-runner-session.test.ts`, and `npm run typecheck`. Commit as `feat(graph-walk): drive lazy async sources with shared walk semantics`.

## Task 6: Resource disposal, inspection, and failure precedence

**Files:** create `lib/WalkResources.ts`; complete `lib/GraphWalkInspection.ts`, `lib/GraphWalkSummary.ts`, both sessions/runners, and kernel teardown; add `tests/graph-walk-resources.test.ts`, `tests/graph-walk-inspection.test.ts`; extend execution type assertions.

**Interfaces:** consume opened source iterators and tagged failures. Produce terminal `close`, reverse-order iterator disposal, immutable outcomes, full `GraphWalkInspection`, generalized execution-capability assignability, and observational summary/inspection during every lifecycle state.

- [x] Build manual iterable fixtures that record `return()` order even before their first `next()` (generator `finally` alone cannot prove this). Test reverse opening order, exhaustion removal, exactly-once close, and attempts to close every resource even after one cleanup throws:

```ts
const returns: string[] = [];
const primary = { reason: 'source' };
const cleanup = { reason: 'cleanup' };
const runner = new GraphWalk({
  source: failingResourceSource({ returns, primary, cleanup }),
}).makeRunner();
let observed: unknown;
try { runner.run(); } catch (error) { observed = error; }
expect(observed).toBe(primary);
expect(returns).toEqual(['edges:A', 'roots']);
expect(runner.summary().outcome).toEqual({ kind: 'failed', error: primary });
```

Define `failingResourceSource` in this test: roots is an open manual iterator yielding A, A outgoing throws `primary` from `next`, outgoing `return` records its name and throws `cleanup`, root `return` records its name and succeeds. Use DFS so the root iterator remains open. Repeat with `null` and `undefined` as the primary error and with cleanup-only failure.
- [x] Run the new suites before implementing terminal disposal. Track only actually opened iterators; never open more to clean them up. Natural `done` removes a resource. Pause and public iterator return keep source resources; global limits, failure, or explicit terminal close release them. Reverse the opening stack and attempt every return once. Preserve a prior execution error over cleanup errors, otherwise retain the first cleanup error unchanged.
- [x] Implement `close()` as an exclusive terminal action with no active run/iterator owner. A paused/initial runner becomes FINISHED/closed; a naturally finished/failed runner keeps its existing outcome and error. Async overlapping close calls join the same promise, and later close calls are idempotent. Reject close during active execution without changing its owner; callers first request/await pause or close the public iterator.
- [x] Add a no-side-effects inspection regression while a controlled callback is pending. Assert detached frozen records, exact in-flight/pending/buffer counts, source mode graph, concurrency one, opaque internal vertex tokens, and no caller IDs/data/functions/promises. Attempted mutation must not alter the next snapshot or execution. Check `requestPause` returns true only for a new running request; it never rethrows retained failure.
- [x] Assign both walkers and all six existing runner families to common-inspection capabilities in type tests. Preserve old `CoreInspection` assignment for tree/DAG and reject a walking runner where that detailed old shape is required. Confirm phase variance remains contravariant; no casts to old `CoreInspection`, `VisitOrder` or `Vertex` are permitted as compatibility shortcuts.
- [x] Run resource/inspection/lifecycle suites, old core-inspection and execution-selection suites, and `npm run typecheck`. Commit as `feat(graph-walk): expose passive inspection and deterministic resource cleanup`.

## Task 7: Bounded simple paths and repeated-vertex walks

**Files:** extend `WalkFrontier.ts`, `WalkSourceCache.ts`, `WalkKernel.ts`, public options/predicate contexts as needed; add `tests/graph-walk-paths.test.ts`, `tests/async-graph-walk-paths.test.ts`; extend path type assertions.

**Interfaces:** consume the same source cache and observation pipeline. Complete `revisit: 'simplePaths' | 'walks'`, route contexts, lazy path materialization, per-route logical adjacency positions, and mandatory bounds. `once` with PATH observations remains first-discovery paths and needs no route-enumeration bound.

- [x] Add exact simple-path and repeated-walk regressions over the diamond with D-to-A:

```ts
const paths = [...new GraphWalk({
  source: idGraph(['A'], [
    ['A', ['B', 'C']], ['B', ['D']], ['C', ['D']], ['D', ['A']],
  ]),
  revisit: 'simplePaths', limits: { maxDepth: 3 },
}).makeRunner().getIterable({ emitPhases: [GraphWalkPhase.PATH] })];
expect(paths.map(path => path.vertices.map(vertex => vertex.vertexId).join('')))
  .toEqual(['A', 'AB', 'AC', 'ABD', 'ACD']);
```

For `walks` with the same bound, additionally expect ABDA and ACDA. For two parallel A-to-B links, assert different edge indices distinguish otherwise identical vertex routes. Include a self-loop at depth zero/one, roots reached earlier through another root, omission, and path-specific rejection of just one route to a shared target.
- [x] Run path suites to see failure. Store route ancestry in parent-linked frames; test simple-path membership iteratively using SameValueZero. Each frame keeps its own next-link index; replay from shared cached adjacency first, and only the frame at the current cache end requests a new physical pull. A cached end-of-stream is still a logical step for that frame. No recursive call stack or recursive path serialization.
- [x] Materialize `vertices`/`edges` only for PATH observers or route-sensitive predicates. Vertex/edge observers remain available under every policy and get repeated occurrences when that policy permits them. Suppress cycle-closing simple-path links before `followEdge`; preserve all relationships with `once`, including self-links. Source data remains once-per-ID while expansion predicates and follow predicates are per route.
- [x] Add async partial-cache reuse: pause after one path consumes only the first outgoing link of a shared vertex, resume another queued prefix, and prove no link is lost or read physically twice. Assert the source open/resolve counts remain once per ID under both route policies.
- [x] Verify admission counters are independent of mixed phase selectors and route expansion stops at depth/steps, including cases where every link is filtered. Prove zero bounds do no extra I/O, returning cached IDs do not falsely mark once walks depth-limited, and terminal cleanup closes partially consumed streams. For deep paths use a step bound to avoid asking tests to materialize a quadratic number of prefixes.
- [x] Run path suites, all walking limit/selection/resource suites, and `npm run typecheck`. Commit as `feat(graph-walk): enumerate bounded routes with cached lazy discovery`.

## Task 8: Catalog and DAG-definition adapters

**Files:** create `walkSourceFrom.ts`, `walkSourceFromDag.ts`; add `tests/graph-walk-sources.test.ts`, `tests/graph-walk-sources.typecheck.ts`; update family/root exports.

**Interfaces:** produce the following public factories; names match the spec:

```ts
export declare function walkSourceFrom<Data, Edge, ID>(
  items: Iterable<Data>,
  options: {
    id(item: Data): ID;
    outgoing(item: Data): Iterable<{ to: ID; data: Edge }>;
    roots: Iterable<ID>;
  },
): GraphWalkSource<Data, Edge, ID>;

export declare function walkSourceFromAsync<Data, Edge, ID>(
  items: Iterable<Data> | AsyncIterable<Data>,
  options: {
    id(item: Data): MaybePromise<ID>;
    outgoing(item: Data): MaybePromise<
      Iterable<{ to: ID; data: Edge }> | AsyncIterable<{ to: ID; data: Edge }>
    >;
    roots: Iterable<ID> | AsyncIterable<ID>;
  },
): Promise<GraphWalkSource<Data, Edge, ID>>;
```

`walkSourceFromDag<Data, ID>(definition, { relations })` returns `GraphWalkSource<Data, GraphWalkDagRelation, ID>`. `relations` is a nonempty readonly tuple of `'children' | 'workDependencies' | 'completionDependencies'`, runtime validated; `GraphWalkDagRelation` is `{ kind: 'child'; slotIndex: number } | { kind: 'workDependency' } | { kind: 'completionDependency' }`. Duplicate relation selectors are rejected; selection order does not override canonical child/work/completion ordering. Edges to known omissions remain observable.

- [x] Add a catalog regression proving eager topology capture and shallow data ownership:

```ts
const adjacency = [{ to: 'B', data: { kind: 'cites' } }];
const a = { id: 'A' }, b = { id: 'B' };
const source = walkSourceFrom([a, b], {
  id: item => item.id,
  outgoing: item => item === a ? adjacency : [],
  roots: ['A'],
});
adjacency.length = 0;
const events = [...new GraphWalk({ source }).makeRunner().getIterable({
  emitPhases: [GraphWalkPhase.EDGE],
})];
expect(events).toHaveLength(1);
expect(events[0]!.source.data).toBe(a);
```

- [x] Run source adapter tests to see missing exports. Materialize catalogs/async selectors once, copy all topology wrappers, reject duplicate IDs even for the same item twice, reject unknown roots/targets, preserve multiple links and input order, and provide fresh root/adjacency iterators for each runner. Unknown lookup through the resulting source throws rather than inventing an omission. Empty catalogs with empty roots are valid.
- [x] Add DAG adapter tests starting from `defineDag` values, including a shape-valid cyclic definition that cannot execute as a DAG. Selecting children must walk it successfully; selecting W/C dependencies must preserve dependent-to-prerequisite direction and labelled edge data. Selected missing endpoints fail membership validation; unselected missing dependencies are irrelevant to walking. Neither preparation nor task callbacks may run.
- [x] Handle root/forest/empty entries, known omitted roots/children/prerequisites, anonymous omitted slots (skip), parent child slot indices, and cycles. Validate live/omitted ID consistency on a copied input; do not silently overwrite duplicate records. Use `defineDag`'s shape normalization where compatible but do not invoke DAG acyclicity validation. Result wrappers must remain detached from definition mutations or separately created runners.
- [x] Run source behavior/type tests plus `tests/collection-sources.test.ts`, `tests/dag-definition-validation.test.ts` and `npm run typecheck`. Commit as `feat(graph-walk): adapt catalogs and explicit DAG relations`.

## Task 9: Helpers, public exports, and packed compatibility

**Files:** create `walkGraph.ts`, `walkGraphAsync.ts`, complete family `index.ts`; modify `src/index.ts`, `package.json`, `scripts/verify-package.cjs`; create `scripts/package-consumers/graph-walk.mjs` / `.ts`; extend `scripts/package-consumers/execution-capabilities.ts`; add `tests/graph-walk-helpers.test.ts` and public type assertions.

**Interfaces:** `walkGraph(options): GraphWalkRunner<Data, Edge, ID>` and `walkGraphAsync(options): Promise<AsyncGraphWalkRunner<Data, Edge, ID>>` create a fresh configured traversal and run it. Root named exports and `graphWalk` namespace point to the same implementation as `configurable-tree-traversal/traversals/graph-walk`.

- [ ] Add helper tests for phase-keyed visitors, HALT returning a resumable runner, exact sync/async errors, and correct inferred ID/data/relationship types. Helpers take only the canonical options object; do not add obsolete positional overloads to a new API.
- [ ] Implement helpers by delegating to constructors/makeRunner/run, with no second execution path:

```ts
return new GraphWalk(options).makeRunner().run();
// Async helper delegates identically and returns the awaited runner.
```

- [ ] Add explicit `./traversals/graph-walk` export conditions pointing to `dist/traversals/graph-walk/index.{mjs,js,d.mts,d.ts}` and the matching `typesVersions` entry. Root exports both `export * from './traversals/graph-walk'` and `export * as graphWalk from './traversals/graph-walk'`. Retain the existing historical deep-import wildcard rules. The recursive facade generator already discovers new built modules; change it only if a regression demonstrates a real gap.
- [ ] Add runtime packed-consumer assertions using the real extracted package:

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as root from 'configurable-tree-traversal';
import * as walking from 'configurable-tree-traversal/traversals/graph-walk';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
assert.equal(root.GraphWalk, walking.GraphWalk);
assert.equal(root.GraphWalk, cjs.GraphWalk);
assert.equal(root.graphWalk.GraphWalk, walking.GraphWalk);
assert.equal(root.TraversalVisitorCommandName, cjs.TraversalVisitorCommandName);
```

Also execute a cyclic mixed-observation walk, hydrated async stream, bounded repeated path, and pause/close cleanup. Check cross-loader `instanceof` for both runner families. Add `graph-walk` to the verifier's type fixture list so `.ts`, `.cts`, `.mts` copies compile with strict node/node16 resolution; add the `.mjs` fixture to its runtime list and assert the new subpath companions are packed.
- [ ] Packed type fixtures must exercise literal mixed-event narrowing, typed source endpoints, arbitrary ID unions, omitted targets, mandatory route bounds, rejected async sync callbacks, rejected DAG phases/commands, and old/common/detailed execution inspection assignments. Ensure no `@ts-expect-error` passes because an unrelated import is missing. Use concrete calls and assignments from the extracted package.
- [ ] Run `npm run typecheck`, helper tests, `npm run verify-package`, and `npm run test:packaging`. Commit as `feat(graph-walk): expose coherent root and subpath APIs`.

## Task 10: Consumer examples, consistency audit, and integration validation

**Files:** create `examples/graph-walk-context-example.ts`, `examples/graph-walk-references-example.ts`, `examples/graph-walk-paths-example.ts`; modify `README.md`, `docs/agent-workflows.md`, `docs/reference.md`, `docs/index.md`, `docs/testing.md`, `docs/migration-uniform-api.md`, `CHANGELOG.md`, `AGENTS.md`, and the roadmap/design/plan status records. Retain the existing package guide list; if any additional consumer guide is introduced, add it to `package.json` files and verify packed links.

**Interfaces:** consume the final public package API, never family-private internals. The reference documents current implemented behavior only after Tasks 1–9 pass. Examples use in-memory/controlled async host data, no credentials, network service, LLM or durable runner claims.

- [ ] Implement a runnable hydrated context example with shared targets, parallel/back edges, and an isolated root; print or assert the spec's five vertex callbacks and six relationship callbacks in one walk. Implement a code-reference example that reads typed source and target discriminants directly from edge events. Implement a bounded provenance-path example with simplePaths/walks and report `summary().outcome` so truncation is explicit.
- [ ] Update README with a concise link/use case; put source selection, callback/iteration integration, cancellation limits, and host responsibilities in the agent workflow guide. Put exact source/cache/inline conflict, event order, budgets, path policies, pause/close, error precedence, and inspection contracts in the reference. Preserve existing anchors and release facts; document this as unreleased checkout functionality.
- [ ] Include a cross-family example using shared `TraversalExecutionState<ExecutionInspection>` and phase-preserving execution wrappers. Explicitly document intentional differences: walking event records, source target wrappers, terminal resource disposal, and delivery-time selector narrowing. Do not claim a common source interface or retroactively change old tree/DAG emission semantics.
- [ ] Run `npm run tsfile -- examples/graph-walk-context-example.ts`, `npm run tsfile -- examples/graph-walk-references-example.ts`, `npm run tsfile -- examples/graph-walk-paths-example.ts`, then `npm run verify-examples`. Add complete standalone guide snippets only when they can compile and execute independently. Verify relative links/anchors and packaged guides using the package verifier; repository-only history/examples need repository links in packaged documentation.
- [ ] Run the full integration gate and record the complete output:

```sh
npm run check
```

Expected: typecheck, lint, source coverage at 100% on all four metrics, all examples and standalone snippets, clean build, packed runtime/types, benchmarks and facade-generator checks succeed. Do not substitute a subset or lower coverage. Keep source test counts as observed values rather than predeclaring a target count.
- [ ] Confirm the built final tree under exact Node 22.12.0, current Node 24 and Bun 1.4.4 with the locked compiler and isolated TS4.7.4. Use the existing testing guide's commands and verified tool paths; inspect each runtime/compiler `--version`, and do not hardcode an old `/tmp` path as present. Build once and rerun `scripts/verify-package.cjs` under remaining runtime/compiler combinations using `CTT_TYPESCRIPT_COMPILER` when needed. Run the Bun facade/benchmark correctness scripts. Record which CI-required Node 22/24 lanes still require remote CI if not locally available.
- [ ] Review the whole diff against the design and the conformance matrix below, with particular attention to shared files, exact error values, pending-close races, phase variance, and loader identity. Resolve material findings and rerun focused/full checks according to the changed area. No merge/push/publish is implicit in this planning task; use the execution session's current authorization.
- [ ] Update statuses only when the corresponding implementation and checks exist. Stage only scoped source/tests/examples/docs/package changes and commit as `docs(graph-walk): document verified agent exploration APIs`.

## Concrete shared test fixtures

Add these building blocks to `tests/helpers/graph-walk-fixtures.ts` in Task 2. They are deliberately ordinary caller sources, not a second walker. Specialized error/stream fixtures belong beside the tests that use them.

```ts
import type { GraphWalkSource } from '../../src';

export function idGraph(
  roots: readonly string[],
  adjacency: Iterable<readonly [string, readonly string[]]>,
): GraphWalkSource<string, undefined, string> {
  const byId = new Map(adjacency);
  return {
    roots: () => roots.map(vertexId => ({ vertexId })),
    resolveVertex(vertexId) {
      if (!byId.has(vertexId)) throw new TypeError('Unknown test ID');
      return { kind: 'found', data: vertexId };
    },
    outgoing(vertex) {
      return byId.get(vertex.vertexId)!.map(to => ({
        target: { vertexId: to }, data: undefined,
      }));
    },
  };
}

type ContextData =
  | { kind: 'document'; title: string }
  | { kind: 'symbol'; name: string };
type Relation = { kind: 'imports' | 'references' | 'cites' | 'definedIn' };

export function contextFixture(): {
  source: GraphWalkSource<ContextData, Relation, string>;
  calls: string[];
} {
  const calls: string[] = [];
  const data = new Map<string, ContextData>([
    ['A', { kind: 'document', title: 'A' }],
    ['B', { kind: 'symbol', name: 'B' }],
    ['C', { kind: 'document', title: 'C' }],
    ['D', { kind: 'document', title: 'D' }],
    ['E', { kind: 'symbol', name: 'E' }],
  ]);
  const links = new Map<string, readonly [string, Relation['kind']][]>([
    ['A', [['B', 'imports'], ['B', 'references'], ['C', 'cites']]],
    ['B', [['D', 'definedIn']]],
    ['C', [['D', 'cites']]],
    ['D', [['A', 'cites']]],
    ['E', []],
  ]);
  const source: GraphWalkSource<ContextData, Relation, string> = {
    roots() {
      calls.push('roots');
      return [{ vertexId: 'A' }, { vertexId: 'E' }];
    },
    resolveVertex(vertexId) {
      calls.push(`resolve:${vertexId}`);
      if (!data.has(vertexId)) throw new TypeError('Unknown context ID');
      return { kind: 'found', data: data.get(vertexId)! };
    },
    outgoing(vertex) {
      calls.push(`outgoing:${vertex.vertexId}`);
      return (function* () {
        let index = 0;
        for (const [to, kind] of links.get(vertex.vertexId)!) {
          calls.push(`link:${vertex.vertexId}:${index++}`);
          yield { target: { vertexId: to }, data: { kind } };
        }
      })();
    },
  };
  return { source, calls };
}
```

The trace records actual source callback/pull work; summary counters additionally account for cached logical pulls and end-of-stream checks. For async variants, wrap callbacks/iterators with controlled promises rather than adding sleeps. Root/outgoing protocol and cleanup fixtures use explicit iterators so tests can distinguish opening, first pull, end-of-stream, and return.

## Spec coverage and acceptance matrix

| Requirement | Task(s) | Evidence |
| --- | --- | --- |
| Consistency without sacrificing goals | 1, 4, 6, 9, 10 | Shared normalization/capabilities, cross-family type tests, documented differences |
| Lazy sync/async sources and independent snapshots | 1, 2, 5 | No I/O before execution; per-ID trace; separate runners |
| Hydrated, mixed and omitted targets | 2, 5, 8 | No host registry; first admitted result; rejected links do not seed |
| Arbitrary identity and parallel edges | 2, 7, 8 | SameValueZero domains, original link indices, duplicate endpoint paths |
| Independent revisit, callbacks and emission | 2, 3, 4, 7 | Mixed one-pass fixture and invariant source/candidate traces |
| Typed endpoint observations and union narrowing | 1, 2, 3, 9 | Source/target event data; strict packed assertions; buffered delivery checks |
| BFS/DFS and explicit route semantics | 2, 3, 7 | Exact sequences, root order, iterative deep traversal, first-route DFS depth |
| Limits and truthful completeness | 3, 6, 7 | Zero/exact caps, hidden events, self-return versus new boundary target |
| Familiar visitor ordering and HALT | 4, 5 | Shared groups/priority, afterGroup versus afterEach, no callback replay |
| Pause, ownership, async close races | 4, 5, 6 | Pending callbacks, queued nexts, consumer errors, no cancellation promises |
| Resource cleanup and exact failures | 2, 5, 6 | Reverse return order, all cleanup attempted, falsy primary failures |
| Passive common/detailed inspection | 1, 6, 9 | No source advancement, old defaults, new generalized wrappers |
| Catalog and explicit DAG relation adapters | 8 | Eager copied topology, selected relation membership, cycles, omissions |
| Root/subpath/namespace identity | 9 | Real packed consumers, strict TS4.7.4 CJS/ESM declarations |
| Current guides, runnable workflows, coverage | 10 | Full check and exact runtime/compiler evidence |

## Planning verification and execution handoff

The plan's file names and reuse decisions are grounded in the current source: generic registration/selector utilities can be reused directly, while tree/DAG kernel ports and sessions cannot represent walking events without an unsafe cast or a broad refactor. The execution inspection change is deliberately defaulted so existing callers retain their detailed types.

Before calling this plan complete, perform an inline self-review: map every spec section to the matrix; scan for unresolved placeholders and invented existing paths; check all shared names/signatures across tasks; check relative document links/anchors; and compare the consistency table with the user's goal hierarchy. Planning checks validate the artifact, not the future implementation. Implementation tests, full coverage and package/runtime checks remain unchecked tasks above.

Execution order is Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Source policies, visitor boundaries and sessions share state, so do not dispatch these tasks concurrently against the same files. Adapters/package/documentation work may be delegated only after their consumed contracts exist and the active execution workflow authorizes delegation.

### Planning verification record

Completed inline on 2026-10-25: all design sections map to the acceptance matrix; the ten tasks have explicit consumed/produced interfaces and 63 unchecked execution steps; referenced existing regression suites are present; document links, anchors, fences and whitespace pass validation. The complete proposed source types and shared test fixtures were extracted to an isolated temporary file and passed strict TypeScript 4.9.5 typechecking. No source implementation, implementation test suite, runtime compatibility matrix, or coverage gate was run as part of this planning-only work. Those are execution requirements above, not claimed results.

## Autonomous implementation rulings

The spec's Fable reconciliation section supersedes earlier examples in the retained review artifact. Apply the consistent public `GraphWalk*` names, `strategy`, and `traversals/graph-walk` subpath throughout code/tests/docs. Reject unsupported concurrency explicitly. Reuse shared command/filter contracts with default-preserving generics. The source's first accepted result remains authoritative, including omissions; document the intentional difference from DAG milestone execution. Bounds constrain construction types, while configure patches validate merged state at runtime. One vertex-expansion depth gate is authoritative; exact step exhaustion is not mislabeled as truncation. `walkSourceFrom(items, options)` keeps a flat ergonomic options object containing selectors and roots.

### Task 1 completion

Implemented in `1882273`, independently reviewed with no findings. Full `npm run check` passed: 97 suites, 2,176 tests, all four source coverage metrics at 100%, examples, packed consumers and benchmark/facade checks. This task establishes types and normalization; walking runners remain under implementation.
