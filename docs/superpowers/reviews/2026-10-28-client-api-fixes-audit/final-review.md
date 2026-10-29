# Independent final review: client API fixes

Reviewed range: `b51fa3638822186197f3b6b19e2b76cd2b259f2a..7baeff97f2e437e5bae7fd008c16f625c52b5871`.

**Verdict: With fixes — one minor documentation correction.** There are **0 Critical, 0 Important, and 1 Minor findings**. No unmet behavioral or type requirement was identified. The remaining correction is the F19 migration mapping described below; this verdict does not authorize integration or publication.

## Strengths

- Observation authority is separated from internal editing consistently. Canonical handle/view projections cover callbacks, source contexts, events, live/original queries and graph wrappers. Detached frozen hints preserve opaque payload identity, synthetic parent fields have correlated nullability, and recorded event values remain separate from changing live handles.
- Execution selection is implemented at the shared delivery boundary, including queued async observations and deferred DAG settlement. Callback admission remains independently captured. Iterator ownership supports the new selected-result overloads without promising a narrowed type for an omitted or optional selector.
- Public option validation has explicit schemas, defined-field patching and validation before installation. Helpers project their options, inherited source protocols preserve receivers, and accessor values are captured instead of reread. The new object and walking policies retain meaningful domain differences without adding timing or compatibility switches.
- Object reconstruction types now reflect mixed retained/replaced values, including cache writes and assembled composites. Converter requirements, precise discovery adapters and tagged mutation requests close the reported type holes while keeping requested output patches precise.
- Preparation error conversion uses engine/session provenance, not merely an error class. Ticket types add nominal identity while existing runtime provenance remains authoritative. W/C prerequisite arrays retain overlapping identities correctly.
- Runtime regressions, strict negative type fixtures, examples and packed CJS/ESM consumers exercise these contracts through public APIs. Changes preserve the shared scheduling core, host-owned work policy and arbitrary ID/error identity.

## Issues

### Critical

None found.

### Important

None found.

### Minor

1. **Incorrect retired diagnostic literals in the new migration table.**
   - **File:** `docs/migration-client-api.md:29`.
   - **Problem:** F19 describes previous tree/DAG `sort` and walking “phase-specific visit operation labels.” At the reviewed baseline the actual literals were tree/DAG `sortChildHints` (`src/core/CoreInspection.ts`) and walking `visitor` (`src/traversals/graph-walk/GraphWalkOperation.ts`). The new literals and implementation are correct.
   - **Impact:** A consumer updating inspection switches cannot use this row as an exact old-to-new mapping, and searching for the documented old spelling misses the real use sites.
   - **Correction:** State `sortChildHints` → `sortChildrenHints` and walking `visitor` → `visit`. Preserve the note that iterator operations remain distinct. This requires a documentation correction, not a production or test change.

## Plan alignment

The binding twenty-requirement design and eight-task plan were checked against implementation, test changes and consumers, rather than treating earlier approval reports as proof. The implemented contracts align as follows:

