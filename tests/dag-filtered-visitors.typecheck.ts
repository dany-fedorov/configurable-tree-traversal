import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import {
  filterDagDataVisitor,
  filterAsyncDagDataVisitor,
} from '../src/traversals/dag-traversal/filterDagVisitor';
import {
  DagTraversal,
  AsyncDagTraversal,
  DagVisitorPhase as Order,
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
  filterDagDataVisitor(isTask, (data, options) => {
    const task: Task = data;
    const context: DagVisitorContext<T, R, Order.ON_WORK_READY, ID> = options;
    const graph: ResolvedGraph<T | R, ID> = options.resolvedGraph;
    const current: Data = options.vertexRef.getValue().getData();
    // @ts-expect-error The live graph remains heterogeneous.
    const invalid: Task = options.vertexRef.getValue().getData();
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

const ready: DagVisitor<T, R, Order.ON_WORK_READY, ID> = filterDagDataVisitor(
  isTask,
  () => ({
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
  }),
);
const asyncReady: AsyncDagVisitor<T, R, Order.ON_WORK_READY, ID> =
  filterAsyncDagDataVisitor(
    isTask,
    async (): Promise<{
      commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION }];
    }> => ({
      commands: [
        { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
      ],
    }),
  );

// Annotated predicates work without contextual registration or generic arguments.
const standalone = filterDagDataVisitor(isTask, (data) => {
  const label: string = data.label;
  void label;
});

traversal.addVisitorFor(
  Order.ON_WORK_READY,
  filterDagDataVisitor(
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
  filterDagDataVisitor(isTask, (data, options) => {
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
  filterDagDataVisitor(isTask, () => ({
    // @ts-expect-error Completion-phase visitors cannot defer ready work.
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
  })),
);
asyncTraversal.addVisitorFor(
  Order.ON_SUBGRAPH_READY,
  filterAsyncDagDataVisitor(
    isTask,
    async (): Promise<{
      commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION }];
    // @ts-expect-error Async completion-phase visitors cannot defer ready work.
    }> => ({
      commands: [
        { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
      ],
    }),
  ),
);
const mixed: DagVisitor<T, R, Order, ID> = filterDagDataVisitor(
  isTask,
  () => ({
    // @ts-expect-error Mixed phase visitors cannot defer ready work.
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
  }),
);
traversal.addVisitorFor(
  Order.ON_WORK_READY,
  // @ts-expect-error A predicate must accept rewritten output data too.
  filterDagDataVisitor(
    (data: Input) => data.kind === 'task',
    () => undefined,
  ),
);
traversal.addVisitorFor(
  Order.ON_SUBGRAPH_READY,
  // @ts-expect-error Completion visitors cannot rewrite child hints.
  filterDagDataVisitor(isTask, () => ({
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
  filterAsyncDagDataVisitor(isTask, async (data, options) => {
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
  filterDagDataVisitor(isTask, async () => undefined),
);
void [ready, asyncReady, standalone, mixed];
