import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import {
  DagTraversal,
  AsyncDagTraversal,
  DagVisitorPhase as Order,
  type DagSummary,
} from '../src/traversals/dag-traversal';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { TraversalRunnerStatus as Status } from '../src/core/TraversalRunner';

type G = VertexTypes<string, string>;
for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} invalid summary blocks only unmet work alongside seeded and ready components`, async () => {
    let calls = 0;
    const traversal = new Constructor<G>({
      discovery: 'eager',
      syntheticRoot: true,
      completedWork: new Set(['done']),
      traversableGraph: {
        resolveRoot: () => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexContent: {
                $data: '',
                $childHints: ['done', 'ready', 'bad'],
              },
            },
          };
        },
        resolveChild: (id) => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: id,
              dependsOnWork:
                id === 'ready' ? ['done'] : id === 'bad' ? ['missing'] : [],
              vertexContent: { $data: id, $childHints: [] },
            },
          };
        },
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, () => {
      calls++;
    });
    const runner = traversal.createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: { unknownPrerequisiteIds: ['missing'] },
    });
    const summary = runner.summary();
    expect(summary.discovery.complete).toBe(true);
    expect(summary.vertices.get('done')!.work).toBe('completed');
    expect(summary.vertices.get('ready')!.work).toBe('ready');
    expect(summary.vertices.get('ready')!.unmetPrerequisiteIds).toEqual([]);
    expect(summary.vertices.get('bad')!.work).toBe('pending');
    expect(summary.diagnostics).toEqual({
      dependencies: [{ id: 'bad', unmet: ['missing'] }],
      unknownPrerequisiteIds: ['missing'],
      dependencyCycleComponents: [],
      dependencyBlockedIds: ['bad'],
      structurallyIncompleteIds: [],
      dependencyEdges: expect.any(Array),
    });
    summary.diagnostics!.dependencies[0]!.unmet.length = 0;
    summary.diagnostics!.dependencyBlockedIds.length = 0;
    expect(runner.summary().diagnostics!.dependencies).toEqual([
      { id: 'bad', unmet: ['missing'] },
    ]);
    expect(runner.summary().diagnostics!.dependencyBlockedIds).toEqual(['bad']);
    expect(calls).toBe(4);
  });

  test(`${Constructor.name} partial summary retains original seeded cycles while projecting actual unmet work`, async () => {
    const bad = Object.create(null) as object;
    const missing = { missing: true };
    const cycle = undefined;
    const snapshots: DagSummary[] = [];
    const runner = new Constructor<VertexTypes<unknown, unknown>>({
      discovery: 'eager',
      syntheticRoot: true,
      completedWork: new Set<unknown>(['done', cycle]),
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexContent: {
              $data: '',
              $childHints: ['done', 'ready', bad, cycle],
            },
          },
        }),
        resolveChild: (id) => {
          if (id === 'probe') {
            snapshots.push(runner.summary());
            return {
              kind: 'omitted' as const,
              satisfiesDependencies: true as const,
              vertexId: id,
            };
          }
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: id,
              dependsOnWork:
                id === 'ready'
                  ? ['done']
                  : id === bad
                  ? [missing]
                  : id === cycle
                  ? [cycle]
                  : [],
              vertexContent: {
                $data: id,
                $childHints: id === cycle ? ['probe'] : [],
              },
            },
          };
        },
      },
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: {
        unknownPrerequisiteIds: [missing],
        dependencyCycleComponents: [[cycle]],
      },
    });
    expect(snapshots).toHaveLength(1);
    const partial = snapshots[0]!;
    expect(partial.discovery.complete).toBe(false);
    expect(partial.vertices.get(cycle)!.work).toBe('completed');
    expect(partial.diagnostics).toEqual({
      dependencies: [{ id: bad, unmet: [missing] }],
      unknownPrerequisiteIds: [missing],
      dependencyCycleComponents: [[cycle]],
      dependencyBlockedIds: [bad],
      structurallyIncompleteIds: [],
      dependencyEdges: expect.any(Array),
    });
    expect(partial.diagnostics!.dependencies[0]!.id).toBe(bad);
    expect(partial.diagnostics!.dependencies[0]!.unmet[0]).toBe(missing);
    const complete = runner.summary();
    expect(complete.discovery.complete).toBe(true);
    expect(complete.diagnostics).toEqual(partial.diagnostics);
    partial.diagnostics!.dependencyCycleComponents[0]!.length = 0;
    partial.diagnostics!.unknownPrerequisiteIds.length = 0;
    partial.diagnostics!.dependencies.length = 0;
    expect(runner.summary().diagnostics).toEqual(complete.diagnostics);
  });

  test(`${Constructor.name} defers a diamond without publishing success and settles once`, async () => {
    const seen: string[] = [];
    const traversal = new Constructor<G>({
      discovery: 'eager',
      syntheticRoot: true,
      completedWork: new Set(['design']),
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
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      seen.push(vertex.getData());
      return {
        commands: [
          { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
        ],
      };
    });
    const runner = traversal.createRunner();
    expect(runner.summary().discovery.complete).toBe(false);
    expect(runner.summary().counts.discovered).toBe(0);
    await runner.run();
    expect(runner.getStatus()).toBe(Status.HALTED);
    expect(runner.summary().readyOrDeferredIds).toEqual([
      'backend',
      'frontend',
    ]);
    expect(runner.summary().counts).toEqual({
      discovered: 4,
      pending: 1,
      readyOrDeferred: 2,
      deferredWork: 2,
      activeVisitorVertices: 0,
      workCompleted: 1,
      subgraphCompleted: 1,
    });
    expect(runner.summary().diagnostics).toBeNull();
    const backend = runner.summary().vertices.get('backend')!.generation!;
    expect(runner.settle('backend', { kind: 'workCompleted' }, backend)).toBe(
      true,
    );
    expect(runner.settle('backend', { kind: 'workCompleted' }, backend)).toBe(
      false,
    );
    expect(() =>
      runner.settle(
        'backend',
        { kind: 'traversalFailed', error: null },
        backend,
      ),
    ).toThrow();
    await runner.run();
    expect(runner.summary().readyOrDeferredIds).toEqual(['frontend']);
    const frontend = runner.summary().vertices.get('frontend')!.generation!;
    runner.settle('frontend', { kind: 'workCompleted' }, frontend);
    await runner.run();
    expect(runner.summary().readyOrDeferredIds).toEqual(['verify']);
    runner.settle(
      'verify',
      { kind: 'workCompleted' },
      runner.summary().vertices.get('verify')!.generation!,
    );
    await runner.run();
    expect(runner.getStatus()).toBe(Status.FINISHED);
    expect(runner.summary().counts.workCompleted).toBe(4);
    expect(runner.summary().counts.subgraphCompleted).toBe(4);
    expect(runner.settle('backend', { kind: 'workCompleted' }, backend)).toBe(
      false,
    );
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
            resolveRoot: () => ({
              kind: 'found' as const,
              vertex: { vertexContent: { $data: '', $childHints: ids } },
            }),
            resolveChild: (id) => ({
              kind: 'found' as const,
              vertex: {
                vertexId: id,
                dependsOnWork: dependencies[ids.indexOf(id)]!,
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
        const runner = traversal.createRunner();
        await runner.run();
        expect(runner.summary().readyOrDeferredIds).toEqual(expected);
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
    const traversal = new Constructor<VertexTypes<unknown, unknown>>({
      discovery: 'eager',
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: { vertexContent: { $data: '', $childHints: ids } },
          };
        },
        resolveChild: (id) => {
          calls++;
          return {
            kind: 'found' as const,
            vertex: {
              vertexId: id,
              dependsOnWork: [],
              vertexContent: { $data: id, $childHints: [] },
            },
          };
        },
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (vertex) => {
      calls++;
      const summary = runner.summary();
      expect(summary.activeVisitorVertexIds.includes(vertex.getData())).toBe(
        true,
      );
      expect(summary.vertices.get(vertex.getData())!.work).toBe('visiting');
      return {
        commands: [
          { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
        ],
      };
    });
    const runner = traversal.createRunner();
    await runner.run();
    const count = calls;
    const summary = runner.summary();
    expect(summary.readyOrDeferredIds).toEqual(ids);
    (summary.readyOrDeferredIds as unknown[]).length = 0;
    (summary.vertices as Map<unknown, unknown>).clear();
    first.key = 'changed';
    expect(Object.isFrozen(first)).toBe(false);
    const fresh = runner.summary();
    expect(fresh.readyOrDeferredIds).toEqual(ids);
    expect(fresh.vertices.get(first)!.vertexId).toBe(first);
    expect(fresh.vertices.get(second)!.vertexId).toBe(second);
    expect(calls).toBe(count);
    for (const id of ids)
      runner.settle(
        id,
        { kind: 'workCompleted' },
        fresh.vertices.get(id)!.generation!,
      );
    await runner.run();
    expect(runner.summary().completedWorkIds).toEqual(ids);
  });

  test(`${Constructor.name} eager deferred parents cannot hide descendant topology`, async () => {
    const traversal = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['child'] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: [id === 'child' ? 'root' : 'child'],
            vertexContent: {
              $data: id,
              $childHints: id === 'child' ? ['leaf'] : [],
            },
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
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: { vertexContent: { $data: '', $childHints: ['a', 'b'] } },
          }),
          resolveChild: (id) => ({
            kind: 'found' as const,
            vertex: {
              vertexId: id,
              dependsOnWork:
                invalid === 'cycle' ? [id === 'a' ? 'b' : 'a'] : ['missing'],
              vertexContent: { $data: id, $childHints: [] },
            },
          }),
        },
      });
      let visited = false;
      traversal.addVisitorFor(Order.ON_WORK_READY, () => {
        visited = true;
        return {
          commands: [
            { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
          ],
        };
      });
      const runner = traversal.createRunner();
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
    kind: 'found';
    vertex: {
      vertexId: string;
      vertexContent: { $data: string; $childHints: string[] };
    };
  }>();
  const complete = deferred<void>();
  const traversal = new AsyncDagTraversal<G>({
    traversableGraph: {
      resolveRoot: () => root.promise,
      resolveChild: () => ({
        satisfiesDependencies: true as const,
        kind: 'omitted' as const,
      }),
    },
  });
  traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, () => complete.promise);
  const runner = traversal.createRunner();
  const running = runner.run();
  await eventLoopTurn();
  expect(runner.summary().discovery.complete).toBe(false);
  expect(runner.summary().activeVisitorVertexIds).toEqual([]);
  expect(runner.inspect().inFlightCallbackCount).toBe(1);
  root.resolve({
    kind: 'found' as const,
    vertex: {
      vertexId: 'root',
      vertexContent: { $data: 'root', $childHints: [] },
    },
  });
  await eventLoopTurn();
  expect(runner.summary().activeVisitorVertexIds).toEqual(['root']);
  expect(runner.summary().vertices.get('root')!.work).toBe('completed');
  expect(runner.summary().completedWorkIds).toEqual(['root']);
  expect(runner.summary().completedSubgraphIds).toEqual([]);
  complete.resolve();
  await running;
  expect(runner.summary().completedSubgraphIds).toEqual(['root']);
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} known lazy cycles remain invalid alongside legitimate deferred work`, async () => {
    const traversal = new Constructor<G>({
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
            dependsOnWork: id === 'b' ? ['b'] : [],
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
    const runner = traversal.createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toThrow(/stalled/);
    expect(runner.summary().diagnostics!.dependencyCycleComponents).toEqual([
      ['b'],
    ]);
    runner.summary().diagnostics!.dependencyCycleComponents[0]!.length = 0;
    expect(runner.summary().diagnostics!.dependencyCycleComponents).toEqual([
      ['b'],
    ]);
  });

  test(`${Constructor.name} empty-root discovery closes only after resolution and preserves unused seeds in summary`, async () => {
    const traversal = new Constructor<G>({
      completedWork: new Set(['missing']),
      traversableGraph: {
        resolveRoot: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
        resolveChild: () => ({
          satisfiesDependencies: true as const,
          kind: 'omitted' as const,
        }),
      },
    });
    const runner = traversal.createRunner();
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
