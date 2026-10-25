# DAG dependency queries implementation plan

> **Status:** Completed and independently reviewed. This plan is retained as the implementation record; current public contracts are in the API reference.

**Goal:** Implement roadmap item 7 with observational milestone navigation and readiness explanations.

**Architecture:** Capture one detached synchronous inspection snapshot from a DAG runner. Reuse the labelled milestone model for iterative traversal; capture exact scheduling state for explanations.

**Tech Stack:** TypeScript, existing traversal kernel and graph store, Jest, packed consumers.

**Spec:** [Phase two design, section 2A](../specs/2026-10-25-agent-api-phase-two-design.md#2a-dependency-queries-and-explanations)

## Global constraints

- Preserve Node 22.12.0+, Bun 1.4.4, and TypeScript 4.7.4 compatibility.
- Preserve 100% statements, branches, functions, and lines; do not weaken coverage.
- Preserve arbitrary SameValueZero IDs and exact caller error values.
- ESM and CJS share implementation and declaration identity.
- No new runtime dependency, durable storage, task executor, or automatic completion-fact migration.
- All phase-one APIs remain available; published version remains 0.11.0 until a separately authorized release.
- Copy owned topology and result wrappers; retain shallow caller data and ID identity without freezing caller objects.

## Task 1 Capture exact observational state

**Files:** modify `src/core/TraversalKernel.ts`, `src/core/graph/types.ts`, `src/core/graph/GraphStore.ts`, `src/core/scheduling/GraphScheduling.ts`, and `src/traversals/dag-traversal/lib/DagProgress.ts`; create `tests/dag-inspection.test.ts` and `tests/dag-inspection.typecheck.ts`.

**Interfaces:** engine-produced `DagVertexProgress` gains `unmetWorkPrerequisiteIds` without changing the union field. Add an internal detached identity-state projection and per-vertex expansion/commit facts consumed by the inspection factory. Neither projection exposes a mutator or calls adapters.

- [x] Add a regression with `review` declaring both W and C of a seeded `bundle`, whose child is deferred. The actual assertions must distinguish those waits:

```ts
import { DagTraversal, graphFrom } from '../src';
const records = [
  { id: 'bundle', children: ['child'], work: [], complete: [] },
  { id: 'child', children: [], work: [], complete: [] },
  { id: 'review', children: [], work: ['bundle'], complete: ['bundle'] },
];
const runner = new DagTraversal({
  ...graphFrom(records, {
    id: item => item.id,
    children: item => item.children,
    dependencies: item => item.work,
    completionDependencies: item => item.complete,
  }),
  completedWork: new Set(['bundle']),
  workCompletion: 'externalSettlement',
}).makeRunner().run();
expect(runner.summary().vertices.get('review')).toMatchObject({
  unmetWorkPrerequisiteIds: [],
  unmetCompletePrerequisiteIds: ['bundle'],
  unmetPrerequisiteIds: ['bundle'],
});
```

- [x] Run `npm test -- tests/dag-inspection.test.ts` and observe the missing field fail.
- [x] Copy the scheduler's actual `unmet` set into the new field. Define the internal snapshot fields from existing scheduler state rather than reconstructing it from emitted events. Test known omitted/deleted IDs, own undefined identity, partial discovery, and detached result ownership.
- [x] Run the new test and existing `tests/dag-progress-seed.test.ts`, `tests/async-dag-prerequisite-lifecycle.test.ts`, and `tests/graph-readiness.test.ts`, then `npm run typecheck`.

## Task 2 Expose milestone navigation

**Files:** create `src/traversals/dag-traversal/inspectDag.ts`, `src/traversals/dag-traversal/lib/DagInspection.ts`, and `src/core/graph/queryMilestones.ts`; reuse `src/core/scheduling/dependencyMilestones.ts`; extend `tests/dag-inspection.test.ts` and its typecheck fixture.

**Interfaces:** `inspectDag(runner)` returns `DagInspection<ID>`. Its `prerequisitesOf` and `dependentsOf` accept `DagDependencyMilestone<ID>` plus optional `{ transitive?: boolean }` and return detached `{ milestones, edges, discoveryComplete }`.

- [x] Add direct/reverse/transitive public examples before implementation:

```ts
const inspection = inspectDag(runner);
expect(inspection.prerequisitesOf({ vertexId: 'review', milestone: 'work' }).milestones)
  .toEqual([
    { vertexId: 'bundle', milestone: 'work' },
    { vertexId: 'bundle', milestone: 'completion' },
  ]);
expect(inspection.dependentsOf({ vertexId: 'bundle', milestone: 'completion' }).milestones)
  .toEqual([{ vertexId: 'review', milestone: 'work' }]);
```

- [x] Verify the missing API fails, then build forward/reverse adjacency using nested identity/milestone maps. Use iterative breadth-first traversal, copied edge wrappers, and the existing reason/direction conventions.
- [x] Cover W/C separation, SameValueZero identities, deterministic ordering, cycles in inspected failed runners, unknown targets, partial snapshots, and snapshot stability after settlement. Assert original adapter call counts do not change during inspection or queries.
- [x] Verify sync and async runners infer exact IDs, including sync sources passed to async constructors; reject IDs from another declared domain. Run focused tests and typecheck.

## Task 3 Explain current blockers and integrate

**Files:** extend `inspectDag.ts` and `DagInspection.ts`; modify `src/traversals/dag-traversal/index.ts`; add `examples/dag-inspection-example.ts`, `scripts/package-consumers/dag-inspection.mjs`, and `.ts`; update `scripts/verify-package.cjs`, `docs/reference.md`, `docs/agent-workflows.md`, `docs/index.md`, `docs/testing.md`, and `CHANGELOG.md`.

**Interfaces:** `explain(target)` returns the spec's known/unknown/deleted union. A known result includes milestone satisfaction, progress or null for omissions, a flat blocker graph, and discovery completeness.

- [x] Test seeded W versus incomplete C, omitted/deleted targets, open discovery, unresolved endpoints, completion transitions that have not committed, and a ready but externally deferred vertex whose W is not satisfied.

```ts
const result = inspectDag(runner).explain({ vertexId: 'bundle', milestone: 'work' });
expect(result).toMatchObject({ kind: 'known', satisfied: true, blockers: [] });
const completion = inspectDag(runner).explain({ vertexId: 'bundle', milestone: 'completion' });
expect(completion).toMatchObject({ kind: 'known', satisfied: false });
```

- [x] Implement explanations from Task 1's exact captured facts. Never invoke callbacks or classify business outcomes. Share milestone traversal with Task 2 rather than implementing another recursive graph walker.
- [x] Execute the new example, verify docs links, and cover the public imports with packed runtime/type consumers.
- [x] Run `npm run check`, obtain focused independent review, fix material findings, and commit the complete query delivery before starting composition work.

## Completion record

Implemented with public regressions, compile-time assertions, runnable examples, and packed consumers. Independent task and whole-branch reviews are complete; all material findings were fixed and re-reviewed. See the [phase-two design](../specs/2026-10-25-agent-api-phase-two-design.md) and [current API reference](../../reference.md).
