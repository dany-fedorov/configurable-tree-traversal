# Documentation review evidence

Start with the [reconciled review](../2026-10-31-documentation-review.md): exactly twenty scored findings and a truthful opening-hook candidate.

- [Codex Astra high review](astra-review.md).
- [Claude Fable high review](fable-review.md), [terminal/model metadata](fable-result.json) and [review configuration](reviewer-configuration.json).
- [All forty candidate dispositions](reconciliation.json) and [twenty final findings](reconciled-findings.json).
- [Requirement completion audit](completion-audit.json) and [119 verified report citations](citation-verification.json).
- [Frozen input hashes](review-input-hashes.json) and [documentation inventory](documentation-inventory.json).
- [44 focused contract tests](contract-tests.log) and [51 migration-contract tests](migration-contract-tests.log).
- [Published npm metadata](published-package-metadata.json), [tarball provenance](published-package-provenance.json) and [missing quickstart exports](published-package-runtime.json).

The public tarball and npm cache were inspected under /tmp and are not copied into this repository. The raw Claude stream is retained as fable-session.jsonl. Neither reviewer edited public documentation or source. Review recommendations remain unimplemented.
