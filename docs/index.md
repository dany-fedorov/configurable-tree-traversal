# Documentation map

[Home and quickstart](../README.md) · [Agent workflow guide](agent-workflows.md) · [API reference](reference.md)

These pages describe **CTT 0.11.0**. Read only the path relevant to your task; internal plans and research are historical evidence, not the public API contract.

## Read by task

| Task | Reading order | Stop when you have… |
| --- | --- | --- |
| Build an autonomous-agent workflow | [Quickstart](../README.md#quickstart-find-the-next-agent-tasks) → [workflow guide](agent-workflows.md) | A graph adapter, execution model, and host-owned recovery design |
| Add a work or subtree-completion dependency | [Join semantics](agent-workflows.md#work-dependencies-and-completion-joins) → [exact graph contracts](reference.md#discovery-and-completed-work) | Correct dependency declarations without structural/dependency cycles |
| Debug missing work or a stalled graph | [Troubleshooting](agent-workflows.md#troubleshoot-a-workflow) → [DAG diagnostics](reference.md#dag-traversal) | A complete catalog or lookup adapter and the relevant diagnostics |
| Walk an object or abstract tree | [Objects](reference.md#traverse-an-object) → [abstract trees](reference.md#abstract-trees) → [orders](reference.md#traversal-orders) | The correct adapter, traversal family, and order |
| Use async callbacks | [Execution models](agent-workflows.md#choose-an-execution-model) → [async traversal](reference.md#async-traversal) → [pause/resume](reference.md#pause-and-resume) | A callback concurrency limit and clear iterator ownership |
| Modify CTT | [AGENTS.md](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/AGENTS.md) → [testing](testing.md) | The relevant implementation and regression tests |

## Runnable examples

Examples are executable programs; the DAG and agent coordination examples include behavioral assertions. From a repository checkout, run `npm ci`, then `npm run tsfile -- examples/agent-orchestration-example.ts`. Run all examples with `npm run verify-examples`.

| Example | Demonstrates |
| --- | --- |
| [Agent orchestration](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts) | Deferred agent tasks, accepted completion, duplicate settlement, and restart reconstruction |
| [Reconciliation](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-reconciliation-example.ts) | Retained-runner and rebuild-per-tick equivalence |
| [Completion joins](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-completion-dependencies-example.ts) | Waiting for a composite and its retained children |
| [Prerequisite lookup](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-prerequisite-resolution-example.ts) | Async catalog lookup, transitive prerequisites, detached components |
| [DAG traversal](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-workflow-example.ts) | Shared vertices and work versus structural completion |
| [Async tree adapter](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/async-adapter-example.ts) | Promise-returning discovery and visitors |
| [Object rewrite](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/rewrite-object-example.ts) | Transforming nested values |

The npm package includes these guides and the reference. Examples, contributor instructions, and measurement artifacts are linked to the repository rather than bundled.

## Evidence and history

- [Changelog](../CHANGELOG.md): released capabilities and compatibility changes.
- [Testing](testing.md): commands, coverage requirements, package/runtime checks.
- [Performance reports](https://github.com/dany-fedorov/configurable-tree-traversal/tree/main/docs/performance): measured artifacts and explicit limits; not universal speed guarantees.
- [Research](https://github.com/dany-fedorov/configurable-tree-traversal/tree/main/docs/research) and [design plans](https://github.com/dany-fedorov/configurable-tree-traversal/tree/main/docs/superpowers): decision history. Some proposals are superseded or describe downstream work that CTT does not implement. Use current guides and source/tests to establish behavior.
