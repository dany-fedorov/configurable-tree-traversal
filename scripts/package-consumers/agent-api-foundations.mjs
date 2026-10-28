import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
import * as sources from 'configurable-tree-traversal/sources';

const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsSources = require('configurable-tree-traversal/sources');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
for (const name of [
  'materializeDagInputFromRecords',
  'materializeDagInputFromRoots',
  'materializeDagInputFromRecordsAsync',
  'materializeDagInputFromRootsAsync',
]) {
  assert.equal(esm[name], cjs[name]);
  assert.equal(sources[name], cjs[name]);
  assert.equal(cjsSources[name], cjs[name]);
}
for (const name of [
  'prepareDag',
  'prepareDagAsync',
  'createDagWorkSession',
  'createAsyncDagWorkSession',
  'filterDagDataVisitor',
  'filterAsyncDagDataVisitor',
]) {
  assert.equal(esm[name], cjs[name]);
  assert.equal(dag[name], cjs[name]);
  assert.equal(cjsDag[name], cjs[name]);
}

const drain = async (coordinator) => {
  const ids = [];
  for (;;) {
    const boundary = await coordinator.advance();
    if (boundary.kind === 'finished') return ids;
    assert.equal(boundary.kind, 'awaitingSettlement');
    assert(boundary.workTickets.length > 0);
    for (const ticket of boundary.workTickets) {
      ids.push(ticket.vertexId);
      assert.deepEqual(coordinator.completeWork(ticket), { kind: 'accepted' });
      assert.deepEqual(coordinator.completeWork(ticket), {
        kind: 'alreadyAccepted',
      });
    }
  }
};

