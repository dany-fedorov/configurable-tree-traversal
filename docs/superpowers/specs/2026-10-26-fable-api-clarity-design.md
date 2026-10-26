# Fable API clarity cleanup

Status: authorized for autonomous implementation and merge by the user on 2026-10-26. Basis: [review and maintainer assessment](../reviews/2026-10-26-api-clarity-fable-review.md). This bounded cleanup of several public interfaces is recorded as one design because it changes unreleased contracts across sources, preparation and coordination.

## Decisions

1. All preparation/composition/revision validation failures use `{ kind: 'invalid', issues }`. Source dependency failures become a single `{ kind: 'milestone', diagnostics }` issue. `PrepareDagResult<Data, ID>` remains an exported name but aliases `DagDefinitionResult<Data, ID>`. No `diagnostics` sibling alias. Callback exceptions and typed structural discovery exceptions continue to throw unchanged; authored structural definition issues stay structured. This unifies expected validation, not all possible errors.
2. Collection and forest selectors use `dependsOn` and `dependsOnComplete`, matching source/definition fields. Remove unreleased `dependencies` and `completionDependencies` selector names. Detect those retired keys (including present undefined and inherited fields) before callbacks in all four adapters and throw TypeError with migration guidance. Ordinary task-data fields and diagnostic `dependencies` are unaffected. No new synonyms. Milestone query tags, diff aspects and walking relation selections keep their meaningful names.
3. Tree omission is `{ kind: 'omitted' }`. Tree source types/runtime forbid `satisfiesDependencies` as graph metadata, including present undefined. This applies to tree adapters, object resolution hooks, and tree sources consumed by DAG runners. Graph source and prerequisite omissions retain required literal `satisfiesDependencies: true`: deliberately omitting an ID satisfies both W and C, and no false/blocked omission exists. Published untagged/null-source compatibility remains intact. SameValueZero identities and exact thrown values remain intact.
4. Coordinators expose only canonical `failTraversal`, removing the never-published `fail` alias without another deprecation layer. Settlement semantics are unchanged.
5. Current guides explain ON_READY callback versus event timing at point of use. Dispatch from coordinator tickets or pre-work callbacks; emitted workCompleted/subgraphCompleted events are committed observations. Preserve published phase values and timing. Explain PreparedDag.vertices as a live-child convenience projection; definition is the faithful reconstruction/revision representation. Describe summary, inspectDag and inspect as progress, dependency and execution views. Document hasSingleSink as a structural-child-leaf query, including empty=false. Explain enum phase values, slot omission identity, edge target depth and catalog-to-lazy target mapping where needed.

## Boundaries

No ID defaults that imply partial inference; typed sources already infer all walking generics. No catalog hydration semantics, no recursive limits merging, no session visitor expansion, no duplicate id/vertexId fields, no wholesale published renames. Preserve existing conveniences that serve distinct roles. Every finding has a recorded disposition in the review, updated with implementation evidence at completion.

## Acceptance

- Public sync/async regressions and negative type checks prove changed contracts, especially no dropped dependency edges and exact error forwarding.
- TypeScript 4.7.4 compatibility, Node >=22.12.0, and Bun 1.4.4 remain supported; package version stays 0.11.0 and changes remain Unreleased.
- npm run check passes with 100% statements/branches/functions/lines. Packed CJS/ESM consumers preserve constructor/declaration/sentinel identity. Check six Node22/Node24/Bun × TS4.7.4/4.9.5 lanes.
- Independent task and whole-branch review complete; required remote CI passes; merge the tested feature work into main without overwriting unrelated main-checkout files. Push the integrated main as part of the explicitly authorized merge workflow; do not publish npm.
