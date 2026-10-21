import {
  DagTraversal,
  AsyncDagTraversal,
  DagTraversalOrder as Order,
  DEFER_READY,
} from '../src/traversals/dag-traversal';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';

type G = TreeTypeParameters<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} defers a diamond without publishing success and settles once`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      discovery: 'eager',
      syntheticRoot: true,
      completedWork: new Set(['design']),
      traversableGraph: {
        makeRoot: () => ({
          vertexContent: {
            $d: '',
            $c: ['design', 'backend', 'frontend', 'verify'],
          },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn:
            id === 'design'
              ? []
              : id === 'verify'
              ? ['backend', 'frontend']
              : ['design'],
          vertexContent: { $d: id, $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      seen.push(vertex.getData());
      return DEFER_READY;
    });
    const runner = traversal.makeRunner();
    expect(runner.summary().discovery.complete).toBe(false);
    expect(runner.summary().counts.discovered).toBe(0);
    await runner.run();
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(runner.summary().readyIds).toEqual(['backend', 'frontend']);
    expect(runner.summary().counts).toEqual({
      discovered: 4,
      pending: 1,
      ready: 2,
      deferred: 2,
      inFlight: 0,
      workCompleted: 1,
      subtreeCompleted: 1,
    });
    expect(runner.summary().diagnostics).toBeNull();
    const backend = runner.summary().vertices.get('backend')!.generation!;
    expect(runner.settle('backend', { ok: true }, backend)).toBe(true);
    expect(runner.settle('backend', { ok: true }, backend)).toBe(false);
    expect(() =>
      runner.settle('backend', { ok: false, error: null }, backend),
    ).toThrow();
    await runner.run();
    expect(runner.summary().readyIds).toEqual(['frontend']);
    const frontend = runner.summary().vertices.get('frontend')!.generation!;
    runner.settle('frontend', { ok: true }, frontend);
    await runner.run();
    expect(runner.summary().readyIds).toEqual(['verify']);
    runner.settle(
      'verify',
      { ok: true },
      runner.summary().vertices.get('verify')!.generation!,
    );
    await runner.run();
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.summary().counts.workCompleted).toBe(4);
    expect(runner.summary().counts.subtreeCompleted).toBe(4);
    expect(runner.settle('backend', { ok: true }, backend)).toBe(false);
    expect(seen).toEqual(['backend', 'frontend', 'verify']);
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} agrees with an independent exhaustive four-vertex frontier oracle`, async () => {
    const ids = ['a', 'b', 'c', 'd'];
    const possible = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ] as const;
    for (let edges = 0; edges < 64; edges++) {
      const dependencies = ids.map((_, to) =>
        possible
          .filter(
            ([, target], bit) => target === to && (edges & (1 << bit)) !== 0,
          )
          .map(([from]) => ids[from]!),
      );
      for (let mask = 0; mask < 16; mask++) {
        const completed = new Set(
          ids.filter((_, i) => (mask & (1 << i)) !== 0),
        );
        if (
          ids.some(
            (id, i) =>
              completed.has(id) &&
              dependencies[i]!.some((dependency) => !completed.has(dependency)),
          )
        )
          continue;
        const expected = ids.filter(
          (id, i) =>
            !completed.has(id) &&
            dependencies[i]!.every((dependency) => completed.has(dependency)),
        );
        const traversal = new Constructor<G>({
          discovery: 'eager',
          syntheticRoot: true,
          completedWork: completed,
          traversableGraph: {
            makeRoot: () => ({ vertexContent: { $d: '', $c: ids } }),
            makeVertex: (id) => ({
              vertexId: id,
              dependsOn: dependencies[ids.indexOf(id)]!,
              vertexContent: { $d: id, $c: [] },
            }),
          },
        });
        traversal.addVisitorFor(Order.ON_READY, () => DEFER_READY);
        const runner = traversal.makeRunner();
        await runner.run();
        expect(runner.summary().readyIds).toEqual(expected);
        expect(runner.summary().discovery.complete).toBe(true);
        expect(runner.summary().completedWorkIds).toEqual([...completed]);
      }
    }
  });

  test(`${Constructor.name} summaries retain arbitrary ID identity, detach containers and never call adapters or visitors`, async () => {
    const first = { key: 'same' };
    const second = { key: 'same' };
    const ids = [first, second, undefined, null, NaN];
    let calls = 0;
    const traversal = new Constructor<TreeTypeParameters<unknown, unknown>>({
      discovery: 'eager',
      syntheticRoot: true,
      traversableGraph: {
        makeRoot: () => {
          calls++;
          return { vertexContent: { $d: '', $c: ids } };
        },
        makeVertex: (id) => {
          calls++;
          return {
            vertexId: id,
            dependsOn: [],
            vertexContent: { $d: id, $c: [] },
          };
        },
      },
    });
    traversal.addVisitorFor(Order.ON_READY, (vertex) => {
      calls++;
      const summary = runner.summary();
      expect(summary.inFlightIds.includes(vertex.getData())).toBe(true);
      expect(summary.vertices.get(vertex.getData())!.work).toBe('running');
      return DEFER_READY;
    });
    const runner = traversal.makeRunner();
    await runner.run();
    const count = calls;
    const summary = runner.summary();
    expect(summary.readyIds).toEqual(ids);
    (summary.readyIds as unknown[]).length = 0;
    (summary.vertices as Map<unknown, unknown>).clear();
    first.key = 'changed';
    expect(Object.isFrozen(first)).toBe(false);
    const fresh = runner.summary();
    expect(fresh.readyIds).toEqual(ids);
    expect(fresh.vertices.get(first)!.id).toBe(first);
    expect(fresh.vertices.get(second)!.id).toBe(second);
    expect(calls).toBe(count);
    for (const id of ids)
      runner.settle(id, { ok: true }, fresh.vertices.get(id)!.generation!);
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual(ids);
  });

  test(`${Constructor.name} eager deferred parents cannot hide descendant topology`, async () => {
    const traversal = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        makeRoot: () => ({
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['child'] },
        }),
        makeVertex: (id) => ({
          vertexId: id,
          vertexContent: { $d: id, $c: id === 'child' ? ['leaf'] : [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_READY, () => DEFER_READY);
    const runner = traversal.makeRunner();
    await runner.run();
    expect(runner.summary().counts.discovered).toBe(3);
    expect(runner.summary().discovery.complete).toBe(true);
    expect(runner.summary().vertices.get('leaf')!.unmetPrerequisiteIds).toEqual(
      ['child'],
    );
    (
      runner.summary().vertices.get('leaf')!.unmetPrerequisiteIds as unknown[]
    ).length = 0;
    expect(runner.summary().vertices.get('leaf')!.unmetPrerequisiteIds).toEqual(
      ['child'],
    );
  });

  test.each(['cycle', 'missing'])(
    `${Constructor.name} eager %s fails before deferring and remains inspectable`,
    async (invalid) => {
      const traversal = new Constructor<G>({
        discovery: 'eager',
        syntheticRoot: true,
        traversableGraph: {
          makeRoot: () => ({ vertexContent: { $d: '', $c: ['a', 'b'] } }),
          makeVertex: (id) => ({
            vertexId: id,
            dependsOn:
              invalid === 'cycle' ? [id === 'a' ? 'b' : 'a'] : ['missing'],
            vertexContent: { $d: id, $c: [] },
          }),
        },
      });
      let visited = false;
      traversal.addVisitorFor(Order.ON_READY, () => {
        visited = true;
        return DEFER_READY;
      });
      const runner = traversal.makeRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toThrow();
      expect(visited).toBe(false);
      expect(runner.summary().diagnostics).not.toBeNull();
      expect(runner.summary().counts.discovered).toBe(2);
      expect(runner.summary().discovery.complete).toBe(true);
    },
  );
}

test('async summary excludes unresolved callbacks and includes active completion chains', async () => {
  const { deferred, eventLoopTurn } = await import('./helpers/graph-fixtures');
  const root = deferred<{
    vertexId: string;
    vertexContent: { $d: string; $c: string[] };
  }>();
  const complete = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    traversableGraph: {
      makeRoot: () => root.promise,
      makeVertex: () => ({ vertexContent: null }),
    },
  });
  traversal.addVisitorFor(Order.ON_COMPLETE, () => complete.promise);
  const runner = traversal.makeRunner();
  const running = runner.run();
  await eventLoopTurn();
  expect(runner.summary().discovery.complete).toBe(false);
  expect(runner.summary().inFlightIds).toEqual([]);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  root.resolve({ vertexId: 'root', vertexContent: { $d: 'root', $c: [] } });
  await eventLoopTurn();
  expect(runner.summary().inFlightIds).toEqual(['root']);
  expect(runner.summary().vertices.get('root')!.work).toBe('succeeded');
  expect(runner.summary().completedWorkIds).toEqual(['root']);
  expect(runner.summary().completedSubtreeIds).toEqual([]);
  complete.resolve();
  await running;
  expect(runner.summary().completedSubtreeIds).toEqual(['root']);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} known lazy cycles remain invalid alongside legitimate deferred work`, async () => {
    const traversal = new Constructor<G>({
      syntheticRoot: true,
      traversableGraph: {
        makeRoot: () => ({ vertexContent: { $d: '', $c: ['a', 'b'] } }),
        makeVertex: (id) => ({
          vertexId: id,
          dependsOn: id === 'b' ? ['b'] : [],
          vertexContent: { $d: id, $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_READY, () => DEFER_READY);
    const runner = traversal.makeRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toThrow(/stalled/);
    expect(runner.summary().diagnostics!.dependencyCycles).toEqual([['b']]);
    runner.summary().diagnostics!.dependencyCycles[0]!.length = 0;
    expect(runner.summary().diagnostics!.dependencyCycles).toEqual([['b']]);
  });

  test(`${Constructor.name} empty-root discovery closes only after resolution and preserves unused seeds in summary`, async () => {
    const traversal = new Constructor<G>({
      completedWork: new Set(['missing']),
      traversableGraph: {
        makeRoot: () => ({ vertexContent: null }),
        makeVertex: () => ({ vertexContent: null }),
      },
    });
    const runner = traversal.makeRunner();
    expect(runner.summary().unusedCompletedWorkIds).toEqual(['missing']);
    (runner.summary().unusedCompletedWorkIds as unknown[]).length = 0;
    await expect(async () => {
      await runner.run();
    }).rejects.toThrow(/completedWork/);
    expect(runner.summary().unusedCompletedWorkIds).toEqual(['missing']);
    expect(runner.summary().discovery.complete).toBe(true);
    expect(runner.summary().counts.discovered).toBe(0);
  });
}