| Requirement | Independent assessment |
| --- | --- |
| F01 | Current/assembled/cache values are unknown; specific ordinary output requires a converter accepting unknown and completion context; assertion helper, completion gating and successful-result cache remain explicit. |
| F02 | Default discovery stays PropertyKey/unknown; narrow constructor/helper routes require both adapters; root mapper preserves actual input type. |
| F03 | Runtime restricted canonical handles and vertex views cover supported observation routes; ordinary mutable store access is removed; standalone editing remains. |
| F04 | Missing/undefined patches retain fields, including nested visitors and in-order fields; candidate validation is atomic; nullable fields remain explicit. |
| F05 | Unsupported own string/symbol keys reject at public options and nested/path boundaries; source protocols and declarations retain their distinct rules. |
| F06 | Walking hydration is a discriminated source contract; inline/cached targets, cache-first admission, omissions and first-use errors are consistent in sync/async execution. |
| F07 | Own engine discovery cycles produce invalid issues with ordered closed witnesses; source-thrown values and unrelated same-class errors preserve exact identity. |
| F08 | afterWorkReadyChain is the default and old spelling rejects; empty/filtered chains still complete W; external settlement remains independent. |
| F09 | All families select at delivery; pending and settlement observations follow current selection; no replay; explicit selected iterator types agree with runtime ownership. |
| F10 | Compact default and numeric-preservation policy retain their specified index, hole and length behavior; custom assemblers own reconstruction. |
| F11 | Collision policy normalizes property keys, preserves symbol identity and defaults to error; first/last wins and custom assembly are explicit. |
| F12 | Ticket declaration is nominal and type-only, with runtime issuer/generation validation retained. |
| F13 | Tagged indices/ranges are distinct, detached and validated; negatives, inclusive clipping and fallback semantics are preserved. |
| F14 | Required readonly W/C arrays report each milestone independently, including overlaps and empty results. |
| F15 | Generic replacement and object patch requests are tagged, with keep/delete and malformed/conflicting request handling preserved. |
| F16 | Child-only hook and result names are migrated; root mapping remains separate; retired option rejects. |
| F17 | Graph view type/getter/context vocabulary is migrated across current consumers. |
| F18 | Named readonly walking catalog contracts are exported; eager async materialization still yields reusable synchronous sources. |
| F19 | Production diagnostic literals are aligned; one inaccurate old-usage table cell remains as the Minor finding. |
| F20 | Independent traversal-start predicates are removed; family/container roots and walking entry occurrences retain their meanings. |

The archived rulings are consistent with the design and implementation: delivery-time selection, preserved array length, strict path options versus declaration records, ordered engine cycle witnesses, undefined resolver absence, removal of ordinary store access, correlated synthetic-parent nulls, and the supported observation-capability boundary. No unjustified scope departure or compatibility alias was identified. Intentional reflection into TypeScript-private implementation fields is outside the stated supported-facet contract; the public wrappers themselves were reviewed for editing authority.

## Review scope and evidence

Reviewed meaningful changes in separate passes: production types/normalizers/builders; kernel, drivers and sessions; object discovery/reconstruction; DAG preparation/progress/coordination; walking admission/materialization; restricted views and public exports; focused runtime/type regressions; remaining test migrations; packed consumers/scripts/examples; current guides, spec/plan and completion claims. Surrounding code was inspected for the named cross-task risks, including public source contexts, original views, event capture, source receiver/accessor behavior, iterator lease changes and error provenance. Mechanical audit census/log bytes were assessed through metadata and relevant summaries rather than line-by-line generated output. No subagents were dispatched.

Accepted recorded verification after independently matching **all 529 SHA-256 tested-input entries** to this checkout (zero mismatches):

- `final-check.json` records `npm run check` exit 0 on 2026-10-29 with Node 24.20.0 and TypeScript 4.9.5. Its log confirms 134 suites, 3100 tests, 100% statements/branches/functions/lines, 22 examples, 26 standalone guide snippets, and packed CJS/ESM/type consumers. The standard gate also includes lint, build, benchmark and packaging checks.
- `final-floor.json` records packed verification exit 0 using **TypeScript 4.7.4**, with corresponding successful consumer/navigation output. The compiler floor was exercised, not inferred from a declaration search.
- The recorded command HEAD is `3c103a4`; the input hashes cover the then-working inputs subsequently committed in the reviewed range. Hash matching is the evidence that these checks apply to the reviewed source/docs/tests/scripts, rather than assuming HEAD equality.

Per the review instruction, no whole suite was rerun. No focused execution probe was necessary after source/context and regression inspection resolved the investigated doubts. Node 22 and Bun were not independently retested and are not claimed. Original-checkout/protected-artifact preservation is recorded in the audit and remains part of controller closeout; this review did not rewrite those artifacts. Only this review report was written.

## Recommendation and assessment

Correct the single F19 migration row, then perform a scoped documentation rereview. No implementation rework or broad test rerun is indicated by this finding.

**Ready to merge? With fixes.** The implementation satisfies the twenty behavioral/type contracts with coherent cross-family integration and strong recorded verification. The only identified remaining gap is the inaccurate retired-literal migration description; after that correction, this review has no remaining blocker.
