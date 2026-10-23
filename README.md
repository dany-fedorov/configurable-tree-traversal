# configurable-tree-traversal

**Dependency-aware building blocks for autonomous-agent workflows, plus general tree and DAG traversal for TypeScript and JavaScript.**

Give CTT a graph of work and accepted completion facts. It determines what can run next, enforces work and structural-completion dependencies, and exposes progress without executing business work. Your host chooses agents, dispatches tasks, accepts results, and persists state.

[Documentation map](docs/index.md) · [Agent workflow guide](docs/agent-workflows.md) · [API reference](docs/reference.md) · [npm](https://www.npmjs.com/package/configurable-tree-traversal)

## Start with autonomous agents

| You want to… | Use CTT for… | Start here |
| --- | --- | --- |
| Coordinate research, implementation, testing, and review agents | Parallel branches and dependency joins | [Quickstart](#quickstart-find-the-next-agent-tasks) |
| Let a coordinator choose which agents run next | Deferred work and a readable ready frontier | [Host-controlled execution](docs/agent-workflows.md#choose-an-execution-model) |
| Resume after a process restart or wait for human input | Reconstruction from accepted completion facts | [Recovery and storage](docs/agent-workflows.md#persist-facts-and-reconstruct) |
| Review a composite task only after all its subtasks finish | `dependsOnComplete` | [Work versus completion](docs/agent-workflows.md#work-dependencies-and-completion-joins) |
| Fetch dependencies from a task catalog or service | `resolvePrerequisite(id)` | [Discover prerequisites](docs/agent-workflows.md#discover-the-graph) |
| Walk or transform a repository index, AST, or JSON object | Iterative sync/async DFS, BFS, pruning, rewriting | [Tree and object traversal](docs/reference.md#traverse-an-object) |

CTT is an in-memory traversal engine. The host owns workflow meaning, agent/tool execution, claims, retries, timeouts, business outcomes, and durable storage. It can use SQLite, another database, or another storage provider without a CTT storage dependency.

## Install

```sh
npm install configurable-tree-traversal
```

Current release: **0.11.0**. Requires Node **22.12.0+**, or Bun **1.4.4**. CI covers the minimum Node runtime, current Node 22/24, and Bun. TypeScript consumers are checked with 4.7.4 and 4.9.5.

## Quickstart: find the next agent tasks

After `research` completes, `implement` and `testPlan` can run independently. `review` waits for both. The catalog is flat; `$c` discovers tasks and `dependsOn` expresses the work graph.

```text
research ──┬── implement ──┬── review
           └── testPlan ───┘
```

```ts
import {
  DagTraversal,
  DagTraversalOrder,
  DEFER_READY,
  type TreeTypeParameters,
} from 'configurable-tree-traversal';

type Workflow = TreeTypeParameters<string, string>;
const dependencies: Record<string, string[]> = {
  research: [],
  implement: ['research'],
  testPlan: ['research'],
  review: ['implement', 'testPlan'],
};
// In-memory stand-in for completion facts already accepted by your host.
const accepted = new Set(['research']);
function reconstruct() {
  const traversal = new DagTraversal<Workflow>({
    discovery: 'eager',
    syntheticRoot: true,
    completedWork: accepted,
    traversableGraph: {
      makeRoot: () => ({
        vertexContent: { $d: '', $c: Object.keys(dependencies) },
      }),
      makeVertex: (id) => ({
        vertexId: id,
        dependsOn: dependencies[id]!,
        vertexContent: { $d: id, $c: [] },
      }),
    },
  });
  traversal.addVisitorFor(DagTraversalOrder.ON_READY, () => DEFER_READY);
  return traversal.makeRunner().run();
}

const runner = reconstruct();
const snapshot = runner.summary();
console.log(snapshot.readyIds); // ['implement', 'testPlan']
```

The sole `ON_READY` visitor returns `DEFER_READY`, so `run()` discovers and validates the graph, then halts with eligible work still incomplete. A no-op visitor would mark work complete; `summary()` alone does not discover the graph. `readyIds` is dependency readiness, not a claim or evidence that an external agent is idle.

The host can now claim a candidate, dispatch an agent, validate and persist its result, and either settle the retained runner or reconstruct on the next tick. See the [workflow guide](docs/agent-workflows.md#accept-results-and-resume) and the [executable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-orchestration-example.ts), which also checks settlement, duplicate reports, and restart reconstruction. The example uses an in-memory set; production durability belongs to the host.

## Choose your next page

- **Integrating an agent coordinator:** [Agent workflows](docs/agent-workflows.md), including execution models, persistence, retries, and common mistakes.
- **Looking up a contract:** [API and behavior reference](docs/reference.md), including tree traversal, commands, identity, errors, and async semantics.
- **Finding runnable code or source:** [Documentation index](docs/index.md).
- **Changing CTT:** [Repository agent guide](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/AGENTS.md) and [testing guide](docs/testing.md).
- **Checking releases:** [Changelog](CHANGELOG.md).

## Imports and compatibility

```ts
import { DagTraversal, DEFER_READY } from 'configurable-tree-traversal';
```

```js
const { DagTraversal, DEFER_READY } = require('configurable-tree-traversal');
```

Native ESM `.mjs` entries and `.d.mts` declarations share one CommonJS implementation and canonical types. Named/default imports, classes, namespaces, and `DEFER_READY` preserve identity across loaders. ESM entries use Node-compatible `createRequire`; standalone browser ESM and tree shaking are not promised. Public subpaths and historical deep imports remain supported; see [compatibility details](docs/reference.md#api-compatibility).

## Reference shortcuts

Existing README section links land here; each topic now has a dedicated location in the reference.

| Topic | Detailed guidance |
| --- | --- |
| <a id="dag-traversal"></a>DAG traversal | [Read section](docs/reference.md#dag-traversal) |
| <a id="discovery-and-execution-as-separate-phases"></a>Discovery and execution as separate phases | [Read section](docs/reference.md#discovery-and-execution-as-separate-phases) |
| <a id="discovery-and-completed-work"></a>Discovery and completed work | [Read section](docs/reference.md#discovery-and-completed-work) |
| <a id="deferred-dag-progress-and-reconciliation"></a>Deferred DAG progress and reconciliation | [Read section](docs/reference.md#deferred-dag-progress-and-reconciliation) |
| <a id="host-policy-and-traversal-feedback"></a>Host policy and traversal feedback | [Read section](docs/reference.md#host-policy-and-traversal-feedback) |
| <a id="traverse-an-object"></a>Traverse an object | [Read section](docs/reference.md#traverse-an-object) |
| <a id="abstract-trees"></a>Abstract trees | [Read section](docs/reference.md#abstract-trees) |
| <a id="traversal-orders"></a>Traversal orders | [Read section](docs/reference.md#traversal-orders) |
| <a id="breadth-first-traversal"></a>Breadth-first traversal | [Read section](docs/reference.md#breadth-first-traversal) |
| <a id="async-traversal"></a>Async traversal | [Read section](docs/reference.md#async-traversal) |
| <a id="visitors-and-commands"></a>Visitors and commands | [Read section](docs/reference.md#visitors-and-commands) |
| <a id="pause-and-resume"></a>Pause and resume | [Read section](docs/reference.md#pause-and-resume) |
| <a id="inspection-and-execution"></a>Inspection and execution | [Read section](docs/reference.md#inspection-and-execution) |
| <a id="rewrite-objects"></a>Rewrite objects | [Read section](docs/reference.md#rewrite-objects) |
| <a id="api-compatibility"></a>API compatibility | [Read section](docs/reference.md#api-compatibility) |
| <a id="development"></a>Development | [Read section](docs/reference.md#development) |

MIT licensed.
