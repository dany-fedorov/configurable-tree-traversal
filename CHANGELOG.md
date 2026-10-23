# Changelog

## Unreleased

- Adopt descriptive `$data`/`$childHints` vertex fields and tagged `found`/`omitted`/lookup-only `missing` source results. Preserve deprecated input/access aliases; Vertex own fields, spread and JSON now use canonical names.
- Honor ordinary root work prerequisites by default (`rootDependencies: 'honor'`) and make graph parent work inheritance opt-in (`implicitParentDependency: false`). Tree order is preserved. These are intentional behavior changes; see the [migration guide](docs/migration-uniform-api.md).
- Add exclusive `DEFER_READY` commands and phase-neutral `REWRITE_CHILD_HINTS`; retain deprecated sentinel/command inputs. Name batching `commandCommitMode`, preserve group ordering, and infer command phases across registration/configuration/helpers. Callback context exposes readonly metadata; retrieve executable records through traversal APIs.
- Use progress `work: 'completed'` and tagged `workCompleted`/`traversalFailed` settlement outcomes, retaining deprecated boolean outcome inputs. All six helpers accept one options object with phase-keyed callbacks; direct positional overloads remain deprecated.
- Refresh agent-first guides, runnable examples, and packed CJS/ESM runtime/type consumers. This revision is unreleased; the package version remains 0.11.0 pending a separately requested release.

## 0.11.0 — 2026-10-23

- Update UUID to 14.0.3 and remove obsolete `@types/uuid`; preserve synchronous reference IDs and mixed CJS/ESM entry identity. Require Node 22.12.0+ for synchronous loading of the ESM-only dependency (Bun 1.4.4 also verified), and add an exact-minimum Node package check. Adapt the Jest loader for the real dependency.

- Lead documentation with autonomous-agent workflows, add navigation and repository-agent guidance, retain detailed API contracts in a dedicated reference, and include consumer guides in package builds. Add an executable agent-coordination and recovery example.

## 0.10.0 — 2026-10-23

- Add native ESM entry and declaration facades for every emitted module, including historical deep imports, backed by one canonical CommonJS runtime and type graph; mixed import/require consumers preserve class, namespace, and `DEFER_READY` identity.
- Verify real mixed `.mts`/`.cts` consumers with TypeScript 4.7.4 and the locked compiler, and add a pinned Bun 1.4.4 packed-consumer and script-correctness CI lane alongside the Node 22/24 full checks.

- Add optional graph-source `resolvePrerequisite(id)` through the shared callback transport, with transitive W/C demand, coalesced lookups, runner-local not-found caching, and exact error/ID semantics.
- Retain resolved prerequisites as detached components with independent anchors, structural snapshots, public depth zero, and safe deletion/halt/resume ownership; eager validation waits for discovery and lookup closure.

- Add graph-source `dependsOnComplete` prerequisites, released only after committed structural completion, with conjunctive work/completion gates and original milestone cycle diagnostics.
- Preserve completion gates across seeds, continuation, omission, deletion, and async halt/resume; expose optional copied completion metadata and progress fields.
- Keep legacy lazy-root work dependencies unless a non-undefined completion declaration opts in (including `[]`); tree sources continue ignoring completion metadata. Graph `priority` remains unsupported.

- Reduce measured DAG discovery and summary costs through narrow internal graph reads, incremental discovery accounting, and reuse of successful topology validation.
- Add reproducible sync/async, eager/lazy DAG lifecycle benchmarks for settlement, resume, reconstruction, and callback-free summaries, with artifact provenance and independent correctness checks.

## 0.9.0 — 2026-10-22

- Add `DagTraversalStallError` with structured diagnostics preserving arbitrary SameValueZero vertex ID identity.
- Add graph-source `completedWork` seeds, eager discovery with original dependency validation, and synthetic catalog roots for both DAG runners.
- Add `DEFER_READY`, callback-free `summary()`, guarded `settle()`, and exported progress/settlement types for synchronous and asynchronous DAG traversal.
- Document host-owned business outcomes, ranking over `readyIds`, artifacts, retries, and persistence. Vertex data remains opaque; settlement reports traversal completion or a fatal traversal error.

