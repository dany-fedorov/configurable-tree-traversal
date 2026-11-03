import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from 'configurable-tree-traversal';
const require = createRequire(import.meta.url);
const cjs = require('configurable-tree-traversal');

assert.equal(esm.TraversalVisitorCommandName, cjs.TraversalVisitorCommandName);
assert.equal(esm.core.Vertex, cjs.core.Vertex);
assert.equal('DEFER_READY' in esm, false);
assert.equal('DEFER_READY' in cjs, false);

for (const [api, other] of [
  [cjs, esm],
  [esm, cjs],
]) {
  const { TraversalVisitorCommandName: Command, DagVisitorPhase: Order } = api;
  const data = { label: 'canonical' };
  const childHints = [];
  const vertex = new api.core.Vertex({
    $vertexData: data,
    $childDiscoveryHints: childHints,
  });
  assert(vertex instanceof other.core.Vertex);
  assert.deepEqual(
    { ...vertex },
    { $vertexData: data, $childDiscoveryHints: childHints },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(vertex)), {
    $vertexData: data,
    $childDiscoveryHints: childHints,
  });
  assert.equal(vertex.$vertexData, data);
  assert.notEqual(vertex.$childDiscoveryHints, childHints);
  assert.deepEqual(vertex.$childDiscoveryHints, childHints);
  assert.equal('$d' in vertex, false);
  assert.equal('$c' in vertex, false);
  assert.equal(
    vertex
      .createEditableShallowCloneWithContentOverrides({
        $vertexData: undefined,
      })
      .getVertexData(),
    undefined,
  );
  assert.throws(
    () => new api.core.Vertex({ $vertexData: '', $c: [] }),
    TypeError,
  );
  assert.throws(() => new api.core.Vertex({ $d: 'old', $c: [] }), TypeError);

  const found = (id, hints = [], declarations = {}) => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexId: id,
      vertexContentInput: { $vertexData: id, $childDiscoveryHints: hints },
      ...declarations,
    },
  });
  const treeFound = (id, hints = []) => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: { $vertexData: id, $childDiscoveryHints: hints },
    },
  });
  const tree = {
    resolveRootVertex: () => treeFound('root', ['leaf', 'skip']),
    resolveChildVertexFromHint: (id) =>
      id === 'skip' ? { kind: 'vertexIntentionallyOmitted' } : treeFound(id),
  };
  const graphTree = {
    resolveRootVertex: () => found('root', ['leaf']),
    resolveChildHint: (id) => found(id),
  };
  const families = [
    [
      'runTreeDepthFirstUntilSuspendedOrTerminal',
      api.DepthFirstTreeVisitPhase.AFTER_CHILD_SUBTREES,
    ],
    [
      'runTreeBreadthFirstUntilSuspendedOrTerminal',
      api.BreadthFirstTreeVisitPhase.AT_LEVEL_ORDER_VERTEX,
    ],
    ['traverseDag', Order.ON_WORK_READY],
  ];
  for (const [helper, phase] of families) {
    for (const suffix of ['', 'Async']) {
      const visits = [];
      const options = {
        treeDiscoverySource: tree,
        visitors: {
          [phase]: (vertex) => {
            visits.push(vertex.getVertexData());
          },
        },
      };
      const runner = await api[helper + suffix](options);
      assert.equal(runner.getTraversalLifecycleStatus(), 'FINISHED');
      assert.equal(runner.getTraversalStopReason(), 'finished');
      assert.equal(
        runner.captureExecutionSnapshot().traversalStopReason,
        'finished',
      );
      const view = runner.getLiveResolvedTreeView();
      assert.equal(view, runner.getLiveResolvedTreeView());
      assert.equal(typeof view.add, 'undefined');
      const root = view.getRootVertexHandleOrNull();
      const detached = view.getChildVertexHandlesOrNull(root);
      assert.throws(() => {
        detached.length = 0;
      }, TypeError);
      assert.equal(view.getChildVertexHandlesOrNull(root).length, 1);
      const child = view.getChildVertexHandlesOrNull(root)[0];
      const context = view.getChildDiscoveryContextOrNull(child);
      assert.throws(() => {
        context.discoveryDepthInEdges = 100;
      }, TypeError);
      assert.notEqual(
        view.getChildDiscoveryContextOrNull(child).discoveryDepthInEdges,
        100,
      );
      const rootRefId = root.getReferenceIdentity();
      const originalValue = root.getCurrentVertexView();
      const replacement =
        originalValue.createEditableShallowCloneWithContentOverrides({
          $vertexData: 'replacement',
        });
      assert.equal('setValue' in root, false);
      const editable = new api.MutableValueReference(
        originalValue.createEditableShallowCloneWithContentOverrides(),
      );
      editable.replaceReferencedValue(replacement);
      assert.equal(editable.getReferencedValue(), replacement);
      assert.equal(root.getReferenceIdentity(), rootRefId);
      assert.equal('getId' in root, false);
      assert.equal(root.getCurrentVertexView(), originalValue);

      assert.deepEqual(
        visits,
        helper === 'runTreeDepthFirstUntilSuspendedOrTerminal'
          ? ['leaf', 'root']
          : ['root', 'leaf'],
      );
      const groupCalls = [];
      await api[helper + suffix]({
        ...options,
        visitors: {
          [phase]: {
            groups: [
              {
                visitors: [
                  {
                    visitor: () => {
                      groupCalls.push('first');
                    },
                    descendingExecutionPriorityWithinGroup: 1,
                  },
                ],
                visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
              },
              { visitors: [] },
              {
                visitors: [
                  {
                    visitor: () => {
                      groupCalls.push('second');
                    },
                    descendingExecutionPriorityWithinGroup: 1000,
                  },
                ],
              },
            ],
          },
        },
      });
      assert.deepEqual(groupCalls, ['first', 'second', 'first', 'second']);
      const legacyVisitors =
        helper === 'runTreeDepthFirstUntilSuspendedOrTerminal'
          ? { postOrderVisitor: () => {} }
          : helper === 'traverseDag'
          ? { onReadyVisitor: () => {} }
          : () => {};
      const legacySource =
        helper === 'traverseDag' ? { treeDiscoverySource: tree } : tree;
      assert.throws(
        () => api[helper + suffix](legacySource, legacyVisitors),
        TypeError,
      );
    }
  }

  for (const asyncMode of [false, true]) {
    const TreeTraversal = asyncMode
      ? api.AsyncDagTraversalBuilder
      : api.DagTraversalBuilder;
    // The ordinary root's W applies even without seeds, eager discovery or lookup.
    const blocked = new TreeTraversal({
      dagDiscoverySource: {
        resolveRootVertex: () =>
          found('root', [], { workWaitsForWorkOf: ['absent'] }),
        resolveChildHint: (id) => found(id),
      },
    }).createIndependentRunnerFromCurrentOptions();
    if (asyncMode)
      await assert.rejects(
        blocked.runUntilSuspendedOrTerminal(),
        api.DagTraversalStallError,
      );
    else
      assert.throws(
        () => blocked.runUntilSuspendedOrTerminal(),
        api.DagTraversalStallError,
      );
    const ignored = new TreeTraversal({
      rootWorkPrerequisitePolicy: 'ignore',
      dagDiscoverySource: {
        resolveRootVertex: () =>
          found('root', [], { workWaitsForWorkOf: ['absent'] }),
        resolveChildHint: (id) => found(id),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await ignored.runUntilSuspendedOrTerminal();
    assert.equal(ignored.getTraversalLifecycleStatus(), 'FINISHED');

    for (const inherit of [false, true]) {
      const traversal = new TreeTraversal({
        undeclaredWorkPrerequisitePolicy: inherit
          ? 'waitForDiscoveringParentWork'
          : 'none',
        dagDiscoverySource: graphTree,
      });
      traversal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
        commands: [
          {
            commandName:
              other.TraversalVisitorCommandName
                .END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
          },
        ],
      }));
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      assert.deepEqual(
        runner.captureProgressSnapshot()
          .workVisitorReadyOrWorkCompletionDeferredVertexIds,
        inherit ? ['root'] : ['root', 'leaf'],
      );
      const settlementToken = runner
        .captureProgressSnapshot()
        .progressByVertexId.get('root').settlementToken;
      assert.equal(
        runner.settleDeferredWork(
          'root',
          { kind: 'workCompleted' },
          settlementToken,
        ),
        true,
      );
      assert.equal(
        runner.settleDeferredWork(
          'root',
          { kind: 'workCompleted' },
          settlementToken,
        ),
        false,
      );
      assert.equal(
        runner.captureProgressSnapshot().progressByVertexId.get('root')
          .workState,
        'workCompletionCommitted',
      );
      await runner.runUntilSuspendedOrTerminal();
      const leafGeneration = runner
        .captureProgressSnapshot()
        .progressByVertexId.get('leaf').settlementToken;
      runner.settleDeferredWork(
        'leaf',
        { kind: 'workCompleted' },
        leafGeneration,
      );
      await runner.runUntilSuspendedOrTerminal();
      assert.equal(runner.getTraversalLifecycleStatus(), 'FINISHED');
    }

    for (const entry of ['constructor', 'patchOptionsForFutureRunners']) {
      let reads = 0;
      const input = {
        dagDiscoverySource: {
          resolveRootVertex: () => found('owned'),
          resolveChildHint: (id) => found(id),
        },
        get workCompletionPolicy() {
          return ++reads === 1
            ? 'requireExternalWorkSettlement'
            : 'afterWorkReadyVisitorChain';
        },
      };
      const traversal =
        entry === 'constructor'
          ? new TreeTraversal(input)
          : new TreeTraversal({ dagDiscoverySource: input.dagDiscoverySource });
      if (entry === 'patchOptionsForFutureRunners')
        traversal.patchOptionsForFutureRunners(input);
      assert.equal('DagTraversalRunner' in api, false);
      assert.equal('AsyncDagTraversalRunner' in api, false);
      const runner = traversal.createIndependentRunnerFromCurrentOptions();
      await runner.runUntilSuspendedOrTerminal();
      assert.deepEqual(
        runner.captureProgressSnapshot().workCompletionCommittedVertexIds,
        [],
      );
      assert.deepEqual(
        runner.captureProgressSnapshot().workCompletionDeferredVertexIds,
        ['owned'],
      );
      assert.equal(runner.getTraversalStopReason(), 'awaitingSettlement');
      assert.equal(reads, 1);
    }

    const external = new TreeTraversal({
      workCompletionPolicy: 'requireExternalWorkSettlement',
      retainDiscoveredGraphBeforeVisitorCommands: true,
      dagDiscoverySource: {
        resolveRootVertex: () => found(undefined),
        resolveChildHint: (id) => found(id),
      },
    }).createIndependentRunnerFromCurrentOptions();
    const deferredEvents = [];
    for await (const event of external.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: ['workCompletionCommitted'],
        admittedVisitorCallbackPhases: { include: [] },
      },
    ))
      deferredEvents.push(event);
    assert.deepEqual(deferredEvents, []);
    assert.equal(external.getTraversalStopReason(), 'awaitingSettlement');
    assert.equal(
      external.captureExecutionSnapshot().traversalStopReason,
      'awaitingSettlement',
    );
    assert.equal(external.getLiveResolvedTreeView(), null);
    const graph = external.getLiveResolvedGraphView();
    const ref = graph.getVertexHandleByIdOrNull(undefined);
    assert.equal(ref, graph.getVertexHandleByIdOrNull(undefined));
    assert(ref);
    assert.equal(graph.requireVertexId(ref), undefined);
    assert.equal('getIdOf' in graph, false);
    assert.equal('getVertexById' in graph, false);
    const saved = external.preCommandDiscoveredGraphView;
    const savedRef = saved.getVertexHandleByIdOrNull(undefined);
    assert.equal(saved.requireVertexId(savedRef), undefined);
    assert.equal(savedRef, saved.getVertexHandleByIdOrNull(undefined));
    const token = external
      .captureProgressSnapshot()
      .progressByVertexId.get(undefined).settlementToken;
    external.settleDeferredWork(undefined, { kind: 'workCompleted' }, token);
    assert.equal(external.getTraversalStopReason(), 'awaitingSettlement');
    // Emission-only update retains callback selection; ON_WORK_READY now emits.
    for await (const event of external.runAndIterateObservationEventsUntilSuspendedOrTerminal(
      {
        deliveredEventKinds: ['workCompletionCommitted'],
      },
    ))
      deferredEvents.push(event);
    assert.equal(deferredEvents.length, 1);
    assert.equal(external.getTraversalStopReason(), 'finished');

    const selectedCalls = [];
    const selected = new TreeTraversal({
      treeDiscoverySource: tree,
      visitors: {
        [Order.ON_WORK_READY]: {
          visitor: () => {
            selectedCalls.push('ready');
          },
          descendingExecutionPriorityWithinGroup: 1,
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await selected.runUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: { exclude: [] },
    });
    assert.deepEqual(selectedCalls, ['ready', 'ready']);
    const legacySelected = new TreeTraversal({
      treeDiscoverySource: tree,
      visitors: {
        [Order.ON_WORK_READY]: () => {
          selectedCalls.push('legacy');
        },
      },
    }).createIndependentRunnerFromCurrentOptions();
    await legacySelected.runUntilSuspendedOrTerminal({
      deliveredEventKinds: [],
      admittedVisitorCallbackPhases: { include: [Order.ON_WORK_READY] },
    });
    assert.deepEqual(selectedCalls, ['ready', 'ready', 'legacy', 'legacy']);

    const events = [];
    const batched = new TreeTraversal({
      dagDiscoverySource: {
        resolveRootVertex: () => found('root'),
        resolveChildHint: (id) => found(id),
      },
    });
    batched.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      (vertex) => {
        events.push(vertex.getVertexData());
      },
      { descendingExecutionPriorityWithinGroup: 1000 },
    );
    batched.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      () => {
        events.push('group');
        return {
          commands: [
            {
              commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
              commandArguments: { replacementVertexData: 'changed' },
            },
          ],
        };
      },
      {
        visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
        descendingExecutionPriorityWithinGroup: 1,
      },
    );
    batched.registerVisitorCallbackForPhase(
      Order.ON_WORK_READY,
      (vertex) => {
        events.push(vertex.getVertexData());
      },
      {
        visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
        descendingExecutionPriorityWithinGroup: 0,
      },
    );
    await batched
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    assert.deepEqual(events, ['root', 'group', 'root']);

    // Consumers that intend group-first execution express explicit ordered groups.
    const [high, ...low] =
      batched.getDetachedVisitorRegistrationRecordsForPhase(
        Order.ON_WORK_READY,
      );
    batched.replaceVisitorDefinitionsForPhase(Order.ON_WORK_READY, {
      groups: [
        {
          visitorCommandCommitTiming: 'afterContiguousVisitorBatch',
          visitors: low.map(
            ({ visitor, descendingExecutionPriorityWithinGroup }) => ({
              visitor,
              descendingExecutionPriorityWithinGroup,
            }),
          ),
        },
        {
          visitors: [
            {
              visitor: high.visitor,
              descendingExecutionPriorityWithinGroup:
                high.descendingExecutionPriorityWithinGroup,
            },
          ],
        },
      ],
    });
    batched.replaceVisitorDefinitionsForPhase(
      Order.ON_WORK_READY,
      batched.getDetachedVisitorRegistrationRecordsForPhase(
        Order.ON_WORK_READY,
      ),
    );
    events.length = 0;
    await batched
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal();
    assert.deepEqual(events, ['group', 'root', 'changed']);

    const fatal = new TreeTraversal({
      dagDiscoverySource: {
        resolveRootVertex: () => found('fatal'),
        resolveChildHint: (id) => found(id),
      },
    });
    fatal.registerVisitorCallbackForPhase(Order.ON_WORK_READY, () => ({
      commands: [
        {
          commandName:
            other.TraversalVisitorCommandName
              .END_WORK_VISITOR_CHAIN_AND_DEFER_WORK_COMPLETION,
        },
      ],
    }));
    const fatalRunner = fatal.createIndependentRunnerFromCurrentOptions();
    await fatalRunner.runUntilSuspendedOrTerminal();
    const settlementToken = fatalRunner
      .captureProgressSnapshot()
      .progressByVertexId.get('fatal').settlementToken;
    const error = { exact: 'value' };
    fatalRunner.settleDeferredWork(
      'fatal',
      { kind: 'traversalFailed', error },
      settlementToken,
    );
    assert.equal(
      fatalRunner.settleDeferredWork(
        'fatal',
        { kind: 'traversalFailed', error },
        settlementToken,
      ),
      false,
    );
    let caught;
    try {
      await fatalRunner.runUntilSuspendedOrTerminal();
    } catch (value) {
      caught = value;
    }
    assert.equal(caught, error);

    const lookup = new TreeTraversal({
      dagDiscoverySource: {
        resolveRootVertex: () =>
          found('app', [], {
            workWaitsForWorkOf: ['optional'],
            workWaitsForSubgraphCompletionOf: ['optional'],
          }),
        resolveChildHint: (id) => found(id),
        resolvePrerequisiteByVertexId: () => ({
          omittedVertexIdentity: null,
          kind: 'vertexIntentionallyOmitted',
          satisfiesWorkAndSubgraphCompletionPrerequisites: true,
        }),
      },
    }).createIndependentRunnerFromCurrentOptions();
    await lookup.runUntilSuspendedOrTerminal();
    assert.equal(
      lookup.captureProgressSnapshot().progressByVertexId.get('app').workState,
      'workCompletionCommitted',
    );
  }

  assert.throws(
    () => new api.ObjectPropertyTreeSource({}, { makeVertexHook: () => ({}) }),
    TypeError,
  );
  for (const hook of [
    {
      resolveChildPropertyOrUseDefault: (hint) =>
        hint.propertyKey === 'skip'
          ? { kind: 'vertexIntentionallyOmitted' }
          : { kind: 'useDefaultChildPropertyResolution' },
    },
    {
      resolveChildPropertyOrUseDefault: (hint) =>
        hint.propertyKey === 'skip'
          ? { kind: 'vertexIntentionallyOmitted' }
          : { kind: 'useDefaultChildPropertyResolution' },
    },
  ]) {
    const result = api.rewriteObject(
      { keep: 1, skip: 2 },
      {
        ...hook,
        rewritePropertyAfterChildTraversal: ({ propertyKey: key }) =>
          key === 'keep'
            ? {
                kind: 'patchPropertyKeyOrValue',
                propertyPatch: { propertyValue: undefined },
              }
            : undefined,
      },
    );
    assert.deepEqual(capturedOutputValue(result), { keep: undefined });
  }
  assert.throws(
    () =>
      api.rewriteObject(
        { a: 1 },
        {
          rewritePropertyAfterChildTraversal: () => ({
            kind: 'patchPropertyKeyOrValue',
            propertyPatch: undefined,
          }),
        },
      ),
    TypeError,
  );
  for (const field of [
    'vertexId',
    'workWaitsForWorkOf',
    'workWaitsForSubgraphCompletionOf',
    'satisfiesDependencies',
  ]) {
    assert.throws(
      () =>
        api.runTreeDepthFirstUntilSuspendedOrTerminal({
          treeDiscoverySource: {
            resolveRootVertex: () => ({
              kind: 'vertexResolved',
              resolvedVertexInput: {
                [field]: undefined,
                vertexContentInput: {
                  $vertexData: '',
                  $childDiscoveryHints: [],
                },
              },
            }),
            resolveChildVertexFromHint: () => treeFound('unused'),
          },
        }),
      TypeError,
    );
  }

  for (const commandName of [
    Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
    Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
  ]) {
    const visits = [];
    api.runTreeDepthFirstUntilSuspendedOrTerminal({
      treeDiscoverySource: tree,
      visitors: {
        [api.DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: (vertex) => {
          visits.push(vertex.getVertexData());
          return {
            commands: [
              { commandName, commandArguments: { replacementChildHints: [] } },
            ],
          };
        },
      },
    });
    assert.deepEqual(visits, ['root']);
  }
}

