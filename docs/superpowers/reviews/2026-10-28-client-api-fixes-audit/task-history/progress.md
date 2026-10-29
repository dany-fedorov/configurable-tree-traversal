# SDD ledger — plan: docs/superpowers/plans/2026-10-28-client-api-fixes.md

Goal: fix all twenty findings. Baseline b51fa3638822186197f3b6b19e2b76cd2b259f2a. Existing isolated worktree /home/df/.codex/worktrees/04b4/configurable-tree-traversal.
Spec: docs/superpowers/specs/2026-10-28-client-api-fixes-design.md
User authorized implementation after the twenty-item review; no additional design approval needed.
Baseline: npm test -- --silent: 124 suites / 2840 tests passed, exit 0, 11.277 seconds. Full log baseline-tests.log.
Plan self-review: all F01–F20 assigned; current symbols inspected for affected domains, config, walking hydration and observation capability. No production changes made before tests.
Ruling: use uniform delivery-time emitEvents selection (F09) — explicitly permitted by the review and removes family mismatch without a second policy — if wrong, callers that depended on admission-time buffered events require a timing-mode migration.

## Preflight task consistency

| Task | Internal agreement |
| --- | --- |
| 1 | Truthful input and mixed-assembly tests require the same unknown domains and adapter constraints as implementation; old request/hook shapes intentionally remain until Task 2. |
| 2 | Tagged patch tests match object specialization; generic replacement keeps value. Default collision error and optional preserved indices match spec. |
| 3 | Undefined retention, atomic validation and tagged indices tests agree with normalized candidate configuration; helpers project own accepted options. |
| 4 | Engine-only invalidity conversion preserves callback errors; ticket type checks and W/C output arrays match implementations. Public diagnostic labels are distinct from private effect keys. |
| 5 | Tagged cached backedges preserve valid cyclic no-resolver workflows. Corrected sample to existing summary.counts.uniqueFoundVertices. |
| 6 | Runtime and type restrictions cover all observation routes, not just getRoot. Opaque payload identity remains; explicit mutable stores remain advanced. |
| 7 | Delivery filtering applies buffered/new events while visitor admission stays snapshotted. No added timing policy. |
| 8 | Full check, packaged consumers and twenty-row evidence matrix are required. No coverage waivers or historical artifact edits. |

## Shared-file/interface preflight

