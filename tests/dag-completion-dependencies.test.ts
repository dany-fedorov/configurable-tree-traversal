import { TraversalVisitorCommandName as VisitorCommand } from '../src';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';
import { runnerInternals } from './internal-runner-fixtures';

type G = VertexTypes<string, string>;
function bundleGraph() {
  return {
    resolveRoot: () => ({
      kind: 'found' as const,
      vertex: {
        vertexId: 'root',
        vertexContent: { $data: 'root', $childHints: ['join', 'bundle'] },
      },
    }),
    resolveChild: (hint: string) => ({
      kind: 'found' as const,
      vertex: {
        vertexId: hint,
        ...(hint === 'join'
          ? {
              dependsOnWork: ['bundle'],
              dependsOnSubgraphCompletion: ['bundle', 'bundle'],
            }
          : {}),
        vertexContent: {
          $data: hint,
          $childHints: hint === 'bundle' ? ['a', 'b', 'a'] : [],
        },
      },
    }),
  };
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  for (const discovery of ['lazy', 'eager'] as const) {
    test(`${Constructor.name} ${discovery} joins committed bundle completion including duplicate children`, async () => {
      const events: string[] = [];
      const traversal = new Constructor<G>({
        discovery,
        traversableGraph: bundleGraph(),
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
        events.push(`W:${v.getData()}`);
      });
      traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (v) => {
        events.push(`C:${v.getData()}`);
      });
      const runner = traversal.createRunner();
      await runner.run();
      expect(events.indexOf('W:join')).toBeGreaterThan(
        events.indexOf('C:bundle'),
      );
      expect(events.indexOf('C:bundle')).toBeGreaterThan(events.indexOf('C:a'));
      expect(events.indexOf('C:bundle')).toBeGreaterThan(events.indexOf('C:b'));
      expect(events.filter((event) => event === 'C:a')).toHaveLength(1);
      expect(runner.summary().vertices.get('join')).toMatchObject({
        unmetPrerequisiteIds: [],
        unmetSubgraphPrerequisiteIds: [],
        subgraphComplete: true,
      });
      expect(
        runner
          .getResolvedGraphView()
          .get(runner.getResolvedGraphView().getVertexRefById('join')!)!
          .dependsOnWork,
      ).toEqual(['bundle']);
    });
  }

  test.each(['child-ancestor', 'parent-child', 'self', 'mixed'])(
    `${Constructor.name} rejects eager milestone cycle %s before visitors`,
    async (kind) => {
      const events: string[] = [];
      const traversal = new Constructor<G>({
        discovery: 'eager',
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              vertexContent: {
                $data: 'root',
                $childHints: kind === 'parent-child' ? ['a'] : ['a', 'b'],
              },
            },
          }),
          resolveChild: (id) => ({
            kind: 'found' as const,
            vertex: {
              vertexId: id,
              ...(['mixed', 'parent-child'].includes(kind)
                ? { dependsOnWork: id === 'b' ? ['a'] : [] }
                : {}),
              dependsOnSubgraphCompletion:
                kind === 'child-ancestor'
                  ? ['root']
                  : kind === 'self'
                  ? [id]
                  : id === 'a'
                  ? ['b']
                  : [],
              vertexContent: {
                $data: id,
                $childHints: kind === 'parent-child' && id === 'a' ? ['b'] : [],
              },
            },
          }),
        },
      });
      traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
        events.push(v.getData());
      });
      await expect(async () => {
        await traversal.createRunner().run();
      }).rejects.toMatchObject({
        name: 'DagTraversalStallError',
        diagnostics: { dependencyCycleComponents: expect.any(Array) },
      });
      expect(events).toEqual([]);
    },
  );

  test(`${Constructor.name} seeded work cannot hide original completion cycles`, async () => {
    const runner = new Constructor<G>({
      completedWork: new Set(['root', 'a']),
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['a'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'a',
            dependsOnSubgraphCompletion: ['root'],
            vertexContent: { $data: 'a', $childHints: [] },
          },
        }),
      },
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: { dependencyCycleComponents: [['root', 'a']] },
    });
  });

  test.each(['absent', 'undefined', 'empty'])(
    `${Constructor.name} root completion %s does not control work prerequisite policy`,
    async (mode) => {
      const runner = new Constructor<G>({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found' as const,
            vertex: {
              vertexId: 'root',
              dependsOnWork: ['missing'],
              ...(mode === 'absent'
                ? {}
                : Object.defineProperty({}, 'dependsOnSubgraphCompletion', {
                    value: mode === 'empty' ? [] : undefined,
                    enumerable: true,
                  })),
              vertexContent: { $data: 'root', $childHints: [] },
            },
          }),
          resolveChild: () => ({
            kind: 'omitted' as const,
            satisfiesDependencies: true as const,
          }),
        },
      }).createRunner();
      await expect(async () => {
        await runner.run();
      }).rejects.toMatchObject({
        diagnostics: { unknownPrerequisiteIds: ['missing'] },
      });
    },
  );
}

