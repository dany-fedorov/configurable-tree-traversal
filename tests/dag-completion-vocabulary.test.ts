import {
  AsyncDagTraversal,
  DagTraversal,
  DagTraversalOrder as Order,
  TraversalRunnerStatus as Status,
  TraversalVisitorCommandName as Command,
  type DagSettlementOutcome,
  type VertexTypes,
} from '../src';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = VertexTypes<string, string>;
const deferReady = () => ({
  commands: [{ commandName: Command.DEFER_READY }] as [
    { commandName: Command.DEFER_READY },
  ],
});
const rootOnly = {
  resolveRoot: () => ({
    vertexId: 'root',
    vertexContent: { $data: 'root', $childHints: [] },
  }),
  resolveChild: () => ({ vertexContent: null }),
};

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} completion releases W before children and committed C`, async () => {
    const traversal = new Constructor<G>({
      discovery: 'eager',
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({
          vertexContent: {
            $data: '',
            $childHints: ['parent', 'work', 'complete'],
          },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          dependsOn: id === 'work' ? ['parent'] : [],
          dependsOnComplete: id === 'complete' ? ['parent'] : [],
          vertexContent: {
            $data: id,
            $childHints: id === 'parent' ? ['child'] : [],
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_READY, deferReady);
    const runner = traversal.createRunner();
    await runner.run();
    const generation = runner.summary().vertices.get('parent')!.generation!;
    expect(runner.settle('parent', { kind: 'workCompleted' }, generation)).toBe(
      true,
    );
    expect(runner.settle('parent', { ok: true }, generation)).toBe(false);
    expect(runner.settle('parent', { kind: 'workCompleted' }, generation)).toBe(
      false,
    );
    await runner.run();
    const partial = runner.summary();
    expect(partial.vertices.get('parent')!.work).toBe('completed');
    expect(partial.vertices.get('parent')!.subtreeComplete).toBe(false);
    expect(partial.vertices.get('work')!.work).toBe('deferred');
    expect(partial.vertices.get('complete')!.work).toBe('pending');
    runner.settle(
      'child',
      { kind: 'workCompleted' },
      partial.vertices.get('child')!.generation!,
    );
    await runner.run();
    const complete = runner.summary();
    expect(complete.vertices.get('parent')!.subtreeComplete).toBe(true);
    expect(complete.vertices.get('complete')!.work).toBe('deferred');
  });

  test.each([undefined, null, { reason: 'stop traversal' }, NaN, 0, -0])(
    `${Constructor.name} canonical fatal feedback preserves %p and cross-form replay`,
    async (error) => {
      const traversal = new Constructor<G>({ traversableGraph: rootOnly });
      traversal.addVisitorFor(Order.ON_READY, deferReady);
      const runner = traversal.createRunner();
      await runner.run();
      const generation = runner.summary().vertices.get('root')!.generation!;
      expect(
        runner.settle('root', { kind: 'traversalFailed', error }, generation),
      ).toBe(true);
      expect(runner.settle('root', { ok: false, error }, generation)).toBe(
        false,
      );
      expect(
        runner.settle('root', { kind: 'traversalFailed', error }, generation),
      ).toBe(false);
      expect(() =>
        runner.settle('root', { kind: 'workCompleted' }, generation),
      ).toThrow(/Conflicting/);
      expect(() =>
        runner.settle(
          'root',
          { kind: 'traversalFailed', error: {} },
          generation,
        ),
      ).toThrow(/Conflicting/);
      if (typeof error === 'number' && error === 0) {
        expect(() =>
          runner.settle('root', { ok: false, error: -error }, generation),
        ).toThrow(/Conflicting/);
      }
      expect(runner.getStatus()).toBe(Status.FAILED);
      expect(runner.summary().vertices.get('root')!.work).toBe('deferred');
      expect(runner.summary().completedWorkIds).toEqual([]);
      await expect(async () => {
        await runner.run();
      }).rejects.toBe(error);
    },
  );

  test.each([true, false])(
    `${Constructor.name} canonical replay matches legacy feedback %p`,
    async (ok) => {
      const traversal = new Constructor<G>({ traversableGraph: rootOnly });
      traversal.addVisitorFor(Order.ON_READY, deferReady);
      const runner = traversal.createRunner();
      await runner.run();
      const generation = runner.summary().vertices.get('root')!.generation!;
      const error = {};
      runner.settle(
        'root',
        ok ? { ok: true } : { ok: false, error },
        generation,
      );
      expect(
        runner.settle(
          'root',
          ok ? { kind: 'workCompleted' } : { kind: 'traversalFailed', error },
          generation,
        ),
      ).toBe(false);
    },
  );

  test.each([
    null,
    undefined,
    false,
    'completed',
    {},
    { kind: 'unknown' },
    { kind: 'traversalFailed' },
    { kind: 'workCompleted', error: undefined },
    { kind: 'workCompleted', ok: true },
    { kind: 'workCompleted', ok: false, error: null },
    { kind: 'traversalFailed', ok: true, error: null },
    { kind: 'traversalFailed', ok: false, error: null },
    { kind: undefined, ok: true },
    { ok: 'true' },
    { ok: false },
    { ok: true, error: null },
  ])(
    `${Constructor.name} rejects malformed feedback %p without consuming its generation`,
    async (outcome) => {
      const traversal = new Constructor<G>({ traversableGraph: rootOnly });
      traversal.addVisitorFor(Order.ON_READY, deferReady);
      const runner = traversal.createRunner();
      await runner.run();
      const generation = runner.summary().vertices.get('root')!.generation!;
      expect(() =>
        runner.settle('root', outcome as DagSettlementOutcome, generation),
      ).toThrow(TypeError);
      expect(runner.getStatus()).toBe(Status.HALTED);
      expect(runner.summary().completedWorkIds).toEqual([]);
      expect(runner.summary().vertices.get('root')!.generation).toBe(
        generation,
      );
      runner.settle('root', { kind: 'workCompleted' }, generation);
      await runner.run();
      expect(runner.getStatus()).toBe(Status.FINISHED);
    },
  );

  test(`${Constructor.name} validates identity and generation before reading feedback`, async () => {
    const id = {
      toString: () => {
        throw new Error('ID stringified');
      },
    };
    const traversal = new Constructor<G>({
      traversableGraph: {
        ...rootOnly,
        resolveRoot: () => ({ ...rootOnly.resolveRoot(), vertexId: id }),
      },
    });
    traversal.addVisitorFor(Order.ON_READY, deferReady);
    const runner = traversal.createRunner();
    await runner.run();
    const generation = runner.summary().vertices.get(id)!.generation!;
    const poison = {
      get kind(): 'workCompleted' {
        throw new Error('feedback read');
      },
    };
    expect(() => runner.settle({}, poison, generation)).toThrow(/stale/);
    expect(() => runner.settle(id, poison, Symbol())).toThrow(/stale/);
    expect(() => runner.settle(id, poison, generation)).toThrow(
      'feedback read',
    );
    runner.settle(id, { kind: 'workCompleted' }, generation);
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual([id]);
  });
}

test('canonical async settlement wakes W consumers while physical callbacks retain capacity', async () => {
  const release = deferred<void>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 2,
    discovery: 'eager',
    syntheticRoot: true,
    traversableGraph: {
      resolveRoot: () => ({
        vertexContent: { $data: '', $childHints: ['a', 'b', 'c'] },
      }),
      resolveChild: (id) => ({
        vertexId: id,
        dependsOn: id === 'c' ? ['a'] : [],
        vertexContent: { $data: id, $childHints: [] },
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_READY, (vertex) => {
    seen.push(vertex.getData());
    return vertex.getData() === 'b' ? release.promise : deferReady();
  });
  const runner = traversal.createRunner();
  const running = runner.run();
  await eventLoopTurn();
  runner.settle(
    'a',
    { kind: 'workCompleted' },
    runner.summary().vertices.get('a')!.generation!,
  );
  await eventLoopTurn();
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  const rejected = expect(running).rejects.toBe(undefined);
  runner.settle(
    'c',
    { kind: 'traversalFailed', error: undefined },
    runner.summary().vertices.get('c')!.generation!,
  );
  await rejected;
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  release.resolve();
  await eventLoopTurn();
  expect(runner.inspect().inFlightCallbackCount).toBe(0);
});
