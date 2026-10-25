# DAG definition values and fragments implementation plan

> **For agentic workers:** Use test-driven development and verification-before-completion. This draft prepares phase 2B; keep runtime changes out of the preparation-only commit.

**Goal:** Implement roadmap item 4 with faithful definition values, typed fragment ports, and validated composition.

**Architecture:** Extract phase one's capture/replay facts into an owned immutable definition. Remap fragment instances and compose their definitions, then validate through existing structural and W/C algorithms.

**Tech Stack:** TypeScript, existing prepared DAGs, GraphStore and SCC helpers, Jest, packed consumers.

**Spec:** [Phase two design, section 2B](../specs/2026-10-25-agent-api-phase-two-design.md#2b-definition-values-and-graph-fragments)

## Global constraints

- Preserve Node 22.12.0+, Bun 1.4.4, and TypeScript 4.7.4 compatibility.
- Preserve 100% statements, branches, functions, and lines; do not weaken coverage.
- Preserve arbitrary SameValueZero IDs and exact caller error values.
- ESM and CJS share implementation and declaration identity.
- No new runtime dependency, durable storage, task executor, or automatic completion-fact migration.
- All phase-one APIs remain available; published version remains 0.11.0 until a separately authorized release.
- Copy owned topology and result wrappers; retain shallow caller data and ID identity without freezing caller objects.

## Task 1 Extract faithful definition values

**Files:** create `src/traversals/dag-traversal/lib/DagDefinition.ts`, `src/traversals/dag-traversal/defineDag.ts`, and `src/traversals/dag-traversal/lib/definitionSource.ts`; modify `src/traversals/dag-traversal/lib/PreparedDag.ts` and `makePreparedDag.ts`; create `tests/dag-definition.test.ts` and `.typecheck.ts`.

**Interfaces:** `DagDefinitionSlot`, `DagDefinitionVertex`, and `DagDefinition` are specified in section 2B. `defineDag(input)` copies owned fields and rejects malformed declarations. Add `PreparedDag.definition`; existing `.vertices` and runner/session factories retain their behavior.

- [ ] Start with the omission-order fixture in `tests/prepared-dag.test.ts`. Assert that the definition preserves the omitted slot before its dependent sibling and that a definition round-trip reproduces both work and completion event order.

```ts
expect(prepared.definition.vertices[0]!.slots).toEqual([
  { kind: 'omitted', identity: { vertexId: 'skip' } },
  { kind: 'vertex', vertexId: 'b' },
  { kind: 'vertex', vertexId: 'c' },
]);
```

- [ ] Observe failure, then extract the facts currently closed over by `makePreparedDag`: entry mode/slots, live records, omitted identities, and effective dependencies. Reuse one replay source implementation for old and new preparation paths.
- [ ] Cover real roots, empty/omitted roots, synthetic catalogs, anonymous omissions, non-enumerable own IDs, undefined/object IDs, shared children, detached prerequisites, no source replay, and shallow data ownership.
- [ ] Run new tests plus `tests/prepared-dag.test.ts` and `tests/prepared-source-contracts.test.ts`; run typecheck and confirm all existing phase-one tests remain applicable.

## Task 2 Validate materialized definitions

**Files:** create `src/traversals/dag-traversal/prepareDagDefinition.ts` and `src/core/graph/validateDefinition.ts`; use `src/core/scheduling/stronglyConnectedComponents.ts`; extend definition tests.

**Interfaces:** `prepareDagDefinition(definition): DagDefinitionResult<Data, ID>`. Issue variants name missing structural endpoints, invalid entry/omission references, unreachable records, structural SCCs, and existing milestone diagnostics. Malformed API inputs still throw.

- [ ] Test a disconnected record absent from the declared entry/dependency closure and a structural cycle, before implementation:

```ts
const unreachableDefinition = defineDag({
  entry: { kind: 'root', vertexId: 'root' }, omittedIds: [],
  vertices: ['root', 'orphan'].map(vertexId => ({
    vertexId, data: vertexId, slots: [], dependsOn: [], dependsOnComplete: [],
  })),
});
const structuralCycle = defineDag({
  entry: { kind: 'root', vertexId: 'a' }, omittedIds: [],
  vertices: ['a', 'b'].map(vertexId => ({
    vertexId, data: vertexId,
    slots: [{ kind: 'vertex' as const, vertexId: vertexId === 'a' ? 'b' : 'a' }],
    dependsOn: [], dependsOnComplete: [],
  })),
});
expect(prepareDagDefinition(unreachableDefinition)).toMatchObject({
  kind: 'invalid', issues: [{ kind: 'unreachable', vertexIds: ['orphan'] }],
});
expect(prepareDagDefinition(structuralCycle)).toMatchObject({ kind: 'invalid' });
```

- [ ] Implement iterative membership checks and structural SCC checks before invoking existing preparation for milestone validation. Distinguish an omitted identity from a missing one. Do not add a second W/C scheduler or catch arbitrary exceptions by their messages.
- [ ] Verify that detached prerequisites reachable through W or C are accepted, that each invalid result has no executable DAG, and that accepted definitions preserve runner event behavior.
- [ ] Run focused tests and typecheck. Publish issue names and semantics in the reference only when this code is implemented.

## Task 3 Instantiate and compose fragments

**Files:** create `src/traversals/dag-traversal/dagFragments.ts` and `src/traversals/dag-traversal/lib/DagFragment.ts`; add `tests/dag-fragments.test.ts` and `.typecheck.ts`; update the DAG barrel, current guides and package fixtures; add `examples/dag-fragments-example.ts` and `scripts/package-consumers/dag-fragments.mjs` / `.ts`.

**Interfaces:** `defineDagFragment(definition, ports)`, `instantiateDagFragment(fragment, { mapId })`, and `composeDag(instances, { dependencies?, children? })`. Composition returns `DagDefinitionResult`. Wire endpoints are IDs; dependencies name W/C explicitly. Instances expose precise mapped port keys.

- [ ] Write a public test instantiating the same fragment twice with different object-ID maps and composing a completion prerequisite:

```ts
const first = instantiateDagFragment(fragment, { mapId: id => firstIds.get(id)! });
const second = instantiateDagFragment(fragment, { mapId: id => secondIds.get(id)! });
const result = composeDag([first, second], {
  dependencies: [{ dependent: second.ports.start,
    prerequisite: { vertexId: first.ports.finish, milestone: 'completion' } }],
});
expect(result.kind).toBe('valid');
```

- [ ] Verify failure before implementation. Cache one mapping result per local identity; remap all references and omissions. Reject missing ports, mapped collisions, cross-instance collisions, invalid wires, structural cycles, and combined W/C cycles.
- [ ] Test explicit structural connections independently of dependencies, deterministic entry/slot order, mapping-error identity, heterogeneous data/ID unions, and exact port-key inference. Source materialization and execution remain separate.
- [ ] Add an executable example and packed import/type assertions. Run `npm run check`, review the complete change, fix findings, and commit before beginning revisions.

## Prepared handoff

Do not rebuild definitions from `.vertices` alone. Task 1's source fidelity is the prerequisite for both fragments and the revision plan. The inspection plan may be delivered independently, but all three changes share the existing milestone vocabulary.
