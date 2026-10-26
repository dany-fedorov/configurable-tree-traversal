import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
  DEFER_READY,
} from '../src/traversals/dag-traversal';
import {
  filterDagVisitor,
  filterAsyncDagVisitor,
} from '../src/traversals/dag-traversal/filterDagVisitor';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import type { DagDiscoverySource } from '../src/core/TraversableGraph';

type Task = { kind: 'task'; label: string };
type Group = { kind: 'group'; title: string };
type Data = Task | Group;
type G = VertexTypes<Data, string>;
const group: Group = { kind: 'group', title: 'group' };
const task: Task = { kind: 'task', label: 'task' };
const isTask = (data: Data): data is Task => data.kind === 'task';
const source: DagDiscoverySource<G, G, string> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: {
      vertexId: 'group',
      vertexContent: { $data: group, $childHints: ['task'] },
    },
  }),
  resolveChild: () => ({
    kind: 'found',
    vertex: {
      vertexId: 'task',
      vertexContent: { $data: task, $childHints: [] },
    },
  }),
};

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} filters data while preserving command results and context`, async () => {
    const traversal = new Constructor<G, G, string>({
      traversableGraph: source,
    });
    const seen: unknown[] = [];
    traversal.addVisitorFor(
      Order.ON_READY,
      filterDagVisitor(isTask, (data, options) => {
        seen.push(data, options.order, options.vertexRef.unref().getData());
        expect(options.resolvedGraph.getVertexId(options.vertexRef)).toBe(
          'task',
        );
        expect(options.visitorRecord.priority).toBe(12);
        return {
          commands: [
            {
              commandName: Command.REWRITE_VERTEX_DATA,
              commandArguments: {
                newData: { kind: 'task', label: data.label.toUpperCase() },
              },
            },
            {
              commandName: Command.SET_VERTEX_VISITORS_CHAIN_STATE,
              commandArguments: { vertexVisitorsChainState: data },
            },
          ],
        };
      }),
      { priority: 12 },
    );
    traversal.addVisitorFor(
      Order.ON_READY,
      filterDagVisitor(
        (data: Data) => data.kind === 'task',
        (data, options) => {
          expect(data).toEqual({ kind: 'task', label: 'TASK' });
          expect(options.vertexVisitorsChainState).toBe(task);
          seen.push('after');
        },
      ),
      { priority: 1 },
    );
    const runner = traversal.createRunner();
    await runner.run();
    expect(seen).toEqual([task, Order.ON_READY, task, 'after']);
    expect(
      runner.getResolvedGraph().getVertexRefById('group')!.unref().getData(),
    ).toBe(group);
    expect(
      runner.getResolvedGraph().getVertexRefById('task')!.unref().getData(),
    ).toEqual({ kind: 'task', label: 'TASK' });
  });

  test(`${Constructor.name} forwards filtered deferral without running later visitors`, async () => {
    const traversal = new Constructor<G, G, string>({
      traversableGraph: source,
    });
    const after: string[] = [];
    traversal.addVisitorFor(
      Order.ON_READY,
      filterDagVisitor(isTask, () => DEFER_READY),
    );
    traversal.addVisitorFor(Order.ON_READY, (_, options) => {
      after.push(options.resolvedGraph.getVertexId(options.vertexRef));
    });
    const runner = traversal.createRunner();
    await runner.run();
    expect(after).toEqual(['group']);
    expect(runner.summary().deferredIds).toEqual(['task']);
    runner.settle(
      'task',
      { ok: true },
      runner.summary().deferredFrontier[0]!.generation,
    );
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual(['group', 'task']);
  });

  test.each(['predicate', 'callback'] as const)(
    `${Constructor.name} preserves exact %s errors`,
    async (where) => {
      const error = { where };
      const traversal = new Constructor<G, G, string>({
        traversableGraph: source,
      });
      traversal.addVisitorFor(
        Order.ON_READY,
        filterDagVisitor(
          (data: Data) => {
            if (where === 'predicate') throw error;
            return isTask(data);
          },
          () => {
            throw error;
          },
        ),
      );
      const runner = traversal.createRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
    },
  );
}

test('async filtered callbacks await commands and preserve rejected values', async () => {
  const traversal = new AsyncDagTraversal<G, G, string>({
    traversableGraph: source,
  });
  traversal.addVisitorFor(
    Order.ON_READY,
    filterAsyncDagVisitor(isTask, async (data) => {
      await Promise.resolve();
      return {
        commands: [
          {
            commandName: Command.REWRITE_VERTEX_DATA,
            commandArguments: {
              newData: { kind: 'task', label: `${data.label}!` },
            },
          },
        ],
      };
    }),
  );
  const runner = traversal.createRunner();
  await runner.run();
  expect(
    runner.getResolvedGraph().getVertexRefById('task')!.unref().getData(),
  ).toEqual({ kind: 'task', label: 'task!' });
  traversal.addVisitorFor(
    Order.ON_COMPLETE,
    filterAsyncDagVisitor(isTask, async () => {
      throw undefined;
    }),
  );
  await expect(traversal.createRunner().run()).rejects.toBeUndefined();
});

test('async filtering preserves deferral after awaited host work', async () => {
  const traversal = new AsyncDagTraversal<G, G, string>({
    traversableGraph: source,
  });
  traversal.addVisitorFor(
    Order.ON_READY,
    filterAsyncDagVisitor(isTask, async (): Promise<typeof DEFER_READY> => {
      await Promise.resolve();
      return DEFER_READY;
    }),
  );
  const runner = traversal.createRunner();
  await runner.run();
  expect(runner.summary().deferredIds).toEqual(['task']);
  runner.settle(
    'task',
    { ok: true },
    runner.summary().deferredFrontier[0]!.generation,
  );
  await runner.run();
  expect(runner.summary().completedWorkIds).toEqual(['group', 'task']);
});

test.each(['predicate', 'callback'] as const)(
  'async filter preserves exact synchronous %s errors',
  async (where) => {
    const error = { where };
    const traversal = new AsyncDagTraversal<G, G, string>({
      traversableGraph: source,
    });
    traversal.addVisitorFor(
      Order.ON_READY,
      filterAsyncDagVisitor(
        (data: Data) => {
          if (where === 'predicate') throw error;
          return isTask(data);
        },
        () => {
          throw error;
        },
      ),
    );
    await expect(traversal.createRunner().run()).rejects.toBe(error);
  },
);
