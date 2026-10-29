# Spec Compliance

- ❌ F03 preservation issue: the newly cached `VertexView` stops reflecting supported mutable hint edits through a standalone store's live read-only view (`src/core/observationFacets.ts:26`, `src/core/Vertex.ts:48`, `src/core/ResolvedTree.ts:134`). See Important finding 1.
- ✅ The reviewed ordinary tree/DAG observation routes expose frozen canonical handles/views, privately unwrap identity, remove the ordinary store getter, and preserve shallow payload/ID identity (`src/core/observationFacets.ts:46`, `src/core/ResolvedTree.ts:109`, `src/core/drivers/callbackBindings.ts:86`). F17 graph vocabulary and F20 traversal-root removals are applied to public contracts, adapters, documentation, and packed consumers (`src/core/index.ts:38`, `src/core/TraversalRunner.ts:5`, `scripts/package-consumers/observation-facets.ts:76`). No old graph/root runtime route remains in the source search.
- ✅ Synthetic graph parent contexts use the correlated both-null/both-non-null union; tree contexts stay non-null (`src/core/TraversableGraph.ts:19`, `src/core/drivers/callbackBindings.ts:121`). Visible graph records filter holder incoming edges before wrapping them (`src/traversals/dag-traversal/lib/DagGraphView.ts:27`). Original snapshots omit the holder and its incoming entry links (`src/core/graph/ResolvedGraphsContainer.ts:103`, `src/core/graph/ResolvedGraphsContainer.ts:178`).
- ✅ F09 delivery timing remains outside Task 6. Pre-existing TypeScript-private runner fields remain unsupported internals under the controller's scope clarification; their mere reflective accessibility is not a finding.

# Strengths

- `src/core/observationFacets.ts:16`: WeakMaps centralize canonical identity and keep backing refs out of the new facade objects. Forged UUID-shaped handles are not resolved by claimed IDs. Nested incoming edges, linked slots, and paths are projected, not only top-level getters (`:99`, `:143`, `:152`).
- `src/traversals/depth-first-traversal/lib/DepthFirstTraversalRunner.ts:232` and `src/traversals/dag-traversal/lib/DagTraversalRunner.ts:422`: event projection wraps the recorded vertex separately from the live handle. Runtime regressions retain events across later commands (`tests/observation-facets.test.ts:284`, `:314`).
- `src/core/TraversalKernel.ts:1511`: async BFS now accepts the actual admitted frame context. Cached context projection preserves source/accepted-context identity without object-specific engine hooks (`src/core/observationFacets.ts:75`, `src/traversable-tree-implementations/traversable-object-tree/TraversableObjectTree.ts:281`).
- `tests/observation-facets.test.ts:95`: six-family tests exercise real callbacks, sources, rewrites, original views, graph records, arbitrary IDs, and forged handles. Existing deletion, identity, source-cycle, query-option, preparation, and command tests retain their behavioral assertions during migration. Deliberate raw-store test access is confined to test fixtures rather than a new production API (`tests/internal-runner-fixtures.ts:517`).
- `tests/observation-facets.typecheck.ts:29` and `scripts/package-consumers/observation-facets.ts:29`: negative type consumers cover mutable hints, previous-phase refs, original input typing, hidden-parent narrowing, nested records, and removed names. Packed runtime checks use both CJS and ESM (`scripts/package-consumers/observation-facets.mjs:5`).

# Issues

## Critical

- None found.

## Important

1. **Standalone live views retain stale hints after supported mutable edits.** `src/core/observationFacets.ts:26` copies hints once and caches the facade by backing Vertex identity; `:31` and `:32` permanently read that copy. A standalone `Vertex.getChildrenHints()` still returns an editable array (`src/core/Vertex.ts:48`), and `ResolvedTreeStore.asReadOnly()` explicitly promises a live facade (`src/core/ResolvedTree.ts:133`; `docs/reference.md:1235`). After observing an empty Vertex, `vertex.getChildrenHints().push('new-child')` leaves even a fresh `store.asReadOnly().getRoot().getValue().getChildrenHints()` empty and `hasNoChildHints()` true. Meanwhile `clone()` reads the changed backing array and includes the child (`src/core/observationFacets.ts:34`). This is observable through supported public standalone APIs, without casts, private imports, or assigning readonly fields. Refresh the current hint projection when the mutable backing collection changes, preserving frozen detached returned arrays, canonical handles, and ordinary event history. Add a public standalone regression that retains an old hint snapshot, edits the owned Vertex, and verifies a fresh live query plus clone agree.

## Minor

1. **The blanket frozen-collection promise does not cover dependency arrays.** `src/core/observationFacets.ts:140` spreads `dependsOnWork` / `dependsOnSubgraphCompletion` from the detached graph record, while freezing only `incoming` and `slots`. `dependsOnWork.push(...)` therefore succeeds in JavaScript despite `docs/reference.md:1235` promising frozen detached collections. The underlying `GraphStore` copies these declarations, so this does not mutate traversal state (`src/core/graph/GraphStore.ts:327`). Freeze the copied dependency arrays too, or narrow the documentation. The probe confirms the live declaration remains unchanged.

# Checks and evidence

- Reviewed `review-fdb957a..20acd87.diff` for base `fdb957a72fb968442e26a97b907ef6f19d61d3e9` → head `20acd87e4075b05af3fd6ac45cfe9eb3cf6a6080`, in bounded production and migration passes. Rename-only documentation/test portions were reviewed as changed lines; production hunks and new observation regressions were read with context.
- Named focused checks outside complete hunks: original-tree input-domain remapping in the cut `DepthFirstTraversalResolvedTreesContainer.set` body; synthetic-holder filtering in the cut `DagGraphView` body and snapshot insertion/edge acceptance; public factory return behavior for the unsupported-private-fields question; the retained standalone mutable Vertex hint API for the stale-cache finding. Also searched source call sites for retired graph/root/store names. No broader source crawl.
- Existing final gate evidence inspected, not rerun: `task-6-check-third.log:3461` records 100% source coverage; `:3629` records 132 suites / 3077 tests; `:3638` records 21 examples; `:3652`–`:3664` record packed runtime/type/guide checks, including TypeScript 4.9.5; the log ends with 25 benchmark/generator and 7 packaging tests passing. No final-gate warning/failure found. TypeScript 4.7 floor verification remains Task 8 as already assigned.
- One focused public scratch probe, with the final supported-only reproduction retained as `task-6-review-probe.cjs` and output as `task-6-review-probe.log`. Executed against the existing build with `node /tmp/ctt-task6-review-20acd87-probe.cjs`; no suite, build, packaging command, git command, or production/index/HEAD mutation was performed.

```text
standalone-live-hints {"mutableHints":["new-child"],"freshQueryHints":[],"reportsLeaf":true,"cloneHints":["new-child"],"oldHintsFrozen":true}
dependency-array {"recordFrozen":true,"workArrayFrozen":false,"detachedEdit":["root","detached-edit"],"liveDependencies":["root"]}
```

# Assessment

**Task quality: Needs fixes.** The observation boundary and cross-family migration are cohesive and well tested. Fix the narrowly reproduced standalone live-hint regression before approving; the unfrozen detached dependency arrays are nonblocking polish.