test('async completion admission and callback settlement do not release C until commit', async () => {
  const gate = deferred<void>();
  const entered = deferred<void>();
  const events: string[] = [];
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 3,
    traversableGraph: bundleGraph(),
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
    events.push(v.getData());
  });
  traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, async (v) => {
    if (v.getData() === 'bundle') {
      entered.resolve();
      await gate.promise;
    }
  });
  const runner = traversal.createRunner();
  const running = runner.run();
  // Observe rejection too, so the RED run does not leave an unhandled rejection.
  const outcome = running.then(
    () => null,
    (error: unknown) => error,
  );
  await Promise.race([entered.promise, outcome]);
  expect(
    await Promise.race([outcome, eventLoopTurn().then(() => 'pending')]),
  ).toBe('pending');
  expect(events).not.toContain('join');
  expect(runner.summary().vertices.get('join')).toMatchObject({
    work: 'pending',
    unmetPrerequisiteIds: ['bundle'],
    unmetSubgraphPrerequisiteIds: ['bundle'],
  });
  gate.resolve();
  await running;
  expect(events).toContain('join');
});

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} seeded bundle waits for children and original completion callback`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      completedWork: new Set(['bundle']),
      traversableGraph: bundleGraph(),
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getData()}`);
    });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (v) => {
      events.push(`C:${v.getData()}`);
    });
    await traversal.createRunner().run();
    expect(events).not.toContain('W:bundle');
    expect(events.indexOf('W:join')).toBeGreaterThan(
      events.indexOf('C:bundle'),
    );
    expect(events.indexOf('C:bundle')).toBeGreaterThan(events.indexOf('C:b'));
  });

  test(`${Constructor.name} eager root may join independent descendant completion`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      discovery: 'eager',
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            dependsOnSubgraphCompletion: ['child'],
            vertexContent: { $data: 'root', $childHints: ['child'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'child',
            dependsOnWork: [],
            vertexContent: { $data: 'child', $childHints: [] },
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getData()}`);
    });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (v) => {
      events.push(`C:${v.getData()}`);
    });
    await traversal.createRunner().run();
    expect(events).toEqual(['W:child', 'C:child', 'W:root', 'C:root']);
  });

  test(`${Constructor.name} lazy child waiting on ancestor completion reports the structural cycle`, async () => {
    const runner = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['child'] },
          },
        }),
        resolveChild: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'child',
            dependsOnSubgraphCompletion: ['root'],
            vertexContent: { $data: 'child', $childHints: [] },
          },
        }),
      },
    }).createRunner();
    await expect(async () => {
      await runner.run();
    }).rejects.toMatchObject({
      diagnostics: {
        dependencyCycleComponents: [['root', 'child']],
        dependencies: [{ id: 'child', unmet: ['root'] }],
        structurallyIncompleteIds: ['root'],
      },
    });
  });

  test(`${Constructor.name} C gates preserve SameValueZero and detached summary arrays`, async () => {
    const reference = {};
    const fn = () => undefined;
    const ids = [undefined, NaN, reference, fn, null, -0];
    const completion = [...ids, NaN, reference, +0];
    const traversal = new Constructor<VertexTypes<unknown, unknown>>({
      discovery: 'eager',
      syntheticRoot: true,
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            dependsOnSubgraphCompletion: ['ignored'],
            vertexContent: { $data: '', $childHints: ['join', ...ids] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            ...(id === 'join'
              ? { dependsOnSubgraphCompletion: completion }
              : {}),
            vertexContent: { $data: id, $childHints: [] },
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (v) =>
      v.getData() === 'join'
        ? undefined
        : {
            commands: [
              { commandName: VisitorCommand.DEFER_WORK_COMPLETION as const },
            ],
          },
    );
    const runner = traversal.createRunner();
    await runner.run();
    const before = runner.summary();
    expect(before.counts.pending).toBe(1);
    const join = before.vertices.get('join')!;
    expect(join).toMatchObject({
      work: 'pending',
      unmetPrerequisiteIds: [undefined, NaN, reference, fn, null, 0],
      unmetSubgraphPrerequisiteIds: [undefined, NaN, reference, fn, null, 0],
    });
    (join.unmetSubgraphPrerequisiteIds as unknown[]).length = 0;
    (join.unmetPrerequisiteIds as unknown[]).length = 0;
    completion.length = 0;
    const graph = runner.getResolvedGraphView();
    const stored = graph.get(graph.getVertexRefById('join')!)!;
    expect(stored.dependsOnSubgraphCompletion).toHaveLength(6);
    (stored.dependsOnSubgraphCompletion as unknown[]).length = 0;
    expect(
      graph.get(graph.getVertexRefById('join')!)!.dependsOnSubgraphCompletion,
    ).toHaveLength(6);
    expect(
      runner.summary().vertices.get('join')!.unmetSubgraphPrerequisiteIds,
    ).toHaveLength(6);
    expect(
      runner.summary().vertices.get(reference)!.unmetSubgraphPrerequisiteIds,
    ).toEqual([]);
    for (const id of ids)
      runner.settle(
        id,
        { kind: 'workCompleted' },
        before.vertices.get(id)!.generation!,
      );
    await runner.run();
    expect(runner.summary().vertices.get('join')).toMatchObject({
      subgraphComplete: true,
      unmetSubgraphPrerequisiteIds: [],
    });
  });

  test(`${Constructor.name} shared children finish once before both bundle gates release`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found' as const,
          vertex: {
            vertexId: 'root',
            vertexContent: { $data: 'root', $childHints: ['join', 'a', 'b'] },
          },
        }),
        resolveChild: (id) => ({
          kind: 'found' as const,
          vertex: {
            vertexId: id,
            dependsOnWork: [],
            ...(id === 'join'
              ? { dependsOnSubgraphCompletion: ['a', 'b'] }
              : {}),
            vertexContent: {
              $data: id,
              $childHints: id === 'a' || id === 'b' ? ['shared'] : [],
            },
          },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getData()}`);
    });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (v) => {
      events.push(`C:${v.getData()}`);
    });
    await traversal.createRunner().run();
    expect(events.filter((event) => event === 'C:shared')).toHaveLength(1);
    expect(events.indexOf('W:join')).toBeGreaterThan(events.indexOf('C:a'));
    expect(events.indexOf('W:join')).toBeGreaterThan(events.indexOf('C:b'));
  });
}

