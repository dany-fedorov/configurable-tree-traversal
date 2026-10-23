# Uniform CTT API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all ten approved API improvements with canonical `$data` and `$childHints`.

**Architecture:** Normalize compatibility inputs at public boundaries; keep one
kernel transition per operation. Separate discovery structure, prerequisite
semantics, command batching, traversal feedback, and host policy.

**Tech Stack:** TypeScript, Jest, Node, existing CJS/ESM packaging.

**Spec:** `docs/superpowers/specs/2026-10-23-uniform-api-design.md`

## Global Constraints

- Canonical vertex fields are `$data` and `$childHints`.
- Host owns business outcomes, agent dispatch, durable storage, claims, and retries.
- Preserve arbitrary ID identity and exact thrown values.
- Preserve CJS/ESM runtime and declaration identity.
- Node remains >=22.12.0; retain existing minimum TypeScript compatibility.
- Preserve 100% source coverage; do not weaken thresholds.
- Do not change the package version or publish.
- Preserve unrelated local changes and historical research/plans.

## Task 1: Canonical vertex content (finding 10)

**Files:** `src/core/Vertex.ts`, `CTTAbstractParent.ts`, `TraversableTree.ts`,
source adapters constructing vertices, public exports, tests/core-edge-cases.test.ts,
tests/public-api.typecheck.ts; add tests/vertex-content-api.test.ts if useful.

**Interfaces:** Consumes existing VertexContent and MakeVertexResult. Produces
canonical content fields plus a compatibility input type/normalizer and legacy
Vertex property aliases. Getters and ref identity stay unchanged.

- [x] Add public regressions for canonical root/child construction, canonical
  clone with undefined data, legacy construction, aliases, and mixed-shape rejection.
  The real traversal test must see data and follow hints, not only inspect fields:
  `new Vertex({ $data: 'root', $childHints: ['child'] }).getChildrenHints()`
  must return `['child']`; `clone({ $data: undefined }).getData()` must be undefined.
- [x] Run focused tests and typecheck to observe missing API failures.
- [x] Implement normalization and types; keep resolved structural child metadata
  semantically separate. Update directly affected source callers.
- [x] Run focused tests, typecheck, full tests once; report red/green evidence.
- [x] Commit and obtain task-scoped review.

## Task 2: Orthogonal dependency and source resolution contracts (findings 1, 3, 7)

**Files:** `src/core/TraversableTree.ts`, `TraversableGraph.ts`,
`drivers/callbackBindings.ts`, `scheduling/GraphScheduling.ts`, kernel options,
both DAG configs/runners, public exports, affected dependency tests.

**Interfaces:** Add `rootDependencies?: 'honor' | 'ignore'`,
`implicitParentDependency?: boolean`, found/omitted resolution unions plus
lookup-only missing as specified. Normalize to existing internal result shape.

- [x] Write root missing-dependency regression comparing omitted and empty
  completedWork (both reject before root visitors), sync and async. Write
  deferred parent/child case: default graph readiness includes both; explicit
  inheritance includes parent only. Test ignore policy independent of seeds.
- [x] Write canonical source result cases: found root/hints; missing lookup
  remains blocked; deliberate omission satisfies W and C; explicit undefined
  and object IDs preserve identity; invalid root/hint missing rejects.
- [x] Run new regressions and observe failure before implementation.
- [x] Implement shared normalization and explicit scheduling options, preserving
  tree semantics. Update old fixtures to explicitly declare dependencies they
  actually require; never restore implicit graph defaults via a hidden heuristic.
- [x] Run focused DAG lookup/completion/discovery and tree suites; typecheck;
  full tests once. Commit and obtain task-scoped review.

## Task 3: Unified commands, batching and phase typing (findings 2, 4, 5, 8)

**Files:** `src/core/TraversalVisitor.ts`, `AsyncTraversalVisitor.ts`,
`visitors/VisitorChain.ts`, `visitors/types.ts`, `TraversalKernel.ts`,
visitor registration/config maps for all six traversals, DAG visitor types,
command/graph/public typechecks, command and deferred-settlement tests.

