import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncBreadthFirstTreeTraversal,
  BreadthFirstTreeTraversal,
} from '../src/traversals/breadth-first-traversal';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import {
  AsyncDepthFirstTreeTraversal,
  DepthFirstTreeTraversal,
} from '../src/traversals/depth-first-traversal';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import {
  createInternalAsyncBreadthFirstTreeTraversal,
  createInternalAsyncDagTraversal,
  createInternalAsyncDepthFirstTreeTraversal,
  createInternalBreadthFirstTreeTraversal,
  createInternalDagTraversal,
  createInternalDepthFirstTreeTraversal,
  runnerInternals,
} from './internal-runner-fixtures';

type G = VertexTypes<string, string>;
const tree = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'A', $childHints: ['B'] } },
  }),
  resolveChild: () => ({
    kind: 'found' as const,
    vertex: { vertexContent: { $data: 'B', $childHints: [] } },
  }),
};
const graph = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: {
      vertexId: 'A',
      vertexContent: { $data: 'A', $childHints: [] },
    },
  }),
  resolveChild: tree.resolveChild,
};
function expectReason(
  runner: {
    getStopReason(): import('../src').TraversalStopReason | null;
    inspect(): object;
  },
  expected: string | null,
) {
  expect(runner.getStopReason()).toBe(expected);
  expect(runner.inspect()).toHaveProperty('stopReason', expected);
}

for (const Constructor of [
  DepthFirstTreeTraversal<G>,
  BreadthFirstTreeTraversal<G>,
  DagTraversal<G>,
  AsyncDepthFirstTreeTraversal<G>,
  AsyncBreadthFirstTreeTraversal<G>,
  AsyncDagTraversal<G>,
]) {
  test(`${Constructor.name} reports initial, running, iterator pause, resume, and finish boundaries`, async () => {
    const runner = new Constructor({ traversableTree: tree }).createRunner();
    expectReason(runner, null);
    for await (const event of runner.iterateEvents()) {
      expect(event.vertex.getData()).toBe('A');
      expectReason(runner, null);
      break;
    }
    expectReason(runner, 'paused');
    for await (const event of runner.iterateEvents()) {
      expect(event.vertex).toBeDefined();
      expectReason(runner, null);
    }
    expectReason(runner, 'finished');
    expect(await runner.run()).toBe(runner);
    expectReason(runner, 'finished');
  });
  test.each([undefined, null, { cause: 'source' }])(
    `${Constructor.name} preserves exact source failure %p`,
    async (error) => {
      const runner = new Constructor({
        traversableTree: {
          ...tree,
          resolveRoot: () => {
            throw error;
          },
        },
      }).createRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
      expectReason(runner, 'failed');
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
      expectReason(runner, 'failed');
    },
  );
}

for (const Constructor of [DagTraversal<G>, AsyncDagTraversal<G>]) {
  test(`${Constructor.name} keeps the preceding settlement stop until resume`, async () => {
    const traversal = new Constructor({ traversableGraph: graph });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
      commands: [
        { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
      ],
    }));
    const runner = traversal.createRunner();
    await runner.run();
    expectReason(runner, 'awaitingSettlement');
    const generation = runner.summary().vertices.get('A')!.generation!;
    runner.settle('A', { kind: 'workCompleted' }, generation);
    expectReason(runner, 'awaitingSettlement');
    for await (const event of runner.iterateEvents()) {
      expect(event.vertex.getData()).toBe('A');
      expectReason(runner, null);
    }
    expectReason(runner, 'finished');
  });
  test(`${Constructor.name} distinguishes requested pause from deferred quiescence`, async () => {
    let halted = false;
    const traversal = new Constructor({ traversableGraph: graph });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      if (!halted) {
        halted = true;
        return { commands: [{ commandName: Command.PAUSE_TRAVERSAL }] };
      }
      return undefined;
    });
    const runner = traversal.createRunner();
    await runner.run();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}

test('async pause has no stop reason while admitted callbacks drain', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({ traversableGraph: graph });
  traversal.addVisitorFor(Order.ON_WORK_READY, () => release.promise);
  const runner = traversal.createRunner();
  const iterator = runner.iterateEvents();
  const next = iterator.next();
  await eventLoopTurn();
  const close = iterator.return();
  await eventLoopTurn();
  expect(runner.getStatus()).toBe(Status.RUNNING);
  expectReason(runner, null);
  release.resolve();
  await close;
  await next;
  expectReason(runner, 'paused');
});

for (const Constructor of [
  DepthFirstTreeTraversal<G>,
  AsyncDepthFirstTreeTraversal<G>,
]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = runnerInternals(
      new DepthFirstTreeTraversal<G>({
        traversableTree: tree,
      }).createRunner(),
    ).state;
    state.status = Status.HALTED;
    const runner = (
      Constructor === DepthFirstTreeTraversal
        ? createInternalDepthFirstTreeTraversal
        : createInternalAsyncDepthFirstTreeTraversal
    )({
      traversableTree: tree,
      traversalRunnerInternalObjects: { state },
    }).createRunner();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}
for (const Constructor of [
  BreadthFirstTreeTraversal<G>,
  AsyncBreadthFirstTreeTraversal<G>,
]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = runnerInternals(
      new BreadthFirstTreeTraversal<G>({
        traversableTree: tree,
      }).createRunner(),
    ).state;
    state.status = Status.HALTED;
    const runner = (
      Constructor === BreadthFirstTreeTraversal
        ? createInternalBreadthFirstTreeTraversal
        : createInternalAsyncBreadthFirstTreeTraversal
    )({
      traversableTree: tree,
      traversalRunnerInternalObjects: { state },
    }).createRunner();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}
for (const Constructor of [DagTraversal<G>, AsyncDagTraversal<G>]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = runnerInternals(
      new DagTraversal<G>({ traversableGraph: graph }).createRunner(),
    ).state;
    state.status = Status.HALTED;
    const runner = (
      Constructor === DagTraversal
        ? createInternalDagTraversal
        : createInternalAsyncDagTraversal
    )<G>({
      traversableGraph: graph,
      traversalRunnerInternalObjects: { state },
    }).createRunner();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}
