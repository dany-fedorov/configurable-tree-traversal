# Client API distinctions migration

[Documentation index](index.md) · [API reference](reference.md) · [Agent workflows](agent-workflows.md)

This is the upgrade entry point from 0.11.0 to 0.12.0. Apply the final contracts below directly; earlier guides retain detailed tables and examples, not intermediate steps you must apply in order. This guide includes the twenty API distinctions from the 2026-10-31 review. Old spellings and ambiguous scalar rewrite outputs are removed. Keep host task meaning, retries, claims and durable acceptance outside CTT.

## Final upgrade checklist

| Area                          | Final contract                                                                                                                      | Detailed checklist or example                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Imports and construction      | Supported root/family entry points; create runners through builders; no deep engine imports                                         | [Supported imports](migration-api-clarity.md#supported-imports-and-removed-extension-points)            |
| Source data and identity      | `$data`/`$childHints`, tagged results, required typed live IDs, explicit graph omission identity; plain tree omissions              | [Source resolution](migration-uniform-api.md#source-resolution)                                         |
| Discovery and dependencies    | `MaterializedDagInput` envelope; `dependsOnWork`/`dependsOnSubgraphCompletion`; graph root honor and no implicit W by default       | [Current dependency contracts](reference.md#discovery-and-completed-work)                               |
| Coordination and observations | Prepared independent sessions or bound runners; tickets dispatch, committed events observe; host-accepted facts reconstruct         | [Ticket contract](reference.md#ticket-coordination)                                                     |
| Visitors and commands         | Family phases, `commandName`/`commandArguments`, `commandCommitMode`, exclusive deferral and family deletion                        | [Current commands](reference.md#visitors-and-commands)                                                  |
| Options and queries           | Strict own keys, source-preserving patches, `replaceLimits`, `VertexHandle`, `require…` queries                                     | [Options](reference.md#options-and-defaults) and [views](reference.md#views-handles-identity-and-paths) |
| Object rewriting              | Unknown current/output values, typed patches, conversion or explicit assertion; present/absent tagged root output                   | [Corrected object contracts](migration-idiomatic-api.md#corrected-object-contracts)                     |
| Walking                       | Explicit hydration and target wrappers, independent callback/emission/revisit controls, completeness outcomes and terminal disposal | [Walking contracts](reference.md#general-graph-walking)                                                 |

For removed names not shown in the distinctions table, use the [broader canonical removal inventory](migration-idiomatic-api.md#removed-compatibility-inventory) and [naming tables](migration-api-clarity.md#builders-factories-and-options). The [client corrections](migration-client-api.md#old-and-new-contracts) cover type, patch and delivery semantics. The current reference owns the final behavior whenever historical migration context differs.

## Final naming distinctions

| Previous surface                                            | Canonical surface                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| sortChildrenHints / ChildHintSorter / AsyncChildHintSorter  | transformChildHints / ChildHintTransformer / AsyncChildHintTransformer   |
| inspection hasSorter / hint frame stage sort                | hasHintTransformer / transformHints                                      |
| getChildrenHints()                                          | getChildHints()                                                          |
| omittedWorkDependencies                                     | dependsOnWorkDefault                                                     |
| configure({ limits })                                       | configure({ replaceLimits }) — constructors still accept limits          |
| PreparedDag.vertices / PreparedDagVertex                    | liveVertexSummaries / PreparedDagVertexSummary                           |
| isTraversalLeaf                                             | isChildExpansionSkipped — choose the query matching the intended meaning |
| createDagWorkSession / createAsyncDagWorkSession            | bindDagWorkSession / bindAsyncDagWorkSession                             |
| outputAtReturn / getOutput()                                | outputResultAtReturn / getOutputResult() — tagged presence               |
| discoveryCycle.vertexIds / DagDiscoveryCycleError.vertexIds | cycleWitnessVertexIds                                                    |
| structuralCycle.vertexIds                                   | componentVertexIds                                                       |
| omitted result/slot vertexId presence                       | identity: { vertexId } or null                                           |
| diagnostics.dependencies[].id / unmet                       | vertexId / unmetPrerequisiteIds                                          |
| session inspect() generic details                           | DagWorkSessionControl with concrete DAG inspection                       |
| broad GraphWalkTarget / GraphWalkLink helpers               | optional trailing hydration type parameter                               |
| edge-event/follow-context source                            | fromVertex — adapter source stays source                                 |
| getVertexId / getPathsTo / getPathTo                        | requireVertexId / requirePathsTo / requirePathTo                         |
| explanation unknown / known                                 | unresolved / live or omitted                                             |
| instantiateDagFragment / DagFragmentInstance                | mapDagFragmentIds returning DagFragment                                  |
| public VertexRef                                            | VertexHandle; mutable internal references have an explicit internal name |

## Hint ownership

Source content, standalone construction/clone patches and hint replacement commands accept readonly arrays. Vertex copies the membership array, including when cloned from another Vertex; editing the copy cannot change the original collection. Data and hint element objects retain shallow identity. Observed vertex collections remain frozen/detached. transformChildHints may invent, remove, duplicate or reorder hints; callers seeking sorting only should return a permutation themselves.

## Limits and sessions

replaceLimits replaces the entire previous limits record, rather than merging bounds. Include every bound you wish to retain; omitted/undefined replaceLimits retains the previous record. Validation is atomic, including route-mode bounds. Old limits patch keys reject even with own undefined. A constructor still takes limits.

Binding two sessions to one runner shares progress but does not share ticket authority. A ticket belongs to its issuing wrapper. Use preparedDag.createWorkSession() for independent progress; its topology is shared, not its work state. Keep settlement generations and tickets local.

## Presence and identity

outputResultAtReturn and getOutputResult() return `{ kind: 'present', value }` or `{ kind: 'absent' }`. Switch on kind before reading value. A present null or undefined remains present. Converters run only for present roots, receive the existing complete flag, and never interpret deletion. The captured result stays fixed; the final getter requires FINISHED and caches its first successful result. Existing failed conversion values propagate exactly and can be retried.

DAG omissions require explicit identity: null for anonymous, or `{ vertexId }` for known identity, including undefined/null/object/symbol IDs. During hint/prerequisite resolution, the requested identity can still supply an otherwise anonymous omission. Preserve satisfiesDependencies: true independently. Copy identity wrappers when converting records; never infer identity presence through truthiness. Structural result getters are supported; a known identity wrapper must contain an own vertexId. Raw top-level omitted.vertexId is rejected, and tree source results reject graph identity metadata.

Milestone explanations now discriminate unresolved, deleted, live and omitted. Live progress is non-null; omitted progress is null and its milestone is satisfied. A deferred/ready vertex is live, not completed. Diagnostic wait edges still mean waiter waits for prerequisite. Structural component lists are SCC membership, never consecutive cycle edges; discovery witnesses remain ordered and closed.

## Query and reconstruction choices

Use has()/nullable sibling queries to check absent handles. requireVertexId, requirePathsTo and requirePathTo intentionally throw for absence; null/undefined are valid IDs and cannot serve as failure sentinels. isChildExpansionSkipped reports an explicit DFS skip, not a structural leaf. Use hasNoChildHints for hint emptiness and the resolved child view for structural children, considering incomplete discovery.

liveVertexSummaries intentionally omits omission slots and entry metadata. Persist/revise/compose from definition, which preserves ordered slots, omissions and entry. mapDagFragmentIds maps caller identities explicitly; it does not issue a nominal instance capability. GraphWalkTarget and GraphWalkLink accept an optional trailing hydration mode to preserve mode-specific helper return types without assertions.

## Source and callback vocabulary

Only prerequisite lookup accepts `{ kind: 'missing' }`. All source resolutions use canonical tags; undefined and vertexContent:null legacy result forms are rejected. isArray/isObject are configuration predicates, while isComposite and getKeyPath are bound observations. Walking fromVertex identifies an endpoint; source config identifies the adapter. Callback timing, committed W/C observations, selector independence, resource disposal and package loader identity are unchanged.

## Tagged output example

<!-- standalone -->

```ts
import { rewriteObject } from 'configurable-tree-traversal';

const retained = rewriteObject(null).getOutputResult();
if (retained.kind !== 'present' || retained.value !== null) {
  throw new Error('Expected a present null document');
}
const deleted = rewriteObject(
  { task: 1 },
  {
    rewrite: () => ({ kind: 'delete' }),
  },
).getOutputResult();
if (deleted.kind !== 'absent') throw new Error('Expected deletion');
```
