import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import {
  createConditionalDagDataVisitor,
  createConditionalAsyncDagDataVisitor,
} from '../src/traversals/dag-traversal/filterDagVisitor';
import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import type {
  DagVisitor,
  AsyncDagVisitor,
  DagVisitorContext,
} from '../src/traversals/dag-traversal/lib/DagTraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { LiveResolvedGraphView } from '../src/core/ResolvedGraphView';

type Task = { kind: 'task'; label: string };
type Group = { kind: 'group'; title: string };
type Output = { kind: 'result'; count: number };
type Input = Task | Group;
type Data = Input | Output;
type T = VertexDataAndChildHintTypes<Input, string>;
type R = VertexDataAndChildHintTypes<Output, number>;
type ID = { key: string };
const isTask = (data: Data): data is Task => data.kind === 'task';
declare const traversal: DagTraversalBuilder<T, R, ID>;
declare const asyncTraversal: AsyncDagTraversalBuilder<T, R, ID>;

traversal.registerVisitorForPhase(
  Order.ON_WORK_READY,
  createConditionalDagDataVisitor(isTask, (data, options) => {
    const task: Task = data;
    const context: DagVisitorContext<T, R, Order.ON_WORK_READY, ID> = options;
    const graph: LiveResolvedGraphView<T | R, ID> =
      options.liveResolvedGraphView;
    const current: Data = options.vertexHandle
      .getCurrentVertexView()
      .getVertexData();
    // @ts-expect-error The live graph remains heterogeneous.
    const invalid: Task = options.vertexHandle
      .getCurrentVertexView()
      .getVertexData();
    void [task, context, graph, current, invalid];
    return {
      commands: [
        {
          commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
          commandArguments: {
            replacementVertexData: { kind: 'result', count: data.label.length },
          },
        },
        {
          commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
          commandArguments: { replacementChildHints: ['child'] },
        },
      ],
    };
  }),
);

const ready: DagVisitor<T, R, Order.ON_WORK_READY, ID> =
  createConditionalDagDataVisitor(isTask, () => ({
    commands: [
      {
        commandName:
          VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
      },
    ],
  }));
const asyncReady: AsyncDagVisitor<T, R, Order.ON_WORK_READY, ID> =
  createConditionalAsyncDagDataVisitor(
    isTask,
    async (): Promise<{
      commands: [
        {
          commandName: VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION;
        },
      ];
    }> => ({
      commands: [
        {
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    }),
  );

// Annotated predicates work without contextual registration or generic arguments.
const standalone = createConditionalDagDataVisitor(isTask, (data) => {
  const label: string = data.label;
  void label;
});

traversal.registerVisitorForPhase(
  Order.ON_WORK_READY,
  createConditionalDagDataVisitor(
    (data: Data): boolean => data.kind === 'task',
    (data) => {
      const union: Data = data;
      // @ts-expect-error A plain boolean predicate does not narrow the callback.
      const label: string = data.label;
      void [union, label];
    },
  ),
);

traversal.registerVisitorForPhase(
  Order.ON_SUBGRAPH_COMPLETION_READY,
  // @ts-expect-error Narrowed input does not change the output rewrite type.
  createConditionalDagDataVisitor(isTask, (data, options) => {
    const phase: Order.ON_SUBGRAPH_COMPLETION_READY = options.visitorPhase;
    void [data.label, phase];
    return {
      commands: [
        {
          commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
          commandArguments: { replacementVertexData: data },
        },
      ],
    };
  }),
);

traversal.registerVisitorForPhase(
  Order.ON_SUBGRAPH_COMPLETION_READY,
  createConditionalDagDataVisitor(isTask, () => ({
    commands: [
      {
        // @ts-expect-error Completion-phase visitors cannot defer ready work.
        commandName:
          VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
      },
    ],
  })),
);
asyncTraversal.registerVisitorForPhase(
  Order.ON_SUBGRAPH_COMPLETION_READY,
  createConditionalAsyncDagDataVisitor(
    isTask,
    async (): Promise<{
      commands: [
        {
          commandName: VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION;
        },
      ];
      // @ts-expect-error Async completion-phase visitors cannot defer ready work.
    }> => ({
      commands: [
        {
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    }),
  ),
);
const mixed: DagVisitor<T, R, Order, ID> = createConditionalDagDataVisitor(
  isTask,
  () => ({
    commands: [
      {
        // @ts-expect-error Mixed phase visitors cannot defer ready work.
        commandName:
          VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
      },
    ],
  }),
);
traversal.registerVisitorForPhase(
  Order.ON_WORK_READY,
  // @ts-expect-error A predicate must accept rewritten output data too.
  createConditionalDagDataVisitor(
    (data: Input) => data.kind === 'task',
    () => undefined,
  ),
);
traversal.registerVisitorForPhase(
  Order.ON_SUBGRAPH_COMPLETION_READY,
  // @ts-expect-error Completion visitors cannot rewrite child hints.
  createConditionalDagDataVisitor(isTask, () => ({
    commands: [
      {
        commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
        commandArguments: { replacementChildHints: ['child'] },
      },
    ],
  })),
);

asyncTraversal.registerVisitorForPhase(
  Order.ON_WORK_READY,
  createConditionalAsyncDagDataVisitor(isTask, async (data, options) => {
    const context: DagVisitorContext<T, R, Order.ON_WORK_READY, ID> = options;
    void context;
    return {
      commands: [
        {
          commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
          commandArguments: {
            replacementVertexData: { kind: 'result', count: data.label.length },
          },
        },
      ],
    };
  }),
);
traversal.registerVisitorForPhase(
  Order.ON_WORK_READY,
  // @ts-expect-error Sync filtering cannot admit an async callback.
  createConditionalDagDataVisitor(isTask, async () => undefined),
);
void [ready, asyncReady, standalone, mixed];