// Both installed module identities enforce scoped command envelopes at runtime.
for (const api of [cjs, esm]) {
  const tree = {
    resolveRootVertex: () => ({
      kind: 'vertexResolved',
      resolvedVertexInput: {
        vertexContentInput: { $vertexData: 'root', $childDiscoveryHints: [] },
      },
    }),
    resolveChildVertexFromHint: () => ({ kind: 'vertexIntentionallyOmitted' }),
  };
  const dag = new api.DagTraversalBuilder({ treeDiscoverySource: tree });
  dag.registerVisitorCallbackForPhase(
    api.DagVisitorPhase.ON_WORK_READY,
    () => ({
      commands: [
        {
          commandName:
            api.TraversalVisitorCommandName
              .DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
        },
      ],
    }),
  );
  assert.equal(
    dag
      .createIndependentRunnerFromCurrentOptions()
      .runUntilSuspendedOrTerminal()
      .getLiveResolvedGraphView()
      .getVertexHandles().length,
    0,
  );
  assert.throws(
    () =>
      new api.DagTraversalBuilder({
        treeDiscoverySource: tree,
        undeclaredWorkPrerequisitePolicy: 'none',
      }),
    /graph discovery source/,
  );
  const wrong = new api.DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: tree,
  });
  wrong.registerVisitorCallbackForPhase(
    api.DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION,
    () => ({
      commands: [
        {
          commandName:
            api.TraversalVisitorCommandName
              .DELETE_DAG_VERTEX_WITH_DEPENDENTS_AND_ORPHANED_DESCENDANTS,
        },
      ],
    }),
  );
  assert.throws(
    () =>
      wrong
        .createIndependentRunnerFromCurrentOptions()
        .runUntilSuspendedOrTerminal(),
    /traversal family/,
  );
}

function capturedOutputValue(result) {
  const output = result.capturedOutputResultAtReturn;
  return output.kind === 'present' ? output.value : null;
}
