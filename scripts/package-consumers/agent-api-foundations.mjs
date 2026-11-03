import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
import * as sources from 'configurable-tree-traversal/dag-input-materialization';

const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
const cjsSources = require('configurable-tree-traversal/dag-input-materialization');
const cjsDag = require('configurable-tree-traversal/traversals/dag-traversal');
for (const name of [
  'materializeMultiEntryDagInputFromRecordCatalog',
  'materializeDagInputFromRootRecords',
  'materializeMultiEntryDagInputFromRecordCatalogAsync',
  'materializeDagInputFromRootRecordsAsync',
]) {
  assert.equal(esm[name], cjs[name]);
  assert.equal(sources[name], cjs[name]);
  assert.equal(cjsSources[name], cjs[name]);
}
for (const name of [
  'discoverValidateAndCaptureDag',
  'discoverValidateAndCaptureDagAsync',
  'bindDagExternalWorkSession',
  'bindAsyncDagExternalWorkSession',
  'createConditionalDagDataVisitor',
  'createConditionalAsyncDagDataVisitor',
]) {
  assert.equal(esm[name], cjs[name]);
  assert.equal(dag[name], cjs[name]);
  assert.equal(cjsDag[name], cjs[name]);
}

const drain = async (coordinator) => {
  const ids = [];
  for (;;) {
    const boundary = await coordinator.runUntilWorkBoundary();
    if (boundary.kind === 'finished') return ids;
    assert.equal(boundary.kind, 'awaitingSettlement');
    assert(boundary.workSettlementTickets.length > 0);
    for (const ticket of boundary.workSettlementTickets) {
      ids.push(ticket.vertexId);
      assert.deepEqual(coordinator.acceptCompletedWork(ticket), {
        kind: 'accepted',
      });
      assert.deepEqual(coordinator.acceptCompletedWork(ticket), {
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
  const source = api.materializeMultiEntryDagInputFromRecordCatalog(items, {
    selectVertexId: (item) => {
      selections++;
      return item.id;
    },
    selectWorkPrerequisiteVertexIds: (item) => item.requires,
  });
  let lookups = 0;
  const countedSource = {
    ...source,
    dagDiscoverySource: Object.fromEntries(
      Object.entries(source.dagDiscoverySource).map(([key, callback]) => [
        key,
        (...args) => {
          lookups++;
          return callback(...args);
        },
      ]),
    ),
  };
  const prepared = api.discoverValidateAndCaptureDag(countedSource);
  assert.equal(prepared.kind, 'valid');
  assert.equal(selections, 3);
  assert(lookups > 0);
  const preparedLookups = lookups;
  assert.equal(
    prepared.validatedTopology.liveVertexSummaries[0].data,
    items[0],
  );
  assert.deepEqual(
    prepared.validatedTopology.liveVertexSummaries.map(
      (vertex) => vertex.vertexId,
    ),
    ids,
  );
  const first = prepared.validatedTopology.createExternalWorkSession();
  const seeded = prepared.validatedTopology.createExternalWorkSession({
    acceptedCompletedWorkVertexIds: new Set([ids[0]]),
  });
  const initial = first.runUntilWorkBoundary();
  const resumed = seeded.runUntilWorkBoundary();
  assert.equal(initial.kind, 'awaitingSettlement');
  assert.equal(resumed.kind, 'awaitingSettlement');
  assert.deepEqual(
    initial.workSettlementTickets.map((ticket) => ticket.vertexId),
    [ids[0]],
  );
  assert.deepEqual(
    resumed.workSettlementTickets.map((ticket) => ticket.vertexId),
    ids.slice(1),
  );
  assert.throws(
    () => seeded.acceptCompletedWork(initial.workSettlementTickets[0]),
    TypeError,
  );
  assert.throws(
    () => first.acceptCompletedWork({ vertexId: ids[0] }),
    TypeError,
  );
  assert.deepEqual(await drain(first), ids);
  assert.deepEqual(await drain(seeded), ids.slice(1));
  assert.equal(
    lookups,
    preparedLookups,
    'sessions must not replay original sources',
  );
  assert.equal(selections, 3);

  const coordinator = api.bindDagExternalWorkSession(
    prepared.validatedTopology.createIndependentRunnerFromValidatedTopology({
      workCompletionPolicy: 'requireExternalWorkSettlement',
    }),
  );
  assert.deepEqual(await drain(coordinator), ids);
  const asyncCoordinator = api.bindAsyncDagExternalWorkSession(
    await prepared.validatedTopology.createIndependentAsyncRunnerFromValidatedTopology(
      {
        workCompletionPolicy: 'requireExternalWorkSettlement',
      },
    ),
  );
  assert.deepEqual(await drain(asyncCoordinator), ids);
  assert.deepEqual(
    await drain(
      await prepared.validatedTopology.createAsyncExternalWorkSession({
        acceptedCompletedWorkVertexIds: new Set([ids[0]]),
        maxConcurrentCallbackInvocations: 2,
      }),
    ),
    ids.slice(1),
  );
  assert.equal(lookups, preparedLookups);

  async function* catalog() {
    yield { id: undefined };
    yield { id: NaN };
  }
  const asyncSource =
    await api.materializeMultiEntryDagInputFromRecordCatalogAsync(catalog(), {
      selectVertexId: async (item) => item.id,
    });
  const asyncPrepared = await api.discoverValidateAndCaptureDagAsync(
    asyncSource,
  );
  assert.equal(asyncPrepared.kind, 'valid');
  assert.deepEqual(
    await drain(
      await asyncPrepared.validatedTopology.createAsyncExternalWorkSession(),
    ),
    [undefined, NaN],
  );

  const leaf = { id: Symbol('leaf'), children: [] };
  const roots = [
    { id: Symbol('left'), children: [leaf] },
    { id: Symbol('right'), children: [leaf] },
  ];
  const selectors = {
    selectVertexId: (item) => item.id,
    selectStructuralChildRecords: (item) => item.children,
  };
  for (const forest of [
    api.materializeDagInputFromRootRecords(roots, selectors),
    await api.materializeDagInputFromRootRecordsAsync(roots, {
      selectVertexId: async (item) => item.id,
      selectStructuralChildRecords: async (item) => item.children,
    }),
  ]) {
    const result = api.discoverValidateAndCaptureDag(forest);
    assert.equal(result.kind, 'valid');
    const runner =
      result.validatedTopology.createIndependentRunnerFromValidatedTopology();
    runner.runUntilSuspendedOrTerminal();
    const graph = runner.getLiveResolvedGraphView();
    assert.equal(graph.getVertexHandles().length, 3);
    assert.deepEqual(
      graph
        .getDistinctStructuralParentHandlesOrNull(
          graph.getVertexHandleByIdOrNull(leaf.id),
        )
        .map((ref) => graph.requireVertexId(ref)),
      roots.map((root) => root.id),
    );
    assert.deepEqual(
      graph.getDistinctStructuralParentHandlesOrNull(
        graph.getVertexHandleByIdOrNull(roots[0].id),
      ),
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
    const TreeTraversal = asyncMode
      ? api.AsyncDagTraversalBuilder
      : api.DagTraversalBuilder;
    const traversal = new TreeTraversal(
      api.materializeMultiEntryDagInputFromRecordCatalog(records, {
        selectVertexId: (item) => item.id,
      }),
    );
    const calls = [];
    const callback = (data, options) => {
      calls.push(data);
      assert.equal(
        options.liveResolvedGraphView.requireVertexId(options.vertexHandle),
        taskId,
      );
      return {
        commands: [
          {
            commandName:
              api.TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA,
            commandArguments: {
              replacementVertexData: { ...data, label: 'built' },
            },
          },
        ],
      };
    };
    traversal.registerVisitorCallbackForPhase(
      api.DagVisitorPhase.ON_WORK_READY,
      asyncMode
        ? api.createConditionalAsyncDagDataVisitor(
            (data) => data.kind === 'task',
            async (data, options) => callback(data, options),
          )
        : api.createConditionalDagDataVisitor(
            (data) => data.kind === 'task',
            callback,
          ),
    );
    const runner = traversal.createIndependentRunnerFromCurrentOptions();
    const events = [];
    for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal()) {
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
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull(taskId)
        .getCurrentVertexView()
        .getVertexData().label,
      'built',
    );
    assert.equal(
      runner
        .getLiveResolvedGraphView()
        .getVertexHandleByIdOrNull(groupId)
        .getCurrentVertexView()
        .getVertexData().label,
      'bundle',
    );
  }
}

assert.equal(
  esm.DagStructuralDiscoveryCycleError,
  cjs.DagStructuralDiscoveryCycleError,
);
assert.equal(
  dag.DagStructuralDiscoveryCycleError,
  esm.DagStructuralDiscoveryCycleError,
);
assert.equal(
  cjsDag.DagStructuralDiscoveryCycleError,
  esm.DagStructuralDiscoveryCycleError,
);
for (const api of [esm, cjs]) {
  assert.throws(
    () =>
      new api.DagTraversalBuilder(
        api.materializeMultiEntryDagInputFromRecordCatalog(
          [{ id: 'a', children: ['a'] }],
          {
            selectVertexId: (item) => item.id,
            selectStructuralChildVertexIds: (item) => item.children,
          },
        ),
      )
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    (error) =>
      error instanceof esm.DagStructuralDiscoveryCycleError &&
      error.cycleWitnessVertexIds.join(',') === 'a,a',
  );
  for (const prepare of [
    api.discoverValidateAndCaptureDag,
    api.discoverValidateAndCaptureDagAsync,
  ]) {
    const invalid = await prepare(
      api.materializeMultiEntryDagInputFromRecordCatalog(
        [{ id: 'b', deps: ['missing'] }],
        {
          selectVertexId: (item) => item.id,
          selectWorkPrerequisiteVertexIds: (item) => item.deps,
        },
      ),
    );
    assert.equal(invalid.kind, 'invalid');
    assert.equal('diagnostics' in invalid, false);
    assert.equal(invalid.issues.length, 1);
    assert.equal(invalid.issues[0].kind, 'milestoneDependencyStall');
    assert.deepEqual(
      invalid.issues[0].diagnostics.unresolvedPrerequisiteVertexIds,
      ['missing'],
    );
  }
  const prepared = api.discoverValidateAndCaptureDag(
    api.materializeMultiEntryDagInputFromRecordCatalog([{ id: 'a' }], {
      selectVertexId: (item) => item.id,
    }),
  );
  for (const session of [
    prepared.validatedTopology.createExternalWorkSession(),
    await prepared.validatedTopology.createAsyncExternalWorkSession(),
  ]) {
    assert.equal(session.getTraversalStopReason(), 'prepared');
    assert.equal(session.isSuspended(), true);
    assert.equal(
      session.captureExecutionSnapshot().traversalLifecycleStatus,
      session.getTraversalLifecycleStatus(),
    );
    assert.equal(
      session
        .captureMilestoneSnapshot()
        .explainMilestone({ vertexId: 'a', milestone: 'workCompletion' })
        .milestoneSatisfied,
      false,
    );
    const boundary = await session.runUntilWorkBoundary();
    assert.equal('fail' in session, false);
    const error = { fatal: true };
    session.failTraversal(boundary.workSettlementTickets[0], error);
    await assert.rejects(
      async () => session.runUntilWorkBoundary(),
      (value) => value === error,
    );
  }
}

for (const api of [esm, cjs, dag, cjsDag, esm.dagTraversal, cjs.dagTraversal]) {
  assert.equal(Object.hasOwn(api, 'DagWorkSettlementTicket'), false);
  const cyclic =
    api === dag ||
    api === cjsDag ||
    api === esm.dagTraversal ||
    api === cjs.dagTraversal
      ? esm.materializeMultiEntryDagInputFromRecordCatalog(
          [{ id: 'a', children: ['a'] }],
          {
            selectVertexId: (v) => v.id,
            selectStructuralChildVertexIds: (v) => v.children,
          },
        )
      : api.materializeMultiEntryDagInputFromRecordCatalog(
          [{ id: 'a', children: ['a'] }],
          {
            selectVertexId: (v) => v.id,
            selectStructuralChildVertexIds: (v) => v.children,
          },
        );
  for (const prepare of [
    api.discoverValidateAndCaptureDag,
    api.discoverValidateAndCaptureDagAsync,
  ])
    assert.deepEqual(await prepare(cyclic), {
      kind: 'invalid',
      issues: [
        {
          kind: 'discoveredStructuralChildCycleWitness',
          cycleWitnessVertexIds: ['a', 'a'],
        },
      ],
    });
}
for (const api of [esm, cjs]) {
  for (const Constructor of [
    api.DagTraversalBuilder,
    api.AsyncDagTraversalBuilder,
  ]) {
    const input = api.materializeMultiEntryDagInputFromRecordCatalog(
      [{ id: 'a' }],
      {
        selectVertexId: (v) => v.id,
      },
    );
    assert.throws(
      () =>
        new Constructor({ ...input, workCompletionPolicy: 'visitorReturn' }),
      TypeError,
    );
    const runner = new Constructor({
      ...input,
      workCompletionPolicy: 'afterWorkReadyVisitorChain',
    }).createIndependentRunnerFromCurrentOptions();
    await runner.runUntilSuspendedOrTerminal();
    assert.deepEqual(
      runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
      ['a'],
    );
    const progress = runner
      .captureProgressSnapshot()
      .progressByVertexId.get('a');
    assert.deepEqual(progress.unmetWorkMilestoneVertexIds, []);
    assert.deepEqual(progress.unmetSubgraphCompletionMilestoneVertexIds, []);
    const session = api.bindDagExternalWorkSession(
      new api.DagTraversalBuilder({
        ...input,
        workCompletionPolicy: 'requireExternalWorkSettlement',
      }).createIndependentRunnerFromCurrentOptions(),
    );
    const ticket = session.runUntilWorkBoundary().workSettlementTickets[0];
    assert.throws(() => session.acceptCompletedWork({ ...ticket }), TypeError);
    assert.deepEqual(session.acceptCompletedWork(ticket), { kind: 'accepted' });
  }
}