**Interfaces:** Add DEFER_READY and REWRITE_CHILD_HINTS commands;
`commandCommitMode: 'afterEachVisitor' | 'afterGroup'`; order-aware visitors
and results with a singleton deferral command tuple. Deprecated sentinel,
resolutionStyle and old hint command normalize to canonical semantics.

- [x] Add regressions proving command deferral does not satisfy work, frees
  capacity, discards buffered group effects, skips remaining callbacks, and
  resumes correctly through settlement. Verify symbol form matches.
- [x] Test mixed deferral/mutation results reject before applying any command.
  Test canonical hint rewrite in DFS PRE_ORDER, BFS LEVEL_ORDER and DAG ON_READY;
  invalid phases/eager topology reject.
- [x] Test afterGroup visibility/order against afterEachVisitor across sync/async;
  contradictory explicit old/new batching options reject.
- [x] Add compiler tests: ON_COMPLETE returning deferral is `@ts-expect-error`,
  POST_ORDER returning hint rewrite is `@ts-expect-error`, valid initial phase
  visitors compile and receive a narrow order.
- [x] Observe new test failures, then implement one shared command transition
  with source/phase validation and compatibility normalization.
- [x] Run affected visitor/driver/lifecycle/tree suites and typecheck; full tests
  once. Commit and obtain task-scoped review.

## Task 4: Traversal completion vocabulary (finding 6)

**Files:** `DagProgress.ts`, `TraversalKernel.ts`, both DAG runners as needed,
progress/settlement tests and typechecks.

**Interfaces:** `work: 'completed'`; settlement accepts
`{ kind: 'workCompleted' } | { kind: 'traversalFailed', error }` and deprecated
ok-form inputs. Keep existing identity/generation/replay rules.

- [x] Add canonical settlement regressions releasing W and completing C, fatal
  traversal failure preserving undefined/null/object errors, and cross-form
  replay equivalence. Assert no independent business failure state appears.
- [x] Observe failures, implement shared outcome normalization and state naming.
- [x] Run progress/settlement/lifecycle suites and typecheck, full tests once.
- [x] Commit and obtain task-scoped review.

## Task 5: Uniform convenience helpers (finding 9)

**Files:** All six `traverse*.ts` helper modules and their exports;
add tests/traversal-helper-options.test.ts and public type cases.

**Interfaces:** Each helper accepts one options object with its existing source
key and phase-keyed callback `visitors`; legacy positional call forms remain.

- [x] Test DFS/BFS/DAG sync and async options forms perform real traversal and
  invoke the declared phases, propagate failures, and honor config. Test legacy
  positional compatibility, including its established source precedence.
- [x] Add compiler cases rejecting conflicting DAG sources and wrong phase
  callbacks/commands in helper maps.
- [x] Observe failures; implement both call forms and shared normalization where useful.
- [x] Run helper/type/affected traversal suites and full tests once.
- [x] Commit and obtain task-scoped review.

## Task 6: Agent-first docs, migration, and package integration

**Files:** README.md, AGENTS.md, docs/reference.md, docs/agent-workflows.md,
docs/index.md, new docs/migration-uniform-api.md, examples/*.ts, package.json
files list, scripts/verify-package.cjs and packaging/type consumers.

**Interfaces:** Uses canonical APIs from Tasks 1–5. Migration guide explicitly
maps all old forms and behavior changes; documents exclusive deferral result,
group ordering, dependency policies and host completion semantics.

- [x] Convert current guides/examples to canonical fields, commands, outcomes,
  helper shapes and explicit dependencies. Preserve public anchors and history.
- [x] Extend packed runtime/type consumers to exercise canonical and deprecated
  forms with shared CJS/ESM identities and existing minimum TS compatibility.
- [x] Execute examples, validate relative links/anchors and package files.
- [x] Run `npm run check`; resolve failures and coverage gaps without weakening
  gates. Run existing minimum Node/Bun/type consumer checks where available.
- [ ] Commit and obtain final whole-branch review against every numbered spec
  section. Fix confirmed issues and verify the amended areas.
- [ ] Finish integration according to the user's standing authorization. No npm
  publication or version bump belongs to this goal.
