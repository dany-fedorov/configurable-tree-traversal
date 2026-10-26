# API naming audit evidence

Read the [20 ranked improvements](../2026-10-26-api-naming-review.md) first. This bundle records the exhaustive review behind that list, at source baseline `e52fab02333a044472e9aea864db26a8c33fc051`. No recommended API changes have been implemented.

- [assessment.json](assessment.json): final consolidated disposition for every one of the 2,148 declaration/member IDs, including rationale, peer symbols, family findings and applicable numbered improvements.
- [inventory.json](inventory.json): full declaration signatures, declared member IDs, inherited/mapped member relationships, export aliases and CJS/ESM module mapping.
- [module-assessment.json](module-assessment.json): all 188 module surfaces and 1,189 export bindings linked to their reviewed declarations. Extension aliases and generated ESM defaults are assessed as loader/module aliases, not separate domain concepts.
- [coverage.json](coverage.json): exact coverage and independent declaration-AST checks, with explicit scope limits.
- [improvements.json](improvements.json): exactly 20 ranked groups, matching the main report.
- [consolidation.json](consolidation.json): overrides resolving family-review differences and proposed-name collision analysis. The remaining shared targets are intentional consolidation into one canonical definition.

The family evidence records reviewed signatures and source-backed reasoning. These are inputs to the final report, not additional independent improvement lists: [DAG findings](dag-findings.md), [walking findings](walking-findings.md), [tree/core findings](tree-core-findings.md), [engine findings](engine-findings.md). Their original per-ID ledgers remain in `dag-assessment.json`, `walking-assessment.json`, `tree-core-assessment.json`, and `engine-assessment.json`. **The consolidated assessment takes precedence** where a candidate name was revised, retained or hidden.

Counts distinguish canonical declarations from syntax occurrences. The inventory has 556 declarations (509 exported and 47 conservative signature-support declarations), plus 1,592 declared public/protected/nested members. Overloads and repeated tagged-union members share IDs while retaining their full signatures. There are 2,300 inherited/mapped relationships. Independent AST verification covers 559 top-level declaration occurrences and 1,714 public/protected member occurrences without gaps. Private members and inherited standard-library names are excluded. Parameters, type parameters and literal unions are assessed in their owning signatures, rather than counted as independent APIs. Package metadata follows npm conventions.

A fresh build completed before declaration extraction. Runtime tests were not rerun for this read-only naming review. The ledger validates coverage, not a mathematical guarantee of human comprehension or runtime correctness.

From the repository root, with dependencies and `dist` available, verify the saved review:

```sh
node docs/superpowers/reviews/2026-10-26-api-naming-audit/verify-audit.cjs docs/superpowers/reviews/2026-10-26-api-naming-audit .
```

To regenerate an inventory for the same source baseline into a separate scratch directory:

```sh
npm run build
node docs/superpowers/reviews/2026-10-26-api-naming-audit/extract-api.cjs . /tmp/ctt-api-inventory-reproduction
```

The extractor inventories compiler-resolved exports and declared member signatures. `verify-audit.cjs` separately walks declaration syntax and validates every assigned ID, export binding, inherited declaration location, companion module, final improvement reference and proposed-name collision disposition. `consolidate.cjs` records the explicit editorial decisions applied to the family ledgers; rerunning it updates `assessment.json`, `improvements.json` and `consolidation.json` from the adjacent main report. Re-run verification afterward so module dispositions reflect the final ledger.

The review does not authorize implementation, removal of compatibility APIs, publication, or integration. Future migration should preserve the library's family-safe types, arbitrary IDs, exact failures and documented lifecycle behavior while adopting approved naming/surface changes.
