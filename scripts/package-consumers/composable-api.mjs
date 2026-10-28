import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as rewrite from 'configurable-tree-traversal/tools/rewrite-object';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
for (const name of [
  'DagTraversal',
  'AsyncDagTraversal',
  'DepthFirstTreeTraversal',
  'DagTraversalStallError',
  'TraversalVisitorCommandName',
  'core',
  'dagTraversal',
  'rewriteObject',
  'rewriteObjectAs',
])
  assert.equal(esm[name], cjs[name]);
assert.equal(rewrite.rewriteObjectAs, cjs.rewriteObjectAs);
assert.equal(dag.DagTraversal, cjs.DagTraversal);

const exactThrow = async (operation, expected) => {
  let threw = false;
  try {
    await operation();
  } catch (value) {
    threw = true;
    assert.equal(value, expected);
  }
  assert(threw, 'expected exact thrown value');
};
for (const api of [cjs, esm]) {
  const C = api.TraversalVisitorCommandName;
  const D = api.DagVisitorPhase;
  const F = api.DepthFirstPhase;
  const found = (id, hints = [], declarations = {}) => ({
    kind: 'found',
    vertex: {
      vertexId: id,
      vertexContent: { $data: id, $childHints: hints },
      ...declarations,
    },
  });
  const tree = {
    resolveRoot: () => ({
      kind: 'found',
      vertex: { vertexContent: { $data: 'root', $childHints: [] } },
    }),
    resolveChild: () => ({ kind: 'omitted' }),
  };
  // Both helpers reject presence before any source/rewrite/conversion callback.
  for (const helper of [api.rewriteObject, api.rewriteObjectAs]) {
    for (const traversableTree of [undefined, tree]) {
      let calls = 0;
      assert.throws(
        () =>
          helper(
            {},
            {
              traversableTree,
              getRootPropertyFromInputObject: () => {
                calls++;
              },
              rewrite: () => {
                calls++;
              },
              convertRootValue: () => {
                calls++;
              },
            },
          ),
        /traversableTree/,
      );
      assert.equal(calls, 0);
    }
  }
  assert.equal(api.rewriteObjectAs(3).getOutput(), 3); // No schema validation.
  let paused = false;
  let conversions = 0;
  const result = api.rewriteObject(
    { count: 1 },
    {
      visitors: {
        [F.POST_ORDER]: {
          priority: 200,
          visitor: (_v, o) => {
            if (o.isTreeRoot && !paused) {
              paused = true;
              return { commands: [{ commandName: C.PAUSE_TRAVERSAL }] };
            }
          },
        },
      },
      rewrite: ({ key }) =>
        key === 'count' ? { rewrite: { key: 'renamed' } } : undefined,
      convertRootValue: (value) => {
        conversions++;
        if (conversions === 2) throw undefined;
        return { value };
      },
    },
  );
  assert.deepEqual(result.outputAtReturn, { value: { count: 1 } });
  assert.throws(() => result.getOutput(), /not complete/i);
  result.traversalRunner.run();
  await exactThrow(() => result.getOutput(), undefined);
  const final = result.getOutput();
  assert.deepEqual(final, { value: { renamed: 1 } });
  assert.equal(result.getOutput(), final);
  assert.equal(conversions, 3);
  assert.deepEqual(result.outputAtReturn, { value: { count: 1 } });
  const finished = api.rewriteObjectAs(null);
  assert.equal(finished.getOutput(), finished.outputAtReturn);

  // All six builders detach arrays and wrappers, sharing closure/group identity.
  for (const [TreeTraversal, phase, graphMode] of [
    [api.DepthFirstTreeTraversal, F.PRE_ORDER, false],
    [api.AsyncDepthFirstTreeTraversal, F.PRE_ORDER, false],
    [api.BreadthFirstTreeTraversal, api.BreadthFirstPhase.LEVEL_ORDER, false],
    [
      api.AsyncBreadthFirstTreeTraversal,
      api.BreadthFirstPhase.LEVEL_ORDER,
      false,
    ],
    [api.DagTraversal, D.ON_WORK_READY, true],
    [api.AsyncDagTraversal, D.ON_WORK_READY, true],
  ]) {
    const calls = [];
    const builder = new TreeTraversal(
      graphMode
        ? {
            traversableGraph: {
              resolveRoot: () => found('root'),
              resolveChild: () => found('unused'),
            },
          }
        : { traversableTree: tree },
    );
    let runner;
    builder.setVisitorsFor(phase, {
      groups: [
        {
          visitors: [
            () => {
              calls.push('original');
              assert.equal(runner.requestPause(), true);
              assert.equal(runner.requestPause(), false);
            },
          ],
        },
      ],
    });
    const before = builder.listVisitorsFor(phase);
    builder.setVisitorsFor(phase, before);
    const copy = builder.listVisitorsFor(phase);
    assert.notEqual(copy, before);
    assert.notEqual(copy[0], before[0]);
    assert.equal(copy[0].visitor, before[0].visitor);
    assert.equal(copy[0].visitorGroup, before[0].visitorGroup);
    assert(Object.isFrozen(copy[0].visitorGroup));
    copy[0].visitor = () => {
      calls.push('replacement');
    };
    copy[0].priority = -99;
    copy[0].commandCommitMode = 'afterGroup';
    copy.length = 0;
    runner = builder.createRunner();
    assert.equal(runner.requestPause(), false);
    await runner.run();
    assert.equal(runner.getStopReason(), 'paused');
    assert.deepEqual(calls, ['original']);
    assert.equal(runner.requestPause(), false);
    await runner.run();
    assert.equal(runner.getStatus(), 'FINISHED');
    assert.deepEqual(calls, ['original']);
  }

  for (const TreeTraversal of [api.DagTraversal, api.AsyncDagTraversal]) {
    // Preparation works in both source modes; run adopts without discovery replay.
    for (const graphMode of [false, true]) {
      let sources = 0;
      let visits = 0;
      const resolveRoot = () => {
        sources++;
        return graphMode ? found('root') : tree.resolveRoot();
      };
      const runner = new TreeTraversal({
        ...(graphMode
          ? {
              traversableGraph: {
                resolveRoot,
                resolveChild: () => found('unused'),
              },
            }
          : { traversableTree: { ...tree, resolveRoot } }),
        workCompletion: 'externalSettlement',
        visitors: {
          [D.ON_WORK_READY]: () => {
            visits++;
          },
        },
      }).createRunner();
      assert.equal(await runner.prepare(), runner);
      assert.equal(runner.getStopReason(), 'prepared');
      assert.equal(runner.summary().discovery.mode, 'eager');
      assert.equal(visits, 0);
      assert.deepEqual(runner.summary().completedWorkIds, []);
      assert.deepEqual(runner.summary().awaitingSettlement, []);
      await runner.prepare();
      assert.equal(sources, 1);
      const events = [];
      for await (const event of runner.iterateEvents()) events.push(event);
      assert.deepEqual(events, []);
      assert.equal(visits, 1);
      assert.equal(sources, 1);
      const snapshot = runner.summary();
      const work = snapshot.awaitingSettlement[0];
      assert.equal(typeof work.generation, 'symbol');
      const preserved = runner.summary().awaitingSettlement[0];
      assert.notEqual(work, preserved);
      work.generation = Symbol();
      snapshot.awaitingSettlement.length = 0;
      assert.equal(
        runner.summary().awaitingSettlement[0].generation,
        preserved.generation,
      );
      assert.throws(
        () =>
          runner.settle(
            preserved.vertexId,
            { kind: 'workCompleted' },
            Symbol(),
          ),
        TypeError,
      );
      assert.equal(
        runner.settle(
          preserved.vertexId,
          { kind: 'workCompleted' },
          preserved.generation,
        ),
        true,
      );
      assert.deepEqual(runner.summary().awaitingSettlement, []);
      for await (const event of runner.iterateEvents()) events.push(event);
      assert.deepEqual(
        events.map(({ kind }) => kind),
        ['workCompleted', 'subgraphCompleted'],
      );
      assert.equal(runner.getStopReason(), 'finished');
      assert.equal(sources, 1);
      assert.equal(
        runner.settle(
          preserved.vertexId,
          { kind: 'workCompleted' },
          preserved.generation,
        ),
        false,
      );
      await assert.rejects(async () => runner.prepare(), /prepar/i);
    }
    for (const sourceMode of ['tree', 'graph']) {
      const input =
        sourceMode === 'tree'
          ? { traversableTree: tree }
          : {
              traversableGraph: {
                resolveRoot: () => found('root'),
                resolveChild: () => found('unused'),
              },
            };
      const fresh = new TreeTraversal(input).createRunner();
      const before = fresh.inspect();
      assert.throws(
        () =>
          new TreeTraversal({
            ...input,
            traversalRunnerInternalObjects: { state: {} },
          }),
        /not a public option/i,
      );
      assert.deepEqual(fresh.inspect(), before);
      await fresh.run();
      assert.equal(fresh.getStopReason(), 'finished');
      const frozen = new TreeTraversal({
        ...input,
        visitors: {
          [D.ON_WORK_READY]: () => ({
            commands: [
              {
                commandName: C.REWRITE_CHILD_HINTS,
                commandArguments: { newHints: [] },
              },
            ],
          }),
        },
      }).createRunner();
      await frozen.prepare();
      await assert.rejects(async () => frozen.run(), /topology|eager/i);
    }
    const empty = new TreeTraversal({
      traversableGraph: {
        resolveRoot: () => ({ kind: 'omitted', satisfiesDependencies: true }),
        resolveChild: () => found('unused'),
      },
    }).createRunner();
    await empty.prepare();
    assert.equal(empty.getStopReason(), 'prepared');
    await empty.run();
    assert.equal(empty.getStopReason(), 'finished');
    const seeded = new TreeTraversal({
      completedWork: ['root'],
      traversableGraph: {
        resolveRoot: () => found('root'),
        resolveChild: () => found('unused'),
      },
    }).createRunner();
    await seeded.prepare();
    const seededEvents = [];
    for await (const event of seeded.iterateEvents())
      seededEvents.push(event.kind);
    assert.deepEqual(seededEvents, ['subgraphCompleted']);

    // Own-property validation runs before generated/prerequisite fallback.
    class Inherited {
      get vertexId() {
        return 42;
      }
      vertexContent = { $data: 'value', $childHints: [] };
    }
    for (const tagged of [false, true]) {
      for (const stage of ['root', 'child', 'prerequisite']) {
        const instance = new Inherited();
        const inherited = () =>
          tagged ? { kind: 'found', vertex: instance } : instance;
        const rejected = new TreeTraversal({
          traversableGraph: {
            resolveRoot: () =>
              stage === 'root'
                ? inherited()
                : found(
                    'root',
                    stage === 'child' ? ['child'] : [],
                    stage === 'prerequisite' ? { dependsOnWork: [42] } : {},
                  ),
            resolveChild: inherited,
            resolvePrerequisite: inherited,
          },
        }).createRunner();
        await assert.rejects(async () => rejected.prepare(), TypeError);
        assert.equal(rejected.requestPause(), false);
      }
      const instance = new Inherited();
      const own = new TreeTraversal({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found',
            vertex: {
              vertexId: instance.vertexId,
              vertexContent: instance.vertexContent,
            },
          }),
          resolveChild: () => found('unused'),
        },
      }).createRunner();
      await own.run();
      assert.deepEqual(own.summary().completedWorkIds, [42]);
    }
    for (const error of [undefined, null, {}]) {
      const failedGetter = new TreeTraversal({
        traversableGraph: {
          resolveRoot: () => ({
            kind: 'found',
            vertex: {
              get vertexId() {
                throw error;
              },
              vertexContent: { $data: '', $childHints: [] },
            },
          }),
          resolveChild: () => found('unused'),
        },
      }).createRunner();
      await exactThrow(() => failedGetter.prepare(), error);
      await exactThrow(() => failedGetter.run(), error);
    }
    // Capture tagged payload once, without evaluating a replacement payload.
    let reads = 0;
    const captured = new TreeTraversal({
      traversableGraph: {
        resolveRoot: () => ({
          kind: 'found',
          get vertex() {
            reads++;
            return reads === 1 ? found(undefined).vertex : new Inherited();
          },
        }),
        resolveChild: () => found('unused'),
      },
    }).createRunner();
    await captured.run();
    assert.equal(reads, 1);
    assert.deepEqual(captured.summary().completedWorkIds, [undefined]);

    // Original labelled constraints include seeds/missing endpoints and retain ID identity.
    const id = {};
    const missing = Symbol('missing');
    const missingCompletion = Symbol('missing completion');
    const invalid = new TreeTraversal({
      completedWork: [id],
      traversableGraph: {
        resolveRoot: () =>
          found(id, ['child'], {
            dependsOnWork: [missing],
            dependsOnSubgraphCompletion: [missingCompletion],
          }),
        resolveChild: (hint) => found(hint),
      },
    }).createRunner();
    let failure;
    try {
      await invalid.prepare();
    } catch (value) {
      failure = value;
    }
    assert(failure instanceof api.DagTraversalStallError);
    assert(failure instanceof esm.DagTraversalStallError);
    const edge = failure.diagnostics.dependencyEdges[0];
    assert.equal(edge.waiter.vertexId, id);
    assert.equal(edge.prerequisite.vertexId, missing);
    assert.deepEqual(
      [edge.waiter.milestone, edge.prerequisite.milestone, edge.reason],
      ['work', 'work', 'workDependency'],
    );
    assert.deepEqual(
      failure.diagnostics.dependencyEdges.map(
        ({ waiter, prerequisite, reason }) => [
          waiter.vertexId,
          waiter.milestone,
          prerequisite.vertexId,
          prerequisite.milestone,
          reason,
        ],
      ),
      [
        [id, 'work', missing, 'work', 'workDependency'],
        [
          id,
          'work',
          missingCompletion,
          'subgraphCompletion',
          'subgraphCompletionDependency',
        ],
        [id, 'subgraphCompletion', id, 'work', 'ownWork'],
        [
          id,
          'subgraphCompletion',
          'child',
          'subgraphCompletion',
          'structuralChild',
        ],
        ['child', 'subgraphCompletion', 'child', 'work', 'ownWork'],
      ],
    );
    const next = invalid.summary().diagnostics.dependencyEdges[0];
    assert.notEqual(next, edge);
    assert.notEqual(next.waiter, edge.waiter);
    assert.equal(next.waiter.vertexId, id);
    edge.waiter.milestone = 'subgraphCompletion';
    assert.equal(next.waiter.milestone, 'work');
    assert.equal(Object.isFrozen(id), false);
  }
  // A pause request waits for admitted discovery without canceling it; run adopts it.
  let release;
  let entered;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  let sourceCalls = 0;
  const preparing = new api.AsyncDagTraversal({
    traversableGraph: {
      resolveRoot: async () => {
        sourceCalls++;
        entered();
        await gate;
        return found('root');
      },
      resolveChild: () => found('unused'),
    },
  }).createRunner();
  let preparationSettled = false;
  const operation = preparing.prepare().then(() => {
    preparationSettled = true;
  });
  await started;
  assert.equal(preparing.requestPause(), true);
  await Promise.resolve();
  assert.equal(preparationSettled, false);
  assert.equal(preparing.getStatus(), 'RUNNING');
  release();
  await operation;
  assert.equal(preparing.getStopReason(), 'paused');
  await preparing.run();
  assert.equal(preparing.getStopReason(), 'finished');
  assert.equal(sourceCalls, 1);
  const legacy = new api.DagTraversalStallError({
    dependencies: [],
    unknownPrerequisiteIds: [],
    dependencyCycleComponents: [],
    dependencyBlockedIds: [],
    structurallyIncompleteIds: [],
  });
  assert.deepEqual(legacy.diagnostics.dependencyEdges, []);
}
console.log(
  'Verified composable runtime capabilities with shared CJS/ESM identity.',
);
