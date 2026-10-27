import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import {
  AsyncDagTraversal,
  DagTraversal,
  DagVisitorPhase as Order,
} from '../src/traversals/dag-traversal';
import {
  DepthFirstPhase,
  DepthFirstTreeTraversal,
} from '../src/traversals/depth-first-traversal';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = VertexTypes<string, string>;
const rootOnly = {
  resolveRoot: () => ({
    kind: 'found' as const,
    vertex: { vertexId: 'a', vertexContent: { $data: 'a', $childHints: [] } },
  }),
  resolveChild: () => ({
    kind: 'omitted' as const,
    satisfiesDependencies: true as const,
  }),
};
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} settlement preserves configured event once and discards buffered commands and remaining visitors`, async () => {
    const traversal = new Constructor<G>({ traversableGraph: rootOnly });
    let visits = 0;
    traversal.addVisitorFor(
      Order.ON_WORK_READY,
      () => ({
        commands: [
          {
            commandName: Command.REWRITE_VERTEX_DATA,
            commandArguments: { newData: 'wrong' },
          },
        ],
      }),
      { commandCommitMode: 'afterGroup' as const },
    );
    traversal.addVisitorFor(
      Order.ON_WORK_READY,
      () => {
        visits++;
        return {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        };
      },
      { commandCommitMode: 'afterGroup' as const },
    );
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      throw Error('must skip');
    });
    const runner = traversal.createRunner();
    await runner.run({ emitEvents: ['workCompleted'] });
    const token = runner.summary().vertices.get('a')!.generation!;
    expect(() =>
      runner.settle('missing', { kind: 'workCompleted' }, token),
    ).toThrow();
    expect(() =>
      runner.settle('a', { kind: 'workCompleted' }, Symbol()),
    ).toThrow();
    const other = traversal.createRunner();
    await other.run();
    expect(() => other.settle('a', { kind: 'workCompleted' }, token)).toThrow();
    runner.settle('a', { kind: 'workCompleted' }, token);
    runner.settle('a', { kind: 'workCompleted' }, token);
    const events: string[] = [];
    for await (const event of runner.iterateEvents({
      emitEvents: ['subgraphCompleted'],
    }))
      events.push(`${event.kind}:${event.vertex.getData()}`);
    expect(events).toEqual(['workCompleted:a', 'subgraphCompleted:a']);
    expect(visits).toBe(2);
  });

  test.each([undefined, null, { reason: 'business failure' }, NaN])(
    `${Constructor.name} preserves settlement error %p and guards replay`,
    async (error) => {
      const traversal = new Constructor<G>({ traversableGraph: rootOnly });
      traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
        commands: [
          { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
        ],
      }));
      const runner = traversal.createRunner();
      await runner.run();
      const token = runner.summary().vertices.get('a')!.generation!;
      expect(
        runner.settle('a', { kind: 'traversalFailed', error }, token),
      ).toBe(true);
      expect(
        runner.settle('a', { kind: 'traversalFailed', error }, token),
      ).toBe(false);
      expect(() =>
        runner.settle('a', { kind: 'workCompleted' }, token),
      ).toThrow();
      expect(() =>
        runner.settle('a', { kind: 'traversalFailed', error: {} }, token),
      ).toThrow();
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(runner.summary().completedWorkIds).toEqual([]);
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
    },
  );

  test(`${Constructor.name} rejects completion deferral`, async () => {
    const traversal = new Constructor<G>({ traversableGraph: rootOnly });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, () => ({
      commands: [
        // @ts-expect-error Runtime validation for JavaScript callers.
        { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
      ],
    }));
    await expect(async () => {
      await traversal.createRunner().run();
    }).rejects.toThrow(/ON_WORK_READY/);
  });

  test(`${Constructor.name} lazy deferred discovery reports a partial frontier until settlement`, async () => {
    const traversal = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['a', 'b'] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: id === 'a' ? ['c'] : id === 'b' ? ['root'] : [],
            vertexContent: { $data: id, $childHints: id === 'b' ? ['c'] : [] },
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
      commands: [
        { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
      ],
    }));
    const runner = traversal.createRunner();
    await runner.run();
    expect(runner.summary().discovery).toEqual({
      mode: 'lazy',
      complete: false,
    });
    expect(runner.summary().diagnostics).toBeNull();
    runner.settle(
      'root',
      { kind: 'workCompleted' },
      runner.summary().vertices.get('root')!.generation!,
    );
    await runner.run();
    expect(runner.summary().deferredWorkIds).toEqual(['b', 'c']);
    runner.settle(
      'c',
      { kind: 'workCompleted' },
      runner.summary().vertices.get('c')!.generation!,
    );
    await runner.run();
    expect(runner.summary().discovery.complete).toBe(true);
    expect(runner.summary().readyOrDeferredIds).toEqual(['a', 'b']);
  });
}

test('tree visitors cannot use the DAG deferral sentinel', () => {
  const traversal = new DepthFirstTreeTraversal<G>({
    traversableTree: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: 'a', $childHints: [] } },
      }),
      resolveChild: () => ({ kind: 'omitted' as const }),
    },
  });
  traversal.addVisitorFor(
    DepthFirstPhase.PRE_ORDER,
    () =>
      ({
        commands: [
          { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
        ],
      } as never),
  );
  expect(() => traversal.createRunner().run()).toThrow(/ON_WORK_READY/);
});

test('settlement wakes an active async consumer while another physical callback is pending', async () => {
  const waitB = deferred<{
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION }];
  }>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: '', $childHints: ['a', 'b', 'c'] } },
      }),
      resolveChild: (id) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOnWork: id === 'c' ? ['a'] : [],
          vertexContent: { $data: id, $childHints: [] },
        },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
    const id = vertex.getData();
    seen.push(id);
    return id === 'b'
      ? waitB.promise
      : {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        };
  });
  const runner = traversal.createRunner();
  const running = runner.run();
  await eventLoopTurn();
  expect(runner.summary().activeVisitorVertexIds).toEqual(['b']);
  expect(runner.summary().vertices.get('b')!.work).toBe('visiting');
  runner.settle(
    'a',
    { kind: 'workCompleted' },
    runner.summary().vertices.get('a')!.generation!,
  );
  await eventLoopTurn();
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  waitB.resolve({
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
  });
  await running;
  expect(runner.getStatus()).toBe(Status.HALTED);
});

test('deleted orphan refuses a previously issued deferred generation', async () => {
  const finishP = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: {
          vertexId: 'root',
          vertexContent: { $data: 'root', $childHints: ['p'] },
        },
      }),
      resolveChild: (id) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          dependsOnWork: [],
          vertexContent: { $data: id, $childHints: id === 'p' ? ['a'] : [] },
        },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, async (vertex) => {
    if (vertex.getData() === 'p') {
      await finishP.promise;
      return { commands: [{ commandName: Command.DELETE_DAG_VERTEX_CASCADE }] };
    }
    if (vertex.getData() === 'a')
      return {
        commands: [
          { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
        ],
      };
    return undefined;
  });
  const runner = traversal.createRunner();
  const running = runner.run();
  await eventLoopTurn();
  const token = runner.summary().vertices.get('a')!.generation!;
  finishP.resolve();
  await running;
  expect(runner.summary().vertices.has('a')).toBe(false);
  expect(() => runner.settle('a', { kind: 'workCompleted' }, token)).toThrow();
  expect(runner.getStatus()).toBe(Status.FINISHED);
});

test('halt waits for a physical callback and retains deferred handles across resume', async () => {
  const release = deferred<{
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION }];
  }>();
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: '', $childHints: ['a', 'b'] } },
      }),
      resolveChild: (id) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          vertexContent: { $data: id, $childHints: [] },
        },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) =>
    vertex.getData() === 'a'
      ? {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        }
      : release.promise,
  );
  const runner = traversal.createRunner();
  const iterator = runner.iterateEvents({ emitEvents: ['workCompleted'] });
  const next = iterator.next();
  await eventLoopTurn();
  const token = runner.summary().vertices.get('a')!.generation!;
  let closed = false;
  const closing = iterator.return().then(() => {
    closed = true;
  });
  await eventLoopTurn();
  expect(closed).toBe(false);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  release.resolve({
    commands: [{ commandName: VisitorCommand.DEFER_WORK_COMPLETION as const }],
  });
  await closing;
  await next;
  expect(runner.getStatus()).toBe(Status.HALTED);
  expect(runner.summary().vertices.get('a')!.generation).toBe(token);
  runner.settle('a', { kind: 'workCompleted' }, token);
  await runner.run();
  expect(runner.summary().completedWorkIds).toEqual(['a']);
  expect(runner.summary().readyOrDeferredIds).toEqual(['b']);
});

test('failure settlement cannot free a still-running callback permit or accept another deferred result', async () => {
  const release = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 3,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      resolveRoot: () => ({
        kind: 'found' as const,
        vertex: { vertexContent: { $data: '', $childHints: ['a', 'b', 'c'] } },
      }),
      resolveChild: (id) => ({
        kind: 'found' as const,
        vertex: {
          vertexId: id,
          vertexContent: { $data: id, $childHints: [] },
        },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) =>
    vertex.getData() === 'b'
      ? release.promise
      : {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        },
  );
  const runner = traversal.createRunner();
  const running = runner.run();
  const rejected = expect(running).rejects.toBe(null);
  await eventLoopTurn();
  const snapshot = runner.summary();
  runner.settle(
    'a',
    { kind: 'traversalFailed', error: null },
    snapshot.vertices.get('a')!.generation!,
  );
  await rejected;
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  expect(() =>
    runner.settle(
      'c',
      { kind: 'workCompleted' },
      snapshot.vertices.get('c')!.generation!,
    ),
  ).toThrow(/failed/);
  release.resolve();
  await eventLoopTurn();
  expect(runner.inspect().inFlightCallbackCount).toBe(0);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test.each([
    ['backend', 'frontend'],
    ['frontend', 'backend'],
  ])(
    `${Constructor.name} reconstructed completed facts agree with settlement order %j`,
    async (first, second) => {
      const make = (completedWork: Set<string>) => {
        const traversal = new Constructor<G>({
          discovery: 'eager',
          syntheticRoot: true,
          completedWork,
          traversableGraph: {
            resolveRoot: () => ({
              kind: 'found' as const,
              vertex: {
                vertexContent: {
                  $data: '',
                  $childHints: ['design', 'backend', 'frontend', 'verify'],
                },
              },
            }),
            resolveChild: (id) => ({
              kind: 'found' as const,
              vertex: {
                vertexId: id,
                dependsOnWork:
                  id === 'design'
                    ? []
                    : id === 'verify'
                    ? ['backend', 'frontend']
                    : ['design'],
                vertexContent: { $data: id, $childHints: [] },
              },
            }),
          },
        });
        traversal.addVisitorFor(Order.ON_WORK_READY, () => ({
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        }));
        return traversal.createRunner();
      };
      const completed = new Set(['design']);
      const retained = make(completed);
      await retained.run();
      for (const id of [first, second]) {
        const token = retained.summary().vertices.get(id)!.generation!;
        retained.settle(id, { kind: 'workCompleted' }, token);
        await retained.run();
        completed.add(id);
        const rebuilt = make(completed);
        await rebuilt.run();
        expect(rebuilt.summary().readyOrDeferredIds).toEqual(
          retained.summary().readyOrDeferredIds,
        );
        expect(rebuilt.summary().completedWorkIds).toEqual(
          retained.summary().completedWorkIds,
        );
        expect(rebuilt.summary().counts).toEqual(retained.summary().counts);
        expect(() =>
          rebuilt.settle(id, { kind: 'workCompleted' }, token),
        ).toThrow();
      }
      expect(retained.summary().readyOrDeferredIds).toEqual(['verify']);
    },
  );
}
