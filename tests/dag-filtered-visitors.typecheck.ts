import {
  filterDagVisitor,
  filterAsyncDagVisitor,
} from '../src/traversals/dag-traversal/filterDagVisitor';
import {
  DagTraversal,
  AsyncDagTraversal,
  DagVisitorPhase as Order,
  DEFER_READY,
} from '../src/traversals/dag-traversal';
import type {
  DagVisitor,
  AsyncDagVisitor,
  DagVisitorContext,
} from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { ResolvedGraph } from '../src/core/ResolvedGraph';

type Task = { kind: 'task'; label: string };
type Group = { kind: 'group'; title: string };
type Output = { kind: 'result'; count: number };
type Input = Task | Group;
type Data = Input | Output;
type T = VertexTypes<Input, string>;
type R = VertexTypes<Output, number>;
type ID = { key: string };
const isTask = (data: Data): data is Task => data.kind === 'task';
declare const traversal: DagTraversal<T, R, ID>;
declare const asyncTraversal: AsyncDagTraversal<T, R, ID>;

traversal.addVisitorFor(
  Order.ON_WORK_READY,
  filterDagVisitor(isTask, (data, options) => {
    const task: Task = data;
    const context: DagVisitorContext<T, R, Order.ON_WORK_READY, ID> = options;
    const graph: ResolvedGraph<T | R, ID> = options.resolvedGraph;
    const current: Data = options.vertexRef.unref().getData();
    // @ts-expect-error The live graph remains heterogeneous.
    const invalid: Task = options.vertexRef.unref().getData();
    void [task, context, graph, current, invalid];
    return {
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: {
            newData: { kind: 'result', count: data.label.length },
          },
        },
        {
          commandName: Command.REWRITE_CHILD_HINTS,
          commandArguments: { newHints: [1] },
        },
      ],
    };
  }),
);

const ready: DagVisitor<T, R, Order.ON_WORK_READY, ID> = filterDagVisitor(
  isTask,
  () => DEFER_READY,
);
const asyncReady: AsyncDagVisitor<T, R, Order.ON_WORK_READY, ID> =
  filterAsyncDagVisitor(
    isTask,
    async (): Promise<typeof DEFER_READY> => DEFER_READY,
  );

// Annotated predicates work without contextual registration or generic arguments.
const standalone = filterDagVisitor(isTask, (data) => {
  const label: string = data.label;
  void label;
});

traversal.addVisitorFor(
  Order.ON_WORK_READY,
  filterDagVisitor(
    (data: Data): boolean => data.kind === 'task',
    (data) => {
      const union: Data = data;
      // @ts-expect-error A plain boolean predicate does not narrow the callback.
      const label: string = data.label;
      void [union, label];
    },
  ),
);

traversal.addVisitorFor(
  Order.ON_SUBGRAPH_READY,
  // @ts-expect-error Narrowed input does not change the output rewrite type.
  filterDagVisitor(isTask, (data, options) => {
    const phase: Order.ON_SUBGRAPH_READY = options.phase;
    void [data.label, phase];
    return {
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: { newData: data },
        },
      ],
    };
  }),
);

traversal.addVisitorFor(
  Order.ON_SUBGRAPH_READY,
  // @ts-expect-error Completion-phase visitors cannot defer ready work.
  filterDagVisitor(isTask, () => DEFER_READY),
);
asyncTraversal.addVisitorFor(
  Order.ON_SUBGRAPH_READY,
  filterAsyncDagVisitor(
    isTask,
    // @ts-expect-error Async completion-phase visitors cannot defer ready work.
    async (): Promise<typeof DEFER_READY> => DEFER_READY,
  ),
);
const mixed: DagVisitor<T, R, Order, ID> = filterDagVisitor(
  isTask,
  // @ts-expect-error Mixed phase visitors cannot defer ready work.
  () => DEFER_READY,
);
traversal.addVisitorFor(
  Order.ON_WORK_READY,
  // @ts-expect-error A predicate must accept rewritten output data too.
  filterDagVisitor(
    (data: Input) => data.kind === 'task',
    () => undefined,
  ),
);
traversal.addVisitorFor(
  Order.ON_SUBGRAPH_READY,
  // @ts-expect-error Completion visitors cannot rewrite child hints.
  filterDagVisitor(isTask, () => ({
    commands: [
      {
        commandName: Command.REWRITE_CHILD_HINTS,
        commandArguments: { newHints: [1] },
      },
    ],
  })),
);

asyncTraversal.addVisitorFor(
  Order.ON_WORK_READY,
  filterAsyncDagVisitor(isTask, async (data, options) => {
    const context: DagVisitorContext<T, R, Order.ON_WORK_READY, ID> = options;
    void context;
    return {
      commands: [
        {
          commandName: Command.REWRITE_VERTEX_DATA,
          commandArguments: {
            newData: { kind: 'result', count: data.label.length },
          },
        },
      ],
    };
  }),
);
traversal.addVisitorFor(
  Order.ON_WORK_READY,
  // @ts-expect-error Sync filtering cannot admit an async callback.
  filterDagVisitor(isTask, async () => undefined),
);
void [ready, asyncReady, standalone, mixed];
