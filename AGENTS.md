# Working on configurable-tree-traversal

## Read the right entry point

- **Using CTT in an agent coordinator:** start at [README](README.md), then [agent workflows](docs/agent-workflows.md).
- **Finding a public contract:** [API reference](docs/reference.md). [Documentation map](docs/index.md) links runnable examples.
- **Changing this repository:** use the source/test map below and [testing guide](docs/testing.md).

Current published API: **0.10.0**. `docs/research/` and `docs/superpowers/` contain historical research, plans, and downstream proposals. They are not a substitute for current documentation or evidence that a proposed feature exists. Reconcile discrepancies against source and behavioral tests; update the current guide when changing behavior.

## Scope and boundaries

CTT owns generic tree/DAG discovery, work/completion dependencies, callback scheduling, traversal lifecycle, diagnostics, and in-memory progress. Keep task types, agent dispatch, business priority/outcomes, attempts/retries, claims, artifact policy, and durable storage in the host. `$d` is opaque caller data. There is no public `planDag`, storage-provider port, durable runner checkpoint, or built-in LLM integration.

Dependency edges and structural child edges are different. Normal `ON_READY` completion satisfies W; committed `ON_COMPLETE` satisfies C. A sole `DEFER_READY` visitor keeps externally executed work incomplete. Settlement generations are local symbols; reconstruction uses host-accepted `completedWork` facts.

## Source and regression map

| Change area | Start in | Relevant tests |
| --- | --- | --- |
| Public exports and graph types | `src/index.ts`, `src/core/TraversableGraph.ts`, `src/core/TraversableTree.ts` | `tests/public-api.typecheck.ts`, `tests/graph-api.typecheck.ts`, `scripts/verify-package.cjs` |
| DAG readiness, progress and milestones | `src/core/scheduling/GraphScheduling.ts`, `src/core/scheduling/dependencyMilestones.ts` | `tests/dag-progress-seed.test.ts`, `tests/dag-completion-dependencies.test.ts`, `tests/graph-completion-dependencies.test.ts` |
| Prerequisite lookup and lifecycle | `src/core/scheduling/PrerequisiteResolution.ts`, `src/core/TraversalKernel.ts` | `tests/dag-prerequisite-resolution.test.ts`, `tests/async-dag-prerequisite-lifecycle.test.ts`, `tests/prerequisite-kernel.test.ts` |
| Graph identity and structure | `src/core/graph/`, `src/core/ResolvedGraph.ts` | `tests/graph-identity.test.ts`, `tests/graph-container.test.ts`, `tests/resolved-graph.test.ts` |
| Async callback/iterator behavior | `src/core/drivers/`, `src/core/TraversalKernel.ts` | `tests/async-driver.test.ts`, `tests/async-runner-session.test.ts`, `tests/async-dag-lifecycle.test.ts` |
| Tree traversal and objects | `src/traversals/`, `src/traversable-tree-implementations/`, `src/tools/` | `tests/depth-first.test.ts`, `tests/breadth-first.test.ts`, `tests/object.test.ts` |
| CJS/ESM packaging | `package.json`, `scripts/build-esm.cjs`, `scripts/verify-package.cjs` | `scripts/build-esm.test.cjs`, packed consumers |

## Commands and validation

```sh
npm ci
npm run check
npm test -- tests/dag-prerequisite-resolution.test.ts
npm run tsfile -- examples/agent-orchestration-example.ts
npm run verify-examples
npm run verify-package
```

`npm run check` covers typechecking, lint, all source tests with 100% coverage, examples, build, packed runtime/type consumers, and benchmark/generator checks. For behavior changes, reproduce the issue with a focused public regression, then run the full check. For documentation changes, execute new/changed examples, verify relative links/anchors and packaged guides, and use the standard check before integration. Do not weaken coverage to pass.

The async runtime shares a state-machine core with sync runners; test affected sync/async and tree/graph families when changing shared behavior. Preserve arbitrary ID identity and exact error values. ESM and CJS must share constructors, sentinels, namespaces, and declaration identity; verify packed consumers, not just source imports.

## Documentation upkeep

Keep README concise and autonomous-agent use cases first. Put integration decisions in `docs/agent-workflows.md`, detailed contracts in `docs/reference.md`, and navigation in `docs/index.md`. Keep runnable examples under `examples/`; the example verifier discovers every top-level `.ts` file. Update package `files` entries when adding a consumer guide so npm readers can follow relative links. Link repository-only examples/history through GitHub from packaged docs. Preserve existing public section anchors when moving content.

Do not infer publication authorization from test/build commands. Release and external-write actions follow the user's current instructions. Preserve unrelated local changes and never include credentials in examples or logs.
