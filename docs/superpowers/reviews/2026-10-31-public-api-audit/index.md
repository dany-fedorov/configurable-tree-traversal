# Public API review evidence — 2026-10-31

The [consolidated review](../2026-10-31-public-api-idiomatic-review.md) contains the selected twenty findings. Both requested reviewers completed: [Fable xhigh](fable-review.md) and [Astra xhigh](astra-review.md). The [selection data](selected-findings.json) maps final R IDs to reviewer F/A IDs and owner IDs.

- [Fable terminal model metadata](fable-result.json) and [raw read-only session](fable-network-session.jsonl).
- [Astra owner notes](astra-owner-notes.json), [Fable owner notes](fable-owner-notes.json), and [Astra per-item ledger](astra-item-ledger.json).
- [Fresh baseline comparison](baseline-validation.json), [Astra coverage validation](astra-controller-validation.json), and [Fable coverage validation](fable-controller-validation.json).
- [Complete declaration surface](complete-public-surface.txt), [owner groups](review-owner-groups.json), [all review items](review-items.json), and [fresh compiler census](public-api-census.json).
- [Controller runtime probes](controller-runtime-probes.cjs), [boundary probes](controller-boundary-probes.cjs), [Fable-only probes](fable-controller-probes.cjs), and [type probes](controller-type-probes.ts).
- [Astra runtime probes](astra-probes.cjs) and [type probes](astra-types.ts), independently rerun by the controller.

The source build and census succeeded. Corrected final probes passed. The initial Fable-only probe failed because the harness omitted the nondefault edge-event selector; [its output](fable-controller-probes.initial.output.txt) is preserved. The first restricted-network CLI attempt never received a model response and was terminated before the successful network-enabled run. Neither verification issue was a package failure. No full test suite, implementation or release action was performed for this audit.
