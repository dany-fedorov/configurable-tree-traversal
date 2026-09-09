# Changelog

## Unreleased

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

Behavior changes: invalid late hint rewrites now throw; deleted vertices are not yielded or visited again; filtered-out orders can still halt traversal; visitor indices start at zero; failed runners rethrow their original error and require a fresh runner to retry. Exported traversal defaults are frozen; customize through constructor options or configure calls. Resume a halted runner to complete its pending visitor chain and event. Output types now include null for root deletion.
