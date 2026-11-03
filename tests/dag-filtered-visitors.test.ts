import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import {
  DagTraversalBuilder,
  AsyncDagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import {
  createConditionalDagDataVisitor,
  createConditionalAsyncDagDataVisitor,
} from '../src/traversals/dag-traversal/filterDagVisitor';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';

type Task = { kind: 'task'; label: string };
type Group = { kind: 'group'; title: string };
type Data = Task | Group;
type G = VertexDataAndChildHintTypes<Data, string>;
const group: Group = { kind: 'group', title: 'group' };
const task: Task = { kind: 'task', label: 'task' };
const isTask = (data: Data): data is Task => data.kind === 'task';
const source: DagDiscoverySource<G, G, string> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: 'group',
      vertexContentInput: {
        $vertexData: group,
        $childDiscoveryHints: ['task'],
      },
    },
  }),
  resolveChildHint: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: 'task',
      vertexContentInput: { $vertexData: task, $childDiscoveryHints: [] },
    },
  }),
};

for (const Constructor of [DagTraversalBuilder, AsyncDagTraversalBuilder]) {
  test(`${Constructor.name} filters data while preserving command results and context`, async () => {
    const traversal = new Constructor<G, G, string>({
      dagDiscoverySource: source,
    });
    const seen: unknown[] = [];
    traversal.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      createConditionalDagDataVisitor(isTask, (data, options) => {
        seen.push(
          data,
          options.visitorPhase,
          options.vertexHandle.getCurrentVertexView().getVertexData(),
        );
        expect(
          options.liveResolvedGraphView.requireVertexId(options.vertexHandle),
        ).toBe('task');
        expect(
          options.visitorRegistrationMetadata
            .descendingExecutionPriorityWithinGroup,
        ).toBe(12);
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: {
                replacementVertexData: {
                  kind: 'task',
                  label: data.label.toUpperCase(),
                },
              },
            },
            {
              commandName: Command.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
              commandArguments: { phaseChainState: data },
            },
          ],
        };
      }),
      { descendingExecutionPriorityWithinGroup: 12 },
    );
    traversal.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      createConditionalDagDataVisitor(
        (data: Data) => data.kind === 'task',
        (data, options) => {
          expect(data).toEqual({ kind: 'task', label: 'TASK' });
          expect(options.currentVertexPhaseChainState).toBe(task);
          seen.push('after');
        },
      ),
      { descendingExecutionPriorityWithinGroup: 1 },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(seen).toEqual([task, Order.ON_WORK_READY, task, 'after']);
    expect(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull('group')!
        .getCurrentVertexView()
        .getVertexData(),
    ).toBe(group);
    expect(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull('task')!
        .getCurrentVertexView()
        .getVertexData(),
    ).toEqual({ kind: 'task', label: 'TASK' });
  });

  test(`${Constructor.name} forwards filtered deferral without running later visitors`, async () => {
    const traversal = new Constructor<G, G, string>({
      dagDiscoverySource: source,
    });
    const after: string[] = [];
    traversal.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      createConditionalDagDataVisitor(isTask, () => ({
        commands: [
          {
            commandName:
              VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
          },
        ],
      })),
    );
    traversal.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      (_, options) => {
        after.push(
          options.liveResolvedGraphView.requireVertexId(options.vertexHandle),
        );
      },
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expect(after).toEqual(['group']);
    expect(
      runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
    ).toEqual(['task']);
    runner.settleDeferredWork(
      'task',
      { kind: 'workCompleted' },
      runner.captureProgressSnapshot().workAwaitingSettlement[0]!
        .settlementToken,
    );
    await runner.runUntilSuspendedOrTerminal();
    expect(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
    ).toEqual(['group', 'task']);
  });

  test.each(['predicate', 'callback'] as const)(
    `${Constructor.name} preserves exact %s errors`,
    async (where) => {
      const error = { where };
      const traversal = new Constructor<G, G, string>({
        dagDiscoverySource: source,
      });
      traversal.registerVisitorCallbackForPhase(
        Order.ON_WORK_READY,
        createConditionalDagDataVisitor(
          (data: Data) => {
            if (where === 'predicate') throw error;
            return isTask(data);
          },
          () => {
            throw error;
          },
        ),
      );
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
    },
  );
}

test('async filtered callbacks await commands and preserve rejected values', async () => {
  const traversal = new AsyncDagTraversalBuilder<G, G, string>({
    dagDiscoverySource: source,
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    createConditionalAsyncDagDataVisitor(isTask, async (data) => {
      await Promise.resolve();
      return {
        commands: [
          {
            commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: {
              replacementVertexData: { kind: 'task', label: `${data.label}!` },
            },
          },
        ],
      };
    }),
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  expect(
    runner
      .getLiveResolvedGraphView()
      .getVertexHandleByIdOrNull('task')!
      .getCurrentVertexView()
      .getVertexData(),
  ).toEqual({ kind: 'task', label: 'task!' });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_SUBGRAPH_COMPLETION_READY,
    createConditionalAsyncDagDataVisitor(isTask, async () => {
      throw undefined;
    }),
  );
  await expect(
    traversal
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal(),
  ).rejects.toBeUndefined();
});

test('async filtering preserves deferral after awaited host work', async () => {
  const traversal = new AsyncDagTraversalBuilder<G, G, string>({
    dagDiscoverySource: source,
  });
  traversal.registerVisitorCallbackForPhase(
    Order.ON_WORK_READY,
    createConditionalAsyncDagDataVisitor(
      isTask,
      async (): Promise<{
        commands: [
          {
            commandName: VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION;
          },
        ];
      }> => {
        await Promise.resolve();
        return {
          commands: [
            {
              commandName:
                VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
            },
          ],
        };
      },
    ),
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  await runner.runUntilSuspendedOrTerminal();
  expect(
    runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
  ).toEqual(['task']);
  runner.settleDeferredWork(
    'task',
    { kind: 'workCompleted' },
    runner.captureProgressSnapshot().workAwaitingSettlement[0]!.settlementToken,
  );
  await runner.runUntilSuspendedOrTerminal();
  expect(
    runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
  ).toEqual(['group', 'task']);
});

test.each(['predicate', 'callback'] as const)(
  'async filter preserves exact synchronous %s errors',
  async (where) => {
    const error = { where };
    const traversal = new AsyncDagTraversalBuilder<G, G, string>({
      dagDiscoverySource: source,
    });
    traversal.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      createConditionalAsyncDagDataVisitor(
        (data: Data) => {
          if (where === 'predicate') throw error;
          return isTask(data);
        },
        () => {
          throw error;
        },
      ),
    );
    await expect(
      traversal
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    ).rejects.toBe(error);
  },
);
