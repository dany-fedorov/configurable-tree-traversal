# Documentation implementation design

The user approved implementing all twenty findings in [the reconciled review](../reviews/2026-10-31-documentation-review.md), then assessing each again. This design applies that approved scope without changing runtime APIs.

Keep the README concise and agent use cases first. Lead with a concrete truthful outcome, make release status and a runnable checkout route explicit, show the complete fork/join, and explain materialize/prepare/advance-complete gradually. The workflow guide follows the learner’s integration sequence and contains a worked structural-completion diagram. Preserve existing public anchors.

Keep detailed current contracts in docs/reference.md, with first-class views/identity/path queries and structured source contexts, command envelopes, options/defaults, error/result categories and summary/progress schemas. Executable standalone examples demonstrate each newly taught contract using the existing packed-guide verifier. Current migration guides and the Unreleased changelog must agree on the final canonical surface and removed forms; preserve released history and historical audits.

Add a packaged docs/api-index.md generated from the existing public declaration census. Every supported exported binding gets an anchor, import routes, actual public declaration signatures, owning contract and example links. Exclude private engine imports and reachable-but-unexported symbols. Check freshness during package verification; unit-test actual generation behavior with small declaration fixtures before writing the generator. Keep production src and preexisting tests unchanged.

Validation: existing top-level example execution, marked standalone guide snippets compiled/executed against the packed package, link/anchor verification in checkout and tarball, generator tests, npm run check, and minimum-TypeScript4.7.4 packed guide/type checks. After every finding is implemented, run independent Codex Astra high and Claude Fable high assessments of D01–D20, resolve valid feedback, rerun affected checks, then write a per-finding completion audit. No merge, commit, publication or unrelated cleanup is part of this request.
