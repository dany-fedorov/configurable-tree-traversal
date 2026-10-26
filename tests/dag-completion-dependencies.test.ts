import { DagTraversal } from '../src/traversals/dag-traversal/DagTraversal';
import { AsyncDagTraversal } from '../src/traversals/dag-traversal/AsyncDagTraversal';
import { DagVisitorPhase as Order } from '../src/traversals/dag-traversal/lib/DagTraversalOrder';
import type { VertexTypes } from '../src/core/TreeTypeParameters';
import { TraversalVisitorCommandName as Command } from '../src/core/TraversalVisitor';
import { DEFER_READY } from '../src/traversals/dag-traversal/lib/DagProgress';
import { deferred, eventLoopTurn } from './helpers/graph-fixtures';

type G = VertexTypes<string, string>;
function bundleGraph() {
  return {
    resolveRoot: () => ({
      vertexId: 'root',
      vertexContent: { $d: 'root', $c: ['join', 'bundle'] },
    }),
    resolveChild: (hint: string) => ({
      vertexId: hint,
      ...(hint === 'join'
        ? { dependsOnWork: ['bundle'], dependsOnSubgraphCompletion: ['bundle', 'bundle'] }
        : {}),
      vertexContent: { $d: hint, $c: hint === 'bundle' ? ['a', 'b', 'a'] : [] },
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
          .getResolvedGraph()
          .get(runner.getResolvedGraph().getVertexById('join')!)!.dependsOnWork,
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
            vertexId: 'root',
            vertexContent: {
              $d: 'root',
              $c: kind === 'parent-child' ? ['a'] : ['a', 'b'],
            },
          }),
          resolveChild: (id) => ({
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
              $d: id,
              $c: kind === 'parent-child' && id === 'a' ? ['b'] : [],
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
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['a'] },
        }),
        resolveChild: () => ({
          vertexId: 'a',
          dependsOnSubgraphCompletion: ['root'],
          vertexContent: { $d: 'a', $c: [] },
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
            vertexId: 'root',
            dependsOnWork: ['missing'],
            ...(mode === 'absent'
              ? {}
              : Object.defineProperty({}, 'dependsOnSubgraphCompletion', {
                  value: mode === 'empty' ? [] : undefined,
                  enumerable: true,
                })),
            vertexContent: { $d: 'root', $c: [] },
          }),
          resolveChild: () => ({ vertexContent: null }),
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
          vertexId: 'root',
          dependsOnSubgraphCompletion: ['child'],
          vertexContent: { $d: 'root', $c: ['child'] },
        }),
        resolveChild: () => ({
          vertexId: 'child',
          dependsOnWork: [],
          vertexContent: { $d: 'child', $c: [] },
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
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['child'] },
        }),
        resolveChild: () => ({
          vertexId: 'child',
          dependsOnSubgraphCompletion: ['root'],
          vertexContent: { $d: 'child', $c: [] },
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
          dependsOnSubgraphCompletion: ['ignored'],
          vertexContent: { $d: '', $c: ['join', ...ids] },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          ...(id === 'join' ? { dependsOnSubgraphCompletion: completion } : {}),
          vertexContent: { $d: id, $c: [] },
        }),
      },
    });
    traversal.addVisitorFor(Order.ON_WORK_READY, (v) =>
      v.getData() === 'join' ? undefined : DEFER_READY,
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
    const graph = runner.getResolvedGraph();
    const stored = graph.get(graph.getVertexById('join')!)!;
    expect(stored.dependsOnSubgraphCompletion).toHaveLength(6);
    (stored.dependsOnSubgraphCompletion as unknown[]).length = 0;
    expect(
      graph.get(graph.getVertexById('join')!)!.dependsOnSubgraphCompletion,
    ).toHaveLength(6);
    expect(
      runner.summary().vertices.get('join')!.unmetSubgraphPrerequisiteIds,
    ).toHaveLength(6);
    expect(runner.summary().vertices.get(reference)).not.toHaveProperty(
      'unmetSubgraphPrerequisiteIds',
    );
    for (const id of ids)
      runner.settle(id, { ok: true }, before.vertices.get(id)!.generation!);
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
          vertexId: 'root',
          vertexContent: { $d: 'root', $c: ['join', 'a', 'b'] },
        }),
        resolveChild: (id) => ({
          vertexId: id,
          dependsOnWork: [],
          ...(id === 'join' ? { dependsOnSubgraphCompletion: ['a', 'b'] } : {}),
          vertexContent: {
            $d: id,
            $c: id === 'a' || id === 'b' ? ['shared'] : [],
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
        ? { commands: [{ commandName: Command.DISABLE_SUBTREE_TRAVERSAL }] }
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
  const iterator = runner.iterateEvents({ iterateOver: [] });
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
    runner.resolvedGraphsContainer.store,
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
