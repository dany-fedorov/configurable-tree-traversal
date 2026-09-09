# Library completion design

Finish the synchronous library and its next planned feature, breadth-first traversal. Retain the existing depth-first, object-adapter, visitor-command, and namespace APIs. Async traversal and filesystem synchronization remain separate future features.

## Behavior

Depth-first traversal emits pre-order, configurable in-order, and post-order events regardless of whether visitors are registered. Child resolution stays lazy, uses the configured ordering, and skips null vertex content without losing ancestor completion. Use an explicit frame stack so very deep trees do not overflow the JavaScript call stack.

Visitors run in priority order within their existing concurrent and sequential groups. Concurrent means commands are deferred until the group has run; it does not mean promises. Sequential commands are visible to the next visitor. Halting suspends before the next visitor or traversal event and can resume without duplication, even when iteration excludes the halted order. Iteration filters can change on resumption.

Errors raised inside traversal are terminal: mark the runner FAILED and rethrow the original value on later execution attempts. Consumer iteration errors close that iterator and leave the runner resumable. Runner configuration snapshots include nested in-order ranges and copied visitor records; exported defaults cannot be mutated.

Mutation commands support null and undefined data, subtree pruning, root and subtree deletion, and replacing child hints before descent. A saved original resolved tree has its own references and topology; arbitrary user data remains shallowly shared. Object cycles are rejected with a descriptive error; repeated objects in separate branches are valid. Custom adapters control their own graph identities.

Breadth-first traversal uses a queue and a single LEVEL_ORDER event, shares visitor behavior and resolved-tree semantics, and offers a class, runner, and convenience function. It supports sorting, iteration filters, halt/resume, pruning, deletion, rewriting, and saved original trees.

## Distribution

Publish compiled CommonJS and TypeScript declarations from dist, preserve historical deep import paths, and add missing public type exports. Verify the packed package from a separate consumer directory. Keep npm as the reproducible dependency-install path and run type checking, tests, build, and consumer checks in CI. Update the README with executable examples and precise behavior and limitations.

## Validation

Regression tests cover traversal orders and null hints, mutation and saved-tree isolation, visitor scheduling and suspension, cycle and shared-object behavior, primitive rewrites, and deep trees. Breadth-first expectations use hand-written level-order sequences. Generated bounded trees use fixed seeds and an independent reference walker to exercise combinations of orders and pruning. Include terminal failure replay, consumer error recovery, saved-reference consistency, and custom object reconstruction. Execute all examples and packed JavaScript/strict TypeScript consumers as part of the same CI check, with global coverage minimums.
