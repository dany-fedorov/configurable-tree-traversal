import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
  DEFER_READY,
} from '../src/traversals/dag-traversal';
import {
  DepthFirstTraversal,
  AsyncDepthFirstTraversal,
} from '../src/traversals/depth-first-traversal';
import {
  BreadthFirstTraversal,
  AsyncBreadthFirstTraversal,
} from '../src/traversals/breadth-first-traversal';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = TreeTypeParameters<string, string>;
const tree = {
  makeRoot: () => ({ vertexContent: { $data: 'A', $childHints: ['B'] } }),
  makeVertex: () => ({ vertexContent: { $data: 'B', $childHints: [] } }),
};
const graph = {
  makeRoot: () => ({
    vertexId: 'A',
    vertexContent: { $data: 'A', $childHints: [] },
  }),
  makeVertex: tree.makeVertex,
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
  DepthFirstTraversal<G>,
  BreadthFirstTraversal<G>,
  DagTraversal<G>,
  AsyncDepthFirstTraversal<G>,
  AsyncBreadthFirstTraversal<G>,
  AsyncDagTraversal<G>,
]) {
  test(`${Constructor.name} reports initial, running, iterator pause, resume, and finish boundaries`, async () => {
    const runner = new Constructor({ traversableTree: tree }).makeRunner();
    expectReason(runner, null);
    for await (const event of runner.getIterable()) {
      expect(event.vertex.getData()).toBe('A');
      expectReason(runner, null);
      break;
    }
    expectReason(runner, 'paused');
    for await (const event of runner.getIterable()) {
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
          makeRoot: () => {
            throw error;
          },
        },
      }).makeRunner();
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
    traversal.addVisitorFor(Order.ON_READY, () => DEFER_READY);
    const runner = traversal.makeRunner();
    await runner.run();
    expectReason(runner, 'awaitingSettlement');
    const generation = runner.summary().vertices.get('A')!.generation!;
    runner.settle('A', { kind: 'workCompleted' }, generation);
    expectReason(runner, 'awaitingSettlement');
    for await (const event of runner.getIterable()) {
      expect(event.vertex.getData()).toBe('A');
      expectReason(runner, null);
    }
    expectReason(runner, 'finished');
  });
  test(`${Constructor.name} distinguishes requested pause from deferred quiescence`, async () => {
    let halted = false;
    const traversal = new Constructor({ traversableGraph: graph });
    traversal.addVisitorFor(Order.ON_READY, () => {
      if (!halted) {
        halted = true;
        return { commands: [{ commandName: Command.HALT_TRAVERSAL }] };
      }
      return undefined;
    });
    const runner = traversal.makeRunner();
    await runner.run();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}

test('async pause has no stop reason while admitted callbacks drain', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({ traversableGraph: graph });
  traversal.addVisitorFor(Order.ON_READY, () => release.promise);
  const runner = traversal.makeRunner();
  const iterator = runner.getIterable();
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
  DepthFirstTraversal<G>,
  AsyncDepthFirstTraversal<G>,
]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = new DepthFirstTraversal<G>({
      traversableTree: tree,
    }).makeRunner().state;
    state.status = Status.HALTED;
    const runner = new Constructor({
      traversableTree: tree,
      traversalRunnerInternalObjects: { state },
    }).makeRunner();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}
for (const Constructor of [
  BreadthFirstTraversal<G>,
  AsyncBreadthFirstTraversal<G>,
]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = new BreadthFirstTraversal<G>({
      traversableTree: tree,
    }).makeRunner().state;
    state.status = Status.HALTED;
    const runner = new Constructor({
      traversableTree: tree,
      traversalRunnerInternalObjects: { state },
    }).makeRunner();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}
for (const Constructor of [DagTraversal<G>, AsyncDagTraversal<G>]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = new DagTraversal<G>({ traversableGraph: graph }).makeRunner()
      .state;
    state.status = Status.HALTED;
    const runner = new Constructor({
      traversableGraph: graph,
      traversalRunnerInternalObjects: { state },
    }).makeRunner();
    expectReason(runner, 'paused');
    await runner.run();
    expectReason(runner, 'finished');
  });
}
