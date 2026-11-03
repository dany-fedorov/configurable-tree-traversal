import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
import * as rewrite from 'configurable-tree-traversal/tools/rewrite-object';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');
for (const name of [
  'DagTraversalBuilder',
  'AsyncDagTraversalBuilder',
  'DepthFirstTreeTraversalBuilder',
  'DagTraversalStallError',
  'TraversalVisitorCommandName',
  'core',
  'dagTraversal',
  'rewriteObject',
  'rewriteObjectWithAssertedOutputType',
])
  assert.equal(esm[name], cjs[name]);
assert.equal(
  rewrite.rewriteObjectWithAssertedOutputType,
  cjs.rewriteObjectWithAssertedOutputType,
);
assert.equal(dag.DagTraversalBuilder, cjs.DagTraversalBuilder);

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
  const F = api.DepthFirstTreeVisitPhase;
  const found = (id, hints = [], declarations = {}) => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: id,
      vertexContentInput: { $vertexData: id, $childDiscoveryHints: hints },
      ...declarations,
    },
  });
  const tree = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
      },
    }),
    resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
  };
  // Both helpers reject presence before any source/rewrite/conversion callback.
  for (const helper of [
    api.rewriteObject,
    api.rewriteObjectWithAssertedOutputType,
  ]) {
    for (const treeDiscoverySource of [undefined, tree]) {
      let calls = 0;
      assert.throws(
        () =>
          helper(
            {},
            {
              treeDiscoverySource,
              mapInputToRootProperty: () => {
                calls++;
              },
              rewritePropertyAfterChildTraversal: () => {
                calls++;
              },
              convertPresentRootOutputValue: () => {
                calls++;
              },
            },
          ),
        /treeDiscoverySource/,
      );
      assert.equal(calls, 0);
    }
  }
  assert.equal(outputValue(api.rewriteObjectWithAssertedOutputType(3)), 3); // No schema validation.
  assert.deepEqual(
    outputValue(
      api.rewriteObject([10, 20], {
        arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
        rewritePropertyAfterChildTraversal: (p) =>
          typeof p.propertyKey === 'number'
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyKey: p.propertyKey + 2 },
              }
            : { kind: 'keepPropertyAndAssembleCurrentChildren' },
      }),
    ),
    [, , 10, 20],
  );
  const trailing = outputValue(
    api.rewriteObject([10, 20], {
      arrayAssemblyIndexPolicy: 'preserveNumericIndicesAndArrayLength',
      rewritePropertyAfterChildTraversal: (p) =>
        p.propertyKey === 1
          ? { kind: 'deletePropertySubtree' }
          : { kind: 'keepPropertyAndAssembleCurrentChildren' },
    }),
  );
  assert.equal(trailing.length, 2);
  assert.deepEqual(Object.keys(trailing), ['0']);
  for (const assembledPropertyKeyCollisionPolicy of [
    'throwOnDuplicateKey',
    'keepFirstProperty',
    'keepLastProperty',
  ]) {
    const options = {
      assembledPropertyKeyCollisionPolicy,
      rewritePropertyAfterChildTraversal: (p) =>
        p.propertyKey === 'b'
          ? {
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyKey: 'a' },
            }
          : undefined,
    };
    if (assembledPropertyKeyCollisionPolicy === 'throwOnDuplicateKey') {
      assert.throws(
        () => api.rewriteObject({ a: 1, b: 2 }, options),
        TypeError,
      );
    } else {
      assert.deepEqual(
        outputValue(api.rewriteObject({ a: 1, b: 2 }, options)),
        {
          a:
            assembledPropertyKeyCollisionPolicy === 'keepFirstProperty' ? 1 : 2,
        },
      );
    }
  }
  for (const operation of [
    { rewrite: { value: 1 } },
    { delete: true },
    { kind: 'keep', patch: {} },
    { kind: 'rewrite', value: 1 },
  ]) {
    assert.throws(
      () =>
        api.rewriteObject(1, {
          rewritePropertyAfterChildTraversal: () => operation,
        }),
      TypeError,
    );
  }
  assert.throws(
    () => api.rewriteObject({}, { resolveVertexHook: undefined }),
    TypeError,
  );
  let paused = false;
  let conversions = 0;
  const result = api.rewriteObject(
    { count: 1 },
    {
      visitors: {
        [F.AFTER_CHILD_SUBTREES]: {
          descendingExecutionPriorityWithinGroup: 200,
          visitor: (_v, o) => {
            if (o.isTreeRoot && !paused) {
              paused = true;
              return {
                commands: [
                  { commandName: C.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY },
                ],
              };
            }
          },
        },
      },
      rewritePropertyAfterChildTraversal: ({ propertyKey: key }) =>
        key === 'count'
          ? {
              kind: 'patchPropertyKeyOrValue',
              propertyPatch: { propertyKey: 'renamed' },
            }
          : undefined,
      convertPresentRootOutputValue: (value) => {
        conversions++;
        if (conversions === 2) throw undefined;
        return { value };
      },
    },
  );
  assert.deepEqual(capturedOutputValue(result), { value: { count: 1 } });
  assert.throws(() => outputValue(result), /not complete/i);
  result.traversalRunner.runUntilSuspendedOrTerminal();
  await exactThrow(() => outputValue(result), undefined);
  const final = outputValue(result);
  assert.deepEqual(final, { value: { renamed: 1 } });
  assert.equal(outputValue(result), final);
  assert.equal(conversions, 3);
  assert.deepEqual(capturedOutputValue(result), { value: { count: 1 } });
  const finished = api.rewriteObjectWithAssertedOutputType(null);
  assert.equal(outputValue(finished), capturedOutputValue(finished));

  // All six builders detach arrays and wrappers, sharing closure/group identity.
  for (const [TreeTraversal, phase, graphMode] of [
    [api.DepthFirstTreeTraversalBuilder, F.BEFORE_CHILD_EXPANSION, false],
    [api.AsyncDepthFirstTreeTraversalBuilder, F.BEFORE_CHILD_EXPANSION, false],
    [
      api.BreadthFirstTreeTraversalBuilder,
      api.BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
      false,
    ],
    [
      api.AsyncBreadthFirstTreeTraversalBuilder,
      api.BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
      false,
    ],
    [api.DagTraversalBuilder, D.ON_WORK_READY, true],
    [api.AsyncDagTraversalBuilder, D.ON_WORK_READY, true],
  ]) {
    const calls = [];
    const builder = new TreeTraversal(
      graphMode
        ? {
            dagDiscoverySource: {
              resolveRootVertex: () => found('root'),
              resolveChildHint: () => found('unused'),
            },
          }
        : { treeDiscoverySource: tree },
    );
    let runner;
    builder.replaceVisitorDefinitionsForPhase(phase, {
      groups: [
        {
          visitors: [
            () => {
              calls.push('original');
              assert.equal(
                runner.requestPauseAfterAdmittedCallbacksDrain(),
                true,
              );
              assert.equal(
                runner.requestPauseAfterAdmittedCallbacksDrain(),
                false,
              );
            },
          ],
        },
      ],
    });
    const before = builder.getDetachedVisitorRegistrationRecordsForPhase(phase);
    builder.replaceVisitorDefinitionsForPhase(phase, before);
    const copy = builder.getDetachedVisitorRegistrationRecordsForPhase(phase);
    assert.notEqual(copy, before);
    assert.notEqual(copy[0], before[0]);
    assert.equal(copy[0].visitor, before[0].visitor);
    assert.equal(copy[0].visitorGroup, before[0].visitorGroup);
    assert(Object.isFrozen(copy[0].visitorGroup));
    copy[0].visitor = () => {
      calls.push('replacement');
    };
    copy[0].descendingExecutionPriorityWithinGroup = -99;
    copy[0].visitorCommandCommitTiming = 'afterContiguousVisitorBatch';
    copy.length = 0;
    runner = builder.createIndependentRunnerFromCurrentOptions();
    assert.equal(runner.requestPauseAfterAdmittedCallbacksDrain(), false);
    await runner.runUntilSuspendedOrTerminal();
    assert.equal(runner.getTraversalStopReason(), 'paused');
    assert.deepEqual(calls, ['original']);
    assert.equal(runner.requestPauseAfterAdmittedCallbacksDrain(), false);
    await runner.runUntilSuspendedOrTerminal();
    assert.equal(runner.getTraversalLifecycleStatus(), 'FINISHED');
    assert.deepEqual(calls, ['original']);
  }

  for (const TreeTraversal of [
    api.DagTraversalBuilder,
    api.AsyncDagTraversalBuilder,
  ]) {
    // Preparation works in both source modes; run adopts without discovery replay.
    for (const graphMode of [false, true]) {
      let sources = 0;
      let visits = 0;
      const resolveRootVertex = () => {
        sources++;
        return graphMode ? found('root') : tree.resolveRootVertex();
      };
      const runner = new TreeTraversal({
        ...(graphMode
          ? {
              dagDiscoverySource: {
                resolveRootVertex: resolveRootVertex,
                resolveChildHint: () => found('unused'),
              },
            }
          : {
              treeDiscoverySource: {
                ...tree,
                resolveRootVertex: resolveRootVertex,
              },
            }),
        workCompletionPolicy: 'requireExternalWorkSettlement',
        visitors: {
          [D.ON_WORK_READY]: () => {
            visits++;
          },
        },
      }).createIndependentRunnerFromCurrentOptions();
      assert.equal(await runner.discoverValidateAndFreezeTopology(), runner);
      assert.equal(runner.getTraversalStopReason(), 'prepared');
      assert.equal(
        runner.captureProgressSnapshot().discovery.timing,
        'completeBeforeAnyVisitor',
      );
      assert.equal(visits, 0);
      assert.deepEqual(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        [],
      );
      assert.deepEqual(
        runner.captureProgressSnapshot().workAwaitingSettlement,
        [],
      );
      await runner.discoverValidateAndFreezeTopology();
      assert.equal(sources, 1);
      const events = [];
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
        events.push(event);
      assert.deepEqual(events, []);
      assert.equal(visits, 1);
      assert.equal(sources, 1);
      const snapshot = runner.captureProgressSnapshot();
      const work = snapshot.workAwaitingSettlement[0];
      assert.equal(typeof work.settlementToken, 'symbol');
      const preserved =
        runner.captureProgressSnapshot().workAwaitingSettlement[0];
      assert.notEqual(work, preserved);
      work.settlementToken = Symbol();
      snapshot.workAwaitingSettlement.length = 0;
      assert.equal(
        runner.captureProgressSnapshot().workAwaitingSettlement[0]
          .settlementToken,
        preserved.settlementToken,
      );
      assert.throws(
        () =>
          runner.settleDeferredWork(
            preserved.vertexId,
            { kind: 'workCompleted' },
            Symbol(),
          ),
        TypeError,
      );
      assert.equal(
        runner.settleDeferredWork(
          preserved.vertexId,
          { kind: 'workCompleted' },
          preserved.settlementToken,
        ),
        true,
      );
      assert.deepEqual(
        runner.captureProgressSnapshot().workAwaitingSettlement,
        [],
      );
      for await (const event of runner.runAndIterateObservationEventsUntilSuspendedOrTerminal())
        events.push(event);
      assert.deepEqual(
        events.map(({ eventKind }) => eventKind),
        ['workCompletionCommitted', 'subgraphCompletionCommitted'],
      );
      assert.equal(runner.getTraversalStopReason(), 'finished');
      assert.equal(sources, 1);
      assert.equal(
        runner.settleDeferredWork(
          preserved.vertexId,
          { kind: 'workCompleted' },
          preserved.settlementToken,
        ),
        false,
      );
      await assert.rejects(
        async () => runner.discoverValidateAndFreezeTopology(),
        /prepar/i,
      );
    }
    for (const sourceMode of ['tree', 'graph']) {
      const input =
        sourceMode === 'tree'
          ? { treeDiscoverySource: tree }
          : {
              dagDiscoverySource: {
                resolveRootVertex: () => found('root'),
                resolveChildHint: () => found('unused'),
              },
            };
      const fresh = new TreeTraversal(
        input,
      ).createIndependentRunnerFromCurrentOptions();
      const before = fresh.captureExecutionSnapshot();
      assert.throws(
        () =>
          new TreeTraversal({
            ...input,
            traversalRunnerInternalObjects: { state: {} },
          }),
        TypeError,
      );
      assert.deepEqual(fresh.captureExecutionSnapshot(), before);
      await fresh.runUntilSuspendedOrTerminal();
      assert.equal(fresh.getTraversalStopReason(), 'finished');
      const frozen = new TreeTraversal({
        ...input,
        visitors: {
          [D.ON_WORK_READY]: () => ({
            commands: [
              {
                commandName: C.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
                commandArguments: { replacementChildHints: [] },
              },
            ],
          }),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await frozen.discoverValidateAndFreezeTopology();
      await assert.rejects(
        async () => frozen.runUntilSuspendedOrTerminal(),
        /topology|eager/i,
      );
    }
    const empty = new TreeTraversal({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted',
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
        resolveChildHint: () => found('unused'),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await empty.discoverValidateAndFreezeTopology();
    assert.equal(empty.getTraversalStopReason(), 'prepared');
    await empty.runUntilSuspendedOrTerminal();
    assert.equal(empty.getTraversalStopReason(), 'finished');
    const seeded = new TreeTraversal({
      acceptedCompletedWorkVertexIds: new Set(['root']),
      dagDiscoverySource: {
        resolveRootVertex: () => found('root'),
        resolveChildHint: () => found('unused'),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await seeded.discoverValidateAndFreezeTopology();
    const seededEvents = [];
    for await (const event of seeded.runAndIterateObservationEventsUntilSuspendedOrTerminal())
      seededEvents.push(event.eventKind);
    assert.deepEqual(seededEvents, ['subgraphCompletionCommitted']);

    // Own-property validation runs before generated/prerequisite fallback.
    class Inherited {
      get vertexId() {
        return 42;
      }
      vertexContentInput = { $vertexData: 'value', $childDiscoveryHints: [] };
    }
    for (const tagged of [false, true]) {
      for (const stage of ['root', 'child', 'prerequisite']) {
        const instance = new Inherited();
        const inherited = () =>
          tagged
            ? { kind: 'vertexResolved', resolvedVertexInput: instance }
            : instance;
        const rejected = new TreeTraversal({
          dagDiscoverySource: {
            resolveRootVertex: () =>
              stage === 'root'
                ? inherited()
                : found(
                    'root',
                    stage === 'child' ? ['child'] : [],
                    stage === 'prerequisite'
                      ? { workWaitsForWorkOf: [42] }
                      : {},
                  ),
            resolveChildHint: inherited,
            resolvePrerequisiteByVertexId: inherited,
          },
        }).createIndependentRunnerFromCurrentOptions();
        await assert.rejects(
          async () => rejected.discoverValidateAndFreezeTopology(),
          TypeError,
        );
        assert.equal(rejected.requestPauseAfterAdmittedCallbacksDrain(), false);
      }
      const instance = new Inherited();
      const own = new TreeTraversal({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: {
              vertexId: instance.vertexId,
              vertexContentInput: instance.vertexContentInput,
            },
          }),
          resolveChildHint: () => found('unused'),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await own.runUntilSuspendedOrTerminal();
      assert.deepEqual(
        own.captureProgressSnapshot().workCompletionCommittedVertexIds,
        [42],
      );
    }
    for (const error of [undefined, null, {}]) {
      const failedGetter = new TreeTraversal({
        dagDiscoverySource: {
          resolveRootVertex: () => ({
            kind: 'vertexResolved',
            resolvedVertexInput: {
              get vertexId() {
                throw error;
              },
              vertexContentInput: { $vertexData: '', $childDiscoveryHints: [] },
            },
          }),
          resolveChildHint: () => found('unused'),
        },
      }).createIndependentRunnerFromCurrentOptions();
      await exactThrow(
        () => failedGetter.discoverValidateAndFreezeTopology(),
        error,
      );
      await exactThrow(() => failedGetter.runUntilSuspendedOrTerminal(), error);
    }
    // Capture tagged payload once, without evaluating a replacement payload.
    let reads = 0;
    const captured = new TreeTraversal({
      dagDiscoverySource: {
        resolveRootVertex: () => ({
          kind: 'vertexResolved',
          get resolvedVertexInput() {
            reads++;
            return reads === 1
              ? found(undefined).resolvedVertexInput
              : new Inherited();
          },
        }),
        resolveChildHint: () => found('unused'),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await captured.runUntilSuspendedOrTerminal();
    assert.equal(reads, 1);
    assert.deepEqual(
      captured.captureProgressSnapshot().workCompletionCommittedVertexIds,
      [undefined],
    );

    // Original labelled constraints include seeds/missing endpoints and retain ID identity.
    const id = {};
    const missing = Symbol('missing');
    const missingCompletion = Symbol('missing completion');
    const invalid = new TreeTraversal({
      acceptedCompletedWorkVertexIds: new Set([id]),
      dagDiscoverySource: {
        resolveRootVertex: () =>
          found(id, ['child'], {
            workWaitsForWorkOf: [missing],
            workWaitsForSubgraphCompletionOf: [missingCompletion],
          }),
        resolveChildHint: (hint) => found(hint),
      },
    }).createIndependentRunnerFromCurrentOptions();
    let failure;
    try {
      await invalid.discoverValidateAndFreezeTopology();
    } catch (value) {
      failure = value;
    }
    assert(failure instanceof api.DagTraversalStallError);
    assert(failure instanceof esm.DagTraversalStallError);
    const edge = failure.diagnostics.originalMilestoneConstraints[0];
    assert.equal(edge.waitingMilestone.vertexId, id);
    assert.equal(edge.prerequisiteMilestone.vertexId, missing);
    assert.deepEqual(
      [
        edge.waitingMilestone.milestone,
        edge.prerequisiteMilestone.milestone,
        edge.reason,
      ],
      ['workCompletion', 'workCompletion', 'workDependency'],
    );
    assert.deepEqual(
      failure.diagnostics.originalMilestoneConstraints.map(
        ({
          waitingMilestone: waiter,
          prerequisiteMilestone: prerequisite,
          reason,
        }) => [
          waiter.vertexId,
          waiter.milestone,
          prerequisite.vertexId,
          prerequisite.milestone,
          reason,
        ],
      ),
      [
        [id, 'workCompletion', missing, 'workCompletion', 'workDependency'],
        [
          id,
          'workCompletion',
          missingCompletion,
          'subgraphCompletion',
          'subgraphCompletionDependency',
        ],
        [id, 'subgraphCompletion', id, 'workCompletion', 'ownWork'],
        [
          id,
          'subgraphCompletion',
          'child',
          'subgraphCompletion',
          'structuralChild',
        ],
        ['child', 'subgraphCompletion', 'child', 'workCompletion', 'ownWork'],
      ],
    );
    const next =
      invalid.captureProgressSnapshot().invalidDependencyTopologyDiagnostics
        .originalMilestoneConstraints[0];
    assert.notEqual(next, edge);
    assert.notEqual(next.waitingMilestone, edge.waitingMilestone);
    assert.equal(next.waitingMilestone.vertexId, id);
    edge.waitingMilestone.milestone = 'subgraphCompletion';
    assert.equal(next.waitingMilestone.milestone, 'workCompletion');
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
  const preparing = new api.AsyncDagTraversalBuilder({
    dagDiscoverySource: {
      resolveRootVertex: async () => {
        sourceCalls++;
        entered();
        await gate;
        return found('root');
      },
      resolveChildHint: () => found('unused'),
    },
  }).createIndependentRunnerFromCurrentOptions();
  let preparationSettled = false;
  const operation = preparing.discoverValidateAndFreezeTopology().then(() => {
    preparationSettled = true;
  });
  await started;
  assert.equal(preparing.requestPauseAfterAdmittedCallbacksDrain(), true);
  await Promise.resolve();
  assert.equal(preparationSettled, false);
  assert.equal(preparing.getTraversalLifecycleStatus(), 'RUNNING');
  release();
  await operation;
  assert.equal(preparing.getTraversalStopReason(), 'paused');
  await preparing.runUntilSuspendedOrTerminal();
  assert.equal(preparing.getTraversalStopReason(), 'finished');
  assert.equal(sourceCalls, 1);
  const legacy = new api.DagTraversalStallError({
    blockedVertexPrerequisiteReports: [],
    unresolvedPrerequisiteVertexIds: [],
    milestoneCycleVertexIdComponents: [],
    nonCyclePrerequisiteBlockedVertexIds: [],
    incompleteVertexIdsWithoutUnmetPrerequisites: [],
  });
  assert.deepEqual(legacy.diagnostics.originalMilestoneConstraints, []);
}
console.log(
  'Verified composable runtime capabilities with shared CJS/ESM identity.',
);

function outputValue(result) {
  const output = result.getFinalOutputResult();
  return output.kind === 'present' ? output.value : null;
}

function capturedOutputValue(result) {
  const output = result.capturedOutputResultAtReturn;
  return output.kind === 'present' ? output.value : null;
}