Compatibility limits: lazy discovery and FIFO scheduling remain the defaults. Progress configuration requires a fresh graph-source runner; eager discovery rejects child-hint rewrites and subtree-disabling commands after validation. Lazy summaries can expose only a partial frontier. Settlement generations belong to one retained runner and cannot be persisted or transferred; `{ ok: false, error }` fails that runner with the exact error. Existing tree/DAG exports and dependencies are preserved.

## 0.8.0 — 2026-10-21

- Add synchronous and asynchronous DAG traversal with explicit vertex identity, dependencies, readiness and subtree-completion events, graph queries, snapshots, and tree-source compatibility.
- Add asynchronous depth-first and breadth-first traversal with value-or-promise adapters and visitors, callback concurrency limits, prefetching, and resumable iterator-close behavior.
- Run all six traversal families on one inspectable state-machine core with shared synchronous and asynchronous execution semantics and detached inspection snapshots.
- Add root and subpath exports, typed helpers, CommonJS and ESM consumers, historical deep-import coverage, workflow examples, and strict packed-package verification.

## 0.7.0 — 2026-09-12

- Restore the Wikipedia traversal diagram, source attribution, and color legend at the beginning of the README.
- Include the diagram in the npm package and verify its presence and contents in the packed-package check.
- No runtime or public API changes.

## 0.6.0

- Add breadth-first traversal, level-order visitors, and a convenience helper.
- Make depth-first iteration independent of registered visitor functions.
- Fix sorting, null-child completion, iterator filtering, pruning, and deletion.
- Preserve pending visitors and events when halting or breaking iteration; allow new iteration options on resumption.
- Make adapter, visitor, sorting, and internal traversal errors terminal (`FAILED`); subsequent execution rethrows the original value. Consumer loop errors remain resumable.
- Correct visitor indices to start at zero and report the actual previous vertex.
- Preserve visitors across configure calls and snapshot visitor records for each runner.
- Copy nested in-order ranges and iteration filters, snapshot runner configuration, and freeze exported traversal defaults to prevent cross-traversal configuration leaks.
- Support null/undefined vertex data and primitive object rewrites; deleting an object root returns null, reflected in the result type.
- Detect ancestor cycles in object traversal while allowing shared objects on separate paths; include symbol properties and skip sparse array holes.
- Isolate saved original-tree references, child lists, and resolution contexts. User data remains shallowly shared.
- Retain saved reference identity across container updates, translate saved parent/child edges, and validate saved mappings before mutating either tree. Reject path requests for unresolved references.
- Require correctly paired visitor command names and payloads in TypeScript, with discriminated-union narrowing.
- Complete public exports, preserve historical deep imports, and fix npm entry points and declaration paths.
- Add deterministic generated-tree comparisons and regressions for commands, iterator ownership, thrown non-Error values, configuration isolation, saved-tree updates, custom object assembly, and halt-time rewrite output snapshots.
- Run coverage, all examples, and packed CommonJS/ESM/strict TypeScript consumers in the automated check on Node 22 and 24.
- Require 100% statements, branches, functions, and lines across all source files. Add tests for concurrent visitor boundaries, custom object hooks and assembly, saved-tree errors, public runner-state helpers, and utility edge cases.
- Preserve stack ranges and subtree-pruning references when injecting existing depth-first runner state, allowing its public stack helpers to resume safely.

Behavior changes: invalid late hint rewrites now throw; deleted vertices are not yielded or visited again; filtered-out orders can still halt traversal; visitor indices start at zero; failed runners rethrow their original error and require a fresh runner to retry. Exported traversal defaults are frozen; customize through constructor options or configure calls. Resume a halted runner to complete its pending visitor chain and event. Output types now include null for root deletion.
