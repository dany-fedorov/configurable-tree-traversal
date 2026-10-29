# Idiomatic API review evidence

Baseline: `95fd35852a296d35aaf13c2b47a38e087dd880d6`, branch `feat/api-clarity-migration`. Reviewer: explicitly requested `gpt-6-astra`, reasoning effort `high`. Review date: 2026-10-27.

Start with the [review](../2026-10-27-idiomatic-api-review.md). It contains 15 ranked findings, proposed coherent API shapes, migration implications, retained API rationale and cross-family vocabulary decisions. Recommendations remain proposals; no implementation changes were made.

## Coverage and evidence

- [Coverage](coverage.json) accounts for 2,837 exact IDs: 534 export bindings, 318 reachable declarations, 897 declared/nested members, 1,085 inherited/mapped instance relationships and 3 static relationships. These are occurrences, not independent concepts.
- [Explicit declaration decisions](declaration-decisions.json), [decision authoring script](decisions.py), [fresh declaration census](public-api-census.json) and [expected IDs](expected-coverage.json) preserve the reviewed signatures and every disposition.
- [Supplemental judgments](supplemental-coverage.json) account for all 393 literal/enum, 338 parameter, 631 generic-parameter and 21 deprecation occurrences from the [supplemental AST extract](supplemental-vocabulary.json). Runtime-only accepted legacy inputs are separately inventoried in the report.
- [Controller coverage verification](coverage-verification.json), [supplemental verification](supplemental-verification.json), [citation check](citation-verification.json), [runtime routes](runtime-entrypoints.json), [controller evidence](controller-evidence.json) and [requirement completion matrix](requirements.json) record independent checks. Source citations were also assessed for meaning; the citation script checks only target existence and line bounds.
- [Strict-compiling probe](probe.ts) and [observed output](probe-output.txt) demonstrate the two public type-contract defects. Both reviewer and controller compiled and ran it; the controller used TypeScript 4.9.5, strict mode and no skipLibCheck.
- [Original reviewer report](review.md) is unmodified. The repository-facing report only changes its final artifact-location paragraph to link this bundle. [Build log](build.log) records the fresh declaration build; [progress](progress.md) records review passes and limits.

## Reproduction

From the repository root at the baseline revision, `npm run build` then `node scripts/api-clarity-census.cjs /tmp/ctt-new-census` regenerates the surface inventory. Compare its signatures and counts to this snapshot; later implementation changes require a new review.

From the repository root, verify this saved snapshot with:

```sh
python3 docs/superpowers/reviews/2026-10-27-idiomatic-api-audit/verify-coverage.py
python3 docs/superpowers/reviews/2026-10-27-idiomatic-api-audit/verify-citations.py
```

The probe and original authoring/extraction scripts retain their actual scratch/worktree paths as historical evidence. To rerun the probe elsewhere, copy it to a temporary directory and change only its absolute dist import to the current worktree's dist directory, then compile with `tsc --strict --target ES2020 --module commonjs --moduleResolution node --outDir <temporary-output> <temporary-probe>` and execute the emitted JavaScript. No compiler suppression is required.

Standard-library inherited names and package metadata are explicitly assessed in the report but excluded from CTT-designed symbol counts. Private deep modules are not supported entrypoints. This is exhaustive contextual surface review, not proof of all runtime behavior. No full test-suite rerun, API implementation, push, merge or publication is part of this review.