for (const api of [cjs, esm]) {
  const ids = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
  let selections = 0;
  const items = [
    { id: ids[0], requires: [] },
    { id: ids[1], requires: [ids[0]] },
    { id: ids[2], requires: [ids[0]] },
  ];
  const source = api.materializeDagInputFromRecords(items, {
    id: (item) => {
      selections++;
      return item.id;
    },
    dependsOnWork: (item) => item.requires,
  });
  let lookups = 0;
  const countedSource = {
    ...source,
    traversableGraph: Object.fromEntries(
      Object.entries(source.traversableGraph).map(([key, callback]) => [
        key,
        (...args) => {
          lookups++;
          return callback(...args);
        },
      ]),
    ),
  };
  const prepared = api.prepareDag(countedSource);
  assert.equal(prepared.kind, 'valid');
  assert.equal(selections, 3);
  assert(lookups > 0);
  const preparedLookups = lookups;
  assert.equal(prepared.dag.vertices[0].data, items[0]);
  assert.deepEqual(
    prepared.dag.vertices.map((vertex) => vertex.vertexId),
    ids,
  );
  const first = prepared.dag.createWorkSession();
  const seeded = prepared.dag.createWorkSession({
    completedWork: new Set([ids[0]]),
  });
  const initial = first.advance();
  const resumed = seeded.advance();
  assert.equal(initial.kind, 'awaitingSettlement');
  assert.equal(resumed.kind, 'awaitingSettlement');
  assert.deepEqual(
    initial.workTickets.map((ticket) => ticket.vertexId),
    [ids[0]],
  );
  assert.deepEqual(
    resumed.workTickets.map((ticket) => ticket.vertexId),
    ids.slice(1),
  );
  assert.throws(() => seeded.completeWork(initial.workTickets[0]), TypeError);
  assert.throws(() => first.completeWork({ vertexId: ids[0] }), TypeError);
  assert.deepEqual(await drain(first), ids);
  assert.deepEqual(await drain(seeded), ids.slice(1));
  assert.equal(
    lookups,
    preparedLookups,
    'sessions must not replay original sources',
  );
  assert.equal(selections, 3);

  const coordinator = api.createDagWorkSession(
    prepared.dag.createRunner({ workCompletion: 'externalSettlement' }),
  );
  assert.deepEqual(await drain(coordinator), ids);
  const asyncCoordinator = api.createAsyncDagWorkSession(
    await prepared.dag.createAsyncRunner({
      workCompletion: 'externalSettlement',
    }),
  );
  assert.deepEqual(await drain(asyncCoordinator), ids);
  assert.deepEqual(
    await drain(
      await prepared.dag.createAsyncWorkSession({
        completedWork: new Set([ids[0]]),
        concurrency: 2,
      }),
    ),
    ids.slice(1),
  );
  assert.equal(lookups, preparedLookups);

  async function* catalog() {
    yield { id: undefined };
    yield { id: NaN };
  }
  const asyncSource = await api.materializeDagInputFromRecordsAsync(catalog(), {
    id: async (item) => item.id,
  });
  const asyncPrepared = await api.prepareDagAsync(asyncSource);
  assert.equal(asyncPrepared.kind, 'valid');
  assert.deepEqual(
    await drain(await asyncPrepared.dag.createAsyncWorkSession()),
    [undefined, NaN],
  );

  const leaf = { id: Symbol('leaf'), children: [] };
  const roots = [
    { id: Symbol('left'), children: [leaf] },
    { id: Symbol('right'), children: [leaf] },
  ];
  const selectors = {
    id: (item) => item.id,
    children: (item) => item.children,
  };
  for (const forest of [
    api.materializeDagInputFromRoots(roots, selectors),
    await api.materializeDagInputFromRootsAsync(roots, {
      id: async (item) => item.id,
      children: async (item) => item.children,
    }),
  ]) {
    const result = api.prepareDag(forest);
    assert.equal(result.kind, 'valid');
    const runner = result.dag.createRunner();
    runner.run();
    const graph = runner.getResolvedGraph();
    assert.equal(graph.getVertexRefs().length, 3);
    assert.deepEqual(
      graph
        .getParentsOf(graph.getVertexRefById(leaf.id))
        .map((ref) => graph.getVertexId(ref)),
      roots.map((root) => root.id),
    );
    assert.deepEqual(
      graph.getParentsOf(graph.getVertexRefById(roots[0].id)),
      [],
    );
  }

  for (const asyncMode of [false, true]) {
    const taskId = {};
    const groupId = Symbol('group');
    const records = [
      { id: taskId, kind: 'task', label: 'build' },
      { id: groupId, kind: 'group', label: 'bundle' },
    ];
    const TreeTraversal = asyncMode ? api.AsyncDagTraversal : api.DagTraversal;
    const traversal = new TreeTraversal(
      api.materializeDagInputFromRecords(records, { id: (item) => item.id }),
    );
    const calls = [];
    const callback = (data, options) => {
      calls.push(data);
      assert.equal(
        options.resolvedGraph.getVertexId(options.vertexRef),
        taskId,
      );
      return {
        commands: [
          {
            commandName: api.TraversalVisitorCommandName.REWRITE_VERTEX_DATA,
            commandArguments: { newData: { ...data, label: 'built' } },
          },
        ],
      };
    };
    traversal.addVisitorFor(
      api.DagVisitorPhase.ON_WORK_READY,
      asyncMode
        ? api.filterAsyncDagDataVisitor(
            (data) => data.kind === 'task',
            async (data, options) => callback(data, options),
          )
        : api.filterDagDataVisitor((data) => data.kind === 'task', callback),
    );
    const runner = traversal.createRunner();
    const events = [];
    for await (const event of runner.iterateEvents()) {
      events.push(event);
      assert(event.vertexId === taskId || event.vertexId === groupId);
      assert(!('order' in event));
      assert(!('phase' in event));
    }
    assert.deepEqual(calls, [records[0]]);
    assert.equal(events.filter((event) => event.vertexId === taskId).length, 2);
    assert.equal(
      events.filter((event) => event.vertexId === groupId).length,
      2,
    );
    assert.equal(
      runner.getResolvedGraph().getVertexRefById(taskId).getValue().getData()
        .label,
      'built',
    );
    assert.equal(
      runner.getResolvedGraph().getVertexRefById(groupId).getValue().getData()
        .label,
      'bundle',
    );
  }
}

