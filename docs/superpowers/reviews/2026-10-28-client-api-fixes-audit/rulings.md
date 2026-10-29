# Same-plan rulings

Archived from the original SDD progress on 2026-10-29. Costs if wrong are preserved verbatim.

Ruling: use uniform delivery-time emitEvents selection (F09) — explicitly permitted by the review and removes family mismatch without a second policy — if wrong, callers that depended on admission-time buffered events require a timing-mode migration.

Task 2: Ruling: preserveNumericKeys retains original intrinsic array length as well as assigned numeric positions — 'retain holes' includes original and deletion-created trailing holes — if wrong, output length does not shrink after tail deletion; callers wanting compaction must select compact/custom assembly. Spec/plan/active brief clarified; implementer notified.

Task 3: Ruling: include GetPathToOptions in strict public option validation; authored DAG declarations remain declaration records — query behavior flags are an option bag, data declarations serve a different role — if wrong, callers with extra query metadata need projection while authored declarations still permit structural width. Spec/plan/brief clarified; no source changes by controller.

Task 4: Ruling: retain the engine's exact ordered closed cycle witness, including [b,a,b] for existing a→b→a discovery — spec preservation overrides the plan's illustrative rotation — if wrong, a caller expecting a root-started witness must rotate it explicitly. Plan/brief corrected; provenance remains private and per-preparation.

Task 5: Ruling: inlineOrCached treats an explicit undefined resolveVertex field/getter as absent and types it resolveVertex?: undefined — aligns runtime callback-capture convention with exact-optional types while still rejecting actual resolver values — if wrong, callers must discriminate by hydration/typeof rather than property presence. Spec/plan/brief clarified.

Task 6: Ruling: remove ordinary runner getResolvedTreeStore while retaining standalone mutable stores — a normal runner should expose observation plus validated commands, with raw state private — if wrong, callers editing a live runner store must migrate to commands or an independent offline store. Spec/plan/brief clarified; no controller source edits.

Task 6: Ruling: public graph source/hint contexts hide synthetic entry parents using a correlated both-null parentVertex/parentVertexRef union; tree parents stay non-null — avoids exposing a holder as ordinary typed data/identity while retaining depth/index/hint semantics — if wrong, graph source callbacks need null-parent handling and callers must interpret retained depth as entry-slot discovery depth. Spec/plan/brief clarified; private engine context unchanged.

Task 6: Ruling: F03 covers supported public observation routes and real restricted new facets; pre-existing TS-private runner internals accessed by intentional casts/reflection remain unsupported — this migration is an API capability boundary, not a runtime sandbox — if wrong, private implementation introspection still permits raw-state access and would need separate runtime-private hardening. Reviewer confirmed supported holder filtering.
