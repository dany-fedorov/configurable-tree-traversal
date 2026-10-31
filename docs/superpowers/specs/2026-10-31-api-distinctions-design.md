# Client API distinctions: implementation design

The user approved fixing all twenty findings in the [combined review](../reviews/2026-10-31-public-api-idiomatic-review.md), including breaking changes, and requested Claude Fable high review. The selected R01–R20 findings define scope. Existing scheduling, ownership, caller identity and package boundaries remain constraints.

## Canonical contracts

| Finding | Implementation |
| --- | --- |
| R01, R15 | Vertex/source/command hint inputs accept readonly arrays. Vertex owns a copied mutable collection; clone copies every hint collection while retaining shallow data and hint-element identity. Observed hints remain frozen/detached. |
| R02 | Walking constructors accept limits; configure patches accept replaceLimits. Old patch limits rejects. Replacement and atomic validation retain existing semantics. |
| R03 | transformChildHints / ChildHintTransformer / AsyncChildHintTransformer, getChildHints; no sorting-only promise or legacy aliases. |
| R04 | Remove legacy source-result normalization claims; classify isComposite/getKeyPath as observations. |
| R05 | dependsOnWorkDefault replaces omittedWorkDependencies throughout all source/prepare options and never guards. |
| R06 | PreparedDag.liveVertexSummaries and PreparedDagVertexSummary name the lossy live-child projection; definition remains faithful. |
| R07 | Replace isTraversalLeaf with isChildExpansionSkipped, reporting only explicit skipped expansion. Existing hasNoChildHints and structural child queries answer other questions. |
| R08 | bindDagWorkSession / bindAsyncDagWorkSession wrap existing runners; PreparedDag.createWorkSession creates independent progress. |
| R09 | Canonical outputResultAtReturn / getOutputResult return ObjectRewriteOutputResult<Out>, a present(value)/absent union. Remove ambiguous scalar outputAtReturn/getOutput. Convert only present roots, including legitimate null/undefined values. Preserve completion gating and captured/final conversion caching. |
| R10 | cycleWitnessVertexIds names discovery witnesses; componentVertexIds names structural SCC evidence. Other generic issue lists retain vertexIds. |
| R11 | DAG source omissions and resolved/internal omission slots use identity: { vertexId } or null. Required explicit presence preserves known undefined IDs. Retired omitted.vertexId rejects. Tree omission remains graph-free. |
| R12 | Stall dependency records use vertexId / unmetPrerequisiteIds; preserve detached-copy semantics and W/C edges. |
| R13 | Export DagWorkSessionControl extending TraversalExecutionState<TreeDagExecutionInspection<DagVisitorPhase>>; sessions retain detailed synchronous inspection. |
| R14 | Public GraphWalkHydration and trailing hydration parameter on GraphWalkTarget/Data/ID and GraphWalkLink/Data/Edge/ID express source-mode-specific targets/links; broad default remains. Source mode branches continue enforcing invalid combinations. |
| R16 | Walking event/follow-context fromVertex denotes endpoint; source denotes adapter. Tagged target resolution remains distinct. |
| R17 | requireVertexId / requirePathsTo / requirePathTo name throwing queries consistently across public views and standalone stores. Nonthrowing nullable siblings retain their contracts. |
| R18 | Explanations align endpoint kinds: unresolved/deleted/live/omitted. Live progress is non-null, omitted progress is null and satisfied. Capture and constraint semantics unchanged. |
| R19 | mapDagFragmentIds returns DagFragment. Remove DagFragmentInstance alias and instantiateDagFragment. |
| R20 | Public VertexHandle is canonical. Remove public VertexRef alias; use InternalVertexRef internally. Declare public resolved graph records directly with safe facets, avoiding mutable intermediate hover types. |

## Verification and scope

Use focused public behavioral regressions before changing behavior, migrate existing behavioral/type assertions before mechanical renames, and verify sync/async/tree/DAG/walking families. Include arbitrary IDs (undefined/null/NaN/objects/symbols), omission acknowledgement, exact errors, hint identity/copies, paused rewrite output, converter calls and package CJS/ESM identity. New APIs need packed runtime/type consumers and current examples. Run npm run check with the existing 100% coverage threshold. Add migration guidance to package files, README/navigation, reference/workflows and AGENTS.md. Preserve historical audit artifacts and unrelated original-worktree drafts.

Work happens on managed branch fix/public-api-findings-20261031. No publication or merge is authorized by verification. Fable high reviews the actual final diff and all twenty requirements, followed by repairs and re-review if necessary.
