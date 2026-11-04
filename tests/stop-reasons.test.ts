import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncBreadthFirstTreeTraversalBuilder,
  BreadthFirstTreeTraversalBuilder,
} from '../src/traversals/breadth-first-traversal';
import {
  AsyncDagTraversalBuilder,
  DagTraversalBuilder,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import {
  AsyncDepthFirstTreeTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
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

type G = VertexDataAndChildHintTypes<string, string>;
const tree = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'A', $childDiscoveryHints: ['B'] },
    },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: 'B', $childDiscoveryHints: [] },
    },
  }),
};
const graph = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved' as const,
    resolvedVertexInput: {
      vertexId: 'A',
      vertexContentInput: { $vertexData: 'A', $childDiscoveryHints: [] },
    },
  }),
  resolveChildVertexFromHint: tree.resolveChildVertexFromHint,
};
function expectReason(
  runner: {
    getTraversalStopReason(): import('../src').TraversalStopReason | null;
    captureExecutionSnapshot(): object;
  },
  expected: string | null,
) {
  expect(runner.getTraversalStopReason()).toBe(expected);
  expect(runner.captureExecutionSnapshot()).toHaveProperty(
    'traversalStopReason',
    expected,
  );
}

for (const Constructor of [
  DepthFirstTreeTraversalBuilder<G>,
  BreadthFirstTreeTraversalBuilder<G>,
  DagTraversalBuilder<G>,
  AsyncDepthFirstTreeTraversalBuilder<G>,
  AsyncBreadthFirstTreeTraversalBuilder<G>,
  AsyncDagTraversalBuilder<G>,
]) {
  test(`${Constructor.name} reports initial, running, iterator pause, resume, and finish boundaries`, async () => {
    const runner = new Constructor({
      treeDiscoverySource: tree,
    }).createIndependentRunnerFromCurrentOptions();
    expectReason(runner, null);
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      expect(event.vertex.getVertexData()).toBe('A');
      expectReason(runner, null);
      break;
    }
    expectReason(runner, 'paused');
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      expect(event.vertex).toBeDefined();
      expectReason(runner, null);
    }
    expectReason(runner, 'finished');
    expect(await runner.runUntilSuspendedOrTerminal()).toBe(runner);
    expectReason(runner, 'finished');
  });
  test.each([undefined, null, { cause: 'source' }])(
    `${Constructor.name} preserves exact source failure %p`,
    async (error) => {
      const runner = new Constructor({
        treeDiscoverySource: {
          ...tree,
          resolveRootVertex: () => {
            throw error;
          },
        },
      }).createIndependentRunnerFromCurrentOptions();
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
      expectReason(runner, 'failed');
      await expect(async () => {
        await runner.runUntilSuspendedOrTerminal();
      }).rejects.toBe(error);
      expectReason(runner, 'failed');
    },
  );
}

for (const Constructor of [
  DagTraversalBuilder<G>,
  AsyncDagTraversalBuilder<G>,
]) {
  test(`${Constructor.name} keeps the preceding settlement stop until resume`, async () => {
    const traversal = new Constructor({ dagDiscoverySource: graph });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            VisitorCommand.END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION as const,
        },
      ],
    }));
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expectReason(runner, 'awaitingSettlement');
    const generation = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('A')!.settlementToken!;
    runner.settleDeferredWork('A', { kind: 'workCompleted' }, generation);
    expectReason(runner, 'awaitingSettlement');
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
      expect(event.vertex.getVertexData()).toBe('A');
      expectReason(runner, null);
    }
    expectReason(runner, 'finished');
  });
  test(`${Constructor.name} distinguishes requested pause from deferred quiescence`, async () => {
    let halted = false;
    const traversal = new Constructor({ dagDiscoverySource: graph });
    traversal.registerVisitorForPhase(Order.ON_WORK_READY, () => {
      if (!halted) {
        halted = true;
        return {
          commands: [
            { commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
          ],
        };
      }
      return undefined;
    });
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    expectReason(runner, 'paused');
    await runner.runUntilSuspendedOrTerminal();
    expectReason(runner, 'finished');
  });
}

test('async pause has no stop reason while admitted callbacks drain', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversalBuilder<G>({
    dagDiscoverySource: graph,
  });
  traversal.registerVisitorForPhase(
    Order.ON_WORK_READY,
    () => release.promise,
  );
  const runner = traversal.createIndependentRunnerFromCurrentOptions();
  const iterator =
    runner.runAndIterateObservationEventsUntilSuspendedOrTerminal();
  const next = iterator.next();
  await eventLoopTurn();
  const close = iterator.return();
  await eventLoopTurn();
  expect(runner.getTraversalLifecycleStatus()).toBe(Status.RUNNING);
  expectReason(runner, null);
  release.resolve();
  await close;
  await next;
  expectReason(runner, 'paused');
});

for (const Constructor of [
  DepthFirstTreeTraversalBuilder<G>,
  AsyncDepthFirstTreeTraversalBuilder<G>,
]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = runnerInternals(
      new DepthFirstTreeTraversalBuilder<G>({
        treeDiscoverySource: tree,
      }).createIndependentRunnerFromCurrentOptions(),
    ).state;
    state.status = Status.SUSPENDED;
    const runner = (
      Constructor === DepthFirstTreeTraversalBuilder
        ? createInternalDepthFirstTreeTraversal
        : createInternalAsyncDepthFirstTreeTraversal
    )({
      treeDiscoverySource: tree,
      traversalRunnerInternalObjects: { state },
    }).createIndependentRunnerFromCurrentOptions();
    expectReason(runner, 'paused');
    await runner.runUntilSuspendedOrTerminal();
    expectReason(runner, 'finished');
  });
}
for (const Constructor of [
  BreadthFirstTreeTraversalBuilder<G>,
  AsyncBreadthFirstTreeTraversalBuilder<G>,
]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = runnerInternals(
      new BreadthFirstTreeTraversalBuilder<G>({
        treeDiscoverySource: tree,
      }).createIndependentRunnerFromCurrentOptions(),
    ).state;
    state.status = Status.SUSPENDED;
    const runner = (
      Constructor === BreadthFirstTreeTraversalBuilder
        ? createInternalBreadthFirstTreeTraversal
        : createInternalAsyncBreadthFirstTreeTraversal
    )({
      treeDiscoverySource: tree,
      traversalRunnerInternalObjects: { state },
    }).createIndependentRunnerFromCurrentOptions();
    expectReason(runner, 'paused');
    await runner.runUntilSuspendedOrTerminal();
    expectReason(runner, 'finished');
  });
}
for (const Constructor of [
  DagTraversalBuilder<G>,
  AsyncDagTraversalBuilder<G>,
]) {
  test(`${Constructor.name} legacy injected halted state reports a resumable pause`, async () => {
    const state = runnerInternals(
      new DagTraversalBuilder<G>({
        dagDiscoverySource: graph,
      }).createIndependentRunnerFromCurrentOptions(),
    ).state;
    state.status = Status.SUSPENDED;
    const runner = (
      Constructor === DagTraversalBuilder
        ? createInternalDagTraversal
        : createInternalAsyncDagTraversal
    )<G>({
      dagDiscoverySource: graph,
      traversalRunnerInternalObjects: { state },
    }).createIndependentRunnerFromCurrentOptions();
    expectReason(runner, 'paused');
    await runner.runUntilSuspendedOrTerminal();
    expectReason(runner, 'finished');
  });
}
