# Assessment of Fable API clarity re-review

Reviewed revision: `337d990b400aa00cdc59a7c762aca518dae46c49`. [Full Fable report](2026-10-26-api-clarity-fable-rereview.md). This is a review disposition and prioritization, not implementation approval or a claim that changes have landed.

Fable found no blocking defects and confirmed the previous cleanup. Its 13 observations contain useful follow-ups, but “objective mismatch” does not automatically mean an API defect. Existing lifecycle guarantees, public return shapes, and open capability interfaces constrain several suggestions.

| Finding | Assessment | Suggested direction |
| --- | --- | --- |
| 1. Fragment validation loses issues | Valid and the strongest follow-up. `dagFragments.ts:37–39` discards the structured issues. However, constructor-like helpers deliberately throw for invalid ports and mappings too; this is not proof that the previous bounded preparation/composition/revision cleanup was violated. | Preserve diagnostics. Design a consistent fragment error contract across definition, ports, and instantiation before choosing a result union or typed error. |
| 2. Selector-based event narrowing | The static difference exists; reject the proposed types-only fix. Tree/DAG admitted chains retain their selectors and async sessions deliver buffered events without re-filtering. Walking explicitly uses delivery-time filtering. | Document the semantic difference. Any general narrowing needs a real runtime contract change or a separately safe API, plus sync/async regression coverage. |
| 3. Object adapter returns legacy shapes | Valid internal/public teaching inconsistency, but not behavior-neutral to change. Direct callers currently access `.vertexContent`; tagged returns move that value under `.vertex` or omit it. Widening a return type can also break callers even when legacy subclass returns remain assignable. | Treat as a compatibility decision, not a cleanup asserted to preserve all callers. |
| 4. Generic stall error | A defaulted ID parameter can improve explicit annotations and constructed errors. It does not infer ID from the runner into a caught exception; TypeScript catch values and `instanceof` cannot recover that relation. | Consider an additive generic, but make no promise of automatic typed catch diagnostics. Prefer typed result issues when the caller needs guaranteed ID provenance. |
| 5. `runner.inspectDag()` | Valid discoverability difference; an additive convenience method would align runners and coordinators. | Reasonable small follow-up if consistent method-based observation is the chosen convention. Keep the existing function. |
| 6. Root flags | Names differ, but root semantics differ too: tree roots, graph bookkeeping roots, and walking entry occurrences are not automatically interchangeable. | Explain family-specific meaning; avoid introducing an ambiguous shared flag merely for spelling consistency. |
| 7. Tree-only base class names | Valid documentation improvement. Generic consumers should use execution capability interfaces. | Add a direct statement near the base types and reference guidance. |
| 8. Walking predicate reset | Valid: undefined retains the previous predicate; it cannot restore the absent predicate representation. A caller can replace it with `() => true` to remove its filtering effect. | Document patch semantics now; consider an explicit reset value in a separately reviewed configure contract. |
| 9. Closed inspection kind union | Not an automatic improvement. `ExecutionInspection` is a structural common capability; closing it would exclude custom engines and does not itself turn the interface into a discriminated union of detailed inspection shapes. | Keep the open base unless the library explicitly chooses a closed world. A separate union of built-in inspections could support exhaustive built-in handling. |
| 10. Source presence checks | Confirmed constructor/configure inconsistency: constructor uses own-and-defined checks, configure uses `in`. This affects explicit undefined and inherited properties. | Align or explicitly document the policy after checking both sync/async configure merging and compatibility. Do not change only the guard without validating effective source retention. |
| 11. Fatal settlement returns accepted | Reject renaming: accepted describes acceptance of a report, not a successful task outcome. The shared result union is orthogonal to settlement outcome. | Keep `accepted` / `alreadyAccepted`. |
| 12. Children versus slots | Justified distinction: ordered slots preserve omission positions; live children are a projection. | Keep the meaningful names. |
| 13. Validation/readiness decision table | Useful documentation improvement. | Add a concise table connecting reusable preparation, runner preparation, eager execution, and dispatchable frontier records. |

## Verification of finding 2

Source inspection: `src/core/TraversalKernel.ts:1330` selects emission using the admitted chain's `state.config`; `src/core/drivers/AsyncRunnerSession.ts:235–245` delivers retained events without applying a new selector. `docs/reference.md:86` explicitly limits delivery-time filtering to walking. The existing session regression at `tests/async-runner-session.test.ts:287` covers retained events on resume.

A focused runtime probe against the feature checkout's existing built `dist` started an async DFS PRE_ORDER visitor, requested iterator return while that visitor waited, released it, and resumed using `emitPhases: [POST_ORDER]`. Output:

```json
{"requested":"POST_ORDER","delivered":"PRE_ORDER"}
```

Therefore an overload promising only POST_ORDER events for that call would lie. The probe exited 0; it validates this counterexample, not the entire package. Fable itself ran no tests, and no full check was rerun for this read-only review.

## Priority

1. Preserve useful fragment validation diagnostics.
2. Clarify and reconcile configure presence/reset semantics.
3. Improve dependency-inspection discoverability and documentation of base capabilities and preparation choices.
4. Consider generic stall-error annotations and tagged built-in adapter results with explicit compatibility analysis.

Keep the already documented ON_READY callback/event timing distinction on the future major-version design list. Avoid new aliases or renames that merely hide distinct semantics. No package source files were changed, committed, pushed, or merged as part of this review.