| Tasks | Shared file/interface | Assessment |
| --- | --- | --- |
| 1, 2 | ObjectTreeSource, rewriteObject, mutation binder, current domain | Task 2 consumes unknown current values and fromProperties; it owns later request/hook names and policies. |
| 1, 3 | object/rewrite option boundaries | Task 3 allowlists must include earlier converter, adapters and assembly policy keys; lower-level calls receive projections. |
| 1, 4 | object types/helpers / DAG completion/progress/diagnostics; shared current guides and type fixtures | Sequential scoped commits; later task migrates its affected consumers and retains earlier contracts. No conflicting policy. |
| 1, 5 | object types/helpers / walking sources/selectors/diagnostics; shared current guides and type fixtures | Sequential scoped commits; later task migrates its affected consumers and retains earlier contracts. No conflicting policy. |
| 1, 6 | public contexts/vertex references in earlier features | Task 6 migrates prior helpers and fixtures to handles/views while preserving their behavior; mutable internals stay private. |
| 1, 7 | shared kernel, callback/event consumers and execution types | Task 7 changes only event delivery timing after prior contracts stabilize; milestone/admission behavior remains. |
| 1, 8 | object types/helpers and final guide/packaging/evidence | Task 8 reconciles exact final APIs and verifies all stages after earlier task migrations. |
| 2, 3 | object/rewrite option boundaries | Task 3 allowlists must include earlier converter, adapters and assembly policy keys; lower-level calls receive projections. |
| 2, 4 | mutation requests/object policies / DAG completion/progress/diagnostics; shared current guides and type fixtures | Sequential scoped commits; later task migrates its affected consumers and retains earlier contracts. No conflicting policy. |
| 2, 5 | mutation requests/object policies / walking sources/selectors/diagnostics; shared current guides and type fixtures | Sequential scoped commits; later task migrates its affected consumers and retains earlier contracts. No conflicting policy. |
| 2, 6 | public contexts/vertex references in earlier features | Task 6 migrates prior helpers and fixtures to handles/views while preserving their behavior; mutable internals stay private. |
| 2, 7 | shared kernel, callback/event consumers and execution types | Task 7 changes only event delivery timing after prior contracts stabilize; milestone/admission behavior remains. |
| 2, 8 | mutation requests/object policies and final guide/packaging/evidence | Task 8 reconciles exact final APIs and verifies all stages after earlier task migrations. |
| 3, 4 | public options/positions / DAG completion/progress/diagnostics; shared current guides and type fixtures | Sequential scoped commits; later task migrates its affected consumers and retains earlier contracts. No conflicting policy. |
| 3, 5 | walking source normalization and options schemas | Task 5 validates source hydration protocols separately; accepted walking option names remain covered. |
| 3, 6 | public contexts/vertex references in earlier features | Task 6 migrates prior helpers and fixtures to handles/views while preserving their behavior; mutable internals stay private. |
| 3, 7 | shared kernel, callback/event consumers and execution types | Task 7 changes only event delivery timing after prior contracts stabilize; milestone/admission behavior remains. |
| 3, 8 | public options/positions and final guide/packaging/evidence | Task 8 reconciles exact final APIs and verifies all stages after earlier task migrations. |
| 4, 5 | diagnostic operation vocabulary/public fixtures | Task 4 owns tree/DAG sorter label; Task 5 owns walking visit label. No private effect rename is required. |
| 4, 6 | public contexts/vertex references in earlier features | Task 6 migrates prior helpers and fixtures to handles/views while preserving their behavior; mutable internals stay private. |
| 4, 7 | shared kernel, callback/event consumers and execution types | Task 7 changes only event delivery timing after prior contracts stabilize; milestone/admission behavior remains. |
| 4, 8 | DAG completion/progress/diagnostics and final guide/packaging/evidence | Task 8 reconciles exact final APIs and verifies all stages after earlier task migrations. |
| 5, 6 | public contexts/vertex references in earlier features | Task 6 migrates prior helpers and fixtures to handles/views while preserving their behavior; mutable internals stay private. |
| 5, 7 | shared kernel, callback/event consumers and execution types | Task 7 changes only event delivery timing after prior contracts stabilize; milestone/admission behavior remains. |
| 5, 8 | walking sources/selectors/diagnostics and final guide/packaging/evidence | Task 8 reconciles exact final APIs and verifies all stages after earlier task migrations. |
| 6, 7 | shared kernel, callback/event consumers and execution types | Task 7 changes only event delivery timing after prior contracts stabilize; milestone/admission behavior remains. |
| 6, 8 | observation handles/contexts and final guide/packaging/evidence | Task 8 reconciles exact final APIs and verifies all stages after earlier task migrations. |
| 7, 8 | iterator selection and final guide/packaging/evidence | Task 8 reconciles exact final APIs and verifies all stages after earlier task migrations. |

## Execution

Task 1: pending
Task 2: pending
Task 3: pending
Task 4: pending
Task 5: pending
Task 6: pending
Task 7: pending
Task 8: pending

