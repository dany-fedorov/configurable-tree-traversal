# Fable clarity follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement accepted Fable re-review improvements and merge the complete feature branch.
**Architecture:** Extend diagnostics and observation APIs without changing traversal timing; normalize configuration patches at the builder boundary. Preserve constructor-style fragment construction and published direct object returns.
**Tech Stack:** TypeScript, Jest, Node, Bun, packed CJS/ESM consumers.
**Spec:** `docs/superpowers/specs/2026-10-26-fable-clarity-follow-up-design.md`

## Global Constraints

- Node >=22.12.0, Bun 1.4.4, TypeScript 4.7.4 and 4.9.5 remain supported; package version 0.11.0 stays unchanged; no npm publication.
- Preserve arbitrary ID identity and exact caller-thrown values. ESM/CJS exports share constructor and declaration identity.
- Full npm run check with 100% coverage; six packed runtime/compiler lanes and independent implementation/final reviews. Final-head remote CI must pass before merge of PR19 to main; verify actual remote integration.
- Preserve the original dirty main checkout and its 18-file draft manifest. Integrate remotely; do not overwrite or stash user drafts. Retain externally managed worktrees.

### Task 1: Diagnostic errors and discoverable DAG inspection

**Files:** Create `src/traversals/dag-traversal/lib/DagFragmentValidationError.ts`; modify `src/traversals/dag-traversal/dagFragments.ts`, DAG `index.ts`, `src/core/errors/DagTraversalStallError.ts`, both DAG runner files, `tests/dag-fragments.test.ts`, `tests/dag-fragments.typecheck.ts`, `tests/dag-inspection.test.ts`, `tests/dag-inspection.typecheck.ts`, `scripts/verify-package.cjs`; add type assertions in the existing public/graph typechecks as needed.

**Interfaces:** Consumes DagDefinitionIssue<ID>, prepareDagDefinition and existing inspectDag(runner). Produces DagFragmentValidationError<ID>, DagTraversalStallError<ID>, and runner.inspectDag(): DagInspection<ID> (sync method on both runner families).

- [ ] Add failing public regression for a closed invalid fragment: inspect a caught DagFragmentValidationError, assert TypeError inheritance and structured milestone/structural issues with object/undefined IDs retaining identity. Exercise forged invalid fragments through instantiateDagFragment, preserving existing port/mapping errors. Add negative/positive compiler assertions for generic error diagnostics. Add observer parity tests against inspectDag(runner) before/during/after execution without source/visitor calls.
- [ ] Run focused Jest and `npm run typecheck`, record expected red failures from absent exports/methods/type parameter.
- [ ] Implement the dedicated error class and throw it only for result.kind === 'invalid':

```ts
export class DagFragmentValidationError<ID = unknown> extends TypeError {
  readonly issues: readonly DagDefinitionIssue<ID>[];
  constructor(issues: readonly DagDefinitionIssue<ID>[]) {
    super('DAG fragments require a closed valid definition');
    this.name = 'DagFragmentValidationError';
    this.issues = issues.slice();
  }
}
```

- [ ] Parameterize stall diagnostics with ID using existing copy logic; default unknown. Add runner methods delegating to the existing inspection function with an alias import if needed. Check module initialization does not create a runtime cycle (inspectDag imports runner types only).
- [ ] Extend packed runtime/type consumers to cover error root/DAG subpath and CJS/ESM constructor/declaration identity, generic stall annotations, and runner inspection methods. Run focused tests, typecheck, lint, `npm run verify-package`. Self-review and commit. Task 3 owns final whole-package coverage/matrix.

### Task 2: Predictable configuration patches

**Files:** Modify `src/traversals/graph-walk/GraphWalkOptions.ts`, `src/traversals/graph-walk/lib/normalizeWalkOptions.ts`, `src/traversals/dag-traversal/DagTraversal.ts`, `AsyncDagTraversal.ts`, both DAG instance-config modules; create a small shared source-patch helper in DAG lib if it avoids duplicated capture logic. Tests: `tests/graph-walk-options.test.ts`, `tests/graph-walk-types.typecheck.ts`, walking sync/async behavior tests, DAG configure/graph-source runtime and type tests discovered from AGENTS map.

