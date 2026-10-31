# Documentation improvements implementation plan

> Execute inline using executing-plans. The twenty approved recommendations are the design; reassessment happens after all implementations. Use the existing isolated worktree.

**Goal:** Implement D01–D20 and independently reassess every finding.
**Architecture:** Improve the README/workflow progression; consolidate current contracts in the reference and migration entry; generate a complete public symbol index from supported declarations.
**Tech Stack:** Markdown, TypeScript4.7-compatible executable snippets, existing package verifier, Node test runner.
**Spec:** [Documentation design](../specs/2026-10-31-documentation-improvements-design.md).

## Constraints

Preserve production runtime APIs, exact arbitrary failures, shallow data/ID identity, W/C versus structural edges, host ownership and existing anchors. Preserve preexisting changes and historical reports. Include every new consumer guide in package files and verification. Do not weaken coverage. Release status must remain explicit; no publication.

## Tasks

- [x] Revalidate current isolated worktree and review inputs; record twenty concrete acceptance criteria and baseline hashes/status.
- [x] Rewrite README first screen/install/quickstart/explanations (D01–D03/D14). Add runnable checkout example; verify visible branch/join/finished output.
- [x] Reorder workflow guide by integration steps, preserve anchors, add worked composite diagram and W/C trace (D04/D13).
- [x] Correct preparation/omission/output/projection/witness contracts in all current guides; establish one final migration route/checklist; rewrite only Unreleased changelog (D05–D07/D09–D12).
- [x] Restructure reference shared queries and integrate post-license consumer contracts. Add exact context tables/examples, full command envelope, narrowed validation/failure recipes, options matrix and complete progress schemas/examples (D15–D20).
- [x] Write failing generator tests for public-export-only indexing, duplicate import routes, overloads/namespaces and stable unique anchors. Implement census-based index generator, generate packaged API index, add drift/package checks (D08).
- [x] Run new/changed examples, npm run check, TypeScript4.7.4 packed consumer/snippet verification, format/link/anchor/index freshness checks. Repair failures without weakening gates.
- [x] After all twenty implementations, run Codex Astra high and Claude Fable high assessments in parallel using D01–D20 criteria. Address valid feedback and reverify/reassess as needed.
- [x] Write final per-finding assessment and completion audit; confirm original workspace and runtime source preservation; mark goal complete only after all criteria pass.