Task 1: dispatched /root/client_fixes_task1 (gpt-6.1-sol high), base c736eb7.
Task 1: implementation committed994603a;125suites/2848tests100% coverage, typecheck/lint/package/executed guide snippets pass; independent review dispatched /root/client_fixes_task1_review, diff review-c736eb7..994603a.diff.
Task 1: complete (commits c736eb7..994603a, review clean). F01/F02 approved, no findings.
Task 2: ready; base994603a.
Task 2: dispatched /root/client_fixes_task2 (gpt-6.1-sol high), base994603a.
Task 2: Ruling: preserveNumericKeys retains original intrinsic array length as well as assigned numeric positions — 'retain holes' includes original and deletion-created trailing holes — if wrong, output length does not shrink after tail deletion; callers wanting compaction must select compact/custom assembly. Spec/plan/active brief clarified; implementer notified.
Task 2: implementation committed3c00835 (plus doc clarification967d2eb);126suites/2889tests100%, typecheck/lint/20examples/package pass. Independent review /root/client_fixes_task2_review, diff review-994603a..3c00835.diff.
Task 2: review approved spec/quality, one Minor stale rewrite-vs-patch sentence at migration-idiomatic-api.md:116. Fix round1/5 dispatched original implementer; sentence-only, no suite repeats justified.
Task 2: fix round1/5 committed e7092bd, sentence-only diff check clean; scoped re-review dispatched /root/client_fixes_task2_review, review-3c00835..e7092bd.diff.
Task 2: fix round1/5 (1 addressed,0 open; commits3c00835..e7092bd).
Task 2: complete (commits994603a..e7092bd, review clean). F10/F11/F15/F16 approved, no remaining findings.
Task 3: ready; basee7092bd.
Task 3: dispatched /root/client_fixes_task3 (gpt-6.1-sol high), basee7092bd.
Task 3: initial full source run120/127suites pass; expected old-contract fixtures plus genuine new accessor rereads. Implementer fixing getters/migrations and adding focused validator coverage; no threshold changes, task still running.
Task 3: Ruling: include GetPathToOptions in strict public option validation; authored DAG declarations remain declaration records — query behavior flags are an option bag, data declarations serve a different role — if wrong, callers with extra query metadata need projection while authored declarations still permit structural width. Spec/plan/brief clarified; no source changes by controller.
Task 3: committed551edce;128suites/2913tests100% coverage and all standard-check components pass. Independent Astra High review dispatched /root/client_fixes_task3_review, review-e7092bd..551edce.diff; named risk structural completedWork protocol validation versus instanceof guard.
Task 3: review Needs fixes (2Important,1Minor): materializer/fragment/group getter rereads; callable walking sources rejected; restore malformed opposite-source matrix. Original implementer resumed fix round1/5, base551edce. completedWork structural/cross-realm validation and documented visitor record metadata roundtrip checked good.
Task 3: fix round1/5 committed9bcecd1;6suites/265 focused tests,129suites/2949tests100%, typecheck/lint/package/original probes pass. Astra scoped re-review /root/client_fixes_task3_review active, diff review-551edce..9bcecd1.diff.
Task 3: fix round1/5 (3 addressed,0 open; commits551edce..9bcecd1).
Task 3: complete (commitse7092bd..9bcecd1, review clean). F04/F05/F13 approved.
Task 4: ready; base9bcecd1. Corrected plan file-map typo: prepareDag.ts contains both sync/async exports; no duplicate module needed.
Task 4: dispatched /root/client_fixes_task4 (gpt-6.1-sol high), base9bcecd1.
Task 4: Ruling: retain the engine's exact ordered closed cycle witness, including [b,a,b] for existing a→b→a discovery — spec preservation overrides the plan's illustrative rotation — if wrong, a caller expecting a root-started witness must rotate it explicitly. Plan/brief corrected; provenance remains private and per-preparation.
Task 4: committed791d80f;130suites/3037tests100%, type/lint/examples/package/benchmark/packaging pass. Independent Astra High review dispatched /root/client_fixes_task4_review, review-9bcecd1..791d80f.diff.
Task 4: review approved spec/quality, one Minor stale structural-cycle troubleshooting sentence at agent-workflows.md:196. Original implementer resumed fix round1/5; prose-only correction, no suite repeats.
Task 4: fix round1/5 committed e6ad10b; prose-only diff check clean. Astra scoped re-review /root/client_fixes_task4_review active, review-791d80f..e6ad10b.diff.
Task 4: fix round1/5 (1 addressed,0 open; commits791d80f..e6ad10b).
Task 4: complete (commits9bcecd1..e6ad10b, review clean). F07/F08/F12/F14 approved; F19 tree/DAG half done, walking half remains Task5.
Task 5: ready; basee6ad10b.
Task 5: dispatched /root/client_fixes_task5 (gpt-6.1-sol high), basee6ad10b.
Task 5: Ruling: inlineOrCached treats an explicit undefined resolveVertex field/getter as absent and types it resolveVertex?: undefined — aligns runtime callback-capture convention with exact-optional types while still rejecting actual resolver values — if wrong, callers must discriminate by hydration/typeof rather than property presence. Spec/plan/brief clarified.
Task 5: committedfdb957a;131suites/3049tests100% before type/doc-only undefined convention alignment;focused67cases/type/lint/packageafterclarification pass;all standard check components pass. Astra High review active /root/client_fixes_task5_review, review-e6ad10b..fdb957a.diff.
Task 5: complete (commitse6ad10b..fdb957a, review clean). F06/F18/F19 approved; all diagnostic halves complete. Reviewer clarified F18 readonly applies catalog link fields, not caller-owned selector member mutability; written spec controls.
Task 6: ready; basefdb957a.
Task 6: dispatched /root/client_fixes_task6 (gpt-6-astra high architecture), basefdb957a. All earlier task review gates clean;16findings complete. F03/F17/F20 now; F09 and final integration remain.
Task 6: Ruling: remove ordinary runner getResolvedTreeStore while retaining standalone mutable stores — a normal runner should expose observation plus validated commands, with raw state private — if wrong, callers editing a live runner store must migrate to commands or an independent offline store. Spec/plan/brief clarified; no controller source edits.
Task 6: Ruling: public graph source/hint contexts hide synthetic entry parents using a correlated both-null parentVertex/parentVertexRef union; tree parents stay non-null — avoids exposing a holder as ordinary typed data/identity while retaining depth/index/hint semantics — if wrong, graph source callbacks need null-parent handling and callers must interpret retained depth as entry-slot discovery depth. Spec/plan/brief clarified; private engine context unchanged.
Task 6: committed20acd87;full npm run check exit0:132suites/3077tests100%, type/lint/21examples/package/24snippets/25benchmark/7packaging. Independent Astra High review active /root/client_fixes_task6_review, review-fdb957a..20acd87.diff. Automatic approval-review timeout on recovery-note write retried once and succeeded; no permission blocker.
Task 6: Ruling: F03 covers supported public observation routes and real restricted new facets; pre-existing TS-private runner internals accessed by intentional casts/reflection remain unsupported — this migration is an API capability boundary, not a runtime sandbox — if wrong, private implementation introspection still permits raw-state access and would need separate runtime-private hardening. Reviewer confirmed supported holder filtering.
Task 6: review Needs fixes: Important stale cached hints after supported standalone Vertex array edits; Minor unfrozen detached W/C declaration arrays. Original Astra implementer resumed fix round1/5, base20acd87. Supported runner/source/event/facade boundaries, hidden holders, renames/root removal otherwise approved; no runtime sandbox requirement.
Task 6: fix round1/5 committed7450f40;live hint push/same-length replacement/clear and frozen W/C arrays corrected;final133suites3080tests100%, type/lint pass. Astra scoped re-review /root/client_fixes_task6_review active, review-20acd87..7450f40.diff.
Task 6: fix round1/5 (2 addressed,0 open; commits20acd87..7450f40).
Task 6: complete (commitsfdb957a..7450f40, review clean). F03/F17/F20 approved;19findings complete.
Task 7: ready; base7450f40; final F09 implementation then Task8 integration/final whole-change review.
Task 7: dispatched /root/client_fixes_task7 (gpt-6-astra high integration), base7450f40. F09lastAPI;Task8fullintegration/minTS/freshcensus/migration/completionmatrix/finalreview still required.
Task 7: committed3c103a4;full npm run check exit0:134suites3100tests100%,22examples,type/lint/package/guides/benchmark/packaging. Astra High review /root/client_fixes_task7_review active, review-7450f40..3c103a4.diff; named risk selected-kind soundness under sync iterator policy ownership/interleaving.
Task 7: complete (commits7450f40..3c103a4, review clean). F09 approved;all20finding implementations and task reviews complete.
Task 8: ready; base3c103a4. Goal NOT complete: packaged migration/full compatibility/completion audit/final whole-change review remain. PreparedTS4.7.4 compiler verified; see forward notes.
Task 8: dispatched /root/client_fixes_task8 (gpt-6.1-sol high integration), base3c103a4;all20 source findings task-reviewed. Remaining packaged guide/current-source audit/final check/TS4.7/freshcensus/durablematrix+evidence, Task8 review, final whole-change review and completion audit.
