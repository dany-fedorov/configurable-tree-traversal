# configurable-tree-traversal

**Your agents sit idle because the coordinator cannot tell which tasks are ready. Give CTT the task graph and the results you have accepted; it returns the ready set and explains every task that is still waiting.**

```text
research ──┬── implement ──┬── review
           └── testPlan ───┘
```

After `research` is accepted:

```text
ready: implement, testPlan
ready: review
finished
```

Why is `review` still waiting, before anyone starts it? Two unmet dependencies on unfinished work:

```text
[ 'constraint', 'constraint', 'unfinishedWork', 'unfinishedWork' ]
```

No server, no database, no DSL. CTT is an in-memory TypeScript/JavaScript engine; your coordinator keeps dispatch, retries and storage, and can rebuild the same frontier from the facts it stored after any restart.

- **Join on a whole subtree, not one task.** Review starts only after a composite and all of its children complete ([example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-completion-dependencies-example.ts)).
- **Explain blockers without advancing.** Captured dependency snapshots answer "what is this waiting for" and "what depends on this" ([example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-inspection-example.ts)).
- **Restart from accepted facts.** A fresh session seeded with the same completed work yields the same ready set ([example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/dag-reconciliation-example.ts)).
- **Walk cyclic reference graphs with explicit bounds**, and traverse objects, ASTs and abstract trees without recursion ([walking](docs/agent-workflows.md#explore-context-and-references), [trees](#second-quickstart-walk-an-object)).

Readiness for a 10,000-task graph in 60 to 200 ms on a laptop ([benchmarks](docs/reference.md#benchmark-results)). 3133 tests, 100% coverage, one runtime dependency.

[Quickstart](#quickstart-find-the-next-agent-tasks) · [Documentation map](docs/index.md) · [Agent workflow guide](docs/agent-workflows.md) · [API reference](docs/reference.md) · [Public symbols](docs/api-index.md)

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

## Install

```sh
npm install configurable-tree-traversal
```

Upgrading from 0.11.0? The API changed; follow the [upgrade checklist](docs/migration-api-distinctions.md).

To run the examples from a source checkout instead:

```sh
npm ci
npm run tsfile -- examples/quickstart-example.ts
```

Requires Node **22.12.0+**, or Bun **1.4.4**. CI covers the minimum Node runtime, current Node 22/24, and Bun. CI checks TypeScript consumers with the locked 4.9.5 compiler. The packed consumers also compile under 4.7.4 when `CTT_TYPESCRIPT_COMPILER` points at that compiler (see the [testing guide](docs/testing.md)).

## Quickstart: find the next agent tasks

After `research` completes, `implement` and `testPlan` can run independently. `review` waits for both. Supply a flat task collection with explicit work dependencies:

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

Ask why a task is still waiting without advancing. On the same graph, before any ticket is completed, review is blocked by two work constraints and two unfinished prerequisites:

<!-- standalone -->

```ts
import {
  materializeDagInputFromRecords,
  prepareDag,
} from 'configurable-tree-traversal';

const prepared = prepareDag(
  materializeDagInputFromRecords(
    [
      { id: 'research', requires: [] },
      { id: 'implement', requires: ['research'] },
      { id: 'testPlan', requires: ['research'] },
      { id: 'review', requires: ['implement', 'testPlan'] },
    ],
    { id: (task) => task.id, dependsOnWork: (task) => task.requires },
  ),
);
if (prepared.kind === 'invalid') throw new Error('Invalid task graph');
const session = prepared.dag.createWorkSession({
  completedWork: new Set(['research']),
});
session.advance();
const explanation = session
  .inspectMilestones()
  .explain({ vertexId: 'review', milestone: 'work' });
if (explanation.kind === 'live') {
  console.log('satisfied:', explanation.satisfied);
  console.log(explanation.blockers.map((blocker) => blocker.kind));
}
```

```text
satisfied: false
[ 'constraint', 'constraint', 'unfinishedWork', 'unfinishedWork' ]
```

**Materialize** turns the collection and its explicit prerequisites into a discovery input. **Prepare** discovers and validates the graph, then retains reusable topology; independent sessions reuse those facts without calling the original source again.

**Advance** returns tickets for work whose dependencies are satisfied. After the host accepts a result, **completeWork** reports that fact; the next advance can release a dependent task. A ticket is a session-local completion capability, not a distributed claim.

The loop simulates accepted work. A real coordinator filters readiness through claims, waits and capacity, then dispatches and durably accepts results before completing tickets. For that integration, continue with [agent workflows](docs/agent-workflows.md#choose-an-execution-model). The reference covers [invalid graphs](docs/reference.md#validation-results-and-failures) and [local ticket ownership and duplicate reports](docs/reference.md#ticket-coordination); the [foundations example](https://github.com/dany-fedorov/configurable-tree-traversal/blob/main/examples/agent-api-foundations-example.ts) demonstrates independent sessions and recovery.

## Second quickstart: walk an object

The same engine traverses plain objects, abstract trees and ASTs. Depth-first pre-order over a nested object, printing each path:

<!-- standalone -->

```ts
import {
  DepthFirstTreeTraversal,
  DepthFirstPhase,
  ObjectTreeSource,
} from 'configurable-tree-traversal';

const traversal = new DepthFirstTreeTraversal({
  traversableTree: new ObjectTreeSource({ a: { b: 1 }, c: 2 }),
});

const runner = traversal.createRunner();
for (const { vertex, vertexRef } of runner.iterateEvents({
  emitEvents: [DepthFirstPhase.PRE_ORDER],
})) {
  const path = runner
    .getResolvedTreeView()
    .requirePathTo(vertexRef, { noRoot: true })
    .map((ref) => ref.getValue().getData().key);
  console.log(path, vertex.getData().value);
}
```

```text
[] { a: { b: 1 }, c: 2 }
[ 'a' ] { b: 1 }
[ 'a', 'b' ] 1
[ 'c' ] 2
```

Three visit orders (pre, in, post), breadth-first, async adapters, pruning with `SKIP_REMAINING_CHILDREN`, hint rewriting and object rewriting are covered in the [reference](docs/reference.md#traverse-an-object).

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

<details>
<summary>Legacy README anchors</summary>

Older links to README sections now resolve to the [reference](docs/reference.md). <a id="dag-traversal"></a><a id="discovery-and-execution-as-separate-phases"></a><a id="discovery-and-completed-work"></a><a id="deferred-dag-progress-and-reconciliation"></a><a id="host-policy-and-traversal-feedback"></a><a id="traverse-an-object"></a><a id="abstract-trees"></a><a id="traversal-orders"></a><a id="breadth-first-traversal"></a><a id="async-traversal"></a><a id="visitors-and-commands"></a><a id="pause-and-resume"></a><a id="inspection-and-execution"></a><a id="rewrite-objects"></a><a id="api-compatibility"></a><a id="development"></a>

| Topic                                      | Detailed guidance                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| DAG traversal                              | [Read section](docs/reference.md#dag-traversal)                              |
| Discovery and execution as separate phases | [Read section](docs/reference.md#discovery-and-execution-as-separate-phases) |
| Discovery and completed work               | [Read section](docs/reference.md#discovery-and-completed-work)               |
| Deferred DAG progress and reconciliation   | [Read section](docs/reference.md#deferred-dag-progress-and-reconciliation)   |
| Host policy and traversal feedback         | [Read section](docs/reference.md#host-policy-and-traversal-feedback)         |
| Traverse an object                         | [Read section](docs/reference.md#traverse-an-object)                         |
| Abstract trees                             | [Read section](docs/reference.md#abstract-trees)                             |
| Traversal orders                           | [Read section](docs/reference.md#traversal-orders)                           |
| Breadth-first traversal                    | [Read section](docs/reference.md#breadth-first-traversal)                    |
| Async traversal                            | [Read section](docs/reference.md#async-traversal)                            |
| Visitors and commands                      | [Read section](docs/reference.md#visitors-and-commands)                      |
| Pause and resume                           | [Read section](docs/reference.md#pause-and-resume)                           |
| Inspection and execution                   | [Read section](docs/reference.md#inspection-and-execution)                   |
| Rewrite objects                            | [Read section](docs/reference.md#rewrite-objects)                            |
| API compatibility                          | [Read section](docs/reference.md#api-compatibility)                          |
| Development                                | [Read section](docs/reference.md#development)                                |

</details>

MIT licensed.

Use the [upgrade checklist](docs/migration-api-distinctions.md) for the final naming, ownership and output-presence changes from 0.11.0.