**Interfaces:** Consumes existing builder configure methods. Produces nullable optional walking predicate inputs; normalized predicates remain function | undefined. DAG source patches consume only own defined source values, preserving existing source on ignored keys.

- [ ] Add failing sync/async public tests: initial null predicates, reset each false predicate to null then make a fresh runner and observe previously filtered nodes/edges; undefined retains filtering; invalid combined patch leaves prior configuration usable. Add nullable-input type assertions and invalid nonfunction negatives.
- [ ] Add failing sync/async tree/graph source tests: own undefined active/opposite keys retain active source; inherited active/opposite source keys are ignored; own defined same-family source replaces; own defined opposite-family rejects atomically. Getter-backed source should be captured once, and no source callbacks run on configuration.
- [ ] Run focused tests and typecheck to record red evidence.
- [ ] Add null to public predicate fields in initial/configure options. Normalize with the explicit shape:

```ts
const followEdge = snapshot['followEdge'] === undefined
  ? previous?.followEdge
  : snapshot['followEdge'] === null ? undefined : snapshot['followEdge'];
```

Apply identically to expandVertex and preserve validation before assignment.
- [ ] Capture DAG patch own source values once; strip undefined source keys before merging; determine/reject opposite mode from that captured patch. Preserve own nonenumerable source semantics if the constructor already accepts them. Keep malformed/null sources subject to existing validation; do not broaden other option patch behavior. Implement through one small shared helper if needed, using own-property checks rather than `in`.
- [ ] Run focused tests, typecheck, lint and packed verification; self-review and commit. Task 3 owns full integration validation.

### Task 3: Current documentation and final validation

**Files:** `README.md` only if entry-point guidance needs adjustment; `docs/reference.md`, `docs/agent-workflows.md`, `docs/migration-uniform-api.md`, `CHANGELOG.md`, relevant public JSDoc; `examples/dag-inspection-example.ts` or existing fragment example where needed; review assessment/disposition; create `docs/superpowers/plans/2026-10-26-fable-clarity-follow-up-verification.md`.

**Interfaces:** Consumes Task 1 errors/methods and Task 2 reset/presence semantics. Produces current consumer contracts, evidence and all-finding dispositions.

- [ ] Document typed fragment errors with issues while retaining port/mapping TypeErrors and exact callback errors. Explain generic stall errors do not type arbitrary catches. Show `runner.inspectDag()` without removing free-function use.
- [ ] Add a compact configuration table: walking undefined/omitted retains predicates, null clears, limits replace, visitor/phase fields patch; DAG source own undefined/inherited keys retain source. Describe atomic rejection and builder changes affecting future runners only.
- [ ] State Traversal/TraversalRunner are tree-only bases; generic wrappers use execution capabilities. Explain object adapter untagged direct returns are retained compatibility while new custom sources/hooks use tagged results. Preserve root/slot distinctions and buffered tree/DAG emission semantics.
- [ ] Add preparation and frontier decision guidance (prepareDag reusable topology; runner.prepare one runner; eager run executes after discovery; dispatch tickets/frontier instead of observational readyIds). Update the 13-item assessment with actual implemented/deferred evidence. Run changed examples and check relative links/anchors and packaged guides.
- [ ] Run `npm run check` to a durable log, fix relevant coverage gaps without weakening coverage. Run packed six lanes: Node24/Node22.12/Bun1.4.4 x TS4.9.5/4.7.4; the default lane is covered by full check. Use `CTT_TYPESCRIPT_COMPILER` for 4.7.4. Run Bun script correctness. Record exact commands/results/heads and review status truthfully. Self-review and commit; controller owns independent review, push, final-head CI and merge.

## Controller integration

After per-task and final review, push the final head to PR19, update its reviewable description, wait for all required CI on that head, merge with --match-head-commit, fetch origin/main and prove tested head ancestry/tree equivalence. Verify the original draft manifest. Archive and remove only this plan's SDD scratch after merge, retaining externally managed worktrees. Mark the goal complete only after this audit.
