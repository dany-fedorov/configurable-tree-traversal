# configurable-tree-traversal

**Know which agent tasks can run next, and which must wait.**

Research can unlock implementation and test planning in parallel; review can wait for both. Give CTT your task graph and accepted completion facts. This TypeScript/JavaScript library computes a dependency-ready frontier and explains blockers. Your host chooses agents, dispatches work, accepts results and keeps durable state.

[Documentation map](docs/index.md) · [Agent workflow guide](docs/agent-workflows.md) · [API reference](docs/reference.md) · [Public symbols](docs/api-index.md) · [Upgrade checklist](docs/migration-api-distinctions.md)

## Start with autonomous agents

| You want to…                                                    | Use CTT for…                                             | Start here                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Coordinate research, implementation, testing, and review agents | Parallel branches and dependency joins                   | [Quickstart](#quickstart-find-the-next-agent-tasks)                                      |
| Let a coordinator choose which agents run next                  | Ready tasks returned as local work tickets               | [Host-controlled execution](docs/agent-workflows.md#choose-an-execution-model)           |
| Resume after a process restart or wait for human input          | Reconstruction from accepted completion facts            | [Recovery and storage](docs/agent-workflows.md#persist-facts-and-reconstruct)            |
| Review a composite task only after all its subtasks finish      | `dependsOnSubgraphCompletion`                            | [Work versus completion](docs/agent-workflows.md#work-dependencies-and-completion-joins) |
| Fetch dependencies from a task catalog or service               | `resolvePrerequisite(id)`                                | [Discover prerequisites](docs/agent-workflows.md#discover-the-graph)                     |
| Explore cyclic context, code references, or provenance          | Lazy typed vertex/edge/path walking with explicit bounds | [Graph exploration](docs/agent-workflows.md#explore-context-and-references)              |
| Walk or transform a repository index, AST, or JSON object       | Iterative sync/async DFS, BFS, pruning, rewriting        | [Tree and object traversal](docs/reference.md#traverse-an-object)                        |

CTT is an in-memory traversal engine. The host owns workflow meaning, agent/tool execution, claims, retries, timeouts, business outcomes, and durable storage. It can use SQLite, another database, or another storage provider without a CTT storage dependency.

## Install

**Release status:** these guides describe an unreleased API. The published **0.11.0** package does not include the preparation and session APIs used below. For its released API, use [0.11.0 on npm](https://www.npmjs.com/package/configurable-tree-traversal/v/0.11.0).

To try the quickstart from **this source checkout**:

```sh
npm ci
npm run tsfile -- examples/quickstart-example.ts
```

The example below uses package imports for consumers of this revision. To use it in another project before release, run `npm run build` and `npm pack --ignore-scripts` in this checkout, then install the resulting local `.tgz` in that project. This builds a local package; it does not publish it. Installing `configurable-tree-traversal@0.11.0` from the registry provides the earlier API.

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
if (prepared.kind === 'invalid') throw new Error('Invalid task graph');

// Simulate completion facts already accepted by the host.
const accepted = new Set(['research']);
const session = prepared.dag.createWorkSession({ completedWork: accepted });
while (true) {
  const boundary = session.advance();
  if (boundary.kind === 'finished') {
    console.log('finished');
    break;
  }
  if (boundary.kind === 'paused') throw new Error('Unexpected pause');
  console.log('ready:', boundary.workTickets.map((t) => t.vertexId).join(', '));
  for (const ticket of boundary.workTickets) {
    // Simulation: a real host dispatches, validates and persists acceptance here.
    accepted.add(ticket.vertexId);
    session.completeWork(ticket);
  }
}
```

```text
ready: implement, testPlan
ready: review
finished
```

**Materialize** turns the collection and its explicit prerequisites into a discovery input. **Prepare** validates that graph once and creates reusable topology.

**Advance** returns tickets for work whose dependencies are satisfied. After the host accepts a result, **completeWork** reports that fact; the next advance can release a dependent task. A ticket is a session-local completion capability, not a distributed claim.

The loop simulates accepted work. A real coordinator filters readiness through claims, waits and capacity, then dispatches and durably accepts results before completing tickets. For that integration, continue with [agent workflows](docs/agent-workflows.md#choose-an-execution-model). The [reference](docs/reference.md#ticket-coordination) covers invalid graphs, local ticket ownership and duplicate reports; the [foundations example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts) demonstrates independent sessions and recovery.

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

Use the [upgrade checklist](docs/migration-api-distinctions.md) for the final naming, ownership and output-presence changes from 0.11.0.
