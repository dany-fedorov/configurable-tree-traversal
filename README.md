# configurable-tree-traversal

**Dependency readiness for agent coordinators, with iterative tree traversal and cyclic graph exploration.**

CTT discovers graphs, schedules callbacks, and explains which prerequisites block work. Your host owns task meaning, agent dispatch, retries, claims, result acceptance, and durable storage.

> **0.13 is a breaking release.** Public names have changed without compatibility aliases. See the [migration from 0.12](docs/migration-explicit-api.md).

## Agent workflows

Research unlocks implementation and test planning; review waits for both:

```text
research ──┬── implement ──┬── review
           └── testPlan ───┘
```

A coordinator can obtain ready work as local settlement tickets, join on a composite's complete retained subgraph, reconstruct progress from accepted facts, or explain blockers without advancing execution. A validated topology can serve independent sessions and can be revised through an atomic declaration batch. See [agent workflows](docs/agent-workflows.md) for dispatch and recovery.

## Start with autonomous agents

| Need                                | CTT contract                                             |
| ----------------------------------- | -------------------------------------------------------- |
| Dispatch ready tasks                | `runUntilWorkBoundary().workSettlementTickets`           |
| Accept externally completed work    | `acceptCompletedWork(ticket)` after host acceptance      |
| Join on all retained subtasks       | `workWaitsForSubgraphCompletionOf`                       |
| Explain a blocker                   | `captureMilestoneSnapshot().explainMilestone(...)`       |
| Recover after process loss          | Rebuild with `acceptedCompletedWorkVertexIds`            |
| Explore references or provenance    | `GraphWalkBuilder` with explicit route policy and bounds |
| Traverse or transform an AST/object | Tree builders and `ObjectPropertyTreeSource`             |

CTT keeps progress in memory. Tickets and settlement tokens are local capabilities; store accepted work facts in your own system.

## Install

```sh
npm install configurable-tree-traversal@^0.13.0
```

Requires Node **22.12.0+**; see [runtime and compiler checks](docs/testing.md). To run the repository examples from source:

```sh
git clone https://github.com/dany-fedorov/configurable-tree-traversal.git
cd configurable-tree-traversal
npm ci
npm run tsfile -- examples/quickstart-example.ts
```

The repository examples import source directly; guide examples use the installed package.

## Quickstart: find the next agent tasks

Declare work prerequisites explicitly, validate the topology, and create an independent external-work session. This example simulates host acceptance of every returned task:

<!-- standalone -->

```ts
import {
  materializeMultiEntryDagInputFromRecordCatalog,
  discoverValidateAndCaptureDag,
} from 'configurable-tree-traversal';

const tasks = [
  { id: 'research', requires: [] },
  { id: 'implement', requires: ['research'] },
  { id: 'testPlan', requires: ['research'] },
  { id: 'review', requires: ['implement', 'testPlan'] },
];
const prepared = discoverValidateAndCaptureDag(
  materializeMultiEntryDagInputFromRecordCatalog(tasks, {
    selectVertexId: (task) => task.id,
    selectWorkPrerequisiteVertexIds: (task) => task.requires,
  }),
);
if (prepared.kind === 'invalid') throw new Error('Invalid task graph');

// Simulate completion facts already accepted by the host.
const accepted = new Set(['research']);
const session = prepared.validatedTopology.createExternalWorkSession({
  acceptedCompletedWorkVertexIds: accepted,
});
while (true) {
  const boundary = session.runUntilWorkBoundary();
  if (boundary.kind === 'finished') {
    console.log('finished');
    break;
  }
  if (boundary.kind === 'paused') throw new Error('Unexpected pause');
  console.log(
    `ready: ${boundary.workSettlementTickets
      .map((t) => t.vertexId)
      .join(', ')}`,
  );
  for (const ticket of boundary.workSettlementTickets) {
    // Simulation: a real host dispatches, validates and persists acceptance here.
    accepted.add(ticket.vertexId);
    session.acceptCompletedWork(ticket);
  }
}
```

```text
ready: implement, testPlan
ready: review
finished
```

Before dispatch, apply host claims, capacity, and waits. Accept the result durably before calling `acceptCompletedWork`. Completion tickets observe dependency readiness; they do not grant distributed ownership. For a blocker explanation, request `{ vertexId: 'review', milestone: 'workCompletion' }` from `captureMilestoneSnapshot().explainMilestone(...)`.

## Second quickstart: walk an object

Tree events identify committed structural visits through `eventKind`; visitor callbacks receive `visitorPhase`.

<!-- standalone -->

```ts
import {
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  ObjectPropertyTreeSource,
} from 'configurable-tree-traversal';

const runner = new DepthFirstTreeTraversalBuilder({
  treeDiscoverySource: new ObjectPropertyTreeSource({ a: { b: 1 }, c: 2 }),
}).createIndependentRunnerFromCurrentOptions();
for (const {
  vertex,
  vertexHandle,
} of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal({
  deliveredEventKinds: [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION],
})) {
  const path = runner
    .getLiveResolvedTreeView()
    .requireStructuralAncestorPathTo(vertexHandle, {
      includeDesignatedRoot: false,
    })
    .map((handle) => handle.getCurrentVertexView().getVertexData().propertyKey);
  console.log(path, vertex.getVertexData().propertyValue);
}
```

```text
[] { a: { b: 1 }, c: 2 }
[ 'a' ] { b: 1 }
[ 'a', 'b' ] 1
[ 'c' ] 2
```

The [reference](docs/reference.md#traverse-an-object) covers child-boundary and completion phases, breadth-first and asynchronous traversal, pruning, and object rewriting.

## Choose your next page

- [Agent workflows](docs/agent-workflows.md): execution models, dispatch, recovery, and revisions.
- [API reference](docs/reference.md): current behavior and exact ownership boundaries.
- [Public symbol index](docs/api-index.md): supported names, signatures, and import paths.
- [Explicit API migration](docs/migration-explicit-api.md): 0.12 to 0.13.
- [Documentation map](docs/index.md): runnable examples and contributor guidance.
- [Changelog](CHANGELOG.md): release history.

## Imports and compatibility

<!-- standalone -->

```ts
import {
  DagTraversalBuilder,
  TraversalVisitorCommandName,
} from 'configurable-tree-traversal';
```

```js
const {
  DagTraversalBuilder,
  TraversalVisitorCommandName,
} = require('configurable-tree-traversal');
```

Native ESM and CommonJS entries share constructors, sentinels, namespaces, and declaration identity. Use the nine explicit runtime entry points; deep engine paths are private. Browser ESM and tree shaking are not promised. See [supported imports](docs/reference.md#supported-imports).

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