assert.equal(esm.DagDiscoveryCycleError, cjs.DagDiscoveryCycleError);
assert.equal(dag.DagDiscoveryCycleError, esm.DagDiscoveryCycleError);
assert.equal(cjsDag.DagDiscoveryCycleError, esm.DagDiscoveryCycleError);
for (const api of [esm, cjs]) {
  assert.throws(
    () =>
      new api.DagTraversal(
        api.materializeDagInputFromRecords([{ id: 'a', children: ['a'] }], {
          id: (item) => item.id,
          children: (item) => item.children,
        }),
      ).createRunner().run(),
    (error) =>
      error instanceof esm.DagDiscoveryCycleError &&
      error.vertexIds.join(',') === 'a,a',
  );
  for (const prepare of [api.prepareDag, api.prepareDagAsync]) {
    const invalid = await prepare(
      api.materializeDagInputFromRecords([{ id: 'b', deps: ['missing'] }], {
        id: (item) => item.id,
        dependsOnWork: (item) => item.deps,
      }),
    );
    assert.equal(invalid.kind, 'invalid');
    assert.equal('diagnostics' in invalid, false);
    assert.equal(invalid.issues.length, 1);
    assert.equal(invalid.issues[0].kind, 'milestone');
    assert.deepEqual(invalid.issues[0].diagnostics.unknownPrerequisiteIds, [
      'missing',
    ]);
  }
  const prepared = api.prepareDag(
    api.materializeDagInputFromRecords([{ id: 'a' }], {
      id: (item) => item.id,
    }),
  );
  for (const session of [
    prepared.dag.createWorkSession(),
    await prepared.dag.createAsyncWorkSession(),
  ]) {
    assert.equal(session.getStopReason(), 'prepared');
    assert.equal(session.isHalted(), true);
    assert.equal(session.inspect().status, session.getStatus());
    assert.equal(
      session.inspectMilestones().explain({ vertexId: 'a', milestone: 'work' })
        .satisfied,
      false,
    );
    const boundary = await session.advance();
    assert.equal('fail' in session, false);
    const error = { fatal: true };
    session.failTraversal(boundary.workTickets[0], error);
    await assert.rejects(
      async () => session.advance(),
      (value) => value === error,
    );
  }
}

for (const api of [esm, cjs, dag, cjsDag, esm.dagTraversal, cjs.dagTraversal]) {
  assert.equal(Object.hasOwn(api, 'DagWorkTicket'), false);
  const cyclic =
    api === dag ||
    api === cjsDag ||
    api === esm.dagTraversal ||
    api === cjs.dagTraversal
      ? esm.materializeDagInputFromRecords([{ id: 'a', children: ['a'] }], {
          id: (v) => v.id,
          children: (v) => v.children,
        })
      : api.materializeDagInputFromRecords([{ id: 'a', children: ['a'] }], {
          id: (v) => v.id,
          children: (v) => v.children,
        });
  for (const prepare of [api.prepareDag, api.prepareDagAsync])
    assert.deepEqual(await prepare(cyclic), {
      kind: 'invalid',
      issues: [{ kind: 'discoveryCycle', vertexIds: ['a', 'a'] }],
    });
}
for (const api of [esm, cjs]) {
  for (const Constructor of [api.DagTraversal, api.AsyncDagTraversal]) {
    const input = api.materializeDagInputFromRecords([{ id: 'a' }], {
      id: (v) => v.id,
    });
    assert.throws(
      () => new Constructor({ ...input, workCompletion: 'visitorReturn' }),
      TypeError,
    );
    const runner = new Constructor({
      ...input,
      workCompletion: 'afterWorkReadyChain',
    }).createRunner();
    await runner.run();
    assert.deepEqual(runner.summary().completedWorkIds, ['a']);
    const progress = runner.summary().vertices.get('a');
    assert.deepEqual(progress.unmetWorkPrerequisiteIds, []);
    assert.deepEqual(progress.unmetSubgraphPrerequisiteIds, []);
    const session = api.createDagWorkSession(
      new api.DagTraversal({
        ...input,
        workCompletion: 'externalSettlement',
      }).createRunner(),
    );
    const ticket = session.advance().workTickets[0];
    assert.throws(() => session.completeWork({ ...ticket }), TypeError);
    assert.deepEqual(session.completeWork(ticket), { kind: 'accepted' });
  }
}
