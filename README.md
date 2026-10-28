# configurable-tree-traversal

**Dependency-aware building blocks for autonomous-agent workflows, plus general graph and tree traversal for TypeScript and JavaScript.**

Give CTT a graph of work and accepted completion facts. It determines what can run next, enforces work and structural-completion dependencies, and exposes progress without executing business work. Your host chooses agents, dispatches tasks, accepts results, and persists state.

[Documentation map](docs/index.md) · [Agent workflow guide](docs/agent-workflows.md) · [API reference](docs/reference.md) · [Idiomatic API migration](docs/migration-idiomatic-api.md) · [API naming migration](docs/migration-api-clarity.md) · [Uniform API migration](docs/migration-uniform-api.md) · [npm](https://www.npmjs.com/package/configurable-tree-traversal)

## Start with autonomous agents

| You want to…                                                    | Use CTT for…                                             | Start here                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Coordinate research, implementation, testing, and review agents | Parallel branches and dependency joins                   | [Quickstart](#quickstart-find-the-next-agent-tasks)                                      |
| Let a coordinator choose which agents run next                  | Deferred work and generation-bearing dispatch records    | [Host-controlled execution](docs/agent-workflows.md#choose-an-execution-model)           |
| Resume after a process restart or wait for human input          | Reconstruction from accepted completion facts            | [Recovery and storage](docs/agent-workflows.md#persist-facts-and-reconstruct)            |
| Review a composite task only after all its subtasks finish      | `dependsOnSubgraphCompletion`                            | [Work versus completion](docs/agent-workflows.md#work-dependencies-and-completion-joins) |
| Fetch dependencies from a task catalog or service               | `resolvePrerequisite(id)`                                | [Discover prerequisites](docs/agent-workflows.md#discover-the-graph)                     |
| Explore cyclic context, code references, or provenance          | Lazy typed vertex/edge/path walking with explicit bounds | [Graph exploration](docs/agent-workflows.md#explore-context-and-references)              |
| Walk or transform a repository index, AST, or JSON object       | Iterative sync/async DFS, BFS, pruning, rewriting        | [Tree and object traversal](docs/reference.md#traverse-an-object)                        |

CTT is an in-memory traversal engine. The host owns workflow meaning, agent/tool execution, claims, retries, timeouts, business outcomes, and durable storage. It can use SQLite, another database, or another storage provider without a CTT storage dependency.

## Install

```sh
npm install configurable-tree-traversal
```

Requires Node **22.12.0+**, or Bun **1.4.4**. CI covers the minimum Node runtime, current Node 22/24, and Bun. TypeScript consumers are checked with 4.7.4 and 4.9.5.

## Quickstart: find the next agent tasks

After `research` completes, `implement` and `testPlan` can run independently. `review` waits for both. Supply a flat task collection with explicit work dependencies:

```text
research ──┬── implement ──┬── review
           └── testPlan ───┘
```

<!-- standalone -->

```ts
import {
  materializeDagInputFromRecords,
  prepareDag,
} from 'configurable-tree-traversal';

const tasks = [
  { id: 'research', requires: [] },
  { id: 'implement', requires: ['research'] },
  { id: 'testPlan', requires: ['research'] },
  { id: 'review', requires: ['implement', 'testPlan'] },
];
const prepared = prepareDag(
  materializeDagInputFromRecords(tasks, {
    id: (task) => task.id,
    dependsOnWork: (task) => task.requires,
  }),
);
if (prepared.kind === 'invalid')
  throw new Error('Invalid dependency constraints');

// In-memory stand-in for completion facts already accepted by the host.
const accepted = new Set(['research']);
const session = prepared.dag.createWorkSession({ completedWork: accepted });
const boundary = session.advance();
if (boundary.kind === 'awaitingSettlement') {
  if (
    boundary.workTickets.map((ticket) => ticket.vertexId).join(',') !==
    'implement,testPlan'
  ) {
    throw new Error('Unexpected ready tasks');
  }
  // Retain each frontier ticket with its host attempt.
  const ticket = boundary.workTickets[0]!;
  // Dispatch through host claims/capacity, then validate and persist the result.
  accepted.add(ticket.vertexId); // Simulate durable acceptance.
  session.completeWork(ticket); // { kind: 'accepted' }
  const next = session.advance(); // Observe newly eligible work.
  if (next.kind !== 'awaitingSettlement')
    throw new Error('Expected pending work');
}
```

`materializeDagInputFromRecords` returns a `MaterializedDagInput` envelope (`traversableGraph` plus `syntheticRoot: true`) and copies collection membership and edge lists while sharing task data. `prepareDag` eagerly discovers and validates without executing work. Dependency validation failures and engine-discovered structural cycles return `invalid`; exact source failures and malformed inputs throw (see [preparation errors](docs/reference.md#reusable-prepared-dags)). Its reusable definition creates independent sessions without repeating source I/O. A session uses external settlement: `advance()` returns work tickets, `paused`, or `finished`; `completeWork(ticket)` accepts work without dispatching agents. Dispatch from `advance().workTickets` tickets; `ON_WORK_READY` visitors can also start work before deferral. `workCompleted` iterator events report work **after** commitment, so they are observations, not dispatch requests. Tickets belong to the issuing session and stay local. The host owns claims, durable acceptance, retries, and recovery from accepted facts. Build reusable workflow shapes with [typed fragments and explicit W/C composition](docs/reference.md#dag-fragments-and-composition).

See the [workflow guide](docs/agent-workflows.md#accept-results-and-resume) and [executable example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts) for independent sessions, duplicate reports, and recovery. Custom graph adapters and existing `runner.prepare()` / guarded `settle()` APIs remain available.

## Choose your next page

- **Integrating an agent coordinator:** [Agent workflows](docs/agent-workflows.md), including execution models, persistence, retries, and common mistakes.
- **Looking up a contract:** [API and behavior reference](docs/reference.md), including tree traversal, commands, identity, errors, and async semantics.
- **Finding runnable code or source:** [Documentation index](docs/index.md).
- **Changing CTT:** [Repository agent guide](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/AGENTS.md) and [testing guide](docs/testing.md).
- **Checking releases:** [Changelog](CHANGELOG.md).

## Imports and compatibility

<!-- standalone -->

```ts
import {
  DagTraversal,
  TraversalVisitorCommandName,
} from 'configurable-tree-traversal';
```

```js
const {
  DagTraversal,
  TraversalVisitorCommandName,
} = require('configurable-tree-traversal');
```

Native ESM `.mjs` entries and `.d.mts` declarations share one CommonJS implementation and canonical types. Named/default imports, classes, namespaces, and commands preserve identity across loaders. ESM entries use Node-compatible `createRequire`; standalone browser ESM and tree shaking are not promised. Nine explicit runtime entry points are supported; historical deep imports are blocked; see [compatibility details](docs/reference.md#api-compatibility).

## Reference shortcuts

Existing README section links land here; each topic now has a dedicated location in the reference.

| Topic                                                                                             | Detailed guidance                                                            |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| <a id="dag-traversal"></a>DAG traversal                                                           | [Read section](docs/reference.md#dag-traversal)                              |
| <a id="discovery-and-execution-as-separate-phases"></a>Discovery and execution as separate phases | [Read section](docs/reference.md#discovery-and-execution-as-separate-phases) |
| <a id="discovery-and-completed-work"></a>Discovery and completed work                             | [Read section](docs/reference.md#discovery-and-completed-work)               |
| <a id="deferred-dag-progress-and-reconciliation"></a>Deferred DAG progress and reconciliation     | [Read section](docs/reference.md#deferred-dag-progress-and-reconciliation)   |
| <a id="host-policy-and-traversal-feedback"></a>Host policy and traversal feedback                 | [Read section](docs/reference.md#host-policy-and-traversal-feedback)         |
| <a id="traverse-an-object"></a>Traverse an object                                                 | [Read section](docs/reference.md#traverse-an-object)                         |
| <a id="abstract-trees"></a>Abstract trees                                                         | [Read section](docs/reference.md#abstract-trees)                             |
| <a id="traversal-orders"></a>Traversal orders                                                     | [Read section](docs/reference.md#traversal-orders)                           |
| <a id="breadth-first-traversal"></a>Breadth-first traversal                                       | [Read section](docs/reference.md#breadth-first-traversal)                    |
| <a id="async-traversal"></a>Async traversal                                                       | [Read section](docs/reference.md#async-traversal)                            |
| <a id="visitors-and-commands"></a>Visitors and commands                                           | [Read section](docs/reference.md#visitors-and-commands)                      |
| <a id="pause-and-resume"></a>Pause and resume                                                     | [Read section](docs/reference.md#pause-and-resume)                           |
| <a id="inspection-and-execution"></a>Inspection and execution                                     | [Read section](docs/reference.md#inspection-and-execution)                   |
| <a id="rewrite-objects"></a>Rewrite objects                                                       | [Read section](docs/reference.md#rewrite-objects)                            |
| <a id="api-compatibility"></a>API compatibility                                                   | [Read section](docs/reference.md#api-compatibility)                          |
| <a id="development"></a>Development                                                               | [Read section](docs/reference.md#development)                                |

MIT licensed.