for (const Constructor of [DagTraversal, AsyncDagTraversal]) {
  test(`${Constructor.name} disabling bundle discovery closes C while retaining its dependent`, async () => {
    const events: string[] = [];
    const traversal = new Constructor<G>({ traversableGraph: bundleGraph() });
    traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
      events.push(`W:${v.getData()}`);
      return v.getData() === 'bundle'
        ? { commands: [{ commandName: Command.SKIP_REMAINING_CHILDREN }] }
        : undefined;
    });
    traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (v) => {
      events.push(`C:${v.getData()}`);
    });
    const runner = traversal.createRunner();
    await runner.run();
    expect(events).not.toContain('W:a');
    expect(events.indexOf('W:join')).toBeGreaterThan(
      events.indexOf('C:bundle'),
    );
    expect(runner.summary().counts.subgraphCompleted).toBe(3);
  });

  test(`${Constructor.name} a failed C visitor preserves the exact error and never admits its dependent`, async () => {
    for (const error of [undefined, null, { failure: 'subgraphCompletion' }]) {
      const seen: string[] = [];
      const traversal = new Constructor<G>({ traversableGraph: bundleGraph() });
      traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
        seen.push(v.getData());
      });
      traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, (v) => {
        if (v.getData() === 'bundle') throw error;
      });
      await expect(async () => {
        await traversal.createRunner().run();
      }).rejects.toBe(error);
      expect(seen).not.toContain('join');
    }
  });
}

test('halt during held async C preserves pending completion and releases only after resume', async () => {
  const gate = deferred<void>();
  const entered = deferred<void>();
  const seen: string[] = [];
  const traversal = new AsyncDagTraversal<G>({
    concurrency: 3,
    traversableGraph: bundleGraph(),
  });
  traversal.addVisitorFor(Order.ON_WORK_READY, (v) => {
    seen.push(v.getData());
  });
  traversal.addVisitorFor(Order.ON_SUBGRAPH_READY, async (v) => {
    if (v.getData() === 'bundle') {
      entered.resolve();
      await gate.promise;
    }
  });
  const runner = traversal.createRunner();
  const iterator = runner.iterateEvents({ emitEvents: [] });
  const running = iterator.next();
  await entered.promise;
  expect(runner.summary().vertices.get('join')!.work).toBe('pending');
  const closing = iterator.return(undefined);
  gate.resolve();
  await closing;
  await running;
  expect(seen).not.toContain('join');
  await runner.run();
  expect(seen).toContain('join');
  expect(runner.summary().vertices.get('join')!.subgraphComplete).toBe(true);
});

test('validated summaries read completion presence without copying original declarations', () => {
  const runner = new DagTraversal<G>({
    discovery: 'eager',
    traversableGraph: bundleGraph(),
  })
    .createRunner()
    .run();
  const declarations = jest.spyOn(
    runnerInternals(runner).resolvedGraphsContainer.store,
    'getDeclaredCompleteDependencies',
  );
  try {
    const summary = runner.summary();
    expect(summary.vertices.get('join')!.unmetSubgraphPrerequisiteIds).toEqual(
      [],
    );
    expect(declarations).not.toHaveBeenCalled();
  } finally {
    declarations.mockRestore();
  }
});
